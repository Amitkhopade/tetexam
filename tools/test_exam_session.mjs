import assert from 'node:assert/strict'
import { startExamSession, getExamSession, updateExamSession, remainingMs, getDurationMinutes, scoreExam } from '../frontend/src/lib/examSession.js'

const values = new Map()
globalThis.localStorage = {
  getItem(key) { return values.has(key) ? values.get(key) : null },
  setItem(key, value) { values.set(key, String(value)) },
  removeItem(key) { values.delete(key) },
}

assert.equal(getDurationMinutes({ duration_minutes: 120 }), 120)
assert.equal(getDurationMinutes({ duration_minutes: 0 }), 150)
const session = startExamSession({ paper_id: 'TEST-PAPER', booklet_code: 'T', preferred_language: 'hi', available_languages: ['en', 'hi'], duration_minutes: 30 })
assert.equal(session.language, 'hi', 'home language selection must carry into timed exam session')
assert.equal(session.duration_minutes, 30)
assert.ok(session.deadline_ms > Date.now())
assert.ok(remainingMs(session) > 0)
assert.equal(getExamSession('TEST-PAPER').attempt_id, session.attempt_id)
const updated = updateExamSession('TEST-PAPER', { answers: { q1: '2' }, current_index: 4 })
assert.equal(updated.answers.q1, '2')
assert.equal(updated.current_index, 4)
const scored = scoreExam(
  [{ id: 'q1', question_number: 1 }, { id: 'q2', question_number: 2 }],
  { answers: { '1': '2', '2': '4' } },
  'en',
  { q1: '2', q2: '1' },
)
assert.equal(scored.correct, 1)
assert.equal(scored.attempted, 2)
assert.equal(scored.total, 2)
assert.equal(scored.scorable, 2)
console.log('EXAM SESSION / LANGUAGE / TIMER / SCORING TEST PASS')
