# Word reader pacing

## Intent

Make word mode deliberate: entering it must never start playback before the reader is ready. At a chosen speed, it reads one sentence or paragraph, then waits for the reader to start the next segment.

## Behavior

- Opening word mode shows the first segment ready to start, with playback paused. **Start** begins its first word. During playback the same control says **Pause**; pausing retains the current position, and **Resume** continues it.
- Word mode has its own persistent **Segment** choice: **Sentence** (default) or **Paragraph**. It does not change the main reader's sentence/paragraph/page unit.
- A segment plays its words at the chosen WPM. At its end, the final word stays visible, playback stops, and **Next** plus unmodified **N** start the following segment. No timer advances between segments.
- With no selection, the queue begins at the current displayed passage and continues through the rest of the document. With highlighted text in the reading card, the queue contains only that selection, split by the chosen segment unit.
- **N** works only while word mode is open and focus is outside editable controls. It never steals keystrokes from notes. The Next button is disabled at the final segment; Back returns to the main reader and preserves the relevant note anchor.
- Speed changes affect the next word interval. Escape and Back stop playback and close word mode. The word progress and segment number remain visible in paused and waiting states.

## Approach

The main reader's chunks could drive word mode, but that would make page units and word-mode pacing coupled. A separate segment queue from the document's structured passages is the chosen approach. It preserves the existing main reading unit and selection anchoring while making sentence/paragraph pacing explicit.

## Scope and checks

Update the word-player state machine, dialog controls, preferences, keyboard handling, and the standalone build. Verify paused entry, start/pause/resume timing, segment boundary waiting, N/Next behavior, selected-text bounds, note anchoring, and the downloadable copy. No notes UI redesign or automatic progression between segments.
