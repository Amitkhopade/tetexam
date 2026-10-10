import { createHash, createHmac, randomBytes, scrypt as nodeScrypt, timingSafeEqual } from 'node:crypto'
import { promisify } from 'node:util'
import { getSql } from './db.js'
import { HttpError } from './http.js'

const scrypt = promisify(nodeScrypt)
export const SESSION_COOKIE = 'qpn_session'
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7

export function sha256(value) {
  return createHash('sha256').update(String(value)).digest('hex')
}

export function randomToken() {
  return randomBytes(32).toString('base64url')
}

export async function hashPassword(password) {
  assertPasswordPolicy(password)
  const salt = randomBytes(16).toString('hex')
  const derived = await scrypt(String(password), salt, 64, { N: 16384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 })
  return `scrypt$16384$${salt}$${Buffer.from(derived).toString('hex')}`
}

export function assertPasswordPolicy(password) {
  const value = String(password || '')
  if (value.length < 12 || value.length > 128) {
    throw new HttpError(400, 'Password must contain between 12 and 128 characters.', 'PASSWORD_POLICY')
  }
  if (!/[A-Za-z]/.test(value) || !/[0-9]/.test(value)) {
    throw new HttpError(400, 'Password must include at least one letter and one number.', 'PASSWORD_POLICY')
  }
}

export async function verifyPassword(password, encoded) {
  if (!encoded || typeof encoded !== 'string') return false
  const parts = encoded.split('$')
  if (parts.length !== 4 || parts[0] !== 'scrypt' || parts[1] !== '16384') return false
  const [, , salt, expectedHex] = parts
  if (!/^[a-f0-9]{32}$/i.test(salt) || !/^[a-f0-9]{128}$/i.test(expectedHex)) return false
  const expected = Buffer.from(expectedHex, 'hex')
  const actual = Buffer.from(await scrypt(String(password || ''), salt, expected.length, { N: 16384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 }))
  return actual.length === expected.length && timingSafeEqual(actual, expected)
}

function sessionSecret() {
  const value = process.env.AUTH_SESSION_SECRET || ''
  if (value.length < 32) {
    const error = new Error('AUTH_SESSION_SECRET must be at least 32 characters.')
    error.status = 503
    error.code = 'SESSION_SECRET_NOT_CONFIGURED'
    throw error
  }
  return value
}

export function createSessionValue(user) {
  const now = Math.floor(Date.now() / 1000)
  const payload = { sub: user.id, sv: Number(user.session_version || 1), iat: now, exp: now + SESSION_TTL_SECONDS }
  const encoded = Buffer.from(JSON.stringify(payload)).toString('base64url')
  const signature = createHmac('sha256', sessionSecret()).update(encoded).digest('base64url')
  return `${encoded}.${signature}`
}

export function verifySessionValue(value) {
  if (!value || typeof value !== 'string') return null
  const [encoded, signature, extra] = value.split('.')
  if (!encoded || !signature || extra) return null
  let expected
  try { expected = createHmac('sha256', sessionSecret()).update(encoded).digest() }
  catch { return null }
  let received
  try { received = Buffer.from(signature, 'base64url') } catch { return null }
  if (received.length !== expected.length || !timingSafeEqual(received, expected)) return null
  try {
    const payload = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8'))
    if (!payload.sub || !Number.isFinite(payload.exp) || payload.exp <= Math.floor(Date.now() / 1000)) return null
    return payload
  } catch { return null }
}

function cookieSecure() {
  if (process.env.NODE_ENV === 'production') return true
  const vercelEnv = String(process.env.VERCEL_ENV || '').toLowerCase()
  return vercelEnv === 'production' || vercelEnv === 'preview'
}

export function setSessionCookie(res, user) {
  const value = createSessionValue(user)
  const secure = cookieSecure() ? '; Secure' : ''
  res.setHeader('Set-Cookie', `${SESSION_COOKIE}=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${SESSION_TTL_SECONDS}${secure}`)
}

export function clearSessionCookie(res) {
  const secure = cookieSecure() ? '; Secure' : ''
  res.setHeader('Set-Cookie', `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure}`)
}

function parseCookie(req, name) {
  const cookieHeader = String(req.headers.cookie || '')
  for (const item of cookieHeader.split(';')) {
    const index = item.indexOf('=')
    if (index < 0) continue
    if (item.slice(0, index).trim() === name) return item.slice(index + 1).trim()
  }
  return null
}

export function publicUser(row) {
  return {
    id: row.id,
    username: row.username,
    fullName: row.full_name,
    displayName: row.full_name,
    email: row.email,
    mobile: row.mobile,
    role: row.role,
    status: row.status,
    mustChangePassword: Boolean(row.must_change_password),
    createdAt: row.created_at,
    lastLoginAt: row.last_login_at,
  }
}

export async function requireUser(req, allowedRoles = null) {
  const raw = parseCookie(req, SESSION_COOKIE)
  const token = verifySessionValue(raw)
  if (!token) throw new HttpError(401, 'Sign in to continue.', 'AUTH_REQUIRED')
  const sql = getSql()
  const rows = await sql`
    SELECT id, username, email, mobile, full_name, role, status, session_version,
           must_change_password, created_at, last_login_at
    FROM app_users WHERE id = ${token.sub} LIMIT 1
  `
  const user = rows[0]
  if (!user || user.status !== 'active' || Number(user.session_version) !== Number(token.sv)) {
    throw new HttpError(401, 'Your session is no longer valid. Please sign in again.', 'SESSION_INVALID')
  }
  if (allowedRoles && !allowedRoles.includes(user.role)) throw new HttpError(403, 'You do not have permission to perform this action.', 'FORBIDDEN')
  return user
}

export async function enforceRateLimit(req, scope, subject, limit, windowMinutes) {
  const sql = getSql()
  const forwarded = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim()
  const ip = forwarded || String(req.headers['x-real-ip'] || 'unknown')
  const keyHash = sha256(`${scope}|${String(subject || '').toLowerCase()}|${ip}`)
  const counts = await sql`
    SELECT count(*)::int AS count FROM rate_limit_events
    WHERE key_hash = ${keyHash} AND scope = ${scope}
      AND created_at > now() - (${Number(windowMinutes)} * interval '1 minute')
  `
  if (Number(counts[0]?.count || 0) >= Number(limit)) throw new HttpError(429, 'Too many attempts. Please wait and try again.', 'RATE_LIMITED')
  await sql`INSERT INTO rate_limit_events (key_hash, scope, created_at) VALUES (${keyHash}, ${scope}, now())`
  if (Math.random() < 0.02) await sql`DELETE FROM rate_limit_events WHERE created_at < now() - interval '2 days'`
}

export async function audit(actorId, action, subjectType, subjectId, detail = {}) {
  try {
    const sql = getSql()
    await sql`INSERT INTO audit_events (actor_user_id, action, subject_type, subject_id, detail, created_at)
      VALUES (${actorId || null}, ${action}, ${subjectType}, ${subjectId || null}, ${JSON.stringify(detail)}::jsonb, now())`
  } catch (error) {
    console.error('[qpn-audit]', error?.message || error)
  }
}
