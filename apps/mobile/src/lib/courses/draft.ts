import type { NpcAppearance } from '@mindcraft/sprites'

export const REALMS = ['math', 'code', 'science', 'history', 'language', 'finance', 'custom'] as const
export type RealmId = (typeof REALMS)[number]

export const WEEKDAYS = [
  { value: 1, label: 'Pzt' },
  { value: 2, label: 'Sal' },
  { value: 3, label: 'Çar' },
  { value: 4, label: 'Per' },
  { value: 5, label: 'Cum' },
  { value: 6, label: 'Cmt' },
  { value: 7, label: 'Paz' },
] as const

export const COURSE_COLORS = ['#8c31ff', '#01d4ff', '#34d399', '#fbbf24', '#fb7185', '#818cf8']

export type CourseSlotDraft = {
  weekday: number
  startTime: string
  endTime: string
  room?: string
}

export type CourseDraft = {
  key: string
  name: string
  realmId: RealmId
  weekday: number
  startTime: string
  endTime: string
  slots?: CourseSlotDraft[]
  teacherPrompt: string
  teacherAppearance?: Partial<NpcAppearance>
}

let draftSeq = 0

export function newCourseDraft(partial?: Partial<CourseDraft>): CourseDraft {
  draftSeq += 1
  const weekday = partial?.weekday ?? 1
  const startTime = partial?.startTime ?? '09:00'
  const endTime = partial?.endTime ?? '11:00'
  return {
    key: `draft-${draftSeq}`,
    name: '',
    realmId: 'custom',
    weekday,
    startTime,
    endTime,
    slots: partial?.slots ?? [{ weekday, startTime, endTime }],
    teacherPrompt: '',
    ...partial,
  }
}

export function defaultOnboardingCourses(): CourseDraft[] {
  return [
    newCourseDraft({
      name: 'Veri Yapıları',
      realmId: 'code',
      weekday: 1,
      startTime: '09:00',
      endTime: '11:00',
      slots: [
        { weekday: 1, startTime: '09:00', endTime: '11:00', room: 'B-201' },
        { weekday: 3, startTime: '13:00', endTime: '15:00', room: 'Lab-1' },
      ],
      teacherPrompt: 'Uzun siyah saçlı, yuvarlak gözlüklü, beyaz laboratuvar önlüklü, sabırlı ve esprili bir hoca',
    }),
    newCourseDraft({
      name: 'Ayrık Matematik',
      realmId: 'math',
      weekday: 2,
      startTime: '10:00',
      endTime: '12:00',
      slots: [{ weekday: 2, startTime: '10:00', endTime: '12:00', room: 'A-104' }],
      teacherPrompt: 'Kıvırcık kır saçlı, kare gözlüklü, takım elbiseli, sakin ve net anlatan bir profesör',
    }),
  ]
}

export function colorForIndex(index: number) {
  return COURSE_COLORS[index % COURSE_COLORS.length]
}
