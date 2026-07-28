import { useState } from 'react'
import { ChevronDown, Plus, Trash2 } from 'lucide-react'
import type { Language } from '../db/types'
import { DEFAULT_LANGUAGE_COLOR, nextAvailableColor } from '../lib/colorPalette'
import { AddLanguageModal } from './AddLanguageModal'
import { ColorSwatchBar } from './ColorSwatchBar'

interface Props {
  languages: Language[]
  activeLanguageId: number | null
  onSelect: (id: number) => void
  onAddLanguage: (name: string, code: string, color: string) => Promise<void>
  onRemoveLanguage: (id: number) => void
  onUpdateColor: (id: number, color: string) => Promise<void>
}

export function LanguageTabs({ languages, activeLanguageId, onSelect, onAddLanguage, onRemoveLanguage, onUpdateColor }: Props) {
  const [open, setOpen] = useState(false)
  const [showAddLanguage, setShowAddLanguage] = useState(false)
  const [confirmingRemoveId, setConfirmingRemoveId] = useState<number | null>(null)
  const [editingColorId, setEditingColorId] = useState<number | null>(null)

  const activeLanguage = languages.find((l) => l.id === activeLanguageId)
  const accent = activeLanguage?.color ?? DEFAULT_LANGUAGE_COLOR

  return (
    <div className="px-4 py-3 border-b border-hairline">
      <div className="relative">
        <button
          onClick={() => setOpen((v) => !v)}
          className="w-full flex items-center gap-2 rounded-lg border-2 px-3 py-2 text-sm font-semibold"
          style={{ borderColor: accent, color: accent }}
        >
          <span className="size-2.5 rounded-full shrink-0" style={{ backgroundColor: accent }} />
          <span className="flex-1 text-left truncate">{activeLanguage?.name ?? 'Select a language'}</span>
          <ChevronDown size={16} strokeWidth={2.5} />
        </button>

        {open && (
          <>
            <button className="fixed inset-0 z-40 cursor-default" onClick={() => setOpen(false)} aria-label="Close language menu" />
            <div className="absolute left-0 top-full z-50 mt-2 w-full rounded-xl border border-hairline bg-surface p-2 shadow-lg">
              <div className="flex flex-col gap-1 max-h-64 overflow-y-auto">
                {languages.map((lang) => (
                  <div key={lang.id} className="flex flex-col rounded-lg hover:bg-surfacehover">
                    <div className="flex items-center gap-1">
                      {confirmingRemoveId === lang.id ? (
                        <div className="flex flex-1 items-center justify-between gap-2 px-2 py-1.5">
                          <span className="text-xs text-ink">Remove {lang.name}?</span>
                          <div className="flex gap-1 shrink-0">
                            <button
                              onClick={() => {
                                onRemoveLanguage(lang.id)
                                setConfirmingRemoveId(null)
                              }}
                              className="rounded px-2 py-1 text-xs font-medium bg-red-600 text-white"
                            >
                              Remove
                            </button>
                            <button onClick={() => setConfirmingRemoveId(null)} className="rounded px-2 py-1 text-xs font-medium text-muted">
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <button
                            onClick={() => setEditingColorId((id) => (id === lang.id ? null : lang.id))}
                            className="shrink-0 rounded-lg p-2"
                            aria-label={`Change accent color for ${lang.name}`}
                            title="Change accent color"
                          >
                            <span className="size-2.5 rounded-full block" style={{ backgroundColor: lang.color }} />
                          </button>
                          <button
                            onClick={() => {
                              onSelect(lang.id)
                              setOpen(false)
                            }}
                            className="flex flex-1 items-center rounded-lg py-2 pr-2 text-sm text-left text-ink"
                          >
                            {lang.name}
                          </button>
                          {languages.length > 1 && (
                            <button
                              onClick={() => setConfirmingRemoveId(lang.id)}
                              className="shrink-0 rounded-lg p-2 text-muted hover:text-red-400"
                              aria-label={`Remove ${lang.name}`}
                            >
                              <Trash2 size={14} strokeWidth={2} />
                            </button>
                          )}
                        </>
                      )}
                    </div>
                    {editingColorId === lang.id && (
                      <div className="px-2 pb-2 pt-1">
                        <ColorSwatchBar
                          value={lang.color}
                          onChange={(color) => {
                            onUpdateColor(lang.id, color)
                            setEditingColorId(null)
                          }}
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
              <button
                onClick={() => {
                  setOpen(false)
                  setShowAddLanguage(true)
                }}
                className="mt-1 flex w-full items-center gap-1.5 rounded-lg border-t border-hairline px-2 pt-2 pb-1 text-sm"
                style={{ color: accent }}
              >
                <Plus size={15} strokeWidth={2.5} />
                Add language
              </button>
            </div>
          </>
        )}
      </div>

      {showAddLanguage && (
        <AddLanguageModal
          defaultColor={nextAvailableColor(languages.map((l) => l.color))}
          onClose={() => setShowAddLanguage(false)}
          onSubmit={onAddLanguage}
        />
      )}
    </div>
  )
}
