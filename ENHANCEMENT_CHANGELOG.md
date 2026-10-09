# Combined Enhancement Changelog

- Consolidated the base Question Paper Navigator project with the login/home/timer/results/neumorphic UI changes.
- Combined the Admin AI generator and chat workspace for OpenAI, Claude, Gemini, and OpenRouter, plus the local Vite request proxy.
- Kept the manual JSON upload workflow and canonical question-engine answer lookup contract.
- Included all H/K/L/M/N runtime data and original source PDFs/answer keys.
- Added a full dataset lookup test and updated H provenance so Q91-Q150 are explicitly marked model-inferred.
- Added full local setup, technical architecture, LLM handoff and release inventory docs.
- Fixed the OpenRouter default slug and included the admin upload HTML page in Vite's multi-page build inputs.
- Hardened the save endpoint's source-folder paper ID handling against path traversal.
