# Design — grouped theme menu and seven new themes

2026-11-17. Small change. Approved in conversation; see Approaches for what was considered.

## Intent

The theme menu is a flat list of thirteen names. A visitor picking "Velvet" or "Slate"
cannot tell whether they are choosing a light or a dark page until they have chosen it.
Group the menu by what the reader is actually deciding, and fill the light side, which is
thin enough that the choice is not a real one.

## Goals

- A reader can see at a glance which themes are light and which are dark.
- The light side offers as much genuine choice as the dark side.
- Dracula and Night Owl are available by name.
- Theme colour is verifiable locally, on a machine where Playwright cannot launch.

## Non-goals

- No change to how themes are stored, applied, or validated. `prefs.theme` stays a bare id.
- No change to the Custom colour controls.
- No new UI beyond the `<optgroup>`s: no previews, no swatches, no theme search.

## Anti-goals

- A menu so long that choosing becomes work. Twenty entries is the ceiling, and this
  change reaches it.
- Borrowed themes that look right in a screenshot and fail at the contrast bar the rest
  of the set meets.

## Constraints

- The product ships offline, installed, and as a ZIP. Themes are CSS variables only;
  nothing here adds a byte of payload beyond the rules themselves.
- Playwright cannot run on the development machine. Assertions go in `node --test`.
- `tests/browser.spec.js:52` selects a theme with `selectOption('newcastle')`, which
  matches on value and is unaffected by grouping. No spec needs changing.

## Approaches

| | Shape | Why not |
|---|---|---|
| A | `Light` and `Dark` only, every theme sorted by its declared `color-scheme` | Scatters the brand palettes: UTSA under Dark, Newcastle and Ohio State under Light, by an accident of their backgrounds rather than anything a reader is choosing between |
| **B** | **`Light` / `Dark` / `University`, with System and Custom loose** | **Chosen.** The brand palettes answer a different question — "show my institution" — so they get their own group instead of diluting the mode groups |
| C | B plus an `Other` group holding System, Custom and High contrast | Buries High contrast, which is the one entry an accessibility-driven visitor is hunting for |

## The menu

```
System
── Light ──────────  Paper · Warm paper · Mist · Sage · Lavender · Gruvbox Light
── Dark ───────────  After Hours · Night · Slate · Velvet · Neon · Dracula ·
                     Night Owl · Gruvbox Dark · High contrast
── University ─────  Newcastle · UT San Antonio · Ohio State
Custom
```

`System` sits loose at the top and `Custom` loose at the bottom: neither has a mode, and
a one-entry `Other` group would be label noise. `High contrast` stays in Dark — it is a
dark theme, and a visitor scanning Dark should find it. Order within Dark leads with
`after-hours`, which is the default. **Builder's call** on nothing here; the order above
is the order.

## The seven new themes

Three were asked for or agreed; three are house-designed to fill the light side.
Borrowed candidates were tested and rejected on contrast: Nord Snow Storm (accent 3.5),
One Light (accent 3.9), Catppuccin Latte (7.1 / 4.4 / 4.3), Tokyo Night Day and
Everforest Light (fail outright). Gruvbox is the only family whose light member fits.

| Theme | Mode | `--bg` | `--surface` | `--panel` | `--fg` | `--muted` | `--line` | `--accent` | `--accent-text` | `--accent-soft` |
|---|---|---|---|---|---|---|---|---|---|---|
| Gruvbox Light | light | `#fbf1c7` | `#fffbef` | `#f4ead0` | `#3c3836` | `#665c54` | `#d5c4a1` | `#076678` | `#fff` | `#e8dcb8` |
| Mist | light | `#eceef0` | `#fbfcfd` | `#f3f5f6` | `#1e2224` | `#585f63` | `#ccd3d7` | `#2d6a7a` | `#fff` | `#dcebef` |
| Sage | light | `#edf0e9` | `#fbfdf8` | `#f3f6ef` | `#1f251d` | `#515b4e` | `#cdd6c6` | `#36644a` | `#fff` | `#dcebdf` |
| Lavender | light | `#f0eef6` | `#fcfbff` | `#f6f4fb` | `#231f2b` | `#575167` | `#d3cde2` | `#4f3f96` | `#fff` | `#e3ddf5` |
| Dracula | dark | `#282a36` | `#343746` | `#2d2f3d` | `#f8f8f2` | `#a7afce` | `#565a70` | `#bd93f9` | `#1d1e26` | `#413a57` |
| Night Owl | dark | `#011627` | `#0b2942` | `#061f35` | `#d6deeb` | `#8ba0b0` | `#44596b` | `#7fdbca` | `#01131f` | `#113a4e` |
| Gruvbox Dark | dark | `#282828` | `#353535` | `#2e2e2e` | `#ebdbb2` | `#bdae93` | `#5a524a` | `#83a598` | `#1d2021` | `#45403a` |

Dracula and Night Owl do not use their canonical comment colours for `--muted`:
`#6272a4` and `#637777` sit at 3.0 and 3.9 against their own backgrounds, well under the
5:1 the rest of the set holds. They are raised to `#a7afce` and `#8ba0b0`.

Every row above was rendered as a full reading pane and checked by computation before
being written down.

## The contrast check

New `tests/themes.test.js`, under `node --test`. It parses `src/styles.css` and asserts,
for every id in `THEMES` other than `system` and `custom`:

- a `body[data-theme=<id>]` rule exists
- the entry's `mode` matches the rule's declared `color-scheme`
- `--fg` reaches 7:1 against both `--bg` and `--surface`
- `--muted` reaches 5:1 against `--surface`
- `--accent` reaches 4.5:1 against `--surface`, and `--accent-text` 4.5:1 against `--accent`

It also asserts that `system` and `custom` carry no `mode`, so they cannot drift into a
group.

**The UTSA exception.** `utsa`'s `--accent: #f15a22` is 4.06:1 against its surface and
fails the accent rule today. Murray's call, 2026-11-17: leave the palette alone — it is
the institution's orange. The test therefore carries an explicit exception list:

```js
const KNOWN_EXCEPTIONS = { utsa: ['accent'] };  // official UTSA orange, kept deliberately
```

The list is exact in both directions: a theme that fails a rule not listed for it fails
the test, and a theme listed for a rule it now passes also fails the test. A later fix to
UTSA forces the exception to be deleted rather than left to rot, and no new theme can join
the list by accident. UTSA already ships a separately lightened `--link: #ff8b5f` for the
same underlying reason; that stays as it is.

## Files touched

- `src/themes.js` — add `mode: 'light' | 'dark'` to each entry; `fillThemeSelect` renders
  loose options plus three `<optgroup>`s.
- `src/styles.css` — seven new `body[data-theme=…]` rules.
- `tests/themes.test.js` — new.
- `tests/storage.test.js:61` — extend the id list it spot-checks to include the new themes.

## Left to the builder

- Where the contrast helper lives. It is about fifteen lines; inline in the test file is
  fine unless a second caller appears.
- Whether `fillThemeSelect` builds the groups from a derived map or a declared order. The
  menu order above is fixed either way.
