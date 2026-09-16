import { test, mock, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import { shareCreateDeviceRateLimit, shareCreateIpRateLimit, shareReadIpRateLimit } from '../lib/redis.js'
import { guardShareCreate, guardShareRead } from '../lib/shareGuard.js'

afterEach(() => {
  mock.restoreAll()
})

test('guardShareCreate allows a request when device and IP limits both pass', async () => {
  mock.method(shareCreateDeviceRateLimit, 'limit', async () => ({ success: true }))
  mock.method(shareCreateIpRateLimit, 'limit', async () => ({ success: true }))

  assert.equal(await guardShareCreate({ deviceId: 'device-1', ip: '1.2.3.4' }), null)
})

test('guardShareCreate rejects (429) once the device limit is exceeded', async () => {
  mock.method(shareCreateDeviceRateLimit, 'limit', async () => ({ success: false }))
  mock.method(shareCreateIpRateLimit, 'limit', async () => ({ success: true }))

  const result = await guardShareCreate({ deviceId: 'device-1', ip: '1.2.3.4' })
  assert.equal(result?.status, 429)
})

test('guardShareCreate rejects (429) once the IP limit is exceeded, even with device budget left', async () => {
  mock.method(shareCreateDeviceRateLimit, 'limit', async () => ({ success: true }))
  mock.method(shareCreateIpRateLimit, 'limit', async () => ({ success: false }))

  const result = await guardShareCreate({ deviceId: 'device-1', ip: '1.2.3.4' })
  assert.equal(result?.status, 429)
})

test('guardShareCreate fails closed (503) when Redis throws', async () => {
  mock.method(shareCreateDeviceRateLimit, 'limit', async () => {
    throw new Error('ECONNREFUSED')
  })
  mock.method(shareCreateIpRateLimit, 'limit', async () => ({ success: true }))

  const result = await guardShareCreate({ deviceId: 'device-1', ip: '1.2.3.4' })
  assert.equal(result?.status, 503)
})

test('guardShareRead allows a request when the IP limit passes', async () => {
  mock.method(shareReadIpRateLimit, 'limit', async () => ({ success: true }))
  assert.equal(await guardShareRead({ ip: '1.2.3.4' }), null)
})

test('guardShareRead rejects (429) once the IP limit is exceeded', async () => {
  mock.method(shareReadIpRateLimit, 'limit', async () => ({ success: false }))
  const result = await guardShareRead({ ip: '1.2.3.4' })
  assert.equal(result?.status, 429)
})

test('guardShareRead fails closed (503) when Redis throws', async () => {
  mock.method(shareReadIpRateLimit, 'limit', async () => {
    throw new Error('ECONNREFUSED')
  })
  const result = await guardShareRead({ ip: '1.2.3.4' })
  assert.equal(result?.status, 503)
})
