import { Capacitor } from '@capacitor/core'
import { App } from '@capacitor/app'

/** Extracts a share code from a full Android App Links URL, e.g. https://travelchatter.dpbcreative.com/c/<code>. */
export function parseShareCode(url: string): string | null {
  try {
    const parsed = new URL(url)
    const match = parsed.pathname.match(/^\/c\/([A-Za-z0-9]+)$/)
    return match ? match[1] : null
  } catch {
    return null
  }
}

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
    const code = parseShareCode(url)
    if (code) callback(code)
  })

  return () => {
    if (removed) return
    removed = true
    listenerPromise.then((listener) => listener.remove())
  }
}
