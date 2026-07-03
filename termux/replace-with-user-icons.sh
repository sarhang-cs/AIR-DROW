#!/usr/bin/env bash
# AIR-DROW User Icon Edition — complete safe replacement.
# Usage: bash termux/replace-with-user-icons.sh "$HOME/AIR-DROW-GITHUB"
set -Eeuo pipefail

SOURCE="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
REPO="${1:-$HOME/AIR-DROW-GITHUB}"
BACKUP="${REPO}.temporary-backup-$(date +%Y%m%d-%H%M%S)"
RESTORE_REQUIRED=0

restore_previous() {
  set +e
  [ "$RESTORE_REQUIRED" -eq 1 ] || return 0
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
VERSION="$(node -e 'const fs=require("fs"); console.log(JSON.parse(fs.readFileSync(process.argv[1],"utf8")).version)' "$SOURCE/package.json")"
[ "$VERSION" = "7.2.1" ] || { echo "Expected AIR-DROW v7.2.1, found v$VERSION"; exit 1; }
[ -s "$SOURCE/web/vendor/models/hand_landmarker.task" ] || { echo "The local hand model is missing from this package."; exit 1; }
[ -s "$SOURCE/web/vendor/mediapipe/vision_bundle.js" ] || { echo "The local hand runtime is missing from this package."; exit 1; }
[ -f "$SOURCE/web/assets/icons/USER_ICON_PACKAGE.json" ] || { echo "The complete user icon package is missing."; exit 1; }

echo "Creating a temporary backup…"
mkdir -p "$BACKUP"
shopt -s dotglob nullglob
for item in "$REPO"/*; do
  [ "$(basename "$item")" = ".git" ] && continue
  mv -- "$item" "$BACKUP/"
done
RESTORE_REQUIRED=1

echo "Removing the previous icon system and copying AIR-DROW v7.2.1…"
# The old project was moved out above. Only .git remains; this package replaces every project file.
cp -a "$SOURCE"/. "$REPO"/
[ -d "$REPO/.git" ] || { echo "Git metadata was not preserved."; restore_previous; exit 1; }

cd "$REPO"
echo "Installing app files…"
npm_config_loglevel=error npm ci --no-audit --no-fund

echo "Checking the complete release and imported icon package…"
npm run vercel:build

# The new project is valid at this point. Keep it installed even if GitHub is temporarily unreachable.
RESTORE_REQUIRED=0

git add -A
if ! git diff --cached --quiet; then
  git commit -m "AIR-DROW v7.2.1 user icon package replacement"
fi
BRANCH="$(git branch --show-current 2>/dev/null || true)"
[ -n "$BRANCH" ] || BRANCH="main"

if ! git push origin "HEAD:$BRANCH"; then
  echo ""
  echo "The new AIR-DROW is installed and built, but GitHub push did not finish."
  echo "Retry later with: cd $REPO && git push origin $BRANCH"
  echo "Temporary backup kept here: $BACKUP"
  exit 1
fi

rm -rf "$BACKUP"
echo ""
echo "DONE ✅"
echo "AIR-DROW v7.2.1 with your complete icon package was checked and pushed to GitHub."
echo "The previous project files were deleted after the successful build."
