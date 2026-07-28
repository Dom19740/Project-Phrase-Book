import { seedVietnamese } from '../data/seedVietnamese'
import { DEFAULT_LANGUAGE_COLOR } from '../lib/colorPalette'
import { addLanguage, addPhraseConcept, backfillCategoriesByEnglish, getLanguages } from './queries'

let seedPromise: Promise<void> | null = null

async function runSeed(): Promise<void> {
  const languages = await getLanguages()
  if (languages.length > 0) return

  const vietnamese = await addLanguage('Vietnamese', 'vi', DEFAULT_LANGUAGE_COLOR)

  for (const phrase of seedVietnamese) {
    await addPhraseConcept({
      english: phrase.english,
      categoryName: phrase.category ?? null,
      translations: [{ languageId: vietnamese.id, text: phrase.vi }],
    })
  }
}

/**
 * Populates starter languages and the user's existing Vietnamese phrase list, but only on first
 * launch. Guarded by a shared in-flight promise so concurrent callers (e.g. React StrictMode's
 * double-invoked effects in dev) don't race the check-then-insert and collide mid-transaction.
 */
export function seedIfEmpty(): Promise<void> {
  if (!seedPromise) seedPromise = runSeed()
  return seedPromise
}

/** Catches up any phrase created before its English text had a known category (e.g. an older seeded DB). */
export async function backfillSeedCategories(): Promise<void> {
  const mapping = Object.fromEntries(seedVietnamese.map((p) => [p.english, p.category]))
  await backfillCategoriesByEnglish(mapping)
}
