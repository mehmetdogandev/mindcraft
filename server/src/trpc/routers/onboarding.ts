import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { EMPTY_SKILLS } from '@mindcraft/game-rules'
import { db } from '../../db/index.ts'
import { learningProfile, studentCompetency, studentProfile } from '../../db/schema/game.ts'
import { onboardingTurn } from '../../ai/onboarding.ts'
import { trpcFromUnknown } from '../../lib/errors.ts'
import { protectedProcedure, router } from '../init.ts'

async function ensureProfile(userId: string) {
  const existing = await db.query.learningProfile.findFirst({
    where: eq(learningProfile.userId, userId),
  })
  if (existing) return existing
  await db.insert(learningProfile).values({ userId, draftJson: {}, onboardingStep: 2 })
  await db.insert(studentCompetency).values({ userId, skills: EMPTY_SKILLS })
  return db.query.learningProfile.findFirst({ where: eq(learningProfile.userId, userId) })
}

export const onboardingRouter = router({
  getDraft: protectedProcedure.query(async ({ ctx }) => {
    const profile = await ensureProfile(ctx.user.id)
    return profile
  }),

  chat: protectedProcedure
    .input(z.object({ message: z.string().min(1).max(2000) }))
    .mutation(async ({ ctx, input }) => {
      const profile = await ensureProfile(ctx.user.id)
      try {
        const result = await onboardingTurn({
          draft: profile?.draftJson ?? {},
          message: input.message,
        })
        await db
          .update(learningProfile)
          .set({
            draftJson: result.extracted,
            displayName: String(result.extracted.displayName ?? profile?.displayName ?? ''),
            learnerRole: result.extracted.learnerRole ? String(result.extracted.learnerRole) : profile?.learnerRole,
            updatedAt: new Date(),
          })
          .where(eq(learningProfile.userId, ctx.user.id))
        return result
      } catch (error) {
        trpcFromUnknown(error)
      }
    }),

  commit: protectedProcedure
    .input(
      z.object({
        confirmations: z.array(z.string()).min(1),
        learnerRole: z.enum(['student', 'graduate', 'worker', 'independent']),
        displayName: z.string().min(1),
        timezone: z.string().min(1),
        learningStyle: z.string().optional(),
        goals: z.string().optional(),
        schoolName: z.string().optional(),
        department: z.string().optional(),
        currentYear: z.number().int().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await ensureProfile(ctx.user.id)
      await db
        .update(learningProfile)
        .set({
          learnerRole: input.learnerRole,
          displayName: input.displayName,
          timezone: input.timezone,
          learningStyle: input.learningStyle,
          goals: input.goals,
          onboardingStep: input.learnerRole === 'student' ? 3 : 5,
          draftJson: { confirmations: input.confirmations },
          updatedAt: new Date(),
        })
        .where(eq(learningProfile.userId, ctx.user.id))

      if (input.learnerRole === 'student') {
        await db
          .insert(studentProfile)
          .values({
            userId: ctx.user.id,
            schoolName: input.schoolName,
            department: input.department,
            currentYear: input.currentYear,
          })
          .onConflictDoUpdate({
            target: studentProfile.userId,
            set: {
              schoolName: input.schoolName,
              department: input.department,
              currentYear: input.currentYear,
            },
          })
      }

      return { ok: true }
    }),
})
