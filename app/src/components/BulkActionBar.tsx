import { useState } from 'react'
import { Check, Star, Tag, Trash2, X } from 'lucide-react'
import type { Category } from '../db/types'
import { PopoutSelect } from './PopoutSelect'

const NEW_CATEGORY = '__new__'

interface Props {
  selectedCount: number
  languageName: string
  categories: Category[]
  onMarkLearned: (learned: boolean) => Promise<void>
  onMarkFavorite: (favorite: boolean) => Promise<void>
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
  onMarkFavorite,
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
    <div className="shrink-0 border-b border-hairline bg-surface">
      {panel === 'category' && (
        <div className="flex items-center gap-2 px-4 py-2 border-b border-hairline">
          <PopoutSelect
            className="flex-1 min-w-0"
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
              placeholder="New category name"
              className="flex-1 min-w-0 rounded-xl border border-hairline bg-transparent text-ink px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-fabpink/40 focus:border-fabpink transition-shadow"
            />
          )}
          <button
            onClick={applyCategory}
            disabled={busy || (categoryChoice === NEW_CATEGORY && !newCategory.trim())}
            className="shrink-0 rounded-full bg-fabpink px-3.5 py-1.5 text-sm font-medium text-white shadow-lg shadow-fabpink/20 active:scale-95 disabled:active:scale-100 transition-all disabled:opacity-40"
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
              className="flex-1 rounded-full border border-red-800 px-3 py-1.5 text-sm font-medium text-red-400 hover:bg-red-950/30 active:scale-95 transition-all disabled:opacity-40"
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
              className="flex-1 rounded-full bg-red-600 px-3 py-1.5 text-sm font-medium text-white shadow-lg shadow-red-600/20 active:scale-95 transition-all disabled:opacity-40"
            >
              All languages
            </button>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-2 px-4 py-3">
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm font-medium text-ink">{selectedCount} selected</span>
          <button onClick={onCancel} className="rounded-lg p-1.5 text-muted hover:text-ink" aria-label="Cancel selection">
            <X size={16} strokeWidth={2} />
          </button>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            onClick={() => onMarkLearned(true)}
            disabled={selectedCount === 0}
            className="flex items-center gap-1 rounded-full border border-fabpink text-fabpink px-2.5 py-1.5 text-xs font-medium hover:bg-surfacehover active:scale-95 transition-all disabled:opacity-40 disabled:hover:bg-transparent disabled:active:scale-100"
          >
            <Check size={13} strokeWidth={2} />
            Learned
          </button>
          <button
            onClick={() => onMarkFavorite(true)}
            disabled={selectedCount === 0}
            className="flex items-center gap-1 rounded-full border border-fabpink text-fabpink px-2.5 py-1.5 text-xs font-medium hover:bg-surfacehover active:scale-95 transition-all disabled:opacity-40 disabled:hover:bg-transparent disabled:active:scale-100"
          >
            <Star size={13} strokeWidth={2} />
            Favourite
          </button>
          <button
            onClick={() => setPanel(panel === 'category' ? null : 'category')}
            disabled={selectedCount === 0}
            className="flex items-center gap-1 rounded-full border border-fabpink text-fabpink px-2.5 py-1.5 text-xs font-medium hover:bg-surfacehover active:scale-95 transition-all disabled:opacity-40 disabled:hover:bg-transparent disabled:active:scale-100"
          >
            <Tag size={13} strokeWidth={2} />
            Category
          </button>
          <button
            onClick={() => setPanel(panel === 'delete' ? null : 'delete')}
            disabled={selectedCount === 0}
            aria-label="Delete"
            title="Delete"
            className="flex items-center rounded-full border border-red-800 p-1.5 text-red-400 hover:bg-red-950/40 active:scale-90 transition-all disabled:opacity-40 disabled:hover:bg-transparent disabled:active:scale-100"
          >
            <Trash2 size={13} strokeWidth={2} />
          </button>
        </div>
      </div>
    </div>
  )
}
