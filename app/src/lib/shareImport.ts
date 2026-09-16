import type { BackupSnapshot } from '../db/backup'
import type { CsvPhraseRow } from './csvImport'

export interface FetchedShare {
  name: string
  rows: CsvPhraseRow[]
  languageCode: string | null
  languageName: string | null
}

/**
 * Pulls a share code out of whatever someone pastes: a bare code, a full share URL
 * (?code=<code>), or the app's own /c/<code>-shaped legacy links. Used both for a manually
 * pasted code/link (see BackupModal) and for a URL handed to the app by Android App Links -
 * pasting is the only reliable path on iOS, where a tapped link opens Safari's storage, not the
 * installed home-screen app's separate one, so the fetch+import has to run inside whichever
 * instance the person is actually using.
 */
export function extractShareCode(input: string): string | null {
  const trimmed = input.trim()
  if (/^[A-Za-z0-9]{6,24}$/.test(trimmed)) return trimmed

  try {
    const url = new URL(trimmed)
    return url.searchParams.get('code') ?? url.pathname.match(/\/c\/([A-Za-z0-9]+)$/)?.[1] ?? null
  } catch {
    return null
  }
}

/**
 * Fetches a shared phrase collection by its code and flattens it into CsvPhraseRow[] - the same
 * shape the existing CSV-import flow (BackupModal) already knows how to preview and merge, so a
 * share link reuses that non-destructive flow instead of a separate import path.
 */
export async function fetchSharedCollection(code: string): Promise<FetchedShare> {
  const baseUrl = import.meta.env.VITE_TRANSLATE_API_URL
  if (!baseUrl) throw new Error('VITE_TRANSLATE_API_URL is not configured')

  const res = await fetch(`${baseUrl}/api/share/${code}`)
  if (!res.ok) {
    if (res.status === 404) throw new Error('This share link has expired or does not exist.')
    throw new Error(`Share link request failed (${res.status})`)
  }

  const snapshot = (await res.json()) as BackupSnapshot
  const language = snapshot.languages[0] ?? null

  const rows: CsvPhraseRow[] = snapshot.phrases.map((p) => ({
    english: p.english,
    text: p.translations[0]?.text ?? '',
    category: p.category,
  }))

  return {
    name: `Shared phrases${language ? ` (${language.name})` : ''}`,
    rows,
    languageCode: language?.code ?? null,
    languageName: language?.name ?? null,
  }
}
