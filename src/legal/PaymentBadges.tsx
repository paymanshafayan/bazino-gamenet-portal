/**
 * نشان‌های پرداخت/امنیت (Visa، Mastercard، Troy، PayTR، 3D Secure، SSL) به‌صورت SVG درون‌خطی.
 * قالب روی این‌ها اثری ندارد (رنگ‌ها ثابت). برای فوتر قانونی و صفحهٔ پرداخت.
 *
 * لوگوی رسمی PayTR در پک `PayTR_Gorselleri.zip` است؛ اینجا یک wordmark سادهٔ برندی نمایش داده
 * می‌شود که پس از دریافت پک رسمی می‌توان آن را با `public/images/payments/paytr.svg` جایگزین کرد.
 */
import React from 'react';

const box: React.CSSProperties = { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: '#ffffff', borderRadius: 6, height: 28, padding: '0 8px', border: '1px solid #d9dee8' };

export function VisaLogo({ height = 28 }: { height?: number }) {
  return (
    <span style={{ ...box, height }} title="Visa" aria-label="Visa">
      <svg viewBox="0 0 64 20" height={height * 0.5} role="img"><text x="0" y="17" fontFamily="Arial Black, Arial, sans-serif" fontWeight="900" fontStyle="italic" fontSize="20" fill="#1a1f71">VISA</text></svg>
    </span>
  );
}

export function MastercardLogo({ height = 28 }: { height?: number }) {
  return (
    <span style={{ ...box, height }} title="Mastercard" aria-label="Mastercard">
      <svg viewBox="0 0 40 24" height={height * 0.7} role="img">
        <circle cx="14" cy="12" r="10" fill="#eb001b" />
        <circle cx="26" cy="12" r="10" fill="#f79e1b" />
        <path d="M20 4.5a10 10 0 0 1 0 15 10 10 0 0 1 0-15z" fill="#ff5f00" />
      </svg>
    </span>
  );
}

export function TroyLogo({ height = 28 }: { height?: number }) {
  return (
    <span style={{ ...box, height }} title="Troy" aria-label="Troy">
      <svg viewBox="0 0 56 20" height={height * 0.5} role="img"><text x="0" y="16" fontFamily="Arial, sans-serif" fontWeight="800" fontSize="17" fill="#00a3e0">troy</text></svg>
    </span>
  );
}

export function PaytrLogo({ height = 28 }: { height?: number }) {
  return (
    <span style={{ ...box, height, background: '#fff' }} title="PayTR" aria-label="PayTR">
      <svg viewBox="0 0 70 20" height={height * 0.55} role="img">
        <text x="0" y="16" fontFamily="Arial, sans-serif" fontWeight="800" fontSize="17" fill="#1d4ed8">Pay</text>
        <text x="33" y="16" fontFamily="Arial, sans-serif" fontWeight="800" fontSize="17" fill="#f97316">TR</text>
      </svg>
    </span>
  );
}

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
