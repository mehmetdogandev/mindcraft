# MINDCRAFT v2

Öğrencinin gerçek akademik takvimine uyum sağlayan, her ders için kendi yarattığı animasyonlu yapay zekâ öğretmenlerini barındıran, Gemini destekli günlük oyun maceraları üreten **mobil-only** öğrenme oyunu.

Bu klasör şu an **plan deposudur**. Oyun kodu, Expo init ve API henüz yok. Uygulama, aşağıdaki dokümanlar onaylandıktan sonra faz faz yazılır.

Kaynaklar:

- PDF: `../mindcraft-—-kendi-öğrenme-evrenini-i̇nşa-et/MINDCRAFT_Kapsamli_Proje_Dokumani.pdf`
- Evren prototipi: `../mindcraft-—-kendi-öğrenme-evrenini-i̇nşa-et`
- Mevcut LMS / Living Mentors: `../mindcraft`

## Ürün sınırı

- Tek repo: `apps/mobile` + `server` + `packages/*`
- Web istemcisi yok
- Hedef: iOS + TestFlight
- Gemini anahtarı yalnızca sunucu `.env` içinde durur

## Plan okuma sırası

1. [docs/00-source-map.md](docs/00-source-map.md) — PDF ↔ prototip ↔ mevcut mindcraft eşlemesi
2. [docs/01-product-vision.md](docs/01-product-vision.md) — ürün cümlesi ve sapmalar
3. [docs/02-architecture.md](docs/02-architecture.md) — yığın, klasör, API, kesinti
4. [docs/03-data-model.md](docs/03-data-model.md) — kalıcı varlıklar
5. [docs/04-gemini-contracts.md](docs/04-gemini-contracts.md) — sunucu JSON sözleşmeleri
6. [docs/05-game-loop.md](docs/05-game-loop.md) — kayıt, günlük döngü, XP
7. [docs/06-sprite-pipeline.md](docs/06-sprite-pipeline.md) — karakter üretim hattı
8. [docs/07-ios-testflight.md](docs/07-ios-testflight.md) — EAS ve yayın

Sonra uygulama fazları:

| Faz | Dosya | Çıktı |
|---|---|---|
| P00 | [docs/plans/P00-repo-bootstrap.md](docs/plans/P00-repo-bootstrap.md) | Expo + server monorepo |
| P01 | [docs/plans/P01-auth-onboarding.md](docs/plans/P01-auth-onboarding.md) | Hesap + Gemini tanışma |
| P02 | [docs/plans/P02-academic-calendar.md](docs/plans/P02-academic-calendar.md) | Dönem, ders, çizelge |
| P03 | [docs/plans/P03-character-factory.md](docs/plans/P03-character-factory.md) | Öğretmen + sprite |
| P04 | [docs/plans/P04-mentor-runtime.md](docs/plans/P04-mentor-runtime.md) | Sohbet + hafıza |
| P05 | [docs/plans/P05-quest-engine.md](docs/plans/P05-quest-engine.md) | 3 mini oyun |
| P06 | [docs/plans/P06-daily-planner.md](docs/plans/P06-daily-planner.md) | Günlük öneri |
| P07 | [docs/plans/P07-skills-progress.md](docs/plans/P07-skills-progress.md) | XP ve beceri |
| P08 | [docs/plans/P08-ios-release.md](docs/plans/P08-ios-release.md) | TestFlight |
| P09 | [docs/plans/P09-hardening.md](docs/plans/P09-hardening.md) | Güvenlik, test, maliyet |

## MVP kırmızı çizgi

Gerçek kayıt, bir dönem, bugünün dersini doğru seçen plan, bir öğretmen + sprite, 2–3 oynanabilir motor, sunucuda ilerleme, API yokken sahte Gemini yok.

İlk sürümde yok: web, öğretmen değiştirme UI, whiteboard, ders kaydı, sınırsız motor, cezalandırıcı streak.

## Git

- Bu klasör kendi git deposudur (`git init`).
- Remote SSH: `git@github.com:mehmetdogandev/mindcraft.git` (`origin`)
- Commit yerel atılır.
- **Push ajan tarafından yapılmaz.** `git push -u origin HEAD` sen çalıştırırsın.

## Sırlar

`.env.example` yalnızca isim iskeletidir. Gerçek `GEMINI_API_KEY` sohbet veya git geçmişine yazılmaz.
