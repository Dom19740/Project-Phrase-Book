// Structural validation for a shared phrase collection. The proxy can't import app/'s
// BackupSnapshot type across the deploy boundary, so this re-checks the same shape
// independently rather than sharing the type.
export const MAX_SHARE_PHRASES = 500
export const MAX_SHARE_PAYLOAD_BYTES = 150_000
export const MAX_SHARE_ENGLISH_LENGTH = 300
export const MAX_SHARE_CATEGORY_LENGTH = 100
export const MAX_SHARE_TEXT_LENGTH = 300
export const MAX_SHARE_LANG_CODE_LENGTH = 20
export const MAX_SHARE_LANG_NAME_LENGTH = 60

interface ShareSnapshotBody {
  version?: unknown
  languages?: unknown
  phrases?: unknown
}

function isValidLanguage(value: unknown): boolean {
  if (typeof value !== 'object' || value === null) return false
  const l = value as Record<string, unknown>
  return (
    typeof l.name === 'string' &&
    l.name.length > 0 &&
    l.name.length <= MAX_SHARE_LANG_NAME_LENGTH &&
    typeof l.code === 'string' &&
    l.code.length > 0 &&
    l.code.length <= MAX_SHARE_LANG_CODE_LENGTH
  )
}

function isValidTranslation(value: unknown): boolean {
  if (typeof value !== 'object' || value === null) return false
  const t = value as Record<string, unknown>
  return (
    typeof t.languageCode === 'string' &&
    t.languageCode.length <= MAX_SHARE_LANG_CODE_LENGTH &&
    typeof t.text === 'string' &&
    t.text.length <= MAX_SHARE_TEXT_LENGTH &&
    typeof t.learned === 'boolean' &&
    typeof t.favorite === 'boolean'
  )
}

function isValidPhrase(value: unknown): boolean {
  if (typeof value !== 'object' || value === null) return false
  const p = value as Record<string, unknown>
  return (
    typeof p.english === 'string' &&
    p.english.length > 0 &&
    p.english.length <= MAX_SHARE_ENGLISH_LENGTH &&
    (p.category === null || (typeof p.category === 'string' && p.category.length <= MAX_SHARE_CATEGORY_LENGTH)) &&
    Array.isArray(p.translations) &&
    p.translations.every(isValidTranslation)
  )
}

/** Returns a client-facing error message, or null if the body is a valid, size-capped share payload. */
export function validateShareSnapshot(body: ShareSnapshotBody | null | undefined): string | null {
  if (typeof body !== 'object' || body === null) return 'Missing body'
  if (typeof body.version !== 'number') return 'Missing version'

  if (!Array.isArray(body.languages) || body.languages.length === 0) return 'Missing languages'
  if (!body.languages.every(isValidLanguage)) return 'Invalid entry in languages'

  if (!Array.isArray(body.phrases) || body.phrases.length === 0) return 'Missing phrases'
  if (body.phrases.length > MAX_SHARE_PHRASES) return `phrases exceeds ${MAX_SHARE_PHRASES} entries`
  if (!body.phrases.every(isValidPhrase)) return 'Invalid entry in phrases'

  const byteSize = Buffer.byteLength(JSON.stringify(body), 'utf8')
  if (byteSize > MAX_SHARE_PAYLOAD_BYTES) return `Payload exceeds ${MAX_SHARE_PAYLOAD_BYTES} bytes`

  return null
}
