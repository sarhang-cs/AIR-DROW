# AIR-DROW v6.3.0 — Phase 4 QA Report

## Scope
- Same-tab recovery journal for the latest valid project state.
- Lifecycle-safe save flushing for `visibilitychange`, `pagehide` and `beforeunload`.
- Export-before-output contract with WebP-to-PNG compatibility fallback.
- Android-safe backup download lifetime.
- Save-gated controlled update application.
- Keyboard, touch-swipe and focus-safe onboarding.

## Automated gate
- `npm run phase4:verify` validates the recovery journal, lifecycle markers, export fallback, update-save contract, service-worker cache coverage, translations and onboarding controls.
- `npm run vercel:build` additionally validates every previous phase and the generated self-hosted MediaPipe output.

## Device test checklist
1. Draw several strokes, immediately background the app, then return. The project should remain visible and the storage status should settle on a timestamped Saved state.
2. Reload during or immediately after a fast drawing session. A newer same-tab protected draft should restore rather than silently losing the latest strokes.
3. Export PNG, SVG, PDF and AIR-DROW project files. On a browser that cannot encode WebP, selecting WebP should download a valid PNG and explain the fallback.
4. Download a backup on Android and wait for the browser download sheet; the download must still start after the current task.
5. Use the update banner. AIR-DROW must save before changing releases. If saving fails, it must stay on the current app and show recovery guidance.
6. Open first-use onboarding on touch: swipe horizontally to navigate, use keyboard arrows if present, and verify focus returns to the prior control when it closes.
