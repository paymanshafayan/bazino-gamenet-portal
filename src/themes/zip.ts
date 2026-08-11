/**
 * ═══════════════════════════════════════════════════════════════════
 *  BAZINO THEME PACKAGE (ZIP) — «پکیج قالب با فرمت ZIP»
 * ═══════════════════════════════════════════════════════════════════
 *
 *  فرمت استاندارد پکیج قالب (فایل .zip):
 *  ─────────────────────────────────────
 *    theme.zip
 *    ├── theme.css         ← استایل کامل قالب (اجباری) — همان فرمت
 *    │                        فایل‌های src/themes/*.css
 *    └── theme.json        ← متادیتای قالب (اختیاری — اگر نباشد، نام/شناسه/
 *                             رنگ‌ها به‌صورت خودکار از CSS و نام فایل استخراج می‌شوند)
 *
 *  یعنی ساده‌ترین حالت: یک ZIP که فقط فایل CSS داخلش است هم قابل نصب است.
 *
 *  theme.json (اختیاری):
 *  {
 *    "name": "Neon Storm",              // نام قالب (اگر نباشد از نام فایل ZIP می‌آید)
 *    "id": "neon-storm",                // شناسه (اگر نباشد از body[data-theme] در CSS می‌آید)
 *    "version": "1.0.0",                // نسخه (اختیاری)
 *    "description": "...",              // توضیح کوتاه (اختیاری)
 *    "colors": {                        // رنگ‌ها برای پیش‌نمایش (اختیاری)
 *      "primary": "#00ff88",
 *      "bg": "#04070c",
 *      "card": "#0b1220"
 *    }
 *  }
 *
 *  theme.css باید دقیقاً به «فرمت جدید» نوشته شود تا تمام صفحات را
 *  پوشش دهد (الگو: src/themes/dark-gold.css):
 *    body[data-theme='neon-storm'] { --primary-color: ...; --dark-bg-color: ...; }
 *    .theme-neon-storm .site-header { ... }
 *    .theme-neon-storm .bg-dark-card { ... }
 *    .theme-neon-storm .btn { ... }
 *    .theme-neon-storm input { ... }
 *    ...
 *
 *  این ماژول از کتابخانه سبک fflate برای خواندن/ساخت ZIP استفاده می‌کند.
 * ═══════════════════════════════════════════════════════════════════
 */
import { unzipSync, zipSync, strFromU8, strToU8, type Zippable } from 'fflate';
import {
  sanitizeThemeId,
  generateCustomThemeCss,
  extractColorsFromCss,
  type ThemeInfo,
  type ThemeColorConfig
} from './index';

/* ---------- نتیجه پارس ---------- */
export interface ParsedZipTheme {
  theme: ThemeInfo;
  css: string;
}

export interface ZipParseError {
  error: string;
  /** کد خطا برای ترجمه پیام‌ها در رابط کاربری */
  code: 'invalid-zip' | 'no-css' | 'empty-css' | 'wrong-format' | 'duplicate-id';
}

const isZipParseError = (r: ParsedZipTheme | ZipParseError): r is ZipParseError => 'error' in r;

/* ---------- کمکی: پیدا کردن فایل داخل ZIP (بدون حساسیت به حروف) ---------- */
function findEntry(entries: string[], names: string[]): string | null {
  const lower = new Map(entries.map(k => [k.toLowerCase(), k]));
  for (const n of names) {
    const hit = lower.get(n.toLowerCase());
    if (hit) return hit;
  }
  return null;
}

/* ---------- حذف کامنت‌های CSS قبل از الگویابی ----------
 * کامنت‌ها ممکن است شامل نمونه‌هایی مثل body[data-theme='...'] باشند
 * و باعث match اشتباه شوند. */
function stripCssComments(css: string): string {
  return css.replace(/\/\*[\s\S]*?\*\//g, '');
}

/* ---------- استخراج شناسه از روی خود CSS (اولویت با CSS است) ---------- */
function extractIdFromCss(css: string): string | null {
  const code = stripCssComments(css);
  const m = code.match(/body\s*\[\s*data-theme\s*=\s*['"]([^'"]+)['"]\s*\]/);
  if (m) return sanitizeThemeId(m[1]);
  const m2 = code.match(/\.theme-([a-zA-Z0-9][a-zA-Z0-9-_]*)/);
  return m2 ? sanitizeThemeId(m2[1]) : null;
}

/* ---------- اعتبارسنجی اینکه CSS «فرمت جدید» را دارد ---------- */
function hasNewFormat(css: string): boolean {
  const code = stripCssComments(css);
  return /body\s*\[\s*data-theme\s*=/.test(code) || /\.theme-[a-zA-Z0-9_-]+\s/.test(code);
}

/* ═══════════════════════════════════════════════════════════════════
 *  پارس و اعتبارسنجی فایل ZIP قالب
 * ═══════════════════════════════════════════════════════════════════ */
export function parseThemeZip(data: Uint8Array, fallbackName?: string): ParsedZipTheme | ZipParseError {
  let files: Record<string, Uint8Array>;
  try {
    files = unzipSync(data);
  } catch (e) {
    return { error: 'فایل ZIP معتبر نیست یا خراب است', code: 'invalid-zip' };
  }

  const entries = Object.keys(files).map(k => k.replace(/\\/g, '/'));
  if (entries.length === 0) {
    return { error: 'فایل ZIP خالی است', code: 'invalid-zip' };
  }

  /* ۱) متادیتا (theme.json) — اختیاری!
   * اگر فایل theme.json داخل ZIP نباشد، نام/شناسه/رنگ‌ها به‌صورت خودکار
   * از داخل CSS و نام فایل استخراج می‌شوند؛ یعنی ZIP فقط-CSS هم نصب می‌شود. */
  const jsonKey = findEntry(entries, ['theme.json', 'bazino/theme.json', 'theme/theme.json']);
  let meta: any = {};
  if (jsonKey) {
    try {
      meta = JSON.parse(strFromU8(files[jsonKey]));
    } catch (e) {
      console.warn('[Themes] theme.json is invalid JSON — ignoring it:', e);
      meta = {};
    }
    if (!meta || typeof meta !== 'object') meta = {};
  }

  /* ۲) استایل قالب (theme.css) */
  const cssKey =
    findEntry(entries, ['theme.css', 'style.css']) ||
    entries.find(k => k.toLowerCase().endsWith('.css'));
  if (!cssKey) {
    return { error: 'فایل CSS قالب (theme.css) داخل ZIP پیدا نشد', code: 'no-css' };
  }
  let css = '';
  try {
    css = strFromU8(files[cssKey]);
  } catch (e) {
    return { error: 'فایل CSS قالب قابل خواندن نیست', code: 'no-css' };
  }
  if (!css || css.trim().length < 20) {
    return { error: 'فایل CSS قالب خالی است', code: 'empty-css' };
  }
  if (!hasNewFormat(css)) {
    return {
      error: 'فایل CSS با فرمت جدید سازگار نیست؛ باید شامل body[data-theme=\'...\'] و قوانین .theme-... باشد (الگو: src/themes/dark-gold.css)',
      code: 'wrong-format'
    };
  }

  /* ۳) شناسه و نام قالب:
   *  شناسه: اولویت با CSS (body[data-theme])، سپس theme.json، سپس نام فایل
   *  نام:    theme.json، سپس نام فایل ZIP، سپس خود شناسه */
  const cssId = extractIdFromCss(css);
  const metaId = typeof meta.id === 'string' ? meta.id : '';
  const fileBase = (fallbackName || 'Custom Theme')
    .replace(/\.[^/.]+$/, '').replace(/[_-]+/g, ' ').trim();
  const id = cssId || sanitizeThemeId(metaId || fileBase);
  const name = (typeof meta.name === 'string' && meta.name.trim())
    ? meta.name.trim()
    : (fileBase || id || 'Custom Theme');

  /* ۴) رنگ‌های پیش‌نمایش: از متادیتا، یا استخراج از CSS */
  let colors: ThemeColorConfig | undefined;
  if (meta.colors && typeof meta.colors === 'object') {
    colors = {
      primary: typeof meta.colors.primary === 'string' ? meta.colors.primary : '#ffb800',
      bg: typeof meta.colors.bg === 'string' ? meta.colors.bg : '#07080a',
      card: typeof meta.colors.card === 'string' ? meta.colors.card : '#12141c',
    };
  } else {
    colors = extractColorsFromCss(css);
  }

  const theme: ThemeInfo = {
    id,
    name,
    type: 'custom',
    kind: 'zip',
    css,
    colors,
    version: typeof meta.version === 'string' ? meta.version : undefined,
    description: typeof meta.description === 'string' ? meta.description : undefined,
  };

  return { theme, css };
}

/* ═══════════════════════════════════════════════════════════════════
 *  ساخت پکیج ZIP از یک قالب (خروجی‌گیری / نمونه)
 * ═══════════════════════════════════════════════════════════════════ */
export function buildThemeZip(theme: ThemeInfo): Uint8Array {
  const css = (theme.css && theme.css.trim().length > 0)
    ? theme.css
    : generateCustomThemeCss(theme);
  const json = {
    name: theme.name,
    id: theme.id,
    version: theme.version || '1.0.0',
    description: theme.description || '',
    colors: theme.colors || undefined,
  };
  const zippable: Zippable = {
    'theme.json': strToU8(JSON.stringify(json, null, 2)),
    'theme.css': strToU8(css),
  };
  return zipSync(zippable, { level: 6 });
}

/* ---------- ساخت فایل ZIP نمونه (برای دانلود قالب نمونه) ---------- */
export function buildSampleThemeZip(): Uint8Array {
  const sampleCss = `/* ═══════════════════════════════════════════════════
   BAZINO THEME — "Neon Storm" (نمونه)
   این فایل نمونه فرمت جدید پکیج قالب است. برای ساخت قالب خودتان
   از همین ساختار استفاده کنید: body[data-theme='...'] برای متغیرها
   و قوانین .theme-... برای تمام صفحات سایت.
   ═══════════════════════════════════════════════════════════════════ */

body[data-theme='neon-storm'] {
  --primary-color: #00ff88;
  --primary-hover-color: #00d957;
  --accent-red-color: #ff3b6b;
  --dark-bg-color: #04070c;
  --dark-card-color: #0b1220;

  --theme-bg: #04070c;
  --theme-card-bg: #0b1220;
  --theme-card-border: rgba(0, 255, 136, 0.25);
  --theme-card-radius: 1.1rem;
  --theme-primary: #00ff88;
  --theme-btn-skew: 0deg;
  --theme-btn-radius: 0.5rem;
}

body[data-theme='neon-storm'],
body[data-theme='neon-storm'] .app-bg-main {
  background-color: #04070c;
  background-image:
    radial-gradient(circle at 15% 10%, rgba(0, 255, 136, 0.14), transparent 50%),
    radial-gradient(circle at 85% 90%, rgba(0, 255, 214, 0.1), transparent 50%),
    linear-gradient(#04070c, #04070c);
  background-attachment: fixed;
}

body[data-theme='neon-storm'] ::selection {
  background: rgba(0, 255, 136, 0.35);
  color: #ffffff;
}

.theme-neon-storm .site-header {
  background-color: rgba(4, 7, 12, 0.94);
  border-bottom: 2px solid rgba(0, 255, 136, 0.45);
  box-shadow: 0 0 24px rgba(0, 255, 136, 0.12);
}

.theme-neon-storm .btn {
  border-radius: 0.5rem;
  border: 1px solid #00ff88;
  background-color: transparent;
  color: #00ff88;
  text-transform: uppercase;
  font-weight: 800;
}
.theme-neon-storm .btn:hover {
  background-color: #00ff88;
  color: #04070c;
  box-shadow: 0 0 18px rgba(0, 255, 136, 0.4);
}

.theme-neon-storm .bg-dark-card {
  background-color: #0b1220;
  border: 1px solid rgba(0, 255, 136, 0.2);
  border-radius: 1.1rem;
  box-shadow: 0 0 16px rgba(0, 255, 136, 0.08);
}

.theme-neon-storm .rounded-2xl,
.theme-neon-storm .rounded-xl,
.theme-neon-storm .rounded-lg,
.theme-neon-storm .rounded-md,
.theme-neon-storm .rounded-3xl {
  border-radius: 1.1rem !important;
}

.theme-neon-storm input,
.theme-neon-storm textarea,
.theme-neon-storm select {
  border-radius: 0.5rem;
  border: 1px solid rgba(0, 255, 136, 0.25);
  background-color: rgba(0, 0, 0, 0.3);
}
.theme-neon-storm input:focus,
.theme-neon-storm textarea:focus,
.theme-neon-storm select:focus {
  border-color: #00ff88;
  box-shadow: 0 0 12px rgba(0, 255, 136, 0.3);
}

.theme-neon-storm .theme-box {
  border-radius: 1.1rem;
  border: 1px solid rgba(0, 255, 136, 0.25);
  clip-path: none;
}
.theme-neon-storm .theme-btn {
  border-radius: 0.5rem;
  border: 2px solid #00ff88;
  color: #00ff88;
  background: transparent;
  clip-path: none;
}
.theme-neon-storm .theme-btn:hover {
  background-color: #00ff88;
  color: #04070c;
  box-shadow: 0 0 18px rgba(0, 255, 136, 0.45);
}

.theme-neon-storm .notched-clip,
.theme-neon-storm .notched-clip-sm {
  clip-path: none !important;
  border-radius: 0.8rem !important;
}

.theme-neon-storm .scrollbar-thin::-webkit-scrollbar-thumb {
  background: rgba(0, 255, 136, 0.3);
}
.theme-neon-storm .scrollbar-thin::-webkit-scrollbar-thumb:hover {
  background: rgba(0, 255, 136, 0.55);
}

.theme-neon-storm .neon-text-glow {
  text-shadow: 0 0 10px rgba(0, 255, 136, 0.6), 0 0 20px rgba(0, 255, 136, 0.15);
}
`;

  const sampleJson = {
    name: 'Neon Storm',
    id: 'neon-storm',
    version: '1.0.0',
    description: 'قالب نمونه نئونی سبز — فرمت جدید پکیج قالب بازینو',
    colors: {
      primary: '#00ff88',
      bg: '#04070c',
      card: '#0b1220',
    },
  };

  const zippable: Zippable = {
    'theme.json': strToU8(JSON.stringify(sampleJson, null, 2)),
    'theme.css': strToU8(sampleCss),
  };
  return zipSync(zippable, { level: 6 });
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

export { isZipParseError };
