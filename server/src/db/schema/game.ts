import { boolean, integer, jsonb, pgTable, text, timestamp, uniqueIndex } from 'drizzle-orm/pg-core'
import { user } from './auth.ts'

export const learningProfile = pgTable('learning_profile', {
  userId: text('user_id')
    .primaryKey()
    .references(() => user.id, { onDelete: 'cascade' }),
  learnerRole: text('learner_role'),
  displayName: text('display_name'),
  learningStyle: text('learning_style'),
  weeklyAvailability: jsonb('weekly_availability').$type<Record<string, unknown>>(),
  goals: text('goals'),
  onboardingStep: integer('onboarding_step').notNull().default(1),
  onboardingComplete: boolean('onboarding_complete').notNull().default(false),
  draftJson: jsonb('draft_json').$type<Record<string, unknown>>().notNull().default({}),
  timezone: text('timezone').notNull().default('Europe/Istanbul'),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

export const studentProfile = pgTable('student_profile', {
  userId: text('user_id')
    .primaryKey()
    .references(() => user.id, { onDelete: 'cascade' }),
  schoolName: text('school_name'),
  department: text('department'),
  programLevel: text('program_level'),
  currentYear: integer('current_year'),
  currentSemesterInYear: integer('current_semester_in_year'),
  totalSemesters: integer('total_semesters'),
})

export const term = pgTable('term', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  startDate: text('start_date').notNull(),
  classEndDate: text('class_end_date'),
  endDate: text('end_date').notNull(),
  isActive: boolean('is_active').notNull().default(false),
  confirmedAt: timestamp('confirmed_at'),
})

export const course = pgTable('course', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  termId: text('term_id').references(() => term.id, { onDelete: 'set null' }),
  name: text('name').notNull(),
  code: text('code'),
  realmId: text('realm_id').notNull().default('custom'),
  color: text('color').notNull().default('#8c31ff'),
  mode: text('mode').notNull().default('in_person'),
  source: text('source').notNull().default('academic'),
  progressStatus: text('progress_status').notNull().default('current'),
})

export const courseMeeting = pgTable('course_meeting', {
  id: text('id').primaryKey(),
  courseId: text('course_id')
    .notNull()
    .references(() => course.id, { onDelete: 'cascade' }),
  weekday: integer('weekday').notNull(),
  startTime: text('start_time').notNull(),
  endTime: text('end_time').notNull(),
  room: text('room'),
  label: text('label'),
})

export const scheduleException = pgTable('schedule_exception', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  courseId: text('course_id').references(() => course.id, { onDelete: 'cascade' }),
  date: text('date').notNull(),
  kind: text('kind').notNull(),
  startTime: text('start_time'),
  endTime: text('end_time'),
  note: text('note'),
})

export const calendarEvent = pgTable('calendar_event', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  termId: text('term_id').references(() => term.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  date: text('date').notNull(),
  kind: text('kind').notNull().default('exam'),
})

export const gameCharacter = pgTable(
  'game_character',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    kind: text('kind').notNull(),
    courseId: text('course_id').references(() => course.id, { onDelete: 'cascade' }),
    profile: jsonb('profile').$type<Record<string, unknown>>().notNull().default({}),
    manifest: jsonb('manifest').$type<Record<string, unknown>>().notNull().default({}),
    status: text('status').notNull().default('generating'),
    artSource: text('art_source').notNull().default('placeholder'),
    assetVersion: integer('asset_version').notNull().default(1),
    errorMessage: text('error_message'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (t) => [uniqueIndex('game_character_mentor_course').on(t.userId, t.courseId)]
)

export const quest = pgTable('quest', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  courseId: text('course_id').references(() => course.id, { onDelete: 'set null' }),
  teacherId: text('teacher_id').references(() => gameCharacter.id, { onDelete: 'set null' }),
  realmId: text('realm_id').notNull().default('custom'),
  type: text('type').notNull(),
  title: text('title').notNull(),
  payload: jsonb('payload').$type<Record<string, unknown>>().notNull(),
  learningObjectives: jsonb('learning_objectives').$type<string[]>().notNull().default([]),
  status: text('status').notNull().default('offered'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})

export const gameSession = pgTable('game_session', {
  id: text('id').primaryKey(),
  questId: text('quest_id')
    .notNull()
    .references(() => quest.id, { onDelete: 'cascade' }),
  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  attemptsUsed: integer('attempts_used').notNull().default(1),
  hintsUsed: integer('hints_used').notNull().default(0),
  timeSpentSeconds: integer('time_spent_seconds').notNull().default(0),
  explanation: text('explanation'),
  engineResult: jsonb('engine_result').$type<Record<string, unknown>>(),
  evaluation: jsonb('evaluation').$type<Record<string, unknown>>(),
  xpAwarded: integer('xp_awarded').notNull().default(0),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})

export const studentCompetency = pgTable('student_competency', {
  userId: text('user_id')
    .primaryKey()
    .references(() => user.id, { onDelete: 'cascade' }),
  xp: integer('xp').notNull().default(0),
  mistakesEmbraced: integer('mistakes_embraced').notNull().default(0),
  questsCompleted: integer('quests_completed').notNull().default(0),
  streakDays: integer('streak_days').notNull().default(0),
  skills: jsonb('skills')
    .$type<{
      logic: number
      creativity: number
      resilience: number
      criticalThinking: number
      knowledge: number
      communication: number
    }>()
    .notNull(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

export const mentorMemory = pgTable('mentor_memory', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  characterId: text('character_id')
    .notNull()
    .references(() => gameCharacter.id, { onDelete: 'cascade' }),
  summary: text('summary').notNull().default(''),
  turns: jsonb('turns').$type<Array<{ role: 'user' | 'model'; text: string }>>().notNull().default([]),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

export const studentMemory = pgTable('student_memory', {
  userId: text('user_id')
    .primaryKey()
    .references(() => user.id, { onDelete: 'cascade' }),
  summary: text('summary').notNull().default(''),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

export const dailyPlan = pgTable(
  'daily_plan',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    localDate: text('local_date').notNull(),
    items: jsonb('items').$type<Array<Record<string, unknown>>>().notNull().default([]),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (t) => [uniqueIndex('daily_plan_user_date').on(t.userId, t.localDate)]
)
