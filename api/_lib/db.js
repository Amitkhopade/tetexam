import { neon } from '@neondatabase/serverless'

let cachedSql
export function getSql() {
  const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL || process.env.NEON_DATABASE_URL
  if (!connectionString) {
    const error = new Error('Database is not configured. Connect Neon in Vercel and set DATABASE_URL.')
    error.status = 503
    error.code = 'DATABASE_NOT_CONFIGURED'
    throw error
  }
  if (!cachedSql) cachedSql = neon(connectionString)
  return cachedSql
}

export function isDatabaseConfigured() {
  return Boolean(process.env.DATABASE_URL || process.env.POSTGRES_URL || process.env.NEON_DATABASE_URL)
}
