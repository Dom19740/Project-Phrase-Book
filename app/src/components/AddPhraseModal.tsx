import { useEffect, useState } from 'react'
import { ChevronDown, RefreshCw } from 'lucide-react'
import type { Category, Language } from '../db/types'
import { getLanguageFlag } from '../lib/languageFlags'
import { translateAlternatives } from '../lib/translateApi'
import { PopoutSelect } from './PopoutSelect'

const NEW_CATEGORY = '__new__'

interface Props {
  categories: Category[]
  languages: Language[]
  onClose: () => void
  onSubmit: (
    english: string,
    categoryName: string | null,
    languageIds: number[],
    manualTranslations?: { languageId: number; text: string }[],
  ) => Promise<void>
}

type Step = 'details' | 'translations'

export function AddPhraseModal({ categories, languages, onClose, onSubmit }: Props) {
  const [step, setStep] = useState<Step>('details')
  const [english, setEnglish] = useState('')
  const [categoryChoice, setCategoryChoice] = useState('')
  const [newCategory, setNewCategory] = useState('')
  const [saving, setSaving] = useState(false)
  const [selectedLanguageIds, setSelectedLanguageIds] = useState<Set<number>>(() => new Set(languages.map((l) => l.id)))
  const [languagesOpen, setLanguagesOpen] = useState(false)
  const [translationText, setTranslationText] = useState<Record<number, string>>({})
  const [alternatives, setAlternatives] = useState<Record<number, string[]>>({})
  const [loadingAlternatives, setLoadingAlternatives] = useState<Record<number, boolean>>({})
  const [alternativesError, setAlternativesError] = useState<Record<number, string>>({})

  const canProceed =
    english.trim().length > 0 && (categoryChoice !== NEW_CATEGORY || newCategory.trim().length > 0) && selectedLanguageIds.size > 0

  const allSelected = selectedLanguageIds.size === languages.length
  const languagesLabel = allSelected
    ? 'All languages'
    : selectedLanguageIds.size === 0
      ? 'Select at least one language'
      : `${selectedLanguageIds.size} of ${languages.length} languages`

  function toggleLanguage(id: number) {
    setSelectedLanguageIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  async function handleGetAlternatives(lang: Language) {
    if (!english.trim()) return
    setLoadingAlternatives((prev) => ({ ...prev, [lang.id]: true }))
    setAlternativesError((prev) => ({ ...prev, [lang.id]: '' }))
    try {
      const results = await translateAlternatives(english.trim(), lang.code, lang.name)
      setAlternatives((prev) => ({ ...prev, [lang.id]: results }))
    } catch (err) {
      setAlternativesError((prev) => ({ ...prev, [lang.id]: err instanceof Error ? err.message : 'Translation failed' }))
    } finally {
      setLoadingAlternatives((prev) => ({ ...prev, [lang.id]: false }))
    }
  }

  // Arriving on the translations step: kick off suggestions for every selected language at once
  // rather than making the user click "Suggest" one by one.
  useEffect(() => {
    if (step !== 'translations') return
    for (const lang of languages) {
      if (selectedLanguageIds.has(lang.id) && !(lang.id in alternatives) && !loadingAlternatives[lang.id]) {
        handleGetAlternatives(lang)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step])

  async function handleSubmit() {
    setSaving(true)
    const categoryName = categoryChoice === NEW_CATEGORY ? newCategory.trim() : categoryChoice || null
    const manualTranslations = [...selectedLanguageIds]
      .map((languageId) => ({ languageId, text: (translationText[languageId] ?? '').trim() }))
      .filter((t) => t.text.length > 0)
    await onSubmit(english.trim(), categoryName, [...selectedLanguageIds], manualTranslations)
    setSaving(false)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 backdrop-blur-sm pt-16 pb-[var(--safe-area-inset-bottom,0px)] sm:pt-24" onClick={onClose}>
      <div className="w-full sm:max-w-md rounded-2xl border border-hairline bg-surface p-5 shadow-2xl mx-4 sm:mx-0" onClick={(e) => e.stopPropagation()}>
        {step === 'details' ? (
          <>
            <h2 className="text-lg font-bold tracking-tight mb-4 text-ink">Add phrase</h2>

            <label className="block text-sm font-medium mb-1 text-ink">English</label>
            <input
              autoFocus
              value={english}
              onChange={(e) => setEnglish(e.target.value)}
              className="w-full mb-3 rounded-xl border border-hairline bg-transparent text-ink px-3 py-2 outline-none focus:ring-2 focus:ring-fabpink/40 focus:border-fabpink transition-shadow"
              placeholder="e.g. Where is the bathroom?"
            />

            <label className="block text-sm font-medium mb-1 text-ink">Category</label>
            <PopoutSelect
              className="mb-3 w-full"
              align="left"
              value={categoryChoice}
              onChange={setCategoryChoice}
              options={[
                { value: '', label: 'Uncategorized' },
                ...categories.map((c) => ({ value: c.name, label: c.name })),
                { value: NEW_CATEGORY, label: '+ New category...' },
              ]}
            />

            {categoryChoice === NEW_CATEGORY && (
              <input
                autoFocus
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                className="w-full mb-3 rounded-xl border border-hairline bg-transparent text-ink px-3 py-2 outline-none focus:ring-2 focus:ring-fabpink/40 focus:border-fabpink transition-shadow"
                placeholder="New category name"
              />
            )}

            <label className="block text-sm font-medium mb-1 text-ink">Translate into</label>
            <div className="relative mb-1">
              <button
                type="button"
                onClick={() => setLanguagesOpen((v) => !v)}
                className="flex w-full items-center gap-1.5 rounded-xl border border-hairline bg-surface px-3 py-2 text-sm text-ink hover:border-fabpink/40 transition-colors"
              >
                <span className="flex-1 text-left truncate">{languagesLabel}</span>
                <ChevronDown size={14} strokeWidth={2} className="shrink-0 text-muted" />
              </button>

              {languagesOpen && (
                <>
                  <button className="fixed inset-0 z-40 cursor-default" onClick={() => setLanguagesOpen(false)} aria-label="Close language selector" />
                  <div className="absolute left-0 top-full z-50 mt-2 w-full rounded-2xl border border-hairline bg-surface/95 backdrop-blur-md p-3 shadow-xl">
                    <label className="flex items-center gap-2 text-sm text-ink rounded-lg px-1.5 py-1 mb-1 border-b border-hairline pb-2">
                      <input
                        type="checkbox"
                        checked={allSelected}
                        onChange={(e) => setSelectedLanguageIds(e.target.checked ? new Set(languages.map((l) => l.id)) : new Set())}
                        className="size-4 rounded accent-fabpink cursor-pointer"
                      />
                      All languages
                    </label>
                    <div className="flex flex-col gap-1.5 max-h-48 overflow-y-auto">
                      {languages.map((lang) => (
                        <label key={lang.id} className="flex items-center gap-2 text-sm text-ink rounded-lg px-1.5 py-1 hover:bg-surfacehover transition-colors cursor-pointer">
                          <input
                            type="checkbox"
                            checked={selectedLanguageIds.has(lang.id)}
                            onChange={() => toggleLanguage(lang.id)}
                            className="size-4 rounded accent-fabpink cursor-pointer"
                          />
                          <span aria-hidden="true">{getLanguageFlag(lang.code)}</span>
                          {lang.name}
                        </label>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
            <p className="text-xs text-muted mb-4">
              Only the languages you pick get this phrase at all — a deselected language won't show it.
            </p>

            <div className="flex justify-end gap-2">
              <button onClick={onClose} className="rounded-full px-4 py-2 text-sm font-medium text-muted hover:text-ink active:scale-95 transition-all">
                Cancel
              </button>
              <button
                onClick={() => setStep('translations')}
                disabled={!canProceed}
                className="rounded-full bg-fabpink px-5 py-2 text-sm font-medium text-white shadow-lg shadow-fabpink/20 active:scale-95 transition-all disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </>
        ) : (
          <>
            <h2 className="text-lg font-bold tracking-tight mb-1 text-ink">Add phrase</h2>
            <p className="text-sm text-muted mb-4 truncate">{english}</p>

            <p className="text-xs text-muted mb-2">Pick a suggestion or edit the text yourself. Leave a language blank to auto-translate it later.</p>

            <div className="flex flex-col gap-3 max-h-80 overflow-y-auto mb-4 rounded-xl border border-hairline p-2.5">
              {languages
                .filter((lang) => selectedLanguageIds.has(lang.id))
                .map((lang) => (
                  <div key={lang.id}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="flex items-center gap-1.5 text-sm text-ink">
                        <span aria-hidden="true">{getLanguageFlag(lang.code)}</span>
                        {lang.name}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleGetAlternatives(lang)}
                        disabled={!english.trim() || loadingAlternatives[lang.id]}
                        className="flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium text-fabpink disabled:opacity-40"
                        title="Get suggested translations"
                      >
                        <RefreshCw size={12} strokeWidth={2.5} className={loadingAlternatives[lang.id] ? 'animate-spin' : ''} />
                        {loadingAlternatives[lang.id] ? 'Translating...' : 'Suggest'}
                      </button>
                    </div>
                    <input
                      value={translationText[lang.id] ?? ''}
                      onChange={(e) => setTranslationText((prev) => ({ ...prev, [lang.id]: e.target.value }))}
                      className="w-full rounded-xl border border-hairline bg-transparent text-ink px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-fabpink/40 focus:border-fabpink transition-shadow"
                      placeholder="Leave blank to auto-translate"
                    />
                    {alternativesError[lang.id] && <p className="text-xs text-red-400 mt-1">{alternativesError[lang.id]}</p>}
                    {alternatives[lang.id] && alternatives[lang.id].length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-1.5">
                        {alternatives[lang.id].map((alt, i) => (
                          <button
                            key={i}
                            type="button"
                            onClick={() => setTranslationText((prev) => ({ ...prev, [lang.id]: alt }))}
                            className={`rounded-full border px-3 py-1.5 text-sm text-left transition-colors ${
                              alt === translationText[lang.id] ? 'border-fabpink text-fabpink' : 'border-hairline text-ink hover:border-fabpink'
                            }`}
                          >
                            {alt}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
            </div>

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setStep('details')}
                disabled={saving}
                className="rounded-full border border-hairline px-4 py-2 text-sm font-medium text-ink hover:bg-surfacehover active:scale-95 transition-all disabled:opacity-40"
              >
                Back
              </button>
              <button
                onClick={handleSubmit}
                disabled={saving}
                className="rounded-full bg-fabpink px-5 py-2 text-sm font-medium text-white shadow-lg shadow-fabpink/20 active:scale-95 transition-all disabled:opacity-40"
              >
                {saving ? 'Saving...' : 'Add phrase'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
