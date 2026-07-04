#!/usr/bin/env bash
# AIR-DROW v8.1.0 — On-device Launch Validation & Final Release Gate
# Transactional replacement: preserve .git, verify/build before push, then restore old source if validation fails.
set -Eeuo pipefail
SOURCE="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
VERSION="8.1.0"
REPO="${1:-$HOME/AIR-DROW-GITHUB}"
BACKUP="${REPO}.backup-${VERSION//./-}-$(date +%Y%m%d-%H%M%S)"
RESTORE_REQUIRED=0

restore_previous() {
  set +e
  [ "${RESTORE_REQUIRED:-0}" -eq 1 ] || return 0
  [ -d "$BACKUP" ] || return 0
  echo ""
  echo "Validation did not finish. Restoring the previous AIR-DROW source…"
  shopt -s dotglob nullglob
  for item in "$REPO"/*; do [ "$(basename "$item")" = ".git" ] && continue; rm -rf -- "$item"; done
  for item in "$BACKUP"/*; do mv -- "$item" "$REPO/"; done
  RESTORE_REQUIRED=0
  echo "Previous AIR-DROW source restored safely."
}
on_error() { code=$?; restore_previous || true; exit "$code"; }
trap on_error ERR

[ -d "$REPO/.git" ] || { echo "GitHub repository was not found: $REPO"; exit 1; }
[ -f "$SOURCE/package.json" ] || { echo "AIR-DROW source is incomplete."; exit 1; }
NODE_MAJOR="$(node -p 'process.versions.node.split(".")[0]')"
[ "$NODE_MAJOR" -ge 22 ] && [ "$NODE_MAJOR" -lt 25 ] || { echo "Node 22, 23 or 24 is required. Current Node: $(node -v)"; exit 1; }
VERSION_FOUND="$(node -e 'const fs=require("fs"); console.log(JSON.parse(fs.readFileSync(process.argv[1],"utf8")).version)' "$SOURCE/package.json")"
[ "$VERSION_FOUND" = "$VERSION" ] || { echo "Expected AIR-DROW v$VERSION, found v$VERSION_FOUND"; exit 1; }
[ -s "$SOURCE/web/vendor/models/hand_landmarker.task" ] || { echo "The local hand model is missing."; exit 1; }
[ -s "$SOURCE/web/vendor/mediapipe/vision_bundle.js" ] || { echo "The local hand runtime is missing."; exit 1; }
[ -f "$SOURCE/docs/V810_ON_DEVICE_VALIDATION_KU.md" ] || { echo "The on-device validation guide is missing."; exit 1; }

echo "Creating a safe backup…"
mkdir -p "$BACKUP"
shopt -s dotglob nullglob
for item in "$REPO"/*; do [ "$(basename "$item")" = ".git" ] && continue; mv -- "$item" "$BACKUP/"; done
RESTORE_REQUIRED=1

echo "Replacing old AIR-DROW project files with v$VERSION…"
cp -a "$SOURCE"/. "$REPO"/
[ -d "$REPO/.git" ] || { echo "Git metadata was not preserved."; restore_previous; exit 1; }
cd "$REPO"
echo "Installing exact dependencies…"
npm_config_loglevel=error npm ci --no-audit --no-fund
echo "Building and verifying AIR-DROW v$VERSION…"
npm run verify:all && npm test
RESTORE_REQUIRED=0
git add -A
if ! git diff --cached --quiet; then git commit -m "AIR-DROW v8.1.0 on-device launch validation"; fi
BRANCH="$(git branch --show-current 2>/dev/null || true)"
[ -n "$BRANCH" ] || BRANCH="main"
git push origin "HEAD:$BRANCH"
rm -rf "$BACKUP"
printf '\n========================================\nDONE ✅ AIR-DROW v%s was verified and pushed.\nVercel can now deploy the branch.\n========================================\n' "$VERSION"
