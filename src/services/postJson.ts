/**
 * ارسال یک عملیات به بک‌اند و برگرداندن پاسخ JSON.
 *
 * چرا وجود دارد: چند جریان مهم سایت (سفارش کافه، خرید فروشگاه، ثبت‌نام تورنمنت،
 * ثبت نظر) هرگز به سرور وصل نشده بودند و فقط یک پیام موفقیت نمایش می‌دادند.
 * این تابع الگوی یکسانِ «ارسال → خواندن خطای واقعی سرور → برگرداندن داده» را
 * در یک جا جمع می‌کند تا آن اشتباه دوباره تکرار نشود.
 *
 * توکن احراز هویت لازم نیست دستی اضافه شود: services/authToken.ts یک اینترسپتور
 * روی fetch نصب می‌کند که هدر Authorization را برای درخواست‌های هم‌مبدأ می‌گذارد.
 */
export async function postJson<T = any>(url: string, body: unknown): Promise<T> {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    // بک‌اند خطاهای قابل‌فهم فارسی می‌دهد («موجودی «قهوه» کافی نیست») — همان را
    // به کاربر نشان بده، نه یک پیام عمومی.
    let message = `HTTP ${response.status}`;
    try {
      const data = await response.json();
      if (data && typeof data.error === 'string') message = data.error;
    } catch { /* پاسخ JSON نبود */ }
    throw new Error(message);
  }

  return response.json();
}

/** پیام خطای قابل‌نمایش از هر چیزی که catch گرفته است. */
export function errorMessage(e: unknown, fallback: string): string {
  return e instanceof Error && e.message ? e.message : fallback;
}

/** سبد خرید کلاینت ({item, qty}) → شکلی که بک‌اند انتظار دارد ({item, quantity}). */
export function toServerCart<T>(cart: Array<{ item: T; qty: number }>): Array<{ item: T; quantity: number }> {
  return cart.map(({ item, qty }) => ({ item, quantity: qty }));
}
