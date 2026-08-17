import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { ArrowDown, ArrowDownAZ, ArrowUp, ArrowUpZA, Check, ChevronDown, ChevronRight, Clock, Languages, ListChecks, Star, X } from 'lucide-react'
import type { Category, PhraseListItem } from '../db/types'
import { usePersistedState } from '../lib/usePersistedState'
import { BulkActionBar } from './BulkActionBar'
import { CategoryFilterPopout } from './CategoryFilterPopout'
import { ManageCategoriesModal } from './ManageCategoriesModal'
import { PhraseRow } from './PhraseRow'
import { PopoutSelect } from './PopoutSelect'

interface Props {
  phrases: PhraseListItem[]
  languageCode: string
  languageName: string
  translating?: boolean
  categories: Category[]
  search: string
  onToggleLearned: (id: number, learned: boolean) => void
  onToggleFavorite: (id: number, favorite: boolean) => void
  onEdit: (phrase: PhraseListItem) => void
  onSelectionModeChange?: (active: boolean) => void
  onBulkMarkLearned: (translationIds: number[], learned: boolean) => Promise<void>
  onBulkMarkFavorite: (translationIds: number[], favorite: boolean) => Promise<void>
  onBulkDeleteOneLanguage: (translationIds: number[]) => Promise<void>
  onBulkDeleteAllLanguages: (phraseConceptIds: number[]) => Promise<void>
  onBulkChangeCategory: (phraseConceptIds: number[], categoryName: string | null) => Promise<void>
  onCreateCategory: (name: string) => Promise<void>
  onRenameCategory: (categoryId: number, newName: string) => Promise<void>
  onDeleteCategory: (categoryId: number) => Promise<void>
}

interface Group {
  categoryName: string
  items: PhraseListItem[]
}

type SortMode = 'english-asc' | 'english-desc' | 'translation-asc' | 'translation-desc' | 'date-desc' | 'date-asc'

const SORT_ICON_BOX = 'inline-flex w-4 h-4 shrink-0 items-center justify-center'

function SortIcon({ mode }: { mode: SortMode }) {
  return (
    <span className={`${SORT_ICON_BOX} shrink-0`}>
      {mode.startsWith('english') ? (
        <span className="text-xs font-semibold leading-none">EN</span>
      ) : mode.startsWith('date') ? (
        <Clock size={14} strokeWidth={2} />
      ) : (
        <Languages size={14} strokeWidth={2} />
      )}
    </span>
  )
}

function SortDirectionIcon({ mode }: { mode: SortMode }) {
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
]

const SORT_OPTIONS: { value: SortMode; label: string; shortLabel: ReactNode }[] = SORT_OPTION_LABELS.map((opt) => ({
  ...opt,
  shortLabel: (
    <>
      <SortIcon mode={opt.value} />
      <SortDirectionIcon mode={opt.value} />
    </>
  ),
}))

const ALPHA_BUCKETS: { label: string; letters: string }[] = [
  { label: 'A-D', letters: 'ABCD' },
  { label: 'E-H', letters: 'EFGH' },
  { label: 'I-L', letters: 'IJKL' },
  { label: 'M-P', letters: 'MNOP' },
  { label: 'Q-T', letters: 'QRST' },
  { label: 'U-Z', letters: 'UVWXYZ' },
]

function sortKey(item: PhraseListItem, mode: SortMode): string {
  return mode.startsWith('translation') ? item.text : item.english
}

function bucketFor(value: string): string {
  const ch = value.trim()[0]?.toUpperCase() ?? ''
  return ALPHA_BUCKETS.find((b) => b.letters.includes(ch))?.label ?? '#'
}

function sortItems(items: PhraseListItem[], mode: SortMode): PhraseListItem[] {
  const dir = mode.endsWith('asc') ? 1 : -1
  return [...items].sort((a, b) => {
    if (a.favorite !== b.favorite) return a.favorite ? -1 : 1
    // Phrase concept ids are assigned in insertion order, so they double as a "date added" sort
    // without needing a dedicated timestamp column.
    if (mode.startsWith('date')) return dir * (a.phraseConceptId - b.phraseConceptId)
    return dir * sortKey(a, mode).localeCompare(sortKey(b, mode))
  })
}

type LearnedFilter = 'unlearned' | 'learned' | 'all'

const LEARNED_FILTER_CYCLE: LearnedFilter[] = ['unlearned', 'learned', 'all']
const LEARNED_FILTER_LABEL: Record<LearnedFilter, string> = { unlearned: 'Not Learnt', learned: 'Learned', all: 'All' }

function groupByCategory(items: PhraseListItem[], mode: SortMode): Group[] {
  const map = new Map<string, PhraseListItem[]>()
  for (const item of items) {
    const key = item.categoryName ?? 'Uncategorized'
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(item)
  }
  return [...map.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([categoryName, groupItems]) => ({ categoryName, items: sortItems(groupItems, mode) }))
}

export function PhraseList({
  phrases,
  languageCode,
  languageName,
  translating = false,
  categories,
  search,
  onToggleLearned,
  onToggleFavorite,
  onEdit,
  onSelectionModeChange,
  onBulkMarkLearned,
  onBulkMarkFavorite,
  onBulkDeleteOneLanguage,
  onBulkDeleteAllLanguages,
  onBulkChangeCategory,
  onCreateCategory,
  onRenameCategory,
  onDeleteCategory,
}: Props) {
  const [sortMode, setSortMode] = usePersistedState<SortMode>('phrasebook-sort-mode', 'english-asc')
  const [groupByCategoryOn, setGroupByCategoryOn] = usePersistedState('phrasebook-group-by-category', false)
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})
  const [learnedFilter, setLearnedFilter] = usePersistedState<LearnedFilter>('phrasebook-learned-filter', 'unlearned')
  const [primaryExpanded, setPrimaryExpanded] = useState(true)
  const [secondaryExpanded, setSecondaryExpanded] = useState(false)
  const [favoritesExpanded, setFavoritesExpanded] = useState(true)
  const [favoritesOnly, setFavoritesOnly] = usePersistedState('phrasebook-favorites-only', false)
  const [hiddenCategoryList, setHiddenCategoryList] = usePersistedState<string[]>('phrasebook-hidden-categories', [])
  const hiddenCategories = useMemo(() => new Set(hiddenCategoryList), [hiddenCategoryList])
  const [showManageCategories, setShowManageCategories] = useState(false)
  const [selectionMode, setSelectionMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())

  useEffect(() => {
    onSelectionModeChange?.(selectionMode)
  }, [selectionMode, onSelectionModeChange])

  const allCategoryNames = useMemo(() => {
    const names = new Set<string>()
    for (const p of phrases) names.add(p.categoryName ?? 'Uncategorized')
    return [...names].sort((a, b) => a.localeCompare(b))
  }, [phrases])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return phrases.filter((p) => {
      const categoryName = p.categoryName ?? 'Uncategorized'
      if (hiddenCategories.has(categoryName)) return false
      if (favoritesOnly && !p.favorite) return false
      if (!q) return true
      return p.english.toLowerCase().includes(q) || p.text.toLowerCase().includes(q) || categoryName.toLowerCase().includes(q)
    })
  }, [phrases, search, hiddenCategories, favoritesOnly])

  const unlearnedItems = useMemo(() => filtered.filter((p) => !p.learned), [filtered])
  const learnedItems = useMemo(() => filtered.filter((p) => p.learned), [filtered])

  const { primaryItems, primaryLabel, secondaryItems, secondaryLabel } = useMemo(() => {
    if (learnedFilter === 'learned')
      return { primaryItems: learnedItems, primaryLabel: 'Learned', secondaryItems: unlearnedItems, secondaryLabel: 'Not Learnt' }
    if (learnedFilter === 'all')
      return { primaryItems: filtered, primaryLabel: 'All', secondaryItems: [] as PhraseListItem[], secondaryLabel: '' }
    return { primaryItems: unlearnedItems, primaryLabel: 'Not Learnt', secondaryItems: learnedItems, secondaryLabel: 'Learned' }
  }, [learnedFilter, filtered, unlearnedItems, learnedItems])

  const secondarySorted = useMemo(() => sortItems(secondaryItems, sortMode), [secondaryItems, sortMode])

  const favoriteItems = useMemo(() => primaryItems.filter((p) => p.favorite), [primaryItems])
  const nonFavoritePrimaryItems = useMemo(() => primaryItems.filter((p) => !p.favorite), [primaryItems])

  const favoriteGroups = useMemo<Group[]>(
    () =>
      groupByCategoryOn
        ? groupByCategory(favoriteItems, sortMode)
        : [{ categoryName: '', items: sortItems(favoriteItems, sortMode) }],
    [favoriteItems, groupByCategoryOn, sortMode],
  )
  const groups = useMemo<Group[]>(
    () =>
      groupByCategoryOn
        ? groupByCategory(nonFavoritePrimaryItems, sortMode)
        : [{ categoryName: '', items: sortItems(nonFavoritePrimaryItems, sortMode) }],
    [nonFavoritePrimaryItems, groupByCategoryOn, sortMode],
  )

  // Alphabet jump index: an ordered list of stops per bucket, one per "pinned section" that could
  // hold a letter — the favourites section's groups, then the main section's groups. Repeated presses
  // of the same button step through the list (wrapping back to the top), instead of a single
  // first-occurrence target — otherwise a favourite would permanently claim its letter range and
  // every press would land back on it.
  const bucketTargetLists = useMemo(() => {
    const dir = sortMode.endsWith('asc') ? 1 : -1
    const lists = new Map<string, number[]>()
    for (const group of [...favoriteGroups, ...groups]) {
      const alphaOrdered = [...group.items].sort((a, b) => dir * sortKey(a, sortMode).localeCompare(sortKey(b, sortMode)))
      const seenBuckets = new Set<string>()
      for (const item of alphaOrdered) {
        const bucket = bucketFor(sortKey(item, sortMode))
        if (seenBuckets.has(bucket)) continue
        seenBuckets.add(bucket)
        const arr = lists.get(bucket) ?? []
        arr.push(item.translationId)
        lists.set(bucket, arr)
      }
    }
    return lists
  }, [favoriteGroups, groups, sortMode])

  const [bucketCycleIndex, setBucketCycleIndex] = useState<Record<string, number>>({})

  function jumpTo(bucketLabel: string) {
    const targets = bucketTargetLists.get(bucketLabel)
    if (!targets || targets.length === 0) return
    const nextIndex = ((bucketCycleIndex[bucketLabel] ?? -1) + 1) % targets.length
    setBucketCycleIndex((prev) => ({ ...prev, [bucketLabel]: nextIndex }))
    document.getElementById(`phrase-row-${targets[nextIndex]}`)?.scrollIntoView({ block: 'start', behavior: 'smooth' })
  }

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

  const selectedItems = filtered.filter((p) => selectedIds.has(p.translationId))
  const selectedTranslationIds = selectedItems.map((p) => p.translationId)
  const selectedConceptIds = [...new Set(selectedItems.map((p) => p.phraseConceptId))]

  function renderRow(item: PhraseListItem) {
    return (
      <PhraseRow
        key={item.translationId}
        phrase={item}
        languageCode={languageCode}
        translating={translating && !item.text}
        translationFirst={sortMode.startsWith('translation')}
        onToggleLearned={onToggleLearned}
        onToggleFavorite={onToggleFavorite}
        onEdit={onEdit}
        selectionMode={selectionMode}
        selected={selectedIds.has(item.translationId)}
        onToggleSelect={toggleSelect}
      />
    )
  }

  return (
    <div className="flex h-full flex-col">
      <div className="shrink-0 flex flex-col gap-2.5 px-4 py-3 border-b border-hairline">
        <div className="flex flex-wrap items-center gap-2">
          <CategoryFilterPopout
            allCategoryNames={allCategoryNames}
            hiddenCategories={hiddenCategories}
            onToggleCategoryVisible={toggleCategoryVisible}
            onManageCategories={() => setShowManageCategories(true)}
            groupByCategoryOn={groupByCategoryOn}
            onToggleGroupByCategory={setGroupByCategoryOn}
            favoritesOnly={favoritesOnly}
            onToggleFavoritesOnly={setFavoritesOnly}
          />

          <button
            onClick={() => setLearnedFilter((f) => LEARNED_FILTER_CYCLE[(LEARNED_FILTER_CYCLE.indexOf(f) + 1) % LEARNED_FILTER_CYCLE.length])}
            className="flex items-center gap-1.5 shrink-0 rounded-full border border-fabpink px-2.5 py-1.5 text-xs font-medium text-ink hover:bg-surfacehover active:scale-95 transition-all"
            title="Cycle: Not Learnt → Learned → All"
          >
            <Check size={13} strokeWidth={2} className="text-fabpink" />
            {LEARNED_FILTER_LABEL[learnedFilter]}
          </button>

          <button
            onClick={() => (selectionMode ? exitSelectionMode() : setSelectionMode(true))}
            className={`flex items-center gap-1.5 shrink-0 rounded-full px-2.5 py-1.5 text-xs font-medium active:scale-95 transition-all ${
              selectionMode ? 'bg-fabpink text-white shadow-lg shadow-fabpink/20' : 'border border-fabpink text-ink hover:bg-surfacehover'
            }`}
          >
            {selectionMode ? <X size={14} strokeWidth={2} /> : <ListChecks size={14} strokeWidth={2} className="text-fabpink" />}
            {selectionMode ? 'Cancel' : 'Select'}
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-1">
          <PopoutSelect value={sortMode} onChange={setSortMode} options={SORT_OPTIONS} align="left" />

          {ALPHA_BUCKETS.map((b) => {
            const hasMatch = bucketTargetLists.has(b.label)
            return (
              <button
                key={b.label}
                onClick={() => jumpTo(b.label)}
                disabled={!hasMatch}
                className="rounded-full px-1.5 py-1 text-xs font-medium border border-hairline text-ink enabled:hover:border-fabpink enabled:hover:text-fabpink enabled:active:scale-90 disabled:opacity-30 transition-all"
              >
                {b.label}
              </button>
            )
          })}
        </div>
      </div>

      {selectionMode && (
        <BulkActionBar
          selectedCount={selectedIds.size}
          languageName={languageName}
          categories={categories}
          onMarkLearned={async (learnedVal) => {
            await onBulkMarkLearned(selectedTranslationIds, learnedVal)
            exitSelectionMode()
          }}
          onMarkFavorite={async (favoriteVal) => {
            await onBulkMarkFavorite(selectedTranslationIds, favoriteVal)
            exitSelectionMode()
          }}
          onChangeCategory={async (categoryName) => {
            await onBulkChangeCategory(selectedConceptIds, categoryName)
            exitSelectionMode()
          }}
          onDeleteOneLanguage={async () => {
            await onBulkDeleteOneLanguage(selectedTranslationIds)
            exitSelectionMode()
          }}
          onDeleteAllLanguages={async () => {
            await onBulkDeleteAllLanguages(selectedConceptIds)
            exitSelectionMode()
          }}
          onCancel={exitSelectionMode}
        />
      )}

      <div
        className="flex-1 overflow-y-auto px-4 py-3"
        style={{
          paddingBottom: `calc(5rem + var(--safe-area-inset-bottom, 0px))`,
        }}
      >
        <div className="flex flex-col gap-4">
          {primaryItems.length === 0 && <p className="text-center text-muted text-sm py-8">No phrases here — add one to get started.</p>}

          {favoriteItems.length > 0 && (
            <div>
              <button
                onClick={() => setFavoritesExpanded((v) => !v)}
                className="flex w-full items-center justify-between py-1 text-left text-[11px] font-extrabold uppercase tracking-wider text-fabpink"
              >
                <span className="flex items-center gap-1.5">
                  <Star size={12} strokeWidth={2.5} fill="currentColor" className="text-fabpink" />
                  Favourites ({favoriteItems.length})
                </span>
                {favoritesExpanded ? (
                  <ChevronDown size={16} strokeWidth={2} className="text-fabpink" />
                ) : (
                  <ChevronRight size={16} strokeWidth={2} className="text-fabpink" />
                )}
              </button>
              {favoritesExpanded && (
                <div className="mt-1.5 flex flex-col gap-3">
                  {favoriteGroups.map((group) => {
                    const isCollapsed = groupByCategoryOn && (collapsed[`fav:${group.categoryName}`] ?? false)
                    return (
                      <div key={`fav-${group.categoryName || 'all'}`}>
                        {groupByCategoryOn && (
                          <button
                            onClick={() => setCollapsed((c) => ({ ...c, [`fav:${group.categoryName}`]: !isCollapsed }))}
                            className="flex w-full items-center justify-between py-1 text-left text-[11px] font-extrabold uppercase tracking-wider text-fabpink"
                          >
                            <span>{group.categoryName}</span>
                            {isCollapsed ? <ChevronRight size={16} strokeWidth={2} /> : <ChevronDown size={16} strokeWidth={2} />}
                          </button>
                        )}
                        {!isCollapsed && <div className="mt-1.5 flex flex-col gap-1.5">{group.items.map((item) => renderRow(item))}</div>}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {nonFavoritePrimaryItems.length > 0 && (
            <div>
              <button
                onClick={() => setPrimaryExpanded((v) => !v)}
                className="flex w-full items-center justify-between py-1 text-left text-[11px] font-extrabold uppercase tracking-wider text-fabpink"
              >
                <span>
                  {primaryLabel} ({nonFavoritePrimaryItems.length})
                </span>
                {primaryExpanded ? (
                  <ChevronDown size={16} strokeWidth={2} className="text-fabpink" />
                ) : (
                  <ChevronRight size={16} strokeWidth={2} className="text-fabpink" />
                )}
              </button>
              {primaryExpanded && (
                <div className="mt-1.5 flex flex-col gap-3">
                  {groups.map((group) => {
                    const isCollapsed = groupByCategoryOn && (collapsed[group.categoryName] ?? false)
                    return (
                      <div key={group.categoryName || 'all'}>
                        {groupByCategoryOn && (
                          <button
                            onClick={() => setCollapsed((c) => ({ ...c, [group.categoryName]: !isCollapsed }))}
                            className="flex w-full items-center justify-between py-1 text-left text-[11px] font-extrabold uppercase tracking-wider text-fabpink"
                          >
                            <span>{group.categoryName}</span>
                            {isCollapsed ? <ChevronRight size={16} strokeWidth={2} /> : <ChevronDown size={16} strokeWidth={2} />}
                          </button>
                        )}
                        {!isCollapsed && <div className="mt-1.5 flex flex-col gap-1.5">{group.items.map((item) => renderRow(item))}</div>}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {secondaryItems.length > 0 && (
            <div className="border-t border-hairline pt-3">
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
              {secondaryExpanded && <div className="mt-1.5 flex flex-col gap-1.5">{secondarySorted.map((item) => renderRow(item))}</div>}
            </div>
          )}
        </div>
      </div>

      {showManageCategories && (
        <ManageCategoriesModal
          categories={categories}
          onClose={() => setShowManageCategories(false)}
          onCreate={onCreateCategory}
          onRename={onRenameCategory}
          onDelete={onDeleteCategory}
        />
      )}
    </div>
  )
}
