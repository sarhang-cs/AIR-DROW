# AIR-DROW v6.2.0 — Phase 3 Runtime Consistency

This full replacement source package corrects an internal Phase 3 release-contract mismatch.

- The app runtime, preload resource, model manifest, source verifier, and release documentation now use the same local model URL query:
  `/vendor/models/hand_landmarker.task?model=v620-hand-drawing`
- The deployed browser remains local-first: it does not download a hand model or MediaPipe runtime from a CDN at runtime.
- The official `hand_landmarker.task` remains intentionally excluded from this source ZIP. The supplied Termux replacement command preserves the exact already-verified model from the current repository before running the production build.

Targeted source checks passed before packaging:
- `verify-hand-runtime-source`
- `verify-hand-sync-performance`
- `verify-phase3-hand-drawing`
- JavaScript and MJS syntax checks
