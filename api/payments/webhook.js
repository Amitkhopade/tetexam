import { json, methodOnly, handleError } from '../_lib/http.js'
import { grantOrderEntitlement, verifyWebhookSignature } from '../_lib/payment.js'

export const config = { api: { bodyParser: false } }

async function rawBody(req) {
  const chunks=[]; let size=0
  for await (const chunk of req) {
    size+=chunk.length
    if(size>2*1024*1024) throw Object.assign(new Error('Webhook body too large.'),{status:413})
    chunks.push(Buffer.from(chunk))
  }
  return Buffer.concat(chunks)
}

export default async function handler(req,res) {
  if(!methodOnly(req,res,'POST')) return
  try {
    const raw=await rawBody(req)
    const signature=String(req.headers['x-razorpay-signature']||'')
    if(!verifyWebhookSignature(raw,signature)) return json(res,401,{ok:false,message:'Invalid webhook signature.'})
    const event=JSON.parse(raw.toString('utf8'))
    const type=String(event.event||'')
    let orderId='', paymentId='', verifiedPayment=null
    if(type==='payment.captured') {
      orderId=event.payload?.payment?.entity?.order_id || ''
      const entity=event.payload?.payment?.entity
      paymentId=entity?.id || ''
      verifiedPayment=entity || null
    } else if(type==='order.paid') {
      orderId=event.payload?.order?.entity?.id || ''
      const entity=event.payload?.payment?.entity
      paymentId=entity?.id || ''
      verifiedPayment=entity || null
    } else {
      return json(res,200,{ok:true,ignored:true,event:type})
    }
    if(!orderId||!paymentId) return json(res,400,{ok:false,message:'Webhook is missing order/payment IDs.'})
    if (!verifiedPayment || !verifiedPayment.order_id || verifiedPayment.order_id !== orderId || verifiedPayment.status !== 'captured' || verifiedPayment.amount == null || !verifiedPayment.currency) return json(res,400,{ok:false,message:'Payment webhook does not contain a matching captured payment.'})
    const result=await grantOrderEntitlement(orderId,paymentId,'verified_razorpay_webhook',verifiedPayment)
    if(!result.granted && result.reason==='order_not_found') return json(res,200,{ok:true,ignored:true,reason:'order_not_found'})
    if(!result.granted) return json(res,400,{ok:false,message:`Payment did not match stored order: ${result.reason}.`})
    json(res,200,{ok:true,processed:true,event:type})
  } catch(error){handleError(res,error)}
}
