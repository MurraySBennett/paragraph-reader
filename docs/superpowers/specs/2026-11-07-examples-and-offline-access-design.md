# Examples and offline access

## Intent

Let a first-time visitor try Paragraph Reader immediately with varied writing and real file formats, then keep using it without returning to the website or learning Git. The homepage should also point technical users to the source repository. This design depends on the separate structured-passages/DOCX design for the full formatting demonstration.

## Decisions and boundaries

- The user chose six examples: the Rainbow Passage, one of their published TeX excerpts, a different published PDF, the GRIN README as Markdown, a classic fable as DOCX, and an original beginner Spanish story as Markdown. Examples must show both subject matter and format. The Spanish story is original to this project.
- The user chose two first-release offline routes: an installable offline browser app and a downloadable local copy. A repository/clone link is also visible. Native installers for Windows, macOS, Linux, Android, or iOS are a later project, subject to demand and release-maintenance costs.
- Examples and offline packages are local assets in the release; opening an example goes through the same import path as an uploaded file. No document is sent to a server. A visitor can download each sample source file.
- This work does not add account sync, automatic backup, app-store distribution, OCR, or a remote AI feature. The notes-review idea remains separate.

## Homepage experience

- Place a short “Try an example” section below the paste/open controls. Four visible cards: Rainbow Passage (TXT), published research excerpt (TeX), classic fable (DOCX), and beginner Spanish story (Markdown). A “More examples” disclosure reveals the published PDF and GRIN README. Each card shows title, one-line subject/reading-level description, format badge, **Read example**, and **Download file**.
- “Read example” fetches the packaged asset as a same-origin `Blob`/`File` and calls the normal import routine. It gives the resulting document a human-readable name and existing content identity. Import failures leave the current document intact and show a usable error. Do not maintain a separate sample parser or hardcoded reader content.
- Add a “Keep Paragraph Reader” section with **Install on this device**, **Download offline copy**, and **View source on GitHub**. The install action triggers the browser prompt only where supported; otherwise it shows device/browser-specific guidance or a link to the local download. It never implies a prompt is available on iOS. Hide or relabel the install action when already running as an installed app.
- Explain in one short sentence that installed, web, and downloaded copies may store notes separately; offer the existing backup/restore route wherever users are likely to switch copies. Do not claim that merely installing transfers notes. The downloadable copy explains that backups are especially important because `file:` storage behaviour varies by browser.
- Keep the introductory area compact on mobile; cards and actions remain keyboard accessible and readable with the existing themes. Avoid carousel-only access or format icons as the only labels.

## The six files and provenance

| File/format | Content and curation | Source and credit |
|---|---|---|
| `rainbow-passage.txt` | Canonical Rainbow Passage as a simple UTF-8 text file; preserve paragraph breaks. | Grant Fairbanks, *Rainbow Passage*; [IDEA transcription](https://www.dialectsarchive.com/the-rainbow-passage) identifies the text as public domain. Attribute the text, not IDEA's branded PDF. |
| `human-machine-teams.tex` | Curated self-contained methods excerpt from `team-spirit/studies/human-bot/writing/latex/game-details.tex`; remove unresolved figure includes/references, retain prose and safe TeX emphasis/list examples if present. Label clearly as an excerpt rather than a complete article. | Murray S. Bennett et al., published paper DOI [10.1111/tops.12683](https://doi.org/10.1111/tops.12683); verify excerpt matches the [published CC BY 4.0 version](https://pmc.ncbi.nlm.nih.gov/articles/PMC12093930/) before packaging, then include article citation and license. |
| `dutch-auctions.pdf` | Official publisher PDF, bundled as downloaded bytes; text-based pages demonstrate honest PDF limitations and page ordering. | Murray S. Bennett et al., DOI [10.1186/s41235-020-00259-w](https://link.springer.com/article/10.1186/s41235-020-00259-w), CC BY 4.0. Use the publisher's PDF rather than a local revision manuscript; preserve attribution/license link. |
| `grin-readme.md` | A curated snapshot of `/home/msb/projects/grin/README.md`; keep useful Markdown headings, lists, emphasis, and links, and make relative links absolute where needed. Label as an open research-project guide, not a published paper. | [MurraySBennett/grin](https://github.com/MurraySBennett/grin); record source commit and repository attribution alongside the sample. Confirm no confidential text or broken relative links before release. |
| `lion-and-mouse.docx` | An accessible, simple Word document with title, byline/source, body paragraphs, and perhaps a short moral. It demonstrates DOCX import without complex page layout. | Aesop, “The Lion and the Mouse,” from Joseph Jacobs's *The Fables of Aesop*, [Project Gutenberg #28](https://www.gutenberg.org/ebooks/28). Include source and public-domain notice appropriate to the distributed text. Render and inspect the generated DOCX before release. |
| `la-llave-de-lucia.md` | Original A1 Spanish story below; headings, short paragraphs, a small glossary, and comprehension questions demonstrate language learning and Markdown structure. | Original Paragraph Reader example, written for this release. |

Every asset has a nearby visible credit/license link on the homepage and a concise `samples/README.md` provenance record in the repository and offline package. The `.tex` sample is a distributable source excerpt, not a pointer to the user's private working tree. The PDF and DOCX are checked for selectable text, readable extraction, correct title, and accurate credits.

## Original story copy (draft for the sample file)

```markdown
# La llave de Lucía

Lucía vive en una calle pequeña. Cada mañana va a la biblioteca. Le gusta leer historias sobre animales y lugares lejanos.

Un martes, la puerta de la biblioteca está cerrada. Hay una llave en el suelo y una nota en la ventana: **«Busca a la persona con el libro azul»**.

Lucía mira la calle. Un niño lleva un libro azul, pero no conoce la llave. Una mujer tiene un bolso azul y un libro rojo. Finalmente, Lucía ve al bibliotecario en el parque. Él tiene un libro azul en las manos.

«¡Tengo su llave!», dice Lucía. El bibliotecario sonríe. Los dos vuelven a la biblioteca y abren la puerta. Dentro hay una mesa con libros nuevos. Lucía elige uno sobre el mar.

*Hoy la biblioteca abre tarde, pero la historia empieza a tiempo.*

## Palabras útiles

- **llave** — key
- **suelo** — floor / ground
- **bolso** — bag
- **bibliotecario** — librarian

## Para pensar

1. ¿Dónde encuentra Lucía la llave?
2. ¿Quién tiene el libro azul al final?
3. ¿Qué libro elige Lucía?
```

Builder may correct minor Spanish wording after a native or fluent review, but keep the A1 level, plot, glossary, and questions. Do not make a claim that it has been externally language-tested.

## Installable offline app

- Add a web app manifest, suitable icons, and a service worker scoped to the GitHub Pages subpath. Precache the application shell and all runtime dependencies needed for TXT, Markdown, TeX, PDF, and DOCX import, plus the sample assets. Use versioned caches and an update path that does not mix incompatible old and new JS/worker files. The page and all six samples open after a first successful online visit and install, without network access.
- Keep ordinary online use working when installation or service workers are unavailable. The install button uses `beforeinstallprompt` where present; supported browsers with manual installation receive concise, current guidance rather than a fake button. Installation and offline behaviour must be tested on the hosted subpath, not only localhost.
- Notes remain in the browser's origin-scoped storage. The install experience includes a visible backup reminder; restore validates existing and forthcoming backup formats. Installing from a different browser may produce separate storage.

## Downloadable local copy

- Offer a versioned, ready-to-open ZIP (or equivalent single-click package) from the homepage, produced by the same release build. It contains a self-contained `paragraph-reader.html`, all six example source files, the provenance/license notices, and a short `START-HERE` document with desktop opening and backup/restore instructions. No Node, Python, Git, or local server is required for a reader.
- The HTML must actually support fresh local TXT/Markdown/TeX/DOCX/PDF imports while opened through `file:`. The current build's dynamic PDF imports/worker URLs do not satisfy this; bundle or embed the necessary parser and worker resources in a file-compatible way. If browser security prevents an exact capability on a target, do not advertise it as supported; resolve the build or choose an explicitly tested alternative before release.
- Treat the downloaded HTML as a separate local copy: changing its path or browser can change storage behaviour. The UI makes backup/restore easy to find and does not promise local storage persistence on `file:`. The package is for desktop browsers; mobile users use the installable browser app. Keep the technical terminal helper as an additional repo route, not the public download path.
- Put a human-readable version/date in the package and on the download action so users can tell which copy they have. The repo link offers both GitHub viewing and a simple `git clone` command for people who want source; clone instructions are secondary to the no-terminal routes.

## Checks for the implementation plan

- Each example imports through its real file type, is available offline, has correct labels/credits, and can be downloaded. The DOCX sample and its importer land together. Publisher/source licenses and the TeX excerpt match are recorded before public release.
- The installed app opens at the GitHub Pages subpath with network disabled, loads all runtime parsers/workers, opens at least PDF and DOCX samples, and preserves existing notes/backup behaviour across an update. Browser variants without a prompt show suitable guidance.
- A freshly downloaded package opens locally in representative Windows/macOS/Linux desktop browsers without developer tools or a server; import at least one fresh file of every supported format, including PDF and DOCX. Verify sample files and license notices are inside the package.
- Existing tests, browser accessibility checks, static build, and GitHub Pages workflow pass. Do not publish a homepage download link until the artifact exists at the linked version and has passed local-file checks.

## Builder calls

Choose icon artwork, exact ZIP structure, cache/version strategy, file-size bounds, and the smallest UI for install guidance. Use released, vendored dependencies and honor their notices. Coordinate with the structured-passages implementation so both the online and local builds share import behaviour; no separate parser logic for sample cards.
