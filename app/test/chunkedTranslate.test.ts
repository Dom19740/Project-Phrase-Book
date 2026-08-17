import { test } from 'node:test'
import assert from 'node:assert/strict'
import { translateInChunksWithRetry } from '../src/lib/chunkedTranslate.js'

test('all chunks succeeding on the first try returns no failures and calls translateChunk once per chunk', async () => {
  const items = Array.from({ length: 45 }, (_, i) => i)
  let calls = 0
  const failed = await translateInChunksWithRetry(items, 20, async () => {
    calls++
    return true
  })
  assert.deepEqual(failed, [])
  assert.equal(calls, 3) // chunks of 20, 20, 5
})

test('regression: a chunk that fails once but succeeds on the retry pass ends up fully translated — this was the Add Language bug (some phrases silently staying blank)', async () => {
  const items = Array.from({ length: 45 }, (_, i) => i) // 3 chunks: [0-19], [20-39], [40-44]
  const attemptsByChunk = new Map<number, number>()

  const failed = await translateInChunksWithRetry(items, 20, async (chunk) => {
    const key = chunk[0]
    const attempt = (attemptsByChunk.get(key) ?? 0) + 1
    attemptsByChunk.set(key, attempt)
    // The middle chunk fails its first attempt (simulating one transient proxy/Gemini failure)
    // and succeeds on the retry — every other chunk succeeds immediately.
    if (key === 20) return attempt > 1
    return true
  })

  assert.deepEqual(failed, [], 'no phrase should be left untranslated after the retry pass')
  assert.equal(attemptsByChunk.get(20), 2, 'the failed chunk must be retried exactly once')
  assert.equal(attemptsByChunk.get(0), 1, 'chunks that succeeded the first time must not be re-sent')
})

test('a chunk that fails both the first attempt and the retry is reported as failed — everything else is not', async () => {
  const items = Array.from({ length: 45 }, (_, i) => i)
  const failed = await translateInChunksWithRetry(items, 20, async (chunk) => chunk[0] !== 20)

  assert.deepEqual(failed, Array.from({ length: 20 }, (_, i) => i + 20))
})

test('a chunk with even one missing translation counts as failed and is retried in full, not just the missing entries', async () => {
  let attempt = 0
  const items = [1, 2, 3]
  const failed = await translateInChunksWithRetry(items, 3, async () => {
    attempt++
    // Simulates a chunk where the proxy returned translations for only some of the phrases —
    // the caller's translateChunk reports that as a non-fully-successful chunk (false).
    return attempt > 1
  })

  assert.deepEqual(failed, [])
  assert.equal(attempt, 2)
})

test('an empty item list never calls translateChunk and reports no failures', async () => {
  let calls = 0
  const failed = await translateInChunksWithRetry([], 20, async () => {
    calls++
    return true
  })

  assert.deepEqual(failed, [])
  assert.equal(calls, 0)
})

test('multiple chunks failing the first pass are all retried independently, and only the ones still failing afterward are reported', async () => {
  const items = Array.from({ length: 60 }, (_, i) => i) // 3 chunks of 20: [0], [20], [40]
  const attemptsByChunk = new Map<number, number>()

  const failed = await translateInChunksWithRetry(items, 20, async (chunk) => {
    const key = chunk[0]
    const attempt = (attemptsByChunk.get(key) ?? 0) + 1
    attemptsByChunk.set(key, attempt)
    if (key === 0) return false // always fails
    if (key === 20) return attempt > 1 // fails once, then recovers
    return true // always succeeds
  })

  assert.deepEqual(failed, Array.from({ length: 20 }, (_, i) => i))
  assert.equal(attemptsByChunk.get(0), 2)
  assert.equal(attemptsByChunk.get(20), 2)
  assert.equal(attemptsByChunk.get(40), 1)
})

test('regression: a chunk that keeps failing past the old single-retry limit still succeeds once maxAttempts allows more passes — this was the CSV import bug (most phrases left untranslated after one rate-limited retry)', async () => {
  const items = Array.from({ length: 10 }, (_, i) => i)
  let attempt = 0

  const failed = await translateInChunksWithRetry(
    items,
    10,
    async () => {
      attempt++
      return attempt > 4 // fails the first 4 attempts, succeeds on the 5th
    },
    0,
    6,
  )

  assert.deepEqual(failed, [], 'every phrase should eventually be translated within the attempt budget')
  assert.equal(attempt, 5)
})

test('gives up and reports failure only after exhausting maxAttempts', async () => {
  const items = [1, 2, 3]
  let attempt = 0

  const failed = await translateInChunksWithRetry(
    items,
    3,
    async () => {
      attempt++
      return false
    },
    0,
    4,
  )

  assert.deepEqual(failed, items)
  assert.equal(attempt, 4)
})

test('translateInChunksWithRetry does not itself swallow a throwing callback — error handling is the caller\'s job, same as the real translateChunk wrapper in PhraseBookContext', async () => {
  const items = [1, 2, 3, 4]
  await assert.rejects(
    () =>
      translateInChunksWithRetry(items, 4, async () => {
        throw new Error('network error')
      }),
    /network error/,
  )
})
