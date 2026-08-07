import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import type { Category, Language } from '../db/types'
import { PopoutSelect } from './PopoutSelect'

const NEW_CATEGORY = '__new__'

interface Props {
  categories: Category[]
  languages: Language[]
  onClose: () => void
  onSubmit: (english: string, categoryName: string | null, languageIds: number[]) => Promise<void>
}

export function AddPhraseModal({ categories, languages, onClose, onSubmit }: Props) {
  const [english, setEnglish] = useState('')
  const [categoryChoice, setCategoryChoice] = useState('')
  const [newCategory, setNewCategory] = useState('')
  const [saving, setSaving] = useState(false)
  const [selectedLanguageIds, setSelectedLanguageIds] = useState<Set<number>>(() => new Set(languages.map((l) => l.id)))
  const [languagesOpen, setLanguagesOpen] = useState(false)

  const canSubmit = english.trim().length > 0 && (categoryChoice !== NEW_CATEGORY || newCategory.trim().length > 0)

  function toggleLanguage(id: number) {
    setSelectedLanguageIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const allSelected = selectedLanguageIds.size === languages.length
  const languagesLabel = allSelected
    ? 'All languages'
    : selectedLanguageIds.size === 0
      ? 'None (add blank only)'
      : `${selectedLanguageIds.size} of ${languages.length} languages`

  async function handleSubmit() {
    if (!canSubmit) return
    setSaving(true)
    const categoryName = categoryChoice === NEW_CATEGORY ? newCategory.trim() : categoryChoice || null
    await onSubmit(english.trim(), categoryName, [...selectedLanguageIds])
    setSaving(false)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 pt-16 pb-[var(--safe-area-inset-bottom,0px)] sm:pt-24" onClick={onClose}>
      <div className="w-full sm:max-w-md rounded-2xl border border-hairline bg-surface p-5 shadow-2xl mx-4 sm:mx-0" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-semibold mb-4 text-ink">Add phrase</h2>

        <label className="block text-sm font-medium mb-1 text-ink">English</label>
        <input
          autoFocus
          value={english}
          onChange={(e) => setEnglish(e.target.value)}
          className="w-full mb-3 rounded-xl border border-hairline bg-transparent text-ink px-3 py-2"
          placeholder="e.g. Where is the bathroom?"
        />

        <label className="block text-sm font-medium mb-1 text-ink">Category</label>
        <PopoutSelect
          className="mb-3 w-full"
          align="left"
          value={categoryChoice}
          onChange={setCategoryChoice}
          options={[
            { value: '', label: 'Uncategorized' },
            ...categories.map((c) => ({ value: c.name, label: c.name })),
            { value: NEW_CATEGORY, label: '+ New category...' },
          ]}
        />

        {categoryChoice === NEW_CATEGORY && (
          <input
            autoFocus
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value)}
            className="w-full mb-3 rounded-xl border border-hairline bg-transparent text-ink px-3 py-2"
            placeholder="New category name"
          />
        )}

        <label className="block text-sm font-medium mb-1 text-ink">Translate into</label>
        <div className="relative mb-1">
          <button
            type="button"
            onClick={() => setLanguagesOpen((v) => !v)}
            className="flex w-full items-center gap-1.5 rounded-xl border border-hairline bg-surface px-3 py-2 text-sm text-ink"
          >
            <span className="flex-1 text-left truncate">{languagesLabel}</span>
            <ChevronDown size={14} strokeWidth={2} className="shrink-0 text-muted" />
          </button>

          {languagesOpen && (
            <>
              <button className="fixed inset-0 z-40 cursor-default" onClick={() => setLanguagesOpen(false)} aria-label="Close language selector" />
              <div className="absolute left-0 top-full z-50 mt-2 w-full rounded-2xl border border-hairline bg-surface p-3 shadow-xl">
                <label className="flex items-center gap-2 text-sm text-ink rounded-lg px-1.5 py-1 mb-1 border-b border-hairline pb-2">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={(e) => setSelectedLanguageIds(e.target.checked ? new Set(languages.map((l) => l.id)) : new Set())}
                    className="size-4 accent-current"
                  />
                  All languages
                </label>
                <div className="flex flex-col gap-1.5 max-h-48 overflow-y-auto">
                  {languages.map((lang) => (
                    <label key={lang.id} className="flex items-center gap-2 text-sm text-ink rounded-lg px-1.5 py-1 hover:bg-surfacehover">
                      <input
                        type="checkbox"
                        checked={selectedLanguageIds.has(lang.id)}
                        onChange={() => toggleLanguage(lang.id)}
                        className="size-4"
                        style={{ accentColor: lang.color }}
                      />
                      {lang.name}
                    </label>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
        <p className="text-xs text-muted mb-4">
          Every tracked language still gets a row (blank until translated) — this only picks which ones get an automatic translation now.
        </p>

        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="rounded-full px-4 py-2 text-sm font-medium text-muted">
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!canSubmit || saving}
            className="rounded-full bg-fabpink px-5 py-2 text-sm font-medium text-white shadow-sm disabled:opacity-40"
          >
            {saving ? 'Saving...' : 'Add phrase'}
          </button>
        </div>
      </div>
    </div>
  )
}
