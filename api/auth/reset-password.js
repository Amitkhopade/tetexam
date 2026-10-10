import { getSql } from '../_lib/db.js'
import { assertSameOrigin, handleError, json, methodOnly, readJson, HttpError } from '../_lib/http.js'
import { hashPassword, sha256 } from '../_lib/security.js'

export default async function handler(req, res) {
  if (!methodOnly(req, res, 'POST')) return
  try {
    assertSameOrigin(req)
    const body = await readJson(req, 16 * 1024)
    const token = String(body.token || '')
    const passwordHash = await hashPassword(String(body.password || ''))
    const sql = getSql()
    const rows = await sql`WITH consumed AS (
        UPDATE account_tokens t SET used_at = now()
        WHERE t.token_hash = ${sha256(token)} AND t.purpose = 'password_reset' AND t.used_at IS NULL AND t.expires_at > now()
          AND EXISTS (SELECT 1 FROM app_users u WHERE u.id = t.user_id AND u.status = 'active')
        RETURNING t.user_id
      )
      UPDATE app_users u SET password_hash = ${passwordHash}, must_change_password = false, session_version = session_version + 1
      WHERE u.id = (SELECT user_id FROM consumed) AND u.status = 'active'
      RETURNING u.id`
    if (!rows.length) throw new HttpError(400, 'This reset link is invalid, expired, already used, or unavailable for this account.', 'TOKEN_INVALID')
    json(res, 200, { ok: true, message: 'Password reset. Please sign in with your new password.' })
  } catch (error) { handleError(res, error) }
}
