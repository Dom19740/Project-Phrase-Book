import type { VercelRequest, VercelResponse } from '@vercel/node'
import { redisOps } from '../../lib/redisOps.js'
import { applyCors } from '../../lib/cors.js'
import { getClientIp } from '../../lib/clientIp.js'
import { sendGuardFailure } from '../../lib/guard.js'
import { guardShareCreate } from '../../lib/shareGuard.js'
import { validateShareSnapshot } from '../../lib/shareLimits.js'
import { generateShareCode } from '../../lib/shareId.js'

const SHARE_TTL_SECONDS = 60 * 60 * 24 * 30 // 30 days

export default async function handler(req: VercelRequest, res: VercelResponse) {
  applyCors(req, res)
  if (req.method === 'OPTIONS') return res.status(204).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const deviceId = req.headers['x-device-id']
  if (typeof deviceId !== 'string' || deviceId.length < 8) {
    return res.status(400).json({ error: 'Missing X-Device-Id header' })
  }

  const guardFailure = await guardShareCreate({ deviceId, ip: getClientIp(req) })
  if (guardFailure) return sendGuardFailure(res, guardFailure)

  const validationError = validateShareSnapshot(req.body)
  if (validationError) return res.status(400).json({ error: validationError })

  const payload = JSON.stringify(req.body)

  // Collision odds at 12 base62 chars are astronomically low, but check-then-set once rather
  // than silently overwrite someone else's link in the (practically impossible) case it happens.
  let code = generateShareCode()
  if (await redisOps.get(`share:${code}`)) code = generateShareCode()

  await redisOps.setex(`share:${code}`, payload, SHARE_TTL_SECONDS)

  return res.status(200).json({ code, url: `https://travelchatter.dpbcreative.com/c/${code}` })
}
