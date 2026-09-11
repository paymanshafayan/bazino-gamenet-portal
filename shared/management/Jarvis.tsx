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
    subtitle={t('چت، اتوماسیون و نظارت روی زنجیرهٔ Groq → OpenRouter → OpenAI (پشتیبان‌ها فقط امور پشتیبانی). اقدامات حساس همیشه به تأیید شما می‌رسند.', 'Chat, automation and monitoring on the Groq → OpenRouter → OpenAI chain (backups are support-only). Sensitive actions always wait for your approval.', 'Groq → OpenRouter → OpenAI zinciri üzerinde sohbet ve otomasyon (yedekler sadece destek).', 'Чат и автоматизация на цепочке Groq → OpenRouter → OpenAI (резервы — только поддержка).')}>
    <Notice error={error} />
    <div className="ops-toolbar">
      {(['chat', 'approvals', 'briefs', 'monitor', 'settings'] as const).map(v => (
        <button key={v} className={view === v ? 'ops-primary' : ''} onClick={() => setView(v)}>
          {v === 'chat' ? t('چت', 'Chat', 'Sohbet', 'Чат') : v === 'approvals' ? t('تأییدها', 'Approvals', 'Onaylar', 'Утверждения') : v === 'briefs' ? t('گزارش‌ها', 'Briefs', 'Brifler', 'Отчёты') : v === 'monitor' ? t('نظارت', 'Monitor', 'İzleme', 'Мониторинг') : t('تنظیمات', 'Settings', 'Ayarlar', 'Настройки')}
          {v === 'approvals' && state?.pendingApprovals > 0 ? ` (${state.pendingApprovals})` : ''}
        </button>
      ))}
      <span className="ops-muted" style={{ marginInlineStart: 'auto' }}>
        {state ? <>{t(`مصرف امروز — Groq: ${state.usage.today}/${state.usage.cap} · مدل: ${state.config.model}`, `Today — Groq: ${state.usage.today}/${state.usage.cap} · model: ${state.config.model}`, `Bugün — Groq: ${state.usage.today}/${state.usage.cap}`, `Сегодня — Groq: ${state.usage.today}/${state.usage.cap}`)}
          {state.providers?.openrouter?.configured ? ` · OpenRouter: ${state.providers.openrouter.usageToday}/${state.providers.openrouter.cap}` : ''}
          {state.providers?.openai?.configured ? ` · OpenAI: ${state.providers.openai.usageToday}/${state.providers.openai.cap}` : ''}</> : '…'}
      </span>
    </div>
    {!state ? <p className="ops-muted">{t('در حال دریافت…', 'Loading…', 'Yükleniyor…', 'Загрузка…')}</p> : (
      <>
        {view === 'chat' && <JarvisChat api={api} t={t} language={language} configured={state.configured} incidents={state.incidents} onApprovals={reload} />}
        {view === 'approvals' && <JarvisApprovals api={api} t={t} language={language} onDecided={reload} />}
        {view === 'briefs' && <JarvisBriefs api={api} t={t} language={language} />}
        {view === 'monitor' && <JarvisMonitor api={api} t={t} language={language} initial={state.monitor} providers={state.providers} incidents={state.incidents} />}
        {view === 'settings' && <JarvisSettings api={api} t={t} language={language} state={state} onSaved={reload} />}
      </>
    )}
  </Screen>;
}

function JarvisChat({ api, t, language, configured, incidents, onApprovals }: any) {
  const [sessions, setSessions] = useState<any[]>([]);
  const [sessionId, setSessionId] = useState('');
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const listRef = useRef<HTMLDivElement>(null);
  // Backup-mode banner: the latest provider incident is fresh enough to matter.
  const latest: any = incidents?.[0];
  const backupActive = latest && ['BACKUP_ACTIVE', 'GROQ_UNAVAILABLE'].includes(latest.type)
    && Date.now() - Date.parse(String(latest.lastAt || latest.ts)) < 30 * 60000;

  const loadSessions = useCallback(async () => {
    try { const d = await api('/jarvis/sessions'); setSessions(d.sessions || []); } catch { /* */ }
  }, [api]);
  useEffect(() => { void loadSessions(); }, [loadSessions]);
  // Internal autoscroll ONLY (container.scrollTop) — scrollIntoView moved the whole
  // page down on every reply; the page itself must stay where the admin is.
  useEffect(() => { if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight; }, [messages]);

  const open = async (id: string) => {
    setSessionId(id);
    try { const s = await api(`/jarvis/sessions/${id}`); setMessages(s.messages || []); } catch (e: any) { setError(e.code || e.message); }
  };

  const send = async () => {
    const message = input.trim();
    if (!message || busy) return;
    setBusy(true); setError(''); setInput('');
    setMessages(m => [...m, { role: 'user', content: message }]);
    // Employer rule: pressing Send returns the page to the top.
    window.scrollTo({ top: 0, behavior: 'smooth' });
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
      {backupActive && <div style={{ padding: '8px 12px', marginBottom: 8, borderRadius: 10, border: '1px solid #8a6d1f', background: '#3a2f14', color: '#ffd98a' }}>
        {t('حالت پشتیبان فعال — Groq در دسترس نیست؛ فقط امور پشتیبانی (تیکت‌ها، پیام‌ها، نظارت پورتال) پاسخ داده می‌شود و سایر امکانات موقتاً غیرفعال و به ادمین گزارش شده‌اند.', 'Backup mode active — Groq unavailable; only support matters (tickets, messages, portal monitoring) are answered. Everything else is paused and reported to the admin.', 'Yedek mod aktif — Groq kullanılamıyor; sadece destek işleri yanıtlanıyor.', 'Активен резервный режим — Groq недоступен; отвечаются только вопросы поддержки.')}
      </div>}
      <div style={{ flex: 1, overflowY: 'auto', maxHeight: 420 }} ref={listRef}>
        {messages.map((m: any, i: number) => (
          <div key={i} style={{ margin: '8px 0', textAlign: m.role === 'user' ? 'end' : 'start' }}>
            <div style={{ display: 'inline-block', maxWidth: '85%', padding: '8px 12px', borderRadius: 10, background: m.role === 'user' ? '#173d38' : '#16222f', border: '1px solid #273849', whiteSpace: 'pre-wrap' }}>{m.content}</div>
          </div>
        ))}
        {!messages.length && <p className="ops-muted">{t('مثال: «آمار امروز پورتال را بده» · «برای کاربر ali ده کردیت شارژ کن» · «پیام‌های بی‌پاسخ اینستاگرام؟»', 'e.g. "today\'s stats" · "charge 10 credits for ali"', 'örnek komut', 'пример команды')}</p>}
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

function JarvisMonitor({ api, t, language, initial, providers, incidents }: any) {
  const [snap, setSnap] = useState<any>(initial || null);
  const [error, setError] = useState('');
  const refresh = useCallback(async () => {
    try { setSnap(await api('/jarvis/monitor')); setError(''); } catch (e: any) { setError(e.code || e.message); }
  }, [api]);
  useEffect(() => { if (!snap) void refresh(); }, [refresh, snap]);
  if (!snap) return <p className="ops-muted">…</p>;
  const card = (label: string, value: string, tone?: string) => <div className="ops-card" key={label}><p className="ops-muted">{label}</p><div className="ops-stat" style={{ fontSize: 18 }}>{value}</div></div>;
  const incidentText = (i: any) => ({
    GROQ_UNAVAILABLE: t('Groq در دسترس نیست', 'Groq unavailable', 'Groq kullanılamıyor', 'Groq недоступен'),
    BACKUP_ACTIVE: t('پشتیبان فعال (فقط پشتیبانی)', 'Backup active (support-only)', 'Yedek aktif', 'Резерв активен'),
    SUPPORT_ONLY_BLOCKED: t('درخواست غیرپشتیبانی رد شد', 'Non-support request refused', 'Destek dışı istek reddedildi', 'Не поддерживаемый запрос отклонён'),
    BACKUP_FAILED: t('خطای ارائه‌دهنده پشتیبان', 'Backup provider failed', 'Yedek sağlayıcı hatası', 'Сбой резервного провайдера'),
  } as any)[i.type] || i.type;
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
    <h3 style={{ marginTop: 18 }}>{t('ارائه‌دهنده‌های هوش مصنوعی', 'AI providers', 'AI sağlayıcıları', 'AI-провайдеры')}</h3>
    <p className="ops-muted">{t('زنجیره: Groq (اصلی) → OpenRouter → OpenAI (پشتیبانِ فقط-پشتیبانی). پشتیبان‌ها تنها هنگام عدم پاسخ Groq فعال می‌شوند.', 'Chain: Groq (primary) → OpenRouter → OpenAI (support-only backups). Backups engage only when Groq cannot answer.', 'Zincir: Groq → OpenRouter → OpenAI (sadece destek).', 'Цепочка: Groq → OpenRouter → OpenAI (только поддержка).')}</p>
    <div className="ops-grid">
      {(providers ? Object.values(providers) : []).map((p: any) => card(
        `${p.label} · ${p.role === 'primary' ? t('اصلی', 'primary', 'ana', 'основной') : t('پشتیبان', 'backup', 'yedek', 'резерв')}`,
        p.configured
          ? `${p.model} · ${t('مصرف', 'usage', 'kullanım', 'использовано')}: ${p.usageToday}/${p.cap}${p.role === 'backup' && p.enabled === false ? ' · ' + t('خاموش', 'off', 'kapalı', 'выкл') : ''}`
          : t('تنظیم نشده', 'Not configured', 'Ayarlanmadı', 'Не настроен'),
      ))}
    </div>
    <h3 style={{ marginTop: 18 }}>{t('رویدادها و گزارش‌ها به ادمین', 'Incidents & admin reports', 'Olaylar', 'Инциденты и отчёты')}</h3>
    <div className="ops-table-wrap"><table>
      <thead><tr><th>{t('رویداد', 'Incident', 'Olay', 'Инцидент')}</th><th>{t('ارائه‌دهنده', 'Provider', 'Sağlayıcı', 'Провайдер')}</th><th>{t('شرح', 'Detail', 'Açıklama', 'Описание')}</th><th>{t('زمان', 'Time', 'Zaman', 'Время')}</th></tr></thead>
      <tbody>
        {(incidents || []).map((i: any) => <tr key={i.id} data-jarvis-incident={i.id}>
          <td><Badge tone={i.type === 'BACKUP_ACTIVE' ? 'warn' : i.type === 'SUPPORT_ONLY_BLOCKED' ? 'warn' : 'bad'}>{incidentText(i)}</Badge>{(i.count || 1) > 1 ? <span className="ops-muted"> ×{i.count}</span> : ''}</td>
          <td>{i.provider}{i.meta?.model ? <div className="ops-muted" dir="ltr" style={{ fontSize: 10 }}>{i.meta.model}</div> : ''}</td>
          <td style={{ maxWidth: 420 }}>{i.message}{i.meta?.detail ? <div className="ops-muted" dir="ltr" style={{ fontSize: 10, wordBreak: 'break-all' }}>{String(i.meta.detail).slice(0, 220)}</div> : ''}</td>
          <td className="ops-muted">{String(i.lastAt || i.ts || '').replace('T', ' ').slice(0, 16)}</td>
        </tr>)}
        {!(incidents || []).length && <tr><td colSpan={4} className="ops-muted">{t('رویدادی ثبت نشده — همه‌چیز سالم.', 'No incidents — all healthy.', 'Olay yok.', 'Инцидентов нет.')}</td></tr>}
      </tbody>
    </table></div>
  </div>;
}

/** Searchable model picker — a text box with a filtered dropdown (employer rule:
 *  the model select must be a search box). Free text is allowed (custom models);
 *  Enter picks the first match, Escape closes. */
function ModelPicker({ value, options, onChange, t }: { value: string; options: string[]; onChange: (m: string) => void; t?: any }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const wrapRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const handler = (e: MouseEvent) => { if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);
  const q = query.trim().toLowerCase();
  const filtered = Array.from(new Set([value, ...options].filter(Boolean)))
    .filter(m => !q || m.toLowerCase().includes(q)).slice(0, 80);
  const pick = (m: string) => { onChange(m); setOpen(false); setQuery(''); };
  return <div ref={wrapRef} style={{ position: 'relative' }}>
    <input dir="ltr" style={{ width: '100%' }}
      value={open ? query : (value || '')}
      placeholder={value || (t ? t('جستجوی مدل…', 'Search model…', 'Model ara…', 'Поиск модели…') : 'search…')}
      onFocus={() => { setOpen(true); setQuery(''); }}
      onChange={e => { setQuery(e.target.value); setOpen(true); }}
      onKeyDown={e => {
        if (e.key === 'Enter') { e.preventDefault(); if (filtered[0]) pick(filtered[0]); else if (query.trim()) pick(query.trim()); }
        if (e.key === 'Escape') { setOpen(false); setQuery(''); }
      }} />
    {open && <div dir="ltr" style={{ position: 'absolute', top: '100%', insetInlineStart: 0, width: '100%', zIndex: 60, marginTop: 4, background: '#0f1b26', border: '1px solid #2c4254', borderRadius: 8, maxHeight: 230, overflowY: 'auto', boxShadow: '0 8px 24px rgba(0,0,0,.45)' }}>
      {filtered.map((m: string) => (
        <div key={m} style={{ padding: '6px 10px', cursor: 'pointer', fontSize: 12, background: m === value ? '#173d38' : 'transparent', color: m === value ? '#7de8bd' : undefined }}
          onMouseDown={e => { e.preventDefault(); pick(m); }}
          onMouseEnter={e => { if (m !== value) e.currentTarget.style.background = '#16222f'; }}
          onMouseLeave={e => { if (m !== value) e.currentTarget.style.background = 'transparent'; }}>{m}</div>
      ))}
      {!filtered.length && <div style={{ padding: '8px 10px', fontSize: 12 }} className="ops-muted">
        {t ? t('موردی نیست — با Enter مدل تایپ‌شده را ثبت کنید یا فهرست رسمی را بگیرید', 'No match — press Enter to keep the typed model or fetch the official list', 'Eşleşme yok', 'Нет совпадений') : '—'}
      </div>}
    </div>}
  </div>;
}

function JarvisSettings({ api, t, state, onSaved }: any) {
  const [cfg, setCfg] = useState<any>(state?.config || {});
  const [models, setModels] = useState<Record<string, string[]>>({});
  const [toolModels, setToolModels] = useState<Record<string, string[] | null>>({});
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);

  const save = async () => {
    setBusy(true); setError(''); setSaved(false);
    try { const r = await api('/jarvis/config', 'PUT', cfg); setCfg(r); setSaved(true); onSaved(); }
    catch (e: any) { setError(e.code || e.message); } finally { setBusy(false); }
  };
  const fetchModels = async (provider: string) => {
    setBusy(true); setError('');
    try { const r = await api('/jarvis/models', 'POST', { provider }); setModels(m => ({ ...m, [provider]: r.models || [] })); setToolModels(tm => ({ ...tm, [provider]: r.toolModels || null })); }
    catch (e: any) { setError(e.code || e.message); } finally { setBusy(false); }
  };
  const setBackup = (id: string, patch: any) => setCfg((c: any) => ({
    ...c, backup: { ...(c.backup || {}), [id]: { ...(c.backup?.[id] || {}), ...patch } },
  }));

  const modelOptions = (provider: string, current: string) => {
    const suggested = (state?.suggestedModels?.[provider] || state?.freeModels || []).map((m: any) => m.id);
    return Array.from(new Set([...suggested, ...(models[provider] || []), current].filter(Boolean))) as string[];
  };

  const backupCard = (id: 'openrouter' | 'openai', title: string, keyHint: string, note: string) => {
    const b = cfg.backup?.[id] || {};
    return <div className="ops-card" key={id} style={{ border: b.enabled ? '1px solid #2e6b57' : undefined }}>
      <div className="ops-row">
        <h3 style={{ margin: 0 }}>{title}</h3>
        <label style={{ display: 'flex', gap: 8, alignItems: 'center', marginInlineStart: 'auto' }}>
          <input type="checkbox" checked={b.enabled === true} onChange={e => setBackup(id, { enabled: e.target.checked })} />
          {t('فعال', 'Enable', 'Etkin', 'Включить')}
        </label>
      </div>
      <p className="ops-muted" style={{ marginTop: 4 }}>{note}</p>
      <div className="ops-form-grid">
        <label>{t('کلید API', 'API key', 'API anahtarı', 'API-ключ')}
          <input type="password" dir="ltr" placeholder={b.apiKey ? '********' : keyHint} value={b.apiKey === '********' ? '' : (b.apiKey || '')} onChange={e => setBackup(id, { apiKey: e.target.value || '********' })} />
        </label>
        <label>{t('مدل — جستجو کنید', 'Model — searchable', 'Model — ara', 'Модель (поиск)')}
          <ModelPicker t={t} value={b.model || ''} options={modelOptions(id, b.model || '')} onChange={(m: string) => setBackup(id, { model: m })} />
        </label>
        <label>{t('مدل سفارشی (اگر در فهرست نیست)', 'Custom model', 'Özel model', 'Своя модель')}
          <input dir="ltr" value={cfg.backup?.custom?.[id] || ''} onChange={e => { setCfg((c: any) => ({ ...c, backup: { ...c.backup, custom: { ...(c.backup?.custom || {}), [id]: e.target.value } } })); if (e.target.value) setBackup(id, { model: e.target.value }); }} />
        </label>
        <label>{t('سقف فراخوانی روزانه (بودجهٔ جدا)', 'Daily call cap (separate budget)', 'Günlük limit', 'Дневной лимит')}
          <input type="number" min={10} max={100000} value={b.dailyCallCap ?? 50} onChange={e => setBackup(id, { dailyCallCap: Number(e.target.value) })} />
        </label>
      </div>
      <div className="ops-toolbar">
        <button disabled={busy} onClick={() => void fetchModels(id)}>{t(`دریافت فهرست مدل‌ها از ${title}`, `Fetch models from ${title}`, `${title} modelleri`, `Получить модели ${title}`)}</button>
        {models[id]?.length ? <span className="ops-muted">{t(`${models[id].length} مدل`, `${models[id].length} models`, `${models[id].length} model`, `${models[id].length} моделей`)}</span> : ''}
        {(state?.suggestedModels?.[id] || []).map((m: any) => <span key={m.id} className="ops-muted" title={m.note} style={{ cursor: 'pointer', textDecoration: 'underline', textDecorationStyle: 'dotted' }} onClick={() => setBackup(id, { model: m.id })}>{m.id}</span>)}
      </div>
      {id === 'openrouter' && toolModels[id] ? (toolModels[id]!.includes(b.model)
          ? <p className="ops-muted" style={{ color: '#7de8bd', margin: '4px 0 0' }}>✓ {t('مدل انتخابی فراخوانی ابزار دارد.', 'Selected model supports tool calling.', 'Model araç çağrısını destekliyor.', 'Модель поддерживает вызов инструментов.')}</p>
          : <p className="ops-muted" style={{ color: '#ffd98a', margin: '4px 0 0' }}>⚠ {t('مدل انتخابی در فهرست مدل‌های دارای فراخوانی ابزار نیست — برای چتِ پشتیبان مدل دارای ابزار انتخاب کنید (پیشنهادها بالای همین کادر).', 'Selected model is NOT in the tool-calling list — pick a tool-capable model for backup chat.', 'Seçilen model araç çağrısını desteklemiyor.', 'Выбранная модель не поддерживает вызов инструментов.')}</p>)
        : ''}
    </div>;
  };

  return <div>
    <div className="ops-card">
      <Notice error={error} />
      {saved && <p style={{ color: '#7de8bd' }}>{t('تنظیمات ذخیره شد.', 'Settings saved.', 'Ayarlar kaydedildi.', 'Настройки сохранены.')}</p>}
      <h3 style={{ marginTop: 0 }}>{t('موتور اصلی — Groq', 'Primary engine — Groq', 'Ana motor — Groq', 'Основной движок — Groq')}</h3>
      <div className="ops-form-grid">
        <label>{t('کلید API سرویس Groq (رایگان: console.groq.com)', 'Groq API key (free: console.groq.com)', 'Groq API anahtarı', 'API-ключ Groq')}
          <input type="password" dir="ltr" placeholder={cfg.apiKey ? '********' : 'gsk_…'} value={cfg.apiKey === '********' ? '' : (cfg.apiKey || '')} onChange={e => setCfg({ ...cfg, apiKey: e.target.value || '********' })} />
        </label>
        <label>{t('مدل اصلی — جستجو کنید (پیشنهادی: openai/gpt-oss-120b)', 'Main model — searchable', 'Ana model', 'Основная модель (поиск)')}
          <ModelPicker t={t} value={cfg.model} options={modelOptions('groq', cfg.model)} onChange={(m: string) => setCfg({ ...cfg, model: m })} />
        </label>
        <label>{t('مدل سبک (پشتیبان هنگام محدودیت نرخ) — جستجو کنید', 'Light fallback model — searchable', 'Hafif model', 'Лёгкая модель (поиск)')}
          <ModelPicker t={t} value={cfg.lightModel} options={modelOptions('groq', cfg.lightModel)} onChange={(m: string) => setCfg({ ...cfg, lightModel: m })} />
        </label>
        <label>{t('سقف فراخوانی روزانه LLM', 'Daily LLM call cap', 'Günlük limit', 'Дневной лимит')}
          <input type="number" min={10} max={100000} value={cfg.dailyCallCap} onChange={e => setCfg({ ...cfg, dailyCallCap: Number(e.target.value) })} />
        </label>
        <label>{t('مدل سفارشی (پلن پولی — اگر مدل موردنظر در فهرست نیست اینجا بنویسید)', 'Custom model (paid plan)', 'Özel model', 'Своя модель')}
          <input dir="ltr" placeholder="e.g. llama-3.3-70b-specdec" value={cfg.customModel || ''} onChange={e => setCfg({ ...cfg, model: e.target.value || cfg.model, customModel: e.target.value })} />
        </label>
      </div>
      <div className="ops-toolbar">
        <button disabled={busy} onClick={() => void fetchModels('groq')}>{t('دریافت فهرست مدل‌ها از Groq', 'Fetch model list from Groq', 'Model listesini al', 'Получить список моделей')}</button>
        {models.groq?.length ? <span className="ops-muted">{t(`${models.groq.length} مدل`, `${models.groq.length} models`, `${models.groq.length} model`, `${models.groq.length} моделей`)}</span> : ''}
      </div>
    </div>
    <h3>{t('ارائه‌دهنده‌های پشتیبان — فقط امور پشتیبانی', 'Backup providers — support-only', 'Yedek sağlayıcılar — sadece destek', 'Резервные провайдеры — только поддержка')}</h3>
    <p className="ops-muted">{t('پشتیبان‌ها فقط وقتی فعال می‌شوند که Groq پاسخ ندهد (محدودیت نرخ/سقف روزانه/خطا). در حالت پشتیبان فقط تیکت‌ها، پیام‌ها و نظارت پورتال پاسخ داده می‌شود؛ سایر امکانات (بریف بازاریابی، محتوا، کردیت، کوپن و…) متوقف و به ادمین گزارش می‌شوند. هر پشتیبان بودجهٔ روزانهٔ جدا دارد.', 'Backups engage only when Groq cannot answer. In backup mode only tickets, messages and portal monitoring are served; everything else pauses and is reported to the admin. Each backup has its own daily budget.', 'Yedekler yalnızca Groq yanıt veremediğinde devreye girer.', 'Резервы включаются только когда Groq не отвечает.')}</p>
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16 }}>
      {backupCard('openrouter', 'OpenRouter', 'sk-or-…', t('پشتیبان ۱ — مدل‌های رایگان با پسوند :free (حدود ۵۰ درخواست/روز؛ با شارژ ۱۰$ تا ۱۰۰۰ درخواست/روز). کلید: openrouter.ai/keys', 'Backup #1 — free models end with :free (≈50 req/day; 1,000/day with $10 credits). Key: openrouter.ai/keys', 'Yedek 1 — ücretsiz modeller :free ile biter.', 'Резерв 1 — бесплатные модели с суффиксом :free (≈50 запросов/день).'))}
      {backupCard('openai', 'OpenAI', 'sk-…', t('پشتیبان ۲ — پولی (pay-as-you-go)؛ ارزان‌ترین گزینه‌های با فراخوانی ابزار: gpt-4o-mini و gpt-4.1-nano. کلید: platform.openai.com/api-keys', 'Backup #2 — paid pay-as-you-go; cheapest tool-calling models: gpt-4o-mini, gpt-4.1-nano. Key: platform.openai.com/api-keys', 'Yedek 2 — ücretli; en ucuz: gpt-4o-mini.', 'Резерв 2 — платный; самые дешёвые: gpt-4o-mini, gpt-4.1-nano.'))}
    </div>
    <div className="ops-card" style={{ marginTop: 16 }}>
      <h3 style={{ marginTop: 0 }}>{t('اتوماسیون', 'Automation', 'Otomasyon', 'Автоматизация')}</h3>
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
      <p className="ops-muted">{t('توجه: بریف روزانه و دایجست هفتگی «بازاریابی» هستند و در حالت پشتیبان اجرا نمی‌شوند؛ پیشنهاد دایرکت و پاسخ تیکت «پشتیبانی» هستند و روی پشتیبان هم اجرا می‌شوند.', 'Note: the marketing brief/digest never run on backups; DM/ticket drafts are support work and do.', 'Not: pazarlama brifleri yedekte çalışmaz.', 'Примечание: маркетинговые брифы не выполняются на резервах.')}</p>
      <div className="ops-toolbar">
        <button className="ops-primary" disabled={busy} onClick={() => void save()}>{t('ذخیره تنظیمات', 'Save settings', 'Kaydet', 'Сохранить')}</button>
        <button disabled={busy} onClick={() => void api('/jarvis/jobs/igReplies', 'POST', {}).catch(() => {})}>{t('اجرا الان: دایرکت‌ها', 'Run now: DM drafts', 'Şimdi çalıştır', 'Запустить сейчас')}</button>
        <button disabled={busy} onClick={() => void api('/jarvis/jobs/chatFaq', 'POST', {}).catch(() => {})}>{t('اجرا الان: تیکت‌ها', 'Run now: tickets', 'Şimdi: biletler', 'Сейчас: тикеты')}</button>
      </div>
      <p className="ops-muted">{t('کلید هرگز پس از ذخیره نمایش داده نمی‌شود؛ برای تغییر، مقدار تازه بنویسید. دسترسی جارویس به کلیدها/توکن‌ها/مديريت اپراتورها/ريست دیتابیس به‌طور طراحی مسدود است.', 'Keys are never shown after save. Jarvis is designed to never touch keys/tokens/operator management/database resets.', 'Anahtarlar kayıttan sonra gösterilmez.', 'Ключи не показываются после сохранения.')}</p>
    </div>
  </div>;
}
