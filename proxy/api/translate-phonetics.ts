import type { VercelRequest, VercelResponse } from '@vercel/node'
import { phoneticBulkWithGemini } from '../lib/gemini.js'
import { applyCors } from '../lib/cors.js'
import { getClientIp } from '../lib/clientIp.js'
import { classifyGeminiError, guardRequest, sendGuardFailure } from '../lib/guard.js'
import { validatePhoneticsBody } from '../lib/limits.js'

interface PhoneticsRequestBody {
  translations: string[]
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
  if (guardFailure) return sendGuardFailure(res, guardFailure)

  const body = req.body as PhoneticsRequestBody
  const validationError = validatePhoneticsBody(body)
  if (validationError) return res.status(400).json({ error: validationError })

  const targetLangName = body.targetLangName || body.targetLangCode
  try {
    const phonetics = await phoneticBulkWithGemini(body.translations, { code: body.targetLangCode, name: targetLangName })
    return res.status(200).json({ phonetics })
  } catch (err) {
    console.error('Bulk phonetic generation failed:', err)
    return sendGuardFailure(res, classifyGeminiError(err))
  }
}
