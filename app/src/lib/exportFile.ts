import { Capacitor } from '@capacitor/core'
import { Directory, Encoding, Filesystem } from '@capacitor/filesystem'
import { Share } from '@capacitor/share'

/**
 * On the web, an anchor's `download` attribute triggers a save. Android's WebView doesn't honor
 * it — clicking a programmatic `<a download>` silently does nothing, which is why "Export as
 * JSON file" appeared broken on device. There, write to the app's cache dir (no permission
 * needed) and hand the file to the OS share sheet so the user can save it wherever they like.
 */
export async function exportFile(content: string, filename: string, mimeType: string): Promise<void> {
  if (Capacitor.getPlatform() === 'web') {
    const blob = new Blob([content], { type: mimeType })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
    return
  }

  const { uri } = await Filesystem.writeFile({
    path: filename,
    data: content,
    directory: Directory.Cache,
    encoding: Encoding.UTF8,
  })
  await Share.share({ url: uri })
}
