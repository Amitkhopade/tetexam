import { getSql } from '../_lib/db.js'
import { assertSameOrigin, handleError, json, methodOnly, readJson, HttpError } from '../_lib/http.js'
import { enforceRateLimit, publicUser, setSessionCookie, verifyPassword } from '../_lib/security.js'

export default async function handler(req, res) {
  if (!methodOnly(req, res, 'POST')) return
  try {
    assertSameOrigin(req)
    const body = await readJson(req, 16 * 1024)
    const identifier = String(body.identifier || body.username || body.email || '').trim().toLowerCase()
    const password = String(body.password || '')
    if (!identifier || !password) throw new HttpError(400, 'Enter your username/email and password.')
    await enforceRateLimit(req, 'login-ip', '', 30, 15)
    await enforceRateLimit(req, 'login-user', identifier, 8, 15)
    const sql = getSql()
    const rows = await sql`SELECT * FROM app_users WHERE lower(username) = ${identifier} OR lower(email) = ${identifier} LIMIT 1`
    const user = rows[0]
    if (!user || user.status !== 'active' || !user.password_hash) {
      if (user?.status === 'pending') throw new HttpError(403, 'Your account request is awaiting administrator approval.', 'ACCOUNT_PENDING')
      if (user?.status === 'disabled') throw new HttpError(403, 'This account has been disabled. Contact an administrator.', 'ACCOUNT_DISABLED')
      if (user && user.status === 'active' && !user.password_hash) throw new HttpError(403, 'Your account is approved. Use the activation link sent to your email to set a password.', 'ACTIVATION_REQUIRED')
      if (!user) {
        const pending = await sql`SELECT 1 FROM signup_requests WHERE status='pending' AND (lower(username)=${identifier} OR lower(email)=${identifier}) LIMIT 1`
        if (pending.length) throw new HttpError(403, 'Your account request is awaiting administrator approval.', 'ACCOUNT_PENDING')
      }
      throw new HttpError(401, 'Invalid username/email or password.', 'INVALID_CREDENTIALS')
    }
    if (!await verifyPassword(password, user.password_hash)) throw new HttpError(401, 'Invalid username/email or password.', 'INVALID_CREDENTIALS')
    await sql`UPDATE app_users SET last_login_at = now() WHERE id = ${user.id}`
    const updated = { ...user, last_login_at: new Date().toISOString() }
    setSessionCookie(res, updated)
    json(res, 200, { ok: true, user: publicUser(updated) })
  } catch (error) { handleError(res, error) }
}
