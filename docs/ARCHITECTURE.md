# Architecture

## Runtime

- React 19 + Vite
- MUI 7 for accessible UI components
- Static JSON data hosted in the GitHub repository
- No SQL database and no runtime backend required for the public/read-only experience
- SPA is designed for GitHub Pages using relative asset URLs.

## Ingestion

1. PyMuPDF extracts native PDF text with coordinates.
2. Visual-line merging corrects PDF extraction where question numbers and question text are separate spans with overlapping baselines.
3. Inline question markers are split only when numerically sequential, preventing text such as `50. Surbhi` from becoming a fake question.
4. Numeric option markers `(1)`–`(4)` are reconstructed in visual row order.
5. For Q1–Q90, the extractor separates English and Hindi variants using the repeated eight-option structure.
6. For Q91–Q150, the language is determined from the Language I/II section heading.
7. Passage/context ranges are attached to questions in the declared range.
8. Vector-only content (fractions/diagrams) gets a source-page crop fallback instead of fabricated text.
9. A validation report checks question counts, duplicates, missing numbers, options, and extraction status.

## Data contract

Each question has a stable ID: `EXAM-BOOKLET-QNUMBER-LANGUAGE` and stores source page, bbox, extraction method, confidence, and warnings.

## Answer keys

The application expects `answer_key.json` per booklet. The importer supports CSV, XLSX/XLSM, and text PDFs. No official answers are invented by the repository.
