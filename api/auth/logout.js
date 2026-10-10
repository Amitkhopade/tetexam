import { assertSameOrigin, handleError, json, methodOnly } from '../_lib/http.js'
import { clearSessionCookie } from '../_lib/security.js'

export default async function handler(req, res) {
  if (!methodOnly(req, res, 'POST')) return
  try {
    assertSameOrigin(req)
    clearSessionCookie(res)
    json(res, 200, { ok: true })
  } catch (error) { handleError(res, error) }
}
