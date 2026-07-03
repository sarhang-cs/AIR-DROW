# AIR-DROW v6.1.0 — Phase 2 QA Report

## Scope
- Premium workspace layout for mobile, tablet and desktop.
- Explicit Dark/Light choice plus six full UI skins.
- RTL/LTR-safe Settings drawer controls, labels, arrows and switch geometry.
- Transparent FPS, Online and CAM overlays.

## Automated gates
- `npm run ui-phase2:verify` validates the Phase 2 markup, translations, runtime binding, stylesheet and service-worker cache entry.
- Existing source, icon, local hand model and generated-runtime gates continue to run through `npm run vercel:build`.

## Manual device checks after deploy
1. Open Settings on a narrow Android phone and make sure toolbar controls scroll rather than clip.
2. Switch Dark/Light and all six skins; verify the choice stays after refresh.
3. Change Kurdish/English and confirm drawer title, selectors and arrows do not overlap.
4. Confirm FPS, Online and CAM labels are visible with no background surface.
