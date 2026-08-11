import { getDb, persist } from './client'

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
  languages: { name: string; code: string }[]
  phrases: BackupPhrase[]
}

function isBackupTranslation(value: unknown): value is BackupTranslation {
  if (typeof value !== 'object' || value === null) return false
  const t = value as Record<string, unknown>
  return typeof t.languageCode === 'string' && typeof t.text === 'string' && typeof t.learned === 'boolean' && typeof t.favorite === 'boolean'
}

function isBackupPhrase(value: unknown): value is BackupPhrase {
  if (typeof value !== 'object' || value === null) return false
  const p = value as Record<string, unknown>
  return (
    typeof p.english === 'string' &&
    (p.category === null || typeof p.category === 'string') &&
    Array.isArray(p.translations) &&
    p.translations.every(isBackupTranslation)
  )
}

/** Guards a parsed backup file's shape before it's trusted for a destructive restore. */
export function isValidBackupSnapshot(data: unknown): data is BackupSnapshot {
  if (typeof data !== 'object' || data === null) return false
  const s = data as Record<string, unknown>
  return (
    typeof s.version === 'number' &&
    Array.isArray(s.languages) &&
    s.languages.every((l) => typeof l === 'object' && l !== null && typeof (l as Record<string, unknown>).name === 'string' && typeof (l as Record<string, unknown>).code === 'string') &&
    Array.isArray(s.phrases) &&
    s.phrases.every(isBackupPhrase)
  )
}

/** Serializes the whole database into a portable, human-readable JSON snapshot. */
export async function exportSnapshot(): Promise<BackupSnapshot> {
  const db = await getDb()

  const languagesRes = await db.query('SELECT id, name, code FROM languages ORDER BY sort_order, id;')
  const languages = (languagesRes.values ?? []) as { id: number; name: string; code: string }[]
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
    languages: languages.map((l) => ({ name: l.name, code: l.code })),
    phrases,
  }
}

/** Reads the id assigned to the row just inserted on this connection, more reliably than trusting the plugin's own `lastId` reporting. */
async function lastInsertId(db: Awaited<ReturnType<typeof getDb>>): Promise<number> {
  const res = await db.query('SELECT last_insert_rowid() AS id;')
  return (res.values?.[0]?.id as number | undefined) ?? 0
}

/**
 * Replaces the entire database with the contents of a snapshot (full restore, not a merge).
 *
 * Runs as a single explicit transaction (every statement passes `transaction: false` so the
 * plugin doesn't wrap each one in its own auto-committing transaction) so a failure partway
 * through — e.g. a translation insert going wrong — rolls back the deletes and inserts that
 * already ran instead of leaving the DB in a half-restored state that then collides with retries.
 */
export async function importSnapshot(snapshot: BackupSnapshot): Promise<void> {
  if (!isValidBackupSnapshot(snapshot)) throw new Error('Backup file is not in a recognized format.')

  const db = await getDb()

  await db.beginTransaction()
  try {
    // The plugin only splits multi-statement strings on ";\n" (a literal newline after the
    // semicolon) — "; " on one line is treated as a single statement and Android's execSQL()
    // silently only runs the first clause, so each DELETE must be on its own line.
    await db.execute(
      'DELETE FROM translations;\nDELETE FROM phrase_concepts;\nDELETE FROM categories;\nDELETE FROM languages;',
      false,
    )

    const languageIdByCode = new Map<string, number>()
    for (const [i, lang] of snapshot.languages.entries()) {
      await db.run('INSERT INTO languages (name, code, sort_order) VALUES (?, ?, ?);', [lang.name, lang.code, i], false)
      languageIdByCode.set(lang.code, await lastInsertId(db))
    }

    const categoryIdByName = new Map<string, number>()

    for (const [i, phrase] of snapshot.phrases.entries()) {
      let categoryId: number | null = null
      if (phrase.category) {
        categoryId = categoryIdByName.get(phrase.category) ?? null
        if (categoryId == null) {
          await db.run('INSERT INTO categories (name) VALUES (?);', [phrase.category], false)
          categoryId = await lastInsertId(db)
          categoryIdByName.set(phrase.category, categoryId)
        }
      }

      await db.run('INSERT INTO phrase_concepts (english, category_id, sort_order) VALUES (?, ?, ?);', [phrase.english, categoryId, i], false)
      const conceptId = await lastInsertId(db)

      for (const t of phrase.translations) {
        const languageId = languageIdByCode.get(t.languageCode)
        if (languageId == null) continue
        await db.run(
          'INSERT INTO translations (phrase_concept_id, language_id, text, learned, favorite, sort_order) VALUES (?, ?, ?, ?, ?, ?);',
          [conceptId, languageId, t.text, t.learned ? 1 : 0, t.favorite ? 1 : 0, i],
          false,
        )
      }
    }

    await db.commitTransaction()
  } catch (err) {
    await db.rollbackTransaction()
    throw err
  }

  await persist()
}
