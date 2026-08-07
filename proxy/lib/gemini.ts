import { ensureBudgetAvailable } from './dailyBudget.js'

const GEMINI_MODEL = 'gemini-flash-latest'
const REQUEST_TIMEOUT_MS = Number(process.env.GEMINI_TIMEOUT_MS ?? 20000)
// Only one retry ever happens, so a single fixed delay (rather than a multi-step exponential
// curve) is sufficient — it exists to avoid immediately re-hammering a struggling upstream.
const RETRY_BACKOFF_MS = Number(process.env.GEMINI_RETRY_BACKOFF_MS ?? 500)

export interface TargetLanguage {
  code: string
  name: string
}

export interface TranslateResult {
  translations: Record<string, string>
  suggestedCategory: string | null
}

class GeminiHttpError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

function isRetryable(err: unknown): boolean {
  if (err instanceof GeminiHttpError) return err.status >= 500
  // Network failures and our own timeout both surface as a plain Error here — retryable.
  // A malformed/unparseable Gemini response is not (retrying won't fix a schema mismatch).
  return err instanceof Error && err.message === 'Gemini request timed out'
}

async function fetchGeminiOnce(requestBody: unknown, apiKey: string): Promise<string> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
      signal: controller.signal,
    })

    if (!res.ok) {
      const text = await res.text()
      throw new GeminiHttpError(`Gemini request failed (${res.status}): ${text}`, res.status)
    }

    const data = (await res.json()) as { candidates?: { content?: { parts?: { text?: string }[] } }[] }
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text
    if (!text) throw new Error('Gemini returned no content')
    return text
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') throw new Error('Gemini request timed out')
    throw err
  } finally {
    clearTimeout(timeout)
  }
}

/**
 * Calls Gemini with a request timeout and at most one retry.
 * - No retry on 429 (Gemini's own rate limit) or on 4xx — retrying won't help and only adds load.
 * - No retry on a malformed/unparseable response — a schema mismatch won't fix itself.
 * - Exactly one retry, after a short backoff, for 5xx responses and timeouts — never a loop.
 *
 * The daily budget is checked immediately before *every* actual outbound call this function
 * makes, including the retry — one unit per real Gemini call, not one per callGemini()
 * invocation, so a retry can't consume a Gemini call for free, and a caller (translateBulkWithGemini,
 * batching internally) that ends up making several real calls is charged for each of them.
 */
async function callGemini(requestBody: unknown): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) throw new Error('GEMINI_API_KEY is not configured')

  await ensureBudgetAvailable()
  try {
    return await fetchGeminiOnce(requestBody, apiKey)
  } catch (err) {
    if (!isRetryable(err)) throw err
    await new Promise((resolve) => setTimeout(resolve, RETRY_BACKOFF_MS))
    await ensureBudgetAvailable()
    return await fetchGeminiOnce(requestBody, apiKey)
  }
}

export async function translateWithGemini(
  english: string,
  targetLangs: TargetLanguage[],
  categoryHint: string | null,
  existingCategories: string[],
): Promise<TranslateResult> {
  const needsCategory = !categoryHint
  const properties: Record<string, unknown> = {}
  const required: string[] = []

  if (targetLangs.length > 0) {
    const translationProps: Record<string, { type: string }> = {}
    for (const lang of targetLangs) translationProps[lang.code] = { type: 'STRING' }
    properties.translations = { type: 'OBJECT', properties: translationProps, required: targetLangs.map((l) => l.code) }
    required.push('translations')
  }
  if (needsCategory) {
    properties.suggestedCategory = { type: 'STRING' }
    required.push('suggestedCategory')
  }

  let prompt = `You are helping build a travel phrasebook app.\n\nPhrase (English): "${english}"\n\n`
  if (targetLangs.length > 0) {
    prompt += `Translate it into: ${targetLangs.map((l) => `${l.name} (${l.code})`).join(', ')}. Use natural, commonly-used phrasing a traveler would actually say, not a literal word-for-word translation.\n\n`
  }
  if (needsCategory) {
    prompt += `Suggest a short category name (2-4 words, e.g. "Greetings", "Food & Dining", "Numbers & Time") that best classifies this phrase. Reuse one of these existing categories if it fits: ${
      existingCategories.length > 0 ? existingCategories.join(', ') : '(none yet)'
    }. Otherwise suggest a new short one.`
  }

  const text = await callGemini({
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema: { type: 'OBJECT', properties, required },
    },
  })

  const parsed = JSON.parse(text) as { translations?: Record<string, string>; suggestedCategory?: string }
  return {
    translations: parsed.translations ?? {},
    suggestedCategory: categoryHint ?? parsed.suggestedCategory ?? null,
  }
}

const ALTERNATIVES_COUNT = 4

/** Generates several distinct phrasings for one phrase in one target language — the "retranslate / alternatives" action on an existing translation. */
export async function translateAlternativesWithGemini(english: string, targetLang: TargetLanguage): Promise<string[]> {
  const prompt = `Give ${ALTERNATIVES_COUNT} different natural ways to translate this English travel-phrasebook entry into ${targetLang.name} (${targetLang.code}). Each should be a phrasing a native speaker would actually say (not stiff or literal), and they should meaningfully differ from each other — e.g. different register (formal/casual), common regional variants, or synonymous wording — rather than trivial rewordings. Order them from most to least commonly used.\n\nPhrase (English): "${english}"\n\nReturn a JSON array of exactly ${ALTERNATIVES_COUNT} strings.`

  const text = await callGemini({
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema: { type: 'ARRAY', items: { type: 'STRING' }, minItems: ALTERNATIVES_COUNT, maxItems: ALTERNATIVES_COUNT },
      temperature: 1.1,
    },
  })

  const parsed = JSON.parse(text) as string[]
  return [...new Set(parsed.map((s) => s.trim()).filter(Boolean))]
}

const BULK_BATCH_SIZE = 40

/** Translates many phrases into one target language in as few Gemini calls as possible (chunked to keep prompts reasonably sized). */
export async function translateBulkWithGemini(englishPhrases: string[], targetLang: TargetLanguage): Promise<string[]> {
  const results: string[] = []

  for (let i = 0; i < englishPhrases.length; i += BULK_BATCH_SIZE) {
    const batch = englishPhrases.slice(i, i + BULK_BATCH_SIZE)
    const numbered = batch.map((p, idx) => `${idx + 1}. ${p}`).join('\n')
    const prompt = `Translate each of these ${batch.length} numbered English travel-phrasebook entries into ${targetLang.name} (${targetLang.code}). Use natural, commonly-used phrasing a traveler would actually say, not a literal word-for-word translation. Return a JSON array of the translations in the same order, one per entry.\n\n${numbered}`

    const text = await callGemini({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: { type: 'ARRAY', items: { type: 'STRING' }, minItems: batch.length, maxItems: batch.length },
      },
    })

    results.push(...(JSON.parse(text) as string[]))
  }

  return results
}
