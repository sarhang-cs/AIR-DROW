# AIR-DROW v8.3.1 — Legacy WebKit Compatibility

## Resolved issue
Older WebKit/Safari variants can treat local WebAssembly compilation as `unsafe-eval`, even when the app already permits the modern, narrower `wasm-unsafe-eval` directive. That caused the local MediaPipe hand engine to fail before detection began.

## Fix
- The production Content Security Policy now carries both `wasm-unsafe-eval` and the legacy WebKit compatibility token `unsafe-eval` inside `script-src`.
- AIR-DROW still loads only self-hosted scripts, WASM, and the local hand model; no CDN runtime was introduced.
- Raw CSP/WebAssembly exceptions are retained only in the local Diagnostics report. The mobile recovery card shows a clear, translated compatibility message instead.
- The release identity is bumped to `v8.3.1 / v831` so the service worker and static asset cache refresh cleanly after deployment.

## Security boundary
The additional token is a compatibility concession for old WebKit. AIR-DROW does not use `eval`, `new Function`, remote script sources, or user HTML injection paths.
