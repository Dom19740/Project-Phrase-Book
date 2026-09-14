import { Capacitor } from '@capacitor/core'
import { Directory, Encoding, Filesystem } from '@capacitor/filesystem'
import { Share } from '@capacitor/share'

export interface ExportFileOptions {
  /** Caption text sent alongside the file — e.g. an invite line pointing back to the app. */
  text?: string
  /** Title shown on the native share sheet itself (Android only). */
  dialogTitle?: string
}

/**
 * On the web, an anchor's `download` attribute triggers a save. Android's WebView doesn't honor
 * it — clicking a programmatic `<a download>` silently does nothing, which is why "Export as
 * JSON file" appeared broken on device. There, write to the app's cache dir (no permission
 * needed) and hand the file to the OS share sheet so the user can save it wherever they like.
 *
 * `options.text` rides along as the share's caption (e.g. WhatsApp/Gmail show it next to the
 * attachment). Most apps only unfurl a link's og:image into a rich preview when the share is
 * *just* a URL with no file attached — once a file is present they show it as an attachment with
 * that text as a plain caption, link included but no preview card. There's no way around that
 * from this side; it's how the receiving apps choose to render a combined share.
 */
export async function exportFile(content: string, filename: string, mimeType: string, options?: ExportFileOptions): Promise<void> {
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
  await Share.share({ url: uri, text: options?.text, dialogTitle: options?.dialogTitle })
}
