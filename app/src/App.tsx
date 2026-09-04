import { useEffect, useState } from 'react'
import { BookOpen, Layers, Loader2, Menu, Moon, Plus, Save, Sun, TriangleAlert } from 'lucide-react'
import { AddPhraseModal } from './components/AddPhraseModal'
import { BackupModal } from './components/BackupModal'
import { EditPhraseModal } from './components/EditPhraseModal'
import { ErrorBoundary } from './components/ErrorBoundary'
import { FlashCardsModal } from './components/FlashCardsModal'
import { LanguageTabs } from './components/LanguageTabs'
import { OnboardingFlow } from './components/OnboardingFlow'
import { PhraseList } from './components/PhraseList'
import { StartupPhrasesModal } from './components/StartupPhrasesModal'
import { PhraseBookProvider, usePhraseBook } from './context/PhraseBookContext'
import { usePersistedState } from './lib/usePersistedState'
import type { PhraseListItem } from './db/types'

type Theme = 'dark' | 'light'

const DEFAULT_ACCENT = '#EC1D8B'
const ACCENT_COLORS = [DEFAULT_ACCENT, '#71e3ca', '#c6ff3d']

// The lemon-yellow accent is nearly invisible on the light theme's white/near-white surfaces,
// so swap it for a darker olive tone whenever light theme is active. The picker dot itself still
// shows the original lemon yellow so the user's selection stays recognizable.
const LIGHT_MODE_ACCENT_OVERRIDES: Record<string, string> = {
  '#c6ff3d': '#6B8E12',
}

/** Used only the very first time the app opens, before the user has ever picked a theme themselves. */
function getSystemTheme(): Theme {
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

/** Picks black or white text so it stays legible on a solid-fill button/badge in this accent color. */
function readableTextOn(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  const yiq = (r * 299 + g * 587 + b * 114) / 1000
  return yiq >= 128 ? '#000000' : '#ffffff'
}

function Shell() {
  const {
    loading,
    languages,
    categories,
    activeLanguageId,
    setActiveLanguageId,
    phrases,
    backgroundTranslation,
    translationIncomplete,
    toggleLearned,
    toggleFavorite,
    addPhrase,
    editPhrase,
    deleteOneLanguage,
    deleteAllLanguages,
    bulkMarkLearned,
    bulkMarkFavorite,
    bulkDeleteOneLanguage,
    bulkDeleteAllLanguages,
    bulkChangeCategory,
    bulkCopyToLanguages,
    createCategory,
    renameCategory,
    deleteCategory,
    createLanguage,
    addStartupPhrases,
    removeLanguage,
    getLanguagePhrases,
    backUpToFile,
    pickBackupFile,
    applyBackupSnapshot,
    exportLanguageCsv,
    pickCsvFile,
    importLanguageCsv,
  } = usePhraseBook()
  const [showAddPhrase, setShowAddPhrase] = useState(false)
  const [showBackup, setShowBackup] = useState(false)
  const [showFlashCards, setShowFlashCards] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [editingPhrase, setEditingPhrase] = useState<PhraseListItem | null>(null)
  const [selectionModeActive, setSelectionModeActive] = useState(false)
  const [theme, setTheme] = usePersistedState<Theme>('phrasebook-theme', getSystemTheme())
  const [accent, setAccent] = usePersistedState<string>('phrasebook-accent', DEFAULT_ACCENT)
  const [search, setSearch] = useState('')
  const [startupPhrasesLanguageId, setStartupPhrasesLanguageId] = useState<number | null>(null)
  const [onboardingSeen, setOnboardingSeen] = usePersistedState('phrasebook-onboarding-seen', false)
  const [showOnboarding, setShowOnboarding] = useState(() => !onboardingSeen)
  const appliedAccent = theme === 'light' ? (LIGHT_MODE_ACCENT_OVERRIDES[accent] ?? accent) : accent

  function finishOnboarding() {
    setOnboardingSeen(true)
    setShowOnboarding(false)
  }

  async function handleAddLanguage(name: string, code: string, includeConceptIds?: number[] | null) {
    const wasFirstLanguage = languages.length === 0
    const lang = await createLanguage(name, code, includeConceptIds)
    if (wasFirstLanguage) setStartupPhrasesLanguageId(lang.id)
  }

  useEffect(() => {
    document.documentElement.dataset.theme = theme
  }, [theme])

  useEffect(() => {
    document.documentElement.style.setProperty('--color-fabpink', appliedAccent)
    document.documentElement.style.setProperty('--color-onaccent', readableTextOn(appliedAccent))
  }, [appliedAccent])

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center bg-appbg text-muted">
        Loading phrase book...
      </div>
    )
  }

  const activeLanguage = languages.find((l) => l.id === activeLanguageId)
  const activeLanguageCode = activeLanguage?.code ?? 'en'
  const activeLanguageName = activeLanguage?.name ?? ''

  // Flash cards can study a language other than the active tab, so the edit modal must resolve
  // its language from the phrase being edited rather than assuming the active tab's language.
  const editingLanguage = editingPhrase ? languages.find((l) => l.id === editingPhrase.languageId) : undefined
  const editingLanguageCode = editingLanguage?.code ?? 'en'
  const editingLanguageName = editingLanguage?.name ?? ''

  return (
    <div
      className="flex h-full flex-col bg-appbg text-ink"
      style={{ paddingTop: 'var(--safe-area-inset-top, 0px)' }}
    >
      <LanguageTabs
        languages={languages}
        activeLanguageId={activeLanguageId}
        onSelect={setActiveLanguageId}
        onAddLanguage={handleAddLanguage}
        onRemoveLanguage={removeLanguage}
        getLanguagePhrases={getLanguagePhrases}
        search={search}
        onSearchChange={setSearch}
        menu={
          <div className="relative shrink-0">
            <button
              onClick={() => setMenuOpen((v) => !v)}
              className="rounded-full p-2 text-muted hover:bg-surfacehover hover:text-ink active:scale-90 transition-all"
              aria-label="Menu"
              title="Menu"
            >
              <Menu size={20} strokeWidth={2} />
            </button>

            {menuOpen && (
              <>
                <button className="fixed inset-0 z-40 cursor-default" onClick={() => setMenuOpen(false)} aria-label="Close menu" />
                <div className="absolute right-0 top-full z-50 mt-2 w-52 rounded-2xl border border-hairline bg-surface/95 backdrop-blur-md p-1.5 shadow-xl">
                  <button
                    onClick={() => {
                      setShowOnboarding(true)
                      setMenuOpen(false)
                    }}
                    className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2.5 text-sm text-left text-ink hover:bg-surfacehover transition-colors"
                  >
                    <BookOpen size={16} strokeWidth={2} className="text-fabpink" />
                    How to use
                  </button>
                  <button
                    onClick={() => {
                      setShowFlashCards(true)
                      setMenuOpen(false)
                    }}
                    disabled={languages.length === 0}
                    className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2.5 text-sm text-left text-ink hover:bg-surfacehover transition-colors disabled:opacity-40 disabled:hover:bg-transparent"
                  >
                    <Layers size={16} strokeWidth={2} className="text-fabpink" />
                    Flash Cards
                  </button>
                  <button
                    onClick={() => {
                      setShowBackup(true)
                      setMenuOpen(false)
                    }}
                    className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2.5 text-sm text-left text-ink hover:bg-surfacehover transition-colors"
                  >
                    <Save size={16} strokeWidth={2} className="text-fabpink" />
                    Backup / Import
                  </button>

                  <div className="mt-1 border-t border-hairline px-2.5 pt-2 pb-1">
                    <p className="mb-1.5 text-xs font-medium text-muted">Theme</p>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => setTheme('dark')}
                        aria-label="Dark theme"
                        aria-pressed={theme === 'dark'}
                        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full transition-transform active:scale-90"
                        style={theme === 'dark' ? { backgroundColor: appliedAccent, color: readableTextOn(appliedAccent) } : { color: 'var(--color-muted)' }}
                      >
                        <Moon size={13} strokeWidth={2} />
                      </button>
                      <button
                        onClick={() => setTheme('light')}
                        aria-label="Light theme"
                        aria-pressed={theme === 'light'}
                        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full transition-transform active:scale-90"
                        style={theme === 'light' ? { backgroundColor: appliedAccent, color: readableTextOn(appliedAccent) } : { color: 'var(--color-muted)' }}
                      >
                        <Sun size={13} strokeWidth={2} />
                      </button>
                      <div className="mx-0.5 h-4 w-px shrink-0 bg-hairline" />
                      {ACCENT_COLORS.map((color) => (
                        <button
                          key={color}
                          onClick={() => setAccent(color)}
                          aria-label={`Use accent color ${color}`}
                          aria-pressed={accent === color}
                          className={`h-6 w-6 shrink-0 rounded-full transition-transform active:scale-90 ${
                            accent === color ? 'ring-2 ring-offset-2 ring-offset-surface ring-ink' : ''
                          }`}
                          style={{ backgroundColor: theme === 'light' ? (LIGHT_MODE_ACCENT_OVERRIDES[color] ?? color) : color }}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        }
      />

      <main className="flex-1 overflow-hidden">
        {languages.length === 0 ? (
          <p className="text-center text-muted text-sm py-12">Add a language to get started.</p>
        ) : backgroundTranslation?.languageId === activeLanguageId && phrases.length === 0 ? (
          // Nothing to show yet for this language at all — block briefly rather than flash an
          // empty list. Once there's at least one phrase row (even blank, filling in live as
          // translations land), show it straight away instead of hiding it behind a spinner for
          // however long translation takes — that can now run to several minutes of retries, and
          // there's no reason to block on it when there's already something real to look at.
          <div className="flex h-full flex-col items-center justify-center gap-3 text-muted">
            <Loader2 size={28} strokeWidth={2.5} className="animate-spin text-fabpink" />
            <p className="text-sm">Translating {backgroundTranslation.languageName}&hellip;</p>
          </div>
        ) : (
          <PhraseList
            phrases={phrases}
            languageCode={activeLanguageCode}
            languageName={activeLanguageName}
            activeLanguageId={activeLanguageId!}
            languages={languages}
            categories={categories}
            search={search}
            onToggleLearned={(id, learned) => toggleLearned(id, learned)}
            onToggleFavorite={(id, favorite) => toggleFavorite(id, favorite)}
            onEdit={setEditingPhrase}
            onSelectionModeChange={setSelectionModeActive}
            onBulkMarkLearned={bulkMarkLearned}
            onBulkMarkFavorite={bulkMarkFavorite}
            onBulkDeleteOneLanguage={bulkDeleteOneLanguage}
            onBulkDeleteAllLanguages={bulkDeleteAllLanguages}
            onBulkChangeCategory={bulkChangeCategory}
            onBulkCopyToLanguages={bulkCopyToLanguages}
            onCreateCategory={createCategory}
            onRenameCategory={renameCategory}
            onDeleteCategory={deleteCategory}
          />
        )}
      </main>

      {backgroundTranslation && (backgroundTranslation.languageId !== activeLanguageId || phrases.length > 0) && (
        <div
          className="fixed left-1/2 -translate-x-1/2 flex max-w-[85vw] items-center gap-2 rounded-full bg-surface/90 backdrop-blur-md border border-hairline px-4 py-2 text-sm text-ink shadow-lg shadow-black/20"
          style={{ bottom: 'calc(6rem + var(--safe-area-inset-bottom, 0px))' }}
        >
          <Loader2 size={15} strokeWidth={2.5} className="shrink-0 animate-spin text-fabpink" />
          <span className="truncate">Translating {backgroundTranslation.languageName} in the background&hellip;</span>
        </div>
      )}

      {!backgroundTranslation && translationIncomplete && (
        <div
          className="fixed left-1/2 -translate-x-1/2 flex max-w-[85vw] items-center gap-2 rounded-full bg-surface/90 backdrop-blur-md border border-hairline px-4 py-2 text-sm text-ink shadow-lg shadow-black/20"
          style={{ bottom: 'calc(6rem + var(--safe-area-inset-bottom, 0px))' }}
        >
          <TriangleAlert size={15} strokeWidth={2.5} className="shrink-0 text-fabpink" />
          <span className="truncate">
            {translationIncomplete.count} phrase{translationIncomplete.count === 1 ? '' : 's'} in {translationIncomplete.languageName} need
            translation &mdash; add manually when ready.
          </span>
        </div>
      )}

      {!selectionModeActive && (
        <button
          onClick={() => setShowAddPhrase(true)}
          disabled={languages.length === 0}
          className="fixed right-6 flex size-14 items-center justify-center rounded-full bg-fabpink text-onaccent shadow-lg shadow-black/30 transition-all hover:brightness-110 active:scale-95 disabled:opacity-40"
          style={{ bottom: 'calc(1.5rem + var(--safe-area-inset-bottom, 0px))' }}
          aria-label="Add phrase"
        >
          <Plus size={26} strokeWidth={2.5} />
        </button>
      )}

      {showAddPhrase && (
        <AddPhraseModal
          categories={categories}
          languages={languages}
          activeLanguageId={activeLanguageId}
          onClose={() => setShowAddPhrase(false)}
          onSubmit={(english, categoryName, languageIds, manualTranslations) => addPhrase(english, categoryName, languageIds, manualTranslations)}
        />
      )}

      {editingPhrase && (
        <EditPhraseModal
          phrase={editingPhrase}
          languageCode={editingLanguageCode}
          languageName={editingLanguageName}
          categories={categories}
          onClose={() => setEditingPhrase(null)}
          onSubmit={(english, text, categoryName) =>
            editPhrase(editingPhrase.phraseConceptId, editingPhrase.translationId, english, text, categoryName)
          }
          onDeleteOneLanguage={deleteOneLanguage}
          onDeleteAllLanguages={deleteAllLanguages}
        />
      )}

      {startupPhrasesLanguageId != null && (
        <StartupPhrasesModal
          onSkip={() => setStartupPhrasesLanguageId(null)}
          onSubmit={async (englishKeys) => {
            await addStartupPhrases(startupPhrasesLanguageId, englishKeys)
            setStartupPhrasesLanguageId(null)
          }}
        />
      )}

      {showBackup && (
        <BackupModal
          languages={languages}
          onClose={() => setShowBackup(false)}
          onBackUpNow={backUpToFile}
          onPickBackup={pickBackupFile}
          onApplyBackup={applyBackupSnapshot}
          onExportCsv={exportLanguageCsv}
          onPickCsv={pickCsvFile}
          onImportCsv={importLanguageCsv}
          onCreateLanguage={createLanguage}
        />
      )}

      {showOnboarding && <OnboardingFlow onFinish={finishOnboarding} />}

      {showFlashCards && (
        <FlashCardsModal
          languages={languages}
          categories={categories}
          activeLanguageId={activeLanguageId}
          getLanguagePhrases={getLanguagePhrases}
          onToggleLearned={toggleLearned}
          onToggleFavorite={toggleFavorite}
          onEditPhrase={editPhrase}
          onDeleteOneLanguage={deleteOneLanguage}
          onDeleteAllLanguages={deleteAllLanguages}
          onClose={() => setShowFlashCards(false)}
        />
      )}
    </div>
  )
}

function App() {
  return (
    <PhraseBookProvider>
      <div className="h-screen w-screen overflow-hidden">
        <ErrorBoundary>
          <Shell />
        </ErrorBoundary>
      </div>
    </PhraseBookProvider>
  )
}

export default App
