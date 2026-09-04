/**
 * ═══════════════════════════════════════════════════════════════════
 *  BAZINO THEME COMPONENT SDK (client) — «SDK کامپوننت قالب» — نسخه ۲
 * ═══════════════════════════════════════════════════════════════════
 *  قالب‌های نصب‌شده (ZIP) با فایل theme.js می‌توانند «بخش‌های» (regions)
 *  مختلف سایت را جایگزین کنند — دقیقاً مثل Partial View در ASP.NET:
 *  هر بخشی که قالب ثبت نکند، پیش‌فرض سایت رندر می‌شود.
 *
 *    const SDK = window.BazinoThemeSDK;
 *    SDK.registerComponent('hero', { render(props) { ... } });      // فقط هرو
 *    SDK.registerComponent('header', { render(props) { ... } });    // فقط هدر
 *    SDK.registerComponent('home', { render(props) { ... } });      // کل صفحه‌ی اصلی (v1)
 *
 *  بخش‌های استاندارد (THEME_REGIONS):
 *    header, hero, home.genres, home.lounges, home.results, home.tournaments,
 *    home.pricing, home.staff, home.location, footer, mobileNav, home (کل صفحه اصلی)
 *
 *  قرارداد props (نسخه ۲ — سازگار با ۱):
 *    language, dir, t(key), ts(key) [رشته‌های خود قالب از theme.json.strings],
 *    tokens, slides, onNavigate(tab), activeTab, user, featuredGames, gameGenres,
 *    matchHistory, pricingPackages, loungeSections, staffTeam, tournaments,
 *    settings, logoUrl, assetsBase, themeId, region
 * ═══════════════════════════════════════════════════════════════════
 */
import React from 'react';
import { LocationFrame, locationFrom } from './LocationFrame';
import { createRoot, type Root } from 'react-dom/client';

export type ThemeTab = 'home' | 'loyalty' | 'reservations' | 'cafe' | 'shop' | 'tournaments' | 'blog' | 'csharp' | 'chat' | 'presentation' | 'admin';

/** بخش‌های استاندارد سایت که قالب می‌تواند جایگزین کند */
export const THEME_REGIONS = [
  'home',
  'header',
  'hero',
  'home.genres',
  'home.lounges',
  'home.results',
  'home.tournaments',
  'home.pricing',
  'home.staff',
  'home.location',
  'footer',
  'mobileNav',
] as const;
export type ThemeRegion = typeof THEME_REGIONS[number];

/** نگاشت زبان → رشته (برای strings داخل theme.json) */
export type ThemeStringsMap = Record<string, Record<string, string>>;

/** اسلاید ادمین (چهارزبانه، نرمال‌شده) */
export interface ThemeSlide {
  id: string;
  imageUrl: string;
  mobileImageUrl?: string;
  target: string;
  title: Record<string, string>;
  desc: Record<string, string>;
}

/** قرارداد داده‌ای که اپ به کامپوننت قالب می‌دهد (نسخه ۲؛ v1 زیرمجموعه‌ی آن است) */
export interface ThemeComponentProps {
  language: string;
  dir: 'rtl' | 'ltr';
  /** ترجمه‌های خود سایت */
  t: (key: string) => string;
  /** ترجمه‌های خود قالب (theme.json → strings.<lang>.<key>) با fallback en → اولین زبان → key */
  ts: (key: string, fallback?: string) => string;
  /** توکن‌های طراحی (رنگ‌ها/فونت‌ها) قالب فعال */
  tokens: Record<string, string>;
  /** اسلایدهای تعریف‌شده در پنل ادمین (اگر خالی باشد، قالب باید داده‌ی نمونه‌ی خودش را نشان دهد) */
  slides: ThemeSlide[];
  onNavigate: (tab: ThemeTab | string) => void;
  activeTab?: string;
  user?: { username: string; points?: number; role?: string } | null;
  featuredGames: any[];
  gameGenres?: any[];
  matchHistory?: any[];
  pricingPackages?: any[];
  loungeSections?: any[];
  staffTeam?: any[];
  tournaments: any[];
  settings: Record<string, string>;
  /** آدرس استاندارد لوگوی سایت مادر */
  logoUrl: string;
  /** آدرس پایه فایل‌های assets این قالب (مثل /api/themes/<id>/assets) */
  assetsBase: string;
  themeId: string;
  /** نام بخشی که در حال رندر است */
  region: string;
}

export interface ThemeComponentDefinition {
  /** سازنده نمونه (مثل class) — در زمان رندر صدا زده می‌شود */
  create?: (props: ThemeComponentProps) => { render: () => React.ReactNode; unmount?: () => void };
  /** تابع رندر مستقیم */
  render?: (props: ThemeComponentProps) => React.ReactNode;
  /** نام نسخه قرارداد داده */
  apiVersion?: number;
}

type Factory = () => ThemeComponentDefinition;

interface RegisteredComponent {
  factory: Factory;
  apiVersion?: number;
}

const registry = new Map<string, RegisteredComponent>();
const listeners = new Set<() => void>();
let registryVersion = 0;

export const THEME_COMPONENT_API_VERSION = 2;

function notify() {
  registryVersion += 1;
  listeners.forEach(fn => { try { fn(); } catch { /* ignore */ } });
}

/** نسخه‌ی رجیستری — با هر ثبت/حذف زیاد می‌شود (برای re-render هاست‌ها) */
export function getRegistryVersion(): number { return registryVersion; }

/** شنونده‌ی تغییرات رجیستری (ThemeRegion از آن استفاده می‌کند) */
export function subscribeRegistry(fn: () => void): () => void {
  listeners.add(fn);
  return () => { listeners.delete(fn); };
}

/** ثبت یک کامپوننت قالب (از داخل theme.js). هم factory و هم تعریف مستقیم پذیرفته می‌شود. */
export function registerComponent(name: string, factoryOrDef: Factory | ThemeComponentDefinition): void {
  if (!name) return;
  const factory: Factory = typeof factoryOrDef === 'function' ? factoryOrDef : () => factoryOrDef;
  registry.set(name, { factory });
  notify();
}

/** حذف کامپوننت ثبت‌شده (بعد از حذف قالب یا قبل از بارگذاری نسخه‌ی جدید theme.js) */
export function unregisterComponent(name: string): void {
  unmountComponent(name);
  if (registry.delete(name)) notify();
}

/** حذف همه‌ی کامپوننت‌های قالب (هنگام تعویض/آپدیت قالب) */
export function unregisterAllComponents(): void {
  for (const name of Array.from(registry.keys())) unmountComponent(name);
  const had = registry.size > 0;
  registry.clear();
  if (had) notify();
}

/** آیا قالب برای این بخش کامپوننت دارد؟ */
export function hasComponent(name: string): boolean {
  return registry.has(name);
}

/** فهرست بخش‌های ثبت‌شده */
export function listRegisteredComponents(): string[] {
  return Array.from(registry.keys());
}

/* ---------- mount/unmount در DOM ---------- */
const mounted = new Map<string, Root>();

/** رندر کامپوننت ثبت‌شده در یک المان (هر بار props جدید → render دوباره روی همان root) */
export function mountComponent(
  name: string,
  container: HTMLElement,
  props: ThemeComponentProps
): boolean {
  const reg = registry.get(name);
  if (!reg) return false;

  let root = mounted.get(name);
  if (root && (root as any).__bzContainer !== container) {
    try { root.unmount(); } catch { /* ignore */ }
    root = undefined;
    mounted.delete(name);
  }
  if (!root) {
    root = createRoot(container);
    (root as any).__bzContainer = container;
    mounted.set(name, root);
  }

  const def = reg.factory();
  let out: unknown = null;
  try {
    out = def.render ? def.render(props) : (def.create ? def.create(props).render() : null);
  } catch (e) {
    console.error(`[ThemeSDK] render() of region "${name}" threw:`, e);
    out = null;
  }
  root.render(React.createElement(React.Fragment, null, normalizeRenderOutput(name, out)));
  return true;
}

/**
 * خروجی render قالب را به چیزی که React می‌فهمد تبدیل می‌کند:
 *  - React element / string / number / null → همان
 *  - HTMLElement / DocumentFragment (DOM خام) → داخل یک host تزریق می‌شود
 *  - { html: '<div>…</div>' } → innerHTML (فقط برای قالب‌های ساده)
 * پیش از این DOM خام بی‌صدا «هیچ» رندر می‌شد و نویسنده‌ی قالب فکر می‌کرد بخش قابل تغییر نیست.
 */
function normalizeRenderOutput(name: string, out: unknown): React.ReactNode {
  if (out == null || typeof out === 'string' || typeof out === 'number' || typeof out === 'boolean') return out as React.ReactNode;
  if (React.isValidElement(out) || Array.isArray(out)) return out as React.ReactNode;
  if (typeof Node !== 'undefined' && out instanceof Node) {
    const node = out;
    return React.createElement(DomHost, { key: 'dom', node });
  }
  if (typeof out === 'object' && typeof (out as any).html === 'string') {
    return React.createElement('div', { 'data-theme-html': name, dangerouslySetInnerHTML: { __html: (out as any).html } });
  }
  console.warn(`[ThemeSDK] region "${name}" render() returned an unsupported value; expected a React element (SDK.React.createElement), a DOM node or { html }.`, out);
  return null;
}

function DomHost({ node }: { node: Node }) {
  const ref = React.useRef<HTMLDivElement | null>(null);
  React.useLayoutEffect(() => {
    const host = ref.current;
    if (!host) return;
    host.replaceChildren(node);
    return () => { try { host.replaceChildren(); } catch { /* ignore */ } };
  }, [node]);
  return React.createElement('div', { ref, 'data-theme-dom': '' });
}

export function unmountComponent(name: string): void {
  const root = mounted.get(name);
  if (root) {
    // unmount در همان تیک رندر React مجاز نیست → به تیک بعد موکول می‌شود
    mounted.delete(name);
    Promise.resolve().then(() => { try { root.unmount(); } catch { /* ignore */ } });
  }
}

/* ---------- کمکی: ساخت ts() از theme.json.strings ---------- */
export function makeThemeStrings(strings: ThemeStringsMap | undefined, language: string): (key: string, fallback?: string) => string {
  const table = strings || {};
  const langs = Object.keys(table);
  return (key: string, fallback?: string) => {
    let v = table[language]?.[key] ?? table.en?.[key];
    if (v === undefined) for (const l of langs) { if (table[l]?.[key] !== undefined) { v = table[l][key]; break; } }
    return v ?? fallback ?? key;
  };
}

/* ---------- پنجره سراسری برای فایل‌های theme.js ---------- */
declare global {
  interface Window {
    BazinoThemeSDK?: {
      registerComponent: typeof registerComponent;
      unregisterComponent: typeof unregisterComponent;
      hasComponent: typeof hasComponent;
      listRegisteredComponents: typeof listRegisteredComponents;
      THEME_COMPONENT_API_VERSION: number;
      THEME_REGIONS: readonly string[];
      React: typeof React;
      /** فریم آماده‌ی لوکیشن واقعی کلاب (داده از تنظیمات ادمین) */
      LocationFrame: typeof LocationFrame;
      /** داده‌ی نرمال‌شده‌ی لوکیشن از settings */
      locationFrom: typeof locationFrom;
    };
  }
}

if (typeof window !== 'undefined' && !window.BazinoThemeSDK) {
  window.BazinoThemeSDK = {
    registerComponent,
    unregisterComponent,
    hasComponent,
    listRegisteredComponents,
    THEME_COMPONENT_API_VERSION,
    THEME_REGIONS,
    React,
    LocationFrame,
    locationFrom,
  };
}
