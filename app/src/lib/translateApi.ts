import { getDeviceId } from './deviceId'

export interface TranslateResponse {
  translations: Record<string, string>
  suggestedCategory: string | null
}

const REQUEST_TIMEOUT_MS = 15000

/** POSTs JSON with a hard client-side timeout so a hung connection can't spin forever. */
async function postJson(url: string, body: unknown): Promise<Response> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
  try {
    return await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Device-Id': getDeviceId(),
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    })
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') throw new Error('Translation request timed out')
    throw err
  } finally {
    clearTimeout(timeout)
  }
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

  const res = await postJson(`${baseUrl}/api/translate`, { english, targetLangs: targetLangCodes, categoryHint, existingCategories, targetLangNames })

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

  const res = await postJson(`${baseUrl}/api/translate-bulk`, { englishPhrases, targetLangCode, targetLangName })

  if (!res.ok) {
    const body = await res.json().catch(() => ({}) as { error?: string })
    throw new Error(body?.error || `Bulk translate request failed (${res.status})`)
  }

  const data = (await res.json()) as { translations: Record<string, string> }
  return data.translations
}

/** Fetches several distinct phrasings of one phrase in one language — used for the "retranslate / alternatives" action on an existing translation. */
export async function translateAlternatives(english: string, targetLangCode: string, targetLangName: string): Promise<string[]> {
  const baseUrl = import.meta.env.VITE_TRANSLATE_API_URL
  if (!baseUrl) throw new Error('VITE_TRANSLATE_API_URL is not configured')

  const res = await postJson(`${baseUrl}/api/translate-alternatives`, { english, targetLangCode, targetLangName })

  if (!res.ok) {
    const body = await res.json().catch(() => ({}) as { error?: string })
    throw new Error(body?.error || `Alternatives request failed (${res.status})`)
  }

  const data = (await res.json()) as { alternatives: string[] }
  return data.alternatives
}
