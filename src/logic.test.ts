import { describe, it, expect } from 'vitest'
import * as L from './logic'
const cal = { holidays: [{ date: '2026-10-02', name: 'Gandhi Jayanti' }], overrides: [{ date: '2026-10-04', type: 'working' as const }] }
const entries = [{ id: 'a', day: 1, start: '09:00', end: '10:00', subjectId: 's' }, { id: 'b', day: 1, start: '14:00', end: '16:00', subjectId: 'lab' }, { id: 'c', day: 0, start: '10:00', end: '11:00', subjectId: 's' }]
const d = (s: string) => L.fromKey(s)
describe('calendar', () => {
  it('weekdays work', () => { expect(L.isWorkingDay(d('2026-09-28'), cal)).toBe(true); expect(L.isWorkingDay(d('2026-09-25'), cal)).toBe(true) })
  it('Saturdays', () => { expect(L.isHoliday(d('2026-09-05'), cal)).toBe(false); expect(L.isHoliday(d('2026-09-12'), cal)).toBe(true); expect(L.isHoliday(d('2026-09-19'), cal)).toBe(false) })
  it('Sunday holiday, override works', () => { expect(L.isHoliday(d('2026-09-27'), cal)).toBe(true); expect(L.isHoliday(d('2026-10-04'), cal)).toBe(false) })
  it('custom holiday', () => expect(L.getClassesForDate(d('2026-10-02'), cal, entries)).toEqual([]))
  it('classes per day, lab is one event', () => expect(L.getClassesForDate(d('2026-09-28'), cal, entries).length).toBe(2))
  it('Sunday override generates classes', () => expect(L.getClassesForDate(d('2026-10-04'), cal, entries).length).toBe(1))
})
describe('math', () => {
  it('percentage', () => { expect(L.calculateAttendancePercentage(45, 50)).toBe(90); expect(L.calculateAttendancePercentage(0, 0)).toBeNull(); expect(L.calculateAttendancePercentage(0, 5)).toBe(0) })
  it('can miss', () => { expect(L.calculateClassesCanMiss(45, 50, 75)).toBe(10); expect(L.calculateClassesCanMiss(30, 40, 75)).toBe(0); expect(L.calculateClassesCanMiss(100, 100, 75)).toBe(33) })
  it('required', () => { expect(L.calculateClassesRequired(34, 50, 75)).toBe(14); expect(L.calculateClassesRequired(3, 4, 75)).toBe(0); expect(L.calculateClassesRequired(0, 5, 100)).toBeNull() })
  it('required actually reaches threshold', () => { const x = L.calculateClassesRequired(34, 50, 75)!; expect((34 + x) / (50 + x)).toBeGreaterThanOrEqual(.75); expect((34 + x - 1) / (50 + x - 1)).toBeLessThan(.75) })
})
