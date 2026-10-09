# Question Paper Navigator — Complete Combined Local Project

This is the **full project ZIP**, not a patch. It combines the existing React/Vite question-paper application, H/K/L/M/N datasets and source documents, login/home/timed exam/results, neumorphic styling, manual JSON upload, Admin AI PDF generator/chat, Python extraction/validation pipeline and technical handoff documentation.
# Data contract

`papers/<BOOKLET>/questions.json` contains one normalized record per language/question pair.

For this paper family:
- Q1–Q90 are bilingual: one `en` and one `hi` record per question.
- Q91–Q120 have English and Hindi Language-I sections.
- Q121–Q150 have English and Hindi Language-II sections.

Each record includes:
- stable ID
- booklet code
- question number
- part and part name
- language
- question text
- options 1–4
- optional passage/context
- source PDF page, printed page, column and bbox
- extraction method, confidence, status and warnings
- optional `source.visual_fallback` for vector-only content

`answer_keys/<BOOKLET>/answer_key.json` is the runtime answer lookup. The supplied build leaves these files empty until the official answer key is imported.

# Sample inputs

Place the original PDFs here when running the extraction scripts:

- `SET-1_PAPER-I_ACF-26-I-K.pdf`
- `SET-2_PAPER-I_ACF-26-I-L.pdf`

The repository intentionally does not redistribute the source examination PDFs. Generated JSON fixtures in `data/papers/` are included for development/testing.

# Source examination documents

This directory preserves the original question-paper PDFs and answer-key PDFs used for the bundled datasets.

- `H/`: Set H (SED-24-I, December 2024) question paper and supplied Q1-Q90 answer sheet.
- `K/`: Set K (ACF-26-I, February 2026) question paper.
- `L/`: Set L (ACF-26-I, February 2026) question paper.
- `M/`: Set M (ACF-26-I, February 2026) question paper and answer sheet.
- `N/`: Set N (ACF-26-I, February 2026) question paper and answer sheet.
- `answer_keys/CTET-FEB-2026-FINAL-ANSWER-KEY.pdf`: the shared final key for K/L/M/N, including main and language variants.

The H supplied answer-sheet PDF covers Q1-Q90. H Q91-Q150 answers are populated as model-inferred values for usability; they are not verified against the supplied H PDF. Check `frontend/public/data/H/answer_key.json` and `validation.json` for provenance details before using those answers for high-stakes scoring.


## Included paper sets

| Set | Exam/session | Logical questions | Physical records | Languages | Answer-key status |
|---|---|---:|---:|---|---|
| H | SED-24-I / Dec 2024 | 150 | 150 | English records available | Q1-Q90 from supplied H answer sheet; Q91-Q150 are inferred and require human verification |
| K | ACF-26-I / Feb 2026 | 150 | 300 | English + Hindi | Common official CTET Feb-2026 key with language variants |
| L | ACF-26-I / Feb 2026 | 150 | 300 | English + Hindi | Common official CTET Feb-2026 key with language variants |
| M | ACF-26-I / Feb 2026 | 150 | 300 | English + Hindi | Common official CTET Feb-2026 key with language variants |
| N | ACF-26-I / Feb 2026 | 150 | 300 | English + Hindi | Common official CTET Feb-2026 key with language variants |

Original PDFs and answer sheets are in `source/`; current answer-key workbooks are in `exports/`. The outdated H workbook is retained under `exports/legacy/` and clearly labeled as superseded. H Q91-Q150 are populated for quiz functionality but are explicitly marked inferred/review in the JSON and workbook. Do not treat those answers as official.

## Start locally (Windows / PowerShell)

Prerequisite: Node.js with npm. Python is only needed for PDF processing/validation.

From the extracted `question-paper-platform` folder:

```powershell
npm run install:all
npm run dev
```

Open `http://localhost:5173/`. Keep the PowerShell window open while using the app.

### Demo accounts
- Student: `student` / `Student@123`
- Admin: `admin` / `Admin@123`

**Security limitation:** these accounts use a client-side local demo authentication adapter. This is an MVP gate, not secure production authentication. Do not use it to protect a public or paid production site; replace the adapter with managed authentication and a backend before public release.

## Admin AI and manual JSON upload

1. Log in as `admin`.
2. Open the **Admin** tab and select **Open Dataset Uploader**.
3. Use **AI Document Generator** to select OpenAI, Claude (Anthropic), Gemini or OpenRouter, provide your API key/model, upload a Question Paper PDF and Answer Key PDF, generate, inspect and validate the files, and save to the local project.
4. Or select **Manual JSON Upload** to import existing `questions.json`, `answer_key.json` and optional `paper.json`.

The local Vite middleware writes the files into the project and updates `frontend/public/data/catalog.json`. Review the generated content and provenance, then commit/push to GitHub manually when ready.

**AI deployment limitation:** the API proxy and file writer exist only in the local Vite development server. A static GitHub Pages build cannot securely store provider keys or write back into the repository. Do not expose the Vite dev server to an untrusted network. Never paste API keys into source files or dataset JSON.

## Timed exams

- Choose a paper from the home page.
- The timer starts when **Start Exam** is clicked.
- Duration is read from `paper.json` (`duration_minutes`); default is 150 minutes.
- The deadline and active attempt are stored in this browser's local storage to preserve a timer across refreshes.
- Timer expiry auto-submits; manual submission is available on the final question.
- Results show correct, attempted, unanswered, scorable and percentage totals.
- Attempt history is browser-local; it does not sync between devices/accounts.

## Runtime JSON structure

```text
frontend/public/data/
  catalog.json
  H/{questions.json,answer_key.json,paper.json,validation.json}
  K/{questions.json,answer_key.json,paper.json,validation.json}
  L/{questions.json,answer_key.json,paper.json,validation.json}
  M/{questions.json,answer_key.json,paper.json,validation.json}
  N/{questions.json,answer_key.json,paper.json,validation.json}
```

The answer lookup contract is preserved:
- Q1-Q90: `answer_key.json -> answers[question_number]`
- Q91-Q150: `answer_key.json -> language_variants[language][question_number]`, falling back to `answers` only if the language-specific variant is absent.

Bilingual K/L/M/N each contain 150 English + 150 Hindi physical question records but 150 logical questions. Keep the language variants separate. H's available runtime questions are English records; its Q91-Q150 key entries are model-inferred and flagged.

## Validation / tests

Run from the project root:

```powershell
npm run validate
npm run test
npm run test:datasets
npm run test:admin-ai
npm run test:session
npm run test:bundle
npm run test:datasets
npm run test:web
npm run build
```

`test:datasets` checks all five sets, admin-upload validator compatibility and answer lookup availability. `test:admin-ai` tests provider payload routing, PDF requirements and JSON normalization with mocked provider responses; it does not call paid APIs. `test:session` checks timer/session/scoring helpers, and `test:bundle` checks source files and all datasets are present.

## PDF processing

Source papers are bundled in `source/`. To run the processor, first install its requirements if needed:

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r processor\requirements.txt
```

Then use:

```powershell
npm run extract:k
npm run extract:l
npm run extract:m
npm run extract:n
npm run sync:data
npm run validate
```

`sync:data` rebuilds `frontend/public/data/` from canonical `data/papers/` and `data/answer_keys/` and refreshes public assets. Back up manual runtime edits before running it.

## Maintainer / LLM documentation

- `docs/TECHNICAL_ARCHITECTURE.md` — detailed architecture handoff.
- `docs/PROJECT_HANDOFF_FOR_LLM.md` — fast context, exact data contracts and safe-edit rules.
- `docs/AI_QUESTION_ANSWER_JSON_GENERATION_PROMPT.md` — PDF-to-compatible-JSON prompt used by Admin AI.
- `docs/ADMIN_AI_GENERATOR.md` and `docs/AI_ADMIN_PATCH_README.md` — Admin AI behavior and limitations.
- `docs/question-paper-navigator-architecture.png` and `.svg` — architecture diagram.
- `docs/Question-Paper-Navigator-Technical-Architecture.docx` — Word version of the architecture guide.
- `docs/RELEASE_MANIFEST.md` — release contents, test status and known limitations.

## Architecture limits

This remains a static JSON app with a **local-only Admin writer and AI proxy**. It does not implement secure production authentication, cloud-synced attempt history, user repositories, payment verification, private object storage, background jobs or fully automated public publishing. Those remain future backend capabilities.
