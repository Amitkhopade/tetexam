import { handleError, json, methodOnly } from '../_lib/http.js'
import { publicUser, requireUser } from '../_lib/security.js'

export default async function handler(req, res) {
  if (!methodOnly(req, res, 'GET')) return
  try {
    const user = await requireUser(req)
    json(res, 200, { ok: true, user: publicUser(user) })
  } catch (error) {
    const status = Number(error?.status) || 500
    if (status === 401) return json(res, 200, { ok: true, user: null })
    handleError(res, error)
  }
}
