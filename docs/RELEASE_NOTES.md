# AIR-DROW release notes

## v7.6.2 · Layout & Input Integrity

- Rebuilt the **About App** profile layout for phone screens: app facts, developer profile and QR action now use compact, balanced side-by-side cards.
- Fixed the pointer-routing defect where workspace controls could start a stroke in the canvas behind the visible UI. Toolbar, workspace dock, drawer and backdrop are now explicit protected control surfaces.
- Removed the conflicting About-card overrides that had accumulated in the production stylesheet and kept one responsive source of truth.
- Synchronized version/build/cache identifiers, translated release copy, Termux installer metadata and documentation references.
- Replaced the GitHub screenshots with two local cover-style visuals created from genuine AIR-DROW app screens.

## v7.6.1 · Interaction & Vision Tutorial

- Introduced the local hand tutorial, QR developer profile and verified local hand runtime.
