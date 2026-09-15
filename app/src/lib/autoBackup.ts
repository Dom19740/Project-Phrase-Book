import { exportSnapshot } from '../db/backup'
import { writeAutoBackupFile } from './backupTarget'

const DEBOUNCE_MS = 1500
const LAST_BACKUP_KEY = 'phrasebook-last-backup-at'
const CHANGES_SINCE_BACKUP_KEY = 'phrasebook-changes-since-backup'

/** Once this many writes have happened with no successful backup covering them, the UI nudges the
 * user to back up manually - a compromise between "after every edit" (too naggy) and never. */
export const BACKUP_REMINDER_THRESHOLD = 5

let debounceTimer: ReturnType<typeof setTimeout> | null = null

/** Notified whenever the backup/changes-since-backup counters change, so the UI can stay in sync
 * even when the change happens asynchronously (e.g. the debounced native auto-backup below
 * finishing well after the mutation that triggered it). */
const statusListeners = new Set<() => void>()

function notifyStatusChange(): void {
  statusListeners.forEach((listener) => listener())
}

export function onBackupStatusChange(listener: () => void): () => void {
  statusListeners.add(listener)
  return () => statusListeners.delete(listener)
}

async function runBackup(): Promise<void> {
  const snapshot = await exportSnapshot()
  await writeAutoBackupFile(JSON.stringify(snapshot, null, 2))
  recordBackupSuccess()
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

/** Marks a backup - automatic or manual, whichever the platform actually managed - as done. Resets
 * the staleness counter the reminder banner reads, so it doesn't nag again right after a backup. */
export function recordBackupSuccess(): void {
  localStorage.setItem(LAST_BACKUP_KEY, new Date().toISOString())
  localStorage.setItem(CHANGES_SINCE_BACKUP_KEY, '0')
  notifyStatusChange()
}

/** Counts phrasebook writes since the last successful backup. Used to nudge platforms with no
 * silent auto-backup (web/iOS - there's no native folder to write into) once enough has changed,
 * rather than surfacing a reminder after every single edit. */
export function recordChangeSinceBackup(): void {
  const current = Number(localStorage.getItem(CHANGES_SINCE_BACKUP_KEY) ?? '0')
  localStorage.setItem(CHANGES_SINCE_BACKUP_KEY, String(current + 1))
  notifyStatusChange()
}

export function getChangesSinceBackup(): number {
  return Number(localStorage.getItem(CHANGES_SINCE_BACKUP_KEY) ?? '0')
}

export { runBackup as backUpNow }
