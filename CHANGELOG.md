# v7.8.0 — Hand Tracking & Performance Stabilization

- Replaced the hand-detection animation-frame polling loop with a video-frame-aware scheduler. Modern browsers process only fresh decoded camera frames; older Android browsers retain a safe fallback.
- Added an adaptive hand-performance governor that reduces inference cadence after repeated slow frames without restarting the camera or interrupting an active stroke.
- Added session guards so stale asynchronous camera/MediaPipe initialization cannot re-enable tracking after the user changes mode.
- Suspended hand inference while the browser tab is hidden and resumed only from fresh camera frames.
- Strengthened protected canvas zones: a hand over the toolbar, palette, bottom dock, settings drawer, dialog, or other control surface cannot draw, erase, save, export, or activate UI.
- Refined the optional Hand Guide: it is still opt-in, only appears after stable tracking, and now displays a quieter thumb/index/pinch guide rather than a full landmark skeleton.
- Removed the global `console.warn` monkey-patch from the MediaPipe inference path so genuine browser diagnostics remain visible.

# v7.7.1 — Critical Input & Export Recovery

- Removed all hand-driven save/export/download paths; downloads require a real on-screen tap.
- Rebuilt raster export around the isolated artwork canvas so visible strokes are included in PNG/JPG/WebP.
- Made the top color palette safe, slower to hover-select and Hand-mode-only.
- Made the guide opt-in and refined Kurdish Android text and About-card spacing.

# AIR-DROW changelog

## v7.7.0 — Export, Gesture & Reliability

- Added high-resolution export planning, local diagnostics, adaptive smoothing and guarded hand-color controls.
- Current releases intentionally do **not** map save, export, share, clear, or download to a hand gesture.

## v7.6.2 — Layout & Input Integrity

- Fixed canvas pointer isolation for toolbar and workspace navigation controls.
- Rebuilt the responsive About profile cards and QR composition.
