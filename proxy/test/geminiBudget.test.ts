import { test, mock, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import { redisOps } from '../lib/redisOps.js'
import { translateBulkWithGemini, translateWithGemini } from '../lib/gemini.js'

function geminiSuccess(body: unknown): Response {
  return {
    ok: true,
    status: 200,
    text: async () => '',
    json: async () => body,
  } as unknown as Response
}

function translateSuccessBody(translations: Record<string, string>) {
  return { candidates: [{ content: { parts: [{ text: JSON.stringify({ translations }) }] } }] }
}

function bulkSuccessBody(count: number) {
  const values = Array.from({ length: count }, (_, i) => `translated ${i}`)
  return { candidates: [{ content: { parts: [{ text: JSON.stringify(values) }] } }] }
}

function httpError(status: number): Response {
  return { ok: false, status, text: async () => 'error' } as unknown as Response
}

afterEach(() => {
  mock.restoreAll()
  delete process.env.DAILY_TRANSLATION_REQUEST_LIMIT
})

test('translateWithGemini consumes exactly one budget unit for a normal successful call', async () => {
  process.env.DAILY_TRANSLATION_REQUEST_LIMIT = '1000'
  const incrMock = mock.method(redisOps, 'incr', async () => 1)
  mock.method(redisOps, 'expire', async () => 1)
  mock.method(globalThis, 'fetch', async () => geminiSuccess(translateSuccessBody({ vi: 'Xin chào' })))

  await translateWithGemini('Hello', [{ code: 'vi', name: 'Vietnamese' }], 'Greetings', [])
  assert.equal(incrMock.mock.calls.length, 1)
})

test('a retried call consumes a second budget unit — the retry cannot bypass the budget', async () => {
  process.env.DAILY_TRANSLATION_REQUEST_LIMIT = '1000'
  const incrMock = mock.method(redisOps, 'incr', async () => 1)
  mock.method(redisOps, 'expire', async () => 1)

  let fetchCalls = 0
  mock.method(globalThis, 'fetch', async () => {
    fetchCalls++
    return fetchCalls === 1 ? httpError(500) : geminiSuccess(translateSuccessBody({ vi: 'Xin chào' }))
  })

  await translateWithGemini('Hello', [{ code: 'vi', name: 'Vietnamese' }], 'Greetings', [])
  assert.equal(fetchCalls, 2)
  assert.equal(incrMock.mock.calls.length, 2)
})

test('when the budget is already exhausted, no Gemini call is attempted at all', async () => {
  process.env.DAILY_TRANSLATION_REQUEST_LIMIT = '1'
  mock.method(redisOps, 'incr', async () => 2) // already over the limit of 1
  const fetchMock = mock.method(globalThis, 'fetch', async () => geminiSuccess(translateSuccessBody({})))

  await assert.rejects(() => translateWithGemini('Hello', [{ code: 'vi', name: 'Vietnamese' }], 'Greetings', []))
  assert.equal(fetchMock.mock.calls.length, 0)
})

test('if the budget runs out between the first attempt and the retry, the retry is blocked (no second fetch)', async () => {
  process.env.DAILY_TRANSLATION_REQUEST_LIMIT = '1'
  let incrCalls = 0
  mock.method(redisOps, 'incr', async () => {
    incrCalls++
    return incrCalls // 1st check: 1 (within budget of 1) — 2nd check (the retry): 2 (over budget)
  })
  mock.method(redisOps, 'expire', async () => 1)

  let fetchCalls = 0
  mock.method(globalThis, 'fetch', async () => {
    fetchCalls++
    return httpError(500) // always fails, so callGemini attempts a retry
  })

  await assert.rejects(() => translateWithGemini('Hello', [{ code: 'vi', name: 'Vietnamese' }], 'Greetings', []))
  assert.equal(fetchCalls, 1, 'only the first attempt actually reached Gemini')
  assert.equal(incrCalls, 2, 'the budget was still checked before the retry, and blocked it')
})

test('translateBulkWithGemini spanning two batches consumes two budget units — one per actual Gemini call', async () => {
  process.env.DAILY_TRANSLATION_REQUEST_LIMIT = '1000'
  const incrMock = mock.method(redisOps, 'incr', async () => 1)
  mock.method(redisOps, 'expire', async () => 1)

  const phrases = Array.from({ length: 45 }, (_, i) => `phrase ${i}`) // > 40 per batch -> 2 batches (40 + 5)
  const fetchMock = mock.method(globalThis, 'fetch', async () => geminiSuccess(bulkSuccessBody(40)))

  await translateBulkWithGemini(phrases, { code: 'vi', name: 'Vietnamese' })
  assert.equal(fetchMock.mock.calls.length, 2)
  assert.equal(incrMock.mock.calls.length, 2)
})

test('translateBulkWithGemini within a single batch consumes exactly one budget unit', async () => {
  process.env.DAILY_TRANSLATION_REQUEST_LIMIT = '1000'
  const incrMock = mock.method(redisOps, 'incr', async () => 1)
  mock.method(redisOps, 'expire', async () => 1)

  const phrases = Array.from({ length: 10 }, (_, i) => `phrase ${i}`)
  const fetchMock = mock.method(globalThis, 'fetch', async () => geminiSuccess(bulkSuccessBody(10)))

  await translateBulkWithGemini(phrases, { code: 'vi', name: 'Vietnamese' })
  assert.equal(fetchMock.mock.calls.length, 1)
  assert.equal(incrMock.mock.calls.length, 1)
})

test('translateBulkWithGemini stops at the batch where the budget runs out, never reaching later batches', async () => {
  process.env.DAILY_TRANSLATION_REQUEST_LIMIT = '1'
  let incrCalls = 0
  mock.method(redisOps, 'incr', async () => {
    incrCalls++
    return incrCalls // batch 1: 1 (allowed) — batch 2: 2 (blocked)
  })
  mock.method(redisOps, 'expire', async () => 1)

  const phrases = Array.from({ length: 45 }, (_, i) => `phrase ${i}`)
  const fetchMock = mock.method(globalThis, 'fetch', async () => geminiSuccess(bulkSuccessBody(40)))

  await assert.rejects(() => translateBulkWithGemini(phrases, { code: 'vi', name: 'Vietnamese' }))
  assert.equal(fetchMock.mock.calls.length, 1, 'only the first batch actually reached Gemini')
})
