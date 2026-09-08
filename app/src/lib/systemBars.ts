import { SystemBars, SystemBarsStyle } from '@capacitor/core'

/** Keeps the OS status/navigation bar icons matching the app's resolved theme (light icons on
 * dark, dark icons on light) instead of only following the device's OS-level setting, which can
 * diverge once the user picks an in-app theme override. Android 15+ no longer allows apps to
 * paint the bar itself (edge-to-edge is enforced), so icon contrast is the lever available. */
export function syncStatusBarStyle(theme: 'dark' | 'light'): void {
  SystemBars.setStyle({ style: theme === 'dark' ? SystemBarsStyle.Dark : SystemBarsStyle.Light }).catch(() => {})
}
