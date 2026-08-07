import { useState } from 'react'
import { getLastBackupAt } from '../lib/autoBackup'
import { exportFile } from '../lib/exportFile'
import type { BackupSnapshot } from '../db/backup'
import type { Language } from '../db/types'
import { PopoutSelect } from './PopoutSelect'

interface Props {
  languages: Language[]
  onClose: () => void
  onBackUpNow: () => Promise<void>
  onPickBackup: () => Promise<{ name: string; snapshot: BackupSnapshot }>
  onApplyBackup: (snapshot: BackupSnapshot) => Promise<void>
  onExportCsv: (languageId: number) => Promise<string>
}

export function BackupModal({ languages, onClose, onBackUpNow, onPickBackup, onApplyBackup, onExportCsv }: Props) {
  const [status, setStatus] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [pendingRestore, setPendingRestore] = useState<{ name: string; snapshot: BackupSnapshot } | null>(null)
  const [csvLanguageId, setCsvLanguageId] = useState<number | ''>(languages[0]?.id ?? '')

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
    if (!pendingRestore) return
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
  }

  const lastBackupAt = getLastBackupAt()

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 pt-16 pb-[var(--safe-area-inset-bottom,0px)] sm:pt-24" onClick={onClose}>
      <div className="w-full sm:max-w-md rounded-2xl border border-hairline bg-surface p-5 shadow-2xl mx-4 sm:mx-0" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-semibold mb-1 text-ink">Backup</h2>
        <p className="text-xs text-muted mb-4">
          {lastBackupAt ? `Last automatic backup: ${new Date(lastBackupAt).toLocaleString()}` : 'No automatic backup yet on this device.'}
        </p>

        {pendingRestore ? (
          <div className="flex flex-col gap-3">
            <p className="text-sm text-ink">
              Replace <strong>everything</strong> currently in the app with <strong>{pendingRestore.name}</strong>? This can't be undone.
            </p>
            <div className="flex gap-2">
              <button onClick={() => setPendingRestore(null)} disabled={busy} className="flex-1 rounded-full px-4 py-2 text-sm font-medium text-muted">
                Cancel
              </button>
              <button
                onClick={confirmRestore}
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
              className="rounded-full bg-fabpink px-4 py-2 text-sm font-medium text-white shadow-sm disabled:opacity-40"
            >
              Back up now
            </button>
            <button
              onClick={handleRestoreClick}
              disabled={busy}
              className="rounded-full border border-hairline text-ink px-4 py-2 text-sm font-medium disabled:opacity-40"
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
                    className="shrink-0 rounded-full border border-hairline text-ink px-3 py-2 text-sm font-medium disabled:opacity-40"
                  >
                    Export
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {status && <p className="mt-3 text-sm text-muted">{status}</p>}

        {!pendingRestore && (
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
