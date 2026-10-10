import { HttpError } from './http.js'

export function appBaseUrl() {
  const configured = process.env.APP_BASE_URL
  if (configured) return configured.replace(/\/$/, '')
  const vercelUrl = String(process.env.VERCEL_URL || '')
  if (process.env.NODE_ENV !== 'production' && (!vercelUrl || /^(localhost|127\.0\.0\.1)(:\d+)?$/i.test(vercelUrl))) return `http://${vercelUrl || 'localhost:3000'}`
  if (vercelUrl) return `https://${vercelUrl}`
  return 'http://localhost:5173'
}

export function isDeployedEnvironment() {
  return process.env.NODE_ENV === 'production' || ['production', 'preview'].includes(String(process.env.VERCEL_ENV || '').toLowerCase())
}

function escapeHtml(value) {
  return String(value || '').replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]))
}

export async function sendAccountLink({ to, name, url, purpose }) {
  const apiKey = process.env.RESEND_API_KEY
  const from = process.env.EMAIL_FROM
  const subject = purpose === 'activate' ? 'Activate your Question Paper Navigator account' : 'Reset your Question Paper Navigator password'
  const action = purpose === 'activate' ? 'Set your password and activate your account' : 'Choose a new password'
  if (!apiKey || !from) {
    if (isDeployedEnvironment()) {
      throw new HttpError(503, 'Email delivery is not configured. Set RESEND_API_KEY and EMAIL_FROM before approvals or password resets.', 'EMAIL_NOT_CONFIGURED')
    }
    console.info(`[qpn-local-email] ${purpose} link for ${to}: ${url}`)
    return { sent: false, localPreviewUrl: url }
  }
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from,
      to: [to],
      subject,
      html: `<div style="font-family:Arial,sans-serif;line-height:1.6;max-width:600px;margin:auto"><h2>Question Paper Navigator</h2><p>Hello ${escapeHtml(name)},</p><p>${action} using the one-time link below. It expires in 24 hours. If you did not request this, you can ignore this message.</p><p><a href="${escapeHtml(url)}" style="display:inline-block;background:#2563eb;color:#fff;padding:12px 18px;border-radius:8px;text-decoration:none">${action}</a></p><p>If the button does not work, open: ${escapeHtml(url)}</p></div>`,
    }),
  })
  if (!response.ok) {
    const message = await response.text().catch(() => '')
    console.error('[qpn-email] Resend rejected a message:', response.status, message.slice(0, 300))
    throw new HttpError(502, 'Email provider could not send the message. Check the verified sender domain and Resend settings.', 'EMAIL_SEND_FAILED')
  }
  return { sent: true }
}

export function activationUrl(token) { return `${appBaseUrl()}/activate?token=${encodeURIComponent(token)}` }
export function resetUrl(token) { return `${appBaseUrl()}/reset-password?token=${encodeURIComponent(token)}` }
