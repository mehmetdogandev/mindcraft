# 00 — Kaynak haritası

Bu dosya PDF maddelerini, evren prototipini ve mevcut Mindcraft LMS’ini `mindcraft-v2` kararlarına bağlar. Uygulama yazılırken buradaki yollar referans alınır; kod kopyalanmaz, kalıp taşınır.

Kaynak kökleri:

- PDF: `/Users/mehmetdogandev/dev/mindcraft-—-kendi-öğrenme-evrenini-i̇nşa-et/MINDCRAFT_Kapsamli_Proje_Dokumani.pdf`
- Prototip: `/Users/mehmetdogandev/dev/mindcraft-—-kendi-öğrenme-evrenini-i̇nşa-et`
- Mevcut ürün: `/Users/mehmetdogandev/dev/mindcraft`

## A. Ürün ve oyun vizyonu (PDF §1–3)

| PDF | Prototip | Mevcut mindcraft | v2 kararı |
|---|---|---|---|
| §1 kişisel öğrenme oyunu, akademik takvim birincil | Web HUD + 6 realm | LMS + “Living Mentors” kampüs metaforu | Mobil oyun; takvim bağlam, LMS değil |
| §2 aç → günlük macera → öğretmen → görev → beceri | `App.tsx` `title/universe/quest` | Kampüs kartı → `CourseDetail` LMS | PDF döngüsü; evren haritası + öğretmen odası + quest |
| §3 hata cezası yok, seri baskısı yok | `rules.ts` hata = XP/resilience | Takvim/attendance LMS | Prototip XP felsefesi + PDF “cezalandırıcı streak yok” |

## B. İlk giriş ve akademik profil (PDF §4–7)

| PDF | Prototip | Mevcut mindcraft | v2 kararı |
|---|---|---|---|
| §4 Gemini tanışma rehberi, taslak korunur | `OnboardingModal.tsx` var, **hiç açılmıyor** | `OnboardingScreen.tsx` form; web `onboarding-gate.tsx` | Gemini sohbet + taslak; form yedek |
| §5 öğrenci / mezun / çalışan / bağımsız | Modal’da rol + ilgi | Üniversite + bölüm zorunlu | PDF uyarlanabilir sorular |
| §6 geçmiş / aktif ders, kişisel alan eklenebilir | Realm listesi sabit | `progressStatus` `current` / `completed` | Mevcut ders modeli + kişisel ders |
| §7 8 adımlı kayıt, tek öğretmen yeter | Atlanmış | Avatar + profil 2 adım | 8 adım, 1 öğretmen ile oyuna gir |

## C. Akademik takvim ve günlük oyun (PDF §8–14)

| PDF | Prototip | Mevcut mindcraft | v2 kararı |
|---|---|---|---|
| §8 dönem tarihleri, sınav, tatil | Yok | `packages/schedule` `ScheduleTerm` | Schedule tipleri + sınav/tatil varlıkları |
| §9 haftalık gün/saat, çakışma, onay | Yok | `ScheduleMeeting`, `clash.ts` | Mevcut çizelge + kullanıcı onayı |
| §10 günlük bağlam → Gemini fikir → sunucu doğrular | Yok | Bildirim planı `lessonAlerts.ts` | Yeni daily planner servisi |
| §11 ders öncesi / sonrası / akşam | Yok | Ders saati LMS oturumu | Üç pencere, katılım varsayılmaz |
| §12 istisna + dönem arşivi | Yok | Session `cancelled` | Ayrı exception tablosu |
| §13 pazartesi senaryosu | Sabit math/code/history quest | Yok | Kabul senaryosu (P06) |
| §14 erteleme, dinlenme, kısa/orta/uzun | Yok | Yok | Plan önerir, zorlamaz |

## D. Öğretmenler ve sprite (PDF §15–20)

| PDF | Prototip | Mevcut mindcraft | v2 kararı |
|---|---|---|---|
| §15 ders başı öğretmen, 3 yol | `TeacherCreationStudio.tsx` serbest tarif | `character-forge.tsx` anlat / seç / sürpriz | Üç yol + ders bağlama |
| §16 iş kuyruğu, onay, atlas, hazır bayrağı | Senkron `generateTeacher` | `CharacterStatus` generating/ready/failed | Kuyruk + status; hazır olmadan oynatma yok |
| §17 sprite sheet standardı, runtime iskelet yok | SVG `TeacherStage.tsx` | `packages/sprites` 256×256 manifest | Ortak manifest; SVG yalnızca placeholder |
| §18 idle/talk/think/happy/confused/celebrate | Emotion seti benzer, `surprise` ekstra | `SPRITE_ANIMATIONS` + `walk` | PDF 6 durum MVP; `walk` opsiyonel |
| §19 gövde sınıfı, QC fail fallback | Enum archetype | `skeletonHint` humanoid/creature/robot | İskelet sınıfı + sade fallback |
| §20 Gemini emotion → desteklenen animasyon | `chatWithTeacher` emotion | `MentorChatResponse.animation` | Birleşik sözleşme, sunucu map eder |

## E. Oyun motoru ve öğrenme (PDF §21–24)

| PDF | Prototip | Mevcut mindcraft | v2 kararı |
|---|---|---|---|
| §21 sabit motor + Gemini içerik | `matrix` `dilemma` `algorithm` UI; `dialogue` `concept` şemada | `system-balancer-game.tsx`, `logic-grid-game.tsx`, `GameWorldEngine` | 3 prototip motor; diğerleri sonra |
| §22 hedef + deterministik doğrulama | `validateEnergyMatrix`, `runAlgorithmSequence`; evaluate LLM | `start_quest` tipi var, motor yok | Motor doğrular; Gemini yorumlar |
| §23 iki hafıza + beceri haritası | `SkillScores` client state; `/api/profile` kullanılmıyor | `student_competency` + `mentor_memory` tasarımı | Kalıcı iki hafıza + 6 eksen |
| §24 ödül = ilerleme/hata aşma | `calculateQuestXP` | Puan ekonomisi yok | `rules.ts` taşınır, sunucu tek kaynak |

## F. Mimari ve Gemini (PDF §25–31)

| PDF | Prototip | Mevcut mindcraft | v2 kararı |
|---|---|---|---|
| §25 istemci Gemini anahtarı görmez | Express `GEMINI_API_KEY` doğru; web yok | Sunucu AI + web `/api/gemini/mentor-chat` sapması | Tüm AI `server/` |
| §26 bileşenler | Tek süreç Vite+Express | Hono/tRPC/Drizzle/S3 | Hono + tRPC + Postgres + MinIO + kuyruk |
| §27 API yoksa sahte çıktı yok | Status endpoint; chat hata mesajı | `ServerRequiredGate` | Gate + istek anı kontrolü; fallback LLM yok |
| §28 yetki → bağlam → Gemini → şema → kayıt | In-memory | tRPC portal | tRPC prosedürleri |
| §29 günlük plan cache | Yok | Yok | Gün + kullanıcı anahtarı |
| §30 ortak manifest, farklı render | Web Three.js + SVG | Web + RN SpritePlayer | Yalnızca RN SpritePlayer |
| §31 varlık listesi | In-memory profile | Akademik + kısmi game client API | PDF §31 tam model |

## G–H. Kalite, MVP, kabul (PDF §32–41)

| PDF | v2 yansıması |
|---|---|
| §32 gizlilik, yaş, konum sızıntısı | P09; ders programı paylaşılmaz |
| §33 şema + kişilik guardrail | P04 / P09 |
| §34 maliyet, kuyruk, lazy asset | P03 / P09 |
| §35 uçtan uca test listesi | P09 checklist |
| §36 erişilebilirlik | Metin + animasyon azaltma |
| §37 MVP çekirdek | README kırmızı çizgi |
| §38 7 aşama | P00–P09 (web senkron P08’de iOS yayın) |
| §39 sprite / şema / maliyet / takvim riski | Her faz “risk” bölümü |
| §40 kabul | Faz kabul kriterleri + P09 e2e |
| §41 nihai tanım | Mobil-only sapmayla `01-product-vision.md` |

## Mevcut mindcraft — alınacak dosyalar

| Dosya | Neden |
|---|---|
| `docs/mindcraft-game-design.md` | Living Mentors kuralları, factory, runtime JSON |
| `packages/sprites/src/index.ts` | Manifest, animasyon, `MentorChatResponse` |
| `packages/schedule/src/types.ts` | Term, course, meeting, weekday |
| `apps/mobile/src/lib/schedule/clash.ts` | Saat çakışması |
| `apps/mobile/src/lib/auth/` | Bearer + Better Auth kalıbı |
| `apps/mobile/src/lib/api/portal.ts` | `student` / `characters` / `mentors.chat` isimleri |
| `apps/mobile/src/screens/CampusScreen.tsx` | Ders = bina, avatar sprite |
| `apps/mobile/src/screens/OnboardingScreen.tsx` | Akademik kimlik adımları |
| `apps/mobile/src/components/game/SpritePlayer.tsx` | RN sprite oynatıcı |
| `apps/mobile/src/components/game/ServerRequiredGate.tsx` | API yok ekranı |
| `apps/web/src/components/game/character-forge.tsx` | Anlat / seç / sürpriz |
| `apps/web/src/components/game/mentor-office.tsx` | Oda + sohbet + `nextAction` niyeti |
| `apps/web/src/components/game/onboarding-gate.tsx` | Tamamlanmamış kurulum yönlendirmesi |
| `server/auth/portal-database.ts` | Portal Better Auth |
| `docs/trpc-react-native.md` | Mobil tRPC / deep link |

## Mevcut mindcraft — alınmayacak

- `apps/web` pazarlama + panel + admin
- Not panelleri, ders kaydı, Excalidraw `board-host`
- Bare React Native 0.84 kabuğu ve native workspace
- 98 locale i18n (MVP: `tr` + `en`)
- Web `/api/gemini/*` doğrudan route’ları

## Prototip — alınacak dosyalar

| Dosya | Neden |
|---|---|
| `src/game/rules.ts` | XP, seviye unvanları, beceri, matrix/algorithm doğrulama |
| `src/game/rules.test.ts` | Deterministik test iskeleti |
| `server/gemini.ts` | Öğretmen / sohbet / quest / evaluate şemaları |
| `src/components/QuestPlayer.tsx` | 3 motor UI davranışı |
| `src/components/TeacherCreationStudio.tsx` | Tarif + önizleme + test chat |
| `src/components/TeacherChatDrawer.tsx` | Sokratik sohbet UX |
| `src/components/SkillMapModal.tsx` | 6 eksen radar |
| `src/components/Universe3D.tsx` | Realm kimlikleri (math/code/science/history/language/finance) |
| `src/components/OnboardingModal.tsx` | Rol + ilgi + öğrenme stili alanları |
| `src/utils/audio.ts` | İnce ses geri bildirimi (opsiyonel) |

## Prototip — alınmayacak

- Express + Vite tek süreç
- `inMemoryProfile` ve kullanılmayan `/api/profile`
- Title ekranı demo XP (340 vs.)
- Three.js evren runtime’ı (MVP’de 2D/2.5D harita; 3D vitrin ayrı karar)
- `dialogue` / `concept` oynatıcıları
