import { Directory, Encoding, Filesystem } from '@capacitor/filesystem'
import { Capacitor } from '@capacitor/core'

const BACKUP_PATH = 'PhraseBook/backup.json'

/**
 * Writes the backup to the app's private data directory. Directory.Documents (public storage)
 * needs a runtime permission this app never requests and Android 10+'s scoped storage blocks
 * anyway, which is why automatic/silent backups there failed with EACCES. Directory.Data needs
 * no permission and is always writable, at the cost of not being visible in a file manager —
 * that's fine since "Export as JSON file" (see exportFile.ts) is the path for a user-visible,
 * shareable copy.
 */
export async function writeBackupFile(json: string): Promise<void> {
  await Filesystem.writeFile({
    path: BACKUP_PATH,
    data: json,
    directory: Directory.Data,
    encoding: Encoding.UTF8,
    recursive: true,
  })
}

export async function readBackupFile(): Promise<string | null> {
  try {
    const result = await Filesystem.readFile({ path: BACKUP_PATH, directory: Directory.Data, encoding: Encoding.UTF8 })
    return typeof result.data === 'string' ? result.data : null
  } catch {
    return null
  }
}

export function isNativeBackupSupported(): boolean {
  return Capacitor.getPlatform() !== 'web'
}
