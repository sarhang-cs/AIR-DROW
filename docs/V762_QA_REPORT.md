# AIR-DROW v7.6.2 QA report

## Scope

This release focuses on the phone-sized **About App** layout and on protecting the drawing canvas from UI interaction events.

## Defects found and resolved

1. **Canvas input leaked through workspace controls.** The workspace dock was inside the studio element but was not excluded by the canvas pointer handler. Pressing a dock or toolbar control could therefore begin a hidden stroke before the visible panel opened. The toolbar, workspace dock, drawer and backdrop are now explicit protected control surfaces. Opening Settings also ends any active canvas input.
2. **About App content stacked and grew excessively on mobile.** Multiple legacy About-card CSS overrides competed with each other. The final stylesheet now uses one responsive source of truth: developer information and the QR action sit beside each other, while compact app facts remain balanced below.
3. **Active release references were inconsistent.** Build/cache metadata, installer copy, documentation and localized release notes were synchronized to v7.6.2. Historic v7.6.1 notes are intentionally retained as release history.
4. **GitHub presentation assets were not cover-ready.** The README now uses two 1600×900 cover visuals based on genuine AIR-DROW screens: a studio advertisement cover and a hand-drawing tutorial cover.

## Automated verification

The release was validated with:

```bash
npm run verify:all
```

The completed gate verifies the local hand model and MediaPipe runtime, icon package, preflight metadata, source syntax, localization/theme coverage, canvas/runtime contracts, calibration/reality checks, static production build, deploy build order and final release manifest. No automated verification failure remained at packaging time.

## Deliberate constraints

- The camera remains opt-in; no camera request is made merely by opening the app.
- The two README covers are presentation compositions derived from real AIR-DROW screens, not fabricated product interfaces.
- This report covers the shipped source and automated production gate; physical-device camera behavior still depends on the browser permission state and the user’s device.
