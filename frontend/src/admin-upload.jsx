import React, { useMemo, useState } from 'react'
import ReactDOM from 'react-dom/client'
import {
  Alert, Box, Button, Card, CardContent, Checkbox, Chip, CssBaseline, Divider,
  FormControlLabel, LinearProgress, Stack, TextField, ThemeProvider, Typography
} from '@mui/material'
import CloudUploadRoundedIcon from '@mui/icons-material/CloudUploadRounded'
import FolderRoundedIcon from '@mui/icons-material/FolderRounded'
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded'
import ErrorRoundedIcon from '@mui/icons-material/ErrorRounded'
import { lightTheme } from './theme/theme'
import { prepareDatasetForSave, saveDatasetToProject } from './lib/adminUpload'

async function readJsonFile(file) {
  if (!file) return null
  return JSON.parse(await file.text())
}

function FilePicker({ label, file, onChange, accept }) {
  return (
    <Card variant="outlined">
      <CardContent>
        <Stack spacing={1.2}>
          <Typography fontWeight={800}>{label}</Typography>
          <input hidden id={`file-${label.replace(/\W+/g, '-')}`} type="file" accept={accept} onChange={(e) => onChange(e.target.files?.[0] || null)} />
          <label htmlFor={`file-${label.replace(/\W+/g, '-')}`}>
            <Button component="span" variant="outlined" startIcon={<CloudUploadRoundedIcon />}>Choose JSON</Button>
          </label>
          <Typography variant="body2" color="text.secondary">{file ? file.name : 'No file selected'}</Typography>
        </Stack>
      </CardContent>
    </Card>
  )
}

function AdminUpload() {
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

  return (
    <ThemeProvider theme={lightTheme}><CssBaseline />
      <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', p: { xs: 2, md: 4 } }}>
        <Box maxWidth="980px" mx="auto">
          <Stack spacing={2.5}>
            <Box>
              <Stack direction="row" spacing={1.2} alignItems="center"><FolderRoundedIcon color="primary" /><Typography variant="h4">Dataset Upload</Typography></Stack>
              <Typography color="text.secondary" sx={{ mt: 0.5 }}>Add a new paper to the local project. The public exam UI is unchanged.</Typography>
            </Box>
            <Alert severity="info">Use this page from the local Vite development server. It writes the validated JSON into the project and updates <code>catalog.json</code>. A GitHub Pages deployment cannot write back into your repository.</Alert>

            <Stack spacing={1.5}>
              <FilePicker label="Question JSON" file={questionFile} onChange={onQuestionChange} accept="application/json,.json" />
              <FilePicker label="Answer Key JSON" file={answerFile} onChange={onAnswerChange} accept="application/json,.json" />
              <FilePicker label="Paper Metadata JSON (optional)" file={paperFile} onChange={onPaperChange} accept="application/json,.json" />
            </Stack>

            <TextField label="Paper ID override (optional)" value={paperIdOverride} onChange={(e) => setPaperIdOverride(e.target.value)} placeholder="ACF-26-I-PAPER-I-O" fullWidth />
            <FormControlLabel control={<Checkbox checked={overwrite} onChange={(e) => setOverwrite(e.target.checked)} />} label="Replace an existing paper with the same booklet code" />

            {prepared && <Card variant="outlined"><CardContent><Stack spacing={1.5}>
              <Stack direction="row" spacing={1} flexWrap="wrap"><Chip label={`Paper ${prepared.meta.booklet_code}`} /><Chip label={`${prepared.meta.question_count} questions`} /><Chip label={`${prepared.validation.answerCount} answers`} color="success" /></Stack>
              {prepared.validation.errors.length ? <Alert severity="error"><Typography fontWeight={800}>Validation errors</Typography>{prepared.validation.errors.map((e) => <Typography key={e} variant="body2">• {e}</Typography>)}</Alert> : <Alert severity="success" icon={<CheckCircleRoundedIcon />}>Structure validation passed. Ready to save.</Alert>}
              {!!prepared.validation.warnings.length && <Alert severity="warning">{prepared.validation.warnings.map((w) => <Typography key={w} variant="body2">• {w}</Typography>)}</Alert>}
            </Stack></CardContent></Card>}

            {busy && <LinearProgress />}
            {message && <Alert severity={message.severity}>{message.text}</Alert>}
            {result && <Card variant="outlined"><CardContent><Stack spacing={0.8}><Typography fontWeight={800}>Saved locations</Typography>{(result.paths || []).map((p) => <Typography key={p} variant="body2" sx={{ fontFamily: 'monospace' }}>{p}</Typography>)}<Divider /><Typography variant="body2">Refresh the main application after save. The new paper is now part of the local project data.</Typography></Stack></CardContent></Card>}

            <Stack direction="row" justifyContent="flex-end" spacing={1}><Button variant="contained" disabled={busy || !prepared?.validation?.ok} onClick={save} startIcon={<CloudUploadRoundedIcon />}>Save to Project</Button><Button variant="text" onClick={() => window.close()}>Close</Button></Stack>
          </Stack>
        </Box>
      </Box>
    </ThemeProvider>
  )
}

ReactDOM.createRoot(document.getElementById('root')).render(<React.StrictMode><AdminUpload /></React.StrictMode>)
