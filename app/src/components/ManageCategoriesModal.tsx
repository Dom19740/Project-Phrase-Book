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
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 pt-16 sm:pt-24" onClick={onClose}>
      <div
        className="w-full sm:max-w-md max-h-[75vh] overflow-y-auto rounded-2xl bg-white dark:bg-neutral-900 p-5 shadow-xl mx-4 sm:mx-0"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-semibold mb-4">Manage categories</h2>

        <div className="flex flex-col gap-2 mb-4">
          {categories.map((c) => (
            <div key={c.id} className="rounded-lg border border-neutral-200 dark:border-neutral-800 px-3 py-2">
              {confirmingDeleteId === c.id ? (
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm">Delete "{c.name}"? Its phrases become Uncategorized.</span>
                  <div className="flex gap-1 shrink-0">
                    <button
                      onClick={() => handleDelete(c.id)}
                      disabled={busy}
                      className="rounded px-2 py-1 text-xs font-medium bg-red-600 text-white disabled:opacity-40"
                    >
                      Delete
                    </button>
                    <button onClick={() => setConfirmingDeleteId(null)} className="rounded px-2 py-1 text-xs font-medium text-neutral-500">
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
                    className="flex-1 min-w-0 rounded border border-neutral-300 dark:border-neutral-700 bg-transparent px-2 py-1 text-sm"
                  />
                  <button onClick={saveEdit} disabled={busy} className="rounded px-2 py-1 text-xs font-medium bg-neutral-900 dark:bg-white dark:text-neutral-900 text-white disabled:opacity-40">
                    Save
                  </button>
                  <button onClick={() => setEditingId(null)} className="rounded px-2 py-1 text-xs font-medium text-neutral-500">
                    Cancel
                  </button>
                </div>
              ) : (
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm">{c.name}</span>
                  <div className="flex gap-1 shrink-0">
                    <button onClick={() => startEdit(c)} className="rounded px-2 py-1 text-xs font-medium text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100">
                      Rename
                    </button>
                    <button onClick={() => setConfirmingDeleteId(c.id)} className="rounded px-2 py-1 text-xs font-medium text-red-600 dark:text-red-400">
                      Delete
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
          {categories.length === 0 && <p className="text-sm text-neutral-400">No categories yet.</p>}
        </div>

        <label className="block text-sm font-medium mb-1">Add category</label>
        <div className="flex gap-2 mb-4">
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
            className="flex-1 min-w-0 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-transparent px-3 py-2 text-sm"
            placeholder="e.g. Emergencies"
          />
          <button
            onClick={handleCreate}
            disabled={busy || !newName.trim()}
            className="rounded-lg px-4 py-2 text-sm font-medium bg-neutral-900 dark:bg-white dark:text-neutral-900 text-white disabled:opacity-40"
          >
            Add
          </button>
        </div>

        <div className="flex justify-end">
          <button onClick={onClose} className="rounded-lg px-4 py-2 text-sm font-medium text-neutral-500">
            Done
          </button>
        </div>
      </div>
    </div>
  )
}
