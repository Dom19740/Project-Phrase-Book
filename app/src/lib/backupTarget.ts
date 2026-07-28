import { Directory, Encoding, Filesystem } from '@capacitor/filesystem'
import { Capacitor } from '@capacitor/core'

const BACKUP_PATH = 'PhraseBook/backup.json'

/**
 * Writes the backup to the device's Documents directory. This is a fixed, app-visible
 * location (not yet the user-chosen folder via Android's Storage Access Framework that the
 * product spec calls for) — picking an arbitrary folder with a persisted permission grant
 * needs either a custom native plugin or a suitable community one, and vetting that requires
 * an actual Android build, which isn't possible in this dev environment (no JDK/Android SDK
 * installed here). This gets real automatic backups working now; swapping in a real folder
 * picker later doesn't change exportSnapshot/importSnapshot at all, just where the bytes land.
 */
export async function writeBackupFile(json: string): Promise<void> {
  await Filesystem.writeFile({
    path: BACKUP_PATH,
    data: json,
    directory: Directory.Documents,
    encoding: Encoding.UTF8,
    recursive: true,
  })
}

export async function readBackupFile(): Promise<string | null> {
  try {
    const result = await Filesystem.readFile({ path: BACKUP_PATH, directory: Directory.Documents, encoding: Encoding.UTF8 })
    return typeof result.data === 'string' ? result.data : null
  } catch {
    return null
  }
}

export function isNativeBackupSupported(): boolean {
  return Capacitor.getPlatform() !== 'web'
}
