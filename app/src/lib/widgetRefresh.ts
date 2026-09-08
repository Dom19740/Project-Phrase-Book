import { Capacitor, registerPlugin } from '@capacitor/core'

export interface WidgetRefreshPlugin {
  /** Re-reads the database and redraws every placed home-screen widget. */
  refresh(): Promise<void>
}

const WidgetRefresh = registerPlugin<WidgetRefreshPlugin>('WidgetRefresh')

/** No-op on web/iOS, where the native widget (and this plugin) doesn't exist. */
export function refreshWidget(): void {
  if (Capacitor.getPlatform() !== 'android') return
  WidgetRefresh.refresh().catch(() => {})
}
