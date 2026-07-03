# AIR-DROW Changelog

## v7.5.3 — Interaction & Hand Scan Polish
- Added the narrow `wasm-unsafe-eval` Content Security Policy allowance required by the self-hosted MediaPipe WebAssembly runtime.
- Kept general JavaScript `unsafe-eval` disabled.
- Moved Project Gallery loading out of normal Draw startup; it now loads when Projects is opened.
- Added non-destructive IndexedDB timeout/lock recovery using a same-device local browser-storage fallback.
- Removed repeated global Gallery recovery alerts; gallery failures remain scoped to the Projects area.
- Added production checks for CSP, lazy gallery loading, storage recovery, and bilingual recovery labels.

# Changelog

## 7.5.3 — Interaction & Hand Scan Polish Edition

- Fixed the startup screen remaining at **7%**: `web/index.html` had two identical `const BOOT_COPY`, `preferredBootLanguage`, `bootLanguage`, and `bootCopy` declarations in one inline script. The browser correctly raised a syntax error before the app module could start.
- Rebuilt the inline bootstrap as one declaration-safe startup routine.
- Added inline-script syntax parsing to `npm run check`; duplicated bootstrap declarations now fail the build before a ZIP can be released.
- Bumped all release identifiers to `air-drow-v753-interaction-scan-polish` so the corrected startup script is fetched after deploy.
- Retained lazy MediaPipe/model loading, generated `public/` output, and source-package cleanup from the previous production build.
