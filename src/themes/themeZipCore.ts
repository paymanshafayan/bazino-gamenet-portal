/**
 * ═══════════════════════════════════════════════════════════════════
 *  BAZINO THEME PACKAGE CORE — «هسته مشترک پکیج قالب»
 *  (بدون وابستگی به Vite/مرورگر — قابل استفاده در کلاینت و سرور)
 * ═══════════════════════════════════════════════════════════════════
 *
 *  فرمت استاندارد پکیج قالب (فایل .zip) — همه فایل‌های اصلی اجباری‌اند:
 *  ─────────────────────────────────────
 *    theme.zip
 *    ├── theme.json        ← اجباری — متادیتای قالب (نام، id، نسخه، ...)
 *    ├── theme.css         ← اجباری — استایل کامل قالب
 *    ├── theme.js          ← اجباری — کامپوننت صفحه اصلی قالب (با SDK)
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
 *  کامپوننت قالب (theme.js) با SDK ثبت می‌شود:
 *      window.BazinoThemeSDK.registerComponent('home', factory)
 *  و همان props استاندارد قالب‌های سیستمی (GecoPurpleHome و ...) را
 *  دریافت می‌کند — برای جزئیات به src/themeSdk/sdk.ts مراجعه کنید.
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

export interface ZipThemeMeta {
  name?: string;
  id?: string;
  version?: string;
  description?: string;
  colors?: ThemeColorConfig;
}

/** نتیجه پارس موفق ZIP */
export interface ParsedZipTheme {
  meta: ZipThemeMeta;
  css: string;
  /** فایل‌های داخل پوشه assets (مسیر نسبی ← بایت) */
  assets: Record<string, Uint8Array>;
  /** کامپوننت قالب (theme.js) — اجباری، با SDK ثبت می‌شود */
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
  let componentJs: string | undefined;
  if (!jsKey) {
    return { error: 'فایل کامپوننت قالب (theme.js) داخل ZIP پیدا نشد — این فایل اجباری است و صفحه اصلی قالب را می‌سازد', code: 'no-js' };
  }
  try {
    const js = strFromU8(files[jsKey]);
    if (js.trim().length === 0) {
      return { error: 'فایل theme.js خالی است — باید کامپوننت صفحه اصلی را با SDK ثبت کند', code: 'empty-js' };
    }
    componentJs = js;
  } catch (e) {
    return { error: 'فایل theme.js قابل خواندن نیست', code: 'no-js' };
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

  return {
    meta: { ...meta, id, name, colors, version: typeof meta.version === 'string' ? meta.version : undefined, description: typeof meta.description === 'string' ? meta.description : undefined },
    css,
    assets,
    componentJs,
    ignoredFiles
  };
}

/* ═══════════════════════════════════════════════════════════════════
 *  ساخت پکیج ZIP از CSS + متادیتا + assets (+ اختیاری theme.js)
 * ═══════════════════════════════════════════════════════════════════ */
export function buildThemeZip(
  css: string,
  meta: ZipThemeMeta,
  assets: Record<string, Uint8Array> = {},
  componentJs: string
): Uint8Array {
  const zippable: Zippable = {
    'theme.json': strToU8(JSON.stringify(meta, null, 2)),
    'theme.css': strToU8(css),
    // theme.js اجباری است — بدون آن پکیج معتبر نیست (طبق فرمت واحد قالب)
    'theme.js': strToU8(componentJs),
  };
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

/* پس‌زمینه از فایل داخل پوشه assets خوانده می‌شود */
body[data-theme='neon-storm'],
body[data-theme='neon-storm'] .app-bg-main {
  background-color: #04070c;
  background-image: url('assets/banner.svg');
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
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
`;
}

/* ---------- کامپوننت نمونه (theme.js) برای قالب نمونه ----------
 * قالب‌ها می‌توانند یک فایل theme.js اختیاری داشته باشند که با SDK
 * (window.BazinoThemeSDK) یک کامپوننت صفحه اصلی اختصاصی ثبت می‌کند —
 * دقیقاً مثل قالب‌های سیستمی GecoPurpleHome / GamingAmpHome. */
export function generateSampleThemeJs(): string {
  return `/* BAZINO THEME COMPONENT — sample (Neon Storm) */
/* با SDK ثبت می‌شود: window.BazinoThemeSDK.registerComponent('home', factory) */
(function () {
  var SDK = window.BazinoThemeSDK;
  if (!SDK || !SDK.registerComponent) {
    console.warn('[BazinoThemeSDK] SDK not found — component skipped.');
    return;
  }

  SDK.registerComponent('home', function () {
    return {
      apiVersion: 1,
      render: function (props) {
        var R = SDK.React;
        if (!R) return null;

        var fa = props.language === 'fa';
        var featured = (props.featuredGames || []).slice(0, 3);
        var tours = (props.tournaments || []).slice(0, 3);

        return R.createElement('div', { dir: props.dir, className: 'bazino-sample-theme-root w-full' },
          /* Hero */
          R.createElement('section', { className: 'relative w-full overflow-hidden', style: { background: "url('" + props.assetsBase + "/banner.svg') center/cover no-repeat #04070c", minHeight: '420px' } },
            R.createElement('div', { className: 'absolute inset-0', style: { background: 'linear-gradient(90deg, rgba(4,7,12,0.9), rgba(4,7,12,0.35) 60%, transparent)' } }),
            R.createElement('div', { className: 'relative z-10 max-w-6xl mx-auto px-6 py-24 text-white' },
              R.createElement('h1', { className: 'text-3xl md:text-5xl font-black font-mono' },
                fa ? 'نئون استورم — قالب نمونه' : 'NEON STORM — Sample Theme'),
              R.createElement('p', { className: 'mt-3 text-gray-300 max-w-xl' },
                fa
                  ? 'این صفحه اصلی توسط کامپوننت قالب (theme.js) ساخته شده است — دقیقاً مثل GecoPurpleHome.'
                  : 'This homepage is rendered by the theme component (theme.js) — just like GecoPurpleHome.'),
              R.createElement('div', { className: 'mt-6 flex gap-3 flex-wrap' },
                R.createElement('button', {
                  onClick: function () { props.onNavigate('reservations'); },
                  className: 'px-6 py-3 font-black uppercase text-xs rounded bg-[#00ff88] text-black cursor-pointer'
                }, fa ? 'رزرو سیستم' : 'Reserve System'),
                R.createElement('button', {
                  onClick: function () { props.onNavigate('tournaments'); },
                  className: 'px-6 py-3 font-black uppercase text-xs rounded border border-[#00ff88] text-[#00ff88] cursor-pointer'
                }, fa ? 'مسابقات' : 'Tournaments')
              )
            )
          ),

          /* Featured games from the same data contract as built-in themes */
          R.createElement('section', { className: 'max-w-6xl mx-auto px-6 py-10' },
            R.createElement('h2', { className: 'text-white font-black text-xl mb-5 font-mono' },
              fa ? 'بازی‌های ویژه' : 'FEATURED GAMES'),
            R.createElement('div', { className: 'grid grid-cols-1 md:grid-cols-3 gap-4' },
              featured.map(function (game, i) {
                return R.createElement('div', { key: i, className: 'rounded-lg overflow-hidden border border-white/10 bg-[#0b1220]' },
                  R.createElement('img', { src: game.imageUrl || game.image, className: 'w-full h-36 object-cover', referrerPolicy: 'no-referrer' }),
                  R.createElement('div', { className: 'p-3' },
                    R.createElement('h3', { className: 'text-white text-sm font-bold' },
                      game.title ? (game.title[props.language] || game.title.en || game.title.fa) : ''),
                    R.createElement('p', { className: 'text-gray-400 text-xs mt-1 line-clamp-2' },
                      game.desc ? (game.desc[props.language] || game.desc.en || '') : '')
                  )
                );
              })
            )
          ),

          /* Tournaments + logo from the mother site */
          R.createElement('section', { className: 'max-w-6xl mx-auto px-6 pb-12' },
            R.createElement('div', { className: 'flex items-center gap-3 mb-5' },
              R.createElement('img', { src: props.logoUrl, alt: 'BAZINO', className: 'h-8 w-auto opacity-80' }),
              R.createElement('h2', { className: 'text-white font-black text-xl font-mono' },
                fa ? 'مسابقات فعال' : 'ACTIVE TOURNAMENTS')
            ),
            R.createElement('div', { className: 'flex flex-col gap-3' },
              tours.map(function (t, i) {
                return R.createElement('div', { key: i, className: 'flex items-center justify-between p-3 rounded border border-white/10 bg-[#0b1220]' },
                  R.createElement('span', { className: 'text-white text-sm font-bold' }, t.title),
                  R.createElement('span', { className: 'text-[#00ff88] text-xs font-mono font-bold' },
                    t.registrationFee ? t.registrationFee.toLocaleString() + ' ' + (fa ? 'تومان' : 'T') : '')
                );
              })
            )
          )
        );
      }
    };
  });

  console.log('[BazinoThemeSDK] sample theme component registered.');
})();
`;
}

/* ---------- ساخت فایل ZIP نمونه (شامل assets + کامپوننت) ---------- */
export function buildSampleThemeZip(): Uint8Array {
  const meta: ZipThemeMeta = {
    name: 'Neon Storm',
    id: 'neon-storm',
    version: '1.0.0',
    description: 'قالب نمونه نئونی سبز — فرمت جدید پکیج قالب بازینو (شامل پوشه assets و کامپوننت theme.js)',
    colors: { primary: '#00ff88', bg: '#04070c', card: '#0b1220' },
  };
  return buildThemeZip(generateSampleThemeCss(), meta, generateSampleAssets(), generateSampleThemeJs());
}
