## v7.5.3 — Interaction & Hand Scan Polish

- Locks interface text selection, long-press browser callouts and Android blue tap highlights without blocking actual text-entry fields.
- Replaces scanner status-mask icons with inline SVG marks so success, warning and problem states remain visible in Android Chromium.
- Keeps a successful hand check on screen long enough to read, then exits with a polished completion animation.

# AIR-DROW v7.5.3 — Interaction & Hand Scan Polish

This update fixes two production issues reported from Android Chrome:

- **Hand tracking:** the self-hosted MediaPipe runtime could not compile WebAssembly because the production Content Security Policy did not allow `wasm-unsafe-eval`. This release adds only the narrow WebAssembly allowance; general JavaScript `unsafe-eval` remains blocked.
- **Project Gallery:** the gallery was being opened while the Draw workspace booted. It now loads only when Projects is opened. Local storage also has a non-destructive browser fallback if IndexedDB is unavailable, slow, or locked by another tab.

No existing IndexedDB project is deleted by this recovery path.
