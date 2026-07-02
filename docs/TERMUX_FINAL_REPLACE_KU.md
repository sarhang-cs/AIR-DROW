# AIR-DROW v5.2.1 — Termux replacement

This repair fixes a release-script validation error that incorrectly required the official Google HandLandmarker task asset to begin with a generic ZIP header.

Use the top-level `termux/replace-with-final-release.sh` script after extracting the archive. The script backs up the existing `$HOME/AIR-DROW`, downloads and validates the exact official asset using byte size + SHA-256, builds the self-hosted MediaPipe runtime, and restores the prior project if any command fails.


## v5.2.1 status overlay note
FPS, Online and CAM are source-defined transparent text overlays with no background panel.
