import { and, eq } from 'drizzle-orm'
import { TRPCError } from '@trpc/server'
import { z } from 'zod'
import { geminiConfigured } from '../../env.ts'
import { db } from '../../db/index.ts'
import { course, gameCharacter, mentorMemory, studentMemory } from '../../db/schema/game.ts'
import { mentorReply } from '../../ai/mentor.ts'
import { id } from '../../lib/ids.ts'
import { trpcFromUnknown } from '../../lib/errors.ts'
import { protectedProcedure, router } from '../init.ts'

export const mentorsRouter = router({
  chat: protectedProcedure
    .input(
      z.object({
        characterId: z.string(),
        message: z.string().min(1).max(2000),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!geminiConfigured()) {
        throw new TRPCError({ code: 'PRECONDITION_FAILED', message: 'GEMINI_UNAVAILABLE' })
      }
      const character = await db.query.gameCharacter.findFirst({
        where: and(eq(gameCharacter.id, input.characterId), eq(gameCharacter.userId, ctx.user.id)),
      })
      if (!character || character.status !== 'ready') {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Öğretmen hazır değil' })
      }
      const courseRow = character.courseId
        ? await db.query.course.findFirst({ where: eq(course.id, character.courseId) })
        : null
      const memory =
        (await db.query.mentorMemory.findFirst({
          where: and(eq(mentorMemory.characterId, character.id), eq(mentorMemory.userId, ctx.user.id)),
        })) ?? null
      const student = await db.query.studentMemory.findFirst({
        where: eq(studentMemory.userId, ctx.user.id),
      })

      try {
        const reply = await mentorReply({
          teacher: character.profile,
          courseName: courseRow?.name ?? 'Keşif',
          studentSummary: student?.summary ?? '',
          mentorSummary: memory?.summary ?? '',
          history: memory?.turns ?? [],
          message: input.message,
        })
        const turns = [
          ...(memory?.turns ?? []),
          { role: 'user' as const, text: input.message },
          { role: 'model' as const, text: reply.message },
        ].slice(-6)
        if (memory) {
          await db
            .update(mentorMemory)
            .set({ turns, updatedAt: new Date() })
            .where(eq(mentorMemory.id, memory.id))
        } else {
          await db.insert(mentorMemory).values({
            id: id('mem'),
            userId: ctx.user.id,
            characterId: character.id,
            turns,
            summary: '',
          })
        }
        return reply
      } catch (error) {
        trpcFromUnknown(error)
      }
    }),
})
