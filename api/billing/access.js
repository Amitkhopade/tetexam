import { getSql, isDatabaseConfigured } from '../_lib/db.js'
import { handleError, json, methodOnly } from '../_lib/http.js'
import { requireUser } from '../_lib/security.js'
import { isPermanentlyFreePaper } from '../_lib/free-papers.js'

export default async function handler(req,res) {
  if (!methodOnly(req,res,'GET')) return
  try {
    const paperId=String(req.query?.paper_id || new URL(req.url,`https://${req.headers.host||'localhost'}`).searchParams.get('paper_id') || '').trim()
    if (!paperId) return json(res,400,{ok:false,message:'paper_id is required.'})
    if (isPermanentlyFreePaper(paperId)) return json(res,200,{ok:true,allowed:true,tier:'free'})
    if (!isDatabaseConfigured()) return json(res,200,{ok:true,allowed:false,tier:'paid',requires_payment:true,message:'Paid assessments are not configured yet. Existing free mock tests remain available.'})
    const sql=getSql()
    const assessment=await sql`SELECT paper_id FROM paid_assessments WHERE paper_id=${paperId} AND status='published' LIMIT 1`
    if (!assessment.length) return json(res,200,{ok:true,allowed:true,tier:'free'})
    const products=await sql`SELECT product_id,name,description,amount_paise,currency FROM products WHERE is_active=true AND paper_ids @> ${JSON.stringify([paperId])}::jsonb`
    if (!products.length) return json(res,200,{ok:true,allowed:false,tier:'paid',requires_payment:true,products:[],message:'This assessment is being configured and is not yet available to students.'})
    let user=null
    try { user=await requireUser(req) } catch {}
    if (!user) return json(res,200,{ok:true,allowed:false,tier:'paid',requires_login:true,requires_payment:true,products:products.map(p=>({...p,amount_paise:Number(p.amount_paise)})),message:'Sign in and purchase access to use this assessment.'})
    // Use a parameterized array query. Product IDs originate from the database, but avoid dynamic SQL entirely.
    const purchased = await sql`SELECT e.product_id FROM exam_entitlements e JOIN products p ON p.product_id=e.product_id AND p.is_active=true
      WHERE e.user_id=${user.id} AND e.status='active' AND p.paper_ids @> ${JSON.stringify([paperId])}::jsonb LIMIT 1`
    if (purchased.length) return json(res,200,{ok:true,allowed:true,tier:'paid',product_id:purchased[0].product_id})
    json(res,200,{ok:true,allowed:false,tier:'paid',requires_payment:true,products:products.map(p=>({...p,amount_paise:Number(p.amount_paise)})),message:'Purchase access to start this assessment.'})
  } catch(error){handleError(res,error)}
}
