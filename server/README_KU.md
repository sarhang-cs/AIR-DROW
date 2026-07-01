# FastAPI Server — AirDraw Phase 22

## Endpoints

- `GET /api/health`
- `GET /api/projects/{project_id}`
- `PUT /api/projects/{project_id}`
- `WS /ws/{room}`

## Security defaults

- `AIRDRAW_API_TOKEN` is optional. When omitted, health reports development open mode.
- `AIRDRAW_ALLOWED_ORIGINS` can be a comma-separated CORS allowlist.
- Project payload limit: 4 MB.
- Project ID and room ID: only letters, numbers, `_`, `-`, `.`; max 64 chars.
- API writes require `base_revision`. A stale revision returns `409 Conflict`; the server does not silently overwrite newer data.
- WebSocket has per-connection payload and message-rate limits.

## Example environment

```bash
export AIRDRAW_API_TOKEN="change-this-for-private-testing"
export AIRDRAW_ALLOWED_ORIGINS="https://your-domain.example,http://localhost:5173"
```

## Production checklist

1. Put FastAPI behind HTTPS/WSS reverse proxy.
2. Add real account/session authentication.
3. Authorize each user for each project/room.
4. Add backups, logs, migrations, monitoring and rate limits by user/IP.
5. Do not treat the example token as a full identity/role system.
