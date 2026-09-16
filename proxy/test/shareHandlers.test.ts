import { test, mock, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import type { VercelRequest, VercelResponse } from '@vercel/node'
import createHandler from '../api/share/create.js'
import codeHandler from '../api/share/[code].js'
import { shareCreateDeviceRateLimit, shareCreateIpRateLimit, shareReadIpRateLimit } from '../lib/redis.js'
import { redisOps } from '../lib/redisOps.js'
import { MAX_SHARE_PHRASES } from '../lib/shareLimits.js'

function makeReq(overrides: Partial<VercelRequest> & { body?: unknown; query?: Record<string, unknown> } = {}): VercelRequest {
  return {
    method: 'POST',
    headers: { 'x-device-id': 'device-1234', 'x-forwarded-for': '203.0.113.9' },
    body: {},
    query: {},
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
    send(payload: unknown) {
      state.body = payload
      return res
    },
    end() {
      return res
    },
  } as unknown as VercelResponse
  return { res, state }
}

function validSnapshot() {
  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    languages: [{ name: 'Vietnamese', code: 'vi' }],
    phrases: [{ english: 'Hello', category: 'Greetings', translations: [{ languageCode: 'vi', text: 'Xin chào', learned: false, favorite: false }] }],
  }
}

afterEach(() => {
  mock.restoreAll()
})

// --- POST /api/share/create ---

test('share/create: a valid request stores the snapshot and returns a code + url', async () => {
  mock.method(shareCreateDeviceRateLimit, 'limit', async () => ({ success: true }))
  mock.method(shareCreateIpRateLimit, 'limit', async () => ({ success: true }))
  mock.method(redisOps, 'get', async () => null)
  const setexMock = mock.method(redisOps, 'setex', async () => 'OK')

  const { res, state } = makeRes()
  await createHandler(makeReq({ body: validSnapshot() }), res)

  assert.equal(state.statusCode, 200)
  const body = state.body as { code: string; url: string }
  assert.match(body.code, /^[A-Za-z0-9]{12}$/)
  assert.equal(body.url, `https://travelchatter.dpbcreative.com/c/${body.code}`)
  assert.equal(setexMock.mock.calls.length, 1)
  assert.equal(setexMock.mock.calls[0].arguments[2], 60 * 60 * 24 * 30)
})

test('share/create: missing X-Device-Id is rejected with 400', async () => {
  const { res, state } = makeRes()
  await createHandler(makeReq({ headers: {}, body: validSnapshot() }), res)
  assert.equal(state.statusCode, 400)
})

test('share/create: an invalid snapshot is rejected with 400 and never reaches Redis', async () => {
  mock.method(shareCreateDeviceRateLimit, 'limit', async () => ({ success: true }))
  mock.method(shareCreateIpRateLimit, 'limit', async () => ({ success: true }))
  const setexMock = mock.method(redisOps, 'setex', async () => 'OK')

  const { res, state } = makeRes()
  await createHandler(makeReq({ body: { version: 1, languages: [], phrases: [] } }), res)

  assert.equal(state.statusCode, 400)
  assert.equal(setexMock.mock.calls.length, 0)
})

test('share/create: an oversized phrase list is rejected with 400', async () => {
  mock.method(shareCreateDeviceRateLimit, 'limit', async () => ({ success: true }))
  mock.method(shareCreateIpRateLimit, 'limit', async () => ({ success: true }))

  const phrases = Array.from({ length: MAX_SHARE_PHRASES + 1 }, (_, i) => ({ english: `phrase ${i}`, category: null, translations: [] }))
  const { res, state } = makeRes()
  await createHandler(makeReq({ body: { ...validSnapshot(), phrases } }), res)

  assert.equal(state.statusCode, 400)
})

test('share/create: device rate limit exceeded returns 429', async () => {
  mock.method(shareCreateDeviceRateLimit, 'limit', async () => ({ success: false }))
  mock.method(shareCreateIpRateLimit, 'limit', async () => ({ success: true }))

  const { res, state } = makeRes()
  await createHandler(makeReq({ body: validSnapshot() }), res)

  assert.equal(state.statusCode, 429)
})

test('share/create: a Redis failure during rate limiting returns a controlled 503', async () => {
  mock.method(shareCreateDeviceRateLimit, 'limit', async () => {
    throw new Error('ECONNREFUSED')
  })
  mock.method(shareCreateIpRateLimit, 'limit', async () => ({ success: true }))

  const { res, state } = makeRes()
  await createHandler(makeReq({ body: validSnapshot() }), res)

  assert.equal(state.statusCode, 503)
})

// --- GET /api/share/[code] ---

test('share/[code]: a stored code returns the snapshot JSON', async () => {
  mock.method(shareReadIpRateLimit, 'limit', async () => ({ success: true }))
  mock.method(redisOps, 'get', async () => JSON.stringify(validSnapshot()))

  const { res, state } = makeRes()
  await codeHandler(makeReq({ method: 'GET', query: { code: 'abc123XYZ789' } }), res)

  assert.equal(state.statusCode, 200)
  assert.deepEqual(JSON.parse(state.body as string), validSnapshot())
})

test('share/[code]: a missing/expired code returns 404', async () => {
  mock.method(shareReadIpRateLimit, 'limit', async () => ({ success: true }))
  mock.method(redisOps, 'get', async () => null)

  const { res, state } = makeRes()
  await codeHandler(makeReq({ method: 'GET', query: { code: 'doesnotexist' } }), res)

  assert.equal(state.statusCode, 404)
})

test('share/[code]: IP rate limit exceeded returns 429', async () => {
  mock.method(shareReadIpRateLimit, 'limit', async () => ({ success: false }))

  const { res, state } = makeRes()
  await codeHandler(makeReq({ method: 'GET', query: { code: 'abc123XYZ789' } }), res)

  assert.equal(state.statusCode, 429)
})

test('share/[code]: a missing code query param returns 400', async () => {
  const { res, state } = makeRes()
  await codeHandler(makeReq({ method: 'GET', query: {} }), res)

  assert.equal(state.statusCode, 400)
})
