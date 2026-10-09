import { useMemo, useState } from 'react'
import {
  Alert, Box, Button, Card, CardContent, Chip, Divider, FormControl, FormControlLabel,
  InputLabel, MenuItem, Select, Stack, Tab, Tabs, TextField, Typography, LinearProgress,
  Switch, Grid, IconButton, Tooltip
} from '@mui/material'
import AutoAwesomeRoundedIcon from '@mui/icons-material/AutoAwesomeRounded'
import KeyRoundedIcon from '@mui/icons-material/KeyRounded'
import PictureAsPdfRoundedIcon from '@mui/icons-material/PictureAsPdfRounded'
import DownloadRoundedIcon from '@mui/icons-material/DownloadRounded'
import SaveRoundedIcon from '@mui/icons-material/SaveRounded'
import DeleteSweepRoundedIcon from '@mui/icons-material/DeleteSweepRounded'
import SendRoundedIcon from '@mui/icons-material/SendRounded'
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded'
import { AI_PROVIDERS, callAdminAi, getDefaultAiSettings, normalizeGeneratedPackage, parseJsonFromModelText, readAiSettings, writeAiSettings } from '../lib/adminAi'
import { prepareDatasetForSave, saveDatasetToProject } from '../lib/adminUpload'
import DEFAULT_EXTRACTION_PROMPT from '../prompts/AI_QUESTION_ANSWER_JSON_GENERATION_PROMPT.md?raw'

const PROMPT_SESSION_KEY = 'qpn:admin-ai:extraction-prompt:v1'

function readExtractionPrompt() {
  try { return sessionStorage.getItem(PROMPT_SESSION_KEY) || DEFAULT_EXTRACTION_PROMPT.trim() }
  catch { return DEFAULT_EXTRACTION_PROMPT.trim() }
}

function fileLabel(file) { return file ? `${file.name} • ${(file.size / 1024 / 1024).toFixed(2)} MB` : 'No PDF selected' }

function downloadJson(filename, value) {
  const blob = new Blob([JSON.stringify(value, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}

function TabPanel({ active, index, children }) { return active === index ? <Box sx={{ pt: 2 }}>{children}</Box> : null }

export default function AdminAiGenerator() {
  const initial = useMemo(() => readAiSettings(), [])
  const [provider, setProvider] = useState(initial.provider || 'openai')
  const [models, setModels] = useState(initial.models || getDefaultAiSettings().models)
  const [keys, setKeys] = useState(initial.keys || {})
  const [remember, setRemember] = useState(Boolean(initial.remember))
  const [questionPdf, setQuestionPdf] = useState(null)
  const [answerPdf, setAnswerPdf] = useState(null)
  const [extraPrompt, setExtraPrompt] = useState('')
  const [masterPrompt, setMasterPrompt] = useState(() => readExtractionPrompt())
  const [activeTab, setActiveTab] = useState(0)
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState(null)
  const [generated, setGenerated] = useState(null)
  const [validation, setValidation] = useState(null)
  const [chat, setChat] = useState([])
  const [chatInput, setChatInput] = useState('')
  const [testing, setTesting] = useState(false)

  const model = models[provider] || AI_PROVIDERS[provider].defaultModel
  const apiKey = keys[provider] || ''

  function persistSettings(next = {}) {
    const settings = { provider, model, models, keys, remember, ...next }
    writeAiSettings(settings)
  }

  function changeProvider(value) {
    const nextModel = models[value] || AI_PROVIDERS[value].defaultModel
    setProvider(value); setStatus(null)
    setModels((prev) => ({ ...prev, [value]: nextModel }))
  }

  function saveKey() {
    persistSettings()
    setStatus({ severity: 'success', text: remember ? 'AI settings saved for this browser session.' : 'Key kept only in this page session.' })
  }

  function savePromptForSession() {
    try {
      sessionStorage.setItem(PROMPT_SESSION_KEY, masterPrompt)
      setStatus({ severity: 'success', text: 'Extraction prompt saved for this browser session.' })
    } catch {
      setStatus({ severity: 'warning', text: 'Prompt remains available in this page, but browser session storage is unavailable.' })
    }
  }

  function resetPromptToDefault() {
    setMasterPrompt(DEFAULT_EXTRACTION_PROMPT.trim())
    try { sessionStorage.removeItem(PROMPT_SESSION_KEY) } catch {}
    setStatus({ severity: 'info', text: 'Restored the bundled project-compatible extraction prompt.' })
  }

  function clearKey() {
    const nextKeys = { ...keys }
    delete nextKeys[provider]
    setKeys(nextKeys)
    persistSettings({ keys: nextKeys })
    setStatus({ severity: 'info', text: `Saved ${AI_PROVIDERS[provider].label} credential cleared.` })
  }

  async function testConnection() {
    setTesting(true); setStatus(null)
    try {
      await callAdminAi({ provider, model, apiKey, mode: 'chat', prompt: 'Reply with exactly: AI connection OK', history: [] })
      setStatus({ severity: 'success', text: `${AI_PROVIDERS[provider].label} responded successfully.` })
    } catch (e) {
      setStatus({ severity: 'error', text: e.message })
    } finally { setTesting(false) }
  }

  async function generate() {
    if (!questionPdf || !answerPdf) return setStatus({ severity: 'error', text: 'Select both Question Paper PDF and Answer Key PDF.' })
    setBusy(true); setStatus(null); setValidation(null)
    try {
      const response = await callAdminAi({
        provider, model, apiKey, mode: 'generate', questionPdf, answerPdf,
        prompt: `${masterPrompt.trim()}\n\nADDITIONAL ADMINISTRATOR INSTRUCTIONS (must not override source evidence or the project JSON contract):\n${extraPrompt.trim() || '(none)'}`,
      })
      const parsed = normalizeGeneratedPackage(parseJsonFromModelText(response.text))
      if (!parsed.questions || !parsed.answer_key || !parsed.paper) throw new Error('The AI response is missing required questions, answer_key, or paper sections.')
      setGenerated(parsed)
      setChat((prev) => [...prev, { role: 'system', text: `Generated a dataset using ${AI_PROVIDERS[provider].label} / ${model}.` }])
      const prepared = prepareDatasetForSave(parsed.questions, parsed.answer_key)
      setValidation(prepared.validation)
      setStatus({ severity: prepared.validation.ok ? 'success' : 'warning', text: prepared.validation.ok ? 'Generated dataset passed the project pre-save validation.' : 'Generated JSON needs review before it can be saved.' })
      setActiveTab(1)
    } catch (e) {
      setStatus({ severity: 'error', text: e.message })
    } finally { setBusy(false) }
  }

  async function sendChat() {
    const text = chatInput.trim()
    if (!text) return
    setChatInput('')
    const next = [...chat, { role: 'user', text }]
    setChat(next)
    setBusy(true); setStatus(null)
    try {
      const response = await callAdminAi({
        provider, model, apiKey, mode: 'chat', questionPdf, answerPdf,
        prompt: text,
        history: next.slice(-8).map(({ role, text: content }) => ({ role: role === 'system' ? 'assistant' : role, content })),
      })
      setChat((prev) => [...prev, { role: 'assistant', text: response.text || '(No response text returned.)' }])
    } catch (e) {
      setStatus({ severity: 'error', text: e.message })
    } finally { setBusy(false) }
  }

  async function saveGenerated() {
    if (!generated) return
    try {
      const prepared = prepareDatasetForSave(generated.questions, generated.answer_key)
      if (!prepared.validation.ok) {
        setValidation(prepared.validation)
        setStatus({ severity: 'error', text: 'Fix validation errors before saving.' })
        setActiveTab(1)
        return
      }
      const aiMeta = generated.paper && typeof generated.paper === 'object' ? generated.paper : {}
      const mergedMeta = {
        ...prepared.meta,
        ...aiMeta,
        paper_id: aiMeta.paper_id || prepared.meta.paper_id,
        booklet_code: prepared.meta.booklet_code,
        question_count: prepared.meta.question_count,
        duration_minutes: Number(aiMeta.duration_minutes || prepared.meta.duration_minutes || 150),
        available_languages: aiMeta.available_languages || prepared.meta.available_languages,
      }
      const saveQuestions = { ...prepared.questions, paper_id: mergedMeta.paper_id, booklet_code: mergedMeta.booklet_code }
      const saveAnswers = { ...prepared.answers, paper_id: mergedMeta.paper_id, booklet_code: mergedMeta.booklet_code }
      const saved = await saveDatasetToProject({ ...prepared, meta: mergedMeta, questions: saveQuestions, answers: saveAnswers, overwrite: false })
      setStatus({ severity: 'success', text: `Saved ${saved.paper_id} to the local project.` })
    } catch (e) {
      setStatus({ severity: 'error', text: e.message })
    }
  }

  const generatedQuestionRecords = generated?.questions?.questions?.length || 0
  const generatedLogicalCount = generated?.paper?.question_count || new Set((generated?.questions?.questions || []).map((q) => q.question_number)).size
  const inferredCount = Object.keys(generated?.answer_key?.inferred_answers || {}).length

  return <Stack spacing={2.2}>
    <Card>
      <CardContent>
        <Stack spacing={1.5}>
          <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" alignItems={{ xs: 'stretch', md: 'center' }} gap={1.5}>
            <Box>
              <Stack direction="row" spacing={1} alignItems="center"><AutoAwesomeRoundedIcon color="primary" /><Typography variant="h5">AI Document Generator</Typography></Stack>
              <Typography color="text.secondary" sx={{ mt: 0.4 }}>Admin-only workspace. Keys stay in the browser session and are sent only to the local Vite admin proxy; they are not written to exam data.</Typography>
            </Box>
            <Chip label="LOCAL ADMIN ONLY" color="warning" variant="outlined" />
          </Stack>

          <Grid container spacing={1.5}>
            <Grid size={{ xs: 12, md: 4 }}>
              <FormControl fullWidth>
                <InputLabel>Provider</InputLabel>
                <Select value={provider} label="Provider" onChange={(e) => changeProvider(e.target.value)}>
                  {Object.entries(AI_PROVIDERS).map(([id, meta]) => <MenuItem key={id} value={id}>{meta.label}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <TextField fullWidth label="Model" value={model} onChange={(e) => setModels((prev) => ({ ...prev, [provider]: e.target.value }))} />
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <TextField fullWidth label="API key" type="password" placeholder={AI_PROVIDERS[provider].keyHint} value={apiKey} onChange={(e) => setKeys((prev) => ({ ...prev, [provider]: e.target.value }))} InputProps={{ startAdornment: <KeyRoundedIcon color="action" sx={{ mr: 1 }} /> }} />
            </Grid>
          </Grid>

          <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'stretch', sm: 'center' }} gap={1}>
            <FormControlLabel control={<Switch checked={remember} onChange={(e) => setRemember(e.target.checked)} />} label="Remember key for this browser session" />
            <Stack direction="row" spacing={1}>
              <Button variant="outlined" onClick={saveKey}>Save settings</Button>
              <Button variant="text" color="inherit" onClick={clearKey} startIcon={<DeleteSweepRoundedIcon />}>Clear key</Button>
              <Button variant="contained" onClick={testConnection} disabled={testing || !apiKey}>{testing ? 'Testing…' : 'Test connection'}</Button>
            </Stack>
          </Stack>
        </Stack>
      </CardContent>
    </Card>

    <Card>
      <CardContent>
        <Tabs value={activeTab} onChange={(_, value) => setActiveTab(value)} variant="scrollable" allowScrollButtonsMobile>
          <Tab label="Generate Dataset" icon={<AutoAwesomeRoundedIcon />} iconPosition="start" />
          <Tab label="Generated JSON" />
          <Tab label="Chat with PDFs" />
        </Tabs>

        <TabPanel active={activeTab} index={0}>
          <Stack spacing={2}>
            <Alert severity="info">Upload the question paper and the answer key. The full bundled extraction prompt is sent with both PDFs; generated JSON is normalized and checked by the existing project validator before saving.</Alert>
            <Box component="details" sx={{ border: 1, borderColor: 'divider', borderRadius: 3, p: 1.2 }}>
              <Box component="summary" sx={{ cursor: 'pointer', fontWeight: 800, p: 0.7 }}>Master extraction prompt (expand to review or edit)</Box>
              <Stack spacing={1.2} sx={{ pt: 1 }}>
                <Typography variant="body2" color="text.secondary">This is the complete prompt used to extract questions and reconcile the uploaded official answer key. Edits are used immediately; save them for this browser session to retain them across refreshes in the same session.</Typography>
                <TextField fullWidth multiline minRows={10} maxRows={24} label="Master extraction prompt" value={masterPrompt} onChange={(e) => setMasterPrompt(e.target.value)} />
                <Stack direction="row" spacing={1} flexWrap="wrap">
                  <Button variant="outlined" onClick={resetPromptToDefault}>Restore bundled prompt</Button>
                  <Button variant="outlined" onClick={savePromptForSession}>Save prompt for this session</Button>
                </Stack>
              </Stack>
            </Box>
            <Grid container spacing={1.5}>
              <Grid size={{ xs: 12, md: 6 }}>
                <Card variant="outlined"><CardContent><Stack spacing={1}><Typography fontWeight={800}>Question Paper PDF</Typography><Button variant="outlined" component="label" startIcon={<PictureAsPdfRoundedIcon />}>Choose PDF<input hidden type="file" accept="application/pdf,.pdf" onChange={(e) => setQuestionPdf(e.target.files?.[0] || null)} /></Button><Typography variant="body2" color="text.secondary">{fileLabel(questionPdf)}</Typography></Stack></CardContent></Card>
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <Card variant="outlined"><CardContent><Stack spacing={1}><Typography fontWeight={800}>Official Answer Key PDF</Typography><Button variant="outlined" component="label" startIcon={<PictureAsPdfRoundedIcon />}>Choose PDF<input hidden type="file" accept="application/pdf,.pdf" onChange={(e) => setAnswerPdf(e.target.files?.[0] || null)} /></Button><Typography variant="body2" color="text.secondary">{fileLabel(answerPdf)}</Typography></Stack></CardContent></Card>
              </Grid>
            </Grid>
            <TextField fullWidth multiline minRows={4} label="Additional administrator instructions (optional)" value={extraPrompt} onChange={(e) => setExtraPrompt(e.target.value)} placeholder="Example: Set code is K, bilingual English/Hindi, retain source page numbers, infer only when the official key is missing." />
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} justifyContent="flex-end">
              <Button variant="contained" size="large" startIcon={<AutoAwesomeRoundedIcon />} onClick={generate} disabled={busy || !apiKey || !questionPdf || !answerPdf}>Generate Questions + Answers + Metadata</Button>
            </Stack>
            {busy && <LinearProgress />}
          </Stack>
        </TabPanel>

        <TabPanel active={activeTab} index={1}>
          {!generated ? <Alert severity="info">Generate a dataset first.</Alert> : <Stack spacing={2}>
            <Grid container spacing={1}>
              <Grid size={{ xs: 6, sm: 3 }}><Metric label="Logical questions" value={generatedLogicalCount} /></Grid>
              <Grid size={{ xs: 6, sm: 3 }}><Metric label="Question records" value={generatedQuestionRecords} /></Grid>
              <Grid size={{ xs: 6, sm: 3 }}><Metric label="Answers" value={generated.answer_key.count || Object.keys(generated.answer_key.answers || {}).length} /></Grid>
              <Grid size={{ xs: 6, sm: 3 }}><Metric label="Inferred" value={inferredCount} /></Grid>
            </Grid>
            {validation && <Alert severity={validation.ok ? 'success' : 'error'}>{validation.ok ? 'Validation PASS — ready for project save.' : validation.errors.join(' ')}</Alert>}
            <Divider />
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} flexWrap="wrap">
              <Button variant="outlined" startIcon={<DownloadRoundedIcon />} onClick={() => downloadJson('questions.json', generated.questions)}>Download questions.json</Button>
              <Button variant="outlined" startIcon={<DownloadRoundedIcon />} onClick={() => downloadJson('answer_key.json', generated.answer_key)}>Download answer_key.json</Button>
              <Button variant="outlined" startIcon={<DownloadRoundedIcon />} onClick={() => downloadJson('paper.json', generated.paper)}>Download paper.json</Button>
              <Button variant="contained" color="success" startIcon={<SaveRoundedIcon />} onClick={saveGenerated} disabled={!validation?.ok}>Save to Project</Button>
            </Stack>
            <Box component="pre" sx={{ m: 0, p: 2, maxHeight: 460, overflow: 'auto', borderRadius: 3, bgcolor: 'action.hover', fontSize: 12 }}>{JSON.stringify(generated, null, 2)}</Box>
          </Stack>}
        </TabPanel>

        <TabPanel active={activeTab} index={2}>
          <Stack spacing={1.5}>
            <Alert severity="info">Upload or reuse the PDFs below, then ask the AI about extraction, answer mapping, validation, or any specific question. The same selected files are also available to Generate Dataset.</Alert>
            <Grid container spacing={1.5}>
              <Grid size={{ xs: 12, md: 6 }}><Card variant="outlined"><CardContent><Stack spacing={1}><Typography fontWeight={800}>Question Paper PDF</Typography><Button variant="outlined" component="label" startIcon={<PictureAsPdfRoundedIcon />}>Choose PDF<input hidden type="file" accept="application/pdf,.pdf" onChange={(e) => setQuestionPdf(e.target.files?.[0] || null)} /></Button><Typography variant="body2" color="text.secondary">{fileLabel(questionPdf)}</Typography></Stack></CardContent></Card></Grid>
              <Grid size={{ xs: 12, md: 6 }}><Card variant="outlined"><CardContent><Stack spacing={1}><Typography fontWeight={800}>Answer Key PDF</Typography><Button variant="outlined" component="label" startIcon={<PictureAsPdfRoundedIcon />}>Choose PDF<input hidden type="file" accept="application/pdf,.pdf" onChange={(e) => setAnswerPdf(e.target.files?.[0] || null)} /></Button><Typography variant="body2" color="text.secondary">{fileLabel(answerPdf)}</Typography></Stack></CardContent></Card></Grid>
            </Grid>
            <Box sx={{ minHeight: 280, maxHeight: 420, overflow: 'auto', p: 1.2, borderRadius: 3, bgcolor: 'background.default', boxShadow: 'inset 4px 4px 10px rgba(148,163,184,.16), inset -4px -4px 10px rgba(255,255,255,.8)' }}>
              {chat.length ? <Stack spacing={1.2}>{chat.map((item, index) => <Box key={`${item.role}-${index}`} sx={{ p: 1.5, borderRadius: 3, bgcolor: item.role === 'user' ? 'action.selected' : 'background.paper', boxShadow: '5px 5px 12px rgba(148,163,184,.14), -5px -5px 12px rgba(255,255,255,.85)' }}><Typography variant="caption" fontWeight={900}>{item.role === 'user' ? 'You' : item.role === 'system' ? 'System' : 'AI'}</Typography><Typography sx={{ whiteSpace: 'pre-wrap', mt: .4 }}>{item.text}</Typography></Box>)}</Stack> : <Box sx={{ p: 3, textAlign: 'center' }}><Typography color="text.secondary">No conversation yet.</Typography></Box>}
            </Box>
            <Stack direction="row" spacing={1} alignItems="flex-end">
              <TextField fullWidth multiline maxRows={4} label="Ask about the uploaded PDFs" value={chatInput} onChange={(e) => setChatInput(e.target.value)} onKeyDown={(e) => { if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') sendChat() }} placeholder="Example: Check Q47 against the answer key and explain which answer is mapped." />
              <Tooltip title="Send (Ctrl/Cmd+Enter)"><span><IconButton color="primary" onClick={sendChat} disabled={busy || !chatInput.trim() || !apiKey}><SendRoundedIcon /></IconButton></span></Tooltip>
            </Stack>
          </Stack>
        </TabPanel>
      </CardContent>
    </Card>

    {status && <Alert severity={status.severity}>{status.text}</Alert>}
  </Stack>
}

function Metric({ label, value }) {
  return <Card variant="outlined"><CardContent sx={{ textAlign: 'center', py: 1.5 }}><Typography variant="h5" fontWeight={900}>{value}</Typography><Typography variant="caption" color="text.secondary">{label}</Typography></CardContent></Card>
}
