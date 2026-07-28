import { useState } from 'react'
import type { Category } from '../db/types'

interface Props {
  categories: Category[]
  onClose: () => void
  onCreate: (name: string) => Promise<void>
  onRename: (categoryId: number, newName: string) => Promise<void>
  onDelete: (categoryId: number) => Promise<void>
}

export function ManageCategoriesModal({ categories, onClose, onCreate, onRename, onDelete }: Props) {
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
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 pt-16 pb-[var(--safe-area-inset-bottom,0px)] sm:pt-24" onClick={onClose}>
      <div
        className="w-full sm:max-w-md max-h-[75vh] overflow-y-auto rounded-2xl border border-hairline bg-surface p-5 shadow-2xl mx-4 sm:mx-0"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-semibold mb-4 text-ink">Manage categories</h2>

        <div className="flex flex-col gap-2 mb-4">
          {categories.map((c) => (
            <div key={c.id} className="rounded-xl border border-hairline px-3 py-2">
              {confirmingDeleteId === c.id ? (
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm text-ink">Delete "{c.name}"? Its phrases become Uncategorized.</span>
                  <div className="flex gap-1 shrink-0">
                    <button
                      onClick={() => handleDelete(c.id)}
                      disabled={busy}
                      className="rounded-full px-2.5 py-1 text-xs font-medium bg-red-600 text-white disabled:opacity-40"
                    >
                      Delete
                    </button>
                    <button onClick={() => setConfirmingDeleteId(null)} className="rounded-full px-2.5 py-1 text-xs font-medium text-muted">
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
                    className="flex-1 min-w-0 rounded border border-hairline bg-transparent text-ink px-2 py-1 text-sm"
                  />
                  <button onClick={saveEdit} disabled={busy} className="rounded-full px-2.5 py-1 text-xs font-medium bg-[var(--accent)] text-white disabled:opacity-40">
                    Save
                  </button>
                  <button onClick={() => setEditingId(null)} className="rounded-full px-2.5 py-1 text-xs font-medium text-muted">
                    Cancel
                  </button>
                </div>
              ) : (
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm text-ink">{c.name}</span>
                  <div className="flex gap-1 shrink-0">
                    <button onClick={() => startEdit(c)} className="rounded-full px-2.5 py-1 text-xs font-medium text-muted hover:text-ink">
                      Rename
                    </button>
                    <button onClick={() => setConfirmingDeleteId(c.id)} className="rounded-full px-2.5 py-1 text-xs font-medium text-red-400">
                      Delete
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
          {categories.length === 0 && <p className="text-sm text-muted">No categories yet.</p>}
        </div>

        <label className="block text-sm font-medium mb-1 text-ink">Add category</label>
        <div className="flex gap-2 mb-4">
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
            className="flex-1 min-w-0 rounded-xl border border-hairline bg-transparent text-ink px-3 py-2 text-sm"
            placeholder="e.g. Emergencies"
          />
          <button
            onClick={handleCreate}
            disabled={busy || !newName.trim()}
            className="rounded-full px-4 py-2 text-sm font-medium bg-[var(--accent)] text-white shadow-sm disabled:opacity-40"
          >
            Add
          </button>
        </div>

        <div className="flex justify-end">
          <button onClick={onClose} className="rounded-full px-4 py-2 text-sm font-medium text-muted">
            Done
          </button>
        </div>
      </div>
    </div>
  )
}
