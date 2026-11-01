import { isoWeekday } from './dates.ts'
import type { ISODate, Occurrence, ScheduleException, ScheduleMeeting } from './types.ts'

export function occurrencesOnDate(
  date: ISODate,
  meetings: ScheduleMeeting[],
  exceptions: ScheduleException[]
): Occurrence[] {
  const weekday = isoWeekday(date)
  const dayCancels = exceptions.filter((e) => e.date === date && (e.kind === 'cancel' || e.kind === 'holiday'))
  const reschedules = exceptions.filter((e) => e.date === date && (e.kind === 'reschedule' || e.kind === 'makeup'))

  const base = meetings
    .filter((m) => m.weekday === weekday)
    .map((m) => {
      const cancelled = dayCancels.some((e) => !e.courseId || e.courseId === m.courseId)
      return {
        key: `${m.id}:${date}`,
        courseId: m.courseId,
        meetingId: m.id,
        date,
        weekday,
        startTime: m.startTime,
        endTime: m.endTime,
        room: m.room ?? null,
        label: m.label ?? null,
        cancelled,
      } satisfies Occurrence
    })

  const extra: Occurrence[] = reschedules
    .filter((e) => e.startTime && e.endTime && e.courseId)
    .map((e) => ({
      key: `ex:${e.id}:${date}`,
      courseId: e.courseId!,
      meetingId: e.id,
      date,
      weekday,
      startTime: e.startTime!,
      endTime: e.endTime!,
      room: null,
      label: e.note ?? e.kind,
      cancelled: false,
    }))

  return [...base, ...extra].sort((a, b) => a.startTime.localeCompare(b.startTime))
}

export function inferWindow(nowHHMM: string, start: string, end: string): 'pre' | 'post' | 'during' {
  if (nowHHMM < start) return 'pre'
  if (nowHHMM >= end) return 'post'
  return 'during'
}
