from __future__ import annotations

import asyncio
import hashlib
import hmac
import json
import os
import re
import sqlite3
import time
from collections import defaultdict, deque
from contextlib import contextmanager
from pathlib import Path
from typing import Any, Deque, DefaultDict

from fastapi import FastAPI, Header, HTTPException, Request, Response, WebSocket, WebSocketDisconnect, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, field_validator

APP_VERSION = "22.0.0"
MAX_PROJECT_BYTES = 4 * 1024 * 1024
MAX_WS_MESSAGE_BYTES = 4 * 1024 * 1024
MAX_WS_MESSAGES_PER_MINUTE = 30
ID_RE = re.compile(r"^[A-Za-z0-9_.-]{1,64}$")
ROOT = Path(__file__).resolve().parents[1]
DATA_DIR = Path(os.getenv("AIRDRAW_DATA_DIR", ROOT / "data"))
DB_PATH = DATA_DIR / "airdraw.sqlite3"
API_TOKEN = os.getenv("AIRDRAW_API_TOKEN", "").strip()
ALLOWED_ORIGINS = [value.strip() for value in os.getenv("AIRDRAW_ALLOWED_ORIGINS", "").split(",") if value.strip()]

app = FastAPI(title="AirDraw Phase 22 API", version=APP_VERSION)
if ALLOWED_ORIGINS:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=ALLOWED_ORIGINS,
        allow_credentials=False,
        allow_methods=["GET", "PUT"],
        allow_headers=["Authorization", "Content-Type"],
    )

rooms: DefaultDict[str, set[WebSocket]] = defaultdict(set)


def init_db() -> None:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    with sqlite3.connect(DB_PATH) as conn:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS projects (
                project_id TEXT PRIMARY KEY,
                revision INTEGER NOT NULL,
                updated_at TEXT NOT NULL,
                project_json TEXT NOT NULL,
                project_hash TEXT NOT NULL,
                created_at TEXT NOT NULL,
                stored_at TEXT NOT NULL
            )
            """
        )
        conn.commit()


@contextmanager
def db_connection():
    init_db()
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
        conn.commit()
    finally:
        conn.close()


def require_valid_id(value: str) -> str:
    if not ID_RE.fullmatch(value):
        raise HTTPException(status_code=422, detail="Invalid project or room identifier")
    return value


def authorized(authorization: str | None) -> bool:
    if not API_TOKEN:
        return True
    if not authorization or not authorization.startswith("Bearer "):
        return False
    supplied = authorization.removeprefix("Bearer ").strip()
    return hmac.compare_digest(supplied, API_TOKEN)


def require_auth(authorization: str | None) -> None:
    if not authorized(authorization):
        raise HTTPException(status_code=401, detail="Authentication required")


def compact_json(value: Any) -> str:
    encoded = json.dumps(value, ensure_ascii=False, separators=(",", ":"))
    if len(encoded.encode("utf-8")) > MAX_PROJECT_BYTES:
        raise HTTPException(status_code=413, detail="Project payload exceeds 4 MB limit")
    return encoded


def validate_project_shape(project: dict[str, Any]) -> None:
    if not isinstance(project, dict) or not isinstance(project.get("strokes"), list):
        raise HTTPException(status_code=422, detail="Project must contain a strokes array")
    if len(project["strokes"]) > 100_000:
        raise HTTPException(status_code=422, detail="Project contains too many strokes")


class ProjectWrite(BaseModel):
    project: dict[str, Any]
    base_revision: int = Field(default=0, ge=0)
    updated_at: str = Field(min_length=1, max_length=80)

    @field_validator("project")
    @classmethod
    def project_shape(cls, value: dict[str, Any]) -> dict[str, Any]:
        validate_project_shape(value)
        return value


@app.on_event("startup")
async def startup() -> None:
    init_db()


@app.get("/api/health")
async def health() -> dict[str, Any]:
    with db_connection() as conn:
        count = conn.execute("SELECT COUNT(*) AS count FROM projects").fetchone()["count"]
    return {
        "ok": True,
        "version": APP_VERSION,
        "project_count": count,
        "auth_required": bool(API_TOKEN),
        "cors_configured": bool(ALLOWED_ORIGINS),
        "time": int(time.time()),
    }


@app.get("/api/projects/{project_id}")
async def get_project(project_id: str, authorization: str | None = Header(default=None)) -> dict[str, Any]:
    require_auth(authorization)
    require_valid_id(project_id)
    with db_connection() as conn:
        row = conn.execute(
            "SELECT project_id, revision, updated_at, project_json, project_hash, stored_at FROM projects WHERE project_id = ?",
            (project_id,),
        ).fetchone()
    if row is None:
        raise HTTPException(status_code=404, detail="Project not found")
    return {
        "project_id": row["project_id"],
        "revision": row["revision"],
        "updated_at": row["updated_at"],
        "stored_at": row["stored_at"],
        "hash": row["project_hash"],
        "project": json.loads(row["project_json"]),
    }


@app.put("/api/projects/{project_id}")
async def put_project(
    project_id: str,
    payload: ProjectWrite,
    authorization: str | None = Header(default=None),
) -> dict[str, Any]:
    require_auth(authorization)
    require_valid_id(project_id)
    project_json = compact_json(payload.project)
    project_hash = hashlib.sha256(project_json.encode("utf-8")).hexdigest()
    now = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())

    with db_connection() as conn:
        row = conn.execute(
            "SELECT revision FROM projects WHERE project_id = ?",
            (project_id,),
        ).fetchone()
        current_revision = int(row["revision"]) if row else 0
        if current_revision != payload.base_revision:
            raise HTTPException(
                status_code=409,
                detail={
                    "message": "Revision conflict",
                    "current_revision": current_revision,
                    "action": "Pull remote project before pushing again",
                },
            )

        next_revision = current_revision + 1
        if row:
            conn.execute(
                """
                UPDATE projects
                SET revision = ?, updated_at = ?, project_json = ?, project_hash = ?, stored_at = ?
                WHERE project_id = ?
                """,
                (next_revision, payload.updated_at, project_json, project_hash, now, project_id),
            )
        else:
            conn.execute(
                """
                INSERT INTO projects (project_id, revision, updated_at, project_json, project_hash, created_at, stored_at)
                VALUES (?, ?, ?, ?, ?, ?, ?)
                """,
                (project_id, next_revision, payload.updated_at, project_json, project_hash, now, now),
            )

    return {
        "ok": True,
        "project_id": project_id,
        "revision": next_revision,
        "updated_at": payload.updated_at,
        "hash": project_hash,
    }


async def broadcast(room: str, sender: WebSocket, raw: str) -> None:
    stale: list[WebSocket] = []
    for peer in rooms[room]:
        if peer is sender:
            continue
        try:
            await peer.send_text(raw)
        except Exception:
            stale.append(peer)
    for peer in stale:
        rooms[room].discard(peer)


@app.websocket("/ws/{room}")
async def websocket_room(websocket: WebSocket, room: str, token: str | None = None) -> None:
    require_valid_id(room)
    if API_TOKEN and not token:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return
    if API_TOKEN and not hmac.compare_digest(token or "", API_TOKEN):
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    await websocket.accept()
    rooms[room].add(websocket)
    recent: Deque[float] = deque()

    try:
        while True:
            raw = await websocket.receive_text()
            if len(raw.encode("utf-8")) > MAX_WS_MESSAGE_BYTES:
                await websocket.close(code=status.WS_1009_MESSAGE_TOO_BIG)
                return

            now = time.monotonic()
            while recent and now - recent[0] > 60:
                recent.popleft()
            recent.append(now)
            if len(recent) > MAX_WS_MESSAGES_PER_MINUTE:
                await websocket.close(code=status.WS_1013_TRY_AGAIN_LATER)
                return

            try:
                message = json.loads(raw)
            except json.JSONDecodeError:
                await websocket.send_json({"type": "error", "code": "INVALID_JSON"})
                continue

            project = message.get("project") if isinstance(message, dict) else None
            if message.get("type") != "project:update" or not isinstance(project, dict):
                await websocket.send_json({"type": "error", "code": "UNSUPPORTED_MESSAGE"})
                continue
            try:
                validate_project_shape(project)
                compact_json(project)
            except HTTPException:
                await websocket.send_json({"type": "error", "code": "INVALID_PROJECT"})
                continue

            await broadcast(room, websocket, raw)
    except WebSocketDisconnect:
        pass
    finally:
        rooms[room].discard(websocket)
        if not rooms[room]:
            rooms.pop(room, None)
