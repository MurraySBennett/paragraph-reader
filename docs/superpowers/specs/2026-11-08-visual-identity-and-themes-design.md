# Visual identity and theme presets

## Intent

Give the public reader a distinct, compact visual identity and a set of site-wide palettes that can suit different reading and teaching contexts. The selected direction is After Hours: quiet dark surfaces, restrained warm accents, straightforward sans-serif type, tight spacing, and consistent alignment. The reader must still put the text first.

## Approach

Three directions were compared: Editorial, Workbench, and After Hours. After Hours was selected. A new visual layout will use the existing app structure, CSS variables, and preference storage. The alternatives were a color-only change (insufficient to address spacing, typography, and layout) and separate branded page templates (duplicated behavior and harder to extend). The chosen single layout with palette tokens supports both current and future themes.

## Visible design

- Remove decorative eyebrow labels and oversized serif headings from the home screen, toolbar, notes panel, and dialogs. Use a sans-serif interface and `sans-system` reader font for new users. Keep user-selectable reader serif fonts and OpenDyslexic as reading options; honor previously saved font choices.
- Replace the centered hero and rounded card-heavy home layout with a compact, aligned introduction and import area. Show examples as a scan-friendly list or grid with format and source information. Keep installation/download and source links easy to find.
- Make the reader a broad, minimally framed text area with a clear top utility bar, stable controls, and a notes pane that remains resizable and optional. Preserve the existing wide reading column and edge buffer.
- Apply each palette across home, reader, notes, appearance dialog, word mode, focus states, and feedback. Theme choice must be available on the home screen and in the reader.
- Default visual palette for new users: After Hours. Honor previously saved theme choices, including System; every user sees the new layout. Also provide Neon and Velvet, the existing functional presets (including high contrast and Custom), and three institution-inspired palettes: Newcastle, UT San Antonio, Ohio State. Do not add logos, marks, or proprietary fonts or imply university endorsement. Theme labels and IDs describe only the appearance or institution.
- Use official digital color values as reference: Newcastle blue `#1090D5` with black/white; UT San Antonio Orange `#F15A22` and Midnight `#032044`; Ohio State scarlet `#BA0C2F`, gray `#A7B1B7`, and white. Adjust text/button pairings to meet contrast while keeping these signature colors visible. Sources: [Newcastle](https://policies.newcastle.edu.au/download.php?associated=&id=326&version=2), [UT San Antonio](https://hcap.utsa.edu/documents/ut-san-antonio-brand-guidelines_book-aug20.pdf), [Ohio State](https://bux.osu.edu/color/primary-colors/).
- Theme choice remains a user preference saved in the browser and included in existing backups. No document-specific or link-selected theme in this phase. Teaching content integration will be designed when actual material exists.

## Implementation boundaries

- Reuse current CSS token and `data-theme` mechanism; add theme metadata in one place so another institution can be added without copying page markup.
- Keep existing documents, notes, word pacing, imports, exports, installed/offline copies, and keyboard behavior intact.
- The product name remains a separate open choice. Do not ship the mockup's working name.
- Avoid new dependencies and remote font or image requests; the offline copy must look complete.

## Checks

- Inspect home, reader with notes visible/hidden, appearance dialog, and word mode at desktop and mobile sizes in each new palette.
- Check contrast for text, controls, focus indicators, and status; verify controls remain understandable without color alone and reduced-motion preference remains respected.
- Verify theme switching and persistence, backup validation/restoration, offline/static builds, and existing browser/Node tests. Confirm a saved old preference still loads.

## Visual references

Throwaway previews: `~/.agents/design-previews/paragraph-reader/after-hours-revised.html` and `~/.agents/design-previews/paragraph-reader/institution-palettes.png`. They are direction sketches, not production assets.
