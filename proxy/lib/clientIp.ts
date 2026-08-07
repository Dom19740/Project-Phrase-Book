import type { VercelRequest } from '@vercel/node'

/**
 * Vercel's edge network sets `x-forwarded-for` itself and does not forward whatever a client
 * claims in that header — "we currently overwrite the X-Forwarded-For header and do not forward
 * external IPs. This restriction is in place to prevent IP spoofing" (Vercel request-headers docs).
 * `x-real-ip` is documented as identical. Neither can be trusted this way behind a non-Vercel
 * proxy layered in front of Vercel, but this app has none.
 */
export function getClientIp(req: VercelRequest): string {
  const forwardedFor = req.headers['x-forwarded-for']
  const first = Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor
  const ip = first?.split(',')[0]?.trim()
  if (ip) return ip

  const realIp = req.headers['x-real-ip']
  const realIpValue = Array.isArray(realIp) ? realIp[0] : realIp
  if (realIpValue?.trim()) return realIpValue.trim()

  return 'unknown'
}
