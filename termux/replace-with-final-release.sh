#!/data/data/com.termux/files/usr/bin/bash
# AIR-DROW v5.2.1 transparent-status-HUD replacement: validates the source, backs up the old
# directory, installs dependencies, synchronizes the verified official model,
# builds, then validates the generated local runtime.
set -Eeuo pipefail
RELEASE_VERSION="5.2.1"
SOURCE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TARGET_DIR="$HOME/AIR-DROW"
STAMP="$(date +%Y%m%d-%H%M%S)"
BACKUP_DIR="$HOME/AIR-DROW.backup-$STAMP"
fail() { printf '\n[ERROR] %s\n' "$1" >&2; exit 1; }
info() { printf '\n[INFO] %s\n' "$1"; }
command -v node >/dev/null 2>&1 || fail "Node.js نەدۆزرایەوە. سەرەتا: pkg install nodejs"
command -v npm >/dev/null 2>&1 || fail "npm نەدۆزرایەوە. سەرەتا: pkg install nodejs"
for file in package.json package-lock.json web/index.html scripts/sync-official-hand-model.mjs scripts/build-selfhosted-mediapipe.mjs scripts/verify-local-hand-model.mjs scripts/verify-hand-runtime-source.mjs scripts/verify-hand-runtime-loader-fix.mjs scripts/verify-final-release.mjs scripts/verify-bootstrap-pwa-recovery.mjs scripts/verify-hand-sync-performance.mjs scripts/verify-transparent-status-hud.mjs; do
  [[ -f "$SOURCE_DIR/$file" ]] || fail "فایلی پێویست نەدۆزرایەوە: $file"
done
ACTUAL_VERSION="$(node -p "require(process.argv[1]).version" "$SOURCE_DIR/package.json")"
[[ "$ACTUAL_VERSION" == "$RELEASE_VERSION" ]] || fail "Version mismatch: expected $RELEASE_VERSION, found $ACTUAL_VERSION"

info "پشکنینی source package..."
(
  cd "$SOURCE_DIR"
  node scripts/preflight.mjs
  node scripts/validate-inline.mjs
  node scripts/verify-bootstrap-pwa-recovery.mjs
  node scripts/verify-hand-sync-performance.mjs
  node scripts/verify-transparent-status-hud.mjs
  node --check scripts/sync-official-hand-model.mjs
  node --check scripts/build-selfhosted-mediapipe.mjs
) || fail "Source package سەرکەوتوو نەبوو؛ هیچ فایلێک نەگۆڕدرا."

if [[ -d "$TARGET_DIR" ]]; then
  info "Backup ـی وەشانی پێشوو دروست دەکرێت: $BACKUP_DIR"
  mv "$TARGET_DIR" "$BACKUP_DIR"
fi
info "کۆپی‌کردنی AIR-DROW v$RELEASE_VERSION بۆ $TARGET_DIR"
mkdir -p "$TARGET_DIR"
cp -a "$SOURCE_DIR/." "$TARGET_DIR/"

info "دامەزراندنی dependency ـەکان، دابەزاندنی مۆدێلی فەرمی و build..."
(
  cd "$TARGET_DIR"
  npm ci && \
  npm run build && \
  node scripts/verify-local-hand-model.mjs && \
  node scripts/verify-hand-runtime-source.mjs && \
  node scripts/verify-hand-runtime-loader-fix.mjs && \
  node scripts/verify-hand-sync-performance.mjs && \
  node scripts/verify-transparent-status-hud.mjs && \
  node scripts/verify-final-release.mjs
) || {
  rm -rf "$TARGET_DIR"
  [[ -d "$BACKUP_DIR" ]] && mv "$BACKUP_DIR" "$TARGET_DIR"
  fail "Build/verification شکستی هێنا؛ backup گەڕێندرایەوە. دڵنیابە تۆڕ لە کاتی build هەیە."
}
printf '\n[SUCCESS] AIR-DROW v%s جێگیر و build کرا.\n' "$RELEASE_VERSION"
printf '[NEXT] لە Vercel deploy ـی ئاسایی بکە؛ build command: npm run build\n'
