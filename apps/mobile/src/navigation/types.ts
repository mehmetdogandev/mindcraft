export type RootStackParamList = {
  Auth: undefined
  Onboarding: undefined
  Home: undefined
  CourseSetup: { courseId?: string; termId?: string }
  Mentor: { characterId: string; courseId?: string }
  Quest: { courseId?: string; topic?: string }
  Skills: undefined
  Schedule: undefined
  Profile: undefined
}
