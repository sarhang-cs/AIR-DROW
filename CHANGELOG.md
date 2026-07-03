# AIR-DROW v7.5.6 — Input, Language & Hand Startup

- Hand calibration now captures only when the hand is inside each highlighted target; a stable hand in one place cannot produce a fake 1/4 → 4/4 pass.
- Completed calibration is persisted immediately in local browser storage and the current project, with serialized saves to prevent stale writes.
- Text selection, Copy, Search and Translate callouts are locked across onboarding, boot, recovery and every other studio overlay.
- The MediaPipe sourcemap 404 is removed from deployment output; generated non-failure diagnostics are isolated without hiding genuine errors.
- Network status and readiness checks use live same-origin probes instead of only navigator.onLine/API presence.

# AIR-DROW Changelog

## v7.5.6 — Input, Language & Hand Startup
- Added the narrow `wasm-unsafe-eval` Content Security Policy allowance required by the self-hosted MediaPipe WebAssembly runtime.
- Kept general JavaScript `unsafe-eval` disabled.
- Moved Project Gallery loading out of normal Draw startup; it now loads when Projects is opened.
- Added non-destructive IndexedDB timeout/lock recovery using a same-device local browser-storage fallback.
- Removed repeated global Gallery recovery alerts; gallery failures remain scoped to the Projects area.
- Added production checks for CSP, lazy gallery loading, storage recovery, and bilingual recovery labels.

# Changelog

## 7.5.6 — Input, Language & Hand Startup Edition

- Fixed the startup screen remaining at **7%**: `web/index.html` had two identical `const BOOT_COPY`, `preferredBootLanguage`, `bootLanguage`, and `bootCopy` declarations in one inline script. The browser correctly raised a syntax error before the app module could start.
- Rebuilt the inline bootstrap as one declaration-safe startup routine.
- Added inline-script syntax parsing to `npm run check`; duplicated bootstrap declarations now fail the build before a ZIP can be released.
- Bumped all release identifiers to `air-drow-v756-input-language-hand-startup` so the corrected startup script is fetched after deploy.
- Retained lazy MediaPipe/model loading, generated `public/` output, and source-package cleanup from the previous production build.

## v7.5.6 — Input, Language & Hand Startup

- Android text fields now request focus on the first tap.
- Camera & Hand Check values now repaint from translation keys when language changes.
- Hand startup keeps a clear wait message until the local model is ready.
- Calibration success stays visible and closes with an exit animation.
