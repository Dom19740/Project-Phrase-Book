import { useEffect, useRef, useState, type ReactNode } from 'react'
import { ChevronDown, Plus, Search, Trash2, X } from 'lucide-react'
import type { Language, PhraseListItem } from '../db/types'
import { getLanguageFlag } from '../lib/languageFlags'
import { AddLanguageModal } from './AddLanguageModal'

interface Props {
  languages: Language[]
  activeLanguageId: number | null
  onSelect: (id: number) => void
  onAddLanguage: (name: string, code: string, includeConceptIds?: number[] | null) => Promise<void>
  onRemoveLanguage: (id: number) => void
  getLanguagePhrases: (languageId: number) => Promise<PhraseListItem[]>
  search: string
  onSearchChange: (value: string) => void
  menu: ReactNode
}

export function LanguageTabs({
  languages,
  activeLanguageId,
  onSelect,
  onAddLanguage,
  onRemoveLanguage,
  getLanguagePhrases,
  search,
  onSearchChange,
  menu,
}: Props) {
  const [open, setOpen] = useState(false)
  const [showAddLanguage, setShowAddLanguage] = useState(false)
  const [confirmingRemoveId, setConfirmingRemoveId] = useState<number | null>(null)
  const [searchFocused, setSearchFocused] = useState(false)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const searchExpanded = searchFocused || search.length > 0

  // Prompt to add a language whenever there are none — first launch, or after removing the last one.
  useEffect(() => {
    if (languages.length === 0) setShowAddLanguage(true)
  }, [languages.length])

  const activeLanguage = languages.find((l) => l.id === activeLanguageId)

  return (
    <div className="px-4 py-2 border-b border-hairline flex items-center gap-2">
      <div className="relative flex flex-1 items-center gap-2">
        <div className="relative flex-1">
          <button
            onClick={() => setOpen((v) => !v)}
            className="h-10 w-full flex items-center gap-2 rounded-full border-2 border-fabpink px-4 text-sm font-semibold shadow-lg shadow-fabpink/10 active:scale-[0.98] transition-all"
          >
            <span className="shrink-0 text-base leading-none">{activeLanguage ? getLanguageFlag(activeLanguage.code) : '🌐'}</span>
            <span className="flex-1 text-left truncate text-ink">{activeLanguage?.name ?? 'Select a language'}</span>
            <ChevronDown size={16} strokeWidth={2.5} className="text-fabpink" />
          </button>

          {open && (
            <>
              <button className="fixed inset-0 z-40 cursor-default" onClick={() => setOpen(false)} aria-label="Close language menu" />
              <div className="absolute left-0 top-full z-50 mt-2 w-full rounded-2xl border border-hairline bg-surface/95 backdrop-blur-md p-2 shadow-xl">
                <div className="flex flex-col gap-1 max-h-64 overflow-y-auto">
                  {languages.map((lang) => (
                    <div key={lang.id} className="flex items-center gap-1 rounded-lg hover:bg-surfacehover transition-colors">
                      {confirmingRemoveId === lang.id ? (
                        <div className="flex flex-1 items-center justify-end gap-1 px-2 py-1.5">
                          <button
                            onClick={() => {
                              onRemoveLanguage(lang.id)
                              setConfirmingRemoveId(null)
                            }}
                            className="rounded-full px-2.5 py-1 text-xs font-medium bg-red-600 text-white active:scale-95 transition-transform"
                          >
                            Remove
                          </button>
                          <button onClick={() => setConfirmingRemoveId(null)} className="rounded-full px-2.5 py-1 text-xs font-medium text-muted">
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <>
                          <span className="shrink-0 p-2 text-base leading-none" aria-hidden="true">
                            {getLanguageFlag(lang.code)}
                          </span>
                          <button
                            onClick={() => {
                              onSelect(lang.id)
                              setOpen(false)
                            }}
                            className="flex flex-1 items-center rounded-lg py-2 pr-2 text-sm text-left text-ink"
                          >
                            {lang.name}
                          </button>
                          <button
                            onClick={() => setConfirmingRemoveId(lang.id)}
                            className="shrink-0 rounded-lg p-2 text-muted hover:text-red-400 transition-colors"
                            aria-label={`Remove ${lang.name}`}
                          >
                            <Trash2 size={14} strokeWidth={2} />
                          </button>
                        </>
                      )}
                    </div>
                  ))}
                </div>
                <button
                  onClick={() => {
                    setOpen(false)
                    setShowAddLanguage(true)
                  }}
                  className="mt-1 flex w-full items-center gap-1.5 rounded-lg border-t border-hairline px-2 pt-2 pb-1 text-sm font-semibold text-fabpink hover:bg-surfacehover transition-colors"
                >
                  <Plus size={15} strokeWidth={2.5} />
                  Add language
                </button>
              </div>
            </>
          )}
        </div>

        <div
          className={
            searchExpanded
              ? 'absolute inset-y-0 right-0 z-10 flex h-10 w-full items-center overflow-hidden rounded-full border-2 border-fabpink bg-surface shadow-lg shadow-fabpink/10 transition-[width] duration-300 ease-out'
              : 'relative flex h-10 w-11 shrink-0 items-center overflow-hidden rounded-full border-2 border-fabpink bg-surface shadow-lg shadow-fabpink/10 transition-[width] duration-300 ease-out'
          }
        >
          <button
            type="button"
            onClick={() => searchInputRef.current?.focus()}
            className="absolute inset-y-0 left-0 z-20 flex w-11 shrink-0 items-center justify-center"
            aria-label="Search"
          >
            <Search size={16} strokeWidth={2} className="text-fabpink" />
          </button>
          <input
            ref={searchInputRef}
            type="text"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            onFocus={() => {
              setSearchFocused(true)
              setOpen(false)
            }}
            onBlur={() => setSearchFocused(false)}
            placeholder="Search"
            className={`h-full w-full bg-transparent pl-11 pr-8 text-sm placeholder:text-muted outline-none transition-opacity duration-150 ${
              searchExpanded ? 'opacity-100' : 'pointer-events-none opacity-0'
            }`}
          />
          {search && searchExpanded && (
            <button
              type="button"
              onClick={() => {
                onSearchChange('')
                searchInputRef.current?.focus()
              }}
              className="absolute right-1.5 top-1/2 z-20 -translate-y-1/2 rounded-full p-1 text-muted hover:text-ink transition-colors"
              aria-label="Clear search"
            >
              <X size={14} strokeWidth={2} />
            </button>
          )}
        </div>
      </div>

      {menu}

      {showAddLanguage && (
        <AddLanguageModal
          languages={languages}
          activeLanguageId={activeLanguageId}
          getLanguagePhrases={getLanguagePhrases}
          onClose={() => setShowAddLanguage(false)}
          onSubmit={onAddLanguage}
        />
      )}
    </div>
  )
}
