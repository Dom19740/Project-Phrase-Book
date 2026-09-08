import { registerPlugin } from '@capacitor/core'

export interface SafBackupFileInfo {
  name: string
  mtime: number
}

export interface SafFilePlugin {
  /** Opens Android's "Save As" system dialog (internal storage, SD card, Google Drive, ...). */
  saveFile(options: { data: string; filename: string; mimeType?: string }): Promise<{ uri: string }>
  /** Opens Android's system file picker to read an existing file's contents as text. */
  pickFile(options?: { mimeType?: string }): Promise<{ data: string; name: string }>
  /** Opens Android's system folder picker and persists access to the chosen folder across app restarts. */
  pickFolder(): Promise<{ uri: string; label: string }>
  /** Writes (overwriting any existing file of the same name) into a folder previously granted via pickFolder. */
  writeInFolder(options: { folderUri: string; filename: string; data: string; mimeType?: string }): Promise<void>
  /** Lists the files directly inside a folder previously granted via pickFolder. */
  listFolder(options: { folderUri: string }): Promise<{ files: SafBackupFileInfo[] }>
  /** Reads a file's contents as text from a folder previously granted via pickFolder. */
  readInFolder(options: { folderUri: string; filename: string }): Promise<{ data: string }>
}

export const SafFile = registerPlugin<SafFilePlugin>('SafFile')
