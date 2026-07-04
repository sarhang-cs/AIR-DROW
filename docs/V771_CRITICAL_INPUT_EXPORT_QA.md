# AIR-DROW v7.7.1 — Critical Input & Export Recovery QA

## Reported mobile failures fixed

- **Unexpected downloads from hand tracking:** removed save/export hand poses entirely. File creation now only runs after an actual button tap. The only optional gesture shortcut is a deliberately gated two-finger eraser toggle.
- **Blank PNG/JPG/WebP exports:** raster export now captures the isolated artwork canvas after a synchronous final paint. The toolbar, hand skeleton, camera status and other HTML UI cannot enter the exported file.
- **Drawing through the color palette:** the palette is a hand safe-zone; it blocks drawing under it, uses a 520 ms hover dwell, and hides outside live Hand mode.
- **Oversized hand skeleton:** guide display is opt-in for new and migrated projects. When enabled it is constrained to a quiet opacity.
- **Kurdish Android readability:** dedicated RTL font sizing, line-height, card gaps and About-card dimensions are applied at mobile widths.

## Automated checks

`npm run verify:all` runs source, local MediaPipe/model, localization, runtime, export, critical input and production-output checks. The critical gate verifies that there is no `thumb-up`, `palm`, save or export hand shortcut; that artwork snapshot export is wired to `drawCanvas`; and that safe Kurdish/palette styles are present.

## Manual device check after deploy

1. Enter Hand mode, move a hand around the toolbar and hold it near the top palette. No file should download.
2. Draw a visible line, release the pinch, then save PNG and JPG using the real toolbar/settings control. Each file must contain the drawing but not the skeleton/UI.
3. Switch Kurdish and English, inspect Settings > About App at normal Android zoom, and confirm text is readable without overlap.
4. Turn the hand guide on only if you want landmark feedback; confirm it never appears in exports.
