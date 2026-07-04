# AIR-DROW v7.8.0 — Hand Tracking & Performance Stabilization QA

## Scope

This release stabilizes the live camera/hand path after the v7.7.1 input and export recovery. It deliberately adds no hand gesture that can save, share, delete, clear, or download a file.

## Changes verified

- Hand inference is scheduled from decoded video frames where the browser supports `requestVideoFrameCallback`; older browsers retain a duplicate-frame-safe animation-frame fallback.
- A synchronous MediaPipe inference is never requested twice for the same decoded media time and is bounded by the active tracking FPS budget.
- Repeated slow inference reduces only the hand-tracking cadence. A capture-resolution fallback is deferred while a stroke is active so coordinates cannot jump mid-line.
- Background tabs suspend hand inference and resume only after fresh camera frames arrive.
- A newer camera/hand start session supersedes stale initialization work, preventing an older async task from reactivating tracking after the user has changed mode.
- Hand drawing, erasing, palette hover, toolbar, workspace dock, drawers and dialogs remain separated. Hand coordinates inside a protected UI surface never paint a stroke.
- The optional hand guide only appears for a stable, drawable hand and now renders a compact thumb/index/pinch guide instead of a full landmark skeleton.
- The runtime no longer monkey-patches `console.warn` during inference.

## Automated checks

Run from the project root:

```bash
npm run qa:hand-performance
npm run qa:input-export-safety
npm run verify:all
```

## Manual Android acceptance check

1. Open Hand mode and allow the camera.
2. Keep the hand near the toolbar, palette, bottom dock and Settings: no drawing, saving, export, or UI activation may occur.
3. Pinch inside the open canvas: one continuous stroke should follow the index finger.
4. Close the fist or briefly leave frame: the current stroke should hold briefly, then finish safely without a jump line.
5. Enable **Hand Guide** only when needed: it should show a quiet thumb/index guide only after tracking is stable.
6. Export a PNG and JPG with visible strokes: artwork must appear while UI, FPS, camera, guide and hand cursor remain excluded.
