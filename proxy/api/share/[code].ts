import type { VercelRequest, VercelResponse } from '@vercel/node'
import { redisOps } from '../../lib/redisOps.js'
import { applyCors } from '../../lib/cors.js'
import { getClientIp } from '../../lib/clientIp.js'
import { sendGuardFailure } from '../../lib/guard.js'
import { guardShareRead } from '../../lib/shareGuard.js'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  applyCors(req, res, 'GET, OPTIONS')
  if (req.method === 'OPTIONS') return res.status(204).end()
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  const code = req.query.code
  if (typeof code !== 'string') return res.status(400).json({ error: 'Missing code' })

  const guardFailure = await guardShareRead({ ip: getClientIp(req) })
  if (guardFailure) return sendGuardFailure(res, guardFailure)

  const stored = await redisOps.get(`share:${code}`)
  if (!stored) return res.status(404).json({ error: 'This link has expired or does not exist' })

  res.setHeader('Content-Type', 'application/json')
  return res.status(200).send(stored)
}
