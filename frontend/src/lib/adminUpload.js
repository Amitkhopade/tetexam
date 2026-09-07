export function normalizeAnswerValue(value) {
  if (typeof value === 'number') return String(value)
  if (typeof value !== 'string') return null
  const trimmed = value.trim().toUpperCase()
  if (/^[1-4]$/.test(trimmed)) return trimmed
  if (trimmed === 'Z') return 'Z'
  return null
}

function questionRows(questionData) {
  if (Array.isArray(questionData?.questions)) return questionData.questions
  if (Array.isArray(questionData)) return questionData
  return []
}

export function extractAnswerMap(answerData) {
  if (!answerData || typeof answerData !== 'object') return {}
  if (answerData.answers && typeof answerData.answers === 'object' && !Array.isArray(answerData.answers)) return answerData.answers
  if (answerData.answer_key && typeof answerData.answer_key === 'object') return answerData.answer_key
  return {}
}

export function validateUploadPayload(questionData, answerData, expectedCount = 150) {
  const errors = []
  const warnings = []
  const questions = questionRows(questionData)
  if (!questions.length) errors.push('Question JSON does not contain a questions array with records.')

  const seen = new Set()
  const invalidIds = []
  const missingText = []
  for (const q of questions) {
    const n = Number(q?.question_number)
    if (!Number.isInteger(n) || n < 1) { invalidIds.push(String(q?.question_number ?? 'unknown')); continue }
    if (seen.has(n)) errors.push(`Duplicate question number: ${n}`)
    seen.add(n)
    if (!String(q?.question_text ?? '').trim()) missingText.push(n)
  }
  if (invalidIds.length) errors.push(`Invalid question numbers: ${invalidIds.join(', ')}`)
  if (missingText.length) errors.push(`Missing question text for: ${missingText.join(', ')}`)
  if (expectedCount && questions.length !== expectedCount) warnings.push(`Question count is ${questions.length}; expected ${expectedCount}.`)

  const answerMap = extractAnswerMap(answerData)
  const missingAnswers = []
  const invalidAnswers = []
  for (let n = 1; n <= expectedCount; n += 1) {
    const raw = answerMap[String(n)]
    const normalized = normalizeAnswerValue(raw)
    if (normalized === null) {
      if (raw == null || raw === '') missingAnswers.push(n)
      else invalidAnswers.push(`${n}=${raw}`)
    }
  }
  if (missingAnswers.length) errors.push(`Missing answers: ${missingAnswers.join(', ')}`)
  if (invalidAnswers.length) errors.push(`Invalid answers: ${invalidAnswers.join(', ')}`)

  const booklet = questionData?.booklet_code || answerData?.booklet_code || questionData?.metadata?.booklet_code || answerData?.metadata?.booklet_code
  const paperId = questionData?.paper_id || questionData?.metadata?.paper_id || answerData?.paper_id || answerData?.metadata?.paper_id
  if (!booklet) errors.push('Booklet code is missing. Add booklet_code to the question JSON or metadata.')
  if (!paperId) errors.push('paper_id is missing. Add paper_id to the question JSON or metadata.')

  return {
    ok: errors.length === 0,
    errors,
    warnings,
    questionCount: questions.length,
    answerCount: Object.keys(answerMap).filter((key) => normalizeAnswerValue(answerMap[key]) !== null).length,
    missingAnswers,
    booklet,
    paperId,
  }
}

export function buildPaperMetadata(questionData, answerData) {
  const source = questionData?.metadata || questionData?.paper || {}
  const booklet = questionData?.booklet_code || answerData?.booklet_code || source.booklet_code || 'UNKNOWN'
  const questions = questionRows(questionData)
  const languages = [...new Set(questions.map((q) => q?.language).filter(Boolean))]
  return {
    schema_version: questionData?.schema_version || '1.2.0',
    paper_id: questionData?.paper_id || source.paper_id || `${source.exam || questionData?.exam || 'EXAM'}-PAPER-I-${booklet}`,
    exam: questionData?.exam || source.exam || answerData?.exam || 'Question Paper',
    session: questionData?.session ?? source.session ?? answerData?.session ?? null,
    exam_date: questionData?.exam_date ?? source.exam_date ?? answerData?.exam_date ?? null,
    title: questionData?.title || source.title || `Paper ${booklet}`,
    booklet_code: booklet,
    question_count: questions.length,
    available_languages: languages.length ? languages : ['en'],
  }
}

export function prepareDatasetForSave(questionData, answerData) {
  const meta = buildPaperMetadata(questionData, answerData)
  const validation = validateUploadPayload(questionData, answerData, meta.question_count || 150)
  const normalizedQuestions = { ...questionData, paper_id: meta.paper_id, booklet_code: meta.booklet_code }
  const normalizedAnswers = { ...answerData, paper_id: meta.paper_id, booklet_code: meta.booklet_code }
  return { meta, validation, questions: normalizedQuestions, answers: normalizedAnswers }
}

export async function saveDatasetToProject(payload) {
  const response = await fetch('/__admin/save-dataset', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  })
  const body = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(body.message || `Save failed (${response.status})`)
  return body
}
