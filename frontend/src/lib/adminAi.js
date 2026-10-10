export const AI_PROVIDERS = {
  openai: {
    label: 'OpenAI',
    defaultModel: 'gpt-6-astra',
    keyHint: 'sk-…',
  },
  anthropic: {
    label: 'Claude (Anthropic)',
    defaultModel: 'claude-opus-5-5',
    keyHint: 'sk-ant-…',
  },
  gemini: {
    label: 'Google Gemini',
    defaultModel: 'gemini-3.8-flash',
    keyHint: 'AIza…',
  },
  openrouter: {
    label: 'OpenRouter',
    defaultModel: '~openai/gpt-sol-latest',
    keyHint: 'sk-or-v1-…',
  },
}

const SETTINGS_KEY = 'qpn:admin-ai:v1'

export function getDefaultAiSettings() {
  return {
    provider: 'openai',
    model: AI_PROVIDERS.openai.defaultModel,
    remember: false,
    keys: {},
    models: Object.fromEntries(Object.entries(AI_PROVIDERS).map(([id, meta]) => [id, meta.defaultModel])),
  }
}

export function readAiSettings() {
  const defaults = getDefaultAiSettings()
  try {
    const raw = sessionStorage.getItem(SETTINGS_KEY)
    if (!raw) return defaults
    const value = JSON.parse(raw)
    return {
      ...defaults,
      ...value,
      keys: value?.keys && typeof value.keys === 'object' ? value.keys : {},
      models: { ...defaults.models, ...(value?.models || {}) },
    }
  } catch {
    return defaults
  }
}

export function writeAiSettings(settings) {
  try {
    const safe = {
      provider: settings.provider,
      model: settings.model,
      remember: Boolean(settings.remember),
      keys: settings.remember ? settings.keys : {},
      models: settings.models || {},
    }
    if (settings.remember) sessionStorage.setItem(SETTINGS_KEY, JSON.stringify(safe))
    else sessionStorage.removeItem(SETTINGS_KEY)
  } catch {
    // Browser storage may be blocked; keep settings only in React state.
  }
}

export function clearAiSettings() {
  try { sessionStorage.removeItem(SETTINGS_KEY) } catch {}
}

export function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    if (!file) return reject(new Error('PDF file is required.'))
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(new Error(`Could not read ${file.name}.`))
    reader.readAsDataURL(file)
  })
}

function unwrapJsonCodeFence(text) {
  const clean = String(text || '').trim()
  if (clean.startsWith('```')) {
    return clean.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim()
  }
  return clean
}

export function parseJsonFromModelText(text) {
  const cleaned = unwrapJsonCodeFence(text)
  try { return JSON.parse(cleaned) } catch {}

  // Recover a JSON object wrapped in a short preamble/postamble.
  const first = cleaned.indexOf('{')
  const last = cleaned.lastIndexOf('}')
  if (first >= 0 && last > first) {
    try { return JSON.parse(cleaned.slice(first, last + 1)) } catch {}
  }
  throw new Error('The model response was not valid JSON. Ask the model to return only the required JSON object, then try again.')
}

function normalizeOptions(options) {
  if (Array.isArray(options)) {
    return Object.fromEntries(options.slice(0, 4).map((value, index) => [String(index + 1), String(value ?? '')]))
  }
  if (!options || typeof options !== 'object') return {}
  const labels = { A: '1', B: '2', C: '3', D: '4', '1': '1', '2': '2', '3': '3', '4': '4' }
  const output = {}
  for (const [key, value] of Object.entries(options)) {
    const normalized = labels[String(key).trim().toUpperCase()]
    if (normalized) output[normalized] = String(value ?? '')
  }
  return output
}

function sanitizeQuestion(question, index) {
  const q = question && typeof question === 'object' ? { ...question } : {}
  const questionNumber = Number(q.question_number ?? q.number ?? index + 1)
  const language = String(q.language || q.lang || 'en').toLowerCase()
  const exam = String(q.exam || '')
  const booklet = String(q.booklet_code || q.booklet || '')
  const base = {
    ...q,
    id: q.id || `${exam || 'EXAM'}-${booklet || 'BOOKLET'}-Q${questionNumber}-${language === 'hi' ? 'HI' : 'EN'}`,
    exam: q.exam || undefined,
    booklet_code: q.booklet_code || q.booklet || undefined,
    question_number: Number.isInteger(questionNumber) ? questionNumber : index + 1,
    part: q.part || '',
    part_name: q.part_name || q.partName || '',
    language,
    question_text: String(q.question_text ?? q.question ?? q.text ?? ''),
    options: normalizeOptions(q.options),
    context_text: q.context_text ?? q.context ?? null,
    source: q.source && typeof q.source === 'object' ? q.source : {},
    extraction: q.extraction && typeof q.extraction === 'object' ? q.extraction : { method: 'llm_pdf', confidence: 0, status: 'review', warnings: [] },
  }
  // Never place a correct answer inside questions.json.
  delete base.correct_answer
  delete base.answer
  delete base.expected_answer
  return base
}

export function normalizeGeneratedPackage(rawPackage) {
  if (!rawPackage || typeof rawPackage !== 'object') throw new Error('The model returned an empty or invalid package.')
  const questionsRaw = rawPackage.questions?.questions || rawPackage.questions || []
  const questionArray = Array.isArray(questionsRaw) ? questionsRaw : []
  const answerRaw = rawPackage.answer_key || rawPackage.answers || {}
  const paperRaw = rawPackage.paper || rawPackage.metadata || {}
  const questions = questionArray.map(sanitizeQuestion)
  if (!questions.length) throw new Error('The model response did not contain a questions array.')

  const answers = answerRaw?.answers && typeof answerRaw.answers === 'object' ? { ...answerRaw, answers: { ...answerRaw.answers } } : { schema_version: '1.0.0', answers: {} }
  if (answerRaw?.language_variants) answers.language_variants = answerRaw.language_variants
  if (answerRaw?.inferred_answers) answers.inferred_answers = answerRaw.inferred_answers

  const paper = {
    schema_version: paperRaw.schema_version || '2.0.0',
    paper_id: paperRaw.paper_id || '',
    exam: paperRaw.exam || questions[0]?.exam || '',
    session: paperRaw.session || '',
    exam_date: paperRaw.exam_date || '',
    paper: paperRaw.paper || 'PAPER-I',
    booklet_code: paperRaw.booklet_code || questions[0]?.booklet_code || '',
    title: paperRaw.title || '',
    question_count: Number(paperRaw.question_count || new Set(questions.map((q) => q.question_number)).size),
    question_records: questions.length,
    duration_minutes: Number(paperRaw.duration_minutes || 150),
    available_languages: paperRaw.available_languages || [...new Set(questions.map((q) => q.language).filter(Boolean))],
    negative_marking: Boolean(paperRaw.negative_marking),
    status: 'review',
  }

  return {
    questions: {
      schema_version: '1.0.0',
      exam: paper.exam,
      booklet_code: paper.booklet_code,
      source_file: paperRaw.source_file || '',
      question_count: paper.question_count,
      questions,
    },
    answer_key: {
      schema_version: answers.schema_version || '2.0.0',
      exam: answers.exam || paper.exam,
      session: answers.session || paper.session,
      exam_date: answers.exam_date || paper.exam_date,
      paper: answers.paper || paper.paper,
      set: answers.set || paper.booklet_code,
      booklet_code: answers.booklet_code || paper.booklet_code,
      answers: answers.answers || {},
      language_variants: answers.language_variants || {},
      answer_sources: answers.answer_sources || {},
      inferred_answers: answers.inferred_answers || {},
      count: Number(answers.count || Object.keys(answers.answers || {}).length),
      status: answers.status || 'review',
    },
    paper,
  }
}

export async function callAdminAi({ provider, model, apiKey, mode, questionPdf, answerPdf, prompt, history = [] }) {
  if (!provider || !AI_PROVIDERS[provider]) throw new Error('Select a supported AI provider.')
  if (!model?.trim()) throw new Error('Model name is required.')
  if (!apiKey?.trim()) throw new Error(`Enter the ${AI_PROVIDERS[provider].label} API key.`)
  const payload = {
    provider,
    model: model.trim(),
    apiKey: apiKey.trim(),
    mode,
    prompt,
    history,
  }
  if (questionPdf) payload.questionPdf = { name: questionPdf.name, dataUrl: await fileToDataUrl(questionPdf) }
  if (answerPdf) payload.answerPdf = { name: answerPdf.name, dataUrl: await fileToDataUrl(answerPdf) }

  const response = await fetch('/api/admin/ai/run', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-qpn-admin-ai': '1' },
    body: JSON.stringify(payload),
  })
  const body = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(body.message || `AI request failed (${response.status}).`)
  return body
}
