export interface SaveFileOptions {
  /** Caption text shown alongside the file in the OS share sheet. */
  text?: string
  /** Title shown at the top of the OS share sheet. */
  title?: string
}

/**
 * Mobile browsers expose no folder picker to web pages - `showDirectoryPicker` isn't implemented
 * on Android Chrome, Firefox for Android, or iOS Safari - so a plain `<a download>` just hands the
 * file to the browser's own download manager with no say from the user about where it lands (and
 * on iOS Safari it can open the file inline instead of saving it at all). Where the Web Share API
 * can share files (Android Chrome, iOS Safari both support this), it opens the real OS share
 * sheet instead, and from there the user can pick "Save to Files"/"Save to Drive"/a specific
 * folder - a location that survives the browser or app cache being cleared, unlike the download
 * folder a bare `<a download>` lands in. Fall back to a plain download only where file sharing
 * isn't supported (desktop browsers, mostly).
 */
export async function saveFileOnWeb(content: string, filename: string, mimeType: string, options?: SaveFileOptions): Promise<void> {
  const file = new File([content], filename, { type: mimeType })
  const nav = navigator as Navigator & { canShare?: (data?: ShareData) => boolean }

  if (nav.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], text: options?.text, title: options?.title })
      return
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return
    }
  }

  const url = URL.createObjectURL(file)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
