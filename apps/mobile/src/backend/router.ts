import {
  calculateLevel,
  calculateQuestXP,
  EMPTY_SKILLS,
  runAlgorithmSequence,
  updateSkillScores,
  validateEnergyMatrix,
} from '@mindcraft/game-rules'
import { findSlotClashes, inferWindow, occurrencesOnDate, type Weekday } from '@mindcraft/schedule'
import {
  defaultManifest,
  type CharacterChatTurn,
  type NpcAppearance,
  type SkeletonHint,
} from '@mindcraft/sprites'
import { getToken, setToken } from '../lib/auth/storage.ts'
import {
  analyzeOnboardingMessage,
  converseCharacterDesign,
  enrichDailyPlanItemsWithAI,
  evaluateExplanation,
  generateQuestContent,
  generateTeacherProfile,
  getGeminiConfig,
  mentorReply,
} from './ai.ts'
import {
  ensureUserProfile,
  getStoredGeminiKey,
  loadDb,
  makeId,
  mutateDb,
  setStoredGeminiKey,
  type CourseRow,
  type LocalDatabase,
  type PlanItem,
  type UserRow,
} from './db.ts'

async function requireCurrentUser(db: LocalDatabase): Promise<UserRow> {
  const token = await getToken()
  if (token) {
    const found = db.users.find((u) => u.id === token)
    if (found) return found
  }
  if (db.users.length > 0) {
    return db.users[0]
  }
  throw new Error('Oturum bulunamadı. Lütfen giriş yapın.')
}

function loadUserOccurrences(db: LocalDatabase, userId: string, date: string) {
  const courses = db.courses.filter((c) => c.userId === userId && c.progressStatus !== 'archived')
  const mine = db.courseMeetings.filter((m) => courses.some((c) => c.id === m.courseId))
  const exceptions = db.scheduleExceptions.filter((e) => e.userId === userId)
  const occurrences = occurrencesOnDate(
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
  )
  return { courses, occurrences }
}

function currentHHMM(): string {
  const now = new Date()
  const h = String(now.getHours()).padStart(2, '0')
  const m = String(now.getMinutes()).padStart(2, '0')
  return `${h}:${m}`
}

function buildLocalDailyPlanItems(
  courses: CourseRow[],
  occurrences: ReturnType<typeof occurrencesOnDate>,
  nowHHMM = currentHHMM()
): PlanItem[] {
  const live = occurrences.filter((o) => !o.cancelled)
  if (live.length > 0) {
    return live.map((occ) => {
      const course = courses.find((c) => c.id === occ.courseId)
      const win = inferWindow(nowHHMM, occ.startTime, occ.endTime)
      const windowLabel =
        win === 'pre'
          ? 'pre'
          : win === 'post'
            ? 'post'
            : 'evening'
      return {
        id: makeId('item'),
        courseId: occ.courseId,
        window: windowLabel,
        title:
          win === 'pre'
            ? `${course?.name ?? 'Ders'} — Ders Öncesi Hazırlık (${occ.startTime})`
            : win === 'post'
              ? `${course?.name ?? 'Ders'} — Ders Sonrası Pekiştirme`
              : `${course?.name ?? 'Ders'} — Akşam Tekrarı`,
        story: `${course?.name ?? 'Ders'} (${occ.startTime}–${occ.endTime}) oturumu için interaktif görev.`,
        suggestedType: course?.realmId === 'code' ? 'algorithm' : course?.realmId === 'history' ? 'dilemma' : 'matrix',
        duration: 10,
        topic: `${course?.name ?? 'Temel'} Kavramları`,
      }
    })
  }
  if (courses.length > 0) {
    return courses.slice(0, 3).map((course) => ({
      id: makeId('item'),
      courseId: course.id,
      window: 'explore',
      title: `${course.name} — Keşif Macerası`,
      story: `Bugün dersin yok; ${course.name} hocanla sohbet edebilir veya mini bir görev çözebilirsin.`,
      suggestedType: course.realmId === 'code' ? 'algorithm' : course.realmId === 'history' ? 'dilemma' : 'matrix',
      duration: 10,
      topic: `${course.name} Genel Tekrar`,
    }))
  }
  return []
}

export async function localSignIn(email: string, password: string) {
  const cleanEmail = email.trim().toLowerCase()
  return mutateDb(async (db) => {
    const user = db.users.find((u) => u.email.toLowerCase() === cleanEmail)
    if (!user) {
      throw new Error('Bu e-posta ile kayıtlı hesap bulunamadı. "Yeni hesap oluştur" ile kayıt olabilirsin.')
    }
    if (user.password !== password) {
      throw new Error('Şifre hatalı.')
    }
    await ensureUserProfile(db, user.id)
    await setToken(user.id)
    return { id: user.id, email: user.email, name: user.name }
  })
}

export async function localSignUp(name: string, email: string, password: string) {
  const cleanEmail = email.trim().toLowerCase()
  const cleanName = name.trim() || 'Oyuncu'
  return mutateDb(async (db) => {
    const existing = db.users.find((u) => u.email.toLowerCase() === cleanEmail)
    if (existing) {
      await ensureUserProfile(db, existing.id)
      await setToken(existing.id)
      return { id: existing.id, email: existing.email, name: existing.name }
    }
    const user: UserRow = {
      id: makeId('usr'),
      email: cleanEmail,
      name: cleanName,
      password,
      createdAt: new Date().toISOString(),
    }
    db.users.push(user)
    await ensureUserProfile(db, user.id)
    await setToken(user.id)
    return { id: user.id, email: user.email, name: user.name }
  })
}

export function createLocalBackendClient() {
  const getProfile = async () => {
    const db = await loadDb()
    const user = await requireCurrentUser(db)
    const profile = await ensureUserProfile(db, user.id)
    const student = db.studentProfiles.find((s) => s.userId === user.id) ?? null
    const competency = db.studentCompetencies.find((c) => c.userId === user.id)
    const avatar = db.gameCharacters.find((c) => c.userId === user.id && c.kind === 'avatar') ?? null
    const skills = competency?.skills ?? EMPTY_SKILLS
    const xp = competency?.xp ?? 0
    return {
      user: { id: user.id, email: user.email, name: user.name },
      profile,
      student,
      avatar,
      progress: {
        xp,
        ...calculateLevel(xp),
        skills,
        mistakesEmbraced: competency?.mistakesEmbraced ?? 0,
        questsCompleted: competency?.questsCompleted ?? 0,
        streakDays: competency?.streakDays ?? 1,
      },
    }
  }

  return {
    health: {
      status: {
        query: async () => {
          const cfg = await getGeminiConfig()
          const configured = Boolean(cfg.apiKey || cfg.openaiApiKey)
          return {
            ok: true,
            gemini: {
              configured,
              ok: true,
              message: configured
                ? `AI aktif (${cfg.apiKey ? cfg.model : cfg.openaiModel}${cfg.openaiApiKey ? ' + OpenAI yedek' : ''})`
                : 'AI Karakter & Oyun Motoru hazır',
            },
          }
        },
      },
    },

    profile: {
      get: {
        query: getProfile,
      },
      update: {
        mutate: async (input: {
          displayName?: string
          learnerRole?: string
          schoolName?: string
          department?: string
          learningStyle?: string
          goals?: string
        }) => {
          return mutateDb(async (db) => {
            const user = await requireCurrentUser(db)
            const profile = await ensureUserProfile(db, user.id)
            if (input.displayName !== undefined) {
              profile.displayName = input.displayName
              user.name = input.displayName || user.name
            }
            if (input.learnerRole !== undefined) profile.learnerRole = input.learnerRole
            if (input.learningStyle !== undefined) profile.learningStyle = input.learningStyle
            if (input.goals !== undefined) profile.goals = input.goals
            profile.updatedAt = new Date().toISOString()

            if (input.schoolName !== undefined || input.department !== undefined) {
              const existing = db.studentProfiles.find((s) => s.userId === user.id)
              if (existing) {
                if (input.schoolName !== undefined) existing.schoolName = input.schoolName
                if (input.department !== undefined) existing.department = input.department
              } else {
                db.studentProfiles.push({
                  userId: user.id,
                  schoolName: input.schoolName,
                  department: input.department,
                })
              }
            }
            return { ok: true }
          })
        },
      },
      geminiKey: {
        get: {
          query: async () => {
            const key = await getStoredGeminiKey()
            const cfg = await getGeminiConfig()
            const effectiveKey = key || cfg.apiKey || cfg.openaiApiKey
            return {
              hasStoredKey: Boolean(key),
              maskedKey: effectiveKey ? `${effectiveKey.slice(0, 6)}...${effectiveKey.slice(-4)}` : '',
              configured: Boolean(cfg.apiKey || cfg.openaiApiKey),
              model: cfg.apiKey ? `${cfg.model}${cfg.openaiApiKey ? ` -> ${cfg.openaiModel}` : ''}` : cfg.openaiModel,
            }
          },
        },
        set: {
          mutate: async (input: { apiKey: string | null }) => {
            await setStoredGeminiKey(input.apiKey)
            return { ok: true }
          },
        },
      },
    },

    progress: {
      get: {
        query: getProfile,
      },
    },

    onboarding: {
      getDraft: {
        query: async () => {
          return mutateDb(async (db) => {
            const user = await requireCurrentUser(db)
            return ensureUserProfile(db, user.id)
          })
        },
      },
      chat: {
        mutate: async (input: { message: string }) => {
          return mutateDb(async (db) => {
            const user = await requireCurrentUser(db)
            const profile = await ensureUserProfile(db, user.id)
            const analyzed = await analyzeOnboardingMessage({
              message: input.message,
              currentDraft: profile.draftJson ?? {},
            })
            profile.draftJson = analyzed.extracted
            profile.updatedAt = new Date().toISOString()
            return analyzed
          })
        },
      },
      commit: {
        mutate: async (input: {
          confirmations: string[]
          learnerRole: 'student' | 'graduate' | 'worker' | 'independent'
          displayName: string
          timezone: string
          learningStyle?: string
          goals?: string
          schoolName?: string
          department?: string
          currentYear?: number
        }) => {
          return mutateDb(async (db) => {
            const user = await requireCurrentUser(db)
            const profile = await ensureUserProfile(db, user.id)
            profile.learnerRole = input.learnerRole
            profile.displayName = input.displayName
            profile.timezone = input.timezone
            profile.learningStyle = input.learningStyle ?? null
            profile.goals = input.goals ?? null
            profile.onboardingStep = input.learnerRole === 'student' ? 3 : 5
            profile.draftJson = { confirmations: input.confirmations }
            profile.updatedAt = new Date().toISOString()

            if (input.learnerRole === 'student') {
              const existing = db.studentProfiles.find((s) => s.userId === user.id)
              if (existing) {
                existing.schoolName = input.schoolName
                existing.department = input.department
                existing.currentYear = input.currentYear
              } else {
                db.studentProfiles.push({
                  userId: user.id,
                  schoolName: input.schoolName,
                  department: input.department,
                  currentYear: input.currentYear,
                })
              }
            }
            return { ok: true }
          })
        },
      },
    },

    calendar: {
      terms: {
        list: {
          query: async () => {
            const db = await loadDb()
            const user = await requireCurrentUser(db)
            return db.terms.filter((t) => t.userId === user.id)
          },
        },
        upsert: {
          mutate: async (input: {
            id?: string
            name: string
            startDate: string
            endDate: string
            classEndDate?: string
            activate?: boolean
          }) => {
            return mutateDb(async (db) => {
              const user = await requireCurrentUser(db)
              const termId = input.id ?? makeId('term')
              if (input.activate) {
                for (const t of db.terms) {
                  if (t.userId === user.id && t.id !== termId && t.isActive) {
                    t.isActive = false
                    for (const c of db.courses) {
                      if (c.userId === user.id && c.termId === t.id && c.progressStatus === 'current') {
                        c.progressStatus = 'completed'
                      }
                    }
                  }
                }
              }
              const existing = db.terms.find((t) => t.id === termId && t.userId === user.id)
              if (existing) {
                existing.name = input.name
                existing.startDate = input.startDate
                existing.endDate = input.endDate
                existing.classEndDate = input.classEndDate
                if (input.activate !== undefined) existing.isActive = Boolean(input.activate)
              } else {
                db.terms.push({
                  id: termId,
                  userId: user.id,
                  name: input.name,
                  startDate: input.startDate,
                  endDate: input.endDate,
                  classEndDate: input.classEndDate,
                  isActive: Boolean(input.activate),
                  confirmedAt: input.activate ? new Date().toISOString() : null,
                })
              }
              const profile = await ensureUserProfile(db, user.id)
              profile.onboardingStep = Math.max(profile.onboardingStep, 5)
              profile.updatedAt = new Date().toISOString()
              return { id: termId }
            })
          },
        },
      },

      courses: {
        list: {
          query: async () => {
            const db = await loadDb()
            const user = await requireCurrentUser(db)
            return db.courses.filter((c) => c.userId === user.id)
          },
        },
        upsert: {
          mutate: async (input: {
            id?: string
            termId?: string
            name: string
            code?: string
            realmId: 'math' | 'code' | 'science' | 'history' | 'language' | 'finance' | 'custom'
            color?: string
            source?: 'academic' | 'personal'
            progressStatus?: 'current' | 'completed' | 'archived'
          }) => {
            return mutateDb(async (db) => {
              const user = await requireCurrentUser(db)
              const courseId = input.id ?? makeId('course')
              const existing = db.courses.find((c) => c.id === courseId && c.userId === user.id)
              if (existing) {
                existing.name = input.name
                existing.code = input.code
                existing.realmId = input.realmId
                existing.color = input.color ?? existing.color
                existing.source = input.source ?? existing.source
                existing.progressStatus = input.progressStatus ?? existing.progressStatus
                existing.termId = input.termId ?? existing.termId
              } else {
                db.courses.push({
                  id: courseId,
                  userId: user.id,
                  termId: input.termId,
                  name: input.name,
                  code: input.code,
                  realmId: input.realmId,
                  color: input.color ?? '#8c31ff',
                  source: input.source ?? 'academic',
                  progressStatus: input.progressStatus ?? 'current',
                })
              }
              return { id: courseId }
            })
          },
        },
      },

      meetings: {
        list: {
          query: async () => {
            const db = await loadDb()
            const user = await requireCurrentUser(db)
            const userCourseIds = new Set(db.courses.filter((c) => c.userId === user.id).map((c) => c.id))
            return db.courseMeetings.filter((m) => userCourseIds.has(m.courseId))
          },
        },
        replace: {
          mutate: async (input: {
            courseId: string
            slots: Array<{
              weekday: number
              startTime: string
              endTime: string
              room?: string
              label?: string
            }>
          }) => {
            return mutateDb(async (db) => {
              const user = await requireCurrentUser(db)
              const owned = db.courses.find((c) => c.id === input.courseId && c.userId === user.id)
              if (!owned) throw new Error('Ders bulunamadı')

              const activeCourseIds = new Set(
                db.courses
                  .filter(
                    (c) =>
                      c.userId === user.id &&
                      c.id !== input.courseId &&
                      c.progressStatus === 'current' &&
                      (!owned.termId || c.termId === owned.termId)
                  )
                  .map((c) => c.id)
              )
              const otherMeetings = db.courseMeetings.filter((m) => activeCourseIds.has(m.courseId))

              const combinedSlots = [
                ...otherMeetings.map((m) => ({
                  key: `other-${m.id}`,
                  weekday: m.weekday as Weekday,
                  startTime: m.startTime,
                  endTime: m.endTime,
                })),
                ...input.slots.map((s, i) => ({
                  key: `new-${i}`,
                  weekday: s.weekday as Weekday,
                  startTime: s.startTime,
                  endTime: s.endTime,
                })),
              ]

              const clashes = findSlotClashes(combinedSlots)
              if (clashes.size > 0) {
                throw new Error('Ders saatleri mevcut haftalık programdaki başka bir dersle çakışıyor!')
              }

              db.courseMeetings = db.courseMeetings.filter((m) => m.courseId !== input.courseId)
              for (const s of input.slots) {
                db.courseMeetings.push({
                  id: makeId('meet'),
                  courseId: input.courseId,
                  weekday: s.weekday,
                  startTime: s.startTime,
                  endTime: s.endTime,
                  room: s.room,
                  label: s.label,
                })
              }
              const profile = await ensureUserProfile(db, user.id)
              profile.onboardingStep = Math.max(profile.onboardingStep, 7)
              profile.updatedAt = new Date().toISOString()
              return { ok: true }
            })
          },
        },
      },

      exceptions: {
        list: {
          query: async () => {
            const db = await loadDb()
            const user = await requireCurrentUser(db)
            return db.scheduleExceptions.filter((e) => e.userId === user.id)
          },
        },
        upsert: {
          mutate: async (input: {
            courseId?: string
            date: string
            kind: 'cancel' | 'reschedule' | 'makeup' | 'holiday'
            startTime?: string
            endTime?: string
            note?: string
          }) => {
            return mutateDb(async (db) => {
              const user = await requireCurrentUser(db)
              const rowId = makeId('ex')
              db.scheduleExceptions.push({
                id: rowId,
                userId: user.id,
                ...input,
              })
              db.dailyPlans = db.dailyPlans.filter(
                (p) => !(p.userId === user.id && p.localDate === input.date)
              )
              return { id: rowId }
            })
          },
        },
        remove: {
          mutate: async (input: { id: string }) => {
            return mutateDb(async (db) => {
              const user = await requireCurrentUser(db)
              db.scheduleExceptions = db.scheduleExceptions.filter(
                (e) => !(e.id === input.id && e.userId === user.id)
              )
              return { ok: true }
            })
          },
        },
      },

      events: {
        list: {
          query: async () => {
            const db = await loadDb()
            const user = await requireCurrentUser(db)
            return db.calendarEvents.filter((e) => e.userId === user.id)
          },
        },
        upsert: {
          mutate: async (input: { termId?: string; title: string; date: string; kind?: string }) => {
            return mutateDb(async (db) => {
              const user = await requireCurrentUser(db)
              const rowId = makeId('evt')
              db.calendarEvents.push({
                id: rowId,
                userId: user.id,
                termId: input.termId,
                title: input.title,
                date: input.date,
                kind: input.kind ?? 'exam',
              })
              return { id: rowId }
            })
          },
        },
        remove: {
          mutate: async (input: { id: string }) => {
            return mutateDb(async (db) => {
              const user = await requireCurrentUser(db)
              db.calendarEvents = db.calendarEvents.filter(
                (e) => !(e.id === input.id && e.userId === user.id)
              )
              return { ok: true }
            })
          },
        },
      },

      today: {
        query: async (input?: { date: string }) => {
          const db = await loadDb()
          const user = await requireCurrentUser(db)
          const date = input?.date ?? new Date().toISOString().slice(0, 10)
          return loadUserOccurrences(db, user.id, date).occurrences
        },
      },
    },

    characters: {
      list: {
        query: async () => {
          const db = await loadDb()
          const user = await requireCurrentUser(db)
          return db.gameCharacters.filter((c) => c.userId === user.id)
        },
      },

      status: {
        query: async (input: { id: string }) => {
          const db = await loadDb()
          const user = await requireCurrentUser(db)
          return db.gameCharacters.find((c) => c.id === input.id && c.userId === user.id) ?? null
        },
      },

      converse: {
        mutate: async (input: {
          prompt: string
          currentAppearance?: NpcAppearance | null
          history?: CharacterChatTurn[]
          characterId?: string
        }) => {
          const result = await converseCharacterDesign({
            prompt: input.prompt,
            currentAppearance: input.currentAppearance,
            history: input.history,
          })
          if (input.characterId) {
            await mutateDb(async (db) => {
              const user = await requireCurrentUser(db)
              const existing = db.gameCharacters.find(
                (c) => c.id === input.characterId && c.userId === user.id
              )
              if (existing) {
                existing.profile = {
                  ...existing.profile,
                  appearance: result.appearance,
                }
                existing.manifest = defaultManifest(existing.id, {}, 'npc_layers', result.appearance)
              }
            })
          }
          return result
        },
      },

      create: {
        mutate: async (input: {
          kind: 'avatar' | 'mentor'
          courseId?: string
          method: 'describe' | 'select' | 'surprise'
          prompt?: string
          skeletonHint?: SkeletonHint
          personality?: string
          teachingStyle?: string
          appearance?: Partial<NpcAppearance>
        }) => {
          return mutateDb(async (db) => {
            const user = await requireCurrentUser(db)
            if (input.kind === 'mentor' && !input.courseId) {
              throw new Error('Ders seçimi (courseId) gerekli')
            }

            if (input.kind === 'avatar') {
              const existingAvatar = db.gameCharacters.find(
                (c) => c.userId === user.id && c.kind === 'avatar'
              )
              const profile = await generateTeacherProfile({
                method: input.method,
                prompt: input.prompt,
                skeletonHint: input.skeletonHint,
                subject: user.name || 'Oyuncu Avatarı',
                appearanceOverride: input.appearance,
              })
              profile.name = user.name || profile.name
              if (existingAvatar) {
                existingAvatar.profile = profile
                existingAvatar.manifest = defaultManifest(existingAvatar.id, {}, 'npc_layers', profile.appearance)
                return { id: existingAvatar.id, status: 'ready' as const }
              }
              const avatarId = makeId('char')
              db.gameCharacters.push({
                id: avatarId,
                userId: user.id,
                kind: 'avatar',
                courseId: null,
                profile,
                manifest: defaultManifest(avatarId, {}, 'npc_layers', profile.appearance),
                status: 'ready',
                artSource: 'npc_layers',
              })
              return { id: avatarId, status: 'ready' as const }
            }

            if (input.kind === 'mentor' && input.courseId) {
              const existing = db.gameCharacters.find(
                (c) => c.userId === user.id && c.courseId === input.courseId
              )
              if (existing) {
                const courseRow = db.courses.find((c) => c.id === input.courseId)
                const updatedProfile = await generateTeacherProfile({
                  method: input.method,
                  prompt: input.prompt,
                  skeletonHint: input.skeletonHint,
                  personality: input.personality,
                  teachingStyle: input.teachingStyle,
                  subject: courseRow?.name,
                  appearanceOverride: input.appearance,
                })
                existing.profile = updatedProfile
                existing.manifest = defaultManifest(existing.id, {}, 'npc_layers', updatedProfile.appearance)
                return { id: existing.id, status: 'ready' as const }
              }
            }

            const courseRow = input.courseId
              ? db.courses.find((c) => c.id === input.courseId)
              : undefined
            const profile = await generateTeacherProfile({
              method: input.method,
              prompt: input.prompt,
              skeletonHint: input.skeletonHint,
              personality: input.personality,
              teachingStyle: input.teachingStyle,
              subject: courseRow?.name ?? 'Genel Keşif',
              appearanceOverride: input.appearance,
            })

            const characterId = makeId('char')
            const manifest = defaultManifest(characterId, {}, 'npc_layers', profile.appearance)

            db.gameCharacters.push({
              id: characterId,
              userId: user.id,
              kind: input.kind,
              courseId: input.courseId ?? null,
              profile,
              manifest,
              status: 'ready',
              artSource: 'npc_layers',
            })

            if (input.kind === 'mentor') {
              const userProfile = await ensureUserProfile(db, user.id)
              userProfile.onboardingComplete = true
              userProfile.onboardingStep = 8
              userProfile.updatedAt = new Date().toISOString()
            }

            return { id: characterId, status: 'ready' as const }
          })
        },
      },
    },

    mentors: {
      history: {
        query: async (input: { characterId: string }) => {
          const db = await loadDb()
          const user = await requireCurrentUser(db)
          const memory = db.mentorMemories.find(
            (m) => m.characterId === input.characterId && m.userId === user.id
          )
          return {
            turns: memory?.turns ?? [],
            summary: memory?.summary ?? '',
          }
        },
      },
      chat: {
        mutate: async (input: { characterId: string; message: string }) => {
          return mutateDb(async (db) => {
            const user = await requireCurrentUser(db)
            const character = db.gameCharacters.find(
              (c) => c.id === input.characterId && c.userId === user.id
            )
            if (!character) {
              throw new Error('Öğretmen bulunamadı')
            }
            const courseRow = character.courseId
              ? db.courses.find((c) => c.id === character.courseId)
              : undefined
            let memory = db.mentorMemories.find(
              (m) => m.characterId === character.id && m.userId === user.id
            )
            let student = db.studentMemories.find((s) => s.userId === user.id)

            const reply = await mentorReply({
              teacher: character.profile as unknown as Record<string, unknown>,
              courseName: courseRow?.name ?? 'Keşif',
              studentSummary: student?.summary ?? '',
              mentorSummary: memory?.summary ?? '',
              history: memory?.turns ?? [],
              message: input.message,
            })

            const allTurns = [
              ...(memory?.turns ?? []),
              { role: 'user' as const, text: input.message },
              { role: 'model' as const, text: reply.message },
            ]

            let summary = memory?.summary ?? ''
            if (allTurns.length > 6) {
              const older = allTurns.slice(0, allTurns.length - 6)
              const snippet = older
                .filter((t) => t.role === 'user')
                .map((t) => t.text.slice(0, 50))
                .join('; ')
              if (snippet) {
                summary = `${summary ? `${summary} | ` : ''}Önceki konular: ${snippet}`.slice(-300)
              }
            }
            const turns = allTurns.slice(-8)

            if (memory) {
              memory.turns = turns
              memory.summary = summary
              memory.updatedAt = new Date().toISOString()
            } else {
              memory = {
                id: makeId('mem'),
                userId: user.id,
                characterId: character.id,
                turns,
                summary,
                updatedAt: new Date().toISOString(),
              }
              db.mentorMemories.push(memory)
            }

            const studentNote = `${courseRow?.name ?? 'Ders'}: ${reply.learningObjective || input.message.slice(0, 40)}`
            if (student) {
              student.summary = `${student.summary ? `${student.summary} · ` : ''}${studentNote}`.slice(-400)
              student.updatedAt = new Date().toISOString()
            } else {
              db.studentMemories.push({
                userId: user.id,
                summary: studentNote,
                updatedAt: new Date().toISOString(),
              })
            }

            return reply
          })
        },
      },
    },

    quests: {
      generate: {
        mutate: async (input: {
          courseId?: string
          topic: string
          difficulty?: 'Kolay' | 'Orta' | 'Zorlu' | 'Usta'
          type?: 'matrix' | 'dilemma' | 'algorithm'
        }) => {
          return mutateDb(async (db) => {
            const user = await requireCurrentUser(db)
            const courseRow = input.courseId
              ? db.courses.find((c) => c.id === input.courseId && c.userId === user.id)
              : undefined
            const generated = await generateQuestContent({
              realmId: courseRow?.realmId ?? 'custom',
              topic: input.topic,
              difficulty: input.difficulty ?? 'Orta',
              type: input.type,
              courseName: courseRow?.name,
            })
            const questId = makeId('quest')
            db.quests.push({
              id: questId,
              userId: user.id,
              courseId: input.courseId,
              realmId: courseRow?.realmId ?? 'custom',
              type: generated.type,
              title: generated.title,
              payload: { ...generated.payload, storyIntro: generated.storyIntro },
              learningObjectives: generated.learningOutcomes,
              status: 'offered',
            })
            return { id: questId, ...generated }
          })
        },
      },

      get: {
        query: async (input: { id: string }) => {
          const db = await loadDb()
          const user = await requireCurrentUser(db)
          return db.quests.find((q) => q.id === input.id && q.userId === user.id) ?? null
        },
      },

      submit: {
        mutate: async (input: {
          questId: string
          answer: unknown
          explanation?: string
          attemptsUsed?: number
          hintsUsed?: number
          timeSpentSeconds?: number
        }) => {
          return mutateDb(async (db) => {
            const user = await requireCurrentUser(db)
            const existingSession = db.gameSessions.find(
              (s) => s.questId === input.questId && s.userId === user.id
            )
            if (existingSession) {
              throw new Error('Bu görev zaten teslim edildi')
            }

            const row = db.quests.find((q) => q.id === input.questId && q.userId === user.id)
            if (!row) throw new Error('Görev bulunamadı')

            const explanation = input.explanation ?? ''
            const attemptsUsed = input.attemptsUsed ?? 1
            const hintsUsed = input.hintsUsed ?? 0
            const timeSpentSeconds = input.timeSpentSeconds ?? 0

            const payload = row.payload
            let engine: Record<string, unknown> = { valid: true }
            let isCorrect = true

            if (row.type === 'matrix') {
              const answer = input.answer as { activeIds?: string[] }
              const nodes = ((payload.nodes as Array<{ id: string; value: number }>) ?? []).map((n) => ({
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
            } else if (!explanation.trim()) {
              throw new Error('İkilem görevi için kısa bir gerekçe yazmalısın')
            }

            const evaluation = await evaluateExplanation({
              title: row.title,
              prompt: String(payload.storyIntro ?? ''),
              answer: input.answer,
              explanation,
              isCorrect,
            })

            const xpAwarded = calculateQuestXP({
              isCorrect,
              score: evaluation.score,
              attemptsUsed,
              hintsUsed,
              timeSpentSeconds,
              explanationQualityScore: evaluation.explanationQualityScore,
            })

            await ensureUserProfile(db, user.id)
            const comp = db.studentCompetencies.find((c) => c.userId === user.id)!
            const skills = updateSkillScores(comp.skills ?? EMPTY_SKILLS, row.realmId, {
              isCorrect,
              score: evaluation.score,
              attemptsUsed,
              hintsUsed,
              timeSpentSeconds,
            })

            comp.xp += xpAwarded
            if (attemptsUsed > 1 || !isCorrect) {
              comp.mistakesEmbraced += 1
            }
            comp.questsCompleted += 1
            comp.skills = skills
            comp.updatedAt = new Date().toISOString()

            row.status = 'completed'

            db.gameSessions.push({
              id: makeId('sess'),
              questId: row.id,
              userId: user.id,
              attemptsUsed,
              hintsUsed,
              timeSpentSeconds,
              explanation,
              engineResult: engine,
              evaluation,
              xpAwarded,
            })

            return {
              engine,
              evaluation,
              xpAwarded,
              totalXp: comp.xp,
              level: calculateLevel(comp.xp),
              skills,
              isCorrect,
            }
          })
        },
      },
    },

    plan: {
      today: {
        query: async (input?: { date?: string; now?: string }) => {
          return mutateDb(async (db) => {
            const user = await requireCurrentUser(db)
            const date = input?.date ?? new Date().toISOString().slice(0, 10)
            const { courses, occurrences } = loadUserOccurrences(db, user.id, date)
            const cached = db.dailyPlans.find(
              (p) => p.userId === user.id && p.localDate === date
            )
            if (cached && (cached.items.length > 0 || cached.restDay)) {
              return { plan: cached, occurrences, courses }
            }
            const baseItems = buildLocalDailyPlanItems(courses, occurrences, input?.now)
            const items = await enrichDailyPlanItemsWithAI({
              date,
              courses: courses.map((c) => ({ id: c.id, name: c.name, realmId: c.realmId })),
              fallbackItems: baseItems,
            })
            const planRow = {
              id: makeId('plan'),
              userId: user.id,
              localDate: date,
              restDay: false,
              items,
            }
            if (!cached) {
              db.dailyPlans.push(planRow)
            } else {
              cached.items = items
            }
            return { plan: planRow, occurrences, courses }
          })
        },
      },

      refresh: {
        mutate: async (input?: { date?: string }) => {
          return mutateDb(async (db) => {
            const user = await requireCurrentUser(db)
            const date = input?.date ?? new Date().toISOString().slice(0, 10)
            const { courses, occurrences } = loadUserOccurrences(db, user.id, date)
            const baseItems = buildLocalDailyPlanItems(courses, occurrences)
            const items = await enrichDailyPlanItemsWithAI({
              date,
              courses: courses.map((c) => ({ id: c.id, name: c.name, realmId: c.realmId })),
              fallbackItems: baseItems,
            })
            db.dailyPlans = db.dailyPlans.filter(
              (p) => !(p.userId === user.id && p.localDate === date)
            )
            const row = {
              id: makeId('plan'),
              userId: user.id,
              localDate: date,
              restDay: false,
              items,
            }
            db.dailyPlans.push(row)
            return row
          })
        },
      },

      defer: {
        mutate: async (input: { itemId: string; date?: string }) => {
          return mutateDb(async (db) => {
            const user = await requireCurrentUser(db)
            const date = input.date ?? new Date().toISOString().slice(0, 10)
            const plan = db.dailyPlans.find((p) => p.userId === user.id && p.localDate === date)
            if (plan) {
              plan.items = plan.items.map((item) =>
                item.id === input.itemId ? { ...item, deferred: true } : item
              )
            }
            return { ok: true }
          })
        },
      },

      restDay: {
        mutate: async (input: { restDay: boolean; date?: string }) => {
          return mutateDb(async (db) => {
            const user = await requireCurrentUser(db)
            const date = input.date ?? new Date().toISOString().slice(0, 10)
            let plan = db.dailyPlans.find((p) => p.userId === user.id && p.localDate === date)
            if (!plan) {
              plan = {
                id: makeId('plan'),
                userId: user.id,
                localDate: date,
                restDay: input.restDay,
                items: [],
              }
              db.dailyPlans.push(plan)
            } else {
              plan.restDay = input.restDay
            }
            return { ok: true, restDay: plan.restDay }
          })
        },
      },

      reportTopic: {
        mutate: async (input: { courseId: string; topic: string; date?: string }) => {
          return mutateDb(async (db) => {
            const user = await requireCurrentUser(db)
            const date = input.date ?? new Date().toISOString().slice(0, 10)
            const course = db.courses.find((c) => c.id === input.courseId && c.userId === user.id)
            let plan = db.dailyPlans.find((p) => p.userId === user.id && p.localDate === date)
            const newItem: PlanItem = {
              id: makeId('item'),
              courseId: input.courseId,
              window: 'post',
              title: `${course?.name ?? 'Ders'} — Ders Sonrası: ${input.topic}`,
              story: `Bugün derste işlenen "${input.topic}" konusunu hemen pratik bir görevle pekiştir.`,
              suggestedType: course?.realmId === 'code' ? 'algorithm' : 'matrix',
              duration: 10,
              topic: input.topic,
            }
            if (!plan) {
              plan = {
                id: makeId('plan'),
                userId: user.id,
                localDate: date,
                restDay: false,
                items: [newItem],
              }
              db.dailyPlans.push(plan)
            } else {
              plan.restDay = false
              plan.items = [newItem, ...plan.items]
            }
            return newItem
          })
        },
      },

      infer: {
        query: async (input: { now: string; start: string; end: string }) => {
          return inferWindow(input.now, input.start, input.end)
        },
      },
    },
  }
}
