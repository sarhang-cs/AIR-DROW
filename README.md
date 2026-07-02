# AIR-DROW v5.1.0 — Bootstrap & PWA Recovery Fix

This release fixes the Android hand-runtime failure caused by a legacy locally assembled HandLandmarker task bundle.

## Deploy

```bash
npm install
npm run build
```

`npm run build` synchronizes Google's official `hand_landmarker/float16/1` model, validates its pinned SHA-256, builds the self-hosted MediaPipe assets, and verifies the deployment output. The deployed app keeps the runtime and task bundle local.

## Important

Do not deploy `public/` directly from this source archive. Deploy through the included Vercel build configuration so the verified task bundle is generated first.
