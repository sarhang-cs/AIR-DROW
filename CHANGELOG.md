# AIR-DROW v5.0.9 — Official Task Binary Validation Fix

- Corrected the official `hand_landmarker.task` validator: the model is now accepted only by its exact byte length and SHA-256, without an invalid generic ZIP-header assertion.
- Removed archive-entry assumptions that blocked the valid Google-hosted model before it could be written.
- Updated the model cache revision to `model=v2-fbc2a300` and the service-worker build ID.
- Improved the Termux replacement script so it stops at the first build failure and restores the backup cleanly.
- Expanded the Node engine range to include the current Termux Node 26 release.

# Changelog

## v5.0.9 — Official Hand Model Fix

- Replaced the rejected locally assembled legacy hand task with a checksum-pinned synchronization of Google's official `hand_landmarker/float16/1` bundle.
- Fails the build if the expected official model bytes or SHA-256 are not present.
- Added a release-specific model query key to prevent stale service-worker entries from returning the legacy model.
- Keeps MediaPipe and the synchronized model self-hosted at runtime.

# AIR-DROW Changelog

## v5.0.9 — Official Task Binary Fix
- Fixed the real Vercel/GitHub CI failure where `public/vendor/mediapipe/vision_bundle.js` was checked before `build:static` generated it.
- Split source validation from post-build deploy-output validation.
- Added explicit verification of build order and generated local MediaPipe/WASM/model output.
- Verified `npm run build` from a clean source tree with no pre-existing `public/` directory.

## v5.0.6 — Hand Runtime Loader Fix
- Published the local MediaPipe bundle as JavaScript and added local runtime diagnostics.
