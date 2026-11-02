import AsyncStorage from '@react-native-async-storage/async-storage'
import { EMPTY_SKILLS, type SkillScores } from '@mindcraft/game-rules'
import type { CharacterProfile, SpriteSheetManifest } from '@mindcraft/sprites'

const DB_STORAGE_KEY = 'mindcraft_v2_local_db_v1'
const GEMINI_KEY_STORAGE = 'mindcraft_v2_gemini_api_key'

export type UserRow = {
  id: string
  email: string
  name: string
  password: string
  createdAt: string
}

export type LearningProfileRow = {
  userId: string
  learnerRole: string | null
  displayName: string | null
  timezone: string
  learningStyle: string | null
  goals: string | null
  onboardingStep: number
  onboardingComplete: boolean
  draftJson: Record<string, unknown>
  updatedAt: string
}

export type StudentProfileRow = {
  userId: string
  schoolName?: string
  department?: string
  currentYear?: number
}

export type StudentCompetencyRow = {
  userId: string
  xp: number
  mistakesEmbraced: number
  questsCompleted: number
  streakDays: number
  skills: SkillScores
  updatedAt: string
}

export type TermRow = {
  id: string
  userId: string
  name: string
  startDate: string
  endDate: string
  classEndDate?: string
  isActive: boolean
  confirmedAt: string | null
}

export type CourseRow = {
  id: string
  userId: string
  termId?: string
  name: string
  code?: string
  realmId: 'math' | 'code' | 'science' | 'history' | 'language' | 'finance' | 'custom'
  color: string
  source: 'academic' | 'personal'
  progressStatus: 'current' | 'completed' | 'archived'
}

export type CourseMeetingRow = {
  id: string
  courseId: string
  weekday: number
  startTime: string
  endTime: string
  room?: string
  label?: string
}

export type ScheduleExceptionRow = {
  id: string
  userId: string
  courseId?: string
  date: string
  kind: 'cancel' | 'reschedule' | 'makeup' | 'holiday'
  startTime?: string
  endTime?: string
  note?: string
}

export type CalendarEventRow = {
  id: string
  userId: string
  termId?: string
  title: string
  date: string
  kind: string
}

export type GameCharacterRow = {
  id: string
  userId: string
  kind: 'avatar' | 'mentor'
  courseId: string | null
  profile: CharacterProfile
  manifest: SpriteSheetManifest
  status: 'generating' | 'preview' | 'ready' | 'failed'
  artSource: 'npc_layers' | 'placeholder' | 'generated'
}

export type MentorMemoryRow = {
  id: string
  userId: string
  characterId: string
  turns: Array<{ role: 'user' | 'model'; text: string }>
  summary: string
  updatedAt: string
}

export type StudentMemoryRow = {
  userId: string
  summary: string
  updatedAt: string
}

export type PlanItem = {
  id: string
  courseId?: string
  window: 'pre' | 'post' | 'evening' | 'explore' | string
  title: string
  story: string
  suggestedType: 'matrix' | 'algorithm' | 'dilemma'
  duration: number
  topic: string
  deferred?: boolean
}

export type DailyPlanRow = {
  id: string
  userId: string
  localDate: string
  restDay?: boolean
  items: PlanItem[]
}

export type QuestRow = {
  id: string
  userId: string
  courseId?: string
  realmId: string
  type: 'matrix' | 'dilemma' | 'algorithm'
  title: string
  payload: Record<string, unknown>
  learningObjectives: string[]
  status: 'offered' | 'active' | 'completed'
}

export type GameSessionRow = {
  id: string
  questId: string
  userId: string
  attemptsUsed: number
  hintsUsed: number
  timeSpentSeconds: number
  explanation: string
  engineResult: Record<string, unknown>
  evaluation: Record<string, unknown>
  xpAwarded: number
}

export type LocalDatabase = {
  users: UserRow[]
  learningProfiles: LearningProfileRow[]
  studentProfiles: StudentProfileRow[]
  studentCompetencies: StudentCompetencyRow[]
  terms: TermRow[]
  courses: CourseRow[]
  courseMeetings: CourseMeetingRow[]
  scheduleExceptions: ScheduleExceptionRow[]
  calendarEvents: CalendarEventRow[]
  gameCharacters: GameCharacterRow[]
  mentorMemories: MentorMemoryRow[]
  studentMemories: StudentMemoryRow[]
  dailyPlans: DailyPlanRow[]
  quests: QuestRow[]
  gameSessions: GameSessionRow[]
}

function createEmptyDb(): LocalDatabase {
  return {
    users: [],
    learningProfiles: [],
    studentProfiles: [],
    studentCompetencies: [],
    terms: [],
    courses: [],
    courseMeetings: [],
    scheduleExceptions: [],
    calendarEvents: [],
    gameCharacters: [],
    mentorMemories: [],
    studentMemories: [],
    dailyPlans: [],
    quests: [],
    gameSessions: [],
  }
}

let memoryDb: LocalDatabase | null = null

export function makeId(prefix: string): string {
  const rand = Math.random().toString(36).slice(2, 10)
  const ts = Date.now().toString(36).slice(-4)
  return `${prefix}_${ts}${rand}`
}

export async function loadDb(): Promise<LocalDatabase> {
  if (memoryDb) return memoryDb
  try {
    const raw = await AsyncStorage.getItem(DB_STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<LocalDatabase>
      memoryDb = { ...createEmptyDb(), ...parsed }
      return memoryDb
    }
  } catch {
    // Fallback to empty DB if corrupted
  }
  memoryDb = createEmptyDb()
  return memoryDb
}

export async function saveDb(db: LocalDatabase): Promise<void> {
  memoryDb = db
  await AsyncStorage.setItem(DB_STORAGE_KEY, JSON.stringify(db))
}

export async function mutateDb<T>(fn: (db: LocalDatabase) => T | Promise<T>): Promise<T> {
  const db = await loadDb()
  const result = await fn(db)
  await saveDb(db)
  return result
}

export async function ensureUserProfile(db: LocalDatabase, userId: string): Promise<LearningProfileRow> {
  let profile = db.learningProfiles.find((p) => p.userId === userId)
  if (!profile) {
    profile = {
      userId,
      learnerRole: null,
      displayName: null,
      timezone: 'Europe/Istanbul',
      learningStyle: null,
      goals: null,
      onboardingStep: 2,
      onboardingComplete: false,
      draftJson: {},
      updatedAt: new Date().toISOString(),
    }
    db.learningProfiles.push(profile)
  }
  let comp = db.studentCompetencies.find((c) => c.userId === userId)
  if (!comp) {
    comp = {
      userId,
      xp: 0,
      mistakesEmbraced: 0,
      questsCompleted: 0,
      streakDays: 1,
      skills: { ...EMPTY_SKILLS },
      updatedAt: new Date().toISOString(),
    }
    db.studentCompetencies.push(comp)
  }
  return profile
}

export async function getStoredGeminiKey(): Promise<string> {
  try {
    return (await AsyncStorage.getItem(GEMINI_KEY_STORAGE))?.trim() ?? ''
  } catch {
    return ''
  }
}

export async function setStoredGeminiKey(apiKey: string | null): Promise<void> {
  if (apiKey && apiKey.trim()) {
    await AsyncStorage.setItem(GEMINI_KEY_STORAGE, apiKey.trim())
  } else {
    await AsyncStorage.removeItem(GEMINI_KEY_STORAGE)
  }
}
