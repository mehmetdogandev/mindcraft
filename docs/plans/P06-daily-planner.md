# P06 — Günlük planlayıcı

Şablon sürümü: 1.0  
PDF: C §10–14, F §29  
Bağımlılık: P02, P05

## Amaç

Açılışta / gün değişince / program güncellenince bugünün önerileri üretilir. Takvim deterministiktir; Gemini yalnızca fikir verir.

## Kapsam dışı

Bildirim spam. Zorunlu günlük görev. Konu ilerlemesini takvimden tahmin.

## Etkilenen paketler

- `server/planner/context.ts` — timezone, occurrence, exception
- `server/ai/daily-ideas.ts`
- `daily_plan` tablosu
- `apps/mobile` `HomeUniverseScreen` (kampüs / bugün)

## İş listesi

1. `plan.today`: cache `userId+localDate`.
2. Context JSON (sözleşme 5) → Gemini items → courseId whitelist.
3. `pre` / `post` / `evening` / `explore` satırları.
4. Post-class: öğretmen sorusu “bugün ne işlediniz?”; cevap `topic` olarak `quests.generate`.
5. Ders yoksa yalnızca explore / tekrar.
6. `plan.refresh` oyuncu isteğiyle yeni varyasyon.
7. Program değişince ilgili satırlar `stale`.
8. Evren UI: ders kartı + pencere etiketi + “ertele” / “dinlen”.

## API / ekran

| Tür | Ad |
|---|---|
| tRPC | `plan.today` `plan.refresh` `plan.defer` |
| tRPC | `plan.reportTopic` (post-class beyan) |
| Ekran | `HomeUniverseScreen`, `RestDaySheet` |

## Kabul

- PDF §13 pazartesi senaryosu fixture ile geçer.
- Aynı gün ikinci `plan.today` yeni Gemini çağrısı yapmaz (refresh hariç).
- İptal edilmiş 09.00 dersi o gün pre önermez.
- Oyuncu defer edebilir; ceza yok.

## Risk

Yanlış timezone. `learning_profile.timezone` zorunlu; cihaz `Intl` ilk değer, kullanıcı onaylar.

## Referans

- PDF §10–14, §29
- `mindcraft/apps/mobile/src/screens/CampusScreen.tsx` (kart grid, LMS tıklaması yerine oda)
- `mindcraft/packages/schedule`
