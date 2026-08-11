import type { PhraseListItem } from '../db/types'

// Neutralizes CSV/formula injection: a cell starting with one of these characters can be
// interpreted as a formula by Excel/Google Sheets when the file is opened.
const FORMULA_PREFIX = /^[=+\-@\t\r]/

function csvEscape(value: string): string {
  const safe = FORMULA_PREFIX.test(value) ? `'${value}` : value
  if (/[",\n]/.test(safe)) return `"${safe.replace(/"/g, '""')}"`
  return safe
}

/** English, Translation, Category — plain CSV, readable as text and reopenable in Excel/Sheets. */
export function phrasesToCsv(phrases: PhraseListItem[]): string {
  const header = 'English,Translation,Category'
  const rows = phrases.map((p) => [p.english, p.text, p.categoryName ?? ''].map(csvEscape).join(','))
  return [header, ...rows].join('\n')
}
