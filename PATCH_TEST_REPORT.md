# Patch Test Report

Date: 2026-10-10

## Passed in the build workspace

- `node tools/test_auth_billing.mjs` — PASS (schema validation, missing/duplicate/option validation, permanent-free H/K/L/M/N guard, payment signature routines, same-origin policy, password/session contract, Vercel config)
- `node tools/test_all_datasets.mjs` — PASS; H/K/L/M/N and 1,350 question-language records resolve to usable answer lookups
- `node tools/test_admin_ai.mjs` — PASS; mocked provider routing and AI output normalization
- `node tools/test_exam_session.mjs` — PASS; exam session, language, timer and scoring helpers
- `node tools/test_bundle_integrity.mjs` — PASS; required application files, canonical/runtime datasets, H provenance marker
- `python -m pytest -q processor/tests` — PASS; 7 tests
- `python processor/src/validate_dataset.py` — PASS
- JavaScript syntax check across `api/`, `scripts/`, and `tools/` — PASS
- ZIP archive integrity and file manifest — checked after packaging

## Not verified in this environment

- Full Vite production build/browser-based integration could not be run because frontend dependencies were not available locally and npm registry installation timed out / was not cached. Run `npm run install:all` followed by `npm run build` and the integration tests in the user's project/Preview environment.
- Real email delivery and real Razorpay payment were not performed; provider flows were tested without real accounts/keys. Configure Preview with test provider credentials and perform end-to-end testing before live traffic.

## Data preservation

The patch deliberately does not include or overwrite the `frontend/public/data/H`, `K`, `L`, `M`, or `N` folders. Those remain in the existing consolidated project. The existing free exam engine and JSON contracts are kept intact.
