import { useMemo, useState } from 'react'
import { Search, X } from 'lucide-react'
import type { Language } from '../db/types'
import { getLanguageFlag } from '../lib/languageFlags'
import { LANGUAGE_OPTIONS, type LanguageOption } from '../lib/languageOptions'

interface Props {
  languages: Language[]
  onClose: () => void
  onSubmit: (name: string, code: string) => Promise<void>
}

export function AddLanguageModal({ languages, onClose, onSubmit }: Props) {
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<LanguageOption | null>(null)
  const [saving, setSaving] = useState(false)
  const [manual, setManual] = useState(false)
  const [manualName, setManualName] = useState('')
  const [manualCode, setManualCode] = useState('')

  const existingCodes = useMemo(() => new Set(languages.map((l) => l.code.toLowerCase())), [languages])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return LANGUAGE_OPTIONS
    return LANGUAGE_OPTIONS.filter((l) => l.name.toLowerCase().includes(q) || l.code.toLowerCase().includes(q))
  }, [search])

  async function handleAdd() {
    if (!selected) return
    setSaving(true)
    await onSubmit(selected.name, selected.code)
    setSaving(false)
    onClose()
  }

  const canSubmitManual = manualName.trim().length > 0 && manualCode.trim().length > 0

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 pt-16 pb-[var(--safe-area-inset-bottom,0px)] sm:pt-24"
      onClick={onClose}
    >
      <div className="w-full sm:max-w-sm rounded-2xl border border-hairline bg-surface p-5 shadow-2xl mx-4 sm:mx-0" onClick={(e) => e.stopPropagation()}>
        {selected ? (
          <>
            <h2 className="text-lg font-semibold mb-1 text-ink">
              <span aria-hidden="true">{getLanguageFlag(selected.code)}</span> Add {selected.name}
            </h2>
            <p className="text-xs text-muted mb-4">
              All existing phrases get translated into this language automatically — that happens in the background after you add it.
            </p>

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setSelected(null)}
                disabled={saving}
                className="rounded-full border border-hairline px-4 py-2 text-sm font-medium text-ink disabled:opacity-40"
              >
                Back
              </button>
              <button
                onClick={handleAdd}
                disabled={saving}
                className="rounded-full bg-fabpink px-5 py-2 text-sm font-medium text-white shadow-sm disabled:opacity-40"
              >
                {saving ? 'Adding...' : 'Add language'}
              </button>
            </div>
          </>
        ) : manual ? (
          <>
            <h2 className="text-lg font-semibold mb-4 text-ink">Add language manually</h2>

            <label className="block text-sm font-medium mb-1 text-ink">Name</label>
            <input
              autoFocus
              value={manualName}
              onChange={(e) => setManualName(e.target.value)}
              className="w-full mb-3 rounded-xl border border-hairline bg-transparent text-ink px-3 py-2"
              placeholder="e.g. Klingon"
            />
            <label className="block text-sm font-medium mb-1 text-ink">Language code</label>
            <input
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value)}
              className="w-full mb-1 rounded-xl border border-hairline bg-transparent text-ink px-3 py-2"
              placeholder="e.g. de or pt-PT"
            />
            <p className="text-xs text-muted mb-4">An ISO 639-1 code or BCP-47 locale, e.g. "de" or "pt-PT".</p>

            <div className="flex justify-between gap-2">
              <button onClick={() => setManual(false)} className="rounded-full border border-hairline px-4 py-2 text-sm font-medium text-ink">
                Back
              </button>
              <button
                onClick={() => setSelected({ name: manualName.trim(), code: manualCode.trim() })}
                disabled={!canSubmitManual}
                className="rounded-full bg-fabpink px-5 py-2 text-sm font-medium text-white shadow-sm disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </>
        ) : (
          <>
            <h2 className="text-lg font-semibold mb-4 text-ink">Add language</h2>

            <div className="relative mb-3">
              <Search size={14} strokeWidth={2} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
              <input
                autoFocus
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search languages"
                className="w-full rounded-full border border-hairline bg-transparent text-ink pl-8 pr-8 py-2 text-sm"
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-full p-1 text-muted hover:text-ink"
                  aria-label="Clear search"
                >
                  <X size={14} strokeWidth={2} />
                </button>
              )}
            </div>

            <div className="flex flex-col gap-0.5 max-h-72 overflow-y-auto mb-3">
              {filtered.length === 0 && <p className="text-sm text-muted text-center py-4">No matches.</p>}
              {filtered.map((lang) => {
                const added = existingCodes.has(lang.code.toLowerCase())
                return (
                  <button
                    key={lang.code}
                    disabled={added}
                    onClick={() => setSelected(lang)}
                    className="flex items-center justify-between rounded-lg px-2.5 py-2 text-sm text-left text-ink hover:bg-surfacehover disabled:opacity-40 disabled:hover:bg-transparent"
                  >
                    <span className="flex items-center gap-2">
                      <span aria-hidden="true">{getLanguageFlag(lang.code)}</span>
                      {lang.name}
                    </span>
                    {added && <span className="text-xs text-muted">Added</span>}
                  </button>
                )
              })}
            </div>

            <div className="flex items-center justify-between gap-2">
              <button onClick={() => setManual(true)} className="text-xs text-muted hover:text-ink underline">
                Can't find it? Add manually
              </button>
              <button onClick={onClose} className="rounded-full border border-hairline px-4 py-2 text-sm font-medium text-ink">
                Cancel
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
