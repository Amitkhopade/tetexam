// Runs the Vercel-style handlers in /api on Netlify Functions.
import { Readable } from 'node:stream'
import h0 from '../../api/admin/ai/run.js'
import h1 from '../../api/admin/assessments.js'
import h2 from '../../api/admin/payments.js'
import h3 from '../../api/admin/products.js'
import h4 from '../../api/admin/requests.js'
import h5 from '../../api/admin/users.js'
import h6 from '../../api/auth/activate.js'
import h7 from '../../api/auth/change-password.js'
import h8 from '../../api/auth/forgot-password.js'
import h9 from '../../api/auth/login.js'
import h10 from '../../api/auth/logout.js'
import h11 from '../../api/auth/me.js'
import h12 from '../../api/auth/register.js'
import h13 from '../../api/auth/reset-password.js'
import h14 from '../../api/billing/access.js'
import h15 from '../../api/billing/products.js'
import h16 from '../../api/catalog.js'
import h17 from '../../api/exams/load.js'
import h18 from '../../api/health.js'
import h19 from '../../api/newsletter/subscribe.js'
import h20 from '../../api/payments/create-order.js'
import h21 from '../../api/payments/verify.js'
import h22 from '../../api/payments/webhook.js'

const routes = {
  'admin/ai/run': h0,
  'admin/assessments': h1,
  'admin/payments': h2,
  'admin/products': h3,
  'admin/requests': h4,
  'admin/users': h5,
  'auth/activate': h6,
  'auth/change-password': h7,
  'auth/forgot-password': h8,
  'auth/login': h9,
  'auth/logout': h10,
  'auth/me': h11,
  'auth/register': h12,
  'auth/reset-password': h13,
  'billing/access': h14,
  'billing/products': h15,
  'catalog': h16,
  'exams/load': h17,
  'health': h18,
  'newsletter/subscribe': h19,
  'payments/create-order': h20,
  'payments/verify': h21,
  'payments/webhook': h22,}

function toNodeRequest(request, body, url) {
  const req = Readable.from(body.length ? [body] : [])
  req.method = request.method
  req.url = url.pathname + url.search
  req.headers = Object.fromEntries(request.headers)
  req.query = Object.fromEntries(url.searchParams)
  return req
}

function createNodeResponse(resolve) {
  const headers = new Headers()
  const chunks = []
  const res = {
    statusCode: 200,
    headersSent: false,
    setHeader(name, value) { headers.delete(name); for (const v of [].concat(value)) headers.append(name, String(v)); return res },
    getHeader(name) { return headers.get(name) ?? undefined },
    removeHeader(name) { headers.delete(name) },
    write(chunk) { if (chunk != null) chunks.push(Buffer.from(chunk)); return true },
    end(chunk) {
      if (chunk != null) chunks.push(Buffer.from(chunk))
      res.headersSent = true
      const noBody = [204, 304].includes(res.statusCode)
      resolve(new Response(noBody ? null : Buffer.concat(chunks), { status: res.statusCode, headers }))
      return res
    },
  }
  return res
}

export default async (request) => {
  const url = new URL(request.url)
  const route = url.pathname.replace(/^\/api\/?/, '').replace(/\/+$/, '')
  const handler = routes[route]
  if (!handler) {
    return Response.json({ ok: false, message: 'Not found.', code: 'NOT_FOUND' }, { status: 404 })
  }
  const body = ['GET', 'HEAD'].includes(request.method) ? Buffer.alloc(0) : Buffer.from(await request.arrayBuffer())
  const req = toNodeRequest(request, body, url)
  return new Promise((resolve, reject) => {
    const res = createNodeResponse(resolve)
    Promise.resolve(handler(req, res)).catch(reject)
  })
}

export const config = { path: '/api/*' }
