import { getSql, isDatabaseConfigured } from '../_lib/db.js'
import { handleError, json, methodOnly } from '../_lib/http.js'

export default async function handler(req,res) {
  if (!methodOnly(req,res,'GET')) return
  try {
    const paymentEnabled = Boolean(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET && process.env.RAZORPAY_WEBHOOK_SECRET)
    if (!isDatabaseConfigured()) return json(res,200,{ok:true,configured:false,payment_enabled:false,products:[],message:'Database is not configured yet.'})
    const sql=getSql()
    const rows=await sql`SELECT product_id,name,description,amount_paise,currency,paper_ids FROM products WHERE is_active=true ORDER BY amount_paise ASC`
    json(res,200,{ok:true,configured:true,payment_enabled:paymentEnabled,products:rows.map(r=>({...r,amount_paise:Number(r.amount_paise),paper_ids:typeof r.paper_ids==='string'?JSON.parse(r.paper_ids):r.paper_ids||[]}))})
  } catch(error){handleError(res,error)}
}
