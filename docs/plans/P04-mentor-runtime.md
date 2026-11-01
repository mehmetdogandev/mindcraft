# P04 — Mentor runtime

Şablon sürümü: 1.0  
PDF: D §20, E §23  
Bağımlılık: P03 (`ready` öğretmen)

## Amaç

Öğretmen odasında gerçek Gemini sohbeti, desteklenen animasyonlar, iki hafıza ve pedagojik guardrail çalışır.

## Kapsam dışı

Quest üretimi (P05). Whiteboard UI. Öğretmenler arası sohbet paylaşımı.

## Etkilenen paketler

- `server/ai/mentor-chat.ts`
- `server/trpc/mentors.ts`
- `mentor_memory`, `student_memory`
- `apps/mobile` `MentorRoomScreen`, `SpritePlayer`

## İş listesi

1. tRPC `mentors.chat`: sunucu bağlamı toplar (profil, ders, iki özet, son 6 tur).
2. Yanıt Zod: `message`, `emotion`, `animation`, `nextAction`, `learningObjective`, `socraticHint?`.
3. Animasyon map: prototip `surprise`/`confuse` → `happy`/`confused`.
4. `nextAction=start_quest` oda içinde “görev öner” CTA (üretim P05).
5. `open_whiteboard` yut, UI açma.
6. Her N turda memory özet job; ham log truncate.
7. Kişilik prompt’u pedagogy’den ayrı.
8. Gemini hata: son mesaj kaybolmaz, “hizmet yok” + retry.

## API / ekran

| Tür | Ad |
|---|---|
| tRPC | `mentors.chat` |
| tRPC | `mentors.memory` (debug / sonra gizle) |
| Ekran | `MentorRoomScreen` (sprite + bubbles + input) |

## Kabul

- Gerçek model yanıtı + talk/think animasyonu.
- Aşağılayıcı üslup system prompt’ta yasak; spot check senaryosu P09’da.
- İkinci öğretmen, birincinin ham sohbetini görmez; `student_memory` özetini görür.
- Anahtar yok: yeni mesaj gönderilmez.

## Risk

Uzun context maliyeti. Azaltma: 6 tur + özet, transkript dump yok.

## Referans

- Prototip `chatWithTeacher`, `TeacherChatDrawer.tsx`
- `mindcraft/packages/sprites` `MentorChatResponse`
- `mindcraft/apps/mobile/src/lib/api/portal.ts` `mentorChat`
- `mindcraft/apps/web/src/components/game/mentor-office.tsx` (route kalıbı kopyalanmaz)
