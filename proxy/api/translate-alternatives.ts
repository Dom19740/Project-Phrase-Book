import type { VercelRequest, VercelResponse } from '@vercel/node'
import { translateAlternativesWithGemini } from '../lib/gemini.js'
import { rateLimit } from '../lib/redis.js'

interface RequestBody {
  english: string
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

  const body = req.body as RequestBody
  if (!body?.english?.trim() || !body.targetLangCode) {
    return res.status(400).json({ error: 'Missing english or targetLangCode' })
  }

  try {
    const alternatives = await translateAlternativesWithGemini(body.english, {
      code: body.targetLangCode,
      name: body.targetLangName || body.targetLangCode,
    })
    return res.status(200).json({ alternatives })
  } catch (err) {
    console.error('Alternatives translation failed:', err)
    return res.status(502).json({ error: 'Translation service unavailable, try again shortly' })
  }
}
