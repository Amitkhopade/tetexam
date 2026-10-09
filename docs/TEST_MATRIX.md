# Test Matrix

| Scenario | Expected behaviour |
|---|---|
| Normal text question | Extract question + four options |
| Multi-line option | All wrapped lines join into same option |
| Inline next question | Sequential question marker is split out |
| Numeric prose (`50.`) | Not treated as question unless sequentially plausible |
| Question number on separate visual line | Merge with same-baseline question text |
| Horizontal options | Row clustering sorts `(1),(2),(3),(4)` visually |
| Bilingual Q1–Q90 | Produce one EN and one HI record |
| Language I English/Hindi | Section heading determines language |
| Language II English/Hindi | Section heading determines language |
| Passage range | Context is attached only to declared question range |
| Vector-only fraction/diagram | Empty text + source crop fallback; never guess |
| Missing answer key | Show-answer action disabled and publish warning |
| Excel answer key | Normalize A-D or 1-4 to 1-4 JSON |
| Duplicate conflicting answer | Import fails loudly |
| Missing questions | Dataset validation fails |
| Duplicate question IDs | Dataset validation fails |
| GitHub Pages | Static JSON and assets resolve using relative paths |
| Browser refresh | State persists via localStorage |
| Private browsing/storage failure | App continues without persistence |
