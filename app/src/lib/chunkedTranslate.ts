/** Cap on the per-attempt backoff wait, so a long run of retries doesn't end up waiting minutes between passes. */
const MAX_BACKOFF_MS = 60000

/**
 * Runs `translateChunk` over `items` in fixed-size chunks, then keeps retrying whichever chunks
 * didn't fully succeed — up to `maxAttempts` total passes — before giving up. A chunk request can
 * fail outright (network error, proxy 5xx/429/503) or come back with some entries missing, and
 * both count as "not fully done" here. Returns whatever is still untranslated after the last
 * attempt (empty if everything eventually succeeded), so the caller can tell the user rather than
 * letting them silently stay blank forever.
 *
 * `retryDelayMs` (default 0, i.e. no wait) is applied before each retry pass, doubling each time
 * (capped at MAX_BACKOFF_MS) and not applied before the first pass — a failure is often a rate
 * limit (the proxy's per-device bulk-translate limit, or Gemini's own quota), and retrying
 * instantly, or at a fixed cadence, tends to land in the same window and fail again for the same
 * reason. Callers hitting a real API should pass a real delay; tests leave it at 0 so they run
 * instantly. `maxAttempts` (default 2, i.e. one retry) is how many total passes to make.
 *
 * Pure and framework-agnostic on purpose — no fetch, no SQLite, no React — so the chunking/retry
 * logic itself is testable without mocking any of those.
 */
export async function translateInChunksWithRetry<T>(
  items: T[],
  chunkSize: number,
  translateChunk: (chunk: T[]) => Promise<boolean>,
  retryDelayMs = 0,
  maxAttempts = 2,
): Promise<T[]> {
  let pending = items

  for (let attempt = 1; attempt <= maxAttempts && pending.length > 0; attempt++) {
    if (attempt > 1 && retryDelayMs > 0) {
      const backoff = Math.min(retryDelayMs * 2 ** (attempt - 2), MAX_BACKOFF_MS)
      await new Promise((resolve) => setTimeout(resolve, backoff))
    }

    const stillFailed: T[] = []
    for (let i = 0; i < pending.length; i += chunkSize) {
      const chunk = pending.slice(i, i + chunkSize)
      if (!(await translateChunk(chunk))) stillFailed.push(...chunk)
    }
    pending = stillFailed
  }

  return pending
}
