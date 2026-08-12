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

/** فقط URLهای Unsplash را به srcset واکنش‌گرا تبدیل می‌کند؛ URL سفارشی ادمین دست‌نخورده می‌ماند. */
export function getResponsiveSrcSet(src: string, widths: number[]) {
  if (typeof src !== 'string' || !src.includes('images.unsplash.com')) return undefined;
  return widths.map(width => {
    const url = new URL(src);
    url.searchParams.set('w', String(width));
    return `${url.toString()} ${width}w`;
  }).join(', ');
}
