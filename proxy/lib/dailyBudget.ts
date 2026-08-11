import { redisOps } from './redisOps.js'

// Outlives a calendar day (including timezone/DST edge cases) so the key reliably expires
// instead of accumulating forever if a day boundary is ever missed.
const BUDGET_KEY_TTL_SECONDS = 26 * 60 * 60

function todayKey(): string {
  const today = new Date().toISOString().slice(0, 10)
  return `budget:translate:${today}`
}

/**
 * Deliberately a request-count ceiling, not a dollar ceiling — converting to an actual dollar
 * figure requires per-token Gemini pricing, which changes over time and shouldn't be guessed
 * here.
 */
function getConfiguredLimit(): number | null {
  const raw = process.env.DAILY_TRANSLATION_REQUEST_LIMIT
  if (!raw) return null
  const parsed = Number(raw)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null
}

/**
 * Increments today's counter and reports whether this attempt is still within budget. Returns
 * true (allowed) when no limit is configured — this is a deliberate default, not a fallback to
 * "unlimited by accident": see docs/pre-production-audit/16-h1-baseline-protections.md.
 *
 * Called once per actual outbound Gemini call attempt (see ensureBudgetAvailable below) — not
 * once per proxy request — so a `translate-bulk` request that internally makes two Gemini
 * calls (see gemini.ts's batching) consumes two units, and a retried call consumes a second
 * unit for the retry, matching real Gemini call volume rather than proxy request volume.
 *
 * Atomic INCR-then-compare: the single attempt that pushes the count over the limit is itself
 * counted but blocked (see ensureBudgetAvailable) — a check-then-increment split would avoid
 * that one "spent but blocked" unit, but would reopen the race condition this pattern exists
 * to close, so it's an intentional, accepted trade-off rather than an oversight.
 */
export async function consumeDailyBudget(): Promise<boolean> {
  const limit = getConfiguredLimit()
  if (limit == null) return true

  const key = todayKey()
  const count = await redisOps.incr(key)
  if (count === 1) await redisOps.expire(key, BUDGET_KEY_TTL_SECONDS)
  return count <= limit
}

export class BudgetExceededError extends Error {
  constructor() {
    super('Translation temporarily unavailable — daily limit reached. Try again tomorrow.')
    this.name = 'BudgetExceededError'
  }
}

export class BudgetCheckFailedError extends Error {
  constructor() {
    super('Translation service temporarily unavailable')
    this.name = 'BudgetCheckFailedError'
  }
}

/**
 * Throws if today's Gemini-call budget is exhausted or can't be checked. Call this immediately
 * before every actual outbound Gemini call — including retries — never just once per proxy
 * request, so the budget tracks real Gemini calls rather than proxy requests. Fails closed: a
 * Redis error here blocks the call rather than silently letting it through.
 */
export async function ensureBudgetAvailable(): Promise<void> {
  let withinBudget: boolean
  try {
    withinBudget = await consumeDailyBudget()
  } catch (err) {
    console.error('Daily budget check unavailable:', err)
    throw new BudgetCheckFailedError()
  }
  if (!withinBudget) throw new BudgetExceededError()
}
