#!/usr/bin/env bash
set -eu

ROOT="$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)"
(
  cd "$ROOT/server"
  if [ ! -d ".venv" ]; then python3 -m venv .venv; fi
  . .venv/bin/activate
  pip install -r requirements.txt
  uvicorn app.main:app --host 0.0.0.0 --port 8787
) &
API_PID=$!

cleanup() {
  kill "$API_PID" 2>/dev/null || true
}
trap cleanup EXIT INT TERM

cd "$ROOT/web"
npm install
VITE_API_BASE_URL="http://127.0.0.1:8787" npm run dev -- --host 0.0.0.0
