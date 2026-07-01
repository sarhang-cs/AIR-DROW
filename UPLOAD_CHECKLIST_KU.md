# Final Upload Checklist

- [ ] Unzip the release.
- [ ] Run `bash scripts/build-production.sh` or let Netlify/Vercel build it.
- [ ] Set `VITE_API_BASE_URL` only if the FastAPI server is deployed.
- [ ] Copy `server/.env.example` to `server/.env`.
- [ ] Set a secret `AIRDRAW_API_TOKEN` for private testing.
- [ ] Set exact `AIRDRAW_ALLOWED_ORIGINS`.
- [ ] Deploy frontend through HTTPS.
- [ ] Deploy API with HTTPS/WSS reverse proxy.
- [ ] Test manual draw, touch zoom, save, reload, export, camera permission and API health.
- [ ] Confirm data is not overwritten on a revision conflict.
- [ ] Back up server data before public use.
