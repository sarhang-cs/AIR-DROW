# AIR-DROW v5.2.0 — Hand Sync & GPU Performance Fix

## Fixed
- Projects every hand landmark through the **actual rendered camera rectangle** and `object-fit: cover` crop, so the guide follows the displayed hand instead of an assumed full-screen aspect ratio.
- Mirrors landmarks exactly once when the camera preview is mirrored.
- Prefers MediaPipe’s local **GPU delegate** and automatically falls back to CPU if the device/browser does not support GPU acceleration.
- Keeps a detected hand in MediaPipe’s lightweight video tracker longer, reducing expensive full palm detections during continuous motion.
- Requests a smaller 320×240 feed for normal mobile hand tracking and lowers it automatically when the measured inference rate is weak.
- Reduces deliberate-motion filter lag while retaining jump rejection and pinch safety.

## Deploy
Run `npm run build`, then push the repository. Vercel deploys automatically from GitHub.
