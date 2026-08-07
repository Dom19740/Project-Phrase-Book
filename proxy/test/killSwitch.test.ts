import { test, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import { isTranslationDisabled } from '../lib/killSwitch.js'

afterEach(() => {
  delete process.env.TRANSLATION_DISABLED
})

test('isTranslationDisabled is false by default', () => {
  delete process.env.TRANSLATION_DISABLED
  assert.equal(isTranslationDisabled(), false)
})

test('isTranslationDisabled is false for any value other than the literal string "true"', () => {
  process.env.TRANSLATION_DISABLED = '1'
  assert.equal(isTranslationDisabled(), false)
})

test('isTranslationDisabled is true when set to "true"', () => {
  process.env.TRANSLATION_DISABLED = 'true'
  assert.equal(isTranslationDisabled(), true)
})
