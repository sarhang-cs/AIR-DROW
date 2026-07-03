# AIR-DROW v6.2.0 — Phase 3 QA Report

## Scope
- Velocity-aware hand stabilizer and bounded fingertip prediction.
- Lower-latency hand stroke sampling without weakening pointer drawing.
- Pinch hysteresis and jump rejection.
- Bounded closed-fist / occlusion stroke continuity.
- Visible guide retention and calibrated hand eraser targeting.

## Automated gate
- `npm run hand-phase3:verify` validates deterministic tracking, pinch, continuity, fist detection and jump rejection.
- `npm run vercel:build` confirms the local model, all source contracts and generated self-hosted MediaPipe output.

## Device test checklist
1. Open camera and wait for the scan state to show a detected hand.
2. Move the index fingertip slowly and quickly; ink should stay close to the fingertip without jitter or a long trailing delay.
3. Pinch and draw a long continuous stroke; briefly make a fist or cause a short occlusion. The existing line must remain and resume only after safe tracking returns.
4. Move the hand suddenly across the frame; no bridge line must be painted.
5. Select Hand Eraser; the target must follow the calibrated fingertip and erase only while pinch is confirmed.


## Runtime source consistency hotfix
- Verified that the runtime, preload resource, model manifest, build verifier, and release documentation use the identical local URL query: `hand_landmarker.task?model=v620-hand-drawing`.
