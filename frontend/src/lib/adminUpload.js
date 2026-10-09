export function normalizeAnswerValue(value) {
  if (typeof value === 'number') return String(value)
  if (typeof value !== 'string') return null
  const trimmed = value.trim().toUpperCase()
  if (/^[1-4]$/.test(trimmed)) return trimmed
  if (trimmed === 'Z') return 'Z'
  if (/^[A-D]$/.test(trimmed)) return String('ABCD'.indexOf(trimmed) + 1)
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

function extractLanguageMaps(answerData) {
  const variants = answerData?.language_variants
  if (!variants || typeof variants !== 'object') return {}
  return Object.fromEntries(Object.entries(variants).map(([language, value]) => [language, value && typeof value === 'object' ? value : {}]))
}

function logicalQuestionNumbers(questions) {
  return [...new Set(questions.map((q) => Number(q?.question_number)).filter((n) => Number.isInteger(n) && n > 0))].sort((a, b) => a - b)
}

export function validateUploadPayload(questionData, answerData, expectedCount = 150) {
  const errors = []
  const warnings = []
  const questions = questionRows(questionData)
  if (!questions.length) errors.push('Question JSON does not contain a questions array with records.')

  const seen = new Set()
  const invalidIds = []
  const missingText = []
  const languagesByNumber = new Map()
  for (const q of questions) {
    const n = Number(q?.question_number)
    const lang = String(q?.language || 'en')
    if (!Number.isInteger(n) || n < 1) { invalidIds.push(String(q?.question_number ?? 'unknown')); continue }
    const composite = `${n}:${lang}`
    if (seen.has(composite)) errors.push(`Duplicate question record: ${composite}`)
    seen.add(composite)
    if (!String(q?.question_text ?? '').trim()) missingText.push(`${n}:${lang}`)
    if (!languagesByNumber.has(n)) languagesByNumber.set(n, new Set())
    languagesByNumber.get(n).add(lang)
  }
  if (invalidIds.length) errors.push(`Invalid question numbers: ${invalidIds.join(', ')}`)
  if (missingText.length) errors.push(`Missing question text for: ${missingText.join(', ')}`)

  const logicalNumbers = logicalQuestionNumbers(questions)
  if (expectedCount && logicalNumbers.length !== expectedCount) warnings.push(`Logical question count is ${logicalNumbers.length}; expected ${expectedCount}.`)
  const missingNumbers = expectedCount ? Array.from({ length: expectedCount }, (_, i) => i + 1).filter((n) => !languagesByNumber.has(n)) : []
  if (missingNumbers.length) errors.push(`Missing logical questions: ${missingNumbers.join(', ')}`)

  const answerMap = extractAnswerMap(answerData)
  const languageMaps = extractLanguageMaps(answerData)
  const questionLanguages = [...new Set(questions.map((q) => String(q?.language || 'en')))]
  const variantLanguages = Object.keys(languageMaps)
  const usesLanguageVariants = variantLanguages.length > 0 || questionLanguages.some((language) => language !== 'en')
  const baseAnswerEnd = usesLanguageVariants ? Math.min(90, expectedCount) : expectedCount
  const missingAnswers = []
  const invalidAnswers = []
  const normalizedBaseAnswers = {}
  for (let n = 1; n <= baseAnswerEnd; n += 1) {
    const raw = answerMap[String(n)]
    const normalized = normalizeAnswerValue(raw)
    if (normalized === null) {
      if (raw == null || raw === '') missingAnswers.push(`base:${n}`)
      else invalidAnswers.push(`base:${n}=${raw}`)
    } else normalizedBaseAnswers[String(n)] = normalized
  }

  for (const language of questionLanguages) {
    const needsVariant = language !== 'en' || Object.keys(languageMaps).length > 0
    if (!needsVariant) continue
    const variant = languageMaps[language] || {}
    for (let n = 91; n <= expectedCount; n += 1) {
      const raw = variant[String(n)]
      const normalized = normalizeAnswerValue(raw)
      if (normalized === null) {
        if (raw == null || raw === '') missingAnswers.push(`${language}:${n}`)
        else invalidAnswers.push(`${language}:${n}=${raw}`)
      }
    }
  }

  if (!variantLanguages.length && questionLanguages.some((language) => language !== 'en') && expectedCount > 90) {
    warnings.push('No language_variants object found. Q91–Q150 require language-specific answer maps when the source paper contains non-English variants.')
  }

  if (missingAnswers.length) errors.push(`Missing answers: ${missingAnswers.join(', ')}`)
  if (invalidAnswers.length) errors.push(`Invalid answers: ${invalidAnswers.join(', ')}`)

  const booklet = questionData?.booklet_code || answerData?.booklet_code || questionData?.metadata?.booklet_code || answerData?.metadata?.booklet_code
  const paperId = questionData?.paper_id || questionData?.metadata?.paper_id || answerData?.paper_id || answerData?.metadata?.paper_id
  if (!booklet) errors.push('Booklet code is missing. Add booklet_code to the question JSON or metadata.')
  if (!paperId) errors.push('paper_id is missing. Add paper_id to the question JSON or metadata.')

  const baseAnswerCount = Object.keys(normalizedBaseAnswers).length
  const variantCounts = Object.values(languageMaps).map((map) => Object.entries(map).filter(([, v]) => normalizeAnswerValue(v) !== null).length)
  const representativeVariantCount = variantCounts.length ? Math.max(...variantCounts) : 0
  const logicalAnswerCount = usesLanguageVariants
    ? Math.min(expectedCount, baseAnswerCount + representativeVariantCount)
    : Math.min(expectedCount, baseAnswerCount)

  return {
    ok: errors.length === 0,
    errors,
    warnings,
    questionCount: logicalNumbers.length,
    physicalQuestionCount: questions.length,
    answerCount: logicalAnswerCount,
    physicalAnswerCount: baseAnswerCount + variantCounts.reduce((sum, count) => sum + count, 0),
    missingAnswers,
    booklet,
    paperId,
    languages: questionLanguages,
  }
}

export function buildPaperMetadata(questionData, answerData) {
  const source = questionData?.metadata || questionData?.paper || {}
  const booklet = questionData?.booklet_code || answerData?.booklet_code || source.booklet_code || 'UNKNOWN'
  const questions = questionRows(questionData)
  const languages = [...new Set(questions.map((q) => q?.language).filter(Boolean))]
  const logicalCount = new Set(questions.map((q) => Number(q?.question_number)).filter(Number.isInteger)).size
  return {
    schema_version: questionData?.schema_version || '1.2.0',
    paper_id: questionData?.paper_id || source.paper_id || `${source.exam || questionData?.exam || 'EXAM'}-PAPER-I-${booklet}`,
    exam: questionData?.exam || source.exam || answerData?.exam || 'Question Paper',
    session: questionData?.session ?? source.session ?? answerData?.session ?? null,
    exam_date: questionData?.exam_date ?? source.exam_date ?? answerData?.exam_date ?? null,
    title: questionData?.title || source.title || `Paper ${booklet}`,
    booklet_code: booklet,
    question_count: logicalCount,
    duration_minutes: Number(questionData?.duration_minutes ?? source.duration_minutes ?? answerData?.duration_minutes ?? 150),
    available_languages: languages.length ? languages : ['en'],
  }
}

export function prepareDatasetForSave(questionData, answerData) {
  const meta = buildPaperMetadata(questionData, answerData)
  const normalizedQuestions = { ...questionData, paper_id: meta.paper_id, booklet_code: meta.booklet_code }
  const normalizedAnswers = { ...answerData, paper_id: meta.paper_id, booklet_code: meta.booklet_code }
  const validation = validateUploadPayload(normalizedQuestions, normalizedAnswers, meta.question_count || 150)
  return { meta, validation, questions: normalizedQuestions, answers: normalizedAnswers }
}

export async function saveDatasetToProject(payload) {
  const response = await fetch('/__admin/save-dataset', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload) })
  const body = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(body.message || `Save failed (${response.status})`)
  return body
}
