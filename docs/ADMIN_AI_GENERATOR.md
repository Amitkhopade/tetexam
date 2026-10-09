# Admin AI Document Generator

## Scope

This feature is intentionally confined to the administrator workspace. The student exam route does not call any LLM and continues to read static JSON from `frontend/public/data`.

## Providers

The local admin AI proxy currently supports:

- OpenAI Responses API
- Anthropic Claude Messages API
- Google Gemini `generateContent`
- OpenRouter Chat Completions with PDF file parts

The proxy is namespaced under `/__admin/ai/run` and is only used by the admin page.

## API key handling

API keys are entered in the admin UI. By default they are kept in React state only. If the administrator enables "Remember key for this browser session", the key is stored in `sessionStorage` and is cleared when the browsing session ends.

Keys are not written to `frontend/public`, committed to Git, or put into `.env` files by the feature.

This is still a local administrator workflow, not production-grade secret management. Do not expose the Vite development server to an untrusted network with live API keys.

## Generation flow

```text
Question PDF + Answer Key PDF
        ↓
Admin AI Generator
        ↓
Local Vite /__admin/ai/run proxy
        ↓
Selected provider/model
        ↓
Structured/plain JSON response
        ↓
JSON parser + normalization
        ↓
Existing prepareDatasetForSave()
        ↓
Existing saveDatasetToProject()
        ↓
questions.json + answer_key.json + paper.json + validation.json
```

## Why the provider call is server-side

The public application is static. Sending provider requests through the Vite development server avoids browser CORS problems and keeps the key out of frontend network calls to third-party APIs. The endpoint is meant for local admin use only.

## Current model defaults

The defaults are editable because model availability differs by account:

- OpenAI: `gpt-6-astra`
- Claude: `claude-opus-5-5`
- Gemini: `gemini-3.8-flash`
- OpenRouter: `~openai/gpt-sol-latest`

Default model IDs were reviewed on 2026-10-09 against [OpenAI model documentation](https://developers.openai.com/api/docs/models), [Anthropic model documentation](https://platform.claude.com/docs/en/claude_api_primer), [Gemini model documentation](https://ai.google.dev/gemini-api/docs/models), and the [OpenRouter GPT Sol Latest page](https://openrouter.ai/~openai/gpt-sol-latest). These defaults may change and the model input remains editable. Use a model available to the configured API key that supports PDF/document input. OpenAI's Responses API supports PDF `input_file` items; Gemini supports PDF document input and structured output; OpenRouter supports PDF file inputs; Claude supports PDF documents as base64 content. See the current provider input documentation: [OpenAI file inputs](https://platform.openai.com/docs/guides/pdf-files), [Anthropic PDF support](https://platform.claude.com/docs/en/build-with-claude/pdf-support), [Gemini document processing](https://ai.google.dev/gemini-api/docs/document-processing), and [OpenRouter PDF inputs](https://openrouter.ai/docs/guides/overview/multimodal/pdfs).

## Testing policy

Automated tests validate the client JSON parser, provider payload construction, and integration with the existing dataset validator. Live provider testing requires the administrator's own API key and is not performed during repository build tests.

## Known limitation

A static GitHub Pages deployment cannot securely keep API secrets or run the local Vite proxy. The AI generator therefore remains a local/admin ingestion capability until a backend service is added.
