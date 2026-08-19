import { getDeviceId } from './deviceId'

export interface TranslateResponse {
  translations: Record<string, string>
  suggestedCategory: string | null
}

// Must comfortably exceed the proxy's own worst case (one Gemini call plus one retry — see
// REQUEST_TIMEOUT_MS/RETRY_BACKOFF_MS in proxy/lib/gemini.ts, ~40.5s) — otherwise the client
// aborts and reports "timed out" on requests the proxy would have completed successfully a
// few seconds later.
const REQUEST_TIMEOUT_MS = 45000

// Gemini's free-tier quota returns 429/503 under routine load, and the proxy already retries
// once itself — but a single remaining failure was still always shown straight to the user.
// One bounded client-side retry absorbs the common case (a transient blip) instead of
// surfacing every one of them as an error.
const RETRYABLE_STATUSES = new Set([429, 502])
const DEFAULT_RETRY_DELAY_MS = 2000
const MAX_RETRY_DELAY_MS = 8000

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

/**
 * postJson with one bounded retry for transient upstream failures: Gemini's own rate limit
 * (429, carries a retryAfterMs telling us how long Gemini's quota needs) and a Gemini
 * request/overload failure that survived the proxy's own retry (502). Our *own* per-device/IP
 * rate limit also returns 429 but without retryAfterMs (its window is an hour) — retrying that
 * immediately would just fail again, so it's deliberately left alone.
 */
async function postJsonWithRetry(url: string, body: unknown): Promise<Response> {
  const res = await postJson(url, body)
  if (res.ok || !RETRYABLE_STATUSES.has(res.status)) return res

  const errBody = await res
    .clone()
    .json()
    .catch(() => ({}) as { retryAfterMs?: number })
  if (res.status === 429 && errBody.retryAfterMs == null) return res

  const delay = Math.min(errBody.retryAfterMs ?? DEFAULT_RETRY_DELAY_MS, MAX_RETRY_DELAY_MS)
  await new Promise((resolve) => setTimeout(resolve, delay))
  return postJson(url, body)
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

  const res = await postJsonWithRetry(`${baseUrl}/api/translate`, { english, targetLangs: targetLangCodes, categoryHint, existingCategories, targetLangNames })

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

  const res = await postJsonWithRetry(`${baseUrl}/api/translate-bulk`, { englishPhrases, targetLangCode, targetLangName })

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

  const res = await postJsonWithRetry(`${baseUrl}/api/translate-alternatives`, { english, targetLangCode, targetLangName })

  if (!res.ok) {
    const body = await res.json().catch(() => ({}) as { error?: string })
    throw new Error(body?.error || `Alternatives request failed (${res.status})`)
  }

  const data = (await res.json()) as { alternatives: string[] }
  return data.alternatives
}
