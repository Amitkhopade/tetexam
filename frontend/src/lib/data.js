export async function loadJson(path, signal) {
  const response = await fetch(path, { signal, cache: 'no-store' })
  if (!response.ok) throw new Error(`Failed to load ${path} (${response.status})`)
  return response.json()
}

export function normalizeQuestionRows(paperData, language = 'en') {
  return (paperData.questions || [])
    .filter((q) => q.language === language)
    .sort((a, b) => a.question_number - b.question_number)
}

export function lookupAnswer(answerKey, questionNumber, language = 'en') {
  if (!answerKey) return null
  const q = String(questionNumber)
  if (Number(questionNumber) >= 91) {
    return answerKey?.language_variants?.[language]?.[q] ?? null
  }
  return answerKey?.answers?.[q] ?? null
}

export function getOptionLabel(value) {
  if (['1', '2', '3', '4'].includes(value)) return value
  if (value === 'Z') return 'ALL'
  return null
}
