import { useEffect, useMemo, useRef, useState } from 'react'
import { Sparkles } from 'lucide-react'
import { startupPhrases } from '../data/startupPhrases'
import type { Language, PhraseListItem } from '../db/types'
import { getLanguageFlag } from '../lib/languageFlags'
import type { LanguageOption } from '../lib/languageOptions'
import { LanguageSearchList } from './LanguageSearchList'
import { PopoutSelect } from './PopoutSelect'
import { Button } from './ui/Button'
import { Dialog } from './ui/Dialog'

// Sentinel "Copy phrases from" source, distinct from any real (positive, DB-assigned) language id -
// picking it means starting from the curated starter pack instead of an existing phrasebook.
const STARTER_PHRASES_SOURCE = -1

const alphabeticalStarterPhrases = [...startupPhrases].sort((a, b) => a.english.localeCompare(b.english))

interface Props {
  languages: Language[]
  activeLanguageId: number | null
  getLanguagePhrases: (languageId: number) => Promise<PhraseListItem[]>
  onClose: () => void
  onSubmit: (
    name: string,
    code: string,
    includeConceptIds?: number[] | null,
    sourceLanguageId?: number | null,
    phoneticsEnabled?: boolean,
    starterPhraseKeys?: string[] | null,
  ) => Promise<void>
}

export function AddLanguageModal({ languages, activeLanguageId, getLanguagePhrases, onClose, onSubmit }: Props) {
  const [selected, setSelected] = useState<LanguageOption | null>(null)
  const [saving, setSaving] = useState(false)
  const [phoneticsEnabled, setPhoneticsEnabled] = useState(false)

  const [sourceLanguageId, setSourceLanguageId] = useState<number | null>(
    activeLanguageId ?? languages[0]?.id ?? (languages.length === 0 ? STARTER_PHRASES_SOURCE : null),
  )
  const [sourcePhrases, setSourcePhrases] = useState<PhraseListItem[] | null>(null)
  const [loadingPhrases, setLoadingPhrases] = useState(false)
  const [includedIds, setIncludedIds] = useState<Set<number>>(new Set())
  // Starter phrases has only the one source, so its own selection just needs to persist as-is
  // across switching away and back - nothing selected until the user opts phrases in.
  const [includedStarterKeys, setIncludedStarterKeys] = useState<Set<string>>(new Set())
  // Each real language source keeps its own remembered selection, so flipping "Copy phrases from"
  // back and forth doesn't keep resetting whichever one you already picked through.
  const includedIdsBySource = useRef<Map<number, Set<number>>>(new Map())
  // Every language's phrase list is the same global set of phrase concepts (just previewed with
  // that language's own translation text), so whichever one loads first already gives the full
  // concept universe - kept around so duplicate-checking and the "of X" total still work while
  // looking at Starter phrases, which clears `sourcePhrases` since it isn't fetching anything.
  const allConceptsRef = useRef<PhraseListItem[] | null>(null)
  // Which real language to copy seed text from at submit time, regardless of which source is
  // actually on screen when "Add a language" gets clicked (e.g. if that's Starter phrases).
  const lastRealSourceLanguageId = useRef<number | null>(sourceLanguageId !== STARTER_PHRASES_SOURCE ? sourceLanguageId : null)

  const existingCodes = useMemo(() => new Set(languages.map((l) => l.code.toLowerCase())), [languages])
  const hasExistingPhrases = languages.length > 0
  const isStarterSource = sourceLanguageId === STARTER_PHRASES_SOURCE

  useEffect(() => {
    if (!selected || sourceLanguageId == null) return

    if (sourceLanguageId === STARTER_PHRASES_SOURCE) {
      setSourcePhrases(null)
      setLoadingPhrases(false)
      return
    }

    lastRealSourceLanguageId.current = sourceLanguageId

    let cancelled = false
    setLoadingPhrases(true)
    getLanguagePhrases(sourceLanguageId).then((phrases) => {
      if (cancelled) return
      setSourcePhrases(phrases)
      allConceptsRef.current = phrases
      const remembered = includedIdsBySource.current.get(sourceLanguageId)
      if (remembered) {
        setIncludedIds(new Set(remembered))
      } else {
        // Nothing selected until the user opts phrases in.
        includedIdsBySource.current.set(sourceLanguageId, new Set())
        setIncludedIds(new Set())
      }
      setLoadingPhrases(false)
    })
    return () => {
      cancelled = true
    }
  }, [selected, sourceLanguageId, getLanguagePhrases])

  // The combined picture across every list visited so far, deduplicating a starter phrase against
  // an already-selected existing concept that has the exact same English text.
  const allSelectedConceptIds = new Set<number>()
  includedIdsBySource.current.forEach((set) => set.forEach((id) => allSelectedConceptIds.add(id)))
  const conceptUniverse = allConceptsRef.current ?? sourcePhrases ?? []
  const englishByConceptId = new Map(conceptUniverse.map((p) => [p.phraseConceptId, p.english]))
  const selectedConceptEnglishTexts = new Set(
    Array.from(allSelectedConceptIds)
      .map((id) => englishByConceptId.get(id))
      .filter((text): text is string => Boolean(text)),
  )
  const dedupedStarterKeys = Array.from(includedStarterKeys).filter((key) => !selectedConceptEnglishTexts.has(key))
  const allConceptEnglishTexts = new Set(conceptUniverse.map((p) => p.english))
  const nonDuplicateStarterCount = startupPhrases.filter((p) => !allConceptEnglishTexts.has(p.english)).length
  const totalSelectedCount = allSelectedConceptIds.size + dedupedStarterKeys.length
  const totalAvailableCount = conceptUniverse.length + nonDuplicateStarterCount

  function rememberIncluded(next: Set<number>) {
    if (sourceLanguageId != null && sourceLanguageId !== STARTER_PHRASES_SOURCE) {
      includedIdsBySource.current.set(sourceLanguageId, next)
    }
    setIncludedIds(next)
  }

  function toggleIncluded(conceptId: number) {
    const next = new Set(includedIds)
    if (next.has(conceptId)) next.delete(conceptId)
    else next.add(conceptId)
    rememberIncluded(next)
  }

  function toggleStarterIncluded(english: string) {
    setIncludedStarterKeys((prev) => {
      const next = new Set(prev)
      if (next.has(english)) next.delete(english)
      else next.add(english)
      return next
    })
  }

  async function handleAdd() {
    if (!selected) return
    setSaving(true)
    const conceptIdsToInclude = Array.from(allSelectedConceptIds)
    const starterKeysToInclude = dedupedStarterKeys
    await onSubmit(
      selected.name,
      selected.code,
      conceptIdsToInclude.length > 0 ? conceptIdsToInclude : null,
      conceptIdsToInclude.length > 0 ? lastRealSourceLanguageId.current : null,
      phoneticsEnabled,
      starterKeysToInclude.length > 0 ? starterKeysToInclude : null,
    )
    setSaving(false)
    onClose()
  }

  async function chooseLanguage(lang: LanguageOption) {
    setPhoneticsEnabled(false)
    setSelected(lang)
  }

  return (
    <Dialog onClose={onClose} maxWidthClassName={selected ? 'sm:max-w-md' : 'sm:max-w-sm'}>
      <>
        {selected ? (
          <>
            <h2 className="text-lg font-bold tracking-tight mb-1 text-ink">
              <span aria-hidden="true">{getLanguageFlag(selected.code)}</span> Add {selected.name}
            </h2>

            {hasExistingPhrases && (
              <>
                <label className="block text-[11px] font-extrabold uppercase tracking-wider text-fabpink mb-1">Select starter or copied phrases</label>
                <PopoutSelect
                  className="mb-3 w-full"
                  align="left"
                  value={sourceLanguageId ?? languages[0]?.id ?? 0}
                  onChange={(id) => setSourceLanguageId(id)}
                  options={[
                    {
                      value: STARTER_PHRASES_SOURCE,
                      label: 'Starter phrases',
                      shortLabel: (
                        <span className="flex items-center gap-1.5">
                          <Sparkles size={14} strokeWidth={2} aria-hidden="true" />
                          Starter phrases
                        </span>
                      ),
                    },
                    ...languages.map((lang) => ({
                      value: lang.id,
                      label: lang.name,
                      shortLabel: (
                        <span className="flex items-center gap-1.5">
                          <span aria-hidden="true">{getLanguageFlag(lang.code)}</span>
                          {lang.name}
                        </span>
                      ),
                    })),
                  ]}
                />
              </>
            )}

            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-fabpink">Phrases to include</span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() =>
                    isStarterSource
                      ? setIncludedStarterKeys(new Set(startupPhrases.map((p) => p.english)))
                      : rememberIncluded(new Set((sourcePhrases ?? []).map((p) => p.phraseConceptId)))
                  }
                  disabled={isStarterSource ? false : !sourcePhrases || sourcePhrases.length === 0}
                  className="text-xs font-semibold text-fabpink hover:underline disabled:opacity-40 disabled:hover:no-underline"
                >
                  All
                </button>
                <button
                  type="button"
                  onClick={() => (isStarterSource ? setIncludedStarterKeys(new Set()) : rememberIncluded(new Set()))}
                  disabled={isStarterSource ? false : !sourcePhrases || sourcePhrases.length === 0}
                  className="text-xs font-semibold text-fabpink hover:underline disabled:opacity-40 disabled:hover:no-underline"
                >
                  None
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-0.5 max-h-56 overflow-y-auto mb-4 rounded-xl border border-hairline p-1.5">
              {isStarterSource ? (
                alphabeticalStarterPhrases.map((p) => {
                  const checked = includedStarterKeys.has(p.english)
                  return (
                    <button
                      key={p.english}
                      type="button"
                      role="checkbox"
                      aria-checked={checked}
                      onClick={() => toggleStarterIncluded(p.english)}
                      className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm text-ink hover:bg-surfacehover transition-colors"
                    >
                      <span
                        aria-hidden="true"
                        className={`size-4 shrink-0 rounded-full border-2 border-fabpink transition-colors ${checked ? 'bg-fabpink' : ''}`}
                      />
                      <span className="min-w-0 flex-1 truncate text-ink">{p.english}</span>
                    </button>
                  )
                })
              ) : (
                <>
                  {loadingPhrases && <p className="text-sm text-muted text-center py-4">Loading phrases...</p>}
                  {!loadingPhrases && sourcePhrases?.length === 0 && <p className="text-sm text-muted text-center py-4">No phrases yet.</p>}
                  {!loadingPhrases &&
                    sourcePhrases?.map((p) => {
                      const checked = includedIds.has(p.phraseConceptId)
                      return (
                        <button
                          key={p.phraseConceptId}
                          type="button"
                          role="checkbox"
                          aria-checked={checked}
                          onClick={() => toggleIncluded(p.phraseConceptId)}
                          className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm text-ink hover:bg-surfacehover transition-colors"
                        >
                          <span
                            aria-hidden="true"
                            className={`size-4 shrink-0 rounded-full border-2 border-fabpink transition-colors ${checked ? 'bg-fabpink' : ''}`}
                          />
                          <span className="min-w-0 flex-1 truncate text-ink">{p.english}</span>
                        </button>
                      )
                    })}
                </>
              )}
            </div>

            <p className="text-xs text-muted mb-4">
              {totalSelectedCount} of {totalAvailableCount} phrases selected (across all lists).
            </p>

            <label className="mb-4 flex items-start gap-2 rounded-xl border border-hairline p-3 text-sm text-ink">
              <input
                type="checkbox"
                checked={phoneticsEnabled}
                onChange={(event) => setPhoneticsEnabled(event.target.checked)}
                className="mt-0.5 size-4 shrink-0 appearance-none rounded-full border-2 border-fabpink checked:bg-fabpink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fabpink"
              />
              <span>Enable phonetics</span>
            </label>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setSelected(null)} disabled={saving} className="px-4 py-2 text-sm">
                Back
              </Button>
              <Button onClick={handleAdd} disabled={saving || loadingPhrases} className="px-5 py-2 text-sm">
                {saving ? 'Adding...' : 'Add a language'}
              </Button>
            </div>
          </>
        ) : (
          <>
            <h2 className="text-lg font-bold tracking-tight mb-4 text-ink">Add a language</h2>

            <div className="mb-3">
              <LanguageSearchList disabledCodes={existingCodes} disabled={saving} onChoose={chooseLanguage} />
            </div>

            <div className="flex items-center justify-end gap-2">
              <Button variant="outline" onClick={onClose} className="px-4 py-2 text-sm">
                Cancel
              </Button>
            </div>
          </>
        )}
      </>
    </Dialog>
  )
}
