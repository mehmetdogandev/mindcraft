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

export type CourseDraft = {
  key: string
  name: string
  realmId: RealmId
  weekday: number
  startTime: string
  endTime: string
  teacherPrompt: string
}

let draftSeq = 0

export function newCourseDraft(partial?: Partial<CourseDraft>): CourseDraft {
  draftSeq += 1
  return {
    key: `draft-${draftSeq}`,
    name: '',
    realmId: 'custom',
    weekday: 1,
    startTime: '09:00',
    endTime: '11:00',
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
      teacherPrompt: 'Mor pelerinli, esprili, sabırlı bir ejderha',
    }),
    newCourseDraft({
      name: 'Ayrık Matematik',
      realmId: 'math',
      weekday: 1,
      startTime: '13:00',
      endTime: '15:00',
      teacherPrompt: 'Sakin, net konuşan, tahtayı seven bir baykuş profesör',
    }),
  ]
}

export function colorForIndex(index: number) {
  return COURSE_COLORS[index % COURSE_COLORS.length]
}
