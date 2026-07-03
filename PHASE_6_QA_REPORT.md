# AIR-DROW v6.5.0 — Phase 6 QA Report

## Scope
Phase 6 adds an on-device readiness panel in **Settings → About**. It reports real browser/runtime conditions without starting the camera or sending any telemetry.

## Checks
- Secure context is read from `window.isSecureContext`.
- Camera support is read from `navigator.mediaDevices.getUserMedia` **without calling it**.
- The local hand-model URL is probed as a same-origin `HEAD` request.
- Storage uses `navigator.storage.estimate()` / `persisted()` where supported.
- PWA state reads `navigator.serviceWorker.controller`.
- Graphics checks WebGL/WebGL2 without identifying the GPU.
- Network reads `navigator.onLine`.
- Copy report only writes the local text report to the clipboard after a user action.

## Safety contract
No `getUserMedia()` call, camera permission prompt, device enumeration, camera preview, drawing export, network telemetry or external asset download occurs in the readiness module.

## Build gate
`npm run phase6:verify` is part of `npm run verify:source`, and `npm run vercel:build` remains the delivery gate.
