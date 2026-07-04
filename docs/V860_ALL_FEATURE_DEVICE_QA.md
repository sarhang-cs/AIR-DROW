# AIR-DROW v8.6.0 — All-Feature Device QA

This phase adds an on-device **Feature Check** under Settings → System & Data. It validates project-storage round-tripping through a private temporary record, PNG/JPG and WebP encoding, SVG/PDF file routes, save/share capability, PWA registration/cache availability and baseline legacy browser APIs.

The check never opens the camera, requests permission, downloads a file, changes an existing drawing or sends information. The storage probe is deleted in a `finally` cleanup path.

It does not replace real device testing. Camera/hand behavior remains in the separate Camera & Hand Check, and physical iPhone/Android browser behavior must still be confirmed on those devices.
