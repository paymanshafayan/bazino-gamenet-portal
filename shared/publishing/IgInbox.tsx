import React, { useState, useEffect, useCallback } from 'react';
import { useCopy, Field, Toggle, ErrorNotice, StateBadge } from './ui';
import './studio.css';

/** Instagram inbox + away auto-reply (admin only).
 *  Replaces Meta's "Away message": the portal records every inbound DM and,
 *  inside the away window, replies once per conversation in the sender's own
 *  language (fa/en/tr/ru detected from the message text).
 *  Admins can edit each language's text and reset any of them (or all) back
 *  to the operator-approved defaults via the ↺ buttons. */
export function IgInboxTab() {
  const { api, tr, language } = useCopy();
  const [items, setItems] = useState<any[]>([]);
  const [cfg, setCfg] = useState<any>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);

  const reload = useCallback(async () => {
    try {
      const [d, s] = await Promise.all([api('/publishing/ig-inbox'), api('/publishing/ig-away')]);
      setItems(d.items || []); setCfg(s); setError('');
    } catch (e: any) { setError(e.code || e.message); }
  }, [api]);
  useEffect(() => { void reload(); }, [reload]);

  async function save() {
    setBusy(true); setError(''); setSaved(false);
    try {
      const r = await api('/publishing/ig-away', 'PUT', cfg.settings);
      setCfg({ ...cfg, settings: r }); setSaved(true);
    } catch (e: any) { setError(e.code || e.message); } finally { setBusy(false); }
  }

  if (!cfg) return <p className="pub-muted">{tr(['در حال دریافت…', 'Loading…', 'Yükleniyor…', 'Загрузка…'])}</p>;
  const s = cfg.settings;
  const set = (patch: any) => setCfg({ ...cfg, settings: { ...s, ...patch } });
  const hours = Array.from({ length: 24 }, (_v, h) => h);

  return <>
    <div className="pub-section-title">
      <h2>{tr(['پیام‌های دریافتی اینستاگرام', 'Instagram inbox', 'Instagram gelen kutusu', 'Входящие Instagram'])}</h2>
      <span className="pub-muted">{s.enabled
        ? (cfg.nowActive
          ? tr(['پاسخ خودکار همین حالا فعال است', 'Auto-reply is active right now', 'Otomatik yanıt şu an aktif', 'Автоответ сейчас активен'])
          : tr(['خارج از ساعت پاسخ', 'Outside the reply window', 'Yanıt penceresi dışında', 'Вне окна ответов']))
        : tr(['پاسخ خودکار خاموش است', 'Auto-reply is off', 'Otomatik yanıt kapalı', 'Автоответ выключен'])}</span>
    </div>

    <section className="pub-card">
      <Toggle label={tr(['پاسخ خودکار ساعات غیبت', 'Away auto-reply', 'Uzakta otomatik yanıt', 'Автоответ в часы отсутствия'])} checked={!!s.enabled} onChange={v => set({ enabled: v })} />
      <div className="pub-form-grid">
        <Field label={tr(['ساعت شروع (به وقت قبرس)', 'Start hour (Cyprus time)', 'Başlangıç saati (Kıbrıs)', 'Начало (по Кипру)'])}>
          <select value={s.startHour} onChange={e => set({ startHour: Number(e.target.value) })}>
            {hours.map(h => <option key={h} value={h}>{String(h).padStart(2, '0')}:00</option>)}
          </select>
        </Field>
        <Field label={tr(['ساعت پایان (به وقت قبرس)', 'End hour (Cyprus time)', 'Bitiş saati (Kıbrıs)', 'Конец (по Кипру)'])}>
          <select value={s.endHour} onChange={e => set({ endHour: Number(e.target.value) })}>
            {hours.map(h => <option key={h} value={h}>{String(h).padStart(2, '0')}:00</option>)}
          </select>
        </Field>
        <Field label={tr(['سقف پاسخ روزانه', 'Daily reply cap', 'Günlük yanıt limiti', 'Дневной лимит ответов'])}>
          <input type="number" min={1} max={1000} value={s.dailyCap} onChange={e => set({ dailyCap: Number(e.target.value) })} />
        </Field>
        <Field label={tr(['حداقل فاصله بین دو پاسخ به یک گفتگو (ساعت)', 'Min gap per conversation (hours)', 'Aynı sohbette min aralık (saat)', 'Мин. интервал в диалоге (ч)'])}>
          <input type="number" min={1} max={168} value={s.perConversationHours} onChange={e => set({ perConversationHours: Number(e.target.value) })} />
        </Field>
      </div>
      <p className="pub-note">{tr(['پاسخ فقط برای پیام‌های ورودی اینستاگرام ارسال می‌شود؛ هر گفتگو در هر بازه یک بار پاسخ می‌گیرد و پیام‌های جریان کمپین (دکمهٔ دوست/همکار) پاسخ اضافه نمی‌گیرند.', 'Replies go to inbound Instagram DMs only; each conversation gets at most one reply per window, and campaign-flow messages (friend/partner button) never get an extra reply.', 'Yanıtlar yalnızca gelen Instagram mesajlarına gider; her sohbet pencere başına en fazla bir yanıt alır, kampanya akışı mesajları ek yanıt almaz.', 'Ответы отправляются только входящим DM Instagram; каждый диалог получает максимум один ответ за окно, сообщения кампании не получают лишних ответов.'])}</p>
      {(['fa', 'en', 'tr', 'ru'] as const).map(l => (
        <div className="pub-field" key={l}>
          <span className="pub-away-label">
            {tr([`متن پاسخ (${l.toUpperCase()})`, `Reply text (${l.toUpperCase()})`, `Yanıt metni (${l.toUpperCase()})`, `Текст ответа (${l.toUpperCase()})`])}
            <button type="button" className="pub-secondary pub-away-reset" data-away-reset={l}
              title={tr(['حذف متن سفارشی و بازگردانی پیش‌فرض', 'Delete custom text and restore the default', 'Özel metni sil ve varsayılana dön', 'Удалить свой текст и вернуть стандартный'])}
              onClick={() => set({ messages: { ...s.messages, [l]: cfg.defaults?.[l] ?? s.messages[l] } })}>
              ↺ {tr(['پیش‌فرض', 'Default', 'Varsayılan', 'По умолчанию'])}
            </button>
          </span>
          <textarea rows={3} value={s.messages[l]} onChange={e => set({ messages: { ...s.messages, [l]: e.target.value } })} dir={l === 'fa' ? 'rtl' : 'ltr'} />
        </div>
      ))}
      <div className="pub-actions">
        <button className="pub-primary" disabled={busy} onClick={save}>{tr(['ذخیره تغییرات', 'Save changes', 'Kaydet', 'Сохранить'])}</button>
        <button type="button" className="pub-secondary" disabled={busy} data-away-reset-all
          onClick={() => set({ messages: { ...(cfg.defaults || s.messages) } })}>
          ↺ {tr(['حذف همهٔ متن‌های سفارشی', 'Reset all texts', 'Tümünü sıfırla', 'Сбросить все'])}
        </button>
      </div>
      {saved && <p className="pub-success">{tr(['تنظیمات ذخیره شد', 'Settings saved', 'Ayarlar kaydedildi', 'Настройки сохранены'])}</p>}
      <ErrorNotice error={error} />
    </section>

    <section className="pub-card">
      <h2>{tr(['آخرین پیام‌های دریافتی', 'Recent inbound messages', 'Son gelen mesajlar', 'Последние входящие'])}</h2>
      <div className="pub-table-scroll">
        <table>
          <thead>
            <tr>{[
              tr(['زمان', 'Time', 'Zaman', 'Время']),
              tr(['کاربر', 'User', 'Kullanıcı', 'Пользователь']),
              tr(['زبان', 'Lang', 'Dil', 'Язык']),
              tr(['پیام', 'Message', 'Mesaj', 'Сообщение']),
              tr(['پاسخ خودکار', 'Auto-reply', 'Otomatik yanıt', 'Автоответ']),
            ].map((h, i) => <th key={i}>{h}</th>)}</tr>
          </thead>
          <tbody>
            {items.map((m: any) => (
              <tr key={m.id}>
                <td dir="ltr">{m.receivedAt ? new Date(m.receivedAt).toLocaleString(language === 'fa' ? 'fa-IR' : language) : '—'}</td>
                <td dir="ltr">@{m.username || m.authorId}</td>
                <td>{String(m.language || '').toUpperCase()}</td>
                <td className="pub-muted">{String(m.text || '').slice(0, 120)}</td>
                <td>{m.replied ? <StateBadge value="sent" /> : <span className="pub-muted">{m.reason || '—'}</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!items.length && <div className="pub-empty">{tr(['هنوز پیامی دریافت نشده است', 'No messages received yet', 'Henüz mesaj yok', 'Сообщений пока нет'])}</div>}
      </div>
    </section>
  </>;
}
