#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════════════
# بیلد وبِ اپ فلاتر بازینو — برای سرو روی bazino.pro/app-web
#
# کجا اجرا می‌شود: در زمان build سرویس (Railway یا هر محیطی با اینترنت کامل).
# سندباکس‌های بدون دسترسی به storage.googleapis.com هم می‌توانند کل دیپلوی را
# بسازند؛ این اسکریپت فقط در محیطی اجرا می‌شود که به اینترنت کامل دسترسی دارد.
#
#   BAZINO_SKIP_FLUTTER_WEB=1  →  کل مرحله رد می‌شود (بیلد لوکال/تست‌های سبک)
#
# خروجی: flutter_app/build/web  — سرور آن را روی /app-web سرو می‌کند.
# اگر بیلد شکست بخورد، exit 0 برمی‌گردانیم تا دیپلوی سایت اصلی سالم بماند؛
# فقط /app-web خاموش می‌شود. (deploy-safety by design)
#
# نکتهٔ مهم (درس دیپلوی اول): در برخی محیط‌های build، flutter در «آخرین قدم»
# (نوشتن index.html پس از کامپایل موفق main.dart.js) از کار می‌افتد. چون
# main.dart.js و تمام assetها آماده‌اند، خودمان index.html را از قالب منبع
# web/index.html می‌سازیم و اگر flutter_bootstrap.js هم نبود، یک فال‌بک
# استاندارد می‌نویسیم — نتیجه: وب‌اپ کامل حتی اگر آخرین قدم flutter شکست بخورد.
# ═══════════════════════════════════════════════════════════════════════════
set -uo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OUT_DIR="$ROOT/flutter_app/build/web"
SRC_WEB_DIR="$ROOT/flutter_app/web"

fail_soft() {
  echo "[flutter-web] ⚠️ $1 — deploy continues WITHOUT a fresh /app-web build"
}

if [ "${BAZINO_SKIP_FLUTTER_WEB:-0}" = "1" ]; then
  echo "[flutter-web] skipped (BAZINO_SKIP_FLUTTER_WEB=1)"
  exit 0
fi

FLUTTER_DIR="${BAZINO_FLUTTER_DIR:-$ROOT/.flutter-sdk}"
FLUTTER_VERSION="${BAZINO_FLUTTER_VERSION:-3.47.4}"

# نشانهٔ «بیلد کامل»: index.html (نه فقط main.dart.js — دیپلوی اول ثابت کرد
# که flutter ممکن است تا ۹۵٪ پیش برود و در نوشتن index.html از کار بیفتد).
if [ -f "$OUT_DIR/index.html" ]; then
  echo "[flutter-web] complete build already present — skipping"
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
      || { fail_soft "Flutter SDK download failed"; exit 0; }
  fi
  git config --global --add safe.directory "$FLUTTER_DIR" 2>/dev/null || true
fi
export PATH="$FLUTTER_DIR/bin:$PATH"

# ── ۲) بیلد release وب (با یک تلاش مجدد) ───────────────────────────────────
cd "$ROOT/flutter_app" || { fail_soft "flutter_app dir missing"; exit 0; }
flutter config --no-analytics >/dev/null 2>&1 || true
flutter pub get || { fail_soft "flutter pub get failed"; exit 0; }

if ! flutter build web --release; then
  echo "[flutter-web] build attempt 1 failed — retrying once (warm cache)…"
  sleep 5
  flutter build web --release || true
fi

# ── ۳) نجات «بیلد ناتمام»: main.dart.js هست ولی index.html نه ─────────────
if [ -f "$OUT_DIR/main.dart.js" ] && [ ! -f "$OUT_DIR/index.html" ]; then
  echo "[flutter-web] compile output present but index.html missing — synthesizing it from the source template"
  mkdir -p "$OUT_DIR"
  # قالب منبع: فقط placeholder پایه href را با / جایگزین می‌کنیم
  sed 's|\$FLUTTER_BASE_HREF|/|g' "$SRC_WEB_DIR/index.html" > "$OUT_DIR/index.html"
  # فایل‌های استاتیک منبع که flutter باید کپی می‌کرد
  for f in manifest.json favicon.png; do
    [ -f "$OUT_DIR/$f" ] || cp "$SRC_WEB_DIR/$f" "$OUT_DIR/$f" 2>/dev/null || true
  done
  if [ -d "$SRC_WEB_DIR/icons" ] && [ ! -d "$OUT_DIR/icons" ]; then
    cp -r "$SRC_WEB_DIR/icons" "$OUT_DIR/icons"
  fi
  # فال‌بک bootstrap استاندارد اگر خود flutter ننوشته باشد
  if [ ! -f "$OUT_DIR/flutter_bootstrap.js" ]; then
    echo "[flutter-web] writing fallback flutter_bootstrap.js"
    cat > "$OUT_DIR/flutter_bootstrap.js" <<'EOF'
// فال‌بک بازینو — وقتی flutter خودش bootstrap را ننوشته است.
// اول flutter.js را لود می‌کنیم (که window._flutter.loader را می‌سازد) و بعد اپ را راه می‌اندازیم.
(function () {
  var s = document.createElement("script");
  s.src = "flutter.js";
  s.onload = function () {
    _flutter.loader.load({
      onEntrypointLoaded: async function (engineInitializer) {
        var appRunner = await engineInitializer.initializeEngine({ assetBase: "/" });
        await appRunner.runApp();
      },
    });
  };
  document.head.appendChild(s);
})();
EOF
  fi
fi

if [ -f "$OUT_DIR/index.html" ]; then
  echo "[flutter-web] ✅ ready → $OUT_DIR ($(du -sh "$OUT_DIR" | cut -f1))"
else
  fail_soft "no usable build produced"
fi
exit 0
