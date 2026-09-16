import type { BackupSnapshot } from '../db/backup'
import type { CsvPhraseRow } from './csvImport'

export interface FetchedShare {
  name: string
  rows: CsvPhraseRow[]
  languageCode: string | null
  languageName: string | null
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
