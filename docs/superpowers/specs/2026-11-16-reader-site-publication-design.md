# Reader — site publication design

**Date:** 2026-11-16
**Repos touched:** `paragraph-reader`, `msbensite`
**Status:** awaiting author approval

## Intent

Paragraph Reader is finished, tested and published at
`https://murraysbennett.github.io/paragraph-reader/`, where nothing links to it. This work
gives it a permanent address on Murray's own domain at `https://reader.murraysbennett.com`,
lists it on the site's Tools page, and renames the public product to **Reader**.

The why: it is a tool Murray built for himself and uses himself, and an unlinked github.io
URL is not a home. He may offer it to students if he teaches again; that is not the reason
for this work and must not appear in any public text.

## Goals

- `https://reader.murraysbennett.com` serves the current build over HTTPS.
- The Tools page lists Reader honestly, without weakening the bar the page sets for
  research tools.
- The public product name is **Reader** — chosen as good enough, changeable later.

## Non-goals

- No AWS work. No bucket, distribution, certificate, IAM key or CloudFront Function.
- No rename of the git repository, the npm package, or the `bin/paragraph-reader` CLI.
  Only the public identity changes. *(My call, not Murray's instruction: it keeps existing
  clones, the GitHub URL and the terminal helper working. Say so if you want the repo
  renamed too.)*
- No migration notice at the old URL. Murray: "we have no cold visitors or any that I am
  concerned about affecting." See Constraints for what this costs.
- No change to what the app does, how it reads files, or where it stores anything.
- No native installers and no notes-review space; those stay later tasks in `WORK.md`.

## Anti-goals

Failures even if the URL works:

- **Any public text mentioning students, teaching or courses.** Murray is not teaching and
  will not have the site imply otherwise.
- **A "my research" or hire-me framing.** Reader is not research output. This matches
  `data/tools.json`'s own rule — "No 'hire me' register, no CV cross-links, no 'my
  research' framing" — and decision 6 of `~/.agents/handoffs/HANDOFF-research-tools-wave-1.md`.
- **Diluting the Tools page's evidence bar.** `build_site.py` deliberately raises on a tile
  with no evidence link. Reader must not be the reason that guard gets switched off
  everywhere.
- **Landing anything in msbensite while its branches are tangled.** See Prerequisites.

## Constraints

### Notes at the old origin become unreachable

`src/storage.js:5` keys everything under `paragraph-reader:v2:` in `window.localStorage`,
and `createDocument` (`:35`) stores the full document text, notes, reading position and
preferences. Nothing is ever sent to a server.

Once a custom domain is set, GitHub redirects `murraysbennett.github.io/paragraph-reader/`
to the new domain, so the old origin's `localStorage` can no longer be reached through a
cold visit. Two things make this acceptable, and Murray has accepted it:

- A returning visitor with the service worker installed is served from cache without a
  network request (`src/sw-template.js` is cache-first), so the redirect never reaches
  them and **Download backup** keeps working at the old origin.
- That population is effectively Murray, who can export before the switch.

Do not change the `paragraph-reader:v2:` storage key. Renaming it would strand notes a
second time, at the new origin, for no benefit.

### The app already works at a domain root and a subpath

No code changes are needed. The service worker registers via
`new URL('./sw.js', appScript.src)` (`src/app.js:414`), the icon link is `./favicon.svg`,
`manifest.webmanifest` uses `"start_url": "./"` and `"scope": "./"`, and no built HTML uses
a root-absolute path. Serving from a domain root is strictly simpler than the
`/paragraph-reader/` subpath Pages already serves today.

### GitHub Pages is workflow-built, and the domain is set through the API

`gh api repos/MurraySBennett/paragraph-reader/pages` currently returns
`"build_type": "workflow"`, `"cname": null`, `"https_enforced": true`, `"public": true`.
Because the build is workflow-based, the custom domain lives in the Pages configuration
rather than a `CNAME` file in the artifact, so `build.mjs` does not need to emit one.
Verify that on the day; if GitHub does demand a `CNAME` file, writing one from `build.mjs`
into `dist/` is the fix.

Order matters: the DNS record must resolve **before** the domain is set, or GitHub marks it
unverified and will not issue a certificate.

### The Tools page is data-driven, and Reader cannot meet its schema

`feature/demos-prefix` (`35ece06`) rebuilds `tools.html` from `data/tools.json`, rendered by
`build_site.py`. Its own note: *"Adding a tool is an edit here, not HTML surgery."*

`render_tool_tile` (`build_site.py:116-142`) raises unless a tile has `id`, `section`,
`url`, `headline`, `what_you_get`, `evidence` (both `label` and `url`) and `sectors` drawn
from the known list. `render_tools_page` (`:170`) raises if a tool names an unknown section,
and raises `missing tools grid` unless `tools.html` contains a
`<div class="research-grid" data-tools-section="<id>">` for every section in the config.

The three existing sections are `about-you`, `your-data` and `the-experiment`. Reader fits
none of them and has no paper, preprint or method writeup to point `evidence` at. Hence the
fourth section and the narrow relaxation in the design below.

### Tool thumbnails only ship if they belong to a project

The publish loop at `build_site.py:393-396` copies `BASE_IMAGES`, `FAVICONS`, and each
*project's* thumbnail. GRIN's and KITH's tile images ship because those tools also have
project pages. Reader has no project page, so its thumbnail would never be copied — and
`validate()` (`:203`) then fails the build on a missing `src`. `tools.json` thumbnails need
their own publish loop. The `workshops` entry has no thumbnail at all, so the renderer
already treats them as optional if you would rather ship without one.

### The site build validates every local reference

`validate()` walks each built page's `href` and `src`; `LocalReferences.handle_starttag`
(`:195-200`) collects only references with no URL scheme (`:199`). The Reader tile's URL is
absolute (`https://reader.murraysbennett.com`), so it is skipped, exactly as the GRIN and
KITH URLs are. Do not add exemptions to `validate()`; that guard is load-bearing.

### Tests that break and must be updated

In `paragraph-reader`, from the rename:
- `tests/browser.spec.js:93` — asserts `.toolbar .brand` contains "Paragraph Reader".
- `tests/examples.spec.js:51` — asserts the download is `paragraph-reader-2026-11-07.zip`.
- `tests/local-copy.spec.js:10,11,19` — the ZIP filename, and `paragraph-reader.html` inside it.

In `msbensite`, from the new tile:
- `tests/core-pages.cjs:82` — asserts exactly 2 tiles in `#tools-list`. Note this assertion
  may already have changed on `feature/demos-prefix`; check there, not on `main`.
- `tests/core-pages.cjs:73-79` — the KITH tile test to model Reader's on.
- `tests/test_build_site.py:38` — asserts the KITH href survives the build.

### Verification cannot be completed locally

Playwright's chromium will not launch on this machine, and `msbensite`'s `npm test` runs
`core-pages.cjs` through it. What *can* run locally is `npm run build`, which is
`build_site.py` including `validate()` — pure Python, no browser. That is the real proof of
the tile, thumbnail and absolute-href decisions. The browser assertions need a CI round
trip on a pushed branch.

For screenshots, use headless Firefox with its own profile; chromium is broken here, CI is
not affected.

## Approaches

| | Approach | Why not / why |
|---|---|---|
| A | **Subdomain on new AWS infrastructure** — own bucket, CloudFront distribution, ACM certificate, Route 53 alias, mirroring `grin.` and `kith.` | Matches the existing stack, but it is a bucket, a distribution, a certificate and a new IAM key for one static page. Disproportionate. |
| **B** | **GitHub Pages custom domain** — one DNS record and one Pages setting | **Chosen.** No infrastructure, no code change, and the existing `pages.yml` with its 3-OS extracted-ZIP smoke matrix keeps running untouched. Its only disqualifier was losing the migration notice, which Murray has accepted as moot. |
| C | **Path on the existing site**, `murraysbennett.com/reader/`, from a `reader/` bucket prefix | Murray's first preference, and withdrawn on evidence. The site's distribution serves S3 over a REST origin and does no directory-index resolution: `/projects/`, `/demos/` and `/assets/` all return **403** on the live site today. `/reader/` would too. Fixing it needs a CloudFront Function, which is real infrastructure he would have to deploy, plus `--exclude 'reader/*'` guards on both of msbensite's `--delete` syncs to stop a site push erasing the app. |
| D | Vendor Reader's build into msbensite's `dist/reader/` | One pipeline, no collision. Rejected: the publish allowlist enumerates files by hand, and Reader ships a vendored PDF.js worker, an OpenDyslexic font, six samples and an offline ZIP. |

**Worth recording separately:** those 403s on directory-style URLs are a live defect on
`murraysbennett.com`, not merely an obstacle here. Any such URL anyone types or links
fails. That belongs in msbensite's `infra` stream on its own merits, independent of this
work.

## Prerequisites

Neither repo is in a state to take changes. Both are small jobs, and both come first.

**paragraph-reader** — a concurrent session left uncommitted work in the tree: modified
`src/pdf.js`, `bin/paragraph-reader`, `tests/test_cli.py` and `WORK.md`, plus new
`src/pdf-layout.js` and `tests/pdf-layout.test.js`. `WORK.md` asks the next session to push
it. Murray: "you can commit that work — it's safe for us." Run its tests, commit and push it
as its own change before any rename, so the rename diff stays readable. Note `WORK.md` also
records the tracked `dist/paragraph-reader.html` as stale; rebuild before relying on it.

**msbensite** — the repo has eight worktrees and several unmerged branches, and Murray asked
for help untangling them. The facts, which are better than they look:

- The main checkout is on a **detached HEAD** at `3ba9041` (= `origin/main`).
- Local `main` is `0a69979`, **0 commits ahead** of `origin/main` and 10 behind. It
  fast-forwards; there is nothing to reconcile. It is checked out in
  `/home/msb/projects/.worktrees/msbensite-main`.
- `feature/demos-prefix` (`35ece06`) is the branch this work depends on. **It lands first.**
- Also open: `feature/mle-tutorial-prototype`, `feature/mle-lecture`, `copy/site-review`
  (19 behind), `copy/kith-model`, `feature/snake-powerups` (in a Codex worktree), and
  `demos/experiment-demos` whose upstream is **gone** (already merged as PR #3 — safe to
  delete).

Reconcile and reduce these with Murray before the Tools-page work starts. Do not push
msbensite without his approval; its README says so.

## The design

### 1. paragraph-reader — serve at reader.murraysbennett.com

1. Add a Route 53 CNAME record in the `murraysbennett.com` hosted zone:
   `reader` → `murraysbennett.github.io`. This is independent of the apex's CloudFront
   records and does not disturb them. Needs `aws sso login --profile murray`.
2. Wait for it to resolve, then set the domain:
   `gh api -X PUT repos/MurraySBennett/paragraph-reader/pages -f cname=reader.murraysbennett.com`
3. Confirm GitHub issues the certificate and `https_enforced` stays true. Allow up to
   roughly fifteen minutes.
4. Optionally verify the domain in GitHub's settings to prevent subdomain takeover.

`.github/workflows/pages.yml` needs no change at all.

### 2. paragraph-reader — rename the public identity to Reader

Public-facing only; the repo, package and CLI keep their names.

- `manifest.webmanifest` — `name`, `short_name`.
- `index.html` — `<title>`, the `.toolbar .brand` text, and the offline-ZIP `href`.
- `build.mjs:16` — the ZIP `href` rewrite; `:37` — the `startHere` text, which currently
  opens `Paragraph Reader · 2026-11-07`; `:41` — the ZIP filename.
- `README.md` — the heading, the **Use online** URL, and every
  `murraysbennett.github.io/paragraph-reader` reference.
- The four test assertions listed under Constraints.
- **Not** the `paragraph-reader:v2:` storage key.

*(Builder's call: also rename `paragraph-reader.html` inside the offline ZIP to match, since
`START-HERE.txt` instructs the reader to open it by name and a file called
`paragraph-reader.html` in a product called Reader will confuse someone later. Touches
`local-copy.spec.js:11,19`.)*

**Latent defect found, fix if cheap:** the offline ZIP's date is hardcoded as
`2026-11-07` in three places in `build.mjs` and asserted in two tests. A ZIP advertised as
dated that never re-dates is a trap. Deriving it from the build date — and from one
constant, not three literals — makes the rename safe and stops the next person shipping a
nine-day-old date.

### 3. msbensite — a fourth Tools section for tools with no paper

In `data/tools.json`, add a section after the three existing ones:

- `id`: `just-useful`
- `title` and `blurb`: match the page's established register — second person or imperative,
  saying what the visitor gets, never a methods sentence. My proposal, easily reworded:
  title "Just useful", blurb "No paper behind these. Small tools, kept here because they
  might be useful to you too."
- A section-level flag, e.g. `"requires_evidence": false`.

Add the matching markup in `tools.html`:
`<section class="tools-section" id="just-useful">` containing
`<div class="research-grid" data-tools-section="just-useful">`, or the renderer raises
`missing tools grid`.

Then the Reader tile:

- `section`: `just-useful`
- `url`: `https://reader.murraysbennett.com`, `external`: true
- `headline` and `what_you_get`: what it is — one paragraph, sentence or page-group at a
  time, for text you bring yourself; notes; everything stays in the browser; no account and
  no upload. Nothing about who it is for.
- `sectors`: `["research"]`. *(My call. It is the honest one — reading papers and
  preprints. `education` is the only other candidate and it implies the teaching framing
  the anti-goals forbid.)*
- `status`: `available`
- A `load_note` like the `workshops` entry's, stating nothing is recorded or uploaded.

### 4. msbensite — relax evidence for that section only

In `build_site.py`, `evidence` stops being unconditionally required and becomes required
unless the tool's section sets `requires_evidence: false`. Two touch points:

- `render_tool_tile` (`:132`, `:138`) — the required-field list and the label/url check.
  It currently takes `(tool, sectors)` and will need the section's config, or a boolean,
  passed through from `render_tools_page` (`:181-183`).
- The tile markup at `:163-165` — emit `.tile-meta` with sector chips only, and no
  `.tile-evidence` anchor, when there is no evidence.

Keep `sectors` mandatory everywhere; the filter chips are how a visitor self-selects, and
Reader has an honest sector. Extend the docstring at `:117-127` to say why the exemption
exists and that it is section-scoped, so the next person does not read it as the bar being
optional.

### 5. msbensite — publish tool thumbnails

Add a loop beside `build_site.py:393-396` copying each `tools.json` thumbnail, so a tool
without a project page can carry a tile image. Then produce Reader's: a screenshot of the
reader with a sample document open, converted to WebP, under
`assets/images/project-icons/`, with `alt`, `width` and `height` in the tile entry. Existing
dimensions for reference: GRIN 900×900, KITH 1150×420.

Use headless Firefox for the screenshot.

### 6. msbensite — widen the Tools page metadata

`page_info['tools.html']` in `build_site.py` describes the page as "Free research software
built from my work with collaborators" and then names only GRIN and KITH. That is now
wrong twice over: the page already has `workshops`, and it is about to have a tool that is
not research software. Rewrite it to cover the page as it is.

### 7. Documentation and state

- `paragraph-reader/README.md` and `WORK.md` — new URL; close the naming task.
- `msbensite/WORK.md` — this closes the open `build` task "Explore a practical public tool
  for nonresearch users". Its `## Now` also points at
  `~/.agents/handoffs/HANDOFF-practical-research-tools.md`, **which does not exist**; fix
  that stale pointer.
- `~/projects/PROJECT_GUIDE.md` — the paragraph-reader entry's **Online** URL, and the
  product name.
- `~/.agents/handoffs/HANDOFF-research-tools-wave-1.md` — partly consumed by this work.
  Judge on finishing whether anything in it is still live before deleting it. Its decision 4
  (a reserved bucket prefix with per-repo workflows) was **implemented** on
  `feature/demos-prefix` in `2d46a6e` — `--exclude 'demos/*'` placed after the `--include`
  because s3 filters are last-match-wins, guarded by
  `tests/test_build_site.py::DemosPrefixReservationTests`. It covers interactive tools
  deployed from other repositories; the four in-repo experiment demos went through
  `build_site.py` instead, which is a different class of thing, not a reversal. The plan it
  cites (`~/.claude/plans/i-don-t-mind-if-ancient-deer.md`) no longer exists.
- Run `agents-lint` after touching any `WORK.md` or router file.

## What is left to the builder

- Ordering, except that the prerequisites come first and `feature/demos-prefix` lands
  before the Tools-page work.
- Exact wording of the section title, blurb, headline, `what_you_get` and `load_note`,
  within the anti-goals and the register `tools.json` sets.
- The thumbnail's composition, and whether Reader ships without one.
- How `requires_evidence` is threaded through `render_tool_tile` — flag, section object, or
  a separate predicate.
- Whether to rename `paragraph-reader.html` inside the offline ZIP, and whether to fix the
  hardcoded ZIP date now or file it.

## Verification

- `reader.murraysbennett.com` serves the app over HTTPS, with a valid certificate, and
  installs as a PWA from that origin.
- `npm run build` passes in msbensite — the local proof of the tile, thumbnail, evidence
  relaxation and absolute-href decisions, with no browser needed.
- msbensite's browser suite passes in CI on a pushed branch, including the updated tile
  assertions.
- paragraph-reader's own suite and the 3-OS extracted-ZIP matrix pass, with the renamed
  assertions.
- The Tools page shows Reader in its own section, with no evidence link, while GRIN, KITH
  and `workshops` still render theirs — proving the relaxation stayed scoped.
- A build with a tile that is missing `evidence` in one of the three research sections
  still raises.
