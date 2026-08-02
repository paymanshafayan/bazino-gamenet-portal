#!/usr/bin/env node
// Prepares `desktop-app/server-bundle/` — a self-contained copy of the built backend that
// Electron's main.js requires in-process. Layout mirrors the real root project exactly:
//
//   server-bundle/
//     dist/server.cjs               <- the built backend (site assets sit alongside it)
//     dist/...                      <- built main-site static assets
//     Management App/Bazino/dist/   <- built Management App static assets
//     node_modules/                 <- PRODUCTION-only deps (server.cjs was bundled with
//                                      esbuild --packages=external, so these are required
//                                      at runtime, not inlined into server.cjs)
//
// Run from desktop-app/ via `npm run prepare-server-bundle` (also runs automatically before
// `npm start` / `npm run dist*`). Requires the root project to already be built
// (`npm run build` from the project root) — this script does NOT build it for you, it only
// copies the output, since a full root build can take a while and you may want to iterate
// on desktop-app/main.js without rebuilding the whole site every time.
//
// UNTESTED: written in a sandbox with no Electron, no network, and no real Node runtime
// available to actually execute this end-to-end. Read it carefully before running on a
// real machine — see desktop-app/README.md.

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.join(__dirname, '..', '..'); // project root (desktop-app is one level under it)
const DESKTOP_APP_DIR = path.join(__dirname, '..');
const BUNDLE_DIR = path.join(DESKTOP_APP_DIR, 'server-bundle');

function fail(message) {
  console.error(`\n❌ ${message}\n`);
  process.exit(1);
}

function copyRecursive(src, dest) {
  fs.cpSync(src, dest, { recursive: true });
}

function main() {
  const rootServerCjs = path.join(ROOT, 'dist', 'server.cjs');
  const managementAppDist = path.join(ROOT, 'Management App', 'Bazino', 'dist');

  if (!fs.existsSync(rootServerCjs)) {
    fail(
      `پیدا نشد: ${rootServerCjs}\n` +
      `اول از ریشه‌ی پروژه "npm run build" را اجرا کنید (که هم سایت اصلی، هم Management App، هم server.cjs را می‌سازد)، بعد این اسکریپت را دوباره اجرا کنید.`
    );
  }
  if (!fs.existsSync(managementAppDist)) {
    fail(`پیدا نشد: ${managementAppDist}\nبیلد Management App هم باید قبل از این اسکریپت کامل شده باشد (بخشی از "npm run build" در ریشه‌ی پروژه است).`);
  }

  console.log('🧹 Cleaning previous bundle...');
  if (fs.existsSync(BUNDLE_DIR)) fs.rmSync(BUNDLE_DIR, { recursive: true, force: true });
  fs.mkdirSync(BUNDLE_DIR, { recursive: true });

  console.log('📦 Copying built site (dist/)...');
  copyRecursive(path.join(ROOT, 'dist'), path.join(BUNDLE_DIR, 'dist'));

  console.log('📦 Copying built Management App (Management App/Bazino/dist/)...');
  copyRecursive(managementAppDist, path.join(BUNDLE_DIR, 'Management App', 'Bazino', 'dist'));

  console.log('📄 Copying root package.json (production dependency list)...');
  const rootPkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
  const prodOnlyPkg = { name: rootPkg.name, version: rootPkg.version, dependencies: rootPkg.dependencies };
  fs.writeFileSync(path.join(BUNDLE_DIR, 'package.json'), JSON.stringify(prodOnlyPkg, null, 2));

  console.log('📥 Installing PRODUCTION-only dependencies into the bundle (this needs network access)...');
  try {
    execSync('npm install --omit=dev --no-audit --no-fund', { cwd: BUNDLE_DIR, stdio: 'inherit' });
  } catch (e) {
    fail(
      'npm install در پوشه‌ی bundle شکست خورد. این مرحله به اینترنت نیاز دارد ' +
      '(برای دانلود همون dependency هایی که سرور اصلی استفاده می‌کنه: express, better-sqlite3, ...). ' +
      'خروجی کامل خطا رو بالاتر ببینید.'
    );
  }

  console.log(`\n✅ Bundle آماده شد: ${BUNDLE_DIR}`);
  console.log('\n🔧 Rebuilding native modules (better-sqlite3, ...) against Electron\'s Node ABI...');
  console.log('   (Electron ships its own Node.js build with a different native module ABI than');
  console.log('   your system Node — skipping this step will crash the packaged app at runtime.)');
  try {
    execSync('npx --yes @electron/rebuild --module-dir .', { cwd: BUNDLE_DIR, stdio: 'inherit' });
  } catch (e) {
    fail(
      'electron-rebuild شکست خورد. بدون این مرحله، ماژول‌های native مثل better-sqlite3 با ' +
      'نسخه‌ی Node.js داخل Electron سازگار نیستن و اپ پکیج‌شده موقع اجرا کرش می‌کنه. ' +
      'مطمئن شید توی خود desktop-app هم "npm install" اجرا شده (برای در دسترس بودن @electron/rebuild).'
    );
  }

  console.log('\n✅ همه چیز آماده‌ست.');
  console.log('   اجرای تست: npm start   (در همین پوشه‌ی desktop-app)');
  console.log('   ساخت نصاب واقعی: npm run dist:win  /  dist:mac  /  dist:linux\n');
}

main();
