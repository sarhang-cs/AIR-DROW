# AIR-DROW Changelog

## v8.6.0 — All-Feature Device QA
- Added a local Feature Check for project storage, PNG/JPG/WebP, SVG/PDF routes, save/share, PWA and browser capability.
- Temporary project-storage probe is removed after the check and does not touch gallery items.
- Added static QA coverage for the new local validation contract.

# Changelog

## v8.6.0 — All-Feature Device QA
- Added compact everyday/advanced Settings navigation for mobile.
- Improved Sorani Kurdish line-height, wrapping and safe minimum sizes across the Settings drawer.
- Clarified the local-persistence and preference-only reset contract.
- Reselecting Settings returns to the top of the focused Settings home.

## v8.6.0 — Hand Input Reliability
- Requires a stable open hand, a confirmed pinch and a small intentional movement before drawing starts.
- Requires a re-pinch after a temporary hand-tracking loss before a paused stroke can resume.
- Shortens frozen guide visibility and makes the scanner compact on mobile.



## v8.3.2 — Layout & Legacy Runtime Hardening
- Widened the Kurdish Touch / Pen / Hand metadata card without expanding the app-version card.
- Reset a newly opened Settings drawer to its top position.
- Added safe local fallbacks for legacy WebKit `structuredClone()` and `Array.prototype.at()` gaps.
- Cleaned release metadata so package, manifests, cache revision and docs agree.

# AIR-DROW changelog

## v8.3.2 — Export Preview & Save Polish

- Added local, memory-capped export preview that does not invoke a browser download.
- Added explicit protected Export/Share actions inside the preview dialog, with cleanup of temporary object URLs.
- Added QA coverage that prevents preview code from calling the file-download path.


## v8.2.0 — Visual Guidance & Persistent Settings Refinement

- Expanded the local App readiness view with private checks for a temporary drawing surface, PNG/JPG blob encoding and local object-URL preparation. These checks never open the camera, download a file, inspect artwork or send a report.
- Added a source/test gate for the readiness probe and bilingual documentation that separates browser preflight coverage from real Android permission, camera and download-sheet validation.
- Synchronized the page, runtime, model cache key, PWA manifest, worker cache and release descriptors under the v8.2.0 / revision 820 identity.

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

## v8.2.0 — Visual Guidance & Persistent Settings Refinement

- Restored full configurable hand-guide rendering on the dedicated camera feedback canvas.
- Added persisted guide opacity and thickness controls.
- Fixed hand palette startup synchronization after asynchronous camera acquisition.
- Tightened Kurdish Android typography and compact creator/Instagram QR layout.
- Standardized preference-only reset behavior and recorded source QA coverage.

