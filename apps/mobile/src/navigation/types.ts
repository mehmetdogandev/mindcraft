export type RootStackParamList = {
  Auth: undefined
  Onboarding: undefined
  Home: undefined
  Mentor: { characterId: string; courseId?: string }
  Quest: { courseId?: string; topic?: string }
  Skills: undefined
}
