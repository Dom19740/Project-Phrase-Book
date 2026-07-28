import type { PhraseListItem } from '../db/types'

function csvEscape(value: string): string {
  if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`
  return value
}

/** English, Translation, Category — plain CSV, readable as text and reopenable in Excel/Sheets. */
export function phrasesToCsv(phrases: PhraseListItem[]): string {
  const header = 'English,Translation,Category'
  const rows = phrases.map((p) => [p.english, p.text, p.categoryName ?? ''].map(csvEscape).join(','))
  return [header, ...rows].join('\n')
}
