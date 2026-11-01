import { env } from '../env.ts'
import { createGemini, requireGemini } from './client.ts'
import { safeParseJson } from './json.ts'

const TYPES = ['matrix', 'dilemma', 'algorithm'] as const

export async function generateQuestContent(input: {
  realmId: string
  topic: string
  difficulty: string
  type?: string
  courseName?: string
}) {
  requireGemini()
  const wanted = TYPES.includes(input.type as (typeof TYPES)[number]) ? input.type : undefined
  const ai = createGemini()
  const response = await ai.models.generateContent({
    model: env.geminiModel,
    contents: `Realm: ${input.realmId}
Ders: ${input.courseName ?? ''}
Konu: ${input.topic}
Zorluk: ${input.difficulty}
İstenen tip: ${wanted ?? 'uygun olanı seç (yalnızca matrix|dilemma|algorithm)'}`,
    config: {
      systemInstruction: `MINDCRAFT oyun tasarımcısısın. Rastgele kod üretme. Yalnızca matrix, dilemma veya algorithm.
JSON: title, storyIntro, type, learningOutcomes[], matrixData|dilemmaData|algorithmData.`,
      responseMimeType: 'application/json',
    },
  })

  const parsed = safeParseJson(response.text)
  const type = TYPES.includes(parsed.type as (typeof TYPES)[number])
    ? (parsed.type as (typeof TYPES)[number])
    : wanted ?? 'matrix'

  if (type === 'matrix') {
    const data = (parsed.matrixData as Record<string, unknown>) ?? {}
    const nodes = Array.isArray(data.nodes) ? data.nodes : []
    if (nodes.length < 3 || nodes.length > 8) {
      throw new Error('GEMINI_INVALID')
    }
    return {
      type,
      title: String(parsed.title ?? `${input.topic} matrisi`),
      storyIntro: String(parsed.storyIntro ?? ''),
      learningOutcomes: Array.isArray(parsed.learningOutcomes) ? parsed.learningOutcomes.map(String) : [],
      payload: {
        targetValue: Number(data.targetValue ?? 24),
        nodes: nodes.map((n, i) => {
          const row = n as Record<string, unknown>
          return {
            id: String(row.id ?? i + 1),
            label: String(row.label ?? `Düğüm ${i + 1}`),
            value: Number(row.value ?? 0),
          }
        }),
      },
    }
  }

  if (type === 'algorithm') {
    const data = (parsed.algorithmData as Record<string, unknown>) ?? {}
    const width = Number(data.gridWidth ?? 4)
    const height = Number(data.gridHeight ?? 4)
    if (width < 3 || width > 8 || height < 3 || height > 8) throw new Error('GEMINI_INVALID')
    return {
      type,
      title: String(parsed.title ?? `${input.topic} algoritması`),
      storyIntro: String(parsed.storyIntro ?? ''),
      learningOutcomes: Array.isArray(parsed.learningOutcomes) ? parsed.learningOutcomes.map(String) : [],
      payload: {
        gridWidth: width,
        gridHeight: height,
        start: data.start ?? { x: 0, y: height - 1, dir: 'E' },
        target: data.target ?? { x: width - 1, y: 0 },
        obstacles: Array.isArray(data.obstacles) ? data.obstacles : [],
      },
    }
  }

  const data = (parsed.dilemmaData as Record<string, unknown>) ?? {}
  const choices = Array.isArray(data.choices) ? data.choices : []
  if (choices.length < 2) throw new Error('GEMINI_INVALID')
  return {
    type: 'dilemma' as const,
    title: String(parsed.title ?? `${input.topic} ikilemi`),
    storyIntro: String(parsed.storyIntro ?? ''),
    learningOutcomes: Array.isArray(parsed.learningOutcomes) ? parsed.learningOutcomes.map(String) : [],
    payload: {
      scenario: String(data.scenario ?? parsed.storyIntro ?? ''),
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

export async function evaluateExplanation(input: {
  title: string
  prompt: string
  answer: unknown
  explanation: string
}) {
  requireGemini()
  const ai = createGemini()
  const response = await ai.models.generateContent({
    model: env.geminiModel,
    contents: `Görev: ${input.title}
İstek: ${input.prompt}
Cevap: ${JSON.stringify(input.answer)}
Açıklama: ${input.explanation}`,
    config: {
      systemInstruction: `Pedagojik değerlendirici ol. Aşağılama yok. JSON: score (0-100), critique, praise, nextConcept, explanationQualityScore (0-100). isCorrect alanı üretme.`,
      responseMimeType: 'application/json',
    },
  })
  const parsed = safeParseJson(response.text)
  return {
    score: Number(parsed.score ?? 70),
    critique: String(parsed.critique ?? ''),
    praise: String(parsed.praise ?? ''),
    nextConcept: String(parsed.nextConcept ?? ''),
    explanationQualityScore: Number(parsed.explanationQualityScore ?? parsed.score ?? 60),
  }
}
