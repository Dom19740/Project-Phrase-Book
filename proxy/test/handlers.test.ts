import { test, mock, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import type { VercelRequest, VercelResponse } from '@vercel/node'
import translateHandler from '../api/translate.js'
import translateBulkHandler from '../api/translate-bulk.js'
import translateAlternativesHandler from '../api/translate-alternatives.js'
import { bulkDeviceRateLimit, deviceRateLimit, ipRateLimit } from '../lib/redis.js'
import { redisOps } from '../lib/redisOps.js'

function makeReq(overrides: Partial<VercelRequest> & { body?: unknown } = {}): VercelRequest {
  return {
    method: 'POST',
    headers: { 'x-device-id': 'device-1234', 'x-forwarded-for': '203.0.113.9' },
    body: {},
    ...overrides,
  } as unknown as VercelRequest
}

function makeRes() {
  const state: { statusCode: number; body: unknown; headers: Record<string, string> } = {
    statusCode: 200,
    body: undefined,
    headers: {},
  }
  const res = {
    setHeader(name: string, value: string) {
      state.headers[name] = value
    },
    status(code: number) {
      state.statusCode = code
      return res
    },
    json(payload: unknown) {
      state.body = payload
      return res
    },
    end() {
      return res
    },
  } as unknown as VercelResponse
  return { res, state }
}

function geminiSuccess(translations: Record<string, string>): Response {
  return {
    ok: true,
    status: 200,
    text: async () => '',
    json: async () => ({ candidates: [{ content: { parts: [{ text: JSON.stringify({ translations }) }] } }] }),
  } as unknown as Response
}

function bulkGeminiSuccess(values: string[]): Response {
  return {
    ok: true,
    status: 200,
    text: async () => '',
    json: async () => ({ candidates: [{ content: { parts: [{ text: JSON.stringify(values) }] } }] }),
  } as unknown as Response
}

function alternativesGeminiSuccess(values: string[]): Response {
  return {
    ok: true,
    status: 200,
    text: async () => '',
    json: async () => ({ candidates: [{ content: { parts: [{ text: JSON.stringify(values) }] } }] }),
  } as unknown as Response
}

afterEach(() => {
  mock.restoreAll()
  delete process.env.TRANSLATION_DISABLED
  delete process.env.DAILY_TRANSLATION_REQUEST_LIMIT
})

// --- /api/translate ---

test('translate: a valid normal request succeeds end-to-end', async () => {
  mock.method(deviceRateLimit, 'limit', async () => ({ success: true }))
  mock.method(ipRateLimit, 'limit', async () => ({ success: true }))
  mock.method(redisOps, 'get', async () => null)
  mock.method(redisOps, 'set', async () => 'OK')
  mock.method(globalThis, 'fetch', async () => geminiSuccess({ vi: 'Xin chào' }))

  const { res, state } = makeRes()
  await translateHandler(makeReq({ body: { english: 'Hello', targetLangs: ['vi'] } }), res)

  assert.equal(state.statusCode, 200)
  assert.deepEqual((state.body as { translations: Record<string, string> }).translations, { vi: 'Xin chào' })
})

test('translate: an oversized phrase is rejected with 400 and never reaches Gemini', async () => {
  mock.method(deviceRateLimit, 'limit', async () => ({ success: true }))
  mock.method(ipRateLimit, 'limit', async () => ({ success: true }))
  const fetchMock = mock.method(globalThis, 'fetch', async () => geminiSuccess({}))

  const { res, state } = makeRes()
  await translateHandler(makeReq({ body: { english: 'a'.repeat(301), targetLangs: ['vi'] } }), res)

  assert.equal(state.statusCode, 400)
  assert.equal(fetchMock.mock.calls.length, 0)
})

test('translate: too many target languages is rejected with 400', async () => {
  mock.method(deviceRateLimit, 'limit', async () => ({ success: true }))
  mock.method(ipRateLimit, 'limit', async () => ({ success: true }))

  const { res, state } = makeRes()
  const targetLangs = Array.from({ length: 26 }, (_, i) => `l${i}`)
  await translateHandler(makeReq({ body: { english: 'Hello', targetLangs } }), res)

  assert.equal(state.statusCode, 400)
})

test('translate: device rate limit exceeded returns 429', async () => {
  mock.method(deviceRateLimit, 'limit', async () => ({ success: false }))
  mock.method(ipRateLimit, 'limit', async () => ({ success: true }))

  const { res, state } = makeRes()
  await translateHandler(makeReq({ body: { english: 'Hello', targetLangs: ['vi'] } }), res)

  assert.equal(state.statusCode, 429)
})

test('translate: IP rate limit exceeded returns 429', async () => {
  mock.method(deviceRateLimit, 'limit', async () => ({ success: true }))
  mock.method(ipRateLimit, 'limit', async () => ({ success: false }))

  const { res, state } = makeRes()
  await translateHandler(makeReq({ body: { english: 'Hello', targetLangs: ['vi'] } }), res)

  assert.equal(state.statusCode, 429)
})

test('translate: a Redis failure during rate limiting returns a controlled 503, never a silent pass-through', async () => {
  mock.method(deviceRateLimit, 'limit', async () => {
    throw new Error('ECONNREFUSED')
  })
  mock.method(ipRateLimit, 'limit', async () => ({ success: true }))

  const { res, state } = makeRes()
  await translateHandler(makeReq({ body: { english: 'Hello', targetLangs: ['vi'] } }), res)

  assert.equal(state.statusCode, 503)
})

test('translate: the kill switch returns a controlled 503', async () => {
  process.env.TRANSLATION_DISABLED = 'true'

  const { res, state } = makeRes()
  await translateHandler(makeReq({ body: { english: 'Hello', targetLangs: ['vi'] } }), res)

  assert.equal(state.statusCode, 503)
})

test('translate: daily budget exhaustion returns a controlled 503 and never reaches Gemini', async () => {
  process.env.DAILY_TRANSLATION_REQUEST_LIMIT = '5'
  mock.method(deviceRateLimit, 'limit', async () => ({ success: true }))
  mock.method(ipRateLimit, 'limit', async () => ({ success: true }))
  mock.method(redisOps, 'get', async () => null)
  mock.method(redisOps, 'incr', async () => 6)
  const fetchMock = mock.method(globalThis, 'fetch', async () => geminiSuccess({}))

  const { res, state } = makeRes()
  await translateHandler(makeReq({ body: { english: 'Hello', targetLangs: ['vi'] } }), res)

  assert.equal(state.statusCode, 503)
  assert.equal(fetchMock.mock.calls.length, 0)
})

test('translate: a cached translation skips Gemini and the daily budget entirely', async () => {
  mock.method(deviceRateLimit, 'limit', async () => ({ success: true }))
  mock.method(ipRateLimit, 'limit', async () => ({ success: true }))
  mock.method(redisOps, 'get', async () => 'Xin chào')
  const fetchMock = mock.method(globalThis, 'fetch', async () => geminiSuccess({}))

  const { res, state } = makeRes()
  await translateHandler(makeReq({ body: { english: 'Hello', targetLangs: ['vi'], categoryHint: 'Greetings' } }), res)

  assert.equal(state.statusCode, 200)
  assert.equal(fetchMock.mock.calls.length, 0)
})

// --- /api/translate-bulk ---

test('translate-bulk: a valid normal request succeeds end-to-end', async () => {
  mock.method(deviceRateLimit, 'limit', async () => ({ success: true }))
  mock.method(ipRateLimit, 'limit', async () => ({ success: true }))
  mock.method(bulkDeviceRateLimit, 'limit', async () => ({ success: true }))
  mock.method(redisOps, 'get', async () => null)
  mock.method(redisOps, 'set', async () => 'OK')
  mock.method(globalThis, 'fetch', async () => bulkGeminiSuccess(['Xin chào', 'Tạm biệt']))

  const { res, state } = makeRes()
  await translateBulkHandler(makeReq({ body: { englishPhrases: ['Hello', 'Goodbye'], targetLangCode: 'vi' } }), res)

  assert.equal(state.statusCode, 200)
  assert.deepEqual((state.body as { translations: Record<string, string> }).translations, {
    Hello: 'Xin chào',
    Goodbye: 'Tạm biệt',
  })
})

test('translate-bulk: an oversized bulk request is rejected with 400', async () => {
  mock.method(deviceRateLimit, 'limit', async () => ({ success: true }))
  mock.method(ipRateLimit, 'limit', async () => ({ success: true }))
  mock.method(bulkDeviceRateLimit, 'limit', async () => ({ success: true }))

  const { res, state } = makeRes()
  const englishPhrases = Array.from({ length: 51 }, (_, i) => `phrase ${i}`)
  await translateBulkHandler(makeReq({ body: { englishPhrases, targetLangCode: 'vi' } }), res)

  assert.equal(state.statusCode, 400)
})

test('translate-bulk: the bulk-specific device limit returns 429 even when the general device limit has room', async () => {
  mock.method(deviceRateLimit, 'limit', async () => ({ success: true }))
  mock.method(ipRateLimit, 'limit', async () => ({ success: true }))
  mock.method(bulkDeviceRateLimit, 'limit', async () => ({ success: false }))

  const { res, state } = makeRes()
  await translateBulkHandler(makeReq({ body: { englishPhrases: ['Hello'], targetLangCode: 'vi' } }), res)

  assert.equal(state.statusCode, 429)
})

// --- /api/translate-alternatives ---

test('translate-alternatives: a valid normal request succeeds end-to-end', async () => {
  mock.method(deviceRateLimit, 'limit', async () => ({ success: true }))
  mock.method(ipRateLimit, 'limit', async () => ({ success: true }))
  mock.method(globalThis, 'fetch', async () => alternativesGeminiSuccess(['a', 'b', 'c', 'd']))

  const { res, state } = makeRes()
  await translateAlternativesHandler(makeReq({ body: { english: 'Hello', targetLangCode: 'vi' } }), res)

  assert.equal(state.statusCode, 200)
  assert.deepEqual((state.body as { alternatives: string[] }).alternatives, ['a', 'b', 'c', 'd'])
})

// --- CORS ---

test('CORS: echoes back the Capacitor Android WebView origin (https://localhost)', async () => {
  mock.method(deviceRateLimit, 'limit', async () => ({ success: true }))
  mock.method(ipRateLimit, 'limit', async () => ({ success: true }))
  mock.method(redisOps, 'get', async () => null)
  mock.method(redisOps, 'set', async () => 'OK')
  mock.method(globalThis, 'fetch', async () => geminiSuccess({ vi: 'Xin chào' }))

  const { res, state } = makeRes()
  await translateHandler(
    makeReq({
      headers: { 'x-device-id': 'device-1234', origin: 'https://localhost' },
      body: { english: 'Hello', targetLangs: ['vi'] },
    }),
    res,
  )

  assert.equal(state.headers['Access-Control-Allow-Origin'], 'https://localhost')
})

test('CORS: does not echo back an untrusted third-party origin', async () => {
  mock.method(deviceRateLimit, 'limit', async () => ({ success: true }))
  mock.method(ipRateLimit, 'limit', async () => ({ success: true }))
  mock.method(redisOps, 'get', async () => null)
  mock.method(redisOps, 'set', async () => 'OK')
  mock.method(globalThis, 'fetch', async () => geminiSuccess({ vi: 'Xin chào' }))

  const { res, state } = makeRes()
  await translateHandler(
    makeReq({
      headers: { 'x-device-id': 'device-1234', origin: 'https://evil.example.com' },
      body: { english: 'Hello', targetLangs: ['vi'] },
    }),
    res,
  )

  assert.equal(state.headers['Access-Control-Allow-Origin'], undefined)
})

test('CORS: an OPTIONS preflight from the app origin gets a 204 with the origin allowed', async () => {
  const { res, state } = makeRes()
  await translateHandler(makeReq({ method: 'OPTIONS', headers: { origin: 'https://localhost' } }), res)

  assert.equal(state.statusCode, 204)
  assert.equal(state.headers['Access-Control-Allow-Origin'], 'https://localhost')
})
