# Reader Site Publication Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Publish Paragraph Reader at `https://reader.murraysbennett.com` as **Reader**, and list it on murraysbennett.com's Tools page in a new section for tools with no paper behind them.

**Architecture:** GitHub Pages serves the existing `dist/` build at a custom domain — one Route 53 CNAME and one Pages setting, no AWS hosting and no code change to make it work. The public product name changes without renaming the repo, package or CLI. On the site, `data/tools.json` gains a fourth section whose tiles are exempt from the build's evidence requirement, and `build_site.py` learns to publish tile thumbnails for tools that have no project page.

**Tech Stack:** GitHub Pages + Actions; Route 53; Node 22 (`node --test`, `build.mjs`, Playwright); Python 3.13 (`build_site.py`, `unittest`).

**Spec:** `paragraph-reader: docs/superpowers/specs/2026-11-16-reader-site-publication-design.md`

## Global Constraints

- **No public text may mention students, teaching or courses.** Murray is not teaching.
- **No "my research" framing, no hire-me register, no CV cross-links.** This is `data/tools.json`'s own rule, and it applies to every string this plan adds.
- **Tile copy register:** second person or imperative, saying what the visitor gets — never a methods sentence. Set by `data/tools.json`'s `_note`.
- **Do not change the `paragraph-reader:v2:` localStorage key** (`paragraph-reader: src/storage.js:5`). Renaming it strands every saved note.
- **Do not rename** the git repository, the npm package, or `bin/paragraph-reader`. Public identity only.
- **Do not add exemptions to `validate()`** (`msbensite: scripts/build_site.py:299`). That guard is load-bearing.
- **The evidence relaxation must be section-scoped.** A tile in one of the three research sections that is missing `evidence` must still raise.
- **Playwright cannot launch on this machine** — verified in both repos (`browserType.launch: Target page, context or browser has been closed`). Every `*.spec.js` and `scripts/check_site.py` is **CI-only**. Put assertions in `node --test` or `unittest` wherever the behaviour allows it, and mark Playwright steps as CI-gated.
- **Export `AWS_PROFILE=murray` explicitly** in any shell running `aws`; the home-manager session variable does not reach a tool shell.
- **Do not push `msbensite` without Murray's approval** (its README says so). He approved the pushes this plan needs.

## Review Focus

Five things the spec implies that no task's happy path exercises. Each has its test added to the task that owns the code.

1. **A `just-useful` tile that *does* carry `evidence` must still render its evidence link.** The relaxation must be permissive, not prohibitive, or a later tool in that section silently loses its citation. → Task 5.
2. **A `tools.json` thumbnail whose file is missing must fail the build loudly.** `copy_file` raises (`build_site.py:60`); a loop that skips missing files instead would ship a tile with a broken image. → Task 6.
3. **A section declared in `tools.json` with no matching grid in `tools.html` must still raise `missing tools grid`.** Adding a fourth section is exactly when that guard earns its keep. → Task 7.
4. **Selecting a sector Reader lacks must hide the Reader tile and leave `#no-tools-match` correct.** `js/tools-filter.js` is progressive enhancement over four sections now, not three. → Task 8.
5. **Reader must install as a PWA from a domain root.** `manifest.webmanifest` uses `"start_url": "./"` and `"scope": "./"`, which have only ever been exercised at the `/paragraph-reader/` subpath. → Task 3.

## File Structure

**paragraph-reader**

| File | Responsibility |
|---|---|
| `index.html` | `<title>`, the `.toolbar .brand` text, the "Keep …" heading, the offline-ZIP link and its visible date |
| `manifest.webmanifest` | `name` (`short_name` is already `Reader`) |
| `build.mjs` | the ZIP filename, the `href` rewrite, and the `startHere` text — all three currently hardcode `2026-11-07` |
| `tests/release.test.js` | the locally-runnable assertions on the built release; new home for the rename and ZIP-date checks |
| `tests/browser.spec.js`, `tests/examples.spec.js`, `tests/local-copy.spec.js` | CI-only brand and ZIP-filename assertions |
| `README.md` | heading, **Use online** URL, github.io references |

**msbensite**

| File | Responsibility |
|---|---|
| `scripts/build_site.py` | `render_tool_tile` (evidence requirement, tile markup), the asset publish loop, `page_info['tools.html']` |
| `data/tools.json` | the `just-useful` section, its `requires_evidence` flag, and the Reader tile |
| `tools.html` | the matching `<section>` + `data-tools-section` grid, and the page lede |
| `tests/test_build_site.py` | locally-runnable tests for the relaxation, thumbnail publishing and tile rendering |
| `tests/core-pages.cjs` | CI-only tile-count and tile-presence assertions |
| `assets/images/project-icons/reader-*.webp` | the tile thumbnail |

---

## Phase 0 — Prerequisites

### Task 1: Land the in-flight PDF-layout work

**Files:**
- Modify (commit only): `paragraph-reader: src/pdf.js`, `bin/paragraph-reader`, `tests/test_cli.py`, `WORK.md`
- Create (commit only): `paragraph-reader: src/pdf-layout.js`, `tests/pdf-layout.test.js`

A concurrent session left this uncommitted and `WORK.md` asks the next session to push it. Murray: "you can commit that work — it's safe for us." Land it on its own so the rename diff stays readable.

**Interfaces:**
- Produces: a clean `paragraph-reader` working tree, which every later task assumes.

- [ ] **Step 1: Run the locally-runnable suites**

Run: `npm test && python3 -m unittest discover -s tests -p 'test_*.py'`
Expected: `node --test` reports `# fail 0` (36 tests at time of writing, including `pdf-layout.test.js`), and the Python CLI suite passes.

- [ ] **Step 2: Rebuild, because `WORK.md` records the tracked release as stale**

Run: `npm run build`
Expected: exits 0 and `dist/paragraph-reader.html` is rewritten.

- [ ] **Step 3: Commit the PDF-layout work by path, excluding this plan and its spec**

```bash
git add src/pdf.js src/pdf-layout.js bin/paragraph-reader tests/test_cli.py tests/pdf-layout.test.js dist/paragraph-reader.html WORK.md
git commit -m "feat: add PDF layout handling"
```

Stage by name, never `git add -A` — another session may be writing in this repo.

- [ ] **Step 4: Commit the approved spec and this plan**

```bash
git add docs/superpowers/specs/2026-11-16-reader-site-publication-design.md docs/superpowers/plans/2026-11-16-reader-site-publication.md
git commit -m "docs: approve the Reader site publication design and plan"
```

- [ ] **Step 5: Push**

Run: `git push`
Expected: `main` advances. CI runs `pages.yml`; confirm it stays green before Task 4 changes anything.

---

### Task 2: Reconcile msbensite's branches and land feature/demos-prefix

**Files:** none edited. This is repository state, and Murray's decisions.

Murray asked for help untangling this. The facts, already established — do not re-derive:

- The main checkout `/home/msb/projects/msbensite` is on a **detached HEAD** at `3ba9041` (= `origin/main`).
- Local `main` is `0a69979`, **0 ahead** and 10 behind `origin/main`. It fast-forwards; nothing to reconcile. Checked out at `/home/msb/projects/.worktrees/msbensite-main`.
- `demos/experiment-demos` tracks a **gone** upstream; it merged as PR #3. Safe to delete.
- `feature/demos-prefix` (now `147f95d`, after the infra task was recorded on it) is what this plan needs. It has no upstream.
- Also open, out of scope: `feature/mle-tutorial-prototype`, `feature/mle-lecture`, `copy/site-review` (19 behind), `copy/kith-model`, `feature/snake-powerups`.

**Interfaces:**
- Produces: `feature/demos-prefix` merged to `main` and pushed, which Tasks 5–8 modify.

- [ ] **Step 1: Fast-forward local main and prune the merged branch**

```bash
git -C /home/msb/projects/.worktrees/msbensite-main merge --ff-only origin/main
git -C /home/msb/projects/msbensite branch -d demos/experiment-demos
```

Expected: `main` reaches `3ba9041`; the branch deletes without `-D`, confirming it was merged.

- [ ] **Step 2: Install the build dependencies, which are absent**

Run: `python3 -m pip install -r requirements-build.txt`
Expected: `markdown_it` importable. Without this, `npm run build` fails with `ModuleNotFoundError` and nothing in Phase 2 is verifiable.

- [ ] **Step 3: Verify feature/demos-prefix builds and its Python suite passes**

Run: `npm run build && python3 -m unittest discover -s tests -p 'test_build_site.py' -v`
Expected: build exits 0 (`validate()` accepts `/demos/workshops/` via the `DEMOS_PREFIX` hatch) and the suite passes, including `DemosPrefixReservationTests`.

- [ ] **Step 4: Ask Murray to confirm the merge, then push the branch for CI**

The browser suite is CI-only. Push `feature/demos-prefix`, let CI run, and merge only on green.

**Stop here and raise with Murray before merging:** landing this branch publishes the `workshops` tile, whose URL is `/demos/workshops/` — a directory URL that returns **403** on the live site today. The fix is a separate task, already written up in `~/.agents/handoffs/HANDOFF-cloudfront-directory-index.md` and recorded in `msbensite: WORK.md`. Either that fix lands first, or the tile ships broken. This plan does not decide that; it must not be merged silently.

---

## Phase 1 — paragraph-reader

### Task 3: Serve the app at reader.murraysbennett.com

**Files:** none. `.github/workflows/pages.yml` needs no change.

Do this first: certificate provisioning has the longest latency in the plan, and it can bake while Task 4 proceeds.

**Interfaces:**
- Produces: `https://reader.murraysbennett.com`, the URL Task 4's README and Task 7's tile both point at.

- [ ] **Step 1: Add the Route 53 CNAME record**

Hosted zone `Z09390472DUFMU132HDS9` (`murraysbennett.com.`), the account's only zone. Create `reader.murraysbennett.com` as a `CNAME` to `murraysbennett.github.io`, TTL 300, via `aws route53 change-resource-record-sets` with `AWS_PROFILE=murray`. This is independent of the apex's CloudFront alias records and must not touch them.

- [ ] **Step 2: Verify it resolves before going further**

Run: `host reader.murraysbennett.com`
Expected: resolves via `murraysbennett.github.io`. Setting the domain before this resolves makes GitHub mark it unverified and refuse a certificate.

- [ ] **Step 3: Set the Pages custom domain**

Run: `gh api -X PUT repos/MurraySBennett/paragraph-reader/pages -f cname=reader.murraysbennett.com`
Expected: 204. The build is `build_type: workflow`, so the domain lives in the Pages config and `build.mjs` need not emit a `CNAME` file. If GitHub rejects the artifact for a missing `CNAME`, write one into `dist/` from `build.mjs` and re-run.

- [ ] **Step 4: Verify HTTPS and that enforcement survived**

```bash
curl -s -o /dev/null -w '%{http_code}\n' https://reader.murraysbennett.com
gh api repos/MurraySBennett/paragraph-reader/pages --jq '{cname,https_enforced,status}'
```
Expected: 200, `cname` set, `https_enforced: true`. Allow up to ~15 minutes for the certificate.

- [ ] **Step 5: Verify the PWA installs from a domain root** *(Review Focus 5)*

In Firefox or Chrome at `https://reader.murraysbennett.com`, confirm the install prompt appears, install it, and confirm the installed app opens the reader and that **Download backup** works. `"start_url": "./"` and `"scope": "./"` have only ever run at the `/paragraph-reader/` subpath; this is the one check that cannot be automated here.

- [ ] **Step 6: Verify the domain against subdomain takeover**

Verify `murraysbennett.com` in GitHub's Pages settings so the subdomain cannot be claimed by another account if the DNS record ever outlives this repo. One-time, and it covers any future `*.murraysbennett.com` Pages site.

- [ ] **Step 7: Export your own notes from the old origin, if you want them**

Once the domain is set, GitHub redirects `murraysbennett.github.io/paragraph-reader/` and that origin's `localStorage` is no longer reachable by a cold visit. An installed copy still serves from cache, so **Download backup** keeps working there — but do it now rather than relying on that.

---

### Task 4: Rename the public identity to Reader, and stop hardcoding the ZIP date

**Files:**
- Modify: `paragraph-reader: index.html:9,41,46`, `manifest.webmanifest:2`, `build.mjs:16,37,41`, `README.md`
- Test: `paragraph-reader: tests/release.test.js` (local), and `tests/browser.spec.js:93`, `tests/examples.spec.js:51`, `tests/local-copy.spec.js:10,11,19` (CI-only)

The ZIP's date is hardcoded as `2026-11-07` in three places in `build.mjs` and asserted in two specs — a ZIP advertised as dated that never re-dates. Fold the fix in here, because the rename edits the same literals. Derive it from one constant.

**Interfaces:**
- Consumes: Task 3's domain, for the README URL.
- Produces: the built release names used by Task 7's tile copy; `RELEASE_DATE` and `ZIP_NAME` as single constants in `build.mjs`.

- [ ] **Step 1: Write the failing local assertions in `tests/release.test.js`**

It already reads `dist/index.html`. Add to the existing release test:

```js
assert.match(web, /<title>Reader<\/title>/);
assert.doesNotMatch(web, /Paragraph Reader/);
const zip = readdirSync('dist').find(f => f.endsWith('.zip'));
assert.match(zip, /^reader-\d{4}-\d{2}-\d{2}\.zip$/);
assert.ok(web.includes(zip), 'index.html must link the ZIP that was built');
```

The last assertion is the one that matters: it fails for any hardcoded date that drifts from the built filename.

- [ ] **Step 2: Run it to verify it fails**

Run: `npm run build && node --test tests/release.test.js`
Expected: FAIL on the `<title>` match.

- [ ] **Step 3: Make the rename and de-hardcode the date**

- `manifest.webmanifest` — `"name": "Reader"`. `short_name` is already `Reader`; leave it.
- `index.html:9` — `<title>Reader</title>`; `:41` — `Keep Reader`, and the visible `Download offline copy · <date>`; `:46` — the `.brand` span text. Leave the `¶` brand mark and `<h1>Read at your own pace.</h1>` alone.
- `build.mjs` — one `RELEASE_DATE` derived from the build date and one `ZIP_NAME` built from it, used at `:16` (the `href` rewrite), `:37` (`startHere`) and `:41` (the written filename). `index.html`'s source `href` and the rewrite target must agree; keep the rewrite as the single place the name is substituted.

- [ ] **Step 4: Run the local suites to verify they pass**

Run: `npm run build && npm test && python3 -m unittest discover -s tests -p 'test_*.py'`
Expected: `# fail 0`, Python suite passes.

- [ ] **Step 5: Update the CI-only assertions and the README**

`browser.spec.js:93` — `.toolbar .brand` now contains `Reader`. `examples.spec.js:51` and `local-copy.spec.js:10` — the ZIP filename is now derived, so assert the pattern (or import the constant) rather than a literal date. `local-copy.spec.js:11,19` — rename `paragraph-reader.html` inside the ZIP to `reader.html` and update both references; `START-HERE.txt` tells the reader to open it by name, and leaving it is a half-rename. `README.md` — heading, **Use online** → `https://reader.murraysbennett.com`, and every `murraysbennett.github.io/paragraph-reader` reference.

Do not change the `paragraph-reader:v2:` storage key.

- [ ] **Step 6: Commit and push; CI is the only gate for the specs**

```bash
git add index.html manifest.webmanifest build.mjs README.md tests/release.test.js tests/browser.spec.js tests/examples.spec.js tests/local-copy.spec.js dist/
git commit -m "feat: rename the public product to Reader and derive the release date"
git push
```
Expected: `pages.yml` green, including the 3-OS `desktop-copy-smoke` matrix, and `https://reader.murraysbennett.com` serving the renamed app.

---

## Phase 2 — msbensite

All three of these tasks are verifiable locally: `render_tool_tile`, the publish loop and `validate()` are Python. Only Task 8's browser assertions need CI.

### Task 5: Make the evidence requirement section-scoped

**Files:**
- Modify: `msbensite: scripts/build_site.py:116-142` (`render_tool_tile`), `:181-183` (the call site), `:163-165` (tile markup)
- Test: `msbensite: tests/test_build_site.py`

**Interfaces:**
- Produces: `render_tool_tile(tool, sectors, requires_evidence=True)` — Task 7's tile relies on `requires_evidence=False` reaching it from its section's config.

- [ ] **Step 1: Write the failing tests**

Three, in `tests/test_build_site.py`:

```python
def test_tile_without_evidence_renders_when_section_exempt(self):
    # requires_evidence=False, no 'evidence' key -> no 'tile-evidence' anchor,
    # and the sector chips are still present
def test_tile_with_evidence_renders_it_even_when_section_exempt(self):   # Review Focus 1
    # requires_evidence=False, evidence present -> 'tile-evidence' anchor IS rendered
def test_tile_without_evidence_still_raises_when_section_requires_it(self):
    # requires_evidence=True, no 'evidence' -> ValueError mentioning 'evidence'
```

- [ ] **Step 2: Run them to verify they fail**

Run: `python3 -m unittest discover -s tests -p 'test_build_site.py' -v`
Expected: FAIL — `render_tool_tile()` takes 2 positional arguments.

- [ ] **Step 3: Implement the parameter**

Add `requires_evidence=True` to `render_tool_tile`. Drop `'evidence'` from the unconditional required-field tuple at `:132` and require it only when the flag is set; keep the label/url check at `:138` for any tile that has an `evidence` key at all. In the markup at `:163-165`, emit `.tile-meta` with the sector chips and append the `.tile-evidence` anchor only when `evidence` is present. In `render_tools_page` (`:181-183`), pass `section.get('requires_evidence', True)`.

`sectors` stays mandatory for every tile.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `python3 -m unittest discover -s tests -p 'test_build_site.py' -v`
Expected: PASS, and no existing test regresses.

- [ ] **Step 5: Extend the docstring at `:117-127`**

Say that the evidence requirement is section-scoped, which sections are exempt and why, so the next reader does not take it as the bar being optional. The docstring is the only place that explains *why* these fields raise.

- [ ] **Step 6: Commit**

```bash
git add scripts/build_site.py tests/test_build_site.py
git commit -m "feat: make the tools evidence requirement section-scoped"
```

---

### Task 6: Publish thumbnails for tools that have no project page

**Files:**
- Modify: `msbensite: scripts/build_site.py:393-396` (the publish loop)
- Test: `msbensite: tests/test_build_site.py`

The loop copies `BASE_IMAGES`, `FAVICONS` and each *project's* thumbnail. GRIN's and KITH's tile images ship only because those tools also have project pages. Reader has none, so its thumbnail would never reach `dist/` and `validate()` would then fail the build on a missing `src`.

**Interfaces:**
- Produces: any `thumbnail` declared in `data/tools.json` is present in `dist/`, which Task 7's tile requires.

- [ ] **Step 1: Write the failing tests**

```python
def test_tools_json_thumbnails_are_published(self):
    # every 'thumbnail' in data/tools.json exists under dist/ after a build
def test_missing_tool_thumbnail_fails_the_build(self):   # Review Focus 2
    # a tools.json thumbnail pointing at no file raises rather than skipping
```

- [ ] **Step 2: Run them to verify they fail**

Run: `python3 -m unittest discover -s tests -p 'test_build_site.py' -v`
Expected: FAIL on the first — no mechanism copies them.

- [ ] **Step 3: Add the loop**

Beside `:393-396`, iterate `data/tools.json`'s tools and `copy_file` each `thumbnail` that is set, skipping tools without one (`workshops` has none, and the renderer already treats it as optional). Use `copy_file`, which raises on a missing input (`:60`) — that is what makes the second test pass.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `python3 -m unittest discover -s tests -p 'test_build_site.py' -v`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add scripts/build_site.py tests/test_build_site.py
git commit -m "feat: publish data/tools.json thumbnails"
```

---

### Task 7: Add the just-useful section and the Reader tile

**Files:**
- Modify: `msbensite: data/tools.json`, `tools.html:78` (after `the-experiment`'s section)
- Create: `msbensite: assets/images/project-icons/reader-<descriptor>.webp`
- Test: `msbensite: tests/test_build_site.py`

**Interfaces:**
- Consumes: `requires_evidence` from Task 5; the thumbnail publish loop from Task 6.
- Produces: a rendered Reader tile linking `https://reader.murraysbennett.com`, which Task 8 asserts in the browser.

- [ ] **Step 1: Write the failing tests**

```python
def test_reader_tile_renders_in_the_just_useful_section(self):
    # built tools.html contains the Reader tile inside
    # data-tools-section="just-useful", with href="https://reader.murraysbennett.com"
    # and no 'tile-evidence' anchor
def test_section_without_a_grid_in_tools_html_raises(self):   # Review Focus 3
    # a section declared in tools.json with no matching
    # data-tools-section div raises 'missing tools grid'
```

- [ ] **Step 2: Run them to verify they fail**

Run: `python3 -m unittest discover -s tests -p 'test_build_site.py' -v`
Expected: FAIL — no such section.

- [ ] **Step 3: Add the section to `data/tools.json`**

After `the-experiment`, with `"requires_evidence": false`. Title and blurb in the page's register; the spec's proposal, yours to improve: title "Just useful", blurb "No paper behind these. Small tools, kept here because they might be useful to you too."

- [ ] **Step 4: Add the matching markup to `tools.html`**

After the `the-experiment` section closing at `:78`, mirroring the existing pattern exactly: `<section class="tools-section" id="just-useful">`, an `<h2>`, a `<p class="section-blurb">`, and `<div class="research-grid" data-tools-section="just-useful"></div>`. Without the grid div the renderer raises `missing tools grid` — which is what Review Focus 3 pins.

- [ ] **Step 5: Add the Reader tile to `data/tools.json`**

`id: reader`, `section: just-useful`, `url: https://reader.murraysbennett.com`, `external: true`, `status: available`, `sectors: ["research"]`, no `evidence`. A `load_note` in the style of `workshops`', stating nothing is recorded or uploaded. `headline` and `what_you_get` must say what it is — one paragraph, sentence or page-group at a time, text you bring yourself, notes, everything stays in the browser, no account or upload — and nothing about who it is for. `sectors` is `["research"]` and not `education`, which would imply the teaching framing the constraints forbid.

- [ ] **Step 6: Produce the thumbnail**

Screenshot the reader at `https://reader.murraysbennett.com` with a sample document open, using **headless Firefox with its own profile** — Playwright's chromium will not launch here. Convert to WebP, save under `assets/images/project-icons/`, and set `thumbnail`, `alt`, `width` and `height` on the tile. For scale: GRIN 900×900, KITH 1150×420.

- [ ] **Step 7: Run the build and the tests to verify they pass**

Run: `npm run build && python3 -m unittest discover -s tests -p 'test_build_site.py' -v`
Expected: build exits 0 — `validate()` skips the tile's URL because it has a scheme (`:199`), and the thumbnail is in `dist/` via Task 6 — and the tests pass.

- [ ] **Step 8: Commit**

```bash
git add data/tools.json tools.html assets/images/project-icons/ tests/test_build_site.py
git commit -m "feat: list Reader on the tools page"
```

---

### Task 8: Widen the page framing, and update the browser suite

**Files:**
- Modify: `msbensite: tools.html:34-38` (the lede), `scripts/build_site.py:404` (`page_info['tools.html']`), `tests/core-pages.cjs:73-82`
- Test: `msbensite: tests/core-pages.cjs` — **CI-only**

Two pieces of framing now make false claims. The lede says *"Each of these measures one, in a person or in a machine"* — Reader measures nothing. The metadata at `:404` calls the page "Free research software built from my work with collaborators" and then names only GRIN and KITH, which was already wrong once `workshops` landed.

**Interfaces:**
- Consumes: Task 7's rendered tile.

- [ ] **Step 1: Update the tile assertions**

`core-pages.cjs:82` asserts exactly 2 tiles; make it 3 and add a Reader assertion modelled on the KITH one at `:73-79`, locating `a.tile-main[href="https://reader.murraysbennett.com"]`. Note the tile markup changed on this branch — `article.research-tile.tool-tile` wrapping `a.tile-main`, not the old `a.research-tile` — so check the selector against the current renderer, not against `main`.

- [ ] **Step 2: Add the sector-filter assertion** *(Review Focus 4)*

Selecting a sector Reader lacks (`healthcare`, say) must hide the Reader tile and leave `#no-tools-match` correct; selecting `research` must show it. `js/tools-filter.js` is progressive enhancement, so also assert every tile is visible before it runs.

- [ ] **Step 3: Rewrite the lede and the metadata**

The lede must cover a page that now holds a tool with no measurement claim; the `page_info` description must describe the page as it is. Keep both inside the global constraints — no research framing applied to Reader, nothing about students or teaching.

- [ ] **Step 4: Verify what can be verified locally**

Run: `npm run build && python3 -m unittest discover -s tests -p 'test_build_site.py' -v`
Expected: PASS. `npm test` additionally runs `scripts/check_site.py`, which **cannot run here** — no Playwright browser.

- [ ] **Step 5: Commit and push for CI**

```bash
git add tools.html scripts/build_site.py tests/core-pages.cjs
git commit -m "feat: widen the tools page framing for tools without papers"
git push
```
Expected: CI green on the full browser suite. **This is the first real verification of Tasks 7 and 8.** Do not merge on a local pass alone.

---

## Phase 3 — Documentation and state

### Task 9: Update the live state and the guide

**Files:**
- Modify: `paragraph-reader: WORK.md`, `README.md`; `msbensite: WORK.md`; `~/projects/PROJECT_GUIDE.md`
- Delete, conditionally: `~/.agents/handoffs/HANDOFF-research-tools-wave-1.md`

- [ ] **Step 1: paragraph-reader `WORK.md`**

Close the open `build` task "Choose a broader product name before changing the public title and app identity" as `[x] 2026-11-16`, naming **Reader** and the new URL. Rewrite `## Now` in 3–6 lines.

- [ ] **Step 2: msbensite `WORK.md`**

Close the open `build` task "Explore a practical public tool for nonresearch users". Fix the stale `## Now` pointer to `~/.agents/handoffs/HANDOFF-practical-research-tools.md`, **which does not exist**. Leave the `infra` entry for the CloudFront 403 open — it is a separate job.

- [ ] **Step 3: `~/projects/PROJECT_GUIDE.md`**

Update the paragraph-reader entry's **Online** URL to `https://reader.murraysbennett.com` and the product name. Per the working agreement, update the entry when a project's purpose, paths or relationships change.

- [ ] **Step 4: Handoff hygiene**

`HANDOFF-research-tools-wave-1.md` is partly consumed by this work; read it and delete it only if nothing in it is still live. Leave `HANDOFF-cloudfront-directory-index.md` alone — its work has not started. `agents-lint` also reports 42 packets older than four days; out of scope, but worth telling Murray once.

- [ ] **Step 5: Lint and commit**

Run: `agents-lint`
Expected: no new errors. Two pre-existing errors in `job-applications/AGENTS.md` are unrelated to this work; do not fix them here.

```bash
git add WORK.md README.md   # per repo, by name
git commit -m "docs: record the Reader publication"
```

---

## Verification

The whole plan is done when:

- `https://reader.murraysbennett.com` serves Reader over HTTPS and installs as a PWA from that origin.
- The Tools page shows Reader in `just-useful` with no evidence link, while GRIN, KITH and `workshops` still render theirs.
- A build with a tile missing `evidence` in one of the three research sections still raises.
- `npm run build` and the Python suite pass locally in msbensite; the browser suite passes in CI.
- paragraph-reader's `node --test`, Python CLI suite, Playwright specs and 3-OS `desktop-copy-smoke` matrix all pass in CI with the renamed assertions.
- The built ZIP's filename, the link to it and the visible date all agree, and none of them is a hardcoded literal.
