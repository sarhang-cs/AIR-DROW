# AIR-DROW Privacy Guide

> This guide applies to AIR-DROW 8.3.2 Export Preview & Save Polish Edition.

AIR-DROW is local-first.

- Your drawings, saved projects and settings remain in the current browser by default.
- AIR-DROW asks for camera permission only after you choose to open Camera.
- Camera video is used only for live hand drawing and is not saved by AIR-DROW.
- The hand runtime and model are packaged as local same-origin files for the deployed app.
- Export Preview renders locally. It does not download, share, upload or read camera video by itself.
- A real export or share only occurs after your explicit trusted tap.
- App Check, Camera & Hand Check, and diagnostics run locally. The diagnostics export excludes camera frames, hand landmarks, drawing points, project titles and API URLs.
- Optional AI creation is an explicit action. Only the sketch you choose for AI creation is sent to the configured AI service; camera video is never sent by AIR-DROW.

Before changing phones or clearing browser storage, download a backup from Settings.
