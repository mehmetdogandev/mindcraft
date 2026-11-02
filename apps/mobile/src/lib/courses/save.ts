import { trpc } from '../api/trpc.ts'
import { colorForIndex, type CourseDraft } from './draft.ts'

export async function saveCourseWithTeacher(
  draft: CourseDraft,
  termId: string,
  colorIndex = 0,
  courseId?: string
) {
  const created = await trpc().calendar.courses.upsert.mutate({
    id: courseId,
    termId,
    name: draft.name.trim(),
    realmId: draft.realmId,
    color: colorForIndex(colorIndex),
    source: 'academic',
    progressStatus: 'current',
  })

  const rawSlots =
    draft.slots && draft.slots.length > 0
      ? draft.slots
      : draft.startTime && draft.endTime
        ? [{ weekday: draft.weekday, startTime: draft.startTime, endTime: draft.endTime }]
        : []

  const validSlots = rawSlots.filter((s) => s.startTime.trim() && s.endTime.trim())

  if (validSlots.length > 0) {
    await trpc().calendar.meetings.replace.mutate({
      courseId: created.id,
      slots: validSlots.map((s) => ({
        weekday: s.weekday,
        startTime: s.startTime.trim(),
        endTime: s.endTime.trim(),
        room: s.room?.trim(),
        label: draft.name.trim(),
      })),
    })
  }

  if (draft.teacherPrompt.trim() || draft.teacherAppearance) {
    await trpc().characters.create.mutate({
      kind: 'mentor',
      courseId: created.id,
      method: 'describe',
      prompt: draft.teacherPrompt.trim(),
      skeletonHint: 'humanoid',
      appearance: draft.teacherAppearance,
    })
  }

  return created.id
}
