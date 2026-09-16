import { shareCreateDeviceRateLimit, shareCreateIpRateLimit, shareReadIpRateLimit } from './redis.js'
import type { GuardFailure } from './guard.js'

/**
 * Device+IP rate limits for creating a share link - fails closed (503) on Redis errors, same
 * as guardRequest, since a fail-open here would remove the only cap on unbounded Redis storage.
 */
export async function guardShareCreate(opts: { deviceId: string; ip: string }): Promise<GuardFailure | null> {
  try {
    const [deviceResult, ipResult] = await Promise.all([
      shareCreateDeviceRateLimit.limit(opts.deviceId),
      shareCreateIpRateLimit.limit(opts.ip),
    ])
    if (!deviceResult.success || !ipResult.success) {
      return { status: 429, error: 'Rate limit exceeded, try again later' }
    }
  } catch (err) {
    console.error('Share rate limiting unavailable:', err)
    return { status: 503, error: 'Share service temporarily unavailable' }
  }
  return null
}

/** IP rate limit for reading a share link - the read endpoint is public/unauthenticated, so this is its only guard. */
export async function guardShareRead(opts: { ip: string }): Promise<GuardFailure | null> {
  try {
    const result = await shareReadIpRateLimit.limit(opts.ip)
    if (!result.success) return { status: 429, error: 'Rate limit exceeded, try again later' }
  } catch (err) {
    console.error('Share rate limiting unavailable:', err)
    return { status: 503, error: 'Share service temporarily unavailable' }
  }
  return null
}
