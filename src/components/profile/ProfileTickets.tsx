import React, { useEffect, useState } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { L } from '../../utils/i18n';
import { LEGAL_PALETTE } from '../../legal/LegalShell';
import { ticketStatusColor, ticketStatusLabel } from './ProfilePage';

interface Props {
  ticketId?: string;
  onNavigate: (path: string) => void;
  addNotification: (message: string, type: 'success' | 'error' | 'info') => void;
  onUnreadChange: (n: number) => void;
}

export const TICKET_CATEGORIES = ['general', 'reservation', 'payment', 'cafe', 'shop', 'tournament', 'account'] as const;
export const categoryLabel = (c: string, language: 'fa' | 'en' | 'ru' | 'tr') => L(language, ({
  general: { fa: 'عمومی', en: 'General', ru: 'Общее', tr: 'Genel' },
  reservation: { fa: 'رزرو', en: 'Reservation', ru: 'Бронирование', tr: 'Rezervasyon' },
  payment: { fa: 'پرداخت', en: 'Payment', ru: 'Оплата', tr: 'Ödeme' },
  cafe: { fa: 'کافه', en: 'Cafe', ru: 'Кафе', tr: 'Kafe' },
  shop: { fa: 'فروشگاه', en: 'Shop', ru: 'Магазин', tr: 'Mağaza' },
  tournament: { fa: 'تورنمنت', en: 'Tournament', ru: 'Турнир', tr: 'Turnuva' },
  account: { fa: 'حساب کاربری', en: 'Account', ru: 'Аккаунт', tr: 'Hesap' },
} as Record<string, { fa: string; en: string; ru: string; tr: string }>)[c] || { fa: c, en: c, ru: c, tr: c });

export const fmtDate = (s: string, language: string) => { try { return new Date(s).toLocaleString(language === 'fa' ? 'fa-IR' : language === 'ru' ? 'ru-RU' : language === 'tr' ? 'tr-TR' : 'en-GB', { dateStyle: 'medium', timeStyle: 'short' }); } catch { return s; } };

export function ProfileTickets({ ticketId, onNavigate, addNotification, onUnreadChange }: Props) {
  const { language } = useLanguage();
  if (ticketId === 'new') return <NewTicket onNavigate={onNavigate} addNotification={addNotification} />;
  if (ticketId) return <TicketThread id={ticketId} onNavigate={onNavigate} addNotification={addNotification} onUnreadChange={onUnreadChange} />;
  return <TicketList onNavigate={onNavigate} language={language} />;
}

function TicketList({ onNavigate, language }: { onNavigate: (p: string) => void; language: 'fa' | 'en' | 'ru' | 'tr' }) {
  const [tickets, setTickets] = useState<any[] | null>(null);
  useEffect(() => { fetch('/api/me/tickets').then(r => r.json()).then(d => setTickets(d.tickets || [])).catch(() => setTickets([])); }, []);
  return (
    <div className="bz-legal-card" style={{ padding: 20 }} data-ticket-list>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, gap: 10, flexWrap: 'wrap' }}>
        <h2 style={{ margin: 0, fontSize: 17, fontWeight: 900 }}>{L(language, { fa: 'تیکت‌های پشتیبانی', en: 'Support tickets', ru: 'Обращения в поддержку', tr: 'Destek talepleri' })}</h2>
        <a href="/profile/tickets/new" className="bz-legal-btn bz-legal-btn-primary" style={{ fontSize: 13 }} onClick={e => { e.preventDefault(); onNavigate('/profile/tickets/new'); }} data-ticket-new>+ {L(language, { fa: 'تیکت جدید', en: 'New ticket', ru: 'Новое обращение', tr: 'Yeni talep' })}</a>
      </div>
      {tickets === null ? <div className="bz-empty">…</div> : tickets.length === 0 ? <div className="bz-empty">{L(language, { fa: 'هنوز تیکتی ثبت نکرده‌اید. مشکلی دارید؟ همین حالا بپرسید.', en: 'No tickets yet. Need help? Ask us now.', ru: 'Обращений пока нет. Нужна помощь? Напишите нам.', tr: 'Henüz talep yok. Yardım mı lazım? Hemen sorun.' })}</div> : (
        <table><thead><tr><th>#</th><th>{L(language, { fa: 'موضوع', en: 'Subject', ru: 'Тема', tr: 'Konu' })}</th><th>{L(language, { fa: 'دسته', en: 'Category', ru: 'Категория', tr: 'Kategori' })}</th><th>{L(language, { fa: 'وضعیت', en: 'Status', ru: 'Статус', tr: 'Durum' })}</th><th>{L(language, { fa: 'آخرین به‌روزرسانی', en: 'Updated', ru: 'Обновлено', tr: 'Güncellendi' })}</th></tr></thead>
          <tbody>{tickets.map(t => (
            <tr key={t.id} data-ticket-row={t.id} style={{ cursor: 'pointer' }} onClick={() => onNavigate(`/profile/tickets/${t.id}`)}>
              <td dir="ltr" style={{ fontSize: 12 }}>{t.id}</td>
              <td style={{ fontWeight: 700 }}>{t.hasNewReply && <span className="bz-pill" style={{ background: LEGAL_PALETTE.danger, color: '#fff', marginInlineEnd: 6 }} data-new-reply>{L(language, { fa: 'پاسخ جدید', en: 'New reply', ru: 'Новый ответ', tr: 'Yeni yanıt' })}</span>}{t.subject}</td>
              <td>{categoryLabel(t.category, language)}</td>
              <td><span className="bz-pill" style={{ background: `${ticketStatusColor(t.status)}22`, color: ticketStatusColor(t.status) }}>{ticketStatusLabel(t.status, language)}</span></td>
              <td style={{ fontSize: 12 }}>{fmtDate(t.updatedAt, language)}</td>
            </tr>
          ))}</tbody></table>
      )}
    </div>
  );
}

function NewTicket({ onNavigate, addNotification }: { onNavigate: (p: string) => void; addNotification: Props['addNotification'] }) {
  const { language } = useLanguage();
  const [subject, setSubject] = useState('');
  const [category, setCategory] = useState('general');
  const [priority, setPriority] = useState('normal');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true); setErr('');
    try {
      const r = await fetch('/api/me/tickets', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ subject, category, priority, message }) });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || 'Error');
      addNotification(L(language, { fa: 'تیکت ثبت شد؛ به‌زودی پاسخ می‌دهیم.', en: 'Ticket created; we will reply soon.', ru: 'Обращение создано; скоро ответим.', tr: 'Talep oluşturuldu; en kısa sürede yanıtlayacağız.' }), 'success');
      onNavigate(`/profile/tickets/${d.ticket.id}`);
    } catch (e: any) { setErr(e.message); } finally { setBusy(false); }
  };
  return (
    <div className="bz-legal-card" style={{ padding: 20 }} data-ticket-new-form>
      <h2 style={{ margin: '0 0 14px', fontSize: 17, fontWeight: 900 }}>{L(language, { fa: 'ثبت تیکت جدید', en: 'New support ticket', ru: 'Новое обращение', tr: 'Yeni destek talebi' })}</h2>
      {err && <div className="bz-alert bz-alert-err">{err}</div>}
      <form onSubmit={submit}>
        <div className="bz-field"><label htmlFor="tk-subject">{L(language, { fa: 'موضوع', en: 'Subject', ru: 'Тема', tr: 'Konu' })}</label><input id="tk-subject" value={subject} onChange={e => setSubject(e.target.value)} required maxLength={150} /></div>
        <div className="bz-grid2">
          <div className="bz-field"><label htmlFor="tk-category">{L(language, { fa: 'دسته', en: 'Category', ru: 'Категория', tr: 'Kategori' })}</label>
            <select id="tk-category" value={category} onChange={e => setCategory(e.target.value)}>{TICKET_CATEGORIES.map(c => <option key={c} value={c}>{categoryLabel(c, language)}</option>)}</select></div>
          <div className="bz-field"><label htmlFor="tk-priority">{L(language, { fa: 'اولویت', en: 'Priority', ru: 'Приоритет', tr: 'Öncelik' })}</label>
            <select id="tk-priority" value={priority} onChange={e => setPriority(e.target.value)}>
              <option value="low">{L(language, { fa: 'کم', en: 'Low', ru: 'Низкий', tr: 'Düşük' })}</option>
              <option value="normal">{L(language, { fa: 'عادی', en: 'Normal', ru: 'Обычный', tr: 'Normal' })}</option>
              <option value="high">{L(language, { fa: 'فوری', en: 'High', ru: 'Высокий', tr: 'Yüksek' })}</option>
            </select></div>
        </div>
        <div className="bz-field"><label htmlFor="tk-message">{L(language, { fa: 'شرح مشکل', en: 'Describe the issue', ru: 'Опишите проблему', tr: 'Sorunu açıklayın' })}</label><textarea id="tk-message" rows={6} value={message} onChange={e => setMessage(e.target.value)} required maxLength={4000} /></div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button type="submit" className="bz-legal-btn bz-legal-btn-primary" disabled={busy} data-ticket-submit>{busy ? '…' : L(language, { fa: 'ارسال تیکت', en: 'Submit ticket', ru: 'Отправить', tr: 'Talebi gönder' })}</button>
          <button type="button" className="bz-legal-btn bz-legal-btn-ghost" onClick={() => onNavigate('/profile/tickets')}>{L(language, { fa: 'انصراف', en: 'Cancel', ru: 'Отмена', tr: 'İptal' })}</button>
        </div>
      </form>
    </div>
  );
}

function TicketThread({ id, onNavigate, addNotification, onUnreadChange }: { id: string; onNavigate: (p: string) => void; addNotification: Props['addNotification']; onUnreadChange: (n: number) => void }) {
  const { language } = useLanguage();
  const [data, setData] = useState<{ ticket: any; messages: any[] } | null>(null);
  const [err, setErr] = useState('');
  const [reply, setReply] = useState('');
  const [busy, setBusy] = useState(false);
  const load = () => fetch(`/api/me/tickets/${encodeURIComponent(id)}`).then(async r => { const d = await r.json(); if (!r.ok) throw new Error(d.error || 'Error'); setData(d); })
    .then(() => fetch('/api/me/tickets').then(r => r.json()).then(d => onUnreadChange(d.unread || 0)).catch(() => {}))
    .catch(e => setErr(e.message));
  useEffect(() => { load(); }, [id]);

  const send = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true);
    try {
      const r = await fetch(`/api/me/tickets/${encodeURIComponent(id)}/reply`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message: reply }) });
      const d = await r.json(); if (!r.ok) throw new Error(d.error || 'Error');
      setData({ ticket: d.ticket, messages: d.messages }); setReply('');
    } catch (e: any) { addNotification(e.message, 'error'); } finally { setBusy(false); }
  };
  const close = async () => {
    const r = await fetch(`/api/me/tickets/${encodeURIComponent(id)}/close`, { method: 'POST' });
    const d = await r.json(); if (r.ok) setData(prev => prev ? { ...prev, ticket: d.ticket } : prev);
  };

  if (err) return <div className="bz-legal-card" style={{ padding: 20 }}><div className="bz-alert bz-alert-err">{err}</div><button className="bz-legal-btn bz-legal-btn-ghost" onClick={() => onNavigate('/profile/tickets')}>←</button></div>;
  if (!data) return <div className="bz-legal-card bz-empty">…</div>;
  const { ticket, messages } = data;
  return (
    <div className="bz-legal-card" style={{ padding: 20 }} data-ticket-thread={ticket.id}>
      <button type="button" className="bz-legal-btn bz-legal-btn-ghost" style={{ padding: '4px 10px', fontSize: 12, marginBottom: 12 }} onClick={() => onNavigate('/profile/tickets')}>{L(language, { fa: '→ همهٔ تیکت‌ها', en: '← All tickets', ru: '← Все обращения', tr: '← Tüm talepler' })}</button>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        <h2 style={{ margin: 0, fontSize: 17, fontWeight: 900 }}>{ticket.subject}</h2>
        <span className="bz-pill" style={{ background: `${ticketStatusColor(ticket.status)}22`, color: ticketStatusColor(ticket.status) }} data-ticket-status={ticket.status}>{ticketStatusLabel(ticket.status, language)}</span>
      </div>
      <p style={{ color: LEGAL_PALETTE.muted, fontSize: 12, margin: '4px 0 16px' }} dir="ltr">{ticket.id} · {categoryLabel(ticket.category, language)} · {fmtDate(ticket.createdAt, language)}</p>
      <div style={{ display: 'flex', flexDirection: 'column', marginBottom: 16 }}>
        {messages.map(m => (
          <div key={m.id} className={`bz-msg ${m.isStaff ? 'bz-msg-staff' : 'bz-msg-user'}`} data-ticket-msg={m.isStaff ? 'staff' : 'user'}>
            {m.body}
            <small>{m.isStaff ? L(language, { fa: 'پشتیبانی بازینو', en: 'Bazino support', ru: 'Поддержка Bazino', tr: 'Bazino destek' }) : L(language, { fa: 'شما', en: 'You', ru: 'Вы', tr: 'Siz' })} · {fmtDate(m.createdAt, language)}</small>
          </div>
        ))}
      </div>
      {ticket.status === 'closed' ? (
        <div className="bz-alert" style={{ background: '#1a2333', color: LEGAL_PALETTE.muted }}>{L(language, { fa: 'این تیکت بسته شده است. برای موضوع جدید، تیکت جدیدی ثبت کنید.', en: 'This ticket is closed. Open a new ticket for a new issue.', ru: 'Обращение закрыто. Для нового вопроса создайте новое обращение.', tr: 'Bu talep kapatıldı. Yeni bir konu için yeni talep açın.' })}</div>
      ) : (
        <form onSubmit={send} data-ticket-reply-form>
          <div className="bz-field"><label htmlFor="tk-reply">{L(language, { fa: 'پاسخ شما', en: 'Your reply', ru: 'Ваш ответ', tr: 'Yanıtınız' })}</label><textarea id="tk-reply" rows={4} value={reply} onChange={e => setReply(e.target.value)} required maxLength={4000} /></div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'space-between', flexWrap: 'wrap' }}>
            <button type="submit" className="bz-legal-btn bz-legal-btn-primary" disabled={busy || !reply.trim()}>{L(language, { fa: 'ارسال پاسخ', en: 'Send reply', ru: 'Отправить', tr: 'Yanıt gönder' })}</button>
            <button type="button" className="bz-legal-btn bz-legal-btn-ghost" onClick={close} style={{ color: LEGAL_PALETTE.danger }} data-ticket-close>{L(language, { fa: 'بستن تیکت', en: 'Close ticket', ru: 'Закрыть обращение', tr: 'Talebi kapat' })}</button>
          </div>
        </form>
      )}
    </div>
  );
}
