import React, { useEffect, useState } from 'react';
import { LifeBuoy, RefreshCw, Send, Lock, Unlock } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { L } from '../utils/i18n';
import { ticketStatusLabel, ticketStatusColor } from './profile/ProfilePage';
import { categoryLabel, fmtDate } from './profile/ProfileTickets';

interface Props { addNotification: (message: string, type: 'success' | 'error' | 'info') => void }

/** بخش «تیکت‌های پشتیبانی» پنل ادمین — /admin/tickets */
export default function AdminTicketsSection({ addNotification }: Props) {
  const { language } = useLanguage();
  const [filter, setFilter] = useState<'' | 'open' | 'customer_reply' | 'answered' | 'closed'>('');
  const [tickets, setTickets] = useState<any[]>([]);
  const [openCount, setOpenCount] = useState(0);
  const [selected, setSelected] = useState<{ ticket: any; messages: any[]; user: any } | null>(null);
  const [reply, setReply] = useState('');
  const [busy, setBusy] = useState(false);

  const load = () => fetch(`/api/admin/tickets${filter ? `?status=${filter}` : ''}`).then(r => r.json()).then(d => { setTickets(d.tickets || []); setOpenCount(d.openCount || 0); }).catch(() => {});
  useEffect(() => { load(); }, [filter]);
  const open = (id: string) => fetch(`/api/admin/tickets/${encodeURIComponent(id)}`).then(r => r.json()).then(d => d.success && setSelected(d)).catch(() => {});

  const send = async (e: React.FormEvent) => {
    e.preventDefault(); if (!selected) return; setBusy(true);
    try {
      const r = await fetch(`/api/admin/tickets/${encodeURIComponent(selected.ticket.id)}/reply`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message: reply }) });
      const d = await r.json(); if (!r.ok) throw new Error(d.error || 'Error');
      setSelected({ ...selected, ticket: d.ticket, messages: d.messages }); setReply(''); load();
      addNotification(L(language, { fa: 'پاسخ ارسال شد.', en: 'Reply sent.', ru: 'Ответ отправлен.', tr: 'Yanıt gönderildi.' }), 'success');
    } catch (e: any) { addNotification(e.message, 'error'); } finally { setBusy(false); }
  };
  const setStatus = async (status: string) => {
    if (!selected) return;
    const r = await fetch(`/api/admin/tickets/${encodeURIComponent(selected.ticket.id)}/status`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) });
    const d = await r.json(); if (r.ok) { setSelected({ ...selected, ticket: d.ticket }); load(); }
  };

  const filters: Array<[typeof filter, { fa: string; en: string; ru: string; tr: string }]> = [
    ['', { fa: 'همه', en: 'All', ru: 'Все', tr: 'Tümü' }],
    ['open', { fa: 'باز', en: 'Open', ru: 'Открытые', tr: 'Açık' }],
    ['customer_reply', { fa: 'پاسخ مشتری', en: 'Customer replied', ru: 'Ответ клиента', tr: 'Müşteri yanıtladı' }],
    ['answered', { fa: 'پاسخ داده‌شده', en: 'Answered', ru: 'Отвечены', tr: 'Yanıtlandı' }],
    ['closed', { fa: 'بسته', en: 'Closed', ru: 'Закрытые', tr: 'Kapalı' }],
  ];

  return (
    <div className="flex flex-col gap-6 animate-fade-in" data-admin-tickets>
      <div className="bg-dark-card border border-white/10 rounded-2xl p-6">
        <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
          <h3 className="text-sm font-bold text-white flex items-center gap-2 font-display uppercase tracking-wider">
            <LifeBuoy className="w-4 h-4 text-primary" />
            <span>{L(language, { fa: 'تیکت‌های پشتیبانی', en: 'Support tickets', ru: 'Обращения в поддержку', tr: 'Destek talepleri' })}</span>
            <span className="text-[10px] bg-rose-500/20 text-rose-300 px-2 py-0.5 rounded-full" data-open-count>{openCount} {L(language, { fa: 'در انتظار', en: 'pending', ru: 'ожидают', tr: 'bekliyor' })}</span>
          </h3>
          <div className="flex items-center gap-2 flex-wrap">
            {filters.map(([k, lbl]) => (
              <button key={k} type="button" onClick={() => setFilter(k)} className={`text-[11px] font-bold px-3 py-1.5 rounded-lg border ${filter === k ? 'bg-primary text-black border-primary' : 'border-white/10 text-gray-400 hover:text-white'}`}>{L(language, lbl)}</button>
            ))}
            <button type="button" onClick={load} className="p-1.5 rounded-lg border border-white/10 text-gray-400 hover:text-white" aria-label="refresh"><RefreshCw className="w-3.5 h-3.5" /></button>
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
          <div className="lg:col-span-2 max-h-[560px] overflow-y-auto divide-y divide-white/5 border border-white/5 rounded-xl">
            {tickets.length === 0 && <div className="p-6 text-center text-xs text-gray-500">{L(language, { fa: 'تیکتی وجود ندارد.', en: 'No tickets.', ru: 'Обращений нет.', tr: 'Talep yok.' })}</div>}
            {tickets.map(t => (
              <button key={t.id} type="button" onClick={() => open(t.id)} data-admin-ticket-row={t.id}
                className={`w-full text-start p-3 hover:bg-white/5 transition ${selected?.ticket?.id === t.id ? 'bg-primary/10' : ''}`}>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold text-white truncate">{t.subject}</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0" style={{ background: `${ticketStatusColor(t.status)}22`, color: ticketStatusColor(t.status) }}>{ticketStatusLabel(t.status, language)}</span>
                </div>
                <div className="text-[10px] text-gray-500 mt-1 flex gap-2 flex-wrap" dir="ltr">
                  <span>@{t.username}</span><span>·</span><span>{categoryLabel(t.category, language)}</span><span>·</span><span>{fmtDate(t.updatedAt, language)}</span>
                  {t.priority === 'high' && <span className="text-rose-400 font-bold">! {L(language, { fa: 'فوری', en: 'high', ru: 'срочно', tr: 'acil' })}</span>}
                </div>
              </button>
            ))}
          </div>
          <div className="lg:col-span-3 border border-white/5 rounded-xl p-4 min-h-[300px]">
            {!selected ? <div className="h-full flex items-center justify-center text-xs text-gray-500">{L(language, { fa: 'یک تیکت را انتخاب کنید.', en: 'Select a ticket.', ru: 'Выберите обращение.', tr: 'Bir talep seçin.' })}</div> : (
              <div className="flex flex-col gap-3" data-admin-ticket-thread={selected.ticket.id}>
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div>
                    <div className="text-sm font-bold text-white">{selected.ticket.subject}</div>
                    <div className="text-[10px] text-gray-500" dir="ltr">{selected.ticket.id} · @{selected.ticket.username}{selected.user?.phone ? ` · ${selected.user.phone}` : ''}{selected.user?.displayName ? ` · ${selected.user.displayName}` : ''}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: `${ticketStatusColor(selected.ticket.status)}22`, color: ticketStatusColor(selected.ticket.status) }}>{ticketStatusLabel(selected.ticket.status, language)}</span>
                    {selected.ticket.status === 'closed'
                      ? <button type="button" onClick={() => setStatus('open')} className="text-[10px] font-bold flex items-center gap-1 px-2 py-1 rounded-lg border border-white/10 text-gray-300 hover:text-white"><Unlock className="w-3 h-3" />{L(language, { fa: 'بازگشایی', en: 'Reopen', ru: 'Открыть снова', tr: 'Yeniden aç' })}</button>
                      : <button type="button" onClick={() => setStatus('closed')} className="text-[10px] font-bold flex items-center gap-1 px-2 py-1 rounded-lg border border-white/10 text-gray-300 hover:text-white" data-admin-ticket-close><Lock className="w-3 h-3" />{L(language, { fa: 'بستن', en: 'Close', ru: 'Закрыть', tr: 'Kapat' })}</button>}
                  </div>
                </div>
                <div className="flex flex-col gap-2 max-h-[340px] overflow-y-auto pe-1">
                  {selected.messages.map(m => (
                    <div key={m.id} className={`rounded-xl px-3 py-2 text-xs whitespace-pre-wrap max-w-[90%] ${m.isStaff ? 'bg-emerald-500/10 border border-emerald-500/30 self-end' : 'bg-white/5 self-start'}`}>
                      {m.body}
                      <div className="text-[10px] text-gray-500 mt-1">{m.isStaff ? `${m.author} (${L(language, { fa: 'پشتیبانی', en: 'staff', ru: 'поддержка', tr: 'destek' })})` : `@${m.author}`} · {fmtDate(m.createdAt, language)}</div>
                    </div>
                  ))}
                </div>
                <form onSubmit={send} className="flex flex-col gap-2" data-admin-reply-form>
                  <textarea value={reply} onChange={e => setReply(e.target.value)} rows={3} required maxLength={4000} placeholder={L(language, { fa: 'پاسخ پشتیبانی…', en: 'Support reply…', ru: 'Ответ поддержки…', tr: 'Destek yanıtı…' })}
                    className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-primary" />
                  <button type="submit" disabled={busy || !reply.trim()} className="self-start bg-primary text-black text-xs font-bold px-4 py-2 rounded-xl flex items-center gap-2 disabled:opacity-50"><Send className="w-3.5 h-3.5" />{L(language, { fa: 'ارسال پاسخ', en: 'Send reply', ru: 'Отправить', tr: 'Yanıt gönder' })}</button>
                </form>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
