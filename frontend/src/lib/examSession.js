import { lookupAnswer } from './data.js'

const SESSION_PREFIX = 'qpn:exam:v2:'
const DEFAULT_DURATION_MINUTES = 150

function key(paperId) {
  return `${SESSION_PREFIX}${paperId}`
}

function write(paperId, value) {
  try { localStorage.setItem(key(paperId), JSON.stringify(value)) } catch {}
}

function read(paperId) {
  try {
    const raw = localStorage.getItem(key(paperId))
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function newAttemptId() {
  const suffix = Math.random().toString(36).slice(2, 10)
  return `ATTEMPT_${Date.now()}_${suffix}`
}

export function getDurationMinutes(paperMeta) {
  const value = Number(paperMeta?.duration_minutes)
  return Number.isFinite(value) && value > 0 ? value : DEFAULT_DURATION_MINUTES
}

export function startExamSession(paperMeta) {
  const existing = read(paperMeta.paper_id)
  // Starting from Home always starts a clean timed attempt.
  const durationMinutes = getDurationMinutes(paperMeta)
  const startedAt = Date.now()
  const session = {
    attempt_id: newAttemptId(),
    paper_id: paperMeta.paper_id,
    booklet_code: paperMeta.booklet_code,
    started_at: new Date(startedAt).toISOString(),
    deadline_ms: startedAt + durationMinutes * 60 * 1000,
    duration_minutes: durationMinutes,
    answers: {},
    review: {},
    language: paperMeta.preferred_language || paperMeta.language || (paperMeta.available_languages || ['en'])[0] || 'en',
    completed: false,
  }
  if (existing?.completed === false) {
    // Preserve an explicit new Start Exam action as a restart rather than silently resuming.
    // The previous attempt remains represented by its generated attempt_id only in the current browser state.
  }
  write(paperMeta.paper_id, session)
  return session
}

export function getExamSession(paperId) {
  return read(paperId)
}

export function updateExamSession(paperId, patch) {
  const current = read(paperId)
  if (!current) return null
  const next = { ...current, ...patch }
  write(paperId, next)
  return next
}

export function clearExamSession(paperId) {
  try { localStorage.removeItem(key(paperId)) } catch {}
}

export function remainingMs(session) {
  if (!session) return 0
  return Math.max(0, Number(session.deadline_ms || 0) - Date.now())
}

export function scoreExam(questions, answerKey, language, selectedAnswers) {
  let correct = 0
  let attempted = 0
  let scorable = 0
  const breakdown = []

  for (const question of questions) {
    const selected = selectedAnswers?.[question.id] || null
    const expected = lookupAnswer(answerKey, question.question_number, language)
    const hasAnswer = Boolean(expected)
    if (hasAnswer) scorable += 1
    if (selected) attempted += 1
    const isCorrect = hasAnswer && selected === expected
    if (isCorrect) correct += 1
    breakdown.push({
      id: question.id,
      question_number: question.question_number,
      selected,
      expected,
      status: !hasAnswer ? 'unscored' : isCorrect ? 'correct' : selected ? 'incorrect' : 'unanswered',
    })
  }

  return {
    correct,
    attempted,
    total: questions.length,
    scorable,
    unscored: questions.length - scorable,
    breakdown,
  }
}

export function formatDuration(ms) {
  const safe = Math.max(0, Math.floor(ms / 1000))
  const hours = Math.floor(safe / 3600)
  const minutes = Math.floor((safe % 3600) / 60)
  const seconds = safe % 60
  return [hours, minutes, seconds].map((v) => String(v).padStart(2, '0')).join(':')
}
