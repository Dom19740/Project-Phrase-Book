/**
 * Runs `translateChunk` over `items` in fixed-size chunks, then does one consolidated retry
 * pass over whichever chunks didn't fully succeed the first time — a chunk request can fail
 * outright (network error, proxy 5xx/429/503) or come back with some entries missing, and both
 * count as "not fully done" here. Returns whatever is still untranslated after the retry
 * (empty if everything eventually succeeded), so the caller can tell the user rather than
 * letting them silently stay blank forever.
 *
 * `retryDelayMs` (default 0, i.e. no wait) is applied once before the retry pass, not between
 * first-pass chunks — a failure is often a rate limit (the proxy's per-device bulk-translate
 * limit, or Gemini's own quota), and retrying instantly almost always lands in the same window
 * and fails again for the same reason. Callers hitting a real API should pass a real delay;
 * tests leave it at 0 so they run instantly.
 *
 * Pure and framework-agnostic on purpose — no fetch, no SQLite, no React — so the chunking/retry
 * logic itself is testable without mocking any of those.
 */
export async function translateInChunksWithRetry<T>(
  items: T[],
  chunkSize: number,
  translateChunk: (chunk: T[]) => Promise<boolean>,
  retryDelayMs = 0,
): Promise<T[]> {
  let failed: T[] = []
  for (let i = 0; i < items.length; i += chunkSize) {
    const chunk = items.slice(i, i + chunkSize)
    if (!(await translateChunk(chunk))) failed.push(...chunk)
  }

  if (failed.length > 0) {
    if (retryDelayMs > 0) await new Promise((resolve) => setTimeout(resolve, retryDelayMs))

    const stillFailed: T[] = []
    for (let i = 0; i < failed.length; i += chunkSize) {
      const chunk = failed.slice(i, i + chunkSize)
      if (!(await translateChunk(chunk))) stillFailed.push(...chunk)
    }
    failed = stillFailed
  }

  return failed
}
