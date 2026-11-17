import { useEffect, useMemo, useState } from 'react'
import type { Language, PhraseListItem } from '../db/types'
import { getLanguageFlag } from '../lib/languageFlags'
import type { LanguageOption } from '../lib/languageOptions'
import { LanguageSearchList } from './LanguageSearchList'
import { PopoutSelect } from './PopoutSelect'
import { Button } from './ui/Button'
import { Dialog } from './ui/Dialog'

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
  ) => Promise<void>
}

export function AddLanguageModal({ languages, activeLanguageId, getLanguagePhrases, onClose, onSubmit }: Props) {
  const [selected, setSelected] = useState<LanguageOption | null>(null)
  const [saving, setSaving] = useState(false)
  const [phoneticsEnabled, setPhoneticsEnabled] = useState(false)

  const [sourceLanguageId, setSourceLanguageId] = useState<number | null>(activeLanguageId ?? languages[0]?.id ?? null)
  const [sourcePhrases, setSourcePhrases] = useState<PhraseListItem[] | null>(null)
  const [loadingPhrases, setLoadingPhrases] = useState(false)
  const [includedIds, setIncludedIds] = useState<Set<number>>(new Set())

  const existingCodes = useMemo(() => new Set(languages.map((l) => l.code.toLowerCase())), [languages])
  const hasExistingPhrases = languages.length > 0

  useEffect(() => {
    if (!selected || sourceLanguageId == null) return
    let cancelled = false
    setLoadingPhrases(true)
    getLanguagePhrases(sourceLanguageId).then((phrases) => {
      if (cancelled) return
      setSourcePhrases(phrases)
      // Default to the phrases that actually have text in the chosen source phrasebook -
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
    await onSubmit(
      selected.name,
      selected.code,
      hasExistingPhrases ? Array.from(includedIds) : null,
      hasExistingPhrases ? sourceLanguageId : null,
      phoneticsEnabled,
    )
    setSaving(false)
    onClose()
  }

  /**
   * Confirm configuration before adding the first language too, so phonetics can be enabled
   * before the caller offers starter phrases.
   */
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

            <p className="text-xs text-muted mb-3">
              Choose whether to include learner-friendly phonetic translations.
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

            {hasExistingPhrases && (
              <>
                <label className="block text-[11px] font-extrabold uppercase tracking-wider text-fabpink mb-1">Copy phrases from</label>
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
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-fabpink">Phrases to include</span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setIncludedIds(new Set((sourcePhrases ?? []).map((p) => p.phraseConceptId)))}
                  disabled={!sourcePhrases || sourcePhrases.length === 0}
                  className="text-xs font-semibold text-fabpink hover:underline disabled:opacity-40 disabled:hover:no-underline"
                >
                  All
                </button>
                <button
                  type="button"
                  onClick={() => setIncludedIds(new Set())}
                  disabled={!sourcePhrases || sourcePhrases.length === 0}
                  className="text-xs font-semibold text-fabpink hover:underline disabled:opacity-40 disabled:hover:no-underline"
                >
                  None
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-0.5 max-h-56 overflow-y-auto mb-4 rounded-xl border border-hairline p-1.5">
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
                      <span className="min-w-0 flex-1 truncate">
                        <span className="text-ink">{p.english}</span>
                        {p.text ? <span className="text-muted"> - {p.text}</span> : <span className="italic text-neutral-600"> - untranslated</span>}
                      </span>
                    </button>
                  )
                })}
            </div>

            <p className="text-xs text-muted mb-4">{includedIds.size} of {sourcePhrases?.length ?? 0} phrases selected.</p>
              </>
            )}

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
