/**
 * ═══════════════════════════════════════════════════════════════════
 *  BAZINO THEME COMPONENT SDK (client) — «SDK کامپوننت قالب»
 * ═══════════════════════════════════════════════════════════════════
 *  به قالب‌های نصب‌شده (ZIP) اجازه می‌دهد یک «کامپوننت صفحه اصلی»
 *  اختصاصی داشته باشند — دقیقاً مثل قالب‌های سیستمی (GecoPurpleHome
 *  و GamingAmpHome) — بدون اینکه کد قالب در باندل اپ کامپایل شود.
 *
 *  فایل theme.js داخل پکیج قالب باید یک کامپوننت بسازد و آن را با
 *  همین SDK ثبت کند:
 *
 *    const { createComponent } = window.BazinoThemeSDK;
 *    window.BazinoThemeSDK.registerComponent('home', createComponent({
 *      render() {
 *        return (
 *          <div className="my-hero">
 *            <h1>{this.props.settings?.clubName || 'BAZINO PRO'}</h1>
 *            <button onClick={() => this.props.onNavigate('reservations')}>
 *              Reserve
 *            </button>
 *          </div>
 *        );
 *      }
 *    }));
 *
 *  قرارداد props (نسخه 1):
 *    language, dir, t, onNavigate(tab), featuredGames, gameGenres,
 *    matchHistory, pricingPackages, loungeSections, staffTeam,
 *    tournaments, settings, logoUrl, assetsBase
 * ═══════════════════════════════════════════════════════════════════
 */
import React from 'react';
import { createRoot, type Root } from 'react-dom/client';

export type ThemeTab = 'loyalty' | 'reservations' | 'cafe' | 'shop' | 'tournaments' | 'blog' | 'csharp' | 'chat' | 'presentation';

/** قرارداد داده‌ای که اپ به کامپوننت قالب می‌دهد (نسخه 1) */
export interface ThemeComponentProps {
  language: string;
  dir: 'rtl' | 'ltr';
  t: (key: string) => string;
  onNavigate: (tab: ThemeTab | string) => void;
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
}

export interface ThemeComponentDefinition {
  /** سازنده نمونه (مثل class) — در زمان رندر صدا زده می‌شود */
  create?: (props: ThemeComponentProps) => { render: () => React.ReactNode; unmount?: () => void };
  /** تابع رندر مستقیم */
  render?: (props: ThemeComponentProps) => React.ReactNode;
  /** نام نسخه قرارداد داده */
  apiVersion?: number;
}

interface RegisteredComponent {
  factory: () => ThemeComponentDefinition;
  apiVersion?: number;
}

const registry = new Map<string, RegisteredComponent>();

export const THEME_COMPONENT_API_VERSION = 1;

/** ثبت یک کامپوننت قالب (از داخل theme.js) */
export function registerComponent(name: string, factory: () => ThemeComponentDefinition): void {
  if (!name) return;
  registry.set(name, { factory });
}

/** حذف کامپوننت ثبت‌شده (بعد از حذف قالب یا قبل از بارگذاری نسخه‌ی جدید theme.js) */
export function unregisterComponent(name: string): void {
  unmountComponent(name);
  registry.delete(name);
}

/** آیا قالب برای این اسلات کامپوننت دارد؟ */
export function hasComponent(name: string): boolean {
  return registry.has(name);
}

/* ---------- mount/unmount در DOM ---------- */
const mounted = new Map<string, Root>();

/** رندر کامپوننت ثبت‌شده در یک المان */
export function mountComponent(
  name: string,
  container: HTMLElement,
  props: ThemeComponentProps
): boolean {
  const reg = registry.get(name);
  if (!reg) return false;

  unmountComponent(name);

  const def = reg.factory();
  const el = React.createElement(
    React.Fragment,
    null,
    def.render ? def.render(props) : (def.create ? def.create(props).render() : null)
  );
  const root = createRoot(container);
  root.render(el);
  mounted.set(name, root);
  return true;
}

export function unmountComponent(name: string): void {
  const root = mounted.get(name);
  if (root) {
    root.unmount();
    mounted.delete(name);
  }
}

/* ---------- پنجره سراسری برای فایل‌های theme.js ---------- */
declare global {
  interface Window {
    BazinoThemeSDK?: {
      registerComponent: typeof registerComponent;
      hasComponent: typeof hasComponent;
      THEME_COMPONENT_API_VERSION: number;
      React: typeof React;
    };
  }
}

if (typeof window !== 'undefined' && !window.BazinoThemeSDK) {
  window.BazinoThemeSDK = {
    registerComponent,
    hasComponent,
    THEME_COMPONENT_API_VERSION,
    React,
  };
}
