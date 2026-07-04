# AIR-DROW v8.2.0 — Visual Guidance & Persistent Settings

## Scope

This release addresses Android camera guidance and settings consistency without weakening the app’s physical-action safety boundary.

- The hand guide now renders all 21 MediaPipe landmarks and hand bones on `handCanvas`, a live-only layer separate from the artwork canvas.
- **Hand guide opacity** and **Hand guide thickness** are ordinary local settings. They persist across sessions and change only when the user changes them or confirms **Reset Settings**.
- Palette visibility is synchronized after `getUserMedia` resolves, so the palette appears whenever a live Hand or Hand Eraser session has a stream.
- The guide and palette never trigger Download, Save, Export, Share or Clear. Those actions remain trusted physical UI taps.
- Kurdish About/Instagram cards use compact responsive layout and dedicated reading rhythm on small Android screens.

## Reset boundary

Reset Settings closes the camera, reinitializes camera/hand preference state and restores default preferences only after confirmation. It preserves artwork, undo history, gallery records, project title and the current view.

## On-device validation

After deployment, test on the target phone: open Hand mode, grant camera permission, confirm the palette appears, move the opacity/thickness sliders, close/reopen the app, then confirm the values persist. Export PNG/JPG and verify that no guide lines or UI appear in exported artwork.
