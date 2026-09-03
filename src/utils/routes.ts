/**
 * نگاشت ساده‌ی مسیر مرورگر ↔ تب/بخش (بدون کتابخانه‌ی روتر).
 *
 *   /                → home
 *   /reservations    → reservations   (و بقیه‌ی تب‌های عمومی)
 *   /admin           → admin (بخش dashboard)
 *   /admin/themes    → admin (بخش themes)
 *   /app-download    → صفحه‌ی دانلود اپ (خارج از تب‌ها؛ در App.tsx جدا رندر می‌شود)
 *
 * هدف: آدرس مرورگر همیشه صفحه‌ی فعلی را نشان دهد و رفرش کاربر را به همان
 * صفحه (حتی داخل پنل مدیریت) برگرداند.
 */
export const PUBLIC_TABS = ['home', 'loyalty', 'reservations', 'cafe', 'shop', 'tournaments', 'blog', 'chat', 'admin'] as const;

export const ADMIN_SECTIONS = [
  'dashboard', 'systems', 'cafe', 'shop', 'tournaments', 'blog', 'chat', 'migrations', 'messages',
  'themes', 'appSlider', 'mobileAppDownload', 'customization', 'dbLogs', 'apiKeys', 'presentation',
] as const;
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
