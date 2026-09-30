import { useEffect, useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, defaultSettings, generateBackup, restoreBackup, clearAll } from './db'
import * as L from './logic'
import type { Subject, Entry, Record_, Status } from './types'

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
type Tab = 'today' | 'setup' | 'settings'

export default function App() {
  const settings = useLiveQuery(() => db.settings.get('main'))
  const subjects = useLiveQuery(() => db.subjects.toArray(), [], [] as Subject[])
  const entries = useLiveQuery(() => db.entries.toArray(), [], [] as Entry[])
  const records = useLiveQuery(() => db.records.toArray(), [], [] as Record_[])
  const holidays = useLiveQuery(() => db.holidays.toArray(), [], [])
  const overrides = useLiveQuery(() => db.overrides.toArray(), [], [])
  const [tab, setTab] = useState<Tab>('today')
  const [toast, setToast] = useState('')
  const say = (m: string) => { setToast(m); setTimeout(() => setToast(''), 3000) }

  useEffect(() => { db.settings.get('main').then(s => { if (!s) db.settings.put(defaultSettings()) }) }, [])
  useEffect(() => { document.documentElement.classList.toggle('dark', settings?.theme === 'dark') }, [settings?.theme])
  if (!settings) return null
  const cal = { holidays, overrides }
  const ctx = { settings, subjects, entries, records, cal, say }
  return (
    <div className="mx-auto max-w-5xl md:flex">
      <nav aria-label="Main" className="fixed bottom-0 inset-x-0 z-10 flex border-t bg-[var(--card)] md:static md:w-48 md:flex-col md:border-t-0 md:border-r md:min-h-screen md:p-3 md:gap-1" style={{ borderColor: 'var(--line)' }}>
        {([['today', 'Today'], ['setup', 'Subjects & timetable'], ['settings', 'Settings']] as [Tab, string][]).map(([k, label]) => (
          <button key={k} onClick={() => setTab(k)} aria-current={tab === k} className={`flex-1 py-4 text-sm font-semibold md:text-left md:px-3 md:py-2 md:rounded-lg ${tab === k ? 'text-[#1f5c4d] dark:text-emerald-300 md:bg-emerald-100/60 dark:md:bg-emerald-900/30' : 'mute'}`}>{label}</button>
        ))}
      </nav>
      <main className="flex-1 p-4 pb-28 md:pb-8 space-y-4">
        {tab === 'today' && <Today {...ctx} />}
        {tab === 'setup' && <Setup {...ctx} />}
        {tab === 'settings' && <SettingsPage {...ctx} />}
      </main>
      {toast && <div role="status" className="fixed top-4 left-1/2 -translate-x-1/2 z-20 bg-[#16211d] text-white px-4 py-2 rounded-lg shadow">{toast}</div>}
    </div>
  )
}
type Ctx = { settings: NonNullable<ReturnType<typeof useLiveQuery<any>>> & any; subjects: Subject[]; entries: Entry[]; records: Record_[]; cal: L.Cal; say: (m: string) => void }

function Today({ settings, subjects, entries, records, cal, say }: Ctx) {
  const [date, setDate] = useState(L.toKey(new Date()))
  const today = L.toKey(new Date())
  const d = L.fromKey(date)
  const classes = L.getClassesForDate(d, cal, entries)
  const saved = records.filter(r => r.date === date)
  const rows = classes.map(e => ({ e, r: saved.find(r => r.entryId === e.id) }))
  const name = (id: string) => subjects.find(s => s.id === id)
  const set = async (e: Entry, status: Status) => {
    const id = `${date}_${e.id}`
    await db.records.put({ id, date, entryId: e.id, subjectId: e.subjectId, start: e.start, end: e.end, status })
  }
  const setDay = async (status: Status) => {
    if (!confirm(`Mark all ${classes.length} classes on this day as ${status}?`)) return
    for (const e of classes) await set(e, status)
    say(`Day marked ${status}`)
  }
  const rowsAll = useMemo(() => L.collectConducted(settings.startDate, today, cal, entries, records), [settings.startDate, cal, entries, records, today])
  const tot = L.tally(rowsAll)
  const pct = L.calculateAttendancePercentage(tot.present, tot.conducted)
  return <>
    <header className="flex items-end justify-between gap-3">
      <div><p className="mute text-sm">{date === today ? 'Today' : 'Viewing'}</p><h1 className="text-2xl font-bold">{d.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })}</h1></div>
      <input aria-label="Select date" type="date" value={date} onChange={e => e.target.value && setDate(e.target.value)} className="inp !w-auto" />
    </header>
    <section className="card p-5 flex items-baseline gap-4">
      <div className="text-5xl font-extrabold tabular-nums">{pct === null ? '—' : pct.toFixed(1) + '%'}</div>
      <div className="mute text-sm">{pct === null ? 'No attendance recorded yet' : `${tot.present} attended of ${tot.conducted} conducted`}<br />Minimum {settings.threshold}%</div>
    </section>
    <section aria-label="Classes" className="space-y-2">
      {rows.length === 0 && <p className="card p-4 mute">{L.isHoliday(d, cal) ? 'Holiday — nothing to mark.' : 'No classes in the timetable for this day. Add some under Subjects & timetable.'}</p>}
      {rows.map(({ e, r }) => { const s = name(e.subjectId); const st = r?.status ?? 'present'; return (
        <div key={e.id} className="card p-3 flex items-center gap-3">
          <div className="flex-1 min-w-0"><div className="font-semibold truncate">{s?.name ?? 'Deleted subject'}{s?.type === 'lab' && ' (Lab)'}</div><div className="mute text-sm">{e.start}–{e.end}{e.room && ` · ${e.room}`}</div></div>
          {(['present', 'absent'] as Status[]).map(k => (
            <button key={k} aria-pressed={st === k} aria-label={`${k} for ${s?.name}`} onClick={() => set(e, k)} className={`btn min-w-[4.5rem] h-12 ${st === k ? (k === 'present' ? 'btn-p' : '!bg-red-600 !text-white !border-red-600') : ''}`}>{k === 'present' ? 'Present' : 'Absent'}</button>))}
        </div>) })}
      {rows.length > 0 && <div className="flex gap-2"><button className="btn flex-1" onClick={() => setDay('absent')}>Mark whole day absent</button><button className="btn flex-1" onClick={() => setDay('present')}>Mark whole day present</button></div>}
    </section>
    <h2 className="font-bold pt-2">By subject</h2>
    <section className="grid gap-3 sm:grid-cols-2">
      {subjects.length === 0 && <p className="mute">Add subjects to see per-subject attendance.</p>}
      {subjects.map(s => { const t = L.tally(rowsAll.filter(r => r.subjectId === s.id)); const p = L.calculateAttendancePercentage(t.present, t.conducted)
        const miss = L.calculateClassesCanMiss(t.present, t.conducted, settings.threshold), need = L.calculateClassesRequired(t.present, t.conducted, settings.threshold)
        const low = p !== null && p < settings.threshold
        return <div key={s.id} className="card p-4" style={{ borderLeft: `5px solid ${low ? '#dc2626' : '#1f5c4d'}` }}>
          <div className="flex justify-between"><b>{s.name}</b><b className="tabular-nums">{p === null ? '—' : p.toFixed(0) + '%'}</b></div>
          <div className="mute text-sm">{t.present} / {t.conducted}</div>
          <p className="text-sm mt-1">{p === null ? 'No attendance recorded' : low ? (need === null ? 'Threshold can no longer be reached' : `Attend the next ${need} class${need === 1 ? '' : 'es'} in a row to reach ${settings.threshold}%`) : `You can miss ${miss} more class${miss === 1 ? '' : 'es'} and stay at ${settings.threshold}%`}</p>
        </div> })}
    </section>
  </>
}

function Setup({ subjects, entries, say }: Ctx) {
  const [f, setF] = useState({ name: '', code: '', type: 'theory' as Subject['type'] })
  const [day, setDay] = useState(1)
  const [e, setE] = useState({ start: '09:00', end: '10:00', subjectId: '' })
  const addSubject = async () => {
    if (!f.name.trim()) return say('Enter a subject name')
    await db.subjects.add({ id: L.uid(), name: f.name.trim(), code: f.code.trim() || f.name.slice(0, 4).toUpperCase(), type: f.type }); setF({ ...f, name: '', code: '' })
  }
  const delSubject = async (s: Subject) => {
    const n = await db.records.where('subjectId').equals(s.id).count()
    if (!confirm(`Delete ${s.name}? ${n} attendance record(s) will keep the subject id but lose their name.`)) return
    await db.subjects.delete(s.id); await db.entries.where('day').between(0, 6, true, true).filter(x => x.subjectId === s.id).delete()
  }
  const addEntry = async () => {
    const sid = e.subjectId || subjects[0]?.id
    if (!sid) return say('Add a subject first')
    if (e.end <= e.start) return say('End time must be after start time')
    await db.entries.add({ id: L.uid(), day, start: e.start, end: e.end, subjectId: sid })
  }
  return <>
    <h1 className="text-2xl font-bold">Subjects</h1>
    <div className="card p-4 grid gap-2 sm:grid-cols-4">
      <input className="inp sm:col-span-2" placeholder="Subject name" aria-label="Subject name" value={f.name} onChange={x => setF({ ...f, name: x.target.value })} />
      <input className="inp" placeholder="Code" aria-label="Short code" value={f.code} onChange={x => setF({ ...f, code: x.target.value })} />
      <select className="inp" aria-label="Type" value={f.type} onChange={x => setF({ ...f, type: x.target.value as Subject['type'] })}><option value="theory">Theory</option><option value="lab">Lab</option></select>
      <button className="btn btn-p sm:col-span-4" onClick={addSubject}>Add subject</button>
    </div>
    <ul className="space-y-2">{subjects.map(s => <li key={s.id} className="card p-3 flex justify-between items-center"><span>{s.name} <span className="mute text-sm">{s.code} · {s.type}</span></span><button className="btn" onClick={() => delSubject(s)} aria-label={`Delete ${s.name}`}>Delete</button></li>)}</ul>
    <h1 className="text-2xl font-bold pt-2">Weekly timetable</h1>
    <div className="card p-4 grid gap-2 sm:grid-cols-5">
      <select className="inp" aria-label="Day" value={day} onChange={x => setDay(+x.target.value)}>{[1, 2, 3, 4, 5, 6].map(i => <option key={i} value={i}>{DAYS[i]}</option>)}</select>
      <input className="inp" type="time" aria-label="Start" value={e.start} onChange={x => setE({ ...e, start: x.target.value })} />
      <input className="inp" type="time" aria-label="End" value={e.end} onChange={x => setE({ ...e, end: x.target.value })} />
      <select className="inp sm:col-span-2" aria-label="Subject" value={e.subjectId} onChange={x => setE({ ...e, subjectId: x.target.value })}>{subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select>
      <button className="btn btn-p sm:col-span-5" onClick={addEntry}>Add period</button>
    </div>
    {[1, 2, 3, 4, 5, 6].map(i => <div key={i}><h2 className="font-bold mb-1">{DAYS[i]}</h2>
      {entries.filter(x => x.day === i).sort((a, b) => a.start.localeCompare(b.start)).map(x => <div key={x.id} className="card p-2 px-3 mb-1 flex justify-between"><span>{x.start}–{x.end} · {subjects.find(s => s.id === x.subjectId)?.name ?? '?'}</span><button className="mute" aria-label="Remove period" onClick={() => db.entries.delete(x.id)}>Remove</button></div>)}</div>)}
  </>
}

function SettingsPage({ settings, say }: Ctx) {
  const [hol, setHol] = useState({ date: '', name: '', type: 'holiday' as 'holiday' | 'working' })
  const holidays = useLiveQuery(() => db.holidays.toArray(), [], []); const overrides = useLiveQuery(() => db.overrides.toArray(), [], [])
  const put = (p: Partial<typeof settings>) => db.settings.update('main', p)
  const exportData = async () => {
    const blob = new Blob([JSON.stringify(await generateBackup(), null, 2)], { type: 'application/json' })
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `attendance-backup-${L.toKey(new Date())}.json`; a.click(); say('Backup downloaded')
  }
  const importData = async (file?: File) => {
    if (!file) return
    try { const j = JSON.parse(await file.text()); if (!confirm('Replace ALL current data with this backup?')) return; await restoreBackup(j); say('Backup restored') }
    catch (err: any) { say(err.message?.startsWith('Unexpected') ? 'That file is not valid JSON.' : err.message) }
  }
  const addDate = async () => {
    if (!hol.date) return say('Pick a date')
    if (hol.type === 'holiday' && !hol.name) return say('Name the holiday')
    if (hol.name && hol.type === 'holiday') await db.holidays.put({ date: hol.date, name: hol.name }); else await db.overrides.put({ date: hol.date, type: hol.type, reason: hol.name })
    setHol({ date: '', name: '', type: 'holiday' })
  }
  return <>
    <h1 className="text-2xl font-bold">Settings</h1>
    <div className="card p-4 space-y-3">
      <label className="block">Minimum attendance (%)<input className="inp mt-1" type="number" min={1} max={100} value={settings.threshold} onChange={e => { const v = +e.target.value; if (v >= 1 && v <= 100) put({ threshold: v }) }} /></label>
      <label className="block">Tracking starts on<input className="inp mt-1" type="date" value={settings.startDate} onChange={e => e.target.value && put({ startDate: e.target.value })} /></label>
      <button className="btn" onClick={() => put({ theme: settings.theme === 'dark' ? 'light' : 'dark' })}>Switch to {settings.theme === 'dark' ? 'light' : 'dark'} mode</button>
    </div>
    <h2 className="font-bold">Holidays & working-day overrides</h2>
    <p className="mute text-sm">Sundays and second Saturdays are holidays automatically. Add a "working day" to override them.</p>
    <div className="card p-4 grid gap-2 sm:grid-cols-4">
      <input className="inp" type="date" aria-label="Date" value={hol.date} onChange={e => setHol({ ...hol, date: e.target.value })} />
      <select className="inp" aria-label="Type" value={hol.type} onChange={e => setHol({ ...hol, type: e.target.value as any })}><option value="holiday">Holiday</option><option value="working">Working day</option></select>
      <input className="inp" placeholder="Name / reason" value={hol.name} onChange={e => setHol({ ...hol, name: e.target.value })} />
      <button className="btn btn-p" onClick={addDate}>Add</button>
    </div>
    {holidays.map(h => <div key={h.date} className="card p-2 px-3 flex justify-between"><span>{h.date} · {h.name}</span><button className="mute" onClick={() => db.holidays.delete(h.date)}>Remove</button></div>)}
    {overrides.map(o => <div key={o.date} className="card p-2 px-3 flex justify-between"><span>{o.date} · {o.type === 'working' ? 'Working day' : 'Holiday'} {o.reason}</span><button className="mute" onClick={() => db.overrides.delete(o.date)}>Remove</button></div>)}
    <h2 className="font-bold">Your data</h2>
    <p className="mute text-sm">Stored only in this browser. Export a backup before clearing browser data or switching phones.</p>
    <div className="flex flex-wrap gap-2">
      <button className="btn btn-p" onClick={exportData}>Export data</button>
      <label className="btn cursor-pointer">Import data<input type="file" accept="application/json" className="sr-only" onChange={e => { importData(e.target.files?.[0]); e.target.value = '' }} /></label>
      <button className="btn !text-red-600" onClick={async () => { if (prompt('Type DELETE to erase everything') === 'DELETE') { await clearAll(); await db.settings.put(defaultSettings()); say('All data cleared') } }}>Clear all data</button>
    </div>
  </>
}
