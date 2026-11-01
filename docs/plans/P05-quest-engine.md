# P05 — Quest motoru

Şablon sürümü: 1.0  
PDF: E §21–22  
Bağımlılık: P04, `packages/game-rules`

## Amaç

Gemini yalnızca doğrulanabilir içerik üretir. Üç native motor oynatılır. Matrix/algorithm skorunu model ezemez.

## Kapsam dışı

`dialogue`, `concept`. Sınırsız dinamik kod. Whiteboard görevi. Günlük plan otomatik önerisi (P06 bu motoru çağırır).

## Etkilenen paketler

- `packages/game-rules` — `validateEnergyMatrix`, `runAlgorithmSequence`, `calculateQuestXP`
- `server/ai/quest-generate.ts` `quest-evaluate.ts`
- `server/trpc/quests.ts`
- `apps/mobile` `QuestPlayerScreen` + `MatrixBoard` `AlgorithmBoard` `DilemmaBoard`

## İş listesi

1. `quests.generate({ courseId, topic, difficulty, type? })` → Zod payload.
2. Desteklenmeyen tip → hata, sessiz matrix fallback yok.
3. Quest satırı `offered` → oyuncu başlatınca `active`.
4. İstemci anlık feedback; `quests.submit` sunucu motor + Gemini yorum.
5. Matrix/algorithm: `engine.valid` kaynak `isCorrect`.
6. Dilemma: motor yok; `explanation` zorunlu; Gemini pedagojik skor.
7. `hintsUsed` / `attemptsUsed` session’da.
8. `nextAction=start_quest` P04 CTA bu endpoint’e bağlanır.

## API / ekran

| Tür | Ad |
|---|---|
| tRPC | `quests.generate` `quests.get` `quests.submit` |
| Ekran | tam ekran QuestPlayer, ipucu, açıklama alanı, sonuç |

## Kabul

- Hardcoded olmayan, üretilmiş bir matrix oynanır ve toplam doğrulanır.
- Algorithm out-of-bounds `crashed`, XP yine `rules.ts` ile pozitif olabilir.
- Gemini `isCorrect: true` dese de yanlış toplam kabul edilmez.
- `rewardXP` model alanı yok sayılır.

## Risk

Bozuk payload. Azaltma: sıkı Zod + generate retry bir kez + açık hata.

## Referans

- Prototip `QuestPlayer.tsx`, `generateDynamicQuest`, `evaluateSolution`
- `src/game/rules.ts`
- `mindcraft/apps/web/src/components/game/system-balancer-game.tsx`
- `mindcraft/apps/web/src/components/game/logic-grid-game.tsx`
