import { startupPhrases } from '../data/startupPhrases'
import { backfillCategoriesByEnglish } from './queries'

/** Catches up any phrase created before its English text had a known category (e.g. an older seeded DB). */
export async function backfillSeedCategories(): Promise<void> {
  const mapping = Object.fromEntries(startupPhrases.map((p) => [p.english, p.category]))
  await backfillCategoriesByEnglish(mapping)
}
