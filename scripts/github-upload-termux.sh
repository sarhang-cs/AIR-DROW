#!/data/data/com.termux/files/usr/bin/bash
set -Eeuo pipefail

REPO_NAME="AIR-DROW"
VISIBILITY="${VISIBILITY:-public}"
PROJECT_DIR="${PROJECT_DIR:-$HOME/AIR-DROW}"
PUBLIC_REGISTRY="https://registry.npmjs.org/"

if [ ! -d "$PROJECT_DIR" ]; then
  echo "Project folder not found: $PROJECT_DIR"
  exit 1
fi

pkg update -y
pkg install -y git nodejs-lts gh

cd "$PROJECT_DIR"

# Vite 8/Rolldown currently crashes with SIGILL on some Android arm64 Termux devices.
# Do not run `vite build` locally here. Vercel/Linux performs the production build.
unset HTTP_PROXY HTTPS_PROXY ALL_PROXY http_proxy https_proxy all_proxy || true
npm config delete proxy 2>/dev/null || true
npm config delete https-proxy 2>/dev/null || true
npm config set registry "$PUBLIC_REGISTRY"

echo "npm registry: $(npm config get registry)"
echo "Running source-only checks (no native Vite/Rolldown build on Termux)…"
npm run preflight
npm run check

if ! gh auth status -h github.com >/dev/null 2>&1; then
  gh auth login -h github.com -p https --web
fi

OWNER="$(gh api user -q .login)"
git config user.name "${GIT_AUTHOR_NAME:-$OWNER}"
git config user.email "${GIT_AUTHOR_EMAIL:-$OWNER@users.noreply.github.com}"

if [ ! -d ".git" ]; then
  git init
fi
git branch -M main
git add .
git commit -m "AIR-DROW production release v1.0.3" || true

if gh repo view "$OWNER/$REPO_NAME" >/dev/null 2>&1; then
  git remote get-url origin >/dev/null 2>&1 || git remote add origin "https://github.com/$OWNER/$REPO_NAME.git"
  git push -u origin main
else
  gh repo create "$REPO_NAME" --"$VISIBILITY" --source=. --remote=origin --push \
    --description "AIR-DROW — touch, hand tracking, data vault, API, realtime and motion UI."
fi

git tag -a v1.0.3 -m "AIR-DROW production release v1.0.3" 2>/dev/null || true
git push origin v1.0.3 2>/dev/null || true

if [ -f "releases/AIR-DROW_v1.0.3_SOURCE.zip" ]; then
  gh release view v1.0.3 >/dev/null 2>&1 || \
    gh release create v1.0.3 "releases/AIR-DROW_v1.0.3_SOURCE.zip" \
      --title "AIR-DROW v1.0.3" \
      --notes "Termux-build-bypass source release. Production Vite build runs on Vercel/Linux."
fi

echo
echo "GitHub is ready:"
echo "https://github.com/$OWNER/$REPO_NAME"
