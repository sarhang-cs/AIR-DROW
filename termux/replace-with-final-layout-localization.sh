#!/usr/bin/env bash
# AIR-DROW v7.4.0 — Final Layout & Localization Edition
# Safe full replacement: preserves only .git so the connected GitHub repo remains linked.
set -Eeuo pipefail

SOURCE="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
VERSION="7.4.0"
REPO="${1:-$HOME/AIR-DROW-GITHUB}"
BACKUP="${REPO}.backup-${VERSION//./-}-$(date +%Y%m%d-%H%M%S)"
RESTORE_REQUIRED=0

restore_previous() {
  set +e
  [ "${RESTORE_REQUIRED:-0}" -eq 1 ] || return 0
  [ -d "$BACKUP" ] || return 0
  echo ""
  echo "Build did not finish. Restoring the previous AIR-DROW…"
  shopt -s dotglob nullglob
  for item in "$REPO"/*; do
    [ "$(basename "$item")" = ".git" ] && continue
    rm -rf -- "$item"
  done
  for item in "$BACKUP"/*; do
    mv -- "$item" "$REPO/"
  done
  RESTORE_REQUIRED=0
  echo "Previous AIR-DROW restored safely."
}

on_error() {
  code=$?
  restore_previous || true
  exit "$code"
}
trap on_error ERR

[ -d "$REPO/.git" ] || { echo "GitHub repo was not found: $REPO"; exit 1; }
[ -f "$SOURCE/package.json" ] || { echo "AIR-DROW source is incomplete."; exit 1; }
VERSION_FOUND="$(node -e 'const fs=require("fs"); console.log(JSON.parse(fs.readFileSync(process.argv[1],"utf8")).version)' "$SOURCE/package.json")"
[ "$VERSION_FOUND" = "7.4.0" ] || { echo "Expected AIR-DROW v7.4.0, found v$VERSION_FOUND"; exit 1; }
[ -s "$SOURCE/web/vendor/models/hand_landmarker.task" ] || { echo "The local hand model is missing from this package."; exit 1; }
[ -s "$SOURCE/web/vendor/mediapipe/vision_bundle.js" ] || { echo "The local hand runtime is missing from this package."; exit 1; }
[ -f "$SOURCE/web/assets/css/final-layout-localization.css" ] || { echo "The final layout stylesheet is missing."; exit 1; }

echo "Creating backup…"
mkdir -p "$BACKUP"
shopt -s dotglob nullglob
for item in "$REPO"/*; do
  [ "$(basename "$item")" = ".git" ] && continue
  mv -- "$item" "$BACKUP/"
done
RESTORE_REQUIRED=1

echo "Deleting previous AIR-DROW project files and installing v7.4.0…"
cp -a "$SOURCE"/. "$REPO"/
[ -d "$REPO/.git" ] || { echo "Git metadata was not preserved."; restore_previous; exit 1; }

cd "$REPO"
echo "Installing dependencies…"
npm_config_loglevel=error npm ci --no-audit --no-fund

echo "Building and verifying AIR-DROW v7.4.0…"
npm run vercel:build

RESTORE_REQUIRED=0

git add -A
if ! git diff --cached --quiet; then
  git commit -m "AIR-DROW v7.4.0 final layout localization"
fi
BRANCH="$(git branch --show-current 2>/dev/null || true)"
[ -n "$BRANCH" ] || BRANCH="main"

git push origin "HEAD:$BRANCH"
rm -rf "$BACKUP"

echo ""
echo "========================================"
echo "DONE ✅"
echo "AIR-DROW v7.4.0 is installed, verified and pushed to GitHub."
echo "Vercel can now deploy the main branch."
echo "========================================"
