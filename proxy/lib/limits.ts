// Hard, unconditional caps on request size, independent of any identity/rate-limit control —
// bounds the worst-case cost of a single request regardless of how it got past everything else.
export const MAX_PHRASE_LENGTH = 300
export const MAX_BULK_PHRASES = 50
export const MAX_TARGET_LANGS = 25
export const MAX_CATEGORY_LENGTH = 100
export const MAX_EXISTING_CATEGORIES = 200
export const MAX_LANG_CODE_LENGTH = 20
export const MAX_LANG_NAME_LENGTH = 60

interface TranslateBody {
  english?: unknown
  categoryHint?: unknown
  targetLangs?: unknown
  targetLangNames?: unknown
  existingCategories?: unknown
}

interface BulkBody {
  englishPhrases?: unknown
  targetLangCode?: unknown
  targetLangName?: unknown
}

interface AlternativesBody {
  english?: unknown
  targetLangCode?: unknown
  targetLangName?: unknown
}

function isLangCodeValid(code: unknown): code is string {
  return typeof code === 'string' && code.length > 0 && code.length <= MAX_LANG_CODE_LENGTH
}

function isLangNameValid(name: unknown): name is string {
  return typeof name === 'string' && name.length > 0 && name.length <= MAX_LANG_NAME_LENGTH
}

/** Returns a client-facing error message, or null if the body is within all limits. */
export function validateTranslateBody(body: TranslateBody | null | undefined): string | null {
  if (typeof body?.english !== 'string' || !body.english.trim()) return 'Missing english'
  if (body.english.length > MAX_PHRASE_LENGTH) return `english exceeds ${MAX_PHRASE_LENGTH} characters`

  if (!Array.isArray(body.targetLangs) || body.targetLangs.length === 0) return 'Missing targetLangs'
  if (body.targetLangs.length > MAX_TARGET_LANGS) return `targetLangs exceeds ${MAX_TARGET_LANGS} entries`
  if (!body.targetLangs.every(isLangCodeValid)) return 'Invalid entry in targetLangs'

  if (body.categoryHint != null) {
    if (typeof body.categoryHint !== 'string' || body.categoryHint.length > MAX_CATEGORY_LENGTH) {
      return `categoryHint exceeds ${MAX_CATEGORY_LENGTH} characters`
    }
  }

  if (body.existingCategories != null) {
    if (!Array.isArray(body.existingCategories) || body.existingCategories.length > MAX_EXISTING_CATEGORIES) {
      return `existingCategories exceeds ${MAX_EXISTING_CATEGORIES} entries`
    }
    if (!body.existingCategories.every((c) => typeof c === 'string' && c.length <= MAX_CATEGORY_LENGTH)) {
      return 'Invalid entry in existingCategories'
    }
  }

  if (body.targetLangNames != null) {
    if (typeof body.targetLangNames !== 'object' || Array.isArray(body.targetLangNames)) return 'Invalid targetLangNames'
    if (!Object.values(body.targetLangNames).every(isLangNameValid)) return 'Invalid entry in targetLangNames'
  }

  return null
}

export function validateBulkBody(body: BulkBody | null | undefined): string | null {
  if (!Array.isArray(body?.englishPhrases) || body.englishPhrases.length === 0) return 'Missing englishPhrases'
  if (body.englishPhrases.length > MAX_BULK_PHRASES) return `englishPhrases exceeds ${MAX_BULK_PHRASES} entries`
  for (const phrase of body.englishPhrases) {
    if (typeof phrase !== 'string' || !phrase.trim()) return 'Invalid entry in englishPhrases'
    if (phrase.length > MAX_PHRASE_LENGTH) return `A phrase in englishPhrases exceeds ${MAX_PHRASE_LENGTH} characters`
  }

  if (!isLangCodeValid(body.targetLangCode)) return 'Missing or invalid targetLangCode'
  if (body.targetLangName != null && !isLangNameValid(body.targetLangName)) return 'Invalid targetLangName'

  return null
}

export function validateAlternativesBody(body: AlternativesBody | null | undefined): string | null {
  if (typeof body?.english !== 'string' || !body.english.trim()) return 'Missing english'
  if (body.english.length > MAX_PHRASE_LENGTH) return `english exceeds ${MAX_PHRASE_LENGTH} characters`

  if (!isLangCodeValid(body.targetLangCode)) return 'Missing or invalid targetLangCode'
  if (body.targetLangName != null && !isLangNameValid(body.targetLangName)) return 'Invalid targetLangName'

  return null
}
