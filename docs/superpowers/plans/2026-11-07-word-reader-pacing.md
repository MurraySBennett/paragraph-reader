# Word Reader Pacing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Open word mode paused and play one sentence or paragraph at a time, waiting for N/Next between segments.

**Architecture:** Build a document-derived queue of plain-text segments independent of the main reader unit. Give `WordPlayer` explicit ready, playing, paused, waiting, and finished states; wire a small dialog controller in `src/app.js`. Preserve selected-text scope and note anchors.

**Tech Stack:** Browser JavaScript, Node test runner, Playwright, esbuild static/standalone outputs.

**Spec:** `docs/superpowers/specs/2026-11-07-word-reader-pacing-design.md`

## Global Constraints

- Segment choice is Sentence (default) or Paragraph and persists separately from the main reader unit.
- Word mode opens paused; no timer advances between segments.
- Unmodified N/Next starts the next segment only while the dialog is open; notes typing is unaffected.
- Selected text bounds playback; closing restores the relevant note anchor.
- Keep the downloadable local copy working and publish only after checks pass.

## Review Focus

- Empty and whitespace-only segment input leaves a stable finished state.
- Sentence segmentation of abbreviations and punctuation uses `Intl.Segmenter`, consistent with the existing reader.
- Pressing N during active playback does not skip unread words.
- Changing segment unit while the dialog is open resets to paused at the queue's first segment.
- Escape, Back, and reopening cancel old timers and never leak playback into the next session.

---

### Task 1: Segment Queue and Player State

**Files:** Modify `src/word-mode.js`; test `tests/word-mode.test.js`.

**Interfaces:** `makeWordSegments(text, unit)` returns nonempty strings; `WordPlayer.load(segments)` enters ready state; `start()`, `pause()`, `resume()`, `next()`, `setWpm()`, and `stop()` control one segment at a time. `onWord(word, wordIndex, wordTotal, segmentIndex, segmentTotal)` and `onState(state)` report state.

- [ ] Write failing Node tests for segmentation, paused entry, word timing, waiting after a segment, N-equivalent `next()` only while waiting, final segment, speed change, and timer cancellation.
- [ ] Run `node --test tests/word-mode.test.js` and confirm the new assertions fail.
- [ ] Implement the queue and player state in `src/word-mode.js`, reusing `Intl.Segmenter` for sentences.
- [ ] Run `node --test tests/word-mode.test.js` and confirm pass.
- [ ] Commit the task.

### Task 2: Dialog and Keyboard Behavior

**Files:** Modify `index.html`, `src/app.js`, `src/styles.css`; test `tests/browser.spec.js` and `tests/structured-render.spec.js`.

**Interfaces:** `src/app.js` derives queue text from `doc.blocks` and current `chunks[chunkIndex]`, or the current card selection. Dialog controls are `#word-play`, `#word-next`, `#word-segment`, `#word-speed`, and `#word-progress`.

- [ ] Write failing Playwright tests for paused entry, Start/Pause/Resume, sentence and paragraph waiting, N and Next, selection bounds, focus handling, preserved note anchor, and saved segment preference.
- [ ] Run focused Playwright tests and confirm the new assertions fail.
- [ ] Wire queue derivation, UI state, persistent preference, keyboard handling, and dialog layout. Replace old auto-close expectations with explicit Back behavior.
- [ ] Run focused Playwright tests and confirm pass, then run `npm test` and the complete Chromium suite.
- [ ] Commit the task.

### Task 3: Package and Publish

**Files:** Modify `WORK.md`, `README.md` if controls need documentation, generated `dist/paragraph-reader.html`; test `tests/local-copy.spec.js`.

**Interfaces:** `npm run build` creates the hosted site and dated standalone ZIP; the existing GitHub Pages workflow runs Linux, macOS, and Windows ZIP smoke checks.

- [ ] Add a local-copy smoke assertion that the extracted ZIP opens word mode paused and advances by Next.
- [ ] Run the focused smoke test and confirm it fails before rebuilding.
- [ ] Build, update documentation and `WORK.md`, run Node, Python, hosted browser, and extracted-ZIP suites; verify ZIP integrity and `git diff --check`.
- [ ] Commit, fast-forward main, push, wait for Pages CI, and check live site and ZIP responses.
- [ ] Mark the goal complete only after live release checks pass.
