# P03 — Karakter fabrikası

Şablon sürümü: 1.0  
PDF: D §15–19  
Bağımlılık: P02 (en az bir ders)

## Amaç

Oyuncu ilk ders için öğretmen üretir. Profil Gemini JSON’dur. Sprite işi kuyrukta izlenir. `ready` olmadan karakter oynatılmaz.

## Kapsam dışı

Sohbet runtime (P04). Quest (P05). Öğretmen değiştirme UI. Kusursuz her tarif.

## Etkilenen paketler

- `server/ai/teacher-profile.ts`
- `server/ai/character-factory.ts` (placeholder SVG→PNG + opsiyonel image model)
- `packages/sprites`
- `apps/mobile` `CharacterForgeScreen`, `CharacterJobScreen`
- S3 asset yolları

## İş listesi

1. Tablolar: `game_character`, `character_job`.
2. Üç yol: anlat / seç / sürpriz (`character-forge.tsx`).
3. Ders başına bir mentor, kullanıcı başına bir avatar.
4. Job state machine (`06-sprite-pipeline.md`).
5. Image fail → placeholder sheet, `artSource=placeholder`.
6. QC fail → idle+talk → `failed`.
7. Mobil poll `characters.status`.
8. Onboarding adım 7: bir `ready` mentor.

## API / ekran

| Tür | Ad |
|---|---|
| tRPC | `characters.create` `characters.list` `characters.status` |
| HTTP | `/api/files/characters/:id/:file` |
| Ekran | forge (3 yol), üretim progress, önizleme SpritePlayer |

## Kabul

- Tarif → Türkçe profil + en az idle/talk oynar (placeholder kabul).
- İkinci kez aynı `courseId` create 409.
- Gemini yok: create başlamaz, sahte öğretmen yok.
- `failed` yarım sprite göstermez.

## Risk

Görsel süreklilik (PDF §39 birincil risk). MVP’de placeholder + QC düşümü yeterli kabul; gerçek PNG pipeline P09’da sıkılaşır.

## Referans

- Prototip `generateTeacher`, `TeacherCreationStudio.tsx`, `TeacherStage.tsx`
- `mindcraft/packages/sprites/src/index.ts`
- `mindcraft/apps/web/src/components/game/character-forge.tsx`
- `mindcraft/docs/mindcraft-game-design.md` Character Factory
