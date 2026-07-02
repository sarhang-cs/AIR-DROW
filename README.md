# AIR-DROW v5.0.6 — Hand Runtime Loader Fix

AIR-DROW is a local-first drawing studio for touch, pen, camera and hand tracking. Drawings remain on-device unless the creator explicitly exports, shares, restores a backup or requests AI generation.

## Release focus

- Fully local MediaPipe runtime and hand model
- CPU-first camera hand engine for Android reliability
- Local buffer initialization with local-file-only fallback
- Separate camera and hand-engine recovery messages
- Android-safe switches, fixed bilingual settings header and protected RTL controls
- Drawer cards stay reachable in an independent scroll region
- Local editable toolbar SVG icons, including undo and redo

## Build

```bash
npm install
npm run build
```

The deployable output is `public/`. The local model lives at `web/vendor/models/hand_landmarker.task` and is copied to `public/vendor/models/` during the build.

## Checks

```bash
npm run model:verify
npm run camera-ui:verify
npm run verify:release
```
