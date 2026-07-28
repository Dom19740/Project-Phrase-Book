import type { VercelRequest, VercelResponse } from '@vercel/node'
import { translateBulkWithGemini } from '../lib/gemini.js'
import { cacheKey, rateLimit, redis } from '../lib/redis.js'

const LANGUAGE_NAMES: Record<string, string> = {
  en: 'English',
  vi: 'Vietnamese',
}

interface BulkRequestBody {
  englishPhrases: string[]
  targetLangCode: string
  targetLangName?: string
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

  const body = req.body as BulkRequestBody
  if (!Array.isArray(body?.englishPhrases) || body.englishPhrases.length === 0 || !body.targetLangCode) {
    return res.status(400).json({ error: 'Missing englishPhrases or targetLangCode' })
  }

  const targetLangName = body.targetLangName || LANGUAGE_NAMES[body.targetLangCode] || body.targetLangCode

  const translations: Record<string, string> = {}
  const uncachedPhrases: string[] = []

  for (const phrase of body.englishPhrases) {
    const normalized = phrase.trim().toLowerCase()
    const cached = await redis.get<string>(cacheKey(body.targetLangCode, normalized))
    if (cached) translations[phrase] = cached
    else uncachedPhrases.push(phrase)
  }

  if (uncachedPhrases.length > 0) {
    try {
      const results = await translateBulkWithGemini(uncachedPhrases, { code: body.targetLangCode, name: targetLangName })
      for (let i = 0; i < uncachedPhrases.length; i++) {
        const phrase = uncachedPhrases[i]
        const text = results[i]
        if (text) {
          translations[phrase] = text
          await redis.set(cacheKey(body.targetLangCode, phrase.trim().toLowerCase()), text)
        }
      }
    } catch (err) {
      console.error('Bulk translation failed:', err)
      return res.status(502).json({ error: 'Translation service unavailable, try again shortly' })
    }
  }

  return res.status(200).json({ translations })
}
