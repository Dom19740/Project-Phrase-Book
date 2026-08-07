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
  renameCategory as renameCategoryQuery,
  reorderTranslations,
  setFavorite,
  setLearned,
  updatePhrase,
} from '../db/queries'
import { backfillSeedCategories, seedIfEmpty } from '../db/seed'
import type { Category, Language, PhraseListItem } from '../db/types'
import { exportSnapshot, importSnapshot, type BackupSnapshot } from '../db/backup'
import { onMutation } from '../db/client'
import { scheduleAutoBackup } from '../lib/autoBackup'
import { readBackupFromPickedLocation, saveBackupToPickedLocation } from '../lib/backupFile'
import { translatePhrase, translatePhrasesBulk } from '../lib/translateApi'
import { translateInChunksWithRetry } from '../lib/chunkedTranslate'
import { usePersistedState } from '../lib/usePersistedState'
import { phrasesToCsv } from '../lib/csvExport'

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
  addPhrase: (english: string, categoryName: string | null, languageIds: number[]) => Promise<void>
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
  createLanguage: (name: string, code: string) => Promise<void>
  removeLanguage: (languageId: number) => Promise<void>
  backUpToFile: () => Promise<void>
  pickBackupFile: () => Promise<{ name: string; snapshot: BackupSnapshot }>
  applyBackupSnapshot: (snapshot: BackupSnapshot) => Promise<void>
  exportLanguageCsv: (languageId: number) => Promise<string>
}

/** Phrases translated per request when auto-translating a newly added language in the background. */
const TRANSLATE_CHUNK_SIZE = 20

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
      await seedIfEmpty()
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
    async (english: string, categoryName: string | null, languageIds: number[]) => {
      let translations: { languageId: number; text: string }[] = []
      let finalCategory = categoryName

      const targetLanguages = languages.filter((l) => languageIds.includes(l.id))

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
          translations = targetLanguages
            .filter((l) => result.translations[l.code])
            .map((l) => ({ languageId: l.id, text: result.translations[l.code] }))
          if (!categoryName) finalCategory = result.suggestedCategory
        } catch (err) {
          // Proxy unreachable/not configured yet — still create the phrase (blank
          // translations to fill in manually) rather than blocking the user.
          console.error('Auto-translate failed twice, adding phrase untranslated:', err)
        }
      }

      // Every tracked language still gets a row here (blank for any not in `translations`) —
      // languageIds only controls which ones get an automatic translation.
      await addPhraseConcept({ english, categoryName: finalCategory, translations })
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
    return { name, snapshot: JSON.parse(data) }
  }, [])

  const applyBackupSnapshot = useCallback(
    async (snapshot: BackupSnapshot) => {
      await importSnapshot(snapshot)
      const langs = await refreshLanguages()
      await refreshCategories()
      setActiveLanguageId(langs[0]?.id ?? null)
    },
    [refreshLanguages, refreshCategories],
  )

  const exportLanguageCsv = useCallback(async (languageId: number) => {
    const list = await getPhraseList(languageId)
    return phrasesToCsv(list)
  }, [])

  const createLanguage = useCallback(
    async (name: string, code: string) => {
      const lang = await addLanguage(name, code)
      await refreshLanguages()
      setActiveLanguageId(lang.id)

      // Use lang.id directly rather than refreshPhrases(), whose closure may still be
      // bound to the previous activeLanguageId until React re-renders after setActiveLanguageId above.
      setPhrases(await getPhraseList(lang.id))

      const concepts = await getAllPhraseConcepts()
      if (concepts.length === 0) return

      // Translating everything can take a while (many phrases, a slow/mobile connection) — run it
      // in the background instead of blocking the caller, so the "add language" modal can close
      // right away. Chunked (rather than one giant request) so a single slow/failed batch doesn't
      // leave every phrase blank, and so each request is less likely to time out.
      setBackgroundTranslation({ languageId: lang.id, languageName: lang.name })
      setTranslationIncomplete(null)
      ;(async () => {
        // Translates one chunk and reports whether every phrase in it actually got a translation
        // back. A chunk that fails outright (network error, proxy 5xx/429/503) or comes back with
        // some entries missing (e.g. Gemini didn't return a value for one of them) both count as
        // "not fully done", so translateInChunksWithRetry gives it a second chance rather than
        // leaving those phrases silently blank forever.
        async function translateChunk(chunk: { id: number; english: string }[]): Promise<boolean> {
          try {
            const translations = await translatePhrasesBulk(
              chunk.map((c) => c.english),
              lang.code,
              lang.name,
            )
            const entries = chunk
              .filter((c) => translations[c.english])
              .map((c) => ({ phraseConceptId: c.id, languageId: lang.id, text: translations[c.english] }))
            if (entries.length > 0) {
              await bulkSetTranslationText(entries)
              if (activeLanguageIdRef.current === lang.id) setPhrases(await getPhraseList(lang.id))
            }
            return entries.length === chunk.length
          } catch (err) {
            console.error('Bulk auto-translate failed for a chunk of the new language:', err)
            return false
          }
        }

        const failed = await translateInChunksWithRetry(concepts, TRANSLATE_CHUNK_SIZE, translateChunk)

        setBackgroundTranslation((current) => (current?.languageId === lang.id ? null : current))

        // Only reached if phrases are still untranslated after a full retry pass — tell the user
        // instead of letting the "Translating…" indicator just vanish as if everything finished.
        if (failed.length > 0) {
          console.error(`Add language: ${failed.length} phrase(s) could not be auto-translated after retrying.`)
          setTranslationIncomplete({ languageName: lang.name, count: failed.length })
          setTimeout(() => {
            setTranslationIncomplete((current) => (current?.languageName === lang.name ? null : current))
          }, 8000)
        }
      })()
    },
    [refreshLanguages],
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
      removeLanguage,
      backUpToFile,
      pickBackupFile,
      applyBackupSnapshot,
      exportLanguageCsv,
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
      removeLanguage,
    ],
  )

  return <PhraseBookContext.Provider value={value}>{children}</PhraseBookContext.Provider>
}

export function usePhraseBook(): PhraseBookContextValue {
  const ctx = useContext(PhraseBookContext)
  if (!ctx) throw new Error('usePhraseBook must be used within a PhraseBookProvider')
  return ctx
}
