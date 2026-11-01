import type { HHMM, ISODate, Weekday } from './types.ts'

const ISO_DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/
const HHMM_RE = /^([01]\d|2[0-3]):([0-5]\d)$/

export function isISODate(value: string): boolean {
  const m = ISO_DATE_RE.exec(value)
  if (!m) return false
  const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]))
  return (
    d.getUTCFullYear() === +m[1] &&
    d.getUTCMonth() === +m[2] - 1 &&
    d.getUTCDate() === +m[3]
  )
}

export function isHHMM(value: string): boolean {
  return HHMM_RE.test(value)
}

function toUTC(iso: ISODate): Date {
  const m = ISO_DATE_RE.exec(iso)
  if (!m) throw new Error(`Invalid ISO date: ${iso}`)
  return new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]))
}

function fromUTC(d: Date): ISODate {
  const y = d.getUTCFullYear()
  const m = String(d.getUTCMonth() + 1).padStart(2, '0')
  const day = String(d.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function toISODate(date: Date): ISODate {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function todayISO(now: Date = new Date()): ISODate {
  return toISODate(now)
}

export function addDays(iso: ISODate, days: number): ISODate {
  const d = toUTC(iso)
  d.setUTCDate(d.getUTCDate() + days)
  return fromUTC(d)
}

export function isoWeekday(iso: ISODate): Weekday {
  const js = toUTC(iso).getUTCDay()
  return (js === 0 ? 7 : js) as Weekday
}

export function minutesOf(time: HHMM): number {
  const m = HHMM_RE.exec(time)
  if (!m) throw new Error(`Invalid time: ${time}`)
  return +m[1] * 60 + +m[2]
}

export function timesOverlap(aStart: HHMM, aEnd: HHMM, bStart: HHMM, bEnd: HHMM): boolean {
  return minutesOf(aStart) < minutesOf(bEnd) && minutesOf(bStart) < minutesOf(aEnd)
}
