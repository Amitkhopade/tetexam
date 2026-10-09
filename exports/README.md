# Exported review workbooks

The following `*-answer-key-complete.xlsx` files are the current complete workbook exports for the runtime datasets H/K/L/M/N.

- `H-answer-key-complete.xlsx` is authoritative for workbook review, but Q91–Q150 are **inferred** because the supplied H answer-sheet PDF only covers Q1–Q90. They must not be represented as official answers.
- `K-answer-key-complete.xlsx`, `L-answer-key-complete.xlsx`, `M-answer-key-complete.xlsx`, and `N-answer-key-complete.xlsx` contain 150 logical questions and answer data mapped from the supplied CTET February 2026 answer-key source.
- Other workbooks (`ACF-26-I-PAPER-I-M.xlsx`, `ACF-26-I-PAPER-I-N.xlsx`) are retained as supporting historical/review exports.
- `legacy/SED-24-I-PAPER-I-H-before-inference.xlsx` is retained for traceability only. It predates the completed H inference workbook and should not be used as the current complete key because its later-question answers were not populated.

The canonical JSON under `data/` and served runtime JSON under `frontend/public/data/` remain the application data source. Workbooks do not get loaded by the web app.
