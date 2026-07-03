#!/usr/bin/env bash
# AIR-DROW UI Clarity Edition safe replacement.
# Usage from the extracted package:
#   bash termux/replace-with-ui-clarity.sh "$HOME/AIR-DROW-GITHUB"
set -Eeuo pipefail

SOURCE="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
REPO="${1:-$HOME/AIR-DROW-GITHUB}"
BACKUP="${REPO}.backup-$(date +%Y%m%d-%H%M%S)"
RESTORE_REQUIRED=0

restore_previous() {
  set +e
  [ "$RESTORE_REQUIRED" -eq 1 ] || return 0
  [ -d "$BACKUP" ] || return 0
  echo ""
  echo "Build did not finish. Restoring your previous AIR-DROW…"
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
VERSION="$(node -e 'const fs=require("fs"); console.log(JSON.parse(fs.readFileSync(process.argv[1],"utf8")).version)' "$SOURCE/package.json")"
[ "$VERSION" = "7.2.0" ] || { echo "Expected AIR-DROW v7.2.0, found v$VERSION"; exit 1; }
[ -s "$SOURCE/web/vendor/models/hand_landmarker.task" ] || { echo "The local hand model is missing from this package."; exit 1; }
[ -s "$SOURCE/web/vendor/mediapipe/vision_bundle.js" ] || { echo "The local hand runtime is missing from this package."; exit 1; }

echo "Creating a safe backup…"
mkdir -p "$BACKUP"
shopt -s dotglob nullglob
for item in "$REPO"/*; do
  [ "$(basename "$item")" = ".git" ] && continue
  mv -- "$item" "$BACKUP/"
done
RESTORE_REQUIRED=1

echo "Installing AIR-DROW v7.2.0…"
# Keep the existing .git directory; the source package intentionally has no .git directory.
cp -a "$SOURCE"/. "$REPO"/
[ -d "$REPO/.git" ] || { echo "Git metadata was not preserved."; restore_previous; exit 1; }

cd "$REPO"
echo "Installing app files…"
npm_config_loglevel=error npm ci --no-audit --no-fund

echo "Checking the complete release…"
npm run vercel:build

RESTORE_REQUIRED=0

git add -A
if ! git diff --cached --quiet; then
  git commit -m "AIR-DROW v7.2.0 UI clarity cleanup"
fi
BRANCH="$(git branch --show-current 2>/dev/null || true)"
[ -n "$BRANCH" ] || BRANCH="main"
git push origin "HEAD:$BRANCH"

echo ""
echo "DONE ✅"
echo "AIR-DROW v7.2.0 was checked and pushed to GitHub."
echo "Your previous project backup is here:"
echo "$BACKUP"
