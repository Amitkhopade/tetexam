# Question Paper Navigator

A static, GitHub-backed question paper viewer and data pipeline for exam-booklet datasets. The project loads JSON question sets and answer keys from the repository, renders them in a React/Vite front end, and supports local admin uploads for adding or replacing booklet data without introducing a database or backend service.

## What this project does

- Reads booklet data from static JSON files, not a database
- Displays exam questions by booklet and language in a browser-based UI
- Lets users navigate questions, mark reviews, and select answers locally
- Supports a local admin upload flow for adding new paper datasets during development
- Keeps a small Python processing pipeline for extraction, validation, and sync tasks
- Works as a GitHub Pages-friendly static front end when served via Vite or a static host

## Current repository status

This repository includes:

- Sample extracted question data for booklets H, K, L, M, and N
- A React + Vite front end in the frontend folder
- Python extraction and validation scripts in the processor folder
- Canonical dataset files in the data folder
- A local admin upload page in frontend/src/admin-upload.jsx

The app treats answer keys as repository data and does not invent official answers. Demo answers are only enabled in the UI through the settings dialog for testing and presentation.

## Repository structure

```text
.
├── README.md
├── package.json
├── frontend/
│   ├── package.json
│   ├── public/
│   │   ├── data/
│   │   └── assets/
│   └── src/
│       ├── App.jsx
│       ├── admin-upload.jsx
│       ├── components/
│       ├── lib/
│       └── theme/
├── processor/
│   ├── requirements.txt
│   ├── pytest.ini
│   ├── src/
│   │   ├── extract_paper.py
│   │   ├── import_answer_key.py
│   │   ├── sync_data.py
│   │   └── validate_dataset.py
│   └── tests/
├── data/
│   ├── README.md
│   ├── answer_keys/
│   ├── papers/
│   └── assets/
├── sample_inputs/
│   └── README.md
├── docs/
│   ├── ARCHITECTURE.md
│   ├── DECISIONS.md
│   └── TEST_MATRIX.md
├── source/
└── exports/
```

## Tech stack

- Front end: React 19 + Vite + Material UI
- Data layer: static JSON under data and frontend/public/data
- Processing: Python with PyMuPDF, Pillow, pytesseract, and openpyxl
- Hosting model: static, GitHub-friendly deployment with no SQL and no runtime backend for the public UI

## Prerequisites

- Python 3.11+
- Node.js 18+
- npm
- Optional PDF/OCR tooling when running extraction scripts

## Local setup

From the project root:

```powershell
python -m venv .venv
.\.venv\Scripts\activate
python -m pip install --upgrade pip
python -m pip install -r processor\requirements.txt
npm --prefix frontend install
```

Start the app:

```powershell
npm run dev
```

## Root scripts

The root package includes these project tasks:

```powershell
npm run dev                 # starts the Vite app
npm run build               # builds the front end
npm run test:web            # runs frontend tests
npm run validate            # validates dataset files
npm run sync:data           # syncs canonical data into frontend/public/data
npm run extract:k           # extracts booklet K sample data
npm run extract:l           # extracts booklet L sample data
npm run extract:n           # extracts booklet N sample data
```

## Data flow

### Canonical project data

The source-of-truth dataset lives under the data folder:

```text
data/
  papers/<BOOKLET>/questions.json
  papers/<BOOKLET>/paper.json
  answer_keys/<BOOKLET>/answer_key.json
```

### Public app sync

The sync script copies data into the public front-end folder consumed by the browser:

```powershell
PYTHONPATH=processor/src python processor/src/sync_data.py
```

This refreshes the files in frontend/public/data and updates the catalog used by the UI.

### Front-end runtime

The app loads:

- frontend/public/data/catalog.json
- frontend/public/data/<BOOKLET>/questions.json
- frontend/public/data/<BOOKLET>/answer_key.json
- frontend/public/data/<BOOKLET>/paper.json

Questions are filtered by booklet and language before rendering.

## Extraction and answer-key workflow

### Extract a paper PDF

Place the PDF in sample_inputs and run the extraction command:

```powershell
PYTHONPATH=processor/src python processor/src/extract_paper.py "C:\path\to\paper.pdf" --booklet K --output data\papers\K\questions.json --asset-root frontend\public\assets
PYTHONPATH=processor/src python processor/src/sync_data.py
```

The extraction script handles segmentation, bilingual question records, option reconstruction, and source metadata.

### Import an answer key

```powershell
PYTHONPATH=processor/src python processor/src/import_answer_key.py "C:\path\to\answer_key.xlsx" --booklet K --output data\answer_keys\K\answer_key.json
PYTHONPATH=processor/src python processor/src/sync_data.py
```

Accepted inputs include recognizable numeric and letter answer formats such as 1-4 and A-D.

## Admin upload flow

The app includes a local admin page for adding or replacing a dataset in development. Click the cloud-upload icon in the header to open the upload window.

The admin page accepts:

- Question JSON
- Answer key JSON
- Optional paper metadata JSON

It validates:

- question numbering
- missing question text
- required answer entries
- booklet and paper ID metadata

This workflow is intentionally local only. Static GitHub Pages deployments cannot write back into the repository, so all dataset updates must happen locally before commit and push.

## Publishing and answer-key policy

- Demo answers are synthetic and should be disabled before real publication
- The repository does not fabricate official answers
- Missing or partial official keys should remain in review or be loaded from the proper source before release

## Included sample datasets

This repository includes sample booklets for:

- H
- K
- L
- M
- N

The H dataset is marked as review in the catalog because the supplied sample does not include a complete official answer set for later language sections.

## Useful references

- docs/ARCHITECTURE.md
- docs/DECISIONS.md
- docs/TEST_MATRIX.md
- data/README.md
- sample_inputs/README.md

## Summary

This project is a lightweight static exam-data application for browsing and validating question paper datasets, syncing content to a browser-based UI, and supporting local admin dataset updates without requiring SQL or a backend service.


Prompt for generating answer key and question paper- 

"ROLE

You are a document extraction, question-paper reconstruction, answer-key reconciliation, and dataset-generation engine.

Your task is to convert the uploaded:
1. Question Paper PDF
2. Official Answer Key PDF / Answer Sheet
into production-ready JSON files compatible with my existing React/Vite Question Paper Navigator project.

IMPORTANT:
- Do NOT use an LLM/API key at runtime.
- The output must be static JSON.
- Do NOT create SQL, database records, backend APIs, or external dependencies.
- The JSON will be copied into:

frontend/public/data/<BOOKLET_CODE>/

The React application loads:
./data/<BOOKLET_CODE>/questions.json
./data/<BOOKLET_CODE>/answer_key.json
./data/<BOOKLET_CODE>/paper.json

--------------------------------------------------
1. SOURCE AUTHORITY
--------------------------------------------------

Use this authority hierarchy:

Priority 1:
Official answer-key PDF / official answer sheet supplied by the user.

Priority 2:
Question Paper PDF.

Priority 3:
Reasoned independent solution when an official answer is genuinely unavailable.

Never replace an official supplied answer with your own answer.

Never call an inferred answer "official".

For every answer, determine and preserve its provenance.

Allowed provenance values:

"official"
"official_answer_key"
"official_answer_sheet"
"inferred"
"reconciled"

Allowed answer status values:

"verified"
"inferred"
"reconciled"
"review"

--------------------------------------------------
2. EXTRACT THE EXAM METADATA
--------------------------------------------------

Determine:

exam
session
exam_date
paper_id
booklet_code
title
question_count
available_languages

Example:

{
  "schema_version": "1.2.0",
  "exam": "ACF-26-I",
  "session": "FEB-2026",
  "exam_date": "2026-03-01",
  "paper_id": "ACF-26-I-PAPER-I-K",
  "booklet_code": "K",
  "title": "Paper I - Set K",
  "question_count": 150,
  "available_languages": ["en", "hi"]
}

Do not invent metadata if it is visible in the source.

--------------------------------------------------
3. QUESTION EXTRACTION
--------------------------------------------------

Extract every question from the Question Paper PDF.

For each question create one JSON record.

Required fields:

id
exam
booklet_code
question_number
part
part_name
language
question_text
options
context_text
source
extraction

Use this structure:

{
  "id": "ACF-26-I-K-Q1-EN",
  "exam": "ACF-26-I",
  "booklet_code": "K",
  "question_number": 1,
  "part": "I",
  "part_name": "Child Development and Pedagogy",
  "language": "en",
  "question_text": "...",
  "options": {
    "1": "...",
    "2": "...",
    "3": "...",
    "4": "..."
  },
  "context_text": null,
  "source": {
    "pdf_page": 2,
    "printed_page": 2,
    "column": "single",
    "bbox": null,
    "has_embedded_images": false,
    "visual_fallback": null
  },
  "extraction": {
    "method": "pdf_text",
    "confidence": 1.0,
    "status": "verified",
    "warnings": []
  }
}

--------------------------------------------------
4. QUESTION IDs
--------------------------------------------------

Use deterministic IDs.

English:

<EXAM>-<BOOKLET>-Q<number>-EN

Hindi:

<EXAM>-<BOOKLET>-Q<number>-HI

Example:

ACF-26-I-K-Q1-EN
ACF-26-I-K-Q1-HI

Do not create random IDs.

--------------------------------------------------
5. LANGUAGE HANDLING
--------------------------------------------------

If the PDF contains multiple languages, preserve every language separately.

Example:

Q1 English
Q1 Hindi

Both must have:

"question_number": 1

but different:

"language": "en"
"language": "hi"

Do not merge English and Hindi question text into one field.

Do not translate unless the translation is actually present in the source.

--------------------------------------------------
6. OPTIONS
--------------------------------------------------

The application expects:

"options": {
  "1": "...",
  "2": "...",
  "3": "...",
  "4": "..."
}

Always preserve the actual option numbering.

Do not change option order.

Do not rewrite answer choices.

If an option contains a mathematical expression, table, diagram, graph, image, symbol, fraction, or other visual information that cannot be reliably represented as text:

- preserve the readable text
- create a visual fallback
- do NOT invent the missing visual content

Example:

"visual_fallback": {
  "type": "page_crop",
  "path": "source/<BOOKLET_CODE>/page-12-q45.png"
}

--------------------------------------------------
7. PASSAGES / CONTEXT
--------------------------------------------------

For comprehension questions:

"context_text" should contain the passage shared by the related questions.

Do not duplicate unrelated content.

Preserve paragraph structure.

--------------------------------------------------
8. SOURCE TRACEABILITY
--------------------------------------------------

Every question must retain:

pdf_page
printed_page when available
column when identifiable
bbox when available
has_embedded_images

This is required for auditing.

--------------------------------------------------
9. ANSWER KEY RECONCILIATION
--------------------------------------------------

Read the official answer key carefully.

Normalize answers to:

"1"
"2"
"3"
"4"
or:

"Z"

where Z means ALL.

Never output:

"A"
"B"
"C"
"D"

unless the project explicitly requires it.

Convert:

A → 1
B → 2
C → 3
D → 4

only when the answer-key legend confirms that mapping.

If the official answer key has a booklet/set/language namespace, use the correct namespace.

Never apply the answer key for Set K to Set L, M, N, or H.

Never mix exam sessions.

--------------------------------------------------
10. ANSWER JSON STRUCTURE
--------------------------------------------------

Generate:

{
  "schema_version": "1.0.0",
  "exam": "...",
  "booklet_code": "...",
  "paper_id": "...",
  "source_file": "...",

  "answers": {
    "1": "4",
    "2": "2",
    "3": "1"
  },

  "language_variants": {
    "en": {
      "91": "2",
      "92": "4"
    },
    "hi": {
      "91": "4",
      "92": "3"
    }
  },

  "count": 150,
  "status": "verified"
}

IMPORTANT PROJECT RULE:

For Questions 1–90:
store the answer in:

answers

For Questions 91–150:
store language-specific answers in:

language_variants.en
language_variants.hi

This matches the current frontend lookup behavior.

--------------------------------------------------
11. MISSING OFFICIAL ANSWERS
--------------------------------------------------

If an answer is genuinely absent from the supplied answer key:

DO NOT leave it blank.

Solve the question independently.

Use:

1. Exact wording of the question.
2. All four options.
3. Standard subject knowledge.
4. Relevant academic principles.
5. Mathematical calculation where required.
6. Elimination of clearly incorrect options.
7. Cross-check the conclusion independently.

Do not guess randomly.

The target is the most defensible answer possible.

However, NEVER falsely claim literal 100% certainty.

Instead mark:

"provenance": "inferred"
"status": "inferred"

Example:

"inferred_answers": {
  "97": {
    "answer": "3",
    "provenance": "inferred",
    "status": "inferred",
    "reason": "Answer derived from the question and options using standard subject principles."
  }
}

If you can establish the answer from an authoritative source contained in the question itself, use:

"provenance": "reconciled"

--------------------------------------------------
12. CRITICAL RULE FOR INFERRED ANSWERS
--------------------------------------------------

An inferred answer must never be presented as an official answer.

Do not write:

"official_answer": "3"

when it was inferred.

Write:

"answer": "3"
"provenance": "inferred"

--------------------------------------------------
13. ANSWER COMPLETENESS
--------------------------------------------------

Before producing the final files, check:

Questions:
Q1 through Q150 must exist.

English:
Q1 through Q150 where English exists.

Hindi:
Q1 through Q150 where Hindi exists.

Answers:
Q1 through Q150 must have an answer.

Missing answers:
0

Invalid answers:
0

Valid answer values:
1, 2, 3, 4, Z

Duplicate question IDs:
0

Duplicate question numbers within the same language:
0

Missing question text:
0

Missing options:
0

--------------------------------------------------
14. IMPORTANT COUNT RULE
--------------------------------------------------

Question JSON may contain:

150 English records
+
150 Hindi records

Therefore total physical records may be 300.

But logical question count is 150.

Do NOT interpret:

300 bilingual records

as:

300 different questions.

The question numbers remain Q1–Q150 per language.

--------------------------------------------------
15. QUESTIONS.JSON OUTPUT
--------------------------------------------------

Generate exactly:

questions.json

Structure:

{
  "schema_version": "1.0.0",
  "exam": "...",
  "booklet_code": "...",
  "source_file": "...",
  "question_count": 150,
  "questions": []
}

Place every extracted question inside:

"questions"

--------------------------------------------------
16. PAPER.JSON OUTPUT
--------------------------------------------------

Also generate:

paper.json

Example:

{
  "schema_version": "1.0.0",
  "paper_id": "ACF-26-I-PAPER-I-K",
  "exam": "ACF-26-I",
  "session": "FEB-2026",
  "exam_date": "2026-03-01",
  "title": "Paper I - Set K",
  "booklet_code": "K",
  "question_count": 150,
  "available_languages": ["en", "hi"]
}

--------------------------------------------------
17. VALIDATION.JSON OUTPUT
--------------------------------------------------

Generate:

validation.json

Example:

{
  "schema_version": "1.0.0",
  "question_records": 300,
  "logical_question_count": 150,
  "answer_count": 150,
  "missing_answers": [],
  "duplicate_ids": [],
  "missing_questions": [],
  "invalid_answers": [],
  "inferred_answers": [],
  "status": "PASS",
  "publication": "READY"
}

If anything is unresolved:

"status": "REVIEW"

Do not silently hide errors.

--------------------------------------------------
18. FINAL VALIDATION
--------------------------------------------------

Before returning the final output, perform these checks:

CHECK 1
Every question has:
question_number
language
question_text
options

CHECK 2
Every logical question has an answer.

CHECK 3
Every answer is one of:
1
2
3
4
Z

CHECK 4
Every official answer is traceable to the supplied answer key.

CHECK 5
Every inferred answer is explicitly marked inferred.

CHECK 6
No official answer is overwritten by inference.

CHECK 7
No questions from another booklet are mixed into this dataset.

CHECK 8
No questions from another exam session are mixed into this dataset.

CHECK 9
English and Hindi answer variants are correctly separated.

CHECK 10
Question IDs are unique.

--------------------------------------------------
19. FINAL OUTPUT
--------------------------------------------------

Return exactly these files:

1. questions.json
2. answer_key.json
3. paper.json
4. validation.json

Also provide a compact validation summary:

Exam:
Session:
Booklet:
Logical Questions:
Physical Question Records:
Answers:
Official Answers:
Inferred Answers:
Missing Answers:
Validation:
Publication Status:

--------------------------------------------------
20. MOST IMPORTANT RULE
--------------------------------------------------

The output must be directly usable by my React/Vite Question Paper Navigator.

Do not return pseudo-JSON.

Do not return explanatory prose inside JSON.

Do not use markdown inside JSON values unless it is actually part of the source text.

Do not omit required fields.

Do not fabricate source pages.

Do not fabricate official answers.

Do not silently guess.

When official answers are missing, solve them independently, record them as inferred, and still populate the answer value so that the quiz can function.

FINAL GOAL:

Question PDF
+
Answer Key PDF
↓
questions.json
+
answer_key.json
+
paper.json
+
validation.json

The resulting dataset must allow the project to display every question and determine whether the user's selected option is correct."