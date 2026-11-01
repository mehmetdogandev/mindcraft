# P09 — Sağlamlaştırma

Şablon sürümü: 1.0  
PDF: G §32–36, H §39–40  
Bağımlılık: P08 dikey dilim

## Amaç

Gizlilik, şema güvenliği, maliyet, kesinti ve PDF test listesi kapanır. Ürün “tamamlanmış” sayılmak için §40 mobil-only yorumuyla geçer.

## Kapsam dışı

Yeni motor, 3D evren, öğretmen değiştirme, whiteboard.

## Etkilenen paketler

- `server` rate limit (Redis), job retry, log redaction
- `server/ai` schema + safety layer
- testler: `game-rules`, planner fixture, onboarding extract
- hesap silme cascade (S3 dahil)

## İş listesi

1. Rate limit: chat, generate, character job / kullanıcı / gün.
2. Gemini timeout / 429 / invalid JSON ayrı hata kodları.
3. Prompt injection: kullanıcı metni system’e birleşmez.
4. İçerik: sağlık/hukuk iddiasında “kurgu değil, doğrulat” notu.
5. Ders programı export/share yok.
6. Yaş: 13–16 için ebeveyn notu (MVP metin); 13 altı hesap açılmaz.
7. Asset lazy download, job yalnızca fail adımı retry.
8. PDF §35 senaryoları otomatik veya yazılı QA.

## API / ekran

| Tür | Ad |
|---|---|
| tRPC hataları | `GEMINI_UNAVAILABLE` `GEMINI_INVALID` `RATE_LIMITED` `JOB_FAILED` |
| Ekran | hata koduna göre dürüst kopya |

## Kabul (PDF §35 + §40, mobil)

- [ ] Yeni kayıt ve yarım kurulum dönüşü
- [ ] Tek mesajdan okul/bölüm/sınıf
- [ ] Dönem + haftalık program doğrulama
- [ ] Pazartesi ders seçimi
- [ ] İptal ve telafi
- [ ] Yeni dönemde eski ders/öğretmen arşiv
- [ ] Tarif → animasyonlu öğretmen (placeholder OK)
- [ ] Sprite QC fail hazır göstermez
- [ ] Yeniden kurulumda aynı karakter URL’si
- [ ] Gerçek mentor sohbeti
- [ ] Görev + XP kalıcı
- [ ] Anahtar yokken sahte yanıt yok

## Risk

Maliyet patlaması (görsel + chat). Kota dashboard + günlük tavan. Karakter işi en pahalı süreç; önizleme onayı P09’da açılabilir.

## Referans

- PDF §32–36, §39–40
- Prototip `safeParseJson` (fallback `{}` üretimde kullanılmaz; hata fırlat)
