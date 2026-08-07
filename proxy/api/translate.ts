import type { VercelRequest, VercelResponse } from '@vercel/node'
import { translateWithGemini } from '../lib/gemini.js'
import { cacheKey } from '../lib/redis.js'
import { redisOps } from '../lib/redisOps.js'
import { applyCors } from '../lib/cors.js'
import { getClientIp } from '../lib/clientIp.js'
import { classifyGeminiError, guardRequest } from '../lib/guard.js'
import { validateTranslateBody } from '../lib/limits.js'

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
  applyCors(req, res)
  if (req.method === 'OPTIONS') return res.status(204).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const deviceId = req.headers['x-device-id']
  if (typeof deviceId !== 'string' || deviceId.length < 8) {
    return res.status(400).json({ error: 'Missing X-Device-Id header' })
  }

  const guardFailure = await guardRequest({ deviceId, ip: getClientIp(req) })
  if (guardFailure) return res.status(guardFailure.status).json({ error: guardFailure.error })

  const body = req.body as TranslateRequestBody
  const validationError = validateTranslateBody(body)
  if (validationError) return res.status(400).json({ error: validationError })

  const normalized = body.english.trim().toLowerCase()
  const translations: Record<string, string> = {}
  const uncached: string[] = []

  for (const code of body.targetLangs) {
    const cached = await redisOps.get(cacheKey(code, normalized))
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
          await redisOps.set(cacheKey(code, normalized), text)
        }
      }
      suggestedCategory = result.suggestedCategory
    } catch (err) {
      console.error('Gemini translation failed:', err)
      const failure = classifyGeminiError(err)
      return res.status(failure.status).json({ error: failure.error })
    }
  }

  return res.status(200).json({ translations, suggestedCategory })
}
