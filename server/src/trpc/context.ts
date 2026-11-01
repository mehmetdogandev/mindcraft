import type { Context as HonoContext } from 'hono'
import { auth } from '../auth/index.ts'

export async function createContext(c: HonoContext) {
  const session = await auth.api.getSession({
    headers: c.req.raw.headers,
  })
  return {
    user: session?.user ?? null,
    session: session?.session ?? null,
  }
}

export type Context = Awaited<ReturnType<typeof createContext>>
