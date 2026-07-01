#!/usr/bin/env bash
set -Eeuo pipefail

ROOT="$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)"
OUT="$ROOT/releases/AIR-DROW_v1.0.1_SOURCE.zip"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

mkdir -p "$TMP/AIR-DROW"
rsync -a   --exclude ".git"   --exclude ".vercel"   --exclude "web/node_modules"   --exclude "web/dist"   --exclude "releases"   --exclude "server/.venv"   --exclude "server/data"   "$ROOT/" "$TMP/AIR-DROW/"

(
  cd "$TMP"
  zip -r -9 "$OUT" "AIR-DROW" >/dev/null
)

echo "Created: $OUT"
