# 02 — Mimari

## Karar

Tek repo, iki süreç, bir ürün.

```
mindcraft-v2/
  apps/mobile/          Expo (iOS first)
  server/               Hono + tRPC + Better Auth + Gemini
  packages/
    game-rules/         XP, seviye, matrix/algorithm doğrulama
    sprites/            Manifest tipleri
    schedule/           Dönem / çizelge / occurrence
  docs/                 Bu planlar
```

Web uygulaması açılmaz. Mevcut `mindcraft` monoreposu bağımlılık olarak bağlanmaz.

## Git remote

- `git init` bu klasörde (`/Users/mehmetdogandev/dev/mindcraft-v2`)
- `origin`: `git@github.com:mehmetdogandev/mindcraft.git` (SSH)
- İlk commit yerel kalır
- Push kullanıcıya aittir; ajan `git push` çalıştırmaz

## Süreçler

```
iOS (Expo) --HTTPS--> server :4000
                        |-- Better Auth (cookie yok; bearer)
                        |-- tRPC /api/trpc
                        |-- /api/health  /api/ready
                        |-- /api/files   (sprite PNG)
                        |-- Gemini (@google/genai)
                        |-- Postgres
                        |-- Redis (rate limit + daily plan cache + job)
                        |-- MinIO/S3
```

Yerel geliştirmede Docker yalnızca Postgres + Redis + MinIO çalıştırır. API ve Metro/Expo host makinededir.

## Yığın

| Katman | Seçim | Gerekçe |
|---|---|---|
| Mobil | Expo + EAS | TestFlight hızı; bare RN 0.84 taşınmaz |
| Navigasyon | React Navigation | Mevcut mobil kalıp |
| API | Hono + tRPC 11 + Zod | Mevcut sunucu kalıbı, sade |
| Auth | Better Auth: e-posta + Apple | TestFlight App Store kuralı |
| DB | Drizzle + Postgres | Kalıcı oyun + takvim |
| AI | `@google/genai` yalnız `server/` | PDF §25–27 |
| Dosya | S3 uyumlu MinIO | Sprite atlas |
| Kuyruk | Redis + worker (aynı server process, sonra ayrı) | Karakter üretimi |

## İstemci Gemini görmez

Mobil paket `GEMINI_API_KEY` içermez. Tüm üretim `server/ai/*` altındadır.

Prototip bunu doğru yapmıştı (`server/gemini.ts`). Mevcut web `mentor-office.tsx` içindeki `/api/gemini/mentor-chat` kalıbı **kopyalanmaz**; sohbet tRPC `mentors.chat` olur.

## API yüzeyi (hedef)

| Namespace | İş |
|---|---|
| `health.status` / HTTP `/api/health` | DB, Redis, S3, Gemini yapılandırması |
| `auth.*` | Better Auth portal |
| `onboarding.chat` / `onboarding.commit` | Gemini rehber + taslak / onay |
| `profile.get` / `profile.upsert` | Öğrenme + akademik profil |
| `terms.*` `courses.*` `meetings.*` `exceptions.*` | Takvim |
| `plan.today` / `plan.refresh` | Günlük oyun planı |
| `characters.create` / `list` / `status` | Avatar + ders hocası |
| `mentors.chat` | Sohbet + animasyon + nextAction |
| `quests.generate` / `quests.submit` | Şema + motor doğrulama + kayıt |
| `progress.get` | XP, seviye, beceriler |

## Kesinti davranışı (PDF §27)

Gemini yapılandırılmamış, ulaşılamıyor, timeout, kota veya şema hatası:

- Yeni sohbet, yeni öğretmen, yeni kişisel görev **başlamaz**
- Sahte model çıktısı gösterilmez
- Kayıtlı hesap, asset, ilerleme korunur
- UI: “Hizmet kullanılamıyor” + yeniden dene
- Kontrol hem açılışta hem istek anında

Yerel motorlar (kayıtlı quest’i tekrar oynama, çizelge görüntüleme) API ayaktaysa Gemini olmasa da okunabilir. Yeni AI oturumu açılamaz.

## Sırlar

Sunucu `.env` dışında sır yok. `.env.example` isim iskeletidir. Sohbete yazılmış Gemini anahtarı bu repoya konmaz; rotate edilmelidir.

## Render kararı

| Yüzey | Motor |
|---|---|
| Ev / kampüs | React Native View + sprite portre (2.5D) |
| Öğretmen | `SpritePlayer` (atlas kareleri) |
| Quest | Native RN motorları |
| 3D evren | MVP dışı |

## Paket sınırları

`packages/game-rules` UI import etmez. Quest sonucu sunucuda `calculateQuestXP` / `validateEnergyMatrix` / `runAlgorithmSequence` ile doğrulanır. İstemci aynı paketle anlık geri bildirim verebilir; kalıcı skor sunucu skorudur.
