# AIR-DROW v8.3.0 QA Report

- Preview route builds a local image blob only and does not call `downloadBlob`.
- Dialog is registered as a protected UI surface.
- Export and share from preview still require the existing trusted physical-action gate.
- Preview URLs are revoked on close and replacement.
- Raster previews are capped at 900 px on the longest edge to avoid mobile memory spikes while retaining the real output transform.
