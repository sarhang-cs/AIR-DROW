# AIR-DROW v8.3.2 — Layout & Legacy Runtime Hardening

## Delivered
- The About grid now gives the Touch / Pen / Hand card a wider column. In Sorani it is deliberately placed on the left and the version card stays compact on the right.
- The Settings drawer returns to its top position when it is newly opened, avoiding a clipped middle-of-card starting state.
- The source no longer relies on `structuredClone()` or `Array.prototype.at()` in active drawing, shape, replay, challenge, or loading paths. Local fallbacks protect older WebKit browsers.
- The v7.6.2 full hand-guide presentation is retained. Export isolation, physical-only file actions, local diagnostics, and the legacy MediaPipe CSP policy remain unchanged.

## Validation
- Static source, localization, cache identity, hand runtime, export safety, legacy WebKit, layout/runtime, and automated tests are all checked by `npm run verify:all`.
- The included Termux installer replaces the project transactionally and preserves the existing local Kurdish UI font from the repository.
