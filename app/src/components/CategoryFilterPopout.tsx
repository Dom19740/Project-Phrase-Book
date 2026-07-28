import { useState } from 'react'
import { ListFilter, Settings2 } from 'lucide-react'

interface Props {
  allCategoryNames: string[]
  hiddenCategories: Set<string>
  onToggleCategoryVisible: (categoryName: string, visible: boolean) => void
  onManageCategories: () => void
  groupByCategoryOn: boolean
  onToggleGroupByCategory: (on: boolean) => void
}

export function CategoryFilterPopout({
  allCategoryNames,
  hiddenCategories,
  onToggleCategoryVisible,
  onManageCategories,
  groupByCategoryOn,
  onToggleGroupByCategory,
}: Props) {
  const [open, setOpen] = useState(false)
  const hiddenCount = hiddenCategories.size

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 rounded-lg border border-neutral-300 dark:border-neutral-700 px-2.5 py-1.5 text-xs font-medium text-neutral-600 dark:text-neutral-300"
      >
        <ListFilter size={14} strokeWidth={2} />
        Categories
        {hiddenCount > 0 && (
          <span className="rounded-full bg-neutral-900 dark:bg-white dark:text-neutral-900 text-white text-[10px] leading-none px-1.5 py-0.5">
            {hiddenCount} hidden
          </span>
        )}
      </button>

      {open && (
        <>
          <button className="fixed inset-0 z-40 cursor-default" onClick={() => setOpen(false)} aria-label="Close category filter" />
          <div className="absolute left-0 top-full z-50 mt-2 w-64 max-w-[80vw] rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-3 shadow-lg">
            <label className="flex items-center gap-2 text-sm rounded-lg px-1.5 py-1 mb-1 border-b border-neutral-100 dark:border-neutral-800 pb-2">
              <input
                type="checkbox"
                checked={groupByCategoryOn}
                onChange={(e) => onToggleGroupByCategory(e.target.checked)}
                className="size-4 accent-current"
              />
              Group by category
            </label>

            <div className="flex flex-col gap-1.5 max-h-64 overflow-y-auto">
              {allCategoryNames.map((name) => (
                <label key={name} className="flex items-center gap-2 text-sm rounded-lg px-1.5 py-1 hover:bg-neutral-50 dark:hover:bg-neutral-800">
                  <input
                    type="checkbox"
                    checked={!hiddenCategories.has(name)}
                    onChange={(e) => onToggleCategoryVisible(name, e.target.checked)}
                    className="size-4 accent-current"
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
              className="mt-2 flex w-full items-center gap-1.5 rounded-lg border-t border-neutral-100 dark:border-neutral-800 pt-2 text-xs text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100"
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
