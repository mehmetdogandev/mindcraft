import { router } from './init.ts'
import { healthRouter } from './routers/health.ts'
import { onboardingRouter } from './routers/onboarding.ts'
import { profileRouter } from './routers/profile.ts'
import { calendarRouter } from './routers/calendar.ts'
import { charactersRouter } from './routers/characters.ts'
import { mentorsRouter } from './routers/mentors.ts'
import { questsRouter } from './routers/quests.ts'
import { planRouter } from './routers/plan.ts'

export const appRouter = router({
  health: healthRouter,
  onboarding: onboardingRouter,
  profile: profileRouter,
  calendar: calendarRouter,
  characters: charactersRouter,
  mentors: mentorsRouter,
  quests: questsRouter,
  plan: planRouter,
  progress: router({
    get: profileRouter.get,
  }),
})

export type AppRouter = typeof appRouter
