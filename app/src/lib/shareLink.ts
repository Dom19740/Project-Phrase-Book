import { getDeviceId } from './deviceId'
import type { BackupSnapshot } from '../db/backup'

export interface ShareLinkResult {
  code: string
  url: string
}

/** Uploads a phrase collection to the proxy's anonymous share-link endpoint (30-day TTL, no accounts). */
export async function createShareLink(snapshot: BackupSnapshot): Promise<ShareLinkResult> {
  const baseUrl = import.meta.env.VITE_TRANSLATE_API_URL
  if (!baseUrl) throw new Error('VITE_TRANSLATE_API_URL is not configured')

  const res = await fetch(`${baseUrl}/api/share/create`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Device-Id': getDeviceId() },
    body: JSON.stringify(snapshot),
  })

  if (!res.ok) {
    const body = await res.json().catch(() => ({}) as { error?: string })
    throw new Error(body?.error || `Share link request failed (${res.status})`)
  }

  return res.json() as Promise<ShareLinkResult>
}
