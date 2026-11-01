# 06 — Sprite üretim hattı

PDF §16–19 ve `docs/mindcraft-game-design.md` Character Factory. Prototip `TeacherStage` SVG’si yalnızca **placeholder** kaynağıdır; nihai oynatma sprite sheet’tir.

## Sanat standardı

- Modern 2D cartoon, şeffaf zemin
- Kare: 256×256 (`SPRITE_FRAME`)
- Atlas + `manifest.json`
- Rive / Spine / Lottie yok
- Görünüş özgür, iskelet kontrollü: `humanoid` | `creature` | `robot`

## Animasyonlar (MVP)

| Durum | Davranış | Minimum |
|---|---|---|
| `idle` | bekler | kesintisiz döngü |
| `talk` | diyalog | konuşma hareketi |
| `think` | değerlendirme | düşünme |
| `happy` | olumlu | kısa tepki |
| `confused` | yanlış anlama / keşif | destekleyici |
| `celebrate` | görev bitişi | loop: false |

`walk` mevcut sprites paketinde var; MVP’de zorunlu değil. Üretilirse manifest’e eklenir.

## Durum makinesi (`character_job`)

```
queued
  → profile          Gemini JSON (sözleşme 3)
  → preview          referans PNG veya placeholder SVG→PNG
  → user_confirm     (opsiyonel MVP: otomatik onay + sonra yeniden dene)
  → frames           idle/talk/think/happy/confused/celebrate
  → atlas            hizala, şeffaflık, QC
  → ready            S3 + manifest + status=ready
  → failed           errorMessage, yarım karakter yok
```

`status=ready` olmadan oyun karakteri oynatılmaz. `generating` iken oda iskelet + ilerleme gösterir.

## QC (PDF §18)

Red: kareler arası zıplama, yanlış hizalama, kayıp/fazla uzuv, arka plan kalıntısı, saçak, bozuk alpha. Manifest’te frame size, count, fps, loop, atlas yerleşimi, asset version zorunlu.

Fail politikası (mevcut tasarım):

1. Hatalı kareleri yeniden üret
2. Sade `idle` + `talk` setine düş
3. O da fail ise `failed` — hazır gösterme

## Gemini görsel yoksa

PDF ve mevcut tasarım: programatik Modern 2D placeholder sheet (SVG → PNG, `sharp`). Anahtar yoksa **yeni karakter işi başlamaz** (PDF §27). Anahtar var, image modeli yok/fail: placeholder sheet + `profile` JSON ile `ready` olunabilir; `artSource: "placeholder"` işaretlenir.

Prototip SVG parçaları (`archetype`, renk, accessory) placeholder üreticisine taşınır.

## SpritePlayer

Mevcut `apps/mobile/src/components/game/SpritePlayer.tsx` ve web `sprite-player.tsx` mantığı tek pakete çıkarılır. Expo Image veya RN Image + frame crop.

Aynı `SpriteSheetManifest`:

```ts
{
  characterId,
  frameWidth: 256,
  frameHeight: 256,
  animations: {
    idle: { file, url, frames, fps, loop }
  }
}
```

Karakter bir kez üretilir; istemci yeniden çizmez. Açılışta tüm öğretmenler indirilmez; evrendeki görünenler + açık oda öncelikli (PDF §34).

## Ders kuralı

Mentor `courseId` ile unique. Avatar kullanıcı başına bir. Yeniden üretim MVP dışı; `failed` işi yeniden kuyruğa alınabilir — bu değiştirme değildir.
