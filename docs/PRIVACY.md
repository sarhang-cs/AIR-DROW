# AIR-DROW Privacy Guide

> This guide applies to AIR-DROW 7.5.1 Bootstrap Reliability Hotfix Edition.

AIR-DROW is local-first.

- Your drawings, saved projects and settings remain in the current browser by default.
- AIR-DROW asks for camera permission only after you choose to open Camera.
- Camera video is used only for the live hand drawing experience and is not saved by AIR-DROW.
- The hand runtime and model are packaged as local same-origin files for the deployed app.
- App Check and Camera & Hand Check run locally. They do not open the camera by themselves, enumerate hardware, or send diagnostic reports.
- Exports and shares happen only when you ask for them.
- Optional AI creation is an explicit action. Only the sketch you choose for AI creation is sent to the configured AI service; camera video is never sent by AIR-DROW.

Before changing phones or clearing browser storage, download a backup from Settings.
