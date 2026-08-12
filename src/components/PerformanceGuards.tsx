import React, { useEffect, useRef, useState } from 'react';

interface DeferredSectionProps {
  minHeight: number;
  render: () => React.ReactNode;
  onVisible?: () => void;
}

/**
 * بخش‌های دور از viewport را تا نزدیک‌شدن کاربر mount نمی‌کند. placeholder با
 * ارتفاع رزروشده، هم DOM اولیه را کوچک نگه می‌دارد و هم از layout shift جلوگیری
 * می‌کند. این بخش مستقیماً ممیزی excessive DOM / main-thread گزارش GTmetrix است.
 */
export function DeferredSection({ minHeight, render, onVisible }: DeferredSectionProps) {
  const placeholderRef = useRef<HTMLDivElement | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (isVisible) return;
    const target = placeholderRef.current;
    if (!target || typeof IntersectionObserver === 'undefined') {
      setIsVisible(true);
      onVisible?.();
      return;
    }

    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      setIsVisible(true);
      onVisible?.();
      observer.disconnect();
    }, { rootMargin: '400px 0px' });

    observer.observe(target);
    return () => observer.disconnect();
  }, [isVisible, onVisible]);

  if (isVisible) return <>{render()}</>;
  return <div ref={placeholderRef} style={{ minHeight }} aria-hidden="true" />;
}

/**
 * تصاویر را به srcset واکنش‌گرا تبدیل می‌کند.
 *
 * ۱) تصاویر محلی first-party (پوشه‌ی /images/): فایل‌های واریانت بر اساس عرض
 *    با قرارداد {stem}-{width}.webp ساخته شده‌اند (مثلاً esports-480.webp).
 *    چون از همان origin سرو می‌شوند، دانلود cross-origin حذف می‌شود و LCP/FCP
 *    بهتر می‌شود. فقط واریانت‌هایی را درخواست کنید که واقعاً وجود دارند.
 *
 * ۲) URLهای Unsplash: همچنان با پارامتر w/q به srcset تبدیل می‌شوند (برای
 *    تصاویر سفارشی که ادمین آپلود کرده و هنوز لوکال نشده‌اند).
 *
 * ۳) هر چیز دیگر (URL دل‌خواه ادمین از یک هاست دیگر): undefined برمی‌گردد تا
 *    فقط از src استفاده شود.
 */
export function getResponsiveSrcSet(src: string, widths: number[]) {
  if (typeof src !== 'string' || widths.length === 0) return undefined;

  // Local first-party images — same origin, no cross-origin download.
  if (src.startsWith('/images/') && src.endsWith('.webp')) {
    const withWidth = src.match(/^(.*?)-\d+\.webp$/);
    const stem = withWidth ? withWidth[1] : src.replace(/\.webp$/, '');
    return widths.map(w => `${stem}-${w}.webp ${w}w`).join(', ');
  }

  // Unsplash responsive transform (kept for admin-uploaded custom image URLs).
  if (src.includes('images.unsplash.com')) {
    return widths.map(width => {
      const url = new URL(src);
      url.searchParams.set('w', String(width));
      url.searchParams.set('q', '70');
      return `${url.toString()} ${width}w`;
    }).join(', ');
  }

  return undefined;
}
