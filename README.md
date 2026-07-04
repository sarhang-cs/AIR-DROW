<a id="top"></a>

## v8.6.0 — All-Feature Device QA

Settings now opens with a focused quick-navigation panel: everyday Camera & Hand, Appearance and Display controls are separated from Live Info and System & Data. Sorani Kurdish reading rhythm, mobile wrapping and reset scope are clearer, while settings remain automatically saved on the device. See [the phase report](docs/V850_SETTINGS_KURDISH_RESPONSIVE_POLISH.md).

## v8.6.0 — Hand Input Reliability

Hand drawing now requires a stable open hand, a confirmed pinch and a small deliberate movement before ink starts. A short tracking loss pauses ink and requires a re-pinch before it can continue, avoiding ghost lines after recovery. The live guide fades quickly and the phone scanner is more compact. See [the phase report](docs/V840_HAND_INPUT_RELIABILITY.md).

<div align="center">

# AIR-DROW

### A private drawing studio for touch, pen and hand

**All-Feature Device QA Edition · v8.6.0 · Created by Sarhang Salah**

[![Private by default](https://img.shields.io/badge/Privacy-On--device-7C5CFF?style=for-the-badge)](./docs/PRIVACY.md)
[![Draw methods](https://img.shields.io/badge/Draw-Touch%20%7C%20Pen%20%7C%20Hand-18C8F5?style=for-the-badge)](#ways-to-draw)
[![Bilingual](https://img.shields.io/badge/Languages-Kurd%C3%AE%20%26%20English-F4B400?style=for-the-badge)](#language--themes)
[![PWA](https://img.shields.io/badge/Installable-PWA-2EA44F?style=for-the-badge)](#install)

</div>

---


## v8.3.2 — Layout & Legacy Runtime Hardening

- Wider About metadata layout for Touch / Pen / Hand.
- Deterministic Settings entry and WebKit-safe clone/last-item fallbacks.
- See `docs/V832_LAYOUT_LEGACY_RUNTIME_HARDENING.md`.


## Screenshots

<table>
  <tr>
    <td width="50%" align="center"><img src="./docs/screenshots/air-drow-studio-en.png" alt="AIR-DROW studio promotional cover built from a genuine app screen" width="100%" /><br /><sub>Studio cover · Touch, pen & local projects</sub></td>
    <td width="50%" align="center"><img src="./docs/screenshots/air-drow-hand-en.png" alt="AIR-DROW hand-drawing tutorial cover built from a genuine app screen" width="100%" /><br /><sub>Tutorial cover · Camera opens only by choice</sub></td>
  </tr>
</table>

## What AIR-DROW does

AIR-DROW is a responsive PWA drawing studio designed for touch, pen and optional hand drawing. It keeps projects, preferences, calibration and exports on the device by default. Hand tracking uses a verified local MediaPipe runtime and model; the camera is never opened until the person explicitly chooses it.

- Draw with touch, pen, brush, eraser and shape assistance.
- Open Camera only when you choose Hand drawing.
- Save local projects, export PNG/JPG/WebP/SVG/PDF artwork and make a local backup.
- Switch the complete UI between **Kurdî (Sorani)** and **English**.
- Choose from Violet, Pink, Sapphire, Obsidian, Silver and Gold—each with its own tuned dark and light palette.

## Ways to draw

**Touch and pen.** Open AIR-DROW and draw immediately. Brush size, smoothing, color, pressure, undo and redo are available from the studio.

**Hand drawing.** Open Camera, wait for the local hand engine to become ready, then place one hand in view. Pinch index and thumb to draw. Hover the index finger over the protected top palette to pick a color. Hold up two fingers to toggle Hand Eraser. If the hand leaves the frame or tracking becomes unstable, AIR-DROW holds or pauses the stroke safely instead of creating a jump.

**Shape assistance.** Use shape assistance for cleaner lines, circles, rectangles and triangles while keeping direct control of every stroke.

## Privacy

- Drawings, projects, preferences and calibration remain on the current device by default.
- Camera permission is requested only after **Open Camera** is selected.
- Camera frames are used for live hand tracking and are not saved.
- The hand model and runtime are served from AIR-DROW itself—no third-party model CDN is used.
- App checks and diagnostics run locally and do not send a report to an external service. Diagnostics exclude drawing points, camera frames, hand landmarks, project titles and API URLs.
- Optional AI creation stays disabled until you explicitly configure a controlled server deployment.

Read the full [Privacy Guide](./docs/PRIVACY.md).

## Language & themes

Open **Settings → About App** to switch between Kurdî and English. Runtime cards, calibration guidance, camera messages and recovery notices are re-rendered immediately in the selected language.

Open **Settings → Appearance** to choose dark or light mode and one of the six visual themes. Each palette has contrast-safe text, controls and icons for reliable visibility.

## Developer

**App created by Sarhang Salah**

Instagram: [@sarhang.io](https://www.instagram.com/sarhang.io/) · Scan the QR code in **Settings → About App** to open the profile on a phone.

## Install

| Device | Install method |
| --- | --- |
| Android / Chromium browsers | Open the browser menu and choose **Install app** or **Add to Home screen** |
| iPhone / iPad | Use **Share → Add to Home Screen** in Safari |
| Desktop | Use the install icon in the browser address bar when available |

## Build and deploy

```bash
npm ci --no-audit --no-fund
npm run vercel:build
```

The production gate validates local hand-model integrity, generated MediaPipe runtime files, bilingual dictionaries, dynamic UI coverage, visual-theme contracts, developer profile assets, screenshot documentation and release metadata.

For Android/Termux replacement, use [`termux/TERMUX_INSTALL.txt`](./termux/TERMUX_INSTALL.txt). The installer keeps `.git`, makes a rollback backup, validates the production build, commits and pushes only after a successful gate.

Before tagging a live deployment, run the in-app App readiness check and complete the [Android Device Validation Checklist](./docs/DEVICE_VALIDATION_CHECKLIST.md). See [Visual Guidance & Persistent Settings](./docs/V831_EXPORT_PREVIEW_SAVE_POLISH.md) for the exact boundary between browser checks and physical-device checks. It is intentionally separate from automated checks because only a real phone can confirm its camera driver, permission prompt and browser download sheet.

---
<div align="center">Made for ideas in motion · <strong>AIR-DROW</strong> · <a href="#top">Back to top</a></div>


## v8.3.2 highlights

- **Export Studio:** PNG, JPG and WebP with 1×, 2× and 4× output, Fit/Fill/Stretch layouts, social presets and A4/A3 300 PPI layouts.
- **Hand gesture controls:** hover an index finger over the top palette to select a color; hold up two fingers to toggle Hand Eraser. No hand pose can save, export, clear, share or download a file; those actions require a real on-screen tap.
- **Reliable drawing:** velocity-adaptive smoothing reduces tremor. When no hand is detected or a hand leaves the frame, the app pauses/holds safely rather than creating a jump stroke.
- **Private diagnostics:** Camera, hand engine and export failures can be copied or downloaded as a local report. It excludes artwork, camera frames, landmarks, project titles and API URLs.
- **On-device launch validation:** Settings → About App → App readiness now checks a temporary canvas, PNG/JPG encoding and local file preparation without opening the camera or downloading a file. Real camera permission and the Android download sheet still require a physical phone test.


## v8.3.2 on-device launch validation

This release adds a private on-device preflight: it verifies a temporary drawing surface, PNG/JPG encoding and local file preparation without opening the camera, downloading a file, reading your artwork or sending a report. It keeps the real Android camera and browser download confirmation clearly separate, so final release claims remain honest.

## v8.3.2 — Visual Guidance & Persistent Settings

- Full, configurable live hand guide on the non-exported camera feedback layer.
- Hand palette re-sync after live camera startup.
- Persistent guide opacity/thickness controls and an explicit settings-only reset.
- Compact Kurdish mobile About/Instagram card typography.

See [`docs/V831_EXPORT_PREVIEW_SAVE_POLISH.md`](docs/V831_EXPORT_PREVIEW_SAVE_POLISH.md).


## v8.3.2 compatibility
Older Safari/WebKit variants now receive the CSP compatibility needed for local MediaPipe WebAssembly. After deployment, reopen the app once so the v832 service worker and assets replace any old cached copy.
