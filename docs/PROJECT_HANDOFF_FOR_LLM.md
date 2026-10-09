# Project Handoff for an LLM or New Maintainer

## Mission
Maintain the existing Question Paper Navigator with small, backward-compatible changes. Never replace the working exam engine or alter runtime schemas without an adapter and tests.

## Local run
```powershell
npm run install:all
npm run dev
```
Open `http://localhost:5173/`. Demo login: `student / Student@123`; admin: `admin / Admin@123`. These client-side demo credentials are not production authentication.

## Main modules
- `frontend/src/App.jsx`: login/session gate, app tabs, catalog/paper loading, exam launch, completion/result routing.
- `frontend/src/components/HomePage.jsx`: paper-set cards from `catalog.json`.
- `frontend/src/components/ExamView.jsx`: timer UI, question navigation, answer selection, review flags, submit/timeout.
- `frontend/src/lib/examSession.js`: local attempt state, deadline calculation, scoring/result breakdown.
- `frontend/src/lib/data.js`: JSON loading, language question filtering and canonical answer lookup.
- `frontend/src/components/QuestionCard.jsx`, `Sidebar.jsx`, `Header.jsx`: existing exam/card/navigation components.
- `frontend/src/lib/auth.js`: local-only demo authentication adapter. Replace with a managed auth provider for public production use.
- `frontend/admin-upload.html` and `frontend/src/admin-upload.jsx`: dedicated admin workspace.
- `frontend/src/components/AdminAiGenerator.jsx`: provider configuration, PDF inputs, generation/review/downloads and chat.
- `frontend/src/lib/adminAi.js`: API-key/session preferences, PDF encoding, JSON parsing and normalization.
- `frontend/src/lib/adminAiServer.js`: local Vite proxy for OpenAI/Claude/Gemini/OpenRouter.
- `frontend/src/lib/adminUpload.js`: JSON normalization and import validation.
- `frontend/vite.config.js`: local project-save and AI request middleware plus build entry points.
- `processor/src/extract_paper.py`: PDF extraction and source/visual fallback data.
- `processor/src/import_answer_key.py`: answer-key import.
- `processor/src/validate_dataset.py`: dataset validation, including answer provenance.
- `processor/src/sync_data.py`: copies canonical data to runtime JSON and regenerates catalog.

## Data flow
```text
Original PDF(s)
  -> Python processor or local Admin AI workspace
  -> data/papers/<SET>/questions.json + paper.json + validation.json
  -> data/answer_keys/<SET>/answer_key.json
  -> python processor/src/sync_data.py
  -> frontend/public/data/<SET>/... + catalog.json
  -> existing React exam engine
```
Manual JSON upload remains available. Admin AI must produce files compatible with the same import and exam-engine path; do not create a second scoring mechanism.

## Runtime data contract
Files per set: `questions.json`, `answer_key.json`, `paper.json`, `validation.json`.

Question records use `question_number`, `language`, `question_text`, `options` (keys `"1"` through `"4"`), source page metadata, and stable IDs. Bilingual sets K/L/M/N have 300 physical records (150 English + 150 Hindi) but 150 logical questions. H currently has 150 English records.

Answer lookup contract in `frontend/src/lib/data.js`:
- Q1-Q90: `answer_key.answers[String(question_number)]`
- Q91-Q150: `answer_key.language_variants[language][String(question_number)]`, falling back to `answers` only if that variant is absent.

Do not remove language variants. H Q1-Q90 are from the supplied answer-sheet PDF; H Q91-Q150 are model-inferred and marked for review because the supplied H key only covers Q1-Q90. K/L/M/N answer data uses the common CTET Feb-2026 answer key.

## Admin AI constraints
AI middleware is available only while running the local Vite dev server. The provider keys are not part of data JSON or source control when used correctly, but are sent to the chosen provider for the requested operation. Do not expose the Vite dev server to untrusted networks. The static GitHub Pages build does not provide this server middleware or secure production secret handling.

## Non-negotiable safety rules for edits
1. Do not add SQL/database dependencies for question content.
2. Do not change `lookupAnswer()` contract without compatibility tests.
3. Keep raw PDFs in `source/`; keep generated canonical JSON under `data/`; runtime JSON under `frontend/public/data/` is synchronized output.
4. Before `sync:data`, back up manual edits in `frontend/public/data/`; it rebuilds that directory from canonical data.
5. Do not log or commit API keys, passwords, auth tokens or provider responses containing secrets.
6. Mark inferred answers as inferred; never label them official.
7. Keep provider logic in the Admin layer, not the student exam page.
8. Do not delete the manual JSON upload workflow.
9. Avoid schema rewrites; use the existing JSON adapter/validator.
10. Run all applicable tests after changes.

## Verification commands
```powershell
npm run validate
npm run test
npm run test:datasets
node tools/test_admin_ai.mjs
npm run test:web
npm run build
```
`test:datasets` checks H/K/L/M/N and verifies every question-language record has a usable answer lookup. `test_admin_ai.mjs` uses mocked provider responses; it does not call paid APIs.

## Known limitations
- Local demo authentication is not secure production auth.
- Admin AI provider calls and project writes are local-Vite-only.
- Exam attempts/results are stored in browser local storage, not in an account-sync service.
- Payment, public secure account management, cloud storage, background jobs and auto-publishing are not implemented in this bundle.
- H Q91-Q150 answers need verification against a complete official key before high-stakes use.
