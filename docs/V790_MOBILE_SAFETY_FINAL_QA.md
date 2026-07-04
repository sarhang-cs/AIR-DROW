# AIR-DROW v7.9.0 — Mobile Safety & Final QA

## Scope

This release hardens the exact Android risks reported during hand drawing: accidental file actions, empty raster output, guide clutter over artwork, and inconsistent Kurdish mobile reading rhythm.

## Implemented safeguards

- File-producing actions and destructive clear are bound through a trusted physical-action gate. A hand landmark, synthetic click, or an untrusted event is rejected.
- Stored source strokes are the primary raster export renderer. The live artwork canvas is used only if the stroke renderer itself fails.
- Older locally saved projects migrate to `inputSafetyVersion: 4`, with hand guide and gesture shortcuts disabled until explicitly enabled again.
- The optional guide shows only a compact thumb/index pinch aid, never a full skeleton, and it is hidden during active drawing.
- Kurdish controls receive mobile-specific line-height, wrapping and type-size rules.

## Automated checks executed

- `npm ci --ignore-scripts`
- `npm run verify:all`
- `npm test`
- ZIP integrity validation

## Device check still required

A real Android phone remains the final authority for camera permission, camera driver behavior and the browser download sheet. After deployment, verify: open camera, draw for 20 seconds, move index over the palette, click Save once, and inspect the downloaded PNG/JPG for the drawing. No file should download merely because the tracked hand crosses UI space.
