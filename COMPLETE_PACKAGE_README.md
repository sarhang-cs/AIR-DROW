# AIR-DROW Complete Package

This package contains the complete **AIR-DROW v7.3.0 User Icon Edition**.

It includes the full app source, the local hand-drawing model, MediaPipe runtime files, fonts, icons, the ready-to-deploy app output, and user guides in Kurdish and English.

## Start here

- `README.md` — English overview
- `README_KU.md` — ڕێنمایی کوردی
- `docs/USER_GUIDE.md` and `docs/USER_GUIDE_KU.md` — everyday drawing, saving and hand-drawing help
- `docs/PRIVACY.md` — privacy information

## What works locally

Touch drawing, pen drawing, saved projects, backups, exports, the optional hand tool, and the app checks all run inside the browser. AIR-DROW opens the camera only when the person using the app chooses Camera.

The full local hand model and runtime are included, so hand drawing does not need to download its model while the app is running.

## Installing this package

Use the included `termux/replace-with-ui-clarity.sh` installer through the one-copy Termux command provided with the release. It keeps the GitHub connection, creates a backup first, checks the full app before pushing, and restores the previous project if the check cannot finish.

`node_modules` is not included because it is recreated from the locked package list during installation.


## User icon package

This complete package contains the full icon tree supplied in `web.zip`. The previous icon tree was removed before it was installed. `web/assets/icons/USER_ICON_PACKAGE.json` records every imported icon file and its SHA-256 integrity value.
