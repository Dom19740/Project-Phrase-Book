import { Directory, Encoding, Filesystem } from '@capacitor/filesystem'
import { Capacitor } from '@capacitor/core'

const BACKUP_DIR = 'Travel Chatter'
const AUTO_BACKUP_NAME = 'backup.json'

/** Shown to the user so they know where to find their backups on-device. */
export const BACKUP_DIR_LABEL = 'Documents/Travel Chatter'

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

/**
 * Silent safety-net copy the app keeps for itself. Lives in the public Documents folder (not the
 * app's private storage) specifically so it survives an uninstall — always overwrites the same file.
 */
export async function writeAutoBackupFile(json: string): Promise<void> {
  if (!isNativeBackupSupported()) throw new Error('Automatic backup needs the installed Android app — not available in the web preview.')
  await Filesystem.writeFile({
    path: `${BACKUP_DIR}/${AUTO_BACKUP_NAME}`,
    data: json,
    directory: Directory.Documents,
    encoding: Encoding.UTF8,
    recursive: true,
  })
}

/** Writes a dated manual backup into the same folder as the automatic one. Returns its filename. */
export async function writeManualBackupFile(json: string): Promise<string> {
  const name = manualBackupName()
  if (!isNativeBackupSupported()) {
    downloadInBrowser(json, name)
    return name
  }
  await Filesystem.writeFile({
    path: `${BACKUP_DIR}/${name}`,
    data: json,
    directory: Directory.Documents,
    encoding: Encoding.UTF8,
    recursive: true,
  })
  return name
}

export interface BackupFileInfo {
  name: string
  mtime: number
}

/** Lists every backup (automatic + manual) sitting in the Travel Chatter folder, newest first. */
export async function listBackupFiles(): Promise<BackupFileInfo[]> {
  try {
    const { files } = await Filesystem.readdir({ path: BACKUP_DIR, directory: Directory.Documents })
    return files
      .filter((f) => f.type === 'file' && f.name.endsWith('.json'))
      .map((f) => ({ name: f.name, mtime: f.mtime }))
      .sort((a, b) => b.mtime - a.mtime)
  } catch {
    // Folder doesn't exist yet — no backup has ever been written. Treat as empty, not an error.
    return []
  }
}

export async function readBackupFile(name: string): Promise<string> {
  const { data } = await Filesystem.readFile({ path: `${BACKUP_DIR}/${name}`, directory: Directory.Documents, encoding: Encoding.UTF8 })
  return data as string
}
