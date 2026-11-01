import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { bearer } from 'better-auth/plugins'
import { env } from '../env.ts'
import { db } from '../db/index.ts'
import * as schema from '../db/schema/index.ts'

export const auth = betterAuth({
  secret: env.betterAuthSecret,
  baseURL: env.betterAuthUrl,
  trustedOrigins: [
    env.apiPublicUrl,
    'mindcraftv2://',
    'http://localhost:8081',
    'http://localhost:8082',
    'exp://',
  ],
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
  plugins: [bearer()],
})
