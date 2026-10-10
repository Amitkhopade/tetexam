import { runAdminAiRequest } from '../../../frontend/src/lib/adminAiServer.js'
import { audit, enforceRateLimit, requireUser } from '../../_lib/security.js'
import { assertSameOrigin, handleError, json, methodOnly, readJson } from '../../_lib/http.js'

// Vercel request payload limits are much lower than a local Vite middleware.
// Keep the JSON + base64 PDFs under the serverless platform's request ceiling.
export const config = { api: { bodyParser: false } }
const MAX_AI_BODY_BYTES = 4 * 1024 * 1024

export default async function handler(req, res) {
  if (!methodOnly(req, res, 'POST')) return
  try {
    assertSameOrigin(req)
    const actor = await requireUser(req, ['admin'])
    await enforceRateLimit(req, 'admin-ai', actor.id, 20, 60)
    const body = await readJson(req, MAX_AI_BODY_BYTES)
    const result = await runAdminAiRequest(body)
    await audit(actor.id, 'admin_ai_request', 'ai_generation', null, {
      provider: String(body.provider || '').slice(0, 40),
      model: String(body.model || '').slice(0, 100),
      mode: body.mode === 'chat' ? 'chat' : 'generate',
    })
    json(res, 200, result)
  } catch (error) {
    handleError(res, error)
  }
}
