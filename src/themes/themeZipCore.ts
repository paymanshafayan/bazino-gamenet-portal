/**
 * ═══════════════════════════════════════════════════════════════════
 *  BAZINO THEME PACKAGE CORE — «هسته مشترک پکیج قالب»
 *  (بدون وابستگی به Vite/مرورگر — قابل استفاده در کلاینت و سرور)
 * ═══════════════════════════════════════════════════════════════════
 *
 *  فرمت استاندارد پکیج قالب (فایل .zip):
 *  ─────────────────────────────────────
 *    theme.zip
 *    ├── theme.json        ← توصیه‌شده — متادیتا (نام، id، نسخه، colors، tokens، strings، regions)
 *    ├── theme.css         ← اجباری — استایل کامل قالب
 *    ├── theme.js          ← اختیاری — بخش‌های (regions) اختصاصی قالب با SDK: header/hero/…/home
 *    └── assets/           ← اختیاری — فایل‌های مورد نیاز قالب
 *        ├── logo.png          تصویر، ویدئو، فونت، آیکون و ...
 *        ├── banner.jpg
 *        └── ...
 *
 *  در فایل CSS می‌توان به فایل‌های assets با مسیر نسبی اشاره کرد:
 *      background: url('assets/banner.jpg');
 *      src: url('assets/font.woff2');
 *  هنگام سرو شدن، این مسیرها به آدرس واقعی فایل قالب تبدیل می‌شوند.
 *
 *  کامپوننت‌های قالب (theme.js) با SDK برای هر بخش ثبت می‌شوند (Partial View):
 *      window.BazinoThemeSDK.registerComponent('hero', { render(props) {...} })
 *  هر بخشی که ثبت نشود با پیاده‌سازی پیش‌فرض سایت رندر می‌شود.
 *  برای جزئیات به src/themeSdk/sdk.ts و src/themes/README.md مراجعه کنید.
 *
 *  این ماژول فقط از fflate استفاده می‌کند (هیچ import مرورگر/ویتی ندارد).
 * ═══════════════════════════════════════════════════════════════════
 */
import { unzipSync, zipSync, strFromU8, strToU8, type Zippable } from 'fflate';
import {
  sanitizeThemeId,
  stripCssComments,
  extractIdFromCss,
  hasNewFormat,
  extractColorsFromCss
} from './themeCssUtils';

export {
  sanitizeThemeId,
  stripCssComments,
  extractIdFromCss,
  hasNewFormat,
  extractColorsFromCss
} from './themeCssUtils';

/* ---------- تایپ‌های متادیتا ---------- */
export interface ThemeColorConfig {
  primary: string;
  bg: string;
  card: string;
}

/** رشته‌های چندزبانه‌ی خود قالب: strings.<lang>.<key> */
export type ThemeStrings = Record<string, Record<string, string>>;

export interface ZipThemeMeta {
  name?: string;
  id?: string;
  version?: string;
  description?: string;
  author?: string;
  colors?: ThemeColorConfig;
  /** توکن‌های طراحی اضافه (به متغیرهای --bz-* نگاشت می‌شوند) */
  tokens?: Record<string, string>;
  /** رشته‌های چندزبانه‌ی قالب (fa/en/ru/tr) */
  strings?: ThemeStrings;
  /** بخش‌هایی که theme.js ثبت می‌کند (اعلامی — برای نمایش در پنل) */
  regions?: string[];
  /** حداقل نسخه‌ی SDK مورد نیاز */
  sdkVersion?: number;
  [extra: string]: unknown;
}

/** نتیجه پارس موفق ZIP */
export interface ParsedZipTheme {
  meta: ZipThemeMeta;
  css: string;
  /** فایل‌های داخل پوشه assets (مسیر نسبی ← بایت) */
  assets: Record<string, Uint8Array>;
  /** کامپوننت(های) قالب (theme.js) — اختیاری؛ با SDK بخش‌ها را ثبت می‌کند. رشته‌ی خالی = قالب CSS-only */
  componentJs: string;
  /** سایر فایل‌های نادیده‌گرفته‌شده (خارج از assets و خارج از theme.json/css/js) */
  ignoredFiles: string[];
}

export interface ZipParseError {
  error: string;
  code: 'invalid-zip' | 'no-css' | 'empty-css' | 'wrong-format' | 'no-js' | 'empty-js' | 'unsafe-path';
}

export const isZipParseError = (r: ParsedZipTheme | ZipParseError): r is ZipParseError => 'error' in r;

/* ---------- ابزارهای کمکی ---------- */

/** پیدا کردن فایل داخل ZIP (بدون حساسیت به حروف و با نرمال‌سازی / ) */
function findEntry(entries: string[], names: string[]): string | null {
  const norm = new Map(entries.map(k => [k.toLowerCase(), k]));
  for (const n of names) {
    const hit = norm.get(n.toLowerCase());
    if (hit) return hit;
  }
  return null;
}

/** آیا مسیر داخل ZIP امن است؟ (جلوگیری از path traversal) */
function isSafeEntryPath(p: string): boolean {
  if (p.startsWith('/') || /^[a-zA-Z]:/.test(p)) return false;
  const parts = p.split('/');
  if (parts.some(part => part === '..')) return false;
  return true;
}

/** نرمال‌سازی مسیر ورودی ZIP (حذف ./ و پشت‌slash) */
function normalizeEntryPath(p: string): string {
  return p.replace(/\\/g, '/').replace(/^\.\/+/, '').replace(/\/+$/, '');
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

  const entries = Object.keys(files).map(normalizeEntryPath).filter(Boolean);
  if (entries.length === 0) {
    return { error: 'فایل ZIP خالی است', code: 'invalid-zip' };
  }

  // بررسی امنیت مسیرها (جلوگیری از خروج از پوشه قالب)
  for (const raw of Object.keys(files)) {
    if (!isSafeEntryPath(normalizeEntryPath(raw))) {
      return { error: `مسیر ناامن داخل ZIP: ${raw}`, code: 'unsafe-path' };
    }
  }

  /* ۱) متادیتا (theme.json) — اختیاری */
  const jsonKey = findEntry(entries, ['theme.json']);
  let meta: ZipThemeMeta = {};
  if (jsonKey) {
    try {
      const parsed = JSON.parse(strFromU8(files[jsonKey]));
      if (parsed && typeof parsed === 'object') meta = parsed;
    } catch (e) {
      console.warn('[ThemeZip] theme.json is invalid JSON — ignoring it:', e);
    }
  }

  /* ۲) استایل قالب (theme.css) — اجباری */
  const cssKey = findEntry(entries, ['theme.css', 'style.css']) || entries.find(k => k.toLowerCase().endsWith('.css'));
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

  /* ۳) فایل‌های assets/ و سایر فایل‌ها (+ کامپوننت theme.js اختیاری) */
  const assets: Record<string, Uint8Array> = {};
  const ignoredFiles: string[] = [];
  const jsKey = findEntry(entries, ['theme.js']);
  let componentJs = '';
  if (jsKey) {
    try {
      componentJs = strFromU8(files[jsKey]);
    } catch (e) {
      return { error: 'فایل theme.js قابل خواندن نیست', code: 'no-js' };
    }
  }
  const knownKeys = new Set([jsonKey, cssKey, jsKey, 'theme.json', 'theme.css', 'theme.js'].filter(Boolean));
  for (const raw of Object.keys(files)) {
    const norm = normalizeEntryPath(raw);
    if (knownKeys.has(norm)) continue;
    if (norm.startsWith('assets/')) {
      assets[norm.slice('assets/'.length)] = files[raw];
    } else if (norm.startsWith('bazino/')) {
      const rel = norm.slice('bazino/'.length);
      if (rel.startsWith('assets/')) assets[rel.slice('assets/'.length)] = files[raw];
      else ignoredFiles.push(norm);
    } else {
      ignoredFiles.push(norm);
    }
  }

  /* ۴) شناسه و نام */
  const cssId = extractIdFromCss(css);
  const metaId = typeof meta.id === 'string' ? meta.id : '';
  const fileBase = (fallbackName || 'Custom Theme')
    .replace(/\.[^/.]+$/, '').replace(/[_-]+/g, ' ').trim();
  const id = cssId || sanitizeThemeId(metaId || fileBase);
  const name = (typeof meta.name === 'string' && meta.name.trim())
    ? meta.name.trim()
    : (fileBase || id || 'Custom Theme');

  /* ۵) رنگ‌ها */
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

  /* ۶) رشته‌های چندزبانه، توکن‌ها و بخش‌ها (اختیاری) */
  const strings = normalizeThemeStrings(meta.strings);
  const tokens = normalizeTokens(meta.tokens);
  const regions = Array.isArray(meta.regions) ? meta.regions.filter((r): r is string => typeof r === 'string') : undefined;

  return {
    meta: {
      ...meta, id, name, colors,
      version: typeof meta.version === 'string' ? meta.version : undefined,
      description: typeof meta.description === 'string' ? meta.description : undefined,
      strings, tokens, regions,
    },
    css,
    assets,
    componentJs,
    ignoredFiles
  };
}

export function normalizeThemeStrings(raw: unknown): ThemeStrings | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const out: ThemeStrings = {};
  for (const [lang, table] of Object.entries(raw as Record<string, unknown>)) {
    if (!table || typeof table !== 'object') continue;
    const clean: Record<string, string> = {};
    for (const [k, v] of Object.entries(table as Record<string, unknown>)) {
      if (typeof v === 'string') clean[k] = v;
    }
    if (Object.keys(clean).length) out[lang] = clean;
  }
  return Object.keys(out).length ? out : undefined;
}

export function normalizeTokens(raw: unknown): Record<string, string> | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof v === 'string' && /^[a-zA-Z][a-zA-Z0-9-]*$/.test(k) && v.length < 200 && !/[;{}<>]/.test(v)) out[k] = v;
  }
  return Object.keys(out).length ? out : undefined;
}

/* ═══════════════════════════════════════════════════════════════════
 *  ساخت پکیج ZIP از CSS + متادیتا + assets (+ اختیاری theme.js)
 * ═══════════════════════════════════════════════════════════════════ */
export function buildThemeZip(
  css: string,
  meta: ZipThemeMeta,
  assets: Record<string, Uint8Array> = {},
  componentJs?: string
): Uint8Array {
  const zippable: Zippable = {
    'theme.json': strToU8(JSON.stringify(meta, null, 2)),
    'theme.css': strToU8(css),
  };
  // theme.js اختیاری است — قالب CSS-only هم معتبر است
  if (componentJs && componentJs.trim()) zippable['theme.js'] = strToU8(componentJs);
  for (const [rel, bytes] of Object.entries(assets)) {
    if (!rel || rel.includes('..')) continue;
    zippable[`assets/${rel}`] = bytes;
  }
  return zipSync(zippable, { level: 6 });
}

/* ---------- بازنویسی مسیر assets در CSS ----------
 * url('assets/...') یا url("./assets/...") ← مسیر واقعی سرو قالب
 * themeBaseUrl باید «ریشه» قالب باشد (مثلاً /api/themes/<id>) —
 * خود تابع assets/ را به انتهای مسیر اضافه می‌کند.
 * مثلاً: url('assets/banner.jpg') ← url('/api/themes/<id>/assets/banner.jpg') */
export function rewriteCssAssetUrls(css: string, themeBaseUrl: string): string {
  return css.replace(/url\(\s*(['"]?)((?:\.\/)?assets\/[^'")]+)\1\s*\)/gi, (_m, q: string, path: string) => {
    const clean = path.replace(/^\.\//, '');
    return `url('${themeBaseUrl}/${clean}')`;
  });
}

/* ---------- فایل‌های نمونه برای پوشه assets (برای قالب نمونه) ---------- */
export function generateSampleAssets(): Record<string, Uint8Array> {
  const logo = `<svg xmlns="http://www.w3.org/2000/svg" width="160" height="48" viewBox="0 0 160 48">
  <rect width="160" height="48" rx="10" fill="#04070c"/>
  <polygon points="12,12 28,12 34,36 18,36" fill="#00ff88"/>
  <polygon points="22,6 38,6 44,30 28,30" fill="#00d957"/>
  <text x="50" y="30" font-family="monospace" font-size="18" font-weight="bold" fill="#ffffff">BAZINO</text>
  <text x="118" y="30" font-family="monospace" font-size="13" font-weight="bold" fill="#00ff88">PRO</text>
</svg>`;

  const banner = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="600" viewBox="0 0 1200 600">
  <defs>
    <radialGradient id="g1" cx="20%" cy="15%" r="70%">
      <stop offset="0%" stop-color="#00ff88" stop-opacity="0.35"/>
      <stop offset="100%" stop-color="#04070c" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="g2" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#04110a"/>
      <stop offset="100%" stop-color="#04070c"/>
    </linearGradient>
  </defs>
  <rect width="1200" height="600" fill="url(#g2)"/>
  <rect width="1200" height="600" fill="url(#g1)"/>
  <g stroke="#00ff88" stroke-opacity="0.25" stroke-width="1">
    <line x1="0" y1="120" x2="1200" y2="120"/>
    <line x1="0" y1="240" x2="1200" y2="240"/>
    <line x1="0" y1="360" x2="1200" y2="360"/>
    <line x1="0" y1="480" x2="1200" y2="480"/>
  </g>
  <text x="80" y="300" font-family="monospace" font-size="64" font-weight="bold" fill="#ffffff">NEON STORM</text>
  <text x="84" y="360" font-family="monospace" font-size="26" font-weight="bold" fill="#00ff88">BAZINO SAMPLE THEME — assets/ banner</text>
  <rect x="80" y="400" width="280" height="14" rx="7" fill="#00ff88" opacity="0.85"/>
</svg>`;

  return {
    'logo.svg': strToU8(logo),
    'banner.svg': strToU8(banner),
  };
}

/* ---------- CSS نمونه قالب (Neon Storm) ---------- */
export function generateSampleThemeCss(): string {
  return `/* ═══════════════════════════════════════════════════
   BAZINO THEME — "Neon Storm" (نمونه)
   این فایل نمونه فرمت جدید پکیج قالب است — شامل پوشه assets/
   برای فایل‌های مورد نیاز قالب (تصویر، ویدئو، فونت و ...) و فایل
   theme.js برای کامپوننت صفحه اصلی اختصاصی.
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

/* پس‌زمینه‌ی کل سایت (بنر assets/banner.svg فقط در هرو استفاده می‌شود) */
body[data-theme='neon-storm'],
body[data-theme='neon-storm'] .app-bg-main {
  background-color: #04070c;
  background-image: radial-gradient(ellipse at top, rgba(0, 255, 136, 0.10), transparent 55%), linear-gradient(180deg, #04070c, #070d16);
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

/* لوگوی سایت مادر — هیچ قالبی حق تغییر آن را ندارد */
.theme-neon-storm .brand-logo-guard {
  display: inline-block !important;
  visibility: visible !important;
  opacity: 1 !important;
  filter: none !important;
}

/* ---------- بخش‌های اختصاصی قالب (theme.js: hero + footer) ---------- */
.theme-neon-storm .neon-kicker {
  display: inline-block; font-family: var(--font-mono, monospace); font-size: 11px; letter-spacing: .3em;
  text-transform: uppercase; color: #00ff88; border: 1px solid rgba(0,255,136,.4); padding: 4px 10px; border-radius: 999px;
}
.theme-neon-storm .neon-hero h1 { font-family: var(--font-display); text-shadow: 0 0 24px rgba(0,255,136,.35); }
.theme-neon-storm .neon-btn { padding: 12px 24px; font-weight: 900; text-transform: uppercase; font-size: 12px; border-radius: 6px; cursor: pointer; }
.theme-neon-storm .neon-btn-primary { background: #00ff88; color: #04070c; }
.theme-neon-storm .neon-btn-ghost { border: 1px solid #00ff88; color: #00ff88; background: transparent; }
.theme-neon-storm .neon-footer {
  display: flex; align-items: center; justify-content: center; gap: 16px; flex-wrap: wrap;
  padding: 28px 16px; margin-top: 48px; border-top: 1px solid rgba(0,255,136,.25); color: #9ca3af; font-size: 12px;
  /* فایل assets با مسیر نسبی — هنگام سرو به /api/themes/<id>/assets/... بازنویسی می‌شود */
  background: url('assets/banner.svg') center/cover no-repeat, #04070c;
  background-blend-mode: luminosity;
}
`;
}

/* ---------- کامپوننت نمونه (theme.js) برای قالب نمونه ----------
 * نمونه‌ی رسمی «بخش‌محور» (Partial View): فقط hero و footer را جایگزین می‌کند؛
 * هدر، ژانرها، مسابقات، قیمت‌ها و ... از پیش‌فرض سایت می‌آیند و با theme.css
 * رنگ می‌گیرند. متن‌ها از theme.json.strings (fa/en/ru/tr) با props.ts() خوانده می‌شوند. */
export function generateSampleThemeJs(): string {
  return `/* BAZINO THEME COMPONENTS — sample (Neon Storm) — SDK v2 (regions) */
(function () {
  var SDK = window.BazinoThemeSDK;
  if (!SDK || !SDK.registerComponent) {
    console.warn('[BazinoThemeSDK] SDK not found — components skipped.');
    return;
  }
  var R = SDK.React;
  var h = R.createElement;

  function pick(map, lang) {
    if (!map) return '';
    if (typeof map === 'string') return map;
    return map[lang] || map.en || map.fa || '';
  }

  /* ---- بخش HERO: از اسلایدهای ادمین (props.slides) استفاده می‌کند؛ اگر خالی بود، داده‌ی نمونه‌ی سایت (featuredGames) ---- */
  SDK.registerComponent('hero', {
    apiVersion: 2,
    render: function (props) {
      var ts = props.ts;
      var lang = props.language;
      var slides = (props.slides && props.slides.length) ? props.slides : (props.featuredGames || []);
      var first = slides[0] || {};
      var img = first.imageUrl || first.image || (props.assetsBase + '/banner.svg');
      return h('section', { className: 'neon-hero relative w-full overflow-hidden', dir: props.dir,
          style: { background: "url('" + img + "') center/cover no-repeat #04070c", minHeight: '440px' } },
        h('div', { className: 'absolute inset-0', style: { background: 'linear-gradient(90deg, rgba(4,7,12,0.92), rgba(4,7,12,0.4) 60%, transparent)' } }),
        h('div', { className: 'relative z-10 max-w-6xl mx-auto px-6 py-24 text-white' },
          h('span', { className: 'neon-kicker' }, ts('kicker')),
          h('h1', { className: 'text-3xl md:text-5xl font-black mt-2' }, pick(first.title, lang) || ts('title')),
          h('p', { className: 'mt-3 text-gray-300 max-w-xl' }, pick(first.desc, lang) || ts('subtitle')),
          h('div', { className: 'mt-6 flex gap-3 flex-wrap' },
            h('button', { onClick: function () { props.onNavigate(first.target || 'reservations'); }, className: 'neon-btn neon-btn-primary' }, ts('cta')),
            h('button', { onClick: function () { props.onNavigate('tournaments'); }, className: 'neon-btn neon-btn-ghost' }, ts('tournaments'))
          )
        )
      );
    }
  });

  /* ---- بخش FOOTER ---- */
  SDK.registerComponent('footer', {
    apiVersion: 2,
    render: function (props) {
      return h('footer', { className: 'neon-footer', dir: props.dir },
        h('img', { src: props.logoUrl, alt: 'BAZINO', className: 'h-8 w-auto opacity-80' }),
        h('span', null, props.ts('footer')),
        h('span', { className: 'font-mono text-xs opacity-60', dir: 'ltr' }, 'theme: ' + props.themeId)
      );
    }
  });

  console.log('[BazinoThemeSDK] sample theme regions registered:', SDK.listRegisteredComponents());
})();
`;
}

/** رشته‌های چهارزبانه‌ی قالب نمونه (theme.json.strings) */
export function generateSampleThemeStrings(): ThemeStrings {
  return {
    fa: { kicker: 'قالب نمونه — بخش‌محور', title: 'نئون استورم', subtitle: 'این هرو توسط theme.js قالب ساخته شده؛ بقیه‌ی بخش‌ها پیش‌فرض سایت هستند و با theme.css رنگ گرفته‌اند.', cta: 'رزرو سیستم', tournaments: 'مسابقات', footer: 'ساخته‌شده با موتور قالب بازینو' },
    en: { kicker: 'Sample theme — region based', title: 'NEON STORM', subtitle: 'This hero is rendered by the theme\'s theme.js; every other region is the site default, restyled by theme.css.', cta: 'Reserve a rig', tournaments: 'Tournaments', footer: 'Built with the Bazino theme engine' },
    ru: { kicker: 'Пример темы — по областям', title: 'NEON STORM', subtitle: 'Этот hero рисует theme.js темы; остальные области — стандартные, перекрашенные через theme.css.', cta: 'Забронировать', tournaments: 'Турниры', footer: 'Создано на движке тем Bazino' },
    tr: { kicker: 'Örnek tema — bölge tabanlı', title: 'NEON STORM', subtitle: 'Bu hero temanın theme.js dosyasıyla çizilir; diğer bölgeler site varsayılanıdır ve theme.css ile renklenir.', cta: 'Sistem rezerve et', tournaments: 'Turnuvalar', footer: 'Bazino tema motoruyla üretildi' },
  };
}

/* ---------- ساخت فایل ZIP نمونه (شامل assets + کامپوننت) ---------- */
export function buildSampleThemeZip(): Uint8Array {
  const meta: ZipThemeMeta = {
    name: 'Neon Storm',
    id: 'neon-storm',
    version: '1.0.0',
    description: 'قالب نمونه نئونی سبز — پکیج بخش‌محور بازینو (theme.css + theme.json[strings/tokens] + theme.js[hero, footer] + assets/)',
    colors: { primary: '#00ff88', bg: '#04070c', card: '#0b1220' },
    tokens: { 'card-2': '#0b1220', 'card-3': '#0d1628', surface: '#081018', 'surface-2': '#04070c', success: '#00ff88', info: '#00d8ff' },
    strings: generateSampleThemeStrings(),
    regions: ['hero', 'footer'],
    sdkVersion: 2,
  };
  return buildThemeZip(generateSampleThemeCss(), meta, generateSampleAssets(), generateSampleThemeJs());
}
