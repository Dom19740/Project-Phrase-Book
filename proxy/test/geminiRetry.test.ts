import { test, mock, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import { translateWithGemini } from '../lib/gemini.js'

function geminiHttpError(status: number, message = 'error'): Response {
  return {
    ok: false,
    status,
    text: async () => message,
  } as unknown as Response
}

function geminiSuccess(translations: Record<string, string>): Response {
  return {
    ok: true,
    status: 200,
    text: async () => '',
    json: async () => ({ candidates: [{ content: { parts: [{ text: JSON.stringify({ translations }) }] } }] }),
  } as unknown as Response
}

function abortError(): Error {
  const err = new Error('The operation was aborted')
  err.name = 'AbortError'
  return err
}

afterEach(() => {
  mock.restoreAll()
})

test('does not retry on a 429 — fails immediately, exactly one call', async () => {
  let calls = 0
  mock.method(globalThis, 'fetch', async () => {
    calls++
    return geminiHttpError(429, 'rate limited')
  })

  await assert.rejects(() => translateWithGemini('Hello', [{ code: 'vi', name: 'Vietnamese' }], 'Greetings', []))
  assert.equal(calls, 1)
})

test('retries exactly once on a 500, then succeeds', async () => {
  let calls = 0
  mock.method(globalThis, 'fetch', async () => {
    calls++
    if (calls === 1) return geminiHttpError(500, 'server error')
    return geminiSuccess({ vi: 'Xin chào' })
  })

  const result = await translateWithGemini('Hello', [{ code: 'vi', name: 'Vietnamese' }], 'Greetings', [])
  assert.equal(calls, 2)
  assert.equal(result.translations.vi, 'Xin chào')
})

test('retries once on a timeout (AbortError), then succeeds', async () => {
  let calls = 0
  mock.method(globalThis, 'fetch', async () => {
    calls++
    if (calls === 1) throw abortError()
    return geminiSuccess({ vi: 'Xin chào' })
  })

  const result = await translateWithGemini('Hello', [{ code: 'vi', name: 'Vietnamese' }], 'Greetings', [])
  assert.equal(calls, 2)
  assert.equal(result.translations.vi, 'Xin chào')
})

test('never retries more than once — a persistent 5xx still stops at two total attempts', async () => {
  let calls = 0
  mock.method(globalThis, 'fetch', async () => {
    calls++
    return geminiHttpError(503, 'still down')
  })

  await assert.rejects(() => translateWithGemini('Hello', [{ code: 'vi', name: 'Vietnamese' }], 'Greetings', []))
  assert.equal(calls, 2)
})

test('does not retry a plain 400 (non-5xx, non-429) client error', async () => {
  let calls = 0
  mock.method(globalThis, 'fetch', async () => {
    calls++
    return geminiHttpError(400, 'bad request')
  })

  await assert.rejects(() => translateWithGemini('Hello', [{ code: 'vi', name: 'Vietnamese' }], 'Greetings', []))
  assert.equal(calls, 1)
})

test('a single successful call needs no retry', async () => {
  let calls = 0
  mock.method(globalThis, 'fetch', async () => {
    calls++
    return geminiSuccess({ vi: 'Xin chào' })
  })

  const result = await translateWithGemini('Hello', [{ code: 'vi', name: 'Vietnamese' }], 'Greetings', [])
  assert.equal(calls, 1)
  assert.equal(result.translations.vi, 'Xin chào')
})
