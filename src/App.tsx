import React, { useState, useEffect, useRef, useMemo, useCallback, lazy, Suspense, startTransition } from 'react';
import { UserState, LoyaltyTx, GameSystem, CafeItem, Accessory, Tournament, Article, DiscountCode } from './types/gamenet';
import bazinoLogo from './assets/images/bazino_logo_user-80.webp'; // 48 CSS px × DPR2 ≈ 80px واقعی
import {
  BUILT_IN_THEMES,
  getStoredThemeId,
  loadCustomThemes,
  loadThemeStylesheet,
  saveCustomThemes,
  resolveThemeTokens,
  applyThemeTokens,
  type ThemeInfo
} from './themes';
import { ThemeRegionProvider, type ThemeRegionBase } from './themeSdk/ThemeRegion';
import ThemeRegion from './themeSdk/ThemeRegion';
import { useThemeScript } from './themeSdk/useThemeScript';
import type { ThemeSlide } from './themeSdk/sdk';
// تب‌ها و مودال‌های سنگین به‌صورت lazy بارگذاری می‌شوند. HomeTab هم شامل چندین
// بخش/دادهٔ پایین صفحه است؛ Hero سبکِ LandingHero بلافاصله paint می‌شود و خود
// HomeTab پس از آن در یک chunk جدا می‌آید تا LCP منتظر اجرای کل صفحه نماند.
import LandingHero from './components/LandingHero';
import { clearAuthToken } from './services/authToken';
import { LanguageMenu, LanguageRow } from './components/LanguageMenu';
import { postJson, errorMessage } from './services/postJson';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ScrollToTop } from './components/ScrollToTop';
const HomeTab = lazy(() => import('./components/HomeTab'));
const LoyaltyProfileTab = lazy(() => import('./components/LoyaltyProfileTab'));
const ReservationsTab = lazy(() => import('./components/ReservationsTab'));
const CafeTab = lazy(() => import('./components/CafeTab'));
const ShopTab = lazy(() => import('./components/ShopTab'));
const TournamentsTab = lazy(() => import('./components/TournamentsTab'));
const BlogTab = lazy(() => import('./components/BlogTab'));
const AdminPanelTab = lazy(() => import('./components/AdminPanelTab'));

const AuthModal = lazy(() => import('./components/AuthModal'));
const ProfilePage = lazy(() => import('./components/profile/ProfilePage'));
const InstallPage = lazy(() => import('./components/InstallPage'));
const ChatTab = lazy(() => import('./components/ChatTab'));
const ConsoleHubView = lazy(() => import('./components/ConsoleHubView'));
const ConsoleGridClassic = lazy(() => import('./components/ConsoleGridClassic'));
const VisualHelpGuide = lazy(() => import('./components/VisualHelpGuide'));
const MobileAppDownloadPage = lazy(() => import('./components/MobileAppDownloadPage'));
const MobileAppDownloadWidget = lazy(() => import('./components/MobileAppDownloadWidget'));
import { useLanguage } from './context/LanguageContext';
import { L, localizeList, localeOf } from './utils/i18n';
import { 
  Trophy, Monitor, Coffee, ShoppingBag, Newspaper, Award, Code, Flame, Coins, X, HelpCircle,
  Sparkles, Home, Instagram, Send, Youtube, Twitter, Facebook, Settings, ChevronDown,
  Smartphone, QrCode, Download, Menu, MessageSquare, LogIn, Search, User, LogOut, ArrowLeft, ArrowRight
} from 'lucide-react';
import { tabFromPath, pathFromTab, standalonePageFromPath } from './utils/routes';
import { claimStoredRef } from './utils/affiliateCapture';
// صفحات قانونی/تماس/پرداخت عمداً lazy نیستند تا هرگز به قالب و ThemeRegion وابسته نباشند
import { LegalPage } from './legal/LegalPage';
import InitialAvatar from './components/InitialAvatar';
import { ContactPage } from './legal/ContactPage';
import { PaymentResultPage } from './legal/PaymentResultPage';
import { LegalFooter } from './legal/LegalFooter';

/* ────────────────────────────────────────────────────────────────
   THEME BOOTSTRAP (یک‌بار قبل از اولین رندر)
   فایل CSS قالب ذخیره‌شده را قبل از paint اولیه اعمال می‌کند تا
   هنگام بارگذاری صفحه هیچ پرش ظاهری (flash) رخ ندهد.
   ──────────────────────────────────────────────────────────────── */
// ── داده‌ی اولیه‌ی تزریق‌شده در HTML توسط سرور ────────────────────────────
// سرور در production، لیست مسابقات را به‌صورت window.__BAZINO_BOOTSTRAP__
// داخل خودِ HTML می‌گذارد تا اولین رندر منتظر یک رفت‌وبرگشت اضافه‌ی /api
// نماند — یعنی /api/tournaments از زنجیره‌ی بحرانی LCP (HTML → JS → API) که
// Lighthouse گزارش کرده بود حذف می‌شود. در dev (Vite) این متغیر وجود ندارد
// و کد همان مسیر fetch قبلی را می‌رود.
type BgRequestInit = RequestInit & { priority?: 'high' | 'low' | 'auto' };
const BOOTSTRAP = (typeof window !== 'undefined'
  ? (window as unknown as { __BAZINO_BOOTSTRAP__?: { tournaments?: Tournament[]; activeThemeId?: string; theme?: unknown } }).__BAZINO_BOOTSTRAP__
  : undefined);
const BOOTSTRAP_TOURNAMENTS: Tournament[] | null = Array.isArray(BOOTSTRAP?.tournaments) ? (BOOTSTRAP!.tournaments as Tournament[]) : null;

/** تبدیل رکورد قالب سروری (/api/themes یا bootstrap) به ThemeInfo کلاینت */
function serverThemeToInfo(t: any): ThemeInfo {
  return {
    id: t.id,
    name: t.name,
    type: 'custom',
    kind: 'server',
    version: t.version,
    description: t.description,
    colors: t.colors,
    cssUrl: t.cssUrl,
    hasAssets: t.hasAssets,
    assetFiles: t.assetFiles,
    assetsBase: t.cssUrl ? t.cssUrl.replace(/\/theme\.css$/, '/assets') : undefined,
    installedAt: t.installedAt,
    hasComponentJs: t.hasComponentJs !== false,
    regions: t.regions,
    strings: t.strings,
    tokens: t.tokens,
    author: t.author,
  };
}

const __initialCustomThemes = loadCustomThemes();
// قالب فعال سراسری که سرور داخل HTML تزریق کرده (production) — اولین رندر با همان
// قالب انجام می‌شود تا هدر/هرو پیش‌فرض یک لحظه هم دیده نشود (E.86).
const __bootstrapTheme: ThemeInfo | null = BOOTSTRAP?.theme && typeof BOOTSTRAP.theme === 'object' && (BOOTSTRAP.theme as any).id ? serverThemeToInfo(BOOTSTRAP.theme) : null;
const __bootstrapActiveId: string | null = typeof BOOTSTRAP?.activeThemeId === 'string' ? BOOTSTRAP.activeThemeId : null;
const __initialThemeId = __bootstrapActiveId || getStoredThemeId();
const __initialTheme = [...BUILT_IN_THEMES, ...__initialCustomThemes, ...(__bootstrapTheme ? [__bootstrapTheme] : [])]
  .find(t => t.id === __initialThemeId) ?? BUILT_IN_THEMES[0];
document.body.setAttribute('data-theme', __initialTheme.id);
loadThemeStylesheet(__initialTheme);

/**
 * نقشه‌ی «تب → دیتاست‌هایی که آن تب نیاز دارد». صفحه‌ی اصلی (home) فقط به
 * tournaments (+ user برای هدر) نیاز دارد؛ بقیه‌ی داده‌ها هنگام باز شدن تبِ
 * مربوطه بارگذاری می‌شوند تا درخواست‌های /api از زنجیره‌ی بحرانیِ اولیه حذف
 * شوند (رفع ممیزی Lighthouse «Avoid chaining critical requests»).
 */
const TAB_DATASETS: Record<string, string[]> = {
  reservations: ['systems'],
  cafe: ['cafe'],
  shop: ['accessories'],
  tournaments: ['tournaments'],
  blog: ['articles'],
  loyalty: ['transactions', 'coupons', 'user'],
};


// fetchهای پس‌زمینه با اولویت «low» — با منابع LCP رقابت نمی‌کنند و در
// درخت وابستگی شبکه‌ی Chrome بخشی از مسیر بحرانی حساب نمی‌شوند.
const BG_FETCH: BgRequestInit = { priority: 'low' };

export default function App() {
  const { language, setLanguage, t, dir } = useLanguage();
  const [langDropdownOpen, setLangDropdownOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  // تسک ۱۳: مودال پرداخت (مستقل از قالب) با رویداد سراسری ورود را باز می‌کند
  useEffect(() => {
    const open = () => setIsAuthModalOpen(true);
    window.addEventListener('bazino:open-auth', open);
    return () => window.removeEventListener('bazino:open-auth', open);
  }, []);
  // مقدار ذخیره‌شده را «بدون اعتبارسنجی» برمی‌داریم: قالب‌های سروری (نصب‌شده با
  // ZIP) در localStorage نیستند و بعداً با /api/themes می‌رسند. اگر همین‌جا به
  // dark-gold برگردیم، useEffect پایین بلافاصله انتخاب کاربر را در localStorage
  // بازنویسی می‌کند و بعد از هر رفرش قالب به پیش‌فرض برمی‌گردد. اعتبارسنجی
  // نهایی بعد از دریافت لیست سرور انجام می‌شود.
  const [themeId, setThemeId] = useState(() => __initialThemeId || 'dark-gold');
  const [layoutMode, setLayoutMode] = useState<'classic' | 'hub'>('classic');
  const [availableThemes, setAvailableThemesState] = useState<ThemeInfo[]>(() => [
    ...BUILT_IN_THEMES,
    ...loadCustomThemes(),
    ...(__bootstrapTheme ? [__bootstrapTheme] : []),
  ]);

  // نسخه‌ی هوشمند setAvailableThemes: قالب‌های سفارشی (محلی) را در
  // localStorage ذخیره می‌کند — قالب‌های سروری (نصب‌شده با پوشه assets
  // روی سرور) در localStorage ذخیره نمی‌شوند چون روی سرور ثبت شده‌اند.
  const setAvailableThemes = (updater: React.SetStateAction<ThemeInfo[]>) => {
    setAvailableThemesState(prev => {
      const next = typeof updater === 'function'
        ? (updater as (p: ThemeInfo[]) => ThemeInfo[])(prev)
        : updater;
      saveCustomThemes(next.filter(t => t.type === 'custom' && t.kind !== 'server'));
      return next;
    });
  };

  // مسیر مرورگر ↔ تب: /reservations، /admin، /admin/themes … (رفرش صفحه همان تب را باز می‌کند)
  const [activeTab, setActiveTabState] = useState(() => tabFromPath(window.location.pathname));
  const [isMobileMoreOpen, setIsMobileMoreOpen] = useState(false);
  const [currentPath, setCurrentPath] = useState(() => window.location.pathname);
  const setActiveTab = useCallback((tab: string) => {
    setActiveTabState(tab);
    const target = pathFromTab(tab);
    const cur = window.location.pathname;
    // زیرمسیر ادمین (/admin/<section>) را خودِ پنل مدیریت می‌نویسد
    if (tab === 'admin' && cur.startsWith('/admin')) return;
    if (cur !== target) window.history.pushState({}, '', target);
    setCurrentPath(target);
  }, []);

  // هر بار پنل ادمین قالبی نصب/حذف می‌کند، این شمارنده بالا می‌رود تا لیست سروری
  // (و installedAt جدید برای cache-busting) دوباره از سرور خوانده شود.
  const [themeStoreVersion, setThemeStoreVersion] = useState(0);
  const refreshServerThemes = useCallback(() => setThemeStoreVersion(v => v + 1), []);
  const [serverActiveThemeId, setServerActiveThemeId] = useState<string>('dark-gold');

  // دریافت قالب‌های نصب‌شده روی سرور (هر قالب پوشه اختصاصی خودش را دارد)
  useEffect(() => {
    fetch('/api/themes', { cache: 'no-store' })
      .then(r => r.json())
      .then((data: { serverThemes?: any[]; activeThemeId?: string }) => {
        const serverThemes: ThemeInfo[] = (data.serverThemes || []).map(serverThemeToInfo);
        setServerActiveThemeId(data.activeThemeId || 'dark-gold');
        setAvailableThemesState(prev => {
          // قالب‌های سروری همیشه از پاسخ تازه‌ی سرور جایگزین می‌شوند (نسخه/installedAt جدید)؛
          // قالب‌های داخلی و محلی حفظ می‌شوند.
          const nonServer = prev.filter(t => t.kind !== 'server');
          const merged = [...nonServer, ...serverThemes];
          // حالا که لیست کامل (داخلی + محلی + سروری) را داریم، قالب فعال را
          // اعتبارسنجی می‌کنیم. اگر کاربر انتخابی نداشته، قالب فعال سراسری سرور
          // اعمال می‌شود؛ اگر id ناشناخته بود، به پیش‌فرض برمی‌گردیم.
          setThemeId(current => {
            const knownIds = new Set(merged.map(t => t.id));
            const serverActive = data.activeThemeId;
            // «قالب پیش‌فرض سایت» (انتخاب ادمین) برای همه اعمال می‌شود، مگر اینکه کاربر
            // خودش آگاهانه قالب دیگری را از ThemeSelector انتخاب کرده باشد
            // (themeChoice=personal). انتخاب‌های قدیمی/ضمنی localStorage دیگر
            // انتخاب سراسری ادمین را بلوکه نمی‌کنند.
            // انتخاب شخصی قالب توسط کاربر حذف شده است (E.72): قالب پیش‌فرض سایت (ادمین) همیشه غالب است.
            try { localStorage.removeItem('themeChoice'); } catch { /* ignore */ }
            if (serverActive && knownIds.has(serverActive)) return serverActive;
            if (knownIds.has(current)) return current;
            // قالب ذخیره‌شده‌ی کاربر دیگر روی سرور وجود ندارد (حذف شده یا فایل‌سیستم سرور
            // موقتی بوده). به‌جای سقوط بی‌صدا، هشدار بده تا علت دیده شود.
            console.warn(`[Themes] stored theme "${current}" is no longer available on the server → falling back`);
            const fallback = serverActive && knownIds.has(serverActive) ? serverActive : 'dark-gold';
            window.setTimeout(() => addNotification(
              L(language, {
                fa: `قالب «${current}» دیگر روی سرور وجود ندارد؛ قالب «${fallback}» اعمال شد.`,
                en: `Theme "${current}" no longer exists on the server; switched to "${fallback}".`,
                ru: `Тема «${current}» больше не существует на сервере; применена «${fallback}».`,
                tr: `"${current}" teması artık sunucuda yok; "${fallback}" uygulandı.`,
              }), 'info'), 0);
            return fallback;
          });
          // اگر قالب فعال یک قالب سروری است، استایلش الان بارگذاری می‌شود
          // (useEffect پایین با تغییر availableThemes دوباره اجرا می‌شود)
          return merged;
        });
      })
      .catch(err => {
        // خطای شبکه → انتخاب کاربر دست نمی‌خورد (قبلاً هم چیزی تغییر نمی‌داد، ولی صریح می‌کنیم)
        console.error('[Themes] Failed to fetch server themes (keeping current theme):', err);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [themeStoreVersion]);

  useEffect(() => {
    localStorage.setItem('themeId', themeId);
    document.body.setAttribute('data-theme', themeId);
    setLayoutMode('classic');
  }, [themeId]);

  // بارگذاری فایل CSS مجزای قالب فعال — با تغییر قالب، استایل قبلی
  // حذف و استایل کامل قالب جدید روی «تمام صفحات» اعمال می‌شود.
  useEffect(() => {
    const theme = availableThemes.find(t => t.id === themeId) ?? BUILT_IN_THEMES[0];
    loadThemeStylesheet(theme);
    applyThemeTokens(resolveThemeTokens(theme));
  }, [themeId, availableThemes]);

  // قالب فعال + theme.js آن (بخش‌های اختصاصی) — یک‌بار در سطح App بارگذاری می‌شود
  const activeTheme = useMemo(() => availableThemes.find(t => t.id === themeId) ?? BUILT_IN_THEMES[0], [availableThemes, themeId]);
  const themeScriptSource = useMemo(() => (
    activeTheme.kind === 'server' && activeTheme.cssUrl
      ? { cssUrl: activeTheme.cssUrl, installedAt: activeTheme.installedAt, hasComponentJs: activeTheme.hasComponentJs !== false }
      : null
  ), [activeTheme]);
  const themeScript = useThemeScript(themeScriptSource);
  const themeRegistered = themeScript.registered;
  const [themeSlides, setThemeSlides] = useState<ThemeSlide[]>([]);
  useEffect(() => {
    // اسلایدهای ادمین (چهارزبانه) برای بخش‌های قالب — کم‌اولویت
    const timer = window.setTimeout(() => {
      fetch('/api/app-sliders', BG_FETCH).then(r => r.json()).then((rows: any[]) => {
        if (!Array.isArray(rows)) return;
        setThemeSlides(rows.map((s, i) => ({
          id: s.id || `slide-${i}`,
          imageUrl: s.imageUrl,
          mobileImageUrl: s.mobileImageUrl,
          target: s.target || 'reservations',
          title: { fa: s.titleFa || s.titleEn || '', en: s.titleEn || s.titleFa || '', ru: s.titleRu || s.titleEn || s.titleFa || '', tr: s.titleTr || s.titleEn || s.titleFa || '' },
          desc: { fa: s.descFa || '', en: s.descEn || '', ru: s.descRu || s.descEn || '', tr: s.descTr || s.descEn || '' },
        })));
      }).catch(() => {});
    }, 2500);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    localStorage.setItem('layoutMode', layoutMode);
  }, [layoutMode]);

  useEffect(() => {
    const onPopState = () => {
      setCurrentPath(window.location.pathname);
      setActiveTabState(tabFromPath(window.location.pathname));
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const openAppDownloadPage = () => {
    window.history.pushState({}, '', '/app-download');
    setCurrentPath('/app-download');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const backToHomeFromDownload = () => {
    setActiveTab('home');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  /** ناوبری به مسیرهای مستقل از قالب (/legal/*, /contact) یا تب‌ها */
  const navigateStandalone = useCallback((pathOrTab: string) => {
    if (pathOrTab.startsWith('/')) {
      if (window.location.pathname !== pathOrTab) window.history.pushState({}, '', pathOrTab);
      setCurrentPath(pathOrTab);
    } else {
      setActiveTab(pathOrTab);
    }
    window.scrollTo({ top: 0 });
  }, [setActiveTab]);

  // Keep the LCP-only LandingHero as the first commit. HomeTab contains all below-fold
  // cards and effects, so mounting it only after the load event's first idle window avoids
  // competing style/layout work with the hero image paint.
  const [isHomeContentReady, setIsHomeContentReady] = useState(false);
  const [isAppDownloadWidgetReady, setIsAppDownloadWidgetReady] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [helpMode, setHelpMode] = useState<'admin' | 'gamenet'>('gamenet');
  const [user, setUser] = useState<UserState | null>(null);
  // نشان «پاسخ جدید پشتیبانی» روی نام کاربر در هدر (تسک ۱۲)
  const [unreadTickets, setUnreadTickets] = useState(0);
  useEffect(() => {
    if (!user) { setUnreadTickets(0); return; }
    let cancelled = false;
    const poll = () => fetch('/api/me/tickets').then(r => (r.ok ? r.json() : null)).then(d => { if (!cancelled && d) setUnreadTickets(d.unread || 0); }).catch(() => {});
    const t = window.setTimeout(poll, 1500);
    const id = window.setInterval(poll, 90_000);
    return () => { cancelled = true; window.clearTimeout(t); window.clearInterval(id); };
  }, [user?.username, currentPath]);
  useEffect(() => {
    if (user?.username && user.username !== 'Guest') claimStoredRef();
  }, [user?.username]);
  // نصب در checkInstallStatus عمداً bypass است؛ مقدار اولیه‌ی true از paint واسط
  // spinner و جابه‌جایی کامل layout در mount دوم جلوگیری می‌کند (CLS/TBT گزارش).
  const [isInstalled, setIsInstalled] = useState<boolean | null>(true);
  
  // Data States
  const [rawSystems, setSystems] = useState<GameSystem[]>([]);
  const [rawCafeItems, setCafeItems] = useState<CafeItem[]>([]);
  const [rawAccessories, setAccessories] = useState<Accessory[]>([]);
  // اگر سرور داده‌ی اولیه را داخل HTML تزریق کرده باشد، رندر اول همان را دارد
  const [rawTournaments, setTournaments] = useState<Tournament[]>(() => BOOTSTRAP_TOURNAMENTS ?? []);
  const [rawArticles, setArticles] = useState<Article[]>([]);
  // نسخه‌ی محلی‌شده‌ی کاتالوگ‌ها بر اساس زبان فعال (nameEn/nameRu/nameTr و …).
  // state خام دست‌نخورده می‌ماند تا شناسه‌ها/قیمت‌ها و درخواست‌های سرور تغییری نکنند.
  const systems = useMemo(() => localizeList(rawSystems, language), [rawSystems, language]);
  const cafeItems = useMemo(() => localizeList(rawCafeItems, language), [rawCafeItems, language]);
  const accessories = useMemo(() => localizeList(rawAccessories, language), [rawAccessories, language]);
  const tournaments = useMemo(() => localizeList(rawTournaments, language), [rawTournaments, language]);
  const articles = useMemo(() => localizeList(rawArticles, language), [rawArticles, language]);
  const [transactions, setTransactions] = useState<LoyaltyTx[]>([]);
  const [activeCoupons, setActiveCoupons] = useState<DiscountCode[]>([]);

  const [notifications, setNotifications] = useState<Array<{ id: string; text: string; type: 'success' | 'error' | 'info' }>>([]);
  const [isLogoutConfirmOpen, setIsLogoutConfirmOpen] = useState(false);

  const addNotification = (text: string, type: 'success' | 'error' | 'info' = 'info') => {
    const id = Math.random().toString(36).substring(2, 9);
    setNotifications(prev => [...prev, { id, text, type }]);
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 5000);
  };

  // اجرای کارهای غیربحرانی بعد از اولین paint — با fallback برای مرورگرهای بدون
  // requestIdleCallback. `timeout: 2000` تضمین می‌کند کار حتی اگر مرورگر هیچ‌وقت
  // idle نشود، حداکثر ~۲ ثانیه بعد اجرا شود (کاهش TBT در پنجره‌ی بحرانی).
  const scheduleIdle = (cb: () => void) => {
    const w = window as unknown as { requestIdleCallback?: (fn: () => void, opts?: { timeout: number }) => void };
    if (typeof w.requestIdleCallback === 'function') {
      w.requestIdleCallback(cb, { timeout: 2000 });
    } else {
      setTimeout(cb, 2000);
    }
  };

  // Fetch initial data & allow live refreshes
  // ── Lazy, per-dataset data loading ──────────────────────────────────────
  // هر دیتاست یک‌بار بارگذاری و در loadedRef به‌عنوان کش ثبت می‌شود (مگر آنکه
  // refreshAll پس از تغییرات ادمین/رزرو/سفارش، همه را مجبور به refresh کند).
  // داده‌های غیرضروری برای صفحه‌ی اصلی، فقط هنگام باز شدن تبِ مربوطه
  // (useEffect روی activeTab) دریافت می‌شوند تا تعداد درخواست‌های /api در
  // زنجیره‌ی بحرانیِ اولیه کم شود.
  // اگر بوت‌استرپ HTML لیست مسابقات را داده باشد، آن دیتاست «بارگذاری‌شده»
  // حساب می‌شود و هنگام بوت دوباره fetch نمی‌شود (حذف از زنجیره‌ی بحرانی).
  const loadedRef = useRef<Set<string>>(new Set(BOOTSTRAP_TOURNAMENTS ? ['tournaments'] : []));

  const fetchDataset: Record<string, () => Promise<void>> = {
    systems:      async () => { const r = await fetch('/api/systems', BG_FETCH).then(res => res.json()).catch(() => []);      startTransition(() => { if (Array.isArray(r)) setSystems(r); }); },
    cafe:         async () => { const r = await fetch('/api/cafe', BG_FETCH).then(res => res.json()).catch(() => []);         startTransition(() => { if (Array.isArray(r)) setCafeItems(r); }); },
    accessories:  async () => { const r = await fetch('/api/accessories', BG_FETCH).then(res => res.json()).catch(() => []);  startTransition(() => { if (Array.isArray(r)) setAccessories(r); }); },
    tournaments:  async () => { const r = await fetch('/api/tournaments', BG_FETCH).then(res => res.json()).catch(() => []);  startTransition(() => { if (Array.isArray(r)) setTournaments(r); }); },
    articles:     async () => { const r = await fetch('/api/articles', BG_FETCH).then(res => res.json()).catch(() => []);     startTransition(() => { if (Array.isArray(r)) setArticles(r); }); },
    transactions: async () => { const r = await fetch('/api/transactions', BG_FETCH).then(res => res.json()).catch(() => []); startTransition(() => { if (Array.isArray(r)) setTransactions(r); }); },
    coupons:      async () => { const r = await fetch('/api/coupons', BG_FETCH).then(res => res.json()).catch(() => []);      startTransition(() => { if (Array.isArray(r)) setActiveCoupons(r); }); },
    user:         async () => { const r = await fetch('/api/user', BG_FETCH).then(res => res.json()).catch(() => null);        startTransition(() => { if (r && r.username && r.username !== 'Guest') setUser(r); else setUser(null); }); },
  };

  const ensureLoaded = (keys: string[]) => {
    for (const k of keys) {
      if (loadedRef.current.has(k)) continue;
      loadedRef.current.add(k);
      void fetchDataset[k]?.();
    }
  };

  // بارگذاریِ همه‌ی دیتاست‌ها (برای refresh بعد از تغییرات ادمین/رزرو/سفارش)
  const refreshAll = () => {
    loadedRef.current = new Set(Object.keys(fetchDataset));
    Object.values(fetchDataset).forEach(fn => void fn());
  };
  // تسک ۱۳: پس از پرداخت با کیف پول / ثبت حضوری (CheckoutModal) داده‌ها تازه شوند
  useEffect(() => {
    const h = () => refreshAll();
    window.addEventListener('bazino:refresh-data', h);
    return () => window.removeEventListener('bazino:refresh-data', h);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // نصب در حالت bypass است (isInstalled از ابتدا true)؛ بنابراین صفحه‌ی install
  // نمایش داده نمی‌شود و نیاز به checkInstallStatus نیست. اگر خواستید نصب را
  // دوباره فعال کنید، isInstalled اولیه را null کنید و یک fetch از /api/install/status
  // به‌صورت زیر اضافه کنید:
  //   const data = await fetch('/api/install/status').then(r => r.json());
  //   setIsInstalled(data.isInstalled); if (data.isInstalled) refreshAll();

  // بارگذاریِ اولیه: در حالت عادی فقط داده‌های صفحه‌ی اصلی (tournaments) و هدر
  // (user). اما قالب console-grid یا نمای hub، همه‌ی داده‌ها را روی صفحه‌ی اصلی
  // نشان می‌دهند، پس در آن حالت‌ها همه‌ی دیتاست‌ها بارگذاری می‌شوند. این افکت
  // با تغییر قالب/نما هم دوباره اجرا می‌شود.
  useEffect(() => {
    const comprehensive = themeId === 'console-grid' || layoutMode === 'hub';
    // مسابقات از بوت‌استرپ HTML می‌آید؛ اگر تزریق نشده بود (dev/static) همان
    // fetch قبلی انجام می‌شود. «user» دیگر اینجا نیست — پایین‌تر با تأخیر بیشتر.
    const keys = comprehensive ? Object.keys(fetchDataset) : (BOOTSTRAP_TOURNAMENTS ? [] : ['tournaments']);
    if (keys.length > 0) scheduleIdle(() => ensureLoaded(keys));
  }, [themeId, layoutMode]);

  // وضعیت ورود کاربر هیچ نقشی در رندر/LCP اولیه ندارد؛ فقط بعد از load کامل
  // صفحه و در زمان idle (با اولویت شبکه‌ی low) دریافت می‌شود تا /api/user از
  // زنجیره‌ی بحرانی Lighthouse حذف شود.
  useEffect(() => {
    const loadUserWhenIdle = () => scheduleIdle(() => ensureLoaded(['user']));
    if (document.readyState === 'complete') loadUserWhenIdle();
    else {
      window.addEventListener('load', loadUserWhenIdle, { once: true });
      return () => window.removeEventListener('load', loadUserWhenIdle);
    }
  }, []);

  // بارگذاریِ داده‌های هر تب فقط هنگام باز شدن آن تب (در idle)، تا درخواست‌های
  // /api از زنجیره‌ی بحرانیِ اولیه حذف شوند.
  useEffect(() => {
    const keys = TAB_DATASETS[activeTab];
    if (keys) scheduleIdle(() => ensureLoaded(keys));
  }, [activeTab]);

  useEffect(() => {
    let delayTimer: number | undefined;
    let idleHandle: number | undefined;
    const win = window as Window & {
      requestIdleCallback?: (callback: () => void, options?: { timeout: number }) => number;
      cancelIdleCallback?: (handle: number) => void;
    };
    const mountHomeWhenIdle = () => {
      // A short post-load delay ensures the eager hero has had a chance to become LCP,
      // even when the browser reports an idle slice while the image is decoding.
      delayTimer = window.setTimeout(() => {
        if (typeof win.requestIdleCallback === 'function') {
          idleHandle = win.requestIdleCallback(() => setIsHomeContentReady(true), { timeout: 2000 });
        } else {
          setIsHomeContentReady(true);
        }
      }, 750);
    };

    if (document.readyState === 'complete') mountHomeWhenIdle();
    else window.addEventListener('load', mountHomeWhenIdle, { once: true });

    return () => {
      window.removeEventListener('load', mountHomeWhenIdle);
      if (delayTimer !== undefined) window.clearTimeout(delayTimer);
      if (idleHandle !== undefined && typeof win.cancelIdleCallback === 'function') {
        win.cancelIdleCallback(idleHandle);
      }
    };
  }, []);

  // کارت QR دانلود اپلیکیشن عمداً بعد از LCP و در idle mount می‌شود تا chunk کوچک
  // خودش و درخواست تصویر QR وارد مسیر بحرانی صفحه اصلی/GTmetrix نشوند.
  useEffect(() => {
    if (activeTab !== 'home' || layoutMode === 'hub' || !isHomeContentReady) {
      setIsAppDownloadWidgetReady(false);
      return;
    }
    let timer: number | undefined;
    const win = window as Window & {
      requestIdleCallback?: (callback: () => void, options?: { timeout: number }) => number;
      cancelIdleCallback?: (handle: number) => void;
    };
    if (typeof win.requestIdleCallback === 'function') {
      timer = win.requestIdleCallback(() => setIsAppDownloadWidgetReady(true), { timeout: 2500 });
    } else {
      timer = window.setTimeout(() => setIsAppDownloadWidgetReady(true), 1600);
    }
    return () => {
      if (timer !== undefined && typeof win.cancelIdleCallback === 'function') win.cancelIdleCallback(timer);
      else if (timer !== undefined) window.clearTimeout(timer);
    };
  }, [activeTab, layoutMode, isHomeContentReady]);

  // فقط تعداد امتیاز فرستاده می‌شود. ارزش کوپن و خودِ کد را سرور تعیین می‌کند —
  // قبلاً هر سه از کلاینت می‌رفتند و می‌شد با ۱ امتیاز کوپن دلخواه ساخت.
  const handleRedeemPoints = async (points: number) => {
    if (!user) return;
    try {
      const data = await postJson('/api/loyalty/redeem', { points });
      applyServerState(data);
      if (Array.isArray(data?.activeCoupons)) setActiveCoupons(data.activeCoupons);
      addNotification(
        L(language, { fa: `کد تخفیف ${Number(data?.couponValue || 0).toLocaleString(localeOf(language))} لیری ساخته شد: ${data?.code}`, en: `A ${Number(data?.couponValue || 0).toLocaleString(localeOf(language))} TL discount code was created: ${data?.code}`, ru: `Создан промокод на ${Number(data?.couponValue || 0).toLocaleString(localeOf(language))} TL: ${data?.code}`, tr: `${Number(data?.couponValue || 0).toLocaleString(localeOf(language))} TL indirim kodu oluşturuldu: ${data?.code}` }),
        'success'
      );
    } catch (e) {
      addNotification(errorMessage(e, L(language, { fa: 'تبدیل امتیاز انجام نشد.', en: 'Could not redeem points.', ru: 'Не удалось обменять баллы.', tr: 'Puanlar dönüştürülemedi.' })), 'error');
      throw e;
    }
  };

  // description عمداً پاس داده می‌شود: قبلاً امضای این تابع فقط (points) بود،
  // پس شرحی که کامپوننت‌ها می‌فرستادند دور ریخته می‌شد و ستون description در
  // جدول transactions null می‌ماند — تاریخچه‌ی امتیازات ردیف‌های بی‌عنوان داشت.
  const handleAddLoyaltyPoints = async (points: number, description?: string) => {
    if (!user) return;
    try {
      const res = await fetch('/api/user/points', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ points, description })
      });
      if (res.ok) {
        setUser({ ...user, points: user.loyaltyPoints + points });
        addNotification(L(language, { fa: `${points} امتیاز به شما اضافه شد.`, en: `Added ${points} points.`, ru: `Вам начислено ${points} баллов.`, tr: `${points} puan hesabınıza eklendi.` }), 'success');
      }
    } catch (e) {
      console.error(e);
    }
  };

  // این دو تابع قبلاً فقط یک توست موفقیت نشان می‌دادند و هیچ درخواستی به سرور
  // نمی‌فرستادند؛ تیم ثبت‌شده و نظر ثبت‌شده با یک refresh ناپدید می‌شدند. حالا
  // به همان مسیرهای بک‌اند وصل‌اند که از قبل پیاده‌سازی شده بودند.
  const handleRegisterTeam = async (tournamentId: string, team: { name: string; leader: string; members: string[]; }) => {
    try {
      const data = await postJson('/api/tournaments/register', { tournamentId, team });
      if (Array.isArray(data?.tournaments)) setTournaments(data.tournaments);
    } catch (e) {
      addNotification(errorMessage(e, L(language, { fa: 'ثبت‌نام تیم انجام نشد.', en: 'Team registration failed.', ru: 'Не удалось зарегистрировать команду.', tr: 'Takım kaydı başarısız oldu.' })), 'error');
      throw e;
    }
  };

  const handleAddComment = async (articleId: string, comment: { gamerTag: string; content: string; }) => {
    try {
      const data = await postJson(`/api/articles/${articleId}/comment`, comment);
      if (Array.isArray(data?.articles)) setArticles(data.articles);
      addNotification(L(language, { fa: 'نظر شما ثبت شد.', en: 'Your comment has been posted.', ru: 'Ваш комментарий опубликован.', tr: 'Yorumunuz gönderildi.' }), 'success');
    } catch (e) {
      addNotification(errorMessage(e, L(language, { fa: 'ثبت نظر انجام نشد.', en: 'Could not post the comment.', ru: 'Не удалось опубликовать комментарий.', tr: 'Yorum gönderilemedi.' })), 'error');
      throw e;
    }
  };

  // وضعیت تازه‌ای که یک عملیات موفق سرور برمی‌گرداند را روی state سایت می‌نشاند،
  // تا امتیاز کاربر، تاریخچه‌ی تراکنش‌ها و موجودی انبار بدون refresh به‌روز شوند.
  const applyServerState = (data: any) => {
    if (!data) return;
    if (data.user && data.user.username && data.user.username !== 'Guest') setUser(data.user);
    if (Array.isArray(data.transactions)) setTransactions(data.transactions);
    if (Array.isArray(data.cafeItems)) setCafeItems(data.cafeItems);
    if (Array.isArray(data.accessories)) setAccessories(data.accessories);
    if (Array.isArray(data.coupons)) setActiveCoupons(data.coupons);
    if (Array.isArray(data.tournaments)) setTournaments(data.tournaments);
    if (Array.isArray(data.articles)) setArticles(data.articles);
  };
  
  const handleLogout = () => {
    setIsLogoutConfirmOpen(true);
  };

  const confirmLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    clearAuthToken();
    setUser(null);
    setIsLogoutConfirmOpen(false);
    setActiveTab('home');
    addNotification(L(language, { fa: 'خروج موفقیت‌آمیز بود', en: 'Logged out successfully', ru: 'Вы успешно вышли', tr: 'Başarıyla çıkış yapıldı' }), 'success');
  };

  // جای‌نگهدار LCP صفحه‌ی اصلی: اسلایدر پیش‌فرض فقط وقتی paint می‌شود که مطمئن باشیم
  // قالب فعال بخش hero/home اختصاصی ندارد؛ وگرنه (theme.js در حال بارگذاری یا بخش ثبت‌شده)
  // یک بلوک خالی هم‌ارتفاع نشان می‌دهیم تا اسلایدر یک لحظه «فلش» نکند (E.86).
  const themeOwnsHero = !themeScript.ready || themeRegistered.includes('hero') || themeRegistered.includes('home');
  // وقتی قالب خودش hero/home دارد، تأخیر LCP معنایی ندارد → HomeTab بلافاصله mount می‌شود
  useEffect(() => {
    if (themeScript.ready && (themeRegistered.includes('hero') || themeRegistered.includes('home'))) setIsHomeContentReady(true);
  }, [themeScript.ready, themeRegistered]);
  const homePlaceholder = themeOwnsHero
    ? <div className="w-full min-h-[340px]" aria-hidden="true" data-hero-pending="" />
    : <LandingHero onNavigate={() => setActiveTab('reservations')} />;

  const renderTabContent = () => (
    <Suspense fallback={
      <div className="w-full min-h-[600px]" aria-hidden="true" />
    }>
    <div className="max-w-7xl mx-auto w-full flex-grow relative pb-20">
      {activeTab === 'home' && (
        layoutMode === 'hub' ? (
          <ConsoleHubView 
            themeId={themeId} 
            systems={systems} 
            cafeItems={cafeItems} 
            accessories={accessories} 
            tournaments={tournaments} 
            user={user} 
            transactions={transactions} 
            activeCoupons={activeCoupons} 
            onRedeemPoints={handleRedeemPoints} 
            onAddLoyaltyPoints={handleAddLoyaltyPoints} 
            onOpenAuth={() => setIsAuthModalOpen(true)}
            addNotification={addNotification}
            refreshData={refreshAll}
            onBackToClassic={() => {
              setLayoutMode('classic');
              addNotification(L(language, { fa: 'نمای کلاسیک فعال شد', en: 'Classic View Activated', ru: 'Классический вид включён', tr: 'Klasik görünüm etkinleştirildi' }), 'info');
            }}
            activeTab={activeTab}
            setActiveTab={setActiveTab}
          />
        ) : themeId === 'console-grid' ? (
          <ConsoleGridClassic
            themeId={themeId} 
            systems={systems} 
            cafeItems={cafeItems} 
            accessories={accessories} 
            tournaments={tournaments} 
            user={user} 
            transactions={transactions} 
            activeCoupons={activeCoupons} 
            onRedeemPoints={handleRedeemPoints} 
            onAddLoyaltyPoints={handleAddLoyaltyPoints} 
            onOpenAuth={() => setIsAuthModalOpen(true)}
            addNotification={addNotification}
            refreshData={refreshAll}
          />
        ) : !isHomeContentReady ? (
          homePlaceholder
        ) : (
          <Suspense fallback={homePlaceholder}>
            <HomeTab
              themeId={themeId}
              tournaments={tournaments}
              onNavigate={setActiveTab}
            />
          </Suspense>
        )
      )}
      {activeTab === 'loyalty' && <LoyaltyProfileTab themeId={themeId} user={user} transactions={transactions} activeCoupons={activeCoupons} onRedeemPoints={handleRedeemPoints} addNotification={addNotification}/>}
      {activeTab === 'reservations' && <ReservationsTab themeId={themeId} systems={systems} activeCoupons={activeCoupons} onAddLoyaltyPoints={handleAddLoyaltyPoints} addNotification={addNotification}/>}
      {activeTab === 'cafe' && <CafeTab themeId={themeId} cafeItems={cafeItems} activeCoupons={activeCoupons} onServerState={applyServerState} addNotification={addNotification}/>}
      {activeTab === 'shop' && <ShopTab themeId={themeId} accessories={accessories} activeCoupons={activeCoupons} onServerState={applyServerState} addNotification={addNotification}/>}
      {activeTab === 'tournaments' && <TournamentsTab themeId={themeId} tournaments={tournaments} onAddLoyaltyPoints={handleAddLoyaltyPoints} onRegisterTeam={handleRegisterTeam} addNotification={addNotification}/>}
      {activeTab === 'blog' && <BlogTab themeId={themeId} articles={articles} onAddComment={handleAddComment} addNotification={addNotification}/>}
      {activeTab === 'admin' && (
        <AdminPanelTab 
          themeId={themeId} 
          setThemeId={setThemeId} 
          availableThemes={availableThemes} 
          setAvailableThemes={setAvailableThemes} 
          refreshServerThemes={refreshServerThemes}
          addNotification={addNotification} 
          layoutMode={layoutMode}
          setLayoutMode={setLayoutMode}
        />
      )}

      {activeTab === 'chat' && <ChatTab user={user} addNotification={addNotification} onOpenAuth={() => setIsAuthModalOpen(true)} />}
    </div>
    </Suspense>
  );

  if (isInstalled === null) {
    return (
      <div className="min-h-screen bg-[#050714] flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (isInstalled === false) {
    return (
      <Suspense fallback={
        <div className="min-h-screen bg-[#050714] flex items-center justify-center">
          <div className="w-10 h-10 border-4 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin"></div>
        </div>
      }>
        <InstallPage 
          onInstallationComplete={() => {
            setIsInstalled(true);
            refreshAll();
          }} 
        />
      </Suspense>
    );
  }

  // صفحات مستقل از قالب: پیش از ThemeRegionProvider رندر می‌شوند و هیچ قالبی به آن‌ها دسترسی ندارد
  const standalone = standalonePageFromPath(currentPath, window.location.search);
  if (standalone) {
    if (standalone.type === 'legal') return <LegalPage slug={standalone.slug} onBack={() => navigateStandalone('home')} onNavigate={navigateStandalone} />;
    if (standalone.type === 'contact') return <ContactPage onBack={() => navigateStandalone('home')} />;
    if (standalone.type === 'profile') {
      return (
        <>
          <Suspense fallback={<div className="min-h-screen bg-[#0b0f17]" />}>
            <ProfilePage
              user={user}
              tab={standalone.tab}
              ticketId={standalone.ticketId}
              onNavigate={navigateStandalone}
              onUserChange={(u) => setUser(u)}
              onOpenAuth={() => setIsAuthModalOpen(true)}
              onLogout={handleLogout}
              addNotification={addNotification}
            />
          </Suspense>
          <Suspense fallback={null}>
            {isAuthModalOpen && (
              <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} onAuthSuccess={(u) => setUser(u)} addNotification={addNotification} />
            )}
          </Suspense>
          {isLogoutConfirmOpen && (
            <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/80" onClick={() => setIsLogoutConfirmOpen(false)}>
              <div className="bg-[#121826] border border-[#232c3d] rounded-2xl p-6 max-w-sm w-full text-center" onClick={e => e.stopPropagation()} dir={dir}>
                <p className="text-white font-bold mb-5">{L(language, { fa: 'از حساب خارج می‌شوید؟', en: 'Sign out of your account?', ru: 'Выйти из аккаунта?', tr: 'Hesaptan çıkılsın mı?' })}</p>
                <div className="flex gap-3">
                  <button onClick={confirmLogout} className="flex-1 bg-red-500 text-white py-2.5 rounded-xl font-bold text-sm">{L(language, { fa: 'خروج', en: 'Sign out', ru: 'Выйти', tr: 'Çıkış' })}</button>
                  <button onClick={() => setIsLogoutConfirmOpen(false)} className="flex-1 bg-white/10 text-white py-2.5 rounded-xl font-bold text-sm">{L(language, { fa: 'انصراف', en: 'Cancel', ru: 'Отмена', tr: 'İptal' })}</button>
                </div>
              </div>
            </div>
          )}
        </>
      );
    }
    return <PaymentResultPage outcome={standalone.outcome} oid={standalone.oid} onBack={() => navigateStandalone('home')} onGoTo={navigateStandalone} />;
  }

  if (currentPath === '/app-download') {
    return (
      <Suspense fallback={
        <div className="min-h-screen bg-[#060914] flex items-center justify-center">
          <div className="w-10 h-10 border-4 border-cyan-500/30 border-t-cyan-300 rounded-full animate-spin"></div>
        </div>
      }>
        <MobileAppDownloadPage onBackHome={backToHomeFromDownload} />
      </Suspense>
    );
  }

  // یک منبع واحد برای ناوبری، تا هدر دسکتاپ و نوار پایین موبایل هرگز از هم جدا نیفتند.
  // «بلاگ» و «چت» تا امروز هیچ ورودی‌ای در رابط کاربری نداشتند: صفحه‌شان ساخته شده
  // بود و ادمین می‌توانست مقاله منتشر کند و اتاق گفتگو بسازد، ولی هیچ بازدیدکننده‌ای
  // راهی برای رسیدن به آن‌ها نداشت.
  const NAV_TABS = [
    { id: 'home',         label: L(language, { fa: 'خانه', en: 'Home', ru: 'ГЛАВНАЯ', tr: 'ANASAYFA' }),      icon: Home },
    { id: 'reservations', label: L(language, { fa: 'رزرو', en: 'Reserve', ru: 'БРОНЬ', tr: 'REZERV' }),   icon: Monitor },
    { id: 'cafe',         label: L(language, { fa: 'کافه', en: 'Cafe', ru: 'КАФЕ', tr: 'KAFE' }),      icon: Coffee },
    { id: 'shop',         label: L(language, { fa: 'فروشگاه', en: 'Shop', ru: 'МАГАЗИН', tr: 'MAĞAZA' }),      icon: ShoppingBag },
    { id: 'tournaments',  label: L(language, { fa: 'مسابقات', en: 'Arena', ru: 'АРЕНА', tr: 'ARENA' }),     icon: Trophy },
    { id: 'loyalty',      label: L(language, { fa: 'باشگاه', en: 'Club', ru: 'КЛУБ', tr: 'KULÜP' }),      icon: Award },
    { id: 'blog',         label: L(language, { fa: 'بلاگ', en: 'Blog', ru: 'БЛОГ', tr: 'BLOG' }),      icon: Newspaper },
    { id: 'chat',         label: L(language, { fa: 'گفتگو', en: 'Chat', ru: 'ЧАТ', tr: 'SOHBET' }),      icon: MessageSquare },
  ];
  // روی موبایل هشت آیکون در ۳۹۰ پیکسل جا نمی‌شود (هر کدام کمتر از ۵۰px می‌شد و
  // هدف لمس بسیار کوچک). پنج تای اول در نوار می‌مانند و بقیه پشت دکمه‌ی «بیشتر».
  const MOBILE_PRIMARY_TABS = NAV_TABS.slice(0, 5);
  const MOBILE_MORE_TABS = NAV_TABS.slice(5);

  const isAdminView = activeTab === 'admin';
  // نوار پایین موبایل در پنل ادمین و حالت hub نمایش داده نمی‌شود (مثل هدر).
  const showMobileNav = !(layoutMode === 'hub' && activeTab === 'home') && activeTab !== 'admin';
  const adminShellVars = isAdminView ? {
    '--primary-color': '#00e5ff',
    '--primary-hover-color': '#67e8f9',
    '--dark-bg-color': '#070b16',
    '--dark-card-color': '#111827',
    '--color-primary': '#00e5ff',
    '--color-primary-hover': '#67e8f9',
    '--color-dark-bg': '#070b16',
    '--color-dark-card': '#111827',
    '--theme-bg': '#070b16',
    '--theme-card-bg': '#111827',
    '--theme-card-border': 'rgba(255,255,255,0.10)',
  } as React.CSSProperties : undefined;

  // داده‌های مشترک همه‌ی بخش‌های قالب (Partial Views)
  const themeRegionBase: ThemeRegionBase = {
    language, dir, t,
    themeId: themeId || 'dark-gold',
    strings: activeTheme.strings,
    tokens: resolveThemeTokens(activeTheme),
    slides: themeSlides,
    onNavigate: (tab: string) => setActiveTab(tab),
    activeTab,
    user: user ? { username: user.username, points: (user as any).points, role: user.role } : null,
    settings: {},
    logoUrl: '/logo.png',
    assetsBase: activeTheme.assetsBase || '',
    ready: themeScript.ready,
  };

  return (
    <ThemeRegionProvider value={themeRegionBase}>
    <div 
      className={`${isAdminView ? 'admin-shell' : `theme-${themeId || "dark-gold"}`} ${layoutMode === 'hub' && activeTab === 'home' ? 'h-[100dvh] overflow-hidden' : 'min-h-[100dvh]'} ${showMobileNav ? 'pb-[calc(64px+env(safe-area-inset-bottom,0px))] md:pb-0' : 'pb-[env(safe-area-inset-bottom,0px)]'} w-full text-gray-100 flex flex-col font-sans relative overflow-x-hidden selection:bg-primary/30 app-bg-main`} 
      style={adminShellVars}
      dir={dir}
    >
      {/* Admin Ribbon Bar */}
      {user?.role === 'admin' && activeTab !== 'admin' && (
        <div className="bg-gradient-to-r from-purple-950 via-purple-900 to-indigo-950 border-b border-purple-500/30 text-white px-4 py-2 flex items-center justify-between text-xs font-bold z-50 relative shadow-lg animate-pulse-subtle">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-purple-400 animate-ping"></span>
            <span className="font-display uppercase tracking-wider text-purple-200">
              {L(language, { fa: 'پنل مدیریت فعال است', en: 'Admin Area Active', ru: 'Панель администратора активна', tr: 'Yönetim paneli etkin' })}
            </span>
            <span className="text-purple-400 font-normal hidden sm:inline">
              | {L(language, { fa: `ورود با حساب مدیر: @${user.username}`, en: `Logged in as: @${user.username}`, ru: `Вход как администратор: @${user.username}`, tr: `Yönetici olarak giriş yapıldı: @${user.username}` })}
            </span>
          </div>
          <button 
            onClick={() => setActiveTab('admin')} 
            className="bg-primary hover:bg-primary/95 text-black px-3.5 py-1.5 rounded-lg transition-all font-black uppercase text-[10px] tracking-wider flex items-center gap-1.5 shadow-[0_0_15px_rgba(255,184,0,0.3)] hover:scale-105 active:scale-95 cursor-pointer"
          >
            <Settings className="w-3 h-3" />
            <span>{L(language, { fa: 'ورود به پنل مدیریت', en: 'Enter Admin Panel', ru: 'Открыть панель администратора', tr: 'Yönetim Paneline Gir' })}</span>
          </button>
        </div>
      )}

      {/* Decorative neon background blobs.
          `fixed` (not `absolute`) keeps them viewport-locked so they never resize or
          reposition when the page content height changes (e.g. when HomeTab mounts and
          the document grows from ~100dvh to several screens). An absolute inset-0 layer
          here was the single largest CLS source (score 1.0). Fixed ambient lighting is
          also the intended visual for these subtle blurred glows. */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] bg-violet-token/5 rounded-full blur-[150px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50vw] h-[50vw] bg-info-token/5 rounded-full blur-[150px]" />
      </div>
      
      {/* Toast Notifications Layer */}
      <div className={`fixed top-6 z-[100] flex flex-col gap-3 max-w-sm w-full ${dir === 'rtl' ? 'right-6' : 'left-6'}`}>
        {notifications.map((n) => (
          <div 
            key={n.id}
            className={`p-4 rounded-2xl shadow-2xl border flex items-center justify-between text-xs font-bold animate-slide-in backdrop-blur-md ${
              n.type === 'success' 
                ? 'bg-slate-900/95 border-white/10 text-white shadow-black/40' 
                : n.type === 'error'
                ? 'bg-rose-950/80 border-rose-500/30 text-rose-400 shadow-rose-500/10'
                : 'bg-cyan-950/80 border-cyan-500/30 text-cyan-400 shadow-cyan-500/10'
            }`}
          >
            <span>{n.text}</span>
            <button onClick={() => setNotifications(prev => prev.filter(x => x.id !== n.id))} className="text-white/50 hover:text-white"><X className="w-4 h-4"/></button>
          </div>
        ))}
      </div>

      {!(layoutMode === 'hub' && activeTab === 'home') && activeTab !== 'admin' && (
        <ThemeRegion name="header" className="sticky top-0 z-40 w-full" fallback={
        <header className="site-header h-[70px] border-b border-white/10 bg-dark-card/90 backdrop-blur-xl px-4 md:px-8 flex justify-between items-center z-40 sticky top-0 shrink-0 shadow-lg">
            <div className="flex items-center gap-4 cursor-pointer" onClick={() => setActiveTab('home')}>
               <img src={bazinoLogo} alt="Bazino Pro" width="40" height="40" className="brand-logo-guard h-10 w-auto" />
               <span className="font-display font-black text-xl tracking-wider text-white hidden md:block">BAZINO <span className="text-primary">PRO</span></span>
            </div>
            
            <nav className="hidden md:flex items-center gap-2 h-full">
              {NAV_TABS.map(t => (
                <button 
                  key={t.id} 
                  onClick={() => setActiveTab(t.id)}
                  className={`px-4 h-full flex items-center justify-center font-bold text-xs uppercase transition-all ${activeTab === t.id ? 'text-primary border-b-2 border-primary' : 'text-gray-400 hover:text-white'}`}
                >
                  {t.label}
                </button>
              ))}
            </nav>

            <div className="flex items-center gap-4">
               {!user ? (
                 <button onClick={() => setIsAuthModalOpen(true)} className="text-xs font-bold bg-primary text-black px-4 py-2 rounded-lg hover:bg-primary/90 flex items-center gap-2">
                   <LogIn className="w-4 h-4"/> {L(language, { fa: 'ورود', en: 'Login', ru: 'Войти', tr: 'Giriş' })}
                 </button>
               ) : (
                 <div className="flex items-center gap-3">
                   <a href="/profile" onClick={(e) => { e.preventDefault(); navigateStandalone('/profile'); }} className="flex items-center gap-2 text-xs font-bold text-primary hover:text-white transition relative" data-header-profile-link title={L(language, { fa: 'پروفایل من', en: 'My profile', ru: 'Мой профиль', tr: 'Profilim' })}>
                     {user.avatarUrl ? <img src={user.avatarUrl} alt="" width={28} height={28} className="w-7 h-7 rounded-full object-cover border border-primary/50" /> : <InitialAvatar name={user.displayName || user.username} size={28} />}
                     <span className="hidden sm:inline">{user.displayName || `@${user.username}`}</span>
                     {unreadTickets > 0 && <span className="absolute -top-1.5 -end-2 bg-rose-500 text-white text-[9px] font-black rounded-full min-w-[16px] h-4 px-1 flex items-center justify-center" data-header-unread>{unreadTickets}</span>}
                   </a>
                   <button onClick={handleLogout} aria-label="Logout" className="text-red-400 hover:text-red-300"><LogOut className="w-4 h-4"/></button>
                 </div>
               )}
               <button 
                 onClick={() => { setHelpMode('gamenet'); setIsHelpOpen(true); }}
                 className="p-2 text-white bg-white/5 rounded-full hover:bg-white/10 flex items-center justify-center cursor-pointer transition-all"
                 title={L(language, { fa: 'راهنمای تصویری کلوپ', en: 'Client Visual Guide', ru: 'Визуальный гид клуба', tr: 'Kulüp Görsel Rehberi' })}
               >
                 <HelpCircle className="w-4 h-4 text-primary" />
               </button>
               <LanguageMenu language={language} setLanguage={setLanguage} open={langDropdownOpen} setOpen={setLangDropdownOpen} />
            </div>
          </header>
        } />
      )}

      {activeTab === 'admin' && (
        <header className="h-[70px] bg-gradient-to-r from-purple-950 via-slate-900 to-indigo-950 border-b border-purple-500/30 px-4 md:px-8 flex justify-between items-center z-50 sticky top-0 shrink-0 shadow-2xl">
          <div className="flex items-center gap-3">
            <span className="w-2.5 h-2.5 rounded-full bg-purple-500 animate-ping"></span>
            <div className="flex flex-col">
              <span className="font-display font-black text-sm tracking-wider text-purple-200">
                {L(language, { fa: 'پنل مدیریت بازینو پرو', en: 'BAZINO PRO ADMIN', ru: 'АДМИН-ПАНЕЛЬ BAZINO PRO', tr: 'BAZINO PRO YÖNETİM' })}
              </span>
              <span className="text-[10px] text-purple-400 font-medium font-sans">
                {L(language, { fa: `مدیر: @${user?.username}`, en: `Admin: @${user?.username}`, ru: `Администратор: @${user?.username}`, tr: `Yönetici: @${user?.username}` })}
              </span>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <button 
              onClick={() => { setHelpMode('admin'); setIsHelpOpen(true); }}
              className="bg-purple-500/20 hover:bg-purple-500/35 border border-purple-500/30 text-purple-200 px-3 py-2 rounded-xl text-xs font-black flex items-center gap-2 cursor-pointer transition-all active:scale-95"
            >
              <HelpCircle className="w-4 h-4 text-purple-300 animate-pulse" />
              <span>{L(language, { fa: 'راهنمای ادمین', en: 'Admin Guide', ru: 'Гид администратора', tr: 'Yönetici Rehberi' })}</span>
            </button>
            <button 
              onClick={() => setActiveTab('home')} 
              className="bg-white/10 hover:bg-white/15 border border-white/20 hover:border-purple-500/40 text-white px-4 py-2 rounded-xl transition-all font-bold text-xs flex items-center gap-2 cursor-pointer shadow-md active:scale-95"
            >
              {dir === 'rtl' ? <ArrowRight className="w-4 h-4 text-purple-300" /> : <ArrowLeft className="w-4 h-4 text-purple-300" />}
              <span>{L(language, { fa: 'بازگشت به سایت', en: 'Back to Site', ru: 'Вернуться на сайт', tr: 'Siteye Dön' })}</span>
            </button>
          </div>
        </header>
      )}

          <main className="flex-grow z-10 w-full relative">
            <ErrorBoundary>
              {renderTabContent()}
            </ErrorBoundary>
          </main>

      {/* Modals — lazy: چانک هر مودال فقط هنگام «اولین باز شدن» دانلود و اجرا می‌شود.
          قبلاً بدون شرط mount می‌شدند (چون داخلاً return null می‌کنند) و React همین که
          کامپوننت lazy رندر شود، چانکش را در startup دانلود/اجرا می‌کرد — همین باعث
          TBT بالا و دانلود AuthModal/VisualHelpGuide در بار اول
          می‌شد (مشاهده‌شده در Waterfall گزارش GTmetrix). با شرطی کردن، این چانک‌ها
          (شامل motion) از مسیر بحرانی حذف شدند. */}
      <Suspense fallback={null}>
        {isHelpOpen && (
          <VisualHelpGuide
            isOpen={isHelpOpen}
            onClose={() => setIsHelpOpen(false)}
            mode={helpMode}
            language={language}
            dir={dir}
          />
        )}
        {isAuthModalOpen && (
          <AuthModal
            addNotification={addNotification}
            isOpen={isAuthModalOpen}
            onClose={() => setIsAuthModalOpen(false)}
            onAuthSuccess={setUser}
          />
        )}
      </Suspense>

      {activeTab === 'home' && layoutMode !== 'hub' && isAppDownloadWidgetReady && (
        <Suspense fallback={null}>
          <MobileAppDownloadWidget onOpenDownloadPage={openAppDownloadPage} />
        </Suspense>
      )}

      {/* Logout Confirmation Modal */}
      {isLogoutConfirmOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 animate-fade-in">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black/85 backdrop-blur-md"
            onClick={() => setIsLogoutConfirmOpen(false)}
          />

          {/* Modal Card */}
          <div 
            className="bg-dark-card border border-white/10 rounded-3xl p-6 md:p-8 max-w-sm w-full relative overflow-hidden shadow-[0_0_50px_rgba(255,0,0,0.1)] z-10"
            dir={dir}
          >
            {/* Design accents */}
            <div className="absolute -top-12 -right-12 w-32 h-32 bg-red-500/10 blur-3xl pointer-events-none"></div>

            <div className="text-center space-y-4">
              <div className="w-12 h-12 bg-red-500/10 border border-red-500/30 rounded-xl flex items-center justify-center mx-auto text-red-500 shadow-[0_0_20px_rgba(239,68,68,0.2)]">
                <LogOut className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-black text-white font-display">
                {L(language, { fa: 'خروج از حساب کاربری', en: 'Sign Out Profile', ru: 'Выход из аккаунта', tr: 'Hesaptan Çıkış' })}
              </h3>
              <p className="text-gray-400 text-xs leading-relaxed">
                {L(language, { fa: 'آیا برای خروج از حساب کاربری خود مطمئن هستید؟ برای استفاده دوباره از خدمات باید وارد شوید.', en: 'Are you sure you want to sign out from your gaming profile? You will need to login again to reserve rigs.', ru: 'Вы уверены, что хотите выйти из своего игрового профиля? Для бронирования потребуется снова войти.', tr: 'Oyuncu profilinizden çıkmak istediğinize emin misiniz? Rezervasyon için tekrar giriş yapmanız gerekecek.' })}
              </p>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setIsLogoutConfirmOpen(false)}
                className="flex-1 py-3 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold text-xs rounded-xl transition-all cursor-pointer"
              >
                {L(language, { fa: 'انصراف', en: 'Cancel', ru: 'Отмена', tr: 'İptal' })}
              </button>
              <button
                onClick={confirmLogout}
                className="flex-1 py-3 bg-red-500 hover:bg-red-600 text-white font-black text-xs rounded-xl transition-all shadow-[0_0_20px_rgba(239,68,68,0.3)] cursor-pointer animate-pulse-subtle"
              >
                {L(language, { fa: 'خروج', en: 'Logout', ru: 'Выйти', tr: 'Çıkış' })}
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* ──────────────────────────────────────────────────────────────
          نوار ناوبری پایین — فقط موبایل.
          هدر سایت `hidden md:flex` است، یعنی زیر ۷۶۸px هیچ منویی وجود نداشت و
          کاربر موبایل عملاً در صفحه‌ی اصلی حبس می‌شد؛ تنها راه خروج، دکمه‌های
          CTA داخل صفحه بود و برای کافه/فروشگاه/باشگاه حتی همان هم نبود.
          ────────────────────────────────────────────────────────────── */}
      {showMobileNav && (
        <ThemeRegion name="mobileNav" fallback={<>
          {isMobileMoreOpen && (
            <div
              className="md:hidden fixed inset-0 z-[70] bg-black/60 backdrop-blur-sm"
              onClick={() => setIsMobileMoreOpen(false)}
            >
              <div
                className="absolute bottom-[calc(64px+env(safe-area-inset-bottom,0px))] inset-x-3 rounded-2xl border border-white/10 bg-dark-card p-2 shadow-2xl"
                onClick={(e) => e.stopPropagation()}
                role="dialog"
                aria-modal="true"
              >
                {MOBILE_MORE_TABS.map(t => (
                  <button
                    key={t.id}
                    onClick={() => { setActiveTab(t.id); setIsMobileMoreOpen(false); }}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition-all ${
                      activeTab === t.id ? 'bg-primary text-black' : 'text-gray-300 hover:bg-white/5'
                    }`}
                  >
                    <t.icon className="w-4 h-4" />
                    <span>{t.label}</span>
                  </button>
                ))}
                <LanguageRow language={language} setLanguage={setLanguage} />
              </div>
            </div>
          )}

          <nav
            aria-label={L(language, { fa: 'ناوبری اصلی', en: 'Main navigation', ru: 'Основная навигация', tr: 'Ana gezinme' })}
            className="md:hidden fixed bottom-0 inset-x-0 z-[60] h-16 pb-[env(safe-area-inset-bottom,0px)] box-content border-t border-white/10 bg-dark-card/95 backdrop-blur-xl flex items-stretch"
          >
            {MOBILE_PRIMARY_TABS.map(t => (
              <button
                key={t.id}
                onClick={() => { setActiveTab(t.id); setIsMobileMoreOpen(false); }}
                aria-current={activeTab === t.id ? 'page' : undefined}
                className={`flex-1 min-w-0 flex flex-col items-center justify-center gap-1 transition-colors ${
                  activeTab === t.id ? 'text-primary' : 'text-gray-400'
                }`}
              >
                <t.icon className="w-5 h-5 shrink-0" />
                <span className="text-[10px] font-bold truncate max-w-full px-1">{t.label}</span>
              </button>
            ))}
            <button
              onClick={() => setIsMobileMoreOpen(v => !v)}
              aria-expanded={isMobileMoreOpen}
              aria-label={L(language, { fa: 'بیشتر', en: 'More', ru: 'Ещё', tr: 'Daha Fazla' })}
              className={`flex-1 min-w-0 flex flex-col items-center justify-center gap-1 transition-colors ${
                isMobileMoreOpen || MOBILE_MORE_TABS.some(t => t.id === activeTab) ? 'text-primary' : 'text-gray-400'
              }`}
            >
              <Menu className="w-5 h-5 shrink-0" />
              <span className="text-[10px] font-bold truncate max-w-full px-1">{L(language, { fa: 'بیشتر', en: 'More', ru: 'Ещё', tr: 'Daha Fazla' })}</span>
            </button>
          </nav>
        </>} />
      )}

      {activeTab !== 'admin' && !(layoutMode === 'hub' && activeTab === 'home') && (
        <ThemeRegion name="footer" fallback={null} className="w-full" />
      )}
      {/* نوار قانونی ثابت: خارج از ThemeRegion؛ قالب‌ها نمی‌توانند آن را جایگزین یا پنهان کنند */}
      {activeTab !== 'admin' && <LegalFooter onNavigate={navigateStandalone} />}

      <ScrollToTop 
        hidden={activeTab === 'admin' || activeTab === 'hub' || activeTab === 'console_grid'} 
        isRTL={dir === 'rtl'} 
      />
    </div>
    </ThemeRegionProvider>
  );
}
