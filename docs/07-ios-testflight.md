# 07 — iOS ve TestFlight

## Karar

- Expo + EAS Build
- iOS first, Android sonra
- Bundle id önerisi: `com.aksiyonsoft.mindcraft.v2` (mevcut `com.aksiyonsoft.mindcraft` ile çakışmasın)
- Deep link: `mindcraftv2://auth/callback`

Kullanıcı native archive’ı Xcode ile de alabilir; EAS profili asıl yol olarak yazılır.

## EAS profilleri (hedef)

| Profil | Kullanım |
|---|---|
| `development` | Dev client, simülatör / cihaz |
| `preview` | TestFlight internal |
| `production` | App Store (sonra) |

`eas.json` P00/P08’de oluşur. Bu planda yalnızca gereksinimler vardır.

## Apple zorunlulukları

- Sign in with Apple (e-posta/şifre varsa da)
- Gizlilik metni: okul, ders programı, öğrenme performansı neden toplanır
- Takvim / konum izni istenmez. Ders programı kullanıcı beyanıdır; cihaz takvimine yazılmaz (MVP)
- Hesap silme yolu (App Store): Ayarlar → hesabı sil (P09)

## Ağ

TestFlight cihazı `localhost` göremez. `API_PUBLIC_URL` HTTPS public API olmak zorundadır.

Açılış: `ServerRequiredGate` eşdeğeri. Health fail → oyun yok, dürüst ekran.

Gemini fail (API ayakta, anahtar/kota yok) → kayıtlı kampüs görülebilir, yeni AI işi kapalı.

## Sessiz saat

PDF §14: ders oturumu sırasında dikkat dağıtan bildirim yok. Notifee / Expo Notifications P08’de opsiyonel; varsayılan kapalı.

## TestFlight checklist

- [ ] Apple Sign-In gerçek cihaz
- [ ] E-posta kayıt + oturum yenileme
- [ ] Deep link callback
- [ ] Health down ekranı
- [ ] Gemini down ekranı (sahte sohbet yok)
- [ ] Onboarding taslağı öldürüp açınca devam
- [ ] Bir öğretmen sprite idle/talk
- [ ] Bir quest submit + XP kalıcı
- [ ] Kill + reopen: aynı öğretmen ve XP
- [ ] Küçük ekran (iPhone SE) dokunma alanları
- [ ] Reduce Motion / animasyon azaltma anahtarı

## Mevcut mobil yayın dosyaları

Referans (kopyalama, uyarlama):

- `mindcraft/apps/mobile/docs/app-review-information.md`
- `mindcraft/apps/mobile/docs/aksiyonsoft-publish.md`

v2 yeni bundle ve yeni gizlilik metni kullanır.
