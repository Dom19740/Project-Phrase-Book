import { exportSnapshot } from '../db/backup'
import { isNativeBackupSupported, writeBackupFile } from './backupTarget'

const DEBOUNCE_MS = 1500
const LAST_BACKUP_KEY = 'phrasebook-last-backup-at'

let debounceTimer: ReturnType<typeof setTimeout> | null = null

async function runBackup(): Promise<void> {
  if (!isNativeBackupSupported()) {
    throw new Error('Automatic backup needs the installed Android app — not available in the web preview.')
  }
  const snapshot = await exportSnapshot()
  await writeBackupFile(JSON.stringify(snapshot, null, 2))
  localStorage.setItem(LAST_BACKUP_KEY, new Date().toISOString())
}

/** Debounces rapid successive writes (e.g. dragging during reorder) into a single backup. */
export function scheduleAutoBackup(): void {
  if (debounceTimer) clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => {
    runBackup().catch((err) => console.error('Auto-backup failed:', err))
  }, DEBOUNCE_MS)
}

export function getLastBackupAt(): string | null {
  return localStorage.getItem(LAST_BACKUP_KEY)
}

export { runBackup as backUpNow }
