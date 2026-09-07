import { useEffect, useMemo, useState } from 'react'
import { Alert, Box, Button, CircularProgress, Container, CssBaseline, LinearProgress, Stack, ThemeProvider, Typography } from '@mui/material'
import ChevronLeftRoundedIcon from '@mui/icons-material/ChevronLeftRounded'
import ChevronRightRoundedIcon from '@mui/icons-material/ChevronRightRounded'
import RestartAltRoundedIcon from '@mui/icons-material/RestartAltRounded'
import Header from './components/Header'
import Sidebar from './components/Sidebar'
import QuestionCard from './components/QuestionCard'
import SettingsDialog from './components/SettingsDialog'
import SourceDialog from './components/SourceDialog'
import { darkTheme, lightTheme } from './theme/theme'
import { loadJson, lookupAnswer, normalizeQuestionRows } from './lib/data'
import { readJson, writeJson, clearKey } from './lib/storage'

const DEMO_ANSWERS = Object.fromEntries(Array.from({ length: 150 }, (_, i) => [String(i + 1), String((i % 4) + 1)]))

function App() {
  const [booklet, setBooklet] = useState(readJson('booklet', 'K'))
  const [language, setLanguage] = useState(readJson('language', 'en'))
  const [catalog, setCatalog] = useState(null)
  const [paperMeta, setPaperMeta] = useState(null)
  const [questionsData, setQuestionsData] = useState(null)
  const [answerKey, setAnswerKey] = useState(null)
  const [index, setIndex] = useState(readJson('index', 0))
  const [answers, setAnswers] = useState(readJson('answers', {}))
  const [review, setReview] = useState(readJson('review', {}))
  const [dark, setDark] = useState(readJson('theme', 'light') === 'dark')
  const [demo, setDemo] = useState(readJson('demo', false))
  const [navOpen, setNavOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [sourceOpen, setSourceOpen] = useState(false)
  const [showAnswer, setShowAnswer] = useState(false)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => { writeJson('booklet', booklet) }, [booklet])
  useEffect(() => { writeJson('language', language) }, [language])
  useEffect(() => { writeJson('index', index) }, [index])
  useEffect(() => { writeJson('answers', answers) }, [answers])
  useEffect(() => { writeJson('review', review) }, [review])
  useEffect(() => { writeJson('theme', dark ? 'dark' : 'light') }, [dark])
  useEffect(() => { writeJson('demo', demo) }, [demo])

  useEffect(() => {
    const controller = new AbortController()
    setLoading(true); setError('')
    loadJson('./data/catalog.json', controller.signal)
      .then((c) => {
        setCatalog(c)
        const entry = c.papers?.find((p) => p.booklet_code === booklet) || c.papers?.[0]
        if (entry && entry.booklet_code !== booklet) setBooklet(entry.booklet_code)
        return entry ? Promise.all([
          loadJson(`./data/${entry.booklet_code}/questions.json`, controller.signal),
          loadJson(`./data/${entry.booklet_code}/answer_key.json`, controller.signal),
          loadJson(`./data/${entry.booklet_code}/paper.json`, controller.signal),
        ]) : null
      })
      .then((result) => { if (result) { const [q, a, meta] = result; setQuestionsData(q); setAnswerKey(a); setPaperMeta(meta); const langs = meta.available_languages || ['en']; if (!langs.includes(language)) setLanguage(langs[0]) } })
      .catch((e) => { if (e.name !== 'AbortError') setError(e.message) }).finally(() => setLoading(false))
    return () => controller.abort()
  }, [booklet])

  const availableLanguages = paperMeta?.available_languages || ['en']
  const questions = useMemo(() => normalizeQuestionRows(questionsData || { questions: [] }, language), [questionsData, language])
  useEffect(() => { if (index >= questions.length) setIndex(Math.max(0, questions.length - 1)) }, [questions.length, index])

  const current = questions[index]
  const currentAnswer = current ? (demo ? DEMO_ANSWERS[String(current.question_number)] : lookupAnswer(answerKey, current.question_number, language)) : null
  const answeredCount = questions.reduce((count, q) => count + (answers[q.id] ? 1 : 0), 0)
  const reviewCount = Object.values(review).filter(Boolean).length
  const progress = questions.length ? ((index + 1) / questions.length) * 100 : 0

  function selectAnswer(value) {
    if (!current) return
    setAnswers((prev) => ({ ...prev, [current.id]: value }))
    setShowAnswer(false)
  }
  function navigate(nextIndex) { setIndex(Math.min(Math.max(0, nextIndex), questions.length - 1)); setShowAnswer(false); window.scrollTo({ top: 0, behavior: 'smooth' }) }
  function resetSession() { setAnswers({}); setReview({}); setIndex(0); clearKey('answers'); clearKey('review'); clearKey('index') }

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

  if (loading) return <ThemeProvider theme={dark ? darkTheme : lightTheme}><CssBaseline /><Box minHeight="100vh" display="grid" placeItems="center"><Stack alignItems="center" spacing={2}><CircularProgress /><Typography color="text.secondary">Loading question dataset…</Typography></Stack></Box></ThemeProvider>

  if (error) return <ThemeProvider theme={dark ? darkTheme : lightTheme}><CssBaseline /><Container sx={{ py: 8 }}><Alert severity="error"><Typography fontWeight={800}>Dataset could not be loaded</Typography><Typography variant="body2">{error}</Typography><Typography variant="body2" sx={{ mt: 1 }}>Run the data sync step and make sure the site is served through Vite/HTTP rather than opened with file://.</Typography></Alert></Container></ThemeProvider>

  return <ThemeProvider theme={dark ? darkTheme : lightTheme}><CssBaseline />
    <Header booklet={booklet} papers={catalog?.papers || []} paperMeta={paperMeta} onBookletChange={(v) => { setBooklet(v); setIndex(0) }} dark={dark} onThemeToggle={() => setDark((v) => !v)} onOpenSettings={() => setSettingsOpen(true)} onOpenNav={() => setNavOpen(true)} />
    <Sidebar open={navOpen} onClose={() => setNavOpen(false)} questions={questions} currentIndex={index} onSelect={navigate} booklet={booklet} language={language} onLanguageChange={(v) => { setLanguage(v); setIndex(0) }} search={search} onSearch={setSearch} answerCount={answeredCount} reviewCount={reviewCount} availableLanguages={availableLanguages} />

    <Box sx={{ ml: { md: '300px' } }}>
      <LinearProgress variant="determinate" value={progress} sx={{ height: 4 }} />
      <Container maxWidth="lg" sx={{ py: { xs: 2, md: 4 } }}>
        <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" gap={1.5} mb={2}>
          <Box><Typography variant="h4">{current ? `Question ${current.question_number}` : 'No questions'}</Typography><Typography color="text.secondary">{current?.part_name || ''} • {index + 1} of {questions.length}</Typography></Box>
          <Stack direction="row" gap={1} alignItems="center"><Button size="small" startIcon={<RestartAltRoundedIcon />} color="inherit" onClick={resetSession}>Reset session</Button>{demo && <ChipLike label="DEMO ANSWERS" />}</Stack>
        </Stack>

        {current ? <QuestionCard question={current} selected={answers[current.id] || null} onSelect={selectAnswer} onShowAnswer={() => setShowAnswer(true)} answer={currentAnswer} showAnswer={showAnswer} onOpenSource={() => setSourceOpen(true)} reviewed={Boolean(review[current.id])} onToggleReview={() => setReview((prev) => ({ ...prev, [current.id]: !prev[current.id] }))} /> : <Alert severity="info">No question records are available.</Alert>}

        {current && <Stack direction="row" justifyContent="space-between" alignItems="center" mt={2} gap={1}>
          <Button variant="outlined" startIcon={<ChevronLeftRoundedIcon />} disabled={index === 0} onClick={() => navigate(index - 1)}>Previous</Button>
          <Button variant="contained" endIcon={<ChevronRightRoundedIcon />} disabled={index === questions.length - 1} onClick={() => navigate(index + 1)}>Next</Button>
        </Stack>}

        <Alert severity="warning" sx={{ mt: 3 }}>
          Answer keys are loaded from the GitHub data layer. This sample repository does not fabricate official answers; load the official `answer_key.json` before publishing.
        </Alert>
      </Container>
    </Box>

    <SettingsDialog open={settingsOpen} onClose={() => setSettingsOpen(false)} demo={demo} onDemoToggle={setDemo} />
    <SourceDialog open={sourceOpen} onClose={() => setSourceOpen(false)} question={current} />
  </ThemeProvider>
}

function ChipLike({ label }) { return <Box sx={{ px: 1.2, py: 0.6, borderRadius: 2, bgcolor: 'warning.light', color: 'warning.contrastText', fontWeight: 800, fontSize: 12 }}>{label}</Box> }

export default App
