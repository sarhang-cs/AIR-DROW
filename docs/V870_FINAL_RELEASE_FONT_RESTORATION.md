# AIR-DROW v8.7.0 — Final Release + Font Restoration

## Delivered
- Restores the local Kurdish typography asset in the source path used by the production build.
- Keeps the source `@font-face` and preload route aligned with the same-origin asset.
- Adds a Vercel font MIME/cache policy and source/build QA for the asset.
- Preserves all prior hand-input, safety, export, WebKit and Settings fixes.

## Honest final-release boundary
Automated QA verifies source, generated output, project structure, export routes and local runtime assets. It does **not** replace physical Android Chrome or iPhone Safari verification. Before adding a final GitHub tag, validate camera permission, hand tracking, PNG/JPG download, PWA install and reopen/update behavior on real devices.

## Font verification
After deploy, choose Kurdish in Settings and reopen the drawer once. Kurdish labels should use the bundled local face without a visible fallback shift. The app remains usable if an older browser lacks `document.fonts`; CSS font loading is still same-origin.
