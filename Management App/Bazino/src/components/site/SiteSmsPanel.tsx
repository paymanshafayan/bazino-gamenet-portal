/**
 * تب «پیامک گروهی» در WebSyncModal — همان بخش پیامک گروهی پنل ادمین وب:
 * وضعیت درگاه مساجیو، انتخاب کانال (SMS/Viber/WhatsApp)، گیرنده‌ها (اعضای OTP یا
 * شماره‌های دستی)، متن پیام و تاریخچهٔ کمپین‌ها. کانال بدون کد فرستنده در
 * شبیه‌ساز ارسال می‌کند (مثل پنل وب).
 * مسیرها: GET /api/sync/messaging/overview ، POST /api/sync/messaging/send
 */
import React, { useCallback, useEffect, useState } from 'react';
import { Radio, Smartphone, MessageSquare, Send, Users, Loader2, AlertCircle, CheckCircle2, RefreshCw } from 'lucide-react';
import { siteFetch, prettySiteError } from '../../utils/siteClient';

interface Props {
  webServerUrl: string;
  apiKey: string;
}

type Channel = 'sms' | 'viber' | 'whatsapp';
interface ChannelState { code: boolean; available: boolean; }
interface Config { login: boolean; sms: ChannelState; viber: ChannelState; whatsapp: ChannelState; }
interface Audience { count: number; sample: string[]; }
interface ChRes { channel: Channel; ok: boolean; sent: number; simulated: boolean; error?: string; }
interface Campaign { id: string; createdAt: string; channels: Channel[]; recipientCount: number; simulated: boolean; results: ChRes[]; smsText?: string; }

export const SiteSmsPanel: React.FC<Props> = ({ webServerUrl, apiKey }) => {
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
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const d = await siteFetch(webServerUrl, apiKey, '/api/sync/messaging/overview');
      setConfig(d.config || null);
      setAudience(d.audience || { count: 0, sample: [] });
      setCampaigns(d.campaigns || []);
    } catch (err) {
      setError(prettySiteError(err));
    } finally {
      setLoading(false);
    }
  }, [webServerUrl, apiKey]);

  useEffect(() => { void load(); }, [load]);

  const toggle = (c: Channel) => setChannels((cs) => (cs.includes(c) ? cs.filter((x) => x !== c) : [...cs, c]));
  const manualCount = phones.split(/[\s,;\n]+/).filter((p) => p.replace(/\D/g, '').length >= 8).length;

  const send = async () => {
    setMsg(null);
    if (!channels.length) return setMsg({ ok: false, text: 'حداقل یک کانال انتخاب کنید.' });
    if (!useAudience && manualCount === 0) return setMsg({ ok: false, text: 'گیرنده‌ای وارد نشده است.' });
    if (channels.includes('sms') && !smsText.trim()) return setMsg({ ok: false, text: 'متن پیامک لازم است.' });
    const body: any = {
      channels,
      phones: phones.split(/[\s,;\n]+/),
      useAudience,
      smsText,
      viberText: viberText || smsText,
    };
    if (channels.includes('whatsapp')) {
      if (waMode === 'template') { body.whatsappTemplateId = waTemplate.trim(); body.whatsappLang = 'en'; }
      else body.whatsappText = waText || viberText || smsText;
    }
    setBusy(true);
    try {
      await siteFetch(webServerUrl, apiKey, '/api/sync/messaging/send', { method: 'POST', body });
      setMsg({ ok: true, text: 'کمپین ارسال شد.' });
      setSmsText(''); setViberText(''); setWaText('');
      void load();
    } catch (err) {
      setMsg({ ok: false, text: prettySiteError(err) });
    } finally {
      setBusy(false);
    }
  };

  const chMeta: { key: Channel; label: string; icon: React.ReactNode; ready?: boolean }[] = [
    { key: 'sms', label: 'پیامک SMS', icon: <Smartphone className="w-4 h-4" />, ready: config?.sms.available },
    { key: 'viber', label: 'وایبر Viber', icon: <MessageSquare className="w-4 h-4" />, ready: config?.viber.available },
    { key: 'whatsapp', label: 'واتساپ WhatsApp', icon: <MessageSquare className="w-4 h-4" />, ready: config?.whatsapp.available },
  ];

  const box = 'bg-zinc-900 border border-zinc-800 rounded-2xl p-4 space-y-3';

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Radio className="w-4 h-4 text-amber-400" />
          <h3 className="font-bold text-zinc-100">پیامک گروهی (مساجیو — SMS / وایبر / واتساپ)</h3>
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

      {/* وضعیت درگاه */}
      <div className={box}>
        <div className="flex items-center gap-2 text-zinc-200 font-bold text-xs">
          <Radio className="w-4 h-4 text-amber-400" /> وضعیت اتصال درگاه مساجیو
        </div>
        {!config ? (
          <div className="flex justify-center py-3"><Loader2 className="w-5 h-5 animate-spin text-amber-400" /></div>
        ) : (
          <div className="flex flex-wrap gap-2 text-[10px] font-bold">
            <span className={`px-2.5 py-1.5 rounded-lg border flex items-center gap-1.5 ${config.login ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30' : 'bg-rose-500/10 text-rose-300 border-rose-500/30'}`}>
              {config.login ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
              لاجین پروژه: {config.login ? '✓' : '✗'}
            </span>
            {chMeta.map((m) => (
              <span key={m.key} className={`px-2.5 py-1.5 rounded-lg border flex items-center gap-1.5 ${m.ready ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30' : 'bg-amber-500/10 text-amber-300 border-amber-500/30'}`}>
                {m.icon}{m.label}: {m.ready ? 'آماده' : 'شبیه‌ساز'}
              </span>
            ))}
          </div>
        )}
        <p className="text-[10px] text-zinc-500 leading-relaxed">
          سکرت‌ها روی سرور تنظیم می‌شوند. کانالی که کد فرستنده نداشته باشد در حالت شبیه‌ساز پیام می‌فرستد (پیام واقعی نمی‌رود). واتساپ خارج از پنجرهٔ ۲۴ساعته به قالب تأییدشده نیاز دارد.
        </p>
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          {/* کانال‌ها */}
          <div className={box}>
            <div className="flex items-center gap-2 text-zinc-200 font-bold text-xs"><MessageSquare className="w-4 h-4 text-amber-400" /> انتخاب کانال‌ها</div>
            <div className="grid grid-cols-3 gap-2">
              {chMeta.map((m) => {
                const on = channels.includes(m.key);
                return (
                  <button key={m.key} onClick={() => toggle(m.key)}
                    className={`rounded-xl border p-3 flex flex-col items-center gap-1.5 transition ${on ? 'bg-amber-500 text-zinc-950 border-amber-500' : 'bg-zinc-950 text-zinc-300 border-zinc-800 hover:border-amber-500/40'}`}>
                    {m.icon}
                    <span className="text-[10px] font-black">{m.label.split(' ')[0]}</span>
                    <span className={`text-[9px] font-bold ${on ? 'text-zinc-800' : m.ready ? 'text-emerald-400' : 'text-amber-400'}`}>{m.ready ? 'LIVE' : 'SIM'}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* گیرنده‌ها */}
          <div className={box}>
            <div className="flex items-center gap-2 text-zinc-200 font-bold text-xs"><Users className="w-4 h-4 text-amber-400" /> گیرنده‌ها</div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={useAudience} onChange={(e) => setUseAudience(e.target.checked)} className="accent-amber-500 w-4 h-4" />
              <span className="text-xs text-zinc-200 font-bold">ارسال به اعضای تأییدشده با OTP ({audience.count} شماره)</span>
            </label>
            <textarea rows={3} value={phones} onChange={(e) => setPhones(e.target.value)} dir="ltr"
              placeholder="0912…, +90532…"
              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-100 font-mono focus:outline-none focus:border-amber-500/50" />
            <p className="text-[10px] text-zinc-500">{manualCount} شمارهٔ معتبر دستی</p>
          </div>

          {/* متن پیام */}
          <div className={box}>
            <div className="text-zinc-200 font-bold text-xs">محتوای پیام</div>
            {channels.includes('sms') && (
              <div>
                <label className="text-[10px] text-zinc-500 font-bold block mb-1">متن پیامک</label>
                <textarea rows={3} value={smsText} onChange={(e) => setSmsText(e.target.value)}
                  placeholder="متن پیامک…"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-100 focus:outline-none focus:border-amber-500/50" />
              </div>
            )}
            {channels.includes('viber') && (
              <div>
                <label className="text-[10px] text-zinc-500 font-bold block mb-1">وایبر (خالی = همان متن پیامک)</label>
                <textarea rows={3} value={viberText} onChange={(e) => setViberText(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-100 focus:outline-none focus:border-amber-500/50" />
              </div>
            )}
            {channels.includes('whatsapp') && (
              <div className="rounded-xl border border-zinc-800 p-3 space-y-2">
                <div className="flex gap-2">
                  <button onClick={() => setWaMode('text')} className={`px-3 py-1.5 rounded text-[10px] font-black ${waMode === 'text' ? 'bg-amber-500 text-zinc-950' : 'bg-zinc-800 text-zinc-300'}`}>متن آزاد</button>
                  <button onClick={() => setWaMode('template')} className={`px-3 py-1.5 rounded text-[10px] font-black ${waMode === 'template' ? 'bg-amber-500 text-zinc-950' : 'bg-zinc-800 text-zinc-300'}`}>قالب (Template)</button>
                </div>
                {waMode === 'text' ? (
                  <textarea rows={3} value={waText} onChange={(e) => setWaText(e.target.value)}
                    placeholder="متن واتساپ (فقط در پنجرهٔ ۲۴ساعته)…"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-100 focus:outline-none focus:border-amber-500/50" />
                ) : (
                  <input value={waTemplate} onChange={(e) => setWaTemplate(e.target.value)} dir="ltr"
                    placeholder="شناسه قالب تأییدشده در مساجیو"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-100 font-mono focus:outline-none focus:border-amber-500/50" />
                )}
              </div>
            )}
            <button onClick={() => void send()} disabled={busy}
              className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-black rounded-lg text-xs flex items-center justify-center gap-2 disabled:opacity-60">
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              ارسال کمپین
            </button>
          </div>
        </div>

        {/* تاریخچهٔ کمپین‌ها */}
        <div className={box}>
          <div className="flex items-center gap-2 text-zinc-200 font-bold text-xs"><CheckCircle2 className="w-4 h-4 text-amber-400" /> کمپین‌های اخیر</div>
          {!campaigns.length ? (
            <p className="text-xs text-zinc-500 py-6 text-center">—</p>
          ) : (
            <div className="flex flex-col gap-2 max-h-[560px] overflow-y-auto">
              {campaigns.slice(0, 20).map((c) => (
                <div key={c.id} className="rounded-lg bg-zinc-950 border border-zinc-800 p-2.5 text-[10px]">
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-black text-zinc-100 font-mono">{c.recipientCount}×</span>
                    <span className={`px-2 py-0.5 rounded text-[9px] font-black ${c.simulated ? 'bg-amber-500/15 text-amber-300' : 'bg-emerald-500/15 text-emerald-300'}`}>
                      {c.simulated ? 'SIM' : 'LIVE'}
                    </span>
                  </div>
                  <div className="flex gap-1 mb-1 flex-wrap">
                    {c.channels.map((ch) => (
                      <span key={ch} className="px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300 text-[9px] font-bold">{ch}</span>
                    ))}
                  </div>
                  {c.results.map((r) => (
                    <div key={r.channel} className={`flex justify-between ${r.ok ? 'text-zinc-400' : 'text-rose-400'}`}>
                      <span>{r.channel}</span>
                      <span className="font-mono">{r.ok ? `${r.sent}${r.simulated ? ' (sim)' : ''}` : (r.error || '').slice(0, 24)}</span>
                    </div>
                  ))}
                  {c.smsText && <p className="text-zinc-500 mt-1 truncate">{c.smsText}</p>}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
