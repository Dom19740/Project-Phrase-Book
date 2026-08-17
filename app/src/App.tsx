import { useEffect, useState } from 'react'
import { BookOpen, Layers, Loader2, Menu, Moon, Plus, Save, Sun, TriangleAlert } from 'lucide-react'
import { AddPhraseModal } from './components/AddPhraseModal'
import { BackupModal } from './components/BackupModal'
import { EditPhraseModal } from './components/EditPhraseModal'
import { ErrorBoundary } from './components/ErrorBoundary'
import { FlashCardsModal } from './components/FlashCardsModal'
import { LanguageTabs } from './components/LanguageTabs'
import { Logo } from './components/Logo'
import { OnboardingFlow } from './components/OnboardingFlow'
import { PhraseList } from './components/PhraseList'
import { StartupPhrasesModal } from './components/StartupPhrasesModal'
import { PhraseBookProvider, usePhraseBook } from './context/PhraseBookContext'
import { usePersistedState } from './lib/usePersistedState'
import type { PhraseListItem } from './db/types'

type Theme = 'dark' | 'light'

/** Used only the very first time the app opens, before the user has ever picked a theme themselves. */
function getSystemTheme(): Theme {
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
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
  const [search, setSearch] = useState('')
  const [startupPhrasesLanguageId, setStartupPhrasesLanguageId] = useState<number | null>(null)
  const [onboardingSeen, setOnboardingSeen] = usePersistedState('phrasebook-onboarding-seen', false)
  const [showOnboarding, setShowOnboarding] = useState(() => !onboardingSeen)

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

  return (
    <div
      className="flex h-full flex-col bg-appbg text-ink"
      style={{ paddingTop: 'var(--safe-area-inset-top, 0px)' }}
    >
      <header className="flex items-center justify-between px-4 py-.5">
        <div className="flex items-center gap-2">
          <Logo size={40} className="text-fabpink shrink-0" />
          <h1 className="text-2xl font-black tracking-tight leading-none text-ink">
            Travel <span className="text-fabpink">Chatter</span>
          </h1>
        </div>
        <div className="relative">
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
                    setTheme((t) => (t === 'dark' ? 'light' : 'dark'))
                    setMenuOpen(false)
                  }}
                  className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2.5 text-sm text-left text-ink hover:bg-surfacehover transition-colors"
                >
                  {theme === 'dark' ? (
                    <Sun size={16} strokeWidth={2} className="text-fabpink" />
                  ) : (
                    <Moon size={16} strokeWidth={2} className="text-fabpink" />
                  )}
                  {theme === 'dark' ? 'Light theme' : 'Dark theme'}
                </button>
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
                  Backup
                </button>
              </div>
            </>
          )}
        </div>
      </header>

      <LanguageTabs
        languages={languages}
        activeLanguageId={activeLanguageId}
        onSelect={setActiveLanguageId}
        onAddLanguage={handleAddLanguage}
        onRemoveLanguage={removeLanguage}
        getLanguagePhrases={getLanguagePhrases}
        search={search}
        onSearchChange={setSearch}
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
          className="fixed right-6 flex size-14 items-center justify-center rounded-full bg-fabpink text-white shadow-lg shadow-black/30 transition-all hover:brightness-110 active:scale-95 disabled:opacity-40"
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
          onClose={() => setShowAddPhrase(false)}
          onSubmit={(english, categoryName, languageIds, manualTranslations) => addPhrase(english, categoryName, languageIds, manualTranslations)}
        />
      )}

      {editingPhrase && (
        <EditPhraseModal
          phrase={editingPhrase}
          languageCode={activeLanguageCode}
          languageName={activeLanguageName}
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
          activeLanguageId={activeLanguageId}
          getLanguagePhrases={getLanguagePhrases}
          onToggleLearned={toggleLearned}
          onToggleFavorite={toggleFavorite}
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
