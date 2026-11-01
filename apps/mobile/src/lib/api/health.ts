import { API_BASE_URL } from '../config.ts'

export type Health = {
  ok: boolean
  gemini: { configured: boolean; ok: boolean; message: string }
}

export async function fetchHealth(signal?: AbortSignal): Promise<Health | null> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/health`, { signal })
    if (!res.ok) return null
    return (await res.json()) as Health
  } catch {
    return null
  }
}
