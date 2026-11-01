import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'
import { env } from '../env.ts'
import * as schema from './schema/index.ts'

export const pool = new Pool({ connectionString: env.databaseUrl })
export const db = drizzle(pool, { schema })
export { schema }
