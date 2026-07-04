# AIR-DROW v7.7.1 — Critical Input & Export Recovery

This stability release resolves the Android issues observed during live hand-drawing tests.

- A tracked hand can no longer save, export, share or download any file.
- PNG, JPG and WebP now use the isolated visible-artwork canvas after a synchronous final paint, preventing background-only exports.
- The top color palette is hidden outside live Hand mode, requires a longer hover dwell and cannot be drawn through.
- Hand skeleton feedback is off by default and remains outside saved artwork.
- Kurdish RTL typography and the About panel have mobile-specific sizing and spacing.

The two-finger eraser remains available only when gesture shortcuts are explicitly enabled.
