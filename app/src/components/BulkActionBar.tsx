import { useState } from 'react'
import { Check, Tag, Trash2, X } from 'lucide-react'
import type { Category } from '../db/types'
import { PopoutSelect } from './PopoutSelect'

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
    <div
      className="fixed bottom-0 left-0 right-0 z-40 border-t border-hairline bg-surface shadow-[0_-4px_16px_rgba(0,0,0,0.4)]"
      style={{ paddingBottom: 'var(--safe-area-inset-bottom, 0px)' }}
    >
      {panel === 'category' && (
        <div className="flex items-center gap-2 px-4 py-2 border-b border-hairline">
          <PopoutSelect
            className="flex-1 min-w-0"
            align="left"
            dropDirection="up"
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
              placeholder="New category name"
              className="flex-1 min-w-0 rounded-xl border border-hairline bg-transparent text-ink px-2 py-1.5 text-sm"
            />
          )}
          <button
            onClick={applyCategory}
            disabled={busy || (categoryChoice === NEW_CATEGORY && !newCategory.trim())}
            className="shrink-0 rounded-full bg-[var(--accent)] px-3.5 py-1.5 text-sm font-medium text-white shadow-sm disabled:opacity-40"
          >
            Apply
          </button>
        </div>
      )}

      {panel === 'delete' && (
        <div className="flex flex-col gap-2 px-4 py-2 border-b border-hairline">
          <p className="text-sm text-muted">
            Delete {selectedCount} phrase(s) from {languageName} only, or from every language?
          </p>
          <div className="flex gap-2">
            <button
              onClick={async () => {
                setBusy(true)
                await onDeleteOneLanguage()
                setBusy(false)
                setPanel(null)
              }}
              disabled={busy}
              className="flex-1 rounded-full border border-red-800 px-3 py-1.5 text-sm font-medium text-red-400 disabled:opacity-40"
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
              className="flex-1 rounded-full bg-red-600 px-3 py-1.5 text-sm font-medium text-white shadow-sm disabled:opacity-40"
            >
              All languages
            </button>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between gap-2 px-4 py-3">
        <span className="text-sm font-medium text-ink">{selectedCount} selected</span>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => onMarkLearned(true)}
            className="flex items-center gap-1 rounded-full border border-[var(--accent)] text-[var(--accent)] px-2.5 py-1.5 text-xs font-medium hover:bg-surfacehover transition-colors"
          >
            <Check size={13} strokeWidth={2} />
            Learned
          </button>
          <button
            onClick={() => setPanel(panel === 'category' ? null : 'category')}
            className="flex items-center gap-1 rounded-full border border-[var(--accent)] text-[var(--accent)] px-2.5 py-1.5 text-xs font-medium hover:bg-surfacehover transition-colors"
          >
            <Tag size={13} strokeWidth={2} />
            Category
          </button>
          <button
            onClick={() => setPanel(panel === 'delete' ? null : 'delete')}
            className="flex items-center gap-1 rounded-full border border-red-800 px-2.5 py-1.5 text-xs font-medium text-red-400 hover:bg-red-950/40 transition-colors"
          >
            <Trash2 size={13} strokeWidth={2} />
            Delete
          </button>
          <button onClick={onCancel} className="rounded-lg p-1.5 text-muted hover:text-ink">
            <X size={16} strokeWidth={2} />
          </button>
        </div>
      </div>
    </div>
  )
}
