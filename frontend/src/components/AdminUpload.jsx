import { useMemo, useState } from 'react'
import { Alert, Box, Button, Container, Divider, Paper, Stack, TextField, Typography } from '@mui/material'

function parseJsonFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => { try { resolve(JSON.parse(String(reader.result))) } catch (e) { reject(new Error(`${file.name}: invalid JSON`)) } }
    reader.onerror = () => reject(new Error(`${file.name}: could not be read`))
    reader.readAsText(file, 'utf-8')
  })
}

function inferMeta(q) {
  const qs=q.questions || []
  const first=qs[0] || {}
  return {
    paper_id:q.paper_id || `${q.exam || 'EXAM'}-PAPER-I-${q.booklet_code || 'NEW'}`,
    exam:q.exam || 'EXAM',
    session:q.session || '',
    exam_date:q.exam_date || '',
    booklet_code:q.booklet_code || first.booklet_code || '',
    title:q.title || `${q.exam || 'Question Paper'} • Set ${q.booklet_code || ''}`,
    question_count:q.question_count || 150,
    available_languages:[...new Set(qs.map(x=>x.language).filter(Boolean))],
  }
}

function validatePair(q, a) {
  const meta=inferMeta(q)
  const qs=q.questions || []
  if (!meta.booklet_code) return ['Booklet code is missing from question JSON.']
  if (!qs.length) return ['Question JSON has no questions.']
  const expected=meta.available_languages.length > 1 ? 300 : 150
  const issues=[]
  if (qs.length !== expected) issues.push(`Expected ${expected} question records, found ${qs.length}.`)
  const answers=a.answers || {}
  const missing=[]
  for (let i=1;i<=150;i++) if (answers[String(i)] == null) missing.push(i)
  if (missing.length) issues.push(`Answer key is missing default answers: ${missing.slice(0,10).join(', ')}${missing.length>10?'…':''}`)
  const languages=new Set(qs.map(x=>x.language).filter(Boolean))
  const requiredVariants=[...languages].filter(x=>x==='en'||x==='hi')
  for (const lang of requiredVariants) {
    if (lang==='hi' && !languages.has('hi')) continue
    const v=(a.language_variants||{})[lang] || {}
    const vm=[]; for (let i=91;i<=150;i++) if (v[String(i)] == null) vm.push(i)
    if (vm.length) issues.push(`Answer key is missing ${lang} variant answers: ${vm.slice(0,10).join(', ')}${vm.length>10?'…':''}`)
  }
  return issues
}

async function writeFile(dirHandle, pathParts, filename, text) {
  let dir=dirHandle
  for (const part of pathParts) dir = await dir.getDirectoryHandle(part, { create: true })
  const file=await dir.getFileHandle(filename, { create: true })
  const writable=await file.createWritable(); await writable.write(text); await writable.close()
}

export default function AdminUpload() {
  const [questionFile,setQuestionFile]=useState(null)
  const [answerFile,setAnswerFile]=useState(null)
  const [questionJson,setQuestionJson]=useState(null)
  const [answerJson,setAnswerJson]=useState(null)
  const [projectFolder,setProjectFolder]=useState(null)
  const [message,setMessage]=useState('')
  const [error,setError]=useState('')
  const [busy,setBusy]=useState(false)
  const meta=useMemo(()=>questionJson ? inferMeta(questionJson) : null,[questionJson])

  async function loadFiles(qf,af) {
    try { setError(''); setMessage(''); const [q,a]=await Promise.all([parseJsonFile(qf),parseJsonFile(af)]); setQuestionFile(qf); setAnswerFile(af); setQuestionJson(q); setAnswerJson(a) }
    catch(e){setError(e.message)}
  }

  async function chooseFolder() {
    if (!window.showDirectoryPicker) { setError('This browser does not support direct project-folder writing. Use Chrome/Edge or start the local admin server.') ; return }
    try { setProjectFolder(await window.showDirectoryPicker({mode:'readwrite'})); setMessage('Project folder selected.') } catch(e) { if(e.name!=='AbortError') setError(e.message) }
  }

  async function saveDirectly() {
    if(!questionJson || !answerJson) return setError('Choose both Question JSON and Answer Key JSON first.')
    const issues=validatePair(questionJson,answerJson); if(issues.length) return setError(issues.join(' '))
    setBusy(true); setError(''); setMessage('Saving to project folder…')
    try {
      const folder=projectFolder || (window.showDirectoryPicker ? await window.showDirectoryPicker({mode:'readwrite'}) : null)
      if(!folder) throw new Error('No writable project folder is available. Use Chrome/Edge folder access or the local admin server.')
      if(!projectFolder) setProjectFolder(folder)
      const b=meta.booklet_code
      const paper={schema_version:'2.0.0',paper_id:meta.paper_id,exam:meta.exam,session:meta.session,exam_date:meta.exam_date,paper:'PAPER-I',booklet_code:b,title:meta.title,question_count:150,available_languages:meta.available_languages,status:'published'}
      const validation={schema_version:'2.0.0',paper_id:meta.paper_id,validation_status:'PASS',publication_status:'published',question_records:(questionJson.questions||[]).length,default_answer_count:Object.keys(answerJson.answers||{}).length,variant_answer_counts:Object.fromEntries(Object.entries(answerJson.language_variants||{}).map(([k,v])=>[k,Object.keys(v||{}).length])),missing_default_answers:[],missing_variant_answers:{},inferred_answer_questions:[],issues:[]}
      const qText=JSON.stringify(questionJson,null,2), aText=JSON.stringify(answerJson,null,2), pText=JSON.stringify(paper,null,2), vText=JSON.stringify(validation,null,2)
      await writeFile(folder,['data','papers',b],'questions.json',qText); await writeFile(folder,['data','papers',b],'paper.json',pText); await writeFile(folder,['data','papers',b],'validation.json',vText); await writeFile(folder,['data','answer_keys',b],'answer_key.json',aText)
      await writeFile(folder,['frontend','public','data',b],'questions.json',qText); await writeFile(folder,['frontend','public','data',b],'paper.json',pText); await writeFile(folder,['frontend','public','data',b],'validation.json',vText); await writeFile(folder,['frontend','public','data',b],'answer_key.json',aText)
      // Update catalog through nested folder handles.
      let d=folder; for (const part of ['frontend','public','data']) d=await d.getDirectoryHandle(part,{create:true});
      let catalog={schema_version:'2.0.0',papers:[]}
      try { const f=await d.getFileHandle('catalog.json'); catalog=JSON.parse(await (await f.getFile()).text()) } catch {}
      const entry={paper_id:meta.paper_id,exam:meta.exam,session:meta.session,exam_date:meta.exam_date,title:meta.title,booklet_code:b,question_count:150,available_languages:meta.available_languages,questions:`${b}/questions.json`,answer_key:`${b}/answer_key.json`,paper:`${b}/paper.json`,validation:`${b}/validation.json`,status:'published'}
      catalog.papers=(catalog.papers||[]).filter(x=>x.paper_id!==entry.paper_id); catalog.papers.push(entry); catalog.papers.sort((x,y)=>String(x.paper_id).localeCompare(String(y.paper_id)))
      const f=await d.getFileHandle('catalog.json',{create:true}); const w=await f.createWritable(); await w.write(JSON.stringify(catalog,null,2)); await w.close()
      setMessage(`Saved Set ${b}. Commit and push the project to GitHub; the hosted site will then discover it from catalog.json.`)
    } catch(e) { setError(e.message) } finally { setBusy(false) }
  }

  async function sendToLocalServer() {
    if(!questionJson || !answerJson) return setError('Choose both JSON files first.')
    const issues=validatePair(questionJson,answerJson); if(issues.length) return setError(issues.join(' '))
    setBusy(true); setError(''); setMessage('Sending to local project writer…')
    try {
      const res=await fetch('http://127.0.0.1:8765/api/import-json',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({question_json:questionJson,answer_key:answerJson})})
      const data=await res.json(); if(!res.ok) throw new Error(data.error||'Local admin server rejected the upload')
      setMessage(data.message || 'Saved to project.')
    } catch(e) { setError(`Local server unavailable: ${e.message}`) } finally { setBusy(false) }
  }

  function downloadText(name,text){ const blob=new Blob([text],{type:'application/json'}); const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=name; a.click(); URL.revokeObjectURL(a.href) }

  return <Container maxWidth="md" sx={{py:4}}>
    <Typography variant="h4" fontWeight={900}>Upload New Test Dataset</Typography>
    <Typography color="text.secondary" sx={{mt:1}}>This admin window writes only JSON files to your project. The public site remains GitHub-only and database-free.</Typography>
    <Paper sx={{mt:3,p:3}}>
      <Stack spacing={2.5}>
        <Button variant="outlined" component="label">Choose Question JSON<input hidden type="file" accept=".json,application/json" onChange={e=>e.target.files?.[0]&&setQuestionFile(e.target.files[0])}/></Button>
        <Button variant="outlined" component="label">Choose Answer Key JSON<input hidden type="file" accept=".json,application/json" onChange={e=>e.target.files?.[0]&&setAnswerFile(e.target.files[0])}/></Button>
        {questionFile && answerFile && !questionJson && <Button variant="contained" onClick={()=>loadFiles(questionFile,answerFile)}>Read JSON Files</Button>}
        {questionJson && meta && <Alert severity="info"><b>{meta.title}</b> • Set {meta.booklet_code} • {meta.question_count} questions • languages: {meta.available_languages.join(', ')}</Alert>}
        {questionJson && answerJson && <Alert severity={validatePair(questionJson,answerJson).length?'error':'success'}>{validatePair(questionJson,answerJson).length ? validatePair(questionJson,answerJson).join(' ') : 'Question + answer JSON passed the pre-save checks.'}</Alert>}
        <Divider />
        <Stack direction={{xs:'column',sm:'row'}} spacing={1.5}>
          <Button variant="contained" onClick={chooseFolder} disabled={busy}>Select Project Folder</Button>
          <Button variant="contained" color="success" onClick={saveDirectly} disabled={busy}>Save Into Project</Button>
          <Button variant="outlined" onClick={sendToLocalServer} disabled={busy}>Use Local Writer</Button>
        </Stack>
        <Typography variant="caption" color="text.secondary">"Select Project Folder" lets Chrome/Edge write directly to the repository folder. "Use Local Writer" works with Firefox when you run <code>python processor/local_admin_server.py</code>.</Typography>
        {error && <Alert severity="error">{error}</Alert>}
        {message && <Alert severity="success">{message}</Alert>}
        {questionJson && answerJson && <Stack direction="row" spacing={1}>
          <Button size="small" onClick={()=>downloadText(`${meta.booklet_code}-questions.json`,JSON.stringify(questionJson,null,2))}>Download Questions JSON</Button>
          <Button size="small" onClick={()=>downloadText(`${meta.booklet_code}-answer-key.json`,JSON.stringify(answerJson,null,2))}>Download Answer JSON</Button>
        </Stack>}
      </Stack>
    </Paper>
  </Container>
}
