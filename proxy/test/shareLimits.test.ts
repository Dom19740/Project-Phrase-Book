import { test } from 'node:test'
import assert from 'node:assert/strict'
import { MAX_SHARE_PHRASES, MAX_SHARE_ENGLISH_LENGTH, MAX_SHARE_TEXT_LENGTH, validateShareSnapshot } from '../lib/shareLimits.js'

function validSnapshot(overrides: Record<string, unknown> = {}) {
  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    languages: [{ name: 'Vietnamese', code: 'vi' }],
    phrases: [{ english: 'Hello', category: 'Greetings', translations: [{ languageCode: 'vi', text: 'Xin chào', learned: false, favorite: false }] }],
    ...overrides,
  }
}

test('validateShareSnapshot accepts a normal single-language snapshot', () => {
  assert.equal(validateShareSnapshot(validSnapshot()), null)
})

test('validateShareSnapshot rejects a missing body', () => {
  assert.match(validateShareSnapshot(null) ?? '', /Missing body/)
  assert.match(validateShareSnapshot(undefined) ?? '', /Missing body/)
})

test('validateShareSnapshot rejects a missing version', () => {
  const err = validateShareSnapshot(validSnapshot({ version: undefined }))
  assert.match(err ?? '', /Missing version/)
})

test('validateShareSnapshot rejects empty languages', () => {
  const err = validateShareSnapshot(validSnapshot({ languages: [] }))
  assert.match(err ?? '', /Missing languages/)
})

test('validateShareSnapshot rejects a malformed language entry', () => {
  const err = validateShareSnapshot(validSnapshot({ languages: [{ name: 'Vietnamese' }] }))
  assert.match(err ?? '', /Invalid entry in languages/)
})

test('validateShareSnapshot rejects empty phrases', () => {
  const err = validateShareSnapshot(validSnapshot({ phrases: [] }))
  assert.match(err ?? '', /Missing phrases/)
})

test('validateShareSnapshot rejects too many phrases', () => {
  const phrases = Array.from({ length: MAX_SHARE_PHRASES + 1 }, (_, i) => ({ english: `phrase ${i}`, category: null, translations: [] }))
  const err = validateShareSnapshot(validSnapshot({ phrases }))
  assert.match(err ?? '', /phrases exceeds/)
})

test('validateShareSnapshot accepts exactly the maximum number of phrases', () => {
  const phrases = Array.from({ length: MAX_SHARE_PHRASES }, (_, i) => ({ english: `phrase ${i}`, category: null, translations: [] }))
  assert.equal(validateShareSnapshot(validSnapshot({ phrases })), null)
})

test('validateShareSnapshot rejects a malformed phrase entry', () => {
  const err = validateShareSnapshot(validSnapshot({ phrases: [{ category: null, translations: [] }] }))
  assert.match(err ?? '', /Invalid entry in phrases/)
})

test('validateShareSnapshot rejects a malformed translation entry', () => {
  const err = validateShareSnapshot(
    validSnapshot({ phrases: [{ english: 'Hello', category: null, translations: [{ languageCode: 'vi', text: 'Xin chào' }] }] }),
  )
  assert.match(err ?? '', /Invalid entry in phrases/)
})

test('validateShareSnapshot rejects a payload over the byte cap even though every individual phrase is within its own field limits', () => {
  // MAX_SHARE_PHRASES phrases, each right at the per-field length caps, sums well past
  // MAX_SHARE_PAYLOAD_BYTES even though no single phrase or field violates its own cap.
  const phrases = Array.from({ length: MAX_SHARE_PHRASES }, () => ({
    english: 'a'.repeat(MAX_SHARE_ENGLISH_LENGTH),
    category: null,
    translations: [{ languageCode: 'vi', text: 'b'.repeat(MAX_SHARE_TEXT_LENGTH), learned: false, favorite: false }],
  }))
  const err = validateShareSnapshot(validSnapshot({ phrases }))
  assert.match(err ?? '', /exceeds \d+ bytes/)
})
