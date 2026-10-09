# Apply the Admin Master Prompt UI patch

This is a **small patch**, not a replacement project. It is intended for the existing complete Question Paper Navigator folder.

## Files in this patch

- `frontend/src/components/AdminAiGenerator.jsx` — adds an editable Master Extraction Prompt panel and sends the full prompt to the selected AI provider.
- `frontend/src/prompts/AI_QUESTION_ANSWER_JSON_GENERATION_PROMPT.md` — complete default extraction/reconciliation prompt bundled into the frontend with Vite's `?raw` import.
- `docs/AI_QUESTION_ANSWER_JSON_GENERATION_PROMPT.md` — copy of the same prompt for maintainers and LLM handoff.

## Apply it on Windows

1. Keep your existing project folder and make a backup copy first.
2. Stop Vite in the PowerShell window with `Ctrl+C`.
3. Extract this patch ZIP into the **project root** (the folder that contains `package.json` and `frontend`), e.g. `...\question-paper-platform`.
4. Allow Windows to replace `frontend\src\components\AdminAiGenerator.jsx` and `docs\AI_QUESTION_ANSWER_JSON_GENERATION_PROMPT.md` when prompted. The `frontend\src\prompts` folder/file is new.
5. Start the app again from the project root:

   ```powershell
   npm run dev
   ```

6. Sign in as admin and open **Admin → AI Document Generator → Generate Dataset**.
7. Expand **Master extraction prompt (expand to review or edit)**. The full project-compatible prompt is loaded by default. You may edit it for this session and choose **Save prompt for this session**. Choose **Restore bundled prompt** to revert.
8. Select the provider and a PDF-capable model, enter its API key, and click **Test connection**.
9. Upload both the question-paper PDF and its matching official answer-key PDF. Click **Generate Questions + Answers + Metadata**.
10. Review the generated JSON and validator output. Download the JSONs or choose **Save to Project** only after validation passes and you have reviewed inferred answers or visual questions.

## Expected result

The prompt returns one JSON object with `questions`, `answer_key`, and `paper`. The existing normalizer and `prepareDatasetForSave()` are still used; the student exam engine, H/K/L/M/N runtime data, timer/scoring, and existing manual upload mechanism are not changed by this patch.

## Constraints to know

- The AI provider must support the selected model's PDF/file input capabilities. An API key alone does not make every model capable of reading every scanned/large PDF.
- Official supplied answer-key entries take priority. Missing answers may be independently inferred only when defensible and must be marked inferred; no system can guarantee 100% correctness.
- The current scoring contract stores common answers in `answers` for Q1–Q90 and uses language-specific `language_variants` from Q91 onward for multilingual papers longer than 90 questions. If a paper has language-specific correct options for Q1–Q90, the existing exam engine cannot represent that variation without a separate compatibility enhancement.
- The development-only `/__admin/ai/run` and `/__admin/save-dataset` endpoints are not production-secure deployment services. Do not expose this local admin implementation publicly with production API keys.

## Verification

The following existing non-network checks passed after the patch was applied:

- `node tools/test_admin_ai.mjs`
- `node tools/test_all_datasets.mjs`
- `node tools/test_bundle_integrity.mjs`
- `node tools/test_exam_session.mjs`
- `python -m pytest -q processor/tests` (7 passed)
- `python processor/src/validate_dataset.py`

A full Vite build was not run in this artifact workspace because frontend dependencies were not installed here. On the user's machine, run `npm run build` after `npm run install:all` to verify the exact local dependency installation.
