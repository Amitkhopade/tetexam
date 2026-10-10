import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { getSql, isDatabaseConfigured } from './db.js'

const moduleDir = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(moduleDir, '../..')

export async function getStaticCatalog() {
  const possible = [
    path.join(repoRoot, 'frontend', 'public', 'data', 'catalog.json'),
    path.join(process.cwd(), 'frontend', 'public', 'data', 'catalog.json'),
  ]
  for (const file of possible) {
    try { return JSON.parse(await fs.readFile(file, 'utf8')) } catch {}
  }
  return { schema_version: '2.0.0', papers: [] }
}

export async function getPublicCatalog() {
  const catalog = await getStaticCatalog()
  if (!isDatabaseConfigured()) return catalog
  const sql = getSql()
  const rows = await sql`
    SELECT a.paper_id, a.booklet_code, a.metadata, a.published_at,
           p.product_id, p.name AS product_name, p.amount_paise
    FROM paid_assessments a
    JOIN products p ON p.paper_ids @> jsonb_build_array(a.paper_id) AND p.is_active = true
    WHERE a.status = 'published'
    ORDER BY a.published_at DESC
  `
  const existing = new Set((catalog.papers || []).map((paper) => paper.paper_id))
  for (const row of rows) {
    if (existing.has(row.paper_id)) continue
    const meta = typeof row.metadata === 'string' ? JSON.parse(row.metadata) : row.metadata || {}
    catalog.papers.push({
      ...meta,
      paper_id: row.paper_id,
      booklet_code: row.booklet_code,
      access_tier: 'paid',
      product_id: row.product_id,
      price_paise: Number(row.amount_paise),
      price_currency: 'INR',
      status: 'published',
      source: 'private_database',
    })
  }
  return catalog
}
