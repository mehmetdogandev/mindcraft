# 01 — Ürün vizyonu

## Ürün cümlesi

MINDCRAFT v2, öğrencinin gerçek yaşam ritmine bağlanan kişisel bir öğrenme oyunudur. Oyuncu her ders için bir kez öğretmen yaratır; öğretmen onu tanır; günün bağlamına göre oynanabilir görev üretir; ilerleme sunucuda kalır.

Aynı dersi alan iki öğrencinin hocası, anlatımı ve oyun teması farklı olabilir. Bilimsel doğruluk ve oyun kuralları aynıdır.

## Ne oyun, ne LMS değil

Oyun:

- Günlük önerilen macera
- Ders odasında yaşayan öğretmen (sprite + sohbet)
- 2–3 güvenilir mini oyun
- Beceri haritası ve “hata yaparak öğrenme” XP’si

LMS değil (ilk sürümde yok):

- Not defteri panelleri
- Yoklama kanıtı
- Ders kaydı / kamera
- Whiteboard varsayılan UI
- Kütüphane paylaşımı
- Admin panel

Mevcut `mindcraft` mobil uygulaması bir çalışma kabuğudur. v2 onu taşımaz; takvim ve karakter kalıplarını oyun olarak yeniden kurar.

## Oyuncu vaadi

Oyuncu uygulamayı açar, bugünün derslerini ve önerilen maceraları görür, bir ders seçer, öğretmeniyle konuşur, görevi oynar, geri bildirim alır, beceri haritasında ilerler. Öğretmen sonraki görevi hatalara, ipuçlarına ve kazanımlara göre uyarlar.

## İlkeler (PDF §3 + prototip `rules.ts`)

1. Bilgi, oyunu ilerleten araçtır; duvar metni değildir.
2. Hata ceza değil, düşünme ipucudur. Yanlış çözüm de XP ve resilience üretir.
3. İlerleme yalnızca puan değil, farklı bağlamda beceri kullanmaktır.
4. Cezalandırıcı günlük seri yoktur. Streak bilgi amaçlıdır, kırma cezası yoktur.
5. Takvim öğrenmeyi düzenler; gerçek dersi aksatmayı teşvik edilemez.
6. Ders saatinin geçmiş olması katılım veya konunun işlendiği anlamına gelmez.
7. Gemini fikir üretir; sunucu doğrular. Sahte “AI çalışıyor” durumu yoktur.

## Hedef kitle

Birincil: akademik takvimi olan üniversite / lise öğrencisi.

Ayrıca: mezun, çalışan, bağımsız öğrenen. Üniversite ve bölüm herkese zorunlu değildir. Öğrenci değilse hedefler, uygun saatler ve konularla eşdeğer profil kurulur.

## Mobil-only sapmalar (PDF’den bilinçli fark)

| PDF | v2 |
|---|---|
| Web + mobil, aynı ilerleme iki cihazda | Tek iOS istemci + sunucu |
| Aşama 6: web/mobil senkron | P08: TestFlight tek istemci |
| Sprite web ve mobilde aynı oynatıcı | Yalnızca RN SpritePlayer |
| Kabul: “diğer cihazda görünür” | “yeniden açılışta / yeniden kurulumda sunucudan gelir” |

## Living Mentors kuralları (mevcut tasarım dokümanı)

- Sabit hoca kadrosu yok. Sabit olan üretim sistemi, öğrenme hedefleri ve sprite oynatıcıdır.
- Ders başına bir öğretmen. MVP’de yeniden üretim / değiştirme UI yok.
- Üç yol: anlat, seç (insansı / yaratık / robot + kişilik + tarz), sürpriz.
- Kişilik kaliteyi bozmaz. Komik hoca yanlış anlatamaz. Sert hoca aşağılayamaz.
- İki hafıza: öğrenci (tüm hocalar okur) ve öğretmen (yalnız o hoca). Ham transkript sınırsız modele gitmez.
- `nextAction`: `wait_for_student` \| `start_quest`. `open_whiteboard` şemada durur, UI yok.

## Evren / kampüs

İki kaynak birleştirilir:

- Prototip realm’leri (`math`, `code`, `science`, `history`, `language`, `finance`) keşif ve kişisel dersler için.
- Oyuncunun gerçek dersleri kampüs binalarıdır.

MVP ev: 2D/2.5D “bugünün evreni” — bugünkü dersler, önerilen görevler, öğretmen portreleri. Three.js evren vitrin olarak ertelenir; iOS kararlılığı ve TestFlight hızı önceliklidir.

## Başarı tanımı

Ürün, gösterişli ekrandan değil şu zincirin gerçek çalışmasından başarılı sayılır:

kayıt → Gemini tanışma → dönem/ders/çizelge → bugünün dersi → öğretmen sprite → gerçek sohbet → oynanabilir görev → kayıtlı beceri → API kesintisinde dürüst duruş.
