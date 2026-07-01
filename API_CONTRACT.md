# API Contract

## Health
`GET /api/health`

Returns server version, project count, authentication requirement and CORS configuration state.

## Read project
`GET /api/projects/{project_id}`

Optional header:
`Authorization: Bearer <token>`

## Write project
`PUT /api/projects/{project_id}`

Request:
```json
{
  "project": { "strokes": [] },
  "base_revision": 0,
  "updated_at": "2026-07-01T00:00:00.000Z"
}
```

A stale `base_revision` returns `409 Conflict`. The client must pull and resolve intentionally.

## WebSocket
`ws://host/ws/{room}` in localhost development  
`wss://host/ws/{room}` in production

Message:
```json
{
  "type": "project:update",
  "source": "client-id",
  "project": { "strokes": [] },
  "sentAt": 0
}
```

The example relay validates message type/shape and size. It does not authenticate users unless server token is enabled.
