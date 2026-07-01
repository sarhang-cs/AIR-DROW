#!/data/data/com.termux/files/usr/bin/bash
set -Eeuo pipefail

PROJECT_DIR="${PROJECT_DIR:-$HOME/AIR-DROW}"
API_URL="${VITE_API_BASE_URL:-}"
PUBLIC_REGISTRY="https://registry.npmjs.org/"

if [ ! -d "$PROJECT_DIR" ]; then
  echo "Project folder not found: $PROJECT_DIR"
  exit 1
fi

pkg update -y
pkg install -y nodejs-lts

cd "$PROJECT_DIR"
unset HTTP_PROXY HTTPS_PROXY ALL_PROXY http_proxy https_proxy all_proxy || true
npm config delete proxy 2>/dev/null || true
npm config delete https-proxy 2>/dev/null || true
npm config set registry "$PUBLIC_REGISTRY"

# Do not run local Vite build: some Android arm64 Termux devices trigger SIGILL in Rolldown.
# `vercel --prod` uploads source; Vercel builds it in its Linux build environment.
echo "Running source-only checks…"
npm run preflight
npm run check

npx --yes --registry="$PUBLIC_REGISTRY" vercel@latest login

if [ -n "$API_URL" ]; then
  printf "%s" "$API_URL" | npx --yes --registry="$PUBLIC_REGISTRY" vercel@latest env add VITE_API_BASE_URL production
fi

echo "Uploading source to Vercel for cloud build…"
npx --yes --registry="$PUBLIC_REGISTRY" vercel@latest --prod

echo
echo "Vercel deployment submitted. Open the deployment URL and inspect Vercel Build Logs if a cloud build reports an error."
