/**
 * ═══════════════════════════════════════════════════════════════════
 *  BAZINO THEME PACKAGE (ZIP) — «پکیج قالب با فرمت ZIP» (کلاینت)
 * ═══════════════════════════════════════════════════════════════════
 *  این ماژول لایه کلاینت (مرورگر) روی «هسته مشترک» (themeZipCore)
 *  است. منطق خالص پارس/ساخت ZIP در core قرار دارد تا سرور هم بتواند
 *  دقیقاً همان فرمت را بخواند.
 *
 *  فرمت پکیج:
 *    theme.zip
 *    ├── theme.json   ← متادیتا (اختیاری)
 *    ├── theme.css    ← استایل کامل قالب (اجباری)
 *    └── assets/      ← تصویر/ویدئو/فونت/... (اختیاری)
 * ═══════════════════════════════════════════════════════════════════
 */
import {
  parseThemeZip,
  buildThemeZip as coreBuildThemeZip,
  buildSampleThemeZip,
  sanitizeThemeId,
  type ParsedZipTheme,
  type ZipParseError,
  type ZipThemeMeta
} from './themeZipCore';
import { generateCustomThemeCss, type ThemeInfo } from './index';

export type { ParsedZipTheme, ZipParseError, ZipThemeMeta, ThemeColorConfig } from './themeZipCore';
export { isZipParseError, sanitizeThemeId, parseThemeZip, buildSampleThemeZip } from './themeZipCore';

/* ---------- ساخت ZIP از یک قالب نصب‌شده (کلاینت) ----------
 * برای قالب‌های محلی (localStorage) که assets ندارند استفاده می‌شود.
 * قالب‌های سروری (با assets) از طریق API سرور خروجی گرفته می‌شوند. */
export function buildThemeZip(theme: ThemeInfo): Uint8Array {
  const css = (theme.css && theme.css.trim().length > 0)
    ? theme.css
    : generateCustomThemeCss(theme);
  const meta: ZipThemeMeta = {
    name: theme.name,
    id: theme.id,
    version: theme.version || '1.0.0',
    description: theme.description || '',
    colors: theme.colors,
  };
  return coreBuildThemeZip(css, meta, {});
}

/* ---------- دانلود یک فایل ZIP در مرورگر ---------- */
export function downloadZip(data: Uint8Array, filename: string) {
  try {
    const blob = new Blob([data], { type: 'application/zip' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  } catch (e) {
    console.error('[Themes] Download failed:', e);
  }
}
