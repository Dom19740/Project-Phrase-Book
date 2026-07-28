import { useState } from 'react'
import { Check, Tag, Trash2, X } from 'lucide-react'
import type { Category } from '../db/types'

const NEW_CATEGORY = '__new__'

interface Props {
  selectedCount: number
  languageName: string
  categories: Category[]
  onMarkLearned: (learned: boolean) => Promise<void>
  onChangeCategory: (categoryName: string | null) => Promise<void>
  onDeleteOneLanguage: () => Promise<void>
  onDeleteAllLanguages: () => Promise<void>
  onCancel: () => void
}

type Panel = null | 'category' | 'delete'

export function BulkActionBar({
  selectedCount,
  languageName,
  categories,
  onMarkLearned,
  onChangeCategory,
  onDeleteOneLanguage,
  onDeleteAllLanguages,
  onCancel,
}: Props) {
  const [panel, setPanel] = useState<Panel>(null)
  const [categoryChoice, setCategoryChoice] = useState('')
  const [newCategory, setNewCategory] = useState('')
  const [busy, setBusy] = useState(false)

  async function applyCategory() {
    setBusy(true)
    const categoryName = categoryChoice === NEW_CATEGORY ? newCategory.trim() : categoryChoice || null
    await onChangeCategory(categoryName)
    setBusy(false)
    setPanel(null)
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-[0_-4px_16px_rgba(0,0,0,0.1)]">
      {panel === 'category' && (
        <div className="flex items-center gap-2 px-4 py-2 border-b border-neutral-200 dark:border-neutral-800">
          <select
            value={categoryChoice}
            onChange={(e) => setCategoryChoice(e.target.value)}
            className="flex-1 min-w-0 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-2 py-1.5 text-sm"
          >
            <option value="">Uncategorized</option>
            {categories.map((c) => (
              <option key={c.id} value={c.name}>
                {c.name}
              </option>
            ))}
            <option value={NEW_CATEGORY}>+ New category...</option>
          </select>
          {categoryChoice === NEW_CATEGORY && (
            <input
              autoFocus
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              placeholder="New category name"
              className="flex-1 min-w-0 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-transparent px-2 py-1.5 text-sm"
            />
          )}
          <button
            onClick={applyCategory}
            disabled={busy || (categoryChoice === NEW_CATEGORY && !newCategory.trim())}
            className="shrink-0 rounded-lg bg-neutral-900 dark:bg-white dark:text-neutral-900 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-40"
          >
            Apply
          </button>
        </div>
      )}

      {panel === 'delete' && (
        <div className="flex flex-col gap-2 px-4 py-2 border-b border-neutral-200 dark:border-neutral-800">
          <p className="text-sm text-neutral-500">Delete {selectedCount} phrase(s) from {languageName} only, or from every language?</p>
          <div className="flex gap-2">
            <button
              onClick={async () => {
                setBusy(true)
                await onDeleteOneLanguage()
                setBusy(false)
                setPanel(null)
              }}
              disabled={busy}
              className="flex-1 rounded-lg border border-red-300 dark:border-red-800 px-3 py-1.5 text-sm font-medium text-red-600 dark:text-red-400 disabled:opacity-40"
            >
              {languageName} only
            </button>
            <button
              onClick={async () => {
                setBusy(true)
                await onDeleteAllLanguages()
                setBusy(false)
                setPanel(null)
              }}
              disabled={busy}
              className="flex-1 rounded-lg bg-red-600 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-40"
            >
              All languages
            </button>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between gap-2 px-4 py-3">
        <span className="text-sm font-medium">{selectedCount} selected</span>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => onMarkLearned(true)}
            className="flex items-center gap-1 rounded-lg border border-neutral-300 dark:border-neutral-700 px-2.5 py-1.5 text-xs font-medium hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
          >
            <Check size={13} strokeWidth={2} />
            Learned
          </button>
          <button
            onClick={() => setPanel(panel === 'category' ? null : 'category')}
            className="flex items-center gap-1 rounded-lg border border-neutral-300 dark:border-neutral-700 px-2.5 py-1.5 text-xs font-medium hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
          >
            <Tag size={13} strokeWidth={2} />
            Category
          </button>
          <button
            onClick={() => setPanel(panel === 'delete' ? null : 'delete')}
            className="flex items-center gap-1 rounded-lg border border-red-300 dark:border-red-800 px-2.5 py-1.5 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
          >
            <Trash2 size={13} strokeWidth={2} />
            Delete
          </button>
          <button onClick={onCancel} className="rounded-lg p-1.5 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200">
            <X size={16} strokeWidth={2} />
          </button>
        </div>
      </div>
    </div>
  )
}
