import { and, eq } from 'drizzle-orm'
import { TRPCError } from '@trpc/server'
import { z } from 'zod'
import {
  calculateQuestXP,
  runAlgorithmSequence,
  updateSkillScores,
  validateEnergyMatrix,
  EMPTY_SKILLS,
} from '@mindcraft/game-rules'
import { geminiConfigured } from '../../env.ts'
import { db } from '../../db/index.ts'
import { course, gameSession, quest, studentCompetency } from '../../db/schema/game.ts'
import { evaluateExplanation, generateQuestContent } from '../../ai/quest.ts'
import { id } from '../../lib/ids.ts'
import { trpcFromUnknown } from '../../lib/errors.ts'
import { protectedProcedure, router } from '../init.ts'

export const questsRouter = router({
  generate: protectedProcedure
    .input(
      z.object({
        courseId: z.string().optional(),
        topic: z.string().min(1),
        difficulty: z.enum(['Kolay', 'Orta', 'Zorlu', 'Usta']).default('Orta'),
        type: z.enum(['matrix', 'dilemma', 'algorithm']).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!geminiConfigured()) {
        throw new TRPCError({ code: 'PRECONDITION_FAILED', message: 'GEMINI_UNAVAILABLE' })
      }
      const courseRow = input.courseId
        ? await db.query.course.findFirst({
            where: and(eq(course.id, input.courseId), eq(course.userId, ctx.user.id)),
          })
        : null
      try {
        const generated = await generateQuestContent({
          realmId: courseRow?.realmId ?? 'custom',
          topic: input.topic,
          difficulty: input.difficulty,
          type: input.type,
          courseName: courseRow?.name,
        })
        const questId = id('quest')
        await db.insert(quest).values({
          id: questId,
          userId: ctx.user.id,
          courseId: input.courseId,
          realmId: courseRow?.realmId ?? 'custom',
          type: generated.type,
          title: generated.title,
          payload: { ...generated.payload, storyIntro: generated.storyIntro },
          learningObjectives: generated.learningOutcomes,
          status: 'offered',
        })
        return { id: questId, ...generated }
      } catch (error) {
        trpcFromUnknown(error)
      }
    }),

  get: protectedProcedure.input(z.object({ id: z.string() })).query(async ({ ctx, input }) => {
    return db.query.quest.findFirst({
      where: and(eq(quest.id, input.id), eq(quest.userId, ctx.user.id)),
    })
  }),

  submit: protectedProcedure
    .input(
      z.object({
        questId: z.string(),
        answer: z.unknown(),
        explanation: z.string().default(''),
        attemptsUsed: z.number().int().min(1).default(1),
        hintsUsed: z.number().int().min(0).default(0),
        timeSpentSeconds: z.number().int().min(0).default(0),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const existingSession = await db.query.gameSession.findFirst({
        where: and(eq(gameSession.questId, input.questId), eq(gameSession.userId, ctx.user.id)),
      })
      if (existingSession) {
        throw new TRPCError({ code: 'CONFLICT', message: 'Bu görev zaten teslim edildi' })
      }

      const row = await db.query.quest.findFirst({
        where: and(eq(quest.id, input.questId), eq(quest.userId, ctx.user.id)),
      })
      if (!row) throw new TRPCError({ code: 'NOT_FOUND', message: 'Görev yok' })

      const payload = row.payload
      let engine: Record<string, unknown> = { valid: true }
      let isCorrect = true

      if (row.type === 'matrix') {
        const answer = input.answer as { activeIds?: string[] }
        const nodes = (payload.nodes as Array<{ id: string; value: number }>).map((n) => ({
          ...n,
          active: (answer.activeIds ?? []).includes(n.id),
        }))
        engine = validateEnergyMatrix(nodes, Number(payload.targetValue))
        isCorrect = Boolean(engine.valid)
      } else if (row.type === 'algorithm') {
        const answer = input.answer as {
          instructions?: Array<'MOVE' | 'TURN_LEFT' | 'TURN_RIGHT'>
        }
        const start = payload.start as { x: number; y: number; dir: 'N' | 'E' | 'S' | 'W' }
        engine = runAlgorithmSequence(
          { width: Number(payload.gridWidth), height: Number(payload.gridHeight) },
          start,
          answer.instructions ?? [],
          (payload.obstacles as Array<{ x: number; y: number }>) ?? [],
          payload.target as { x: number; y: number }
        )
        isCorrect = Boolean(engine.success)
      } else if (!input.explanation.trim()) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Ikilem için gerekçe gerekli' })
      }

      let evaluation = {
        score: isCorrect ? 80 : 50,
        critique: '',
        praise: '',
        nextConcept: '',
        explanationQualityScore: 50,
      }
      if (geminiConfigured() && input.explanation.trim()) {
        try {
          evaluation = await evaluateExplanation({
            title: row.title,
            prompt: String(payload.storyIntro ?? ''),
            answer: input.answer,
            explanation: input.explanation,
          })
        } catch {
          // Gemini yorumu yoksa motor sonucu yeter; sahte model çıktısı yok.
        }
      }

      const xpAwarded = calculateQuestXP({
        isCorrect,
        score: evaluation.score,
        attemptsUsed: input.attemptsUsed,
        hintsUsed: input.hintsUsed,
        timeSpentSeconds: input.timeSpentSeconds,
        explanationQualityScore: evaluation.explanationQualityScore,
      })

      const current =
        (await db.query.studentCompetency.findFirst({
          where: eq(studentCompetency.userId, ctx.user.id),
        })) ?? null
      const skills = updateSkillScores(current?.skills ?? EMPTY_SKILLS, row.realmId, {
        isCorrect,
        score: evaluation.score,
        attemptsUsed: input.attemptsUsed,
        hintsUsed: input.hintsUsed,
        timeSpentSeconds: input.timeSpentSeconds,
      })

      await db.insert(gameSession).values({
        id: id('sess'),
        questId: row.id,
        userId: ctx.user.id,
        attemptsUsed: input.attemptsUsed,
        hintsUsed: input.hintsUsed,
        timeSpentSeconds: input.timeSpentSeconds,
        explanation: input.explanation,
        engineResult: engine,
        evaluation,
        xpAwarded,
      })
      await db.update(quest).set({ status: 'completed' }).where(eq(quest.id, row.id))
      await db
        .insert(studentCompetency)
        .values({
          userId: ctx.user.id,
          xp: (current?.xp ?? 0) + xpAwarded,
          mistakesEmbraced:
            (current?.mistakesEmbraced ?? 0) + (input.attemptsUsed > 1 || !isCorrect ? 1 : 0),
          questsCompleted: (current?.questsCompleted ?? 0) + 1,
          streakDays: current?.streakDays ?? 0,
          skills,
        })
        .onConflictDoUpdate({
          target: studentCompetency.userId,
          set: {
            xp: (current?.xp ?? 0) + xpAwarded,
            mistakesEmbraced:
              (current?.mistakesEmbraced ?? 0) + (input.attemptsUsed > 1 || !isCorrect ? 1 : 0),
            questsCompleted: (current?.questsCompleted ?? 0) + 1,
            skills,
            updatedAt: new Date(),
          },
        })

      return { engine, evaluation, xpAwarded, skills, isCorrect }
    }),
})
