import { CapacitorSQLite, SQLiteConnection, SQLiteDBConnection } from '@capacitor-community/sqlite'
import { Capacitor } from '@capacitor/core'
import { CREATE_TABLES_SQL } from './schema'
import { setupWebStore } from './webStore'

const DB_NAME = 'phrasebook'
const isWeb = Capacitor.getPlatform() === 'web'
const sqlite = new SQLiteConnection(CapacitorSQLite)

let dbPromise: Promise<SQLiteDBConnection> | null = null
const mutationListeners: (() => void)[] = []

/** Subscribes to every successful write (used by auto-backup) without client.ts needing to know about backups. */
export function onMutation(listener: () => void): void {
  mutationListeners.push(listener)
}

async function openConnection(): Promise<SQLiteDBConnection> {
  await setupWebStore()
  if (isWeb) await sqlite.initWebStore()

  const isConn = (await sqlite.isConnection(DB_NAME, false)).result
  const db = isConn
    ? await sqlite.retrieveConnection(DB_NAME, false)
    : await sqlite.createConnection(DB_NAME, false, 'no-encryption', 1, false)

  await db.open()
  await db.execute(CREATE_TABLES_SQL)
  await migrate(db)
  if (isWeb) await sqlite.saveToStore(DB_NAME)

  return db
}

/** One-off column additions for databases created before a schema change — CREATE TABLE IF NOT EXISTS doesn't retrofit existing tables. */
async function migrate(db: SQLiteDBConnection): Promise<void> {
  const columns = await db.query('PRAGMA table_info(languages);')
  const hasColor = (columns.values ?? []).some((c) => c.name === 'color')
  if (!hasColor) {
    await db.execute("ALTER TABLE languages ADD COLUMN color TEXT NOT NULL DEFAULT '#207781';")
  }
}

/** Lazily opens (or reuses) the single app-wide SQLite connection. */
export function getDb(): Promise<SQLiteDBConnection> {
  if (!dbPromise) dbPromise = openConnection()
  return dbPromise
}

/** Flush pending writes to IndexedDB on web. No-op on native, where writes are already durable. */
export async function persist(): Promise<void> {
  if (isWeb) await sqlite.saveToStore(DB_NAME)
  for (const listener of mutationListeners) listener()
}
