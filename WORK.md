# Work

## Now

- Public reader goal delivered. Plan: `docs/superpowers/plans/2026-11-07-public-reader.md`.
- Published at https://murraysbennett.github.io/paragraph-reader/; GitHub Pages workflow passed unit, CLI, browser, and build checks.
- The terminal helper remains at `tools/paragraph-reader`; its cached HTML page accepts files locally and explains how to open another PDF through the helper.
- Structured-passage design now includes local DOCX import and a legacy DOC conversion message; independent builder check found no important gaps. User approval is pending.
- The six-example shortlist and two offline routes are specified in `docs/superpowers/specs/2026-11-07-examples-and-offline-access-design.md`; independent builder check found no consequential gaps. User approval of the written design is pending.
- The Spanish story is drafted inside that spec. Source curation, license checks, sample packaging, and local-file PDF/DOCX verification belong to implementation after approval.

## build

- [ ] now — Build the approved six-example library and homepage entry points after verifying source rights and formats; design reviewed, awaiting approval.
- [ ] now — Build installable offline browser access, a downloadable desktop copy, and repo guidance; design reviewed, awaiting approval. Native installers remain later.
- [ ] later — Design a notes review space and better Markdown export, with optional local copyable prompt composition for an external AI assistant; no automatic sending.
- [ ] now — Design supported inline formatting across document types and reader font families, including a dyslexia-oriented option; leave preamble grouping unchanged unless requested again.
- [x] 2026-11-07 — Implement the public reader design, verify it, and publish the static release.
- [x] 2026-11-07 — Add paragraph/sentence/page chunking and content-fingerprint storage with backup validation.
- [x] 2026-11-07 — Add top bar, optional resizable notes, keyboard focus, themes, and typography controls.
- [x] 2026-11-07 — Add selected-passage word playback, Markdown/JSON export, backup restore, and local PDF extraction.
- [x] 2026-11-07 — Build static and self-contained releases, preserve CLI entry point, and verify desktop/mobile layouts.

## infra

- [ ] later — The global project-guide checker reports unrelated pre-existing missing links and registration drift; the new paragraph-reader entry is not among its failures.
