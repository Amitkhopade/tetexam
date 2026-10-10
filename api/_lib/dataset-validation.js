const answerValue = (value) => {
  if (typeof value === 'number') value = String(value)
  if (typeof value !== 'string') return null
  const text = value.trim().toUpperCase()
  if (/^[1-4]$/.test(text) || text === 'Z') return text
  if (/^[A-D]$/.test(text)) return String('ABCD'.indexOf(text) + 1)
  return null
}

export function validateAssessment(questionsData, answerData, metadata) {
  const errors = []
  const questions = Array.isArray(questionsData?.questions) ? questionsData.questions : Array.isArray(questionsData) ? questionsData : []
  if (!questions.length) errors.push('questions.json must contain a non-empty questions array.')
  const seen = new Set()
  const logical = new Set()
  const languages = new Set()
  for (const q of questions) {
    const n = Number(q?.question_number)
    const language = String(q?.language || 'en').toLowerCase()
    if (!Number.isInteger(n) || n < 1) { errors.push(`Invalid question number: ${q?.question_number}`); continue }
    const key = `${n}:${language}`
    if (seen.has(key)) errors.push(`Duplicate question record ${key}.`)
    seen.add(key); logical.add(n); languages.add(language)
    if (!String(q?.question_text || '').trim()) errors.push(`Question ${key} has no question text.`)
    const options = q?.options
    if (!options || !['1','2','3','4'].every((i) => String(options[i] ?? options[Number(i)] ?? '').trim())) errors.push(`Question ${key} must contain options 1, 2, 3 and 4.`)
  }
  const maxQuestion = Math.max(0, ...logical)
  const expected = Number(metadata?.question_count || questionsData?.question_count || maxQuestion)
  if (!Number.isInteger(expected) || expected < 1) errors.push('paper.json question_count is invalid.')
  if (maxQuestion !== expected || logical.size !== expected) errors.push(`paper.json expects ${expected} logical questions but questions.json contains ${logical.size} numbered questions (max ${maxQuestion}).`)
  const missing = Array.from({length: Math.max(expected,0)}, (_,i)=>i+1).filter((n)=>!logical.has(n))
  if (missing.length) errors.push(`Missing question numbers: ${missing.join(', ')}.`)
  const base = answerData?.answers && typeof answerData.answers === 'object' ? answerData.answers : {}
  const variants = answerData?.language_variants && typeof answerData.language_variants === 'object' ? answerData.language_variants : {}
  for (let n=1;n<=expected;n++) {
    const useVariant = n >= 91 && Object.keys(variants).length > 0
    if (!useVariant) {
      if (answerValue(base[String(n)]) === null) errors.push(`Missing/invalid base answer for Q${n}.`)
      continue
    }
    for (const language of languages) {
      const map = variants[language]
      if (map && answerValue(map[String(n)]) === null) errors.push(`Missing/invalid ${language} answer for Q${n}.`)
    }
  }
  if (!metadata?.paper_id || !metadata?.booklet_code) errors.push('paper.json requires paper_id and booklet_code.')
  const qPaper = questionsData?.paper_id || questionsData?.metadata?.paper_id
  const aPaper = answerData?.paper_id || answerData?.metadata?.paper_id
  if (qPaper && qPaper !== metadata?.paper_id) errors.push('Question JSON paper_id does not match paper.json.')
  if (aPaper && aPaper !== metadata?.paper_id) errors.push('Answer key paper_id does not match paper.json.')
  const qBooklet = questionsData?.booklet_code || questionsData?.metadata?.booklet_code
  const aBooklet = answerData?.booklet_code || answerData?.metadata?.booklet_code
  if (qBooklet && qBooklet !== metadata?.booklet_code) errors.push('Question JSON booklet_code does not match paper.json.')
  if (aBooklet && aBooklet !== metadata?.booklet_code) errors.push('Answer key booklet_code does not match paper.json.')
  return { ok: errors.length === 0, errors, logicalQuestionCount: logical.size, physicalQuestionCount: questions.length, answerCount: Object.keys(base).length + Object.values(variants).reduce((n,map)=>n+Object.keys(map||{}).length,0), languages: [...languages] }
}
