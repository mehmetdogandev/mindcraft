import { eq } from 'drizzle-orm'
import { calculateLevel, EMPTY_SKILLS } from '@mindcraft/game-rules'
import { db } from '../../db/index.ts'
import { learningProfile, studentCompetency, studentProfile } from '../../db/schema/game.ts'
import { protectedProcedure, router } from '../init.ts'

export const profileRouter = router({
  get: protectedProcedure.query(async ({ ctx }) => {
    const [profile, student, competency] = await Promise.all([
      db.query.learningProfile.findFirst({ where: eq(learningProfile.userId, ctx.user.id) }),
      db.query.studentProfile.findFirst({ where: eq(studentProfile.userId, ctx.user.id) }),
      db.query.studentCompetency.findFirst({ where: eq(studentCompetency.userId, ctx.user.id) }),
    ])
    const skills = competency?.skills ?? EMPTY_SKILLS
    const xp = competency?.xp ?? 0
    return {
      user: ctx.user,
      profile,
      student,
      progress: {
        xp,
        ...calculateLevel(xp),
        skills,
        mistakesEmbraced: competency?.mistakesEmbraced ?? 0,
        questsCompleted: competency?.questsCompleted ?? 0,
        streakDays: competency?.streakDays ?? 0,
      },
    }
  }),
})
