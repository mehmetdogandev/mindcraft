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

  if (draft.startTime && draft.endTime) {
    await trpc().calendar.meetings.replace.mutate({
      courseId: created.id,
      slots: [
        {
          weekday: draft.weekday,
          startTime: draft.startTime,
          endTime: draft.endTime,
          label: draft.name.trim(),
        },
      ],
    })
  }

  if (draft.teacherPrompt.trim()) {
    await trpc().characters.create.mutate({
      kind: 'mentor',
      courseId: created.id,
      method: 'describe',
      prompt: draft.teacherPrompt.trim(),
      skeletonHint: 'creature',
    })
  }

  return created.id
}
