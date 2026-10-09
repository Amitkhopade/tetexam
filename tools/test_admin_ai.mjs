import assert from 'node:assert/strict'
import { runAdminAiRequest } from '../frontend/src/lib/adminAiServer.js'
import { AI_PROVIDERS, normalizeGeneratedPackage, parseJsonFromModelText } from '../frontend/src/lib/adminAi.js'

const pdf = { name: 'paper.pdf', dataUrl: 'data:application/pdf;base64,AA==' }
const key = { name: 'key.pdf', dataUrl: 'data:application/pdf;base64,AA==' }

function response(value, status = 200) {
  return new Response(JSON.stringify(value), { status, headers: { 'content-type': 'application/json' } })
}

function fakeFetchFor(provider) {
  return async (url, options) => {
    const body = JSON.parse(options.body)
    assert.equal(options.method, 'POST')
    assert.ok(url.startsWith('https://'))
    if (provider === 'openai') {
      assert.equal(body.model, 'gpt-6-astra')
      assert.ok(body.input?.[0]?.content?.some((item) => item.type === 'input_file'))
      return response({ output_text: '{"questions":[],"answer_key":{},"paper":{}}' })
    }
    if (provider === 'anthropic') {
      assert.equal(body.model, 'claude-opus-5-5')
      assert.ok(body.messages?.[0]?.content?.some((item) => item.type === 'document'))
      return response({ content: [{ type: 'text', text: '{"questions":[],"answer_key":{},"paper":{}}' }] })
    }
    if (provider === 'gemini') {
      assert.equal(body.generationConfig?.maxOutputTokens, 64000)
      assert.equal(body.contents?.[0]?.role, 'user')
      assert.ok(body.contents?.[0]?.parts?.some((item) => item.inlineData?.mimeType === 'application/pdf'))
      return response({ candidates: [{ content: { parts: [{ text: '{"questions":[],"answer_key":{},"paper":{}}' }] } }] })
    }
    assert.equal(body.model, '~openai/gpt-sol-latest')
    assert.ok(body.messages?.[0]?.content?.some((item) => item.type === 'file'))
    return response({ choices: [{ message: { content: '{"questions":[],"answer_key":{},"paper":{}}' } }] })
  }
}

for (const [provider, model] of [
  ['openai', 'gpt-6-astra'],
  ['anthropic', 'claude-opus-5-5'],
  ['gemini', 'gemini-3.8-flash'],
  ['openrouter', '~openai/gpt-sol-latest'],
]) {
  assert.equal(AI_PROVIDERS[provider].defaultModel, model, `${provider} UI default must match the tested API model` )
  const result = await runAdminAiRequest({ provider, model, apiKey: 'test-key', mode: 'generate', questionPdf: pdf, answerPdf: key, prompt: 'return json' }, fakeFetchFor(provider))
  assert.equal(result.ok, true)
  assert.equal(parseJsonFromModelText(result.text).questions.length, 0)
}

await assert.rejects(
  () => runAdminAiRequest({ provider: 'openai', model: 'gpt-6-astra', apiKey: 'test-key', mode: 'generate', questionPdf: pdf }, fakeFetchFor('openai')),
  /Generate mode requires both Question Paper PDF and Answer Key PDF/
)

const normalized = normalizeGeneratedPackage({
  questions: [{ question_number: 1, language: 'en', exam: 'EXAM', booklet_code: 'X', text: 'What?', options: { A: 'a', B: 'b', C: 'c', D: 'd' }, correct_answer: '2' }],
  answer_key: { answers: { '1': '2' } },
  paper: { paper_id: 'EXAM-PAPER-I-X', booklet_code: 'X', exam: 'EXAM', question_count: 1, duration_minutes: 150 },
})
assert.equal(normalized.questions.questions[0].options['2'], 'b')
assert.equal(normalized.questions.questions[0].correct_answer, undefined)
assert.equal(normalized.paper.duration_minutes, 150)

console.log('ADMIN AI PROVIDER + NORMALIZATION TEST PASS')
