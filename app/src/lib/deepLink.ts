import { Capacitor } from '@capacitor/core'
import { App } from '@capacitor/app'
import { extractShareCode } from './shareImport'

/**
 * Registers the Android App Links listener - a share link tapped while the app is installed
 * opens it directly instead of the browser. A no-op on web, where the equivalent entry point is
 * reading the `?share=` query param on mount instead (see App.tsx) - there's no OS-level link
 * interception for a plain web page.
 */
export function onShareLinkOpened(callback: (code: string) => void): () => void {
  if (Capacitor.getPlatform() === 'web') return () => {}

  let removed = false
  const listenerPromise = App.addListener('appUrlOpen', ({ url }) => {
    const code = extractShareCode(url)
    if (code) callback(code)
  })

  return () => {
    if (removed) return
    removed = true
    listenerPromise.then((listener) => listener.remove())
  }
}

/** Pulls the target language code out of the widget's quick-add link (phrasewidget://add-phrase?languageCode=<code>). */
function extractQuickAddLanguageCode(input: string): string | null {
  try {
    const url = new URL(input)
    if (url.protocol !== 'phrasewidget:' || url.hostname !== 'add-phrase') return null
    return url.searchParams.get('languageCode')
  } catch {
    return null
  }
}

/**
 * Registers the homescreen widget's "quick add" listener - tapping its + button opens the app
 * straight into the add-phrase dialog for whichever language that widget instance was showing.
 * Covers both a warm start (appUrlOpen) and a cold start, where the app wasn't running yet and
 * the launching intent has to be read via getLaunchUrl instead. A no-op on web, same as
 * onShareLinkOpened above - there's no homescreen widget there.
 */
export function onQuickAddRequested(callback: (languageCode: string) => void): () => void {
  if (Capacitor.getPlatform() === 'web') return () => {}

  App.getLaunchUrl().then((result) => {
    const code = result?.url ? extractQuickAddLanguageCode(result.url) : null
    if (code) callback(code)
  })

  let removed = false
  const listenerPromise = App.addListener('appUrlOpen', ({ url }) => {
    const code = extractQuickAddLanguageCode(url)
    if (code) callback(code)
  })

  return () => {
    if (removed) return
    removed = true
    listenerPromise.then((listener) => listener.remove())
  }
}
