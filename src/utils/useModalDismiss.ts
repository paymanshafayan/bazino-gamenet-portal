import { useEffect } from 'react';

/**
 * بستن یک مودال با کلید Escape.
 *
 * چرا وجود دارد: مودال‌های سایت (انتخاب قالب، راهنمای تصویری، ورود) فقط با
 * دکمه‌ی ✕ بسته می‌شدند. کاربری که عادت به Escape دارد فکر می‌کرد صفحه قفل شده
 * است — در تست خودکار هم همین باعث شد مودال قالب باز بماند و هشت مرحله‌ی بعدی
 * بلاک شود.
 *
 * ضمناً تا وقتی مودال باز است، اسکرول پس‌زمینه قفل می‌شود تا محتوای زیر مودال
 * زیر انگشت کاربر جابه‌جا نشود.
 */
export function useModalDismiss(isOpen: boolean, onClose: () => void): void {
  useEffect(() => {
    if (!isOpen) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', onKeyDown);

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen, onClose]);
}
