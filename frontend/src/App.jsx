import { useEffect, useState } from 'react'
import { Alert, Box, CircularProgress, CssBaseline, Stack, Typography, ThemeProvider } from '@mui/material'
import LoginPage from './components/LoginPage'
import SiteHeader from './components/SiteHeader'
import HomePage from './components/HomePage'
import InfoPage from './components/InfoPage'
import ResultPage from './components/ResultPage'
import ExamView from './components/ExamView'
import SiteFooter from './components/SiteFooter'
import { getSession, logout } from './lib/auth'
import { getDurationMinutes, startExamSession, getExamSession, scoreExam, updateExamSession } from './lib/examSession'
import { loadJson, normalizeQuestionRows } from './lib/data'
import { lightTheme } from './theme/theme'

function AdminHome({ onOpenUploader }) {
  return <Box sx={{ maxWidth: 900, mx: 'auto', p: { xs: 2.5, md: 5 } }}>
    <Stack spacing={2}><Typography variant="h4">Admin workspace</Typography><Typography color="text.secondary">Use the existing local JSON uploader to add or replace an exam dataset. The uploader writes into the project data structure and updates the catalog.</Typography><Alert severity="info">This is a local-development administration capability. A static GitHub Pages site cannot safely write files back into GitHub.</Alert>
      <Box><Typography component="div" sx={{ mb: 1.5 }}>Administrator tools</Typography><Stack direction="row" spacing={1}><Box component="button" onClick={onOpenUploader} sx={{ border: 0, cursor: 'pointer', px: 2, py: 1.2, borderRadius: 3, bgcolor: 'primary.main', color: 'white', fontWeight: 800 }}>Open Dataset Uploader</Box></Stack></Box>
    </Stack>
  </Box>
}

function AppShell({ session, onLogout }) {
  const [tab, setTab] = useState('home')
  const [papers, setPapers] = useState([])
  const [catalogError, setCatalogError] = useState('')
  const [booklet, setBooklet] = useState(null)
  const [paperMeta, setPaperMeta] = useState(null)
  const [questionsData, setQuestionsData] = useState(null)
  const [answerKey, setAnswerKey] = useState(null)
  const [examSession, setExamSession] = useState(null)
  const [result, setResult] = useState(null)
  const [loadingExam, setLoadingExam] = useState(false)
  const [dark, setDark] = useState(localStorage.getItem('qpn:v1:theme') === 'dark')
  const [demo, setDemo] = useState(localStorage.getItem('qpn:v1:demo') === 'true')
  const [resumePaper, setResumePaper] = useState(() => localStorage.getItem('qpn:lastPaper') || null)

  useEffect(() => {
    loadJson('./data/catalog.json')
      .then((catalog) => setPapers(catalog.papers || []))
      .catch((e) => setCatalogError(e.message))
  }, [])

  useEffect(() => {
    if (!resumePaper || !papers.length) return undefined
    let cancelled = false
    const active = getExamSession(resumePaper)
    if (!active) { setResumePaper(null); return undefined }
    const paper = papers.find((p) => p.paper_id === resumePaper || p.booklet_code === active.booklet_code)
    if (!paper) { setResumePaper(null); return undefined }

    loadPaper(paper).then(({ meta, questionsData: loadedQuestions, answerKey: loadedAnswerKey }) => {
      if (cancelled) return
      if (active.completed === true && active.result) {
        setExamSession(active)
        setResult({ ...active.result, reason: active.completion_reason || 'manual_submit' })
        setTab('result')
        return
      }
      if (active.completed === false && Number(active.deadline_ms) > Date.now()) {
        setExamSession(active)
        setTab('exam')
        return
      }
      if (active.completed === false) {
        const language = active.language || (meta.available_languages || ['en'])[0] || 'en'
        const questions = normalizeQuestionRows(loadedQuestions, language)
        const result = scoreExam(questions, loadedAnswerKey, language, active.answers || {})
        const completed = updateExamSession(resumePaper, {
          ...active,
          completed: true,
          completed_at: new Date().toISOString(),
          completion_reason: 'time_expired',
          result,
        })
        setExamSession(completed || { ...active, completed: true, result })
        setResult({ ...result, reason: 'time_expired' })
        setTab('result')
      } else {
        setResumePaper(null)
      }
    }).catch(() => { if (!cancelled) setResumePaper(null) })

    return () => { cancelled = true }
  }, [papers, resumePaper])

  useEffect(() => {
    localStorage.setItem('qpn:v1:demo', String(demo))
  }, [demo])

  async function loadPaper(paper) {
    setLoadingExam(true); setCatalogError('')
    const code = paper.booklet_code
    try {
      const [q, a, meta] = await Promise.all([
        loadJson(`./data/${code}/questions.json`),
        loadJson(`./data/${code}/answer_key.json`),
        loadJson(`./data/${code}/paper.json`),
      ])
      setBooklet(code); setPaperMeta(meta); setQuestionsData(q); setAnswerKey(a)
      return { meta, questionsData: q, answerKey: a }
    } catch (e) {
      setCatalogError(`Could not load Set ${code}: ${e.message}`)
      throw e
    } finally { setLoadingExam(false) }
  }

  async function startExam(paper) {
    try {
      const { meta } = await loadPaper(paper)
      const normalized = { ...paper, ...meta, paper_id: meta.paper_id || paper.paper_id, booklet_code: codeOf(paper, meta), preferred_language: paper.preferred_language || paper.language, duration_minutes: getDurationMinutes(meta) }
      const session = startExamSession(normalized)
      setExamSession(session)
      localStorage.setItem('qpn:lastPaper', normalized.paper_id)
      setResult(null)
      setTab('exam')
    } catch {}
  }

  function codeOf(paper, meta) { return meta.booklet_code || paper.booklet_code }

  function finishExam(score, reason) {
    setResult({ ...score, reason })
    setTab('result')
  }

  async function retake() {
    if (!paperMeta) return
    const session = startExamSession({ ...paperMeta, preferred_language: examSession?.language || paperMeta.available_languages?.[0] || 'en' })
    setExamSession(session)
    localStorage.setItem('qpn:lastPaper', paperMeta.paper_id)
    setResult(null)
    setTab('exam')
  }

  function goHome() {
    localStorage.removeItem('qpn:lastPaper')
    setTab('home')
    setExamSession(null)
    setResult(null)
  }

  function handleTab(next) {
    if (next === 'admin') {
      if (session.role !== 'admin') return setTab('home')
      setTab('admin')
      return
    }
    if (tab === 'exam' && examSession?.completed === false && next !== 'result') return
    setTab(next)
  }

  function handleLogout() {
    logout()
    setExamSession(null)
    setPaperMeta(null)
    setQuestionsData(null)
    setAnswerKey(null)
    localStorage.removeItem('qpn:lastPaper')
    onLogout()
  }

  if (tab === 'exam' && loadingExam) return <Loading />

  return <ThemeProvider theme={lightTheme}><CssBaseline />
    {tab !== 'exam' && <SiteHeader session={session} tab={tab === 'result' ? 'home' : tab} onTabChange={handleTab} onLogout={handleLogout} />}
    {catalogError && <Box sx={{ px: 2, pt: 2, maxWidth: 1200, mx: 'auto' }}><Alert severity="error">{catalogError}</Alert></Box>}
    {tab === 'home' && <HomePage papers={papers} onStart={startExam} onOpenExams={() => setTab('exams')} />}
    {tab === 'exams' && <Box sx={{ maxWidth: 1200, mx: 'auto' }}><HomePage papers={papers} onStart={startExam} onOpenExams={() => {}} showHero={false} /></Box>}
    {tab === 'instructions' && <InfoPage type="instructions" />}
    {tab === 'about' && <InfoPage type="about" />}
    {tab === 'admin' && session.role === 'admin' && <AdminHome onOpenUploader={() => window.open('./admin-upload.html', '_blank', 'noopener,noreferrer')} />}
    {tab === 'result' && result && paperMeta && <ResultPage paperMeta={paperMeta} result={result} onRetake={retake} onHome={goHome} />}
    {tab === 'exam' && examSession && paperMeta && questionsData && <ExamView booklet={booklet} language={examSession.language || (paperMeta.available_languages || ['en'])[0]} paperMeta={paperMeta} questionsData={questionsData} answerKey={answerKey} dark={dark} demo={demo} isAdmin={session.role === 'admin'} onDemoToggle={setDemo} onThemeToggle={() => setDark((v) => { const n = !v; localStorage.setItem('qpn:v1:theme', n ? 'dark' : 'light'); return n })} onOpenSettings={() => {}} onHome={goHome} onComplete={finishExam} />}
    {tab !== 'exam' && <SiteFooter />}
  </ThemeProvider>
}

function Loading() { return <ThemeProvider theme={lightTheme}><CssBaseline /><Box minHeight="100vh" display="grid" placeItems="center"><Stack alignItems="center" spacing={2}><CircularProgress /><Typography color="text.secondary">Loading exam…</Typography></Stack></Box></ThemeProvider> }

function Root() {
  const [session, setSession] = useState(getSession())
  if (!session) return <LoginPage onAuthenticated={setSession} />
  return <AppShell session={session} onLogout={() => setSession(null)} />
}

export default Root
