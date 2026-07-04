# AIR-DROW v8.5.0 — Settings + Kurdish Responsive Polish

## Scope
- Added a Settings home with direct navigation for everyday Camera & Hand, Appearance and Display controls.
- Grouped Live Info and System & Data under an explicit advanced/data route without hiding any existing setting.
- Added a local-save notice: preferences remain on the device and are persisted through the existing project store.
- Improved mobile Kurdish line-height, minimum reading sizes and overflow handling for settings labels, helper text and reset copy.
- Made the Settings tab deterministic: reselecting Settings returns to the top and opens the first focused card.
- Expanded reset confirmation so users can see that drawings, history, projects and gallery are preserved.

## Safety boundary
This phase does not change canvas drawing, camera permissions, MediaPipe loading, trusted export/save gates or reset data boundaries. Reset continues to alter preferences only.
