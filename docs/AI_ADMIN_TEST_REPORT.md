# AI Admin Enhancement — Test Report

## Scope tested

- Existing assessment dataset validation.
- Processor unit tests.
- H/K/L/M/N question and answer contract.
- Single-language and bilingual answer validation.
- AI provider routing using mocked provider responses.
- AI response parsing and normalization.
- Generate-mode PDF requirement.
- Admin-only page file presence and student/admin route separation by source inspection.
- JSON save metadata merge logic.

## Automated results

| Test | Result |
|---|---|
| `python processor/src/validate_dataset.py` | PASS |
| `PYTHONPATH=processor/src pytest -q processor/tests` | PASS — 7 tests |
| `node tools/test_admin_ai.mjs` | PASS |
| H/K/L/M/N prepare/save contract | PASS |
| Single-language validator mode | PASS |
| Bilingual validator mode | PASS |
| H/K/L/M/N runtime data smoke test | PASS |
| Node syntax checks for new server/config/lib modules | PASS |

## Provider mocks

Mock requests were exercised for:

- OpenAI Responses API payload shape.
- Anthropic Messages API PDF document payload shape.
- Gemini generateContent PDF inline-data payload shape.
- OpenRouter chat-completions file payload shape.
- Generate mode requiring both PDFs.
- JSON response extraction and project normalization.

No real provider API keys were used.

## Build limitation

A full Vite/React build could not be executed in this isolated build environment because installing the project's npm dependencies timed out. The project source was syntax-checked where Node can parse it, and the application/data layers were smoke-tested independently.

On the target Windows development machine, run:

```powershell
npm install --prefix frontend
npm run build
npm run test:web
```

The existing user environment has already demonstrated that Vite starts successfully after `frontend\npm install`.

## Manual UI acceptance checklist

1. Login page loads.
2. Student cannot access Admin tab.
3. Admin can open Admin Workspace.
4. Existing Manual JSON Upload tab remains available.
5. AI provider selector shows OpenAI, Claude, Gemini, and OpenRouter.
6. API key field is masked.
7. Question Paper PDF and Answer Key PDF can be selected.
8. Chat tab can select/reuse both PDFs.
9. Generate returns JSON and displays validation metrics.
10. Download buttons create the three JSON files.
11. Save to Project uses the existing admin save route.
12. Student exam still loads existing static JSON.
13. Timer/result behavior is unchanged by this AI-only patch.

## Security note

The AI capability is a local admin ingestion feature. API keys are not written to exam datasets. The local Vite proxy is not production secret management and must not be exposed to untrusted networks.
