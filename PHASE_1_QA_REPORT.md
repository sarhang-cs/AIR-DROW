# AIR-DROW v6.0.2 — Phase 1 QA Report

## Scope completed

- Canonical release metadata: version, build ID, asset revision and phase are synchronized in package metadata, runtime configuration, service worker, manifests and health endpoint.
- Deterministic Vercel installation: `npm ci --no-audit --no-fund`.
- Hardened deployment command: `npm run vercel:build` ensures the model, verifies source, builds the self-hosted MediaPipe runtime and verifies generated output.
- Generated runtime verification now covers `vision_bundle.js`, internal WASM, module WASM, non-SIMD WASM and the local task model.
- Browser runtime remains same-origin local: no deployed browser request is allowed to load a remote MediaPipe runtime or hand model.
- Termux replacement has rollback protection: the current project is restored if install, build or verification fails.

## Completed verification in this package environment

- Every `.js` and `.mjs` source file passed `node --check`.
- Preflight, foundation, source module, PWA/update, UI/RTL, premium visual, transparent HUD, shape, workspace, loading, performance, hand-sync, fist-guide, calibration, hand-tracking, export/onboarding, polish, stability and drawer contract checks passed.
- Shell syntax check passed for `termux/replace-with-final-release.sh`.

## Known packaging condition

The exact official `web/vendor/models/hand_landmarker.task` (7,819,105 bytes) could not be included by this build environment because it has no network route to the official Google asset. This is not replaced with a dummy file.

For a full build, `npm run vercel:build` uses `npm run model:sync` as a checksum-verified build-time fallback. Once it succeeds on Termux or Vercel, the verified task file is created locally, copied into `public/vendor/models`, and can be committed to GitHub. The final Phase 5 ZIP will include the exact task asset directly.

## v6.0.2 verification-integrity correction

The Camera/UI verifier now aligns with the active local GPU-first and CPU fallback bootstrap strategies. The invalid `local-url-default` expectation was removed.
