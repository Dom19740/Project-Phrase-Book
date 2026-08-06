import { Directory, Encoding, Filesystem } from '@capacitor/filesystem'
import { Capacitor } from '@capacitor/core'

const BACKUP_PATH = 'PhraseBook/backup.json'
const LOCATION_KEY = 'phrasebook-backup-location'

export type BackupLocation = 'app' | 'documents'

/**
 * 'app' (Directory.Data) needs no permission and always works — the safe default for the
 * silent, debounced auto-backup. 'documents' (Directory.Documents) is user-visible in a file
 * manager but needs the storage permission requested via requestDocumentsPermission() first;
 * without it, writes there fail with EACCES (what "Backup now" used to do before this existed).
 */
export function getBackupLocation(): BackupLocation {
  return localStorage.getItem(LOCATION_KEY) === 'documents' ? 'documents' : 'app'
}

export function setBackupLocation(location: BackupLocation): void {
  localStorage.setItem(LOCATION_KEY, location)
}

function directoryFor(location: BackupLocation) {
  return location === 'documents' ? Directory.Documents : Directory.Data
}

export async function requestDocumentsPermission(): Promise<boolean> {
  if (Capacitor.getPlatform() === 'web') return true
  const current = await Filesystem.checkPermissions()
  if (current.publicStorage === 'granted') return true
  const result = await Filesystem.requestPermissions()
  return result.publicStorage === 'granted'
}

export async function writeBackupFile(json: string): Promise<void> {
  await Filesystem.writeFile({
    path: BACKUP_PATH,
    data: json,
    directory: directoryFor(getBackupLocation()),
    encoding: Encoding.UTF8,
    recursive: true,
  })
}

export async function readBackupFile(): Promise<string | null> {
  try {
    const result = await Filesystem.readFile({ path: BACKUP_PATH, directory: directoryFor(getBackupLocation()), encoding: Encoding.UTF8 })
    return typeof result.data === 'string' ? result.data : null
  } catch {
    return null
  }
}

export function isNativeBackupSupported(): boolean {
  return Capacitor.getPlatform() !== 'web'
}
