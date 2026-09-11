import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useOps, Screen, Notice, Badge } from './context';

/**
 * Jarvis console (Management App) — admin AI assistant on Groq.
 * Panels: chat, approval queue, daily/weekly briefs, tool monitor, settings.
 * Sensitive actions always land in the approval queue; keys/tokens/secrets are
 * excluded from the assistant by design.
 */
export function JarvisConsole() {
  const { api, t, language } = useOps();
  const [view, setView] = useState<'chat' | 'approvals' | 'briefs' | 'monitor' | 'settings'>('chat');
  const [state, setState] = useState<any>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const reload = useCallback(async () => {
    try { setState(await api('/jarvis/state')); setError(''); } catch (e: any) { setError(e.code || e.message); }
  }, [api]);
  useEffect(() => { void reload(); }, [reload]);

  const tr = (fa: string, en: string) => language === 'fa' ? fa : en;

  return <Screen title={t('جارویس — دستیار مدیر', 'Jarvis — admin assistant', 'Jarvis — yönetici asistanı', 'Джарвис — помощник администратора')}
    subtitle={t('چت، اتوماسیون بازاریابی و نظارت ابزارها روی موتور Groq. اقدامات حساس همیشه به تأیید شما می‌رسند.', 'Chat, marketing automation and tool monitoring on Groq. Sensitive actions always wait for your approval.', 'Groq üzerinde sohbet, pazarlama otomasyonu ve izleme. Hassas işlemler her zaman onayınızı bekler.', 'Чат, автоматизация маркетинга и мониторинг на Groq. Чувствительные действия всегда ждут вашего подтверждения.')}>
    <Notice error={error} />
    <div className="ops-toolbar">
      {(['chat', 'approvals', 'briefs', 'monitor', 'settings'] as const).map(v => (
        <button key={v} className={view === v ? 'ops-primary' : ''} onClick={() => setView(v)}>
          {v === 'chat' ? t('چت', 'Chat', 'Sohbet', 'Чат') : v === 'approvals' ? t('تأییدها', 'Approvals', 'Onaylar', 'Утверждения') : v === 'briefs' ? t('گزارش‌ها', 'Briefs', 'Brifler', 'Отчёты') : v === 'monitor' ? t('نظارت', 'Monitor', 'İzleme', 'Мониторинг') : t('تنظیمات', 'Settings', 'Ayarlar', 'Настройки')}
          {v === 'approvals' && state?.pendingApprovals > 0 ? ` (${state.pendingApprovals})` : ''}
        </button>
      ))}
      <span className="ops-muted" style={{ marginInlineStart: 'auto' }}>
        {state ? t(`مصرف امروز: ${state.usage.today}/${state.usage.cap} · مدل: ${state.config.model}`, `Today: ${state.usage.today}/${state.usage.cap} · model: ${state.config.model}`, `Bugün: ${state.usage.today}/${state.usage.cap}`, `Сегодня: ${state.usage.today}/${state.usage.cap}`) : '…'}
      </span>
    </div>
    {!state ? <p className="ops-muted">{t('در حال دریافت…', 'Loading…', 'Yükleniyor…', 'Загрузка…')}</p> : (
      <>
        {view === 'chat' && <JarvisChat api={api} t={t} language={language} configured={state.configured} onApprovals={reload} />}
        {view === 'approvals' && <JarvisApprovals api={api} t={t} language={language} onDecided={reload} />}
        {view === 'briefs' && <JarvisBriefs api={api} t={t} language={language} />}
        {view === 'monitor' && <JarvisMonitor api={api} t={t} language={language} initial={state.monitor} />}
        {view === 'settings' && <JarvisSettings api={api} t={t} language={language} state={state} onSaved={reload} />}
      </>
    )}
  </Screen>;
}

function JarvisChat({ api, t, language, configured, onApprovals }: any) {
  const [sessions, setSessions] = useState<any[]>([]);
  const [sessionId, setSessionId] = useState('');
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const endRef = useRef<HTMLDivElement>(null);

  const loadSessions = useCallback(async () => {
    try { const d = await api('/jarvis/sessions'); setSessions(d.sessions || []); } catch { /* */ }
  }, [api]);
  useEffect(() => { void loadSessions(); }, [loadSessions]);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const open = async (id: string) => {
    setSessionId(id);
    try { const s = await api(`/jarvis/sessions/${id}`); setMessages(s.messages || []); } catch (e: any) { setError(e.code || e.message); }
  };

  const send = async () => {
    const message = input.trim();
    if (!message || busy) return;
    setBusy(true); setError(''); setInput('');
    setMessages(m => [...m, { role: 'user', content: message }]);
    try {
      const r = await api('/jarvis/chat', 'POST', { sessionId: sessionId || undefined, message, language });
      setSessionId(r.sessionId);
      setMessages(m => [...m, { role: 'assistant', content: r.reply }]);
      void loadSessions();
      if (r.approvalsCreated?.length) onApprovals();
    } catch (e: any) {
      setError(e.code || e.message);
      setMessages(m => [...m, { role: 'assistant', content: t('خطا در اجرای درخواست.', 'Request failed.', 'İstek başarısız.', 'Не удалось выполнить.') }]);
    } finally { setBusy(false); }
  };

  return <div style={{ display: 'grid', gridTemplateColumns: 'minmax(180px,240px) 1fr', gap: 16 }}>
    <div className="ops-card">
      <div className="ops-row"><h3>{t('جلسه‌ها', 'Sessions', 'Oturumlar', 'Сессии')}</h3>
        <button className="ops-quiet" onClick={() => { setSessionId(''); setMessages([]); }}>+</button></div>
      {sessions.map((s: any) => <p key={s.id} style={{ cursor: 'pointer', fontWeight: s.id === sessionId ? '700' : '400' }} onClick={() => void open(s.id)}>
        {String(s.title || s.id).slice(0, 40)}<br /><span className="ops-muted">{s.actor} · {String(s.updatedAt || '').slice(0, 16).replace('T', ' ')}</span>
      </p>)}
      {!sessions.length && <p className="ops-muted">{t('جلسه‌ای نیست', 'No sessions', 'Oturum yok', 'Нет сессий')}</p>}
    </div>
    <div className="ops-card" style={{ display: 'flex', flexDirection: 'column', minHeight: 380 }}>
      {!configured && <Notice error="JARVIS_NOT_CONFIGURED" />}
      <div style={{ flex: 1, overflowY: 'auto', maxHeight: 420 }}>
        {messages.map((m: any, i: number) => (
          <div key={i} style={{ margin: '8px 0', textAlign: m.role === 'user' ? 'end' : 'start' }}>
            <div style={{ display: 'inline-block', maxWidth: '85%', padding: '8px 12px', borderRadius: 10, background: m.role === 'user' ? '#173d38' : '#16222f', border: '1px solid #273849', whiteSpace: 'pre-wrap' }}>{m.content}</div>
          </div>
        ))}
        {!messages.length && <p className="ops-muted">{t('مثال: «آمار امروز پورتال را بده» · «برای کاربر ali ده کردیت شارژ کن» · «پیام‌های بی‌پاسخ اینستاگرام؟»', 'e.g. "today\'s stats" · "charge 10 credits for ali"', 'örnek komut', 'пример команды')}</p>}
        <div ref={endRef} />
      </div>
      <div className="ops-toolbar" style={{ margin: 0 }}>
        <input style={{ flex: 1 }} value={input} onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') void send(); }}
          placeholder={t('درخواست خود را بنویسید…', 'Type your request…', 'İsteğinizi yazın…', 'Введите запрос…')} />
        <button className="ops-primary" disabled={busy || !input.trim()} onClick={() => void send()}>{busy ? '…' : t('ارسال', 'Send', 'Gönder', 'Отправить')}</button>
      </div>
    </div>
  </div>;
}

function JarvisApprovals({ api, t, language, onDecided }: any) {
  const [items, setItems] = useState<any[]>([]);
  const [status, setStatus] = useState('pending');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try { const d = await api(`/jarvis/approvals${status ? `?status=${status}` : ''}`); setItems(d.items || []); setError(''); } catch (e: any) { setError(e.code || e.message); }
  }, [api, status]);
  useEffect(() => { void load(); }, [load]);

  const decide = async (id: string, action: string) => {
    setBusy(true);
    try { await api(`/jarvis/approvals/${id}/${action}`, 'POST', {}); await load(); onDecided(); }
    catch (e: any) { setError(e.code || e.message); } finally { setBusy(false); }
  };

  return <div className="ops-card">
    <div className="ops-toolbar">
      {['pending', 'approved', 'rejected'].map(s => (
        <button key={s} className={status === s ? 'ops-primary' : ''} onClick={() => setStatus(s)}>
          {s === 'pending' ? t('در انتظار', 'Pending', 'Bekliyor', 'Ожидают') : s === 'approved' ? t('تأییدشده', 'Approved', 'Onaylandı', 'Одобрены') : t('ردشده', 'Rejected', 'Reddedildi', 'Отклонены')}
        </button>))}
    </div>
    <Notice error={error} />
    <div className="ops-table-wrap"><table>
      <thead><tr><th>{t('درخواست', 'Request', 'İstek', 'Запрос')}</th><th>{t('پارامترها', 'Params', 'Parametreler', 'Параметры')}</th><th>{t('خواسته', 'By', 'İsteyen', 'От')}</th><th></th></tr></thead>
      <tbody>
        {items.map((a: any) => <tr key={a.id} data-jarvis-approval={a.id}>
          <td><b>{a.title}</b><br /><span className="ops-muted">{a.skillId} · {String(a.createdAt || '').slice(0, 16).replace('T', ' ')}</span></td>
          <td><code style={{ fontSize: 10, wordBreak: 'break-all' }}>{JSON.stringify(a.params).slice(0, 260)}</code>{a.result?.summary ? <div className="ops-muted">{a.result.summary}</div> : ''}{a.error ? <div style={{ color: '#ffadae' }}>{a.error}</div> : ''}</td>
          <td>{a.requestedBy}{a.decidedBy ? <div className="ops-muted">← {a.decidedBy}</div> : ''}</td>
          <td>{a.status === 'pending' ? <div className="ops-actions">
            <button disabled={busy} className="ops-primary" onClick={() => void decide(a.id, 'approve')}>{t('تأیید', 'Approve', 'Onayla', 'Одобрить')}</button>
            <button disabled={busy} onClick={() => void decide(a.id, 'reject')}>{t('رد', 'Reject', 'Reddet', 'Отклонить')}</button>
          </div> : <Badge tone={a.status === 'approved' ? 'good' : 'warn'}>{a.status}</Badge>}</td>
        </tr>)}
        {!items.length && <tr><td colSpan={4} className="ops-muted">{t('موردی نیست', 'Nothing here', 'Kayıt yok', 'Ничего нет')}</td></tr>}
      </tbody>
    </table></div>
  </div>;
}

function JarvisBriefs({ api, t }: any) {
  const [items, setItems] = useState<any[]>([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const load = useCallback(async () => {
    try { const d = await api('/jarvis/briefs'); setItems(d.items || []); setError(''); } catch (e: any) { setError(e.code || e.message); }
  }, [api]);
  useEffect(() => { void load(); }, [load]);
  const run = async (id: string) => { setBusy(true); try { await api(`/jarvis/jobs/${id}/run`, 'POST', {}); await load(); } catch (e: any) { setError(e.code || e.message); } finally { setBusy(false); } };
  return <div className="ops-card">
    <div className="ops-toolbar">
      <button disabled={busy} onClick={() => void run('dailyBrief')}>{t('ساخت بریف روزانه', 'Build daily brief', 'Günlük brif', 'Собрать дневной бриф')}</button>
      <button disabled={busy} onClick={() => void run('weeklyDigest')}>{t('ساخت دایجست هفتگی', 'Build weekly digest', 'Haftalık özet', 'Недельный дайджест')}</button>
    </div>
    <Notice error={error} />
    {items.map((b: any) => <div key={b.id} style={{ borderBottom: '1px solid #223746', padding: '12px 0' }}>
      <b>{b.type === 'daily' ? t('بریف روزانه', 'Daily brief', 'Günlük brif', 'Дневной бриф') : t('دایجست هفتگی', 'Weekly digest', 'Haftalık özet', 'Недельный дайджест')}</b>
      <span className="ops-muted"> · {String(b.createdAt || '').slice(0, 16).replace('T', ' ')}</span>
      <p style={{ whiteSpace: 'pre-wrap' }}>{b.summary}</p>
      {(b.ideas || []).map((idea: any, i: number) => <details key={i}><summary>{t(`ایده ${i + 1}: `, `Idea ${i + 1}: `, `Fikir ${i + 1}: `, `Идея ${i + 1}: `)}{idea.title}</summary>
        <p className="ops-muted">{t('کپشن: ', 'Caption: ', 'Başlık: ', 'Подпись: ')}{idea.caption}</p>
        <p className="ops-muted" style={{ whiteSpace: 'pre-wrap' }}>{idea.blog}</p></details>)}
      {(b.recommendations || []).map((r: string, i: number) => <p key={i}>• {r}</p>)}
    </div>)}
    {!items.length && <p className="ops-muted">{t('هنوز گزارشی ساخته نشده (۹ صبح قبرس به‌صورت خودکار).', 'No briefs yet (auto at 09:00 Cyprus).', 'Henüz brif yok.', 'Брифов пока нет.')}</p>}
  </div>;
}

function JarvisMonitor({ api, t, initial }: any) {
  const [snap, setSnap] = useState<any>(initial || null);
  const [error, setError] = useState('');
  const refresh = useCallback(async () => {
    try { setSnap(await api('/jarvis/monitor')); setError(''); } catch (e: any) { setError(e.code || e.message); }
  }, [api]);
  useEffect(() => { if (!snap) void refresh(); }, [refresh, snap]);
  if (!snap) return <p className="ops-muted">…</p>;
  const card = (label: string, value: string, tone?: string) => <div className="ops-card" key={label}><p className="ops-muted">{label}</p><div className="ops-stat" style={{ fontSize: 18 }}>{value}</div></div>;
  return <div>
    <Notice error={error} />
    <div className="ops-toolbar"><button onClick={() => void refresh()}>{t('به‌روزرسانی', 'Refresh', 'Yenile', 'Обновить')}</button>
      <span className="ops-muted">{String(snap.generatedAt || '').replace('T', ' ').slice(0, 19)}</span></div>
    {snap.alerts?.length ? <Notice error={snap.alerts.join(' · ')} /> : <p className="ops-muted">{t('هشدار فعالی نیست.', 'No active alerts.', 'Aktif uyarı yok.', 'Активных тревог нет.')}</p>}
    <div className="ops-grid">
      {card(t('انتشار زرنیو', 'Zernio publishing', 'Zernio', 'Публикация Zernio'), `${t('ارسال', 'sent', 'gönderildi', 'отправлено')}: ${snap.publishing.sent} · ${t('صف', 'queued', 'kuyruk', 'очередь')}: ${snap.publishing.queued} · ${t('نامشخص', 'unknown', 'belirsiz', 'неизвестно')}: ${snap.publishing.unknown}`)}
      {card(t('آخرین رویداد ورودی', 'Last inbound', 'Son gelen', 'Последнее входящее'), snap.publishing.lastInboundAt ? String(snap.publishing.lastInboundAt).replace('T', ' ').slice(0, 16) : '—')}
      {card(t('گیت‌وی تلگرام', 'Telegram gateway', 'Telegram ağ geçidi', 'Шлюз Telegram'), snap.telegram.configured ? (snap.telegram.reachable ? t('در دسترس', 'Reachable', 'Erişilebilir', 'Доступен') : `${t('قطع', 'Down', 'Kesinti', 'Недоступен')} (${snap.telegram.detail || ''})`) : t('تنظیم نشده', 'Not configured', 'Ayarlanmadı', 'Не настроен'))}
      {card(t('پرتال', 'Portal', 'Portal', 'Портал'), `${t('آپ‌تایم', 'Uptime', 'Çalışma', 'Аптайм')}: ${snap.portal.uptimeHours}h · ${t('حافظه', 'Memory', 'Bellek', 'Память')}: ${snap.portal.memoryMB}MB · DB: ${snap.portal.dbLatencyMs}ms`)}
    </div>
  </div>;
}

function JarvisSettings({ api, t, state, onSaved }: any) {
  const [cfg, setCfg] = useState<any>(state?.config || {});
  const [models, setModels] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);

  const save = async () => {
    setBusy(true); setError(''); setSaved(false);
    try { const r = await api('/jarvis/config', 'PUT', cfg); setCfg(r); setSaved(true); onSaved(); }
    catch (e: any) { setError(e.code || e.message); } finally { setBusy(false); }
  };
  const fetchModels = async () => {
    setBusy(true); setError('');
    try { const r = await api('/jarvis/models', 'POST', {}); setModels(r.models || []); }
    catch (e: any) { setError(e.code || e.message); } finally { setBusy(false); }
  };

  const modelOptions = Array.from(new Set([...(state?.freeModels || []).map((m: any) => m.id), ...models, cfg.model].filter(Boolean))) as string[];

  return <div className="ops-card">
    <Notice error={error} />
    {saved && <p style={{ color: '#7de8bd' }}>{t('تنظیمات ذخیره شد.', 'Settings saved.', 'Ayarlar kaydedildi.', 'Настройки сохранены.')}</p>}
    <div className="ops-form-grid">
      <label>{t('کلید API سرویس Groq (رایگان: console.groq.com)', 'Groq API key (free: console.groq.com)', 'Groq API anahtarı', 'API-ключ Groq')}
        <input type="password" dir="ltr" placeholder={cfg.apiKey ? '********' : 'gsk_…'} value={cfg.apiKey === '********' ? '' : (cfg.apiKey || '')} onChange={e => setCfg({ ...cfg, apiKey: e.target.value || '********' })} />
      </label>
      <label>{t('مدل اصلی (پیشنهادی: llama-3.3-70b-versatile)', 'Main model', 'Ana model', 'Основная модель')}
        <select dir="ltr" value={cfg.model} onChange={e => setCfg({ ...cfg, model: e.target.value })}>
          {modelOptions.map((m: string) => <option key={m} value={m}>{m}</option>)}
        </select>
      </label>
      <label>{t('مدل سبک (پشتیبان هنگام محدودیت نرخ)', 'Light fallback model', 'Hafif model', 'Лёгкая модель')}
        <select dir="ltr" value={cfg.lightModel} onChange={e => setCfg({ ...cfg, lightModel: e.target.value })}>
          {modelOptions.map((m: string) => <option key={m} value={m}>{m}</option>)}
        </select>
      </label>
      <label>{t('سقف فراخوانی روزانه LLM', 'Daily LLM call cap', 'Günlük limit', 'Дневной лимит')}
        <input type="number" min={10} max={100000} value={cfg.dailyCallCap} onChange={e => setCfg({ ...cfg, dailyCallCap: Number(e.target.value) })} />
      </label>
      <label>{t('مدل سفارشی (پلن پولی — اگر مدل موردنظر در فهرست نیست اینجا بنویسید)', 'Custom model (paid plan)', 'Özel model', 'Своя модель')}
        <input dir="ltr" placeholder="e.g. llama-3.3-70b-specdec" value={cfg.customModel || ''} onChange={e => setCfg({ ...cfg, model: e.target.value || cfg.model, customModel: e.target.value })} />
      </label>
    </div>
    <div className="ops-toolbar">
      <button disabled={busy} onClick={() => void fetchModels()}>{t('دریافت فهرست مدل‌ها از Groq', 'Fetch model list from Groq', 'Model listesini al', 'Получить список моделей')}</button>
      {models.length ? <span className="ops-muted">{t(`${models.length} مدل`, `${models.length} models`, `${models.length} model`, `${models.length} моделей`)}</span> : ''}
    </div>
    <h3>{t('اتوماسیون', 'Automation', 'Otomasyon', 'Автоматизация')}</h3>
    <div className="ops-form-grid">
      {([['dailyBrief', t('بریف روزانه ۹ صبح (قبرس)', 'Daily brief 09:00 Cyprus', 'Günlük brif', 'Дневной бриф 9:00')],
        ['weeklyDigest', t('دایجست هفتگی (دوشنبه ۱۰)', 'Weekly digest (Mon 10:00)', 'Haftalık özet', 'Недельный дайджест')],
        ['igReplies', t('پیشنهاد پاسخ دایرکت اینستاگرام', 'Instagram DM reply drafts', 'DM yanıt taslakları', 'Черновики ответов DM')],
        ['chatFaq', t('پیشنهاد پاسخ تیکت', 'Ticket reply drafts', 'Bilet yanıtları', 'Черновики ответов на тикеты')],
        ['faqAutoSend', t('ارسال خودکار پاسخ‌های مطمئن (FAQ)', 'Auto-send confident FAQ answers', 'Otomatik FAQ', 'Автоотправка уверенных FAQ')]] as const).map(([key, label]) => (
        <label key={key} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <input type="checkbox" checked={cfg.automation?.[key] === true} onChange={e => setCfg({ ...cfg, automation: { ...cfg.automation, [key]: e.target.checked } })} />
          {label}
        </label>))}
    </div>
    <div className="ops-toolbar">
      <button className="ops-primary" disabled={busy} onClick={() => void save()}>{t('ذخیره تنظیمات', 'Save settings', 'Kaydet', 'Сохранить')}</button>
      <button disabled={busy} onClick={() => void api('/jarvis/jobs/igReplies', 'POST', {}).catch(() => {})}>{t('اجرا الان: دایرکت‌ها', 'Run now: DM drafts', 'Şimdi çalıştır', 'Запустить сейчас')}</button>
      <button disabled={busy} onClick={() => void api('/jarvis/jobs/chatFaq', 'POST', {}).catch(() => {})}>{t('اجرا الان: تیکت‌ها', 'Run now: tickets', 'Şimdi: biletler', 'Сейчас: тикеты')}</button>
    </div>
    <p className="ops-muted">{t('کلید هرگز پس از ذخیره نمایش داده نمی‌شود؛ برای تغییر، مقدار تازه بنویسید. دسترسی جارویس به کلیدها/توکن‌ها/مديريت اپراتورها/ريست دیتابیس به‌طور طراحی مسدود است.', 'Keys are never shown after save. Jarvis is designed to never touch keys/tokens/operator management/database resets.', 'Anahtarlar kayıttan sonra gösterilmez.', 'Ключи не показываются после сохранения.')}</p>
  </div>;
}
