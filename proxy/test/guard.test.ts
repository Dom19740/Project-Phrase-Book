import { test, mock, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import { bulkDeviceRateLimit, deviceRateLimit, ipRateLimit } from '../lib/redis.js'
import { classifyGeminiError, guardRequest } from '../lib/guard.js'
import { BudgetCheckFailedError, BudgetExceededError } from '../lib/dailyBudget.js'

afterEach(() => {
  mock.restoreAll()
  delete process.env.TRANSLATION_DISABLED
  delete process.env.DAILY_TRANSLATION_REQUEST_LIMIT
})

test('guardRequest allows a request when device and IP limits both pass', async () => {
  mock.method(deviceRateLimit, 'limit', async () => ({ success: true }))
  mock.method(ipRateLimit, 'limit', async () => ({ success: true }))

  assert.equal(await guardRequest({ deviceId: 'device-1', ip: '1.2.3.4' }), null)
})

test('guardRequest rejects (429) once the device limit is exceeded', async () => {
  mock.method(deviceRateLimit, 'limit', async () => ({ success: false }))
  mock.method(ipRateLimit, 'limit', async () => ({ success: true }))

  const result = await guardRequest({ deviceId: 'device-1', ip: '1.2.3.4' })
  assert.equal(result?.status, 429)
})

test('guardRequest rejects (429) once the IP limit is exceeded, even with device budget left', async () => {
  mock.method(deviceRateLimit, 'limit', async () => ({ success: true }))
  mock.method(ipRateLimit, 'limit', async () => ({ success: false }))

  const result = await guardRequest({ deviceId: 'device-1', ip: '1.2.3.4' })
  assert.equal(result?.status, 429)
})

test('guardRequest only checks the bulk-specific device limit when bulk is requested', async () => {
  mock.method(deviceRateLimit, 'limit', async () => ({ success: true }))
  mock.method(ipRateLimit, 'limit', async () => ({ success: true }))
  const bulkMock = mock.method(bulkDeviceRateLimit, 'limit', async () => ({ success: true }))

  await guardRequest({ deviceId: 'device-1', ip: '1.2.3.4' })
  assert.equal(bulkMock.mock.calls.length, 0)

  await guardRequest({ deviceId: 'device-1', ip: '1.2.3.4', bulk: true })
  assert.equal(bulkMock.mock.calls.length, 1)
})

test('guardRequest rejects (429) once the bulk-specific device limit is exceeded', async () => {
  mock.method(deviceRateLimit, 'limit', async () => ({ success: true }))
  mock.method(ipRateLimit, 'limit', async () => ({ success: true }))
  mock.method(bulkDeviceRateLimit, 'limit', async () => ({ success: false }))

  const result = await guardRequest({ deviceId: 'device-1', ip: '1.2.3.4', bulk: true })
  assert.equal(result?.status, 429)
})

test('guardRequest fails closed (503) when Redis throws — never silently lets the request through', async () => {
  mock.method(deviceRateLimit, 'limit', async () => {
    throw new Error('ECONNREFUSED')
  })
  mock.method(ipRateLimit, 'limit', async () => ({ success: true }))

  const result = await guardRequest({ deviceId: 'device-1', ip: '1.2.3.4' })
  assert.equal(result?.status, 503)
})

test('guardRequest short-circuits with 503 when the kill switch is on, without calling Redis at all', async () => {
  process.env.TRANSLATION_DISABLED = 'true'
  const deviceMock = mock.method(deviceRateLimit, 'limit', async () => ({ success: true }))

  const result = await guardRequest({ deviceId: 'device-1', ip: '1.2.3.4' })
  assert.equal(result?.status, 503)
  assert.equal(deviceMock.mock.calls.length, 0)
})

test('classifyGeminiError turns a BudgetExceededError into a controlled 503', () => {
  const failure = classifyGeminiError(new BudgetExceededError())
  assert.equal(failure.status, 503)
  assert.match(failure.error, /daily limit reached/)
})

test('classifyGeminiError turns a BudgetCheckFailedError into a controlled 503', () => {
  const failure = classifyGeminiError(new BudgetCheckFailedError())
  assert.equal(failure.status, 503)
})

test('classifyGeminiError turns any other error into the existing generic 502', () => {
  const failure = classifyGeminiError(new Error('Gemini request failed (500): boom'))
  assert.equal(failure.status, 502)
  assert.match(failure.error, /Translation service unavailable/)
})
