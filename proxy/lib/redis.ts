import { Redis } from '@upstash/redis'
import { Ratelimit } from '@upstash/ratelimit'

export const redis = Redis.fromEnv()

// Free Gemini quota is shared across every install of the app, so keep this generous
// enough for normal use but tight enough that one runaway client can't burn it all.
// Device and IP limits are enforced independently (both must pass) — a device-id is
// client-chosen and trivially rotated, so the IP bucket catches abuse that rotates it;
// an IP can be shared by many genuine users behind carrier-grade NAT, so it's deliberately
// looser and the device bucket keeps those users from tripping each other's limit.
export const deviceRateLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(30, '1 h'),
  prefix: 'ratelimit:translate:device',
})

export const ipRateLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(150, '1 h'),
  prefix: 'ratelimit:translate:ip',
})

// Adding a new language (which triggers bulk-translate) is a rare, deliberate action —
// a real user does this a handful of times ever, not repeatedly per hour.
export const bulkDeviceRateLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(10, '1 h'),
  prefix: 'ratelimit:translate:bulk-device',
})

export function cacheKey(languageCode: string, normalizedEnglish: string): string {
  return `translate:${languageCode}:${normalizedEnglish}`
}
