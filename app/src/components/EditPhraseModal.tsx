import { useState } from 'react'
import type { Category, PhraseListItem } from '../db/types'
import { PopoutSelect } from './PopoutSelect'

const NEW_CATEGORY = '__new__'

interface Props {
  phrase: PhraseListItem
  languageName: string
  categories: Category[]
  onClose: () => void
  onSubmit: (english: string, text: string, categoryName: string | null) => Promise<void>
  onDeleteOneLanguage: (translationId: number) => Promise<void>
  onDeleteAllLanguages: (phraseConceptId: number) => Promise<void>
}

export function EditPhraseModal({
  phrase,
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

  const canSubmit = english.trim().length > 0 && (categoryChoice !== NEW_CATEGORY || newCategory.trim().length > 0)

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
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 pt-16 sm:pt-24" onClick={onClose}>
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
              <button onClick={() => setConfirmingDelete(false)} disabled={deleting} className="rounded-full px-4 py-2 text-sm font-medium text-muted">
                Cancel
              </button>
            </div>
          </>
        ) : (
          <>
            <h2 className="text-lg font-semibold mb-4 text-ink">Edit phrase</h2>

            <label className="block text-sm font-medium mb-1 text-ink">English</label>
            <input
              autoFocus
              value={english}
              onChange={(e) => setEnglish(e.target.value)}
              className="w-full mb-3 rounded-xl border border-hairline bg-transparent text-ink px-3 py-2"
            />

            <label className="block text-sm font-medium mb-1 text-ink">Translation</label>
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              className="w-full mb-3 rounded-xl border border-hairline bg-transparent text-ink px-3 py-2"
              placeholder="Leave blank if not translated yet"
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
                className="w-full mb-4 rounded-xl border border-hairline bg-transparent text-ink px-3 py-2"
                placeholder="New category name"
              />
            )}

            <div className="flex items-center justify-between gap-2 mt-1">
              <button onClick={() => setConfirmingDelete(true)} className="rounded-full px-3 py-2 text-sm font-medium text-red-400">
                Delete...
              </button>
              <div className="flex gap-2">
                <button onClick={onClose} className="rounded-full px-4 py-2 text-sm font-medium text-muted">
                  Cancel
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={!canSubmit || saving}
                  className="rounded-full bg-[var(--accent)] px-5 py-2 text-sm font-medium text-white shadow-sm disabled:opacity-40"
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
