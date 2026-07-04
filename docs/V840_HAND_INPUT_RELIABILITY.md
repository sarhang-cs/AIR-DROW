# AIR-DROW v8.4.0 — Hand Input Reliability

## Scope
This phase hardens hand drawing before adding more features. It is deliberately focused on reliable input rather than new UI tools.

## Changes
- A new intent gate requires a stable open hand, a confirmed pinch, and a small deliberate movement before a hand stroke is committed.
- Pinch thresholds are stricter in the default Balanced profile, with profile-specific arming and movement rules.
- A temporary tracking loss now pauses an active stroke, then requires a deliberate re-pinch before it resumes. This prevents a released pinch from becoming a ghost line after recovery.
- The live guide fades after a short 260 ms hold rather than persisting as a frozen skeleton.
- The mobile scan card is smaller, stays near the top, and dismisses faster after a successful detection.

## Boundaries
- The hand guide remains camera-only and is never included in PNG/JPG/WebP/SVG/PDF exports.
- Save, export, clear and share remain physical-tap-only actions.
- Actual camera compatibility still requires validation on real Android and Safari devices.
