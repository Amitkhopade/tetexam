import { getSql } from '../_lib/db.js'
import { assertSameOrigin, handleError, json, methodOnly, readJson, HttpError } from '../_lib/http.js'
import { audit, enforceRateLimit, randomToken, requireUser, sha256 } from '../_lib/security.js'
import { activationUrl, sendAccountLink, isDeployedEnvironment } from '../_lib/email.js'

function emailConfigured() {
  if (isDeployedEnvironment() && (!process.env.RESEND_API_KEY || !process.env.EMAIL_FROM)) throw new HttpError(503, 'Set RESEND_API_KEY and EMAIL_FROM before inviting users in production.', 'EMAIL_NOT_CONFIGURED')
}

export default async function handler(req, res) {
  try {
    const actor = await requireUser(req, ['admin'])
    const sql = getSql()
    if (req.method === 'GET') {
      const rows = await sql`SELECT id, username, email, mobile, full_name, role, status, created_at, last_login_at, approved_at, must_change_password FROM app_users ORDER BY created_at DESC LIMIT 500`
      return json(res, 200, { ok: true, users: rows })
    }
    if (req.method !== 'POST') { res.setHeader('Allow', 'GET, POST'); return json(res, 405, { ok: false, message: 'Use GET or POST.' }) }
    assertSameOrigin(req)
    await enforceRateLimit(req, 'admin-users', actor.id, 60, 60)
    const body = await readJson(req, 32 * 1024)
    const action = String(body.action || '')
    if (action === 'invite') {
      emailConfigured()
      const fullName = String(body.full_name || '').trim()
      const username = String(body.username || '').trim().toLowerCase()
      const email = String(body.email || '').trim().toLowerCase()
      const mobile = String(body.mobile || '').trim().replace(/[\s()-]/g, '')
      const role = String(body.role || 'student')
      if (fullName.length < 2 || fullName.length > 100) throw new HttpError(400, 'Enter a valid full name.')
      if (!/^[a-z0-9][a-z0-9._-]{2,31}$/.test(username)) throw new HttpError(400, 'Username must be 3–32 lowercase letters, numbers, dots, underscores or hyphens.')
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new HttpError(400, 'Enter a valid email address.')
      if (!/^\+?[0-9]{10,15}$/.test(mobile)) throw new HttpError(400, 'Enter a valid mobile number.')
      if (!['student','educator','admin'].includes(role)) throw new HttpError(400, 'Invalid role.')
      const duplicate = await sql`SELECT 1 FROM app_users WHERE lower(username)=${username} OR lower(email)=${email} LIMIT 1`
      if (duplicate.length) throw new HttpError(409, 'Username or email already exists.')
      const rows = await sql`INSERT INTO app_users (username,email,mobile,full_name,role,status,password_hash,must_change_password,session_version,approved_by,approved_at,created_at)
        VALUES (${username},${email},${mobile},${fullName},${role},'active',NULL,false,1,${actor.id},now(),now()) RETURNING id, username, email, full_name`
      const user = rows[0]
      const token = randomToken()
      await sql`INSERT INTO account_tokens (token_hash,user_id,purpose,expires_at,created_at) VALUES (${sha256(token)},${user.id},'activate',now()+interval '24 hours',now())`
      await audit(actor.id, 'user_invited', 'user', user.id, { role })
      const mail = await sendAccountLink({ to: user.email, name: user.full_name, url: activationUrl(token), purpose: 'activate' })
      return json(res, 201, { ok: true, message: `Invitation sent to ${user.email}.`, local_preview_url: mail.localPreviewUrl || null })
    }
    if (action === 'resend_activation') {
      emailConfigured()
      const userId = String(body.user_id || '')
      const rows = await sql`SELECT id, email, full_name, password_hash, status FROM app_users WHERE id=${userId} LIMIT 1`
      const user = rows[0]
      if (!user || user.status !== 'active' || user.password_hash) throw new HttpError(400, 'This account does not need activation.')
      await sql`UPDATE account_tokens SET used_at=now() WHERE user_id=${user.id} AND purpose='activate' AND used_at IS NULL`
      const token = randomToken()
      await sql`INSERT INTO account_tokens (token_hash,user_id,purpose,expires_at,created_at) VALUES (${sha256(token)},${user.id},'activate',now()+interval '24 hours',now())`
      const mail = await sendAccountLink({ to:user.email, name:user.full_name, url:activationUrl(token), purpose:'activate' })
      return json(res, 200, { ok: true, message: `Activation link resent to ${user.email}.`, local_preview_url: mail.localPreviewUrl || null })
    }
    if (action === 'update') {
      const userId = String(body.user_id || '')
      const role = String(body.role || '')
      const status = String(body.status || '')
      if (!['student','educator','admin'].includes(role)) throw new HttpError(400, 'Invalid role.')
      if (!['active','disabled'].includes(status)) throw new HttpError(400, 'Invalid status.')
      if (userId === actor.id && (status !== 'active' || role !== 'admin')) throw new HttpError(400, 'You cannot disable or demote your own admin account.')
      const targetRows = await sql`SELECT id, role, status FROM app_users WHERE id=${userId} LIMIT 1`
      const target = targetRows[0]
      if (!target) throw new HttpError(404, 'User not found.')
      if (target.role === 'admin' && (role !== 'admin' || status !== 'active')) {
        const admins = await sql`SELECT count(*)::int AS count FROM app_users WHERE role='admin' AND status='active'`
        if (Number(admins[0]?.count || 0) <= 1) throw new HttpError(400, 'The last active admin cannot be demoted or disabled.')
      }
      await sql`UPDATE app_users SET role=${role}, status=${status}, session_version=session_version+1 WHERE id=${userId}`
      await audit(actor.id, 'user_updated', 'user', userId, { role, status })
      return json(res, 200, { ok: true, message: 'User updated. Any previous sessions have been invalidated.' })
    }
    throw new HttpError(400, 'Unknown action.')
  } catch (error) { handleError(res, error) }
}
