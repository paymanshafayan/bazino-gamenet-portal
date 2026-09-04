/**
 * تسک ۱۳ — بخش «کیف پول و پرداخت حضوری» پنل ادمین (/admin/wallet):
 *   • سفارش‌های در انتظار پرداخت حضوری (تأیید نقدی/کارت/کیف پول یا لغو)
 *   • جست‌وجوی کیف پول کاربر + شارژ/اصلاح دستی
 *   • آخرین تراکنش‌های کیف پول
 */
import React, { useEffect, useState } from 'react';
import { Wallet, RefreshCw, CheckCircle2, XCircle, Search } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { L } from '../utils/i18n';
import { formatDue } from '../legal/CheckoutModal';
import { kindLabel, onsiteStatusLabel, onsiteStatusColor, walletTxLabel } from './profile/ProfileWallet';

interface Props { addNotification: (message: string, type: 'success' | 'error' | 'info') => void }

const post = async (url: string, body: any) => {
  const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(d.error || r.statusText);
  return d;
};

export default function AdminWalletSection({ addNotification }: Props) {
  const { language, dir } = useLanguage();
  const [status, setStatus] = useState<'pending_onsite' | 'settled' | 'all'>('pending_onsite');
  const [orders, setOrders] = useState<any[]>([]);
  const [tx, setTx] = useState<any[]>([]);
  const [q, setQ] = useState('');
  const [found, setFound] = useState<any | null>(null);
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState('');
  const [payConfig, setPayConfig] = useState<{ onlineDisabled?: boolean; enabled?: boolean } | null>(null);

  const load = () => {
    fetch(`/api/admin/onsite-orders${status === 'all' ? '' : `?status=${status}`}`).then(r => r.json()).then(d => setOrders(Array.isArray(d) ? d : [])).catch(() => {});
    fetch('/api/admin/wallet/transactions?limit=100').then(r => r.json()).then(d => setTx(Array.isArray(d) ? d : [])).catch(() => {});
  };
  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [status]);
  useEffect(() => { fetch('/api/payments/config').then(r => r.json()).then(setPayConfig).catch(() => {}); }, []);

  const act = async (id: string, action: 'settle' | 'cancel', method?: string) => {
    setBusy(id);
    try {
      await post(`/api/admin/onsite-orders/${encodeURIComponent(id)}/${action}`, method ? { method } : {});
      addNotification(action === 'settle'
        ? L(language, { fa: 'پرداخت حضوری تأیید شد.', en: 'On-site payment confirmed.', ru: 'Оплата на месте подтверждена.', tr: 'Mekânda ödeme onaylandı.' })
        : L(language, { fa: 'سفارش لغو شد.', en: 'Order cancelled.', ru: 'Заказ отменён.', tr: 'Sipariş iptal edildi.' }), 'success');
      load();
      if (found) lookup(found.username);
    } catch (e: any) { addNotification(e.message, 'error'); } finally { setBusy(''); }
  };

  const lookup = async (username?: string) => {
    const key = (username || q).trim(); if (!key) return;
    setFound(null);
    try {
      const r = await fetch(`/api/admin/wallet/${encodeURIComponent(key)}`); const d = await r.json();
      if (!r.ok) throw new Error(d.error || 'Not found');
      setFound(d);
    } catch (e: any) { addNotification(e.message, 'error'); }
  };

  const adjust = async () => {
    if (!found) return;
    const amt = Number(amount); if (!amt) return;
    setBusy('adjust');
    try {
      const d = await post('/api/admin/wallet/adjust', { username: found.username, amount: amt, note });
      addNotification(L(language, { fa: `انجام شد. موجودی جدید: ${Number(d.balance).toLocaleString()} TL`, en: `Done. New balance: ${Number(d.balance).toLocaleString()} TL`, ru: `Готово. Новый баланс: ${Number(d.balance).toLocaleString()} TL`, tr: `Tamam. Yeni bakiye: ${Number(d.balance).toLocaleString()} TL` }), 'success');
      setAmount(''); setNote(''); lookup(found.username); load();
    } catch (e: any) { addNotification(e.message, 'error'); } finally { setBusy(''); }
  };

  const th = 'text-[11px] text-gray-400 font-bold px-3 py-2 text-start';
  const td = 'text-xs px-3 py-2 border-t border-white/5';
  const pill = (s: string) => <span className="px-2 py-0.5 rounded-full text-[10px] font-bold" style={{ background: `${onsiteStatusColor(s)}22`, color: onsiteStatusColor(s) }}>{onsiteStatusLabel(s, language)}</span>;

  return (
    <div className="space-y-6 animate-fade-in" dir={dir} data-admin-wallet>
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-lg font-black text-white flex items-center gap-2"><Wallet className="w-5 h-5 text-primary" />{L(language, { fa: 'کیف پول و پرداخت حضوری', en: 'Wallet & on-site payments', ru: 'Кошелёк и оплата на месте', tr: 'Cüzdan ve mekânda ödeme' })}</h2>
        <div className="flex items-center gap-2 text-[11px]">
          <span className={`px-2 py-1 rounded-lg font-bold ${payConfig?.enabled ? 'bg-emerald-500/15 text-emerald-300' : 'bg-amber-500/15 text-amber-300'}`} data-online-status>
            {payConfig?.enabled
              ? L(language, { fa: 'درگاه آنلاین: فعال', en: 'Online gateway: enabled', ru: 'Онлайн-шлюз: включён', tr: 'Online geçit: açık' })
              : L(language, { fa: 'درگاه آنلاین: موقتاً غیرفعال', en: 'Online gateway: temporarily disabled', ru: 'Онлайн-шлюз: временно отключён', tr: 'Online geçit: geçici olarak kapalı' })}
          </span>
          <button onClick={load} className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300" title="Refresh"><RefreshCw className="w-4 h-4" /></button>
        </div>
      </div>

      <p className="text-[11.5px] text-gray-400 leading-relaxed">
        {L(language, { fa: 'قوانین اعلام‌شده به کاربر: رزرو ایستگاه باید تا ۱۰ دقیقه قبل از سانس و ثبت‌نام تورنمنت تا ۴۸ ساعت قبل از شروع، حضوری پرداخت شود؛ در غیر این صورت خودکار باطل می‌شود. بوفه و فروشگاه فقط پرداخت در محل دارند و امتیاز پس از تأیید پرداخت داده می‌شود.', en: 'Rules announced to users: station bookings must be paid on-site 10 minutes before the session and tournament registrations 48 hours before the start; otherwise they are cancelled automatically. Café and shop are on-site only; points are credited after settlement.', ru: 'Правила: бронь станции оплачивается на месте за 10 минут до сеанса, регистрация на турнир — за 48 часов до начала; иначе они автоматически аннулируются. Кафе и магазин — только на месте; баллы после оплаты.', tr: 'Kurallar: istasyon rezervasyonu seanstan 10 dakika, turnuva kaydı başlangıçtan 48 saat önce mekânda ödenmelidir; aksi hâlde otomatik iptal edilir. Kafe ve mağaza yalnızca mekânda ödenir; puanlar ödeme onayından sonra verilir.' })}
      </p>

      {/* سفارش‌های حضوری */}
      <section className="bg-black/30 border border-white/10 rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between flex-wrap gap-2 px-4 py-3 border-b border-white/10">
          <h3 className="text-sm font-black text-white">{L(language, { fa: 'سفارش‌های پرداخت حضوری', en: 'On-site orders', ru: 'Заказы с оплатой на месте', tr: 'Mekânda ödeme siparişleri' })} <span className="text-primary" data-onsite-count>({orders.length})</span></h3>
          <div className="flex gap-1">
            {(['pending_onsite', 'settled', 'all'] as const).map(s => (
              <button key={s} onClick={() => setStatus(s)} className={`px-3 py-1 rounded-lg text-[11px] font-bold ${status === s ? 'bg-primary text-black' : 'bg-white/5 text-gray-300'}`}>
                {s === 'all' ? L(language, { fa: 'همه', en: 'All', ru: 'Все', tr: 'Tümü' }) : onsiteStatusLabel(s, language)}
              </button>
            ))}
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead><tr>
              <th className={th}>{L(language, { fa: 'شناسه', en: 'ID', ru: 'ID', tr: 'No' })}</th><th className={th}>{L(language, { fa: 'کاربر', en: 'User', ru: 'Пользователь', tr: 'Kullanıcı' })}</th><th className={th}>{L(language, { fa: 'نوع', en: 'Kind', ru: 'Тип', tr: 'Tür' })}</th><th className={th}>{L(language, { fa: 'شرح', en: 'Description', ru: 'Описание', tr: 'Açıklama' })}</th><th className={th}>{L(language, { fa: 'مبلغ', en: 'Amount', ru: 'Сумма', tr: 'Tutar' })}</th><th className={th}>{L(language, { fa: 'مهلت', en: 'Due', ru: 'Срок', tr: 'Son' })}</th><th className={th}>{L(language, { fa: 'وضعیت', en: 'Status', ru: 'Статус', tr: 'Durum' })}</th><th className={th}></th>
            </tr></thead>
            <tbody>
              {orders.length === 0 && <tr><td className={`${td} text-gray-500 text-center`} colSpan={8}>{L(language, { fa: 'موردی نیست.', en: 'Nothing here.', ru: 'Пусто.', tr: 'Kayıt yok.' })}</td></tr>}
              {orders.map(o => (
                <tr key={o.id} data-onsite-row={o.id} className="text-gray-200">
                  <td className={td} dir="ltr">{o.id}</td>
                  <td className={td}>{o.username}{o.phone ? <div className="text-[10px] text-gray-500" dir="ltr">{o.phone}</div> : null}</td>
                  <td className={td}>{kindLabel(o.kind, language)}</td>
                  <td className={td}>{o.description}</td>
                  <td className={td} dir="ltr">{Number(o.amount).toLocaleString()} TL</td>
                  <td className={td} dir="ltr">{o.dueAt ? formatDue(o.dueAt, language) : '—'}</td>
                  <td className={td}>{pill(o.status)}</td>
                  <td className={td}>
                    {o.status === 'pending_onsite' && (
                      <div className="flex gap-1 flex-wrap">
                        {(['cash', 'pos', 'wallet'] as const).map(m => (
                          <button key={m} disabled={busy === o.id} onClick={() => act(o.id, 'settle', m)} data-settle={m} className="px-2 py-1 rounded-md bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25 text-[10px] font-bold flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" />{m === 'cash' ? L(language, { fa: 'نقدی', en: 'Cash', ru: 'Наличные', tr: 'Nakit' }) : m === 'pos' ? L(language, { fa: 'کارت', en: 'Card', ru: 'Карта', tr: 'Kart' }) : L(language, { fa: 'کیف پول', en: 'Wallet', ru: 'Кошелёк', tr: 'Cüzdan' })}
                          </button>
                        ))}
                        <button disabled={busy === o.id} onClick={() => act(o.id, 'cancel')} data-cancel className="px-2 py-1 rounded-md bg-rose-500/15 text-rose-300 hover:bg-rose-500/25 text-[10px] font-bold flex items-center gap-1"><XCircle className="w-3 h-3" />{L(language, { fa: 'لغو', en: 'Cancel', ru: 'Отмена', tr: 'İptal' })}</button>
                      </div>
                    )}
                    {o.status === 'settled' && <span className="text-[10px] text-gray-500" dir="ltr">{o.settledBy}</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* کیف پول کاربر */}
      <section className="bg-black/30 border border-white/10 rounded-2xl p-4 space-y-3">
        <h3 className="text-sm font-black text-white">{L(language, { fa: 'کیف پول کاربر', en: 'User wallet', ru: 'Кошелёк пользователя', tr: 'Kullanıcı cüzdanı' })}</h3>
        <form className="flex gap-2 flex-wrap" onSubmit={e => { e.preventDefault(); lookup(); }}>
          <input value={q} onChange={e => setQ(e.target.value)} data-wallet-search placeholder={L(language, { fa: 'نام کاربری', en: 'Username', ru: 'Имя пользователя', tr: 'Kullanıcı adı' })} className="flex-1 min-w-[200px] bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-xs text-white" />
          <button type="submit" className="px-3 py-2 rounded-lg bg-primary text-black text-xs font-bold flex items-center gap-1"><Search className="w-3.5 h-3.5" />{L(language, { fa: 'جست‌وجو', en: 'Search', ru: 'Поиск', tr: 'Ara' })}</button>
        </form>
        {found && (
          <div className="space-y-3" data-wallet-found>
            <div className="flex items-center justify-between flex-wrap gap-2 text-xs text-gray-200">
              <span>{found.username} {found.phone && <span className="text-gray-500" dir="ltr">({found.phone})</span>}</span>
              <span className="text-primary font-black text-base" dir="ltr" data-wallet-balance>{Number(found.balance).toLocaleString()} TL</span>
            </div>
            <div className="flex gap-2 flex-wrap items-center">
              <input value={amount} onChange={e => setAmount(e.target.value)} data-adjust-amount type="number" step="0.01" placeholder="+/- TL" className="w-32 bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-xs text-white" dir="ltr" />
              <input value={note} onChange={e => setNote(e.target.value)} placeholder={L(language, { fa: 'توضیح (نقدی/کارت/اصلاح)', en: 'Note (cash/card/adjustment)', ru: 'Примечание', tr: 'Not (nakit/kart/düzeltme)' })} className="flex-1 min-w-[180px] bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-xs text-white" />
              <button type="button" disabled={busy === 'adjust' || !Number(amount)} onClick={adjust} data-adjust-submit className="px-3 py-2 rounded-lg bg-emerald-500/20 text-emerald-300 text-xs font-bold disabled:opacity-50">{L(language, { fa: 'اعمال', en: 'Apply', ru: 'Применить', tr: 'Uygula' })}</button>
            </div>
            <p className="text-[10.5px] text-gray-500">{L(language, { fa: 'موجودی هرگز منفی نمی‌شود؛ کسر بیش از موجودی رد می‌شود. شارژ رسمی از اپ مدیریت (نقدی/POS) انجام می‌شود.', en: 'Balance never goes negative; over-deductions are rejected. Official top-ups happen from the Management App (cash/POS).', ru: 'Баланс не может быть отрицательным. Официальное пополнение — через приложение управления.', tr: 'Bakiye asla eksiye düşmez. Resmî yükleme Yönetim Uygulamasından (nakit/POS) yapılır.' })}</p>
            {found.transactions?.length > 0 && (
              <div className="overflow-x-auto"><table className="w-full"><thead><tr><th className={th}>{L(language, { fa: 'نوع', en: 'Type', ru: 'Тип', tr: 'Tür' })}</th><th className={th}>{L(language, { fa: 'مبلغ', en: 'Amount', ru: 'Сумма', tr: 'Tutar' })}</th><th className={th}>{L(language, { fa: 'موجودی', en: 'Balance', ru: 'Баланс', tr: 'Bakiye' })}</th><th className={th}>{L(language, { fa: 'اپراتور', en: 'Operator', ru: 'Оператор', tr: 'Operatör' })}</th><th className={th}>{L(language, { fa: 'تاریخ', en: 'Date', ru: 'Дата', tr: 'Tarih' })}</th></tr></thead>
                <tbody>{found.transactions.map((t: any) => <tr key={t.id} className="text-gray-200"><td className={td}>{walletTxLabel(t.type, language)}</td><td className={`${td} font-bold ${t.amount < 0 ? 'text-rose-300' : 'text-emerald-300'}`} dir="ltr">{t.amount > 0 ? '+' : ''}{Number(t.amount).toLocaleString()}</td><td className={td} dir="ltr">{Number(t.balanceAfter).toLocaleString()}</td><td className={td} dir="ltr">{t.operator}</td><td className={td} dir="ltr">{formatDue(t.createdAt, language)}</td></tr>)}</tbody></table></div>
            )}
          </div>
        )}
      </section>

      {/* آخرین تراکنش‌ها */}
      <section className="bg-black/30 border border-white/10 rounded-2xl overflow-hidden">
        <h3 className="text-sm font-black text-white px-4 py-3 border-b border-white/10">{L(language, { fa: 'آخرین تراکنش‌های کیف پول', en: 'Recent wallet transactions', ru: 'Последние операции', tr: 'Son cüzdan işlemleri' })}</h3>
        <div className="overflow-x-auto"><table className="w-full">
          <thead><tr><th className={th}>{L(language, { fa: 'کاربر', en: 'User', ru: 'Пользователь', tr: 'Kullanıcı' })}</th><th className={th}>{L(language, { fa: 'نوع', en: 'Type', ru: 'Тип', tr: 'Tür' })}</th><th className={th}>{L(language, { fa: 'مبلغ', en: 'Amount', ru: 'Сумма', tr: 'Tutar' })}</th><th className={th}>{L(language, { fa: 'موجودی', en: 'Balance', ru: 'Баланс', tr: 'Bakiye' })}</th><th className={th}>{L(language, { fa: 'مرجع', en: 'Ref', ru: 'Ссылка', tr: 'Ref' })}</th><th className={th}>{L(language, { fa: 'اپراتور', en: 'Operator', ru: 'Оператор', tr: 'Operatör' })}</th><th className={th}>{L(language, { fa: 'تاریخ', en: 'Date', ru: 'Дата', tr: 'Tarih' })}</th></tr></thead>
          <tbody>
            {tx.length === 0 && <tr><td className={`${td} text-gray-500 text-center`} colSpan={7}>{L(language, { fa: 'تراکنشی نیست.', en: 'No transactions.', ru: 'Операций нет.', tr: 'İşlem yok.' })}</td></tr>}
            {tx.map((t: any) => <tr key={t.id} className="text-gray-200"><td className={td}>{t.username}</td><td className={td}>{walletTxLabel(t.type, language)}</td><td className={`${td} font-bold ${t.amount < 0 ? 'text-rose-300' : 'text-emerald-300'}`} dir="ltr">{t.amount > 0 ? '+' : ''}{Number(t.amount).toLocaleString()}</td><td className={td} dir="ltr">{Number(t.balanceAfter).toLocaleString()}</td><td className={td} dir="ltr">{t.ref || '—'}</td><td className={td} dir="ltr">{t.operator}</td><td className={td} dir="ltr">{formatDue(t.createdAt, language)}</td></tr>)}
          </tbody>
        </table></div>
      </section>
    </div>
  );
}
