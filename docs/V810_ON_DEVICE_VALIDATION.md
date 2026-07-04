# AIR-DROW v8.1.0 — On-device Launch Validation

## Objective

Turn the last release step into an honest, privacy-preserving browser check. Automated source QA can validate code and generated files, but it cannot pretend to operate a specific Android camera, permission sheet or browser download UI.

## Added to Settings → About App → App readiness

The local readiness check now verifies the following without opening the camera, triggering a download, reading the active artwork or sending a report:

- Secure-context availability and camera API capability.
- Same-origin local hand model availability.
- Local storage capacity, PWA registration, graphics context and same-origin release reachability.
- A temporary 16 × 16 canvas can draw pixels correctly.
- The browser can encode that temporary canvas to both PNG and JPEG blobs.
- The browser can prepare and revoke a local object URL for a future user-initiated file save.

The probe is discarded immediately. It never uses project pixels, camera frames, hand landmarks or personal metadata.

## Deliberate boundary

`Local file preparation` verifies that AIR-DROW can prepare a file. It does **not** claim the Android browser download sheet has opened. Confirm the real browser download separately by using the normal Export button after you draw a visible mark.

Likewise, `Camera API` confirms only that the browser exposes the camera interface. A physical user must still open Camera, approve permission, show one hand and run **Hand drawing check** to validate the device camera and real-time tracking.

## Automated gates

- `npm run qa:launch-validation`
- `npm test`
- `npm run verify:all`

## Release gate

A GitHub release tag should be created only after the targeted phone passes both the automated build and the relevant items in `docs/DEVICE_VALIDATION_CHECKLIST.md`.
