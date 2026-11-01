import { and, eq } from 'drizzle-orm'
import { z } from 'zod'
import { findSlotClashes, isHHMM, isISODate, occurrencesOnDate, type Weekday } from '@mindcraft/schedule'
import { db } from '../../db/index.ts'
import { calendarEvent, course, courseMeeting, learningProfile, scheduleException, term } from '../../db/schema/game.ts'
import { id } from '../../lib/ids.ts'
import { protectedProcedure, router } from '../init.ts'

const weekday = z.number().int().min(1).max(7)

export const calendarRouter = router({
  terms: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      return db.query.term.findMany({ where: eq(term.userId, ctx.user.id) })
    }),
    upsert: protectedProcedure
      .input(
        z.object({
          id: z.string().optional(),
          name: z.string().min(1),
          startDate: z.string().refine(isISODate),
          endDate: z.string().refine(isISODate),
          classEndDate: z.string().refine(isISODate).optional(),
          activate: z.boolean().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const termId = input.id ?? id('term')
        if (input.activate) {
          await db.update(term).set({ isActive: false }).where(eq(term.userId, ctx.user.id))
        }
        await db
          .insert(term)
          .values({
            id: termId,
            userId: ctx.user.id,
            name: input.name,
            startDate: input.startDate,
            endDate: input.endDate,
            classEndDate: input.classEndDate,
            isActive: Boolean(input.activate),
            confirmedAt: input.activate ? new Date() : null,
          })
          .onConflictDoUpdate({
            target: term.id,
            set: {
              name: input.name,
              startDate: input.startDate,
              endDate: input.endDate,
              classEndDate: input.classEndDate,
              isActive: input.activate ? true : undefined,
              confirmedAt: input.activate ? new Date() : undefined,
            },
          })
        await db
          .update(learningProfile)
          .set({ onboardingStep: 5, updatedAt: new Date() })
          .where(eq(learningProfile.userId, ctx.user.id))
        return { id: termId }
      }),
  }),

  courses: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      return db.query.course.findMany({ where: eq(course.userId, ctx.user.id) })
    }),
    upsert: protectedProcedure
      .input(
        z.object({
          id: z.string().optional(),
          termId: z.string().optional(),
          name: z.string().min(1),
          code: z.string().optional(),
          realmId: z.enum(['math', 'code', 'science', 'history', 'language', 'finance', 'custom']),
          color: z.string().optional(),
          source: z.enum(['academic', 'personal']).default('academic'),
          progressStatus: z.enum(['current', 'completed', 'archived']).default('current'),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const courseId = input.id ?? id('course')
        await db
          .insert(course)
          .values({
            id: courseId,
            userId: ctx.user.id,
            termId: input.termId,
            name: input.name,
            code: input.code,
            realmId: input.realmId,
            color: input.color ?? '#8c31ff',
            source: input.source,
            progressStatus: input.progressStatus,
          })
          .onConflictDoUpdate({
            target: course.id,
            set: {
              name: input.name,
              code: input.code,
              realmId: input.realmId,
              color: input.color ?? '#8c31ff',
              source: input.source,
              progressStatus: input.progressStatus,
              termId: input.termId,
            },
          })
        return { id: courseId }
      }),
  }),

  meetings: router({
    replace: protectedProcedure
      .input(
        z.object({
          courseId: z.string(),
          slots: z.array(
            z.object({
              weekday,
              startTime: z.string().refine(isHHMM),
              endTime: z.string().refine(isHHMM),
              room: z.string().optional(),
              label: z.string().optional(),
            })
          ),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const owned = await db.query.course.findFirst({
          where: and(eq(course.id, input.courseId), eq(course.userId, ctx.user.id)),
        })
        if (!owned) throw new Error('NOT_FOUND')
        const clashes = findSlotClashes(
          input.slots.map((s, i) => ({ key: String(i), ...s, weekday: s.weekday as Weekday }))
        )
        if (clashes.size > 0) {
          throw new Error('SCHEDULE_CLASH')
        }
        await db.delete(courseMeeting).where(eq(courseMeeting.courseId, input.courseId))
        if (input.slots.length) {
          await db.insert(courseMeeting).values(
            input.slots.map((s) => ({
              id: id('meet'),
              courseId: input.courseId,
              weekday: s.weekday,
              startTime: s.startTime,
              endTime: s.endTime,
              room: s.room,
              label: s.label,
            }))
          )
        }
        await db
          .update(learningProfile)
          .set({ onboardingStep: 7, updatedAt: new Date() })
          .where(eq(learningProfile.userId, ctx.user.id))
        return { ok: true }
      }),
  }),

  exceptions: router({
    upsert: protectedProcedure
      .input(
        z.object({
          courseId: z.string().optional(),
          date: z.string().refine(isISODate),
          kind: z.enum(['cancel', 'reschedule', 'makeup', 'holiday']),
          startTime: z.string().optional(),
          endTime: z.string().optional(),
          note: z.string().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const rowId = id('ex')
        await db.insert(scheduleException).values({
          id: rowId,
          userId: ctx.user.id,
          courseId: input.courseId,
          date: input.date,
          kind: input.kind,
          startTime: input.startTime,
          endTime: input.endTime,
          note: input.note,
        })
        return { id: rowId }
      }),
  }),

  events: router({
    upsert: protectedProcedure
      .input(
        z.object({
          termId: z.string().optional(),
          title: z.string(),
          date: z.string().refine(isISODate),
          kind: z.string().default('exam'),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const rowId = id('evt')
        await db.insert(calendarEvent).values({
          id: rowId,
          userId: ctx.user.id,
          termId: input.termId,
          title: input.title,
          date: input.date,
          kind: input.kind,
        })
        return { id: rowId }
      }),
  }),

  today: protectedProcedure
    .input(z.object({ date: z.string().refine(isISODate) }).optional())
    .query(async ({ ctx, input }) => {
      const date = input?.date ?? new Date().toISOString().slice(0, 10)
      const courses = await db.query.course.findMany({ where: eq(course.userId, ctx.user.id) })
      const meetings = await db.query.courseMeeting.findMany()
      const exceptions = await db.query.scheduleException.findMany({
        where: eq(scheduleException.userId, ctx.user.id),
      })
      const mine = meetings.filter((m) => courses.some((c) => c.id === m.courseId))
      return occurrencesOnDate(
        date,
        mine.map((m) => ({
          id: m.id,
          courseId: m.courseId,
          weekday: m.weekday as Weekday,
          startTime: m.startTime,
          endTime: m.endTime,
          room: m.room,
          label: m.label,
        })),
        exceptions.map((e) => ({
          id: e.id,
          courseId: e.courseId,
          date: e.date,
          kind: e.kind as 'cancel',
          startTime: e.startTime,
          endTime: e.endTime,
          note: e.note,
        }))
      )
    }),
})
