import { getDeviceId } from './deviceId'

export interface TranslateResponse {
  translations: Record<string, string>
  suggestedCategory: string | null
}

/** Calls the translate proxy (never Gemini directly — the API key must not ship inside the app). */
export async function translatePhrase(
  english: string,
  targetLangCodes: string[],
  categoryHint: string | null,
  existingCategories: string[],
  targetLangNames: Record<string, string>,
): Promise<TranslateResponse> {
  const baseUrl = import.meta.env.VITE_TRANSLATE_API_URL
  if (!baseUrl) throw new Error('VITE_TRANSLATE_API_URL is not configured')

  const res = await fetch(`${baseUrl}/api/translate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Device-Id': getDeviceId(),
    },
    body: JSON.stringify({ english, targetLangs: targetLangCodes, categoryHint, existingCategories, targetLangNames }),
  })

  if (!res.ok) {
    const body = await res.json().catch(() => ({}) as { error?: string })
    throw new Error(body?.error || `Translate request failed (${res.status})`)
  }

  return res.json() as Promise<TranslateResponse>
}

/** Translates many English phrases into a single new language in as few requests as possible. */
export async function translatePhrasesBulk(englishPhrases: string[], targetLangCode: string, targetLangName: string): Promise<Record<string, string>> {
  const baseUrl = import.meta.env.VITE_TRANSLATE_API_URL
  if (!baseUrl) throw new Error('VITE_TRANSLATE_API_URL is not configured')

  const res = await fetch(`${baseUrl}/api/translate-bulk`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Device-Id': getDeviceId(),
    },
    body: JSON.stringify({ englishPhrases, targetLangCode, targetLangName }),
  })

  if (!res.ok) {
    const body = await res.json().catch(() => ({}) as { error?: string })
    throw new Error(body?.error || `Bulk translate request failed (${res.status})`)
  }

  const data = (await res.json()) as { translations: Record<string, string> }
  return data.translations
}
