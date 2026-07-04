# AIR-DROW v8.2.0 QA Report

## Static/source validation

- One clear-button physical binding is present.
- Hand palette visibility is synchronized after live camera stream acquisition and on camera reuse/stop.
- Full 21-landmark guide renders on the separate hand canvas.
- Opacity and thickness controls are normalized, rendered in Settings and included in autosave controls.
- Reset Settings restores preference defaults only after confirmation and persists the result without clearing artwork.
- Kurdish creator/Instagram layout has a compact phone breakpoint.

## Required real-device check

Static checks cannot grant a phone camera permission or inspect Android’s actual download sheet. After Vercel deploy, validate camera permission, palette presence, guide sliders, persistence after reopen and PNG/JPG export on the target device.
