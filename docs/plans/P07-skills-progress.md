# P07 — Beceri ve ilerleme

Şablon sürümü: 1.0  
PDF: E §23–24  
Bağımlılık: P05

## Amaç

XP, seviye unvanı ve 6 eksen sunucuda tek kaynaktır. Öğretmen değişse / dönem arşivlense beceriler kalır.

## Kapsam dışı

Kozmetik mağaza, cezalı streak, liderlik tablosu, web senkron.

## Etkilenen paketler

- `packages/game-rules` `calculateLevel` `updateSkillScores`
- `student_competency`
- `apps/mobile` `SkillMapModal` (prototip radar)

## İş listesi

1. `progress.get` competency + unvan + nextLevelXP.
2. `quests.submit` sonrası atomik update.
3. Realm → eksen map’i `updateSkillScores` (math→logic, …).
4. `mistakesEmbraced` attempts>1 veya yanlışta artar.
5. `streakDays` bilgi; kırma cezası yok, HUD’da opsiyonel.
6. Skill map: radar + bar + quest sayacı.
7. İstemci optimistic HUD; reopen’da sunucu kazanır.
8. Prototip varsayılan 340 XP **taşınmaz**; yeni hesap 0.

## API / ekran

| Tür | Ad |
|---|---|
| tRPC | `progress.get` |
| Ekran | evren HUD (seviye/XP), `SkillMapModal` |

## Kabul

- Aynı quest ikinci submit XP basmaz (session unique).
- Öğretmen failed/requeue beceri silmez.
- `calculateQuestXP` birim testleri + bir integration submit testi.

## Risk

İstemci/sunucu sapması (prototipte vardı). Tek yazım yolu: submit mutation.

## Referans

- Prototip `src/game/rules.ts`, `SkillMapModal.tsx`
- Mevcut tasarım: yetkinlik grafiği öğrenciye aittir
