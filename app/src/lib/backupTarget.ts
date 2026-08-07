import { Directory, Encoding, Filesystem } from '@capacitor/filesystem'
import { Capacitor } from '@capacitor/core'

const BACKUP_PATH = 'PhraseBook/backup.json'

/** Silent safety-net copy the app keeps for itself, separate from the user-picked backup file. */
export async function writeBackupFile(json: string): Promise<void> {
  await Filesystem.writeFile({
    path: BACKUP_PATH,
    data: json,
    directory: Directory.Data,
    encoding: Encoding.UTF8,
    recursive: true,
  })
}

export function isNativeBackupSupported(): boolean {
  return Capacitor.getPlatform() !== 'web'
}
