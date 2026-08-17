import { useMemo, useState } from 'react'
import { Search, X } from 'lucide-react'
import { getLanguageFlag } from '../lib/languageFlags'
import { LANGUAGE_OPTIONS, type LanguageOption } from '../lib/languageOptions'

interface Props {
  /** Lowercased codes to show as already present and disable picking again. */
  disabledCodes?: Set<string>
  onChoose: (lang: LanguageOption) => void
  /** Best-effort guess (e.g. from detectLanguage) to surface at the top of the list, labeled "Detected". */
  highlightCode?: string | null
  /** Disables every option, e.g. while a choice is being submitted. */
  disabled?: boolean
}

export function LanguageSearchList({ disabledCodes, onChoose, highlightCode, disabled }: Props) {
  const [search, setSearch] = useState('')

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    const base = q ? LANGUAGE_OPTIONS.filter((l) => l.name.toLowerCase().includes(q) || l.code.toLowerCase().includes(q)) : LANGUAGE_OPTIONS
    if (!highlightCode || q) return base
    const guess = base.find((l) => l.code === highlightCode)
    if (!guess) return base
    return [guess, ...base.filter((l) => l.code !== highlightCode)]
  }, [search, highlightCode])

  return (
    <>
      <div className="relative mb-3">
        <Search size={14} strokeWidth={2} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
        <input
          autoFocus
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search languages"
          className="w-full rounded-full border border-hairline bg-transparent text-ink pl-8 pr-8 py-2 text-sm outline-none focus:ring-2 focus:ring-fabpink/40 focus:border-fabpink transition-shadow"
        />
        {search && (
          <button
            onClick={() => setSearch('')}
            className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-full p-1 text-muted hover:text-ink transition-colors"
            aria-label="Clear search"
          >
            <X size={14} strokeWidth={2} />
          </button>
        )}
      </div>

      <div className="flex flex-col gap-0.5 max-h-72 overflow-y-auto">
        {filtered.length === 0 && <p className="text-sm text-muted text-center py-4">No matches.</p>}
        {filtered.map((lang) => {
          const added = disabledCodes?.has(lang.code.toLowerCase()) ?? false
          const isGuess = lang.code === highlightCode
          return (
            <button
              key={lang.code}
              disabled={added || disabled}
              onClick={() => onChoose(lang)}
              className={`flex items-center justify-between rounded-lg px-2.5 py-2 text-sm text-left text-ink hover:bg-surfacehover transition-colors disabled:opacity-40 disabled:hover:bg-transparent ${isGuess ? 'bg-fabpink/10' : ''}`}
            >
              <span className="flex items-center gap-2">
                <span aria-hidden="true">{getLanguageFlag(lang.code)}</span>
                {lang.name}
              </span>
              {added ? <span className="text-xs text-muted">Added</span> : isGuess ? <span className="text-xs font-semibold text-fabpink">Detected</span> : null}
            </button>
          )
        })}
      </div>
    </>
  )
}
