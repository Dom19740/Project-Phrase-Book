import { Capacitor } from '@capacitor/core'
import { defineCustomElements as jeepSqlite } from 'jeep-sqlite/loader'

/**
 * @capacitor-community/sqlite has no native SQLite engine in a browser, so on
 * the web platform it persists to IndexedDB via the jeep-sqlite custom element
 * + sql.js wasm. This must run once before any connection is opened.
 */
export async function setupWebStore(): Promise<void> {
  if (Capacitor.getPlatform() !== 'web') return

  jeepSqlite(window)
  if (!document.querySelector('jeep-sqlite')) {
    document.body.appendChild(document.createElement('jeep-sqlite'))
  }
  await customElements.whenDefined('jeep-sqlite')
}
