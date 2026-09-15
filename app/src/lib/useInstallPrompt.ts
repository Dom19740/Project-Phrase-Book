import { useCallback, useEffect, useState } from 'react'
import { detectInstallablePlatform, type InstallablePlatform } from './platform'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

/** Chrome/Android fires this once, early in page load, then never again - so it's captured at
 * module scope (evaluated as soon as this file is imported) rather than in a component effect,
 * which could easily mount after the event already fired. */
let deferredPrompt: BeforeInstallPromptEvent | null = null
const listeners = new Set<() => void>()

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault()
    deferredPrompt = e as BeforeInstallPromptEvent
    listeners.forEach((l) => l())
  })
  window.addEventListener('appinstalled', () => {
    deferredPrompt = null
    listeners.forEach((l) => l())
  })
}

/**
 * Surfaces the "add to home screen" opportunity for a mobile browser tab (never the installed
 * Capacitor app). iOS has no install API at all - the caller has to show manual instructions -
 * so `canPromptNatively` only ever applies to `platform === 'android'`.
 */
export function useInstallPrompt() {
  const [platform] = useState<InstallablePlatform | null>(detectInstallablePlatform)
  const [canPromptNatively, setCanPromptNatively] = useState(() => deferredPrompt != null)

  useEffect(() => {
    const listener = () => setCanPromptNatively(deferredPrompt != null)
    listeners.add(listener)
    return () => {
      listeners.delete(listener)
    }
  }, [])

  const promptInstall = useCallback(async (): Promise<boolean> => {
    if (!deferredPrompt) return false
    await deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    deferredPrompt = null
    setCanPromptNatively(false)
    return outcome === 'accepted'
  }, [])

  return { platform, canPromptNatively, promptInstall }
}
