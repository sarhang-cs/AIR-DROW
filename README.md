# AIR-DROW v5.2.0 — Hand Sync & GPU Performance Fix

AIR-DROW is a local-first drawing studio for touch, pen, camera and hand tracking.

## Hand tracking improvements
The camera guide now uses the browser’s real rendered video geometry, including cover cropping and mirror orientation. Hand tracking attempts MediaPipe GPU first and safely falls back to CPU when needed.

## Deploy
```bash
npm install
npm run build
```

Push the repository to GitHub; the linked Vercel project deploys automatically.
