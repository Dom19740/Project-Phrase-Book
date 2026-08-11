# H1 Follow-up — Accurate Per-Gemini-Call Budget Accounting

**Companion to:** [`16-h1-baseline-protections.md`](./16-h1-baseline-protections.md)
**Date:** 2026-08-07
**Scope:** `proxy/` only. `app/` was not touched. Play Integrity was not implemented.

## The gap

The daily budget (`DAILY_TRANSLATION_REQUEST_LIMIT`) was originally checked once per proxy request, immediately before calling `translateWithGemini`/`translateBulkWithGemini`/`translateAlternativesWithGemini`. `translateBulkWithGemini` batches internally in groups of 40 phrases (`BULK_BATCH_SIZE`); with the payload cap at 50 phrases per request (see baseline protections doc), a single `translate-bulk` request could make up to 2 real Gemini API calls while consuming only 1 budget unit — an undercount, not an overcount, so the ceiling was slightly softer than configured.

## Why this didn't need a large refactor

The fix is a relocation, not a redesign: move the budget check from "once per handler invocation" to "once per actual outbound Gemini `fetch`," which already has a single chokepoint — `callGemini()` in `proxy/lib/gemini.ts`, the one function all three Gemini-calling exports (and `translateBulkWithGemini`'s per-batch loop) already funnel through for their actual network call. No new endpoints, no new request/response shapes, no change to rate limiting, the kill switch, or CORS.

## What changed

**`proxy/lib/dailyBudget.ts`**
- `consumeDailyBudget()` unchanged (still one Redis `INCR` + conditional `EXPIRE`, still returns a boolean, still a no-op when `DAILY_TRANSLATION_REQUEST_LIMIT` is unset).
- Added `BudgetExceededError` and `BudgetCheckFailedError` (distinct error classes, so callers can tell "budget's gone" from "budget check itself failed").
- Added `ensureBudgetAvailable()`: calls `consumeDailyBudget()`, throws `BudgetExceededError` if over budget, throws `BudgetCheckFailedError` (fail-closed) if Redis errors. Designed to be called immediately before every real outbound Gemini call — the docstring says so explicitly, since correctness now depends on call-site discipline rather than a single enforced chokepoint at the handler layer.

**`proxy/lib/gemini.ts`**
- `callGemini()` now calls `await ensureBudgetAvailable()` immediately before its initial `fetchGeminiOnce()`, and again immediately before the retry's `fetchGeminiOnce()`. A budget failure at either point throws before any fetch happens — no Gemini call, no cost, for a blocked attempt.
- The `GEMINI_API_KEY` presence check still runs first, before any budget check — a missing key is a configuration error, not a usage event, and shouldn't consume budget.

**`proxy/lib/guard.ts`**
- Removed `guardDailyBudget()` (no longer called from the handlers — budget enforcement now lives inside `gemini.ts`).
- Added `classifyGeminiError(err)`: turns a caught `BudgetExceededError`/`BudgetCheckFailedError` into the same `503` response callers saw before; anything else still becomes the existing generic `502`. `guardRequest()` (kill switch + device/IP/bulk rate limits) is untouched.

**The three handlers** (`translate.ts`, `translate-bulk.ts`, `translate-alternatives.ts`)
- Removed the pre-call `guardDailyBudget()` check.
- Their existing `catch` blocks (already there for genuine Gemini failures) now also call `classifyGeminiError(err)` to pick the right status/message, instead of always returning `502`.
- Everything else — cache lookups, rate limiting via `guardRequest()`, payload validation — unchanged, in the same order as before.

## Requirement-by-requirement

1. **A normal `translate` request consumes 1 unit if it actually calls Gemini.** ✅ `translateWithGemini` makes exactly one `callGemini()` call (absent a retry); `ensureBudgetAvailable()` fires once before it.
2. **A `translate-bulk` request consumes 1 unit per actual Gemini call.** ✅ `translateBulkWithGemini`'s per-batch loop calls `callGemini()` once per batch; each call independently checks and consumes budget. Verified directly: 45 phrases (2 batches) → 2 Redis increments and 2 `fetch` calls; 10 phrases (1 batch) → 1 of each.
3. **Cached translations consume 0.** ✅ Unchanged — cache hits never call any `translateXWithGemini` function at all, so `callGemini()`/`ensureBudgetAvailable()` are never reached.
4. **Failed requests that never reach Gemini consume 0.** ✅ Unchanged — rate-limited, kill-switched, or payload-rejected requests never call `translateXWithGemini`. A missing `GEMINI_API_KEY` also consumes 0 (checked before the budget).
5. **A Gemini retry must not bypass the budget.** ✅ `ensureBudgetAvailable()` is called again immediately before the retry's `fetchGeminiOnce()`. Verified: if the budget is exhausted between the first attempt and the retry, the retry's `fetch` never happens — only 1 real Gemini call is made, and the whole operation fails with `BudgetExceededError`.
6. **The budget must be checked before an actual Gemini call.** ✅ `ensureBudgetAvailable()` is `await`-ed directly before each `fetchGeminiOnce()`, both attempts.
7. **The budget mechanism must never bypass existing rate limits.** ✅ `guardRequest()` (kill switch, device/IP/bulk limits) still runs first, in full, in every handler, completely independent of the budget logic now living one layer deeper.
8. **Existing daily limit environment variable preserved.** ✅ `DAILY_TRANSLATION_REQUEST_LIMIT` unchanged — same name, same semantics (request-count ceiling, unset = unlimited).
9. **Kill switch preserved.** ✅ `guardRequest()`'s `isTranslationDisabled()` check is untouched and still runs before anything else.
10. **All existing rate limits preserved.** ✅ `deviceRateLimit` (30/hr), `ipRateLimit` (150/hr), `bulkDeviceRateLimit` (10/hr) all unchanged.
11. **Existing tests preserved, new tests added.** ✅ See below.
12. **No new dependency.** ✅ Pure refactor of existing modules; no `package.json` change.

## Tests

- `test/dailyBudget.test.ts`: added 3 tests for `ensureBudgetAvailable()` (resolves within budget, throws `BudgetExceededError` when exhausted, throws `BudgetCheckFailedError` on a Redis error). Existing `consumeDailyBudget()` tests untouched.
- `test/guard.test.ts`: the 3 tests for the removed `guardDailyBudget()` were replaced with 3 tests for `classifyGeminiError()` (budget-exceeded → 503, budget-check-failed → 503, anything else → the existing generic 502). The `guardRequest()` tests (kill switch, device/IP/bulk limits, Redis failure) are untouched.
- `test/geminiBudget.test.ts` (new): 7 tests exercising `translateWithGemini`/`translateBulkWithGemini` directly — one unit for a plain successful call, two units across a retry, zero `fetch` calls when the budget is already exhausted, the retry specifically getting blocked when the budget runs out between attempts, two batches consuming two units for a bulk request >40 phrases, one batch consuming one unit for ≤40 phrases, and a bulk request stopping at the batch where the budget runs out (later batches never called).
- `test/handlers.test.ts`: the existing "daily budget exhaustion" end-to-end test required no changes — from the handler's external point of view, mocking `redisOps.incr` to exceed the limit and asserting a `503` with `fetch` never called behaves identically whether the check happens in the handler or one layer deeper in `gemini.ts`.

**Result: 72/72 tests pass** (62 before this change + 10 net new: 3 removed from `guard.test.ts`, 3 added back there, 3 added to `dailyBudget.test.ts`, 7 added in the new `geminiBudget.test.ts`).

## Verification run

```
proxy> npm run typecheck     →  clean, no errors
proxy> npm run test          →  72 pass, 0 fail (tests 72, duration ~470ms)
app>   npm run build         →  tsc -b clean, vite build succeeds (unchanged output)
```

`git status` confirms zero changes under `app/`.

## One accepted trade-off, unchanged from before

`consumeDailyBudget()` still increments the Redis counter *before* comparing it to the limit (atomic `INCR`-then-compare). The single attempt that pushes the count from, say, exactly-at-limit to one-over is itself counted as "spent" even though it's the one that gets blocked (no `fetch` happens for it). A strict check-then-increment split would avoid that one extra "spent but blocked" unit, but reintroduces the race condition atomic counters exist to close — two concurrent requests could both pass a read-only check before either increments, overshooting the limit. This was already documented in the original implementation and is unchanged here; it's the standard, safe way to implement an atomic ceiling, not an oversight.
