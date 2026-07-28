import { Redis } from '@upstash/redis'
import { Ratelimit } from '@upstash/ratelimit'

export const redis = Redis.fromEnv()

// Free Gemini quota is shared across every install of the app, so keep this generous
// enough for normal use but tight enough that one runaway client can't burn it all.
export const rateLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(30, '1 h'),
  prefix: 'ratelimit:translate',
})

export function cacheKey(languageCode: string, normalizedEnglish: string): string {
  return `translate:${languageCode}:${normalizedEnglish}`
}
