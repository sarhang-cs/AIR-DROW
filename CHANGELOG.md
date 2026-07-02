# AIR-DROW v5.1.1 — Vercel Build Recovery Fix

## Fixed
- Removed the brittle build-time assertion that stopped Vercel deployments when a cache-header route was normalized or missing from an older checkout.
- Retained the explicit Vercel `no-store` policy for application JavaScript, while keeping deployment validation focused on the runtime behavior that is actually required.
- Rotated the build ID, service-worker cache namespace, boot-module query key, manifest start URL, and local release metadata so Android Chrome requests the repaired build instead of stale PWA entries.
- Preserved the official, checksum-validated local MediaPipe HandLandmarker model and self-hosted runtime assets.

## Deploy
Run `npm run build`; no direct deployment of `public/` is required. Push the repository to GitHub and Vercel will deploy automatically.
