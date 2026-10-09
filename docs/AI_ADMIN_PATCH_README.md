# AI Admin Generator Patch

## Scope

This is an additive patch for the existing Question Paper Navigator project. It changes the **administrator workspace only** and preserves the student exam engine, JSON data files, timer, login shell, and result scoring flow.

## Included capabilities

- Admin-only AI Document Generator.
- Provider selection: OpenAI, Claude (Anthropic), Google Gemini, OpenRouter.
- Per-provider model field and API key field.
- Optional browser-session key retention using `sessionStorage`.
- Connection test using a lightweight prompt.
- Question Paper PDF + Answer Key PDF upload.
- AI extraction prompt aligned with the project JSON contract.
- JSON normalization before existing `prepareDatasetForSave()` validation.
- Existing save pipeline reused for project writes.
- Generated `questions.json`, `answer_key.json`, and `paper.json` downloads.
- Chat window that can use the selected PDFs and conversation history.
- Bilingual validation support for 150 logical questions represented as 300 physical EN/HI records.
- No new npm dependency.

## Files in this patch

- `frontend/admin-upload.html`
- `frontend/src/admin-upload.jsx`
- `frontend/src/components/AdminAiGenerator.jsx`
- `frontend/src/lib/adminAi.js`
- `frontend/src/lib/adminAiServer.js`
- `frontend/src/lib/adminUpload.js`
- `frontend/vite.config.js`
- `docs/AI_QUESTION_ANSWER_JSON_GENERATION_PROMPT.md`
- `docs/ADMIN_AI_GENERATOR.md`
- `docs/AI_ADMIN_PATCH_README.md`
- `tools/test_admin_ai.mjs`

## Apply the patch

1. Start from the previously supplied login/timer/neumorphic project.
2. Stop Vite with `Ctrl+C`.
3. Extract this patch into the **project root**, preserving folders, and replace files when Windows asks.
4. Do not delete `frontend/public/data` or any existing H/K/L/M/N JSON files.
5. Run `cd frontend` then `npm install` if dependencies are not already installed.
6. From the project root, run `npm run dev`.
7. Open the normal site and log in as admin.
8. Open the Admin tab. The Admin Workspace now contains the AI Document Generator and Manual JSON Upload tabs.

## AI generation workflow

`Admin login -> AI Document Generator -> select provider/model/key -> select Question PDF + Answer Key PDF -> Generate -> normalize -> existing validation -> review/download -> Save to Project`

The save operation continues to use the existing local Vite admin writer. It writes the project JSON files and updates `catalog.json` using the same save route used by manual JSON upload.

## Important deployment limitation

The provider proxy is deliberately implemented for the local Vite admin workflow. A static GitHub Pages deployment cannot securely hold third-party API keys or execute the local Vite middleware. Do not expose the Vite dev server to an untrusted network while live API keys are in use.

## API-key handling

By default API keys remain in React state. When the administrator enables the browser-session option, keys are stored in `sessionStorage`. They are never written to `frontend/public/data`, the JSON datasets, or Git.

This is appropriate for a local admin ingestion MVP, not a public production secret store. A later production backend should replace this proxy without changing the student exam engine.

## Verification commands

From the project root:

```powershell
python processor/src/validate_dataset.py
PYTHONPATH=processor/src pytest -q processor/tests
node tools/test_admin_ai.mjs
```

The first two validate the existing assessment processing/data layer. The Node test validates AI provider payload routing, response extraction, PDF requirements, and JSON normalization without calling real providers.

For the user's Windows environment, also run:

```powershell
npm run build
npm run test:web
```

## Current default model IDs

The UI defaults are editable. Current defaults are:

- OpenAI: `gpt-6-astra`
- Claude: `claude-opus-5-5`
- Gemini: `gemini-3.8-flash`
- OpenRouter: `~openai/gpt-sol-latest`

Provider/model availability is account-dependent; the model text field can be changed without code changes.
