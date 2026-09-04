/**
 * ThemeRegion — «Partial View» سایت.
 *
 *   <ThemeRegion name="hero" fallback={<DefaultHero/>} props={...} />
 *
 * اگر قالب فعال برای این بخش کامپوننتی ثبت کرده باشد (theme.js →
 * SDK.registerComponent('hero', ...)) همان رندر می‌شود؛ وگرنه fallback
 * (پیاده‌سازی پیش‌فرض سایت). با تغییر زبان/داده‌ها props جدید به کامپوننت
 * قالب داده می‌شود، و با تعویض/آپدیت قالب رجیستری عوض شده و بخش دوباره رندر می‌شود.
 */
import React, { createContext, useContext, useEffect, useRef, useSyncExternalStore } from 'react';
import {
  hasComponent, mountComponent, unmountComponent, subscribeRegistry, getRegistryVersion,
  type ThemeComponentProps, type ThemeSlide, type ThemeStringsMap, makeThemeStrings,
} from './sdk';

/** داده‌های مشترکی که App برای همه‌ی بخش‌ها فراهم می‌کند */
export interface ThemeRegionBase {
  language: string;
  dir: 'rtl' | 'ltr';
  t: (key: string) => string;
  themeId: string;
  /** theme.json.strings قالب فعال */
  strings?: ThemeStringsMap;
  tokens: Record<string, string>;
  slides: ThemeSlide[];
  onNavigate: (tab: string) => void;
  activeTab?: string;
  user?: ThemeComponentProps['user'];
  settings: Record<string, string>;
  logoUrl: string;
  assetsBase: string;
  /** آیا theme.js قالب فعال بارگذاری شده (یا اصلاً ندارد)؟ تا قبل از آن fallback نشان نده تا فلش نشود */
  ready: boolean;
}

const ThemeRegionContext = createContext<ThemeRegionBase | null>(null);
export const ThemeRegionProvider = ThemeRegionContext.Provider;
export function useThemeRegionBase(): ThemeRegionBase | null { return useContext(ThemeRegionContext); }

function useRegistryVersion(): number {
  return useSyncExternalStore(subscribeRegistry, getRegistryVersion, getRegistryVersion);
}

/** آیا قالب برای این بخش کامپوننت دارد؟ (reactive) */
export function useHasThemeComponent(name: string): boolean {
  useRegistryVersion();
  return hasComponent(name);
}

interface Props {
  name: string;
  fallback: React.ReactNode;
  /** داده‌های مخصوص این بخش (روی داده‌های مشترک اضافه می‌شود) */
  props?: Partial<ThemeComponentProps>;
  className?: string;
  /** وقتی theme.js هنوز بارگذاری نشده، به‌جای fallback چه نشان داده شود (پیش‌فرض: هیچ‌چیز/placeholder) */
  pending?: React.ReactNode;
}

export default function ThemeRegion({ name, fallback, props, className, pending }: Props) {
  const base = useContext(ThemeRegionContext);
  const version = useRegistryVersion();
  const hostRef = useRef<HTMLDivElement | null>(null);
  const has = hasComponent(name);

  useEffect(() => {
    if (!has || !hostRef.current || !base) return;
    const full: ThemeComponentProps = {
      language: base.language,
      dir: base.dir,
      t: base.t,
      ts: makeThemeStrings(base.strings, base.language),
      tokens: base.tokens,
      slides: base.slides,
      onNavigate: base.onNavigate,
      activeTab: base.activeTab,
      user: base.user,
      featuredGames: [],
      tournaments: [],
      settings: base.settings,
      logoUrl: base.logoUrl,
      assetsBase: base.assetsBase,
      themeId: base.themeId,
      region: name,
      ...(props || {}),
    };
    mountComponent(name, hostRef.current, full);
  });

  useEffect(() => () => { unmountComponent(name); }, [name]);

  if (has) {
    return <div ref={hostRef} data-theme-region={name} className={className} key={`${name}@${version}`} />;
  }
  if (base && !base.ready) {
    return <>{pending ?? null}</>;
  }
  return <>{fallback}</>;
}
