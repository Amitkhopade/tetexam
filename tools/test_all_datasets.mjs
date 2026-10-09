import fs from 'node:fs/promises'
import path from 'node:path'
import { lookupAnswer, normalizeQuestionRows } from '../frontend/src/lib/data.js'
import { validateUploadPayload } from '../frontend/src/lib/adminUpload.js'

const root = process.cwd()
const catalogPath = path.join(root, 'frontend/public/data/catalog.json')
const catalog = JSON.parse(await fs.readFile(catalogPath, 'utf8'))
const expected = new Set(['H', 'K', 'L', 'M', 'N'])
const actual = new Set((catalog.papers || []).map((p) => p.booklet_code))
for (const code of expected) if (!actual.has(code)) throw new Error(`Catalog missing set ${code}`)
if (actual.size !== expected.size) throw new Error(`Unexpected paper sets in catalog: ${[...actual].join(', ')}`)

let logicalChecks = 0
for (const code of ['H', 'K', 'L', 'M', 'N']) {
  const folder = path.join(root, 'frontend/public/data', code)
  const [qData, answers, paper] = await Promise.all([
    fs.readFile(path.join(folder, 'questions.json'), 'utf8').then(JSON.parse),
    fs.readFile(path.join(folder, 'answer_key.json'), 'utf8').then(JSON.parse),
    fs.readFile(path.join(folder, 'paper.json'), 'utf8').then(JSON.parse),
  ])
  if (paper.booklet_code !== code) throw new Error(`${code}: paper metadata booklet_code mismatch`)
  if (Number(paper.question_count) !== 150) throw new Error(`${code}: expected 150 logical questions`)
  if (Number(catalog.papers.find((p) => p.booklet_code === code)?.duration_minutes || 150) !== Number(paper.duration_minutes || 150)) throw new Error(`${code}: catalog duration does not match paper metadata`)
  const uploadValidation = validateUploadPayload(qData, answers, 150)
  if (!uploadValidation.ok) throw new Error(`${code}: existing dataset fails admin uploader validation: ${uploadValidation.errors.join('; ')}`)
  const languages = paper.available_languages || ['en']
  for (const language of languages) {
    const questions = normalizeQuestionRows(qData, language)
    if (questions.length !== 150) throw new Error(`${code}/${language}: expected 150 rows, got ${questions.length}`)
    const missing = []
    for (const q of questions) {
      const value = lookupAnswer(answers, q.question_number, language)
      if (!['1', '2', '3', '4', 'Z'].includes(String(value))) missing.push(q.question_number)
      logicalChecks++
    }
    if (missing.length) throw new Error(`${code}/${language}: answer lookup missing/invalid for ${missing.join(', ')}`)
  }
}
console.log(`ALL DATASETS PASS: H/K/L/M/N; ${logicalChecks} question-language records have usable answer lookups.`)
