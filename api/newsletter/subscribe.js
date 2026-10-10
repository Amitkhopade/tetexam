import { getSql } from '../_lib/db.js'
import { assertSameOrigin, handleError, json, methodOnly, readJson, HttpError } from '../_lib/http.js'
import { enforceRateLimit } from '../_lib/security.js'

export default async function handler(req,res) {
  if(!methodOnly(req,res,'POST')) return
  try {
    assertSameOrigin(req)
    const body=await readJson(req,8*1024)
    const email=String(body.email||'').trim().toLowerCase()
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new HttpError(400,'Enter a valid email address.')
    await enforceRateLimit(req,'newsletter','',10,60)
    const sql=getSql()
    await sql`INSERT INTO newsletter_subscribers (email,source,created_at) VALUES (${email},'public_homepage',now()) ON CONFLICT (email) DO NOTHING`
    json(res,200,{ok:true,message:'Thanks for subscribing. You can unsubscribe by contacting support.'})
  } catch(error){handleError(res,error)}
}
