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
