# AIR-DROW v7.5.4 — Calibration Reality & QA

- Hand calibration now captures only when the hand is inside each highlighted target; a stable hand in one place cannot produce a fake 1/4 → 4/4 pass.
- Completed calibration is persisted immediately in local browser storage and the current project, with serialized saves to prevent stale writes.
- Text selection, Copy, Search and Translate callouts are locked across onboarding, boot, recovery and every other studio overlay.
- The MediaPipe sourcemap 404 is removed from deployment output; generated non-failure diagnostics are isolated without hiding genuine errors.
- Network status and readiness checks use live same-origin probes instead of only navigator.onLine/API presence.

## v7.5.4 — Calibration Reality & QA

- Locks interface text selection, long-press browser callouts and Android blue tap highlights without blocking actual text-entry fields.
- Replaces scanner status-mask icons with inline SVG marks so success, warning and problem states remain visible in Android Chromium.
- Keeps a successful hand check on screen long enough to read, then exits with a polished completion animation.

# AIR-DROW v7.5.4 — Calibration Reality & QA

This update fixes two production issues reported from Android Chrome:

- **Hand tracking:** the self-hosted MediaPipe runtime could not compile WebAssembly because the production Content Security Policy did not allow `wasm-unsafe-eval`. This release adds only the narrow WebAssembly allowance; general JavaScript `unsafe-eval` remains blocked.
- **Project Gallery:** the gallery was being opened while the Draw workspace booted. It now loads only when Projects is opened. Local storage also has a non-destructive browser fallback if IndexedDB is unavailable, slow, or locked by another tab.

No existing IndexedDB project is deleted by this recovery path.
