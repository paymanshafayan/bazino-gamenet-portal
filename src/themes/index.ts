/**
 * ═══════════════════════════════════════════════════════════════════
 *  BAZINO THEME ENGINE — «موتور قالب‌بندی بازینو»
 * ═══════════════════════════════════════════════════════════════════
 *
 *  معماری جدید قالب‌ها (Theming System):
 *  ─────────────────────────────────────
 *  1) هر قالب، فایل CSS مجزای خودش را دارد  →  src/themes/<id>.css
 *  2) هر فایل قالب «تمام صفحات سایت» را پوشش می‌دهد:
 *       • متغیرهای رنگی  body[data-theme='<id>']
 *       • استایل هدر/ناوبری سایت  (.theme-<id> .site-header)
 *       • کارت‌ها، دکمه‌ها، اینپوت‌ها، مودال‌ها، اسکرول‌بارها، ...
 *       (همه‌ی تب‌ها: خانه، رزرو، کافه، فروشگاه، مسابقات، باشگاه، بلاگ، چت، ادمین)
 *  3) در هر لحظه فقط CSS قالب فعال به‌صورت یک <style> تزریق می‌شود؛
 *     با تغییر قالب، استایل قبلی حذف و استایل جدید جایگزین می‌شود
 *     بنابراین ظاهر «کامل» همه صفحات عوض می‌شود.
 *  4) قالب‌های سفارشی (ساخته‌شده در پنل ادمین) CSS خود را به‌صورت
 *     زنده از روی رنگ‌های انتخاب‌شده تولید می‌کنند و در localStorage
 *     ذخیره می‌شوند تا بعد از رفرش هم باقی بمانند.
 *
 *  فایل‌های قالب:
 *     dark-gold.css        → پیش‌فرض طلایی
 *     cyberpunk-cyan.css   → سایبرپانک فیروزه‌ای
 *     geco-purple.css      → جکو بنفش
 *     gaming-amp.css       → گیمینگ AMP
 *     console-grid.css     → گرید کنسولی (کلاسیک)
 *     gaming-hub.css       → (legacy – دیگر در لیست انتخاب نیست)
 * ═══════════════════════════════════════════════════════════════════
 */

/* ---------- تایپ‌ها ---------- */
export interface ThemeColorConfig {
  primary: string;
  bg: string;
  card: string;
}

export interface ThemeInfo {
  id: string;
  name: string;
  type: 'built-in' | 'custom';
  colors?: ThemeColorConfig;
}

/* ---------- قالب‌های سیستمی ---------- */
export const BUILT_IN_THEMES: ThemeInfo[] = [
  { id: 'dark-gold', name: 'Dark Gold', type: 'built-in' },
  { id: 'cyberpunk-cyan', name: 'Cyberpunk Cyan', type: 'built-in' },
  { id: 'geco-purple', name: 'Geco Purple', type: 'built-in' },
  { id: 'gaming-amp', name: 'Gaming AMP', type: 'built-in' },
  { id: 'console-grid', name: 'قالب گرید کنسولی (کلاسیک)', type: 'built-in' }
];

/* ---------- کلید ذخیره‌سازی قالب‌های سفارشی ---------- */
const CUSTOM_THEMES_KEY = 'bazino_custom_themes';
const THEME_ID_KEY = 'themeId';

/* ---------- بارگذاری فایل‌های CSS قالب‌ها (خارجی و مجزا) ----------
 * هر قالب یک فایل .css مستقل داخل src/themes است.
 * با ?inline محتوای هر فایل به‌صورت یک ماژول جداگانه باندل می‌شود
 * و فقط فایل قالب فعال به DOM تزریق می‌شود.
 */
const cssBundles = import.meta.glob('./*.css', {
  query: '?inline',
  import: 'default'
}) as Record<string, () => Promise<string>>;

/* CSS قالب پیش‌فرض به‌صورت ایستا ایمپورت می‌شود تا در اولین رندر
 * صفحه (قبل از paint) بدون هیچ پرشی اعمال شود. */
import darkGoldCss from './dark-gold.css?inline';

/* تصویر پس‌زمینه پیش‌فرض — به‌صورت ایمپورت Asset تا Vite در هر دو
 * حالت dev/build آدرس صحیح (هش‌شده) را تولید کند. */
import defaultBgUrl from '../assets/images/background.png';

const staticCss: Record<string, string> = {
  'dark-gold': darkGoldCss
};

/* ---------- تزریق استایل فعال ---------- */
let activeStyleTag: HTMLStyleElement | null = null;

function injectStyleTag(themeId: string, css: string) {
  // حذف استایل قالب قبلی → فقط ظاهر قالب فعال روی کل سایت می‌ماند
  if (activeStyleTag) {
    activeStyleTag.remove();
    activeStyleTag = null;
  }
  const tag = document.createElement('style');
  tag.id = 'bazino-active-theme-css';
  tag.setAttribute('data-theme', themeId);
  tag.textContent = css;
  document.head.appendChild(tag);
  activeStyleTag = tag;
}

/** بارگذاری و اعمال استایل یک قالب (built-in یا custom). */
export function loadThemeStylesheet(theme: ThemeInfo): Promise<void> | void {
  if (!theme) return;

  // قالب‌های سفارشی: تولید CSS از رنگ‌های ذخیره‌شده
  if (theme.type === 'custom') {
    injectStyleTag(theme.id, generateCustomThemeCss(theme));
    return;
  }

  // قالب‌های سیستمی که CSS آن‌ها هم‌اکنون در دسترس است (بدون async)
  if (staticCss[theme.id]) {
    injectStyleTag(theme.id, staticCss[theme.id]);
    return;
  }

  // بقیه قالب‌ها: ایمپورت پویای فایل CSS مجزای همان قالب
  const loader = cssBundles[`./${theme.id}.css`];
  if (!loader) {
    console.warn(`[Themes] CSS file not found for theme: ${theme.id}`);
    return;
  }
  return loader()
    .then(css => injectStyleTag(theme.id, css))
    .catch(err => console.error(`[Themes] Failed to load "${theme.id}" css:`, err));
}

/* ---------- ذخیره/خواندن قالب‌های سفارشی ---------- */
export function loadCustomThemes(): ThemeInfo[] {
  try {
    const raw = localStorage.getItem(CUSTOM_THEMES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed.filter((t: ThemeInfo) => t && t.id && t.type === 'custom')
      : [];
  } catch (e) {
    console.error('[Themes] Failed to read custom themes:', e);
    return [];
  }
}

export function saveCustomThemes(customThemes: ThemeInfo[]) {
  try {
    localStorage.setItem(CUSTOM_THEMES_KEY, JSON.stringify(customThemes));
  } catch (e) {
    console.error('[Themes] Failed to persist custom themes:', e);
  }
}

/* ---------- خواندن قالب ذخیره‌شده کاربر ---------- */
export function getStoredThemeId(): string {
  try {
    const saved = localStorage.getItem(THEME_ID_KEY) || 'dark-gold';
    // «gaming-hub» یک قالب قدیمی/حذف‌شده است → بازگشت به پیش‌فرض
    return saved === 'gaming-hub' ? 'dark-gold' : saved;
  } catch (e) {
    return 'dark-gold';
  }
}

/* ---------- ابزار کمکی رنگ ---------- */
/** تیره/روشن کردن یک رنگ هگز (percent: -20 یعنی ۲۰٪ تیره‌تر) */
export function shadeHex(hex: string, percent: number): string {
  let h = (hex || '#ffb800').replace('#', '').trim();
  if (h.length === 3) {
    h = h.split('').map(c => c + c).join('');
  }
  if (!/^[0-9a-fA-F]{6}$/.test(h)) return hex || '#ffb800';
  const num = parseInt(h, 16);
  const amt = Math.round(2.55 * percent);
  const r = Math.min(255, Math.max(0, (num >> 16) + amt));
  const g = Math.min(255, Math.max(0, ((num >> 8) & 0xff) + amt));
  const b = Math.min(255, Math.max(0, (num & 0xff) + amt));
  return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
}

/** تبدیل هگز به rgba با شفافیت دلخواه */
export function hexToRgba(hex: string, alpha: number): string {
  let h = (hex || '#ffb800').replace('#', '').trim();
  if (h.length === 3) {
    h = h.split('').map(c => c + c).join('');
  }
  if (!/^[0-9a-fA-F]{6}$/.test(h)) return `rgba(255,184,0,${alpha})`;
  const num = parseInt(h, 16);
  const r = num >> 16;
  const g = (num >> 8) & 0xff;
  const b = num & 0xff;
  return `rgba(${r},${g},${b},${alpha})`;
}

/** پاک‌سازی شناسه قالب برای استفاده امن در کلاس/سلکتور CSS */
export function sanitizeThemeId(id: string): string {
  const clean = (id || '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  return clean || 'custom-theme-' + Date.now().toString(36);
}

/* ---------- تولید CSS برای قالب‌های سفارشی ----------
 * وقتی ادمین یک قالب جدید با سه رنگ (اصلی/پس‌زمینه/کارت) می‌سازد،
 * این تابع یک فایل CSS کامل از همان الگوی قالب‌های سیستمی می‌سازد
 * تا قالب سفارشی هم روی تمام صفحات اعمال شود.
 */
export function generateCustomThemeCss(theme: ThemeInfo): string {
  const id = sanitizeThemeId(theme.id);
  const primary = theme.colors?.primary || '#ffb800';
  const bg = theme.colors?.bg || '#07080a';
  const card = theme.colors?.card || '#12141c';
  const hover = shadeHex(primary, -12);
  const pRgba10 = hexToRgba(primary, 0.1);
  const pRgba30 = hexToRgba(primary, 0.3);
  const pRgba60 = hexToRgba(primary, 0.6);

  return `
/* ═══════════════════════════════════════════════════
   BAZINO CUSTOM THEME — "${theme.name}" (${id})
   این CSS به‌صورت خودکار از رنگ‌های انتخاب‌شده در پنل
   مدیریت تولید شده و تمام صفحات سایت را پوشش می‌دهد.
   ═══════════════════════════════════════════════════ */

body[data-theme='${id}'] {
  --primary-color: ${primary};
  --primary-hover-color: ${hover};
  --accent-red-color: #ff3b30;
  --dark-bg-color: ${bg};
  --dark-card-color: ${card};

  --theme-bg: ${bg};
  --theme-card-bg: ${card};
  --theme-card-border: rgba(255, 255, 255, 0.12);
  --theme-card-radius: 0.9rem;
  --theme-primary: ${primary};
  --theme-btn-skew: 0deg;
  --theme-btn-radius: 0.6rem;
}

/* صفحه */
body[data-theme='${id}'],
body[data-theme='${id}'] .app-bg-main {
  background-color: ${bg};
  background-image: url('${defaultBgUrl}');
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  background-attachment: fixed;
}

body[data-theme='${id}'] ::selection {
  background: ${pRgba30};
  color: #ffffff;
}

/* هدر سایت */
.theme-${id} .site-header {
  border-bottom: 1px solid ${pRgba30};
  box-shadow: 0 6px 24px rgba(0, 0, 0, 0.35);
}

/* دکمه‌ها */
.theme-${id} .btn {
  border-radius: var(--theme-btn-radius);
  border: 1px solid ${primary};
  color: ${primary};
  background: transparent;
}
.theme-${id} .btn:hover {
  background-color: ${primary};
  color: ${bg};
  box-shadow: 0 0 18px ${pRgba30};
}

/* کارت‌ها */
.theme-${id} .bg-dark-card {
  background-color: ${card};
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: var(--theme-card-radius);
}

/* گوشه‌ها */
.theme-${id} .rounded-2xl,
.theme-${id} .rounded-xl,
.theme-${id} .rounded-lg,
.theme-${id} .rounded-md,
.theme-${id} .rounded-3xl {
  border-radius: var(--theme-card-radius) !important;
}

/* فرم‌ها */
.theme-${id} input,
.theme-${id} textarea,
.theme-${id} select {
  border-radius: var(--theme-btn-radius);
  border: 1px solid rgba(255, 255, 255, 0.14);
  background-color: rgba(0, 0, 0, 0.2);
}
.theme-${id} input:focus,
.theme-${id} textarea:focus,
.theme-${id} select:focus {
  border-color: ${primary};
  box-shadow: 0 0 10px ${pRgba30};
}

/* اجزای قالب (ThemeBox / ThemeBtn) */
.theme-${id} .theme-box {
  border-radius: var(--theme-card-radius);
  border: 1px solid rgba(255, 255, 255, 0.12);
  clip-path: none;
}
.theme-${id} .theme-btn {
  border-radius: var(--theme-btn-radius);
  border: 2px solid ${primary};
  color: ${primary};
  background: transparent;
  clip-path: none;
}
.theme-${id} .theme-btn:hover {
  background-color: ${primary};
  color: ${bg};
  box-shadow: 0 0 18px ${pRgba30};
}
.theme-${id} .notched-clip,
.theme-${id} .notched-clip-sm {
  clip-path: none !important;
  border-radius: var(--theme-card-radius) !important;
}

/* اسکرول‌بار */
.theme-${id} .scrollbar-thin::-webkit-scrollbar-thumb {
  background: ${pRgba30};
}
.theme-${id} .scrollbar-thin::-webkit-scrollbar-thumb:hover {
  background: ${pRgba60};
}

/* برجسته‌سازی نشان (کیکر) بخش‌ها */
.theme-${id} .neon-text-glow {
  text-shadow: 0 0 10px ${pRgba60}, 0 0 20px ${pRgba10};
}
.theme-${id} .neon-border-glow {
  box-shadow: 0 0 15px ${pRgba30};
}
`;
}
