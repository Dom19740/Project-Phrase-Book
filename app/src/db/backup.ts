import { getDb, persist } from './client'
import { DEFAULT_LANGUAGE_COLOR } from '../lib/colorPalette'

export const BACKUP_VERSION = 1

interface BackupTranslation {
  languageCode: string
  text: string
  learned: boolean
  favorite: boolean
}

interface BackupPhrase {
  english: string
  category: string | null
  translations: BackupTranslation[]
}

export interface BackupSnapshot {
  version: number
  exportedAt: string
  languages: { name: string; code: string; color: string }[]
  phrases: BackupPhrase[]
}

/** Serializes the whole database into a portable, human-readable JSON snapshot. */
export async function exportSnapshot(): Promise<BackupSnapshot> {
  const db = await getDb()

  const languagesRes = await db.query('SELECT id, name, code, color FROM languages ORDER BY sort_order, id;')
  const languages = (languagesRes.values ?? []) as { id: number; name: string; code: string; color: string }[]
  const languageCodeById = new Map(languages.map((l) => [l.id, l.code]))

  const conceptsRes = await db.query(
    `SELECT pc.id, pc.english, c.name AS category_name
     FROM phrase_concepts pc
     LEFT JOIN categories c ON c.id = pc.category_id
     ORDER BY pc.id;`,
  )
  const concepts = (conceptsRes.values ?? []) as { id: number; english: string; category_name: string | null }[]

  const translationsRes = await db.query(
    'SELECT phrase_concept_id, language_id, text, learned, favorite FROM translations ORDER BY phrase_concept_id;',
  )
  const translationsByConcept = new Map<number, BackupTranslation[]>()
  for (const row of (translationsRes.values ?? []) as {
    phrase_concept_id: number
    language_id: number
    text: string
    learned: number
    favorite: number
  }[]) {
    const languageCode = languageCodeById.get(row.language_id)
    if (!languageCode) continue
    const list = translationsByConcept.get(row.phrase_concept_id) ?? []
    list.push({ languageCode, text: row.text, learned: !!row.learned, favorite: !!row.favorite })
    translationsByConcept.set(row.phrase_concept_id, list)
  }

  const phrases: BackupPhrase[] = concepts.map((c) => ({
    english: c.english,
    category: c.category_name,
    translations: translationsByConcept.get(c.id) ?? [],
  }))

  return {
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    languages: languages.map((l) => ({ name: l.name, code: l.code, color: l.color })),
    phrases,
  }
}

/** Replaces the entire database with the contents of a snapshot (full restore, not a merge). */
export async function importSnapshot(snapshot: BackupSnapshot): Promise<void> {
  const db = await getDb()

  await db.execute('DELETE FROM translations; DELETE FROM phrase_concepts; DELETE FROM categories; DELETE FROM languages;')

  const languageIdByCode = new Map<string, number>()
  for (const [i, lang] of snapshot.languages.entries()) {
    const res = await db.run('INSERT INTO languages (name, code, color, sort_order) VALUES (?, ?, ?, ?);', [
      lang.name,
      lang.code,
      lang.color ?? DEFAULT_LANGUAGE_COLOR,
      i,
    ])
    languageIdByCode.set(lang.code, res.changes?.lastId ?? 0)
  }

  const categoryIdByName = new Map<string, number>()

  for (const [i, phrase] of snapshot.phrases.entries()) {
    let categoryId: number | null = null
    if (phrase.category) {
      categoryId = categoryIdByName.get(phrase.category) ?? null
      if (categoryId == null) {
        const res = await db.run('INSERT INTO categories (name) VALUES (?);', [phrase.category])
        categoryId = res.changes?.lastId ?? 0
        categoryIdByName.set(phrase.category, categoryId)
      }
    }

    const conceptRes = await db.run('INSERT INTO phrase_concepts (english, category_id, sort_order) VALUES (?, ?, ?);', [
      phrase.english,
      categoryId,
      i,
    ])
    const conceptId = conceptRes.changes?.lastId ?? 0

    const sets = phrase.translations
      .filter((t) => languageIdByCode.has(t.languageCode))
      .map((t) => ({
        statement: 'INSERT INTO translations (phrase_concept_id, language_id, text, learned, favorite, sort_order) VALUES (?, ?, ?, ?, ?, ?);',
        values: [conceptId, languageIdByCode.get(t.languageCode), t.text, t.learned ? 1 : 0, t.favorite ? 1 : 0, i],
      }))
    if (sets.length > 0) await db.executeSet(sets)
  }

  await persist()
}
