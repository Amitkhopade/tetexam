import { getSql } from '../_lib/db.js'
import { assertSameOrigin, handleError, json, methodOnly, readJson, HttpError } from '../_lib/http.js'
import { enforceRateLimit, requireUser } from '../_lib/security.js'
import { grantOrderEntitlement, verifyCapturedPayment, verifyCheckoutSignature } from '../_lib/payment.js'

export default async function handler(req,res) {
  if(!methodOnly(req,res,'POST')) return
  try {
    assertSameOrigin(req)
    const user=await requireUser(req)
    await enforceRateLimit(req,'payment-verify',user.id,20,60)
    const body=await readJson(req,16*1024)
    const orderId=String(body.razorpay_order_id||'')
    const paymentId=String(body.razorpay_payment_id||'')
    const signature=String(body.razorpay_signature||'')
    if(!orderId||!paymentId||!signature) throw new HttpError(400,'Payment response is incomplete.')
    const sql=getSql()
    const rows=await sql`SELECT id,user_id,status,amount_paise,currency FROM payment_orders WHERE provider_order_id=${orderId} LIMIT 1`
    if(!rows.length || rows[0].user_id!==user.id) throw new HttpError(403,'This order does not belong to the signed-in user.')
    if(!verifyCheckoutSignature(orderId,paymentId,signature)) throw new HttpError(400,'Payment signature verification failed. Access was not granted.','PAYMENT_SIGNATURE_INVALID')
    const captured=await verifyCapturedPayment(orderId,paymentId,rows[0].amount_paise,rows[0].currency)
    if(!captured) return json(res,202,{ok:true,status:'pending',message:'Payment is not yet captured or does not match the order amount/currency. Access has not been granted.'})
    const result=await grantOrderEntitlement(orderId,paymentId,'checkout_signature_and_provider_check',captured)
    if(!result.granted) throw new HttpError(400,`Payment verification mismatch: ${result.reason}. Access was not granted.`,'PAYMENT_MISMATCH')
    json(res,200,{ok:true,status:'paid',entitlement_granted:result.granted,product_id:result.product_id,message:'Payment verified and access granted.'})
  } catch(error){handleError(res,error)}
}
