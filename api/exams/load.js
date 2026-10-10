import { getSql } from '../_lib/db.js'
import { handleError, json, methodOnly, HttpError } from '../_lib/http.js'
import { requireUser } from '../_lib/security.js'
import { isPermanentlyFreePaper } from '../_lib/free-papers.js'

export default async function handler(req,res) {
  if(!methodOnly(req,res,'GET')) return
  try {
    const paperId=String(req.query?.paper_id || new URL(req.url,`https://${req.headers.host||'localhost'}`).searchParams.get('paper_id') || '').trim()
    if(!paperId) throw new HttpError(400,'paper_id is required.')
    if(isPermanentlyFreePaper(paperId)) throw new HttpError(400,'Free public papers should be loaded from their static JSON files.')
    const user=await requireUser(req)
    const sql=getSql()
    const rows=await sql`SELECT paper_id,booklet_code,metadata,questions_json,answer_key_json,status FROM paid_assessments WHERE paper_id=${paperId} AND status='published' LIMIT 1`
    const assessment=rows[0]
    if(!assessment) throw new HttpError(404,'Paid assessment not found.')
    if(user.role!=='admin') {
      const granted=await sql`SELECT e.product_id FROM exam_entitlements e JOIN products p ON p.product_id=e.product_id AND p.is_active=true WHERE e.user_id=${user.id} AND e.status='active' AND p.paper_ids @> ${JSON.stringify([paperId])}::jsonb LIMIT 1`
      if(!granted.length) throw new HttpError(403,'You do not have access to this assessment. Purchase access first.','ENTITLEMENT_REQUIRED')
    }
    const parse = (v) => typeof v === 'string' ? JSON.parse(v) : v
    json(res,200,{ok:true,paper:parse(assessment.metadata),questions:parse(assessment.questions_json),answer_key:parse(assessment.answer_key_json)})
  } catch(error){handleError(res,error)}
}
