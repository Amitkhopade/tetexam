# Combined Release Manifest

## Release purpose
One ZIP for local development of the full Question Paper Navigator, including the existing datasets and the recent login/timer/neumorphic UI plus Admin AI workspace changes.

## Included application capabilities
- React + Vite + Material UI question paper UI.
- Login shell with `student` and `admin` local demo roles.
- Home page and dynamic H/K/L/M/N paper cards.
- Timed exam attempts, refresh persistence, expiry submission and results page.
- Neumorphic styling and site navigation.
- Existing manual JSON upload/import page.
- Admin-only AI PDF generator/chat for OpenAI, Claude, Gemini and OpenRouter.
- Local Vite middleware for saving datasets and routing AI requests.
- Python PDF extraction, answer-key import, dataset validation and sync scripts.
- Existing JSON data and original source PDFs for all five sets.
- Technical architecture document, architecture diagram and LLM handoff guide.

## Dataset inventory
- H: 150 English question records; Q1-Q90 answers from the supplied H key; Q91-Q150 marked model-inferred and review-required.
- K: 300 physical question records (150 EN + 150 HI), 150 logical questions, main key and 60 EN/60 HI variants.
- L: same counts/structure as K.
- M: same counts/structure as K.
- N: same counts/structure as K.
- Source PDFs: H question + supplied key; K/L/M/N question PDFs; common CTET Feb-2026 final key; M/N answer sheets.

## Verification performed in packaging environment
- `python processor/src/validate_dataset.py`: PASS.
- `PYTHONPATH=processor/src python -m pytest -q processor/tests`: 7 passed.
- `node tools/test_admin_ai.mjs`: PASS with mocked provider responses; no paid API calls.
- `node tools/test_all_datasets.mjs`: PASS; all H/K/L/M/N question-language records return a valid answer lookup (1,350 records checked), and each dataset passes the current admin upload validation.
- `node tools/test_exam_session.mjs`: PASS; selected-language propagation, default/custom duration, locally persisted session, and scoring helpers.
- `node tools/test_bundle_integrity.mjs`: PASS; source PDFs/answer keys, canonical and runtime datasets, architecture docs and H inferred provenance are present.
- Static JS/JSX transpile syntax scan: 32 files checked, 0 syntax errors.
- H answer workbook provenance reviewed and updated to label Q91-Q150 model-inferred.

## Build limitation
The packaging environment did not complete `npm install --prefix frontend --no-audit --no-fund --prefer-offline` within the execution window; therefore, a full Vite production build and dependency-backed Vitest suite could not be honestly marked as passed here. Run `npm run install:all`, `npm run test:web` and `npm run build` on the Windows machine where the project dependencies install successfully.

## Important limitations
- The login adapter is client-side demo authentication; not secure for public production.
- Admin AI and project file-save endpoints run only in local Vite development middleware.
- The static build cannot securely hold API keys or commit files to GitHub.
- Exam attempt/result persistence is browser-local.
- H Q91-Q150 values are inferred and require official-key verification for high-stakes scoring.
