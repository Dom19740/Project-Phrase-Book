import { useState } from 'react'
import type { Category, Language } from '../db/types'
import { getLanguageFlag } from '../lib/languageFlags'
import { PopoutSelect } from './PopoutSelect'

const NEW_CATEGORY = '__new__'

interface Props {
  categories: Category[]
  languages: Language[]
  onClose: () => void
  onSubmit: (english: string, categoryName: string | null, languageIds: number[]) => Promise<void>
}

export function AddPhraseModal({ categories, languages, onClose, onSubmit }: Props) {
  const [english, setEnglish] = useState('')
  const [categoryChoice, setCategoryChoice] = useState('')
  const [newCategory, setNewCategory] = useState('')
  const [saving, setSaving] = useState(false)
  const [selectedLanguageIds, setSelectedLanguageIds] = useState<Set<number>>(() => new Set(languages.map((l) => l.id)))

  const canSubmit =
    english.trim().length > 0 && (categoryChoice !== NEW_CATEGORY || newCategory.trim().length > 0) && selectedLanguageIds.size > 0

  function toggleLanguage(id: number) {
    setSelectedLanguageIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  async function handleSubmit() {
    if (!canSubmit) return
    setSaving(true)
    const categoryName = categoryChoice === NEW_CATEGORY ? newCategory.trim() : categoryChoice || null
    await onSubmit(english.trim(), categoryName, [...selectedLanguageIds])
    setSaving(false)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 pt-16 pb-[var(--safe-area-inset-bottom,0px)] sm:pt-24" onClick={onClose}>
      <div className="w-full sm:max-w-md rounded-2xl border border-hairline bg-surface p-5 shadow-2xl mx-4 sm:mx-0" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-semibold mb-4 text-ink">Add phrase</h2>

        <label className="block text-sm font-medium mb-1 text-ink">English</label>
        <input
          autoFocus
          value={english}
          onChange={(e) => setEnglish(e.target.value)}
          className="w-full mb-3 rounded-xl border border-hairline bg-transparent text-ink px-3 py-2"
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
            className="w-full mb-3 rounded-xl border border-hairline bg-transparent text-ink px-3 py-2"
            placeholder="New category name"
          />
        )}

        <div className="flex items-center justify-between mb-1">
          <span className="text-sm font-medium text-ink">Translate into</span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setSelectedLanguageIds(new Set(languages.map((l) => l.id)))}
              disabled={languages.length === 0}
              className="text-xs text-fabpink disabled:opacity-40"
            >
              All
            </button>
            <button
              type="button"
              onClick={() => setSelectedLanguageIds(new Set())}
              disabled={languages.length === 0}
              className="text-xs text-fabpink disabled:opacity-40"
            >
              None
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-0.5 max-h-56 overflow-y-auto mb-1 rounded-xl border border-hairline p-1.5">
          {languages.length === 0 && <p className="text-sm text-muted text-center py-4">No languages yet.</p>}
          {languages.map((lang) => (
            <label
              key={lang.id}
              className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-ink hover:bg-surfacehover cursor-pointer"
            >
              <input
                type="checkbox"
                checked={selectedLanguageIds.has(lang.id)}
                onChange={() => toggleLanguage(lang.id)}
                className="size-4 shrink-0 rounded accent-fabpink cursor-pointer"
              />
              <span aria-hidden="true">{getLanguageFlag(lang.code)}</span>
              {lang.name}
            </label>
          ))}
        </div>

        <p className="text-xs text-muted mb-4">
          {selectedLanguageIds.size} of {languages.length} languages selected. Only the ones you pick get this phrase at all — a deselected
          language won't show it.
        </p>

        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="rounded-full px-4 py-2 text-sm font-medium text-muted">
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!canSubmit || saving}
            className="rounded-full bg-fabpink px-5 py-2 text-sm font-medium text-white shadow-sm disabled:opacity-40"
          >
            {saving ? 'Saving...' : 'Add phrase'}
          </button>
        </div>
      </div>
    </div>
  )
}
