<a id="top"></a>

<div align="center">

# AIR-DROW

### Draw with touch, pen and hand

**SARHANG IO · 2026 · 7.5.6 Input, Language & Hand Startup Edition**

[![Private by default](https://img.shields.io/badge/Private-by%20default-7C5CFF?style=for-the-badge)](./docs/PRIVACY.md)
[![Touch, Pen & Hand](https://img.shields.io/badge/Draw-Touch%20%7C%20Pen%20%7C%20Hand-18C8F5?style=for-the-badge)](#ways-to-draw)
[![PWA](https://img.shields.io/badge/Installable-PWA-2EA44F?style=for-the-badge)](#install-air-drow)
[![Kurdî & English](https://img.shields.io/badge/Languages-Kurd%C3%AE%20%26%20English-F4B400?style=for-the-badge)](#language)

</div>

---

## Production verification

This release is verified through the production gate below. The gate checks source integrity, the local hand model, generated MediaPipe deployment files, bilingual dictionaries, lazy camera asset loading, and release metadata. Camera behavior must still be tested on the target Android devices after deployment because browser camera permissions and GPU paths are device-specific.

## What changed in 7.5.6

- **Complete runtime localization:** changing between Kurdî and English now re-renders dynamic readiness cards, hand-check results, calibration guidance, status labels and recovery text. A selected language no longer leaves inherited text from the previous language on screen.
- **One dictionary contract:** Kurdish and English contain the same verified key set, including calibration and camera feedback. A missing translation cannot silently fall back to the opposite language.
- **Six paired visual themes:** Violet, Pink, Sapphire, Obsidian, Silver and Gold each have separately tuned dark and light palettes, matching surfaces, accessible text and state colors.
- **Icon contrast protection:** navigation, toolbar, scanner and status icons inherit contrast-safe theme tokens; active icons remain visible in both modes.
- **Android input & interaction polish:** real text fields request focus on the first tap; browser text selection, Copy/Share/Translate/Search callouts and blue tap highlights are blocked across every non-editable studio surface, including onboarding.
- **Honest hand startup:** AIR-DROW waits while the local MediaPipe runtime and model load, then asks you to put a hand in view only after the engine is ready.
- **Saved calibration confirmation:** successful four-target calibration confirms that it was saved, remains visible briefly, then closes with a calm exit animation.
- **Transactional Termux replacement:** the installer preserves `.git`, makes a backup, validates the build, pushes only after verification, and restores the old project if a build fails.

## Ways to draw

### Touch and pen
Open AIR-DROW and start drawing immediately. Use the brush, choose a color, adjust the size, and undo or redo whenever you need.

### Hand drawing
Select **Hand** or **Camera**, allow camera access when asked, then keep one hand visible. Bring your fingers close together and move to draw. AIR-DROW never opens the camera by itself; you always choose when the camera starts.

### Shape assistance
Turn on shape assistance when you want cleaner lines, circles, rectangles or triangles. You still control every stroke.

## Privacy first

- Drawings, projects and preferences remain on your device by default.
- Camera permission is requested only after you choose to open Camera.
- Camera video is used for the live hand tool and is not saved by AIR-DROW.
- The hand model and runtime are delivered with the app from the same origin; no third-party hand-model CDN is used.
- App readiness and Hand drawing check run locally and do not send a report anywhere.
- Optional AI creation is an explicit action. Keep `AIRDROW_AI_ENABLED` disabled unless you have configured a controlled server deployment.

Read the full [Privacy Guide](./docs/PRIVACY.md).

## Install AIR-DROW

| Device | How to install |
| --- | --- |
| Android / Chromium browsers | Open the browser menu and choose **Install app** or **Add to Home screen** |
| iPhone / iPad | Use **Share → Add to Home Screen** in Safari |
| Desktop | Use the install icon in the address bar when your browser offers it |

## Language
Open **Settings → About App** and choose **Kurdî** or **English**. AIR-DROW keeps your language choice on the current device, including the boot recovery screen.

## Release verification
```bash
npm ci --no-audit --no-fund
npm run vercel:build
```

The production gate verifies local model integrity, local MediaPipe output, source/build order, bilingual dictionaries, lazy camera loading, AI endpoint protections and release metadata.

## Termux replacement
Use [`termux/TERMUX_INSTALL.txt`](./termux/TERMUX_INSTALL.txt). The installer preserves `.git`, makes a rollback backup, installs exact dependencies, verifies the production build, commits and pushes. If verification fails, it restores the previous project automatically.

---
<div align="center">Made for ideas in motion · **AIR-DROW** · [Back to top](#top)</div>
