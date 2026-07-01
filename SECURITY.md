# Security Policy

## Report
Send a private report to the project owner. Do not publish exploit details before a fix is available.

## Production requirements
- Use HTTPS for frontend and WSS for WebSocket.
- Set `AIRDRAW_API_TOKEN` for private testing, then replace it with real authentication and authorization for public deployment.
- Set `AIRDRAW_ALLOWED_ORIGINS` to exact frontend origins.
- Never put server tokens, database files or `.env` files in the frontend bundle or public repository.
- Keep SQLite data backed up or replace it with a managed production database.
- Review Content Security Policy after self-hosting any third-party runtime assets.
- Treat local role modes as UX only, not as security.
