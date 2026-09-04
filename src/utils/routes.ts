/**
 * نگاشت ساده‌ی مسیر مرورگر ↔ تب/بخش (بدون کتابخانه‌ی روتر).
 *
 *   /                → home
 *   /reservations    → reservations   (و بقیه‌ی تب‌های عمومی)
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
export const PUBLIC_TABS = ['home', 'loyalty', 'reservations', 'cafe', 'shop', 'tournaments', 'blog', 'chat', 'admin'] as const;

export const ADMIN_SECTIONS = [
  'dashboard', 'systems', 'cafe', 'shop', 'tournaments', 'blog', 'chat', 'migrations', 'messages',
  'themes', 'appSlider', 'mobileAppDownload', 'customization', 'dbLogs', 'apiKeys', 'presentation', 'tickets', 'wallet',
] as const;

/** تب‌های صفحهٔ پروفایل کاربر: /profile یا /profile/<tab> */
export const PROFILE_TABS = ['overview', 'wallet', 'points', 'reservations', 'orders', 'tournaments', 'tickets', 'security'] as const;
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
  return (PUBLIC_TABS as readonly string[]).includes(first) ? first : 'home';
}

export function pathFromTab(tab: string): string {
  if (tab === 'home') return '/';
  return (PUBLIC_TABS as readonly string[]).includes(tab) ? `/${tab}` : '/';
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
  | { type: 'legal'; slug: string }
  | { type: 'contact' }
  | { type: 'payment'; outcome: 'success' | 'fail'; oid: string }
  | { type: 'profile'; tab: ProfileTab; ticketId?: string }
  | null;

export function standalonePageFromPath(pathname: string, search = ''): StandalonePage {
  const parts = pathname.replace(/^\/+|\/+$/g, '').split('/');
  if (parts[0] === 'legal') return { type: 'legal', slug: parts[1] || 'terms' };
  if (parts[0] === 'contact') return { type: 'contact' };
  if (parts[0] === 'profile') return { type: 'profile', tab: profileTabFromPath(pathname), ticketId: parts[1] === 'tickets' ? parts[2] : undefined };
  if (parts[0] === 'payment' && (parts[1] === 'success' || parts[1] === 'fail')) {
    const oid = new URLSearchParams(search).get('oid') || '';
    return { type: 'payment', outcome: parts[1], oid };
  }
  return null;
}
