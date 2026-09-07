# Architecture Decision Record

## Decision: GitHub + JSON, not SQL

The question bank is read-heavy, versioned, and edited in controlled releases. Static JSON is therefore the simplest runtime store. Git provides history and rollback. Excel/CSV remain authoring/import formats, not runtime formats.

## Decision: React + MUI

MUI provides production-grade accessibility and responsive primitives while keeping the UI code compact. The application uses explicit theme tokens:

| Token | Hex |
|---|---|
| Primary | `#2563EB` |
| Primary Dark | `#1D4ED8` |
| Secondary | `#0F766E` |
| Success | `#16A34A` |
| Warning | `#D97706` |
| Error | `#DC2626` |
| Background | `#F8FAFC` |
| Text | `#0F172A` |
| Muted | `#64748B` |
| Border | `#E2E8F0` |

Dark theme has equivalent contrast-safe tokens.

## Decision: deterministic answer lookup

The runtime answer lookup is only `question_number -> answer` within a booklet. No LLM is used to decide official answers. This avoids inference cost and hallucination risk.

## Decision: coordinate-aware extraction

The supplied PDFs contain extraction quirks: numeric question markers can be separated from question text, options can be positioned horizontally, and some math/fraction choices are vector artwork rather than text. Coordinates and visual row ordering are therefore part of the extraction algorithm.

## Decision: visual fallback over guessed text

When an option has no text representation (for example vector-rendered fractions), the pipeline creates a page crop and marks the record `verified_with_visual_fallback`. The system never invents the missing option text.
