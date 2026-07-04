# AIR-DROW v8.3.0 — Export Preview & Save Polish

## What changed

- Added a local Export Preview action before file creation. It renders a capped preview canvas using the same fit, fill, stretch, transparency, camera-composite and brush geometry rules as the selected output.
- Preview never calls the download route. A file is only created by a later trusted physical tap on Export or Share.
- Added a protected mobile preview dialog with explicit Export now and Share controls. The dialog is a protected UI surface, so camera-hand coordinates cannot draw through it or trigger an action.
- Added object-URL cleanup when the preview closes or is replaced, preventing long-lived preview blobs.
- Added source QA that rejects any preview implementation containing a download call.

## Validation

`npm test`, `npm run qa:export-preview-save`, `npm run preflight`, and `npm run check` are expected to pass before release.
