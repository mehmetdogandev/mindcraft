import { config } from 'dotenv'
import { resolve } from 'node:path'

config({ path: resolve(process.cwd(), '../.env') })
config({ path: resolve(process.cwd(), '.env') })

function read(name: string, fallback = ''): string {
  return process.env[name]?.trim() ?? fallback
}

export const env = {
  port: Number(read('PORT', '4000')),
  databaseUrl: read('DATABASE_URL', 'postgres://mindcraft:mindcraft@localhost:5432/mindcraft_v2'),
  redisUrl: read('REDIS_URL', 'redis://localhost:6379'),
  s3Endpoint: read('S3_ENDPOINT', 'http://127.0.0.1:9000'),
  s3Bucket: read('S3_BUCKET', 'mindcraft-v2-assets'),
  s3AccessKey: read('S3_ACCESS_KEY', 'minioadmin'),
  s3SecretKey: read('S3_SECRET_KEY', 'minioadmin'),
  geminiApiKey: read('GEMINI_API_KEY'),
  geminiModel: read('GEMINI_MODEL', 'gemini-2.0-flash'),
  betterAuthSecret: read('BETTER_AUTH_SECRET', 'dev-only-change-me'),
  betterAuthUrl: read('BETTER_AUTH_URL', 'http://localhost:4000'),
  apiPublicUrl: read('API_PUBLIC_URL', 'http://localhost:4000'),
  appleClientId: read('APPLE_CLIENT_ID'),
}

export function geminiConfigured(): boolean {
  return Boolean(env.geminiApiKey)
}
