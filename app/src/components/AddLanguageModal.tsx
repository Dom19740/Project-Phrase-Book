import { useState } from 'react'
import { resolveLanguageCode } from '../lib/languageCode'
import { ColorSwatchBar } from './ColorSwatchBar'

interface Props {
  defaultColor: string
  onClose: () => void
  onSubmit: (name: string, code: string, color: string) => Promise<void>
}

export function AddLanguageModal({ defaultColor, onClose, onSubmit }: Props) {
  const [name, setName] = useState('')
  const [color, setColor] = useState(defaultColor)
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
    await onSubmit(trimmed, code, color)
    setSaving(false)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 pt-16 pb-[var(--safe-area-inset-bottom,0px)] sm:pt-24" onClick={onClose}>
      <div className="w-full sm:max-w-sm rounded-2xl border border-hairline bg-surface p-5 shadow-2xl mx-4 sm:mx-0" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-semibold mb-4 text-ink">Add language</h2>

        <label className="block text-sm font-medium mb-1 text-ink">Name</label>
        <input
          autoFocus
          value={name}
          onChange={(e) => {
            setName(e.target.value)
            setError(null)
          }}
          onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
          className="w-full mb-1 rounded-xl border border-hairline bg-transparent text-ink px-3 py-2"
          placeholder="e.g. Thai"
        />
        {error ? (
          <p className="text-xs text-red-400 mb-4">{error}</p>
        ) : (
          <p className="text-xs text-muted mb-4">All existing phrases get translated into this language automatically.</p>
        )}

        <label className="block text-sm font-medium mb-2 text-ink">Accent color</label>
        <div className="mb-4">
          <ColorSwatchBar value={color} onChange={setColor} />
        </div>

        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="rounded-full px-4 py-2 text-sm font-medium text-muted">
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!name.trim() || saving}
            className="rounded-full px-5 py-2 text-sm font-medium text-white shadow-sm disabled:opacity-40"
            style={{ backgroundColor: color }}
          >
            {saving ? 'Adding & translating...' : 'Add language'}
          </button>
        </div>
      </div>
    </div>
  )
}
