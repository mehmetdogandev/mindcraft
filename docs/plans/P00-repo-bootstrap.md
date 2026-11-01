# P00 — Repo bootstrap

Şablon sürümü: 1.0  
PDF: F §25–28, H §38 aşama 1  
Bağımlılık: yok

## Amaç

`mindcraft-v2` içinde çalışır Expo mobil iskeleti + Hono sunucu + paylaşılan paketler açılsın. Health ve Gemini status dürüst yanıt versin. Oyun ekranları bu fazda yok.

## Git (önceden kapandı)

`mindcraft-v2` kendi deposudur. `origin` SSH ile `git@github.com:mehmetdogandev/mindcraft.git` noktasına bakar. Plan commit’i yereldir; **push sen yaparsın.**

## Kapsam dışı

Auth akışı, şema tabloları, quest, sprite üretimi, TestFlight binary. Ajan `git push` etmez.

## Etkilenen paketler

- `apps/mobile` (yeni Expo app)
- `server`
- `packages/game-rules` (`rules.ts` + testler taşınır)
- `packages/sprites` (mevcut `packages/sprites/src/index.ts` sade kopya)
- `packages/schedule` (tipler; clash sonra)
- kök `pnpm-workspace.yaml`, `docker-compose.dev.yml`, `.env.example`

## İş listesi

1. pnpm monorepo; Node `>=22.11`.
2. Expo app: iOS, TypeScript, React Navigation boş stack (`BootScreen`).
3. `server`: Hono `/api/health`, `/api/ready`, `/api/trpc` iskeleti.
4. Docker: Postgres, Redis, MinIO.
5. `packages/game-rules`: prototipten saf fonksiyonlar + `rules.test.ts`.
6. Env okuma; `GEMINI_API_KEY` yoksa health `gemini.configured=false`.
7. Mobil `ServerRequiredGate`: health fail → dur; Gemini fail → “AI kapalı” banner (uygulama çökmez).

## API / ekran

| Tür | Ad |
|---|---|
| HTTP | `GET /api/health` `{ db, redis, s3, gemini }` |
| HTTP | `GET /api/ready` |
| tRPC | `health.status` |
| Ekran | `BootScreen`, `ServiceUnavailableScreen` |

## Kabul

- `pnpm dev` API + Expo’yu ayağa kaldırır.
- Anahtar yokken health 200, `gemini.configured=false`; sahte “Gemini hazır” yok.
- `game-rules` testleri geçer.
- Mobil, API kapalıyken Boot’da kalır.

## Risk

Expo + pnpm workspace sürüm sürtünmesi. Mevcut bare RN 0.84 konfigürasyonu kopyalanmaz.

## Referans

- Prototip `server/gemini.ts` `checkGeminiStatus`
- `mindcraft/apps/mobile/src/components/game/ServerRequiredGate.tsx`
- `mindcraft/server/src/health.ts` (varsa) / `server/src/index.ts`
