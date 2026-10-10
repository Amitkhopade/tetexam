import { useEffect, useState } from 'react'
import { Alert, Box, CircularProgress, CssBaseline, Stack, Typography, ThemeProvider } from '@mui/material'
import LoginPage from './components/LoginPage'
import SiteHeader from './components/SiteHeader'
import HomePage from './components/HomePage'
import InfoPage from './components/InfoPage'
import ResultPage from './components/ResultPage'
import ExamView from './components/ExamView'
import SiteFooter from './components/SiteFooter'
import PublicSite from './components/PublicSite'
import PricingPage from './components/PricingPage'
import { AccountPanel, RegisterPage, ForgotPasswordPage, PasswordTokenPage, ChangePasswordPage } from './components/AccountPages'
import { getSession, logout } from './lib/auth'
import { getDurationMinutes, startExamSession, getExamSession, scoreExam, updateExamSession } from './lib/examSession'
import { loadJson, normalizeQuestionRows } from './lib/data'
import { lightTheme } from './theme/theme'

function AdminHome({ onOpenUploader }) {
  return <Box sx={{ maxWidth: 900, mx: 'auto', p: { xs: 2.5, md: 5 } }}>
    <Stack spacing={2}><Typography variant="h4">Admin workspace</Typography><Typography color="text.secondary">Use AI Document Generator to process PDFs and save new paid assessments privately. Manual JSON upload writes static project files only when running locally; use the generated download files for a new free static paper.</Typography><Alert severity="info">Hosted administration uses server-side account and payment APIs. Static free-paper JSON remains read-only on Vercel; the existing H/K/L/M/N mock tests are permanently free. New paid assessments can be stored privately in the configured database.</Alert>
      <Box><Typography component="div" sx={{ mb: 1.5 }}>Administrator tools</Typography><Stack direction="row" spacing={1}><Box component="button" onClick={onOpenUploader} sx={{ border: 0, cursor: 'pointer', px: 2, py: 1.2, borderRadius: 3, bgcolor: 'primary.main', color: 'white', fontWeight: 800 }}>Open Dataset Uploader</Box></Stack></Box>
    </Stack>
  </Box>
}

function AppShell({ session, onLogout, onSessionUpdate, initialTab = 'home', onNavigate }) {
  const [tab, setTab] = useState(initialTab)
  const [pendingPaper, setPendingPaper] = useState(null)
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
    let cancelled = false
    async function loadCatalog() {
      try {
        const response = await fetch('/api/catalog', { cache: 'no-store' })
        if (response.ok) return await response.json()
      } catch {}
      return loadJson('./data/catalog.json')
    }
    loadCatalog()
      .then((catalog) => { if (!cancelled) setPapers(catalog.papers || []) })
      .catch((e) => { if (!cancelled) setCatalogError(e.message) })
    return () => { cancelled = true }
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
      let q, a, meta
      if (paper.access_tier === 'paid' || paper.source === 'private_database') {
        const response = await fetch(`/api/exams/load?paper_id=${encodeURIComponent(paper.paper_id)}`, { credentials: 'same-origin', cache: 'no-store' })
        const body = await response.json().catch(() => ({}))
        if (!response.ok || !body.ok) throw new Error(body.message || `Paid assessment unavailable (${response.status}).`)
        q = body.questions; a = body.answer_key; meta = body.paper
      } else {
        ;[q, a, meta] = await Promise.all([
          loadJson(`./data/${code}/questions.json`),
          loadJson(`./data/${code}/answer_key.json`),
          loadJson(`./data/${code}/paper.json`),
        ])
      }
      setBooklet(code); setPaperMeta(meta); setQuestionsData(q); setAnswerKey(a)
      return { meta, questionsData: q, answerKey: a }
    } catch (e) {
      setCatalogError(`Could not load Set ${code}: ${e.message}`)
      throw e
    } finally { setLoadingExam(false) }
  }

  async function startExam(paper) {
    try {
      if (paper.access_tier === 'paid' || paper.source === 'private_database') {
        const response = await fetch(`/api/billing/access?paper_id=${encodeURIComponent(paper.paper_id)}`, { credentials: 'same-origin', cache: 'no-store' })
        const access = await response.json().catch(() => ({}))
        if (!response.ok || !access.allowed) {
          setPendingPaper(paper)
          setCatalogError(access.message || 'This assessment requires verified paid access. Choose a plan to continue.')
          setTab('pricing')
          return
        }
      }
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

  async function handleLogout() {
    await logout()
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
    {tab === 'home' && <HomePage papers={papers} greeting={session.fullName || session.displayName || session.username} onStart={startExam} onOpenExams={() => setTab('exams')} />}
    {tab === 'exams' && <Box sx={{ maxWidth: 1200, mx: 'auto' }}><HomePage papers={papers} onStart={startExam} onOpenExams={() => {}} showHero={false} /></Box>}
    {tab === 'instructions' && <InfoPage type="instructions" />}
    {tab === 'about' && <InfoPage type="about" />}
    {tab === 'profile' && <AccountPanel session={session} onSessionUpdate={onSessionUpdate} onNavigate={onNavigate} />}
    {tab === 'pricing' && <PricingPage session={session} onNavigate={(path) => setTab(path === '/pricing' ? 'pricing' : 'home')} onPurchased={() => { if (pendingPaper) { const paper = pendingPaper; setPendingPaper(null); setCatalogError(''); startExam(paper) } else { setTab('home') } }} />}
    {tab === 'admin' && session.role === 'admin' && <AdminHome onOpenUploader={() => window.open('./admin-upload.html', '_blank', 'noopener,noreferrer')} />}
    {tab === 'result' && result && paperMeta && <ResultPage paperMeta={paperMeta} result={result} onRetake={retake} onHome={goHome} />}
    {tab === 'exam' && examSession && paperMeta && questionsData && <ExamView booklet={booklet} language={examSession.language || (paperMeta.available_languages || ['en'])[0]} paperMeta={paperMeta} questionsData={questionsData} answerKey={answerKey} dark={dark} demo={demo} isAdmin={session.role === 'admin'} onDemoToggle={setDemo} onThemeToggle={() => setDark((v) => { const n = !v; localStorage.setItem('qpn:v1:theme', n ? 'dark' : 'light'); return n })} onOpenSettings={() => {}} onHome={goHome} onComplete={finishExam} />}
    {tab !== 'exam' && <SiteFooter />}
  </ThemeProvider>
}

function Loading() { return <ThemeProvider theme={lightTheme}><CssBaseline /><Box minHeight="100vh" display="grid" placeItems="center"><Stack alignItems="center" spacing={2}><CircularProgress /><Typography color="text.secondary">Loading exam…</Typography></Stack></Box></ThemeProvider> }

function Root() {
  const [session, setSession] = useState(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [path, setPath] = useState(() => window.location.pathname || '/')
  const [publicPapers, setPublicPapers] = useState([])

  function navigate(nextPath) {
    const target = String(nextPath || '/')
    if (window.location.pathname + window.location.search !== target) window.history.pushState({}, '', target)
    setPath(window.location.pathname || '/')
  }

  useEffect(() => {
    const onPop = () => setPath(window.location.pathname || '/')
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  useEffect(() => {
    let cancelled = false
    getSession().then((user) => { if (!cancelled) setSession(user) }).finally(() => { if (!cancelled) setAuthLoading(false) })
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    let cancelled = false
    async function readCatalog() {
      try { const r = await fetch('/api/catalog', { cache: 'no-store' }); if (r.ok) return await r.json() } catch {}
      try { return await loadJson('./data/catalog.json') } catch { return { papers: [] } }
    }
    readCatalog().then((c) => { if (!cancelled) setPublicPapers(c.papers || []) })
    return () => { cancelled = true }
  }, [])

  if (authLoading && path !== '/') return <Loading />
  const normalizedPathPage = path === '/' || path === '/index.html' ? 'home' : path.replace(/^\/+/, '').replace(/\/$/, '')
  if (session && ['terms','privacy','blog','contact'].includes(normalizedPathPage)) {
    return <PublicSite page={normalizedPathPage} onNavigate={navigate} papers={publicPapers} />
  }
  if (session) {
    const page = path.replace(/^\/+/, '').split(/[?#]/)[0]
    if (session.mustChangePassword) return <ChangePasswordPage session={session} forced onNavigate={navigate} onPasswordChanged={(user) => setSession(user)} />
    const initialTab = page === 'pricing' ? 'pricing' : page === 'profile' ? 'profile' : 'home'
    return <AppShell key={session.id} session={session} initialTab={initialTab} onNavigate={navigate} onSessionUpdate={setSession} onLogout={() => { setSession(null); navigate('/') }} />
  }

  const page = path === '/' || path === '/index.html' ? 'home' : path.replace(/^\/+/, '').replace(/\/$/, '')
  if (page === 'login') return <LoginPage onAuthenticated={(user) => {
    const next = localStorage.getItem('qpn:afterLogin') || (path === '/pricing' ? '/pricing' : '/dashboard')
    localStorage.removeItem('qpn:afterLogin')
    setSession(user); navigate(next)
  }} onNavigate={navigate} />
  if (page === 'register') return <RegisterPage onNavigate={navigate} />
  if (page === 'forgot-password') return <ForgotPasswordPage onNavigate={navigate} />
  if (page === 'activate') return <PasswordTokenPage purpose="activate" token={new URLSearchParams(window.location.search).get('token') || ''} onNavigate={navigate} />
  if (page === 'reset-password') return <PasswordTokenPage purpose="reset" token={new URLSearchParams(window.location.search).get('token') || ''} onNavigate={navigate} />
  const publicPages = ['home','pricing','blog','terms','privacy','about','contact']
  return <PublicSite page={publicPages.includes(page) ? page : 'notFound'} onNavigate={navigate} papers={publicPapers} />
}

export default Root
