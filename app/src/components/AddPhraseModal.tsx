import { useState } from 'react'
import { ChevronDown, Mic, RefreshCw, X } from 'lucide-react'
import type { Category, Language } from '../db/types'
import { getLanguageFlag, getSpeechLocale } from '../lib/languageFlags'
import { pillClass } from '../lib/pillStyles'
import { translateAlternatives, translatePhrase } from '../lib/translateApi'
import { useSpeechToText } from '../lib/useSpeechToText'
import { PopoutSelect } from './PopoutSelect'

const NEW_CATEGORY = '__new__'

/** Soft grey at rest, thicker accent border when focused — same treatment as every other field in the app. */
const fieldClass = 'border-2 border-hairline bg-transparent text-ink outline-none focus:border-fabpink transition-all'

interface Props {
  categories: Category[]
  languages: Language[]
  activeLanguageId: number | null
  onClose: () => void
  onSubmit: (
    english: string,
    categoryName: string | null,
    languageIds: number[],
    manualTranslations?: { languageId: number; text: string }[],
  ) => Promise<void>
}

export function AddPhraseModal({ categories, languages, activeLanguageId, onClose, onSubmit }: Props) {
  const [english, setEnglish] = useState('')
  const [categoryChoice, setCategoryChoice] = useState('')
  const [newCategory, setNewCategory] = useState('')
  const [saving, setSaving] = useState(false)
  const [selectedLanguageIds, setSelectedLanguageIds] = useState<Set<number>>(
    () => new Set(activeLanguageId != null ? [activeLanguageId] : languages.map((l) => l.id)),
  )
  const [languagesOpen, setLanguagesOpen] = useState(false)
  const [translationText, setTranslationText] = useState<Record<number, string>>({})
  const [alternatives, setAlternatives] = useState<Record<number, string[]>>({})
  const [loadingAlternatives, setLoadingAlternatives] = useState<Record<number, boolean>>({})
  const [alternativesError, setAlternativesError] = useState<Record<number, string>>({})

  const speech = useSpeechToText()

  const canSubmit =
    english.trim().length > 0 && (categoryChoice !== NEW_CATEGORY || newCategory.trim().length > 0) && selectedLanguageIds.size > 0

  const anyLoadingAlternatives = Object.values(loadingAlternatives).some(Boolean)

  // Once every selected language has text you typed, spoke, or accepted from a translation,
  // there's nothing left to auto-translate — the button reflects that it's the final step.
  const allTranslated =
    selectedLanguageIds.size > 0 && [...selectedLanguageIds].every((id) => (translationText[id] ?? '').trim().length > 0)

  const allSelected = selectedLanguageIds.size === languages.length
  const languagesLabel = allSelected
    ? 'All languages'
    : selectedLanguageIds.size === 0
      ? 'Select at least one language'
      : languages
          .filter((l) => selectedLanguageIds.has(l.id))
          .map((l) => l.name)
          .join(', ')

  const categoryOptions = [
    { value: '', label: 'Uncategorized' },
    ...categories.map((c) => ({ value: c.name, label: c.name })),
    ...(categoryChoice && categoryChoice !== NEW_CATEGORY && !categories.some((c) => c.name === categoryChoice)
      ? [{ value: categoryChoice, label: categoryChoice }]
      : []),
    { value: NEW_CATEGORY, label: '+ New category...', neutral: true },
  ]

  function toggleLanguage(id: number) {
    setSelectedLanguageIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  async function handleTranslate(lang: Language) {
    if (!english.trim()) return
    setLoadingAlternatives((prev) => ({ ...prev, [lang.id]: true }))
    setAlternativesError((prev) => ({ ...prev, [lang.id]: '' }))
    try {
      const results = await translateAlternatives(english.trim(), lang.code, lang.name)
      setAlternatives((prev) => ({ ...prev, [lang.id]: results }))
      if (results.length > 0) setTranslationText((prev) => ({ ...prev, [lang.id]: results[0] }))
    } catch (err) {
      setAlternativesError((prev) => ({ ...prev, [lang.id]: err instanceof Error ? err.message : 'Translation failed' }))
    } finally {
      setLoadingAlternatives((prev) => ({ ...prev, [lang.id]: false }))
    }
  }

  /** Best-effort category suggestion, piggybacking on the same moment the phrase gets auto-translated. Never overrides a category you already picked. */
  async function handleSuggestCategory(targetLangs: Language[]) {
    if (categoryChoice || targetLangs.length === 0) return
    try {
      const result = await translatePhrase(
        english.trim(),
        targetLangs.map((l) => l.code),
        null,
        categories.map((c) => c.name),
        Object.fromEntries(targetLangs.map((l) => [l.code, l.name])),
      )
      if (result.suggestedCategory) {
        setCategoryChoice((current) => current || result.suggestedCategory!)
      }
    } catch {
      // Best-effort — leave the category picker on "Uncategorized" if this fails.
    }
  }

  /** The primary button's default action: translate every selected language that's still blank, all at once, and suggest a category. */
  async function handleAutoTranslate() {
    const targets = languages.filter((lang) => selectedLanguageIds.has(lang.id) && !(translationText[lang.id] ?? '').trim())
    if (targets.length === 0) return
    await Promise.all([...targets.map((lang) => handleTranslate(lang)), handleSuggestCategory(targets)])
  }

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
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 backdrop-blur-sm pt-16 pb-[var(--safe-area-inset-bottom,0px)] sm:pt-24">
      <div className="w-full min-w-0 sm:max-w-md rounded-2xl border border-hairline bg-surface p-5 shadow-2xl mx-4 sm:mx-0">
        <h2 className="text-lg font-bold tracking-tight mb-4 text-ink">Add phrase</h2>

        <label className="block text-[11px] font-extrabold uppercase tracking-wider text-fabpink mb-1">English</label>
        <div className="relative mb-4">
          <input
            autoFocus
            value={english}
            onChange={(e) => setEnglish(e.target.value)}
            className={`w-full rounded-xl px-3 py-2 ${fieldClass} ${speech.supported ? 'pr-10' : ''}`}
            placeholder={speech.activeId === 'english' ? 'Listening…' : 'e.g. Where is the bathroom?'}
          />
          {speech.supported && (
            <button
              type="button"
              onClick={() => (speech.activeId === 'english' ? speech.stop() : speech.start('english', 'en-US', setEnglish))}
              aria-label={speech.activeId === 'english' ? 'Stop recording' : 'Record English phrase'}
              title={speech.activeId === 'english' ? 'Stop recording' : 'Record'}
              className={`absolute right-1.5 top-1/2 -translate-y-1/2 rounded-full p-1.5 transition-all active:scale-90 ${
                speech.activeId === 'english' ? 'text-red-500 animate-pulse' : 'text-muted hover:bg-surfacehover'
              }`}
            >
              <Mic size={16} strokeWidth={2} />
            </button>
          )}
        </div>

        <label className="block text-[11px] font-extrabold uppercase tracking-wider text-fabpink mb-1">Translate into</label>
        <div className="relative mb-4">
          <button
            type="button"
            onClick={() => setLanguagesOpen((v) => !v)}
            title={languagesLabel}
            className={`flex w-full items-center gap-1.5 rounded-full border-2 bg-surface px-3 py-2 text-sm text-ink transition-all ${
              languagesOpen ? 'border-fabpink' : 'border-hairline hover:border-fabpink/40'
            }`}
          >
            <span className="flex-1 min-w-0 text-left truncate">{languagesLabel}</span>
            <ChevronDown size={14} strokeWidth={2} className="shrink-0 text-muted" />
          </button>

          {languagesOpen && (
            <>
              <button className="fixed inset-0 z-40 cursor-default" onClick={() => setLanguagesOpen(false)} aria-label="Close language selector" />
              <div className="absolute left-0 top-full z-50 mt-2 w-full rounded-2xl border border-hairline bg-surface p-3 pr-9 shadow-xl">
                <button
                  type="button"
                  onClick={() => setLanguagesOpen(false)}
                  aria-label="Close language selector"
                  className="absolute right-2 top-2 rounded-full p-1 text-muted hover:bg-surfacehover active:scale-90 transition-all"
                >
                  <X size={14} strokeWidth={2.5} />
                </button>
                <div className="flex flex-wrap gap-1.5 max-h-48 overflow-y-auto">
                  <button
                    type="button"
                    onClick={() => setSelectedLanguageIds(allSelected ? new Set() : new Set(languages.map((l) => l.id)))}
                    className={pillClass(allSelected)}
                  >
                    All languages
                  </button>
                  {languages.map((lang) => (
                    <button
                      key={lang.id}
                      type="button"
                      onClick={() => toggleLanguage(lang.id)}
                      className={`flex items-center gap-1.5 ${pillClass(selectedLanguageIds.has(lang.id))}`}
                    >
                      <span aria-hidden="true">{getLanguageFlag(lang.code)}</span>
                      {lang.name}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        <div className="flex flex-col gap-4 mb-4">
          {languages
            .filter((lang) => selectedLanguageIds.has(lang.id))
            .map((lang) => {
              const micId = `lang-${lang.id}`
              const hasTranslatedOnce = alternatives[lang.id] !== undefined
              return (
                <div key={lang.id}>
                  <div className="flex items-center justify-between mb-1">
                    <label className="flex items-center gap-1.5 text-sm font-medium text-ink">
                      <span aria-hidden="true">{getLanguageFlag(lang.code)}</span>
                      {lang.name}
                    </label>
                    {hasTranslatedOnce && (
                      <button
                        type="button"
                        onClick={() => handleTranslate(lang)}
                        disabled={!english.trim() || loadingAlternatives[lang.id]}
                        className="flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium text-fabpink disabled:opacity-40"
                        title="Retranslate"
                      >
                        <RefreshCw size={12} strokeWidth={2.5} className={loadingAlternatives[lang.id] ? 'animate-spin' : ''} />
                        {loadingAlternatives[lang.id] ? 'Retranslating…' : 'Retranslate'}
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <input
                      value={translationText[lang.id] ?? ''}
                      onChange={(e) => setTranslationText((prev) => ({ ...prev, [lang.id]: e.target.value }))}
                      className={`w-full rounded-xl px-3 py-2 text-sm ${fieldClass} ${speech.supported ? 'pr-9' : ''}`}
                      placeholder={speech.activeId === micId ? 'Listening…' : 'Type or record translation'}
                    />
                    {speech.supported && (
                      <button
                        type="button"
                        onClick={() =>
                          speech.activeId === micId
                            ? speech.stop()
                            : speech.start(micId, getSpeechLocale(lang.code), (text) => setTranslationText((prev) => ({ ...prev, [lang.id]: text })))
                        }
                        aria-label={speech.activeId === micId ? 'Stop recording' : `Record ${lang.name} translation`}
                        title={speech.activeId === micId ? 'Stop recording' : 'Record'}
                        className={`absolute right-1 top-1/2 -translate-y-1/2 rounded-full p-1.5 transition-all active:scale-90 ${
                          speech.activeId === micId ? 'text-red-500 animate-pulse' : 'text-muted hover:bg-surfacehover'
                        }`}
                      >
                        <Mic size={14} strokeWidth={2} />
                      </button>
                    )}
                  </div>
                  {alternativesError[lang.id] && <p className="text-xs text-red-400 mt-1">{alternativesError[lang.id]}</p>}
                  {alternatives[lang.id] && alternatives[lang.id].length > 1 && (
                    <div className="flex flex-wrap gap-1.5 mt-1.5">
                      {alternatives[lang.id].map((alt, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => setTranslationText((prev) => ({ ...prev, [lang.id]: alt }))}
                          className={`${pillClass(alt === translationText[lang.id])} text-left`}
                        >
                          {alt}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
        </div>

        <label className="block text-[11px] font-extrabold uppercase tracking-wider text-fabpink mb-1">Category</label>
        <PopoutSelect className="mb-3 w-full" align="left" value={categoryChoice} onChange={setCategoryChoice} options={categoryOptions} />

        {categoryChoice === NEW_CATEGORY && (
          <input
            autoFocus
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value)}
            className={`w-full mb-3 rounded-xl px-3 py-2 ${fieldClass}`}
            placeholder="New category name"
          />
        )}

        <div className="flex justify-end gap-2 mt-3">
          <button onClick={onClose} className="rounded-full border border-hairline px-4 py-2 text-sm font-medium text-ink hover:bg-surfacehover active:scale-95 transition-all">
            Cancel
          </button>
          <button
            onClick={allTranslated ? handleSubmit : handleAutoTranslate}
            disabled={!canSubmit || saving || anyLoadingAlternatives}
            className="rounded-full bg-fabpink px-5 py-2 text-sm font-medium text-onaccent shadow-lg shadow-fabpink/20 active:scale-95 transition-all disabled:opacity-40"
          >
            {saving ? 'Saving...' : anyLoadingAlternatives ? 'Translating…' : allTranslated ? 'Add phrase' : 'Auto translate'}
          </button>
        </div>
      </div>
    </div>
  )
}
