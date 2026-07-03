# Changelog

## 7.5.0 — Production Clean & Mobile Reliability Edition

- Removed first-install MediaPipe/model preloading and heavy install-cache payloads.
- Consolidated late UI patch files into `production-ui.css`.
- Completed Kurdish camera-stop and drawing-area localization; bootstrap recovery respects saved language.
- Removed generated `public/` files from the source distribution; the build regenerates them deterministically.
- Added origin allow-list, body-size cap, stricter request budget and retry headers for optional AI creation.
- Added production integrity verification and a transactional Termux replacement script.
- Added a production integrity gate and documented target-device camera QA.
