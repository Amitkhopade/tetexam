import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'node:fs/promises'
import path from 'node:path'

function adminUploadPlugin() {
  return {
    name: 'question-paper-admin-upload',
    configureServer(server) {
      server.middlewares.use('/__admin/save-dataset', async (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405
          res.setHeader('content-type', 'application/json')
          res.end(JSON.stringify({ message: 'Method not allowed' }))
          return
        }
        try {
          const chunks = []
          for await (const chunk of req) chunks.push(chunk)
          const body = JSON.parse(Buffer.concat(chunks).toString('utf8'))
          const { meta, questions, answers, overwrite = false } = body
          if (!meta?.booklet_code || !meta?.paper_id || !questions || !answers) throw new Error('Invalid dataset payload.')
          const safeBooklet = String(meta.booklet_code).replace(/[^A-Za-z0-9_-]/g, '').toUpperCase()
          if (!safeBooklet) throw new Error('Invalid booklet code.')

          const projectRoot = path.resolve(server.config.root, '..')
          const publicData = path.resolve(server.config.root, 'public', 'data', safeBooklet)
          const paperData = path.resolve(projectRoot, 'data', 'papers', safeBooklet)
          const answerData = path.resolve(projectRoot, 'data', 'answer_keys', safeBooklet)
          const sourceJson = path.resolve(projectRoot, 'source', 'json', meta.paper_id)
          const paths = [
            path.relative(projectRoot, path.join(paperData, 'questions.json')),
            path.relative(projectRoot, path.join(answerData, 'answer_key.json')),
            path.relative(projectRoot, path.join(paperData, 'paper.json')),
            path.relative(projectRoot, path.join(paperData, 'validation.json')),
            path.relative(projectRoot, path.join(publicData, 'questions.json')),
            path.relative(projectRoot, path.join(publicData, 'answer_key.json')),
            path.relative(projectRoot, path.join(publicData, 'paper.json')),
            path.relative(projectRoot, path.join(publicData, 'validation.json')),
            path.relative(projectRoot, path.join(projectRoot, 'catalog.json')),
          ]
          const targets = [paperData, answerData, publicData, sourceJson]
          for (const dir of targets) await fs.mkdir(dir, { recursive: true })

          const exists = async (file) => { try { await fs.access(file); return true } catch { return false } }
          const mainQuestionTarget = path.join(paperData, 'questions.json')
          const mainAnswerTarget = path.join(answerData, 'answer_key.json')
          if (!overwrite && ((await exists(mainQuestionTarget)) || (await exists(mainAnswerTarget)))) {
            throw new Error(`Paper Set ${safeBooklet} already exists. Enable Replace existing dataset to overwrite it.`)
          }

          const validation = body.validation || {}
          const status = validation.ok ? 'published' : 'review'
          const paperJson = { ...meta, status }
          const validationJson = { ...validation, publication_status: status, saved_at: new Date().toISOString() }

          const write = async (file, value) => fs.writeFile(file, JSON.stringify(value, null, 2) + '\n', 'utf8')
          await write(mainQuestionTarget, questions)
          await write(mainAnswerTarget, answers)
          await write(path.join(paperData, 'paper.json'), paperJson)
          await write(path.join(paperData, 'validation.json'), validationJson)
          await write(path.join(publicData, 'questions.json'), questions)
          await write(path.join(publicData, 'answer_key.json'), answers)
          await write(path.join(publicData, 'paper.json'), paperJson)
          await write(path.join(publicData, 'validation.json'), validationJson)
          await write(path.join(sourceJson, 'questions.json'), questions)
          await write(path.join(sourceJson, 'answer_key.json'), answers)

          const catalogPath = path.resolve(server.config.root, 'public', 'data', 'catalog.json')
          let catalog = { schema_version: '1.2.0', papers: [] }
          try { catalog = JSON.parse(await fs.readFile(catalogPath, 'utf8')) } catch {}
          const entry = {
            paper_id: meta.paper_id,
            exam: meta.exam ?? null,
            session: meta.session ?? null,
            exam_date: meta.exam_date ?? null,
            title: meta.title ?? null,
            booklet_code: safeBooklet,
            question_count: meta.question_count ?? null,
            available_languages: meta.available_languages ?? ['en'],
            questions: `${safeBooklet}/questions.json`,
            answer_key: `${safeBooklet}/answer_key.json`,
            paper: `${safeBooklet}/paper.json`,
            validation: `${safeBooklet}/validation.json`,
            status,
          }
          catalog.papers = (catalog.papers || []).filter((p) => p.booklet_code !== safeBooklet)
          catalog.papers.push(entry)
          catalog.papers.sort((a, b) => String(a.booklet_code).localeCompare(String(b.booklet_code)))
          catalog.schema_version = '1.2.0'
          await write(catalogPath, catalog)
          res.statusCode = 200
          res.setHeader('content-type', 'application/json')
          res.end(JSON.stringify({ ok: true, paper_id: meta.paper_id, booklet_code: safeBooklet, status, paths }, null, 2))
        } catch (error) {
          res.statusCode = 400
          res.setHeader('content-type', 'application/json')
          res.end(JSON.stringify({ ok: false, message: error?.message || 'Save failed' }))
        }
      })
    }
  }
}

export default defineConfig({
  plugins: [react(), adminUploadPlugin()],
  base: './',
  build: { sourcemap: false, target: 'es2022' },
})
