import { useEffect, useMemo, useRef, useState, type Dispatch, type ReactNode, type SetStateAction } from 'react'
import {
  ArrowDown,
  ArrowDownAZ,
  ArrowUp,
  ArrowUpZA,
  Check,
  ChevronDown,
  ChevronRight,
  Clock,
  Eye,
  GraduationCap,
  GripVertical,
  ListChecks,
  ListFilter,
  Star,
  Tag,
  X,
} from 'lucide-react'
import type { Category, Language, PhraseListItem } from '../db/types'
import { pillClass } from '../lib/pillStyles'
import { usePersistedState } from '../lib/usePersistedState'
import { syncWidgetSortMode } from '../lib/widgetRefresh'
import { BulkActionBar } from './BulkActionBar'
import { CategoryFilterPopout } from './CategoryFilterPopout'
import { DragReorderList } from './DragReorderList'
import { ManageCategoriesPanel } from './ManageCategoriesPanel'
import { PhraseRow } from './PhraseRow'

interface Props {
  phrases: PhraseListItem[]
  languageCode: string
  languageName: string
  activeLanguageId: number
  languages: Language[]
  translating?: boolean
  showPhonetics: boolean
  generatingPhonetics?: boolean
  phoneticsError?: string | null
  onGeneratePhonetics: () => Promise<void>
  categories: Category[]
  search: string
  onToggleLearned: (id: number, learned: boolean) => void
  onReorder: (orderedTranslationIds: number[]) => Promise<void>
  onToggleFavorite: (id: number, favorite: boolean) => void
  onEdit: (phrase: PhraseListItem) => void
  onSelectionModeChange?: (active: boolean) => void
  onBulkMarkLearned: (translationIds: number[], learned: boolean) => Promise<void>
  onBulkMarkFavorite: (translationIds: number[], favorite: boolean) => Promise<void>
  onBulkDeleteOneLanguage: (translationIds: number[]) => Promise<void>
  onBulkDeleteAllLanguages: (phraseConceptIds: number[]) => Promise<void>
  onBulkChangeCategory: (phraseConceptIds: number[], categoryName: string | null) => Promise<void>
  onBulkCopyToLanguages: (phraseConceptIds: number[], targetLanguageIds: number[]) => Promise<void>
  onCreateCategory: (name: string) => Promise<void>
  onRenameCategory: (categoryId: number, newName: string) => Promise<void>
  onDeleteCategory: (categoryId: number) => Promise<void>
  onReorderCategories: (orderedCategoryIds: number[]) => Promise<void>
  removeFavoriteOnLearn: boolean
  onToggleRemoveFavoriteOnLearn: (value: boolean) => void
  /** False collapses the whole toolbar (View/Bulk/Sort bar) above the list, driven by the header's hide-chrome toggle. */
  chromeVisible?: boolean
}

interface Group {
  categoryName: string
  items: PhraseListItem[]
}

type SortMode = 'english-asc' | 'english-desc' | 'translation-asc' | 'translation-desc' | 'date-desc' | 'date-asc' | 'custom'

const SORT_ICON_BOX = 'inline-flex w-4 h-4 shrink-0 items-center justify-center'

/** Shared look for the View/Sort/Categories/Bulk trigger pills on the toolbar's two rows - each
 * pair fills its row via flex-1 so both pills are always the same, even width. */
function triggerPillClass(active: boolean): string {
  const base =
    'flex h-8 flex-1 items-center justify-center gap-1.5 rounded-full border-2 border-fabpink px-2.5 text-[11px] font-extrabold uppercase tracking-wider active:scale-95 transition-all'
  return active ? `${base} bg-fabpink text-onaccent shadow-lg shadow-fabpink/20` : `${base} bg-transparent text-fabpink`
}

function SortIcon({ mode }: { mode: SortMode }) {
  return (
    <span className={`${SORT_ICON_BOX} shrink-0`}>
      {mode.startsWith('english') ? (
        <span className="text-xs font-semibold leading-none">EN</span>
      ) : mode.startsWith('date') ? (
        <Clock size={14} strokeWidth={2} />
      ) : mode === 'custom' ? (
        <GripVertical size={14} strokeWidth={2} />
      ) : (
        <span className="text-sm font-semibold leading-none" aria-hidden="true">文</span>
      )}
    </span>
  )
}

function SortDirectionIcon({ mode }: { mode: SortMode }) {
  if (mode === 'custom') return null
  const asc = mode.endsWith('asc')
  return (
    <span className={SORT_ICON_BOX}>
      {mode.startsWith('date') ? (
        asc ? (
          <ArrowUp size={14} strokeWidth={2} />
        ) : (
          <ArrowDown size={14} strokeWidth={2} />
        )
      ) : asc ? (
        <ArrowDownAZ size={14} strokeWidth={2} />
      ) : (
        <ArrowUpZA size={14} strokeWidth={2} />
      )}
    </span>
  )
}

const SORT_OPTION_LABELS: { value: SortMode; label: string }[] = [
  { value: 'english-asc', label: 'English A>Z' },
  { value: 'english-desc', label: 'English Z>A' },
  { value: 'translation-asc', label: 'Translation A>Z' },
  { value: 'translation-desc', label: 'Translation Z>A' },
  { value: 'date-desc', label: 'Newest added' },
  { value: 'date-asc', label: 'Oldest added' },
  { value: 'custom', label: 'Custom order' },
]

const SORT_OPTIONS: { value: SortMode; label: string; shortLabel: ReactNode }[] = SORT_OPTION_LABELS.map((opt) => ({
  ...opt,
  // Every other option is a self-explanatory icon pair (EN/translation flag + direction arrow) -
  // "custom" has no such shorthand, so it gets a plain text label instead of a lone grip icon.
  shortLabel:
    opt.value === 'custom' ? (
      <>
        <SortIcon mode={opt.value} />
        Custom
      </>
    ) : (
      <>
        <SortIcon mode={opt.value} />
        <SortDirectionIcon mode={opt.value} />
      </>
    ),
}))

function sortKey(item: PhraseListItem, mode: SortMode, showPhonetics: boolean): string {
  return mode.startsWith('translation') ? (showPhonetics ? item.phonetic || item.text : item.text) : item.english
}

function sortItems(items: PhraseListItem[], mode: SortMode, showPhonetics: boolean): PhraseListItem[] {
  const dir = mode.endsWith('asc') ? 1 : -1
  return [...items].sort((a, b) => {
    if (a.favorite !== b.favorite) return a.favorite ? -1 : 1
    if (mode === 'custom') return a.sortOrder - b.sortOrder
    // Phrase concept ids are assigned in insertion order, so they double as a "date added" sort
    // without needing a dedicated timestamp column.
    if (mode.startsWith('date')) return dir * (a.phraseConceptId - b.phraseConceptId)
    return dir * sortKey(a, mode, showPhonetics).localeCompare(sortKey(b, mode, showPhonetics))
  })
}

type LearnedFilter = 'unlearned' | 'learned' | 'all' | 'favorites'

const VIEW_FILTER_ORDER: LearnedFilter[] = ['all', 'favorites', 'unlearned', 'learned']
const LEARNED_FILTER_LABEL: Record<LearnedFilter, string> = { unlearned: 'Not Learnt', learned: 'Learnt', all: 'All', favorites: 'Favorites' }

function LearnedFilterIcon({ filter }: { filter: LearnedFilter }) {
  switch (filter) {
    case 'unlearned':
      return <GraduationCap size={13} strokeWidth={2} />
    case 'learned':
      return <Check size={13} strokeWidth={2} />
    case 'favorites':
      return <Star size={13} strokeWidth={2} />
    case 'all':
      return <Eye size={13} strokeWidth={2} />
  }
}

function groupByCategory(items: PhraseListItem[], mode: SortMode, categoryOrderIndex: Map<string, number>, showPhonetics: boolean): Group[] {
  const map = new Map<string, PhraseListItem[]>()
  for (const item of items) {
    const key = item.categoryName ?? 'Uncategorized'
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(item)
  }
  return [...map.entries()]
    .sort(([a], [b]) => {
      const ia = categoryOrderIndex.get(a) ?? Infinity
      const ib = categoryOrderIndex.get(b) ?? Infinity
      return ia !== ib ? ia - ib : a.localeCompare(b)
    })
    .map(([categoryName, groupItems]) => ({ categoryName, items: sortItems(groupItems, mode, showPhonetics) }))
}

export function PhraseList({
  phrases,
  languageCode,
  languageName,
  activeLanguageId,
  languages,
  translating = false,
  showPhonetics,
  generatingPhonetics = false,
  phoneticsError = null,
  onGeneratePhonetics,
  categories,
  search,
  onToggleLearned,
  onToggleFavorite,
  onReorder,
  onEdit,
  onSelectionModeChange,
  onBulkMarkLearned,
  onBulkMarkFavorite,
  onBulkDeleteOneLanguage,
  onBulkDeleteAllLanguages,
  onBulkChangeCategory,
  onBulkCopyToLanguages,
  onCreateCategory,
  onRenameCategory,
  onDeleteCategory,
  onReorderCategories,
  removeFavoriteOnLearn,
  onToggleRemoveFavoriteOnLearn,
  chromeVisible = true,
}: Props) {
  const [sortMode, setSortMode] = usePersistedState<SortMode>('phrasebook-sort-mode', 'english-asc')
  const [groupByCategoryOn, setGroupByCategoryOn] = usePersistedState('phrasebook-group-by-category', true)
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})
  const [secondaryCollapsed, setSecondaryCollapsed] = useState<Record<string, boolean>>({})
  const [learnedFilter, setLearnedFilter] = usePersistedState<LearnedFilter>('phrasebook-learned-filter', 'unlearned')
  const [primaryExpanded, setPrimaryExpanded] = useState(true)
  const [secondaryExpanded, setSecondaryExpanded] = useState(false)
  const phoneticsEnabled = languages.find((language) => language.id === activeLanguageId)?.phoneticsEnabled ?? false
  const displayPhonetics = phoneticsEnabled && showPhonetics
  const [hiddenCategoryList, setHiddenCategoryList] = usePersistedState<string[]>('phrasebook-hidden-categories', [])
  const hiddenCategories = useMemo(() => new Set(hiddenCategoryList), [hiddenCategoryList])
  const [showManageCategories, setShowManageCategories] = useState(false)
  const [activePanel, setActivePanel] = useState<'sort' | 'categories' | null>(null)
  const [selectionMode, setSelectionMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  const toolbarRef = useRef<HTMLDivElement>(null)
  const sortPanelRef = useRef<HTMLDivElement>(null)
  const bulkTriggerRef = useRef<HTMLButtonElement>(null)
  const bulkPanelRef = useRef<HTMLDivElement>(null)
  const phraseRowsRef = useRef<HTMLDivElement>(null)

  // Switching language tabs swaps the list contents but the shared scroll container keeps
  // whatever scrollTop the previous language's list left it at - scroll back to the top so the
  // view (and the onScroll-driven header-collapse state) actually matches the new list.
  useEffect(() => {
    phraseRowsRef.current?.scrollTo({ top: 0 })
  }, [activeLanguageId])

  useEffect(() => {
    onSelectionModeChange?.(selectionMode)
  }, [selectionMode, onSelectionModeChange])

  useEffect(() => {
    syncWidgetSortMode(sortMode)
  }, [sortMode])

  // Whenever the categories panel closes (by any route - toggling it shut, switching to another
  // pill, or clicking outside), fall back to the main category list so reopening it always lands
  // there instead of picking back up wherever Manage categories was left.
  useEffect(() => {
    if (activePanel !== 'categories') setShowManageCategories(false)
  }, [activePanel])

  useEffect(() => {
    if (!activePanel && !selectionMode) return

    function handleOutsidePointerDown(event: PointerEvent) {
      const target = event.target
      if (!(target instanceof Node)) return

      if (
        activePanel &&
        !toolbarRef.current?.contains(target) &&
        !sortPanelRef.current?.contains(target)
      ) {
        setActivePanel(null)
      }
      if (
        selectionMode &&
        !bulkTriggerRef.current?.contains(target) &&
        !bulkPanelRef.current?.contains(target) &&
        !phraseRowsRef.current?.contains(target)
      ) {
        setSelectionMode(false)
        setSelectedIds(new Set())
      }
    }

    document.addEventListener('pointerdown', handleOutsidePointerDown)
    return () => document.removeEventListener('pointerdown', handleOutsidePointerDown)
  }, [activePanel, selectionMode])

  const categoryOrderIndex = useMemo(() => {
    const map = new Map<string, number>()
    categories.forEach((c, i) => map.set(c.name, i))
    return map
  }, [categories])

  const allCategoryNames = useMemo(() => {
    const names = new Set(categories.map((category) => category.name))
    for (const p of phrases) names.add(p.categoryName ?? 'Uncategorized')
    return [...names].sort((a, b) => {
      const ia = categoryOrderIndex.get(a) ?? Infinity
      const ib = categoryOrderIndex.get(b) ?? Infinity
      return ia !== ib ? ia - ib : a.localeCompare(b)
    })
  }, [categories, phrases, categoryOrderIndex])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return phrases.filter((p) => {
      const categoryName = p.categoryName ?? 'Uncategorized'
      if (hiddenCategories.has(categoryName)) return false
      if (!q) return true
      return (
        p.english.toLowerCase().includes(q) ||
        p.text.toLowerCase().includes(q) ||
        p.phonetic.toLowerCase().includes(q) ||
        categoryName.toLowerCase().includes(q)
      )
    })
  }, [phrases, search, hiddenCategories])

  const unlearnedItems = useMemo(() => filtered.filter((p) => !p.learned), [filtered])
  const learnedItems = useMemo(() => filtered.filter((p) => p.learned), [filtered])
  const favoriteItems = useMemo(() => filtered.filter((p) => p.favorite), [filtered])
  const otherItems = useMemo(() => filtered.filter((p) => !p.favorite), [filtered])

  const { primaryItems, primaryLabel, secondaryItems, secondaryLabel } = useMemo(() => {
    if (learnedFilter === 'learned')
      return { primaryItems: learnedItems, primaryLabel: 'Learnt', secondaryItems: unlearnedItems, secondaryLabel: 'Not Learnt' }
    if (learnedFilter === 'all')
      return { primaryItems: filtered, primaryLabel: 'All', secondaryItems: [] as PhraseListItem[], secondaryLabel: '' }
    if (learnedFilter === 'favorites')
      return { primaryItems: favoriteItems, primaryLabel: 'Favorites', secondaryItems: otherItems, secondaryLabel: 'Others' }
    return { primaryItems: unlearnedItems, primaryLabel: 'Not Learnt', secondaryItems: learnedItems, secondaryLabel: 'Learnt' }
  }, [learnedFilter, filtered, unlearnedItems, learnedItems, favoriteItems, otherItems])

  const groups = useMemo<Group[]>(
    () =>
      groupByCategoryOn
        ? groupByCategory(primaryItems, sortMode, categoryOrderIndex, displayPhonetics)
        : [{ categoryName: '', items: sortItems(primaryItems, sortMode, displayPhonetics) }],
    [primaryItems, groupByCategoryOn, sortMode, categoryOrderIndex, displayPhonetics],
  )

  const secondaryGroups = useMemo<Group[]>(
    () =>
      groupByCategoryOn
        ? groupByCategory(secondaryItems, sortMode, categoryOrderIndex, displayPhonetics)
        : [{ categoryName: '', items: sortItems(secondaryItems, sortMode, displayPhonetics) }],
    [secondaryItems, groupByCategoryOn, sortMode, categoryOrderIndex, displayPhonetics],
  )

  function toggleCategoryVisible(categoryName: string, visible: boolean) {
    setHiddenCategoryList((prev) => (visible ? prev.filter((n) => n !== categoryName) : [...prev, categoryName]))
  }

  function toggleSelect(translationId: number) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(translationId)) next.delete(translationId)
      else next.add(translationId)
      return next
    })
  }

  function exitSelectionMode() {
    setSelectionMode(false)
    setSelectedIds(new Set())
  }

  // The View pill cycles straight through the 4 filters on tap instead of opening a dropdown of them.
  function cycleViewFilter() {
    exitSelectionMode()
    setActivePanel(null)
    const nextIndex = (VIEW_FILTER_ORDER.indexOf(learnedFilter) + 1) % VIEW_FILTER_ORDER.length
    setLearnedFilter(VIEW_FILTER_ORDER[nextIndex])
  }

  const selectedItems = filtered.filter((p) => selectedIds.has(p.translationId))
  const selectedTranslationIds = selectedItems.map((p) => p.translationId)
  const selectedConceptIds = [...new Set(selectedItems.map((p) => p.phraseConceptId))]

  // Dragging always switches to Custom order - any other sort mode would just re-sort the
  // dropped item straight back to where it started.
  function commitReorder(orderedTranslationIds: number[]) {
    setSortMode('custom')
    onReorder(orderedTranslationIds)
  }

  function renderRow(item: PhraseListItem, dragHandleProps?: { onPointerDown: (e: React.PointerEvent) => void }, dragging?: boolean) {
    return (
      <PhraseRow
        key={item.translationId}
        phrase={item}
        languageCode={languageCode}
        showPhonetics={displayPhonetics}
        translating={translating && !item.text}
        translationFirst={sortMode.startsWith('translation')}
        onToggleLearned={onToggleLearned}
        onToggleFavorite={onToggleFavorite}
        onEdit={onEdit}
        selectionMode={selectionMode}
        selected={selectedIds.has(item.translationId)}
        onToggleSelect={toggleSelect}
        dragHandleProps={dragHandleProps}
        dragging={dragging}
      />
    )
  }

  /** Renders one draggable bucket - items can be reordered within it, never out of it. */
  function renderDraggableGroup(items: PhraseListItem[]) {
    return (
      <DragReorderList
        items={items}
        getId={(item) => item.translationId}
        onReorder={commitReorder}
        className="flex flex-col gap-1.5"
        pressDelayMs={200}
        renderItem={(item, dragHandleProps, dragging) => renderRow(item, dragHandleProps, dragging)}
      />
    )
  }

  /** Renders a bucket's groups, collapsible by category when grouping is on - shared by the primary and secondary sections. */
  function renderGroups(groupList: Group[], collapsedState: Record<string, boolean>, setCollapsedState: Dispatch<SetStateAction<Record<string, boolean>>>) {
    return (
      <div className="mt-1.5 flex flex-col gap-3">
        {groupList.map((group) => {
          const isCollapsed = groupByCategoryOn && (collapsedState[group.categoryName] ?? false)
          return (
            <div key={group.categoryName || 'all'}>
              {groupByCategoryOn && (
                <button
                  onClick={() => setCollapsedState((c) => ({ ...c, [group.categoryName]: !isCollapsed }))}
                  className="flex w-full items-center justify-between py-1 pl-3 text-left text-[11px] font-extrabold uppercase tracking-wider text-muted"
                >
                  <span>{group.categoryName}</span>
                  {isCollapsed ? (
                    <ChevronRight size={16} strokeWidth={2} className="text-muted" />
                  ) : (
                    <ChevronDown size={16} strokeWidth={2} className="text-muted" />
                  )}
                </button>
              )}
              {!isCollapsed && <div className="mt-1.5">{renderDraggableGroup(group.items)}</div>}
            </div>
          )
        })}
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col">
      <div className="menu-panel-reveal shrink-0" data-open={chromeVisible} aria-hidden={!chromeVisible}>
      <div className="min-h-0 overflow-hidden">
      <div className="shrink-0">
        <div className="flex flex-col gap-2.5 px-4 py-3">
        {phoneticsEnabled && !generatingPhonetics && phrases.some((phrase) => phrase.text && !phrase.phonetic) && (
          <button
            type="button"
            onClick={() => void onGeneratePhonetics()}
            className="self-start shrink-0 rounded-full border-2 border-fabpink bg-transparent px-2.5 py-1.5 text-[10px] font-extrabold uppercase tracking-wider text-fabpink active:scale-95 transition-all"
          >
            {phoneticsError ? 'Retry phonetics' : 'Generate phonetics'}
          </button>
        )}

        <div ref={toolbarRef} className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <button type="button" onClick={cycleViewFilter} className={triggerPillClass(false)}>
              <LearnedFilterIcon filter={learnedFilter} />
              {LEARNED_FILTER_LABEL[learnedFilter]}
            </button>

            <button
              type="button"
              onClick={() => {
                exitSelectionMode()
                setActivePanel((panel) => (panel === 'sort' ? null : 'sort'))
              }}
              aria-expanded={activePanel === 'sort'}
              className={triggerPillClass(activePanel === 'sort')}
            >
              {activePanel === 'sort' ? <X size={14} strokeWidth={2} /> : <ListFilter size={14} strokeWidth={2} />}
              {activePanel === 'sort' ? 'Close' : 'Sort'}
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                exitSelectionMode()
                setActivePanel((panel) => (panel === 'categories' ? null : 'categories'))
              }}
              aria-expanded={activePanel === 'categories'}
              className={`relative ${triggerPillClass(activePanel === 'categories')}`}
            >
              {activePanel === 'categories' ? <X size={14} strokeWidth={2} /> : <Tag size={14} strokeWidth={2} />}
              {activePanel === 'categories' ? 'Close' : 'Categories'}
              {activePanel !== 'categories' && hiddenCategories.size > 0 && (
                <span className="absolute -right-0.5 -top-0.5 size-2 rounded-full bg-fabpink" aria-hidden="true" />
              )}
            </button>

            <button
              ref={bulkTriggerRef}
              type="button"
              onClick={() => {
                if (selectionMode) {
                  exitSelectionMode()
                } else {
                  setActivePanel(null)
                  setSelectionMode(true)
                }
              }}
              className={triggerPillClass(selectionMode)}
            >
              {selectionMode ? <X size={14} strokeWidth={2} /> : <ListChecks size={14} strokeWidth={2} />}
              {selectionMode ? 'Close' : 'Bulk'}
            </button>
          </div>
        </div>
        </div>

        <div
          ref={sortPanelRef}
          className="menu-panel-reveal shrink-0 bg-surface"
          data-open={activePanel !== null}
          aria-hidden={activePanel === null}
        >
          <div className="min-h-0 overflow-hidden">
            <div className="relative overflow-hidden px-4 py-2">
              {activePanel === 'categories' && showManageCategories ? (
                <ManageCategoriesPanel
                  categories={categories}
                  onClose={() => setShowManageCategories(false)}
                  onCreate={onCreateCategory}
                  onRename={onRenameCategory}
                  onDelete={onDeleteCategory}
                  onReorder={onReorderCategories}
                />
              ) : (
                <div className={activePanel ? 'animate-menu-open' : ''}>
                  {activePanel === 'sort' && (
                    <div className="flex flex-wrap gap-1.5 py-0.5">
                      {SORT_OPTIONS.map((option) => (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => setSortMode(option.value)}
                          aria-pressed={sortMode === option.value}
                          className={`flex items-center gap-1.5 ${pillClass(sortMode === option.value, 'accent')}`}
                        >
                          {option.shortLabel}
                          <span className="sr-only">{option.label}</span>
                        </button>
                      ))}
                    </div>
                  )}

                  {activePanel === 'categories' && (
                    <CategoryFilterPopout
                      allCategoryNames={allCategoryNames}
                      hiddenCategories={hiddenCategories}
                      onToggleCategoryVisible={toggleCategoryVisible}
                      onManageCategories={() => setShowManageCategories(true)}
                      groupByCategoryOn={groupByCategoryOn}
                      onToggleGroupByCategory={setGroupByCategoryOn}
                      removeFavoriteOnLearn={removeFavoriteOnLearn}
                      onToggleRemoveFavoriteOnLearn={onToggleRemoveFavoriteOnLearn}
                    />
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      </div>
      </div>

      <div
        ref={bulkPanelRef}
        className="menu-panel-reveal shrink-0"
        data-open={selectionMode}
        aria-hidden={!selectionMode}
      >
        <div className="min-h-0">
          <BulkActionBar
            selectedCount={selectedIds.size}
            languageName={languageName}
            currentLanguageId={activeLanguageId}
            languages={languages}
            categories={categories}
            onMarkLearned={async (learnedVal) => {
              await onBulkMarkLearned(selectedTranslationIds, learnedVal)
            }}
            onMarkFavorite={async (favoriteVal) => {
              await onBulkMarkFavorite(selectedTranslationIds, favoriteVal)
            }}
            onChangeCategory={async (categoryName) => {
              await onBulkChangeCategory(selectedConceptIds, categoryName)
            }}
            onCopyToLanguages={async (targetLanguageIds) => {
              await onBulkCopyToLanguages(selectedConceptIds, targetLanguageIds)
            }}
            onDeleteOneLanguage={async () => {
              await onBulkDeleteOneLanguage(selectedTranslationIds)
              exitSelectionMode()
            }}
            onDeleteAllLanguages={async () => {
              await onBulkDeleteAllLanguages(selectedConceptIds)
              exitSelectionMode()
            }}
          />
        </div>
      </div>

      <div
        ref={phraseRowsRef}
        className="flex-1 overflow-y-auto px-4 py-3"
        style={{
          paddingBottom: `calc(5rem + var(--safe-area-inset-bottom, 0px))`,
        }}
      >
        <div className="flex flex-col gap-4">
          {primaryItems.length === 0 && secondaryItems.length === 0 && (
            <div className="flex flex-col items-center gap-2 py-10 text-center">
              <p className="font-brand text-xl font-bold tracking-[-0.035em] text-ink">Write it as you go.</p>
              <p className="max-w-xs text-sm leading-relaxed text-muted">
                Tap the <span className="text-fabpink">+</span> button to capture a phrase in this language.
              </p>
            </div>
          )}

          {!(primaryItems.length === 0 && secondaryItems.length === 0) && (
            <div>
              <button
                onClick={() => setPrimaryExpanded((v) => !v)}
                className="flex w-full items-center justify-between py-1 text-left text-[11px] font-extrabold uppercase tracking-wider text-fabpink"
              >
                <span>
                  {primaryLabel} ({primaryItems.length})
                </span>
                {primaryExpanded ? (
                  <ChevronDown size={16} strokeWidth={2} className="text-fabpink" />
                ) : (
                  <ChevronRight size={16} strokeWidth={2} className="text-fabpink" />
                )}
              </button>
              {primaryExpanded && renderGroups(groups, collapsed, setCollapsed)}
            </div>
          )}

          {secondaryItems.length > 0 && (
            <div className="pt-3">
              <button
                onClick={() => setSecondaryExpanded((v) => !v)}
                className="flex w-full items-center justify-between py-1 text-left text-[11px] font-extrabold uppercase tracking-wider text-fabpink"
              >
                <span>
                  {secondaryLabel} ({secondaryItems.length})
                </span>
                {secondaryExpanded ? (
                  <ChevronDown size={16} strokeWidth={2} className="text-fabpink" />
                ) : (
                  <ChevronRight size={16} strokeWidth={2} className="text-fabpink" />
                )}
              </button>
              {secondaryExpanded && renderGroups(secondaryGroups, secondaryCollapsed, setSecondaryCollapsed)}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
