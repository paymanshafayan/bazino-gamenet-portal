#!/usr/bin/env node
/**
 * اجرای نسخه‌ی دسکتاپ بدون Electron.
 *
 * Electron در این sandbox نصب‌شدنی نیست (باینری‌اش از GitHub Releases می‌آید و
 * `objects.githubusercontent.com` بسته است). اما پروسه‌ی main الکترون کار خاصی نمی‌کند
 * جز اینکه یک Node.js کامل است و `server.cjs` را **درون‌پردازه** require می‌کند و سپس یک
 * پنجره‌ی Chromium روی `http://localhost:PORT/management-app` باز می‌کند.
 *
 * این اسکریپت دقیقاً همان مراحل `desktop-app/main.js` را بازسازی می‌کند:
 *   ۱) chdir به پوشه‌ی داده‌ی کاربر (معادل `app.getPath('userData')`)،
 *   ۲) BAZINO_STATIC_ROOT روی ریشه‌ی server-bundle،
 *   ۳) NODE_ENV=production و PORT،
 *   ۴) تولید و ماندگار کردن JWT_SECRET تصادفی در `.jwt-secret` هنگام اولین اجرا،
 *   ۵) require کردن همان `server-bundle/dist/server.cjs`.
 *
 * سپس همان URL با Chromium باز می‌شود و در همان ابعاد پنجره‌ی main.js (۱۴۴۰×۹۰۰)
 * عکس گرفته می‌شود.
 */
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const DESKTOP_APP_DIR = path.join(__dirname, '..');
const BUNDLE_ROOT = path.join(DESKTOP_APP_DIR, 'server-bundle');
const PORT = process.env.BAZINO_DESKTOP_PORT || '3100';

// معادل app.getPath('userData') — پوشه‌ای که بین به‌روزرسانی‌های اپ باقی می‌ماند
const dataDir = process.env.BAZINO_DESKTOP_DATA || path.join(require('os').homedir(), '.bazino-desktop-sim');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
process.chdir(dataDir);

process.env.BAZINO_STATIC_ROOT = BUNDLE_ROOT;
process.env.NODE_ENV = process.env.NODE_ENV || 'production';
process.env.PORT = PORT;

const secretFile = path.join(dataDir, '.jwt-secret');
if (!process.env.JWT_SECRET) {
  if (fs.existsSync(secretFile)) {
    process.env.JWT_SECRET = fs.readFileSync(secretFile, 'utf8').trim();
  } else {
    const generated = crypto.randomBytes(32).toString('hex');
    fs.writeFileSync(secretFile, generated, { mode: 0o600 });
    process.env.JWT_SECRET = generated;
  }
}

const serverPath = path.join(BUNDLE_ROOT, 'dist', 'server.cjs');
if (!fs.existsSync(serverPath)) {
  console.error(`❌ فایل سرور پیدا نشد: ${serverPath}\n   ابتدا "npm run prepare-server-bundle" را اجرا کنید.`);
  process.exit(1);
}

console.log('── شبیه‌سازی پروسه‌ی main الکترون ──');
console.log('  cwd (userData)     :', process.cwd());
console.log('  BAZINO_STATIC_ROOT :', process.env.BAZINO_STATIC_ROOT);
console.log('  NODE_ENV           :', process.env.NODE_ENV);
console.log('  JWT_SECRET         :', process.env.JWT_SECRET ? `تولید شد (${process.env.JWT_SECRET.length} کاراکتر)` : 'ندارد');
console.log('  window URL         :', `http://localhost:${PORT}/management-app`);
console.log('──────────────────────────────────');

require(serverPath);
