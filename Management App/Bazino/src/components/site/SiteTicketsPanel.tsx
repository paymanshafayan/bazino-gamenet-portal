/**
 * تب «تیکت‌های پشتیبانی» در WebSyncModal — همان بخش تیکت پنل ادمین وب:
 * لیست + فیلتر وضعیت، مشاهدهٔ گفتگو، پاسخ پشتیبانی، بستن/بازگشایی.
 * مسیرها: GET /api/sync/tickets ، GET/POST /api/sync/tickets/:id[/reply|/status]
 */
import React, { useCallback, useEffect, useState } from 'react';
import { LifeBuoy, RefreshCw, Send, Lock, Unlock, AlertCircle, CheckCircle2 } from 'lucide-react';
import { siteFetch, prettySiteError } from '../../utils/siteClient';

interface Props {
  webServerUrl: string;
  apiKey: string;
}

interface TicketRow {
  id: string; subject: string; username: string; category?: string; status: string;
  priority?: string; createdAt?: string; updatedAt?: string;
}
interface TicketMessage { id: string; author: string; isStaff: number; body: string; createdAt: string; }
interface TicketDetail { ticket: TicketRow; messages: TicketMessage[]; user: any; }

const STATUS_LABELS: Record<string, string> = {
  open: 'در حال بررسی',
  customer_reply: 'پاسخ مشتری',
  answered: 'پاسخ داده‌شده',
  closed: 'بسته شده',
};
const STATUS_COLORS: Record<string, string> = {
  open: '#f59e0b',
  customer_reply: '#38bdf8',
  answered: '#34d399',
  closed: '#a1a1aa',
};

export const SiteTicketsPanel: React.FC<Props> = ({ webServerUrl, apiKey }) => {
  const [filter, setFilter] = useState<'' | 'open' | 'customer_reply' | 'answered' | 'closed'>('');
  const [tickets, setTickets] = useState<TicketRow[]>([]);
  const [openCount, setOpenCount] = useState(0);
  const [selected, setSelected] = useState<TicketDetail | null>(null);
  const [reply, setReply] = useState('');
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const d = await siteFetch(webServerUrl, apiKey, `/api/sync/tickets${filter ? `?status=${filter}` : ''}`);
      setTickets(d.tickets || []);
      setOpenCount(d.openCount || 0);
    } catch (err) {
      setError(prettySiteError(err));
    } finally {
      setLoading(false);
    }
  }, [webServerUrl, apiKey, filter]);

  useEffect(() => { void load(); }, [load]);

  const open = async (id: string) => {
    setMsg(null);
    try {
      const d = await siteFetch<TicketDetail>(webServerUrl, apiKey, `/api/sync/tickets/${encodeURIComponent(id)}`);
      setSelected(d);
    } catch (err) {
      setMsg({ ok: false, text: prettySiteError(err) });
    }
  };

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selected || !reply.trim()) return;
    setBusy(true); setMsg(null);
    try {
      const d = await siteFetch<TicketDetail>(webServerUrl, apiKey, `/api/sync/tickets/${encodeURIComponent(selected.ticket.id)}/reply`, {
        method: 'POST', body: { message: reply },
      });
      setSelected({ ticket: d.ticket, messages: d.messages, user: selected.user });
      setReply('');
      setMsg({ ok: true, text: 'پاسخ ارسال شد و وضعیت تیکت «پاسخ داده‌شده» شد.' });
      void load();
    } catch (err) {
      setMsg({ ok: false, text: prettySiteError(err) });
    } finally {
      setBusy(false);
    }
  };

  const setStatus = async (status: 'open' | 'closed') => {
    if (!selected) return;
    setBusy(true); setMsg(null);
    try {
      const d = await siteFetch(webServerUrl, apiKey, `/api/sync/tickets/${encodeURIComponent(selected.ticket.id)}/status`, {
        method: 'POST', body: { status },
      });
      setSelected({ ...selected, ticket: d.ticket });
      setMsg({ ok: true, text: status === 'closed' ? 'تیکت بسته شد.' : 'تیکت بازگشایی شد.' });
      void load();
    } catch (err) {
      setMsg({ ok: false, text: prettySiteError(err) });
    } finally {
      setBusy(false);
    }
  };

  const filters: Array<[typeof filter, string]> = [
    ['', 'همه'],
    ['open', 'در حال بررسی'],
    ['customer_reply', 'پاسخ مشتری'],
    ['answered', 'پاسخ داده‌شده'],
    ['closed', 'بسته شده'],
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <LifeBuoy className="w-4 h-4 text-amber-400" />
          <h3 className="font-bold text-zinc-100">تیکت‌های پشتیبانی سایت</h3>
          {openCount > 0 && (
            <span className="px-2 py-0.5 bg-rose-500/15 border border-rose-500/30 rounded-full text-[10px] text-rose-300 font-bold">
              {openCount} در انتظار
            </span>
          )}
        </div>
        <button onClick={() => void load()} disabled={loading}
          className="flex items-center gap-1.5 px-2.5 py-1.5 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-zinc-300 disabled:opacity-50">
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          بروزرسانی
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-300">
          <AlertCircle className="w-4 h-4 shrink-0" /><span>{error}</span>
        </div>
      )}
      {msg && (
        <div className={`flex items-center gap-2 p-3 rounded-xl border ${msg.ok ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' : 'bg-red-500/10 border-red-500/30 text-red-300'}`}>
          {msg.ok ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
          <span>{msg.text}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* لیست تیکت‌ها */}
        <div className="lg:col-span-2 space-y-2">
          <div className="flex flex-wrap gap-1.5">
            {filters.map(([k, lbl]) => (
              <button key={k} onClick={() => setFilter(k)}
                className={`text-[10px] font-bold px-2.5 py-1 rounded-lg border ${
                  filter === k ? 'bg-amber-500 text-zinc-950 border-amber-500' : 'border-zinc-700 text-zinc-400 hover:text-zinc-200'
                }`}>
                {lbl}
              </button>
            ))}
          </div>
          <div className="max-h-[460px] overflow-y-auto divide-y divide-zinc-800 border border-zinc-800 rounded-xl bg-zinc-900">
            {tickets.length === 0 && !loading && (
              <div className="p-6 text-center text-xs text-zinc-500">تیکتی وجود ندارد.</div>
            )}
            {tickets.map((t) => (
              <button key={t.id} onClick={() => void open(t.id)}
                className={`w-full text-right p-3 hover:bg-zinc-800/50 transition ${selected?.ticket?.id === t.id ? 'bg-amber-500/10' : ''}`}>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold text-zinc-100 truncate">{t.subject}</span>
                  <span className="text-[9px] font-bold px-2 py-0.5 rounded-full shrink-0"
                    style={{ background: `${STATUS_COLORS[t.status] || '#666'}22`, color: STATUS_COLORS[t.status] || '#999' }}>
                    {STATUS_LABELS[t.status] || t.status}
                  </span>
                </div>
                <div className="text-[10px] text-zinc-500 mt-1 flex gap-2 flex-wrap" dir="ltr">
                  <span>@{t.username}</span>
                  {t.updatedAt && <span>· {new Date(t.updatedAt).toLocaleDateString('fa-IR')}</span>}
                  {t.priority === 'high' && <span className="text-rose-400 font-bold">! فوری</span>}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* گفتگوی انتخاب‌شده */}
        <div className="lg:col-span-3 border border-zinc-800 rounded-xl bg-zinc-900 p-4 min-h-[300px]">
          {!selected ? (
            <div className="h-full flex items-center justify-center text-xs text-zinc-500">یک تیکت را از فهرست انتخاب کنید.</div>
          ) : (
            <div className="flex flex-col gap-3">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="min-w-0">
                  <div className="text-sm font-bold text-zinc-100 truncate">{selected.ticket.subject}</div>
                  <div className="text-[10px] text-zinc-500" dir="ltr">
                    {selected.ticket.id} · @{selected.ticket.username}
                    {selected.user?.phone ? ` · ${selected.user.phone}` : ''}
                    {selected.user?.displayName ? ` · ${selected.user.displayName}` : ''}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[9px] font-bold px-2 py-0.5 rounded-full"
                    style={{ background: `${STATUS_COLORS[selected.ticket.status] || '#666'}22`, color: STATUS_COLORS[selected.ticket.status] || '#999' }}>
                    {STATUS_LABELS[selected.ticket.status] || selected.ticket.status}
                  </span>
                  {selected.ticket.status === 'closed' ? (
                    <button onClick={() => void setStatus('open')} disabled={busy}
                      className="text-[10px] font-bold flex items-center gap-1 px-2 py-1 rounded-lg border border-zinc-700 text-zinc-300 hover:text-zinc-100 disabled:opacity-50">
                      <Unlock className="w-3 h-3" /> بازگشایی
                    </button>
                  ) : (
                    <button onClick={() => void setStatus('closed')} disabled={busy}
                      className="text-[10px] font-bold flex items-center gap-1 px-2 py-1 rounded-lg border border-zinc-700 text-zinc-300 hover:text-zinc-100 disabled:opacity-50">
                      <Lock className="w-3 h-3" /> بستن
                    </button>
                  )}
                </div>
              </div>
              <div className="flex flex-col gap-2 max-h-[280px] overflow-y-auto pe-1">
                {selected.messages.map((m) => (
                  <div key={m.id}
                    className={`rounded-xl px-3 py-2 text-xs whitespace-pre-wrap max-w-[90%] ${
                      m.isStaff ? 'bg-emerald-500/10 border border-emerald-500/30 self-end' : 'bg-zinc-800 self-start'
                    }`}>
                    {m.body}
                    <div className="text-[10px] text-zinc-500 mt-1">
                      {m.isStaff ? `${m.author} (پشتیبانی)` : `@${m.author}`} · {new Date(m.createdAt).toLocaleString('fa-IR')}
                    </div>
                  </div>
                ))}
              </div>
              <form onSubmit={send} className="flex flex-col gap-2">
                <textarea value={reply} onChange={(e) => setReply(e.target.value)} rows={3} required maxLength={4000}
                  placeholder="پاسخ پشتیبانی…"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-xs text-zinc-100 focus:outline-none focus:border-amber-500/50" />
                <button type="submit" disabled={busy || !reply.trim()}
                  className="self-start bg-amber-500 hover:bg-amber-400 text-zinc-950 text-xs font-bold px-4 py-2 rounded-xl flex items-center gap-2 disabled:opacity-50">
                  <Send className="w-3.5 h-3.5" /> ارسال پاسخ
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
