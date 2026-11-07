# Work

## Now

- Public reader goal delivered. Plan: `docs/superpowers/plans/2026-11-07-public-reader.md`.
- Published at https://murraysbennett.github.io/paragraph-reader/; GitHub Pages workflow passed unit, CLI, browser, and build checks.
- The terminal helper remains at `tools/paragraph-reader`; its cached HTML page accepts files locally and explains how to open another PDF through the helper.
- Next: design the import, formatting, and font selection extension in `~/.agents/handoffs/HANDOFF-paragraph-reader-import-typography.md` with the user.

## build

- [ ] next — Design supported inline formatting across document types and reader font families, including a dyslexia-oriented option; leave preamble grouping unchanged unless requested again.
- [x] 2026-11-07 — Implement the public reader design, verify it, and publish the static release.
- [x] 2026-11-07 — Add paragraph/sentence/page chunking and content-fingerprint storage with backup validation.
- [x] 2026-11-07 — Add top bar, optional resizable notes, keyboard focus, themes, and typography controls.
- [x] 2026-11-07 — Add selected-passage word playback, Markdown/JSON export, backup restore, and local PDF extraction.
- [x] 2026-11-07 — Build static and self-contained releases, preserve CLI entry point, and verify desktop/mobile layouts.

## infra

- [ ] later — The global project-guide checker reports unrelated pre-existing missing links and registration drift; the new paragraph-reader entry is not among its failures.
