# System Overview — Travel Chatter (Phrase Book)

**Audit date:** 2026-08-07
**Branch audited:** `productionaudit`
**Scope:** `app/` (Capacitor/React Android app) + `proxy/` (Vercel serverless translation backend)

This document is descriptive only — it records what exists today. No code was changed to produce it. Findings and severity ratings live in [`00-risk-summary.md`](./00-risk-summary.md).

---

## 1. Framework & high-level architecture

- **App**: React 18 + TypeScript, built with Vite, packaged for Android via **Capacitor 8** (`app/capacitor.config.ts`). App ID `com.dpbcreative.travelchatter`, display name "Travel Chatter". No iOS project exists in the repo — Android only.
- **Styling**: Tailwind CSS, restricted palette (black/white/grey/pink), light/dark theme via a `data-theme` attribute persisted to `localStorage`.
- **State management**: A single React Context (`app/src/context/PhraseBookContext.tsx`) holds all app state (languages, categories, phrases, loading/background-translation flags) and exposes CRUD actions. No Redux/Zustand/etc. — appropriate for the app's size.
- **Backend**: A separate small Vercel serverless project, `proxy/` (`phrase-book-translate-proxy`), whose only job is to proxy translation requests to Google Gemini and rate-limit them. It is a **thin, stateless proxy** — it does not persist any phrase-book data. All user data lives entirely on-device.
- **No user accounts, no login, no server-side user data store.** This is a local-first, single-device app; the only network dependency is the optional translation feature.

## 2. Android architecture

- Capacitor-generated native shell at `app/android/`. `MainActivity.java` extends `BridgeActivity` and registers Capacitor's built-in plugins plus one **custom native plugin**, `SafFilePlugin` (`app/android/app/src/main/java/com/dpbcreative/travelchatter/SafFilePlugin.java`), which wraps Android's Storage Access Framework (`ACTION_CREATE_DOCUMENT` / `ACTION_OPEN_DOCUMENT`) so the JS layer can save/open backup files anywhere the user chooses (internal storage, SD card, Google Drive, etc.) rather than being pinned to one fixed folder.
- **Manifest** (`app/android/app/src/main/AndroidManifest.xml`): `INTERNET` permission (unconditional); `READ_EXTERNAL_STORAGE` (capped `maxSdkVersion=32`) and `WRITE_EXTERNAL_STORAGE` (capped `maxSdkVersion=29`) for legacy Android versions only. `android:allowBackup="true"`, no backup/data-extraction rules file. A `FileProvider` is declared (non-exported) for sharing exported files via the OS share sheet. `MainActivity` is the only exported component, launch-mode `singleTask`, no deep links / custom URI schemes.
- **Build config** (`app/android/variables.gradle`, `app/android/app/build.gradle`): `minSdkVersion 24`, `compileSdk 36`, `targetSdkVersion 36`. `versionCode 1`, `versionName "1.0"`. Release build type has `minifyEnabled false` and **no `signingConfig`** — this is the stock Capacitor-generated Gradle file, unmodified; signing is expected to be supplied externally (Android Studio/CI) before a release artifact is produced.
- No `google-services.json`, no keystore (`.jks`/`.keystore`) files anywhere in the repo. `google-services` Gradle plugin is applied conditionally only if `google-services.json` exists (it doesn't), so Firebase/push-notification wiring is present but currently inert.
- No `network_security_config.xml` — on `targetSdkVersion 36` this means cleartext (HTTP) traffic is blocked by the OS default, which is the secure default and matches the app only calling HTTPS endpoints.

## 3. Database / storage architecture

- **Engine**: SQLite via `@capacitor-community/sqlite`. On native Android, the plugin uses the platform's real SQLite; on web (dev/preview only), it falls back to `sql.js` (WASM) persisted into IndexedDB through the `jeep-sqlite` custom element (`app/src/db/webStore.ts`).
- **Connection**: a single lazily-opened, memoized connection (`app/src/db/client.ts`), opened with `'no-encryption'` mode (no at-rest DB encryption — expected/acceptable for this data class, see risk summary).
- **Schema** (`app/src/db/schema.ts`, `SCHEMA_VERSION = 1`): four tables — `languages`, `categories`, `phrase_concepts` (the shared English "root" of a phrase), `translations` (one row per phrase × language, `UNIQUE(phrase_concept_id, language_id)`, cascading deletes). Simple, normalized, sensible foreign keys and indexes.
- **Migrations**: `client.ts`'s `migrate()` does ad-hoc `ALTER TABLE ... ADD COLUMN` checks (`languages.color`, `translations.favorite`) guarded by `PRAGMA table_info`. There's no formal migration/version table — future schema changes will need to keep extending this function by hand.
- **Queries** (`app/src/db/queries.ts`): all statements are parameterized (`?` placeholders); no string-concatenated SQL was found anywhere in the codebase. No SQL-injection surface.
- **Seed data**: On first launch, `app/src/db/seed.ts` inserts a starter "Vietnamese" language and ~70 phrases from `app/src/data/seedVietnamese.ts`, guarded by an in-flight promise so React StrictMode's double-effects in dev don't race it.

## 4. API / network architecture

- The app talks to exactly one external service: its own translation proxy, at `VITE_TRANSLATE_API_URL` (client-side env var, baked into the JS bundle at build time — not secret, just a URL). Three endpoints, all POST-only:
  - `POST /api/translate` — single phrase → multiple target languages + a suggested category (`app/src/lib/translateApi.ts`, `proxy/api/translate.ts`).
  - `POST /api/translate-bulk` — many phrases → one new language, used when a language is added and the whole existing phrase list needs translating (`proxy/api/translate-bulk.ts`).
  - `POST /api/translate-alternatives` — alternate phrasings for one phrase/language (`proxy/api/translate-alternatives.ts`).
- Each request carries an `X-Device-Id` header — a random UUID generated once and stored in `localStorage` (`app/src/lib/deviceId.ts`). This is **not authentication**, only a rate-limit bucketing key (see below and risk summary).
- **Proxy → Gemini**: `proxy/lib/gemini.ts` calls `gemini-flash-latest` via `https://generativelanguage.googleapis.com/...?key=$GEMINI_API_KEY` directly with `fetch`, using Gemini's `responseSchema` (JSON mode) to constrain output shape. `GEMINI_API_KEY` is read from `process.env` server-side only and never sent to the client.
- **Rate limiting**: `proxy/lib/redis.ts` uses `@upstash/ratelimit` (`Ratelimit.slidingWindow(30, '1 h')`) against Upstash Redis, keyed by the client-supplied device ID, shared across all three endpoints.
- **CORS**: all three endpoints send `Access-Control-Allow-Origin: *` — open to any web origin (see risk summary).
- Translation failures anywhere are caught and degrade gracefully: phrases are still created/kept with blank translations for manual entry rather than blocking the user (`PhraseBookContext.tsx` `addPhrase`/`createLanguage`).

## 5. Authentication

None. There are no user accounts, no login, no session/JWT/OAuth anywhere in the app or proxy. The only "identity" concept is the anonymous, self-generated `X-Device-Id` used purely for translation rate-limiting.

## 6. Translation architecture

- Client never talks to Gemini directly (comment in `translateApi.ts` explicitly states this — "the API key must not ship inside the app").
- Two flows: (a) **foreground** — translating a single new phrase into the languages the user is actively adding it to, blocking the "add phrase" modal briefly; (b) **background** — when a whole new *language* is added, all existing phrases are bulk-translated into it in chunks of 20 (`TRANSLATE_CHUNK_SIZE` in `PhraseBookContext.tsx`), running detached from the UI with a small "Translating… in the background" indicator, so the modal can close immediately.
- Any translation failure (proxy down, rate-limited, network) is caught, logged to console, and leaves the affected phrase(s) blank for manual entry — never blocks phrase creation.

## 7. Audio architecture

- Text-to-speech only (no audio recording/input anywhere in the app). `app/src/lib/tts.ts` wraps `@capacitor-community/text-to-speech`, mapping the app's 2-letter language codes to full BCP-47 locales for better voice resolution, with a small hardcoded map (`en`, `vi`, `id`) and passthrough otherwise. Failures are caught and logged, not surfaced to the user (speaking is a secondary, non-critical action).

## 8. Backup / export architecture

- **Manual JSON backup/restore**: `app/src/db/backup.ts` exports the entire DB (languages, phrases, categories, translations) as a versioned JSON snapshot (`BACKUP_VERSION = 1`) and can fully re-import it. Import is **destructive** — it deletes all existing data before inserting the snapshot's contents — and the UI (`BackupModal.tsx`) requires an explicit confirmation step ("Replace everything… This can't be undone") before proceeding, which is good practice given the destructive nature.
- **Manual save location**: uses the custom `SafFilePlugin` native plugin to let the user pick any save destination via Android's system picker (internal storage, SD card, Google Drive, etc.), not a fixed app folder.
- **Automatic safety-net backup**: every DB mutation triggers a debounced (1.5s) auto-backup (`app/src/lib/autoBackup.ts`) that silently writes a JSON snapshot to the app's private data directory (`Directory.Data`, not user-visible/shareable) via `app/src/lib/backupTarget.ts`. This is separate from, and does not replace, the user-initiated backup file.
- **CSV export**: per-language, English/Translation/Category, via `app/src/lib/csvExport.ts`, shared out through the OS share sheet using a `FileProvider` (`app/src/lib/exportFile.ts`).
- No restore/import validates the snapshot's shape before use beyond `JSON.parse` succeeding — a malformed but valid-JSON file will throw partway through `importSnapshot` (after the destructive delete has already run), surfaced to the user only as a generic "Restore failed." (see risk summary).

## 9. Build configuration

- `app/package.json`: `npm run build` = `tsc -b && vite build`; `npm run android:sync` = build + `npx cap sync android`. Standard Vite + Capacitor flow, no custom CI/CD pipeline files found in the repo.
- TypeScript: `strict: true`, `noUnusedLocals`, `noUnusedParameters`, `noFallthroughCasesInSwitch` all enabled (`app/tsconfig.app.json`) — a reasonably strict compiler configuration.
- `proxy/package.json`: `vercel dev` for local dev; deployment is implicitly via Vercel's Git integration (a `.vercel/project.json` exists locally, gitignored, containing only project/org IDs).

## 10. Environment variables / secrets

- **App side**: only `VITE_TRANSLATE_API_URL` (the proxy's base URL). Vite inlines all `VITE_`-prefixed vars into the shipped JS bundle — this is fine here since the value isn't sensitive. Grep confirms no other `VITE_*` variables and no secret material anywhere in `app/src`.
- **Proxy side**: `GEMINI_API_KEY`, `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` — all read server-side only via `process.env`, never echoed to clients.
- Both `app/.env.local` and `proxy/.env.local` are gitignored and confirmed (via `git ls-files` / `git log`) never committed. Only `*.env.local.example` files (empty placeholders) are tracked.
- No hardcoded secrets found in any Gradle file, TypeScript source, or config file.

## 11. Dependencies

- **App**: `@capacitor/*` (core, android, filesystem, share) + `@capacitor-community/sqlite`, `@capacitor-community/text-to-speech`, `jeep-sqlite`, `sql.js` (web-only fallback), `lucide-react` (icons), `react`/`react-dom`. Small, focused dependency set — no state-management, HTTP-client, or CSS-in-JS libraries beyond what's listed.
- **Proxy**: `@upstash/ratelimit`, `@upstash/redis` only (plus Vercel/TypeScript dev tooling). No web framework — raw Vercel Node functions.
- Native Android side pulls in exactly the plugins implied by the JS dependencies, one-to-one, plus the custom `SafFilePlugin` — no orphaned/unused native plugins found.

## 12. Permissions

- Android: `INTERNET`, plus legacy-only `READ_EXTERNAL_STORAGE`/`WRITE_EXTERNAL_STORAGE` (both capped to older API levels, inert on modern Android where SAF/scoped storage is used instead). No camera, microphone, location, contacts, or other sensitive runtime permissions requested anywhere.
- No runtime permission-request code was found in the JS or native layers beyond what Capacitor's Filesystem/SAF plugins handle implicitly.

## 13. Navigation

- No router/multi-screen navigation library. The entire app is a single view (`App.tsx`'s `Shell`) with modals (`AddPhraseModal`, `EditPhraseModal`, `BackupModal`, `AddLanguageModal`, `ManageCategoriesModal`) toggled via local component state — no deep linking, no back-stack management beyond Android's default single-Activity behavior.

## 14. Background tasks

- The only "background" work is in-process: the debounced auto-backup (`autoBackup.ts`) and the chunked bulk-translate loop (`PhraseBookContext.tsx`'s `createLanguage`), both plain async JS running while the app is foregrounded. There is **no** Android `WorkManager`/`JobScheduler`/foreground-service usage — background work does not survive the app being killed or backgrounded for long, which is consistent with the app's low-stakes, resumable nature (a half-finished bulk translation just leaves phrases blank for later).

## 15. Network handling

- All network calls go through the plain `fetch` API (no Axios/interceptor layer). No request timeouts or retry logic on either the client (`translateApi.ts`) or the proxy's Gemini calls (`gemini.ts`) — a hung request relies on the underlying platform/Vercel default timeout.
- No offline-detection or queueing: the app's core phrase-book functionality (view/add/edit/reorder/backup) works fully offline since everything is local SQLite; only translation and TTS voice availability depend on connectivity, and both degrade gracefully (blank translation / caught TTS error) rather than crashing.

## 16. Error handling

- Consistent pattern throughout: async actions are wrapped in `try/catch` at the component level, with failures surfaced as a short status string in the relevant modal (`BackupModal`, etc.) rather than thrown uncaught. Translation and TTS failures are logged via `console.error` and treated as non-fatal/degradable.
- **No global React error boundary exists anywhere in the app** — an unexpected render-time exception in any component will unmount the whole React tree to a blank white screen with no in-app recovery path (see risk summary).
- No centralized crash/error reporting (e.g. Sentry) is wired up — errors are only visible via `console.*`, which is not collected from production devices.

---

*Findings, severities, and recommended fixes derived from the above are tracked separately in [`00-risk-summary.md`](./00-risk-summary.md). This overview will need a refresh pass if the schema, proxy contract, or native plugin surface changes materially.*
