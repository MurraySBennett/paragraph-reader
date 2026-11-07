# Paragraph Reader

A quiet, one-chunk-at-a-time reader for text you bring yourself. Read by paragraph, sentence, or a page-length group of paragraphs; add notes when useful; play a selected passage one word at a time. It runs entirely in the browser. There is no account, upload, analytics, or server-side document storage.

**Use online:** https://murraysbennett.github.io/paragraph-reader/

The homepage has six ready-to-read examples across TXT, TeX, DOCX, Markdown, and PDF. Their sources and rights are recorded in [samples/README.md](samples/README.md). Choose **Install on this device** for the offline browser app, or **Download offline copy** for a ZIP that opens in a desktop browser without installing developer tools. The installed app and downloaded copy may store notes separately; use **Download backup** and **Restore backup** when switching.

## Use locally

```sh
npm ci
npm run build
python3 -m http.server 8000 --directory dist
```

Open `http://localhost:8000`. For development from the repository root, run `npm run build` first because the page loads the generated browser bundle. The static release is in `dist/`. The build also produces a dated offline ZIP containing a self-contained HTML reader, all six examples, source credits, and dependency notices.

The browser accepts `.txt`, `.md`, `.markdown`, `.tex`, `.ltx`, `.docx`, and text-based `.pdf` files. DOCX import keeps headings, lists, and inline emphasis where present; files over 15 MB are rejected. Older `.doc` files need to be saved as `.docx` in Word or LibreOffice before opening them here. Files are parsed on the device.

The terminal helper accepts `.txt`, `.md`, `.tex`, and text-based `.pdf` files:

```sh
bin/paragraph-reader path/to/file.pdf
```

It uses `pdftotext` for PDFs and opens a self-contained HTML page cached by document content under `~/.cache/paragraph-reader`. To open another PDF from that local page, run the helper again with the new file. The hosted browser page extracts PDFs locally with PDF.js; scanned PDFs need OCR first. TeX extraction is best-effort and does not interpret equations or complex macros.

## Controls and data

- `N` focuses notes; `Escape` returns to the reader. Arrow keys, Space, Page Up/Down, `J`, and `K` navigate when the focus is outside text fields.
- Notes are optional. Drag the panel dividers or use arrow keys on the focused separator; Home resets a separator.
- Appearance has separate Themes and Typography tabs. Themes include neutral light, dark, warm, high-contrast, and custom palettes; typography controls reader font, font size, line spacing, text width, and page length. The font menu includes serif and sans choices plus OpenDyslexic as a personal preference, without a claim of universal benefit.
- The word reader plays the selected text in the current chunk, or the whole chunk if nothing is selected. Speed ranges from 100 to 800 WPM. It returns to the source chunk when finished.
- Documents and notes are stored in browser storage under a hash of the document content. Editing the source creates a new identity, so old notes cannot silently move to different text. The Utilities menu offers earlier notes as a backup when a same-name file changes. A JSON backup includes source text, notes, bookmark, formatting where available, and appearance settings; Markdown export contains notes with source quotations. Browser storage is local to the browser and site origin, so download a backup before clearing browser data or moving devices.

## Development

```sh
npm test
python3 -m unittest discover -s tests -p 'test_*.py'
npx playwright install chromium
npx playwright test
```

On NixOS, set `PLAYWRIGHT_CHROMIUM_EXECUTABLE` to a working Chromium wrapper path when running browser tests. `npm run build` makes `dist/index.html` for static hosting and `dist/paragraph-reader.html` for the CLI.

PDF.js is distributed under the Apache License 2.0; its license is included at `vendor/LICENSE`. The direct Markdown, DOCX, and ZIP parser licenses are at `vendor/MARKDOWN-IT-LICENSE`, `vendor/MAMMOTH-LICENSE`, `vendor/PARSE5-LICENSE`, and `vendor/FFLATE-LICENSE`. OpenDyslexic is under SIL OFL at `vendor/OPENDYSLEXIC-OFL.txt`. These files are copied into the hosted release.

The web app manifest and service worker precache the reader, parsers, font, and samples under the hosting subpath. The downloaded HTML embeds its runtime dependencies so fresh TXT, Markdown, TeX, DOCX, and text-based PDF files can be opened through `file:` on desktop Chromium. Other browser engines still need independent local-file checks.
