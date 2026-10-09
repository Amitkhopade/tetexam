import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const required = [
  'frontend/index.html', 'frontend/admin-upload.html', 'frontend/vite.config.js',
  'frontend/src/App.jsx', 'frontend/src/components/LoginPage.jsx', 'frontend/src/components/HomePage.jsx',
  'frontend/src/components/ExamView.jsx', 'frontend/src/components/ResultPage.jsx',
  'frontend/src/components/AdminAiGenerator.jsx', 'frontend/src/lib/auth.js',
  'frontend/src/lib/examSession.js', 'frontend/src/lib/adminAi.js', 'frontend/src/lib/adminAiServer.js',
  'docs/TECHNICAL_ARCHITECTURE.md', 'docs/PROJECT_HANDOFF_FOR_LLM.md',
  'docs/AI_QUESTION_ANSWER_JSON_GENERATION_PROMPT.md', 'docs/Question-Paper-Navigator-Technical-Architecture.docx',
  'exports/README.md', 'exports/legacy/SED-24-I-PAPER-I-H-before-inference.xlsx',
  'exports/H-answer-key-complete.xlsx', 'exports/K-answer-key-complete.xlsx',
  'exports/L-answer-key-complete.xlsx', 'exports/M-answer-key-complete.xlsx', 'exports/N-answer-key-complete.xlsx',
  'source/H/set-5-Paper_i_ H paper.pdf', 'source/H/H answer keys.pdf',
  'source/K/SET-1_PAPER-I_ACF-26-I-K.pdf', 'source/L/SET-2_PAPER-I_ACF-26-I-L.pdf',
  'source/M/SET-3_PAPER-I_ACF-26-I-M.pdf', 'source/M/M answer sheet.pdf',
  'source/N/SET-4_PAPER-I_ACF-26-I-N.pdf', 'source/N/N answer sheet.pdf',
  'source/answer_keys/CTET-FEB-2026-FINAL-ANSWER-KEY.pdf',
]
for (const file of required) assert.ok(fs.existsSync(path.join(root, file)), `Missing required bundle file: ${file}`)
const catalog = JSON.parse(fs.readFileSync(path.join(root, 'frontend/public/data/catalog.json'), 'utf8'))
assert.deepEqual([...catalog.papers.map((item) => item.booklet_code)].sort(), ['H','K','L','M','N'])
for (const code of ['H','K','L','M','N']) {
  for (const file of ['questions.json','paper.json','validation.json']) {
    assert.ok(fs.existsSync(path.join(root, 'data', 'papers', code, file)), `Missing canonical question/paper file ${code}/${file}`)
  }
  assert.ok(fs.existsSync(path.join(root, 'data', 'answer_keys', code, 'answer_key.json')), `Missing canonical answer key ${code}`)
  for (const file of ['questions.json','answer_key.json','paper.json','validation.json']) {
    assert.ok(fs.existsSync(path.join(root, 'frontend', 'public', 'data', code, file)), `Missing runtime file ${code}/${file}`)
  }
}
const hAnswer = JSON.parse(fs.readFileSync(path.join(root, 'data/answer_keys/H/answer_key.json'), 'utf8'))
assert.equal(hAnswer.coverage.official_answers_q1_q90, 90)
assert.equal(hAnswer.coverage.inferred_answers_q91_q150, 60)
assert.equal(Object.keys(hAnswer.inferred_answers || {}).length, 60)
assert.equal(hAnswer.status, 'contains_inferred_answers')
console.log(`BUNDLE INTEGRITY PASS: ${required.length} required files + H/K/L/M/N canonical/runtime datasets + H provenance markers.`)
