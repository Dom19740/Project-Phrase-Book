import { useState } from 'react'
import { Plus, Settings } from 'lucide-react'
import { AddLanguageModal } from './components/AddLanguageModal'
import { AddPhraseModal } from './components/AddPhraseModal'
import { BackupModal } from './components/BackupModal'
import { EditPhraseModal } from './components/EditPhraseModal'
import { accentFor, LanguageTabs } from './components/LanguageTabs'
import { PhraseList } from './components/PhraseList'
import { PhraseBookProvider, usePhraseBook } from './context/PhraseBookContext'
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
    backUpNow,
    exportBackupJson,
    restoreFromBackupJson,
    exportLanguageCsv,
  } = usePhraseBook()
  const [showAddPhrase, setShowAddPhrase] = useState(false)
  const [showAddLanguage, setShowAddLanguage] = useState(false)
  const [showBackup, setShowBackup] = useState(false)
  const [editingPhrase, setEditingPhrase] = useState<PhraseListItem | null>(null)
  const [selectionModeActive, setSelectionModeActive] = useState(false)

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center text-neutral-400">
        Loading phrase book...
      </div>
    )
  }

  const activeIndex = languages.findIndex((l) => l.id === activeLanguageId)
  const accent = accentFor(activeIndex < 0 ? 0 : activeIndex)
  const activeLanguageCode = languages[activeIndex]?.code ?? 'en'
  const activeLanguageName = languages[activeIndex]?.name ?? ''

  return (
    <div className="flex h-full flex-col bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100">
      <header className="flex items-center justify-between px-4 pt-5 pb-2">
        <h1 className="text-2xl font-bold tracking-tight">Travel Chatter</h1>
        <button
          onClick={() => setShowBackup(true)}
          className="rounded-full p-2 text-neutral-400 hover:bg-neutral-200/60 hover:text-neutral-700 dark:hover:bg-neutral-800 dark:hover:text-neutral-200 transition-colors"
          aria-label="Backup settings"
          title="Backup"
        >
          <Settings size={20} strokeWidth={2} />
        </button>
      </header>

      <LanguageTabs
        languages={languages}
        activeLanguageId={activeLanguageId}
        onSelect={setActiveLanguageId}
        onAddLanguage={() => setShowAddLanguage(true)}
        onRemoveLanguage={removeLanguage}
      />

      <main className="flex-1 overflow-hidden">
        {languages.length === 0 ? (
          <p className="text-center text-neutral-400 text-sm py-12">Add a language to get started.</p>
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
          className="fixed bottom-6 right-6 flex size-14 items-center justify-center rounded-full text-white shadow-lg shadow-black/20 transition-transform hover:scale-105 active:scale-95 disabled:opacity-40"
          style={{ backgroundColor: accent }}
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

      {showAddLanguage && (
        <AddLanguageModal onClose={() => setShowAddLanguage(false)} onSubmit={(name, code) => createLanguage(name, code)} />
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
