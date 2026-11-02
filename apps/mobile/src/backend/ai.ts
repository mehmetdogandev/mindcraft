import {
  applyCharacterPatch,
  buildCharacterPatchFromPrompt,
  mapEmotionToAnimation,
  normalizeNpcAppearance,
  parseDescriptionToNpcAppearance,
  runConversationalCharacterTurn,
  toCharacterConfiguration,
  validateCharacterPatch,
  type CharacterChatTurn,
  type CharacterProfile,
  type CharacterUpdateResult,
  type MentorChatResponse,
  type NpcAppearance,
  type SkeletonHint,
} from '@mindcraft/sprites'
import { getStoredGeminiKey, type PlanItem } from './db.ts'

export async function getGeminiConfig(): Promise<{
  apiKey: string
  model: string
  openaiApiKey: string
  openaiModel: string
}> {
  const stored = await getStoredGeminiKey()
  const apiKey = (stored || process.env.GEMINI_API_KEY || '').trim()
  const model = (process.env.GEMINI_MODEL || 'gemini-2.5-flash').trim()
  const openaiApiKey = (process.env.OPENAI_API_KEY || '').trim()
  const openaiModel = (process.env.OPENAI_MODEL || 'gpt-4o-mini').trim()
  return { apiKey, model, openaiApiKey, openaiModel }
}

function safeParseJson(rawText: string | undefined): Record<string, unknown> {
  if (!rawText) throw new Error('AI_INVALID_JSON')
  let clean = rawText.trim()
  if (clean.startsWith('```json')) clean = clean.replace(/^```json\s*/, '').replace(/```\s*$/, '')
  else if (clean.startsWith('```')) clean = clean.replace(/^```\s*/, '').replace(/```\s*$/, '')
  try {
    const parsed = JSON.parse(clean)
    if (!parsed || typeof parsed !== 'object') throw new Error('AI_INVALID_JSON')
    return parsed as Record<string, unknown>
  } catch {
    const match = rawText.match(/\{[\s\S]*\}/)
    if (!match) throw new Error('AI_INVALID_JSON')
    return JSON.parse(match[0]) as Record<string, unknown>
  }
}

async function callGeminiDirect(
  apiKey: string,
  model: string,
  systemInstruction: string,
  prompt: string
): Promise<Record<string, unknown>> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 2500)
  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemInstruction }] },
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          responseMimeType: 'application/json',
        },
      }),
    })
    if (!res.ok) {
      throw new Error(`GEMINI_HTTP_${res.status}`)
    }
    const data = (await res.json()) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>
    }
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text
    return safeParseJson(text)
  } finally {
    clearTimeout(timer)
  }
}

async function callOpenAIDirect(
  openaiApiKey: string,
  openaiModel: string,
  systemInstruction: string,
  prompt: string
): Promise<Record<string, unknown>> {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${openaiApiKey}`,
    },
    body: JSON.stringify({
      model: openaiModel,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: `${systemInstruction}\nHer zaman geçerli bir JSON nesnesi döndür.` },
        { role: 'user', content: prompt },
      ],
    }),
  })
  if (!res.ok) {
    throw new Error(`OPENAI_HTTP_${res.status}`)
  }
  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>
  }
  const text = data.choices?.[0]?.message?.content
  return safeParseJson(text)
}

/**
 * Primary AI caller used across the entire app:
 * 1. Tries Gemini first.
 * 2. If Gemini fails, returns no response, or errors out, immediately routes to OpenAI (`gpt-4o-mini`).
 */
export async function callGeminiJson(
  systemInstruction: string,
  prompt: string
): Promise<Record<string, unknown> | null> {
  const { apiKey, model, openaiApiKey, openaiModel } = await getGeminiConfig()

  if (apiKey) {
    try {
      return await callGeminiDirect(apiKey, model, systemInstruction, prompt)
    } catch {
      // Gemini failed or returned no answer -> immediately route to OpenAI below
    }
  }

  if (openaiApiKey) {
    try {
      return await callOpenAIDirect(openaiApiKey, openaiModel, systemInstruction, prompt)
    } catch {
      return null
    }
  }

  return null
}

function inferTeacherName(subject: string, prompt: string, npc: NpcAppearance): { name: string; title: string } {
  const lower = `${subject} ${prompt}`.toLocaleLowerCase('tr-TR')
  if (/(veri|kod|algoritma|yazılım|bilgisayar|programlama)/.test(lower)) {
    return { name: 'Prof. Ada Çevik', title: 'Algoritma ve Sistem Mimarı' }
  }
  if (/(matematik|analiz|cebir|geometri|olasılık|ayrık)/.test(lower)) {
    return { name: 'Prof. Cahit Soylu', title: 'Soyut Matematik Rehberi' }
  }
  if (/(fizik|kimya|biyoloji|fen|bilim|termokimya)/.test(lower)) {
    return { name: 'Doç. Dr. Elif Özkan', title: 'Doğa Bilimleri Araştırmacısı' }
  }
  if (/(tarih|felsefe|edebiyat|sosyoloji)/.test(lower)) {
    return { name: 'Prof. İlber Kaya', title: 'Düşünce ve Tarih Bilgesi' }
  }
  const byHair: Record<NpcAppearance['hair'], string> = {
    gray: 'Prof. Bilge Çınar',
    black: 'Doç. Dr. Kerem Aksoy',
    brown: 'Dr. Selin Demir',
    blonde: 'Prof. Deniz Yıldız',
  }
  return { name: byHair[npc.hair], title: `${subject || 'Akademik'} Mentoru` }
}

export async function converseCharacterDesign(input: {
  prompt: string
  currentAppearance?: NpcAppearance | null
  history?: CharacterChatTurn[]
}): Promise<CharacterUpdateResult> {
  const hasExisting = Boolean(input.currentAppearance)

  try {
    const currentConfig = input.currentAppearance
      ? toCharacterConfiguration(input.currentAppearance)
      : null

    const historyText = (input.history ?? [])
      .slice(-8)
      .map((t) => `${t.role === 'user' ? 'Kullanıcı' : 'AI'}: ${t.text}`)
      .join('\n')

    const parsed = await callGeminiJson(
      `Sen konuşma tabanlı bir AI Karakter Tasarım Motorusun.
Kullanıcının yazdığı mesajı (Türkçe karakterli veya karaktersiz/ASCII yazımlar, örn. "sarisin", "kivircik", "gozluklu", "gozlugunu cikar", İngilizce ifadeler, benzetmeler veya dolaylı tarifler dahil) doğrudan yapay zeka olarak analiz et.

Desteklenen görsel değerler:
- face: "round" | "oval" | "square"
- hairColor: "blonde" | "black" | "brown" | "gray"
- hairStyle: "straight" | "wavy" | "curly" | "long"
- glasses: "round" | "square" | "none"
- outfit: "suit" | "coat" | "casual"

Kurallar:
1. Mevcut karakter yoksa ("Henüz oluşturulmadı") VEYA kullanıcı yeni/rastgele/sürpriz bir karakter oluşturmak istediyse operation = "CREATE_CHARACTER" döndür. Bu durumda "changes" içine SADECE kullanıcının mesajında belirttiği özellikleri yaz; belirtilmeyen özellikleri BOŞ bırak (sistem kalanları rastgele tamamlayacak).
2. Mevcut karakter varsa ve kullanıcı bir özelliği değiştirmek istediyse (ör. sadece "sarisin", "saçını kıvırcık yap", "gözlüğünü çıkar", "takım elbise giydir" yazdıysa) operation = "UPDATE_CHARACTER" döndür ve SADECE kullanıcının değiştirmek istediği alanları "changes" içine yaz; diğer alanlara kesinlikle dokunma.
3. Kullanıcının istediği bir özellik desteklenen değerler arasında yoksa (ör. şapka, sakal, mavi saç vb.) uydurma değer üretme; bunu "unsupportedAttributes" dizisine ekle ve "reply" içinde mevcut görünümü koruduğunu doğal bir dille belirt.
4. "reply" mesajında asla "asset", "katman" veya "sprite" kelimelerini kullanma; karakteri yapay zeka ile anlık tasarlayıp güncelliyormuşsun gibi Türkçe yanıt ver.

JSON formatı:
{
  "operation": "CREATE_CHARACTER" | "UPDATE_CHARACTER",
  "changes": {
    "profession": "academic",
    "appearance": { "face"?: "...", "hairColor"?: "...", "hairStyle"?: "...", "glasses"?: "..." },
    "outfit"?: "..."
  },
  "unsupportedAttributes": [],
  "reply": "..."
}`,
      `Mevcut Karakter: ${currentConfig ? JSON.stringify(currentConfig) : 'Henüz oluşturulmadı (CREATE_CHARACTER gerekli)'}
Geçmiş Konuşma:
${historyText || '(İlk mesaj)'}
Kullanıcı Mesajı: ${input.prompt}`
    )

    if (parsed) {
      const aiPatch = validateCharacterPatch(parsed)
      const finalOperation = !hasExisting ? 'CREATE_CHARACTER' : aiPatch.operation
      return applyCharacterPatch(input.currentAppearance, {
        ...aiPatch,
        operation: finalOperation,
      })
    }
  } catch {
    // Only if both Gemini and OpenAI are unreachable, fall back to local parser
  }

  return runConversationalCharacterTurn({
    prompt: input.prompt,
    currentAppearance: input.currentAppearance,
  })
}

export async function generateTeacherProfile(input: {
  prompt?: string
  method: 'describe' | 'select' | 'surprise'
  skeletonHint?: SkeletonHint
  personality?: string
  teachingStyle?: string
  subject?: string
  appearanceOverride?: Partial<NpcAppearance>
}): Promise<CharacterProfile> {
  const rawPrompt =
    input.method === 'surprise'
      ? `Sürpriz bir akademik öğretmen üret. Ders: ${input.subject ?? 'Genel'}`
      : `${input.prompt ?? ''} ${input.personality ?? ''} ${input.teachingStyle ?? ''}`.trim()

  const initialTurn = runConversationalCharacterTurn({
    prompt: rawPrompt || input.subject || 'profesör',
    currentAppearance: null,
  })

  const fallbackNpc: NpcAppearance = normalizeNpcAppearance(
    {
      ...initialTurn.appearance,
      ...(input.appearanceOverride ?? {}),
    },
    rawPrompt || input.subject || 'profesör'
  )

  try {
    const parsed = await callGeminiJson(
      `MINDCRAFT akademik öğretmen ve karakter tasarımcısısın.
Öğrencinin yazdığı doğal dil tarifini (Türkçe karakterli veya karaktersiz/ASCII yazımlar dahil, örn. "sarisin", "kivircik", "gozluklu") analiz et.
Görsel parametreler:
- face: "round" | "oval" | "square"
- hair: "blonde" | "black" | "brown" | "gray"
- hairStyle: "straight" | "wavy" | "curly" | "long"
- glasses: "round" | "square" | "none"
- outfit: "suit" | "coat" | "casual"
Pedagojik, Sokratik, aşağılama içermeyen Türkçe bir karakter profili ve görünüm değerlerini JSON olarak döndür:
{ "name": "...", "title": "...", "personality": "...", "teachingStyle": "...", "catchphrase": "...", "backstory": "...", "welcomeMessage": "...", "appearance": { "face": "...", "hair": "...", "hairStyle": "...", "glasses": "...", "outfit": "..." } }`,
      `Ders: ${input.subject ?? 'Genel'}\nMevcut Görünüm: ${input.appearanceOverride ? JSON.stringify(input.appearanceOverride) : 'Yok'}\nÖğrenci tarifi: ${rawPrompt}`
    )

    if (parsed) {
      const aiAppearance = (parsed.appearance as Record<string, unknown>) ?? parsed
      const npc = normalizeNpcAppearance(
        {
          ...(input.appearanceOverride ?? {}),
          ...aiAppearance,
        },
        rawPrompt
      )
      const fallbackIdentity = inferTeacherName(input.subject ?? '', rawPrompt, npc)
      return {
        name: String(parsed.name ?? fallbackIdentity.name),
        title: String(parsed.title ?? fallbackIdentity.title),
        personality: String(parsed.personality ?? input.personality ?? 'Sabırlı, merak uyandıran ve esprili'),
        teachingStyle: String(parsed.teachingStyle ?? input.teachingStyle ?? 'Sokratik ve adım adım keşfettiren'),
        catchphrase: String(
          parsed.catchphrase ?? 'Her yanlış hipotez, doğru cevaba açılan gizli bir kapıdır.'
        ),
        backstory: String(parsed.backstory ?? `${input.subject ?? 'Akademi'} kürsüsünün sevilen mentoru.`),
        welcomeMessage: String(
          parsed.welcomeMessage ?? `Merhaba! ${input.subject ?? 'Bu ders'} üzerine birlikte düşünmeye hazır mısın?`
        ),
        skeletonHint: 'humanoid',
        appearance: npc,
      }
    }
  } catch {
    // Fallback to local profile builder below
  }

  const identity = inferTeacherName(input.subject ?? '', rawPrompt, fallbackNpc)
  return {
    name: identity.name,
    title: identity.title,
    personality: input.personality || (rawPrompt ? `Tarif: ${rawPrompt}` : 'Meraklı, sabırlı ve destekleyici'),
    teachingStyle: input.teachingStyle || 'Sokratik sorgulama ve örneklerle somutlaştırma',
    catchphrase: 'Yanlış bir hipotez, doğruya giden en parlak ışıktır.',
    backstory: `${input.subject || 'Bilim'} alanında öğrencilerine ezber yerine keşfetmeyi öğreten akademisyen.`,
    welcomeMessage: `Hoş geldin! Ben ${identity.name}. ${input.subject || 'Dersimiz'} içinde bugün hangi kavramı birlikte çözelim?`,
    skeletonHint: 'humanoid',
    appearance: fallbackNpc,
  }
}

export async function mentorReply(input: {
  teacher: Record<string, unknown>
  courseName: string
  studentSummary: string
  mentorSummary: string
  history: Array<{ role: 'user' | 'model'; text: string }>
  message: string
}): Promise<MentorChatResponse> {
  try {
    const parsed = await callGeminiJson(
      `Sen ${String(input.teacher.name ?? 'Akademik Mentor')} karakterisin.
Kişilik: ${String(input.teacher.personality ?? '')}
Tarz: ${String(input.teacher.teachingStyle ?? '')}
Pedagoji: aşağılama yok, cevabı doğrudan verme, Sokratik sorularla yönlendir.
JSON döndür: { "message": "...", "emotion": "idle|talk|think|happy|confused|celebrate", "nextAction": "wait_for_student|start_quest|open_whiteboard", "learningObjective": "...", "socraticHint": "..." }`,
      `Ders: ${input.courseName}
Öğrenci Özeti: ${input.studentSummary}
Hoca Hafıza Özeti: ${input.mentorSummary}
Geçmiş:
${input.history
  .slice(-6)
  .map((t) => `${t.role}: ${t.text}`)
  .join('\n')}
Öğrenci: ${input.message}`
    )

    if (parsed) {
      const nextActionRaw = String(parsed.nextAction ?? 'wait_for_student')
      const nextAction =
        nextActionRaw === 'start_quest' || nextActionRaw === 'open_whiteboard'
          ? nextActionRaw
          : 'wait_for_student'
      const emotion = String(parsed.emotion ?? 'talk')
      return {
        message: String(parsed.message ?? 'Güzel bir bakış açısı, bunu bir adım daha açalım.'),
        emotion,
        animation: mapEmotionToAnimation(emotion),
        nextAction,
        learningObjective: String(parsed.learningObjective ?? input.courseName),
        socraticHint: parsed.socraticHint ? String(parsed.socraticHint) : undefined,
      }
    }
  } catch {
    // Local Socratic fallback
  }

  const lower = input.message.toLocaleLowerCase('tr-TR')
  const wantsQuest = /(görev|oyun|macera|test|soru|uygulama|pratik)/.test(lower)
  return {
    message: wantsQuest
      ? `Harika! "${input.courseName}" konusu için düşünceni mini bir görevle sınayalım.`
      : `İlginç bir yaklaşım! "${input.message}" derken temel varsayımın neydi? İstersen bunu hemen interaktif bir görev üzerinde deneyebiliriz.`,
    emotion: wantsQuest ? 'celebrate' : 'think',
    animation: wantsQuest ? 'celebrate' : 'think',
    nextAction: wantsQuest ? 'start_quest' : 'wait_for_student',
    learningObjective: input.courseName,
    socraticHint: 'Kavramın sınır durumlarını (edge case) ve temel tanımını düşünerek başla.',
  }
}

export async function generateQuestContent(input: {
  realmId: string
  topic: string
  difficulty: string
  type?: 'matrix' | 'dilemma' | 'algorithm'
  courseName?: string
}) {
  const types = ['matrix', 'dilemma', 'algorithm'] as const
  const wanted = input.type && types.includes(input.type) ? input.type : undefined

  try {
    const parsed = await callGeminiJson(
      `MINDCRAFT oyun tasarımcısısın. Yalnızca matrix, dilemma veya algorithm tiplerinde doğrulanabilir görev üret.
JSON şeması:
{
  "title": "...",
  "storyIntro": "...",
  "type": "matrix" | "algorithm" | "dilemma",
  "learningOutcomes": ["..."],
  "hints": ["İpucu 1...", "İpucu 2..."],
  "matrixData": { "targetValue": 24, "nodes": [{ "id": "1", "label": "...", "value": 10 }] },
  "algorithmData": { "gridWidth": 4, "gridHeight": 4, "start": { "x": 0, "y": 3, "dir": "E" }, "target": { "x": 3, "y": 0 }, "obstacles": [{ "x": 1, "y": 2 }] },
  "dilemmaData": { "scenario": "...", "choices": [{ "id": "a", "label": "...", "consequence": "..." }] }
}`,
      `Realm: ${input.realmId}\nDers: ${input.courseName ?? ''}\nKonu: ${input.topic}\nZorluk: ${input.difficulty}\nİstenen tip: ${wanted ?? 'uygun olanı seç'}`
    )

    if (parsed) {
      const type = types.includes(parsed.type as (typeof types)[number])
        ? (parsed.type as (typeof types)[number])
        : wanted ?? 'matrix'
      const hints = Array.isArray(parsed.hints) ? parsed.hints.map(String) : []

      if (type === 'matrix') {
        const data = (parsed.matrixData as Record<string, unknown>) ?? {}
        const nodes = Array.isArray(data.nodes) ? data.nodes : []
        if (nodes.length >= 3 && nodes.length <= 8) {
          return {
            type,
            title: String(parsed.title ?? `${input.topic} Enerji Matrisi`),
            storyIntro: String(parsed.storyIntro ?? `${input.topic} dengesini kurmak için doğru düğümleri etkinleştir.`),
            learningOutcomes: Array.isArray(parsed.learningOutcomes) ? parsed.learningOutcomes.map(String) : [input.topic],
            payload: {
              targetValue: Number(data.targetValue ?? 24),
              hints: hints.length ? hints : ['Hedef sayıya ulaşmak için önce en büyük değerli düğümü dene.', 'Fark değerine bakarak eksik kalan sayıyı tamamla.'],
              nodes: nodes.map((n, i) => {
                const row = n as Record<string, unknown>
                return {
                  id: String(row.id ?? i + 1),
                  label: String(row.label ?? `Düğüm ${i + 1}`),
                  value: Number(row.value ?? (i + 1) * 4),
                }
              }),
            },
          }
        }
      }

      if (type === 'algorithm') {
        const data = (parsed.algorithmData as Record<string, unknown>) ?? {}
        const width = Math.min(6, Math.max(3, Number(data.gridWidth ?? 4)))
        const height = Math.min(6, Math.max(3, Number(data.gridHeight ?? 4)))
        return {
          type,
          title: String(parsed.title ?? `${input.topic} Algoritma Rotası`),
          storyIntro: String(parsed.storyIntro ?? `Engellere çarpmadan hedefe ulaşacak algoritma adımlarını diz.`),
          learningOutcomes: Array.isArray(parsed.learningOutcomes) ? parsed.learningOutcomes.map(String) : [input.topic],
          payload: {
            gridWidth: width,
            gridHeight: height,
            start: data.start ?? { x: 0, y: height - 1, dir: 'E' },
            target: data.target ?? { x: width - 1, y: 0 },
            obstacles: Array.isArray(data.obstacles) ? data.obstacles : [{ x: 1, y: 1 }],
            hints: hints.length ? hints : ['Robotun baktığı yöne (ok işaretine) dikkat et.', 'Engel olan kırmızı hücrelerin etrafından dolaşmak için önce dön, sonra ilerle.'],
          },
        }
      }

      if (type === 'dilemma') {
        const data = (parsed.dilemmaData as Record<string, unknown>) ?? {}
        const choices = Array.isArray(data.choices) ? data.choices : []
        if (choices.length >= 2) {
          return {
            type: 'dilemma' as const,
            title: String(parsed.title ?? `${input.topic} Karar Senaryosu`),
            storyIntro: String(parsed.storyIntro ?? ''),
            learningOutcomes: Array.isArray(parsed.learningOutcomes) ? parsed.learningOutcomes.map(String) : [input.topic],
            payload: {
              scenario: String(data.scenario ?? parsed.storyIntro ?? `${input.topic} üzerine kritik bir karar vermelisin.`),
              hints: hints.length ? hints : ['Seçeneklerin uzun vadeli etkisini ve sistem güvenilirliğini düşün.', 'Açıklama kısmında neden diğer seçeneği elediğini belirt.'],
              choices: choices.map((c, i) => {
                const row = c as Record<string, unknown>
                return {
                  id: String(row.id ?? String.fromCharCode(97 + i)),
                  label: String(row.label ?? `Seçenek ${i + 1}`),
                  consequence: String(row.consequence ?? ''),
                }
              }),
            },
          }
        }
      }
    }
  } catch {
    // Fallback to local procedural quest generator below
  }

  const chosenType = wanted ?? (input.realmId === 'code' ? 'algorithm' : input.realmId === 'history' ? 'dilemma' : 'matrix')

  if (chosenType === 'algorithm') {
    return {
      type: 'algorithm' as const,
      title: `${input.topic} — Algoritma Labirenti`,
      storyIntro: `${input.courseName || 'Ders'} laboratuvarında veri paketini engellere çarpmadan hedef düğüme (★) ulaştır.`,
      learningOutcomes: [input.topic, 'Algoritmik İlerleme'],
      payload: {
        gridWidth: 4,
        gridHeight: 4,
        start: { x: 0, y: 3, dir: 'E' as const },
        target: { x: 3, y: 0 },
        obstacles: [
          { x: 1, y: 3 },
          { x: 2, y: 1 },
        ],
        hints: [
          'Başlangıçta (0,3) noktasındasın ve sağda (1,3) engel var; önce SOLA DÖN (kuzeye bak) ve İLERİ git.',
          'Kuzeye çıktıktan sonra SAĞA DÖN ile doğuya ilerleyip (3,0) yıldızına ulaşabilirsin.',
        ],
      },
    }
  }

  if (chosenType === 'dilemma') {
    return {
      type: 'dilemma' as const,
      title: `${input.topic} — Stratejik İkilem`,
      storyIntro: `${input.courseName || 'Akademi'} projesinde ${input.topic} uygulanırken farklı mimari yaklaşımlar arasında kaldın.`,
      learningOutcomes: [input.topic, 'Eleştirel Analiz'],
      payload: {
        scenario: `${input.topic} problemini çözerken hız mı yoksa uzun vadeli tutarlılık ve doğrulanabilirlik mi önceliklendirilmeli?`,
        hints: [
          'Her seçeneğin kısa vadeli hız ile uzun vadeli bakım maliyeti arasındaki dengesini düşün.',
          'Açıklama alanında seçtiğin yaklaşımın hangi durumda avantaj sağladığını bir örnekle yaz.',
        ],
        choices: [
          {
            id: 'a',
            label: 'Hızlı sezgisel çözüm (Düşük gecikme, yaklaşık sonuç)',
            consequence: 'Kısa vadede hızlı çalışır ancak uç durumlarda hata payı artar.',
          },
          {
            id: 'b',
            label: 'Doğrulanabilir sistematik model (Kesinlik, ekstra analiz maliyeti)',
            consequence: 'Kurulumu daha fazla düşünme gerektirir ancak temel ilkeleri korur.',
          },
          {
            id: 'c',
            label: 'Hibrit katmanlı yapı (Önce önbellek, kritik adımda doğrulama)',
            consequence: 'İki yaklaşımı dengeler, tasarım karmaşıklığını yönetmeyi gerektirir.',
          },
        ],
      },
    }
  }

  return {
    type: 'matrix' as const,
    title: `${input.topic} — Denge Matrisi`,
    storyIntro: `${input.courseName || 'Ders'} kapsamındaki "${input.topic}" sistemini dengelemek için toplamı tam hedef değere (25) ulaşan bileşenleri seç.`,
    learningOutcomes: [input.topic, 'Analitik Denge'],
    payload: {
      targetValue: 25,
      hints: [
        'Hedef 25: 10 + 15 veya 10 + 8 + 7 kombinasyonlarını deneyebilirsin.',
        'Üstteki "Fark" göstergesi 0 olduğunda matris dengelenmiş demektir.',
      ],
      nodes: [
        { id: '1', label: 'Temel Aksiyom', value: 10 },
        { id: '2', label: 'Yardımcı Teorem', value: 8 },
        { id: '3', label: 'Sınır Koşulu', value: 7 },
        { id: '4', label: 'Gürültü Faktörü', value: 6 },
        { id: '5', label: 'Denge Sabiti', value: 15 },
      ],
    },
  }
}

export async function evaluateExplanation(input: {
  title: string
  prompt: string
  answer: unknown
  explanation: string
  isCorrect: boolean
}) {
  try {
    const parsed = await callGeminiJson(
      `Pedagojik değerlendirici ol. Aşağılama yok. JSON: { "score": 0-100, "critique": "...", "praise": "...", "nextConcept": "...", "explanationQualityScore": 0-100 }`,
      `Görev: ${input.title}\nİstek: ${input.prompt}\nCevap: ${JSON.stringify(input.answer)}\nAçıklama: ${input.explanation}`
    )
    if (parsed) {
      return {
        score: Number(parsed.score ?? (input.isCorrect ? 85 : 55)),
        critique: String(parsed.critique ?? ''),
        praise: String(parsed.praise ?? 'Açıklaman düşünce sürecini güzel yansıtıyor.'),
        nextConcept: String(parsed.nextConcept ?? ''),
        explanationQualityScore: Number(parsed.explanationQualityScore ?? 75),
      }
    }
  } catch {
    // Fallback below
  }

  const wordCount = input.explanation.trim().split(/\s+/).filter(Boolean).length
  const quality = Math.min(100, Math.max(40, wordCount * 10))
  return {
    score: input.isCorrect ? 85 : 60,
    critique: input.isCorrect
      ? 'Çözümün doğru; bir sonraki adımda sınır durumlarını da açıklamana ekleyebilirsin.'
      : 'Sonuç hedefe tam ulaşmasa da yaklaşımın değerli bir deneme.',
    praise: wordCount >= 4 ? 'Kendi cümlelerinle gerekçelendirmen çok güzel!' : 'Denemeye devam et!',
    nextConcept: 'İleri Seviye Uygulama',
    explanationQualityScore: quality,
  }
}

export async function analyzeOnboardingMessage(input: {
  message: string
  currentDraft: Record<string, unknown>
}) {
  try {
    const parsed = await callGeminiJson(
      `MINDCRAFT kurulum asistanısın. Kullanıcının mesajından kimlik, okul, bölüm, öğrenme stili ve hedef bilgilerini analiz et.
JSON döndür:
{
  "reply": "...",
  "extracted": { "displayName"?: "...", "schoolName"?: "...", "department"?: "...", "learningStyle"?: "...", "goals"?: "..." },
  "missingFields": [],
  "confirmations": ["..."],
  "readyToCommit": true
}`,
      `Mevcut Taslak: ${JSON.stringify(input.currentDraft)}\nKullanıcı Mesajı: ${input.message}`
    )
    if (parsed) {
      return {
        reply: String(parsed.reply ?? 'Bilgilerini analiz edip kaydettim. Devam etmeye hazırız!'),
        extracted: {
          ...input.currentDraft,
          ...((parsed.extracted as Record<string, unknown>) ?? {}),
          lastMessage: input.message,
        },
        missingFields: Array.isArray(parsed.missingFields) ? parsed.missingFields.map(String) : [],
        confirmations: Array.isArray(parsed.confirmations)
          ? parsed.confirmations.map(String)
          : [input.message],
        readyToCommit: parsed.readyToCommit !== false,
      }
    }
  } catch {
    // Fallback below
  }
  return {
    reply: 'Bilgilerini kaydettim. Devam etmeye hazırız!',
    extracted: { ...input.currentDraft, lastMessage: input.message },
    missingFields: [] as string[],
    confirmations: [input.message],
    readyToCommit: true,
  }
}

export async function enrichDailyPlanItemsWithAI(input: {
  date: string
  courses: Array<{ id: string; name: string; realmId: string }>
  fallbackItems: PlanItem[]
}): Promise<PlanItem[]> {
  if (input.fallbackItems.length === 0) return input.fallbackItems
  try {
    const parsed = await callGeminiJson(
      `MINDCRAFT akademik günlük planlayıcısısın. Öğrencinin bugünkü ders oturumlarına göre ilgi çekici, oyunlaştırılmış görev başlıkları, kısa hikayeler ve konular üret.
JSON döndür:
{
  "items": [
    { "courseId": "...", "title": "...", "story": "...", "topic": "...", "suggestedType": "matrix|algorithm|dilemma" }
  ]
}`,
      `Tarih: ${input.date}\nDersler: ${JSON.stringify(input.courses)}\nTaslak Plan: ${JSON.stringify(input.fallbackItems)}`
    )
    if (parsed && Array.isArray(parsed.items) && parsed.items.length > 0) {
      const types = ['matrix', 'dilemma', 'algorithm'] as const
      return input.fallbackItems.map((base, idx) => {
        const aiItem = (parsed.items as Array<Record<string, unknown>>)[idx]
        if (!aiItem) return base
        const suggestedType = types.includes(aiItem.suggestedType as (typeof types)[number])
          ? (aiItem.suggestedType as (typeof types)[number])
          : base.suggestedType
        return {
          ...base,
          title: String(aiItem.title ?? base.title),
          story: String(aiItem.story ?? base.story),
          topic: String(aiItem.topic ?? base.topic),
          suggestedType,
        }
      })
    }
  } catch {
    // Fallback below
  }
  return input.fallbackItems
}
