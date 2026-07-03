#!/data/data/com.termux/files/usr/bin/bash
# AIR-DROW v6.4.0 — Phase 5 safe source replacement helper for Termux.
# The Git repository metadata is retained; only the working tree is replaced.
set -Eeuo pipefail
RELEASE_VERSION="6.4.0"
SOURCE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TARGET_DIR="${AIR_DROW_TARGET_DIR:-$HOME/AIR-DROW-GITHUB}"
STAMP="$(date +%Y%m%d-%H%M%S)"
BACKUP_DIR="$HOME/AIR-DROW-GITHUB.backup-$STAMP"
REPLACED=0
BUILT=0
fail() { printf '\n[ERROR] %s\n' "$1" >&2; exit 1; }
info() { printf '\n[INFO] %s\n' "$1"; }
restore() {
  [[ "$REPLACED" == "1" && "$BUILT" != "1" ]] || return 0
  info "گەڕاندنەوەی پڕۆژەی پێشوو…"
  shopt -s dotglob nullglob
  for item in "$TARGET_DIR"/*; do
    [[ "$(basename "$item")" == ".git" ]] && continue
    rm -rf -- "$item"
  done
  for item in "$BACKUP_DIR"/*; do mv -- "$item" "$TARGET_DIR/"; done
}
trap 'restore' ERR
command -v node >/dev/null 2>&1 || fail "Node.js نەدۆزرایەوە. سەرەتا: pkg install nodejs"
command -v npm >/dev/null 2>&1 || fail "npm نەدۆزرایەوە. سەرەتا: pkg install nodejs"
[[ -d "$TARGET_DIR/.git" ]] || fail "GitHub repo نەدۆزرایەوە: $TARGET_DIR"
for file in package.json package-lock.json web/index.html scripts/preflight.mjs scripts/verify-phase4-project-safety.mjs scripts/verify-phase5-release-readiness.mjs scripts/sync-official-hand-model.mjs scripts/build-selfhosted-mediapipe.mjs; do
  [[ -f "$SOURCE_DIR/$file" ]] || fail "فایلی پێویست نەدۆزرایەوە: $file"
done
ACTUAL_VERSION="$(node -p "require(process.argv[1]).version" "$SOURCE_DIR/package.json")"
[[ "$ACTUAL_VERSION" == "$RELEASE_VERSION" ]] || fail "Version mismatch: expected $RELEASE_VERSION, found $ACTUAL_VERSION"
info "پشکنینی source package…"
(cd "$SOURCE_DIR" && node scripts/preflight.mjs && node scripts/verify-foundation-hardening.mjs && node scripts/verify-phase2-ui-system.mjs && node scripts/verify-phase3-hand-drawing.mjs && node scripts/verify-phase4-project-safety.mjs && node scripts/verify-phase5-release-readiness.mjs && node scripts/validate-inline.mjs)
mkdir -p "$BACKUP_DIR"
shopt -s dotglob nullglob
for item in "$TARGET_DIR"/*; do
  [[ "$(basename "$item")" == ".git" ]] && continue
  mv -- "$item" "$BACKUP_DIR/"
done
REPLACED=1
cp -a "$SOURCE_DIR/." "$TARGET_DIR/"
# Source ZIPs omit the large official model. Preserve the already verified local
# task asset from the previous release so the replacement remains network-safe.
if [[ -f "$BACKUP_DIR/web/vendor/models/hand_landmarker.task" ]]; then
  mkdir -p "$TARGET_DIR/web/vendor/models"
  cp -p "$BACKUP_DIR/web/vendor/models/hand_landmarker.task" "$TARGET_DIR/web/vendor/models/hand_landmarker.task"
  info "مۆدێلی local ـی پشکنراو لە وەشانی پێشوو پارێزرا."
fi
info "دامەزراندنی dependency ـەکان، دابەزاندنی مۆدێلی فەرمی و build…"
(cd "$TARGET_DIR" && npm_config_loglevel=error npm ci --no-audit --no-fund && npm run vercel:build)
BUILT=1
printf '\n[SUCCESS] AIR-DROW v%s جێگیر و build کرا.\n' "$RELEASE_VERSION"
printf '[BACKUP] %s\n' "$BACKUP_DIR"
