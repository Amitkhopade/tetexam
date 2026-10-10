import { getSql } from '../_lib/db.js'
import { handleError, json, methodOnly } from '../_lib/http.js'
import { requireUser } from '../_lib/security.js'

export default async function handler(req,res) {
  if(!methodOnly(req,res,'GET')) return
  try {
    await requireUser(req,['admin'])
    const sql=getSql()
    const rows=await sql`SELECT o.id,o.provider_order_id,o.provider_payment_id,o.product_id,o.amount_paise,o.currency,o.status,o.created_at,o.paid_at,u.username,u.email,p.name AS product_name FROM payment_orders o JOIN app_users u ON u.id=o.user_id LEFT JOIN products p ON p.product_id=o.product_id ORDER BY o.created_at DESC LIMIT 500`
    json(res,200,{ok:true,payments:rows.map(r=>({...r,amount_paise:Number(r.amount_paise)}))})
  } catch(error){handleError(res,error)}
}
