import type { VercelRequest, VercelResponse } from '@vercel/node'
import { translateWithGemini } from '../lib/gemini.js'
import { cacheKey, rateLimit, redis } from '../lib/redis.js'

// Extend as new languages are added to the app — Gemini translates better with a
// language name than a bare ISO code.
const LANGUAGE_NAMES: Record<string, string> = {
  en: 'English',
  vi: 'Vietnamese',
}

interface TranslateRequestBody {
  english: string
  categoryHint?: string | null
  targetLangs: string[]
  targetLangNames?: Record<string, string>
  existingCategories?: string[]
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Device-Id')
  if (req.method === 'OPTIONS') return res.status(204).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const deviceId = req.headers['x-device-id']
  if (typeof deviceId !== 'string' || deviceId.length < 8) {
    return res.status(400).json({ error: 'Missing X-Device-Id header' })
  }

  const { success } = await rateLimit.limit(deviceId)
  if (!success) return res.status(429).json({ error: 'Rate limit exceeded, try again later' })

  const body = req.body as TranslateRequestBody
  if (!body?.english?.trim() || !Array.isArray(body.targetLangs) || body.targetLangs.length === 0) {
    return res.status(400).json({ error: 'Missing english or targetLangs' })
  }

  const normalized = body.english.trim().toLowerCase()
  const translations: Record<string, string> = {}
  const uncached: string[] = []

  for (const code of body.targetLangs) {
    const cached = await redis.get<string>(cacheKey(code, normalized))
    if (cached) translations[code] = cached
    else uncached.push(code)
  }

  let suggestedCategory: string | null = body.categoryHint ?? null

  if (uncached.length > 0 || !body.categoryHint) {
    try {
      const result = await translateWithGemini(
        body.english,
        uncached.map((code) => ({ code, name: body.targetLangNames?.[code] ?? LANGUAGE_NAMES[code] ?? code })),
        body.categoryHint ?? null,
        body.existingCategories ?? [],
      )
      for (const code of uncached) {
        const text = result.translations[code]
        if (text) {
          translations[code] = text
          await redis.set(cacheKey(code, normalized), text)
        }
      }
      suggestedCategory = result.suggestedCategory
    } catch (err) {
      console.error('Gemini translation failed:', err)
      return res.status(502).json({ error: 'Translation service unavailable, try again shortly' })
    }
  }

  return res.status(200).json({ translations, suggestedCategory })
}
