import { useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import type { Language } from '../db/types'

const ACCENTS = ['#e11d48', '#2563eb', '#16a34a', '#d97706', '#7c3aed', '#0891b2']

export function accentFor(index: number): string {
  return ACCENTS[index % ACCENTS.length]
}

interface Props {
  languages: Language[]
  activeLanguageId: number | null
  onSelect: (id: number) => void
  onAddLanguage: () => void
  onRemoveLanguage: (id: number) => void
}

export function LanguageTabs({ languages, activeLanguageId, onSelect, onAddLanguage, onRemoveLanguage }: Props) {
  const [confirming, setConfirming] = useState(false)
  const activeLanguage = languages.find((l) => l.id === activeLanguageId)

  if (confirming && activeLanguage) {
    return (
      <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-neutral-200 dark:border-neutral-800">
        <span className="text-sm">Remove {activeLanguage.name}? This deletes all its translations.</span>
        <div className="flex gap-2 shrink-0">
          <button
            onClick={() => {
              onRemoveLanguage(activeLanguage.id)
              setConfirming(false)
            }}
            className="rounded-lg px-3 py-1.5 text-xs font-medium bg-red-600 text-white"
          >
            Remove
          </button>
          <button onClick={() => setConfirming(false)} className="rounded-lg px-3 py-1.5 text-xs font-medium text-neutral-500">
            Cancel
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2 px-4 py-3 border-b border-neutral-200 dark:border-neutral-800">
      <select
        value={activeLanguageId ?? ''}
        onChange={(e) => onSelect(Number(e.target.value))}
        className="flex-1 min-w-0 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-2 text-sm font-medium"
      >
        {languages.map((lang) => (
          <option key={lang.id} value={lang.id}>
            {lang.name}
          </option>
        ))}
      </select>

      <button
        onClick={onAddLanguage}
        className="shrink-0 rounded-lg border border-dashed border-neutral-300 dark:border-neutral-700 p-2 text-neutral-500 dark:text-neutral-400 hover:border-neutral-400 dark:hover:border-neutral-600 transition-colors"
        aria-label="Add language"
        title="Add language"
      >
        <Plus size={16} strokeWidth={2} />
      </button>

      {activeLanguage && (
        <button
          onClick={() => setConfirming(true)}
          className="shrink-0 rounded-lg p-2 text-neutral-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
          aria-label={`Remove ${activeLanguage.name}`}
          title="Remove language"
        >
          <Trash2 size={16} strokeWidth={2} />
        </button>
      )}
    </div>
  )
}
