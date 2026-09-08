import { Capacitor } from '@capacitor/core'
import { SafFile } from './safFile'

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
