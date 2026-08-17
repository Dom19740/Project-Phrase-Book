import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import {
  addLanguage,
  addPhraseConcept,
  bulkDeletePhraseConcepts,
  bulkDeleteTranslations,
  bulkSetCategory,
  bulkSetFavorite,
  bulkSetLearned,
  bulkSetTranslationText,
  deleteCategory as deleteCategoryQuery,
  deleteLanguage as deleteLanguageQuery,
  deletePhraseConcept,
  deleteTranslation,
  findOrCreateCategory,
  getAllPhraseConcepts,
  getCategories,
  getLanguages,
  getPhraseList,
  importCsvPhrases,
  renameCategory as renameCategoryQuery,
  reorderTranslations,
  setFavorite,
  setLearned,
  updatePhrase,
} from '../db/queries'
import { backfillSeedCategories } from '../db/seed'
import type { Category, Language, PhraseListItem } from '../db/types'
import { exportSnapshot, importSnapshot, isValidBackupSnapshot, type BackupSnapshot } from '../db/backup'
import { onMutation } from '../db/client'
import { scheduleAutoBackup } from '../lib/autoBackup'
import { readBackupFromPickedLocation, readCsvFromPickedLocation, saveBackupToPickedLocation } from '../lib/backupFile'
import { translatePhrase, translatePhrasesBulk } from '../lib/translateApi'
import { translateInChunksWithRetry } from '../lib/chunkedTranslate'
import { usePersistedState } from '../lib/usePersistedState'
import { phrasesToCsv } from '../lib/csvExport'
import { parseCsvPhrases, type CsvPhraseRow } from '../lib/csvImport'
import { startupPhrases } from '../data/startupPhrases'

interface PhraseBookContextValue {
  loading: boolean
  languages: Language[]
  categories: Category[]
  activeLanguageId: number | null
  setActiveLanguageId: (id: number) => void
  phrases: PhraseListItem[]
  backgroundTranslation: { languageId: number; languageName: string } | null
  translationIncomplete: { languageName: string; count: number } | null
  refreshPhrases: () => Promise<void>
  toggleLearned: (translationId: number, learned: boolean) => Promise<void>
  toggleFavorite: (translationId: number, favorite: boolean) => Promise<void>
  reorder: (orderedTranslationIds: number[]) => Promise<void>
  addPhrase: (
    english: string,
    categoryName: string | null,
    languageIds: number[],
    manualTranslations?: { languageId: number; text: string }[],
  ) => Promise<void>
  editPhrase: (phraseConceptId: number, translationId: number, english: string, text: string, categoryName: string | null) => Promise<void>
  deleteOneLanguage: (translationId: number) => Promise<void>
  deleteAllLanguages: (phraseConceptId: number) => Promise<void>
  bulkMarkLearned: (translationIds: number[], learned: boolean) => Promise<void>
  bulkMarkFavorite: (translationIds: number[], favorite: boolean) => Promise<void>
  bulkDeleteOneLanguage: (translationIds: number[]) => Promise<void>
  bulkDeleteAllLanguages: (phraseConceptIds: number[]) => Promise<void>
  bulkChangeCategory: (phraseConceptIds: number[], categoryName: string | null) => Promise<void>
  createCategory: (name: string) => Promise<void>
  renameCategory: (categoryId: number, newName: string) => Promise<void>
  deleteCategory: (categoryId: number) => Promise<void>
  createLanguage: (name: string, code: string, includeConceptIds?: number[] | null) => Promise<Language>
  addStartupPhrases: (languageId: number, englishKeys?: string[]) => Promise<void>
  removeLanguage: (languageId: number) => Promise<void>
  getLanguagePhrases: (languageId: number) => Promise<PhraseListItem[]>
  backUpToFile: () => Promise<void>
  pickBackupFile: () => Promise<{ name: string; snapshot: BackupSnapshot }>
  applyBackupSnapshot: (snapshot: BackupSnapshot) => Promise<void>
  exportLanguageCsv: (languageId: number) => Promise<string>
  pickCsvFile: () => Promise<{ name: string; rows: CsvPhraseRow[] }>
  importLanguageCsv: (rows: CsvPhraseRow[], language: Language) => Promise<{ created: number; updated: number }>
}

/** Phrases translated per request when auto-translating a newly added language in the background. */
const TRANSLATE_CHUNK_SIZE = 20

/** Wait before retrying a failed chunk — a failure is often a rate limit, and retrying instantly just hits it again. */
const TRANSLATE_RETRY_DELAY_MS = 5000

/**
 * How many passes to make before giving up on a chunk. A single retry (the old default) isn't
 * enough for a big import — a large batch of phrases routinely trips the proxy's per-device bulk
 * rate limit, which doesn't clear in one 5s wait, so most of the list was ending up permanently
 * untranslated after just one retry. translateInChunksWithRetry backs off exponentially (capped)
 * between passes, so this rides out a rate limit lasting a few minutes instead of a few seconds.
 */
const TRANSLATE_MAX_ATTEMPTS = 10

const PhraseBookContext = createContext<PhraseBookContextValue | null>(null)

export function PhraseBookProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true)
  const [languages, setLanguages] = useState<Language[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [activeLanguageId, setActiveLanguageId] = usePersistedState<number | null>('phrasebook-active-language-id', null)
  const [phrases, setPhrases] = useState<PhraseListItem[]>([])
  const [backgroundTranslation, setBackgroundTranslation] = useState<{ languageId: number; languageName: string } | null>(null)
  const [translationIncomplete, setTranslationIncomplete] = useState<{ languageName: string; count: number } | null>(null)

  // Background translation runs detached from React's render cycle, so it needs the *current*
  // active language at the time each chunk finishes, not the value closed over when it started.
  const activeLanguageIdRef = useRef(activeLanguageId)
  useEffect(() => {
    activeLanguageIdRef.current = activeLanguageId
  }, [activeLanguageId])

  const refreshLanguages = useCallback(async () => {
    const langs = await getLanguages()
    setLanguages(langs)
    return langs
  }, [])

  const refreshCategories = useCallback(async () => {
    setCategories(await getCategories())
  }, [])

  const refreshPhrases = useCallback(async () => {
    if (activeLanguageId == null) return
    setPhrases(await getPhraseList(activeLanguageId))
  }, [activeLanguageId])

  useEffect(() => {
    onMutation(scheduleAutoBackup)
  }, [])

  useEffect(() => {
    ;(async () => {
      await backfillSeedCategories()
      const langs = await refreshLanguages()
      await refreshCategories()
      setActiveLanguageId((current) => {
        if (current != null && langs.some((l) => l.id === current)) return current
        return langs[0]?.id ?? null
      })
      setLoading(false)
    })()
  }, [refreshLanguages, refreshCategories])

  useEffect(() => {
    refreshPhrases()
  }, [refreshPhrases])

  const toggleLearned = useCallback(
    async (translationId: number, learned: boolean) => {
      await setLearned(translationId, learned)
      await refreshPhrases()
    },
    [refreshPhrases],
  )

  const toggleFavorite = useCallback(
    async (translationId: number, favorite: boolean) => {
      await setFavorite(translationId, favorite)
      await refreshPhrases()
    },
    [refreshPhrases],
  )

  const reorder = useCallback(
    async (orderedTranslationIds: number[]) => {
      await reorderTranslations(orderedTranslationIds)
      await refreshPhrases()
    },
    [refreshPhrases],
  )

  const addPhrase = useCallback(
    async (english: string, categoryName: string | null, languageIds: number[], manualTranslations?: { languageId: number; text: string }[]) => {
      const translations: { languageId: number; text: string }[] = [...(manualTranslations ?? [])]
      let finalCategory = categoryName

      // Languages the user already previewed/edited a translation for (via "Suggest") don't need
      // another round-trip — only the rest get auto-translated.
      const manualLanguageIds = new Set((manualTranslations ?? []).map((t) => t.languageId))
      const targetLanguages = languages.filter((l) => languageIds.includes(l.id) && !manualLanguageIds.has(l.id))

      if (targetLanguages.length > 0) {
        const callTranslate = () =>
          translatePhrase(
            english,
            targetLanguages.map((l) => l.code),
            categoryName,
            categories.map((c) => c.name),
            Object.fromEntries(targetLanguages.map((l) => [l.code, l.name])),
          )

        try {
          // One retry before giving up — a single transient failure (a slow response, a
          // one-off network blip) shouldn't leave the phrase untranslated when trying again
          // immediately would likely have worked, same reasoning as the Add Language retry.
          const result = await callTranslate().catch((err) => {
            console.error('Auto-translate failed, retrying once:', err)
            return callTranslate()
          })
          translations.push(
            ...targetLanguages
              .filter((l) => result.translations[l.code])
              .map((l) => ({ languageId: l.id, text: result.translations[l.code] })),
          )
          if (!categoryName) finalCategory = result.suggestedCategory
        } catch (err) {
          // Proxy unreachable/not configured yet — still create the phrase (blank
          // translations to fill in manually) rather than blocking the user.
          console.error('Auto-translate failed twice, adding phrase untranslated:', err)
        }
      }

      // Only the chosen languages get a row at all (blank for any that didn't get an automatic
      // translation) — a language not selected here simply won't have this phrase.
      await addPhraseConcept({ english, categoryName: finalCategory, translations, languageIds })
      await refreshCategories()
      await refreshPhrases()
    },
    [languages, categories, refreshCategories, refreshPhrases],
  )

  const editPhrase = useCallback(
    async (phraseConceptId: number, translationId: number, english: string, text: string, categoryName: string | null) => {
      await updatePhrase(phraseConceptId, translationId, english, text, categoryName)
      await refreshCategories()
      await refreshPhrases()
    },
    [refreshCategories, refreshPhrases],
  )

  const deleteOneLanguage = useCallback(
    async (translationId: number) => {
      await deleteTranslation(translationId)
      await refreshPhrases()
    },
    [refreshPhrases],
  )

  const deleteAllLanguages = useCallback(
    async (phraseConceptId: number) => {
      await deletePhraseConcept(phraseConceptId)
      await refreshPhrases()
    },
    [refreshPhrases],
  )

  const bulkMarkLearned = useCallback(
    async (translationIds: number[], learned: boolean) => {
      await bulkSetLearned(translationIds, learned)
      await refreshPhrases()
    },
    [refreshPhrases],
  )

  const bulkMarkFavorite = useCallback(
    async (translationIds: number[], favorite: boolean) => {
      await bulkSetFavorite(translationIds, favorite)
      await refreshPhrases()
    },
    [refreshPhrases],
  )

  const bulkDeleteOneLanguage = useCallback(
    async (translationIds: number[]) => {
      await bulkDeleteTranslations(translationIds)
      await refreshPhrases()
    },
    [refreshPhrases],
  )

  const bulkDeleteAllLanguages = useCallback(
    async (phraseConceptIds: number[]) => {
      await bulkDeletePhraseConcepts(phraseConceptIds)
      await refreshPhrases()
    },
    [refreshPhrases],
  )

  const bulkChangeCategory = useCallback(
    async (phraseConceptIds: number[], categoryName: string | null) => {
      await bulkSetCategory(phraseConceptIds, categoryName)
      await refreshCategories()
      await refreshPhrases()
    },
    [refreshCategories, refreshPhrases],
  )

  const createCategory = useCallback(
    async (name: string) => {
      await findOrCreateCategory(name)
      await refreshCategories()
    },
    [refreshCategories],
  )

  const renameCategory = useCallback(
    async (categoryId: number, newName: string) => {
      await renameCategoryQuery(categoryId, newName)
      await refreshCategories()
      await refreshPhrases()
    },
    [refreshCategories, refreshPhrases],
  )

  const deleteCategory = useCallback(
    async (categoryId: number) => {
      await deleteCategoryQuery(categoryId)
      await refreshCategories()
      await refreshPhrases()
    },
    [refreshCategories, refreshPhrases],
  )

  const backUpToFile = useCallback(async () => {
    const snapshot = await exportSnapshot()
    await saveBackupToPickedLocation(JSON.stringify(snapshot, null, 2))
  }, [])

  const pickBackupFile = useCallback(async (): Promise<{ name: string; snapshot: BackupSnapshot }> => {
    const { name, data } = await readBackupFromPickedLocation()
    const snapshot = JSON.parse(data)
    if (!isValidBackupSnapshot(snapshot)) throw new Error('That file is not a recognized backup.')
    return { name, snapshot }
  }, [])

  const applyBackupSnapshot = useCallback(
    async (snapshot: BackupSnapshot) => {
      await importSnapshot(snapshot)
      const langs = await refreshLanguages()
      await refreshCategories()
      const nextLanguageId = langs[0]?.id ?? null
      setActiveLanguageId(nextLanguageId)

      // Use nextLanguageId directly rather than refreshPhrases(), whose closure may still be
      // bound to the previous activeLanguageId until React re-renders after setActiveLanguageId above.
      setPhrases(nextLanguageId == null ? [] : await getPhraseList(nextLanguageId))
    },
    [refreshLanguages, refreshCategories],
  )

  const exportLanguageCsv = useCallback(async (languageId: number) => {
    const list = await getPhraseList(languageId)
    return phrasesToCsv(list)
  }, [])

  const pickCsvFile = useCallback(async (): Promise<{ name: string; rows: CsvPhraseRow[] }> => {
    const { name, data } = await readCsvFromPickedLocation()
    const rows = parseCsvPhrases(data)
    if (rows.length === 0) throw new Error('No phrases found in that file.')
    return { name, rows }
  }, [])

  /**
   * Fills in blank translations for a set of phrase concepts by auto-translating them in the
   * background, chunked with retry — the same flow whether the concepts came from adding a new
   * language, starter phrases, or a CSV import whose Translation column was empty or partial.
   */
  const runBackgroundTranslation = useCallback(
    (languageId: number, languageCode: string, languageName: string, concepts: { id: number; english: string }[]) => {
      if (concepts.length === 0) return
      setBackgroundTranslation({ languageId, languageName })
      setTranslationIncomplete(null)
      ;(async () => {
        async function translateChunk(chunk: { id: number; english: string }[]): Promise<boolean> {
          try {
            const translations = await translatePhrasesBulk(
              chunk.map((c) => c.english),
              languageCode,
              languageName,
            )
            const entries = chunk
              .filter((c) => translations[c.english])
              .map((c) => ({ phraseConceptId: c.id, languageId, text: translations[c.english] }))
            if (entries.length > 0) {
              await bulkSetTranslationText(entries)
              if (activeLanguageIdRef.current === languageId) setPhrases(await getPhraseList(languageId))
            }
            return entries.length === chunk.length
          } catch (err) {
            console.error('Bulk auto-translate failed for a chunk:', err)
            return false
          }
        }

        const failed = await translateInChunksWithRetry(concepts, TRANSLATE_CHUNK_SIZE, translateChunk, TRANSLATE_RETRY_DELAY_MS, TRANSLATE_MAX_ATTEMPTS)

        setBackgroundTranslation((current) => (current?.languageId === languageId ? null : current))

        if (failed.length > 0) {
          console.error(`${failed.length} phrase(s) could not be auto-translated after retrying.`)
          setTranslationIncomplete({ languageName, count: failed.length })
          setTimeout(() => {
            setTranslationIncomplete((current) => (current?.languageName === languageName ? null : current))
          }, 8000)
        }
      })()
    },
    [],
  )

  const importLanguageCsv = useCallback(
    async (rows: CsvPhraseRow[], language: Language) => {
      const result = await importCsvPhrases(language.id, rows)
      await refreshCategories()
      setActiveLanguageId(language.id)
      setPhrases(await getPhraseList(language.id))
      runBackgroundTranslation(language.id, language.code, language.name, result.blank)
      return { created: result.created, updated: result.updated }
    },
    [refreshCategories, setActiveLanguageId, runBackgroundTranslation],
  )

  const getLanguagePhrases = useCallback((languageId: number) => getPhraseList(languageId), [])

  const createLanguage = useCallback(
    async (name: string, code: string, includeConceptIds?: number[] | null) => {
      const lang = await addLanguage(name, code, includeConceptIds)
      await refreshLanguages()
      setActiveLanguageId(lang.id)

      // Use lang.id directly rather than refreshPhrases(), whose closure may still be
      // bound to the previous activeLanguageId until React re-renders after setActiveLanguageId above.
      setPhrases(await getPhraseList(lang.id))

      // A caller can restrict which phrases get carried into this language at all (e.g. the ones the
      // user picked to "copy" from an existing language's phrasebook) — addLanguage() above already
      // only created rows for those, so auto-translation is restricted to the same set.
      let concepts = await getAllPhraseConcepts()
      if (includeConceptIds) {
        const include = new Set(includeConceptIds)
        concepts = concepts.filter((c) => include.has(c.id))
      }
      // Translating everything can take a while (many phrases, a slow/mobile connection) — run it
      // in the background instead of blocking the caller, so the "add language" modal can close
      // right away.
      runBackgroundTranslation(lang.id, lang.code, lang.name, concepts)

      return lang
    },
    [refreshLanguages, runBackgroundTranslation],
  )

  const addStartupPhrases = useCallback(
    async (languageId: number, englishKeys?: string[]) => {
      const lang = languages.find((l) => l.id === languageId)
      if (!lang) return

      const included = englishKeys ? new Set(englishKeys) : null
      const phrasesToAdd = included ? startupPhrases.filter((p) => included.has(p.english)) : startupPhrases
      if (phrasesToAdd.length === 0) return

      // Created blank and auto-translated into whatever language was picked, same as the
      // background translation that runs after adding a language.
      const concepts: { id: number; english: string }[] = []
      for (const phrase of phrasesToAdd) {
        const conceptId = await addPhraseConcept({
          english: phrase.english,
          categoryName: phrase.category,
          translations: [{ languageId, text: '' }],
          languageIds: [languageId],
        })
        concepts.push({ id: conceptId, english: phrase.english })
      }
      await refreshCategories()
      await refreshPhrases()

      runBackgroundTranslation(languageId, lang.code, lang.name, concepts)
    },
    [languages, refreshCategories, refreshPhrases, runBackgroundTranslation],
  )

  const removeLanguage = useCallback(
    async (languageId: number) => {
      await deleteLanguageQuery(languageId)
      const langs = await refreshLanguages()
      if (activeLanguageId === languageId) setActiveLanguageId(langs[0]?.id ?? null)
    },
    [refreshLanguages, activeLanguageId],
  )

  const value = useMemo<PhraseBookContextValue>(
    () => ({
      loading,
      languages,
      categories,
      activeLanguageId,
      setActiveLanguageId,
      phrases,
      backgroundTranslation,
      translationIncomplete,
      refreshPhrases,
      toggleLearned,
      toggleFavorite,
      reorder,
      addPhrase,
      editPhrase,
      deleteOneLanguage,
      deleteAllLanguages,
      bulkMarkLearned,
      bulkMarkFavorite,
      bulkDeleteOneLanguage,
      bulkDeleteAllLanguages,
      bulkChangeCategory,
      createCategory,
      renameCategory,
      deleteCategory,
      createLanguage,
      addStartupPhrases,
      removeLanguage,
      getLanguagePhrases,
      backUpToFile,
      pickBackupFile,
      applyBackupSnapshot,
      exportLanguageCsv,
      pickCsvFile,
      importLanguageCsv,
    }),
    [
      loading,
      languages,
      categories,
      activeLanguageId,
      phrases,
      backgroundTranslation,
      translationIncomplete,
      refreshPhrases,
      toggleLearned,
      toggleFavorite,
      reorder,
      addPhrase,
      editPhrase,
      backUpToFile,
      pickBackupFile,
      applyBackupSnapshot,
      exportLanguageCsv,
      pickCsvFile,
      importLanguageCsv,
      deleteOneLanguage,
      deleteAllLanguages,
      bulkMarkLearned,
      bulkMarkFavorite,
      bulkDeleteOneLanguage,
      bulkDeleteAllLanguages,
      bulkChangeCategory,
      createCategory,
      renameCategory,
      deleteCategory,
      createLanguage,
      addStartupPhrases,
      removeLanguage,
      getLanguagePhrases,
    ],
  )

  return <PhraseBookContext.Provider value={value}>{children}</PhraseBookContext.Provider>
}

export function usePhraseBook(): PhraseBookContextValue {
  const ctx = useContext(PhraseBookContext)
  if (!ctx) throw new Error('usePhraseBook must be used within a PhraseBookProvider')
  return ctx
}
