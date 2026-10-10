import assert from 'node:assert/strict'
import { createHmac } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { validateAssessment } from '../api/_lib/dataset-validation.js'
import { isPermanentlyFreePaper } from '../api/_lib/free-papers.js'
import { verifyCheckoutSignature, verifyWebhookSignature } from '../api/_lib/payment-signatures.js'
import { assertSameOrigin, HttpError } from '../api/_lib/http.js'

const options = { '1': 'Option one', '2': 'Option two', '3': 'Option three', '4': 'Option four' }
const questions = {
  schema_version: '1.0.0', exam: 'STD10-DEMO', paper_id: 'STD10-MATH-SCI-DEMO-20', booklet_code: 'STD10DEMO',
  question_count: 20,
  questions: Array.from({ length: 20 }, (_, i) => ({
    id: `STD10DEMO-Q${i + 1}-EN`, question_number: i + 1, language: 'en',
    question_text: `Hypothetical test question ${i + 1}?`, options: { ...options },
  })),
}
const answers = {
  schema_version: '1.0.0', exam: 'STD10-DEMO', paper_id: 'STD10-MATH-SCI-DEMO-20', booklet_code: 'STD10DEMO',
  answers: Object.fromEntries(Array.from({ length: 20 }, (_, i) => [String(i + 1), String((i % 4) + 1)])),
  language_variants: {}, count: 20, status: 'verified',
}
const metadata = { paper_id: 'STD10-MATH-SCI-DEMO-20', booklet_code: 'STD10DEMO', question_count: 20 }

const valid = validateAssessment(questions, answers, metadata)
assert.equal(valid.ok, true, `Expected 20-question sample to validate: ${valid.errors.join(' | ')}`)
assert.equal(valid.logicalQuestionCount, 20)
assert.equal(valid.physicalQuestionCount, 20)

const missing = structuredClone(answers)
delete missing.answers['7']
assert.equal(validateAssessment(questions, missing, metadata).ok, false, 'Missing answer must fail validation')

const duplicate = structuredClone(questions)
duplicate.questions.push({ ...duplicate.questions[0] })
assert.equal(validateAssessment(duplicate, answers, metadata).ok, false, 'Duplicate question/language record must fail validation')

const badOption = structuredClone(questions)
delete badOption.questions[0].options['4']
assert.equal(validateAssessment(badOption, answers, metadata).ok, false, 'Missing option must fail validation')

for (const id of ['SED-24-I-PAPER-I-H', 'ACF-26-I-PAPER-I-K', 'ACF-26-I-PAPER-I-L', 'ACF-26-I-PAPER-I-M', 'ACF-26-I-PAPER-I-N']) {
  assert.equal(isPermanentlyFreePaper(id), true, `${id} must remain permanently free`)
}
assert.equal(isPermanentlyFreePaper('STD10-PAID-DEMO'), false)

const checkoutSecret = 'test-checkout-secret-not-production'
const orderId = 'order_test_abc123'
const paymentId = 'pay_test_def456'
const checkoutSignature = createHmac('sha256', checkoutSecret).update(`${orderId}|${paymentId}`).digest('hex')
assert.equal(verifyCheckoutSignature(orderId, paymentId, checkoutSignature, checkoutSecret), true)
assert.equal(verifyCheckoutSignature(orderId, paymentId, '0'.repeat(64), checkoutSecret), false)

const webhookSecret = 'test-webhook-secret-not-production'
const rawWebhook = JSON.stringify({ event: 'payment.captured', payload: { payment: { entity: { id: paymentId, order_id: orderId, amount: 30000, currency: 'INR', status: 'captured' } } } })
const webhookSignature = createHmac('sha256', webhookSecret).update(rawWebhook).digest('hex')
assert.equal(verifyWebhookSignature(rawWebhook, webhookSignature, webhookSecret), true)
assert.equal(verifyWebhookSignature(rawWebhook, 'bad-signature', webhookSecret), false)

assert.doesNotThrow(() => assertSameOrigin({ headers: { origin: 'https://qpn.example', host: 'qpn.example' } }))
assert.throws(() => assertSameOrigin({ headers: { origin: 'https://attacker.example', host: 'qpn.example' } }), (error) => error instanceof HttpError && error.status === 403)

const securitySource = await readFile(new URL('../api/_lib/security.js', import.meta.url), 'utf8')
assert.match(securitySource, /scrypt/)
assert.match(securitySource, /HttpOnly/)
assert.match(securitySource, /SameSite=Lax/)
const authSource = await readFile(new URL('../frontend/src/lib/auth.js', import.meta.url), 'utf8')
assert.match(authSource, /\/api\/auth\/login/)
assert.doesNotMatch(authSource, /Student@123/)
const vercel = JSON.parse(await readFile(new URL('../vercel.json', import.meta.url), 'utf8'))
assert.equal(vercel.outputDirectory, 'frontend/dist')
assert.ok(vercel.rewrites.some((route) => route.source === '/(.*)' && route.destination === '/index.html'))

console.log('Auth/billing checks passed: dataset validation, missing/duplicate/options, free-paper guard, payment signatures, same-origin rejection, server-side password/session contract, and Vercel SPA config.')
