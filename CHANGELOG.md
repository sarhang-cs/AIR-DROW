# AIR-DROW v5.0.6 — Hand Runtime Loader Fix

- Publishes the local MediaPipe bundle as `vision_bundle.js` for Android-safe JavaScript MIME handling.
- Removes the trailing slash from the MediaPipe WASM base path; the resolver now creates deterministic local asset URLs.
- Adds explicit local-runtime MIME rules and visible diagnostic details if task initialization fails.

# AIR-DROW Changelog

## v5.0.6 — Hand Runtime Loader Fix
- Starts MediaPipe only after the camera has delivered a live frame.
- Uses local model URL as the primary Android path, followed by local-only alternatives.
- Separates asset, WASM and task-creation diagnostics and stops stale camera previews after engine failure.
- Background warm-up only primes local assets; it never creates a task.


## v5.0.6 — Hand Runtime Loader Fix

- Rebuilt hand startup as a fully local, CPU-first MediaPipe path for Android reliability.
- Reads the bundled hand task into memory first; if a WebView rejects it, retries only the exact local task URL.
- Separates camera-stream recovery from hand-engine recovery so a working camera is never shown as a generic camera failure.
- Rebuilt the drawer as a fixed header + tabs + independent scroll region; expanded cards are focused after Android layout settles.
- Locked the settings mark and close control to fixed visual positions across Kurdish RTL and English LTR.
- Replaced input pseudo-element toggles with real DOM visual tracks and visible off/on knobs.
- Reserved dedicated chevron/select space for RTL text and bundled a local redo toolbar SVG beside undo.
