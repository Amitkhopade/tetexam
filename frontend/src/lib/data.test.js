import { describe, expect, it } from 'vitest'
import { lookupAnswer, normalizeQuestionRows } from './data'

describe('data helpers', () => {
  it('filters and sorts by language/question number', () => {
    const rows = { questions: [
      { language: 'en', question_number: 2, question_text: 'B' },
      { language: 'hi', question_number: 1, question_text: 'H' },
      { language: 'en', question_number: 1, question_text: 'A' },
    ] }
    expect(normalizeQuestionRows(rows, 'en').map(q => q.question_number)).toEqual([1, 2])
  })
  it('returns answer from answer key', () => {
    expect(lookupAnswer({ answers: { '11': '3' } }, 11)).toBe('3')
    expect(lookupAnswer({ answers: {} }, 11)).toBeNull()
  })
})
