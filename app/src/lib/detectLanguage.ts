import { LANGUAGE_OPTIONS, type LanguageOption } from './languageOptions'

/**
 * Unicode ranges that are, in practice, unique to one language in LANGUAGE_OPTIONS — safe to
 * auto-suggest from. Scripts shared by several unrelated languages (Arabic/Persian/Urdu/Pashto,
 * Hindi/Marathi/Nepali's Devanagari, Cyrillic, Han) are deliberately left out: guessing wrong
 * there is worse than not guessing, so those are left for the user to pick from the list.
 */
const SCRIPT_RULES: { code: string; test: RegExp }[] = [
  // Vietnamese tone-marked vowels (Latin Extended Additional, U+1E00-1EFF) plus ơ/ư/đ.
  { code: 'vi', test: /[Ḁ-ỿƠơƯưĐđ]/ },
  { code: 'ko', test: /[가-힣]/ }, // Hangul syllables
  { code: 'ja', test: /[぀-ヿ]/ }, // Hiragana + Katakana
  { code: 'th', test: /[฀-๿]/ }, // Thai
  { code: 'el', test: /[Ͱ-Ͽ]/ }, // Greek
  { code: 'he', test: /[֐-׿]/ }, // Hebrew
  { code: 'km', test: /[ក-៿]/ }, // Khmer
  { code: 'lo', test: /[຀-໿]/ }, // Lao
  { code: 'my', test: /[က-႟]/ }, // Burmese
  { code: 'si', test: /[඀-෿]/ }, // Sinhala
  { code: 'ka', test: /[Ⴀ-ჿ]/ }, // Georgian
  { code: 'hy', test: /[԰-֏]/ }, // Armenian
  { code: 'bn', test: /[ঀ-৿]/ }, // Bengali
  { code: 'gu', test: /[઀-૿]/ }, // Gujarati
  { code: 'pa', test: /[਀-੿]/ }, // Gurmukhi (Punjabi)
  { code: 'ta', test: /[஀-௿]/ }, // Tamil
  { code: 'te', test: /[ఀ-౿]/ }, // Telugu
  { code: 'kn', test: /[ಀ-೿]/ }, // Kannada
  { code: 'ml', test: /[ഀ-ൿ]/ }, // Malayalam
  { code: 'mn', test: /[᠀-᢯]/ }, // Mongolian
]

/**
 * Best-effort language guess from a sample of already-translated text, using script alone —
 * there's no translation-detection API wired up (that would need a new backend endpoint), so this
 * is a local heuristic offered as a pre-filled suggestion, not an authoritative answer. Returns
 * null when the text is empty or its script doesn't uniquely identify a language.
 */
export function detectLanguage(sampleTexts: string[]): LanguageOption | null {
  const text = sampleTexts.filter(Boolean).join(' ')
  if (!text.trim()) return null

  for (const rule of SCRIPT_RULES) {
    if (rule.test.test(text)) {
      return LANGUAGE_OPTIONS.find((l) => l.code === rule.code) ?? null
    }
  }
  return null
}
