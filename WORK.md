# Work

## Now

- Word-reader pacing goal in `feat/word-reader-pacing`; plan: `docs/superpowers/plans/2026-11-07-word-reader-pacing.md`. Player, dialog, keyboard, and selection checks pass locally; package and release checks next.
- Structured passages, DOCX import, reader fonts, six credited examples, offline install, and a downloadable ZIP are published at https://murraysbennett.github.io/paragraph-reader/.
- Execution plan: `docs/superpowers/plans/2026-11-07-structured-import-examples-offline.md`; all seven milestones complete.
- GitHub Pages run 42342318569 passed unit, Python CLI, hosted Chromium, Linux/macOS/Windows extracted-ZIP smoke, and deployment checks; live site, manifest, service worker, sample, and ZIP returned HTTP 200.
- The terminal helper remains at `tools/paragraph-reader`; native installers and a notes review space remain later build tasks.

## build

- [ ] now — Add paused word-reader entry and sentence/paragraph pacing with explicit N/Next between segments; preserve selection and notes anchors.
- [x] 2026-11-07 — Build the approved six-example library and homepage entry points after verifying source rights and formats.
- [x] 2026-11-07 — Complete and verify installable offline browser access, a downloadable desktop copy, and repo guidance. Native installers remain later.
- [ ] later — Design a notes review space and better Markdown export, with optional local copyable prompt composition for an external AI assistant; no automatic sending.
- [x] 2026-11-07 — Implement structured passages and font families, including a dyslexia-oriented option; leave preamble grouping unchanged unless requested again.
- [x] 2026-11-07 — Implement the public reader design, verify it, and publish the static release.
- [x] 2026-11-07 — Add paragraph/sentence/page chunking and content-fingerprint storage with backup validation.
- [x] 2026-11-07 — Add top bar, optional resizable notes, keyboard focus, themes, and typography controls.
- [x] 2026-11-07 — Add selected-passage word playback, Markdown/JSON export, backup restore, and local PDF extraction.
- [x] 2026-11-07 — Build static and self-contained releases, preserve CLI entry point, and verify desktop/mobile layouts.

## infra

- [ ] later — The global project-guide checker reports unrelated pre-existing missing links and registration drift; the new paragraph-reader entry is not among its failures.
