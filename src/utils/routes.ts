/**
 * نگاشت ساده‌ی مسیر مرورگر ↔ تب/بخش (بدون کتابخانه‌ی روتر).
 *
 *   /                → home
 *   /games           → games (صفحهٔ بازی‌ها؛ شامل جریان رزرو بعد از انتخاب دسته)
 *   /reservations    → games (alias قدیمی تب Reserve — همان صفحه رندر می‌شود)
 *   /admin           → admin (بخش dashboard)
 *   /admin/themes    → admin (بخش themes)
 *   /app-download    → صفحه‌ی دانلود اپ (خارج از تب‌ها؛ در App.tsx جدا رندر می‌شود)
 *   /legal/:slug     → متن‌های قانونی (مستقل از قالب)
 *   /contact         → تماس/مشخصات قانونی (مستقل از قالب)
 *   /profile[/tab]   → پروفایل کاربر (مستقل از قالب؛ تب‌ها: PROFILE_TABS؛ /profile/tickets/:id)
 *   /payment/success | /payment/fail → نتیجهٔ پرداخت (مستقل از قالب)
 *
 * هدف: آدرس مرورگر همیشه صفحه‌ی فعلی را نشان دهد و رفرش کاربر را به همان
 * صفحه (حتی داخل پنل مدیریت) برگرداند.
 */
export const PUBLIC_TABS = ['home', 'loyalty', 'games', 'cafe', 'shop', 'tournaments', 'blog', 'chat', 'admin'] as const;

/**
 * Alias تب‌های قدیمی → جدید. تب مستقل «Reserve» به صفحهٔ Games منتقل شده؛
 * مسیرهای /reservations و target='reservations' (اسلایدهای ادمین ذخیره‌شده در DB،
 * لینک‌های قدیمی) برای همیشه به games نگاشت می‌شوند تا deep-linkها نشکنند.
 */
export const LEGACY_TAB_ALIASES: Record<string, string> = { reservations: 'games' };

/** مسیرهای قالب Hub → تب کلاسیک پرتال (برای setActiveTab / داده‌های تب). */
export const HUB_PATH_ALIASES: Record<string, string> = {
  events: 'tournaments',
  food: 'cafe',
  club: 'loyalty',
};

/** صفحات قالب Hub که theme.js با regionهای hub.* رندر می‌کند. */
export const HUB_PAGES = [
  'home', 'games', 'events', 'weekly', 'special', 'season', 'brackets', 'register',
  'shop', 'food', 'club', 'blog', 'chat', 'contact', 'rules', 'privacy',
] as const;
export type HubPage = typeof HUB_PAGES[number];

export function hubPageFromPath(pathname: string): HubPage | null {
  const parts = pathname.replace(/^\/+|\/+$/g, '').split('/').filter(Boolean);
  if (parts.length === 0) return 'home';
  const first = parts[0];
  const sub = parts[1] || '';
  if (first === 'events' || first === 'tournaments') {
    if (sub === 'weekly' || sub === 'special' || sub === 'season' || sub === 'brackets' || sub === 'register') return sub;
    return 'events';
  }
  if (first === 'games' || first === 'reservations') return 'games';
  if (first === 'shop') return 'shop';
  if (first === 'food' || first === 'cafe') return 'food';
  if (first === 'club' || first === 'loyalty') return 'club';
  if (first === 'blog') return 'blog';
  if (first === 'chat') return 'chat';
  if (first === 'contact') return 'contact';
  if (first === 'rules') return 'rules';
  if (first === 'privacy') return 'privacy';
  return null;
}

export const ADMIN_SECTIONS = [
  'dashboard', 'jarvis', 'systems', 'cafe', 'shop', 'tournaments', 'tournamentOps', 'blog', 'content', 'promotions', 'chat', 'migrations', 'messages',
  'themes', 'appSlider', 'mobileAppDownload', 'customization', 'dbLogs', 'apiKeys', 'presentation', 'tickets', 'wallet', 'affiliates', 'messaging',
] as const;

/** تب‌های صفحهٔ پروفایل کاربر: /profile یا /profile/<tab> */
export const PROFILE_TABS = ['overview', 'wallet', 'points', 'reservations', 'orders', 'tournaments', 'tickets', 'affiliate', 'security'] as const;
export type ProfileTab = typeof PROFILE_TABS[number];
export function profileTabFromPath(pathname: string): ProfileTab {
  const parts = pathname.replace(/^\/+|\/+$/g, '').split('/');
  const t = parts[1] || 'overview';
  return (PROFILE_TABS as readonly string[]).includes(t) ? (t as ProfileTab) : 'overview';
}
export function pathFromProfileTab(tab: ProfileTab): string { return tab === 'overview' ? '/profile' : `/profile/${tab}`; }
export type AdminSection = typeof ADMIN_SECTIONS[number];

export function tabFromPath(pathname: string): string {
  const first = pathname.replace(/^\/+|\/+$/g, '').split('/')[0] || '';
  if (!first) return 'home';
  const canonical = LEGACY_TAB_ALIASES[first] || HUB_PATH_ALIASES[first] || first;
  return (PUBLIC_TABS as readonly string[]).includes(canonical) ? canonical : 'home';
}

export function pathFromTab(tab: string): string {
  const canonical = LEGACY_TAB_ALIASES[tab] || tab;
  if (canonical === 'home') return '/';
  return (PUBLIC_TABS as readonly string[]).includes(canonical) ? `/${canonical}` : '/';
}

export function adminSectionFromPath(pathname: string): AdminSection {
  const parts = pathname.replace(/^\/+|\/+$/g, '').split('/');
  if (parts[0] !== 'admin') return 'dashboard';
  const sec = parts[1] || 'dashboard';
  return (ADMIN_SECTIONS as readonly string[]).includes(sec) ? (sec as AdminSection) : 'dashboard';
}

export function pathFromAdminSection(section: AdminSection): string {
  return section === 'dashboard' ? '/admin' : `/admin/${section}`;
}

/** آدرس فعلی مرورگر را بدون افزودن به تاریخچه (اگر تغییری نکرده) به‌روز می‌کند */
export function navigateTo(path: string, replace = false): void {
  if (typeof window === 'undefined') return;
  if (window.location.pathname === path) return;
  if (replace) window.history.replaceState({}, '', path);
  else window.history.pushState({}, '', path);
}

/** صفحات مستقل از قالب که خارج از تب‌ها رندر می‌شوند. */
export type StandalonePage =
  | { type: 'invite'; id: string; token: string }
  | { type: 'legal'; slug: string }
  | { type: 'contact' }
  | { type: 'payment'; outcome: 'success' | 'fail'; oid: string }
  | { type: 'profile'; tab: ProfileTab; ticketId?: string }
  | null;

export function standalonePageFromPath(pathname: string, search = ''): StandalonePage {
  const parts = pathname.replace(/^\/+|\/+$/g, '').split('/');
  if (parts[0] === 'ig' && parts[1] === 'invite' && parts[2]) return {type:'invite',id:parts[2],token:new URLSearchParams(search).get('token')||''};
  if (parts[0] === 'legal') return { type: 'legal', slug: parts[1] || 'terms' };
  if (parts[0] === 'contact') return { type: 'contact' };
  if (parts[0] === 'profile') return { type: 'profile', tab: profileTabFromPath(pathname), ticketId: parts[1] === 'tickets' ? parts[2] : undefined };
  if (parts[0] === 'payment' && (parts[1] === 'success' || parts[1] === 'fail')) {
    const oid = new URLSearchParams(search).get('oid') || '';
    return { type: 'payment', outcome: parts[1], oid };
  }
  return null;
}
