import { test } from 'node:test'
import assert from 'node:assert/strict'
import type { VercelRequest } from '@vercel/node'
import { getClientIp } from '../lib/clientIp.js'

function makeReq(headers: Record<string, string | string[] | undefined>): VercelRequest {
  return { headers } as unknown as VercelRequest
}

test('getClientIp reads the first entry of x-forwarded-for (the client, per Vercel — closest hop first)', () => {
  const req = makeReq({ 'x-forwarded-for': '203.0.113.5, 70.41.3.18' })
  assert.equal(getClientIp(req), '203.0.113.5')
})

test('getClientIp trims whitespace around the extracted IP', () => {
  const req = makeReq({ 'x-forwarded-for': ' 203.0.113.5 , 70.41.3.18' })
  assert.equal(getClientIp(req), '203.0.113.5')
})

test('getClientIp falls back to x-real-ip when x-forwarded-for is absent', () => {
  const req = makeReq({ 'x-real-ip': '198.51.100.7' })
  assert.equal(getClientIp(req), '198.51.100.7')
})

test('getClientIp returns "unknown" when neither header is present, rather than trusting an arbitrary client-supplied header', () => {
  const req = makeReq({ 'x-forwarded-for-fake-client-header': '9.9.9.9' })
  assert.equal(getClientIp(req), 'unknown')
})
