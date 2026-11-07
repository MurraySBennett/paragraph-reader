# Public paragraph reader design

## Intent

Turn the existing local paragraph reader into a polished, static, public utility for reading and optionally annotating one's own text. The quiet, one-chunk reading experience remains central. All document processing and saved state stay in the browser; no account or server is required.

## Scope and decisions

- A compact top bar contains document title and progress, reading-unit control, Notes toggle, Appearance, and Export/Import utilities. Export gives visible success or failure feedback.
- Notes are optional. On desktop, a draggable divider adjusts reader/notes width and a vertical handle adjusts note editor/index height. On narrow screens, notes become a full-width panel and the vertical handle remains useful. Drag handles also work with the keyboard and have a reset action.
- `N` focuses notes only when outside editable controls; `Escape` in notes returns focus to the reader. Navigation keys never intercept typing. A visible Reader button and a keyboard help panel make focus and shortcuts discoverable.
- Appearance holds all themes and typography controls. Existing theme labels, class names, and comments using gender or sexualised language are replaced with neutral palette names. Presets include System, Paper, Warm Paper, Slate, Night, and High Contrast. Custom background/text/accent colours are available. Font size, line height, and reading width are adjustable. Focus and status never rely on colour alone.
- Reading unit can be paragraph, sentence, or page. Page means a deterministic group of paragraphs near a configurable word target, not the source document's printed pages. Notes are anchored to source paragraphs: sentence/page navigation maps back to the underlying paragraph(s), so changing unit cannot orphan notes.
- Word mode presents one word at a time with adjustable words per minute, play/pause, and exit. It can play the current chunk or a selected passage. Selection playback returns to its source position when finished; notes for that position are again available. Notes are hidden during playback.
- Browser accepts pasted text, text/Markdown/TeX files, and PDF files with extractable text. PDF parsing happens locally. The CLI continues to accept PDF/TeX/text and open a self-contained reader page.
- Saved documents use a content fingerprint rather than filename, and notes include a source paragraph fingerprint. Changed text must never silently show notes on unrelated text. A JSON backup contains source text, notes, bookmark, and preferences and can be restored. Markdown notes export remains available.

## Constraints and exclusions

- Static hosting; no user accounts, sync, uploads, analytics, or AI.
- Browser PDF support is text extraction, not preservation of PDF layout or OCR for scans.
- Accessibility: semantic controls, visible focus, keyboard operation, reduced-motion respect, and tested contrast for presets.
- Existing local CLI entry point at `projects/tools/paragraph-reader` remains usable; the dedicated repo holds the source and releases. Publication to an external URL follows verification of the release artifact and hosting route.

## Approaches

1. Extend the single HTML file. Easiest CLI continuity, but a large coupled file is hard to test and maintain.
2. Use separate source modules and produce a single-file release for the CLI, plus static web assets. **Chosen:** keeps the public interface maintainable and the CLI self-contained.
3. Build a server-backed app. Adds accounts and sync but works against the local privacy and simple deployment goals.

The user explicitly requested all discussed updates as a goal and opted out of further design questions. Routine details above are implementation calls, not claims of user approval of specific controls.
