import { getSql } from '../_lib/db.js'
import { assertSameOrigin, handleError, json, methodOnly, readJson, HttpError } from '../_lib/http.js'
import { audit, enforceRateLimit, requireUser } from '../_lib/security.js'
import { isPermanentlyFreePaper } from '../_lib/free-papers.js'

export default async function handler(req, res) {
  try {
    const actor = await requireUser(req, ['admin'])
    const sql = getSql()
    if (req.method === 'GET') {
      const rows = await sql`SELECT product_id, name, description, amount_paise, currency, paper_ids, is_active, created_at, updated_at FROM products ORDER BY created_at DESC LIMIT 200`
      return json(res, 200, { ok: true, products: rows.map((r) => ({ ...r, amount_paise: Number(r.amount_paise), paper_ids: typeof r.paper_ids === 'string' ? JSON.parse(r.paper_ids) : r.paper_ids || [] })) })
    }
    if (req.method !== 'POST') { res.setHeader('Allow','GET, POST'); return json(res,405,{ok:false,message:'Use GET or POST.'}) }
    assertSameOrigin(req)
    await enforceRateLimit(req, 'admin-products', actor.id, 80, 60)
    const body = await readJson(req, 32 * 1024)
    const action = String(body.action || 'save')
    const productId = String(body.product_id || '').trim().toLowerCase()
    if (!/^[a-z0-9][a-z0-9_-]{2,59}$/.test(productId)) throw new HttpError(400,'Product ID must be 3–60 lowercase letters, numbers, hyphens or underscores.')
    if (action === 'deactivate') {
      const result = await sql`UPDATE products SET is_active=false, updated_at=now() WHERE product_id=${productId} RETURNING product_id`
      if (!result.length) throw new HttpError(404,'Product not found.')
      await audit(actor.id,'product_deactivated','product',productId,{})
      return json(res,200,{ok:true,message:'Product deactivated. Existing entitlements remain recorded.'})
    }
    const name = String(body.name || '').trim()
    const description = String(body.description || '').trim().slice(0,1000)
    const amountInr = Number(body.amount_inr)
    const paperIds = [...new Set((Array.isArray(body.paper_ids) ? body.paper_ids : String(body.paper_ids || '').split(',')).map(v=>String(v).trim()).filter(Boolean))]
    if (name.length < 3 || name.length > 100) throw new HttpError(400,'Product name must be 3–100 characters.')
    if (!Number.isFinite(amountInr) || amountInr < 1 || amountInr > 100000 || Math.round(amountInr*100) !== amountInr*100) throw new HttpError(400,'Enter a price from ₹1 to ₹100,000 with at most two decimals.')
    if (!paperIds.length || paperIds.length > 100) throw new HttpError(400,'Select between 1 and 100 paid paper IDs.')
    for (const id of paperIds) {
      if (!/^[A-Za-z0-9][A-Za-z0-9._-]{2,99}$/.test(id)) throw new HttpError(400,`Invalid paper ID: ${id}`)
      if (isPermanentlyFreePaper(id)) throw new HttpError(400,`${id} is an existing free mock test and cannot be assigned to a paid product.`)
    }
    const rows = await sql`
      INSERT INTO products (product_id,name,description,amount_paise,currency,paper_ids,is_active,created_by,created_at,updated_at)
      VALUES (${productId},${name},${description},${Math.round(amountInr*100)},'INR',${JSON.stringify(paperIds)}::jsonb,true,${actor.id},now(),now())
      ON CONFLICT (product_id) DO UPDATE SET name=EXCLUDED.name, description=EXCLUDED.description,
        amount_paise=EXCLUDED.amount_paise, currency='INR', paper_ids=EXCLUDED.paper_ids, is_active=true, updated_at=now()
      RETURNING product_id,name,description,amount_paise,currency,paper_ids,is_active
    `
    await audit(actor.id,'product_saved','product',productId,{paper_count:paperIds.length,amount_paise:Math.round(amountInr*100)})
    json(res,200,{ok:true,product:{...rows[0],amount_paise:Number(rows[0].amount_paise),paper_ids:typeof rows[0].paper_ids==='string'?JSON.parse(rows[0].paper_ids):rows[0].paper_ids},message:'Product saved. Payment will work after Razorpay environment variables and webhook are configured.'})
  } catch (error) { handleError(res,error) }
}
