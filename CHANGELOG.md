# v7.7.1 — Critical Input & Export Recovery

- Removed all hand-driven save/export/download paths; downloads require a real on-screen tap.
- Rebuilt raster export around the isolated artwork canvas so visible strokes are included in PNG/JPG/WebP.
- Made the top color palette safe, slower to hover-select and Hand-mode-only.
- Made the guide opt-in and refined Kurdish Android text and About-card spacing.

# AIR-DROW changelog

## v7.7.1 — Export, Gesture & Reliability

- Rebuilt raster export around a source-to-output plan: PNG, JPG and WebP now support 1×/2×/4× output, Fit/Fill/Stretch layouts, social presets and A4/A3 300 PPI presets.
- Added a protected top hand palette. Hover an index finger over a color briefly to select it; palette, toolbar and settings never route a stroke to the canvas.
- Added a conservative two-finger gesture to toggle Hand Eraser. Palm quick-saves and thumb-up opens standard export after the gesture dwell period.
- Added velocity-adaptive line smoothing, a local-only diagnostics report, and explicit recovery logging for camera, hand engine, export and AI failures.
- Fixed a duplicate project-export filename declaration that could break `.airdrow` export parsing.

## v7.6.2 — Layout & Input Integrity

- Fixed canvas pointer isolation for toolbar and workspace navigation controls.
- Rebuilt the responsive About profile cards and QR composition.
