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
