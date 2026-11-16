# Grouped Theme Menu Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Group the theme menu into Light, Dark and University, and add seven themes so the light side is a real choice.

**Architecture:** `THEMES` gains a `mode` field. A pure `themeGroups()` turns that array into the menu's shape so the grouping is testable under `node --test`; `fillThemeSelect` becomes three DOM calls over its result. A new `tests/themes.test.js` parses `src/styles.css` and holds every theme to the contrast bar the existing set already meets.

**Tech Stack:** Plain ES modules, no dependencies. `node --test` for assertions, Playwright in CI for the rendered page.

**Spec:** `docs/superpowers/specs/2026-11-17-theme-grouping-design.md`

## Global Constraints

- Themes are CSS variables only. Nothing in this change adds payload to the offline ZIP.
- `prefs.theme` stays a bare id. No storage format change, no migration.
- Playwright cannot launch on the development machine. Every assertion here runs under `node --test`; CI owns the rendered page.
- Contrast bar: `--fg` ≥ 7:1 on both `--bg` and `--surface`; `--muted` ≥ 5:1 on `--surface`; `--accent` ≥ 4.5:1 on `--surface`; `--accent-text` ≥ 4.5:1 on `--accent`.
- The one permitted failure is `utsa`'s `--accent`, recorded as an exact exception. Do not change the UTSA palette.

## Review Focus

1. **Three-digit hex.** `newcastle` and `ohio-state` use `--bg:#fff`, `contrast` uses `#000` and `#eee`. A contrast helper that slices six characters silently misreads them. Covered in Task 1, Step 1.
2. **`system` and `custom` carry no mode.** If either gains one it lands in a group and the menu lies. Covered in Task 1, Step 1.
3. **An id in `THEMES` with no CSS rule** applies nothing and shows an unstyled page. Covered in Task 1, Step 1.
4. **A `mode` that disagrees with the rule's `color-scheme`** puts a dark theme under Light. Covered in Task 1, Step 1.
5. **A saved preference naming a new theme must restore.** `validPreferences` derives from `THEMES`, so this should follow for free — pin it anyway. Covered in Task 2, Step 5.

---

### Task 1: The contrast and parity check

Runs against today's thirteen themes before any new one is added, so it is proved on real data.

**Files:**
- Create: `tests/themes.test.js`
- Modify: `src/themes.js`

**Interfaces:**
- Produces: `THEMES` entries gain `mode: 'light' | 'dark'`, absent on `system` and `custom`.

- [ ] **Step 1: Write the failing tests**

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { THEMES } from '../src/themes.js';

// contrast(hex, hex) -> number. Must expand 3-digit hex; #fff, #000 and #eee are all in use.
// themeRules(css) -> Map<id, {vars: Record<string,string>, scheme: 'light'|'dark'}>

const KNOWN_EXCEPTIONS = { utsa: ['accent'] };  // official UTSA orange, kept deliberately

test('contrast helper expands three-digit hex', () => {
  assert.equal(contrast('#fff', '#000').toFixed(2), '21.00');
  assert.equal(contrast('#ffffff', '#000000').toFixed(2), '21.00');
});

test('system and custom carry no mode', () => {
  for (const id of ['system', 'custom']) {
    assert.equal(THEMES.find(theme => theme.id === id).mode, undefined);
  }
});

test('every themed id has a rule whose colour scheme matches its mode', () => {
  const rules = themeRules(readFileSync('src/styles.css', 'utf8'));
  for (const { id, mode } of THEMES) {
    if (!mode) continue;
    assert.ok(rules.has(id), `no body[data-theme=${id}] rule`);
    assert.equal(rules.get(id).scheme, mode, `${id} declares color-scheme:${rules.get(id).scheme}`);
  }
});

test('every theme meets the contrast bar, with only the recorded exceptions failing', () => {
  const rules = themeRules(readFileSync('src/styles.css', 'utf8'));
  for (const { id, mode } of THEMES) {
    if (!mode) continue;
    const v = rules.get(id).vars;
    const checks = {
      fg: Math.min(contrast(v.bg, v.fg), contrast(v.surface, v.fg)) >= 7,
      muted: contrast(v.surface, v.muted) >= 5,
      accent: contrast(v.surface, v.accent) >= 4.5,
      'accent-text': contrast(v.accent, v['accent-text']) >= 4.5,
    };
    const failed = Object.keys(checks).filter(rule => !checks[rule]).sort();
    assert.deepEqual(failed, (KNOWN_EXCEPTIONS[id] ?? []).slice().sort(),
      `${id}: recorded exceptions and actual failures disagree`);
  }
});
```

The last assertion is exact in both directions: an unlisted failure fails the test, and a listed rule that now passes also fails it, so a stale exception cannot rot.

- [ ] **Step 2: Run to verify it fails**

Run: `node --test tests/themes.test.js`
Expected: FAIL — `contrast` and `themeRules` are not defined, and `mode` is missing from every entry.

- [ ] **Step 3: Implement**

In `tests/themes.test.js`, add `contrast(a, b)` (WCAG 2.x relative luminance, expanding 3-digit hex) and `themeRules(css)` (match `body[data-theme=<id>]{…}` blocks, collect `--name:#hex` pairs and the declared `color-scheme`). Both are local to the test file; the spec leaves their placement to the builder and there is one caller.

In `src/themes.js`, add `mode` to the eleven themed entries, matching each rule's declared `color-scheme`: light for `paper`, `warm`, `newcastle`, `ohio-state`; dark for `after-hours`, `neon`, `velvet`, `slate`, `night`, `contrast`, `utsa`. Leave `system` and `custom` without one.

- [ ] **Step 4: Run to verify it passes**

Run: `node --test tests/themes.test.js`
Expected: PASS, 4 tests.

- [ ] **Step 5: Commit**

```bash
git add src/themes.js tests/themes.test.js
git commit -m "test: hold every theme to the contrast bar it already meets"
```

---

### Task 2: The seven new themes

**Files:**
- Modify: `src/themes.js`, `src/styles.css`, `tests/storage.test.js:61`

**Interfaces:**
- Consumes: Task 1's `mode` field and `tests/themes.test.js`, which covers the new themes with no change.
- Produces: ids `gruvbox-light`, `mist`, `sage`, `lavender`, `dracula`, `night-owl`, `gruvbox-dark`.

- [ ] **Step 1: Add the entries to `THEMES`**

Seven new entries with `id`, `label` and `mode`, placed in the menu order the spec fixes. Labels: `Gruvbox Light`, `Mist`, `Sage`, `Lavender`, `Dracula`, `Night Owl`, `Gruvbox Dark`.

- [ ] **Step 2: Run to verify it fails**

Run: `node --test tests/themes.test.js`
Expected: FAIL — `no body[data-theme=gruvbox-light] rule`.

- [ ] **Step 3: Add the seven rules to `src/styles.css`**

One `body[data-theme=<id>]{…}` rule each, beside the existing palette block, using the exact hex values in the spec's palette table and the matching `color-scheme`. Copy them verbatim; they were verified by computation.

- [ ] **Step 4: Run to verify it passes**

Run: `node --test tests/themes.test.js`
Expected: PASS, 4 tests, now covering twenty ids.

- [ ] **Step 5: Extend the storage spot-check and run it**

In `tests/storage.test.js:64`, add `'dracula'`, `'night-owl'`, `'gruvbox-light'`, `'gruvbox-dark'`, `'mist'`, `'sage'` and `'lavender'` to the list of ids the test asserts `isThemeId` and `validPreferences` accept. This pins Review Focus 5: a saved preference naming a new theme restores.

Run: `node --test tests/storage.test.js`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/themes.js src/styles.css tests/storage.test.js
git commit -m "feat: add seven themes and fill out the light side"
```

---

### Task 3: The grouped menu

**Files:**
- Modify: `src/themes.js`, `tests/themes.test.js`

**Interfaces:**
- Produces: `themeGroups(): Array<{ label: string | null, items: Array<{id, label}> }>` — a `label` of `null` means the items render loose, outside any `<optgroup>`.

- [ ] **Step 1: Write the failing test**

```js
test('the menu groups by mode, with system and custom loose at the ends', () => {
  const groups = themeGroups();
  assert.deepEqual(groups.map(group => group.label),
    [null, 'Light', 'Dark', 'University', null]);
  assert.deepEqual(groups.at(0).items.map(item => item.id), ['system']);
  assert.deepEqual(groups.at(-1).items.map(item => item.id), ['custom']);
  assert.deepEqual(groups[1].items.map(item => item.id),
    ['paper', 'warm', 'mist', 'sage', 'lavender', 'gruvbox-light']);
  assert.deepEqual(groups[2].items.map(item => item.id),
    ['after-hours', 'night', 'slate', 'velvet', 'neon', 'dracula', 'night-owl', 'gruvbox-dark', 'contrast']);
  assert.deepEqual(groups[3].items.map(item => item.id),
    ['newcastle', 'utsa', 'ohio-state']);
});

test('every theme appears in the menu exactly once', () => {
  const ids = themeGroups().flatMap(group => group.items.map(item => item.id));
  assert.equal(ids.length, THEMES.length);
  assert.deepEqual([...new Set(ids)].sort(), THEMES.map(theme => theme.id).sort());
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `node --test tests/themes.test.js`
Expected: FAIL — `themeGroups is not defined`.

- [ ] **Step 3: Implement `themeGroups()` in `src/themes.js` and rewrite `fillThemeSelect`**

The three university ids (`newcastle`, `utsa`, `ohio-state`) are named in `src/themes.js`, not inferred — their group is an editorial judgment, not a property of the palette. `fillThemeSelect(select)` walks `themeGroups()`, building an `<optgroup label>` for a named group and appending bare `new Option(label, id)` for a `null` one. It stays three or four lines and holds the only DOM in the module.

- [ ] **Step 4: Run the whole suite**

Run: `npm test`
Expected: PASS, all node tests green.

- [ ] **Step 5: Commit**

```bash
git add src/themes.js tests/themes.test.js
git commit -m "feat: group the theme menu by light, dark and university"
```

---

### Task 4: Prove it in CI

Playwright is the only check that the rendered menu and the new palettes actually work, and it cannot run on this machine.

- [ ] **Step 1: Push the branch**

```bash
git push -u origin feature/theme-grouping
```

- [ ] **Step 2: Read the run, do not guess**

Run: `gh run watch` (or `gh run list --branch feature/theme-grouping`)
Expected: `build` green, including `tests/browser.spec.js`. If `browser.spec.js:52` or any appearance spec fails, fix from the reported error — do not iterate blind.

- [ ] **Step 3: Update `WORK.md` and lint**

Add the finished task to the `build` stream dated `2026-11-17`, rewrite `## Now`, then run `agents-lint`.

- [ ] **Step 4: Merge once green, and commit the state file**
