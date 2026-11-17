import { Settings2 } from 'lucide-react'
import { pillClass } from '../lib/pillStyles'

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
  return (
    <div className="flex flex-col gap-0.5">
      <div className="flex flex-wrap items-center gap-1.5 pb-2">
        {/* Same slot (size-8 circle, top-left) the back button lands in when this swaps for
            ManageCategoriesPanel, so opening/closing that panel reads as the one icon flipping
            in place rather than the layout jumping around. */}
        <button
          type="button"
          onClick={onManageCategories}
          aria-label="Manage categories"
          title="Manage categories"
          className="flex size-8 shrink-0 items-center justify-center rounded-full border-2 border-fabpink text-fabpink transition-colors hover:bg-fabpink/10 active:scale-95"
        >
          <Settings2 size={14} strokeWidth={2} />
        </button>
        {allCategoryNames.map((name) => {
          const visible = !hiddenCategories.has(name)
          return (
            <button
              key={name}
              type="button"
              onClick={() => onToggleCategoryVisible(name, !visible)}
              aria-pressed={visible}
              className={`${pillClass(visible, 'accent')} active:scale-95`}
            >
              {name}
            </button>
          )
        })}
      </div>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 px-0.5">
        <button
          type="button"
          role="checkbox"
          aria-checked={groupByCategoryOn}
          onClick={() => onToggleGroupByCategory(!groupByCategoryOn)}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-lg py-1.5 text-left text-sm text-ink transition-colors hover:bg-surfacehover"
        >
          <span
            aria-hidden="true"
            className={`size-3.5 shrink-0 rounded-full border-2 border-fabpink transition-colors ${groupByCategoryOn ? 'bg-fabpink' : ''}`}
          />
          <span>Group by category</span>
        </button>
      </div>
    </div>
  )
}
