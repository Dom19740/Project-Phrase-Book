import { useState } from 'react'
import type { Category } from '../db/types'
import { Select } from './Select'

const NEW_CATEGORY = '__new__'

interface Props {
  categories: Category[]
  onClose: () => void
  onSubmit: (english: string, categoryName: string | null) => Promise<void>
}

export function AddPhraseModal({ categories, onClose, onSubmit }: Props) {
  const [english, setEnglish] = useState('')
  const [categoryChoice, setCategoryChoice] = useState('')
  const [newCategory, setNewCategory] = useState('')
  const [saving, setSaving] = useState(false)

  const canSubmit = english.trim().length > 0 && (categoryChoice !== NEW_CATEGORY || newCategory.trim().length > 0)

  async function handleSubmit() {
    if (!canSubmit) return
    setSaving(true)
    const categoryName = categoryChoice === NEW_CATEGORY ? newCategory.trim() : categoryChoice || null
    await onSubmit(english.trim(), categoryName)
    setSaving(false)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 pt-16 sm:pt-24" onClick={onClose}>
      <div className="w-full sm:max-w-md rounded-2xl bg-surface p-5 shadow-xl mx-4 sm:mx-0" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-semibold mb-4 text-ink">Add phrase</h2>

        <label className="block text-sm font-medium mb-1 text-ink">English</label>
        <input
          autoFocus
          value={english}
          onChange={(e) => setEnglish(e.target.value)}
          className="w-full mb-3 rounded-lg border border-hairline bg-transparent text-ink px-3 py-2"
          placeholder="e.g. Where is the bathroom?"
        />

        <label className="block text-sm font-medium mb-1 text-ink">Category</label>
        <Select wrapperClassName="mb-3" value={categoryChoice} onChange={(e) => setCategoryChoice(e.target.value)}>
          <option value="">Uncategorized</option>
          {categories.map((c) => (
            <option key={c.id} value={c.name}>
              {c.name}
            </option>
          ))}
          <option value={NEW_CATEGORY}>+ New category...</option>
        </Select>

        {categoryChoice === NEW_CATEGORY && (
          <input
            autoFocus
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value)}
            className="w-full mb-3 rounded-lg border border-hairline bg-transparent text-ink px-3 py-2"
            placeholder="New category name"
          />
        )}

        <p className="text-xs text-muted mb-4">Translations for every tracked language are added automatically (blank until translated).</p>

        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="rounded-lg px-4 py-2 text-sm font-medium text-muted">
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!canSubmit || saving}
            className="rounded-lg bg-brandteal px-4 py-2 text-sm font-medium text-white disabled:opacity-40"
          >
            {saving ? 'Saving...' : 'Add phrase'}
          </button>
        </div>
      </div>
    </div>
  )
}
