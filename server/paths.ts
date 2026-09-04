/**
 * مسیر داده‌های ماندگار سرور (Persistent data directory).
 *
 * چرا: روی Railway (و هر PaaS با فایل‌سیستم موقتی) هر چیزی که کنار کد نوشته
 * شود — پوشه‌ی قالب‌های نصب‌شده، فایل SQLite، install-config.json، فایل APK —
 * با هر دیپلوی/ری‌استارت پاک می‌شود. با ست‌کردن `BAZINO_DATA_DIR` (مثلاً `/data`
 * که یک Railway Volume روی آن mount شده) همه‌ی این‌ها به یک مسیر ماندگار می‌روند.
 *
 * بدون این متغیر رفتار قبلی حفظ می‌شود (cwd)، پس نصب‌های محلی/دسکتاپ تغییری نمی‌کنند.
 */
import path from "path";
import fs from "fs";

export const DATA_DIR: string = (() => {
  const env = (process.env.BAZINO_DATA_DIR || "").trim();
  const dir = env ? path.resolve(env) : process.cwd();
  try { fs.mkdirSync(dir, { recursive: true }); } catch { /* read-only fs → fallback below */ }
  return dir;
})();

export const IS_PERSISTENT_DATA_DIR = DATA_DIR !== process.cwd();

export function dataPath(...segments: string[]): string {
  return path.join(DATA_DIR, ...segments);
}

/** مسیر install-config.json — اگر نسخه‌ی قدیمی کنار کد باشد و در DATA_DIR نباشد، همان را می‌خواند. */
export function installConfigPath(): string {
  const primary = dataPath("install-config.json");
  if (fs.existsSync(primary)) return primary;
  const legacy = path.join(process.cwd(), "install-config.json");
  return fs.existsSync(legacy) ? legacy : primary;
}

/** آیا مسیر داده واقعاً قابل نوشتن است؟ (برای نمایش وضعیت در پنل) */
export function isDataDirWritable(): boolean {
  try { fs.accessSync(DATA_DIR, fs.constants.W_OK); return true; } catch { return false; }
}
