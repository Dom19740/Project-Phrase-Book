import type { VercelRequest, VercelResponse } from '@vercel/node'
import { translateBulkWithGemini } from '../lib/gemini.js'
import { cacheKey } from '../lib/redis.js'
import { redisOps } from '../lib/redisOps.js'
import { applyCors } from '../lib/cors.js'
import { getClientIp } from '../lib/clientIp.js'
import { classifyGeminiError, guardRequest } from '../lib/guard.js'
import { validateBulkBody } from '../lib/limits.js'

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
  applyCors(req, res)
  if (req.method === 'OPTIONS') return res.status(204).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const deviceId = req.headers['x-device-id']
  if (typeof deviceId !== 'string' || deviceId.length < 8) {
    return res.status(400).json({ error: 'Missing X-Device-Id header' })
  }

  const guardFailure = await guardRequest({ deviceId, ip: getClientIp(req), bulk: true })
  if (guardFailure) return res.status(guardFailure.status).json({ error: guardFailure.error })

  const body = req.body as BulkRequestBody
  const validationError = validateBulkBody(body)
  if (validationError) return res.status(400).json({ error: validationError })

  const targetLangName = body.targetLangName || LANGUAGE_NAMES[body.targetLangCode] || body.targetLangCode

  const translations: Record<string, string> = {}
  const uncachedPhrases: string[] = []

  for (const phrase of body.englishPhrases) {
    const normalized = phrase.trim().toLowerCase()
    const cached = await redisOps.get(cacheKey(body.targetLangCode, normalized))
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
          await redisOps.set(cacheKey(body.targetLangCode, phrase.trim().toLowerCase()), text)
        }
      }
    } catch (err) {
      console.error('Bulk translation failed:', err)
      const failure = classifyGeminiError(err)
      return res.status(failure.status).json({ error: failure.error })
    }
  }

  return res.status(200).json({ translations })
}
