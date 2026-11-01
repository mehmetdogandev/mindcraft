import { and, eq } from 'drizzle-orm'
import { TRPCError } from '@trpc/server'
import { z } from 'zod'
import { env, geminiConfigured } from '../../env.ts'
import { db } from '../../db/index.ts'
import { course, gameCharacter, learningProfile } from '../../db/schema/game.ts'
import { generateTeacherProfile } from '../../ai/teacher.ts'
import { buildPlaceholderAssets } from '../../characters/placeholder.ts'
import { id } from '../../lib/ids.ts'
import { trpcFromUnknown } from '../../lib/errors.ts'
import { protectedProcedure, router } from '../init.ts'

const assets = new Map<string, Record<string, string>>()

export function getCharacterFile(characterId: string, file: string) {
  return assets.get(characterId)?.[file] ?? null
}

export const charactersRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    return db.query.gameCharacter.findMany({ where: eq(gameCharacter.userId, ctx.user.id) })
  }),

  status: protectedProcedure.input(z.object({ id: z.string() })).query(async ({ ctx, input }) => {
    return db.query.gameCharacter.findFirst({
      where: and(eq(gameCharacter.id, input.id), eq(gameCharacter.userId, ctx.user.id)),
    })
  }),

  create: protectedProcedure
    .input(
      z.object({
        kind: z.enum(['avatar', 'mentor']),
        courseId: z.string().optional(),
        method: z.enum(['describe', 'select', 'surprise']),
        prompt: z.string().optional(),
        skeletonHint: z.enum(['humanoid', 'creature', 'robot']).optional(),
        personality: z.string().optional(),
        teachingStyle: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!geminiConfigured()) {
        throw new TRPCError({ code: 'PRECONDITION_FAILED', message: 'GEMINI_UNAVAILABLE' })
      }
      if (input.kind === 'mentor' && !input.courseId) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'courseId gerekli' })
      }
      if (input.kind === 'mentor' && input.courseId) {
        const existing = await db.query.gameCharacter.findFirst({
          where: and(eq(gameCharacter.userId, ctx.user.id), eq(gameCharacter.courseId, input.courseId)),
        })
        if (existing) {
          throw new TRPCError({ code: 'CONFLICT', message: 'Bu dersin öğretmeni zaten var' })
        }
      }

      const subject = input.courseId
        ? (await db.query.course.findFirst({ where: eq(course.id, input.courseId) }))?.name
        : 'Oyuncu karakteri'

      try {
        const profile = await generateTeacherProfile({
          method: input.method,
          prompt: input.prompt,
          skeletonHint: input.skeletonHint,
          personality: input.personality,
          teachingStyle: input.teachingStyle,
          subject,
        })
        const characterId = id('char')
        const placeholder = buildPlaceholderAssets({
          characterId,
          name: profile.name,
          primaryColor: profile.appearance.primaryColor,
          accentColor: profile.appearance.accentColor,
          apiPublicUrl: env.apiPublicUrl,
        })
        assets.set(characterId, placeholder.files)
        await db.insert(gameCharacter).values({
          id: characterId,
          userId: ctx.user.id,
          kind: input.kind,
          courseId: input.courseId,
          profile,
          manifest: placeholder.manifest,
          status: 'ready',
          artSource: 'placeholder',
        })
        if (input.kind === 'mentor') {
          await db
            .update(learningProfile)
            .set({ onboardingComplete: true, onboardingStep: 8, updatedAt: new Date() })
            .where(eq(learningProfile.userId, ctx.user.id))
        }
        return { id: characterId, status: 'ready' as const }
      } catch (error) {
        trpcFromUnknown(error)
      }
    }),
})
