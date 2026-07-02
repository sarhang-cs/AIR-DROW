#!/data/data/com.termux/files/usr/bin/bash
# AIR-DROW v5.0.6 safe full replacement. It validates first, makes a backup,
# then replaces only $HOME/AIR-DROW.
set -Eeuo pipefail
RELEASE_VERSION="5.0.6"
SOURCE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TARGET_DIR="$HOME/AIR-DROW"
STAMP="$(date +%Y%m%d-%H%M%S)"
BACKUP_DIR="$HOME/AIR-DROW.backup-$STAMP"
fail() { printf '\n[ERROR] %s\n' "$1" >&2; exit 1; }
info() { printf '\n[INFO] %s\n' "$1"; }
command -v node >/dev/null 2>&1 || fail "Node.js نەدۆزرایەوە. سەرەتا: pkg install nodejs"
for file in package.json web/index.html web/vendor/models/hand_landmarker.task scripts/verify-local-hand-model.mjs scripts/verify-hand-runtime-loader-fix.mjs scripts/verify-final-release.mjs; do
  [[ -f "$SOURCE_DIR/$file" ]] || fail "فایلی پێویست نەدۆزرایەوە: $file"
done
ACTUAL_VERSION="$(node -p "require(process.argv[1]).version" "$SOURCE_DIR/package.json")"
[[ "$ACTUAL_VERSION" == "$RELEASE_VERSION" ]] || fail "Version mismatch: expected $RELEASE_VERSION, found $ACTUAL_VERSION"
verify_release() {
  node scripts/verify-local-hand-model.mjs
  node scripts/verify-hand-runtime-loader-fix.mjs
  node scripts/verify-final-release.mjs
}
info "پشکنینی source package..."
(cd "$SOURCE_DIR" && verify_release) || fail "Release verification سەرکەوتوو نەبوو؛ هیچ فایلێک نەگۆڕدرا."
if [[ -d "$TARGET_DIR" ]]; then
  info "Backup ـی وەشانی پێشوو دروست دەکرێت: $BACKUP_DIR"
  mv "$TARGET_DIR" "$BACKUP_DIR"
fi
info "کۆپی‌کردنی AIR-DROW v$RELEASE_VERSION بۆ $TARGET_DIR"
mkdir -p "$TARGET_DIR"
cp -a "$SOURCE_DIR/." "$TARGET_DIR/"
info "پشکنینی کۆتاییی فولدەری نوێ..."
(cd "$TARGET_DIR" && verify_release) || {
  rm -rf "$TARGET_DIR"
  [[ -d "$BACKUP_DIR" ]] && mv "$BACKUP_DIR" "$TARGET_DIR"
  fail "پشکنینی دوای جێگۆڕکردن شکستی هێنا؛ backup گەڕێندرایەوە."
}
printf '\n[SUCCESS] AIR-DROW v%s جێگیر کرا.\n' "$RELEASE_VERSION"
printf '[NEXT] cd %s && npm install && npm run build\n' "$TARGET_DIR"
