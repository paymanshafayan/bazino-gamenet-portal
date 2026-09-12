/**
 * Helper برای تب‌های «ابزارهای سایت» در WebSyncModal — همان الگوی syncClient،
 * با مدیریت خطای یکسان و پیام‌های فارسی دوستانه.
 * همهٔ تب‌های سایت (تیکت، پیام، گفتگو، پیامک، تنظیمات، اسلایدر، لاگ، توکن)
 * از این تابع استفاده می‌کنند: fetch به /api/sync/* سایت با کلید API.
 */
import { buildSyncUrl, syncHeaders } from './syncClient';

export interface SiteFetchInit {
  method?: string;
  /** بدنهٔ JSON (به‌طور خودکار سریالایز می‌شود) */
  body?: any;
}

/** فراخوانی یک مسیر /api/sync/* سایت؛ در صورت خطا Error با متن فارسی برمی‌گرداند. */
export async function siteFetch<T = any>(
  webServerUrl: string,
  apiKey: string,
  path: string,
  init: SiteFetchInit = {}
): Promise<T> {
  let res: Response;
  try {
    res = await fetch(buildSyncUrl(webServerUrl, path), {
      method: init.method || 'GET',
      headers: syncHeaders(apiKey, init.body !== undefined),
      body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
    });
  } catch {
    throw new Error('ارتباط با سرور برقرار نشد — آدرس سرور را در تب «تنظیمات کلید API» بررسی کنید');
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok || (data && data.success === false)) {
    throw new Error(data?.error || `خطای سرور (HTTP ${res.status})`);
  }
  return data as T;
}

/** تبدیل خطای سرور/شبکه به پیام فارسی خوانا (همان نگاشت WebSyncModal). */
export function prettySiteError(err: any): string {
  const m = String(err?.message || err || '');
  if (/FORBIDDEN/i.test(m)) return 'کلید API دسترسی لازم (مجوز configure) را ندارد — از توکن کارمند ادمین استفاده کنید';
  if (/401|Invalid or missing sync API key|Sync API key is not configured/i.test(m)) return 'کلید API نامعتبر است — تب «تنظیمات کلید API» را بررسی کنید';
  return m || 'خطای ناشناخته';
}
