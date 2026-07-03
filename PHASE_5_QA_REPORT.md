# AIR-DROW v6.4.0 — Phase 5 QA Report

## Scope
Phase 5 completes release identity and delivery readiness. It does not change Phase 1–4 camera, hand tracking, drawing, UI or recovery behavior.

## Release checks

- [x] `package.json`, `package-lock.json`, `web/release.json`, `PROJECT_MANIFEST.json` and `LOCAL_ASSETS_MANIFEST.json` use version `6.4.0`.
- [x] Runtime, service worker, HTML metadata, PWA manifest and API health response use build ID `air-drow-v640-phase5-release-readiness` or the matching version.
- [x] Settings > About shows the canonical app version and build ID from runtime configuration at boot.
- [x] English and Kurdish release labels are present in the single translation dictionary.
- [x] README, Kurdish README, changelog, Phase 5 manifest and Kurdish delivery documents describe the same local-first release policy.
- [x] `npm run phase5:verify` is included in the source verification chain before static runtime build.

## Build gate
Run `npm run vercel:build`. The build verifies the official local hand model, runs all source contracts, produces the self-hosted MediaPipe assets, then checks the generated output.

## Manual smoke test
After deployment, open Settings > About and confirm `v6.4.0` plus `air-drow-v640-phase5-release-readiness`. Draw with touch, open the camera only when needed, test a short pinch stroke and export a PNG/SVG.
