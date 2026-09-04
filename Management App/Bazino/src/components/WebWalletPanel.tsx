/**
 * تسک ۱۳ — پنل «کیف پول سایت / پرداخت‌های حضوری» در اپ مدیریت.
 *  • فهرست سفارش‌های سایت که منتظر پرداخت حضوری‌اند + دکمه‌های تأیید (نقدی / کارت / کیف پول) و لغو
 *  • وضعیت صف آفلاین شارژها و دکمهٔ «ارسال صف»
 */
import React, { useCallback, useEffect, useState } from 'react';
import { Globe, RefreshCw, CheckCircle2, XCircle, CloudUpload, AlertTriangle } from 'lucide-react';
import { CurrencyCode, WebSyncStatus } from '../types';
import { formatCurrency } from '../utils/formatters';
import { OnsiteOrder, WalletQueueItem, cancelOnsiteOrder, fetchPendingOnsiteOrders, flushWalletQueue, loadQueue, settleOnsiteOrder } from '../utils/walletSync';

interface Props {
  status: WebSyncStatus;
  currency: CurrencyCode;
  operatorName: string;
  onQueueChange?: (remaining: number) => void;
}

const KIND_FA: Record<string, string> = { reservation: 'رزرو ایستگاه', tournament: 'ثبت‌نام تورنمنت', cafe: 'سفارش بوفه', shop: 'خرید فروشگاه' };
const fmtDue = (iso?: string) => (iso ? new Date(iso).toLocaleString('fa-IR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—');

export const WebWalletPanel: React.FC<Props> = ({ status, currency, operatorName, onQueueChange }) => {
  const [orders, setOrders] = useState<OnsiteOrder[]>([]);
  const [queue, setQueue] = useState<WalletQueueItem[]>(() => loadQueue());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState('');
  const [msg, setMsg] = useState('');
  const cfg = { webServerUrl: status.webServerUrl, apiKey: status.apiKey };

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try { setOrders(await fetchPendingOnsiteOrders(cfg)); }
    catch (e: any) { setError(`ارتباط با سرور سایت برقرار نشد (${e?.message || 'network'}) — تنظیمات «همگام‌سازی وب» را بررسی کنید.`); }
    finally { setLoading(false); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status.webServerUrl, status.apiKey]);

  const flush = useCallback(async () => {
    setBusy('flush');
    try {
      const r = await flushWalletQueue(cfg);
      setQueue(r.remaining); onQueueChange?.(r.remaining.length);
      setMsg(r.sent > 0 ? `${r.sent} تراکنش به سایت ارسال شد${r.failed ? `؛ ${r.failed} مورد ناموفق ماند` : ''}.` : r.failed ? `${r.failed} تراکنش ارسال نشد؛ بعداً دوباره تلاش می‌شود.` : '');
    } finally { setBusy(''); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status.webServerUrl, status.apiKey]);

  useEffect(() => { load(); if (loadQueue().length) flush(); }, [load, flush]);
  // تلاش خودکار وقتی اینترنت برگشت
  useEffect(() => {
    const h = () => { if (loadQueue().length) flush(); };
    window.addEventListener('online', h);
    return () => window.removeEventListener('online', h);
  }, [flush]);

  const act = async (o: OnsiteOrder, action: 'cash' | 'pos' | 'wallet' | 'cancel') => {
    setBusy(o.id); setMsg('');
    try {
      if (action === 'cancel') await cancelOnsiteOrder(cfg, o.id, operatorName);
      else await settleOnsiteOrder(cfg, o.id, action, operatorName);
      setMsg(action === 'cancel' ? `سفارش ${o.id} لغو شد.` : `پرداخت ${o.id} تأیید شد (${action === 'cash' ? 'نقدی' : action === 'pos' ? 'کارت' : 'کیف پول'}).`);
      await load();
    } catch (e: any) { setError(e?.message || 'خطا'); }
    finally { setBusy(''); }
  };

  return (
    <div className="bg-slate-900/70 border border-slate-700 rounded-2xl p-4 space-y-4" data-web-wallet-panel dir="rtl">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h3 className="text-sm font-bold text-white flex items-center gap-2"><Globe className="w-4 h-4 text-cyan-400" />پرداخت‌های حضوریِ سایت و صف کیف پول</h3>
        <div className="flex items-center gap-2 text-[11px]">
          <button onClick={flush} disabled={busy === 'flush' || queue.length === 0} className="px-2.5 py-1.5 rounded-lg bg-emerald-500/15 text-emerald-300 disabled:opacity-40 flex items-center gap-1" data-flush-queue>
            <CloudUpload className="w-3.5 h-3.5" />ارسال صف ({queue.length})
          </button>
          <button onClick={load} disabled={loading} className="p-1.5 rounded-lg bg-slate-800 text-slate-300"><RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /></button>
        </div>
      </div>

      {queue.length > 0 && (
        <div className="text-[11px] text-amber-300 bg-amber-500/10 border border-amber-500/30 rounded-lg px-3 py-2 flex items-start gap-2" data-queue-warning>
          <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
          <span>{queue.length} تراکنش کیف پول هنوز به سرور سایت نرسیده (آفلاین). با وصل‌شدن اینترنت خودکار ارسال می‌شود؛ ارسال تکراری بی‌خطر است (کلید یکتا).
            {queue.some(q => q.lastError) && <span className="block text-amber-200/80 mt-1">آخرین خطا: {queue.find(q => q.lastError)?.lastError}</span>}</span>
        </div>
      )}
      {error && <div className="text-[11px] text-rose-300 bg-rose-500/10 border border-rose-500/30 rounded-lg px-3 py-2" data-panel-error>{error}</div>}
      {msg && <div className="text-[11px] text-emerald-300" data-panel-msg>{msg}</div>}

      <p className="text-[10.5px] text-slate-400 leading-relaxed">
        رزرو ایستگاه باید تا ۱۰ دقیقه قبل از سانس و ثبت‌نام تورنمنت تا ۴۸ ساعت قبل از شروع، حضوری پرداخت شود؛ در غیر این صورت سایت خودکار باطل می‌کند. بوفه/فروشگاه پس از تأیید پرداخت اینجا، در سایت نهایی می‌شود و امتیاز مشتری داده می‌شود.
      </p>

      <div className="overflow-x-auto">
        <table className="w-full text-[11px]">
          <thead className="text-slate-400"><tr><th className="text-right px-2 py-1">شناسه</th><th className="text-right px-2 py-1">مشتری</th><th className="text-right px-2 py-1">نوع</th><th className="text-right px-2 py-1">شرح</th><th className="text-right px-2 py-1">مبلغ</th><th className="text-right px-2 py-1">مهلت</th><th className="px-2 py-1"></th></tr></thead>
          <tbody>
            {orders.length === 0 && !loading && <tr><td colSpan={7} className="text-center text-slate-500 py-4">سفارشی در انتظار پرداخت حضوری نیست.</td></tr>}
            {orders.map(o => (
              <tr key={o.id} className="border-t border-slate-800 text-slate-200" data-onsite-row={o.id}>
                <td className="px-2 py-2 font-mono" dir="ltr">{o.id}</td>
                <td className="px-2 py-2">{o.username}{o.phone && <div className="text-slate-500" dir="ltr">{o.phone}</div>}</td>
                <td className="px-2 py-2">{KIND_FA[o.kind] || o.kind}</td>
                <td className="px-2 py-2">{o.description}</td>
                <td className="px-2 py-2 font-bold">{formatCurrency(o.amount, currency)}</td>
                <td className="px-2 py-2">{fmtDue(o.dueAt)}</td>
                <td className="px-2 py-2">
                  <div className="flex gap-1 flex-wrap">
                    {(['cash', 'pos', 'wallet'] as const).map(m => (
                      <button key={m} disabled={busy === o.id} onClick={() => act(o, m)} data-settle={m} className="px-2 py-1 rounded-md bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />{m === 'cash' ? 'نقدی' : m === 'pos' ? 'کارت' : 'کیف پول'}
                      </button>
                    ))}
                    <button disabled={busy === o.id} onClick={() => act(o, 'cancel')} data-cancel className="px-2 py-1 rounded-md bg-rose-500/15 text-rose-300 hover:bg-rose-500/25 flex items-center gap-1"><XCircle className="w-3 h-3" />لغو</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
