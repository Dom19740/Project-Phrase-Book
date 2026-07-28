import { useState } from 'react'
import { resolveLanguageCode } from '../lib/languageCode'

interface Props {
  onClose: () => void
  onSubmit: (name: string, code: string) => Promise<void>
}

export function AddLanguageModal({ onClose, onSubmit }: Props) {
  const [name, setName] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit() {
    const trimmed = name.trim()
    if (!trimmed) return

    const code = resolveLanguageCode(trimmed)
    if (!code) {
      setError(`Don't recognize "${trimmed}" — try the common English name (e.g. "Thai", "Spanish", "Mandarin").`)
      return
    }

    setError(null)
    setSaving(true)
    await onSubmit(trimmed, code)
    setSaving(false)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 pt-16 sm:pt-24" onClick={onClose}>
      <div
        className="w-full sm:max-w-sm rounded-2xl bg-white dark:bg-neutral-900 p-5 shadow-xl mx-4 sm:mx-0"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-semibold mb-4">Add language</h2>

        <label className="block text-sm font-medium mb-1">Name</label>
        <input
          autoFocus
          value={name}
          onChange={(e) => {
            setName(e.target.value)
            setError(null)
          }}
          onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
          className="w-full mb-1 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-transparent px-3 py-2"
          placeholder="e.g. Thai"
        />
        {error ? (
          <p className="text-xs text-red-500 mb-4">{error}</p>
        ) : (
          <p className="text-xs text-neutral-500 mb-4">All existing phrases get translated into this language automatically.</p>
        )}

        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="rounded-lg px-4 py-2 text-sm font-medium text-neutral-500">
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!name.trim() || saving}
            className="rounded-lg bg-neutral-900 dark:bg-white dark:text-neutral-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-40"
          >
            {saving ? 'Adding & translating...' : 'Add language'}
          </button>
        </div>
      </div>
    </div>
  )
}
