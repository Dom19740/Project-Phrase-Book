import { useState } from 'react'
import { Settings2, Star, Tag } from 'lucide-react'
import { pillClass } from '../lib/pillStyles'

interface Props {
  allCategoryNames: string[]
  hiddenCategories: Set<string>
  onToggleCategoryVisible: (categoryName: string, visible: boolean) => void
  onManageCategories: () => void
  groupByCategoryOn: boolean
  onToggleGroupByCategory: (on: boolean) => void
  favoritesOnly: boolean
  onToggleFavoritesOnly: (on: boolean) => void
}

export function CategoryFilterPopout({
  allCategoryNames,
  hiddenCategories,
  onToggleCategoryVisible,
  onManageCategories,
  groupByCategoryOn,
  onToggleGroupByCategory,
  favoritesOnly,
  onToggleFavoritesOnly,
}: Props) {
  const [open, setOpen] = useState(false)
  const hiddenCount = hiddenCategories.size

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 rounded-full bg-fabpink px-3 py-1.5 text-[11px] font-extrabold uppercase tracking-wider text-onaccent shadow-lg shadow-fabpink/20 active:scale-95 transition-all"
      >
        <Tag size={14} strokeWidth={2} className="text-onaccent" />
        Categories
        {favoritesOnly && (
          <Star size={12} strokeWidth={2.5} fill="currentColor" className="text-onaccent" aria-hidden="true" />
        )}
        {hiddenCount > 0 && (
          <span className="rounded-full bg-white/20 border border-white/30 text-onaccent text-[10px] font-bold uppercase tracking-wider leading-none px-1.5 py-0.5">
            {hiddenCount} hidden
          </span>
        )}
      </button>

      {open && (
        <>
          <button className="fixed inset-0 z-40 cursor-default" onClick={() => setOpen(false)} aria-label="Close category filter" />
          <div className="absolute left-0 top-full z-50 mt-2 w-64 max-w-[80vw] rounded-2xl border border-hairline bg-surface p-3 shadow-xl">
            <button
              type="button"
              role="checkbox"
              aria-checked={favoritesOnly}
              onClick={() => onToggleFavoritesOnly(!favoritesOnly)}
              className="flex w-full items-center gap-2 rounded-lg px-1.5 py-1 text-left text-sm text-ink hover:bg-surfacehover transition-colors"
            >
              <span
                aria-hidden="true"
                className={`size-4 shrink-0 rounded-full border transition-colors ${favoritesOnly ? 'bg-fabpink border-fabpink' : 'border-fabpink/40'}`}
              />
              Favorites only
            </button>
            <button
              type="button"
              role="checkbox"
              aria-checked={groupByCategoryOn}
              onClick={() => onToggleGroupByCategory(!groupByCategoryOn)}
              className="flex w-full items-center gap-2 rounded-lg px-1.5 py-1 mb-1 border-b border-hairline pb-2 text-left text-sm text-ink hover:bg-surfacehover transition-colors"
            >
              <span
                aria-hidden="true"
                className={`size-4 shrink-0 rounded-full border transition-colors ${groupByCategoryOn ? 'bg-fabpink border-fabpink' : 'border-fabpink/40'}`}
              />
              Group by category
            </button>

            <div className="flex flex-wrap gap-1.5 max-h-64 overflow-y-auto">
              {allCategoryNames.map((name) => {
                const visible = !hiddenCategories.has(name)
                return (
                  <button
                    key={name}
                    type="button"
                    onClick={() => onToggleCategoryVisible(name, !visible)}
                    aria-pressed={visible}
                    className={`${pillClass(visible)} active:scale-95`}
                  >
                    {name}
                  </button>
                )
              })}
            </div>
            <button
              onClick={() => {
                setOpen(false)
                onManageCategories()
              }}
              className="mt-2 flex w-full items-center gap-1.5 rounded-lg border-t border-hairline pt-2 text-xs text-muted hover:text-ink transition-colors"
            >
              <Settings2 size={13} strokeWidth={2} />
              Manage categories
            </button>
          </div>
        </>
      )}
    </div>
  )
}
