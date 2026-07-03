#!/usr/bin/env bash
# AIR-DROW Global User Edition installer.
# Run from the extracted project folder:
# bash termux/replace-with-global-user-edition.sh "$HOME/AIR-DROW-GITHUB"
set -Eeuo pipefail

SOURCE="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
REPO="${1:-$HOME/AIR-DROW-GITHUB}"

[ -d "$REPO/.git" ] || { echo "GitHub repo was not found: $REPO"; exit 1; }
[ -f "$SOURCE/package.json" ] || { echo "AIR-DROW source is incomplete."; exit 1; }
VERSION="$(node -e 'const fs=require("fs"); console.log(JSON.parse(fs.readFileSync(process.argv[1],"utf8")).version)' "$SOURCE/package.json")"
[ "$VERSION" = "7.1.0" ] || { echo "Expected AIR-DROW v7.1.0, found v$VERSION"; exit 1; }

echo "Replacing the current AIR-DROW source..."
shopt -s dotglob nullglob
for item in "$REPO"/*; do
  [ "$(basename "$item")" = ".git" ] && continue
  rm -rf -- "$item"
done

cp -a "$SOURCE"/. "$REPO"/
cd "$REPO"

npm_config_loglevel=error npm ci --no-audit --no-fund
npm run vercel:build

git add -A
if ! git diff --cached --quiet; then
  git commit -m "AIR-DROW v7.1.0 Global User Edition"
fi
BRANCH="$(git branch --show-current 2>/dev/null || true)"
[ -n "$BRANCH" ] || BRANCH="main"
git push origin "HEAD:$BRANCH"

echo "DONE: AIR-DROW v7.1.0 is ready on GitHub."
