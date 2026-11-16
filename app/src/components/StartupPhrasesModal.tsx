import { useState } from 'react'
import { startupPhrases } from '../data/startupPhrases'
import { Button } from './ui/Button'
import { Dialog } from './ui/Dialog'

interface Props {
  onSkip: () => void
  onSubmit: (englishKeys: string[]) => Promise<void>
}

export function StartupPhrasesModal({ onSkip, onSubmit }: Props) {
  const [includedKeys, setIncludedKeys] = useState<Set<string>>(new Set())
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
    <Dialog onClose={onSkip} maxWidthClassName="sm:max-w-md">
      <>
        <h2 className="text-lg font-bold tracking-tight mb-3 text-ink">Add starter phrases?</h2>

        <div className="flex items-center justify-between mb-1">
          <span className="text-[11px] font-extrabold uppercase tracking-wider text-fabpink">Phrases to include</span>
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
          {startupPhrases.map((p) => {
            const checked = includedKeys.has(p.english)
            return (
              <button
                key={p.english}
                type="button"
                role="checkbox"
                aria-checked={checked}
                onClick={() => toggle(p.english)}
                className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm text-ink hover:bg-surfacehover transition-colors"
              >
                <span
                  aria-hidden="true"
                  className={`size-4 shrink-0 rounded-full border-2 border-fabpink transition-colors ${checked ? 'bg-fabpink' : ''}`}
                />
                <span className="min-w-0 flex-1 truncate text-ink">{p.english}</span>
              </button>
            )
          })}
        </div>

        <p className="text-xs text-muted mb-4">{includedKeys.size} of {startupPhrases.length} phrases selected.</p>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onSkip} disabled={saving} className="px-4 py-2 text-sm">
            Skip
          </Button>
          <Button onClick={handleAdd} disabled={saving || includedKeys.size === 0} className="px-5 py-2 text-sm">
            {saving ? 'Adding...' : `Add ${includedKeys.size} phrase${includedKeys.size === 1 ? '' : 's'}`}
          </Button>
        </div>
      </>
    </Dialog>
  )
}
