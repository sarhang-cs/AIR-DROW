# AIR-DROW v5.2.1 — Transparent Status HUD Fix

## Fixed
- Removed the filled background, panel surface, border and backdrop blur from the live `FPS`, `Online` and `CAM` indicators.
- Defined the transparent status styling in the core visual-system and base component styles, rather than as a late CSS patch.
- Kept a high-contrast text shadow so the status labels remain readable over a live camera feed.
- Rotated the service-worker build namespace so older boxed HUD CSS is replaced during the normal update process.

## Deploy
Run `npm run build`, then push the repository. Vercel deploys automatically from GitHub.
