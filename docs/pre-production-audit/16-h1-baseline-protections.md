# H1 Baseline Protections — Implementation Record

**Companion to:** [`00-risk-summary.md`](./00-risk-summary.md) (finding H1) and [`01-h1-translation-proxy-security-options.md`](./01-h1-translation-proxy-security-options.md) (options analysis)
**Date:** 2026-08-07
**Scope of this change:** `proxy/` only. Nothing in `app/` was modified — see "Why `app/` was untouched" below.

This records exactly what was implemented from the 8 requested protection areas, what was deliberately left out of scope, and what still needs a human decision or a real-device check before this can be called "done."

---

## What was implemented

### 1. Server-side payload limits

New file: [`proxy/lib/limits.ts`](../../proxy/lib/limits.ts). One validation function per endpoint (`validateTranslateBody`, `validateBulkBody`, `validateAlternativesBody`), each returning a client-facing error string or `null`. Wired into all three handlers, replacing their previous inline `if (!body?.english?.trim() || ...)` checks.

| Limit | Value |
|---|---|
| Phrase length (`english`, per-language text) | 300 characters |
| Phrases per `translate-bulk` request | 50 |
| Target languages per `translate` request | 25 |
| `categoryHint` length | 100 characters |
| `existingCategories` array size / entry length | 200 entries / 100 characters each |
| `targetLangCode` / `targetLangName` length | 20 / 60 characters |

These match the values proposed in the options report. All are hard, unconditional server-side rejections (`400`) — independent of rate limiting, identity, or anything else.

### 2. Device + IP rate limiting

`proxy/lib/redis.ts` now exports three separate `Ratelimit` instances instead of one: `deviceRateLimit` (30/hr, unchanged), `ipRateLimit` (150/hr, new), `bulkDeviceRateLimit` (10/hr, new — see #3). Both device and IP limits are enforced independently for every request via [`proxy/lib/guard.ts`](../../proxy/lib/guard.ts)'s `guardRequest()` — a request is rejected (`429`) if *either* fails.

**Client IP**: [`proxy/lib/clientIp.ts`](../../proxy/lib/clientIp.ts) reads `x-forwarded-for` (falling back to `x-real-ip`). Per Vercel's current documentation, this header is set/overwritten by Vercel's own edge network and explicitly **not** forwarded from whatever a client claims — "we currently overwrite the X-Forwarded-For header and do not forward external IPs. This restriction is in place to prevent IP spoofing." A client cannot inject an arbitrary IP into this header under Vercel's default (non-Enterprise "Trusted Proxy") configuration, which this project doesn't use.

### 3. Bulk translation rate limit

`bulkDeviceRateLimit`, 10/hr per device, enforced *in addition to* the general 30/hr device limit and the IP limit — a `translate-bulk` call must pass all three. 10/hr was chosen (the top of the requested 5–10 range) because adding a language is rare and deliberate; the client itself only ever sends one bulk request per ~20-phrase chunk during "add language," so a real user doing this several times in a session (e.g. testing, retrying after a failure) stays well within it.

### 4. Retry protection

Implemented in **`proxy/lib/gemini.ts`** (the proxy → Gemini call), not in the app's client code — see "Why `app/` was untouched" below for the reasoning. All three Gemini-calling functions now go through one shared `callGemini()`:
- A 20-second timeout per attempt (`AbortController`, configurable via `GEMINI_TIMEOUT_MS`).
- **No retry on 429** (Gemini's own rate limit) or any other 4xx.
- **Exactly one retry**, after a fixed backoff (500ms default, configurable via `GEMINI_RETRY_BACKOFF_MS`), for 5xx responses and timeouts only.
- No retry on a malformed/unparseable response (a schema mismatch won't fix itself).
- Hard-capped at one retry in the code itself (not a loop with a counter) — there is no path that can retry more than once.

Verified by `test/geminiRetry.test.ts`: a persistent 5xx stops at exactly 2 total attempts; a 429 stops at exactly 1.

### 5. Redis failure handling

`guardRequest()` and `guardDailyBudget()` (both in `proxy/lib/guard.ts`) wrap every Redis-touching call in `try/catch`. Any exception — connection failure, timeout, malformed response — is caught and turned into a controlled `503 { error: "Translation service temporarily unavailable" }`. There is no code path where a Redis failure is treated as "rate limit passed" or "budget available." This was explicitly tested (`guard.test.ts`, `handlers.test.ts`): mocking a rate limiter or the budget counter to throw produces a `503`, not a `500` crash and not a silent `200`.

One implementation detail worth recording: `@upstash/redis` enables "auto pipelining" by default, which wraps the Redis client in an internal `Proxy`. This made the raw client's `get`/`set`/`incr`/`expire` methods unreliable to intercept directly in tests (a mocked method silently never gets called; the Proxy's `get` trap ignores it). A small seam, [`proxy/lib/redisOps.ts`](../../proxy/lib/redisOps.ts) — a plain object wrapping those four calls — was added purely so tests can reliably verify this behavior. It changes nothing about production behavior, only makes it observable in a test.

### 6. CORS

[`proxy/lib/cors.ts`](../../proxy/lib/cors.ts) replaces `Access-Control-Allow-Origin: *` with an allowlist check against the request's actual `Origin` header, matching `https?://localhost(:\d+)?`. This covers:
- `https://localhost` — Capacitor's documented default Android WebView origin (verified against Capacitor's current config docs: `server.hostname` defaults to `"localhost"`, `server.androidScheme` defaults to `"https"`, and `app/capacitor.config.ts` overrides neither).
- Local Vite dev/preview ports (`http://localhost:5173`, etc.) — so `npm run dev` / `npm run preview` keep working for local testing.

If the request's `Origin` doesn't match, no `Access-Control-Allow-Origin` header is sent at all (rather than a wrong value), which is what causes a browser to block the response. **This is documented in the code as browser-enforced hygiene, not access control** — curl, scripts, and server-to-server calls ignore CORS entirely regardless of this header, exactly as called out in the options report. Tested in `handlers.test.ts` (allowed origin gets echoed, an arbitrary third-party origin does not, and the `OPTIONS` preflight response carries the right header).

**Not verified**: an actual on-device/emulator run of the built Android app hitting the deployed proxy. This environment has no Android tooling. The origin value is correct per Capacitor's official current documentation and by inspecting `capacitor.config.ts` for overrides, but "the docs say so" is not the same as "I watched it work." **Recommend a real device/emulator smoke test of Add Phrase and Add Language before shipping this.**

### 7. Translation kill switch

[`proxy/lib/killSwitch.ts`](../../proxy/lib/killSwitch.ts): `TRANSLATION_DISABLED=true` (Vercel environment variable, no redeploy needed — Vercel picks up env var changes without a rebuild) makes `guardRequest()` immediately return a `503` before touching Redis or Gemini at all. This is checked first, ahead of rate limiting, so it's also the cheapest possible response path during an incident.

**Locally stored phrasebook is unaffected by design, not by new code**: `PhraseBookContext.addPhrase` and `createLanguage` (in `app/`, unmodified) already catch every translate failure generically — a `503` from the kill switch is indistinguishable, from the app's point of view, from a network hiccup it already handles today (phrase is saved with a blank translation for manual entry; no crash, no data loss).

### 8. Application-level translation budget

[`proxy/lib/dailyBudget.ts`](../../proxy/lib/dailyBudget.ts): a Redis counter (`budget:translate:YYYY-MM-DD`, `INCR`-ed once per proxy request that actually reaches Gemini — cache hits don't count), checked via `DAILY_TRANSLATION_REQUEST_LIMIT`. **Deliberately a request-count ceiling, not a dollar ceiling** — per your instruction not to guess a dollar figure, and because converting to a real dollar amount requires per-token Gemini pricing, which changes over time and shouldn't be hardcoded here. **Unset by default (no ceiling applied)** — this is a considered choice, not an oversight: inventing a default number would itself be "guessing a value," so the feature is opt-in via that one environment variable. This is called out explicitly in the "unresolved" section below because an unset budget means this protection does nothing until someone sets it.

**Update (same day, follow-up change):** the imprecision described above — a `translate-bulk` request counting as 1 budget unit even when it triggers 2 internal Gemini calls — has been fixed. The budget check moved from the handler level (once per proxy request) into `gemini.ts` itself, immediately before every actual outbound Gemini call, including retries. See [`docs/pre-production-audit/17-h1-budget-per-call-accuracy.md`](./17-h1-budget-per-call-accuracy.md) for the follow-up record.

---

## Why `app/` was untouched

Every one of the 8 requirements turned out to be satisfiable entirely inside `proxy/`:
- Rate limiting, budget, kill switch, CORS, and payload limits are all server-side by nature.
- Retry protection was placed at the proxy → Gemini boundary (where the actual per-call dollar cost is incurred) rather than the app → proxy boundary, which also keeps it testable within the same proxy test suite.
- The kill switch's "don't affect the local phrasebook" requirement is already satisfied by the app's existing generic error handling — verified by reading `PhraseBookContext.tsx` and `AddPhraseModal.tsx`, not assumed.

No UI changes were needed because the app currently shows no explicit error state for translation failures at all (they degrade silently to "blank, fill in manually") — there was no existing error state to extend, and the instructions were not to change the UI except where required.

---

## Tests added

All in `proxy/test/`, run via `npm run test` (compiles with the existing `tsc` devDependency, then runs with Node's built-in `node:test` — **no new dependency was added**, for tests or anything else in this change):

| File | Covers |
|---|---|
| `limits.test.ts` | Oversized phrase, oversized bulk request, too many languages, boundary values, all three endpoints' other field limits |
| `clientIp.test.ts` | IP extraction from `x-forwarded-for`/`x-real-ip`, fallback behavior |
| `killSwitch.test.ts` | Kill switch on/off/invalid-value behavior |
| `dailyBudget.test.ts` | Budget exhaustion, unset-limit no-op, boundary, expiry-set-once |
| `geminiRetry.test.ts` | No retry on 429, exactly one retry on 5xx/timeout, never more than one retry, plain success path |
| `guard.test.ts` | Device limit, IP limit, bulk limit, Redis failure (fails closed), kill switch short-circuit, budget integration |
| `handlers.test.ts` | End-to-end valid requests on all three endpoints, CORS header behavior, and the above scenarios exercised through the real handler functions rather than just the underlying helpers |

**62/62 tests pass.** `npm run typecheck` (proxy) and `npm run build` (app, includes its own `tsc -b` typecheck) both pass clean. The app has no pre-existing test suite to run (confirmed by searching the repo before starting).

---

## What remains unresolved

- **Android production origin not verified on a real device/emulator.** The CORS allowlist value is correct per current Capacitor documentation and this repo's config, but this environment has no Android tooling to prove it against a real WebView request. Do this before shipping.
- **`DAILY_TRANSLATION_REQUEST_LIMIT` is unset by default**, meaning the daily budget backstop does nothing until you explicitly configure it in Vercel's environment variables. Recommend setting it (and `TRANSLATION_DISABLED` awareness, plus Vercel Spend Management and Google Cloud billing budget alerts, per the options report) before relying on this as a real financial ceiling.
- **The device-id rate-limit key is still self-asserted and spoofable** (unchanged from before — this was never in scope for this change; see the options report's discussion of why an embedded secret wouldn't fix this either). Device+IP limiting raises the cost of casual abuse; it does not make the endpoint un-abusable by a motivated attacker.
- **IP-sharing across genuine users on carrier-grade NAT** (the caveat raised in the options report) still applies to the IP bucket — softened, not eliminated, by pairing it with the independent device bucket.
- **No crash/error reporting was added** — out of scope here (would be a new dependency, needs separate approval) and unrelated to H1 specifically.
- **Play Integrity was explicitly not implemented**, per your instruction — see below.

---

## Is Play Integrity still recommended?

**Yes.** Everything implemented in this pass is a rate limit, a size cap, and a set of financial circuit breakers — none of it changes *who* can call these endpoints, only *how often* and *how expensively*. A caller with the proxy URL (trivially visible in any network trace or unpacked from the APK) can still call `/api/translate` directly with curl, present any 8+ character string as `X-Device-Id`, and consume up to the new IP-based ceiling (150/hr) without ever running the real app. That ceiling is now bounded and the worst case is now capped by the daily budget and platform-level spend controls — which is the actual goal stated at the start of this work ("sufficiently difficult and financially bounded," not "impossible") — but it does not distinguish a genuine app install from a script, which was Play Integrity's specific purpose in the options analysis.

Put plainly: this pass makes an incident **survivable and bounded**. Play Integrity is the piece that would make sustained, deliberate abuse **meaningfully harder to start in the first place**, because — unlike everything shipped here — it can't be defeated by simply reading this code and calling the same endpoints with different headers. It remains the recommended next step whenever you're ready to take on its added complexity and the new dependency it requires.
