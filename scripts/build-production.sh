#!/usr/bin/env bash
set -Eeuo pipefail

ROOT="$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)"
cd "$ROOT"

case "$(uname -o 2>/dev/null || true)" in
  Android)
    echo "Local Vite build is skipped on Termux/Android because Rolldown can crash with Illegal Instruction on some arm64 devices."
    echo "Use GitHub + Vercel cloud build instead: bash scripts/github-upload-termux.sh then bash scripts/vercel-publish-termux.sh"
    exit 0
    ;;
esac

npm run install:web
npm run preflight
npm run check
npm run build
echo "Production static files are ready in: $ROOT/web/dist"
