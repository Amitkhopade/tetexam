import { verifyCheckoutSignature, verifyWebhookSignature } from './payment-signatures.js'
export { verifyCheckoutSignature, verifyWebhookSignature } from './payment-signatures.js'
import { getSql } from './db.js'

export async function verifyCapturedPayment(orderId, paymentId, expectedAmount = null, expectedCurrency = null) {
  const keyId = process.env.RAZORPAY_KEY_ID
  const keySecret = process.env.RAZORPAY_KEY_SECRET
  if (!keyId || !keySecret) return false
  const basic = Buffer.from(`${keyId}:${keySecret}`).toString('base64')
  const response = await fetch(`https://api.razorpay.com/v1/payments/${encodeURIComponent(paymentId)}`, {
    headers: { Authorization: `Basic ${basic}` },
  })
  if (!response.ok) return false
  const payment = await response.json()
  if (payment.order_id !== orderId || payment.status !== 'captured') return false
  if (expectedAmount != null && Number(payment.amount) !== Number(expectedAmount)) return false
  if (expectedCurrency && String(payment.currency).toUpperCase() !== String(expectedCurrency).toUpperCase()) return false
  return payment
}

export async function grantOrderEntitlement(providerOrderId, paymentId, source = 'checkout', verifiedPayment = null) {
  const sql = getSql()
  const orderRows = await sql`
    SELECT id, user_id, product_id, amount_paise, currency, status
    FROM payment_orders WHERE provider_order_id = ${providerOrderId} LIMIT 1
  `
  const order = orderRows[0]
  if (!order) return { granted: false, reason: 'order_not_found' }
  if (order.status === 'refunded') return { granted: false, reason: 'order_refunded' }
  if (verifiedPayment) {
    if (verifiedPayment.order_id && verifiedPayment.order_id !== providerOrderId) return { granted: false, reason: 'order_mismatch' }
    if (verifiedPayment.id && verifiedPayment.id !== paymentId) return { granted: false, reason: 'payment_mismatch' }
    if (verifiedPayment.amount != null && Number(verifiedPayment.amount) !== Number(order.amount_paise)) return { granted: false, reason: 'amount_mismatch' }
    if (verifiedPayment.currency && String(verifiedPayment.currency).toUpperCase() !== String(order.currency || 'INR').toUpperCase()) return { granted: false, reason: 'currency_mismatch' }
  }
  // An idempotent retry also ensures an entitlement exists if a prior request failed between DB writes.
  await sql`UPDATE payment_orders SET status = 'paid', provider_payment_id = ${paymentId}, paid_at = COALESCE(paid_at, now()), verification_source = ${source}
    WHERE id = ${order.id} AND status <> 'refunded'`
  await sql`INSERT INTO exam_entitlements (user_id, product_id, order_id, status, granted_at)
    VALUES (${order.user_id}, ${order.product_id}, ${order.id}, 'active', now())
    ON CONFLICT (user_id, product_id) DO UPDATE SET status = 'active', order_id = EXCLUDED.order_id, granted_at = EXCLUDED.granted_at`
  return { granted: true, alreadyPaid: order.status === 'paid', product_id: order.product_id }
}
