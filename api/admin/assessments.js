import { getSql } from '../_lib/db.js'
import { assertSameOrigin, handleError, json, methodOnly, readJson, HttpError } from '../_lib/http.js'
import { audit, enforceRateLimit, requireUser } from '../_lib/security.js'
import { validateAssessment } from '../_lib/dataset-validation.js'
import { isPermanentlyFreePaper } from '../_lib/free-papers.js'

export const config = { api: { bodyParser: false } }

export default async function handler(req,res) {
  try {
    const actor=await requireUser(req,['admin'])
    const sql=getSql()
    if(req.method==='GET') {
      const rows=await sql`SELECT paper_id,booklet_code,metadata,status,created_at,published_at FROM paid_assessments ORDER BY created_at DESC LIMIT 200`
      return json(res,200,{ok:true,assessments:rows.map(r=>({...r,metadata:typeof r.metadata==='string'?JSON.parse(r.metadata):r.metadata}))})
    }
    if(req.method!=='POST'){res.setHeader('Allow','GET, POST');return json(res,405,{ok:false,message:'Use GET or POST.'})}
    assertSameOrigin(req)
    await enforceRateLimit(req,'admin-assessments',actor.id,30,60)
    const body=await readJson(req,4*1024*1024)
    const meta=body.paper || body.metadata || {}
    const questions=body.questions
    const answerKey=body.answer_key || body.answers
    const paperId=String(meta.paper_id || questions?.paper_id || '').trim()
    const booklet=String(meta.booklet_code || questions?.booklet_code || '').trim().toUpperCase()
    if(!paperId || !booklet) throw new HttpError(400,'Metadata must include paper_id and booklet_code.')
    if(isPermanentlyFreePaper(paperId) || ['H','K','L','M','N'].includes(booklet)) throw new HttpError(400,'Existing H/K/L/M/N mock tests are protected as permanently free and cannot be overwritten as paid content.')
    const metadata={...meta,paper_id:paperId,booklet_code:booklet,access_tier:'paid',schema_version:meta.schema_version || '1.0.0',question_count:Number(meta.question_count || questions?.question_count || new Set((questions?.questions||[]).map(q=>Number(q.question_number))).size),available_languages:meta.available_languages || [...new Set((questions?.questions||[]).map(q=>q.language||'en'))]}
    const validation=validateAssessment(questions,answerKey,metadata)
    if(!validation.ok) throw new HttpError(400,`Assessment validation failed: ${validation.errors.slice(0,12).join(' ')}`,'DATASET_INVALID')
    const replace=body.replace===true
    const exists=await sql`SELECT 1 FROM paid_assessments WHERE paper_id=${paperId} LIMIT 1`
    if(exists.length && !replace) throw new HttpError(409,'This paid assessment already exists. Confirm replace to overwrite it.')
    const rows=await sql`
      INSERT INTO paid_assessments (paper_id,booklet_code,metadata,questions_json,answer_key_json,status,created_by,created_at,published_at)
      VALUES (${paperId},${booklet},${JSON.stringify(metadata)}::jsonb,${JSON.stringify(questions)}::jsonb,${JSON.stringify(answerKey)}::jsonb,'published',${actor.id},now(),now())
      ON CONFLICT (paper_id) DO UPDATE SET booklet_code=EXCLUDED.booklet_code, metadata=EXCLUDED.metadata, questions_json=EXCLUDED.questions_json, answer_key_json=EXCLUDED.answer_key_json, status='published', updated_at=now(), published_at=now()
      RETURNING paper_id,booklet_code,status`
    await audit(actor.id,'paid_assessment_published','assessment',paperId,{question_count:metadata.question_count,replace})
    json(res,201,{ok:true,assessment:rows[0],validation,message:'Stored privately. Create an active paid product and include this paper_id before it appears to students.'})
  } catch(error){handleError(res,error)}
}
