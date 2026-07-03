# Changelog

## 7.5.1 — Bootstrap Reliability Hotfix Edition

- Fixed the startup screen remaining at **7%**: `web/index.html` had two identical `const BOOT_COPY`, `preferredBootLanguage`, `bootLanguage`, and `bootCopy` declarations in one inline script. The browser correctly raised a syntax error before the app module could start.
- Rebuilt the inline bootstrap as one declaration-safe startup routine.
- Added inline-script syntax parsing to `npm run check`; duplicated bootstrap declarations now fail the build before a ZIP can be released.
- Bumped all release identifiers to `air-drow-v751-bootstrap-hotfix` so the corrected startup script is fetched after deploy.
- Retained lazy MediaPipe/model loading, generated `public/` output, and source-package cleanup from the previous production build.
