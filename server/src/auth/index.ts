import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { bearer } from 'better-auth/plugins'
import { env } from '../env.ts'
import { db } from '../db/index.ts'
import * as schema from '../db/schema/index.ts'

function isLocalDevOrigin(origin: string) {
  try {
    const url = new URL(origin)
    const host = url.hostname
    return (
      host === 'localhost' ||
      host === '127.0.0.1' ||
      host.endsWith('.local') ||
      host.startsWith('192.168.') ||
      host.startsWith('10.') ||
      /^172\.(1[6-9]|2\d|3[0-1])\./.test(host) ||
      url.protocol === 'exp:' ||
      url.protocol === 'mindcraftv2:'
    )
  } catch {
    return origin.startsWith('exp://') || origin.startsWith('mindcraftv2://')
  }
}

export const auth = betterAuth({
  secret: env.betterAuthSecret,
  baseURL: env.betterAuthUrl,
  trustedOrigins: (request) => {
    const origin = request?.headers.get('origin')
    return [
      env.apiPublicUrl,
      'mindcraftv2://',
      'http://localhost:8081',
      'http://localhost:8082',
      'http://127.0.0.1:8081',
      'exp://',
      origin && isLocalDevOrigin(origin) ? origin : null,
    ]
  },
  database: drizzleAdapter(db, {
    provider: 'pg',
    schema: {
      user: schema.user,
      session: schema.session,
      account: schema.account,
      verification: schema.verification,
    },
  }),
  emailAndPassword: {
    enabled: true,
  },
  advanced: {
    disableCSRFCheck: true,
  },
  plugins: [bearer()],
})
