#!/usr/bin/env bash
# AIR-DROW Phase 7 master release replacement. Run from extracted source:
# bash termux/replace-with-phase7.sh "$HOME/AIR-DROW-GITHUB"
set -Eeuo pipefail

SOURCE="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
REPO="${1:-$HOME/AIR-DROW-GITHUB}"
BACKUP="${REPO}.backup-$(date +%Y%m%d-%H%M%S)"
RESTORE_REQUIRED=0

restore_previous() {
  set +e
  [ "${RESTORE_REQUIRED:-0}" -eq 1 ] || return 0
  [ -d "$BACKUP" ] || return 0
  echo ""
  echo "Build failed — restoring previous project..."
  shopt -s dotglob nullglob
  for item in "$REPO"/*; do
    [ "$(basename "$item")" = ".git" ] && continue
    rm -rf -- "$item"
  done
  for item in "$BACKUP"/*; do
    mv -- "$item" "$REPO/"
  done
  RESTORE_REQUIRED=0
  echo "Previous project restored safely."
}

on_error() {
  code=$?
  restore_previous || true
  exit "$code"
}
trap on_error ERR

[ -d "$REPO/.git" ] || { echo "GitHub repo was not found: $REPO"; exit 1; }
[ -f "$SOURCE/package.json" ] || { echo "Source package.json was not found."; exit 1; }
git -C "$REPO" remote get-url origin >/dev/null
BRANCH="$(git -C "$REPO" branch --show-current 2>/dev/null || true)"
[ -n "$BRANCH" ] || BRANCH="main"
VERSION="$(node -e 'const fs=require("fs"); console.log(JSON.parse(fs.readFileSync(process.argv[1],"utf8")).version)' "$SOURCE/package.json")"
[ "$VERSION" = "7.0.0" ] || { echo "Expected AIR-DROW v7.0.0, got v$VERSION"; exit 1; }

mkdir -p "$BACKUP"
shopt -s dotglob nullglob
echo ""
echo "Creating backup: $BACKUP"
for item in "$REPO"/*; do
  [ "$(basename "$item")" = ".git" ] && continue
  mv -- "$item" "$BACKUP/"
done
RESTORE_REQUIRED=1

echo "Copying AIR-DROW v7.0.0 Phase 7 master release..."
cp -a "$SOURCE"/. "$REPO"/

# The source ZIP intentionally excludes the large official model. Preserve the
# verified same-origin copy from the prior release before build verification.
if [ -f "$BACKUP/web/vendor/models/hand_landmarker.task" ]; then
  mkdir -p "$REPO/web/vendor/models"
  cp -p "$BACKUP/web/vendor/models/hand_landmarker.task" "$REPO/web/vendor/models/hand_landmarker.task"
  echo "Verified local hand model preserved."
fi

cd "$REPO"
echo ""
echo "Installing dependencies..."
npm_config_loglevel=error npm ci --no-audit --no-fund

echo ""
echo "Building and verifying AIR-DROW v7.0.0 master release..."
npm run vercel:build

RESTORE_REQUIRED=0
echo ""
echo "Pushing to GitHub..."
git add -A
if ! git diff --cached --quiet; then
  git commit -m "AIR-DROW v7.0.0 Phase 7 final live QA master release"
fi
git push origin "HEAD:$BRANCH"

echo ""
echo "========================================"
echo "DONE ✅"
echo "AIR-DROW v7.0.0 Phase 7 master release was pushed to GitHub."
echo "Backup: $BACKUP"
echo "========================================"
