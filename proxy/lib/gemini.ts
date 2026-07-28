const GEMINI_MODEL = 'gemini-flash-latest'

export interface TargetLanguage {
  code: string
  name: string
}

export interface TranslateResult {
  translations: Record<string, string>
  suggestedCategory: string | null
}

export async function translateWithGemini(
  english: string,
  targetLangs: TargetLanguage[],
  categoryHint: string | null,
  existingCategories: string[],
): Promise<TranslateResult> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) throw new Error('GEMINI_API_KEY is not configured')

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

  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: { type: 'OBJECT', properties, required },
      },
    }),
  })

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Gemini request failed (${res.status}): ${body}`)
  }

  const data = (await res.json()) as { candidates?: { content?: { parts?: { text?: string }[] } }[] }
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text
  if (!text) throw new Error('Gemini returned no content')

  const parsed = JSON.parse(text) as { translations?: Record<string, string>; suggestedCategory?: string }
  return {
    translations: parsed.translations ?? {},
    suggestedCategory: categoryHint ?? parsed.suggestedCategory ?? null,
  }
}

const BULK_BATCH_SIZE = 40

/** Translates many phrases into one target language in as few Gemini calls as possible (chunked to keep prompts reasonably sized). */
export async function translateBulkWithGemini(englishPhrases: string[], targetLang: TargetLanguage): Promise<string[]> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) throw new Error('GEMINI_API_KEY is not configured')

  const results: string[] = []

  for (let i = 0; i < englishPhrases.length; i += BULK_BATCH_SIZE) {
    const batch = englishPhrases.slice(i, i + BULK_BATCH_SIZE)
    const numbered = batch.map((p, idx) => `${idx + 1}. ${p}`).join('\n')
    const prompt = `Translate each of these ${batch.length} numbered English travel-phrasebook entries into ${targetLang.name} (${targetLang.code}). Use natural, commonly-used phrasing a traveler would actually say, not a literal word-for-word translation. Return a JSON array of the translations in the same order, one per entry.\n\n${numbered}`

    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          responseMimeType: 'application/json',
          responseSchema: { type: 'ARRAY', items: { type: 'STRING' }, minItems: batch.length, maxItems: batch.length },
        },
      }),
    })

    if (!res.ok) {
      const body = await res.text()
      throw new Error(`Gemini bulk request failed (${res.status}): ${body}`)
    }

    const data = (await res.json()) as { candidates?: { content?: { parts?: { text?: string }[] } }[] }
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text
    if (!text) throw new Error('Gemini returned no content')

    results.push(...(JSON.parse(text) as string[]))
  }

  return results
}
