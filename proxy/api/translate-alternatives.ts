import type { VercelRequest, VercelResponse } from '@vercel/node'
import { translateAlternativesWithGemini } from '../lib/gemini.js'
import { applyCors } from '../lib/cors.js'
import { getClientIp } from '../lib/clientIp.js'
import { classifyGeminiError, guardRequest } from '../lib/guard.js'
import { validateAlternativesBody } from '../lib/limits.js'

interface RequestBody {
  english: string
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

  const guardFailure = await guardRequest({ deviceId, ip: getClientIp(req) })
  if (guardFailure) return res.status(guardFailure.status).json({ error: guardFailure.error })

  const body = req.body as RequestBody
  const validationError = validateAlternativesBody(body)
  if (validationError) return res.status(400).json({ error: validationError })

  try {
    const alternatives = await translateAlternativesWithGemini(body.english, {
      code: body.targetLangCode,
      name: body.targetLangName || body.targetLangCode,
    })
    return res.status(200).json({ alternatives })
  } catch (err) {
    console.error('Alternatives translation failed:', err)
    const failure = classifyGeminiError(err)
    return res.status(failure.status).json({ error: failure.error })
  }
}
