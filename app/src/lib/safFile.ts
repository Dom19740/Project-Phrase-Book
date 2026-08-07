import { registerPlugin } from '@capacitor/core'

export interface SafFilePlugin {
  /** Opens Android's "Save As" system dialog (internal storage, SD card, Google Drive, ...). */
  saveFile(options: { data: string; filename: string; mimeType?: string }): Promise<{ uri: string }>
  /** Opens Android's system file picker to read an existing file's contents as text. */
  pickFile(options?: { mimeType?: string }): Promise<{ data: string; name: string }>
}

export const SafFile = registerPlugin<SafFilePlugin>('SafFile')
