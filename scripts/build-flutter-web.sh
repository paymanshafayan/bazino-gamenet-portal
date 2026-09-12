#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════════════
# بیلد وبِ اپ فلاتر بازینو — برای سرو روی bazino.pro/app-web
#
# کجا اجرا می‌شود: در زمان build سرویس (Railway یا هر محیطی با اینترنت کامل).
# چرا این‌جا: سندباکس‌های بدون دسترسی به storage.googleapis.com هم می‌توانند
# کل دیپلوی را بسازند؛ این اسکریپت فقط در محیطی اجرا می‌شود که به اینترنت
# کامل (github + storage.googleapis.com) دسترسی دارد.
#
#   BAZINO_SKIP_FLUTTER_WEB=1  →  کل مرحله رد می‌شود (بیلد لوکال/تست‌های سبک)
#
# خروجی: flutter_app/build/web  — سرور آن را روی /app-web سرو می‌کند.
# اگر بیلد شکست بخورد، exit 0 برمی‌گردانیم تا دیپلوی سایت اصلی سالم بماند؛
# فقط /app-web خاموش می‌شود. (deploy-safety by design)
# ═══════════════════════════════════════════════════════════════════════════
set -uo pipefail

fail_soft() {
  echo "[flutter-web] ⚠️ $1 — deploy continues WITHOUT /app-web"
  exit 0
}

if [ "${BAZINO_SKIP_FLUTTER_WEB:-0}" = "1" ]; then
  echo "[flutter-web] skipped (BAZINO_SKIP_FLUTTER_WEB=1)"
  exit 0
fi

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
FLUTTER_DIR="${BAZINO_FLUTTER_DIR:-$ROOT/.flutter-sdk}"
FLUTTER_VERSION="${BAZINO_FLUTTER_VERSION:-3.47.4}"
OUT_DIR="$ROOT/flutter_app/build/web"

if [ -f "$OUT_DIR/main.dart.js" ]; then
  echo "[flutter-web] build already present — skipping"
  exit 0
fi

# ── ۱) نصب SDK (کش‌شده بین اجراها اگر volume باشد) ────────────────────────
if [ ! -x "$FLUTTER_DIR/bin/flutter" ]; then
  echo "[flutter-web] installing Flutter SDK ($FLUTTER_VERSION)…"
  TARBALL="https://storage.googleapis.com/flutter_infra_release/releases/stable/linux/flutter_linux_${FLUTTER_VERSION}-stable.tar.xz"
  mkdir -p "$FLUTTER_DIR"
  if curl -fsSL --retry 2 "$TARBALL" | tar xJ -C "$FLUTTER_DIR" --strip-components=1 2>/dev/null; then
    echo "[flutter-web] SDK installed from pinned tarball"
  else
    echo "[flutter-web] tarball failed — falling back to git clone (stable)"
    rm -rf "$FLUTTER_DIR"
    mkdir -p "$FLUTTER_DIR"
    git clone --depth 1 -b stable https://github.com/flutter/flutter.git "$FLUTTER_DIR" \
      || fail_soft "Flutter SDK download failed"
  fi
  git config --global --add safe.directory "$FLUTTER_DIR" 2>/dev/null || true
fi
export PATH="$FLUTTER_DIR/bin:$PATH"

# ── ۲) بیلد release وب ─────────────────────────────────────────────────────
cd "$ROOT/flutter_app" || fail_soft "flutter_app dir missing"
flutter config --no-analytics >/dev/null 2>&1 || true
flutter pub get || fail_soft "flutter pub get failed"
# مبدأ API همان bazino.pro است (پیش‌فرض api_config) — چون وب‌اپ از همان دامنه سرو می‌شود، same-origin است.
flutter build web --release || fail_soft "flutter build web failed"

echo "[flutter-web] ✅ built → $OUT_DIR ($(du -sh "$OUT_DIR" | cut -f1))"
