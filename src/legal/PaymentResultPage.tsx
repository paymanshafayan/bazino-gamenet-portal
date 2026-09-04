/**
 * صفحات /payment/success و /payment/fail — مستقل از قالب.
 * ok_url هیچ داده‌ای از PayTR ندارد؛ وضعیت واقعی از /api/payments/orders/:oid (که با callback
 * پر می‌شود) خوانده می‌شود و تا رسیدن callback چند بار poll می‌کنیم.
 */
import React, { useEffect, useState } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { L } from '../utils/i18n';
import { LegalShell, LEGAL_PALETTE } from './LegalShell';

interface OrderView { merchantOid: string; kind: string; status: string; amount: number; currency: string; failedCode?: string; failedMsg?: string; description?: string; }

export function PaymentResultPage({ outcome, oid, onBack, onGoTo }: { outcome: 'success' | 'fail'; oid: string; onBack: () => void; onGoTo: (tab: string) => void }) {
  const { language } = useLanguage();
  const [order, setOrder] = useState<OrderView | null>(null);
  const [tries, setTries] = useState(0);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!oid) return;
    let alive = true;
    let timer: number | undefined;
    const tick = async (n: number) => {
      try {
        const r = await fetch(`/api/payments/orders/${encodeURIComponent(oid)}`);
        if (r.status === 404 || r.status === 400) { if (alive) setNotFound(true); return; }
        const j: OrderView = await r.json();
        if (!alive || !j || typeof j.amount !== 'number') { if (alive) setNotFound(true); return; }
        setOrder(j); setTries(n);
        if (j.status === 'pending' && n < 20) timer = window.setTimeout(() => tick(n + 1), 2000);
      } catch { if (alive && n < 20) timer = window.setTimeout(() => tick(n + 1), 3000); }
    };
    tick(0);
    return () => { alive = false; if (timer) window.clearTimeout(timer); };
  }, [oid]);

  const status = order?.status || (outcome === 'fail' ? 'failed' : 'pending');
  const paid = status === 'success' || status === 'paid_unfulfilled';
  const failed = status === 'failed';
  const color = paid ? LEGAL_PALETTE.success : failed ? LEGAL_PALETTE.danger : LEGAL_PALETTE.warn;
  const kindTab: Record<string, string> = { reservation: 'reservations', cafe: 'cafe', shop: 'shop', tournament: 'tournaments' };

  const headline = paid
    ? L(language, { fa: 'پرداخت با موفقیت انجام شد', en: 'Payment successful', ru: 'Оплата прошла успешно', tr: 'Ödeme başarılı' })
    : failed
      ? L(language, { fa: 'پرداخت ناموفق بود', en: 'Payment failed', ru: 'Оплата не прошла', tr: 'Ödeme başarısız' })
      : L(language, { fa: 'در انتظار تأیید بانک…', en: 'Waiting for bank confirmation…', ru: 'Ожидаем подтверждение банка…', tr: 'Banka onayı bekleniyor…' });

  return (
    <LegalShell title={L(language, { fa: 'نتیجهٔ پرداخت', en: 'Payment result', ru: 'Результат оплаты', tr: 'Ödeme Sonucu' })} onBack={onBack} maxWidth={640}>
      <div className="bz-legal-card" style={{ padding: 26, textAlign: 'center' }} data-payment-result data-status={status}>
        <div style={{ width: 64, height: 64, borderRadius: '50%', margin: '0 auto 14px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: color, color: '#fff', fontSize: 30, fontWeight: 900 }}>
          {paid ? <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12l5 5L20 7" /></svg> : failed ? <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg> : '...'}
        </div>
        <h2 style={{ margin: '0 0 8px', fontSize: 20 }}>{headline}</h2>
        {order && (
          <div style={{ fontSize: 14, color: LEGAL_PALETTE.muted, display: 'grid', gap: 4 }}>
            {order.description && <span>{order.description}</span>}
            <span dir="ltr">{order.amount.toLocaleString()} {order.currency}</span>
            <span dir="ltr" style={{ fontSize: 12 }}>#{order.merchantOid}</span>
            {failed && (order.failedMsg || order.failedCode) && <span style={{ color: LEGAL_PALETTE.danger }}>{order.failedMsg || order.failedCode}</span>}
            {status === 'paid_unfulfilled' && <span style={{ color: LEGAL_PALETTE.warn }}>{L(language, { fa: 'پرداخت دریافت شد اما ثبت سفارش نیاز به بررسی دستی دارد؛ با پشتیبانی تماس بگیرید.', en: 'Payment received but the order needs manual review; please contact support.', ru: 'Оплата получена, заказ требует ручной проверки — свяжитесь с поддержкой.', tr: 'Ödeme alındı ancak sipariş manuel inceleme gerektiriyor; lütfen destekle iletişime geçin.' })}</span>}
          </div>
        )}
        {notFound && <p style={{ color: LEGAL_PALETTE.danger, fontSize: 13 }}>{L(language, { fa: 'سفارشی با این شناسه یافت نشد.', en: 'No order found with this id.', ru: 'Заказ с таким номером не найден.', tr: 'Bu numaraya ait sipariş bulunamadı.' })}</p>}
        {!order && !notFound && oid && <p style={{ color: LEGAL_PALETTE.muted, fontSize: 13 }}>…</p>}
        {status === 'pending' && tries >= 20 && (
          <p style={{ color: LEGAL_PALETTE.warn, fontSize: 13 }}>{L(language, { fa: 'هنوز تأییدیه از بانک نرسیده است. این صفحه را بعداً دوباره باز کنید یا با پشتیبانی تماس بگیرید.', en: 'Bank confirmation has not arrived yet. Re-open this page later or contact support.', ru: 'Подтверждение банка ещё не пришло. Откройте страницу позже или свяжитесь с поддержкой.', tr: 'Banka onayı henüz gelmedi. Bu sayfayı daha sonra tekrar açın veya destekle iletişime geçin.' })}</p>
        )}
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginTop: 18, flexWrap: 'wrap' }}>
          <button type="button" className="bz-legal-btn bz-legal-btn-primary" onClick={() => onGoTo(order ? kindTab[order.kind] || 'home' : 'home')}>
            {L(language, { fa: 'بازگشت به سایت', en: 'Back to site', ru: 'На сайт', tr: 'Siteye dön' })}
          </button>
          <a className="bz-legal-btn bz-legal-btn-ghost" href="/contact" onClick={(e) => { e.preventDefault(); onGoTo('/contact'); }}>
            {L(language, { fa: 'پشتیبانی', en: 'Support', ru: 'Поддержка', tr: 'Destek' })}
          </a>
        </div>
      </div>
    </LegalShell>
  );
}
