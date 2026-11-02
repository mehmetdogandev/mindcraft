# MINDCRAFT v2

Öğrencinin gerçek akademik takvimine uyum sağlayan, her ders için öğrencinin tarifinden modüler katmanlarla (`AcademicNPC`) kendi yarattığı öğretmenleri barındıran, tamamen **mobil cihaz üzerinde (Bare React Native + On-Device DB)** çalışan öğrenme oyunu.

## Mimari

- **Saf React Native CLI (Expo Yok, Sunucu Yok, Docker Yok):** Expo, harici sunucu (`:4000`), Docker, PostgreSQL veya Redis kullanılmaz. Doğrudan React Native CLI ve Metro ile çalışır.
- **Cihaz İçi Veritabanı (On-Device DB):** Tüm kullanıcı, dönem, ders programı, öğretmen profilleri, sohbet geçmişi ve XP/beceri ilerlemesi doğrudan kullanıcının telefonunda (`apps/mobile/src/backend/db.ts`) saklanır.
- **Modüler NPC Öğretmen Tasarımı (`AcademicNPC`):** Öğrenci hocanın nasıl göründüğünü tarif eder; uygulama dışarıdan resim üretmek yerine `apps/mobile/assets/npc/` altındaki modüler katmanları (`face`, `hair`, `hairStyle`, `glasses`, `outfit`) birleştirerek hocayı anında oluşturur.

## Çalıştırma (Android Emülatör & React Native)

```bash
pnpm install
npm run emulator              # Android emülatörü başlatır ve adb reverse (:8081) bağlar
npm run android:emulator      # Android emülatör için native build alır ve kurar (react-native run-android)
npm run start                 # Metro'yu ayağa kaldırır ve uygulamayı emülatörde açar (react-native start)
```

Test ve Tip Kontrolü:

```bash
pnpm test
pnpm typecheck
```
