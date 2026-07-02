#!/data/data/com.termux/files/usr/bin/bash
set -Eeuo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"
node scripts/verify-local-hand-model.mjs
node scripts/verify-hand-runtime-loader-fix.mjs
node scripts/verify-final-release.mjs
