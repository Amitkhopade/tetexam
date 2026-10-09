# Source and Dataset Manifest

## Runtime datasets
| Set | Canonical question file | Canonical answer key | Runtime question rows | Runtime languages |
|---|---|---|---:|---|
| H | `data/papers/H/questions.json` | `data/answer_keys/H/answer_key.json` | 150 | English records currently published |
| K | `data/papers/K/questions.json` | `data/answer_keys/K/answer_key.json` | 300 | EN/HI |
| L | `data/papers/L/questions.json` | `data/answer_keys/L/answer_key.json` | 300 | EN/HI |
| M | `data/papers/M/questions.json` | `data/answer_keys/M/answer_key.json` | 300 | EN/HI |
| N | `data/papers/N/questions.json` | `data/answer_keys/N/answer_key.json` | 300 | EN/HI |

## Original source documents
- `source/H/set-5-Paper_i_ H paper.pdf`
- `source/H/H answer keys.pdf`
- `source/K/SET-1_PAPER-I_ACF-26-I-K.pdf`
- `source/L/SET-2_PAPER-I_ACF-26-I-L.pdf`
- `source/M/SET-3_PAPER-I_ACF-26-I-M.pdf`
- `source/M/M answer sheet.pdf`
- `source/N/SET-4_PAPER-I_ACF-26-I-N.pdf`
- `source/N/N answer sheet.pdf`
- `source/answer_keys/CTET-FEB-2026-FINAL-ANSWER-KEY.pdf` (shared K/L/M/N key)

## Answer-key convention used by the frontend
- Main/default `answers` covers Q1-Q150 in the bundled canonical files for coverage/provenance compatibility.
- `language_variants.en` and `language_variants.hi` each cover Q91-Q150 for K/L/M/N.
- The runtime selector checks language variants first for Q91-Q150.
- H has `inferred_answers` entries Q91-Q150 to explicitly mark that these values were generated rather than copied from the supplied H key.

## Synchronization
Edit canonical `data/papers/` and `data/answer_keys/` first, then run `npm run sync:data` to rebuild `frontend/public/data/`. Do not edit the runtime copies and then run sync unless the changes have also been placed in canonical data.
