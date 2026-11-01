import { serve } from '@hono/node-server'
import { fetchRequestHandler } from '@trpc/server/adapters/fetch'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { env } from './env.ts'
import { getHealth, getReady } from './health.ts'
import { auth } from './auth/index.ts'
import { createContext } from './trpc/context.ts'
import { appRouter } from './trpc/router.ts'
import { getCharacterFile } from './trpc/routers/characters.ts'

const app = new Hono()

app.use(
  '*',
  cors({
    origin: (origin) => origin || '*',
    allowHeaders: ['Content-Type', 'Authorization', 'Cookie'],
    allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    credentials: true,
  })
)

app.get('/api/health', async (c) => c.json(await getHealth()))
app.get('/api/ready', async (c) => {
  const ready = await getReady()
  return c.json(ready, ready.ready ? 200 : 503)
})

app.on(['GET', 'POST'], '/api/auth/*', (c) => auth.handler(c.req.raw))

app.get('/api/files/characters/:id/:file', (c) => {
  const body = getCharacterFile(c.req.param('id'), c.req.param('file'))
  if (!body) return c.json({ error: 'NOT_FOUND' }, 404)
  return c.body(body, 200, { 'content-type': 'image/svg+xml; charset=utf-8' })
})

app.all('/api/trpc/*', (c) =>
  fetchRequestHandler({
    endpoint: '/api/trpc',
    req: c.req.raw,
    router: appRouter,
    createContext: () => createContext(c),
  })
)

app.get('/', (c) => c.json({ name: 'mindcraft-v2', ok: true }))

serve({ fetch: app.fetch, port: env.port }, (info) => {
  console.log(`MINDCRAFT v2 API http://localhost:${info.port}`)
})
