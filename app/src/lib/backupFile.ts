import { Capacitor } from '@capacitor/core'
import { SafFile } from './safFile'

function backupFilename(): string {
  const date = new Date().toISOString().slice(0, 10)
  return `travelchatter-backup-${date}.json`
}

/** Prompts the user to choose where to save (device storage, Google Drive, ...) and writes the backup there. */
export async function saveBackupToPickedLocation(json: string): Promise<void> {
  const filename = backupFilename()

  if (Capacitor.getPlatform() !== 'web') {
    await SafFile.saveFile({ data: json, filename, mimeType: 'application/json' })
    return
  }

  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

function pickWebFile(accept: string): Promise<{ name: string; data: string }> {
  return new Promise<{ name: string; data: string }>((resolve, reject) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = accept
    input.onchange = () => {
      const file = input.files?.[0]
      if (!file) {
        reject(new Error('No file selected.'))
        return
      }
      const reader = new FileReader()
      reader.onload = () => resolve({ name: file.name, data: String(reader.result) })
      reader.onerror = () => reject(new Error('Failed to read file.'))
      reader.readAsText(file)
    }
    input.click()
  })
}

/** Prompts the user to pick a backup file (device storage, Google Drive, ...) and returns its name and contents. */
export async function readBackupFromPickedLocation(): Promise<{ name: string; data: string }> {
  if (Capacitor.getPlatform() !== 'web') {
    // A strict "application/json" filter hides files that providers (e.g. Google Drive) tag with a
    // different MIME type, which made the browser look different from the save dialog. "*/*" shows
    // everything, same full storage/Drive browsing experience as saving.
    return await SafFile.pickFile({ mimeType: '*/*' })
  }
  return pickWebFile('.json,application/json')
}

/**
 * Prompts the user to pick a phrase list file (device storage, Google Drive, ...) and returns its
 * name and contents — a CSV, or a plain .txt list of phrases typed one per line.
 */
export async function readCsvFromPickedLocation(): Promise<{ name: string; data: string }> {
  if (Capacitor.getPlatform() !== 'web') {
    return await SafFile.pickFile({ mimeType: '*/*' })
  }
  return pickWebFile('.csv,.txt,text/csv,text/plain')
}
