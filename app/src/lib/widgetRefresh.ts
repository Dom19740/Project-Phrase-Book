import { Capacitor, registerPlugin } from '@capacitor/core'

export interface WidgetRefreshPlugin {
  /** Re-reads the database and redraws every placed home-screen widget. */
  refresh(): Promise<void>
  /** Pushes the app's current theme/accent so the widget's colors match instead of only following the OS setting. */
  syncTheme(options: { theme: string; accent: string }): Promise<void>
}

const WidgetRefresh = registerPlugin<WidgetRefreshPlugin>('WidgetRefresh')

/** No-op on web/iOS, where the native widget (and this plugin) doesn't exist. */
export function refreshWidget(): void {
  if (Capacitor.getPlatform() !== 'android') return
  WidgetRefresh.refresh().catch(() => {})
}

/** Called whenever the app's resolved theme or (pre-light-mode-swap) accent choice changes, so the
 * widget can mirror it — it applies the same light-mode accent swap itself once it knows the theme. */
export function syncWidgetTheme(theme: 'dark' | 'light', accent: string): void {
  if (Capacitor.getPlatform() !== 'android') return
  WidgetRefresh.syncTheme({ theme, accent }).catch(() => {})
}
