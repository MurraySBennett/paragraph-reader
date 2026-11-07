# Work

## Now

- Public reader goal delivered. Plan: `docs/superpowers/plans/2026-11-07-public-reader.md`.
- Published at https://murraysbennett.github.io/paragraph-reader/; GitHub Pages workflow passed unit, CLI, browser, and build checks.
- The terminal helper remains at `tools/paragraph-reader`; its cached HTML page accepts files locally and explains how to open another PDF through the helper.
- Both structured-passage/DOCX and examples/offline designs are approved together. Execution plan: `docs/superpowers/plans/2026-11-07-structured-import-examples-offline.md`.
- New `/goal` launched for native execution in `feat/structured-offline-release`. Milestone 1/7 complete: plain, Markdown, and simple TeX share a validated passage model; CLI TeX retains source commands for that parser. Node 17 and Python 3 tests pass.
- Milestone 3/7 complete: v3 rich-document backup validation, old v2 backup support, earlier-note recovery, five reader font choices including licensed OpenDyslexic. Node 24, Python 3, and browser 20 tests pass.
- Milestone 4/7 next: semantic rendering and word-mode source anchors. The reader currently opens normalized visible text from the new importers; milestone 4 shows the retained structure and fully exercises CLI/browser TeX equivalence.
- The Spanish story is drafted inside the examples spec. Source curation, license checks, sample packaging, and local-file PDF/DOCX verification are implementation tasks.

## build

- [ ] next — Build the approved six-example library and homepage entry points after verifying source rights and formats.
- [ ] next — Build installable offline browser access, a downloadable desktop copy, and repo guidance. Native installers remain later.
- [ ] later — Design a notes review space and better Markdown export, with optional local copyable prompt composition for an external AI assistant; no automatic sending.
- [ ] now — Implement structured passages and font families, including a dyslexia-oriented option; leave preamble grouping unchanged unless requested again.
- [x] 2026-11-07 — Implement the public reader design, verify it, and publish the static release.
- [x] 2026-11-07 — Add paragraph/sentence/page chunking and content-fingerprint storage with backup validation.
- [x] 2026-11-07 — Add top bar, optional resizable notes, keyboard focus, themes, and typography controls.
- [x] 2026-11-07 — Add selected-passage word playback, Markdown/JSON export, backup restore, and local PDF extraction.
- [x] 2026-11-07 — Build static and self-contained releases, preserve CLI entry point, and verify desktop/mobile layouts.

## infra

- [ ] later — The global project-guide checker reports unrelated pre-existing missing links and registration drift; the new paragraph-reader entry is not among its failures.
