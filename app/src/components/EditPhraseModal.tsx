import { useState } from 'react'
import { Check, Copy, RefreshCw, Trash2 } from 'lucide-react'
import type { Category, PhraseListItem } from '../db/types'
import { translateAlternatives } from '../lib/translateApi'
import { PopoutSelect } from './PopoutSelect'

const NEW_CATEGORY = '__new__'

interface Props {
  phrase: PhraseListItem
  languageCode: string
  languageName: string
  categories: Category[]
  onClose: () => void
  onSubmit: (english: string, text: string, categoryName: string | null) => Promise<void>
  onDeleteOneLanguage: (translationId: number) => Promise<void>
  onDeleteAllLanguages: (phraseConceptId: number) => Promise<void>
}

export function EditPhraseModal({
  phrase,
  languageCode,
  languageName,
  categories,
  onClose,
  onSubmit,
  onDeleteOneLanguage,
  onDeleteAllLanguages,
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

  const canSubmit = english.trim().length > 0 && (categoryChoice !== NEW_CATEGORY || newCategory.trim().length > 0)

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
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 pt-16 pb-[var(--safe-area-inset-bottom,0px)] sm:pt-24" onClick={onClose}>
      <div className="w-full sm:max-w-md rounded-2xl border border-hairline bg-surface p-5 shadow-2xl mx-4 sm:mx-0" onClick={(e) => e.stopPropagation()}>
        {confirmingDelete ? (
          <>
            <h2 className="text-lg font-semibold mb-2 text-ink">Delete phrase</h2>
            <p className="text-sm text-muted mb-4">
              "{phrase.english}" — delete just the {languageName} translation, or remove this phrase from every language?
            </p>
            <div className="flex flex-col gap-2">
              <button
                onClick={() => handleDelete('language')}
                disabled={deleting}
                className="rounded-full border border-red-800 px-4 py-2 text-sm font-medium text-red-400 disabled:opacity-40"
              >
                Delete from {languageName} only
              </button>
              <button
                onClick={() => handleDelete('all')}
                disabled={deleting}
                className="rounded-full bg-red-600 px-4 py-2 text-sm font-medium text-white shadow-sm disabled:opacity-40"
              >
                Delete from all languages
              </button>
              <button
                onClick={() => setConfirmingDelete(false)}
                disabled={deleting}
                className="rounded-full border border-hairline px-4 py-2 text-sm font-medium text-ink disabled:opacity-40"
              >
                Cancel
              </button>
            </div>
          </>
        ) : (
          <>
            <h2 className="text-lg font-semibold mb-4 text-ink">Edit phrase</h2>

            <label className="block text-sm font-medium mb-1 text-ink">English</label>
            <div className="relative mb-3">
              <input
                autoFocus
                value={english}
                onChange={(e) => setEnglish(e.target.value)}
                className="w-full rounded-xl border border-hairline bg-transparent text-ink pl-3 pr-10 py-2"
              />
              <button
                type="button"
                onClick={() => handleCopy('english', english)}
                disabled={!english}
                aria-label="Copy English phrase"
                title="Copy"
                className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-full p-1.5 text-muted hover:bg-surfacehover disabled:opacity-25 transition-colors"
              >
                {copiedField === 'english' ? <Check size={16} strokeWidth={2.5} className="text-fabpink" /> : <Copy size={16} strokeWidth={2} />}
              </button>
            </div>

            <div className="flex items-center justify-between mb-1">
              <label className="block text-sm font-medium text-ink">Translation</label>
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
                className="w-full rounded-xl border border-hairline bg-transparent text-ink pl-3 pr-10 py-2"
                placeholder="Leave blank if not translated yet"
              />
              <button
                type="button"
                onClick={() => handleCopy('text', text)}
                disabled={!text}
                aria-label="Copy translation"
                title="Copy"
                className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-full p-1.5 text-muted hover:bg-surfacehover disabled:opacity-25 transition-colors"
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
                    className={`rounded-full border px-3 py-1.5 text-sm text-left transition-colors ${
                      alt === text ? 'border-fabpink text-fabpink' : 'border-hairline text-ink hover:border-fabpink'
                    }`}
                  >
                    {alt}
                  </button>
                ))}
              </div>
            )}

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
                className="w-full mb-4 rounded-xl border border-hairline bg-transparent text-ink px-3 py-2"
                placeholder="New category name"
              />
            )}

            <div className="flex items-center justify-between gap-2 mt-1">
              <button
                onClick={() => setConfirmingDelete(true)}
                aria-label="Delete phrase"
                title="Delete phrase"
                className="rounded-full border border-red-800 p-2 text-red-400"
              >
                <Trash2 size={16} strokeWidth={2} />
              </button>
              <div className="flex gap-2">
                <button onClick={onClose} className="rounded-full border border-hairline px-4 py-2 text-sm font-medium text-ink">
                  Cancel
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={!canSubmit || saving}
                  className="rounded-full bg-fabpink px-5 py-2 text-sm font-medium text-white shadow-sm disabled:opacity-40"
                >
                  {saving ? 'Saving...' : 'Save'}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
