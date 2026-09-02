import { useEffect, useRef } from 'react';
import { safeSetStorage } from '../utils/storage';

/** تأخیر جمع‌بندی برای ارسال وضعیت به سرور (میلی‌ثانیه). */
export const PERSIST_DEBOUNCE_MS = 1500;

/**
 * یک مقدار را در localStorage نگه می‌دارد و **فقط وقتی محتوایش واقعاً عوض شده** می‌نویسد.
 *
 * چرا لازم شد: افکت ذخیره‌سازی قبلی سیزده وابستگی داشت و هر بار همه‌ی سیزده کلید را
 * بازنویسی می‌کرد. چون تیک ثانیه‌شمار مرجع `stations` را عوض می‌کرد، این یعنی هر ثانیه
 * سیزده بار `JSON.stringify` و سیزده نوشتن **همگام** در localStorage روی رشته‌ی اصلی —
 * که رابط کاربری را به ۳٫۳ فریم بر ثانیه رسانده بود.
 *
 * مقایسه روی خودِ رشته‌ی serialize‌شده انجام می‌شود، چون همان چیزی است که ذخیره می‌شود؛
 * پس یک آرایه‌ی تازه با محتوای یکسان، هیچ نوشتنی ایجاد نمی‌کند.
 */
export function useSavedValue<T>(key: string, value: T): void {
  const lastSerialized = useRef<string | null>(null);

  useEffect(() => {
    let serialized: string;
    try {
      serialized = JSON.stringify(value);
    } catch {
      return; // مقدار قابل serialize نیست — بی‌صدا رد شو، مثل رفتار قبلی safeSetStorage
    }

    if (serialized === lastSerialized.current) return;
    lastSerialized.current = serialized;
    safeSetStorage(key, value);
  }, [key, value]);
}
