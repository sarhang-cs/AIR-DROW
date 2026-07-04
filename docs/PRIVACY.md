# AIR-DROW Privacy Guide

> This guide applies to AIR-DROW 8.0.0 Final Release Readiness & Cache Integrity Edition

AIR-DROW is local-first.

- Your drawings, saved projects and settings remain in the current browser by default.
- AIR-DROW asks for camera permission only after you choose to open Camera.
- Camera video is used only for the live hand drawing experience and is not saved by AIR-DROW.
- The hand runtime and model are packaged as local same-origin files for the deployed app.
- App Check, Camera & Hand Check, and diagnostics run locally. They do not open the camera by themselves, enumerate hardware, or send a report anywhere. The diagnostics export excludes camera frames, hand landmarks, drawing points, project titles and API URLs.
- Exports and shares happen only when you ask for them. Camera composite export is optional and only uses the live camera after you chose to open it.
- Optional AI creation is an explicit action. Only the sketch you choose for AI creation is sent to the configured AI service; camera video is never sent by AIR-DROW.

Before changing phones or clearing browser storage, download a backup from Settings.

## v8.0.0 release assurance

The final release-readiness checks verify that cache and build identifiers are synchronized. They do not change AIR-DROW's on-device privacy model: diagnostics remain local and the camera is never opened by a readiness check.
