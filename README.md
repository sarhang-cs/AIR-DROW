# AIR-DROW v5.2.3 — Fist Guide Continuity Fix

AIR-DROW is a local-first drawing studio for touch, pen, camera and hand tracking.

## Closed-fist guide behavior
The visible hand guide is now rendered whenever MediaPipe confidently returns hand landmarks, including a closed fist. The stricter open-hand geometry checks still control pinch drawing, so making a fist cannot accidentally start a stroke.

A short, bounded guide hold hides single-frame detector drops caused by occlusion without leaving a frozen guide after the hand exits the camera.

## Live status overlay
`FPS`, `Online`, and `CAM` remain direct overlay text with no filled panel, border, pill, blur backdrop, or boxed background.

## Deploy
```bash
npm install
npm run build
```

Push the repository to GitHub; the linked Vercel project deploys automatically.

## v5.2.3 — Release Verification Recovery Fix

The release validator now checks the transparent status HUD and closed-fist guide continuity independently, preventing the prior false build failure.
