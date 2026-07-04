# AIR-DROW Release Notes

## v8.6.0 — All-Feature Device QA
- Adds focused Settings quick navigation for everyday and advanced routes.
- Improves Sorani Kurdish mobile reading rhythm, wrapping and reset transparency.
- Preserves project artwork, history, gallery and trusted physical actions.

# AIR-DROW release notes

## v8.6.0 — Hand Input Reliability
- Deliberate open-hand/pinch/movement gate for new hand strokes.
- Re-pinch recovery after short lost-hand interruptions.
- Short 260 ms guide fade and smaller mobile scan card.



## v8.3.2 — Export Preview & Save Polish

### Added

- **Export Preview**: inspect the selected crop, background treatment and layout before creating a PNG, JPG, WebP, SVG or PDF output.
- The preview uses the same output geometry as the selected file, but it is capped to a 900 px edge for safer Android memory usage.
- A protected mobile preview dialog with explicit **Export now** and **Share** buttons.

### Safety and reliability

- Preview does **not** download, share or save a file. File creation still requires a separate trusted physical tap.
- The preview dialog is a protected surface: hand-tracking coordinates cannot draw behind it or activate its actions.
- Temporary preview object URLs are released when the preview is closed or replaced.
- Added source QA that fails if preview code calls the download route.

### Validation

- `npm run verify:all` runs preflight, localization, hand-runtime, release, input/export, visual-guidance, export-preview and test contracts.
- Physical Android testing remains required for the real Chrome download sheet and camera permission prompt.

## v8.3.2 — Legacy WebKit Compatibility
- Added CSP compatibility for older WebKit WebAssembly handling.
- Kept technical CSP errors in local Diagnostics instead of the visible mobile recovery card.
- Bumped asset and service-worker identity to v832.
