#!/data/data/com.termux/files/usr/bin/bash
set -euo pipefail
# AIR-DROW v8.5.0 — Settings + Kurdish Responsive Polish
SOURCE="$(cd "$(dirname "$0")/.." && pwd)"
TARGET="${1:-$HOME/AIR-DROW-GITHUB}"
VERSION="8.5.0"

[ -d "$TARGET/.git" ] || { echo "GitHub repo not found: $TARGET"; exit 1; }
[ -f "$SOURCE/package.json" ] || { echo "AIR-DROW source is incomplete."; exit 1; }
[ -f "$SOURCE/docs/V850_SETTINGS_KURDISH_RESPONSIVE_POLISH_KU.md" ] || { echo "The v8.5 Kurdish Settings guide is missing."; exit 1; }

BACKUP="$HOME/AIR-DROW-backup-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$BACKUP"
cp -a "$TARGET/.git" "$BACKUP/.git"
# Preserve local Git metadata while replacing tracked application source cleanly.
find "$TARGET" -mindepth 1 -maxdepth 1 ! -name .git -exec rm -rf {} +
cp -a "$SOURCE/." "$TARGET/"
rm -rf "$TARGET/.git"
mv "$BACKUP/.git" "$TARGET/.git"
cd "$TARGET"
npm ci --no-audit --no-fund
npm run verify:all
git add -A
if ! git diff --cached --quiet; then git commit -m "AIR-DROW v8.5.0 Settings Kurdish responsive polish"; fi
git push
echo "AIR-DROW v${VERSION} pushed successfully."
