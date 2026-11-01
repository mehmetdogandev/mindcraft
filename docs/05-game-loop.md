# 05 — Oyun döngüsü

## Çekirdek döngü

```
Açılış
  → health + auth
  → onboardingComplete değilse kurulum
  → plan.today
  → evren / kampüs (bugünün dersleri + keşif)
  → öğretmen odası
  → quest
  → geri bildirim + beceri
  → evrene dönüş
```

## 8 adımlı kayıt (PDF §7)

| Adım | UX | Kayıt | Zorunlu mu? |
|---|---|---|---|
| 1 Hesap | Apple / e-posta | `user` | evet |
| 2 Tanışma | Gemini sohbet | `learning_profile` + `draftJson` | evet (rol) |
| 3 Akademik kimlik | sohbet / form yedek | `student_profile` | yalnızca öğrenci |
| 4 Dönem | tarih + sınav/tatil | `term`, `calendar_event` | evet (öğrenci) |
| 5 Dersler | geçmiş + aktif + kişisel | `course` | en az 1 ders |
| 6 Program | gün-saat tablosu, onay | `course_meeting` | aktif akademik derslerde |
| 7 Öğretmen | ilk ders için forge | `game_character` ready | evet, 1 adet |
| 8 Başlangıç | bugüne uygun görev | `daily_plan` + `quest` | evet |

Yarım bırakılırsa `onboardingStep` + `draftJson` ile devam. Tüm derslere öğretmen şart değil.

Mevcut mobil `OnboardingScreen` yalnızca üniversite/bölüm + avatar ister — v2 bunu genişletir, form yedek olarak kalır.

## Günlük bağlam (PDF §10–14)

Sunucu sırası:

1. Kullanıcı `timezone` ile `localDate` ve weekday hesapla.
2. Aktif dönem var mı bak.
3. Meeting + exception → o günün oturumları (deterministik).
4. Yaklaşan `calendar_event`.
5. Competency + son hedefler.
6. Gemini fikir (yoksa plan üretme, hata).
7. Şema doğrula, sürümlü `daily_plan` yaz.
8. Aynı gün tekrar çağrıda cache dön.

Pencereler:

- `pre`: ders başlangıcından önce kısa hazırlık
- `post`: bitişten sonra “bugün ne işlediniz?” — cevap yoksa keşif/tekrar
- `evening`: birden fazla dersi birleştiren isteğe bağlı macera
- `explore`: ders yoksa veya dinlenme

Oyuncu erteleyebilir, başka derse geçebilir, dinlenme seçebilir. Ders saatinde dikkat dağıtan bildirim yok (P08’de sessiz pencere).

## Pazartesi kabul senaryosu (PDF §13)

Veri: 09.00–11.00 Veri Yapıları, 13.00–15.00 Ayrık Matematik.

| Saat | Beklenen |
|---|---|
| 08.00 | Veri Yapıları öğretmeni kısa bağlantı / algorithm ısınma |
| 11.30 | “Bugün derste ne gördünüz?” → “bağlı listeler” → o konuya bağlı görev |
| 12.30 | Ayrık Matematik öğretmeni pre-class (matrix / mantık) |
| 19.00 | İsteğe bağlı birleşik keşif |

Bu senaryo P06 kabul testidir.

## Evren haritası

- Aktif dersler: öğretmen portresi + bugünkü pencere etiketi
- Kişisel / realm dersleri: 6 realm rengi (prototip `REALM_NODES`)
- Tamamlanmış dersler: arşiv kanadı, silinmez

Tıklama: öğretmen yoksa forge, varsa oda.

## Öğretmen odası

1. Sprite `idle`
2. `welcomeMessage` veya son hafıza selamı
3. Sohbet → `animation` değişir
4. `start_quest` veya oyuncunun “maceraya başla”sı → QuestPlayer
5. Sonuç → `celebrate` / `confused` → XP HUD → geri

Whiteboard mount edilmez.

## Quest oynanışı

Kaynak: prototip `QuestPlayer.tsx`.

- **matrix:** düğüm aç/kapa, hedef toplam. İstemci anlık toplam gösterir; submit’te sunucu `validateEnergyMatrix`.
- **algorithm:** MOVE / TURN_LEFT / TURN_RIGHT. Sunucu `runAlgorithmSequence`.
- **dilemma:** seçim + gerekçe. Sunucu seçimi kaydeder, Gemini yorumlar.

İpucu: her ipucu `hintsUsed++`, XP cezası `rules.ts` (max 30, taban 20 XP).

## XP ve seviye

`calculateQuestXP` / `calculateLevel` / `updateSkillScores` `packages/game-rules` olur.

Unvanlar (prototip): Zihin Çırağı → Merak Yolcusu → Kavram Kâşifi → Bağlantı Ustası → Mantık Mimarı → Evren Kâşifi → Felsefe Bilgesi → Mindcraft Kozmik Üstadı.

Şu an prototip UI `quest.rewardXP` kullanıyor, `calculateQuestXP` değil. v2’de tek kaynak fonksiyonlardır. Gemini `rewardXP` önerisi yok sayılır veya tavan olarak kullanılır.

## Motivasyon (PDF §24)

Ödül: ilerleme, farklı deneme, önceki hatayı aşma. Kozmetik / rozet P07’de minimum (unvan yeter). Cezalandırıcı streak yok.
