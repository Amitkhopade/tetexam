import React, { useMemo, useState } from 'react'
import ReactDOM from 'react-dom/client'
import {
  Alert, Box, Button, Card, CardContent, Checkbox, Chip, CssBaseline, Divider,
  FormControlLabel, LinearProgress, Stack, Tab, Tabs, TextField, ThemeProvider, Typography
} from '@mui/material'
import CloudUploadRoundedIcon from '@mui/icons-material/CloudUploadRounded'
import FolderRoundedIcon from '@mui/icons-material/FolderRounded'
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded'
import { lightTheme } from './theme/theme'
import { prepareDatasetForSave, saveDatasetToProject } from './lib/adminUpload'
import { getSession, logout } from './lib/auth'
import AdminAiGenerator from './components/AdminAiGenerator'

async function readJsonFile(file) {
  if (!file) return null
  return JSON.parse(await file.text())
}

function FilePicker({ label, file, onChange, accept }) {
  return <Card variant="outlined"><CardContent><Stack spacing={1.2}>
    <Typography fontWeight={800}>{label}</Typography>
    <input hidden id={`file-${label.replace(/\W+/g, '-')}`} type="file" accept={accept} onChange={(e) => onChange(e.target.files?.[0] || null)} />
    <label htmlFor={`file-${label.replace(/\W+/g, '-')}`}><Button component="span" variant="outlined" startIcon={<CloudUploadRoundedIcon />}>Choose JSON</Button></label>
    <Typography variant="body2" color="text.secondary">{file ? file.name : 'No file selected'}</Typography>
  </Stack></CardContent></Card>
}

function DatasetUploadPanel() {
  const [questionFile, setQuestionFile] = useState(null)
  const [answerFile, setAnswerFile] = useState(null)
  const [paperFile, setPaperFile] = useState(null)
  const [questions, setQuestions] = useState(null)
  const [answers, setAnswers] = useState(null)
  const [paperMeta, setPaperMeta] = useState(null)
  const [paperIdOverride, setPaperIdOverride] = useState('')
  const [overwrite, setOverwrite] = useState(false)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState(null)
  const [result, setResult] = useState(null)

  async function onQuestionChange(file) {
    setQuestionFile(file); setMessage(null); setResult(null)
    if (!file) return setQuestions(null)
    try { setQuestions(await readJsonFile(file)) } catch (e) { setQuestions(null); setMessage({ severity: 'error', text: `Question JSON is invalid: ${e.message}` }) }
  }
  async function onAnswerChange(file) {
    setAnswerFile(file); setMessage(null); setResult(null)
    if (!file) return setAnswers(null)
    try { setAnswers(await readJsonFile(file)) } catch (e) { setAnswers(null); setMessage({ severity: 'error', text: `Answer-key JSON is invalid: ${e.message}` }) }
  }
  async function onPaperChange(file) {
    setPaperFile(file); setMessage(null); setResult(null)
    if (!file) return setPaperMeta(null)
    try { setPaperMeta(await readJsonFile(file)) } catch (e) { setPaperMeta(null); setMessage({ severity: 'error', text: `Paper metadata JSON is invalid: ${e.message}` }) }
  }

  const prepared = useMemo(() => {
    if (!questions || !answers) return null
    try {
      const p = prepareDatasetForSave(questions, answers)
      if (paperIdOverride.trim()) p.meta.paper_id = paperIdOverride.trim()
      if (paperMeta) p.meta = { ...p.meta, ...paperMeta, booklet_code: p.meta.booklet_code, paper_id: paperIdOverride.trim() || paperMeta.paper_id || p.meta.paper_id }
      return p
    } catch (e) { return { validation: { ok: false, errors: [e.message], warnings: [] }, meta: {}, questions, answers } }
  }, [questions, answers, paperMeta, paperIdOverride])

  async function save() {
    setMessage(null); setResult(null)
    if (!prepared) return setMessage({ severity: 'error', text: 'Select both Question JSON and Answer Key JSON first.' })
    if (!prepared.validation.ok) return setMessage({ severity: 'error', text: 'Fix validation errors before saving.' })
    setBusy(true)
    try {
      const payload = { ...prepared, overwrite }
      const saved = await saveDatasetToProject(payload)
      setResult(saved)
      setMessage({ severity: 'success', text: `Dataset ${saved.paper_id} saved to the project.` })
    } catch (e) {
      setMessage({ severity: 'error', text: e.message })
    } finally { setBusy(false) }
  }

  return <Stack spacing={2.2}>
    <Alert severity="info">Manual JSON upload remains unchanged. Use it when you already have a project-compatible questions.json and answer_key.json.</Alert>
    <Stack spacing={1.5}>
      <FilePicker label="Question JSON" file={questionFile} onChange={onQuestionChange} accept="application/json,.json" />
      <FilePicker label="Answer Key JSON" file={answerFile} onChange={onAnswerChange} accept="application/json,.json" />
      <FilePicker label="Paper Metadata JSON (optional)" file={paperFile} onChange={onPaperChange} accept="application/json,.json" />
    </Stack>
    <TextField label="Paper ID override (optional)" value={paperIdOverride} onChange={(e) => setPaperIdOverride(e.target.value)} placeholder="ACF-26-I-PAPER-I-O" fullWidth />
    <FormControlLabel control={<Checkbox checked={overwrite} onChange={(e) => setOverwrite(e.target.checked)} />} label="Replace an existing paper with the same booklet code" />
    {prepared && <Card variant="outlined"><CardContent><Stack spacing={1.5}>
      <Stack direction="row" spacing={1} flexWrap="wrap"><Chip label={`Paper ${prepared.meta.booklet_code || '—'}`} /><Chip label={`${prepared.meta.question_count || 0} logical questions`} /><Chip label={`${prepared.validation.answerCount || 0} answers`} color={prepared.validation.ok ? 'success' : 'warning'} /></Stack>
      {prepared.validation.errors?.length ? <Alert severity="error"><Typography fontWeight={800}>Validation errors</Typography>{prepared.validation.errors.map((e) => <Typography key={e} variant="body2">• {e}</Typography>)}</Alert> : <Alert severity="success" icon={<CheckCircleRoundedIcon />}>Structure validation passed. Ready to save.</Alert>}
      {!!prepared.validation.warnings?.length && <Alert severity="warning">{prepared.validation.warnings.map((w) => <Typography key={w} variant="body2">• {w}</Typography>)}</Alert>}
    </Stack></CardContent></Card>}
    {busy && <LinearProgress />}
    {message && <Alert severity={message.severity}>{message.text}</Alert>}
    {result && <Card variant="outlined"><CardContent><Stack spacing={0.8}><Typography fontWeight={800}>Saved locations</Typography>{(result.paths || []).map((p) => <Typography key={p} variant="body2" sx={{ fontFamily: 'monospace' }}>{p}</Typography>)}<Divider /><Typography variant="body2">Commit and push the changed files to GitHub after reviewing them.</Typography></Stack></CardContent></Card>}
    <Stack direction="row" justifyContent="flex-end" spacing={1}><Button variant="contained" disabled={busy || !prepared?.validation?.ok} onClick={save} startIcon={<CloudUploadRoundedIcon />}>Save to Project</Button></Stack>
  </Stack>
}

function AdminUpload() {
  const session = getSession()
  const [tab, setTab] = useState(0)

  if (!session || session.role !== 'admin') {
    return <ThemeProvider theme={lightTheme}><CssBaseline /><Box sx={{ minHeight: '100vh', display: 'grid', placeItems: 'center', p: 3 }}><Card sx={{ maxWidth: 520, width: '100%' }}><CardContent><Stack spacing={2}><Typography variant="h5">Administrator access required</Typography><Typography color="text.secondary">Sign in as an administrator before opening the admin workspace.</Typography><Stack direction="row" spacing={1}><Button variant="contained" onClick={() => { window.location.href = './' }}>Go to Login</Button>{session && <Button variant="outlined" onClick={() => { logout(); window.location.href = './' }}>Sign out</Button>}</Stack></Stack></CardContent></Card></Box></ThemeProvider>
  }

  return <ThemeProvider theme={lightTheme}><CssBaseline />
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', p: { xs: 1.5, md: 3 } }}>
      <Box maxWidth="1200px" mx="auto">
        <Stack spacing={2}>
          <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" alignItems={{ xs: 'stretch', md: 'center' }} gap={1}>
            <Box><Stack direction="row" spacing={1} alignItems="center"><FolderRoundedIcon color="primary" /><Typography variant="h4">Admin Workspace</Typography></Stack><Typography color="text.secondary" sx={{ mt: .5 }}>Dataset operations and AI-assisted document generation. Student exam pages remain outside this workspace.</Typography></Box>
            <Button variant="outlined" onClick={() => { logout(); window.location.href = './' }}>Logout</Button>
          </Stack>
          <Card><CardContent>
            <Tabs value={tab} onChange={(_, v) => setTab(v)} variant="scrollable" allowScrollButtonsMobile>
              <Tab label="AI Document Generator" icon={<span>✦</span>} iconPosition="start" />
              <Tab label="Manual JSON Upload" icon={<CloudUploadRoundedIcon />} iconPosition="start" />
            </Tabs>
          </CardContent></Card>
          {tab === 0 && <AdminAiGenerator />}
          {tab === 1 && <DatasetUploadPanel />}
        </Stack>
      </Box>
    </Box>
  </ThemeProvider>
}

ReactDOM.createRoot(document.getElementById('root')).render(<React.StrictMode><AdminUpload /></React.StrictMode>)
