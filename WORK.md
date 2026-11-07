# Work

## Now

- Reader text width enlarged from 64ch to 100ch by default, with a 130ch control limit; published at https://murraysbennett.github.io/paragraph-reader/.
- Word mode now opens paused, plays by its own sentence/paragraph setting, and waits for N/Next between segments at https://murraysbennett.github.io/paragraph-reader/.
- Pacing plan: `docs/superpowers/plans/2026-11-07-word-reader-pacing.md`; implementation and review fix are complete.
- GitHub Pages run 42347625233 passed Node, Python, hosted Chromium, Linux/macOS/Windows extracted-ZIP checks, and deployment; live page, stylesheet, and ZIP returned HTTP 200.
- The terminal helper remains at `tools/paragraph-reader`; native installers and a notes review space remain later build tasks.

## build

- [x] 2026-11-07 — Widen the default reader text column while retaining edge padding and a narrower user choice.
- [x] 2026-11-07 — Add paused word-reader entry and sentence/paragraph pacing with explicit N/Next between segments; preserve selection and notes anchors.
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
