import { useState } from 'react'
import { Check, Copy, Loader2, Mic, RefreshCw, Save, Trash2 } from 'lucide-react'
import type { Category, Language, PhraseListItem } from '../db/types'
import { getLanguageFlag, getSpeechLocale } from '../lib/languageFlags'
import { pillClass } from '../lib/pillStyles'
import { translateAlternatives } from '../lib/translateApi'
import { useSpeechToText } from '../lib/useSpeechToText'
import { PopoutSelect } from './PopoutSelect'

const NEW_CATEGORY = '__new__'

/** Same accent-border, doubles-in-thickness treatment as every other field/menu — see pillStyles.ts. */
const fieldClass = 'border-2 border-hairline bg-transparent text-ink outline-none focus:border-fabpink transition-all'

interface Props {
  phrase: PhraseListItem
  languageCode: string
  languageName: string
  categories: Category[]
  languages: Language[]
  onClose: () => void
  onSubmit: (english: string, text: string, categoryName: string | null) => Promise<void>
  onDeleteOneLanguage: (translationId: number) => Promise<void>
  onDeleteAllLanguages: (phraseConceptId: number) => Promise<void>
  onCopyToLanguages: (targetLanguageIds: number[]) => Promise<void>
}

export function EditPhraseModal({
  phrase,
  languageCode,
  languageName,
  categories,
  languages,
  onClose,
  onSubmit,
  onDeleteOneLanguage,
  onDeleteAllLanguages,
  onCopyToLanguages,
}: Props) {
  const [english, setEnglish] = useState(phrase.english)
  const [text, setText] = useState(phrase.text)
  const [categoryChoice, setCategoryChoice] = useState(phrase.categoryName ?? '')
  const [newCategory, setNewCategory] = useState('')
  const [saving, setSaving] = useState(false)
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [alternatives, setAlternatives] = useState<string[] | null>(null)
  const [loadingAlternatives, setLoadingAlternatives] = useState(false)
  const [alternativesError, setAlternativesError] = useState<string | null>(null)
  const [copiedField, setCopiedField] = useState<'english' | 'text' | null>(null)
  const [copyPanelOpen, setCopyPanelOpen] = useState(false)
  const [copyTargetIds, setCopyTargetIds] = useState<Set<number>>(new Set())
  const [copying, setCopying] = useState(false)
  const speech = useSpeechToText()

  const otherLanguages = languages.filter((l) => l.id !== phrase.languageId)

  const canSubmit = english.trim().length > 0 && (categoryChoice !== NEW_CATEGORY || newCategory.trim().length > 0)

  function toggleCopyTarget(id: number) {
    setCopyTargetIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  async function applyCopy() {
    if (copyTargetIds.size === 0) return
    setCopying(true)
    await onCopyToLanguages([...copyTargetIds])
    setCopying(false)
    setCopyTargetIds(new Set())
    setCopyPanelOpen(false)
  }

  async function handleCopy(field: 'english' | 'text', value: string) {
    if (!value) return
    try {
      await navigator.clipboard.writeText(value)
      setCopiedField(field)
      setTimeout(() => setCopiedField((f) => (f === field ? null : f)), 1500)
    } catch (err) {
      console.error('Copy failed', err)
    }
  }

  async function handleRetranslate() {
    if (!english.trim()) return
    setLoadingAlternatives(true)
    setAlternativesError(null)
    try {
      const results = await translateAlternatives(english.trim(), languageCode, languageName)
      setAlternatives(results)
    } catch (err) {
      setAlternativesError(err instanceof Error ? err.message : 'Translation failed')
    } finally {
      setLoadingAlternatives(false)
    }
  }

  async function handleSubmit() {
    if (!canSubmit) return
    setSaving(true)
    const categoryName = categoryChoice === NEW_CATEGORY ? newCategory.trim() : categoryChoice || null
    await onSubmit(english.trim(), text.trim(), categoryName)
    setSaving(false)
    onClose()
  }

  async function handleDelete(scope: 'language' | 'all') {
    setDeleting(true)
    if (scope === 'language') await onDeleteOneLanguage(phrase.translationId)
    else await onDeleteAllLanguages(phrase.phraseConceptId)
    setDeleting(false)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center overflow-y-auto bg-black/50 backdrop-blur-sm pt-16 pb-[var(--safe-area-inset-bottom,0px)] sm:pt-24">
      <div className="w-full min-w-0 sm:max-w-md rounded-2xl border border-hairline bg-surface p-5 shadow-2xl mx-4 sm:mx-0">
        {confirmingDelete ? (
          <>
            <h2 className="text-lg font-bold tracking-tight mb-4 text-ink">Delete phrase</h2>
            <div className="flex flex-col gap-2">
              <button
                onClick={() => handleDelete('language')}
                disabled={deleting}
                className="rounded-full border border-fabpink px-4 py-2 text-sm font-medium text-fabpink hover:bg-surfacehover active:scale-95 transition-all disabled:opacity-40"
              >
                Delete from {languageName} only
              </button>
              <button
                onClick={() => handleDelete('all')}
                disabled={deleting}
                className="rounded-full bg-fabpink px-4 py-2 text-sm font-medium text-onaccent shadow-lg shadow-fabpink/20 active:scale-95 transition-all disabled:opacity-40"
              >
                Delete from all languages
              </button>
              <button
                onClick={() => setConfirmingDelete(false)}
                disabled={deleting}
                className="rounded-full border border-hairline px-4 py-2 text-sm font-medium text-ink hover:bg-surfacehover active:scale-95 transition-all disabled:opacity-40"
              >
                Cancel
              </button>
            </div>
          </>
        ) : (
          <>
            <h2 className="text-lg font-bold tracking-tight mb-4 text-ink">Edit phrase</h2>

            <label className="block text-[11px] font-extrabold uppercase tracking-wider text-fabpink mb-1">English</label>
            <div className="relative mb-3">
              <input
                autoFocus
                value={english}
                onChange={(e) => setEnglish(e.target.value)}
                className={`w-full rounded-xl pl-3 py-2 ${fieldClass} ${speech.supported ? 'pr-16' : 'pr-10'}`}
                placeholder={speech.activeId === 'english' ? 'Listening…' : undefined}
              />
              {speech.supported && (
                <button
                  type="button"
                  onClick={() => (speech.activeId === 'english' ? speech.stop() : speech.start('english', 'en-US', setEnglish))}
                  aria-label={speech.activeId === 'english' ? 'Stop recording' : 'Record English phrase'}
                  title={speech.activeId === 'english' ? 'Stop recording' : 'Record'}
                  className={`absolute right-9 top-1/2 -translate-y-1/2 rounded-full p-1.5 transition-all active:scale-90 ${
                    speech.activeId === 'english' ? 'text-red-500 animate-pulse' : 'text-muted hover:bg-surfacehover'
                  }`}
                >
                  <Mic size={16} strokeWidth={2} />
                </button>
              )}
              <button
                type="button"
                onClick={() => handleCopy('english', english)}
                disabled={!english}
                aria-label="Copy English phrase"
                title="Copy"
                className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-full p-1.5 text-muted hover:bg-surfacehover active:scale-90 disabled:opacity-25 transition-all"
              >
                {copiedField === 'english' ? <Check size={16} strokeWidth={2.5} className="text-fabpink" /> : <Copy size={16} strokeWidth={2} />}
              </button>
            </div>

            <div className="flex items-center justify-between mb-1">
              <label className="block text-[11px] font-extrabold uppercase tracking-wider text-fabpink">Translation</label>
              <button
                type="button"
                onClick={handleRetranslate}
                disabled={!english.trim() || loadingAlternatives}
                className="flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium text-fabpink disabled:opacity-40"
                title="Get alternative translations"
              >
                <RefreshCw size={12} strokeWidth={2.5} className={loadingAlternatives ? 'animate-spin' : ''} />
                {loadingAlternatives ? 'Translating...' : 'Retranslate'}
              </button>
            </div>
            <div className="relative mb-3">
              <input
                value={text}
                onChange={(e) => setText(e.target.value)}
                className={`w-full rounded-xl pl-3 py-2 ${fieldClass} ${speech.supported ? 'pr-16' : 'pr-10'}`}
                placeholder={speech.activeId === 'text' ? 'Listening…' : 'Leave blank if not translated yet'}
              />
              {speech.supported && (
                <button
                  type="button"
                  onClick={() => (speech.activeId === 'text' ? speech.stop() : speech.start('text', getSpeechLocale(languageCode), setText))}
                  aria-label={speech.activeId === 'text' ? 'Stop recording' : `Record ${languageName} translation`}
                  title={speech.activeId === 'text' ? 'Stop recording' : 'Record'}
                  className={`absolute right-9 top-1/2 -translate-y-1/2 rounded-full p-1.5 transition-all active:scale-90 ${
                    speech.activeId === 'text' ? 'text-red-500 animate-pulse' : 'text-muted hover:bg-surfacehover'
                  }`}
                >
                  <Mic size={16} strokeWidth={2} />
                </button>
              )}
              <button
                type="button"
                onClick={() => handleCopy('text', text)}
                disabled={!text}
                aria-label="Copy translation"
                title="Copy"
                className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-full p-1.5 text-muted hover:bg-surfacehover active:scale-90 disabled:opacity-25 transition-all"
              >
                {copiedField === 'text' ? <Check size={16} strokeWidth={2.5} className="text-fabpink" /> : <Copy size={16} strokeWidth={2} />}
              </button>
            </div>

            {alternativesError && <p className="text-xs text-red-400 -mt-2 mb-3">{alternativesError}</p>}

            {alternatives && alternatives.length > 0 && (
              <div className="flex flex-wrap gap-1.5 -mt-2 mb-3">
                {alternatives.map((alt, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setText(alt)}
                    className={`${pillClass(alt === text)} text-left`}
                  >
                    {alt}
                  </button>
                ))}
              </div>
            )}

            <label className="block text-[11px] font-extrabold uppercase tracking-wider text-fabpink mb-1">Category</label>
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
                className={`w-full mb-4 rounded-xl px-3 py-2 ${fieldClass}`}
                placeholder="New category name"
              />
            )}

            {copyPanelOpen && (
              <div className="mb-4 rounded-xl border border-hairline p-3">
                {otherLanguages.length === 0 ? (
                  <p className="text-sm text-muted">Add another language first to copy this phrase into.</p>
                ) : (
                  <>
                    <p className="text-sm text-muted mb-2">Copy this phrase into:</p>
                    <div className="flex flex-col gap-1 max-h-40 overflow-y-auto mb-2">
                      {otherLanguages.map((lang) => {
                        const checked = copyTargetIds.has(lang.id)
                        return (
                          <button
                            key={lang.id}
                            type="button"
                            role="checkbox"
                            aria-checked={checked}
                            onClick={() => toggleCopyTarget(lang.id)}
                            className="flex w-full items-center gap-2 rounded-lg px-1.5 py-1 text-left text-sm text-ink hover:bg-surfacehover transition-colors"
                          >
                            <span
                              aria-hidden="true"
                              className={`size-4 shrink-0 rounded-full border-2 transition-colors ${checked ? 'bg-fabpink border-fabpink' : 'border-fabpink/60'}`}
                            />
                            <span aria-hidden="true">{getLanguageFlag(lang.code)}</span>
                            {lang.name}
                          </button>
                        )
                      })}
                    </div>
                    <div className="flex justify-end">
                      <button
                        onClick={applyCopy}
                        disabled={copying || copyTargetIds.size === 0}
                        className="rounded-full bg-fabpink px-3.5 py-1.5 text-sm font-medium text-onaccent shadow-lg shadow-fabpink/20 active:scale-95 transition-all disabled:opacity-40"
                      >
                        {copying ? 'Copying...' : 'Copy'}
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}

            <div className="flex items-center justify-between gap-2 mt-1">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setConfirmingDelete(true)}
                  aria-label="Delete phrase"
                  title="Delete phrase"
                  className="rounded-full border border-hairline p-2 text-muted hover:bg-surfacehover active:scale-90 transition-all"
                >
                  <Trash2 size={16} strokeWidth={2} />
                </button>
                <button
                  onClick={() => setCopyPanelOpen((v) => !v)}
                  className={`flex items-center gap-1 rounded-full border px-3 py-2 text-sm font-medium transition-all active:scale-95 ${
                    copyPanelOpen ? 'border-fabpink bg-fabpink text-onaccent' : 'border-hairline text-muted hover:bg-surfacehover'
                  }`}
                >
                  <Copy size={16} strokeWidth={2} />
                  Copy to...
                </button>
              </div>
              <div className="flex gap-2">
                <button onClick={onClose} className="rounded-full border border-hairline px-4 py-2 text-sm font-medium text-ink hover:bg-surfacehover active:scale-95 transition-all">
                  Cancel
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={!canSubmit || saving}
                  aria-label={saving ? 'Saving' : 'Save'}
                  title={saving ? 'Saving' : 'Save'}
                  className="rounded-full bg-fabpink p-2.5 text-onaccent shadow-lg shadow-fabpink/20 active:scale-95 transition-all disabled:opacity-40"
                >
                  {saving ? <Loader2 size={16} strokeWidth={2} className="animate-spin" /> : <Save size={16} strokeWidth={2} />}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
