# AIR-DROW — Release notes

## v7.6.0 · Final Clean Delivery

This release finalizes the source package and GitHub presentation without changing the privacy-first behavior of the drawing studio.

- **GitHub-ready README:** Includes two real screenshots from the app, a concise feature overview, build instructions and privacy summary.
- **Developer profile:** Settings → About App now includes Sarhang Salah / سەرهەنگ سلاح plus a direct `@sarhang.io` Instagram profile link and scannable local QR code.
- **Stable local state:** Existing onboarding and completed calibration state migrate into neutral persistent keys, avoiding a reset when future release IDs change.
- **Clean release inventory:** Removed unused README concept artwork and synchronized every release, package, icon, asset and installer identifier to v7.6.0.
- **Quality gates:** Production verification now covers screenshot documentation, the developer QR asset, bilingual dynamic UI, real hand-calibration behavior, theme contracts and local model integrity.

## Device testing note

Camera permission, GPU/WebGL behavior and hand detection still depend on the target browser and device. Test Camera & Hand on the intended Android phone after each production deployment.
