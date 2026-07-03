# AIR-DROW v7.0.0 — Phase 7 QA Report

## Verified source contracts

- Final Live QA UI, registry, translations and passive runtime module are present.
- The module contains no direct `getUserMedia()` or `enumerateDevices()` call.
- Existing Phase 1–6 verification remains part of `npm run vercel:build`.
- The service worker pre-caches the Final Live QA module and carries the canonical v7.0.0 build ID.
- The release package stays local-first. Camera and hand rows are informative only; they become ready only after the creator independently starts the existing camera flow.

## Required creator-side live test

1. Open the production site on the target mobile browser.
2. Settings → About → run Device Readiness. Confirm secure context, local model and PWA checks.
3. Use the existing Camera button, grant permission only at that moment, and wait for a real video frame.
4. Hold one hand clearly in frame; wait for the hand guide / tracking health.
5. Settings → About → run Final Live QA again. Camera, Hand Engine and Hand Detection should report Ready.
6. Draw a short pinch stroke, close the fist briefly, release, export a PNG, refresh, and confirm the project is still locally available.

This report does not claim a remote camera test was run. Actual camera and hand performance must be confirmed on the creator's device.
