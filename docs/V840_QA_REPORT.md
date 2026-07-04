# AIR-DROW v8.4.0 QA Report

## Automated checks
- Intent gate unit checks: open-hand arming, blocked early pinch, deliberate movement commit, cancelled stationary pinch.
- Existing export, mobile-safety, localization, release and legacy compatibility checks continue to run.

## Manual device checks still required
1. Open hand for a moment, pinch and move: one deliberate stroke should start.
2. Pinch without the open-hand arm: no stroke should be created.
3. Lose the hand briefly, then open it: the old stroke must not continue until re-pinched.
4. Let the hand leave the frame: the guide must fade away quickly.
5. Confirm the compact scan panel does not cover the active canvas on the phone.
