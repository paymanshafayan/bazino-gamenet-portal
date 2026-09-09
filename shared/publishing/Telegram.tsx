import React, { useState, useEffect, useCallback } from 'react';
import { Send, ShieldCheck, RefreshCw, Plus, Power, CheckCircle2, XCircle, PauseCircle, Pencil } from 'lucide-react';
import { useCopy, Field, Toggle, PubModal, StateBadge, ErrorNotice } from './ui';
import './studio.css';

/** Telegram campaign tab — admin only. Campaigns, pending queue, manager composer, log, report. */
export function TelegramTab() {
  const { api, tr, c, staff, language } = useCopy();
  const admin = !!staff?.admin;
  const [health, setHealth] = useState<any>(null);
  const [killed, setKilled] = useState(false);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [queue, setQueue] = useState<any[]>([]);
  const [log, setLog] = useState<any[]>([]);
  const [dialogs, setDialogs] = useState<any[]>([]);
  const [report, setReport] = useState<any>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [modal, setModal] = useState<any>(null);
  const [composer, setComposer] = useState({ dialogId: '', message: '', armed: false });

  const reload = useCallback(async () => {
    try {
      const [h, k, cs, q, l, ds, r] = await Promise.all([
        api('/telegram/health'), api('/telegram/admin/kill-switch'), api('/telegram/campaigns'),
        api('/telegram/campaign/drafts?status=pending_approval,deferred,approved_queued&limit=50'),
        api('/telegram/campaign/drafts?limit=20'), api('/telegram/dialogs?sendable_only=true'),
        api('/telegram/reports/affiliate/daily'),
      ]);
      setHealth(h); setKilled(!!k.stopped); setCampaigns(cs.items || []);
      setQueue(q.items || []); setLog(l.items || []); setDialogs(ds.items || []); setReport(r);
    } catch (e: any) { setError(e.code || e.message); }
  }, [api]);
  useEffect(() => { void reload(); }, [reload]);

  async function act(fn: () => Promise<any>, close = true) {
    setBusy(true); setError(''); setSaved(false);
    try { await fn(); if (close) setModal(null); await reload(); setSaved(true); return true; }
    catch (e: any) { setError(e.code || e.message || 'OPERATION_FAILED'); return false; }
    finally { setBusy(false); }
  }
  if (!admin) return <p className="pub-note">{tr(['فقط مدیر اصلی.', 'Main admin only.', 'Yalnızca yönetici.', 'Только администратор.'])}</p>;
  const count = (n: number) => new Intl.NumberFormat(language === 'fa' ? 'fa-IR' : language).format(n || 0);

  return <div data-tg="root">
    <div className="pub-actions"><button className="pub-secondary" onClick={() => reload()}><RefreshCw size={15} /><span>{c('refresh')}</span></button></div>
    <ErrorNotice error={error} />
    {saved && !modal && <p role="status" className="pub-success">{tr(['تغییرات در سرور ذخیره شد.', 'Changes saved on the server.', 'Değişiklikler sunucuya kaydedildi.', 'Изменения сохранены на сервере.'])}</p>}

    <section className="pub-card" data-tg="status"><div className="pub-card-top"><h2>{tr(['وضعیت درگاه و توقف اضطراری', 'Gateway status & emergency stop', 'Geçit durumu ve acil durdurma', 'Статус шлюза и аварийная остановка'])}</h2><ShieldCheck size={18} /></div>
      <div className="pub-form-grid">
        <Field label={tr(['درگاه تلگرام', 'Telegram gateway', 'Telegram geçidi', 'Telegram-шлюз'])}>
          <span><StateBadge value={health?.telegram_gateway === 'reachable' ? 'stored' : 'unconfigured'} /> {health?.telegram_gateway || '…'}</span>
        </Field>
        <Field label={tr(['توقف اضطراری ارسال', 'Emergency send stop', 'Acil gönderim durdurma', 'Аварийная остановка'])}>
          <span className="pub-safety"><Power size={16} /><Toggle label={killed ? tr(['متوقف شده', 'Stopped', 'Durduruldu', 'Остановлено']) : tr(['فعال', 'Armed', 'Etkin', 'Включено'])} checked={killed} onChange={v => void act(() => api('/telegram/admin/kill-switch', 'POST', { stopped: v }), false)} /></span>
        </Field>
      </div>
      <p className="pub-note">{tr(['توقف اضطراری همه ارسال‌های خودکار و دستی را فوراً متوقف می‌کند.', 'The emergency stop halts all automatic and manual sends immediately.', 'Acil durdurma tüm gönderimleri anında durdurur.', 'Аварийная остановка немедленно прекращает все отправки.'])}</p>
    </section>

    <section className="pub-card" data-tg="campaigns"><div className="pub-card-top"><h2>{tr(['کمپین‌ها (تأیید یک‌بار)', 'Campaigns (approve once)', 'Kampanyalar (tek onay)', 'Кампании (одно approval)'])}</h2><button className="pub-secondary" onClick={() => setModal({ type: 'campaign' })}><Plus size={14} />{c('add')}</button></div>
      {!campaigns.length ? <p className="pub-note">{c('empty')}</p> : <div className="pub-table-scroll"><table><thead><tr>{[c('name'), c('status'), tr(['سقف روزانه', 'Daily cap', 'Günlük limit', 'Дневной лимит']), tr(['انقضا', 'Expires', 'Bitiş', 'Истекает']), ''].map(s => <th key={s}>{s}</th>)}</tr></thead><tbody>
        {campaigns.map((x: any) => <tr key={x.campaign_id}><td><b>{x.name}</b><br /><small className="pub-muted">{String(x.text || '').slice(0, 80)}</small></td><td><StateBadge value={x.status} /> {x.status}</td><td>{x.caps?.maxPerDay}</td><td>{String(x.expiresAt || '').slice(0, 10)}</td><td><div className="pub-actions">
          {x.status === 'draft' && <button className="pub-primary" disabled={busy} data-tg-campaign-approve={x.campaign_id} onClick={() => void act(() => api(`/telegram/campaigns/${x.campaign_id}/approve`, 'POST', {}))}><CheckCircle2 size={14} />{tr(['تأیید و فعال‌سازی', 'Approve & activate', 'Onayla ve etkinleştir', 'Одобрить и активировать'])}</button>}
          {x.status === 'live' && <button className="pub-secondary" disabled={busy} onClick={() => void act(() => api(`/telegram/campaigns/${x.campaign_id}/pause`, 'POST', {}))}><PauseCircle size={14} />{tr(['توقف', 'Pause', 'Duraklat', 'Пауза'])}</button>}
          <button className="pub-secondary" disabled={busy} onClick={() => setModal({ type: 'campaign', ...x })}><Pencil size={14} />{c('edit')}</button>
          {x.status !== 'revoked' && <button className="pub-danger" disabled={busy} onClick={() => { if (confirm(tr(['کمپین باطل شود؟', 'Revoke this campaign?', 'Kampanya iptal edilsin mi?', 'Отозвать кампанию?']))) void act(() => api(`/telegram/campaigns/${x.campaign_id}/revoke`, 'POST', {})); }}><XCircle size={14} />{tr(['ابطال', 'Revoke', 'İptal', 'Отозвать'])}</button>}
        </div></td></tr>)}
      </tbody></table></div>}
      <p className="pub-note">{tr(['هر ویرایش روی کمپین تأییدشده آن را به پیش‌نویس برمی‌گرداند و تأیید مجدد لازم است.', 'Any edit on an approved campaign returns it to draft and requires re-approval.', 'Onaylı kampanyadaki her düzenleme yeniden onay gerektirir.', 'Любое изменение одобренной кампании требует повторного одобрения.'])}</p>
    </section>

    <section className="pub-card" data-tg="queue"><div className="pub-card-top"><h2>{tr(['صف انتظار بررسی', 'Pending review queue', 'Onay bekleyenler', 'Очередь на проверку'])}</h2><span className="pub-muted">{count(queue.length)}</span></div>
      {!queue.length ? <p className="pub-note">{c('empty')}</p> : <div className="pub-table-scroll"><table><thead><tr>{[tr(['مقصد', 'Destination', 'Hedef', 'Назначение']), tr(['متن', 'Text', 'Metin', 'Текст']), tr(['دلیل', 'Reason', 'Neden', 'Причина']), ''].map(s => <th key={s}>{s}</th>)}</tr></thead><tbody>
        {queue.map((x: any) => <tr key={x.draft_id}><td><code dir="ltr">{x.dialog_id}</code><br /><small className="pub-muted">{x.status}</small></td><td>{x.message}</td><td><code>{x.reason}</code></td><td><button className="pub-secondary" disabled={busy} data-tg-resolve={x.draft_id} onClick={() => setModal({ type: 'resolve', ...x, note: '' })}>{tr(['تعیین‌تکلیف', 'Resolve', 'Karar ver', 'Решить'])}</button></td></tr>)}
      </tbody></table></div>}
    </section>

    <section className="pub-card" data-tg="composer"><div className="pub-card-top"><h2>{tr(['ارسال مستقیم مدیر (پست به کانال)', 'Manager direct send (post to channel)', 'Yönetici doğrudan gönderim', 'Прямая отправка менеджера'])}</h2><Send size={18} /></div>
      <div className="pub-form-grid">
        <Field label={tr(['مقصد (فقط موارد قابل‌ارسال)', 'Destination (sendable only)', 'Hedef (gönderilebilir)', 'Назначение (доступные)'])}>
          <select data-tg-dialog value={composer.dialogId} onChange={e => setComposer({ ...composer, dialogId: e.target.value, armed: false })}>
            <option value="">{c('none')}</option>
            {dialogs.map((d: any) => <option key={d.dialog_id} value={`${d.dialog_id}|${d.type}`}>{d.title} ({d.type})</option>)}
          </select>
        </Field>
      </div>
      <Field label={tr(['متن پیام', 'Message text', 'Mesaj metni', 'Текст сообщения'])}>
        <textarea data-tg-message rows={4} value={composer.message} onChange={e => setComposer({ ...composer, message: e.target.value, armed: false })} maxLength={4000} />
      </Field>
      <p className="pub-note">{tr(['عضویت و مجوز همان لحظه بررسی می‌شود؛ پیام خصوصی همیشه بسته است.', 'Membership and permission are checked at send time; direct messages are always blocked.', 'Üyelik ve izin gönderim anında kontrol edilir; özel mesaj kapalıdır.', 'Членство и права проверяются в момент отправки; личные сообщения запрещены.'])}</p>
      <div className="pub-actions"><button className={composer.armed ? 'pub-danger' : 'pub-primary'} disabled={busy || !composer.dialogId || !composer.message.trim()} data-tg-send onClick={() => {
        if (!composer.armed) { setComposer({ ...composer, armed: true }); return; }
        const [dialogId, dialogType] = composer.dialogId.split('|');
        void act(() => api('/telegram/send-direct', 'POST', { dialog_id: dialogId, dialog_type: dialogType, message: composer.message })).then(ok => { if (ok) setComposer({ dialogId: '', message: '', armed: false }); });
      }}>{composer.armed ? tr(['تأیید نهایی و ارسال', 'Confirm & send now', 'Onayla ve gönder', 'Подтвердить и отправить']) : tr(['ارسال', 'Send', 'Gönder', 'Отправить'])}</button></div>
    </section>

    <section className="pub-card" data-tg="log"><div className="pub-card-top"><h2>{tr(['لاگ ارسال‌ها', 'Send log', 'Gönderim günlüğü', 'Журнал отправок'])}</h2></div>
      {!log.length ? <p className="pub-note">{c('empty')}</p> : <div className="pub-table-scroll"><table><thead><tr>{[tr(['وضعیت', 'Status', 'Durum', 'Статус']), tr(['مقصد', 'Destination', 'Hedef', 'Назначение']), tr(['منبع', 'Source', 'Kaynak', 'Источник']), 'Telegram ID'].map(s => <th key={s}>{s}</th>)}</tr></thead><tbody>
        {log.map((x: any) => <tr key={x.draft_id}><td><StateBadge value={x.status} /> {x.status}{x.error_code && <> <code>{x.error_code}</code></>}</td><td><code dir="ltr">{x.dialog_id}</code></td><td>{x.source}</td><td>{x.telegram_message_id || '—'}</td></tr>)}
      </tbody></table></div>}
    </section>

    <section className="pub-card" data-tg="report"><div className="pub-card-top"><h2>{tr(['گزارش روزانه افیلیت', 'Affiliate daily report', 'Günlük ortaklık raporu', 'Дневной отчёт партнёров'])}</h2></div>
      {!report || report.status === 'data_unavailable'
        ? <p className="pub-note">{tr(['داده‌ای ثبت نشده/دسترسی موجود نیست', 'No data recorded / unavailable', 'Kayıtlı veri yok', 'Нет данных'])}</p>
        : <div className="pub-stat-grid">{[[tr(['کلیک', 'Clicks', 'Tıklama', 'Клики']), report.clicks], [tr(['سرنخ', 'Leads', 'Potansiyel', 'Лиды']), report.leads], [tr(['رزرو', 'Reservations', 'Rezervasyon', 'Брони']), report.reservations], [tr(['پرداخت‌شده', 'Paid', 'Ödenen', 'Оплачено']), report.paidTransactions], [tr(['کمیسیون معلق', 'Pending', 'Bekleyen', 'Ожидает']), report.pendingCommission], [tr(['تسویه‌شده', 'Paid out', 'Ödenen', 'Выплачено']), report.paidOut]].map(([label, n]: any, i: number) => <div className="pub-stat" key={i}><div><span>{label}</span><strong>{count(n)}</strong></div></div>)}</div>}
    </section>

    {modal?.type === 'campaign' && <PubModal title={tr(['کمپین تلگرام', 'Telegram campaign', 'Telegram kampanyası', 'Telegram-кампания'])} onClose={() => setModal(null)}><ErrorNotice error={error} />
      <CampaignForm initial={modal} busy={busy} save={b => act(() => b.campaign_id ? api(`/telegram/campaigns/${b.campaign_id}`, 'PUT', b) : api('/telegram/campaigns', 'POST', b))} />
    </PubModal>}
    {modal?.type === 'resolve' && <PubModal title={tr(['تعیین‌تکلیف پیش‌نویس', 'Resolve draft', 'Taslağı karara bağla', 'Решить черновик'])} onClose={() => setModal(null)}><ErrorNotice error={error} />
      <p className="pub-note"><code dir="ltr">{modal.dialog_id}</code> · <code>{modal.reason}</code></p>
      <p>{modal.message}</p>
      <Field label={tr(['یادداشت (اختیاری)', 'Note (optional)', 'Not (isteğe bağlı)', 'Заметка (необязательно)'])}><input value={modal.note} onChange={e => setModal({ ...modal, note: e.target.value })} maxLength={300} /></Field>
      <div className="pub-actions">
        <button className="pub-primary" disabled={busy} data-tg-resolve-approve onClick={() => void act(() => api(`/telegram/campaign/drafts/${modal.draft_id}/resolve`, 'POST', { action: 'approve', note: modal.note }))}><CheckCircle2 size={14} />{tr(['تأیید و ارسال', 'Approve & send', 'Onayla ve gönder', 'Одобрить и отправить'])}</button>
        <button className="pub-danger" disabled={busy} onClick={() => void act(() => api(`/telegram/campaign/drafts/${modal.draft_id}/resolve`, 'POST', { action: 'reject', note: modal.note }))}><XCircle size={14} />{tr(['رد', 'Reject', 'Reddet', 'Отклонить'])}</button>
      </div>
    </PubModal>}
  </div>;
}

function CampaignForm({ initial, busy, save }: any) {
  const { tr, c } = useCopy();
  const [v, setV] = useState({
    campaign_id: initial.campaign_id || '', version: initial.version || 0,
    name: initial.name || '', text: initial.text || '', language: initial.language || 'fa',
    cta_url: initial.ctaUrl || '', affiliate_code: initial.affiliateCode || '',
    affiliate_url: initial.affiliateUrl || '', disclosure: initial.disclosure || '',
    allowDialogIds: (initial.fence?.allowDialogIds || []).join(','), maxPerDay: initial.caps?.maxPerDay || 2,
  });
  const set = (k: string, val: any) => setV({ ...v, [k]: val });
  return <form onSubmit={e => {
    e.preventDefault();
    void save({
      ...v,
      fence: { allowDialogIds: String(v.allowDialogIds).split(',').map((s: string) => s.trim()).filter(Boolean), requireKeywordContext: true },
      caps: { maxPerDay: Number(v.maxPerDay) || 2, minIntervalMinutes: 60 },
    });
  }}>
    <Field label={c('name')}><input required value={v.name} onChange={e => set('name', e.target.value)} maxLength={120} data-tg-campaign-name /></Field>
    <Field label={tr(['متن تأییدشده (دقیق)', 'Approved text (exact)', 'Onaylı metin', 'Одобренный текст'])}><textarea required rows={4} value={v.text} onChange={e => set('text', e.target.value)} maxLength={4000} /></Field>
    <div className="pub-form-grid">
      <Field label={tr(['زبان', 'Language', 'Dil', 'Язык'])}><select value={v.language} onChange={e => set('language', e.target.value)}><option value="fa">FA</option><option value="en">EN</option><option value="tr">TR</option><option value="ru">RU</option></select></Field>
      <Field label={tr(['سقف روزانه', 'Daily cap', 'Günlük limit', 'Дневной лимит'])}><input type="number" min={1} max={10} value={v.maxPerDay} onChange={e => set('maxPerDay', e.target.value)} /></Field>
    </div>
    <Field label="CTA URL"><input dir="ltr" value={v.cta_url} onChange={e => set('cta_url', e.target.value)} maxLength={300} /></Field>
    <div className="pub-form-grid">
      <Field label={tr(['کد افیلیت', 'Affiliate code', 'Ortaklık kodu', 'Партнёрский код'])}><input dir="ltr" value={v.affiliate_code} onChange={e => set('affiliate_code', e.target.value)} maxLength={60} /></Field>
      <Field label={tr(['لینک افیلیت', 'Affiliate URL', 'Ortaklık bağlantısı', 'Партнёрская ссылка'])}><input dir="ltr" value={v.affiliate_url} onChange={e => set('affiliate_url', e.target.value)} maxLength={300} /></Field>
    </div>
    <Field label="Disclosure"><input value={v.disclosure} onChange={e => set('disclosure', e.target.value)} maxLength={300} /></Field>
    <Field label={tr(['مقصدهای مجاز (اختیاری، با ویرگول)', 'Allowed dialogs (optional, comma-separated)', 'İzinli hedefler (isteğe bağlı)', 'Разрешённые диалоги (необязательно)'])} hint={tr(['خالی = هر مقصد وریفای‌شده در حصار قوانین', 'Empty = any verified dialog within the rules', 'Boş = kurallara uyan her hedef', 'Пусто = любой проверенный диалог'])}>
      <input dir="ltr" value={v.allowDialogIds} onChange={e => set('allowDialogIds', e.target.value)} placeholder="-100111,-100222" />
    </Field>
    <button className="pub-primary" disabled={busy} data-tg-campaign-save>{c('save')}</button>
  </form>;
}
