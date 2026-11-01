# P01 — Auth ve tanışma

Şablon sürümü: 1.0  
PDF: B §4–7  
Bağımlılık: P00

## Amaç

Oyuncu hesap açar veya girer. Gemini rehberi rolle tanışır, taslağı saklar, kritik alanları doğrulatır. Anket yığını yoktur.

## Kapsam dışı

Dönem/ders/çizelge kalıcı kayıt (P02). Öğretmen üretimi (P03). Apple dışında Google.

## Etkilenen paketler

- `server/auth` Better Auth portal, bearer, Apple, e-posta
- `server/trpc/onboarding`
- `apps/mobile` `AuthHostScreen`, `OnboardingChatScreen`
- `learning_profile.draftJson`

## İş listesi

1. Better Auth: e-posta + şifre, doğrulama, Apple Sign-In.
2. Deep link `mindcraftv2://auth/callback`.
3. `onboarding.chat`: sözleşme 2, `draftJson` merge.
4. Bilinen alanı tekrar sorma.
5. `onboarding.commit` yalnızca `confirmations` oyuncu onayından sonra.
6. Chat başarısızsa form yedek: rol, isim, öğrenme stili (prototip `OnboardingModal`).
7. `OnboardingGate`: `onboardingComplete` false ise evrene alma (web `onboarding-gate.tsx` kalıbı; mevcut mobil bunu kaçırıyor).

## API / ekran

| Tür | Ad |
|---|---|
| HTTP | `/api/auth/portal/*` |
| tRPC | `onboarding.chat` `onboarding.getDraft` `onboarding.commit` |
| tRPC | `profile.get` |
| Ekran | `AuthHostScreen`, `OnboardingChatScreen` |

## Kabul

- Tek mesajdan okul/bölüm/sınıf ayrışır, tekrar sorulmaz.
- Uygulama öldürülüp açılınca taslak devam eder.
- Anahtar yokken sohbet başlamaz; form yedekle rol kaydı yapılabilir, AI adımları kilitli kalır.
- Apple Sign-In simülatör kısıtına takılırsa cihaz / TestFlight notu yazılır.

## Risk

Gemini aşırı çıkarım (yanlış üniversite). Çözüm: `confirmations` olmadan commit yok.

## Referans

- PDF §4–7
- Prototip `OnboardingModal.tsx`
- `mindcraft/apps/web/src/components/game/onboarding-gate.tsx`
- `mindcraft/apps/mobile/src/lib/auth/`
- `mindcraft/docs/trpc-react-native.md`
