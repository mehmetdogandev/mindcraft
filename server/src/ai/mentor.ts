import { mapEmotionToAnimation, type MentorChatResponse } from '@mindcraft/sprites'
import { env } from '../env.ts'
import { createGemini, requireGemini } from './client.ts'
import { safeParseJson } from './json.ts'

export async function mentorReply(input: {
  teacher: Record<string, unknown>
  courseName: string
  studentSummary: string
  mentorSummary: string
  history: Array<{ role: 'user' | 'model'; text: string }>
  message: string
}): Promise<MentorChatResponse> {
  requireGemini()
  const ai = createGemini()
  const response = await ai.models.generateContent({
    model: env.geminiModel,
    contents: `Ders: ${input.courseName}
Öğrenci özeti: ${input.studentSummary}
Hoca özeti: ${input.mentorSummary}
Geçmiş:
${input.history
  .slice(-6)
  .map((t) => `${t.role}: ${t.text}`)
  .join('\n')}
Öğrenci: ${input.message}`,
    config: {
      systemInstruction: `Sen ${String(input.teacher.name ?? 'öğretmen')} karakterisin.
Kişilik: ${String(input.teacher.personality ?? '')}
Tarz: ${String(input.teacher.teachingStyle ?? '')}
Pedagoji kişilikten ayrıdır: aşağılama yok, yanlış bilimsel iddia yok, cevabı düz verme, Sokratik sor.
JSON: message, emotion, nextAction (wait_for_student|start_quest|open_whiteboard), learningObjective, socraticHint.`,
      responseMimeType: 'application/json',
    },
  })

  const parsed = safeParseJson(response.text)
  const nextActionRaw = String(parsed.nextAction ?? 'wait_for_student')
  const nextAction =
    nextActionRaw === 'start_quest' || nextActionRaw === 'open_whiteboard'
      ? nextActionRaw
      : 'wait_for_student'

  return {
    message: String(parsed.message ?? 'Bir adım daha düşünelim.'),
    emotion: String(parsed.emotion ?? 'talk'),
    animation: mapEmotionToAnimation(String(parsed.emotion ?? 'talk')),
    nextAction,
    learningObjective: String(parsed.learningObjective ?? ''),
    socraticHint: parsed.socraticHint ? String(parsed.socraticHint) : undefined,
  }
}
