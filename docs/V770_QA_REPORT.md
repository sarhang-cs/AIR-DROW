# AIR-DROW v7.7.0 QA report

## Scope

This release reviewed the exported source tree, input routing, persistence, raster/vector export, local MediaPipe hand tracking, translations, cache identity and Android-oriented controls.

## Fixed defects

1. **Project export parser defect:** removed a duplicate `const filename` declaration in the `.airdrow` export branch.
2. **Export geometry defect:** replaced direct canvas-size output with a single source-to-output plan. Fit and Fill now use uniform scaling to preserve circles and brush proportions; Stretch is an explicit opt-in.
3. **Scaled brush defect:** raster export keeps strokes in source coordinates during canvas transformation, so brush weight, glow and particle scale match high-resolution output.
4. **Silent interaction conflicts:** the toolbar, palette, dock, settings, dialogs and backdrop are protected surfaces. Pointer/touch events cannot fall through and start a stroke behind UI.
5. **Hand loss / frame exit:** existing continuity and pinch gates are retained and paired with guarded no-hand/invalid-geometry paths. A missing/unstable hand pauses or holds a stroke; it does not invent a new line.
6. **Recovery visibility:** camera, MediaPipe, AI and export failures now record a compact local event, with safe retry/recovery UI.

## Added capability

- PNG, JPG, WebP, SVG, PDF and AIR-DROW project output.
- Current Canvas, Square, Story, Widescreen, A4/A3 print presets; 1×/2×/4× raster scales; Fit/Fill/Stretch layout selection.
- Optional camera composite for raster export only, never enabled by default and never including app UI.
- Index-finger hover palette; 190 ms dwell prevents accidental color selection.
- Two-finger hand eraser gesture; palm quick-save; thumb-up standard export. All gestures have a dwell and cooldown.
- Velocity-adaptive coordinate smoothing, layered after the hand stabilizer.
- Local diagnostics copy/download/clear controls. Reports exclude camera frames, hand landmarks, drawing points, project titles and API URLs.

## Technology decision

No OpenCV dependency was added. AIR-DROW is a browser PWA and already has a self-hosted MediaPipe Tasks Vision pipeline for landmarks plus the native Canvas 2D renderer for drawing. Loading OpenCV.js would increase first-load memory and download cost without solving a current vision requirement. MediaPipe stays lazy/opt-in; the local runtime/model are loaded only when Camera is chosen.

## Automated checks

- `tests/export-gesture-reliability.test.mjs` checks export transforms, adaptive smoothing and the two-finger gesture/dwell gate.
- `scripts/verify-export-gesture-reliability.mjs` confirms UI wiring, translation synchronization, protected palette routing, diagnostics privacy copy and runtime defaults.
- `npm run verify:all` also runs the existing local model, source, bilingual, runtime, PWA and production-build gates.

## Manual device checks still recommended after deployment

1. On Android Chrome, verify PNG/JPG/WebP save and Share Sheet behavior.
2. Test 1×/2×/4× output on the actual phone to confirm memory capacity; choose 2× on lower-memory devices.
3. Test Camera permission denied, no hand, hand leaving frame, two-finger eraser and palette hover under real lighting.
4. Confirm the live deployed Vercel release rather than relying only on localhost or cached PWA content.
