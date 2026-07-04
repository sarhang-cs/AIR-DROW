# AIR-DROW changelog

## v8.0.0 — Final Release Readiness & Cache Integrity

- Synchronized the index build identifier, runtime module identifier, local hand-model cache key, PWA manifest, service-worker cache namespace, release descriptor and asset revision under one v8.0.0 identity.
- Replaced mixed `v770`/`v790` static stylesheet and manifest cache markers with one v800 revision, preventing a browser from pairing new JavaScript with an older visual shell after deployment.
- Added a release-readiness QA contract that rejects stale version markers and documentation that would imply a hand pose can save, export, clear, share or download a file.
- Added English and Sorani Kurdish Android device-validation checklists for camera permission, camera frames, hand detection, palette dwell, protected UI surfaces, PNG/JPG output, PWA update and offline local hand runtime checks.

## v7.9.0 — Mobile Safety & Final QA

- Added a trusted physical-action gate for Export, Quick Save, Share fallback, backup download, diagnostics download, creator-template output, replay output, AI-result download and destructive Clear. Synthetic clicks and hand-tracking coordinates are rejected.
- Rendered stored project strokes first for PNG/JPG/WebP output. The visible artwork canvas is now recovery-only, preventing background-only files caused by a late Android repaint.
- Migrated projects saved before `inputSafetyVersion: 4` to disable Hand Guide and gesture shortcuts until deliberately enabled again.
- Replaced the optional guide with a compact thumb/index pinch aid and hide it while drawing.
- Added Android-focused source QA for trusted actions, source-first export, quiet guide behavior and Kurdish mobile type tokens.

## v7.8.0 — Hand Tracking & Performance Stabilization

- Added fresh-video-frame MediaPipe scheduling, adaptive cadence and protected canvas zones.
- Added session guards for stale asynchronous camera/MediaPipe initialization.

## v7.7.1 — Critical Input & Export Recovery

- Removed all hand-driven save/export/download gesture routes.
- Added protected palette behavior and local diagnostics.

## v7.7.0 — Export, Gesture & Reliability

- Added high-resolution export planning, smoothing and guarded color controls.
