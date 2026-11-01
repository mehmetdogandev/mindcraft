# P02 — Akademik takvim

Şablon sürümü: 1.0  
PDF: C §8–12  
Bağımlılık: P01

## Amaç

Bir dönem, geçmiş/aktif/kişisel dersler, haftalık çizelge ve istisnalar kaydedilsin. Bugünün ders listesi Gemini olmadan doğru hesaplansın.

## Kapsam dışı

Günlük macera üretimi (P06). Öğretmen (P03). Yoklama.

## Etkilenen paketler

- `packages/schedule` — `ScheduleTerm`, `ScheduleCourse`, `ScheduleMeeting`, occurrence
- `server/trpc` `terms` `courses` `meetings` `exceptions` `events`
- `apps/mobile` `TermSetupScreen`, `CourseCatalogScreen`, `WeeklyScheduleScreen`
- `apps/mobile` clash uyarısı (`clash.ts` kalıbı)

## İş listesi

1. Drizzle tabloları: `term`, `course`, `course_meeting`, `schedule_exception`, `calendar_event`.
2. Öğrenci değilse: kişisel ders + `weeklyAvailability`; üniversite zorunlu değil.
3. Ders önerisi (bölüm/sınıf) varsa doğrulanmadan `current` olmaz.
4. Haftalık tablo son kayıt öncesi onay ekranı.
5. Çakışma, eksik saat, dönem dışı tarih reddi.
6. `schedule.occurrences(date)` deterministik.
7. Yeni dönem: eskisi `archived`, öğretmenler silinmez.
8. Onboarding adım 3–6 bu ekranlarla kapanır.

## API / ekran

| Tür | Ad |
|---|---|
| tRPC | `terms.upsert` `terms.activate` |
| tRPC | `courses.list` `courses.upsert` |
| tRPC | `meetings.replace` |
| tRPC | `exceptions.upsert` |
| tRPC | `schedule.today` |
| Ekran | dönem, ders listesi, haftalık grid, onay özeti |

## Kabul

- Pazartesi 09–11 ve 13–15 kayıtlıyken `schedule.today` tam bu iki oturumu döner.
- Tek gün iptal şablonu bozmaz.
- Yeni dönem onaylanmadan eski ders `current` olmaz.
- Geçmiş ders `completed` olsa da mastered sayılmaz (ayrı bayrak yok).

## Risk

Yanlış beyan edilen takvim. Azaltma: onay özeti + kolay düzenleme (PDF §39).

## Referans

- `mindcraft/packages/schedule/src/types.ts`
- `mindcraft/apps/mobile/src/lib/schedule/clash.ts`
- `mindcraft/apps/mobile/src/lib/schedule/timetable.ts`
