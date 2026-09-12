/**
 * نوشتن متادیتای بیلد (commit SHA) در dist/build-meta.json.
 *
 * چرا: وقتی چند دیپلوی Railway پشت‌سرهم در صف می‌ایستند، از بیرون نمی‌شود فهمید
 * پروداکشن دقیقاً روی کدام کامیت است. این فایل در زمان build ساخته می‌شود و
 * سرور آن را از /api/app-web/status برمی‌گرداند تا «کدِ در حال اجرا» قابل
 * تأیید باشد (RAILWAY_GIT_COMMIT_SHA / GITHUB_SHA، و در نبود هر دو یک مهر زمانی).
 */
import fs from 'node:fs';
import path from 'node:path';

const sha = process.env.RAILWAY_GIT_COMMIT_SHA
  || process.env.GITHUB_SHA
  || `local-${new Date().toISOString()}`;

const distDir = path.resolve(process.cwd(), 'dist');
fs.mkdirSync(distDir, { recursive: true });
fs.writeFileSync(
  path.join(distDir, 'build-meta.json'),
  JSON.stringify({ sha, builtAt: new Date().toISOString() }, null, 2),
);
console.log(`[build-meta] wrote dist/build-meta.json (sha=${sha.slice(0, 12)})`);
