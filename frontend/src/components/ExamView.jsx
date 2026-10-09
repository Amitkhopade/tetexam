import { useEffect, useMemo, useState } from 'react'
import { Alert, Box, Button, CircularProgress, Container, CssBaseline, LinearProgress, Stack, ThemeProvider, Typography } from '@mui/material'
import ChevronLeftRoundedIcon from '@mui/icons-material/ChevronLeftRounded'
import ChevronRightRoundedIcon from '@mui/icons-material/ChevronRightRounded'
import RestartAltRoundedIcon from '@mui/icons-material/RestartAltRounded'
import HomeRoundedIcon from '@mui/icons-material/HomeRounded'
import DoneAllRoundedIcon from '@mui/icons-material/DoneAllRounded'
import Header from './Header'
import Sidebar from './Sidebar'
import QuestionCard from './QuestionCard'
import SettingsDialog from './SettingsDialog'
import SourceDialog from './SourceDialog'
import TimerBar from './TimerBar'
import { darkTheme, lightTheme } from '../theme/theme'
import { lookupAnswer, normalizeQuestionRows } from '../lib/data'
import { scoreExam, remainingMs, formatDuration, getExamSession, updateExamSession } from '../lib/examSession'

const DEMO_ANSWERS = Object.fromEntries(Array.from({ length: 150 }, (_, i) => [String(i + 1), String((i % 4) + 1)]))

export default function ExamView({ booklet, language, paperMeta, questionsData, answerKey, dark, isAdmin, demo = false, onDemoToggle, onThemeToggle, onOpenSettings, onHome, onComplete }) {
  const initialSession = getExamSession(paperMeta?.paper_id)
  const [session, setSession] = useState(initialSession)
  const [index, setIndex] = useState(initialSession?.current_index || 0)
  const [answers, setAnswers] = useState(initialSession?.answers || {})
  const [review, setReview] = useState(initialSession?.review || {})
  const [navOpen, setNavOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [sourceOpen, setSourceOpen] = useState(false)
  const [showAnswer, setShowAnswer] = useState(false)
  const [search, setSearch] = useState('')
  const [remaining, setRemaining] = useState(remainingMs(initialSession))

  const availableLanguages = paperMeta?.available_languages || ['en']
  const questions = useMemo(() => normalizeQuestionRows(questionsData || { questions: [] }, language), [questionsData, language])
  const current = questions[index]
  const currentAnswer = current ? (demo ? DEMO_ANSWERS[String(current.question_number)] : lookupAnswer(answerKey, current.question_number, language)) : null
  const answeredCount = questions.reduce((count, q) => count + (answers[q.id] ? 1 : 0), 0)
  const reviewCount = Object.values(review).filter(Boolean).length
  const progress = questions.length ? ((index + 1) / questions.length) * 100 : 0

  useEffect(() => {
    if (!session) return undefined
    const timer = window.setInterval(() => {
      const nextRemaining = remainingMs(session)
      setRemaining(nextRemaining)
      if (nextRemaining <= 0) {
        window.clearInterval(timer)
        finish('time_expired')
      }
    }, 1000)
    setRemaining(remainingMs(session))
    return () => window.clearInterval(timer)
  }, [session])

  useEffect(() => {
    if (index >= questions.length) setIndex(Math.max(0, questions.length - 1))
  }, [questions.length, index])

  useEffect(() => {
    if (!session || session.completed) return
    const updated = updateExamSession(paperMeta.paper_id, { answers, review, current_index: index, language })
    if (updated) setSession(updated)
  }, [answers, review, index, language, paperMeta.paper_id])

  function selectAnswer(value) {
    if (!current || remaining <= 0 || session?.completed) return
    setAnswers((prev) => ({ ...prev, [current.id]: value }))
    setShowAnswer(false)
  }

  function navigate(nextIndex) {
    setIndex(Math.min(Math.max(0, nextIndex), questions.length - 1))
    setShowAnswer(false)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function resetSession() {
    const reset = { ...session, answers: {}, review: {}, current_index: 0, language, completed: false }
    const durationMs = Number(session.duration_minutes || 150) * 60 * 1000
    const startedAt = Date.now()
    reset.started_at = new Date(startedAt).toISOString()
    reset.deadline_ms = startedAt + durationMs
    setSession(reset)
    setAnswers({}); setReview({}); setIndex(0); setShowAnswer(false)
    updateExamSession(paperMeta.paper_id, reset)
  }

  function finish(reason = 'manual_submit') {
    if (!session || session.completed) return
    const result = scoreExam(questions, demo ? { answers: DEMO_ANSWERS, language_variants: { en: DEMO_ANSWERS, hi: DEMO_ANSWERS } } : answerKey, language, answers)
    const completedSession = updateExamSession(paperMeta.paper_id, { answers, review, current_index: index, language, completed: true, completed_at: new Date().toISOString(), completion_reason: reason, result })
    setSession(completedSession || { ...session, completed: true, result })
    onComplete(result, reason)
  }

  useEffect(() => {
    function keyHandler(event) {
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) return
      if (event.key === 'ArrowRight') navigate(index + 1)
      if (event.key === 'ArrowLeft') navigate(index - 1)
      if (['1', '2', '3', '4'].includes(event.key)) selectAnswer(event.key)
      if (event.key.toLowerCase() === 'r' && current) setReview((prev) => ({ ...prev, [current.id]: !prev[current.id] }))
    }
    window.addEventListener('keydown', keyHandler)
    return () => window.removeEventListener('keydown', keyHandler)
  })

  if (!session) return <ThemeProvider theme={dark ? darkTheme : lightTheme}><CssBaseline /><Container sx={{ py: 8 }}><Alert severity="warning">This exam session is not available. Return Home and start the paper again.</Alert></Container></ThemeProvider>
  if (!questions.length) return <ThemeProvider theme={dark ? darkTheme : lightTheme}><CssBaseline /><Container sx={{ py: 8 }}><Stack alignItems="center" spacing={2}><CircularProgress /><Typography color="text.secondary">Preparing exam questions…</Typography></Stack></Container></ThemeProvider>

  return <ThemeProvider theme={dark ? darkTheme : lightTheme}><CssBaseline />
    <Header booklet={booklet} paperMeta={paperMeta} dark={dark} isAdmin={isAdmin} locked onThemeToggle={onThemeToggle} onOpenSettings={() => setSettingsOpen(true)} onOpenNav={() => setNavOpen(true)} onHome={onHome} />
    <Sidebar open={navOpen} onClose={() => setNavOpen(false)} questions={questions} currentIndex={index} onSelect={navigate} booklet={booklet} language={language} onLanguageChange={() => {}} search={search} onSearch={setSearch} answerCount={answeredCount} reviewCount={reviewCount} availableLanguages={availableLanguages} languageLocked />

    <Box sx={{ ml: { md: '300px' } }}>
      <LinearProgress variant="determinate" value={progress} sx={{ height: 4 }} />
      <Container maxWidth="lg" sx={{ py: { xs: 2, md: 4 } }}>
        <Stack direction={{ xs: 'column', lg: 'row' }} justifyContent="space-between" alignItems={{ xs: 'stretch', lg: 'center' }} gap={1.5} mb={2}>
          <Box><Typography variant="h4">{current ? `Question ${current.question_number}` : 'No questions'}</Typography><Typography color="text.secondary">{current?.part_name || ''} • {index + 1} of {questions.length}</Typography></Box>
          <Stack direction={{ xs: 'column', sm: 'row' }} gap={1} alignItems={{ xs: 'stretch', sm: 'center' }}>
            <TimerBar remaining={remaining} />
            <Button size="small" startIcon={<HomeRoundedIcon />} color="inherit" onClick={onHome}>Exit to Home</Button>
            <Button size="small" startIcon={<RestartAltRoundedIcon />} color="inherit" onClick={resetSession}>Restart</Button>
          </Stack>
        </Stack>

        {current ? <QuestionCard question={current} selected={answers[current.id] || null} onSelect={selectAnswer} onShowAnswer={() => setShowAnswer(true)} answer={currentAnswer} showAnswer={showAnswer} onOpenSource={() => setSourceOpen(true)} reviewed={Boolean(review[current.id])} onToggleReview={() => setReview((prev) => ({ ...prev, [current.id]: !prev[current.id] }))} /> : <Alert severity="info">No question records are available.</Alert>}

        {current && <Stack direction="row" justifyContent="space-between" alignItems="center" mt={2} gap={1}>
          <Button variant="outlined" startIcon={<ChevronLeftRoundedIcon />} disabled={index === 0} onClick={() => navigate(index - 1)}>Previous</Button>
          {index === questions.length - 1
            ? <Button variant="contained" color="success" endIcon={<DoneAllRoundedIcon />} onClick={() => finish('manual_submit')}>Submit Exam</Button>
            : <Button variant="contained" endIcon={<ChevronRightRoundedIcon />} onClick={() => navigate(index + 1)}>Next</Button>}
        </Stack>}

        <Alert severity="info" sx={{ mt: 3 }}>
          Timer: <strong>{formatDuration(remaining)}</strong>. The attempt is saved locally in this browser and is submitted automatically when the timer reaches zero.
        </Alert>
      </Container>
    </Box>

    <SettingsDialog open={settingsOpen} onClose={() => setSettingsOpen(false)} demo={demo} onDemoToggle={onDemoToggle} />
    <SourceDialog open={sourceOpen} onClose={() => setSourceOpen(false)} question={current} />
  </ThemeProvider>
}
