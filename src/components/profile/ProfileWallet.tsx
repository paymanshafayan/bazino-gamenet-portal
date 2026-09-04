/**
 * تسک ۱۳ — تب «کیف پول» پروفایل: موجودی، گردش، و سفارش‌های در انتظار پرداخت حضوری (با مهلت و دکمهٔ لغو).
 */
import React, { useEffect, useState } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { L } from '../../utils/i18n';
import { LEGAL_PALETTE } from '../../legal/LegalShell';
import { formatDue } from '../../legal/CheckoutModal';

export function walletTxLabel(type: string, language: string) {
  const map: Record<string, { fa: string; en: string; ru: string; tr: string }> = {
    topup: { fa: 'شارژ حضوری', en: 'Top-up', ru: 'Пополнение', tr: 'Yükleme' },
    purchase: { fa: 'پرداخت', en: 'Payment', ru: 'Оплата', tr: 'Ödeme' },
    refund: { fa: 'بازگشت وجه', en: 'Refund', ru: 'Возврат', tr: 'İade' },
    adjust: { fa: 'اصلاح', en: 'Adjustment', ru: 'Корректировка', tr: 'Düzeltme' },
  };
  return L(language, map[type] || { fa: type, en: type, ru: type, tr: type });
}

export function onsiteStatusLabel(status: string, language: string) {
  const map: Record<string, { fa: string; en: string; ru: string; tr: string }> = {
    pending_onsite: { fa: 'در انتظار پرداخت حضوری', en: 'Awaiting on-site payment', ru: 'Ожидает оплаты на месте', tr: 'Mekânda ödeme bekleniyor' },
    settled: { fa: 'پرداخت شده', en: 'Paid', ru: 'Оплачено', tr: 'Ödendi' },
    cancelled_unpaid: { fa: 'باطل شد (عدم پرداخت)', en: 'Cancelled (unpaid)', ru: 'Аннулировано (не оплачено)', tr: 'İptal (ödenmedi)' },
    cancelled_user: { fa: 'لغو توسط شما', en: 'Cancelled by you', ru: 'Отменено вами', tr: 'Sizin tarafınızdan iptal' },
    cancelled_admin: { fa: 'لغو توسط کلاب', en: 'Cancelled by club', ru: 'Отменено клубом', tr: 'Kulüp tarafından iptal' },
  };
  return L(language, map[status] || { fa: status, en: status, ru: status, tr: status });
}
export function onsiteStatusColor(status: string) {
  return status === 'settled' ? '#22c55e' : status === 'pending_onsite' ? '#f59e0b' : '#64748b';
}
export function kindLabel(kind: string, language: string) {
  const map: Record<string, { fa: string; en: string; ru: string; tr: string }> = {
    reservation: { fa: 'رزرو ایستگاه', en: 'Station booking', ru: 'Бронь станции', tr: 'İstasyon rezervasyonu' },
    tournament: { fa: 'ثبت‌نام تورنمنت', en: 'Tournament registration', ru: 'Регистрация на турнир', tr: 'Turnuva kaydı' },
    cafe: { fa: 'سفارش بوفه', en: 'Café order', ru: 'Заказ кафе', tr: 'Kafe siparişi' },
    shop: { fa: 'خرید فروشگاه', en: 'Shop order', ru: 'Заказ магазина', tr: 'Mağaza siparişi' },
  };
  return L(language, map[kind] || { fa: kind, en: kind, ru: kind, tr: kind });
}

interface Props { addNotification: (message: string, type: 'success' | 'error' | 'info') => void }

export default function ProfileWallet({ addNotification }: Props) {
  const { language } = useLanguage();
  const [wallet, setWallet] = useState<{ balance: number; transactions: any[] } | null>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [busy, setBusy] = useState('');

  const load = () => {
    fetch('/api/me/wallet').then(r => r.json()).then(d => setWallet({ balance: Number(d.balance) || 0, transactions: d.transactions || [] })).catch(() => setWallet({ balance: 0, transactions: [] }));
    fetch('/api/me/onsite-orders').then(r => r.json()).then(d => setOrders(Array.isArray(d) ? d : [])).catch(() => {});
  };
  useEffect(() => { load(); }, []);

  const cancel = async (id: string) => {
    setBusy(id);
    try {
      const r = await fetch(`/api/checkout/onsite/${encodeURIComponent(id)}/cancel`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || 'Error');
      addNotification(d.refunded > 0
        ? L(language, { fa: `لغو شد و ${Number(d.refunded).toLocaleString()} TL به کیف پول برگشت.`, en: `Cancelled; ${Number(d.refunded).toLocaleString()} TL refunded to your wallet.`, ru: `Отменено; ${Number(d.refunded).toLocaleString()} TL возвращено в кошелёк.`, tr: `İptal edildi; ${Number(d.refunded).toLocaleString()} TL cüzdanınıza iade edildi.` })
        : L(language, { fa: 'لغو شد.', en: 'Cancelled.', ru: 'Отменено.', tr: 'İptal edildi.' }), 'success');
      load();
    } catch (e: any) { addNotification(e.message, 'error'); } finally { setBusy(''); }
  };

  const cancellableWallet = (o: any) => o.status === 'settled' && String(o.settledBy || '') === 'wallet' && o.dueAt && Date.parse(o.dueAt) > Date.now();
  const pending = orders.filter(o => o.status === 'pending_onsite');
  const others = orders.filter(o => o.status !== 'pending_onsite');

  return (
    <div style={{ display: 'grid', gap: 16 }} data-profile-wallet>
      <div className="bz-legal-card" style={{ padding: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 17, fontWeight: 900 }}>{L(language, { fa: 'کیف پول بازینو', en: 'Bazino wallet', ru: 'Кошелёк Bazino', tr: 'Bazino cüzdanı' })}</h2>
            <p style={{ margin: '6px 0 0', fontSize: 12.5, color: LEGAL_PALETTE.muted }}>{L(language, { fa: 'شارژ کیف پول فقط به‌صورت حضوری در کلاب (نقدی یا کارت) انجام می‌شود؛ درگاه آنلاین موقتاً غیرفعال است.', en: 'Top-ups are done in person at the club (cash or card); online payment is temporarily unavailable.', ru: 'Пополнение — только лично в клубе (наличные или карта); онлайн-оплата временно недоступна.', tr: 'Yükleme yalnızca kulüpte yüz yüze (nakit veya kart) yapılır; online ödeme geçici olarak kapalıdır.' })}</p>
          </div>
          <div style={{ fontWeight: 900, fontSize: 26, color: LEGAL_PALETTE.accent }} dir="ltr" data-wallet-total>{wallet ? wallet.balance.toLocaleString() : '…'} <span style={{ fontSize: 13 }}>TL</span></div>
        </div>
      </div>

      <div className="bz-legal-card" style={{ padding: 20 }}>
        <h2 style={{ margin: '0 0 12px', fontSize: 17, fontWeight: 900 }}>{L(language, { fa: 'در انتظار پرداخت حضوری', en: 'Awaiting on-site payment', ru: 'Ожидают оплаты на месте', tr: 'Mekânda ödeme bekleyenler' })} {pending.length > 0 && <span data-pending-count style={{ background: LEGAL_PALETTE.danger, color: '#fff', borderRadius: 999, fontSize: 12, padding: '2px 8px', marginInlineStart: 6, verticalAlign: 'middle' }}>{pending.length}</span>}</h2>
        {pending.length === 0 ? <div className="bz-empty">{L(language, { fa: 'موردی در انتظار پرداخت نیست.', en: 'Nothing awaiting payment.', ru: 'Нет ожидающих оплат.', tr: 'Ödeme bekleyen yok.' })}</div> : (
          <div style={{ display: 'grid', gap: 10 }}>
            {pending.map(o => (
              <div key={o.id} data-onsite-order={o.id} style={{ border: `1px solid ${LEGAL_PALETTE.border}`, borderRadius: 12, padding: 12, display: 'grid', gap: 6 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap', fontWeight: 800 }}>
                  <span>{o.description || kindLabel(o.kind, language)}</span>
                  <span dir="ltr">{Number(o.amount).toLocaleString()} TL</span>
                </div>
                {o.dueAt ? (
                  <div style={{ fontSize: 12.5, color: '#fcd34d' }} data-due>
                    {L(language, { fa: 'مهلت پرداخت حضوری:', en: 'Pay at the venue by:', ru: 'Оплатить на месте до:', tr: 'Mekânda son ödeme:' })} <strong>{formatDue(o.dueAt, language)}</strong>
                    {' — '}{o.kind === 'reservation'
                      ? L(language, { fa: '۱۰ دقیقه قبل از شروع سانس؛ در غیر این صورت رزرو باطل می‌شود.', en: '10 minutes before the session; otherwise the booking is cancelled.', ru: 'за 10 минут до сеанса; иначе бронь аннулируется.', tr: 'seanstan 10 dakika önce; aksi hâlde rezervasyon iptal edilir.' })
                      : L(language, { fa: '۴۸ ساعت قبل از شروع تورنمنت؛ در غیر این صورت ثبت‌نام باطل می‌شود.', en: '48 hours before the tournament; otherwise the registration is cancelled.', ru: 'за 48 часов до турнира; иначе регистрация аннулируется.', tr: 'turnuvadan 48 saat önce; aksi hâlde kayıt iptal edilir.' })}
                  </div>
                ) : (
                  <div style={{ fontSize: 12.5, color: LEGAL_PALETTE.muted }}>{L(language, { fa: 'هنگام تحویل در محل تسویه می‌شود.', en: 'Paid at the venue on delivery.', ru: 'Оплачивается на месте при получении.', tr: 'Teslimatta mekânda ödenir.' })}</div>
                )}
                {(o.kind === 'reservation' || o.kind === 'tournament') && (
                  <div><button type="button" className="bz-legal-btn bz-legal-btn-ghost" data-cancel-onsite disabled={busy === o.id} onClick={() => cancel(o.id)} style={{ padding: '6px 12px', fontSize: 12 }}>{L(language, { fa: 'لغو', en: 'Cancel', ru: 'Отменить', tr: 'İptal et' })}</button></div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bz-legal-card" style={{ padding: 20 }}>
        <h2 style={{ margin: '0 0 12px', fontSize: 17, fontWeight: 900 }}>{L(language, { fa: 'گردش کیف پول', en: 'Wallet history', ru: 'История кошелька', tr: 'Cüzdan geçmişi' })}</h2>
        {!wallet ? <div className="bz-empty">…</div> : wallet.transactions.length === 0 ? <div className="bz-empty">{L(language, { fa: 'هنوز تراکنشی ندارید. برای شارژ به کلاب مراجعه کنید.', en: 'No transactions yet. Visit the club to top up.', ru: 'Операций пока нет. Пополните в клубе.', tr: 'Henüz işlem yok. Yükleme için kulübe uğrayın.' })}</div> : (
          <div style={{ overflowX: 'auto' }}>
            <table><thead><tr><th>{L(language, { fa: 'نوع', en: 'Type', ru: 'Тип', tr: 'Tür' })}</th><th>{L(language, { fa: 'شرح', en: 'Note', ru: 'Описание', tr: 'Açıklama' })}</th><th>{L(language, { fa: 'مبلغ', en: 'Amount', ru: 'Сумма', tr: 'Tutar' })}</th><th>{L(language, { fa: 'موجودی بعد', en: 'Balance after', ru: 'Остаток', tr: 'Sonraki bakiye' })}</th><th>{L(language, { fa: 'تاریخ', en: 'Date', ru: 'Дата', tr: 'Tarih' })}</th></tr></thead>
              <tbody>{wallet.transactions.map((t: any) => (
                <tr key={t.id}><td>{walletTxLabel(t.type, language)}</td><td>{t.note || t.ref || '—'}</td><td dir="ltr" style={{ color: t.amount < 0 ? LEGAL_PALETTE.danger : LEGAL_PALETTE.success, fontWeight: 800 }}>{t.amount > 0 ? '+' : ''}{Number(t.amount).toLocaleString()}</td><td dir="ltr">{Number(t.balanceAfter).toLocaleString()}</td><td dir="ltr" style={{ fontSize: 12 }}>{formatDue(t.createdAt, language)}</td></tr>
              ))}</tbody></table>
          </div>
        )}
      </div>

      {others.length > 0 && (
        <div className="bz-legal-card" style={{ padding: 20 }}>
          <h2 style={{ margin: '0 0 12px', fontSize: 17, fontWeight: 900 }}>{L(language, { fa: 'سوابق سفارش‌ها', en: 'Order history', ru: 'История заказов', tr: 'Sipariş geçmişi' })}</h2>
          <div style={{ overflowX: 'auto' }}>
            <table><thead><tr><th>{L(language, { fa: 'نوع', en: 'Kind', ru: 'Тип', tr: 'Tür' })}</th><th>{L(language, { fa: 'شرح', en: 'Description', ru: 'Описание', tr: 'Açıklama' })}</th><th>{L(language, { fa: 'مبلغ', en: 'Amount', ru: 'Сумма', tr: 'Tutar' })}</th><th>{L(language, { fa: 'وضعیت', en: 'Status', ru: 'Статус', tr: 'Durum' })}</th></tr></thead>
              <tbody>{others.map(o => (
                <tr key={o.id}><td>{kindLabel(o.kind, language)}</td><td>{o.description}</td><td dir="ltr">{Number(o.amount).toLocaleString()} TL</td><td><span className="bz-pill" style={{ background: `${onsiteStatusColor(o.status)}22`, color: onsiteStatusColor(o.status) }}>{onsiteStatusLabel(o.status, language)}</span>{cancellableWallet(o) && <button type="button" className="bz-legal-btn bz-legal-btn-ghost" data-cancel-wallet disabled={busy === o.id} onClick={() => cancel(o.id)} style={{ padding: '4px 10px', fontSize: 11, marginInlineStart: 8 }}>{L(language, { fa: 'لغو و بازگشت وجه', en: 'Cancel & refund', ru: 'Отменить и вернуть', tr: 'İptal ve iade' })}</button>}</td></tr>
              ))}</tbody></table>
          </div>
        </div>
      )}
    </div>
  );
}
