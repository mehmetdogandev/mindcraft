# P08 — iOS yayın (TestFlight)

Şablon sürümü: 1.0  
PDF: H (platform aşaması, web senkron yerine tek istemci)  
Bağımlılık: P00–P07 dikey dilim çalışır

## Amaç

EAS ile TestFlight’a çıkan, gerçek cihazda kayıt→görev zincirini oynatan iOS build.

## Kapsam dışı

App Store review gönderimi, Android, widget, push kampanyası.

## Etkilenen paketler

- `apps/mobile` `app.json` / `app.config.ts`, `eas.json`
- `server` public CORS / trusted origins `mindcraftv2://`
- gizlilik ve silme ekranları

## İş listesi

1. Bundle `com.aksiyonsoft.mindcraft.v2`, ikon, splash (prototip logo asset’leri kullanılabilir).
2. EAS `preview` profili, Apple team.
3. Sign in with Apple production client.
4. `API_PUBLIC_URL` HTTPS.
5. `ServiceUnavailableScreen` + Gemini-kapalı banner.
6. Reduce Motion / “animasyonu azalt”.
7. Hesap silme isteği (kuyruk, P09 tamamlar).
8. TestFlight checklist (`07-ios-testflight.md`) koşulur.

## API / ekran

| Tür | Ad |
|---|---|
| Ekran | `LegalScreen`, `AccountDeletionScreen` |
| Config | EAS secrets: API url (Gemini değil) |

## Kabul

- TestFlight install → Apple giriş → bir öğretmen → bir quest → kill/reopen aynı XP.
- API kesik: sahte sohbet yok.
- Review notları: demo hesap + “AI için sunucu anahtarı gerekir”.

## Risk

Cihazın localhost’a gitmesi. Preview build’de prod-like API şart.

## Referans

- `docs/07-ios-testflight.md`
- `mindcraft/apps/mobile/docs/app-review-information.md`
- `mindcraft/apps/mobile/src/lib/config/env.ts` (web origin varsayımları silinir)
