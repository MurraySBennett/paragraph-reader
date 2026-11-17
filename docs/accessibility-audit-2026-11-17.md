# Accessibility audit, 2026-11-17

Reader audited against WCAG 2.2 AA. Fifteen defects, worst first. Line references are
against `ac063c3`. Nothing here has been fixed yet; the speech work is being designed
against items 2 and 3.

## Defects

1. **Focus is destroyed whenever the focused button disables itself** — `src/app.js:112`,
   `src/app.js:283`, `src/app.js:168`. Pressing Enter on `#next` until the last chunk sets
   `disabled` under the user; focus drops to `<body>` and the next Tab restarts at the top
   of the page. Same when a word-reader segment ends and `showWordState` disables
   `#word-play`, and on the sample cards.

2. **The word reader exposes nothing to a screen reader** — `index.html:108`.
   `#word-display` is `aria-live="off"`, `#word-progress` is a plain `<span>` rewritten
   about thirteen times a second, and the passage text exists nowhere else in the dialog.
   Opening `#word-mode` gives a modal named "Word reader" containing no readable content
   and no announcement of position or player state.

3. **Up to 800 WPM of single-word flashing, ungated and unwarned** —
   `src/word-mode.js:35`, `src/styles.css:13`. At the maximum a `clamp(2.5rem,8vw,7rem)`
   glyph swaps on a full-viewport background every 75 ms — 13.3 Hz, inside the 3–55 Hz
   risk band. Nothing reads `matchMedia('(prefers-reduced-motion: reduce)')`, there is no
   lower default for that preference, and no advisory before entry. The one reduced-motion
   rule in the stylesheet covers `transition` on `button` and `.toast`.

4. **Moving between chunks is silent to assistive tech** — `src/app.js:103`–`115`.
   `render()` rewrites `#chunk-text`, `#progress` and `#chunk-label`; none is a live region
   or linked by `aria-describedby`, `#paragraph`'s name is the fixed `aria-label="Reader
   text"`, and `move()` does not move focus. Next announces nothing.

5. **Single-character shortcuts with no off switch** — `src/app.js:368`–`377`. `n`, `j`,
   `k` and Space act whenever focus is not in a field. Speech-input users and anyone with a
   tremor trigger them by accident; there is no setting to disable or rebind.

6. **Space and PageDown are hijacked while the reading card has focus** —
   `src/app.js:375`. `#paragraph` is `overflow:auto` and is where `card.focus()` lands, but
   it is a `div` and slips past the `input, textarea, select, button, a` guard at
   `app.js:372`. Space advances the chunk instead of paging the text, leaving ArrowDown as
   the only way to scroll a long chunk.

7. **`aria-expanded` on `#utilities-open` sticks at `true`** — `src/app.js:234`, `:235`,
   `:271`. Three paths hide `#utilities` without touching the attribute maintained only at
   `app.js:220`. The collapsed menu reports as expanded for the rest of the session. The
   panel also has no Escape-to-close and no focus return to its trigger.

8. **`#notes-toggle` contradicts itself** — `index.html:50`, `src/app.js:70`–`71`. With
   notes shown it announces "Hide notes, pressed"; hidden, "Show notes, not pressed". The
   label describes the action while the state describes the opposite condition.

9. **Label in Name failures** — `index.html:49`, `index.html:109`. Visible "Read by" with
   `aria-label="Reading unit"`, and visible "Speed" with `aria-label="Words per minute"`.
   Voice control cannot address either by its visible text.

10. **Both resizers are far under the 24×24 target** — `src/styles.css:9`. `#pane-resizer`
    is an 8px grid track, `.note-resizer` is 10px tall. `#pane-resizer` is additionally
    `display:none` below 800px, so the notes width cannot be changed on mobile at all.

11. **Focus can sit behind overlays** — `src/styles.css:9`. `.utilities` is absolutely
    positioned over `#read-focus`; tabbing out of the open menu focuses an invisible
    button. `.toast` is fixed over `.reader-bottom`, covering the focused "Read words" or
    "Next" button for 3.5 s after any status message.

12. **Component borders fail 3:1 in the shipped default theme** — `src/styles.css:23`.
    `after-hours` pairs `--line:#49504f` with `--surface:#191f20` at 2.0:1. That token draws
    every button, select, textarea and `.reading-card` boundary. `tests/themes.test.js`
    checks text and accent contrast but not `--line`; extending it is the obvious fix.

13. **Stale toast text never leaves the accessibility tree** — `src/styles.css:9`,
    `src/app.js:36`. `.toast` is hidden by `opacity:0` and `textContent` is never cleared,
    so a screen-reader user keeps finding "reading.notes.md downloaded" long after it
    vanished. Re-issuing an identical message produces no mutation and so no
    re-announcement.

14. **No `main` landmark on the entry screen and no bypass** — `index.html:13`. The setup
    screen is an unnamed `<section>`; the only `<main>` is `hidden` until a document opens.
    There is no skip link.

15. **The note editor re-focuses itself on every keystroke** — `src/app.js:194`–`196`.
    `renderNoteIndexWithoutInput` rebuilds every `#note-index` button, then calls
    `note.focus()` and `setSelectionRange` on each `input` event. This interrupts IME
    composition for CJK input and makes some screen readers re-announce per character.

## What is already correct

The three non-word `<dialog>`s use native `showModal()`, so focus containment, Escape and
focus restoration work (the hand-rolled Tab trap at `app.js:342`–`347` is redundant rather
than wrong). The `#appearance` tablist implements roving tabindex with Left/Right arrows and
correct `aria-selected`, `aria-controls` and `aria-labelledby`. The `role="separator"`
resizers carry complete `aria-valuemin`/`max`/`now` and implement Arrow and Home resizing
plus "Reset layout", satisfying WCAG 2.2 Dragging Movements. Visually hidden file inputs are
named by their wrapping `<label>` and show focus via `.file-button:focus-within`.
`#setup-status` and `#install-guidance` are genuine `role="status"` regions. Focus
indicators are a 3px outline at about 10:1 against the default background.
