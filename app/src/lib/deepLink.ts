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
