import { test } from 'node:test'
import assert from 'node:assert/strict'
import { MAX_BULK_PHRASES, MAX_PHRASE_LENGTH, MAX_TARGET_LANGS, validateAlternativesBody, validateBulkBody, validateTranslateBody } from '../lib/limits.js'

test('validateTranslateBody accepts a normal request', () => {
  assert.equal(validateTranslateBody({ english: 'Hello', targetLangs: ['vi', 'fr'] }), null)
})

test('validateTranslateBody rejects an oversized phrase', () => {
  const err = validateTranslateBody({ english: 'a'.repeat(MAX_PHRASE_LENGTH + 1), targetLangs: ['vi'] })
  assert.match(err ?? '', /exceeds/)
})

test('validateTranslateBody accepts a phrase exactly at the limit', () => {
  assert.equal(validateTranslateBody({ english: 'a'.repeat(MAX_PHRASE_LENGTH), targetLangs: ['vi'] }), null)
})

test('validateTranslateBody rejects too many target languages', () => {
  const targetLangs = Array.from({ length: MAX_TARGET_LANGS + 1 }, (_, i) => `l${i}`)
  const err = validateTranslateBody({ english: 'Hello', targetLangs })
  assert.match(err ?? '', /targetLangs exceeds/)
})

test('validateTranslateBody accepts exactly the maximum number of target languages', () => {
  const targetLangs = Array.from({ length: MAX_TARGET_LANGS }, (_, i) => `l${i}`)
  assert.equal(validateTranslateBody({ english: 'Hello', targetLangs }), null)
})

test('validateTranslateBody rejects a missing english field', () => {
  const err = validateTranslateBody({ targetLangs: ['vi'] })
  assert.match(err ?? '', /Missing english/)
})

test('validateTranslateBody rejects an oversized categoryHint', () => {
  const err = validateTranslateBody({ english: 'Hello', targetLangs: ['vi'], categoryHint: 'a'.repeat(101) })
  assert.match(err ?? '', /categoryHint/)
})

test('validateTranslateBody rejects an oversized existingCategories array', () => {
  const existingCategories = Array.from({ length: 201 }, (_, i) => `cat${i}`)
  const err = validateTranslateBody({ english: 'Hello', targetLangs: ['vi'], existingCategories })
  assert.match(err ?? '', /existingCategories/)
})

test('validateBulkBody accepts a normal request', () => {
  assert.equal(validateBulkBody({ englishPhrases: ['Hello', 'Goodbye'], targetLangCode: 'vi' }), null)
})

test('validateBulkBody rejects an oversized bulk request', () => {
  const englishPhrases = Array.from({ length: MAX_BULK_PHRASES + 1 }, (_, i) => `phrase ${i}`)
  const err = validateBulkBody({ englishPhrases, targetLangCode: 'vi' })
  assert.match(err ?? '', /englishPhrases exceeds/)
})

test('validateBulkBody accepts exactly the maximum bulk size', () => {
  const englishPhrases = Array.from({ length: MAX_BULK_PHRASES }, (_, i) => `phrase ${i}`)
  assert.equal(validateBulkBody({ englishPhrases, targetLangCode: 'vi' }), null)
})

test('validateBulkBody rejects an oversized phrase inside an otherwise-valid array', () => {
  const err = validateBulkBody({ englishPhrases: ['a'.repeat(MAX_PHRASE_LENGTH + 1)], targetLangCode: 'vi' })
  assert.match(err ?? '', /exceeds/)
})

test('validateBulkBody rejects a missing targetLangCode', () => {
  const err = validateBulkBody({ englishPhrases: ['Hello'] })
  assert.match(err ?? '', /targetLangCode/)
})

test('validateAlternativesBody accepts a normal request', () => {
  assert.equal(validateAlternativesBody({ english: 'Hello', targetLangCode: 'vi' }), null)
})

test('validateAlternativesBody rejects an oversized phrase', () => {
  const err = validateAlternativesBody({ english: 'a'.repeat(MAX_PHRASE_LENGTH + 1), targetLangCode: 'vi' })
  assert.match(err ?? '', /exceeds/)
})

test('validateAlternativesBody rejects a missing targetLangCode', () => {
  const err = validateAlternativesBody({ english: 'Hello' })
  assert.match(err ?? '', /targetLangCode/)
})
