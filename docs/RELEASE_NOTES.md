# AIR-DROW release notes

## v8.2.0 — Visual Guidance & Persistent Settings Refinement

The App readiness panel now checks a temporary canvas, PNG/JPG encoding and local file preparation without asking for camera permission, downloading a file, reading your artwork or sending a report. This is intentionally a browser preflight, not a false claim that an Android camera driver or download sheet has been tested.

# AIR-DROW v8.2.0 — Visual Guidance & Persistent Settings Refinement

This release closes the code-side release-readiness phase. It does not pretend that automated code checks can replace a physical Android camera test; instead, it makes the deployed build identity and final device checklist explicit and verifiable.

## Fixed

- The HTML shell referenced inconsistent older CSS/manifest cache keys. All shipped static resources now use the same `v820` revision.
- The PWA cache shell now pre-caches the same versioned URLs requested by the page, preventing an avoidable first-offline mismatch.
- Release metadata is synchronized across package.json, release.json, source runtime, boot code, PWA manifest, service worker, health endpoint and local asset manifests.
- Documentation no longer claims that a palm or thumb gesture can save or export. Only the guarded two-finger eraser gesture remains available when explicitly enabled.

## Validation added

- `npm run qa:release-readiness` checks the release identity, cache keys, source/build consistency and the safe-hand-action documentation contract.
- `npm test` includes release-readiness regression checks in addition to gesture, export and mobile-safety tests.
- The device checklist is available in English and Sorani Kurdish.

## Physical-device step

After deployment, use the included checklist on the target Android phone. The only unautomatable items are the device-specific camera driver, permission prompt, real hand framing and Chrome download sheet.

## v8.2.0 — Visual Guidance & Persistent Settings Refinement

Live hand guidance is now a complete configurable 21-landmark feedback layer, separate from artwork and exports. Palette visibility is synchronized after camera startup; guide controls persist locally; Reset Settings resets preferences only after confirmation; Kurdish mobile creator cards are compacted.

