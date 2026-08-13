import React, { useState, useEffect, useRef, lazy, Suspense, startTransition } from 'react';
import { UserState, LoyaltyTx, GameSystem, CafeItem, Accessory, Tournament, Article, DiscountCode } from './types/gamenet';
import bazinoLogo from './assets/images/bazino_logo_user.webp';
import {
  BUILT_IN_THEMES,
  getStoredThemeId,
  loadCustomThemes,
  loadThemeStylesheet,
  saveCustomThemes,
  type ThemeInfo
} from './themes';
// تب‌ها و مودال‌های سنگین به‌صورت lazy بارگذاری می‌شوند. HomeTab هم شامل چندین
// بخش/دادهٔ پایین صفحه است؛ Hero سبکِ LandingHero بلافاصله paint می‌شود و خود
// HomeTab پس از آن در یک chunk جدا می‌آید تا LCP منتظر اجرای کل صفحه نماند.
import LandingHero from './components/LandingHero';
import { clearAuthToken } from './services/authToken';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ScrollToTop } from './components/ScrollToTop';
const HomeTab = lazy(() => import('./components/HomeTab'));
const LoyaltyProfileTab = lazy(() => import('./components/LoyaltyProfileTab'));
const ReservationsTab = lazy(() => import('./components/ReservationsTab'));
const CafeTab = lazy(() => import('./components/CafeTab'));
const ShopTab = lazy(() => import('./components/ShopTab'));
const TournamentsTab = lazy(() => import('./components/TournamentsTab'));
const BlogTab = lazy(() => import('./components/BlogTab'));
const CsharpCodeViewer = lazy(() => import('./components/CsharpCodeViewer'));
const AdminPanelTab = lazy(() => import('./components/AdminPanelTab'));
const FlutterCodeViewer = lazy(() => import('./components/FlutterCodeViewer'));

const AuthModal = lazy(() => import('./components/AuthModal'));
const InstallPage = lazy(() => import('./components/InstallPage'));
const ChatTab = lazy(() => import('./components/ChatTab'));
const ThemeSelectorModal = lazy(() => import('./components/ThemeSelectorModal'));
const ConsoleHubView = lazy(() => import('./components/ConsoleHubView'));
const ConsoleGridClassic = lazy(() => import('./components/ConsoleGridClassic'));
const VisualHelpGuide = lazy(() => import('./components/VisualHelpGuide'));
const MobileAppDownloadPage = lazy(() => import('./components/MobileAppDownloadPage'));
const MobileAppDownloadWidget = lazy(() => import('./components/MobileAppDownloadWidget'));
import { useLanguage } from './context/LanguageContext';
import { 
  Trophy, Monitor, Coffee, ShoppingBag, Newspaper, Award, Code, Flame, Coins, X, HelpCircle,
  Sparkles, Home, Instagram, Send, Youtube, Twitter, Facebook, Settings, ChevronDown,
  Smartphone, QrCode, Download, Menu, MessageSquare, LogIn, Search, User, LogOut, ArrowLeft, ArrowRight, Palette
} from 'lucide-react';

/* ────────────────────────────────────────────────────────────────
   THEME BOOTSTRAP (یک‌بار قبل از اولین رندر)
   فایل CSS قالب ذخیره‌شده را قبل از paint اولیه اعمال می‌کند تا
   هنگام بارگذاری صفحه هیچ پرش ظاهری (flash) رخ ندهد.
   ──────────────────────────────────────────────────────────────── */
const __initialCustomThemes = loadCustomThemes();
const __initialThemeId = getStoredThemeId();
const __initialTheme = [...BUILT_IN_THEMES, ...__initialCustomThemes]
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

// ── داده‌ی اولیه‌ی تزریق‌شده در HTML توسط سرور ────────────────────────────
// سرور در production، لیست مسابقات را به‌صورت window.__BAZINO_BOOTSTRAP__
// داخل خودِ HTML می‌گذارد تا اولین رندر منتظر یک رفت‌وبرگشت اضافه‌ی /api
// نماند — یعنی /api/tournaments از زنجیره‌ی بحرانی LCP (HTML → JS → API) که
// Lighthouse گزارش کرده بود حذف می‌شود. در dev (Vite) این متغیر وجود ندارد
// و کد همان مسیر fetch قبلی را می‌رود.
type BgRequestInit = RequestInit & { priority?: 'high' | 'low' | 'auto' };
const BOOTSTRAP = (typeof window !== 'undefined'
  ? (window as unknown as { __BAZINO_BOOTSTRAP__?: { tournaments?: Tournament[] } }).__BAZINO_BOOTSTRAP__
  : undefined);
const BOOTSTRAP_TOURNAMENTS: Tournament[] | null = Array.isArray(BOOTSTRAP?.tournaments) ? (BOOTSTRAP!.tournaments as Tournament[]) : null;

// fetchهای پس‌زمینه با اولویت «low» — با منابع LCP رقابت نمی‌کنند و در
// درخت وابستگی شبکه‌ی Chrome بخشی از مسیر بحرانی حساب نمی‌شوند.
const BG_FETCH: BgRequestInit = { priority: 'low' };

export default function App() {
  const { language, setLanguage, t, dir } = useLanguage();
  const [langDropdownOpen, setLangDropdownOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [themeId, setThemeId] = useState(() => {
    const saved = getStoredThemeId();
    const known = [...BUILT_IN_THEMES, ...loadCustomThemes()];
    return known.some(t => t.id === saved) ? saved : 'dark-gold';
  });
  const [layoutMode, setLayoutMode] = useState<'classic' | 'hub'>('classic');
  const [availableThemes, setAvailableThemesState] = useState<ThemeInfo[]>(() => [
    ...BUILT_IN_THEMES,
    ...loadCustomThemes()
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

  const [activeTab, setActiveTab] = useState('home');
  const [currentPath, setCurrentPath] = useState(() => window.location.pathname);

  // دریافت قالب‌های نصب‌شده روی سرور (هر قالب پوشه اختصاصی خودش را دارد)
  useEffect(() => {
    fetch('/api/themes')
      .then(r => r.json())
      .then((data: { serverThemes?: any[] }) => {
        if (!data.serverThemes || data.serverThemes.length === 0) return;
        const serverThemes: ThemeInfo[] = data.serverThemes.map(t => ({
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
        }));
        setAvailableThemesState(prev => {
          const existing = new Set(prev.map(t => t.id));
          const merged = [...prev, ...serverThemes.filter(t => !existing.has(t.id))];
          // اگر قالب فعال یک قالب سروری است، استایلش الان بارگذاری می‌شود
          // (useEffect پایین با تغییر availableThemes دوباره اجرا می‌شود)
          return merged;
        });
      })
      .catch(err => console.error('[Themes] Failed to fetch server themes:', err));
  }, []);

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
  }, [themeId, availableThemes]);

  useEffect(() => {
    localStorage.setItem('layoutMode', layoutMode);
  }, [layoutMode]);

  useEffect(() => {
    const onPopState = () => setCurrentPath(window.location.pathname);
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const openAppDownloadPage = () => {
    window.history.pushState({}, '', '/app-download');
    setCurrentPath('/app-download');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const backToHomeFromDownload = () => {
    window.history.pushState({}, '', '/');
    setCurrentPath('/');
    setActiveTab('home');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Keep the LCP-only LandingHero as the first commit. HomeTab contains all below-fold
  // cards and effects, so mounting it only after the load event's first idle window avoids
  // competing style/layout work with the hero image paint.
  const [isHomeContentReady, setIsHomeContentReady] = useState(false);
  const [isAppDownloadWidgetReady, setIsAppDownloadWidgetReady] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [helpMode, setHelpMode] = useState<'admin' | 'gamenet'>('gamenet');
  const [user, setUser] = useState<UserState | null>(null);
  // نصب در checkInstallStatus عمداً bypass است؛ مقدار اولیه‌ی true از paint واسط
  // spinner و جابه‌جایی کامل layout در mount دوم جلوگیری می‌کند (CLS/TBT گزارش).
  const [isInstalled, setIsInstalled] = useState<boolean | null>(true);
  
  // Data States
  const [systems, setSystems] = useState<GameSystem[]>([]);
  const [cafeItems, setCafeItems] = useState<CafeItem[]>([]);
  const [accessories, setAccessories] = useState<Accessory[]>([]);
  // اگر سرور داده‌ی اولیه را داخل HTML تزریق کرده باشد، رندر اول همان را دارد
  const [tournaments, setTournaments] = useState<Tournament[]>(() => BOOTSTRAP_TOURNAMENTS ?? []);
  const [articles, setArticles] = useState<Article[]>([]);
  const [transactions, setTransactions] = useState<LoyaltyTx[]>([]);
  const [activeCoupons, setActiveCoupons] = useState<DiscountCode[]>([]);

  const [notifications, setNotifications] = useState<Array<{ id: string; text: string; type: 'success' | 'error' | 'info' }>>([]);
  const [isThemeModalOpen, setIsThemeModalOpen] = useState(false);
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

  const handleRedeemPoints = async (points: number, couponValue: number, code: string) => {
    if (!user) return;
    try {
      const res = await fetch('/api/loyalty/redeem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ points, couponValue, code })
      });
      if (res.ok) {
        setUser({ ...user, points: user.loyaltyPoints - points });
        addNotification(language === 'fa' ? 'کد تخفیف با موفقیت ایجاد شد.' : 'Discount code created.', 'success');
        const updatedCoupons = await fetch('/api/coupons').then(r => r.json());
        if(Array.isArray(updatedCoupons)) setActiveCoupons(updatedCoupons);
      }
    } catch (e) {
      addNotification('Error redeeming points', 'error');
    }
  };

  const handleAddLoyaltyPoints = async (points: number) => {
    if (!user) return;
    try {
      const res = await fetch('/api/user/points', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ points })
      });
      if (res.ok) {
        setUser({ ...user, points: user.loyaltyPoints + points });
        addNotification(language === 'fa' ? `${points} امتیاز به شما اضافه شد.` : `Added ${points} points.`, 'success');
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleRegisterTeam = async (tournamentId: string, team: { name: string; leader: string; members: string[]; }) => {
    addNotification('Registered successfully', 'success');
  };

  const handleAddComment = async (articleId: string, comment: { gamerTag: string; content: string; }) => {
    addNotification('Comment added', 'success');
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
    addNotification(language === 'fa' ? 'خروج موفقیت‌آمیز بود' : 'Logged out successfully', 'success');
  };

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
              addNotification(language === 'fa' ? 'نمای کلاسیک فعال شد' : 'Classic View Activated', 'info');
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
          <LandingHero onNavigate={() => setActiveTab('reservations')} />
        ) : (
          <Suspense fallback={<LandingHero onNavigate={() => setActiveTab('reservations')} />}>
            <HomeTab
              themeId={themeId}
              tournaments={tournaments}
              onNavigate={setActiveTab}
              themeComponent={(() => {
                const th = availableThemes.find(x => x.id === themeId);
                return th && th.kind === 'server' && th.cssUrl
                  ? { cssUrl: th.cssUrl, assetsBase: th.assetsBase || th.cssUrl.replace(/\/theme\.css$/, '/assets') }
                  : null;
              })()}
            />
          </Suspense>
        )
      )}
      {activeTab === 'loyalty' && <LoyaltyProfileTab themeId={themeId} user={user} transactions={transactions} activeCoupons={activeCoupons} onRedeemPoints={handleRedeemPoints} addNotification={addNotification}/>}
      {activeTab === 'reservations' && <ReservationsTab themeId={themeId} systems={systems} activeCoupons={activeCoupons} onAddLoyaltyPoints={handleAddLoyaltyPoints} addNotification={addNotification}/>}
      {activeTab === 'cafe' && <CafeTab themeId={themeId} cafeItems={cafeItems} activeCoupons={activeCoupons} onAddLoyaltyPoints={handleAddLoyaltyPoints} addNotification={addNotification}/>}
      {activeTab === 'shop' && <ShopTab themeId={themeId} accessories={accessories} activeCoupons={activeCoupons} onAddLoyaltyPoints={handleAddLoyaltyPoints} addNotification={addNotification}/>}
      {activeTab === 'tournaments' && <TournamentsTab themeId={themeId} tournaments={tournaments} onAddLoyaltyPoints={handleAddLoyaltyPoints} onRegisterTeam={handleRegisterTeam} addNotification={addNotification}/>}
      {activeTab === 'blog' && <BlogTab themeId={themeId} articles={articles} onAddComment={handleAddComment} addNotification={addNotification}/>}
      {activeTab === 'admin' && (
        <AdminPanelTab 
          themeId={themeId} 
          setThemeId={setThemeId} 
          availableThemes={availableThemes} 
          setAvailableThemes={setAvailableThemes} 
          addNotification={addNotification} 
          layoutMode={layoutMode}
          setLayoutMode={setLayoutMode}
        />
      )}
      {activeTab === 'csharp' && <CsharpCodeViewer addNotification={addNotification} />}
      {activeTab === 'flutter' && <FlutterCodeViewer addNotification={addNotification} />}

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

  const isAdminView = activeTab === 'admin';
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

  return (
    <div 
      className={`${isAdminView ? 'admin-shell' : `theme-${themeId || "dark-gold"}`} ${layoutMode === 'hub' && activeTab === 'home' ? 'h-[100dvh] overflow-hidden' : 'min-h-[100dvh]'} pb-[env(safe-area-inset-bottom,0px)] w-full text-gray-100 flex flex-col font-sans relative overflow-x-hidden selection:bg-primary/30 app-bg-main`} 
      style={adminShellVars}
      dir={dir}
    >
      {/* Admin Ribbon Bar */}
      {user?.role === 'admin' && activeTab !== 'admin' && (
        <div className="bg-gradient-to-r from-purple-950 via-purple-900 to-indigo-950 border-b border-purple-500/30 text-white px-4 py-2 flex items-center justify-between text-xs font-bold z-50 relative shadow-lg animate-pulse-subtle">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-purple-400 animate-ping"></span>
            <span className="font-display uppercase tracking-wider text-purple-200">
              {language === 'fa' ? 'پنل مدیریت فعال است' : 'Admin Area Active'}
            </span>
            <span className="text-purple-400 font-normal hidden sm:inline">
              | {language === 'fa' ? `ورود با حساب مدیر: @${user.username}` : `Logged in as: @${user.username}`}
            </span>
          </div>
          <button 
            onClick={() => setActiveTab('admin')} 
            className="bg-primary hover:bg-primary/95 text-black px-3.5 py-1.5 rounded-lg transition-all font-black uppercase text-[10px] tracking-wider flex items-center gap-1.5 shadow-[0_0_15px_rgba(255,184,0,0.3)] hover:scale-105 active:scale-95 cursor-pointer"
          >
            <Settings className="w-3 h-3" />
            <span>{language === 'fa' ? 'ورود به پنل مدیریت' : 'Enter Admin Panel'}</span>
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
        <div className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] bg-[#A855F7]/5 rounded-full blur-[150px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50vw] h-[50vw] bg-[#06B6D4]/5 rounded-full blur-[150px]" />
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
        <header className="site-header h-[70px] border-b border-white/10 bg-dark-card/90 backdrop-blur-xl px-4 md:px-8 flex justify-between items-center z-40 sticky top-0 shrink-0 shadow-lg">
            <div className="flex items-center gap-4 cursor-pointer" onClick={() => setActiveTab('home')}>
               <img src={bazinoLogo} alt="Bazino Pro" width="40" height="40" className="brand-logo-guard h-10 w-auto" />
               <span className="font-display font-black text-xl tracking-wider text-white hidden md:block">BAZINO <span className="text-primary">PRO</span></span>
            </div>
            
            <nav className="hidden md:flex items-center gap-2 h-full">
              {[
                { id: 'home', label: language === 'fa' ? 'خانه' : (language === 'ru' ? 'ГЛАВНАЯ' : (language === 'tr' ? 'ANASAYFA' : 'Home')), icon: Home },
                { id: 'reservations', label: language === 'fa' ? 'رزرو' : (language === 'ru' ? 'БРОНЬ' : (language === 'tr' ? 'REZERV' : 'Reserve')), icon: Monitor },
                { id: 'cafe', label: language === 'fa' ? 'کافه' : (language === 'ru' ? 'КАФЕ' : (language === 'tr' ? 'KAFE' : 'Cafe')), icon: Coffee },
                { id: 'shop', label: language === 'fa' ? 'فروشگاه' : (language === 'ru' ? 'МАГАЗИН' : (language === 'tr' ? 'MAĞAZA' : 'Shop')), icon: ShoppingBag },
                { id: 'tournaments', label: language === 'fa' ? 'مسابقات' : (language === 'ru' ? 'АРЕНА' : (language === 'tr' ? 'ARENA' : 'Arena')), icon: Trophy },
                { id: 'loyalty', label: language === 'fa' ? 'باشگاه' : (language === 'ru' ? 'КЛУБ' : (language === 'tr' ? 'KULÜP' : 'Club')), icon: Award }
              ].map(t => (
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
                   <LogIn className="w-4 h-4"/> {language === 'fa' ? 'ورود' : 'Login'}
                 </button>
               ) : (
                 <div className="flex items-center gap-3">
                   <span className="text-xs font-bold text-primary">@{user.username}</span>
                   <button onClick={handleLogout} aria-label="Logout" className="text-red-400 hover:text-red-300"><LogOut className="w-4 h-4"/></button>
                 </div>
               )}
               <button 
                 onClick={() => { setHelpMode('gamenet'); setIsHelpOpen(true); }}
                 className="p-2 text-white bg-white/5 rounded-full hover:bg-white/10 flex items-center justify-center cursor-pointer transition-all"
                 title={language === 'fa' ? 'راهنمای تصویری کلوپ' : 'Client Visual Guide'}
               >
                 <HelpCircle className="w-4 h-4 text-primary" />
               </button>
               <button onClick={() => setIsThemeModalOpen(true)} className="p-2 text-white bg-white/5 rounded-full hover:bg-white/10">
                 <Palette className="w-4 h-4"/>
               </button>
            </div>
          </header>
      )}

      {activeTab === 'admin' && (
        <header className="h-[70px] bg-gradient-to-r from-purple-950 via-slate-900 to-indigo-950 border-b border-purple-500/30 px-4 md:px-8 flex justify-between items-center z-50 sticky top-0 shrink-0 shadow-2xl">
          <div className="flex items-center gap-3">
            <span className="w-2.5 h-2.5 rounded-full bg-purple-500 animate-ping"></span>
            <div className="flex flex-col">
              <span className="font-display font-black text-sm tracking-wider text-purple-200">
                {language === 'fa' ? 'پنل مدیریت بازینو پرو' : 'BAZINO PRO ADMIN'}
              </span>
              <span className="text-[10px] text-purple-400 font-medium font-sans">
                {language === 'fa' ? `مدیر: @${user?.username}` : `Admin: @${user?.username}`}
              </span>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <button 
              onClick={() => { setHelpMode('admin'); setIsHelpOpen(true); }}
              className="bg-purple-500/20 hover:bg-purple-500/35 border border-purple-500/30 text-purple-200 px-3 py-2 rounded-xl text-xs font-black flex items-center gap-2 cursor-pointer transition-all active:scale-95"
            >
              <HelpCircle className="w-4 h-4 text-purple-300 animate-pulse" />
              <span>{language === 'fa' ? 'راهنمای ادمین' : 'Admin Guide'}</span>
            </button>
            <button 
              onClick={() => setActiveTab('home')} 
              className="bg-white/10 hover:bg-white/15 border border-white/20 hover:border-purple-500/40 text-white px-4 py-2 rounded-xl transition-all font-bold text-xs flex items-center gap-2 cursor-pointer shadow-md active:scale-95"
            >
              {dir === 'rtl' ? <ArrowRight className="w-4 h-4 text-purple-300" /> : <ArrowLeft className="w-4 h-4 text-purple-300" />}
              <span>{language === 'fa' ? 'بازگشت به سایت' : 'Back to Site'}</span>
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
          TBT بالا و دانلود ThemeSelectorModal/AuthModal/VisualHelpGuide در بار اول
          می‌شد (مشاهده‌شده در Waterfall گزارش GTmetrix). با شرطی کردن، این چانک‌ها
          (شامل motion که فقط داخل ThemeSelectorModal است) از مسیر بحرانی حذف شدند. */}
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
        {isThemeModalOpen && (
          <ThemeSelectorModal
            isOpen={isThemeModalOpen}
            onClose={() => setIsThemeModalOpen(false)}
            availableThemes={availableThemes}
            themeId={themeId}
            setThemeId={setThemeId}
            language={language}
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
                {language === 'fa' ? 'خروج از حساب کاربری' : 'Sign Out Profile'}
              </h3>
              <p className="text-gray-400 text-xs leading-relaxed">
                {language === 'fa' 
                  ? 'آیا برای خروج از حساب کاربری خود مطمئن هستید؟ برای استفاده دوباره از خدمات باید وارد شوید.' 
                  : 'Are you sure you want to sign out from your gaming profile? You will need to login again to reserve rigs.'}
              </p>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setIsLogoutConfirmOpen(false)}
                className="flex-1 py-3 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold text-xs rounded-xl transition-all cursor-pointer"
              >
                {language === 'fa' ? 'انصراف' : 'Cancel'}
              </button>
              <button
                onClick={confirmLogout}
                className="flex-1 py-3 bg-red-500 hover:bg-red-600 text-white font-black text-xs rounded-xl transition-all shadow-[0_0_20px_rgba(239,68,68,0.3)] cursor-pointer animate-pulse-subtle"
              >
                {language === 'fa' ? 'خروج' : 'Logout'}
              </button>
            </div>
          </div>
        </div>
      )}
      
      <ScrollToTop 
        hidden={activeTab === 'admin' || activeTab === 'hub' || activeTab === 'console_grid'} 
        isRTL={dir === 'rtl'} 
      />
    </div>
  );
}
