import { env } from '../env.ts'
import { createGemini, requireGemini } from './client.ts'
import { safeParseJson } from './json.ts'

export type OnboardingDraft = Record<string, unknown>

export async function onboardingTurn(input: {
  draft: OnboardingDraft
  message: string
}): Promise<{
  reply: string
  extracted: OnboardingDraft
  missingFields: string[]
  confirmations: string[]
  readyToCommit: boolean
}> {
  requireGemini()
  const ai = createGemini()
  const response = await ai.models.generateContent({
    model: env.geminiModel,
    contents: `Mevcut taslak: ${JSON.stringify(input.draft)}
Öğrenci mesajı: ${input.message}

Bilinen alanları tekrar sorma. JSON döndür.`,
    config: {
      systemInstruction: `MINDCRAFT tanışma rehberisin. Doğal Türkçe konuş.
Öğrenci / mezun / çalışan / bağımsız öğrenen ayrımını çıkar.
Okul, bölüm, sınıf, dönem bilgilerini tek mesajdan ayır.
Kritik alanları kaydetmeden önce confirmations listesinde doğrulat.
Yanıtını yalnızca JSON ver.`,
      responseMimeType: 'application/json',
    },
  })

  const parsed = safeParseJson(response.text)
  const extracted = {
    ...input.draft,
    ...((parsed.extracted as OnboardingDraft) ?? {}),
  }
  const missingFields = Array.isArray(parsed.missingFields) ? (parsed.missingFields as string[]) : []
  const confirmations = Array.isArray(parsed.confirmations) ? (parsed.confirmations as string[]) : []
  return {
    reply: String(parsed.reply ?? 'Anladım. Bir ayrıntıyı doğrulayalım.'),
    extracted,
    missingFields,
    confirmations,
    readyToCommit: Boolean(parsed.readyToCommit) && missingFields.length === 0,
  }
}
