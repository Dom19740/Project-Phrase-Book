import { useState } from 'react'
import { ListFilter, Settings2, Star } from 'lucide-react'

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
        className="flex items-center gap-1.5 rounded-full border border-fabpink px-3 py-1.5 text-xs font-medium text-white"
      >
        <ListFilter size={14} strokeWidth={2} className="text-fabpink" />
        Categories
        {favoritesOnly && (
          <Star size={12} strokeWidth={2.5} fill="currentColor" className="text-fabpink" aria-hidden="true" />
        )}
        {hiddenCount > 0 && (
          <span className="rounded-full bg-fabpink text-white text-[10px] leading-none px-1.5 py-0.5">{hiddenCount} hidden</span>
        )}
      </button>

      {open && (
        <>
          <button className="fixed inset-0 z-40 cursor-default" onClick={() => setOpen(false)} aria-label="Close category filter" />
          <div className="absolute left-0 top-full z-50 mt-2 w-64 max-w-[80vw] rounded-2xl border border-hairline bg-surface p-3 shadow-xl">
            <label className="flex items-center gap-2 text-sm text-ink rounded-lg px-1.5 py-1">
              <input
                type="checkbox"
                checked={favoritesOnly}
                onChange={(e) => onToggleFavoritesOnly(e.target.checked)}
                className="size-4 accent-muted"
              />
              Favourites only
            </label>
            <label className="flex items-center gap-2 text-sm text-ink rounded-lg px-1.5 py-1 mb-1 border-b border-hairline pb-2">
              <input
                type="checkbox"
                checked={groupByCategoryOn}
                onChange={(e) => onToggleGroupByCategory(e.target.checked)}
                className="size-4 accent-muted"
              />
              Group by category
            </label>

            <div className="flex flex-col gap-1.5 max-h-64 overflow-y-auto">
              {allCategoryNames.map((name) => (
                <label key={name} className="flex items-center gap-2 text-sm text-ink rounded-lg px-1.5 py-1 hover:bg-surfacehover">
                  <input
                    type="checkbox"
                    checked={!hiddenCategories.has(name)}
                    onChange={(e) => onToggleCategoryVisible(name, e.target.checked)}
                    className="size-4 accent-muted"
                  />
                  {name}
                </label>
              ))}
            </div>
            <button
              onClick={() => {
                setOpen(false)
                onManageCategories()
              }}
              className="mt-2 flex w-full items-center gap-1.5 rounded-lg border-t border-hairline pt-2 text-xs text-muted hover:text-ink"
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
