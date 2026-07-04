# AIR-DROW release notes

## v7.7.0 · Export, Gesture & Reliability

- **Export Studio Pro:** PNG, JPG and WebP export at 1×, 2× or 4× resolution. Choose Fit (no distortion), Fill (edge crop) or Stretch, plus Current Canvas, Square, Story, Widescreen, A4 and A3 presets.
- **Reliable visual output:** strokes, glow and brush thickness are transformed together during scaled export so artwork does not become thin or distorted at higher resolutions.
- **Hand controls:** two raised fingers toggles Hand Eraser after a short hold. A palm quick-saves an image; a thumb-up opens export. Fist remains a safe hold rather than a destructive shortcut.
- **Top color palette:** hover the index finger over a color briefly to change the active brush. The palette is a protected interface surface; it cannot create a stroke behind itself.
- **Resilience & privacy:** missing hands, hands leaving the frame, camera issues and local MediaPipe startup failures recover safely. Diagnostics are stored locally and omit camera frames, hand landmarks, drawing points, project titles and API URLs.
- **Performance:** AI Studio is loaded on demand; Camera/MediaPipe assets remain opt-in and cache only after Camera is opened.

## v7.6.2 · Layout & Input Integrity

- Rebuilt the About App profile layout for phone screens.
- Fixed pointer routing from visible UI controls to the underlying canvas.
