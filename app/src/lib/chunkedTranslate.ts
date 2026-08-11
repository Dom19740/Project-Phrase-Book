/**
 * Runs `translateChunk` over `items` in fixed-size chunks, then does one consolidated retry
 * pass over whichever chunks didn't fully succeed the first time — a chunk request can fail
 * outright (network error, proxy 5xx/429/503) or come back with some entries missing, and both
 * count as "not fully done" here. Returns whatever is still untranslated after the retry
 * (empty if everything eventually succeeded), so the caller can tell the user rather than
 * letting them silently stay blank forever.
 *
 * Pure and framework-agnostic on purpose — no fetch, no SQLite, no React — so the chunking/retry
 * logic itself is testable without mocking any of those.
 */
export async function translateInChunksWithRetry<T>(
  items: T[],
  chunkSize: number,
  translateChunk: (chunk: T[]) => Promise<boolean>,
): Promise<T[]> {
  let failed: T[] = []
  for (let i = 0; i < items.length; i += chunkSize) {
    const chunk = items.slice(i, i + chunkSize)
    if (!(await translateChunk(chunk))) failed.push(...chunk)
  }

  if (failed.length > 0) {
    const stillFailed: T[] = []
    for (let i = 0; i < failed.length; i += chunkSize) {
      const chunk = failed.slice(i, i + chunkSize)
      if (!(await translateChunk(chunk))) stillFailed.push(...chunk)
    }
    failed = stillFailed
  }

  return failed
}
