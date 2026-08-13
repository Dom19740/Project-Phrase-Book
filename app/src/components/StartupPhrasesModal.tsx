import { useState } from 'react'
import { startupPhrases } from '../data/startupPhrases'

interface Props {
  onSkip: () => void
  onSubmit: (englishKeys: string[]) => Promise<void>
}

export function StartupPhrasesModal({ onSkip, onSubmit }: Props) {
  const [includedKeys, setIncludedKeys] = useState<Set<string>>(new Set(startupPhrases.map((p) => p.english)))
  const [saving, setSaving] = useState(false)

  function toggle(english: string) {
    setIncludedKeys((prev) => {
      const next = new Set(prev)
      if (next.has(english)) next.delete(english)
      else next.add(english)
      return next
    })
  }

  async function handleAdd() {
    setSaving(true)
    await onSubmit(Array.from(includedKeys))
    setSaving(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 backdrop-blur-sm pt-16 pb-[var(--safe-area-inset-bottom,0px)] sm:pt-24" onClick={onSkip}>
      <div className="w-full sm:max-w-md rounded-2xl border border-hairline bg-surface p-5 shadow-2xl mx-4 sm:mx-0" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-bold tracking-tight mb-3 text-ink">Add starter phrases?</h2>

        <div className="flex items-center justify-between mb-1">
          <span className="text-sm font-medium text-ink">Phrases to include</span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setIncludedKeys(new Set(startupPhrases.map((p) => p.english)))}
              className="text-xs font-semibold text-fabpink hover:underline"
            >
              All
            </button>
            <button type="button" onClick={() => setIncludedKeys(new Set())} className="text-xs font-semibold text-fabpink hover:underline">
              None
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-0.5 max-h-72 overflow-y-auto mb-4 rounded-xl border border-hairline p-1.5">
          {startupPhrases.map((p) => (
            <label
              key={p.english}
              className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-ink hover:bg-surfacehover transition-colors cursor-pointer"
            >
              <input
                type="checkbox"
                checked={includedKeys.has(p.english)}
                onChange={() => toggle(p.english)}
                className="size-4 shrink-0 rounded accent-fabpink cursor-pointer"
              />
              <span className="min-w-0 flex-1 truncate text-ink">{p.english}</span>
            </label>
          ))}
        </div>

        <p className="text-xs text-muted mb-4">{includedKeys.size} of {startupPhrases.length} phrases selected.</p>

        <div className="flex justify-end gap-2">
          <button onClick={onSkip} disabled={saving} className="rounded-full border border-hairline px-4 py-2 text-sm font-medium text-ink hover:bg-surfacehover active:scale-95 transition-all disabled:opacity-40">
            Skip
          </button>
          <button
            onClick={handleAdd}
            disabled={saving || includedKeys.size === 0}
            className="rounded-full bg-fabpink px-5 py-2 text-sm font-medium text-white shadow-lg shadow-fabpink/20 active:scale-95 transition-all disabled:opacity-40"
          >
            {saving ? 'Adding...' : `Add ${includedKeys.size} phrase${includedKeys.size === 1 ? '' : 's'}`}
          </button>
        </div>
      </div>
    </div>
  )
}
