import { useState } from 'react'
import { GripVertical, Trash2 } from 'lucide-react'
import type { Category } from '../db/types'
import { DragReorderList } from './DragReorderList'

interface Props {
  categories: Category[]
  onClose: () => void
  onCreate: (name: string) => Promise<void>
  onRename: (categoryId: number, newName: string) => Promise<void>
  onDelete: (categoryId: number) => Promise<void>
  onReorder: (orderedCategoryIds: number[]) => Promise<void>
}

export function ManageCategoriesModal({ categories, onClose, onCreate, onRename, onDelete, onReorder }: Props) {
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editingName, setEditingName] = useState('')
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<number | null>(null)
  const [newName, setNewName] = useState('')
  const [busy, setBusy] = useState(false)

  function startEdit(category: Category) {
    setEditingId(category.id)
    setEditingName(category.name)
  }

  async function saveEdit() {
    if (editingId == null || !editingName.trim()) return
    setBusy(true)
    await onRename(editingId, editingName.trim())
    setBusy(false)
    setEditingId(null)
  }

  async function handleDelete(categoryId: number) {
    setBusy(true)
    await onDelete(categoryId)
    setBusy(false)
    setConfirmingDeleteId(null)
  }

  async function handleCreate() {
    if (!newName.trim()) return
    setBusy(true)
    await onCreate(newName.trim())
    setNewName('')
    setBusy(false)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 backdrop-blur-sm pt-16 pb-[var(--safe-area-inset-bottom,0px)] sm:pt-24"
      onClick={onClose}
    >
      <div
        className="w-full min-w-0 sm:max-w-md max-h-[75vh] overflow-y-auto rounded-2xl border border-hairline bg-surface p-5 shadow-2xl mx-4 sm:mx-0"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-bold tracking-tight mb-4 text-ink">Manage categories</h2>

        <DragReorderList
          items={categories}
          getId={(c) => c.id}
          onReorder={onReorder}
          className="flex flex-col gap-2 mb-4"
          renderItem={(c, dragHandleProps) => (
            <div className="rounded-xl border border-hairline px-3 py-2">
              {confirmingDeleteId === c.id ? (
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm text-ink">Delete "{c.name}"? Its phrases become Uncategorized.</span>
                  <div className="flex gap-1 shrink-0">
                    <button
                      onClick={() => handleDelete(c.id)}
                      disabled={busy}
                      aria-label="Delete"
                      title="Delete"
                      className="rounded-full p-1.5 bg-fabpink text-onaccent active:scale-90 transition-transform disabled:opacity-40"
                    >
                      <Trash2 size={13} strokeWidth={2} />
                    </button>
                    <button onClick={() => setConfirmingDeleteId(null)} className="rounded-full px-2.5 py-1 text-xs font-medium text-muted hover:text-ink transition-colors">
                      Cancel
                    </button>
                  </div>
                </div>
              ) : editingId === c.id ? (
                <div className="flex items-center gap-2">
                  <input
                    autoFocus
                    value={editingName}
                    onChange={(e) => setEditingName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && saveEdit()}
                    className="flex-1 min-w-0 rounded-lg border-2 border-hairline bg-transparent text-ink px-2 py-1 text-sm outline-none focus:border-fabpink transition-all"
                  />
                  <button onClick={saveEdit} disabled={busy} className="rounded-full px-2.5 py-1 text-xs font-medium bg-fabpink text-onaccent active:scale-95 transition-transform disabled:opacity-40">
                    Save
                  </button>
                  <button onClick={() => setEditingId(null)} className="rounded-full px-2.5 py-1 text-xs font-medium text-muted hover:text-ink transition-colors">
                    Cancel
                  </button>
                </div>
              ) : (
                <div className="flex items-center justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-1.5">
                    <button
                      type="button"
                      onPointerDown={dragHandleProps.onPointerDown}
                      className="touch-none shrink-0 rounded-full p-1 text-muted active:cursor-grabbing cursor-grab"
                      aria-label={`Drag to reorder ${c.name}`}
                      title="Drag to reorder"
                    >
                      <GripVertical size={15} strokeWidth={2} />
                    </button>
                    <span className="truncate text-[11px] font-extrabold uppercase tracking-wider text-ink">{c.name}</span>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <button onClick={() => startEdit(c)} className="rounded-full px-2.5 py-1 text-xs font-medium text-muted hover:text-ink transition-colors">
                      Rename
                    </button>
                    <button
                      onClick={() => setConfirmingDeleteId(c.id)}
                      aria-label="Delete"
                      title="Delete"
                      className="rounded-full border border-hairline p-1.5 text-muted hover:bg-surfacehover active:scale-90 transition-all"
                    >
                      <Trash2 size={13} strokeWidth={2} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        />
        {categories.length === 0 && <p className="text-sm text-muted mb-4">No categories yet.</p>}

        <label className="block text-[11px] font-extrabold uppercase tracking-wider text-fabpink mb-1">Add category</label>
        <div className="flex gap-2 mb-4">
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
            className="flex-1 min-w-0 rounded-xl border-2 border-hairline bg-transparent text-ink px-3 py-2 text-sm outline-none focus:border-fabpink transition-all"
            placeholder="e.g. Emergencies"
          />
          <button
            onClick={handleCreate}
            disabled={busy || !newName.trim()}
            className="rounded-full px-4 py-2 text-sm font-medium bg-fabpink text-onaccent shadow-lg shadow-fabpink/20 active:scale-95 transition-all disabled:opacity-40"
          >
            Add
          </button>
        </div>

        <div className="flex justify-end">
          <button onClick={onClose} className="rounded-full border border-hairline px-4 py-2 text-sm font-medium text-ink hover:bg-surfacehover active:scale-95 transition-all">
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
