export type Status = 'present' | 'absent' | 'cancelled'
export interface Subject { id: string; name: string; code: string; type: 'theory' | 'lab'; faculty?: string; room?: string }
export interface Entry { id: string; day: number; start: string; end: string; subjectId: string; room?: string }
export interface Record_ { id: string; date: string; entryId: string; subjectId: string; start: string; end: string; status: Status; note?: string }
export interface Holiday { date: string; name: string }
export interface Override { date: string; type: 'working' | 'holiday'; reason?: string }
export interface Settings { id: 'main'; threshold: number; theme: 'light' | 'dark'; startDate: string }
