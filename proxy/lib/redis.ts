import { Redis } from '@upstash/redis'
import { Ratelimit } from '@upstash/ratelimit'

export const redis = Redis.fromEnv()

// Free Gemini quota is shared across every install of the app, so keep this generous
// enough for normal use but tight enough that one runaway client can't burn it all.
// Device and IP limits are enforced independently (both must pass) - a device-id is
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

// Adding a new language (which triggers bulk-translate) is a rare, deliberate action -
// a real user does this a handful of times ever, not repeatedly per hour.
export const bulkDeviceRateLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(10, '1 h'),
  prefix: 'ratelimit:translate:bulk-device',
})

export function cacheKey(languageCode: string, normalizedEnglish: string): string {
  return `translate:${languageCode}:${normalizedEnglish}`
}

// A created share link is effectively free, TTL-bounded storage, not a metered API call like
// translate - the cost model is "how much Redis storage can accumulate", not "how much Gemini
// quota gets burned" - so these are deliberately much stricter than the translate limiters above.
// Same device+IP dual-gate reasoning as deviceRateLimit/ipRateLimit: a device id is client-chosen
// and trivially rotated, so the IP bucket catches abuse that rotates it.
export const shareCreateDeviceRateLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(5, '1 d'),
  prefix: 'ratelimit:share:create-device',
})

export const shareCreateIpRateLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(20, '1 d'),
  prefix: 'ratelimit:share:create-ip',
})

// The read side is fully public/unauthenticated (a recipient has no device-id relationship to
// the creator) - an IP limit is the only guard against enumerating codes or scraping content.
export const shareReadIpRateLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(60, '1 h'),
  prefix: 'ratelimit:share:read-ip',
})
