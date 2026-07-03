# AIR-DROW v7.5.2 — Runtime & Storage Reliability Hotfix

This update fixes two production issues reported from Android Chrome:

- **Hand tracking:** the self-hosted MediaPipe runtime could not compile WebAssembly because the production Content Security Policy did not allow `wasm-unsafe-eval`. This release adds only the narrow WebAssembly allowance; general JavaScript `unsafe-eval` remains blocked.
- **Project Gallery:** the gallery was being opened while the Draw workspace booted. It now loads only when Projects is opened. Local storage also has a non-destructive browser fallback if IndexedDB is unavailable, slow, or locked by another tab.

No existing IndexedDB project is deleted by this recovery path.
