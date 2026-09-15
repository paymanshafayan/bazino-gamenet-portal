/**
 * پیامک گروهی - نسخه سفید
 */
import React, { useCallback, useEffect, useState } from 'react';
import { MessageSquare, Smartphone, Send, Users, CheckCircle2, AlertCircle, Loader2, Radio } from 'lucide-react';
import { L } from '../../utils/i18n';

type Channel = 'sms' | 'viber' | 'whatsapp';
interface Config { login: boolean; sms: { code: boolean; available: boolean }; viber: { code: boolean; available: boolean }; whatsapp: { code: boolean; available: boolean }; }
interface Audience { count: number; sample: string[]; }
interface ChRes { channel: Channel; ok: boolean; sent: number; simulated: boolean; error?: string; }
interface Campaign { id: string; createdAt: string; channels: Channel[]; recipientCount: number; simulated: boolean; results: ChRes[]; smsText?: string; }

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
    try { setConfig(await (await fetch('/api/management/messaging/config')).json()); } catch {}
    try { setAudience(await (await fetch('/api/management/messaging/audience')).json()); } catch {}
    try { setCampaigns(await (await fetch('/api/management/messaging/campaigns')).json()); } catch {}
  }, []);
  useEffect(() => { void load(); }, [load]);

  const toggle = (c: Channel) => setChannels(cs => cs.includes(c) ? cs.filter(x => x !== c) : [...cs, c]);
  const manualCount = phones.split(/[\s,;\n]+/).filter(p => p.replace(/\D/g, '').length >= 8).length;

  const send = async () => {
    if (!channels.length) return notify(L(language, { fa: 'حداقل یک کانال', en: 'Pick channel', ru: 'Канал', tr: 'Kanal' }), 'error');
    if (useAudience === false && manualCount === 0) return notify(L(language, { fa: 'گیرنده‌ای نیست', en: 'No recipients', ru: 'Нет', tr: 'Yok' }), 'error');
    if (channels.includes('sms') && !smsText.trim()) return notify(L(language, { fa: 'متن پیامک', en: 'SMS text', ru: 'SMS', tr: 'SMS' }), 'error');
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
      notify(L(language, { fa: 'ارسال شد', en: 'Sent', ru: 'Отправлено', tr: 'Gönderildi' }), 'success');
      setSmsText(''); setViberText(''); setWaText('');
      await load();
    } catch (e: any) {
      notify(e.message || 'error', 'error');
    } finally { setBusy(false); }
  };

  const chMeta: { key: Channel; label: string; icon: React.ReactNode; ready?: boolean }[] = [
    { key: 'sms', label: 'SMS', icon: <Smartphone className="w-4 h-4" />, ready: config?.sms.available },
    { key: 'viber', label: 'Viber', icon: <MessageSquare className="w-4 h-4" />, ready: config?.viber.available },
    { key: 'whatsapp', label: 'WhatsApp', icon: <MessageSquare className="w-4 h-4" />, ready: config?.whatsapp.available },
  ];

  const cardCls = "bg-white border border-[#c3c4c7] shadow-[0_1px_1px_rgba(0,0,0,0.04)] rounded-[2px] p-4";
  const inputCls = "h-[30px] bg-white border border-[#8c8f94] focus:border-[#2271b1] focus:shadow-[0_0_0_1px_#2271b1] rounded-[3px] px-2.5 text-[13px] text-[#2c3338] outline-none w-full";
  const textareaCls = "bg-white border border-[#8c8f94] rounded-[3px] px-2.5 py-2 text-[13px] text-[#2c3338] outline-none w-full resize-none";

  return (
    <div className="flex flex-col gap-4">
      <div className={`${cardCls} flex flex-col gap-3`}>
        <h3 className="text-[13px] font-semibold text-[#1d2327] flex items-center gap-2"><Radio className="w-4 h-4 text-[#2271b1]" />{L(language, { fa: 'وضعیت اتصال', en: 'Gateway status', ru: 'Шлюз', tr: 'Durum' })}</h3>
        {!config ? <div className="flex justify-center py-4"><Loader2 className="w-5 h-5 animate-spin text-[#2271b1]" /></div> : (
          <div className="flex flex-wrap gap-2 text-[11px]">
            <span className={`px-2.5 py-1 rounded-[3px] border flex items-center gap-1 ${config.login ? 'bg-[#d5e9f0] border-[#a7d0e4] text-[#0676a3]' : 'bg-[#fcf0f1] border-[#e9a0a0] text-[#8a2424]'}`}>{config.login ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}{config.login ? 'OK' : '—'}</span>
            {chMeta.map(m => (
              <span key={m.key} className={`px-2.5 py-1 rounded-[3px] border flex items-center gap-1 ${m.ready ? 'bg-[#d5e9f0] border-[#a7d0e4] text-[#0676a3]' : 'bg-[#fcf9e8] border-[#dba617] text-[#996800]'}`}>{m.icon}{m.label}: {m.ready ? 'LIVE' : 'SIM'}</span>
            ))}
          </div>
        )}
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 flex flex-col gap-4">
          <div className={cardCls}>
            <h3 className="text-[13px] font-semibold text-[#1d2327] mb-3 flex items-center gap-2"><MessageSquare className="w-4 h-4 text-[#2271b1]" />{L(language, { fa: 'کانال‌ها', en: 'Channels', ru: 'Каналы', tr: 'Kanallar' })}</h3>
            <div className="grid grid-cols-3 gap-2">
              {chMeta.map(m => {
                const on = channels.includes(m.key);
                return (
                  <button key={m.key} type="button" onClick={() => toggle(m.key)} className={`h-[56px] rounded-[3px] border p-2 flex flex-col items-center gap-1 ${on ? 'bg-[#2271b1] text-white border-[#2271b1]' : 'bg-white text-[#50575e] border-[#dcdcde] hover:bg-[#f6f7f7]'}`}>{m.icon}<span className="text-[11px] font-medium">{m.label}</span><span className="text-[9px] font-mono">{m.ready ? 'LIVE' : 'SIM'}</span></button>
                );
              })}
            </div>
          </div>

          <div className={cardCls}>
            <h3 className="text-[13px] font-semibold text-[#1d2327] mb-3 flex items-center gap-2"><Users className="w-4 h-4 text-[#2271b1]" />{L(language, { fa: 'گیرنده‌ها', en: 'Recipients', ru: 'Получатели', tr: 'Alıcılar' })}</h3>
            <label className="flex items-center gap-2 mb-3 cursor-pointer text-[12px] text-[#3c434a]"><input type="checkbox" checked={useAudience} onChange={e => setUseAudience(e.target.checked)} className="w-4 h-4" />{L(language, { fa: `اعضا (${audience.count})`, en: `Members (${audience.count})`, ru: `${audience.count}`, tr: `${audience.count}` })}</label>
            <textarea rows={3} value={phones} onChange={e => setPhones(e.target.value)} placeholder="0912…, +90…" className={`${textareaCls} font-mono`} />
            <p className="text-[10px] text-[#a7aaad] mt-1">{manualCount} {L(language, { fa: 'شماره دستی', en: 'manual', ru: 'вручную', tr: 'manuel' })}</p>
          </div>

          <div className={cardCls}>
            <h3 className="text-[13px] font-semibold text-[#1d2327] mb-3">{L(language, { fa: 'متن پیام', en: 'Message', ru: 'Сообщение', tr: 'Mesaj' })}</h3>
            <div className="flex flex-col gap-3">
              {channels.includes('sms') && <div><label className="text-[11px] text-[#646970] block mb-1">SMS</label><textarea rows={3} value={smsText} onChange={e => setSmsText(e.target.value)} className={textareaCls} placeholder="SMS…" /></div>}
              {channels.includes('viber') && <div><label className="text-[11px] text-[#646970] block mb-1">Viber</label><textarea rows={3} value={viberText} onChange={e => setViberText(e.target.value)} className={textareaCls} /></div>}
              {channels.includes('whatsapp') && (
                <div className="rounded-[2px] border border-[#dcdcde] p-3 flex flex-col gap-2 bg-[#fcfcfc]">
                  <div className="flex gap-1.5"><button type="button" onClick={() => setWaMode('text')} className={`h-[26px] px-2 rounded-[3px] text-[11px] border ${waMode === 'text' ? 'bg-[#2271b1] border-[#2271b1] text-white' : 'bg-white border-[#dcdcde] text-[#50575e]'}`}>Text</button><button type="button" onClick={() => setWaMode('template')} className={`h-[26px] px-2 rounded-[3px] text-[11px] border ${waMode === 'template' ? 'bg-[#2271b1] border-[#2271b1] text-white' : 'bg-white border-[#dcdcde] text-[#50575e]'}`}>Template</button></div>
                  {waMode === 'text' ? <textarea rows={3} value={waText} onChange={e => setWaText(e.target.value)} className={textareaCls} placeholder="WhatsApp…" /> : <input value={waTemplate} onChange={e => setWaTemplate(e.target.value)} className={inputCls} placeholder="Template ID" />}
                </div>
              )}
              <button onClick={send} disabled={busy} className="h-[32px] bg-[#2271b1] hover:bg-[#135e96] text-white rounded-[3px] text-[13px] flex items-center justify-center gap-2 disabled:opacity-60">{busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}{L(language, { fa: 'ارسال', en: 'Send', ru: 'Отправить', tr: 'Gönder' })}</button>
            </div>
          </div>
        </div>

        <div className={cardCls}>
          <h3 className="text-[13px] font-semibold text-[#1d2327] mb-3 flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-[#2271b1]" />{L(language, { fa: 'کمپین‌های اخیر', en: 'Recent', ru: 'Недавние', tr: 'Son' })}</h3>
          {!campaigns.length ? <p className="text-[12px] text-[#646970] py-6 text-center">—</p> : (
            <div className="flex flex-col gap-2 max-h-[600px] overflow-y-auto">
              {campaigns.slice(0, 20).map(c => (
                <div key={c.id} className="rounded-[2px] bg-[#fcfcfc] border border-[#dcdcde] p-2.5 text-[11px]">
                  <div className="flex justify-between items-center mb-1"><span className="font-medium text-[#1d2327] font-mono">{c.recipientCount}×</span><span className={`px-1.5 py-0.5 rounded text-[9px] border ${c.simulated ? 'bg-[#fcf9e8] border-[#dba617] text-[#996800]' : 'bg-[#d5e9f0] border-[#a7d0e4] text-[#0676a3]'}`}>{c.simulated ? 'SIM' : 'LIVE'}</span></div>
                  <div className="flex gap-1 mb-1">{c.channels.map(ch => <span key={ch} className="px-1 py-0.5 rounded bg-[#f0f0f1] border border-[#dcdcde] text-[#646970] text-[9px]">{ch}</span>)}</div>
                  {c.results.map(r => <div key={r.channel} className={`flex justify-between ${r.ok ? 'text-[#50575e]' : 'text-[#d63638]'}`}><span>{r.channel}</span><span className="font-mono">{r.ok ? `${r.sent}${r.simulated ? ' (sim)' : ''}` : r.error?.slice(0, 24)}</span></div>)}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
