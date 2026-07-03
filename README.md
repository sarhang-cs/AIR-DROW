# AIR-DROW v6.4.0 — Final Release Readiness

AIR-DROW is a local-first drawing studio for touch, pen, camera and hand tracking. The browser loads the hand runtime and official HandLandmarker asset from the same deployed origin. Strokes, settings, recovery drafts and project backups remain on the device unless the creator explicitly exports, shares or uses the optional AI workflow.

## Current release: Phase 5

Phase 5 makes the release package auditable and easier to maintain. The About panel now displays the runtime’s canonical version and build ID, metadata is synchronized across all release surfaces, and a dedicated verification gate prevents release documentation or UI identity from drifting.

- **Version:** `6.4.0`
- **Build:** `air-drow-v640-phase5-release-readiness`
- **Release gate:** `npm run vercel:build`
- **Node.js:** `24.x`
- **Runtime policy:** same-origin local MediaPipe modules and hand model; no browser-time CDN model download

## What Phase 1–4 already delivered

- Foundation hardening, deterministic installs, Vercel build gates and a local-first hand runtime.
- Premium mobile-first UI, RTL/LTR stability, themes, local icons and text-only FPS/Online/CAM overlays.
- Velocity-aware hand drawing, stable pinch behavior, short closed-fist continuity, guarded jumps and calibrated eraser targeting.
- Protected saves, recovery journaling, safe exports, update-save enforcement and touch-first onboarding.

## Build and deploy

```bash
npm ci --no-audit --no-fund
npm run vercel:build
```

Commit and push to the linked `main` branch. Vercel deploys automatically; when an automatic deployment is delayed, create a production deployment from `main` in the Vercel Deployments page.

## Validation

The source verification chain covers release metadata, UI/RTL contracts, local assets, tracking, export/recovery behavior, Phase 5 readiness and the generated self-hosted MediaPipe output. The official hand model is verified by exact byte length and SHA-256.

See `README_KU.md` for the Sorani Kurdish release overview and `docs/RELEASE_DELIVERY_KU.md` for the mobile/Termux delivery procedure.
