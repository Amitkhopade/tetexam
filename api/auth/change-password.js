import { getSql } from '../_lib/db.js'
import { assertSameOrigin, handleError, json, methodOnly, readJson, HttpError } from '../_lib/http.js'
import { hashPassword, publicUser, requireUser, setSessionCookie, verifyPassword } from '../_lib/security.js'

export default async function handler(req, res) {
  if (!methodOnly(req, res, 'POST')) return
  try {
    assertSameOrigin(req)
    const user = await requireUser(req)
    const body = await readJson(req, 16 * 1024)
    const currentPassword = String(body.current_password || '')
    const newPassword = String(body.new_password || '')
    if (!await verifyPassword(currentPassword, user.password_hash)) throw new HttpError(400, 'Current password is incorrect.', 'CURRENT_PASSWORD_INVALID')
    if (currentPassword === newPassword) throw new HttpError(400, 'New password must be different from the current password.')
    const passwordHash = await hashPassword(newPassword)
    const sql = getSql()
    const rows = await sql`UPDATE app_users SET password_hash = ${passwordHash}, must_change_password = false, session_version = session_version + 1 WHERE id = ${user.id} RETURNING *`
    setSessionCookie(res, rows[0])
    json(res, 200, { ok: true, user: publicUser(rows[0]), message: 'Password changed successfully.' })
  } catch (error) { handleError(res, error) }
}
