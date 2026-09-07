import { useState } from 'react'
import { Check, Copy, Star, StarOff, Tag, Trash2, XCircle } from 'lucide-react'
import type { Category, Language } from '../db/types'
import { getLanguageFlag } from '../lib/languageFlags'
import { PopoutSelect } from './PopoutSelect'

const NEW_CATEGORY = '__new__'

const PILL_BASE =
  'flex items-center gap-1 rounded-full border px-2.5 py-1.5 text-[11px] font-extrabold uppercase tracking-wider transition-all active:scale-95 disabled:opacity-40 disabled:active:scale-100'

function pillClass(active: boolean) {
  return `${PILL_BASE} ${
    active
      ? 'border-fabpink bg-fabpink text-onaccent shadow-lg shadow-fabpink/20'
      : 'border-hairline text-muted hover:bg-surfacehover disabled:hover:bg-transparent'
  }`
}

interface Props {
  selectedCount: number
  languageName: string
  currentLanguageId: number
  languages: Language[]
  categories: Category[]
  onMarkLearned: (learned: boolean) => Promise<void>
  onMarkFavorite: (favorite: boolean) => Promise<void>
  onChangeCategory: (categoryName: string | null) => Promise<void>
  onCopyToLanguages: (targetLanguageIds: number[]) => Promise<void>
  onDeleteOneLanguage: () => Promise<void>
  onDeleteAllLanguages: () => Promise<void>
  onDone: () => void
}

type Panel = null | 'category' | 'copy' | 'delete'

export function BulkActionBar({
  selectedCount,
  languageName,
  currentLanguageId,
  languages,
  categories,
  onMarkLearned,
  onMarkFavorite,
  onChangeCategory,
  onCopyToLanguages,
  onDeleteOneLanguage,
  onDeleteAllLanguages,
  onDone,
}: Props) {
  const [panel, setPanel] = useState<Panel>(null)
  const [categoryChoice, setCategoryChoice] = useState('')
  const [newCategory, setNewCategory] = useState('')
  const [copyTargetIds, setCopyTargetIds] = useState<Set<number>>(new Set())
  const [deleteScope, setDeleteScope] = useState<'language' | 'all' | null>(null)
  const [learnedChoice, setLearnedChoice] = useState<boolean | null>(null)
  const [favoriteChoice, setFavoriteChoice] = useState<boolean | null>(null)
  const [busy, setBusy] = useState(false)

  function toggleDeletePanel() {
    setPanel((p) => (p === 'delete' ? null : 'delete'))
    setDeleteScope(null)
  }

  const otherLanguages = languages.filter((l) => l.id !== currentLanguageId)

  function toggleCopyTarget(id: number) {
    setCopyTargetIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  async function applyCopy() {
    if (copyTargetIds.size === 0) return
    setBusy(true)
    await onCopyToLanguages([...copyTargetIds])
    setBusy(false)
    setCopyTargetIds(new Set())
    setPanel(null)
  }

  async function applyCategory() {
    setBusy(true)
    const categoryName = categoryChoice === NEW_CATEGORY ? newCategory.trim() : categoryChoice || null
    await onChangeCategory(categoryName)
    setBusy(false)
    setPanel(null)
  }

  return (
    <div className="shrink-0 border-b border-hairline bg-surface px-4 py-3">
      <div className="relative flex flex-col gap-1.5">
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            onClick={() => setPanel(panel === 'category' ? null : 'category')}
            disabled={selectedCount === 0}
            className={pillClass(panel === 'category')}
          >
            <Tag size={13} strokeWidth={2} />
            Category
          </button>
          <button
            onClick={() => {
              onMarkLearned(true)
              setLearnedChoice(true)
            }}
            disabled={selectedCount === 0}
            className={pillClass(learnedChoice === true)}
          >
            <Check size={13} strokeWidth={2} />
            Learnt
          </button>
          <button
            onClick={() => {
              onMarkLearned(false)
              setLearnedChoice(false)
            }}
            disabled={selectedCount === 0}
            className={pillClass(learnedChoice === false)}
          >
            <XCircle size={13} strokeWidth={2} />
            Unlearn
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <button
            onClick={() => {
              onMarkFavorite(true)
              setFavoriteChoice(true)
            }}
            disabled={selectedCount === 0}
            className={pillClass(favoriteChoice === true)}
          >
            <Star size={13} strokeWidth={2} />
            Favorite
          </button>
          <button
            onClick={() => {
              onMarkFavorite(false)
              setFavoriteChoice(false)
            }}
            disabled={selectedCount === 0}
            className={pillClass(favoriteChoice === false)}
          >
            <StarOff size={13} strokeWidth={2} />
            Unfavorite
          </button>
          <button
            onClick={() => setPanel(panel === 'copy' ? null : 'copy')}
            disabled={selectedCount === 0}
            className={pillClass(panel === 'copy')}
          >
            <Copy size={13} strokeWidth={2} />
            Copy to...
          </button>
        </div>

        <div className="flex items-center justify-between gap-2">
          <span className="text-sm font-medium text-ink">{selectedCount} selected</span>
          <div className="flex items-center gap-1.5">
            <button
              onClick={toggleDeletePanel}
              disabled={selectedCount === 0}
              aria-label="Delete"
              title="Delete"
              className={
                panel === 'delete' ? pillClass(true) : `${PILL_BASE} border-fabpink text-fabpink hover:bg-surfacehover`
              }
            >
              <Trash2 size={13} strokeWidth={2} />
            </button>
            <button
              onClick={onDone}
              className="rounded-full bg-fabpink px-3.5 py-1.5 text-[11px] font-extrabold uppercase tracking-wider text-onaccent shadow-lg shadow-fabpink/20 active:scale-95 transition-all"
            >
              Done
            </button>
          </div>
        </div>

        {panel != null && (
          <>
            <button className="fixed inset-0 z-40 cursor-default" onClick={() => setPanel(null)} aria-label="Close popup" />
            <div className="absolute left-0 right-0 top-full z-50 mt-2 rounded-2xl border border-hairline bg-surface p-3 shadow-xl">
              {panel === 'category' && (
                <>
                  <PopoutSelect
                    className="w-full mb-2"
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
                      placeholder="New category name"
                      className="w-full mb-2 rounded-xl border-2 border-hairline bg-transparent text-ink px-2 py-1.5 text-sm outline-none focus:border-fabpink transition-all"
                    />
                  )}
                  <button
                    onClick={applyCategory}
                    disabled={busy || (categoryChoice === NEW_CATEGORY && !newCategory.trim())}
                    className="w-full rounded-full bg-fabpink px-3.5 py-1.5 text-sm font-medium text-onaccent shadow-lg shadow-fabpink/20 active:scale-95 disabled:active:scale-100 transition-all disabled:opacity-40"
                  >
                    Apply
                  </button>
                </>
              )}

              {panel === 'copy' &&
                (otherLanguages.length === 0 ? (
                  <p className="text-sm text-muted">Add another language first to copy phrases into it.</p>
                ) : (
                  <>
                    <p className="text-sm text-muted mb-2">Copy {selectedCount} phrase(s) into:</p>
                    <div className="flex flex-col gap-1 max-h-40 overflow-y-auto mb-2">
                      {otherLanguages.map((lang) => {
                        const checked = copyTargetIds.has(lang.id)
                        return (
                          <button
                            key={lang.id}
                            type="button"
                            role="checkbox"
                            aria-checked={checked}
                            onClick={() => toggleCopyTarget(lang.id)}
                            className="flex w-full items-center gap-2 rounded-lg px-1.5 py-1 text-left text-sm text-ink hover:bg-surfacehover transition-colors"
                          >
                            <span
                              aria-hidden="true"
                              className={`size-4 shrink-0 rounded-full border-2 transition-colors ${checked ? 'bg-fabpink border-fabpink' : 'border-fabpink/60'}`}
                            />
                            <span aria-hidden="true">{getLanguageFlag(lang.code)}</span>
                            {lang.name}
                          </button>
                        )
                      })}
                    </div>
                    <button
                      onClick={applyCopy}
                      disabled={busy || copyTargetIds.size === 0}
                      className="w-full rounded-full bg-fabpink px-3.5 py-1.5 text-sm font-medium text-onaccent shadow-lg shadow-fabpink/20 active:scale-95 transition-all disabled:opacity-40"
                    >
                      Copy
                    </button>
                  </>
                ))}

              {panel === 'delete' &&
                (deleteScope == null ? (
                  <>
                    <p className="text-sm text-muted mb-2">
                      Delete {selectedCount} phrase(s) from {languageName} only, or from every language?
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setDeleteScope('language')}
                        className="flex-1 rounded-full border border-hairline px-3 py-1.5 text-sm font-medium text-muted hover:bg-surfacehover active:scale-95 transition-all"
                      >
                        {languageName} only
                      </button>
                      <button
                        onClick={() => setDeleteScope('all')}
                        className="flex-1 rounded-full bg-fabpink px-3 py-1.5 text-sm font-medium text-onaccent shadow-lg shadow-fabpink/20 active:scale-95 transition-all"
                      >
                        All languages
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <p className="text-sm text-muted mb-2">
                      Permanently delete {selectedCount} phrase(s) {deleteScope === 'language' ? `from ${languageName}` : 'from every language'}?
                      This can't be undone.
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setDeleteScope(null)}
                        disabled={busy}
                        className="flex-1 rounded-full border border-hairline px-3 py-1.5 text-sm font-medium text-ink hover:bg-surfacehover active:scale-95 transition-all disabled:opacity-40"
                      >
                        Back
                      </button>
                      <button
                        onClick={async () => {
                          setBusy(true)
                          if (deleteScope === 'language') await onDeleteOneLanguage()
                          else await onDeleteAllLanguages()
                          setBusy(false)
                          setDeleteScope(null)
                          setPanel(null)
                        }}
                        disabled={busy}
                        className="flex-1 rounded-full bg-fabpink px-3 py-1.5 text-sm font-medium text-onaccent shadow-lg shadow-fabpink/20 active:scale-95 transition-all disabled:opacity-40"
                      >
                        Delete
                      </button>
                    </div>
                  </>
                ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
