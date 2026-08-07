import { redis } from './redis.js'

/**
 * A thin, mockable seam around the raw Upstash Redis client. `@upstash/redis` enables
 * "auto pipelining" by default (`enableAutoPipelining: true`), which wraps the client
 * in an internal Proxy (`createAutoPipelineProxy`) that regenerates each command
 * function on every property access. Directly monkey-patching `redis.get`/`redis.incr`/etc.
 * in tests silently no-ops as a result — the Proxy's `get` trap ignores whatever was
 * assigned. Routing all raw Redis calls through this plain object keeps them reliably
 * mockable without changing any production behavior.
 */
export const redisOps = {
  get: (key: string) => redis.get<string>(key),
  set: (key: string, value: string) => redis.set(key, value),
  incr: (key: string) => redis.incr(key),
  expire: (key: string, seconds: number) => redis.expire(key, seconds),
}
