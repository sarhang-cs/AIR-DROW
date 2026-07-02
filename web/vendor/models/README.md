# Official HandLandmarker asset

`hand_landmarker.task` is intentionally **not** stored in this source archive. The prior archive contained a locally assembled legacy asset and Android Chrome rejected it with a `NormalizationOptions` metadata error.

Before every build, `npm run model:sync` downloads the official Google `hand_landmarker/float16/1` asset and verifies it exactly:

- bytes: `7,819,105`
- SHA-256: `fbc2a30080c3c557093b5ddfc334698132eb341044ccee322ccf8bcf3607cde1`

The exact official download for this model release must be validated by **size + SHA-256 only**. It must not be rejected merely because it does not expose a generic `PK` ZIP header. The build then copies the verified asset to `public/vendor/models/`.

At runtime the browser reads only the locally deployed asset:

```text
/vendor/models/hand_landmarker.task?model=v2-fbc2a300
```

The browser does not download a third-party model. Network access is needed only during build/deploy to fetch and verify the official source asset.
