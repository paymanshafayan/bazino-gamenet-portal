/**
 * مودال پرداخت آنلاین (PayTR iFrame) — مستقل از قالب. روی همهٔ قالب‌ها با z-index بالا و
 * پالت ثابت باز می‌شود. جریان:
 *   1) نمایش خلاصهٔ مبلغ + چک‌باکس رضایت به متن‌های قانونی (الزامی)
 *   2) POST /api/payments/paytr/create → iframeUrl
 *   3) نمایش iframe (با iFrameResizer در حالت واقعی)
 *   4) PayTR کاربر را به /payment/success|fail می‌برد؛ تأیید نهایی فقط با callback سرور.
 */
import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useLanguage } from '../context/LanguageContext';
import { L } from '../utils/i18n';
import { postJson, errorMessage } from '../services/postJson';
import { ensureLegalStyles, LEGAL_PALETTE } from './LegalShell';
import { PaymentBadgeRow } from './PaymentBadges';
import { LEGAL_TITLES, type Lang4 } from './legalContent';

export type PaymentKind = 'reservation' | 'cafe' | 'shop' | 'tournament';

export interface PaymentConfig { enabled: boolean; testMode: boolean; mock: boolean; currency: string; pointsPerUnit: number; iframeResizer: string; }

let cfgCache: PaymentConfig | null = null;
export async function getPaymentConfig(force = false): Promise<PaymentConfig> {
  if (cfgCache && !force) return cfgCache;
  try {
    const r = await fetch('/api/payments/config');
    cfgCache = r.ok ? await r.json() : { enabled: false, testMode: false, mock: false, currency: 'TL', pointsPerUnit: 10, iframeResizer: '' };
  } catch {
    cfgCache = { enabled: false, testMode: false, mock: false, currency: 'TL', pointsPerUnit: 10, iframeResizer: '' };
  }
  return cfgCache!;
}

interface CreateResp { success: boolean; merchantOid: string; amount: number; currency: string; iframeUrl: string; iframeResizer: string; testMode: boolean; mock: boolean; description: string; }

interface Props {
  kind: PaymentKind;
  params: Record<string, unknown>;
  /** مبلغ تخمینی سمت کلاینت فقط برای نمایش؛ مبلغ واقعی را سرور محاسبه می‌کند. */
  estimatedAmount?: number;
  title?: string;
  customer?: { name?: string; email?: string; phone?: string };
  onClose: () => void;
}

export function PaymentCheckout({ kind, params, estimatedAmount, title, customer, onClose }: Props) {
  const { language, dir } = useLanguage();
  const lang = (['fa', 'en', 'ru', 'tr'].includes(language) ? language : 'en') as Lang4;
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [order, setOrder] = useState<CreateResp | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  ensureLegalStyles();

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  // iFrameResizer فقط در حالت واقعی (اسکریپت از paytr.com)
  useEffect(() => {
    if (!order || !order.iframeResizer) return;
    const w = window as any;
    const apply = () => { try { w.iFrameResize?.({}, '#paytriframe'); } catch { /* ignore */ } };
    if (w.iFrameResize) { apply(); return; }
    const s = document.createElement('script');
    s.src = order.iframeResizer; s.async = true; s.onload = apply;
    document.head.appendChild(s);
  }, [order]);

  const start = async () => {
    if (!consent) { setError(L(language, { fa: 'برای ادامه باید متن‌های قانونی را بپذیرید.', en: 'You must accept the legal terms to continue.', ru: 'Необходимо принять условия.', tr: 'Devam etmek için yasal metinleri onaylamalısınız.' })); return; }
    setBusy(true); setError('');
    try {
      const r = await postJson<CreateResp>('/api/payments/paytr/create', { kind, params, customer, lang, consent: true });
      setOrder(r);
    } catch (e) {
      setError(errorMessage(e, L(language, { fa: 'ایجاد پرداخت ناموفق بود.', en: 'Could not start payment.', ru: 'Не удалось начать оплату.', tr: 'Ödeme başlatılamadı.' })));
    } finally { setBusy(false); }
  };

  const legalLink = (slug: 'distance-sales' | 'pre-information' | 'kvkk' | 'refund') => (
    <a key={slug} href={`/legal/${slug}`} target="_blank" rel="noopener noreferrer">{LEGAL_TITLES[slug][lang]}</a>
  );

  // Portal به body: خارج از هر stacking context قالب (نوار پایین موبایل، دکمهٔ اسکرول و …)
  return createPortal(
    <div className="bz-legal" dir={dir} role="dialog" aria-modal="true" data-payment-checkout
      style={{ position: 'fixed', inset: 0, zIndex: 100000, background: 'rgba(3,6,12,0.82)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 12 }}>
      <div className="bz-legal-card" style={{ width: '100%', maxWidth: order ? 720 : 520, maxHeight: '94vh', overflow: 'auto', padding: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', borderBottom: `1px solid ${LEGAL_PALETTE.border}` }}>
          <div style={{ fontWeight: 900, fontSize: 16 }}>{title || L(language, { fa: 'پرداخت آنلاین', en: 'Online payment', ru: 'Онлайн-оплата', tr: 'Online Ödeme' })}</div>
          <button type="button" onClick={onClose} aria-label="close" className="bz-legal-btn bz-legal-btn-ghost" style={{ padding: '4px 10px' }}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg></button>
        </div>

        {!order && (
          <div style={{ padding: 18, display: 'grid', gap: 14 }}>
            {typeof estimatedAmount === 'number' && (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 15 }}>
                <span style={{ color: LEGAL_PALETTE.muted }}>{L(language, { fa: 'مبلغ قابل پرداخت (تقریبی)', en: 'Amount due (estimate)', ru: 'К оплате (оценка)', tr: 'Ödenecek tutar (tahmini)' })}</span>
                <strong dir="ltr">{estimatedAmount.toLocaleString()} TL</strong>
              </div>
            )}
            <p style={{ fontSize: 13, color: LEGAL_PALETTE.muted, margin: 0 }}>
              {L(language, { fa: 'مبلغ نهایی توسط سرور بر اساس قیمت‌های روز و کد تخفیف محاسبه و در صفحهٔ بانک نمایش داده می‌شود.', en: 'The final amount is calculated server-side (current prices and coupons) and shown on the bank page.', ru: 'Итоговая сумма рассчитывается на сервере и показывается на странице банка.', tr: 'Nihai tutar sunucu tarafında (güncel fiyat ve kupon) hesaplanır ve banka sayfasında gösterilir.' })}
            </p>
            <label style={{ display: 'flex', gap: 10, alignItems: 'flex-start', fontSize: 13, cursor: 'pointer', padding: 12, border: `1px solid ${consent ? LEGAL_PALETTE.accent : LEGAL_PALETTE.border}`, borderRadius: 10 }}>
              <input type="checkbox" data-consent checked={consent} onChange={e => setConsent(e.target.checked)} style={{ marginTop: 3 }} />
              <span>
                {L(language, { fa: 'متن‌های ', en: 'I have read and accept the ', ru: 'Я прочитал(а) и принимаю: ', tr: '' })}
                {legalLink('pre-information')}{', '}{legalLink('distance-sales')}{', '}{legalLink('refund')}{' '}
                {L(language, { fa: 'و ', en: 'and ', ru: 'и ', tr: 've ' })}{legalLink('kvkk')}
                {L(language, { fa: ' را خوانده‌ام و می‌پذیرم.', en: '.', ru: '.', tr: " metinlerini okudum, onaylıyorum." })}
              </span>
            </label>
            {error && <div style={{ color: LEGAL_PALETTE.danger, fontSize: 13 }} data-error>{error}</div>}
            <button type="button" className="bz-legal-btn bz-legal-btn-primary" data-pay-start disabled={busy || !consent} onClick={start} style={{ opacity: busy || !consent ? 0.55 : 1, padding: '12px 18px', fontSize: 15 }}>
              {busy ? '…' : L(language, { fa: 'ادامه به درگاه امن', en: 'Continue to secure payment', ru: 'Перейти к оплате', tr: 'Güvenli ödemeye geç' })}
            </button>
            <PaymentBadgeRow height={24} />
          </div>
        )}

        {order && (
          <div style={{ padding: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 6, fontSize: 13, padding: '4px 6px 10px' }}>
              <span style={{ color: LEGAL_PALETTE.muted }}>{order.description}</span>
              <strong dir="ltr">{order.amount.toLocaleString()} {order.currency}</strong>
            </div>
            {(order.testMode || order.mock) && (
              <div style={{ background: '#3b2a06', color: '#fcd34d', fontSize: 12, padding: '6px 10px', borderRadius: 8, marginBottom: 8 }} data-test-banner>
                {order.mock ? 'MOCK GATEWAY' : 'TEST MODE'} — {L(language, { fa: 'هیچ مبلغی واقعاً کسر نمی‌شود.', en: 'no real money is charged.', ru: 'реальные деньги не списываются.', tr: 'gerçek tahsilat yapılmaz.' })}
              </div>
            )}
            <iframe ref={iframeRef} id="paytriframe" src={order.iframeUrl} title="PayTR" frameBorder={0} scrolling="no"
              style={{ width: '100%', minHeight: 560, background: '#fff', borderRadius: 10, border: 0 }} />
            <div style={{ fontSize: 11, color: LEGAL_PALETTE.muted, marginTop: 8 }} dir="ltr">order: {order.merchantOid}</div>
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
