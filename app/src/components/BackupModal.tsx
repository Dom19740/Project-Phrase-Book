import { useMemo, useRef, useState } from 'react'
import { Plus } from 'lucide-react'
import { getLastBackupAt } from '../lib/autoBackup'
import { exportFile } from '../lib/exportFile'
import { detectLanguage, detectLanguageFromFilename } from '../lib/detectLanguage'
import { getLanguageFlag } from '../lib/languageFlags'
import type { LanguageOption } from '../lib/languageOptions'
import type { CsvPhraseRow } from '../lib/csvImport'
import type { BackupSnapshot } from '../db/backup'
import type { Language } from '../db/types'
import { LanguageSearchList } from './LanguageSearchList'
import { PopoutSelect } from './PopoutSelect'

interface Props {
  languages: Language[]
  onClose: () => void
  onBackUpNow: () => Promise<void>
  onPickBackup: () => Promise<{ name: string; snapshot: BackupSnapshot }>
  onApplyBackup: (snapshot: BackupSnapshot) => Promise<void>
  onExportCsv: (languageId: number) => Promise<string>
  onPickCsv: () => Promise<{ name: string; rows: CsvPhraseRow[] }>
  onImportCsv: (rows: CsvPhraseRow[], language: Language) => Promise<{ created: number; updated: number }>
  onCreateLanguage: (name: string, code: string, includeConceptIds?: number[] | null) => Promise<Language>
}

type ImportTarget = { kind: 'existing'; language: Language } | { kind: 'new'; option: LanguageOption }

export function BackupModal({
  languages,
  onClose,
  onBackUpNow,
  onPickBackup,
  onApplyBackup,
  onExportCsv,
  onPickCsv,
  onImportCsv,
  onCreateLanguage,
}: Props) {
  const [status, setStatus] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [pendingRestore, setPendingRestore] = useState<{ name: string; snapshot: BackupSnapshot } | null>(null)
  const [csvLanguageId, setCsvLanguageId] = useState<number | ''>(languages[0]?.id ?? '')

  const [pendingImport, setPendingImport] = useState<{ name: string; rows: CsvPhraseRow[] } | null>(null)
  const [importTarget, setImportTarget] = useState<ImportTarget | null>(null)
  const [detectedCode, setDetectedCode] = useState<string | null>(null)
  // Set when the file itself already carries translations and we're confident which language
  // they're in (matched an existing language, or a strong script/filename guess) — skips straight
  // to a one-line confirmation instead of making the user pick from the language list.
  const [autoConfirm, setAutoConfirm] = useState(false)
  const [showLanguagePicker, setShowLanguagePicker] = useState(false)
  const [manualEntry, setManualEntry] = useState(false)
  const [manualName, setManualName] = useState('')
  const [manualCode, setManualCode] = useState('')

  // React's `busy` state only re-renders (and disables the button) on the next frame, which a fast
  // double-tap can beat — this ref blocks re-entry synchronously so two restores never run at once.
  const restoringRef = useRef(false)

  const existingCodes = useMemo(() => new Set(languages.map((l) => l.code.toLowerCase())), [languages])

  async function handleBackUpNow() {
    setBusy(true)
    setStatus(null)
    try {
      await onBackUpNow()
      setStatus('Backed up.')
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Backup failed.')
    }
    setBusy(false)
  }

  async function handleExportCsv() {
    if (csvLanguageId === '') return
    setBusy(true)
    setStatus(null)
    try {
      const language = languages.find((l) => l.id === csvLanguageId)
      const csv = await onExportCsv(csvLanguageId)
      await exportFile(csv, `${(language?.name ?? 'phrases').toLowerCase()}-phrases.csv`, 'text/csv')
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Export failed.')
    }
    setBusy(false)
  }

  function resetImportState() {
    setPendingImport(null)
    setImportTarget(null)
    setDetectedCode(null)
    setAutoConfirm(false)
    setShowLanguagePicker(false)
    setManualEntry(false)
    setManualName('')
    setManualCode('')
  }

  async function handleChooseCsv() {
    setBusy(true)
    setStatus(null)
    try {
      const picked = await onPickCsv()
      const hasTranslations = picked.rows.some((r) => r.text.trim() !== '')

      // Best-effort local guess (no detection API is wired up): first from the translation
      // text's script, then — since scripts like Cyrillic/Arabic/Devanagari/Han can't be safely
      // guessed that way — from the filename, which matches this app's own CSV export naming
      // ("${language}-phrases.csv") so a round-tripped export is recognized without any typing.
      const guess = detectLanguage(picked.rows.map((r) => r.text)) ?? detectLanguageFromFilename(picked.name)
      const matched = guess ? languages.find((l) => l.code.toLowerCase() === guess.code.toLowerCase()) : undefined

      setPendingImport(picked)
      setDetectedCode(guess?.code ?? null)
      setShowLanguagePicker(false)
      setManualEntry(false)

      if (matched) setImportTarget({ kind: 'existing', language: matched })
      else if (guess) setImportTarget({ kind: 'new', option: guess })
      else setImportTarget(languages[0] ? { kind: 'existing', language: languages[0] } : null)

      // Only skip the picker when the file actually has translations in it AND we know which
      // language they're in — an English-only list always needs a target picked, and a
      // translated file we can't identify still needs the user to say what it is.
      setAutoConfirm(hasTranslations && (matched != null || guess != null))
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Could not read that file.')
    }
    setBusy(false)
  }

  function confirmManual() {
    if (!manualName.trim() || !manualCode.trim()) return
    setImportTarget({ kind: 'new', option: { name: manualName.trim(), code: manualCode.trim() } })
    setManualEntry(false)
    setShowLanguagePicker(false)
  }

  async function confirmImportCsv() {
    if (!pendingImport || !importTarget) return
    setBusy(true)
    setStatus(null)
    let succeeded = false
    try {
      // Empty array, not omitted — a CSV-imported language should start with only what the file
      // itself supplies, not a blank row for every existing phrase from every other language
      // (which is addLanguage()'s default, meant for the normal "Add Language" flow's "copy my
      // existing phrasebook over" option — that default silently turned every CSV import of a new
      // language into a background-translate job for the user's *entire* phrasebook, not just the
      // rows being imported).
      const language =
        importTarget.kind === 'existing' ? importTarget.language : await onCreateLanguage(importTarget.option.name, importTarget.option.code, [])
      await onImportCsv(pendingImport.rows, language)
      resetImportState()
      succeeded = true
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Import failed.')
    }
    setBusy(false)
    // Closing the whole modal (instead of just returning to the main Backup screen) is the
    // clearest signal the import actually went through, now that there's no success message.
    if (succeeded) onClose()
  }

  async function handleRestoreClick() {
    setBusy(true)
    setStatus(null)
    try {
      setPendingRestore(await onPickBackup())
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Could not read that file.')
    }
    setBusy(false)
  }

  async function confirmRestore() {
    if (!pendingRestore || restoringRef.current) return
    restoringRef.current = true
    setBusy(true)
    setStatus(null)
    try {
      await onApplyBackup(pendingRestore.snapshot)
      setStatus('Restored from backup.')
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Restore failed.')
    }
    setBusy(false)
    setPendingRestore(null)
    restoringRef.current = false
  }

  const lastBackupAt = getLastBackupAt()
  const blankCount = pendingImport ? pendingImport.rows.filter((r) => !r.text.trim()).length : 0

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 backdrop-blur-sm pt-16 pb-[var(--safe-area-inset-bottom,0px)] sm:pt-24" onClick={onClose}>
      <div className="w-full sm:max-w-md rounded-2xl border border-hairline bg-surface p-5 shadow-2xl mx-4 sm:mx-0" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-bold tracking-tight mb-1 text-ink">Backup</h2>
        <p className="text-xs text-muted mb-4">
          {lastBackupAt ? `Last automatic backup: ${new Date(lastBackupAt).toLocaleString()}` : 'No automatic backup yet on this device.'}
        </p>

        {pendingRestore ? (
          <div className="flex flex-col gap-3">
            <p className="text-sm text-ink">
              Replace <strong>everything</strong> currently in the app with <strong>{pendingRestore.name}</strong>? This can't be undone.
            </p>
            <div className="flex gap-2">
              <button onClick={() => setPendingRestore(null)} disabled={busy} className="flex-1 rounded-full px-4 py-2 text-sm font-medium text-muted hover:text-ink active:scale-95 transition-all">
                Cancel
              </button>
              <button
                onClick={confirmRestore}
                disabled={busy}
                className="flex-1 rounded-full bg-red-600 px-4 py-2 text-sm font-medium text-white shadow-lg shadow-red-600/20 active:scale-95 transition-all disabled:opacity-40"
              >
                Replace everything
              </button>
            </div>
          </div>
        ) : pendingImport && autoConfirm && importTarget ? (
          <div className="flex flex-col gap-3">
            <p className="text-sm text-ink">
              Import <strong>{pendingImport.rows.length}</strong> phrase{pendingImport.rows.length === 1 ? '' : 's'} from <strong>{pendingImport.name}</strong> to{' '}
              <strong>
                <span aria-hidden="true">{getLanguageFlag(importTarget.kind === 'existing' ? importTarget.language.code : importTarget.option.code)}</span>{' '}
                {importTarget.kind === 'existing' ? importTarget.language.name : importTarget.option.name}
              </strong>
              ?
            </p>

            {blankCount > 0 && (
              <p className="text-xs text-muted">
                {blankCount} of {pendingImport.rows.length} phrase{blankCount === 1 ? '' : 's'} {blankCount === 1 ? "doesn't" : "don't"} have a translation yet —{' '}
                {blankCount === 1 ? 'it' : 'they'} will be auto-translated after import.
              </p>
            )}

            <button
              onClick={() => setAutoConfirm(false)}
              className="self-start text-xs text-muted hover:text-ink underline transition-colors"
            >
              Not the right language?
            </button>

            <div className="flex gap-2">
              <button onClick={resetImportState} disabled={busy} className="flex-1 rounded-full px-4 py-2 text-sm font-medium text-muted hover:text-ink active:scale-95 transition-all">
                Cancel
              </button>
              <button
                onClick={confirmImportCsv}
                disabled={busy}
                className="flex-1 rounded-full bg-fabpink px-4 py-2 text-sm font-medium text-white shadow-lg shadow-fabpink/20 active:scale-95 transition-all disabled:opacity-40"
              >
                Import
              </button>
            </div>
          </div>
        ) : pendingImport ? (
          <div className="flex flex-col gap-3">
            <p className="text-sm text-ink">
              Import <strong>{pendingImport.rows.length}</strong> phrase{pendingImport.rows.length === 1 ? '' : 's'} from <strong>{pendingImport.name}</strong>
            </p>

            {blankCount > 0 && (
              <p className="text-xs text-muted">
                {blankCount} of {pendingImport.rows.length} phrase{blankCount === 1 ? '' : 's'} {blankCount === 1 ? "doesn't" : "don't"} have a translation yet —{' '}
                {blankCount === 1 ? 'it' : 'they'} will be auto-translated after import.
              </p>
            )}

            <div>
              <label className="block text-sm font-medium mb-1 text-ink">Import into</label>

              {showLanguagePicker ? (
                manualEntry ? (
                  <div className="flex flex-col gap-2">
                    <div className="flex gap-2">
                      <input
                        autoFocus
                        value={manualName}
                        onChange={(e) => setManualName(e.target.value)}
                        placeholder="Name, e.g. Vietnamese"
                        className="flex-1 min-w-0 rounded-xl border border-hairline bg-transparent text-ink px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-fabpink/40 focus:border-fabpink transition-shadow"
                      />
                      <input
                        value={manualCode}
                        onChange={(e) => setManualCode(e.target.value)}
                        placeholder="Code, e.g. vi"
                        className="w-24 shrink-0 rounded-xl border border-hairline bg-transparent text-ink px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-fabpink/40 focus:border-fabpink transition-shadow"
                      />
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <button onClick={() => setManualEntry(false)} className="text-xs text-muted hover:text-ink underline transition-colors">
                        Back to list
                      </button>
                      <button
                        onClick={confirmManual}
                        disabled={!manualName.trim() || !manualCode.trim()}
                        className="rounded-full bg-fabpink px-4 py-1.5 text-xs font-medium text-white shadow-lg shadow-fabpink/20 active:scale-95 transition-all disabled:opacity-40"
                      >
                        Use this language
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <LanguageSearchList
                      disabledCodes={existingCodes}
                      highlightCode={detectedCode}
                      onChoose={(option) => {
                        setImportTarget({ kind: 'new', option })
                        setShowLanguagePicker(false)
                      }}
                    />
                    <div className="flex items-center justify-between gap-2 mt-2">
                      <button onClick={() => setManualEntry(true)} className="text-xs text-muted hover:text-ink underline transition-colors">
                        Can't find it? Add manually
                      </button>
                      <button onClick={() => setShowLanguagePicker(false)} className="text-xs text-muted hover:text-ink underline transition-colors">
                        Back
                      </button>
                    </div>
                  </>
                )
              ) : (
                <div className="flex flex-col gap-1">
                  {languages.map((lang) => (
                    <button
                      key={lang.id}
                      onClick={() => setImportTarget({ kind: 'existing', language: lang })}
                      className={`flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm text-left transition-colors ${
                        importTarget?.kind === 'existing' && importTarget.language.id === lang.id
                          ? 'bg-fabpink/10 text-fabpink font-medium'
                          : 'text-ink hover:bg-surfacehover'
                      }`}
                    >
                      <span aria-hidden="true">{getLanguageFlag(lang.code)}</span>
                      {lang.name}
                    </button>
                  ))}

                  {importTarget?.kind === 'new' && (
                    <div className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm bg-fabpink/10 text-fabpink font-medium">
                      <span aria-hidden="true">{getLanguageFlag(importTarget.option.code)}</span>
                      <span className="flex-1">
                        {importTarget.option.name} (new{detectedCode === importTarget.option.code ? ', detected' : ''})
                      </span>
                    </div>
                  )}

                  <button
                    onClick={() => setShowLanguagePicker(true)}
                    className="flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-sm text-left text-fabpink font-medium hover:bg-surfacehover transition-colors"
                  >
                    <Plus size={14} strokeWidth={2.5} />
                    {importTarget?.kind === 'new' ? 'Change new language' : 'Add a new language'}
                  </button>
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <button onClick={resetImportState} disabled={busy} className="flex-1 rounded-full px-4 py-2 text-sm font-medium text-muted hover:text-ink active:scale-95 transition-all">
                Cancel
              </button>
              <button
                onClick={confirmImportCsv}
                disabled={busy || !importTarget}
                className="flex-1 rounded-full bg-fabpink px-4 py-2 text-sm font-medium text-white shadow-lg shadow-fabpink/20 active:scale-95 transition-all disabled:opacity-40"
              >
                Import
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <button
              onClick={handleBackUpNow}
              disabled={busy}
              className="rounded-full bg-fabpink px-4 py-2 text-sm font-medium text-white shadow-lg shadow-fabpink/20 active:scale-[0.98] transition-all disabled:opacity-40"
            >
              Back up now
            </button>
            <button
              onClick={handleRestoreClick}
              disabled={busy}
              className="rounded-full border border-hairline text-ink px-4 py-2 text-sm font-medium hover:bg-surfacehover active:scale-[0.98] transition-all disabled:opacity-40"
            >
              Restore backup
            </button>

            {languages.length > 0 && (
              <div className="mt-2 border-t border-hairline pt-3">
                <label className="block text-sm font-medium mb-1 text-ink">Export phrases (CSV)</label>
                <div className="flex gap-2">
                  <PopoutSelect
                    className="flex-1 min-w-0"
                    align="left"
                    value={csvLanguageId}
                    onChange={setCsvLanguageId}
                    options={languages.map((lang) => ({ value: lang.id, label: lang.name }))}
                  />
                  <button
                    onClick={handleExportCsv}
                    disabled={busy}
                    className="shrink-0 rounded-full border border-hairline text-ink px-3 py-2 text-sm font-medium hover:bg-surfacehover active:scale-95 transition-all disabled:opacity-40"
                  >
                    Export
                  </button>
                </div>
              </div>
            )}

            <div className="mt-2 border-t border-hairline pt-3">
              <label className="block text-sm font-medium mb-1 text-ink">Import phrases</label>
              <button
                onClick={handleChooseCsv}
                disabled={busy}
                className="w-full rounded-full border border-hairline text-ink px-4 py-2 text-sm font-medium hover:bg-surfacehover active:scale-[0.98] transition-all disabled:opacity-40"
              >
                Choose file
              </button>
              <p className="mt-1 text-xs text-muted">A CSV (English, Translation, Category) or a plain list of phrases, one per line.</p>
            </div>
          </div>
        )}

        {status && <p className="mt-3 text-sm text-muted">{status}</p>}

        {!pendingRestore && !pendingImport && (
          <div className="flex justify-end mt-4">
            <button onClick={onClose} className="rounded-full px-4 py-2 text-sm font-medium text-muted hover:text-ink active:scale-95 transition-all">
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
