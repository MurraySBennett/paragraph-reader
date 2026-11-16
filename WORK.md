# Work

## Now

- The product is **Reader**, live at https://reader.murraysbennett.com over HTTPS. GitHub Pages serves it at a custom domain; `murraysbennett.github.io/paragraph-reader/` 301s there. Per `docs/superpowers/plans/2026-11-16-reader-site-publication.md`.
- The name is good enough rather than settled, and changing it again costs little: the repository, npm package, `bin/paragraph-reader` and the `paragraph-reader:v2` storage key were all deliberately left alone.
- Notes saved at the old github.io origin stay there — `localStorage` is per-origin. An installed copy still serves from cache, so **Download backup** works at the old address; a cold visit redirects.
- Outstanding for Murray: verify the domain in GitHub's account settings against subdomain takeover, and export any notes he wants from the old origin.
- Native installers and a notes review space remain later build tasks; the terminal helper is at `tools/paragraph-reader`.

### Reverted: PDF paragraph recovery, 2026-11-16

The concurrent session's PDF layout work (`src/pdf-layout.js`, `src/pdf.js`,
`bin/paragraph-reader`, `tests/pdf-layout.test.js`, `tests/test_cli.py`) was committed in
`0381484` on Murray's clearance and **reverted** in the commit below, because it broke three
Playwright specs: `examples.spec.js:21`, `local-copy.spec.js:23` and `offline.spec.js:3` all
assert that importing `samples/dutch-auctions.pdf` renders its title and instead received the
running header — `runningHeads()` in `src/pdf-layout.js` does not recognise
`Bennett et al. Cogn. Research (2020) 5:62`. `pages.yml` skips `deploy` when `build` fails,
so the failure blocked every release, not just that feature.

Nothing is lost: `0381484` is in history and the work can be re-landed with a fix.

**The lesson worth keeping.** That session verified `npm test` 36/36 and
`python3 -m unittest` 5/5 and was right about both — but neither runs the Playwright specs,
and Playwright cannot launch on this machine at all (chromium and firefox both fail
`browserType.launch`; `vendor/pdf.mjs` also cannot run under node 22 or 24). **A green local
run here does not mean green.** CI is the only gate for anything touching PDF import,
rendering, or the offline package; push to a branch and read the run before believing it.

## build

- [x] 2026-11-08 — Implement the selected home/reader visual style and optional site-wide palettes, including responsive and contrast corrections.
- [x] 2026-11-16 — Name the product **Reader** and publish it at https://reader.murraysbennett.com. Public identity only: title, `.toolbar .brand`, the setup header, the sample caption, `manifest.webmanifest` `name`, `tools/build-fable.mjs`'s DOCX creator and `samples/README.md`. The offline ZIP's date was hardcoded in three places and asserted as a literal in two specs, so it could never re-date; `index.html` now carries `__ZIP_NAME__`/`__RELEASE_DATE__` placeholders, `build.mjs` derives both and clears stale `dist/*.zip`. Verified live: title, manifest name and `reader-2026-11-16.zip` all serve from the new origin.
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
