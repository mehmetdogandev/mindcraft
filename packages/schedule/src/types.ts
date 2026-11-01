export type ISODate = string
export type HHMM = string
export type Weekday = 1 | 2 | 3 | 4 | 5 | 6 | 7

export type CourseMode = 'in_person' | 'online' | 'hybrid'
export type CourseProgressStatus = 'current' | 'completed' | 'archived'
export type CourseSource = 'academic' | 'personal'
export type RealmId =
  | 'math'
  | 'code'
  | 'science'
  | 'history'
  | 'language'
  | 'finance'
  | 'custom'

export type PlanWindow = 'pre' | 'post' | 'evening' | 'explore'

export interface ScheduleTerm {
  id: string
  name: string
  startDate: ISODate
  classEndDate?: ISODate | null
  endDate: ISODate
  isActive: boolean
}

export interface ScheduleCourse {
  id: string
  termId?: string | null
  name: string
  code?: string | null
  realmId: RealmId
  color: string
  mode: CourseMode
  source: CourseSource
  progressStatus: CourseProgressStatus
}

export interface ScheduleMeeting {
  id: string
  courseId: string
  weekday: Weekday
  startTime: HHMM
  endTime: HHMM
  room?: string | null
  label?: string | null
}

export type ExceptionKind = 'cancel' | 'reschedule' | 'makeup' | 'holiday'

export interface ScheduleException {
  id: string
  courseId?: string | null
  date: ISODate
  kind: ExceptionKind
  startTime?: HHMM | null
  endTime?: HHMM | null
  note?: string | null
}

export interface Occurrence {
  key: string
  courseId: string
  meetingId: string
  date: ISODate
  weekday: Weekday
  startTime: HHMM
  endTime: HHMM
  room: string | null
  label: string | null
  cancelled: boolean
}

export const REALM_NODES: Array<{
  id: RealmId
  name: string
  color: string
}> = [
  { id: 'math', name: 'Mantık Evreni', color: '#8c31ff' },
  { id: 'code', name: 'Algoritma Kulesi', color: '#06b6d4' },
  { id: 'science', name: 'Bilim Nebulası', color: '#10b981' },
  { id: 'history', name: 'Zaman Arşivi', color: '#f59e0b' },
  { id: 'language', name: 'Dil Bahçesi', color: '#f472b6' },
  { id: 'finance', name: 'Kaynak Dünyası', color: '#84cc16' },
  { id: 'custom', name: 'Keşif', color: '#a78bfa' },
]
