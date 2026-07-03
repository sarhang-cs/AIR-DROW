# AIR-DROW v7.6.1 — Interaction & Vision Tutorial

- Fixed Android Chrome text-entry focus so the virtual keyboard remains open after the first tap.
- Added keyboard-safe viewport handling and removed global inline selection mutations from editable ancestors.
- Improved light-mode camera/hand toolbar contrast and made the hand toolbar icon adaptive to every theme.
- Added a fully local, animated SVG hand-and-camera tutorial with distance, pinch, and smooth-motion guidance.
- Refined real hand skeleton feedback: index and thumb landmarks are highlighted separately with a live pinch tether.
- Reworked the developer QR presentation and standardized the creator credit.

# AIR-DROW v7.6.1 — Final Clean Delivery

## Final source and documentation pass

- Reorganized the release package around a single final source tree: `web/`, `api/`, `scripts/`, `docs/` and `termux/`. Generated `public/` and dependencies remain excluded.
- Removed unused conceptual README artwork and replaced it with two real product screenshots under `docs/screenshots/`.
- Added an About developer profile for **Sarhang Salah / سەرهەنگ سلاح**, including a direct Instagram link and locally served QR code for `@sarhang.io`.
- Preserved existing completed calibration and onboarding state through stable storage keys with a one-time migration from earlier releases.
- Unified release metadata, build identifiers, manifests, Termux installer and verification gates under `v7.6.1`.
- Kept the verified local MediaPipe hand model and runtime, full Kurdish/English runtime rendering and six paired dark/light theme palettes.
