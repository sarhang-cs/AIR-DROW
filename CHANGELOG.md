# AIR-DROW v6.1.0 — Phase 2: Premium UI, RTL & Mobile Layout

- Added a mobile-first premium UI layer with a safe-area Settings bottom sheet and a clean desktop side workspace.
- Added explicit Dark / Light selection in Settings while preserving the top toolbar quick-toggle.
- Refined all six complete interface skins: Violet, Pink, Sapphire, Obsidian, Silver and Gold.
- Hardened RTL/LTR layout for labels, select arrows, toggles, drawer title and section summaries.
- Made narrow-screen toolbar controls horizontally reachable instead of clipped or reduced to tiny buttons.
- Preserved text-only FPS, Online and CAM overlays with no background card, border or blur.

---

# AIR-DROW v6.0.2 — Phase 1: Foundation Hardening

- Added canonical Phase 1 release metadata (`version`, `buildId`, `assetRevision`, `phase`) and synchronized it across runtime, service worker, manifests, health endpoint and verifiers.
- Changed Vercel installation to deterministic `npm ci --no-audit --no-fund`.
- Added explicit `vercel:build`, `model:ensure`, `model:verify`, `verify:all` and `foundation:verify` gates.
- Strengthened generated MediaPipe runtime validation for JS/WASM variants and the local model output.
- Hardened build-time model fallback retries; browser runtime remains strictly same-origin local.

---

# AIR-DROW v5.2.3 — Fist Guide Continuity Fix

## Fixed
- The visible hand skeleton is now independent from the stricter open-hand eligibility gate used for safe pinch drawing.
- A confidently detected closed fist keeps its landmark links and nodes visible instead of hiding the guide.
- A bounded 260 ms guide hold covers a brief detector miss caused by finger occlusion or fast closing motion.
- Closed-fist tolerance is applied only to detection; drawing, pinch, stability and jump protection remain unchanged.
- The transparent `FPS`, `Online` and `CAM` status overlays remain text-only with no background, border or blur surface.

## Deploy
Run `npm run build`, commit the source, and push to GitHub. The linked Vercel project deploys automatically.

## v5.2.3 — Release Verification Recovery Fix

- Fixed a packaging defect where the final-release checker accidentally read the closed-fist verifier twice instead of validating the transparent status-HUD contract.
- The dedicated transparent HUD verifier is now wired into source checks, Termux replacement checks, and final-release validation.
- No drawing, camera, hand-tracking, or gesture behavior was removed or weakened.

