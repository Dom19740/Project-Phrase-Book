import { useRef, useState } from 'react'
import { getLastBackupAt } from '../lib/autoBackup'
import type { Language } from '../db/types'
import { PopoutSelect } from './PopoutSelect'

interface Props {
  languages: Language[]
  onClose: () => void
  onBackUpNow: () => Promise<void>
  onExport: () => Promise<string>
  onImport: (json: string) => Promise<void>
  onExportCsv: (languageId: number) => Promise<string>
}

export function BackupModal({ languages, onClose, onBackUpNow, onExport, onImport, onExportCsv }: Props) {
  const [status, setStatus] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [confirmingImport, setConfirmingImport] = useState<File | null>(null)
  const [csvLanguageId, setCsvLanguageId] = useState<number | ''>(languages[0]?.id ?? '')
  const fileInputRef = useRef<HTMLInputElement>(null)

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

  function downloadFile(content: string, filename: string, mimeType: string) {
    const blob = new Blob([content], { type: mimeType })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  }

  async function handleExport() {
    setBusy(true)
    const json = await onExport()
    downloadFile(json, `phrasebook-backup-${new Date().toISOString().slice(0, 10)}.json`, 'application/json')
    setBusy(false)
  }

  async function handleExportCsv() {
    if (csvLanguageId === '') return
    setBusy(true)
    const language = languages.find((l) => l.id === csvLanguageId)
    const csv = await onExportCsv(csvLanguageId)
    downloadFile(csv, `${(language?.name ?? 'phrases').toLowerCase()}-phrases.csv`, 'text/csv')
    setBusy(false)
  }

  async function confirmImport() {
    if (!confirmingImport) return
    setBusy(true)
    setStatus(null)
    try {
      const text = await confirmingImport.text()
      await onImport(text)
      setStatus('Restored from backup.')
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Import failed — check the file is a valid backup.')
    }
    setBusy(false)
    setConfirmingImport(null)
  }

  const lastBackupAt = getLastBackupAt()

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 pt-16 pb-[var(--safe-area-inset-bottom,0px)] sm:pt-24" onClick={onClose}>
      <div className="w-full sm:max-w-md rounded-2xl border border-hairline bg-surface p-5 shadow-2xl mx-4 sm:mx-0" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-semibold mb-1 text-ink">Backup</h2>
        <p className="text-xs text-muted mb-4">
          {lastBackupAt ? `Last automatic backup: ${new Date(lastBackupAt).toLocaleString()}` : 'No automatic backup yet on this device.'}
        </p>

        {confirmingImport ? (
          <div className="flex flex-col gap-3">
            <p className="text-sm text-ink">
              This replaces <strong>everything</strong> currently in the app with the contents of "{confirmingImport.name}". This can't be undone.
            </p>
            <div className="flex gap-2">
              <button onClick={() => setConfirmingImport(null)} disabled={busy} className="flex-1 rounded-full px-4 py-2 text-sm font-medium text-muted">
                Cancel
              </button>
              <button
                onClick={confirmImport}
                disabled={busy}
                className="flex-1 rounded-full bg-red-600 px-4 py-2 text-sm font-medium text-white shadow-sm disabled:opacity-40"
              >
                Replace everything
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <button
              onClick={handleBackUpNow}
              disabled={busy}
              className="rounded-full bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white shadow-sm disabled:opacity-40"
            >
              Back up now
            </button>
            <button onClick={handleExport} disabled={busy} className="rounded-full border border-hairline text-ink px-4 py-2 text-sm font-medium disabled:opacity-40">
              Export as JSON file
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={busy}
              className="rounded-full border border-hairline text-ink px-4 py-2 text-sm font-medium disabled:opacity-40"
            >
              Restore from JSON file...
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/json"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) setConfirmingImport(file)
                e.target.value = ''
              }}
            />

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
                    className="shrink-0 rounded-full border border-hairline text-ink px-3 py-2 text-sm font-medium disabled:opacity-40"
                  >
                    Export
                  </button>
                </div>
                <p className="text-xs text-muted mt-1">English, Translation, Category columns — opens in Excel/Sheets or any text editor.</p>
              </div>
            )}
          </div>
        )}

        {status && <p className="mt-3 text-sm text-muted">{status}</p>}

        {!confirmingImport && (
          <div className="flex justify-end mt-4">
            <button onClick={onClose} className="rounded-full px-4 py-2 text-sm font-medium text-muted">
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
