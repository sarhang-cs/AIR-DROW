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

