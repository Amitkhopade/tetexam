import { getSql } from '../_lib/db.js'
import { assertSameOrigin, handleError, json, methodOnly, readJson, HttpError } from '../_lib/http.js'
import { enforceRateLimit, audit } from '../_lib/security.js'

export default async function handler(req, res) {
  if (!methodOnly(req, res, 'POST')) return
  try {
    assertSameOrigin(req)
    const body = await readJson(req, 32 * 1024)
    const fullName = String(body.full_name || body.fullName || '').trim()
    const username = String(body.username || '').trim().toLowerCase()
    const email = String(body.email || '').trim().toLowerCase()
    const mobileRaw = String(body.mobile || '').trim()
    const mobile = mobileRaw.replace(/[\s()-]/g, '')
    const note = String(body.note || '').trim().slice(0, 500)
    if (fullName.length < 2 || fullName.length > 100) throw new HttpError(400, 'Enter your full name (2–100 characters).')
    if (!/^[a-z0-9][a-z0-9._-]{2,31}$/.test(username)) throw new HttpError(400, 'Username must be 3–32 characters and use letters, numbers, dots, underscores or hyphens.')
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) throw new HttpError(400, 'Enter a valid email address.')
    if (!/^\+?[0-9]{10,15}$/.test(mobile)) throw new HttpError(400, 'Enter a valid mobile number with country code if needed.')
    await enforceRateLimit(req, 'signup-ip', '', 8, 60)
    await enforceRateLimit(req, 'signup-email', email, 2, 1440)
    const sql = getSql()
    const exists = await sql`SELECT 1 FROM app_users WHERE lower(email) = ${email} OR lower(username) = ${username} LIMIT 1`
    if (exists.length) throw new HttpError(409, 'An account already exists for this username or email. Try signing in or use password reset.', 'ACCOUNT_EXISTS')
    const pending = await sql`SELECT 1 FROM signup_requests WHERE status = 'pending' AND (lower(email) = ${email} OR lower(username) = ${username}) LIMIT 1`
    if (pending.length) return json(res, 202, { ok: true, status: 'pending', message: 'Your account request is already awaiting administrator approval.' })
    const rows = await sql`
      INSERT INTO signup_requests (username, email, mobile, full_name, note, status, created_at)
      VALUES (${username}, ${email}, ${mobile}, ${fullName}, ${note}, 'pending', now())
      RETURNING request_id, created_at
    `
    await audit(null, 'signup_requested', 'signup_request', rows[0].request_id, { email_domain: email.split('@')[1] })
    json(res, 201, { ok: true, status: 'pending', message: 'Your request was submitted. An administrator must approve it before you can activate your account.' })
  } catch (error) { handleError(res, error) }
}
