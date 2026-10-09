export const MAX_AI_JSON_BODY_BYTES = 80 * 1024 * 1024

function safeJsonFileName(name, fallback) {
  const clean = String(name || fallback).replace(/[^A-Za-z0-9._-]/g, '_')
  return clean || fallback
}

export async function readJsonBody(req, maxBytes = MAX_AI_JSON_BODY_BYTES) {
  const chunks = []
  let size = 0
  for await (const chunk of req) {
    size += chunk.length
    if (size > maxBytes) throw new Error('Request body is too large. Keep the combined PDFs below the configured limit.')
    chunks.push(chunk)
  }
  return JSON.parse(Buffer.concat(chunks).toString('utf8'))
}

function dataUrlParts(dataUrl) {
  const match = /^data:([^;]+);base64,(.+)$/s.exec(String(dataUrl || ''))
  if (!match) throw new Error('Invalid PDF data URL.')
  return { mimeType: match[1], base64: match[2] }
}

function requirePdf(input, label) {
  if (!input?.dataUrl) throw new Error(`${label} is required.`)
  const parts = dataUrlParts(input.dataUrl)
  if (parts.mimeType !== 'application/pdf') throw new Error(`${label} must be a PDF.`)
  return { ...input, ...parts }
}

function extractOpenAiText(body) {
  if (typeof body?.output_text === 'string') return body.output_text
  const texts = []
  for (const item of body?.output || []) {
    for (const content of item?.content || []) if (typeof content?.text === 'string') texts.push(content.text)
  }
  return texts.join('\n').trim()
}

function extractAnthropicText(body) {
  return (body?.content || []).filter((item) => item?.type === 'text').map((item) => item.text).join('\n').trim()
}

function extractGeminiText(body) {
  return (body?.candidates || []).flatMap((candidate) => candidate?.content?.parts || []).map((part) => part?.text || '').join('\n').trim()
}

function extractOpenRouterText(body) {
  const content = body?.choices?.[0]?.message?.content
  if (typeof content === 'string') return content.trim()
  if (Array.isArray(content)) return content.map((part) => part?.text || '').join('\n').trim()
  return ''
}

export async function providerFetch(url, options, fetchImpl = fetch) {
  const response = await fetchImpl(url, options)
  const text = await response.text()
  let body = {}
  try { body = JSON.parse(text) } catch { body = { raw: text } }
  if (!response.ok) {
    const message = body?.error?.message || body?.error?.details || body?.message || body?.raw || `Provider request failed (${response.status})`
    throw new Error(String(message).slice(0, 1200))
  }
  return body
}

export function openAiPayload({ model, questionPdf, answerPdf, prompt, mode, history }) {
  const content = []
  if (questionPdf) content.push({ type: 'input_file', filename: safeJsonFileName(questionPdf.name, 'question-paper.pdf'), file_data: questionPdf.dataUrl, detail: 'high' })
  if (answerPdf) content.push({ type: 'input_file', filename: safeJsonFileName(answerPdf.name, 'answer-key.pdf'), file_data: answerPdf.dataUrl, detail: 'high' })
  const transcript = mode === 'chat' && history?.length ? `\nPrior conversation:\n${history.map((h) => `${h.role}: ${h.content}`).join('\n')}` : ''
  content.push({ type: 'input_text', text: `${prompt}${transcript}` })
  return { model, input: [{ role: 'user', content }], ...(mode === 'generate' ? { text: { format: { type: 'json_object' } } } : {}), max_output_tokens: 100000 }
}

export function anthropicPayload({ model, questionPdf, answerPdf, prompt, mode, history }) {
  const content = []
  if (questionPdf) content.push({ type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: questionPdf.base64 } })
  if (answerPdf) content.push({ type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: answerPdf.base64 } })
  const transcript = mode === 'chat' && history?.length ? `\nPrior conversation:\n${history.map((h) => `${h.role}: ${h.content}`).join('\n')}` : ''
  content.push({ type: 'text', text: `${prompt}${transcript}` })
  return { model, max_tokens: 100000, messages: [{ role: 'user', content }] }
}

export function geminiPayload({ questionPdf, answerPdf, prompt, mode, history }) {
  const parts = [{ text: `${prompt}${mode === 'chat' && history?.length ? `\nPrior conversation:\n${history.map((h) => `${h.role}: ${h.content}`).join('\n')}` : ''}` }]
  if (questionPdf) parts.push({ inlineData: { mimeType: 'application/pdf', data: questionPdf.base64 } })
  if (answerPdf) parts.push({ inlineData: { mimeType: 'application/pdf', data: answerPdf.base64 } })
  return { contents: [{ role: 'user', parts }], generationConfig: mode === 'generate' ? { responseMimeType: 'application/json', maxOutputTokens: 64000 } : { maxOutputTokens: 16000 } }
}

export function openRouterPayload({ model, questionPdf, answerPdf, prompt, mode, history }) {
  const content = [{ type: 'text', text: `${prompt}${mode === 'chat' && history?.length ? `\nPrior conversation:\n${history.map((h) => `${h.role}: ${h.content}`).join('\n')}` : ''}` }]
  if (questionPdf) content.push({ type: 'file', file: { filename: safeJsonFileName(questionPdf.name, 'question-paper.pdf'), file_data: questionPdf.dataUrl } })
  if (answerPdf) content.push({ type: 'file', file: { filename: safeJsonFileName(answerPdf.name, 'answer-key.pdf'), file_data: answerPdf.dataUrl } })
  return { model, messages: [{ role: 'user', content }], ...(mode === 'generate' ? { response_format: { type: 'json_object' } } : {}), max_tokens: 100000, plugins: [{ id: 'file-parser', pdf: { engine: 'mistral-ocr' } }] }
}

export async function runAdminAiRequest(body, fetchImpl = fetch) {
  const provider = String(body?.provider || '').toLowerCase()
  const model = String(body?.model || '').trim()
  const apiKey = String(body?.apiKey || '').trim()
  const mode = body?.mode === 'chat' ? 'chat' : 'generate'
  if (!provider || !model || !apiKey) throw new Error('Provider, model and API key are required.')
  const questionPdf = body.questionPdf ? requirePdf(body.questionPdf, 'Question Paper PDF') : null
  const answerPdf = body.answerPdf ? requirePdf(body.answerPdf, 'Answer Key PDF') : null
  if (mode === 'generate' && (!questionPdf || !answerPdf)) throw new Error('Generate mode requires both Question Paper PDF and Answer Key PDF.')

  let responseBody
  let text = ''
  const params = { provider, model, questionPdf, answerPdf, prompt: body.prompt || '', mode, history: body.history || [] }
  if (provider === 'openai') {
    responseBody = await providerFetch('https://api.openai.com/v1/responses', { method: 'POST', headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' }, body: JSON.stringify(openAiPayload(params)) }, fetchImpl)
    text = extractOpenAiText(responseBody)
  } else if (provider === 'anthropic') {
    responseBody = await providerFetch('https://api.anthropic.com/v1/messages', { method: 'POST', headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' }, body: JSON.stringify(anthropicPayload(params)) }, fetchImpl)
    text = extractAnthropicText(responseBody)
  } else if (provider === 'gemini') {
    responseBody = await providerFetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, { method: 'POST', headers: { 'x-goog-api-key': apiKey, 'Content-Type': 'application/json' }, body: JSON.stringify(geminiPayload(params)) }, fetchImpl)
    text = extractGeminiText(responseBody)
  } else if (provider === 'openrouter') {
    responseBody = await providerFetch('https://openrouter.ai/api/v1/chat/completions', { method: 'POST', headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json', 'X-Title': 'Question Paper Navigator Admin AI' }, body: JSON.stringify(openRouterPayload(params)) }, fetchImpl)
    text = extractOpenRouterText(responseBody)
  } else {
    throw new Error(`Unsupported provider: ${provider}`)
  }
  if (!text) throw new Error('The provider returned no text output.')
  return { ok: true, provider, model, mode, text }
}

export async function handleAdminAiHttp(req, res, fetchImpl = fetch) {
  if (req.method !== 'POST') {
    res.statusCode = 405
    res.setHeader('content-type', 'application/json')
    res.end(JSON.stringify({ message: 'Method not allowed' }))
    return
  }
  if (req.headers['x-qpn-admin-ai'] !== '1') {
    res.statusCode = 403
    res.setHeader('content-type', 'application/json')
    res.end(JSON.stringify({ message: 'Admin AI endpoint requires the local admin page.' }))
    return
  }
  try {
    const body = await readJsonBody(req)
    const result = await runAdminAiRequest(body, fetchImpl)
    res.statusCode = 200
    res.setHeader('content-type', 'application/json')
    res.end(JSON.stringify(result))
  } catch (error) {
    res.statusCode = 400
    res.setHeader('content-type', 'application/json')
    res.end(JSON.stringify({ ok: false, message: error?.message || 'AI request failed.' }))
  }
}
