# Structured Import, Examples, and Offline Access Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship structured Markdown/TeX/DOCX reading and font choices, six credited example files, an installable offline app, and a novice-friendly downloadable desktop copy.

**Architecture:** Convert every import to one validated plain-text-plus-blocks document model; preserve plain text as the identity and note anchor, and render only allowlisted DOM nodes. Feed uploads and example cards through one file import function. Produce both the hosted PWA and a file-compatible offline package from the same source modules and release build.

**Tech Stack:** Existing HTML/CSS/ES modules, Node/esbuild, PDF.js, a maintained Markdown parser and DOCX converter chosen during implementation, Playwright, Python CLI, GitHub Pages.

**Spec:** `docs/superpowers/specs/2026-11-07-structured-passages-and-fonts-design.md`; `docs/superpowers/specs/2026-11-07-examples-and-offline-access-design.md`.

## Global Constraints

- Plain text controls identity, bookmarks, note hashes, selection offsets, export, and word playback; formatting is a validated sidecar. Existing v2 records and backups remain readable.
- Leave title/author/keyword preamble grouping as it currently behaves; the approved designs defer that change.
- Imported markup never enters `innerHTML`; rendered links accept only `http:`, `https:`, and `mailto:`. TXT, paste, and PDF remain text-first; no OCR or PDF style inference.
- `.docx` imports locally in the browser; `.doc` receives conversion guidance. Existing CLI source types remain supported, and TeX opened by CLI uses the browser's shared TeX parser.
- Typography includes two serif stacks, two sans-serif stacks, and bundled OpenDyslexic with license, as a preference without therapeutic claims.
- The six specified example files and their attribution/license record ship with hosted and downloadable releases. The TeX excerpt and official PDF require provenance verification before release.
- The installed app works offline after a successful first visit. A desktop download opens without Node, Python, Git, or a local server and supports fresh PDF and DOCX imports.
- Native installers, accounts/sync, OCR, remote AI, and notes-review UI are outside this plan. `WORK.md` remains the only live position record.

## Review Focus

- Nested emphasis split by a sentence boundary must retain both visible words and marks; Task 1 tests it.
- A DOCX with script-like links, corrupt ZIP bytes, or oversized content must leave the open document untouched; Task 2 tests it.
- Reimported Markdown/TeX whose normalized text changes must preserve the old notes in an accessible record rather than silently attaching them; Task 3 tests it.
- Word playback from a selection spanning marked text in a page chunk must return to its actual source paragraph; Task 4 tests it.
- Offline launch at `/paragraph-reader/`, an update, and a `file:` PDF/DOCX import must load every worker/parser from the release package; Tasks 6–7 test them.

---

### Task 1: Common passage model and Markdown/TeX parsing

**Files:** Create `src/passages.js`, `src/markdown.js`, `src/tex.js`, `tests/passages.test.js`, `tests/markdown.test.js`, `tests/tex.test.js`. Modify `src/content.js`, `package.json`, `package-lock.json`, `bin/paragraph-reader`, `tests/test_cli.py`.

**Interfaces:** `parsePlain(text, name)`, `parseMarkdown(text, name)`, `parseTex(text, name)` each return `{ name, text, blocks }`; each block has `kind`, `anchor`, `text`, `runs`, and optional `level`/`listType`. `makeStructuredChunks(blocks, unit, pageWords)` returns `{ text, start, end, blocks }` with sliced runs. `validatePassages(value)` rejects invalid anchors, runs, lengths, and URLs. The browser's TeX parser becomes authoritative; CLI embeds raw TeX for that parser, while its PDF path embeds extracted plain text.

- [ ] Write tests for deterministic canonical text; heading/list/emphasis/link parsing; unsafe raw HTML/link rejection; nested marks across sentence cuts; plain paste/TXT behaviour; and equivalent CLI/browser TeX visible text.
- [ ] Run `npm test` and `python3 -m unittest discover -s tests -p 'test_*.py'`; confirm the new assertions fail for absent behaviour.
- [ ] Implement the model and parsers with explicit readable-text fallbacks for unsupported syntax; change CLI boot metadata so raw TeX reaches the same browser parser.
- [ ] Rerun both commands, confirm all pass, and commit this task.

### Task 2: Local DOCX and unified file import

**Files:** Create `src/docx.js`, `src/import-file.js`, `tests/docx.test.js`. Modify `src/app.js`, `index.html`, `src/pdf.js`, `README.md`, `package.json`, `package-lock.json`, `tests/browser.spec.js`.

**Interfaces:** `parseDocx(file: File) -> Promise<{name,text,blocks}>`; `importFile(file: File) -> Promise<{name,text,blocks}>` dispatches TXT/Markdown/TeX/DOCX/PDF. `readPdf(file)` remains local plain text. `openImportedFile(file)` in `app.js` consumes the shared importer and changes state only after success. DOCX converter output is parsed into allowlisted passages, never inserted as HTML.

- [ ] Add a realistic DOCX fixture and tests for heading/list/strong/em/link, unsupported table/image readable text, dangerous link stripping, corrupt/encrypted/oversized input, and `.doc` guidance; browser test asserts an import error keeps the current document and note.
- [ ] Run `npm test` and `npx playwright test`; confirm the new tests fail.
- [ ] Add a maintained local DOCX converter, strict conversion/validation, and unified upload dispatch; document the chosen size bound and vendored licenses.
- [ ] Rerun focused tests, confirm pass, and commit this task.

### Task 3: v3 persistence and font preference

**Files:** Modify `src/storage.js`, `src/app.js`, `index.html`, `src/styles.css`, `tests/storage.test.js`, `tests/browser.spec.js`, `README.md`. Add bundled OpenDyslexic font and its exact license under `vendor/`.

**Interfaces:** `createDocument(name, text, blocks)` stores validated v3 sidecar; `loadDocument(storage, id)` reads v2/v3; `parseBackup(json)` reads v2/v3, validates the sidecar and note anchors; `validPreferences` accepts `fontFamily` from an exact allowlist. Define `legacyNoteRecovery` as an explicit backup/export path before adopting a newly normalized document with changed identity.

- [ ] Test v2 record/backup restoration, v3 malformed run/URL rejection, unchanged plain-text note hashes, changed-format import preserving recoverable old notes, and font preference/fallback round trips.
- [ ] Run `npm test` and the relevant Playwright tests; confirm failure.
- [ ] Implement v3 validation/migration and the smallest visible legacy-note recovery route; add font picker/preview, two serif and two sans stacks, bundled OpenDyslexic, and fallbacks.
- [ ] Rerun tests, confirm pass, and commit this task.

### Task 4: Structured reader rendering and word-mode anchors

**Files:** Create `src/render-passages.js`, `tests/render-passages.test.js`. Modify `src/app.js`, `src/content.js`, `src/styles.css`, `tests/browser.spec.js`.

**Interfaces:** `renderChunk(container, chunk)` creates text/`strong`/`em`/`a` and heading/list semantics from validated runs; `sourceAnchorForSelection(chunk, selection)` maps a DOM selection across nested marks to the source paragraph. Existing `WordPlayer` receives the same visible text as the chunk/selection.

- [ ] Test paragraph/sentence/page visual order and semantics, keyboard-safe links, nested selection offset mapping, playback return to the source note, and no executable DOM from import text.
- [ ] Run `npm test` and `npx playwright test`; confirm failure.
- [ ] Replace `chunk-text.textContent` rendering with semantic DOM creation and wire chunk/selection anchors; retain existing navigation and note focus behaviour.
- [ ] Rerun tests, accessibility scan, and commit this task.

### Task 5: Six sample assets and homepage cards

**Files:** Create `samples/` files and `samples/README.md`; add source credits/licenses. Modify `index.html`, `src/app.js`, `src/styles.css`, `build.mjs`, `tests/browser.spec.js`, `tests/release.test.js`, `README.md`.

**Interfaces:** `openImportedFile(file)` from Task 2 is called by sample cards after fetching same-origin sample bytes. `samples/README.md` records source URL/commit, author, license, modifications, and citation for every packaged file.

- [ ] Verify the TeX excerpt against the published CC BY text, acquire the official CC BY PDF, review the GRIN snapshot/links, and document Rainbow/fable provenance. Create and render-check the fable DOCX using the documents skill. Draft the original Spanish story from the approved copy and proofread it.
- [ ] Test all six sample cards for true-format import/download, correct card labels and credit links, sample presence in `dist`, keyboard access, and a failed fetch leaving the reader intact; run tests and confirm failure.
- [ ] Add curated assets and the four-card/“More examples” section through the shared importer; copy assets and notices in the release build.
- [ ] Rerun tests and visual/accessibility checks; commit this task.

### Task 6: Installable offline browser app

**Files:** Create `manifest.webmanifest`, icons, `sw.js`, `src/install.js`, `tests/offline.spec.js`. Modify `index.html`, `src/styles.css`, `build.mjs`, `tests/release.test.js`, `README.md`.

**Interfaces:** `setupInstallUI()` handles available `beforeinstallprompt`, installed display mode, and manual guidance; service worker uses a versioned cache scoped under the deployed `/paragraph-reader/` path and precaches the app, parser/worker assets, fonts, and six samples.

- [ ] Add browser tests for install prompt state, manual guidance, offline reload at the deployed subpath, offline sample/PDF/DOCX import, and version update without mixed assets; run them to failure.
- [ ] Implement manifest/icons/service worker/cache lifecycle and homepage install affordance; keep browser use functional if service workers are unavailable.
- [ ] Run offline tests at a hosted subpath plus existing browser tests, confirm pass, and commit this task.

### Task 7: Standalone download and public release

**Files:** Create `START-HERE.md` and package script if needed. Modify `build.mjs`, `src/pdf.js`, `index.html`, `src/app.js`, `.github/workflows/pages.yml`, `tests/release.test.js`, `tests/browser.spec.js`, `README.md`, `WORK.md`; update `/home/msb/projects/PROJECT_GUIDE.md` only if capabilities/paths need correction.

**Interfaces:** `npm run build` emits `dist/index.html`, CLI-compatible `dist/paragraph-reader.html`, six sample files, and a versioned downloadable offline ZIP linked from the homepage. A `file:` launch of the packaged HTML imports every supported format without a server; the CLI's bootstrapped page remains functional.

- [ ] Test package contents and exact download link; open the extracted HTML via `file:` and import fresh TXT/Markdown/TeX/DOCX/PDF files, then backup/restore. Add representative Windows/macOS/Linux desktop browser smoke jobs or record any unverified target explicitly before calling the package cross-platform.
- [ ] Run release tests and confirm failure on the current build's PDF dynamic imports/worker path.
- [ ] Make parser/worker loading file-compatible, generate ZIP and START-HERE, add GitHub source/clone guidance, version label, backup/storage explanation, and a truthful download link. Keep CLI preloaded PDF behaviour.
- [ ] Run `npm test`, Python CLI tests, `npx playwright test`, `npm run build`, offline/subpath and `file:` smoke checks; inspect responsive screens, license/provenance files, and source diff. Repair any failure and rerun its gate.
- [ ] Update `WORK.md` with final state and commit. Push/deploy the authorized public release only after checks pass; verify the live install and download URLs and record their actual result.

## Execution and failure policy

Tasks are ordered because the homepage samples and both offline routes depend on the shared parser and storage work. Use a separate worktree for execution if the working directory has unrelated changes. Each task owns its failing-test/implementation/pass cycle and commit; `WORK.md` records the current milestone, while checkboxes here are advisory. Do not publish if source rights, local PDF/DOCX import, backup compatibility, or offline subpath checks fail. A failed gate requires repair and rerun; if no viable repair can meet an approved requirement, return with the concrete gap and options rather than silently narrowing the release.
