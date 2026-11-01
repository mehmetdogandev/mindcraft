import { GoogleGenAI } from '@google/genai'
import { env, geminiConfigured } from '../env.ts'

export function requireGemini() {
  if (!geminiConfigured()) {
    const error = new Error('GEMINI_UNAVAILABLE')
    error.name = 'GEMINI_UNAVAILABLE'
    throw error
  }
}

export function createGemini() {
  requireGemini()
  return new GoogleGenAI({ apiKey: env.geminiApiKey })
}
