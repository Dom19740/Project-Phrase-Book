import { getDb, persist } from './client'
import type { Category, Language, PhraseListItem } from './types'

export async function getLanguages(): Promise<Language[]> {
  const db = await getDb()
  const res = await db.query('SELECT id, name, code, color, sort_order FROM languages ORDER BY sort_order, id;')
  return (res.values ?? []).map((r) => ({
    id: r.id,
    name: r.name,
    code: r.code,
    color: r.color,
    sortOrder: r.sort_order,
  }))
}

export async function addLanguage(name: string, code: string, color: string): Promise<Language> {
  const db = await getDb()
  const maxOrder = await db.query('SELECT COALESCE(MAX(sort_order), -1) AS m FROM languages;')
  const sortOrder = (maxOrder.values?.[0]?.m ?? -1) + 1
  const res = await db.run('INSERT INTO languages (name, code, color, sort_order) VALUES (?, ?, ?, ?);', [name, code, color, sortOrder])
  const languageId = res.changes?.lastId ?? 0

  // Every phrase concept must exist in every tracked language, so a newly added
  // language needs a (blank, untranslated) row for each phrase that already exists.
  const concepts = await db.query('SELECT id FROM phrase_concepts;')
  const sets = (concepts.values ?? []).map((c) => ({
    statement: 'INSERT INTO translations (phrase_concept_id, language_id, text, sort_order) VALUES (?, ?, ?, 0);',
    values: [c.id, languageId, ''],
  }))
  if (sets.length > 0) await db.executeSet(sets)

  await persist()
  return { id: languageId, name, code, color, sortOrder }
}

export async function updateLanguageColor(languageId: number, color: string): Promise<void> {
  const db = await getDb()
  await db.run('UPDATE languages SET color = ? WHERE id = ?;', [color, languageId])
  await persist()
}

export async function deleteLanguage(languageId: number): Promise<void> {
  const db = await getDb()
  await db.executeSet([
    { statement: 'DELETE FROM translations WHERE language_id = ?;', values: [languageId] },
    { statement: 'DELETE FROM languages WHERE id = ?;', values: [languageId] },
  ])
  await persist()
}

export async function getAllPhraseConcepts(): Promise<{ id: number; english: string }[]> {
  const db = await getDb()
  const res = await db.query('SELECT id, english FROM phrase_concepts ORDER BY id;')
  return (res.values ?? []).map((r) => ({ id: r.id, english: r.english }))
}

/** Fills in translation text for specific (phrase concept, language) pairs, e.g. after bulk-translating a newly added language. */
export async function bulkSetTranslationText(entries: { phraseConceptId: number; languageId: number; text: string }[]): Promise<void> {
  if (entries.length === 0) return
  const db = await getDb()
  const sets = entries.map((e) => ({
    statement: 'UPDATE translations SET text = ? WHERE phrase_concept_id = ? AND language_id = ?;',
    values: [e.text, e.phraseConceptId, e.languageId],
  }))
  await db.executeSet(sets)
  await persist()
}

export async function getCategories(): Promise<Category[]> {
  const db = await getDb()
  const res = await db.query('SELECT id, name FROM categories ORDER BY name;')
  return (res.values ?? []).map((r) => ({ id: r.id, name: r.name }))
}

/** Finds a category by exact name, creating it if it doesn't exist yet. */
export async function findOrCreateCategory(name: string): Promise<number> {
  const db = await getDb()
  const existing = await db.query('SELECT id FROM categories WHERE name = ?;', [name])
  if (existing.values?.[0]) return existing.values[0].id as number
  const res = await db.run('INSERT INTO categories (name) VALUES (?);', [name])
  await persist()
  return res.changes?.lastId ?? 0
}

export async function renameCategory(categoryId: number, newName: string): Promise<void> {
  const db = await getDb()
  await db.run('UPDATE categories SET name = ? WHERE id = ?;', [newName, categoryId])
  await persist()
}

/** Deletes a category; phrases that were in it fall back to Uncategorized rather than being deleted. */
export async function deleteCategory(categoryId: number): Promise<void> {
  const db = await getDb()
  await db.executeSet([
    { statement: 'UPDATE phrase_concepts SET category_id = NULL WHERE category_id = ?;', values: [categoryId] },
    { statement: 'DELETE FROM categories WHERE id = ?;', values: [categoryId] },
  ])
  await persist()
}

export async function getPhraseList(languageId: number): Promise<PhraseListItem[]> {
  const db = await getDb()
  const res = await db.query(
    `SELECT
       t.id AS translation_id,
       t.phrase_concept_id,
       t.language_id,
       pc.english,
       t.text,
       t.learned,
       t.favorite,
       t.sort_order,
       pc.category_id,
       c.name AS category_name
     FROM translations t
     JOIN phrase_concepts pc ON pc.id = t.phrase_concept_id
     LEFT JOIN categories c ON c.id = pc.category_id
     WHERE t.language_id = ?
     ORDER BY t.id;`,
    [languageId],
  )
  return (res.values ?? []).map((r) => ({
    translationId: r.translation_id,
    phraseConceptId: r.phrase_concept_id,
    languageId: r.language_id,
    english: r.english,
    text: r.text,
    learned: !!r.learned,
    favorite: !!r.favorite,
    sortOrder: r.sort_order,
    categoryId: r.category_id,
    categoryName: r.category_name,
  }))
}

interface NewPhraseInput {
  english: string
  categoryName?: string | null
  /** Text for languages that already have a known translation (e.g. seed data, CSV import). Any tracked language not listed here still gets a blank row. */
  translations?: { languageId: number; text: string }[]
}

/**
 * Creates a phrase concept and a translation row for every tracked language in one transaction —
 * a phrase that exists in one language must exist (even if blank/untranslated) in all of them.
 */
export async function addPhraseConcept(input: NewPhraseInput): Promise<number> {
  const db = await getDb()
  const categoryId = input.categoryName ? await findOrCreateCategory(input.categoryName) : null

  const maxOrder = await db.query('SELECT COALESCE(MAX(sort_order), -1) AS m FROM phrase_concepts;')
  const sortOrder = (maxOrder.values?.[0]?.m ?? -1) + 1

  const conceptRes = await db.run('INSERT INTO phrase_concepts (english, category_id, sort_order) VALUES (?, ?, ?);', [
    input.english,
    categoryId,
    sortOrder,
  ])
  const conceptId = conceptRes.changes?.lastId ?? 0

  const languages = await getLanguages()
  const textByLanguage = new Map((input.translations ?? []).map((t) => [t.languageId, t.text]))
  const sets = languages.map((lang) => ({
    statement: 'INSERT INTO translations (phrase_concept_id, language_id, text, sort_order) VALUES (?, ?, ?, ?);',
    values: [conceptId, lang.id, textByLanguage.get(lang.id) ?? '', sortOrder],
  }))
  if (sets.length > 0) await db.executeSet(sets)

  await persist()
  return conceptId
}

/** Updates the shared English root and one language's translation text/category in a single transaction. */
export async function updatePhrase(
  phraseConceptId: number,
  translationId: number,
  english: string,
  text: string,
  categoryName: string | null,
): Promise<void> {
  const db = await getDb()
  const categoryId = categoryName ? await findOrCreateCategory(categoryName) : null
  await db.executeSet([
    { statement: 'UPDATE phrase_concepts SET english = ?, category_id = ? WHERE id = ?;', values: [english, categoryId, phraseConceptId] },
    { statement: 'UPDATE translations SET text = ? WHERE id = ?;', values: [text, translationId] },
  ])
  await persist()
}

/** Assigns a category to any existing uncategorized phrase whose English text matches a known mapping. */
export async function backfillCategoriesByEnglish(categoryByEnglish: Record<string, string>): Promise<void> {
  const db = await getDb()
  const uncategorized = await db.query('SELECT id, english FROM phrase_concepts WHERE category_id IS NULL;')
  const sets: { statement: string; values: unknown[] }[] = []
  for (const row of uncategorized.values ?? []) {
    const categoryName = categoryByEnglish[row.english as string]
    if (!categoryName) continue
    const categoryId = await findOrCreateCategory(categoryName)
    sets.push({ statement: 'UPDATE phrase_concepts SET category_id = ? WHERE id = ?;', values: [categoryId, row.id] })
  }
  if (sets.length > 0) {
    await db.executeSet(sets)
    await persist()
  }
}

/** Deletes a single language's translation of a phrase, leaving the concept and other languages intact. */
export async function deleteTranslation(translationId: number): Promise<void> {
  const db = await getDb()
  await db.run('DELETE FROM translations WHERE id = ?;', [translationId])
  await persist()
}

/** Deletes a phrase concept and its translations in every language. */
export async function deletePhraseConcept(phraseConceptId: number): Promise<void> {
  const db = await getDb()
  await db.executeSet([
    { statement: 'DELETE FROM translations WHERE phrase_concept_id = ?;', values: [phraseConceptId] },
    { statement: 'DELETE FROM phrase_concepts WHERE id = ?;', values: [phraseConceptId] },
  ])
  await persist()
}

export async function setLearned(translationId: number, learned: boolean): Promise<void> {
  const db = await getDb()
  await db.run('UPDATE translations SET learned = ? WHERE id = ?;', [learned ? 1 : 0, translationId])
  await persist()
}

export async function setFavorite(translationId: number, favorite: boolean): Promise<void> {
  const db = await getDb()
  await db.run('UPDATE translations SET favorite = ? WHERE id = ?;', [favorite ? 1 : 0, translationId])
  await persist()
}

export async function bulkSetLearned(translationIds: number[], learned: boolean): Promise<void> {
  if (translationIds.length === 0) return
  const db = await getDb()
  const sets = translationIds.map((id) => ({
    statement: 'UPDATE translations SET learned = ? WHERE id = ?;',
    values: [learned ? 1 : 0, id],
  }))
  await db.executeSet(sets)
  await persist()
}

export async function bulkDeleteTranslations(translationIds: number[]): Promise<void> {
  if (translationIds.length === 0) return
  const db = await getDb()
  const sets = translationIds.map((id) => ({ statement: 'DELETE FROM translations WHERE id = ?;', values: [id] }))
  await db.executeSet(sets)
  await persist()
}

export async function bulkDeletePhraseConcepts(phraseConceptIds: number[]): Promise<void> {
  if (phraseConceptIds.length === 0) return
  const db = await getDb()
  const sets = phraseConceptIds.flatMap((id) => [
    { statement: 'DELETE FROM translations WHERE phrase_concept_id = ?;', values: [id] },
    { statement: 'DELETE FROM phrase_concepts WHERE id = ?;', values: [id] },
  ])
  await db.executeSet(sets)
  await persist()
}

export async function bulkSetCategory(phraseConceptIds: number[], categoryName: string | null): Promise<void> {
  if (phraseConceptIds.length === 0) return
  const db = await getDb()
  const categoryId = categoryName ? await findOrCreateCategory(categoryName) : null
  const sets = phraseConceptIds.map((id) => ({
    statement: 'UPDATE phrase_concepts SET category_id = ? WHERE id = ?;',
    values: [categoryId, id],
  }))
  await db.executeSet(sets)
  await persist()
}

export async function reorderTranslations(orderedTranslationIds: number[]): Promise<void> {
  const db = await getDb()
  const sets = orderedTranslationIds.map((id, index) => ({
    statement: 'UPDATE translations SET sort_order = ? WHERE id = ?;',
    values: [index, id],
  }))
  if (sets.length > 0) await db.executeSet(sets)
  await persist()
}
