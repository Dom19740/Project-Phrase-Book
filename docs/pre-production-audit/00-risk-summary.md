# Pre-Production Risk Summary — Travel Chatter (Phrase Book)

**Audit date:** 2026-08-07
**Companion doc:** [`00-system-overview.md`](./00-system-overview.md)

This is an initial pass. Nothing in this document has been fixed — it is a prioritized list of what deserves attention before release, per the audit rules. Severities follow: **CRITICAL** (exploitable now, serious real-world impact) / **HIGH** (real, realistic risk, should be fixed before release) / **MEDIUM** (real risk, fix soon but not necessarily blocking) / **LOW** (minor, low realistic impact) / **worth monitoring** (not a defect today, but a decision or a condition that could become a problem).

No CRITICAL findings were identified. This app has a small attack surface by design — no accounts, no server-side user data, no sensitive on-device permissions — which limits the ceiling of most issues below.

---

## HIGH

### H1. Translation proxy has no authentication, open CORS, and a trivially spoofable rate-limit key
- **Files**: `proxy/api/translate.ts`, `proxy/api/translate-alternatives.ts`, `proxy/api/translate-bulk.ts`, `proxy/lib/redis.ts`
- **Function/component**: all three POST handlers; `Ratelimit.slidingWindow(30, '1 h')` keyed by the client-supplied `X-Device-Id` header.
- **Problem**: The endpoints are open to the public internet — `Access-Control-Allow-Origin: *`, no API key/bearer token, no App Check/attestation. The only throttle is a 30-requests/hour limit bucketed by a header the caller fully controls (`crypto.randomUUID()` stored in `localStorage`, trivially rotated or spoofed via direct HTTP calls — nothing stops a script from sending a new random UUID on every request). `translate-bulk` also has no upper bound on how many phrases can be submitted in a single request (only an internal 40-item chunking of however many arrive).
- **Production consequence**: Once the proxy URL is visible in a network trace or unpacked from the APK (trivial — it's a build-time constant), anyone can call it directly, bypass the rate limit entirely by rotating the device-id header, and run unlimited Gemini calls at your expense. This is a **billing/quota-exhaustion risk against your own Gemini API key**, and a way for the endpoint to be used as a free general-purpose translation API unrelated to this app.
- **Recommended fix**: Add a lightweight app-attestation check (e.g., a build-time shared secret sent as a header and verified server-side, or Google Play Integrity API for a stronger guarantee), cap request/array/string sizes server-side, and consider rate-limiting by IP in addition to device-id. Also wrap `rateLimit.limit()` / Redis calls in `try/catch` so a Redis outage produces a clear 5xx instead of an unhandled exception.
- **Automatable**: Partially. Payload-size caps and try/catch hardening are safe to automate. Choosing and implementing an attestation/shared-secret scheme is a product decision — needs your sign-off before implementing (also touches the "no new dependencies without approval" rule if a library like Play Integrity's SDK is involved).

### H2. Android release build has no signing configuration
- **File**: `app/android/app/build.gradle` (lines 19–24)
- **Function/component**: `android.buildTypes.release`
- **Problem**: The `release` build type has no `signingConfig` block — this is the unmodified, stock Capacitor-generated file. `./gradlew assembleRelease` (or `bundleRelease`) as configured today produces an **unsigned** artifact.
- **Production consequence**: An unsigned release build cannot be installed on a device or uploaded to Google Play. If signing is being handled entirely outside this repo (Android Studio's build-and-sign dialog, or CI secrets injected at build time via Play App Signing enrollment), this is fine and expected — but it needs to be confirmed, not assumed, before a real release attempt.
- **Recommended fix**: Confirm with whoever owns the release process whether a keystore + signing pipeline already exists outside the repo. If not, one needs to be created (Play App Signing is Google's recommended path for new apps).
- **Automatable**: No — this requires real credentials that must never be committed to the repository. This is a process/ownership question, not a code fix.

---

## MEDIUM

### M1. No global error boundary — any uncaught render error is a blank white screen
- **File(s)**: no `ErrorBoundary` exists anywhere in `app/src`; `app/src/main.tsx` renders `<App/>` directly.
- **Function/component**: whole app.
- **Problem**: React unmounts the entire tree on an uncaught error during render/effects. There is no fallback UI, no "something went wrong, try again" recovery path.
- **Production consequence**: Any bug that slips through testing — even a small one in a rarely-hit code path — presents to a real user as the app going completely blank, with no way to recover short of force-closing and reopening. This is a poor first impression for a consumer-facing store app and is hard to diagnose without a crash reporter (see M2).
- **Recommended fix**: Add a top-level React error boundary around `<Shell/>` with a friendly fallback and a "reload" action.
- **Automatable**: Yes — self-contained, additive, doesn't change existing behavior or UI design elsewhere.

### M2. No production crash/error visibility
- **File(s)**: errors are only ever sent to `console.error`/`console.log` (`PhraseBookContext.tsx`, `autoBackup.ts`, `tts.ts`).
- **Problem**: `console.*` output from a production Android WebView is not collected anywhere. Translation failures, backup failures, TTS failures, and any unexpected exceptions are completely invisible once the app is in users' hands.
- **Production consequence**: You will not know if/when things break for real users — no way to detect a regression, a proxy outage, or a device-specific crash pattern after release.
- **Recommended fix**: Wire up minimal crash/error reporting before release.
- **Automatable**: No — this requires adding a new dependency (e.g., Sentry or similar), which per the audit ground rules needs your explicit approval first. Flagging as a recommendation only.

### M3. Backup restore is destructive-first with no shape validation
- **File**: `app/src/db/backup.ts`, function `importSnapshot`
- **Problem**: `importSnapshot` runs `DELETE FROM translations; DELETE FROM phrase_concepts; DELETE FROM categories; DELETE FROM languages;` **before** validating that the parsed JSON actually has the expected `{ languages, phrases }` shape, and the subsequent inserts are a sequence of individual `db.run`/`executeSet` calls rather than one wrapped transaction.
- **Production consequence**: A backup file that is valid JSON but doesn't match the expected structure (hand-edited, corrupted, from a future/incompatible `BACKUP_VERSION`, or truncated by a flaky cloud-storage sync) will throw partway through `importSnapshot` — **after** the destructive delete has already run — leaving the user with a partially restored or fully empty phrase book. The UI (`BackupModal.tsx`) only shows a generic "Restore failed." message with no indication that data was already wiped. The user does have an unrelated safety net (the silent auto-backup file), but nothing in the failure message points them to it.
- **Recommended fix**: Validate the snapshot's shape (and `version`) before touching the database, and/or wrap the whole delete+insert sequence in a single transaction so a failure rolls back instead of leaving partial state.
- **Automatable**: Yes — self-contained defensive change, no behavior change on the happy path.

---

## LOW

### L1. CSV export has no formula-injection guarding
- **File**: `app/src/lib/csvExport.ts`, function `csvEscape`
- **Problem**: Cell values starting with `=`, `+`, `-`, or `@` are not neutralized. If such a value is opened in Excel/Google Sheets, it can be interpreted as a formula ("CSV injection").
- **Production consequence**: Low — all CSV content originates from the user's own phrase data (self-authored or auto-translated), so this is a user attacking their own spreadsheet at worst, not a third-party attack vector. Still cheap to close off.
- **Recommended fix**: Prefix cells beginning with `=`, `+`, `-`, `@`, or tab/CR with a leading `'` (or wrap and neutralize) before CSV serialization.
- **Automatable**: Yes.

### L2. No timeout/retry on any network call
- **Files**: `app/src/lib/translateApi.ts`, `proxy/lib/gemini.ts`
- **Problem**: All `fetch` calls (client → proxy, proxy → Gemini) have no `AbortController`-based timeout and no retry logic.
- **Production consequence**: On a poor mobile connection, a hung request can leave the "Add phrase" translate step or the background bulk-translate indicator spinning far longer than a user would tolerate, with nothing but the platform/Vercel default timeout to eventually end it.
- **Recommended fix**: Add a reasonable client-side timeout (e.g., 15–20s) via `AbortController` around each translate call, with a clear timeout error message.
- **Automatable**: Yes — additive, doesn't change the success-path behavior.

---

## Worth monitoring (not defects today)

- **`android:allowBackup="true"` with no backup/data-extraction rules** (`AndroidManifest.xml`) — on Android 12+, this means the OS's own auto-backup (Google account cloud backup, device-to-device transfer) will include the app's SQLite database and its private auto-backup copy by default. Given the app already ships its own explicit backup/restore feature and the data itself (travel phrases) isn't sensitive, this is low-stakes — but it's an implicit default rather than a deliberate choice, and worth a conscious decision either way.
- **Gemini prompt built from user-controlled text** (`proxy/lib/gemini.ts`) — the phrase text and category hints are interpolated directly into the prompt sent to Gemini. Impact is bounded today because the response is constrained by a JSON `responseSchema` and the output only ever populates the phrasebook UI (no downstream execution of returned text) — but keep this in mind if the proxy's responsibilities ever grow.
- **`minifyEnabled false` for the Android release build type** — no R8 shrinking/obfuscation of the (very thin) native Java layer. This does *not* affect the JS bundle, which Vite minifies independently regardless of this setting. Impact is limited to a slightly larger APK and unobfuscated native class names; low priority given how little native code this app has.
- **No formal DB migration system** — `app/src/db/client.ts`'s `migrate()` does manual `ALTER TABLE` + `PRAGMA table_info` checks per column. Fine at the current schema size (`SCHEMA_VERSION = 1`, two ad-hoc migrations so far); will get harder to reason about if the schema grows significantly.
- **No offline/queueing story for translation** — acceptable today since translation failure degrades gracefully to "blank, fill in manually," and the rest of the app is fully functional offline (all data is local SQLite).

## Confirmed compliant (verified against current platform docs)

- **Target API level**: `app/android/variables.gradle` sets `targetSdkVersion 36` (Android 16), `compileSdk 36`. Per Google Play's current target API level policy, new apps and updates must target API 36 by **August 31, 2026** (extension available to November 1, 2026). This app already meets that bar today. [Source: Google Play Console Help — Target API level requirements](https://support.google.com/googleplay/android-developer/answer/11926878?hl=en)

---

## Suggested order of attention

1. Confirm the Android signing/release pipeline exists somewhere (H2) — this blocks shipping regardless of everything else.
2. Decide on and implement an anti-abuse control for the translation proxy (H1) — this is the one item with a direct, ongoing cost exposure the longer it's live.
3. Add the error boundary (M1) — cheap, self-contained, meaningfully improves worst-case UX.
4. Decide on crash reporting (M2) — needs your approval on a dependency before it can move.
5. Harden backup restore (M3) and CSV export (L1) — small, low-risk, self-contained fixes.
6. Add network timeouts (L2) when convenient.

No action has been taken on any of the above — this is the assessment only, per your instructions.
