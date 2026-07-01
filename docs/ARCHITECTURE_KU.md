# Phase 23 Architecture

## Browser application (Vite)
- `data-vault.js`: IndexedDB, integrity hash, reload mirror, outbox.
- `api-client.js`: timeout, safe retry policy, API errors, project push/pull.
- `interaction-guard.js`: focused interaction lock, long press quick menu, canvas-only selection/callout prevention.
- `touch-engine.js`: touch, stylus pressure, two-finger pan/zoom and coalesced pointer events.
- `hand-engine.js`: MediaPipe hand landmarker with smoothing and pinch hysteresis.
- `main.js`: canvas UI, save lifecycle, cache controls and sync.
- `public/sw.js`: versioned same-origin PWA cache policy.

## Python backend
- FastAPI
- SQLite via Python standard library
- optional bearer token
- revision conflict protection
- constrained CORS policy
- WebSocket relay with payload/message limits

## Additional frameworks/languages
- **TypeScript**: recommended future conversion for compile-time type checks.
- **Python/FastAPI**: good for API, validation, automation, databases and future ML jobs.
- **SQL**: server/database only.
- **WebGL/WebGPU/Three.js**: only after profile data shows that 3D/GPU rendering is needed.
- **WebAssembly**: only for a measured compute bottleneck.
- **OpenGL** and **DirectPlay**: not direct browser frameworks; web apps use WebGL/WebGPU and WebSocket/WebRTC patterns instead.


## Phase 23 Motion Skin Layer
- `lottie-web` renders the internal SVG Lottie logo JSON.
- Skin preference record is stored under `meta/phase23-motion-skin` in IndexedDB.
- CSS custom properties manage blur, radius, motion and skin colors.
