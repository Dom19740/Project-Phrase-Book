import { useState } from 'react'
import { Plus, Settings } from 'lucide-react'
import { AddPhraseModal } from './components/AddPhraseModal'
import { BackupModal } from './components/BackupModal'
import { EditPhraseModal } from './components/EditPhraseModal'
import { LanguageTabs } from './components/LanguageTabs'
import { Logo } from './components/Logo'
import { PhraseList } from './components/PhraseList'
import { PhraseBookProvider, usePhraseBook } from './context/PhraseBookContext'
import { DEFAULT_LANGUAGE_COLOR } from './lib/colorPalette'
import type { PhraseListItem } from './db/types'

function Shell() {
  const {
    loading,
    languages,
    categories,
    activeLanguageId,
    setActiveLanguageId,
    phrases,
    toggleLearned,
    addPhrase,
    editPhrase,
    deleteOneLanguage,
    deleteAllLanguages,
    bulkMarkLearned,
    bulkDeleteOneLanguage,
    bulkDeleteAllLanguages,
    bulkChangeCategory,
    createCategory,
    renameCategory,
    deleteCategory,
    createLanguage,
    removeLanguage,
    updateLanguageColor,
    backUpNow,
    exportBackupJson,
    restoreFromBackupJson,
    exportLanguageCsv,
  } = usePhraseBook()
  const [showAddPhrase, setShowAddPhrase] = useState(false)
  const [showBackup, setShowBackup] = useState(false)
  const [editingPhrase, setEditingPhrase] = useState<PhraseListItem | null>(null)
  const [selectionModeActive, setSelectionModeActive] = useState(false)

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center bg-appbg text-muted">
        Loading phrase book...
      </div>
    )
  }

  const activeLanguage = languages.find((l) => l.id === activeLanguageId)
  const accent = activeLanguage?.color ?? DEFAULT_LANGUAGE_COLOR
  const activeLanguageCode = activeLanguage?.code ?? 'en'
  const activeLanguageName = activeLanguage?.name ?? ''

  return (
    <div className="flex h-full flex-col bg-appbg text-ink" style={{ '--accent': accent } as React.CSSProperties}>
      <header className="flex items-center justify-between px-4 py-4">
        <div className="flex items-center gap-3 rounded-2xl border-2 px-3 py-2" style={{ borderColor: 'var(--accent)' }}>
          <Logo size={44} className="text-white shrink-0" />
          <h1 className="text-2xl font-bold tracking-tight text-ink">
            Travel <span style={{ color: 'var(--accent)' }}>Chatter</span>
          </h1>
        </div>
        <button
          onClick={() => setShowBackup(true)}
          className="rounded-full p-2 text-muted hover:bg-surfacehover hover:text-ink transition-colors"
          aria-label="Backup settings"
          title="Backup"
        >
          <Settings size={22} strokeWidth={2} />
        </button>
      </header>

      <LanguageTabs
        languages={languages}
        activeLanguageId={activeLanguageId}
        onSelect={setActiveLanguageId}
        onAddLanguage={createLanguage}
        onRemoveLanguage={removeLanguage}
        onUpdateColor={updateLanguageColor}
      />

      <main className="flex-1 overflow-hidden">
        {languages.length === 0 ? (
          <p className="text-center text-muted text-sm py-12">Add a language to get started.</p>
        ) : (
          <PhraseList
            phrases={phrases}
            accent={accent}
            languageCode={activeLanguageCode}
            languageName={activeLanguageName}
            categories={categories}
            onToggleLearned={(id, learned) => toggleLearned(id, learned)}
            onEdit={setEditingPhrase}
            onSelectionModeChange={setSelectionModeActive}
            onBulkMarkLearned={bulkMarkLearned}
            onBulkDeleteOneLanguage={bulkDeleteOneLanguage}
            onBulkDeleteAllLanguages={bulkDeleteAllLanguages}
            onBulkChangeCategory={bulkChangeCategory}
            onCreateCategory={createCategory}
            onRenameCategory={renameCategory}
            onDeleteCategory={deleteCategory}
          />
        )}
      </main>

      {!selectionModeActive && (
        <button
          onClick={() => setShowAddPhrase(true)}
          disabled={languages.length === 0}
          className="fixed bottom-6 right-6 flex size-14 items-center justify-center rounded-full bg-fabpink text-white shadow-lg shadow-black/20 transition-transform hover:scale-105 active:scale-95 disabled:opacity-40"
          aria-label="Add phrase"
        >
          <Plus size={26} strokeWidth={2.5} />
        </button>
      )}

      {showAddPhrase && (
        <AddPhraseModal
          categories={categories}
          onClose={() => setShowAddPhrase(false)}
          onSubmit={(english, categoryName) => addPhrase(english, categoryName)}
        />
      )}

      {editingPhrase && (
        <EditPhraseModal
          phrase={editingPhrase}
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

      {showBackup && (
        <BackupModal
          languages={languages}
          onClose={() => setShowBackup(false)}
          onBackUpNow={backUpNow}
          onExport={exportBackupJson}
          onImport={restoreFromBackupJson}
          onExportCsv={exportLanguageCsv}
        />
      )}
    </div>
  )
}

function App() {
  return (
    <PhraseBookProvider>
      <div className="h-screen w-screen overflow-hidden">
        <Shell />
      </div>
    </PhraseBookProvider>
  )
}

export default App
