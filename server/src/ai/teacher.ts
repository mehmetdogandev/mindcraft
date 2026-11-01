import { env } from '../env.ts'
import { createGemini, requireGemini } from './client.ts'
import { safeParseJson } from './json.ts'

export async function generateTeacherProfile(input: {
  prompt?: string
  method: 'describe' | 'select' | 'surprise'
  skeletonHint?: 'humanoid' | 'creature' | 'robot'
  personality?: string
  teachingStyle?: string
  subject?: string
}) {
  requireGemini()
  const ai = createGemini()
  const prompt =
    input.method === 'surprise'
      ? `Sürpriz bir öğretmen üret. Ders: ${input.subject ?? 'genel'}`
      : `Tarif: ${input.prompt ?? ''}. İskelet: ${input.skeletonHint ?? 'humanoid'}. Kişilik: ${input.personality ?? ''}. Tarz: ${input.teachingStyle ?? ''}. Ders: ${input.subject ?? ''}`

  const response = await ai.models.generateContent({
    model: env.geminiModel,
    contents: prompt,
    config: {
      systemInstruction: `MINDCRAFT karakter mimarısın. Pedagojik, Sokratik, aşağılama yok. Tüm metin Türkçe. JSON profil üret.`,
      responseMimeType: 'application/json',
    },
  })

  const parsed = safeParseJson(response.text)
  return {
    name: String(parsed.name ?? 'Bilge Rehber'),
    title: String(parsed.title ?? 'Zihin Yolcusu'),
    personality: String(parsed.personality ?? input.personality ?? 'Meraklı ve sabırlı'),
    teachingStyle: String(parsed.teachingStyle ?? input.teachingStyle ?? 'Sokratik'),
    catchphrase: String(parsed.catchphrase ?? 'Yanlış bir hipotez, doğruya giden en parlak ışıktır.'),
    backstory: String(parsed.backstory ?? ''),
    welcomeMessage: String(parsed.welcomeMessage ?? 'Hoş geldin. Birlikte düşünelim.'),
    skeletonHint: input.skeletonHint ?? 'humanoid',
    appearance: {
      archetype: String(parsed.archetype ?? 'wizard'),
      primaryColor: String(parsed.primaryColor ?? '#8c31ff'),
      secondaryColor: String(parsed.secondaryColor ?? '#06b6d4'),
      accentColor: String(parsed.accentColor ?? '#fbbf24'),
      headFeature: String(parsed.headFeature ?? 'pointed_hat'),
      clothing: String(parsed.clothing ?? 'cloak'),
      accessory: String(parsed.accessory ?? 'magic_wand'),
    },
  }
}
