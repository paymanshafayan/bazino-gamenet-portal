import { useEffect } from 'react';

/**
 * بستن یک مودال با کلید Escape + قفل اسکرول پس‌زمینه.
 *
 * چرا لازم شد: مودال‌های این اپ تمام‌صفحه‌اند و فقط با دکمه‌ی مخصوص خودشان بسته می‌شدند.
 * اپراتوری که عادت به Escape دارد فکر می‌کرد برنامه هنگ کرده؛ در تست خودکار هم همین
 * باعث شد یک مودالِ بازمانده هفت مرحله‌ی بعدی را ببلعد، چون روی همه‌چیز افتاده بود.
 *
 * معادل همین هوک در سایت اصلی (`src/utils/useModalDismiss.ts`) وجود دارد؛ این اپ ماژول‌هایش
 * را با سایت شریک نیست، پس یک نسخه‌ی مستقل لازم است.
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
