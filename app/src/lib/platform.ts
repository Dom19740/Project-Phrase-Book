import { Capacitor } from '@capacitor/core'

export type InstallablePlatform = 'ios' | 'android'

/** The only real Travel Chatter app on Android is the Play Store one - it's what actually gets you
 * auto-backup and the home-screen widget, neither of which a browser tab (or a bare "Add to Home
 * Screen" shortcut, which is still just the same browser tab) can provide. */
export const ANDROID_PLAY_STORE_URL = 'https://play.google.com/store/apps/details?id=com.dpbcreative.travelchatter'

function isIosDevice(): boolean {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !('MSStream' in window)
}

function isAndroidDevice(): boolean {
  return /Android/.test(navigator.userAgent)
}

/** True once the page is already running as an installed home-screen app rather than a browser tab.
 * iOS Safari exposes this only via the non-standard `navigator.standalone`; everywhere else it's the
 * `display-mode` media feature. */
function isRunningStandalone(): boolean {
  return window.matchMedia('(display-mode: standalone)').matches || (navigator as { standalone?: boolean }).standalone === true
}

/** Which "add to home screen" flow (if any) applies here - null in the native Capacitor shell,
 * on desktop, or once already installed, since there's nothing left to prompt for. */
export function detectInstallablePlatform(): InstallablePlatform | null {
  if (Capacitor.getPlatform() !== 'web') return null
  if (isRunningStandalone()) return null
  if (isIosDevice()) return 'ios'
  if (isAndroidDevice()) return 'android'
  return null
}
