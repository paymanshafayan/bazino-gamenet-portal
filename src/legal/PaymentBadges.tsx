/**
 * نشان‌های پرداخت/امنیت (Visa، Mastercard، Troy، PayTR، 3D Secure، SSL) به‌صورت SVG درون‌خطی.
 * قالب روی این‌ها اثری ندارد (رنگ‌ها ثابت). برای فوتر قانونی و صفحهٔ پرداخت.
 *
 * فایل‌ها در `public/images/payments/` هستند؛ لوگوی رسمی PayTR/Troy پس از دریافت پک رسمی
 * (`PayTR_Gorselleri.zip`) با همان نام فایل جایگزین می‌شود.
 */
import React from 'react';

const box: React.CSSProperties = { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: '#ffffff', borderRadius: 6, height: 28, padding: '0 8px', border: '1px solid #d9dee8' };

const IMG: React.CSSProperties = { display: 'block', height: '60%', width: 'auto', maxWidth: 64 };

/** لوگوها به‌صورت فایل SVG مستقل (<img>) تا هیچ CSS قالبی نتواند fill/font آن‌ها را تغییر دهد. */
function BrandImg({ src, alt, height }: { src: string; alt: string; height: number }) {
  return (
    <span style={{ ...box, height }} title={alt}>
      <img src={src} alt={alt} style={IMG} loading="lazy" decoding="async" />
    </span>
  );
}
export function VisaLogo({ height = 28 }: { height?: number }) { return <BrandImg src="/images/payments/visa.svg" alt="Visa" height={height} />; }
export function MastercardLogo({ height = 28 }: { height?: number }) { return <BrandImg src="/images/payments/mastercard.svg" alt="Mastercard" height={height} />; }
export function TroyLogo({ height = 28 }: { height?: number }) { return <BrandImg src="/images/payments/troy.svg" alt="Troy" height={height} />; }
export function PaytrLogo({ height = 28 }: { height?: number }) { return <BrandImg src="/images/payments/paytr.svg" alt="PayTR" height={height} />; }

export function SecureBadge({ label, height = 28 }: { label: string; height?: number }) {
  return (
    <span style={{ ...box, height, background: '#0f172a', borderColor: '#1e293b', color: '#a7f3d0', fontSize: 11, fontWeight: 800, gap: 6 }} title={label} aria-label={label}>
      <svg viewBox="0 0 24 24" width={height * 0.5} height={height * 0.5} fill="none" stroke="#34d399" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2l8 4v6c0 5-3.5 9-8 10-4.5-1-8-5-8-10V6z" /><path d="M9 12l2 2 4-4" /></svg>
      {label}
    </span>
  );
}

export function PaymentBadgeRow({ height = 26, compact = false }: { height?: number; compact?: boolean }) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
      <VisaLogo height={height} />
      <MastercardLogo height={height} />
      <TroyLogo height={height} />
      <PaytrLogo height={height} />
      {!compact && <SecureBadge label="3D Secure" height={height} />}
      {!compact && <SecureBadge label="SSL" height={height} />}
    </div>
  );
}
