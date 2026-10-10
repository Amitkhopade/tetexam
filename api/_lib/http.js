export class HttpError extends Error {
  constructor(status, message, code = 'REQUEST_FAILED') {
    super(message)
    this.status = status
    this.code = code
  }
}

export function json(res, status, payload, extraHeaders = {}) {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.setHeader('Cache-Control', 'no-store')
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.setHeader('Referrer-Policy', 'same-origin')
  for (const [key, value] of Object.entries(extraHeaders)) res.setHeader(key, value)
  res.end(JSON.stringify(payload))
}

export function methodOnly(req, res, method) {
  if (req.method !== method) {
    res.setHeader('Allow', method)
    json(res, 405, { ok: false, message: `Use ${method}.`, code: 'METHOD_NOT_ALLOWED' })
    return false
  }
  return true
}

export async function readJson(req, maxBytes = 1_000_000) {
  if (req.body && typeof req.body === 'object') return req.body
  const chunks = []
  let total = 0
  for await (const chunk of req) {
    total += chunk.length
    if (total > maxBytes) throw new HttpError(413, 'Request body is too large.', 'BODY_TOO_LARGE')
    chunks.push(Buffer.from(chunk))
  }
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}') }
  catch { throw new HttpError(400, 'Request body must be valid JSON.', 'INVALID_JSON') }
}

export function assertSameOrigin(req) {
  const origin = req.headers.origin
  if (!origin) {
    if (process.env.NODE_ENV === 'production' || process.env.VERCEL === '1') {
      throw new HttpError(403, 'Missing request origin.', 'ORIGIN_REQUIRED')
    }
    return
  }
  let originUrl
  try { originUrl = new URL(origin) }
  catch { throw new HttpError(403, 'Invalid request origin.', 'INVALID_ORIGIN') }
  const allowed = new Set()
  const base = process.env.APP_BASE_URL
  if (base) {
    try { allowed.add(new URL(base).origin) } catch {}
  }
  const host = String(req.headers.host || '').toLowerCase()
  if (host) {
    allowed.add(`https://${host}`)
    if (/^(localhost|127\.0\.0\.1)(:\d+)?$/.test(host)) allowed.add(`http://${host}`)
  }
  const vercelUrl = process.env.VERCEL_URL
  if (vercelUrl) allowed.add(`https://${vercelUrl}`)
  if (!allowed.has(originUrl.origin)) throw new HttpError(403, 'Cross-origin request blocked.', 'CROSS_ORIGIN')
}

export function handleError(res, error) {
  const status = Number(error?.status) || 500
  const safeMessage = status >= 500 ? 'The request could not be completed. Check server configuration and logs.' : error.message
  if (status >= 500) console.error('[qpn-api]', error?.code || error?.name || 'ERROR', error?.message || error)
  json(res, status, { ok: false, code: error?.code || 'REQUEST_FAILED', message: safeMessage })
}
