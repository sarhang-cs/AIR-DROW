# AIR-DROW local hand model

AIR-DROW now includes its complete hand-tracking task bundle in the repository and release zip. No separate download is required.

```text
web/vendor/models/hand_landmarker.task
```

## Integrity contract

- Size: `7820242` bytes
- SHA-256: `168ca8a3f698e93e2caba5c5e8234c3443e56b2ea3ebacec205e4df33bc899da`
- Bundle entries: `hand_detector.tflite`, `hand_landmarks_detector.tflite`
- Runtime: `@mediapipe/tasks-vision@0.10.35`

Run `npm run model:verify` to verify the exact local file before a build. `npm run build` validates the model, copies it to `public/vendor/models/`, and copies the local MediaPipe runtime to `public/vendor/mediapipe/`.

The bundle is generated from local MediaPipe Hands components and is shipped as part of AIR-DROW. The app does not use a remote model URL or a silent runtime fallback.
