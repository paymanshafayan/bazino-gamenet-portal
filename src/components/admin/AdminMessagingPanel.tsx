/**
 * Batch 12 — Bulk marketing messaging panel (website admin → "پیامک گروهی").
 * Sends promotional campaigns over the Messaggio multichannel gateway across
 * SMS / Viber / WhatsApp. Backend: /api/management/messaging/* (permission 'promotions').
 * Channels without configured credentials run in the simulator (clearly marked).
 */
import React, { useCallback, useEffect, useState } from 'react';
import { MessageSquare, Smartphone, Send, Users, CheckCircle2, AlertCircle, Loader2, Radio } from 'lucide-react';
import { L } from '../../utils/i18n';

type Channel = 'sms' | 'viber' | 'whatsapp';
interface Config { login: boolean; sms: { code: boolean; available: boolean }; viber: { code: boolean; available: boolean }; whatsapp: { code: boolean; available: boolean }; }
interface Audience { count: number; sample: string[]; }
interface ChRes { channel: Channel; ok: boolean; sent: number; simulated: boolean; error?: string; }
interface Campaign { id: string; createdAt: string; channels: Channel[]; recipientCount: number; simulated: boolean; results: ChRes[]; smsText?: string; }

const card = 'bg-dark-card border border-white/10 rounded-2xl p-6';
const inp = 'w-full bg-[#0d122b] border border-white/10 rounded-lg px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-primary font-bold';

export default function AdminMessagingPanel(props: { language: string; notify: (m: string, t: 'success' | 'error' | 'info') => void }) {
  const { language, notify } = props;
  const [config, setConfig] = useState<Config | null>(null);
  const [audience, setAudience] = useState<Audience>({ count: 0, sample: [] });
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [channels, setChannels] = useState<Channel[]>(['sms']);
  const [phones, setPhones] = useState('');
  const [useAudience, setUseAudience] = useState(true);
  const [smsText, setSmsText] = useState('');
  const [viberText, setViberText] = useState('');
  const [waMode, setWaMode] = useState<'text' | 'template'>('text');
  const [waText, setWaText] = useState('');
  const [waTemplate, setWaTemplate] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try { setConfig(await (await fetch('/api/management/messaging/config')).json()); } catch { /* */ }
    try { setAudience(await (await fetch('/api/management/messaging/audience')).json()); } catch { /* */ }
    try { setCampaigns(await (await fetch('/api/management/messaging/campaigns')).json()); } catch { /* */ }
  }, []);
  useEffect(() => { void load(); }, [load]);

  const toggle = (c: Channel) => setChannels(cs => cs.includes(c) ? cs.filter(x => x !== c) : [...cs, c]);

  const manualCount = phones.split(/[\s,;\n]+/).filter(p => p.replace(/\D/g, '').length >= 8).length;

  const send = async () => {
    if (!channels.length) return notify(L(language, { fa: 'حداقل یک کانال انتخاب کنید', en: 'Pick at least one channel', ru: 'Выберите канал', tr: 'En az bir kanal seçin' }), 'error');
    if (useAudience === false && manualCount === 0) return notify(L(language, { fa: 'گیرنده‌ای وارد نشده است', en: 'No recipients', ru: 'Нет получателей', tr: 'Alıcı yok' }), 'error');
    if (channels.includes('sms') && !smsText.trim()) return notify(L(language, { fa: 'متن پیامک لازم است', en: 'SMS text is required', ru: 'Нужен текст SMS', tr: 'SMS metni gerekli' }), 'error');
    const body: any = {
      channels, phones: phones.split(/[\s,;\n]+/), useAudience,
      smsText, viberText: viberText || smsText,
    };
    if (channels.includes('whatsapp')) {
      if (waMode === 'template') { body.whatsappTemplateId = waTemplate.trim(); body.whatsappLang = 'en'; }
      else body.whatsappText = waText || viberText || smsText;
    }
    setBusy(true);
    try {
      const res = await fetch('/api/management/messaging/send', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      notify(L(language, { fa: 'کمپین ارسال شد', en: 'Campaign sent', ru: 'Кампания отправлена', tr: 'Kampanya gönderildi' }), 'success');
      setSmsText(''); setViberText(''); setWaText('');
      await load();
    } catch (e: any) {
      notify(e.message || 'error', 'error');
    } finally { setBusy(false); }
  };

  const chMeta: { key: Channel; label: string; icon: React.ReactNode; ready?: boolean; code?: boolean }[] = [
    { key: 'sms', label: 'پیامک SMS', icon: <Smartphone className="w-4 h-4" />, ready: config?.sms.available, code: config?.sms.code },
    { key: 'viber', label: 'وایبر Viber', icon: <MessageSquare className="w-4 h-4" />, ready: config?.viber.available, code: config?.viber.code },
    { key: 'whatsapp', label: 'واتساپ WhatsApp', icon: <MessageSquare className="w-4 h-4" />, ready: config?.whatsapp.available, code: config?.whatsapp.code },
  ];

  return (
    <div className="flex flex-col gap-6">
      {/* Config banner */}
      <div className={`${card} flex flex-col gap-3`}>
        <h3 className="text-sm font-bold text-white flex items-center gap-2 font-display uppercase tracking-wider">
          <Radio className="w-4 h-4 text-primary" />{L(language, { fa: 'وضعیت اتصال مساجیو (Messaggio)', en: 'Messaggio gateway status', ru: 'Шлюз Messaggio', tr: 'Messaggio bağlantı durumu' })}
        </h3>
        {!config ? <div className="flex justify-center py-4 text-primary"><Loader2 className="w-6 h-6 animate-spin" /></div> : (
          <div className="flex flex-wrap gap-3 text-[11px] font-bold">
            <span className={`px-3 py-1.5 rounded-lg border flex items-center gap-1.5 ${config.login ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20' : 'bg-rose-500/10 text-rose-300 border-rose-500/20'}`}>
              {config.login ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
              {L(language, { fa: 'لاجین پروژه', en: 'Project login', ru: 'Логин проекта', tr: 'Proje girişi' })}: {config.login ? '✓' : '✗'}
            </span>
            {chMeta.map(m => (
              <span key={m.key} className={`px-3 py-1.5 rounded-lg border flex items-center gap-1.5 ${m.ready ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20' : 'bg-amber-500/10 text-amber-300 border-amber-500/20'}`}>
                {m.icon}{m.label}: {m.ready ? L(language, { fa: 'آماده', en: 'ready', ru: 'готов', tr: 'hazır' }) : L(language, { fa: 'شبیه‌ساز', en: 'simulator', ru: 'симулятор', tr: 'simülasyon' })}
              </span>
            ))}
          </div>
        )}
        <p className="text-[10px] text-gray-500 leading-relaxed">
          {L(language, {
            fa: 'سکرت‌ها روی سرور (متغیرهای محیطی MESSAGGIO_PROJECT_LOGIN و کد فرستندهٔ هر کانال) تنظیم می‌شوند. کانالی که کد فرستنده نداشته باشد در حالت شبیه‌ساز پیام می‌فرستد (پیام واقعی نمی‌رود). واتساپ خارج از پنجرهٔ ۲۴ساعته به قالب (template) تأییدشده نیاز دارد.',
            en: 'Secrets are set server-side (env MESSAGGIO_PROJECT_LOGIN + per-channel sender codes). A channel without a sender code runs in the simulator (no real send). WhatsApp outside the 24h window needs an approved template.',
            ru: 'Секреты задаются на сервере (env MESSAGGIO_PROJECT_LOGIN и коды отправителей). Канал без кода работает в симуляторе. WhatsApp вне 24ч-окна требует шаблон.',
            tr: 'Gizli anahtarlar sunucuda ayarlanır (env MESSAGGIO_PROJECT_LOGIN + kanal gönderen kodları). Kodu olmayan kanal simülasyonda çalışır. WhatsApp 24 saat dışı şablon ister.',
          })}
        </p>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Composer */}
        <div className="lg:col-span-2 flex flex-col gap-5">
          {/* Channels */}
          <div className={card}>
            <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2"><MessageSquare className="w-4 h-4 text-primary" />{L(language, { fa: 'انتخاب کانال‌ها', en: 'Channels', ru: 'Каналы', tr: 'Kanallar' })}</h3>
            <div className="grid grid-cols-3 gap-3">
              {chMeta.map(m => {
                const on = channels.includes(m.key);
                return (
                  <button key={m.key} type="button" onClick={() => toggle(m.key)}
                    className={`rounded-xl border p-4 flex flex-col items-center gap-2 transition-all cursor-pointer ${on ? 'bg-primary text-black border-primary shadow-[0_0_15px_rgba(0,240,255,0.3)]' : 'bg-[#0d122b] text-gray-300 border-white/10 hover:border-primary/40'}`}>
                    {m.icon}
                    <span className="text-[11px] font-black">{m.label.split(' ')[0]}</span>
                    <span className={`text-[9px] font-bold ${on ? 'text-black/70' : m.ready ? 'text-emerald-400' : 'text-amber-400'}`}>{m.ready ? 'LIVE' : 'SIM'}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Recipients */}
          <div className={card}>
            <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2"><Users className="w-4 h-4 text-primary" />{L(language, { fa: 'گیرنده‌ها', en: 'Recipients', ru: 'Получатели', tr: 'Alıcılar' })}</h3>
            <label className="flex items-center gap-2 mb-3 cursor-pointer">
              <input type="checkbox" checked={useAudience} onChange={e => setUseAudience(e.target.checked)} className="accent-[#00f0ff] w-4 h-4" />
              <span className="text-xs text-gray-200 font-bold">
                {L(language, { fa: `ارسال به اعضای تأییدشده با OTP (${audience.count} شماره)`, en: `Send to OTP-verified audience (${audience.count})`, ru: `Всем по OTP (${audience.count})`, tr: `OTP doğrulamalı kitle (${audience.count})` })}
              </span>
            </label>
            <label className="text-xs text-gray-400 block mb-1.5 font-bold">{L(language, { fa: 'شماره‌های دستی (با خط فاصله/کاما/خط جدید)', en: 'Manual numbers (comma/space/newline)', ru: 'Вручную (запятая/пробел/строка)', tr: 'Manuel numaralar (virgül/boşluk/satır)' })}</label>
            <textarea rows={3} value={phones} onChange={e => setPhones(e.target.value)} placeholder="0912…, +90532…" className={`${inp} resize-none font-mono`} />
            <p className="text-[10px] text-gray-500 mt-1.5">{L(language, { fa: `${manualCount} شماره معتبر دستی`, en: `${manualCount} valid manual numbers`, ru: `${manualCount} вручную`, tr: `${manualCount} manuel` })}</p>
          </div>

          {/* Content */}
          <div className={card}>
            <h3 className="text-sm font-bold text-white mb-4">{L(language, { fa: 'محتوای پیام', en: 'Message content', ru: 'Содержание', tr: 'Mesaj içeriği' })}</h3>
            <div className="flex flex-col gap-4">
              {channels.includes('sms') && (
                <div>
                  <label className="text-xs text-gray-400 block mb-1.5 font-bold">SMS</label>
                  <textarea rows={3} value={smsText} onChange={e => setSmsText(e.target.value)} className={`${inp} resize-none`} placeholder={L(language, { fa: 'متن پیامک…', en: 'SMS text…', ru: 'Текст SMS…', tr: 'SMS metni…' })} />
                </div>
              )}
              {channels.includes('viber') && (
                <div>
                  <label className="text-xs text-gray-400 block mb-1.5 font-bold">Viber {L(language, { fa: '(خالی = همان متن پیامک)', en: '(empty = SMS text)', ru: '(пусто = текст SMS)', tr: '(boş = SMS metni)' })}</label>
                  <textarea rows={3} value={viberText} onChange={e => setViberText(e.target.value)} className={`${inp} resize-none`} />
                </div>
              )}
              {channels.includes('whatsapp') && (
                <div className="rounded-lg border border-white/10 p-3 flex flex-col gap-3">
                  <div className="flex gap-2">
                    <button type="button" onClick={() => setWaMode('text')} className={`px-3 py-1.5 rounded text-[11px] font-black cursor-pointer ${waMode === 'text' ? 'bg-primary text-black' : 'bg-white/5 text-gray-300'}`}>{L(language, { fa: 'متن آزاد', en: 'Free text', ru: 'Своб. текст', tr: 'Serbest metin' })}</button>
                    <button type="button" onClick={() => setWaMode('template')} className={`px-3 py-1.5 rounded text-[11px] font-black cursor-pointer ${waMode === 'template' ? 'bg-primary text-black' : 'bg-white/5 text-gray-300'}`}>{L(language, { fa: 'قالب (Template)', en: 'Template', ru: 'Шаблон', tr: 'Şablon' })}</button>
                  </div>
                  {waMode === 'text'
                    ? <textarea rows={3} value={waText} onChange={e => setWaText(e.target.value)} className={`${inp} resize-none`} placeholder={L(language, { fa: 'متن واتساپ (فقط در پنجرهٔ ۲۴ساعته)…', en: 'WhatsApp text (24h window only)…', ru: 'Текст WhatsApp (24ч окно)…', tr: 'WhatsApp metni (24 saat)…' })} />
                    : <input value={waTemplate} onChange={e => setWaTemplate(e.target.value)} className={inp} placeholder={L(language, { fa: 'شناسه قالب تأییدشده در مساجیو', en: 'Approved template id in Messaggio', ru: 'ID шаблона в Messaggio', tr: 'Messaggio şablon id' })} />}
                </div>
              )}
              <button onClick={send} disabled={busy}
                className="w-full py-3.5 bg-primary text-black font-black uppercase tracking-wider rounded-lg shadow-[0_0_20px_rgba(0,240,255,0.3)] hover:bg-primary-hover border-2 border-primary transition-all text-xs cursor-pointer disabled:opacity-60 flex items-center justify-center gap-2">
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                {L(language, { fa: 'ارسال کمپین', en: 'Send campaign', ru: 'Отправить кампанию', tr: 'Kampanya gönder' })}
              </button>
            </div>
          </div>
        </div>

        {/* History */}
        <div className={card}>
          <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-primary" />{L(language, { fa: 'کمپین‌های اخیر', en: 'Recent campaigns', ru: 'Недавние кампании', tr: 'Son kampanyalar' })}</h3>
          {!campaigns.length ? <p className="text-xs text-gray-500 py-6 text-center">—</p> : (
            <div className="flex flex-col gap-2 max-h-[600px] overflow-y-auto">
              {campaigns.slice(0, 20).map(c => (
                <div key={c.id} className="rounded-lg bg-[#0a0e21] border border-white/5 p-3 text-[11px]">
                  <div className="flex justify-between items-center mb-1.5">
                    <span className="font-black text-white font-mono">{c.recipientCount}×</span>
                    <span className={`px-2 py-0.5 rounded text-[9px] font-black ${c.simulated ? 'bg-amber-500/15 text-amber-300' : 'bg-emerald-500/15 text-emerald-300'}`}>{c.simulated ? 'SIM' : 'LIVE'}</span>
                  </div>
                  <div className="flex gap-1 mb-1.5">{c.channels.map(ch => <span key={ch} className="px-1.5 py-0.5 rounded bg-white/5 text-gray-300 text-[9px] font-bold">{ch}</span>)}</div>
                  {c.results.map(r => (
                    <div key={r.channel} className={`flex justify-between ${r.ok ? 'text-gray-400' : 'text-rose-400'}`}>
                      <span>{r.channel}</span>
                      <span className="font-mono">{r.ok ? `${r.sent}${r.simulated ? ' (sim)' : ''}` : r.error?.slice(0, 24)}</span>
                    </div>
                  ))}
                  {c.smsText && <p className="text-gray-500 mt-1.5 truncate">{c.smsText}</p>}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
