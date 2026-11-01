import { Client } from 'minio'
import Redis from 'ioredis'
import { env, geminiConfigured } from './env.ts'
import { pool } from './db/index.ts'
import { pingGemini } from './ai/status.ts'

export type Probe = { ok: boolean; message: string }

async function probeDb(): Promise<Probe> {
  try {
    await pool.query('select 1')
    return { ok: true, message: 'Postgres hazır' }
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : 'Postgres yok' }
  }
}

async function probeRedis(): Promise<Probe> {
  const redis = new Redis(env.redisUrl, { lazyConnect: true, maxRetriesPerRequest: 1 })
  try {
    await redis.connect()
    const pong = await redis.ping()
    await redis.quit()
    return { ok: pong === 'PONG', message: pong === 'PONG' ? 'Redis hazır' : 'Redis yanıtı beklenmedik' }
  } catch (error) {
    redis.disconnect()
    return { ok: false, message: error instanceof Error ? error.message : 'Redis yok' }
  }
}

async function probeS3(): Promise<Probe> {
  try {
    const url = new URL(env.s3Endpoint)
    const client = new Client({
      endPoint: url.hostname,
      port: url.port ? Number(url.port) : url.protocol === 'https:' ? 443 : 80,
      useSSL: url.protocol === 'https:',
      accessKey: env.s3AccessKey,
      secretKey: env.s3SecretKey,
    })
    const exists = await client.bucketExists(env.s3Bucket)
    if (!exists) {
      await client.makeBucket(env.s3Bucket)
    }
    return { ok: true, message: 'MinIO hazır' }
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : 'MinIO yok' }
  }
}

export async function getHealth() {
  const [db, redis, s3, gemini] = await Promise.all([probeDb(), probeRedis(), probeS3(), pingGemini()])
  return {
    ok: db.ok,
    db,
    redis,
    s3,
    gemini: {
      configured: geminiConfigured(),
      ok: gemini.ok,
      message: gemini.message,
      latencyMs: gemini.latencyMs,
    },
  }
}

export async function getReady() {
  const health = await getHealth()
  return { ready: health.db.ok && health.redis.ok, health }
}
