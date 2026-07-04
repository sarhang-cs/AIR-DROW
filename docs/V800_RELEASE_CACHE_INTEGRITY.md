# AIR-DROW v8.0.0 — Release Cache Integrity QA

## Objective

Ensure that the page shell, ES module graph, PWA manifest, service worker, release JSON, local hand-model URL and static asset cache revision describe the same deployed release.

## Implemented

- Build identity: `air-drow-v800-release-cache-integrity`
- Asset revision: `800`
- PWA start URL: `?build=v800`
- Versioned shell resources: manifest, toolbar icons and all five application stylesheets use `?v=800`.
- Service worker shell cache uses the exact versioned CSS/manifest URLs requested by `index.html`.
- Final-release QA rejects mixed legacy cache markers and false documentation implying that hand gestures can create downloads or destructive actions.

## Automated gates

- `npm run qa:release-readiness`
- `npm test`
- `npm run verify:all`

## Deliberate boundary

No source-level test can claim to prove the camera driver, Android permission sheet, hand framing or browser download sheet on every phone. Use the bilingual device checklist after deployment for those checks.
