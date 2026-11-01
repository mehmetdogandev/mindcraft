# 03 — Veri modeli

PDF §31 varlıkları. Mevcut `packages/schedule` tipleri ve prototip `SkillScores` birleştirilir. Drizzle tablo adları uygulama fazında buradan türetilir.

## Varlık ilişkisi

```
User
  └── LearningProfile
  └── StudentProfile?          (öğrenci ise)
  └── Term[]                   (biri active)
        └── Course[]           (progress: current | completed | archived)
              └── Meeting[]    (haftalık tekrar)
              └── Teacher      (0..1, kind=mentor)
              └── Quest[]
              └── GameSession[]
        └── CalendarEvent[]    (sınav, teslim, tatil)
        └── ScheduleException[]
  └── GameCharacter[]          (avatar 1, mentor per course)
  └── Competency               (öğrenci, dersler üstü)
  └── MentorMemory[]           (öğretmen başına özet)
  └── DailyPlan[]              (user + localDate)
```

## Tablolar

### `user`

Better Auth kullanıcı. `accountType` tek: portal oyuncu. Admin tabloları yok.

### `learning_profile`

| Alan | Not |
|---|---|
| `userId` | unique |
| `learnerRole` | `student` \| `graduate` \| `worker` \| `independent` |
| `displayName` | |
| `learningStyle` | serbest metin / enum |
| `weeklyAvailability` | JSON (bağımsız öğrenen) |
| `goals` | metin |
| `onboardingStep` | 1–8 |
| `onboardingComplete` | bool |
| `draftJson` | yarım kurulum (PDF §4) |
| `timezone` | IANA, günlük plan için zorunlu |

### `student_profile`

Öğrenci rolünde doldurulur. Zorunlu değil.

| Alan | Kaynak |
|---|---|
| `schoolName` | PDF §5 / mevcut `university` |
| `department` | |
| `programLevel` | lise / lisans / … |
| `currentYear` | |
| `currentSemesterInYear` | |
| `totalSemesters` | mevcut mobil onboarding |

### `term`

`packages/schedule` `ScheduleTerm` + PDF §8.

| Alan | Not |
|---|---|
| `name` | |
| `startDate` / `classEndDate` / `termEndDate` | ders bitiş ≠ dönem bitiş olabilir |
| `isActive` | kullanıcı başına bir aktif |
| `confirmedAt` | onaylanmadan aktif ders sayılmaz |

### `course`

| Alan | Not |
|---|---|
| `termId` | |
| `name` / `code` | |
| `realmId` | `math` `code` `science` `history` `language` `finance` `custom` |
| `progressStatus` | `current` \| `completed` \| `archived` |
| `source` | `academic` \| `personal` |
| `color` | kampüs kartı |

Geçmiş ders otomatik öğrenilmiş sayılmaz (`completed` ≠ mastered).

### `course_meeting`

Haftalık tekrar. `weekday` 1–7, `startTime` / `endTime` `HH:MM`, opsiyonel `room`, `mode`.

### `schedule_exception`

Tek gün iptal, telafi, saat değişimi, tatil. Haftalık şablonu bozmaz.

### `calendar_event`

Sınav haftası, teslim, resmi tatil. Ders katılım kanıtı değildir.

### `game_character`

Mevcut `packages/sprites` + prototip `TeacherProfile`.

| Alan | Not |
|---|---|
| `kind` | `avatar` \| `mentor` |
| `courseId` | mentor için zorunlu, unique (course, user) |
| `profile` | JSON: name, title, personality, teachingStyle, catchphrase, appearance, skeletonHint |
| `manifest` | `SpriteSheetManifest` |
| `status` | `generating` \| `preview` \| `ready` \| `failed` |
| `assetVersion` | |
| `errorMessage` | |

Avatar kullanıcı başına en fazla bir. Mentor ders başına bir.

### `character_job`

Uzun üretim. `queued` → `profile` → `preview` → `frames` → `atlas` → `ready` \| `failed`. Retry sayacı.

### `quest`

| Alan | Not |
|---|---|
| `courseId` / `teacherId` | |
| `realmId` | |
| `schemaVersion` | |
| `type` | `matrix` \| `dilemma` \| `algorithm` |
| `payload` | doğrulanmış motor JSON |
| `learningObjectives` | string[] |
| `sourcePlanId` | daily plan satırı |
| `status` | `offered` \| `active` \| `completed` \| `abandoned` |

Gemini ham çıktısı ayrı `rawModelJson` olarak saklanabilir; istemciye gitmez.

### `game_session`

Bir oynanış. `attemptsUsed`, `hintsUsed`, `timeSpentSeconds`, `explanation`, `engineResult`, `evaluation`, `xpAwarded`.

### `student_competency`

Tek satır / kullanıcı. `SkillScores` 0–100: `logic`, `creativity`, `resilience`, `criticalThinking`, `knowledge`, `communication`. Ayrıca `xp`, `level`, `mistakesEmbraced`, `questsCompleted`. `streakDays` bilgi amaçlı, ceza yok.

### `mentor_memory`

Öğretmen başına kısa özet: son kavramlar, sevilen örnekler, zorluklar. Ham chat log sınırsız büyümez; rolling summary.

### `student_memory`

Öğrencinin dersler üstü özeti. Tüm öğretmenler okur. Hocalar birbirinin sohbetini okumaz.

### `daily_plan`

`userId` + `localDate` unique. Satırlar: `courseId`, `window` (`pre` \| `post` \| `evening` \| `explore`), `questId?`, `status`. Aynı gün tekrar açılışta yeniden üretilmez (`plan.refresh` hariç).

## Silme ve yetki

Tüm satırlar `userId` ile sınırlıdır. Ders programı başka kullanıcıya görünmez. Hesap silme P09’da: karakter asset’leri dahil cascade.

## Mevcut şemadan bilinçli fark

Mevcut üründe `lesson_note`, `lesson_whiteboard`, `lesson_recording`, `user_library_item` MVP’de yoktur. `task` yerine `calendar_event` + `daily_plan` yeterlidir.
