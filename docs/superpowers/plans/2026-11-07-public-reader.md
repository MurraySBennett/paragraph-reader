# Public Paragraph Reader Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a polished static paragraph reader with optional notes, flexible reading modes, safe persistence, and a verified browser release.

**Architecture:** Build focused browser modules for parsing/chunks, storage, word playback, and UI. Bundle them into a single HTML release for the existing CLI, while publishing the same static UI for the web. Keep browser file processing local.

**Tech Stack:** HTML, CSS, JavaScript, Node build/tests, Python CLI, PDF.js for browser PDF text extraction.

**Spec:** `docs/superpowers/specs/2026-11-07-public-reader-design.md`

## Global Constraints

- No server, account, sync, upload, analytics, or AI.
- Existing `projects/tools/paragraph-reader` CLI remains functional with PDF/TeX/text.
- Neutral theme names in visible UI and source identifiers/comments.
- Saved notes never silently attach to unrelated source text.
- Keep `WORK.md` as the only live position record.

## Review Focus

- A changed document with the same filename must not inherit notes from the old document.
- Keyboard navigation must not steal keystrokes from notes, settings inputs, or dialogs.
- An empty, scanned, or malformed PDF must report a useful error without losing current work.
- Importing a malformed backup must not overwrite current work.
- Word mode must restore the reader and source position after selected-passage playback.

---

### Task 1: Project, parsing, and persistence

**Files:** `src/content.js`, `src/storage.js`, `tests/content.test.js`, `tests/storage.test.js`, `package.json`, `README.md`, `WORK.md`, `bin/paragraph-reader`.

**Interfaces:** `prepareText(text, name)`, `splitParagraphs(text)`, `makeChunks(paragraphs, unit, pageWords)`, `fingerprint(text)`, `loadDocument(id)`, `saveDocument(doc)`, `parseBackup(json)`.

- [ ] Write tests for paragraph/sentence/page chunk boundaries, stable content fingerprints, changed-filename isolation, malformed backup rejection, and TeX preparation.
- [ ] Run tests to see failures.
- [ ] Implement content and storage modules with schema validation and source paragraph hashes; document source and CLI integration.
- [ ] Run tests and commit.

### Task 2: Reader shell, notes, and appearance

**Files:** `index.html`, `src/app.js`, `src/styles.css`, `tests/browser.spec.js`, `build.mjs`.

**Interfaces:** UI consumes Task 1 modules and exposes `openDocument`, `render`, `setUnit`, `setNotesVisible`, `setTheme`, `savePreferences` internally.

- [ ] Write browser tests for reading/navigation, note focus, hide/show, resize/reset, theme/typography, persistence, and editable-control shortcut safety.
- [ ] Run tests to see failures.
- [ ] Build responsive top bar, notes panels, drag handles, appearance dialog, neutral accessible themes, and keyboard controls.
- [ ] Run tests and commit.

### Task 3: Word mode, import/export, and browser PDF

**Files:** `src/word-mode.js`, `src/pdf.js`, `src/app.js`, `index.html`, `tests/browser.spec.js`, `tests/word-mode.test.js`.

**Interfaces:** `WordPlayer` accepts text/WPM/onWord/onFinish; PDF parser returns extracted plain text or a user-facing error.

- [ ] Write tests for selected-passage return, play/pause/WPM bounds, export feedback, backup round trip, malformed import safety, and PDF error behavior.
- [ ] Run tests to see failures.
- [ ] Implement word mode, import/export, and local PDF.js extraction.
- [ ] Run tests and commit.

### Task 4: Release and publication

**Files:** `build.mjs`, `dist/`, `README.md`, `WORK.md`, `projects/tools/paragraph-reader` and `paragraph-reader.html`, `projects/PROJECT_GUIDE.md`.

- [ ] Build self-contained HTML and static web release; confirm CLI opens a bootstrapped document and browser PDF import works in the static build.
- [ ] Run full tests, accessibility/visual smoke checks, and guide check; repair failures.
- [ ] Update the existing CLI entry point and project guide, then commit release and WORK state.
- [ ] Publish through an available static host if authorized and verify the live URL; otherwise leave a release-ready artifact and exact publication step.
