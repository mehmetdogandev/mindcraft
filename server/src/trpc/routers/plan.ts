import { and, eq } from 'drizzle-orm'
import { TRPCError } from '@trpc/server'
import { z } from 'zod'
import { inferWindow, isISODate, occurrencesOnDate, type Weekday } from '@mindcraft/schedule'
import { env, geminiConfigured } from '../../env.ts'
import { createGemini, requireGemini } from '../../ai/client.ts'
import { safeParseJson } from '../../ai/json.ts'
import { db } from '../../db/index.ts'
import { course, courseMeeting, dailyPlan, scheduleException, studentCompetency } from '../../db/schema/game.ts'
import { id } from '../../lib/ids.ts'
import { trpcFromUnknown } from '../../lib/errors.ts'
import { protectedProcedure, router } from '../init.ts'

async function loadOccurrences(userId: string, date: string) {
  const courses = await db.query.course.findMany({ where: eq(course.userId, userId) })
  const meetings = await db.query.courseMeeting.findMany()
  const exceptions = await db.query.scheduleException.findMany({
    where: eq(scheduleException.userId, userId),
  })
  const mine = meetings.filter((m) => courses.some((c) => c.id === m.courseId))
  return {
    courses,
    occurrences: occurrencesOnDate(
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
    ),
  }
}

async function generateItems(userId: string, date: string) {
  requireGemini()
  const { courses, occurrences } = await loadOccurrences(userId, date)
  const live = occurrences.filter((o) => !o.cancelled)
  const competency = await db.query.studentCompetency.findFirst({
    where: eq(studentCompetency.userId, userId),
  })
  const ai = createGemini()
  const response = await ai.models.generateContent({
    model: env.geminiModel,
    contents: JSON.stringify({
      localDate: date,
      sessions: live.map((o) => ({
        courseId: o.courseId,
        name: courses.find((c) => c.id === o.courseId)?.name,
        start: o.startTime,
        end: o.endTime,
      })),
      competencySummary: competency?.skills ?? {},
    }),
    config: {
      systemInstruction: `Günlük oyun fikirleri üret. courseId yalnızca verilen derslerden olsun. Ders yoksa explore üret. JSON: items[{courseId, window, title, story, suggestedType, duration, topic}]`,
      responseMimeType: 'application/json',
    },
  })
  const parsed = safeParseJson(response.text)
  const allowed = new Set(live.map((o) => o.courseId))
  const items = (Array.isArray(parsed.items) ? parsed.items : [])
    .map((item) => item as Record<string, unknown>)
    .filter((item) => {
      const courseId = item.courseId ? String(item.courseId) : ''
      if (!courseId) return String(item.window) === 'explore'
      return allowed.has(courseId)
    })
  return { items, occurrences: live, courses }
}

export const planRouter = router({
  today: protectedProcedure
    .input(z.object({ date: z.string().refine(isISODate), now: z.string().optional() }).optional())
    .query(async ({ ctx, input }) => {
      const date = input?.date ?? new Date().toISOString().slice(0, 10)
      const cached = await db.query.dailyPlan.findFirst({
        where: and(eq(dailyPlan.userId, ctx.user.id), eq(dailyPlan.localDate, date)),
      })
      const { courses, occurrences } = await loadOccurrences(ctx.user.id, date)
      if (cached) {
        return { plan: cached, occurrences, courses }
      }
      if (!geminiConfigured()) {
        return {
          plan: { id: null, items: [], localDate: date },
          occurrences,
          courses,
          gemini: false,
        }
      }
      try {
        const generated = await generateItems(ctx.user.id, date)
        const rowId = id('plan')
        await db.insert(dailyPlan).values({
          id: rowId,
          userId: ctx.user.id,
          localDate: date,
          items: generated.items,
        })
        return {
          plan: { id: rowId, items: generated.items, localDate: date },
          occurrences: generated.occurrences,
          courses,
        }
      } catch (error) {
        trpcFromUnknown(error)
      }
    }),

  refresh: protectedProcedure
    .input(z.object({ date: z.string().refine(isISODate) }))
    .mutation(async ({ ctx, input }) => {
      if (!geminiConfigured()) {
        throw new TRPCError({ code: 'PRECONDITION_FAILED', message: 'GEMINI_UNAVAILABLE' })
      }
      try {
        const generated = await generateItems(ctx.user.id, input.date)
        await db.delete(dailyPlan).where(and(eq(dailyPlan.userId, ctx.user.id), eq(dailyPlan.localDate, input.date)))
        const rowId = id('plan')
        await db.insert(dailyPlan).values({
          id: rowId,
          userId: ctx.user.id,
          localDate: input.date,
          items: generated.items,
        })
        return { id: rowId, items: generated.items }
      } catch (error) {
        trpcFromUnknown(error)
      }
    }),

  infer: protectedProcedure
    .input(z.object({ now: z.string(), start: z.string(), end: z.string() }))
    .query(({ input }) => inferWindow(input.now, input.start, input.end)),
})
