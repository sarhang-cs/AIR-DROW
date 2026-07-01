# Vercel Configuration — AIR-DROW

`vercel.json` is intentionally configured as a deterministic custom Vite build:

- install: `cd web && npm ci --include=dev`
- validation/build: `npm run vercel-build`
- output: `web/dist`

The API server is **not** deployed by this Vercel static configuration. Deploy `server/` separately, then set:

```text
VITE_API_BASE_URL=https://your-api-domain.example
```

in Vercel Production Environment Variables.

A strict Content Security Policy is deliberately not hard-coded into `vercel.json`, because the final API/WSS domain is not known yet and an incorrect CSP could block actual API, WebSocket or MediaPipe asset requests. Add CSP only after the final domains are known and tested.
