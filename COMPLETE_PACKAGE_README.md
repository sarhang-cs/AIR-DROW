# AIR-DROW Complete Project Package

This folder contains the final AIR-DROW Global User Edition source package.

- Open `README.md` for the English overview.
- Open `README_KU.md` for the Sorani Kurdish overview.
- Use `docs/USER_GUIDE.md` or `docs/USER_GUIDE_KU.md` for everyday instructions.
- The verified local hand model is included in `web/vendor/models/hand_landmarker.task`.
- The self-hosted MediaPipe runtime files are included in `web/vendor/mediapipe`.
- `node_modules` is intentionally not included; run `npm ci --no-audit --no-fund` to recreate it from `package-lock.json`.
