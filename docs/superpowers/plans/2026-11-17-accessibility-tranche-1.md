# Accessibility Remediation, Tranche 1

**Goal:** Fix the audit defects that change no visual design and need no policy decision.

**Spec:** `docs/accessibility-audit-2026-11-17.md`

**Architecture:** Behavioural fixes in `src/app.js` and `index.html`. Nothing here is a pure
function, so `node --test` cannot reach most of it; assertions go in a new Playwright spec,
`tests/a11y.spec.js`, gated by CI. Pull requests now run the full suite, so a branch can be
verified — that was the point of the `pages.yml` change in `ac063c3`.

## Global constraints

- No visual change. Any fix that alters what the page looks like belongs to tranche 2.
- No new preference, no new storage field. Anything needing one belongs to tranche 3.
- Playwright cannot run on this machine. CI is the gate; do not iterate blind.

## Scope

| # | Defect | Fix |
|---|---|---|
| 1 | Focus destroyed when the focused button disables itself | Before disabling, move focus to a stable neighbour |
| 2 | Word reader exposes no text to a screen reader | Give the dialog the segment text as readable content; make progress a live region |
| 4 | Chunk changes announce nothing | Make the reading region's name track position; announce on change |
| 6 | Space and PageDown hijacked while the reading card has focus | Let the scrollable card keep its own paging keys |
| 7 | `aria-expanded` sticks at `true` | Single close path; add Escape and focus return |
| 8 | `#notes-toggle` label and state contradict | Drop `aria-pressed`; the label already carries the state |
| 9 | Label in Name failures on `#unit` and `#word-speed` | Make the accessible name start with the visible text |
| 13 | Stale toast text never leaves the accessibility tree | Clear `textContent` when the toast hides |
| 14 | No `main` landmark on the entry screen, no skip link | Wrap setup in a named landmark; add a skip link |
| 15 | Note editor re-focuses on every keystroke | Only rebuild the note index when the entry set actually changes |

Deferred: **3** and **5** (need a preference — tranche 3); **10**, **11** and **12** (visible
— tranche 2).

## Tasks

### Task 1: Focus survival, toast hygiene, naming

Covers 1, 8, 9, 13. No test infrastructure needed beyond the new spec file.

- [ ] Write `tests/a11y.spec.js` with specs for: pressing Next to the last chunk leaves
      focus on a focusable element; the toast's text is empty once hidden; `#unit` and
      `#word-speed` accessible names begin with "Read by" and "Speed"; `#notes-toggle`
      carries no `aria-pressed`.
- [ ] Implement in `src/app.js` and `index.html`.
- [ ] Commit.

### Task 2: Announcements and landmarks

Covers 2, 4, 14.

- [ ] Add specs: opening `#word-mode` exposes the segment text; `#word-progress` is a live
      region; moving to the next chunk updates the reading region's accessible name; a skip
      link is the first focusable element on the setup screen and targets a landmark.
- [ ] Implement.
- [ ] Commit.

### Task 3: Keyboard and menu behaviour

Covers 6, 7, 15.

- [ ] Add specs: Space scrolls an overflowing reading card instead of advancing;
      `aria-expanded` returns to `false` after "Keyboard shortcuts" closes the utilities
      menu; Escape closes the menu and returns focus to `#utilities-open`; typing in the
      note editor does not rebuild the note index on every keystroke.
- [ ] Implement.
- [ ] Commit.

### Task 4: Verify

- [ ] Push the branch, open a PR, read the run. Do not guess.
- [ ] Update `WORK.md`, run `agents-lint`, merge once green.
