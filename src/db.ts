import Dexie, { type Table } from 'dexie'
import type { Subject, Entry, Record_, Holiday, Override, Settings } from './types'
import { toKey } from './logic'
class AppDB extends Dexie {
  settings!: Table<Settings, string>; subjects!: Table<Subject, string>; entries!: Table<Entry, string>
  records!: Table<Record_, string>; holidays!: Table<Holiday, string>; overrides!: Table<Override, string>
  constructor() {
    super('attendance-tracker')
    this.version(1).stores({ settings: 'id', subjects: 'id', entries: 'id, day', records: 'id, date, subjectId', holidays: 'date', overrides: 'date' })
  }
}
export const db = new AppDB()
export const defaultSettings = (): Settings => ({ id: 'main', threshold: 75, theme: 'light', startDate: toKey(new Date()) })
const TABLES = ['settings', 'subjects', 'entries', 'records', 'holidays', 'overrides'] as const
export async function generateBackup() {
  const data: Record<string, unknown[]> = {}
  for (const t of TABLES) data[t] = await db.table(t).toArray()
  return { app: 'attendance-tracker', version: 1, exportedAt: new Date().toISOString(), data }
}
export function validateBackup(x: any): string | null {
  if (!x || x.app !== 'attendance-tracker' || typeof x.data !== 'object') return 'This is not an Attendance Tracker backup file.'
  for (const t of TABLES) if (!Array.isArray(x.data[t])) return `Backup is missing the "${t}" section.`
  if (x.data.subjects.some((s: any) => !s.id || !s.name)) return 'A subject in the backup is invalid.'
  return null
}
export async function restoreBackup(x: any) {
  const err = validateBackup(x); if (err) throw new Error(err)
  await db.transaction('rw', TABLES.map(t => db.table(t)), async () => {
    for (const t of TABLES) { await db.table(t).clear(); await db.table(t).bulkAdd(x.data[t]) }
  })
}
export async function clearAll() { await Promise.all(TABLES.map(t => db.table(t).clear())) }
