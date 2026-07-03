# AIR-DROW v7.5.1 Release Notes

## Startup reliability hotfix

This release repairs a JavaScript declaration collision in the initial inline bootstrap. Because the same constants were declared twice, browsers stopped parsing the startup script before `app.js` was requested. The visible result was the AIR-DROW loading screen stuck at **7%**.

The startup routine is now a single clean script. The production gate additionally extracts and parses every inline script, so this failure mode is rejected during `npm run vercel:build`.

## Deployment behavior

The release build ID is now `air-drow-v751-bootstrap-hotfix`. Deploying this version makes the browser request the corrected HTML and module entry; the service worker continues to use network-first behavior for HTML and JavaScript modules.

## Mobile behavior retained

The app still loads the heavy hand model and MediaPipe runtime only when Camera is explicitly opened. Touch and pen drawing do not wait for camera assets.
