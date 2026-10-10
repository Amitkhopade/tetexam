import { getSql } from '../_lib/db.js'
import { assertSameOrigin, handleError, json, methodOnly, readJson, HttpError } from '../_lib/http.js'
import { audit, enforceRateLimit, randomToken, requireUser, sha256 } from '../_lib/security.js'
import { activationUrl, sendAccountLink, isDeployedEnvironment } from '../_lib/email.js'

function emailConfigured() {
  if (isDeployedEnvironment() && (!process.env.RESEND_API_KEY || !process.env.EMAIL_FROM)) {
    throw new HttpError(503, 'Set RESEND_API_KEY and EMAIL_FROM before approving accounts in production.', 'EMAIL_NOT_CONFIGURED')
  }
}

export default async function handler(req, res) {
  try {
    if (req.method === 'GET') {
      const actor = await requireUser(req, ['admin'])
      const sql = getSql()
      const rows = await sql`SELECT request_id, username, email, mobile, full_name, note, status, created_at FROM signup_requests WHERE status = 'pending' ORDER BY created_at ASC LIMIT 200`
      return json(res, 200, { ok: true, requests: rows, actor: actor.username })
    }
    if (req.method !== 'POST') { res.setHeader('Allow', 'GET, POST'); return json(res, 405, { ok: false, message: 'Use GET or POST.' }) }
    assertSameOrigin(req)
    const actor = await requireUser(req, ['admin'])
    await enforceRateLimit(req, 'admin-account-requests', actor.id, 60, 60)
    const body = await readJson(req, 32 * 1024)
    const requestId = String(body.request_id || '')
    const action = String(body.action || '')
    const sql = getSql()
    const requestRows = await sql`SELECT * FROM signup_requests WHERE request_id = ${requestId} AND status = 'pending' LIMIT 1`
    const request = requestRows[0]
    if (!request) throw new HttpError(404, 'Pending account request not found.')
    if (action === 'reject') {
      await sql`UPDATE signup_requests SET status='rejected', decided_at=now(), decided_by=${actor.id} WHERE request_id=${request.request_id} AND status='pending'`
      await audit(actor.id, 'signup_rejected', 'signup_request', request.request_id, {})
      return json(res, 200, { ok: true, message: 'Request rejected.' })
    }
    if (action !== 'approve') throw new HttpError(400, 'Action must be approve or reject.')
    emailConfigured()
    const role = String(body.role || 'student')
    if (!['student', 'educator', 'admin'].includes(role)) throw new HttpError(400, 'Invalid role.')
    const existing = await sql`SELECT 1 FROM app_users WHERE lower(email)=${request.email} OR lower(username)=${request.username} LIMIT 1`
    if (existing.length) throw new HttpError(409, 'A user with this username or email already exists.')
    const userRows = await sql`
      INSERT INTO app_users (username,email,mobile,full_name,role,status,password_hash,must_change_password,session_version,approved_by,approved_at,created_at)
      VALUES (${request.username},${request.email},${request.mobile},${request.full_name},${role},'active',NULL,false,1,${actor.id},now(),now())
      RETURNING id, username, email, full_name
    `
    const newUser = userRows[0]
    const token = randomToken()
    await sql`INSERT INTO account_tokens (token_hash,user_id,purpose,expires_at,created_at) VALUES (${sha256(token)},${newUser.id},'activate',now()+interval '24 hours',now())`
    await sql`UPDATE signup_requests SET status='approved', decided_at=now(), decided_by=${actor.id}, assigned_role=${role} WHERE request_id=${request.request_id}`
    await audit(actor.id, 'signup_approved', 'user', newUser.id, { role })
    const emailResult = await sendAccountLink({ to: newUser.email, name: newUser.full_name, url: activationUrl(token), purpose: 'activate' })
    json(res, 200, { ok: true, message: `Approved ${newUser.username} as ${role}. A one-time password setup link was sent.`, local_preview_url: emailResult.localPreviewUrl || null })
  } catch (error) { handleError(res, error) }
}
