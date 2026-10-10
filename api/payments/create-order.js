import { randomUUID } from 'node:crypto'
import { getSql } from '../_lib/db.js'
import { assertSameOrigin, handleError, json, methodOnly, readJson, HttpError } from '../_lib/http.js'
import { enforceRateLimit, requireUser } from '../_lib/security.js'

export default async function handler(req,res) {
  if(!methodOnly(req,res,'POST')) return
  try {
    assertSameOrigin(req)
    const user=await requireUser(req)
    await enforceRateLimit(req,'payment-create',user.id,12,60)
    const body=await readJson(req,16*1024)
    const productId=String(body.product_id || '').trim()
    const keyId=process.env.RAZORPAY_KEY_ID
    const keySecret=process.env.RAZORPAY_KEY_SECRET
    if(!keyId || !keySecret) throw new HttpError(503,'Payment provider is not configured yet. Set Razorpay test/live keys in Vercel environment variables.','PAYMENT_NOT_CONFIGURED')
    const sql=getSql()
    const products=await sql`SELECT product_id,name,description,amount_paise,currency FROM products WHERE product_id=${productId} AND is_active=true LIMIT 1`
    const product=products[0]
    if(!product) throw new HttpError(404,'Paid product is not available.')
    const receipt=`qpn_${randomUUID().replace(/-/g,'').slice(0,24)}`
    const auth=Buffer.from(`${keyId}:${keySecret}`).toString('base64')
    const response=await fetch('https://api.razorpay.com/v1/orders',{
      method:'POST',headers:{Authorization:`Basic ${auth}`,'Content-Type':'application/json'},
      body:JSON.stringify({amount:Number(product.amount_paise),currency:product.currency||'INR',receipt,notes:{qpn_user_id:user.id,qpn_product_id:product.product_id}})
    })
    const order=await response.json().catch(()=>({}))
    if(!response.ok || !order.id) { console.error('[qpn-payment] Razorpay order creation failed',response.status); throw new HttpError(502,'Payment provider could not create an order. Try again later.','ORDER_CREATE_FAILED') }
    await sql`INSERT INTO payment_orders (id,user_id,product_id,provider_order_id,amount_paise,currency,status,created_at) VALUES (${randomUUID()},${user.id},${product.product_id},${order.id},${Number(product.amount_paise)},${product.currency||'INR'},'created',now())`
    json(res,201,{ok:true,order_id:order.id,amount:Number(product.amount_paise),currency:product.currency||'INR',key_id:keyId,product:{product_id:product.product_id,name:product.name,description:product.description}})
  } catch(error){handleError(res,error)}
}
