# 04 — Gemini sözleşmeleri

Tüm çağrılar `server/ai/*` içindedir. Model adı uygulama fazında tek sabitte tutulur (prototip `gemini-3.8-flash`; yoksa `gemini-2.0-flash` fallback yapılandırması). İstemci model adı görmez.

Ortak kurallar:

- `responseMimeType: application/json` + Zod doğrulama
- Markdown fence strip (`safeParseJson` kalıbı)
- Şema fail → kullanıcıya hata, sahte doldurma yok (prototip default matrix **kopyalanmaz**)
- Kullanıcı / model metni sistem komutu sayılmaz
- Pedagojik system prompt kişilikten ayrıdır

## 1. Health ping

Amaç: yapılandırma ve ulaşılabilirlik. İçerik üretmez.

Girdi: sabit kısa ping. Çıktı: `{ ok, configured, latencyMs?, message }`.

`configured: false` iken diğer sözleşmeler çağrılmaz.

## 2. Tanışma rehberi (`onboarding.chat`)

PDF §4–5. Anket yığını değil, doğal dil.

**İstek**

```json
{
  "draft": { "learnerRole": null, "schoolName": null },
  "message": "Amasya Üniversitesinde ikinci sınıf bilgisayar mühendisliği öğrencisiyim, güz dönemindeyim",
  "knownFields": ["schoolName", "department", "currentYear"]
}
```

**Yanıt**

```json
{
  "reply": "Güz döneminin başlangıç ve bitiş tarihlerini biliyor musun?",
  "extracted": {
    "learnerRole": "student",
    "schoolName": "Amasya Üniversitesi",
    "department": "Bilgisayar Mühendisliği",
    "currentYear": 2,
    "termSeason": "fall"
  },
  "missingFields": ["termStart", "termEnd"],
  "confirmations": [
    "Okul: Amasya Üniversitesi",
    "Bölüm: Bilgisayar Mühendisliği",
    "Sınıf: 2 / Güz"
  ],
  "readyToCommit": false
}
```

Kurallar: bilinen alanı tekrar sorma. Kaydetmeden önce kritik alanları doğrulat. `draftJson` her turda birleşir.

## 3. Öğretmen profili (`characters.create`)

Prototip `generateTeacher` + mevcut forge üç yol.

**İstek:** `{ courseId, method: "describe"|"select"|"surprise", prompt?, skeletonHint?, personality?, teachingStyle? }`

**Yanıt (saklanan profil)**

```json
{
  "name": "Ignis Arşimetus",
  "title": "Geometri ve Mantık Ejderhası",
  "personality": "Esprili, merak aşılayan",
  "teachingStyle": "Sokratik ve görsel",
  "catchphrase": "Yanlış bir hipotez, doğruya giden en parlak ışıktır.",
  "backstory": "…",
  "skeletonHint": "creature",
  "appearance": {
    "archetype": "dragon",
    "primaryColor": "#8c31ff",
    "secondaryColor": "#06b6d4",
    "accentColor": "#fbbf24",
    "headFeature": "horns",
    "eyeShape": "sparkle",
    "clothing": "cloak",
    "accessory": "magic_wand"
  },
  "welcomeMessage": "…"
}
```

Görsel üretim ayrı iştir (`06-sprite-pipeline.md`). Bu sözleşme yalnızca JSON profil üretir.

## 4. Mentor sohbet (`mentors.chat`)

Mevcut `MentorChatResponse` ile prototip `chatWithTeacher` birleşir.

**İstek bağlamı (sunucu toplar, istemci göndermez):** öğretmen profili, ders adı, öğrenme hedefleri, `student_memory` özeti, `mentor_memory` özeti, son 6 tur, günlük pencere.

**Yanıt**

```json
{
  "message": "Bağlı listede next işaretini kim tutuyor?",
  "emotion": "curious",
  "animation": "think",
  "nextAction": "wait_for_student",
  "learningObjective": "linked_list_pointers",
  "socraticHint": "İlk düğümü kaybedersen zincirin geri kalanını nasıl bulursun?"
}
```

`animation` yalnızca `idle|talk|think|happy|confused|celebrate` (ve opsiyonel `walk`). Prototip `surprise` → `happy`, `confuse` → `confused`.

`nextAction`:

- `wait_for_student` — konuşmaya devam
- `start_quest` — sunucu `quests.generate` tetikleyebilir veya istemciye “görev öner” döner
- `open_whiteboard` — kabul edilir, istemci yok sayar (MVP)

Guardrail: aşağılama yok, yanlış bilimsel iddia yok, cevabı düz vermeme (Sokratik).

## 5. Günlük plan fikirleri (`plan.today`)

PDF §10, §29. Gemini **fikir** üretir; occurrence hesabı deterministik sunucudadır.

**Sunucunun Gemini’ye verdiği bağlam**

```json
{
  "localDate": "2026-11-02",
  "weekday": 1,
  "timezone": "Europe/Istanbul",
  "termActive": true,
  "sessions": [
    { "courseId": "…", "name": "Veri Yapıları", "start": "09:00", "end": "11:00", "window": "pre" }
  ],
  "upcomingEvents": [],
  "competencySummary": { "logic": 72, "resilience": 78 },
  "recentObjectives": ["linked_lists"]
}
```

**Model çıktısı (doğrulanır)**

```json
{
  "items": [
    {
      "courseId": "…",
      "window": "pre",
      "title": "Bağlantı ısınması",
      "story": "Vagonlar kopmuş…",
      "suggestedType": "algorithm",
      "duration": "short",
      "topic": "bağlı listeler"
    }
  ]
}
```

`courseId` o günün hesaplanmış derslerinden değilse satır düşer. Ders yoksa yalnızca `explore` satırına izin.

## 6. Görev üretimi (`quests.generate`)

Prototip `generateDynamicQuest`, MVP tipleri: `matrix` | `dilemma` | `algorithm`.

Ortak alanlar: `title`, `storyIntro`, `difficulty`, `learningOutcomes[]`, `step`.

**matrix payload**

```json
{
  "targetValue": 24,
  "nodes": [
    { "id": "1", "label": "Birinci hat", "value": 10 },
    { "id": "2", "label": "Yardımcı akım", "value": 8 }
  ]
}
```

Sunucu: sayılar sonlu, target makul aralık, node sayısı 3–8.

**algorithm payload**

```json
{
  "gridWidth": 4,
  "gridHeight": 4,
  "start": { "x": 0, "y": 3, "dir": "E" },
  "target": { "x": 3, "y": 0 },
  "obstacles": [{ "x": 1, "y": 1 }]
}
```

Sunucu: grid 3–8, start/target sınır içi, obstacle start/target değil.

**dilemma payload**

```json
{
  "scenario": "…",
  "choices": [
    { "id": "a", "label": "…", "consequence": "…" },
    { "id": "b", "label": "…", "consequence": "…" }
  ]
}
```

En az 2 seçenek. “Doğru” tek seçenek dayatılmaz; evaluate açıklama kalitesine bakar.

`dialogue` / `concept` üretilirse sunucu reddeder veya `matrix`e zorlamaz — hata döner, istemci başka tip ister.

## 7. Değerlendirme (`quests.submit`)

İki katman:

1. **Motor (kaynak):** matrix toplamı, algorithm path. `packages/game-rules`.
2. **Gemini (yorum):** `critique`, `praise`, `nextConcept`, `explanationQualityScore` 0–100.

Gemini `isCorrect` değerini matrix/algorithm için **ezemez**. Dilemma’da motor “doğru” demez; Gemini pedagojik yeterliliği önerir, sunucu XP’yi `calculateQuestXP` ile hesaplar.

**Yanıt (istemci)**

```json
{
  "engine": { "valid": true, "detail": {} },
  "evaluation": {
    "score": 86,
    "critique": "…",
    "praise": "…",
    "nextConcept": "sentinel nodes"
  },
  "xpAwarded": 165,
  "skills": { "logic": 75, "resilience": 80 },
  "teacherLine": "…"
}
```

## Prompt ayrımı

| Katman | İçerik |
|---|---|
| System pedagogy | Sokratik, aşağılama yasağı, hata = basamak, gerçek/kurgu ayrımı |
| Character style | isim, kişilik, metafor, catchphrase |
| Tool schema | JSON alanları |

Kişilik system pedagogy’yi değiştiremez.
