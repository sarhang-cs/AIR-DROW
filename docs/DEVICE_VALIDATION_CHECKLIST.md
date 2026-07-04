# AIR-DROW — Android Device Validation Checklist

Use this checklist **after deploying the exact release**. It is a real-device validation tool, not a marketing checklist. Run it in Android Chrome from the deployed Vercel URL.

## Before camera

- [ ] Open the deployed URL once, then refresh once. Confirm the visible app version in **Settings → About App** is the current release.
- [ ] Run **Settings → System → App readiness**. It should report the secure context, camera API, local model, storage, PWA, graphics, network, temporary drawing surface, PNG/JPG encoding and local file preparation. The check must not open the camera or download a file.
- [ ] Tap the toolbar, bottom dock, Settings tabs, top palette area and modal backdrop. None of those taps may create a drawing stroke.
- [ ] Draw one manual stroke, undo it, redo it, and verify the result remains inside the canvas.

## Camera and hand

- [ ] Choose **Open Camera**. Permission must be requested only now, not when the app first opened.
- [ ] Allow the camera. Wait until the local hand engine reports it is ready, then show one hand.
- [ ] Draw with a controlled index/thumb pinch for 20 seconds. Move the hand out of frame briefly and back. No long jump line may appear.
- [ ] Cross the toolbar, dock, palette and Settings areas with the tracked hand. No button, download, clear, export or tab change may be triggered by hand coordinates.
- [ ] Enable gesture shortcuts only if you want them. Hold up two fingers and confirm only **Hand Eraser** toggles. No file action may occur.
- [ ] Hover the index over a palette color for the required dwell time. Confirm a color changes only after the dwell and no stroke is created under the palette.

## Export and offline

- [ ] Draw a visible test mark. Tap **Save/Export** with a real finger. Export PNG and JPG.
- [ ] Open both downloaded files. Each must contain the artwork, not only a background. UI, camera feed, hand guide and skeleton must not appear in the files.
- [ ] With the first load complete, switch the phone offline, refresh once, and reopen the app. The drawing studio should still load; the hand model may be fetched only after Camera is selected and cached.
- [ ] Reconnect, deploy an update, reopen the URL and confirm the update banner or current version changes cleanly without a black screen or endless loading.

## Report

Use **Settings → System → App readiness** and **Camera & Hand Check** to copy local reports. The report is intended for debugging and excludes artwork, camera frames, landmarks, project titles and API URLs.

A release is ready to tag only when every relevant checkbox passes on the target phone.
