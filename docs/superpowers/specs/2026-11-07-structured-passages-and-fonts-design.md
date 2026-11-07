# Structured passages and reader fonts

## Intent

Keep Paragraph Reader's one-chunk reading flow while carrying visible structure from imported documents. Readers should see bold and italic emphasis, headings, lists, and safe links where the source explicitly provides them, and choose a comfortable reading font. The user chose structured passages over rendering source HTML fragments. Preamble grouping is deferred; title/author/keyword lines keep their current chunk behaviour.

## Scope and user decisions

- Existing browser inputs remain: pasted plain text; `.txt`, `.md`/`.markdown`, `.tex`/`.ltx`, and text-based `.pdf` files. Add local `.docx` browser import. Existing CLI input types remain. Legacy `.doc` is not parsed; choosing one explains how to save or convert it to `.docx` locally. Web-page import, OCR, and other new source types are outside this change.
- Markdown, simple TeX, and DOCX carry explicit bold/italic, heading, list, and link semantics into a common model. Plain text remains plain. PDF stays text-first: preserve extracted text and page order, but do not invent semantic marks from font names or geometry. The UI and README make the PDF limitation clear.
- Pasted text stays plain text, even if it contains Markdown-looking symbols. An explicit Markdown paste mode can be considered later; do not silently reinterpret pasted text.
- Formatting is shown in paragraph, sentence, and page reading units. The reader still presents one chunk at a time and keeps notes anchored to source paragraphs. Word playback strips presentation and uses the same visible words in the same order.
- Appearance adds a font-family control in Typography with at least two serif choices, two sans-serif choices, and a self-hosted OpenDyslexic choice. The current serif stack stays the default. The chosen font applies to reader chunks and word mode, not notes or UI controls. Existing font size, line spacing, and width settings remain independent. The menu names fonts, without suggesting a therapeutic benefit.

## Structured content model

- Each imported document retains the canonical plain text that drives identity, bookmarks, note hashes, search/selection offsets, export, and word playback. Formatting is a sidecar rather than trusted HTML. A passage/block records `kind` (`paragraph`, `heading`, `list-item`), its source paragraph anchor, its visible plain text, and ordered text runs with `bold`, `italic`, and optional safe `href`. Heading level and ordered/unordered list status are explicit properties.
- Source parsers must produce deterministic visible text and offsets. Chunking operates on visible text while retaining source paragraph anchors. Splitting a sentence across runs must slice runs at text offsets without dropping styles or changing the words. Page chunks concatenate blocks with boundaries and preserve their source anchors.
- Rendering creates text nodes and a small allowlist of semantic elements (`strong`, `em`, heading/list wrappers, `a`) from the model. Imported text is never assigned to `innerHTML`. Link URLs are accepted only for `http:`, `https:`, and `mailto:`; external links open safely and are keyboard-accessible. Unsupported or unsafe links display their label as ordinary text.
- The selected-passage word reader uses DOM selection text and maps its offset back to the same source paragraph even when the selection crosses nested formatting elements. Notes regain focus and the correct anchor after playback.

## Source-specific import rules

- **TXT and paste:** no formatting interpretation. Existing paragraph splitting remains.
- **Markdown:** recognise headings, paragraph text, ordered/unordered lists, strong/emphasis, and ordinary links. Preserve nested emphasis where possible. Use a maintained Markdown parser or a small proven subset parser, but disable arbitrary HTML and images; raw HTML is displayed as text or stripped according to the parser's safe-text mode, never executed. Unsupported constructs keep readable text rather than raw control syntax when feasible. Link text remains in word playback.
- **TeX:** preserve the simple commands already accepted: section/subsection heading levels, `itemize`/`enumerate` items, `\textbf{}`, `\textit{}`/`\emph{}`, and `\href{url}{label}`/`\url{url}`. Other TeX constructs continue best-effort text extraction. The browser and CLI must share equivalent formatting results for the same simple TeX input; avoid a separate divergent stripper for rich content.
- **DOCX:** convert locally in the browser from the uploaded file's bytes to semantic structure (for example, a DOCX-to-HTML library followed by a strict allowlist-to-passages conversion). Keep headings, paragraphs, lists, bold/italic, and safe links. Do not inject converter output as HTML or load embedded/external media; ignore unsupported layout, tables, images, comments, and footnotes while retaining readable text where practical. Reject corrupt, encrypted, oversized, or unsupported files with a useful message and leave the current document untouched. The exact file-size limit is a builder call.
- **Legacy DOC:** detect `.doc` and explain that the older binary format must be saved as `.docx` in Word or LibreOffice before local import. Do not offer a misleading partial text extraction path. The CLI retains its existing accepted formats and likewise gives a clear `.doc`/`.docx` unsupported message until a separate CLI design is approved.
- **PDF:** PDF.js text extraction stays local. It does not reliably identify semantic headings, lists, bold or italic, so the first release shows plain text and uses page breaks only as extraction boundaries. No promise of source-layout fidelity.

## Saved state and compatibility

- Retain the current content-based identity and paragraph-anchored notes for unchanged plain text. Adding formatting must not cause a note to attach to a different passage or disappear silently.
- Version the stored rich document/backup format and validate every block, run, source anchor, and URL on restore. Keep v2 backups readable as plain-text documents with all notes, bookmarks, and preferences intact. Existing v2 local records must remain readable; a record with only plain text renders through the plain passage model.
- For Markdown/TeX where newly extracted visible text or paragraph boundaries differ from the old plain-text importer, do not silently migrate notes. Preserve the old record and provide an explicit, recoverable path to its notes (for example, a legacy backup/export prompt) before adopting the rich representation. The implementation plan may choose the smallest UI that makes this possible; it must define and test it.
- Font preference is added to the preference validator and backup format. Missing font values in old settings/backups use the current reader serif default. Invalid values are rejected or safely defaulted without changing current work.

## UX and accessibility

- Headings, lists, and links should be perceivable to screen readers and keyboard users. One-chunk navigation remains primary. Links should not steal arrow/space reader shortcuts while focused. A focused link uses the normal browser activation keys.
- A font picker shows a short preview using the reader's actual text, then saves the choice for future sessions. OpenDyslexic is bundled with its exact SIL Open Font License file. If that font cannot load, fall back to the system sans stack and keep controls usable.
- No claim that OpenDyslexic improves reading speed or accuracy for all dyslexic readers. It is a personal choice, alongside size and spacing.

## Approaches considered

1. **Structured passages (chosen by user):** small semantic model with plain text as the source of reading position and notes. This maintains the existing reading flow and lets each importer express the formatting it knows.
2. **Sanitized rendered fragments:** retain source HTML-like layout per chunk. It could preserve more visual detail but makes sentence splitting, note anchors, selection playback, and sanitization more complex.
3. **Font controls only:** easy to add, but does not solve the requested loss of emphasis, headings, lists, and links.

## Checks for the implementation plan

- Markdown, TeX, and DOCX fixtures with nested bold/italic, headings, lists, links, and untrusted markup render correctly without script execution. DOCX corrupt/oversized inputs and `.doc` inputs show actionable errors without altering the open document.
- Plain text, PDF, and old v2 backups retain readable text and notes. A changed import never silently reattaches notes.
- Sentence/page chunking and selected-passage playback preserve visible text order and the correct note anchor across formatting nodes.
- Font choices persist, restore from backup, fall back cleanly, and work in both hosted and CLI builds. Test with keyboard and screen reader semantics plus the existing browser accessibility scan.
- Static site, self-contained CLI page, local PDF import behaviour, and GitHub Pages release continue to build and pass.

## Builder calls left open

- Choose specific parser dependencies, parser subset boundaries, DOCX size limit, font files/fallback stacks, and the smallest legacy-note recovery UI during planning. Validate their licenses and update the vendored notices.
