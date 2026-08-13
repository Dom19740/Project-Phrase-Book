import { useEffect, useMemo, useState } from 'react'
import { Search, X } from 'lucide-react'
import type { Language, PhraseListItem } from '../db/types'
import { getLanguageFlag } from '../lib/languageFlags'
import { LANGUAGE_OPTIONS, type LanguageOption } from '../lib/languageOptions'
import { PopoutSelect } from './PopoutSelect'

interface Props {
  languages: Language[]
  activeLanguageId: number | null
  getLanguagePhrases: (languageId: number) => Promise<PhraseListItem[]>
  onClose: () => void
  onSubmit: (name: string, code: string, includeConceptIds?: number[] | null) => Promise<void>
}

export function AddLanguageModal({ languages, activeLanguageId, getLanguagePhrases, onClose, onSubmit }: Props) {
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<LanguageOption | null>(null)
  const [saving, setSaving] = useState(false)
  const [manual, setManual] = useState(false)
  const [manualName, setManualName] = useState('')
  const [manualCode, setManualCode] = useState('')

  const [sourceLanguageId, setSourceLanguageId] = useState<number | null>(activeLanguageId ?? languages[0]?.id ?? null)
  const [sourcePhrases, setSourcePhrases] = useState<PhraseListItem[] | null>(null)
  const [loadingPhrases, setLoadingPhrases] = useState(false)
  const [includedIds, setIncludedIds] = useState<Set<number>>(new Set())

  const existingCodes = useMemo(() => new Set(languages.map((l) => l.code.toLowerCase())), [languages])
  const hasExistingPhrases = languages.length > 0

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return LANGUAGE_OPTIONS
    return LANGUAGE_OPTIONS.filter((l) => l.name.toLowerCase().includes(q) || l.code.toLowerCase().includes(q))
  }, [search])

  useEffect(() => {
    if (!selected || sourceLanguageId == null) return
    let cancelled = false
    setLoadingPhrases(true)
    getLanguagePhrases(sourceLanguageId).then((phrases) => {
      if (cancelled) return
      setSourcePhrases(phrases)
      // Default to the phrases that actually have text in the chosen source phrasebook —
      // that's what "copy phrases from X" means. Still fully editable below.
      setIncludedIds(new Set(phrases.filter((p) => p.text.trim().length > 0).map((p) => p.phraseConceptId)))
      setLoadingPhrases(false)
    })
    return () => {
      cancelled = true
    }
  }, [selected, sourceLanguageId, getLanguagePhrases])

  function toggleIncluded(conceptId: number) {
    setIncludedIds((prev) => {
      const next = new Set(prev)
      if (next.has(conceptId)) next.delete(conceptId)
      else next.add(conceptId)
      return next
    })
  }

  async function handleAdd() {
    if (!selected) return
    setSaving(true)
    await onSubmit(selected.name, selected.code, hasExistingPhrases ? Array.from(includedIds) : null)
    setSaving(false)
    onClose()
  }

  /**
   * There's nothing to configure when there are no existing phrases to copy from, so picking a
   * language adds it immediately instead of showing an empty confirmation screen — the caller
   * follows up with the starter-phrases prompt.
   */
  async function chooseLanguage(lang: LanguageOption) {
    if (!hasExistingPhrases) {
      setSaving(true)
      await onSubmit(lang.name, lang.code, null)
      setSaving(false)
      onClose()
      return
    }
    setSelected(lang)
  }

  const canSubmitManual = manualName.trim().length > 0 && manualCode.trim().length > 0

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 pt-16 pb-[var(--safe-area-inset-bottom,0px)] sm:pt-24"
      onClick={onClose}
    >
      <div
        className={`w-full ${selected ? 'sm:max-w-md' : 'sm:max-w-sm'} rounded-2xl border border-hairline bg-surface p-5 shadow-2xl mx-4 sm:mx-0`}
        onClick={(e) => e.stopPropagation()}
      >
        {selected ? (
          <>
            <h2 className="text-lg font-semibold mb-1 text-ink">
              <span aria-hidden="true">{getLanguageFlag(selected.code)}</span> Add {selected.name}
            </h2>

            <p className="text-xs text-muted mb-3">
              Selected phrases get translated into {selected.name} automatically in the background after you add it. Pick which phrase book
              to copy from, then uncheck any phrases you don't want carried over.
            </p>

            <label className="block text-sm font-medium mb-1 text-ink">Copy phrases from</label>
            <PopoutSelect
              className="mb-3 w-full"
              align="left"
              value={sourceLanguageId ?? languages[0]?.id ?? 0}
              onChange={(id) => setSourceLanguageId(id)}
              options={languages.map((lang) => ({
                value: lang.id,
                label: lang.name,
                shortLabel: (
                  <span className="flex items-center gap-1.5">
                    <span aria-hidden="true">{getLanguageFlag(lang.code)}</span>
                    {lang.name}
                  </span>
                ),
              }))}
            />

            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-medium text-ink">Phrases to include</span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setIncludedIds(new Set((sourcePhrases ?? []).map((p) => p.phraseConceptId)))}
                  disabled={!sourcePhrases || sourcePhrases.length === 0}
                  className="text-xs text-fabpink disabled:opacity-40"
                >
                  All
                </button>
                <button
                  type="button"
                  onClick={() => setIncludedIds(new Set())}
                  disabled={!sourcePhrases || sourcePhrases.length === 0}
                  className="text-xs text-fabpink disabled:opacity-40"
                >
                  None
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-0.5 max-h-56 overflow-y-auto mb-4 rounded-xl border border-hairline p-1.5">
              {loadingPhrases && <p className="text-sm text-muted text-center py-4">Loading phrases...</p>}
              {!loadingPhrases && sourcePhrases?.length === 0 && <p className="text-sm text-muted text-center py-4">No phrases yet.</p>}
              {!loadingPhrases &&
                sourcePhrases?.map((p) => (
                  <label
                    key={p.phraseConceptId}
                    className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-ink hover:bg-surfacehover cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={includedIds.has(p.phraseConceptId)}
                      onChange={() => toggleIncluded(p.phraseConceptId)}
                      className="size-4 shrink-0 rounded accent-fabpink cursor-pointer"
                    />
                    <span className="min-w-0 flex-1 truncate">
                      <span className="text-ink">{p.english}</span>
                      {p.text ? <span className="text-muted"> — {p.text}</span> : <span className="italic text-neutral-600"> — untranslated</span>}
                    </span>
                  </label>
                ))}
            </div>

            <p className="text-xs text-muted mb-4">{includedIds.size} of {sourcePhrases?.length ?? 0} phrases selected.</p>

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setSelected(null)}
                disabled={saving}
                className="rounded-full border border-hairline px-4 py-2 text-sm font-medium text-ink disabled:opacity-40"
              >
                Back
              </button>
              <button
                onClick={handleAdd}
                disabled={saving || loadingPhrases}
                className="rounded-full bg-fabpink px-5 py-2 text-sm font-medium text-white shadow-sm disabled:opacity-40"
              >
                {saving ? 'Adding...' : 'Add language'}
              </button>
            </div>
          </>
        ) : manual ? (
          <>
            <h2 className="text-lg font-semibold mb-4 text-ink">Add language manually</h2>

            <label className="block text-sm font-medium mb-1 text-ink">Name</label>
            <input
              autoFocus
              value={manualName}
              onChange={(e) => setManualName(e.target.value)}
              className="w-full mb-3 rounded-xl border border-hairline bg-transparent text-ink px-3 py-2"
              placeholder="e.g. Klingon"
            />
            <label className="block text-sm font-medium mb-1 text-ink">Language code</label>
            <input
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value)}
              className="w-full mb-1 rounded-xl border border-hairline bg-transparent text-ink px-3 py-2"
              placeholder="e.g. de or pt-PT"
            />
            <p className="text-xs text-muted mb-4">An ISO 639-1 code or BCP-47 locale, e.g. "de" or "pt-PT".</p>

            <div className="flex justify-between gap-2">
              <button onClick={() => setManual(false)} className="rounded-full border border-hairline px-4 py-2 text-sm font-medium text-ink">
                Back
              </button>
              <button
                onClick={() => chooseLanguage({ name: manualName.trim(), code: manualCode.trim() })}
                disabled={!canSubmitManual || saving}
                className="rounded-full bg-fabpink px-5 py-2 text-sm font-medium text-white shadow-sm disabled:opacity-40"
              >
                {saving ? 'Adding...' : 'Next'}
              </button>
            </div>
          </>
        ) : (
          <>
            <h2 className="text-lg font-semibold mb-4 text-ink">Add language</h2>

            <div className="relative mb-3">
              <Search size={14} strokeWidth={2} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
              <input
                autoFocus
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search languages"
                className="w-full rounded-full border border-hairline bg-transparent text-ink pl-8 pr-8 py-2 text-sm"
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-full p-1 text-muted hover:text-ink"
                  aria-label="Clear search"
                >
                  <X size={14} strokeWidth={2} />
                </button>
              )}
            </div>

            <div className="flex flex-col gap-0.5 max-h-72 overflow-y-auto mb-3">
              {filtered.length === 0 && <p className="text-sm text-muted text-center py-4">No matches.</p>}
              {filtered.map((lang) => {
                const added = existingCodes.has(lang.code.toLowerCase())
                return (
                  <button
                    key={lang.code}
                    disabled={added || saving}
                    onClick={() => chooseLanguage(lang)}
                    className="flex items-center justify-between rounded-lg px-2.5 py-2 text-sm text-left text-ink hover:bg-surfacehover disabled:opacity-40 disabled:hover:bg-transparent"
                  >
                    <span className="flex items-center gap-2">
                      <span aria-hidden="true">{getLanguageFlag(lang.code)}</span>
                      {lang.name}
                    </span>
                    {added && <span className="text-xs text-muted">Added</span>}
                  </button>
                )
              })}
            </div>

            <div className="flex items-center justify-between gap-2">
              <button onClick={() => setManual(true)} className="text-xs text-muted hover:text-ink underline">
                Can't find it? Add manually
              </button>
              <button onClick={onClose} className="rounded-full border border-hairline px-4 py-2 text-sm font-medium text-ink">
                Cancel
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
