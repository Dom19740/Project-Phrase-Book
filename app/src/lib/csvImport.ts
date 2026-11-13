export interface CsvPhraseRow {
  english: string
  text: string
  phonetic?: string
  category: string | null
}

// csvEscape() in csvExport.ts prefixes a leading '=' / '+' / '-' / '@' with a "'" to stop it being
// read as a formula - undo that here so re-imported text matches what was originally exported.
const FORMULA_ESCAPE = /^'([=+\-@])/

function unescapeFormula(value: string): string {
  return FORMULA_ESCAPE.test(value) ? value.slice(1) : value
}

/** Splits CSV text into rows of raw string cells, honoring quoted fields (embedded commas/newlines/escaped quotes). */
function parseCsvCells(input: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let inQuotes = false

  for (let i = 0; i < input.length; i++) {
    const ch = input[i]

    if (inQuotes) {
      if (ch === '"' && input[i + 1] === '"') {
        field += '"'
        i++
      } else if (ch === '"') {
        inQuotes = false
      } else {
        field += ch
      }
      continue
    }

    if (ch === '"') {
      inQuotes = true
    } else if (ch === ',') {
      row.push(field)
      field = ''
    } else if (ch === '\r') {
      // skip; \n (below) ends the row
    } else if (ch === '\n') {
      row.push(field)
      rows.push(row)
      row = []
      field = ''
    } else {
      field += ch
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field)
    rows.push(row)
  }
  return rows
}

/**
 * Parses phrases out of an imported file, in one of three shapes:
 *
 * - Structured CSV with a header - "English,Translation,Phonetic,Category" (the format phrasesToCsv()
 *   writes), detected by an "English" header cell. Column order is read from the header rather
 *   than assumed; Phonetic and Category are optional, and blank Translation cells leave `text` as
 *   `''` so the caller can auto-translate it.
 * - Structured CSV with no header - the same shape but with the header row stripped (e.g. someone
 *   deleted it before sending the file), detected by every line consistently splitting into the
 *   same 2, 3, or 4 CSV fields; taken positionally as English, Translation[, Category] or English,
 *   Translation, Phonetic, Category.
 * - A plain list - neither of the above, so every non-blank line is taken verbatim as one English
 *   phrase (not comma-split), the way someone would type a list of phrases into Notepad. This is
 *   also the fallback for a headerless file whose lines don't split consistently (a plain list
 *   where only some phrases happen to contain a comma would otherwise be misread as columns).
 */
export function parseCsvPhrases(csv: string): CsvPhraseRow[] {
  // A file re-saved by Excel/Sheets - or a .txt saved as "UTF-8" from Notepad - often carries a
  // leading UTF-8 BOM, which would otherwise stop the header's first cell (e.g. "English") from
  // matching, or end up glued onto the first phrase of a plain list.
  const text = csv.replace(/^﻿/, '').trim()
  if (!text) return []

  const rows = parseCsvCells(text).filter((r) => !(r.length === 1 && r[0].trim() === ''))
  if (rows.length === 0) return []

  const header = rows[0].map((h) => h.trim().toLowerCase())
  const englishIdx = header.indexOf('english')

  if (englishIdx !== -1) {
    const textIdx = header.findIndex((h) => h === 'translation' || h === 'text')
    const phoneticIdx = header.findIndex((h) => h === 'phonetic' || h === 'pronunciation')
    const categoryIdx = header.indexOf('category')

    return rows
      .slice(1)
      .map((r) => ({
        english: unescapeFormula(r[englishIdx] ?? '').trim(),
        text: textIdx === -1 ? '' : unescapeFormula(r[textIdx] ?? '').trim(),
        phonetic: phoneticIdx === -1 ? undefined : unescapeFormula(r[phoneticIdx] ?? '').trim(),
        category: categoryIdx === -1 ? null : unescapeFormula(r[categoryIdx] ?? '').trim() || null,
      }))
      .filter((r) => r.english !== '')
  }

  const fieldCounts = new Set(rows.map((r) => r.length))
  if (fieldCounts.size === 1 && (rows[0].length === 2 || rows[0].length === 3 || rows[0].length === 4)) {
    const hasPhonetic = rows[0].length === 4
    const hasCategory = rows[0].length === 3 || hasPhonetic
    return rows
      .map((r) => ({
        english: unescapeFormula(r[0] ?? '').trim(),
        text: unescapeFormula(r[1] ?? '').trim(),
        phonetic: hasPhonetic ? unescapeFormula(r[2] ?? '').trim() : undefined,
        category: hasCategory ? unescapeFormula(r[hasPhonetic ? 3 : 2] ?? '').trim() || null : null,
      }))
      .filter((r) => r.english !== '')
  }

  return text
    .split(/\r\n|\r|\n/)
    .map((line) => line.trim())
    .filter((line) => line !== '')
    .map((english) => ({ english, text: '', category: null }))
}
