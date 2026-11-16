import { usePersistedState } from '../lib/usePersistedState'
import { ChevronDown, ChevronRight, Settings2, Tag } from 'lucide-react'
import { pillClass } from '../lib/pillStyles'

interface Props {
  allCategoryNames: string[]
  hiddenCategories: Set<string>
  onToggleCategoryVisible: (categoryName: string, visible: boolean) => void
  onManageCategories: () => void
  groupByCategoryOn: boolean
  onToggleGroupByCategory: (on: boolean) => void
  removeFavoriteOnLearn: boolean
  onToggleRemoveFavoriteOnLearn: (on: boolean) => void
}

export function CategoryFilterPopout({
  allCategoryNames,
  hiddenCategories,
  onToggleCategoryVisible,
  onManageCategories,
  groupByCategoryOn,
  onToggleGroupByCategory,
  removeFavoriteOnLearn,
  onToggleRemoveFavoriteOnLearn,
}: Props) {
  const hiddenCount = hiddenCategories.size
  const [categoriesExpanded, setCategoriesExpanded] = usePersistedState('phrasebook-categories-section-expanded', false)

  return (
    <div className="flex flex-col gap-1.5">
      <button
        type="button"
        aria-expanded={categoriesExpanded}
        onClick={() => setCategoriesExpanded((expanded) => !expanded)}
        className="flex w-full items-center gap-1.5 border-t border-hairline px-2.5 pt-2 text-left"
      >
        {categoriesExpanded ? <ChevronDown size={14} strokeWidth={2} className="text-fabpink" /> : <ChevronRight size={14} strokeWidth={2} className="text-fabpink" />}
        <Tag size={14} strokeWidth={2} className="text-fabpink" />
        <span className="text-[11px] font-extrabold uppercase tracking-wider text-fabpink">Categories</span>
        {hiddenCount > 0 && (
          <span className="rounded-full border border-fabpink/30 bg-fabpink/10 px-1.5 py-0.5 text-[10px] font-bold uppercase leading-none tracking-wider text-fabpink">
            {hiddenCount} hidden
          </span>
        )}
      </button>
      <div className="menu-panel-reveal" data-open={categoriesExpanded} aria-hidden={!categoriesExpanded}>
        <div className="min-h-0 overflow-hidden">
          <div className="flex flex-col gap-0.5">
            <div className="flex flex-wrap items-center gap-1.5 px-2.5 py-1">
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
              <button
                type="button"
                onClick={onManageCategories}
                aria-label="Manage categories"
                title="Manage categories"
                className="flex size-8 shrink-0 items-center justify-center rounded-full border-2 border-fabpink text-fabpink transition-colors hover:bg-fabpink/10 active:scale-95"
              >
                <Settings2 size={14} strokeWidth={2} />
              </button>
            </div>
            <div className="flex flex-col gap-1 px-2.5">
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                <button
                  type="button"
                  role="checkbox"
                  aria-checked={groupByCategoryOn}
                  onClick={() => onToggleGroupByCategory(!groupByCategoryOn)}
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-lg py-1.5 text-left text-xs text-ink transition-colors hover:bg-surfacehover"
                >
                  <span
                    aria-hidden="true"
                    className={`size-3.5 shrink-0 rounded-full border-2 border-fabpink transition-colors ${groupByCategoryOn ? 'bg-fabpink' : ''}`}
                  />
                  <span>Group by category</span>
                </button>
              </div>
              <button
                type="button"
                role="checkbox"
                aria-checked={removeFavoriteOnLearn}
                onClick={() => onToggleRemoveFavoriteOnLearn(!removeFavoriteOnLearn)}
                className="inline-flex shrink-0 items-center gap-1.5 self-start rounded-lg py-1.5 text-left text-xs text-ink transition-colors hover:bg-surfacehover"
              >
                <span
                  aria-hidden="true"
                  className={`size-3.5 shrink-0 rounded-full border-2 border-fabpink transition-colors ${removeFavoriteOnLearn ? 'bg-fabpink' : ''}`}
                />
                <span>Remove learnt from favorites</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
