import type { Entry, Holiday, Override, Record_ } from './types'
export const uid = () => crypto.randomUUID()
export const toKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
export const fromKey = (k: string) => { const [y, m, d] = k.split('-').map(Number); return new Date(y, m - 1, d) }
export const isSecondSaturday = (d: Date) => d.getDay() === 6 && d.getDate() >= 8 && d.getDate() <= 14
export interface Cal { holidays: Holiday[]; overrides: Override[] }
export function isHoliday(d: Date, c: Cal) {
  const k = toKey(d), o = c.overrides.find(x => x.date === k)
  if (o) return o.type === 'holiday'
  if (c.holidays.some(h => h.date === k)) return true
  return d.getDay() === 0 || isSecondSaturday(d)
}
export const isWorkingDay = (d: Date, c: Cal) => !isHoliday(d, c)
export function getClassesForDate(d: Date, c: Cal, entries: Entry[]) {
  if (!isWorkingDay(d, c)) return []
  return entries.filter(e => e.day === d.getDay()).sort((a, b) => a.start.localeCompare(b.start))
}
export const calculateAttendancePercentage = (p: number, c: number) => (c <= 0 ? null : (p / c) * 100)
// largest x with p/(c+x) >= t  => x = floor(p/t - c)
export function calculateClassesCanMiss(p: number, c: number, thresholdPct: number) {
  const t = thresholdPct / 100
  if (c <= 0 || t <= 0) return null
  return p / c < t ? 0 : Math.floor(p / t - c + 1e-9)
}
// smallest x with (p+x)/(c+x) >= t => x = ceil((t*c - p)/(1-t))
export function calculateClassesRequired(p: number, c: number, thresholdPct: number) {
  const t = thresholdPct / 100
  if (c <= 0 || p / c >= t) return 0
  if (t >= 1) return null // 100% can never be reached after an absence
  return Math.ceil((t * c - p) / (1 - t) - 1e-9)
}
/** Merge saved records with implicit "present" classes for dates that have no records. */
export function collectConducted(start: string, end: string, c: Cal, entries: Entry[], records: Record_[]) {
  const byDate = new Map<string, Record_[]>()
  records.forEach(r => byDate.set(r.date, [...(byDate.get(r.date) ?? []), r]))
  const out: Pick<Record_, 'date' | 'subjectId' | 'status'>[] = []
  for (let d = fromKey(start); toKey(d) <= end; d.setDate(d.getDate() + 1)) {
    const k = toKey(d), saved = byDate.get(k)
    if (saved) saved.forEach(r => out.push(r))
    else getClassesForDate(d, c, entries).forEach(e => out.push({ date: k, subjectId: e.subjectId, status: 'present' }))
  }
  return out.filter(r => r.status !== 'cancelled')
}
export const tally = (rows: { status: string }[]) => ({ present: rows.filter(r => r.status === 'present').length, conducted: rows.length })
