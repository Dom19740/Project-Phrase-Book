import { bulkDeviceRateLimit, deviceRateLimit, ipRateLimit } from './redis.js'
import { BudgetCheckFailedError, BudgetExceededError } from './dailyBudget.js'
import { isTranslationDisabled } from './killSwitch.js'

export interface GuardFailure {
  status: number
  error: string
}

/**
 * Kill switch + device/IP(+bulk) rate limits — the checks every translate endpoint needs
 * before doing any work. Returns null when the request may proceed.
 *
 * Any Redis failure here is caught and turned into a controlled 503 — it must never be
 * treated as "rate limit passed" (fail-open would silently remove the only cost control
 * standing between a Redis outage and unbounded Gemini spend).
 */
export async function guardRequest(opts: { deviceId: string; ip: string; bulk?: boolean }): Promise<GuardFailure | null> {
  if (isTranslationDisabled()) {
    return { status: 503, error: 'Translation is temporarily disabled. Your saved phrasebook is unaffected.' }
  }

  try {
    const [deviceResult, ipResult, bulkResult] = await Promise.all([
      deviceRateLimit.limit(opts.deviceId),
      ipRateLimit.limit(opts.ip),
      opts.bulk ? bulkDeviceRateLimit.limit(opts.deviceId) : Promise.resolve({ success: true }),
    ])

    if (!deviceResult.success || !ipResult.success || !bulkResult.success) {
      return { status: 429, error: 'Rate limit exceeded, try again later' }
    }
  } catch (err) {
    console.error('Rate limiting unavailable:', err)
    return { status: 503, error: 'Translation service temporarily unavailable' }
  }

  return null
}

/**
 * Turns an error thrown out of a translateXWithGemini() call (gemini.ts) into the right HTTP
 * response. The daily budget is now enforced inside gemini.ts itself, once per actual outbound
 * Gemini call rather than once per proxy request (see dailyBudget.ts's ensureBudgetAvailable) —
 * this is where that distinction resurfaces as the same controlled 503 callers saw before,
 * versus the existing generic 502 for a genuine Gemini/network failure.
 */
export function classifyGeminiError(err: unknown): GuardFailure {
  if (err instanceof BudgetExceededError || err instanceof BudgetCheckFailedError) {
    return { status: 503, error: err.message }
  }
  return { status: 502, error: 'Translation service unavailable, try again shortly' }
}
