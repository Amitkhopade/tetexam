import { getSql } from '../_lib/db.js'
import { assertSameOrigin, handleError, json, methodOnly, readJson } from '../_lib/http.js'
import { enforceRateLimit, randomToken, sha256 } from '../_lib/security.js'
import { appBaseUrl, resetUrl, sendAccountLink } from '../_lib/email.js'

export default async function handler(req, res) {
  if (!methodOnly(req, res, 'POST')) return
  try {
    assertSameOrigin(req)
    const body = await readJson(req, 16 * 1024)
    const email = String(body.email || '').trim().toLowerCase()
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json(res, 200, { ok: true, message: 'If an eligible account exists, a reset link will be sent.' })
    await enforceRateLimit(req, 'forgot-password-ip', '', 8, 60)
    await enforceRateLimit(req, 'forgot-password-email', email, 3, 60)
    const sql = getSql()
    const rows = await sql`SELECT id, email, full_name FROM app_users WHERE lower(email) = ${email} AND status = 'active' AND password_hash IS NOT NULL LIMIT 1`
    if (rows.length) {
      const user = rows[0]
      const token = randomToken()
      await sql`INSERT INTO account_tokens (token_hash, user_id, purpose, expires_at, created_at) VALUES (${sha256(token)}, ${user.id}, 'password_reset', now() + interval '1 hour', now())`
      await sendAccountLink({ to: user.email, name: user.full_name, url: resetUrl(token), purpose: 'password_reset' })
    }
    json(res, 200, { ok: true, message: 'If an eligible account exists, a reset link will be sent.' })
  } catch (error) { handleError(res, error) }
}
