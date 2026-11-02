import { trpc } from './trpc.ts'

export type Health = {
  ok: boolean
  gemini: { configured: boolean; ok: boolean; message: string }
}

export async function fetchHealth(_signal?: AbortSignal): Promise<Health | null> {
  try {
    return await trpc().health.status.query()
  } catch {
    return null
  }
}
