import { Capacitor } from '@capacitor/core'
import { Share } from '@capacitor/share'

/**
 * Shares a bare URL (no attached file) through the OS share sheet. Most apps (WhatsApp, Slack,
 * iMessage) only unfurl a rich link preview when the share is *just* a URL with no file attached -
 * see the note in exportFile.ts - which is exactly what makes a link nicer to share than the
 * existing CSV file export. Falls back to the clipboard where no share surface exists (desktop
 * browsers, mostly), matching saveFileOnWeb's fallback ladder for the file-export flow.
 */
export async function shareUrl(url: string, text?: string, dialogTitle?: string): Promise<'shared' | 'copied'> {
  if (Capacitor.getPlatform() !== 'web') {
    await Share.share({ url, text, dialogTitle })
    return 'shared'
  }

  const nav = navigator as Navigator & { canShare?: (data?: ShareData) => boolean }
  if (nav.canShare?.({ url })) {
    try {
      await navigator.share({ url, text, title: dialogTitle })
      return 'shared'
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return 'shared'
    }
  }

  await navigator.clipboard.writeText(text ? `${text}\n${url}` : url)
  return 'copied'
}
