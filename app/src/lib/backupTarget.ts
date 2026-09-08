import { Capacitor } from '@capacitor/core'
import { SafFile } from './safFile'

const AUTO_BACKUP_NAME = 'backup.json'
const FOLDER_URI_KEY = 'phrasebook-backup-folder-uri'
const FOLDER_LABEL_KEY = 'phrasebook-backup-folder-label'

export function isNativeBackupSupported(): boolean {
  return Capacitor.getPlatform() !== 'web'
}

function manualBackupName(): string {
  const date = new Date().toISOString().slice(0, 10)
  return `travelchatter-backup-${date}.json`
}

/** Web preview has no real Documents folder — falls back to a normal browser download. */
function downloadInBrowser(json: string, name: string): void {
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = name
  a.click()
  URL.revokeObjectURL(url)
}

/** The folder the user previously granted via `chooseBackupFolder`, if any — `null` before first setup. */
export function getBackupFolderUri(): string | null {
  return localStorage.getItem(FOLDER_URI_KEY)
}

/** Human-readable label for the currently chosen backup folder, e.g. "Internal storage/Documents/Travel Chatter". */
export function getBackupFolderLabel(): string | null {
  return localStorage.getItem(FOLDER_LABEL_KEY)
}

function rememberBackupFolder(uri: string, label: string): void {
  localStorage.setItem(FOLDER_URI_KEY, uri)
  localStorage.setItem(FOLDER_LABEL_KEY, label)
}

function forgetBackupFolder(): void {
  localStorage.removeItem(FOLDER_URI_KEY)
  localStorage.removeItem(FOLDER_LABEL_KEY)
}

/**
 * Prompts the user (via Android's system folder picker) to choose where backups are stored, and
 * remembers that choice — every write/read/list after this reuses it silently, with no further
 * prompts, since the permission grant is persisted across app restarts.
 */
export async function chooseBackupFolder(): Promise<string> {
  if (!isNativeBackupSupported()) throw new Error('Choosing a backup folder needs the installed Android app — not available in the web preview.')
  const { uri, label } = await SafFile.pickFolder()
  rememberBackupFolder(uri, label)
  return label
}

/** Runs the given write/read/list call against the saved backup folder, clearing it on access-lost errors so the next attempt re-prompts. */
async function withBackupFolder<T>(run: (folderUri: string) => Promise<T>): Promise<T> {
  const folderUri = getBackupFolderUri()
  if (!folderUri) throw new Error('No backup folder set yet.')
  try {
    return await run(folderUri)
  } catch (err) {
    if (err instanceof Error && err.message.includes('no longer accessible')) forgetBackupFolder()
    throw err
  }
}

/**
 * Silent safety-net copy the app keeps for itself. Lives in the user-chosen backup folder (not the
 * app's private storage) specifically so it survives an uninstall — always overwrites the same file.
 * Does nothing if no backup folder has been chosen yet (silent auto-backup can't prompt for one).
 */
export async function writeAutoBackupFile(json: string): Promise<void> {
  if (!isNativeBackupSupported()) throw new Error('Automatic backup needs the installed Android app — not available in the web preview.')
  const folderUri = getBackupFolderUri()
  if (!folderUri) return
  await withBackupFolder((uri) => SafFile.writeInFolder({ folderUri: uri, filename: AUTO_BACKUP_NAME, data: json, mimeType: 'application/json' }))
}

/**
 * Writes a dated manual backup into the same folder as the automatic one. Returns its filename.
 * Prompts for a backup folder first if none has been chosen yet.
 */
export async function writeManualBackupFile(json: string): Promise<string> {
  const name = manualBackupName()
  if (!isNativeBackupSupported()) {
    downloadInBrowser(json, name)
    return name
  }
  if (!getBackupFolderUri()) await chooseBackupFolder()
  await withBackupFolder((uri) => SafFile.writeInFolder({ folderUri: uri, filename: name, data: json, mimeType: 'application/json' }))
  return name
}

export interface BackupFileInfo {
  name: string
  mtime: number
}

/** Lists every backup (automatic + manual) sitting in the chosen backup folder, newest first. */
export async function listBackupFiles(): Promise<BackupFileInfo[]> {
  if (!getBackupFolderUri()) return []
  try {
    const { files } = await withBackupFolder((uri) => SafFile.listFolder({ folderUri: uri }))
    return files
      .filter((f) => f.name.endsWith('.json'))
      .sort((a, b) => b.mtime - a.mtime)
  } catch {
    return []
  }
}

export async function readBackupFile(name: string): Promise<string> {
  const { data } = await withBackupFolder((uri) => SafFile.readInFolder({ folderUri: uri, filename: name }))
  return data
}
