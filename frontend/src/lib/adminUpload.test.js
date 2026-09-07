import { describe, expect, it } from 'vitest'
import { prepareDatasetForSave, validateUploadPayload } from './adminUpload'

function makeQuestions(count = 150) {
  return {
    paper_id: 'TEST-PAPER-H',
    booklet_code: 'H',
    questions: Array.from({ length: count }, (_, i) => ({
      id: `TEST-Q${i + 1}`,
      booklet_code: 'H',
      question_number: i + 1,
      language: 'en',
      part: i < 30 ? 'I' : 'II',
      question_text: `Question ${i + 1}`,
      options: { 1: 'A', 2: 'B', 3: 'C', 4: 'D' },
    })),
  }
}

function makeAnswers() {
  return {
    paper_id: 'TEST-PAPER-H',
    booklet_code: 'H',
    answers: Object.fromEntries(Array.from({ length: 150 }, (_, i) => [String(i + 1), String((i % 4) + 1)])),
  }
}

describe('admin upload validation', () => {
  it('accepts a complete 150-question dataset', () => {
    const result = validateUploadPayload(makeQuestions(), makeAnswers())
    expect(result.ok).toBe(true)
    expect(result.questionCount).toBe(150)
    expect(result.answerCount).toBe(150)
    expect(result.missingAnswers).toHaveLength(0)
  })

  it('rejects missing answers instead of silently saving', () => {
    const answers = makeAnswers()
    delete answers.answers['150']
    const result = validateUploadPayload(makeQuestions(), answers)
    expect(result.ok).toBe(false)
    expect(result.missingAnswers).toContain(150)
  })

  it('builds project-ready metadata without changing question rows', () => {
    const payload = prepareDatasetForSave(makeQuestions(), makeAnswers())
    expect(payload.meta.paper_id).toBe('TEST-PAPER-H')
    expect(payload.meta.booklet_code).toBe('H')
    expect(payload.meta.question_count).toBe(150)
    expect(payload.questions.questions).toHaveLength(150)
  })
})
