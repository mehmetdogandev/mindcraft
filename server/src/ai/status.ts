import { env, geminiConfigured } from '../env.ts'
import { createGemini } from './client.ts'

export async function pingGemini(): Promise<{ ok: boolean; message: string; latencyMs?: number }> {
  if (!geminiConfigured()) {
    return {
      ok: false,
      message: 'GEMINI_API_KEY yapılandırılmamış. Yeni sohbet, öğretmen ve görev üretimi kapalı.',
    }
  }

  const started = Date.now()
  try {
    const ai = createGemini()
    await ai.models.generateContent({
      model: env.geminiModel,
      contents: 'Ping: Mindcraft v2 online?',
    })
    return {
      ok: true,
      latencyMs: Date.now() - started,
      message: `${env.geminiModel} hazır.`,
    }
  } catch (error) {
    return {
      ok: false,
      latencyMs: Date.now() - started,
      message: error instanceof Error ? error.message : 'Gemini servisine ulaşılamadı',
    }
  }
}
