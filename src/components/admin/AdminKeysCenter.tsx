/**
 * مرکز کلیدها — نسخه سفید تمیز مطابق پنل مدیریت جدید
 * - همه کارت‌ها سفید #ffffff border #c3c4c7
 * - ورودی‌ها 30px border #8c8f94 focus #2271b1
 * - دکمه‌ها 30px #2271b1
 */
import React, { useEffect, useState } from 'react';
import { L } from '../../utils/i18n';
import { useLanguage } from '../../context/LanguageContext';
import {
  KeyRound,
  Globe,
  Sparkles,
  Video,
  Image as ImageIcon,
  MessageSquare,
  Shield,
  Copy,
  Save,
  Eye,
  EyeOff,
  AlertTriangle,
  ExternalLink,
  RefreshCw,
  Cloud,
} from 'lucide-react';

interface Props {
  addNotification: (m: string, t: 'success' | 'error' | 'info') => void;
  language?: 'fa' | 'en' | 'ru' | 'tr';
  dir?: 'rtl' | 'ltr';
}

type Category = 'all' | 'jarvis' | 'sync' | 'content' | 'social' | 'affiliate' | 'publishing';

const CATEGORIES: { id: Category; fa: string; en: string; icon: React.ComponentType<any> }[] = [
  { id: 'all', fa: 'همه', en: 'All', icon: KeyRound },
  { id: 'jarvis', fa: 'جارویس', en: 'Jarvis', icon: Sparkles },
  { id: 'sync', fa: 'دسکتاپ', en: 'Desktop', icon: Globe },
  { id: 'content', fa: 'محتوا', en: 'Content', icon: ImageIcon },
  { id: 'social', fa: 'شبکه', en: 'Social', icon: Video },
  { id: 'affiliate', fa: 'همکاری', en: 'Affiliate', icon: Shield },
  { id: 'publishing', fa: 'انتشار', en: 'Publish', icon: MessageSquare },
];

export default function AdminKeysCenter({ addNotification, language: propLang, dir: propDir }: Props) {
  const { language: ctxLang, dir: ctxDir } = useLanguage();
  const language = (propLang || ctxLang) as any;
  const dir = (propDir || ctxDir) as any;
  const [activeCat, setActiveCat] = useState<Category>('all');
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});

  const [jarvisProviders, setJarvisProviders] = useState<any[]>([]);
  const [isSavingJarvis, setIsSavingJarvis] = useState(false);

  const [syncKey, setSyncKey] = useState('');
  const [syncMasked, setSyncMasked] = useState('');
  const [syncConfigured, setSyncConfigured] = useState(false);
  const [isSavingSync, setIsSavingSync] = useState(false);

  const [contentSecrets, setContentSecrets] = useState<Record<string, { configured: boolean; masked?: string; source?: string }>>({});
  const [contentInputs, setContentInputs] = useState<Record<string, string>>({});
  const [isSavingContent, setIsSavingContent] = useState<string | null>(null);

  const [tokens, setTokens] = useState<any[]>([]);
  const [allowedScopes, setAllowedScopes] = useState<string[]>([]);
  const [pubSettings, setPubSettings] = useState<any>(null);
  const [hasEnvFallback, setHasEnvFallback] = useState(false);

  const loadAll = async () => {
    try {
      const [jarvisRes, syncRes, contentRes, tokenRes, pubRes, settingsRes] = await Promise.all([
        fetch('/api/admin/jarvis-ai-providers').then(r => r.json()).catch(() => ({ providers: [] })),
        fetch('/api/admin/sync-settings').then(r => r.json()).catch(() => ({})),
        fetch('/api/management/publishing/config').then(r => r.json()).catch(() => fetch('/api/admin/publishing-settings').then(r => r.json()).catch(() => fetch('/api/admin/content-settings').then(r => r.json()).catch(() => ({})))),
        fetch('/api/admin/api-tokens').then(r => r.json()).catch(() => ({ tokens: [] })),
        fetch('/api/admin/content/publishing-config').then(r => r.json()).catch(() => ({})),
        fetch('/api/settings').then(r => r.json()).catch(() => ({})),
      ]);

      let providers = jarvisRes.providers || [];
      if (providers.length === 0 && jarvisRes.envProviders?.length) providers = jarvisRes.envProviders;
      if (providers.length === 0) {
        providers = [
          { id: 'provider-1', provider: 'groq', label: 'Groq', model: 'llama-3.1-8b-instant', apiKey: '', enabled: true },
          { id: 'provider-2', provider: 'openrouter', label: 'OpenRouter', model: 'meta-llama/llama-3.1-8b-instruct:free', apiKey: '', enabled: false },
          { id: 'provider-3', provider: 'gemini', label: 'Gemini', model: 'gemini-3.6-flash', apiKey: '', enabled: false },
        ];
      }
      while (providers.length < 3) {
        const idx = providers.length + 1;
        providers.push({ id: `provider-${idx}`, provider: idx === 1 ? 'groq' : idx === 2 ? 'openrouter' : 'gemini', label: '', model: '', apiKey: '', enabled: idx === 1 });
      }
      setJarvisProviders(providers);
      setHasEnvFallback(!!jarvisRes.hasEnvFallback);

      setSyncConfigured(!!syncRes.configured);
      setSyncMasked(syncRes.masked || '');
      setTokens(tokenRes.tokens || []);
      setAllowedScopes(tokenRes.scopes || []);
      setPubSettings(pubRes || {});

      const secretKeys = ['ZERNIO_API_KEY', 'IMEJIS_API_KEY', 'CLOUDFLARE_API_TOKEN', 'ELEVENLABS_API_KEY', 'YOUTUBE_API_KEY', 'TWITCH_CLIENT_ID', 'TWITCH_CLIENT_SECRET', 'GROQ_API_KEY', 'GEMINI_API_KEY', 'OPENROUTER_API_KEY', 'MANUS_API_KEY'];
      const status: any = {};
      const pubSecrets = contentRes?.secrets || contentRes?.secretsStatus || {};
      secretKeys.forEach(k => {
        const fromPub = pubSecrets[k] || pubSecrets[k.toLowerCase()];
        const fromSettings = settingsRes[k] || settingsRes[k.toLowerCase()];
        const configured = !!(fromPub?.configured || fromPub?.source === 'host' || fromSettings);
        status[k] = { configured, masked: fromPub?.masked || (configured ? '••••••••' : ''), source: fromPub?.source || (fromSettings ? 'panel' : 'none') };
      });
      if (contentRes?.secretsStatus) Object.assign(status, contentRes.secretsStatus);
      if (contentRes?.secrets) Object.assign(status, contentRes.secrets);
      setContentSecrets(status);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => { loadAll(); }, []);

  const saveJarvis = async () => {
    setIsSavingJarvis(true);
    try {
      const res = await fetch('/api/admin/jarvis-ai-providers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ providers: jarvisProviders.slice(0, 3) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'save failed');
      setJarvisProviders(data.providers || jarvisProviders);
      addNotification(L(language, { fa: 'ذخیره شد', en: 'Saved', ru: 'Сохранено', tr: 'Kaydedildi' }), 'success');
    } catch (e: any) {
      addNotification(e.message || 'Failed', 'error');
    } finally {
      setIsSavingJarvis(false);
    }
  };

  const saveSync = async (generate = false) => {
    setIsSavingSync(true);
    try {
      const res = await fetch('/api/admin/sync-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(generate ? { generate: true } : { apiKey: syncKey }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'save failed');
      setSyncKey(data.apiKey || '');
      setSyncMasked(data.masked || '');
      setSyncConfigured(true);
      addNotification(L(language, { fa: 'ذخیره شد', en: 'Saved', ru: 'Сохранено', tr: 'Kaydedildi' }), 'success');
    } catch (e: any) {
      addNotification(e.message, 'error');
    } finally {
      setIsSavingSync(false);
    }
  };

  const saveContentSecret = async (key: string) => {
    const val = contentInputs[key];
    if (!val) return;
    setIsSavingContent(key);
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, value: val }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'failed');
      setContentSecrets(prev => ({ ...prev, [key]: { configured: true, masked: '••••••••' } }));
      setContentInputs(prev => ({ ...prev, [key]: '' }));
      addNotification(L(language, { fa: `کلید ${key} ذخیره شد`, en: `${key} saved`, ru: `${key} сохранён`, tr: `${key} kaydedildi` }), 'success');
    } catch (e: any) {
      addNotification(e.message, 'error');
    } finally {
      setIsSavingContent(null);
    }
  };

  const copyToClipboard = async (text: string) => {
    await navigator.clipboard.writeText(text);
    addNotification(L(language, { fa: 'کپی شد', en: 'Copied', ru: 'Скопировано', tr: 'Kopyalandı' }), 'success');
  };

  const inputCls = "h-[30px] bg-white border border-[#8c8f94] focus:border-[#2271b1] focus:shadow-[0_0_0_1px_#2271b1] rounded-[3px] px-2.5 text-[13px] text-[#2c3338] outline-none w-full";
  const cardCls = "bg-white border border-[#c3c4c7] shadow-[0_1px_1px_rgba(0,0,0,0.04)] rounded-[2px]";
  const btnPrimary = "h-[30px] px-3 rounded-[3px] bg-[#2271b1] border border-[#2271b1] text-white hover:bg-[#135e96] text-[13px]";
  const btnSecondary = "h-[30px] px-3 rounded-[3px] bg-white border border-[#8c8f94] text-[#2c3338] hover:bg-[#f6f7f7] text-[13px]";

  return (
    <div className="space-y-5" dir={dir}>
      {/* Header card */}
      <div className={`${cardCls} p-4`}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-[2px] bg-[#2271b1] text-white flex items-center justify-center"><KeyRound className="w-4 h-4" /></div>
            <div>
              <h2 className="text-[14px] font-semibold text-[#1d2327]">{L(language, { fa: 'مرکز کلیدها', en: 'Keys Center', ru: 'Центр ключей', tr: 'Anahtar Merkezi' })}</h2>
              <p className="text-[12px] text-[#50575e] mt-0.5">{L(language, { fa: 'همه کلیدها یک‌جا: جارویس، دسکتاپ، محتوا، شبکه، همکاری', en: 'All keys in one place: Jarvis, desktop, content, social, affiliate', ru: 'Все ключи в одном месте', tr: 'Tüm anahtarlar tek yerde' })}</p>
            </div>
          </div>
          <button onClick={loadAll} className="h-[30px] px-2 rounded-[3px] bg-white border border-[#dcdcde] text-[#50575e] hover:bg-[#f6f7f7]"><RefreshCw className="w-4 h-4" /></button>
        </div>

        <div className="flex flex-wrap gap-1.5 mt-4">
          {CATEGORIES.map(cat => {
            const Icon = cat.icon;
            const isActive = activeCat === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setActiveCat(cat.id)}
                className={`h-[26px] flex items-center gap-1.5 px-2.5 rounded-[3px] text-[12px] border ${isActive ? 'bg-[#2271b1] border-[#2271b1] text-white' : 'bg-white border-[#dcdcde] text-[#50575e] hover:bg-[#f6f7f7]'}`}
              >
                <Icon className="w-3.5 h-3.5" />{L(language, { fa: cat.fa, en: cat.en, ru: cat.en, tr: cat.en })}
              </button>
            );
          })}
        </div>
      </div>

      {(activeCat === 'all' || activeCat === 'jarvis') && (
        <div className={`${cardCls} p-4`}>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-[13px] font-semibold text-[#1d2327] flex items-center gap-2"><Sparkles className="w-4 h-4 text-[#2271b1]" />{L(language, { fa: 'جارویس — ۳ کلید', en: 'Jarvis — 3 Keys', ru: 'Jarvis — 3 ключа', tr: 'Jarvis — 3 Anahtar' })}<span className="text-[10px] px-1.5 py-0.5 rounded bg-[#f0f0f1] border border-[#dcdcde] text-[#646970] font-mono">Groq / OpenRouter / Gemini</span></h3>
            <button onClick={saveJarvis} disabled={isSavingJarvis} className={btnPrimary}><Save className="w-3.5 h-3.5 inline mr-1" />{L(language, { fa: 'ذخیره', en: 'Save', ru: 'Сохранить', tr: 'Kaydet' })}</button>
          </div>
          {hasEnvFallback && (
            <div className="mb-3 p-2.5 rounded-[2px] bg-[#fcf9e8] border border-[#dba617] flex gap-2">
              <AlertTriangle className="w-4 h-4 text-[#996800] shrink-0" />
              <p className="text-[12px] text-[#3c434a]">{L(language, { fa: 'کلیدهای پیش‌فرض از سرویس لود شده و ماسک شده هستند. برای تغییر، کلید جدید وارد کن.', en: 'Default keys from ENV are masked. Enter new to override.', ru: 'Ключи по умолчанию из ENV маскированы.', tr: 'Varsayılan anahtarlar ENV’den maskeli.' })}</p>
            </div>
          )}
          <div className="grid md:grid-cols-3 gap-3">
            {jarvisProviders.slice(0, 3).map((p, i) => (
              <div key={p.id || i} className="bg-[#fcfcfc] border border-[#dcdcde] rounded-[2px] p-3 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[12px] font-medium text-[#1d2327] flex items-center gap-1.5">#{i + 1}<span className="px-1.5 py-0.5 rounded bg-[#f0f0f1] border border-[#dcdcde] text-[10px] font-mono">{p.provider || 'groq'}</span></span>
                  <label className="flex items-center gap-1 text-[11px] text-[#50575e] cursor-pointer"><input type="checkbox" checked={p.enabled !== false} onChange={e => setJarvisProviders(prev => prev.map((x, idx) => idx === i ? { ...x, enabled: e.target.checked } : x))} />{L(language, { fa: 'فعال', en: 'On', ru: 'Вкл', tr: 'Aktif' })}</label>
                </div>
                <div><div className="text-[11px] text-[#646970] mb-1">{L(language, { fa: 'نام', en: 'Label', ru: 'Имя', tr: 'Ad' })}</div><input value={p.label || ''} onChange={e => setJarvisProviders(prev => prev.map((x, idx) => idx === i ? { ...x, label: e.target.value } : x))} placeholder="label" className={inputCls} /></div>
                <div><div className="text-[11px] text-[#646970] mb-1">Model</div><input value={p.model || ''} onChange={e => setJarvisProviders(prev => prev.map((x, idx) => idx === i ? { ...x, model: e.target.value } : x))} placeholder="model" className={`${inputCls} font-mono`} /></div>
                <div>
                  <div className="text-[11px] text-[#646970] mb-1">{L(language, { fa: 'کلید', en: 'Key', ru: 'Ключ', tr: 'Anahtar' })}</div>
                  <div className="flex gap-1">
                    <input type={showSecrets[`jarvis-${i}`] ? 'text' : 'password'} value={p.apiKey || ''} onChange={e => setJarvisProviders(prev => prev.map((x, idx) => idx === i ? { ...x, apiKey: e.target.value } : x))} placeholder={p.apiKey === '********' ? '••••••••' : 'Paste key'} className={`${inputCls} font-mono flex-1`} />
                    <button onClick={() => setShowSecrets(s => ({ ...s, [`jarvis-${i}`]: !s[`jarvis-${i}`] }))} className="h-[30px] px-2 bg-white border border-[#dcdcde] rounded-[3px] text-[#50575e]"><Eye className={`w-4 h-4 ${showSecrets[`jarvis-${i}`] ? 'hidden' : ''}`} /><EyeOff className={`w-4 h-4 ${showSecrets[`jarvis-${i}`] ? '' : 'hidden'}`} /></button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {(activeCat === 'all' || activeCat === 'sync') && (
        <div className={`${cardCls} p-4`}>
          <h3 className="text-[13px] font-semibold text-[#1d2327] flex items-center gap-2 mb-3"><Globe className="w-4 h-4 text-[#2271b1]" />{L(language, { fa: 'اتصال دسکتاپ', en: 'Desktop Link', ru: 'Связь', tr: 'Masaüstü' })}<span className={`text-[10px] px-1.5 py-0.5 rounded border ${syncConfigured ? 'bg-[#d5e9f0] border-[#a7d0e4] text-[#0676a3]' : 'bg-[#fcf0f1] border-[#e9a0a0] text-[#8a2424]'}`}>{syncConfigured ? 'OK' : 'Missing'}</span></h3>
          <div className="flex flex-col md:flex-row gap-2">
            <div className="flex-1 relative"><input type={showSecrets['sync'] ? 'text' : 'password'} value={syncKey} onChange={e => setSyncKey(e.target.value)} placeholder={syncMasked ? `Current: ${syncMasked}` : 'Min 16 chars'} className={`${inputCls} font-mono pr-8`} /><button onClick={() => setShowSecrets(s => ({ ...s, sync: !s.sync }))} className="absolute right-1 top-1/2 -translate-y-1/2 h-[28px] px-2 text-[#50575e]">{showSecrets['sync'] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}</button></div>
            <button onClick={() => saveSync(false)} disabled={isSavingSync || syncKey.length < 16} className={btnPrimary} disabled={isSavingSync}>{L(language, { fa: 'ذخیره', en: 'Save', ru: 'Сохранить', tr: 'Kaydet' })}</button>
            <button onClick={() => saveSync(true)} disabled={isSavingSync} className={btnSecondary}><Sparkles className="w-3.5 h-3.5 inline mr-1" />{L(language, { fa: 'تولید', en: 'Generate', ru: 'Генерировать', tr: 'Oluştur' })}</button>
            {syncKey && <button onClick={() => copyToClipboard(syncKey)} className={btnSecondary}><Copy className="w-4 h-4" /></button>}
          </div>
          <p className="text-[11px] text-[#646970] mt-2">{L(language, { fa: 'این کلید را در اپ دسکتاپ وارد کن.', en: 'Enter this key in desktop app.', ru: 'Введите в десктоп-приложении.', tr: 'Masaüstü uygulamasına girin.' })}</p>
        </div>
      )}

      {(activeCat === 'all' || activeCat === 'content') && (
        <div className={`${cardCls} p-4`}>
          <h3 className="text-[13px] font-semibold text-[#1d2327] flex items-center gap-2 mb-3"><ImageIcon className="w-4 h-4 text-[#2271b1]" />{L(language, { fa: 'محتوا', en: 'Content', ru: 'Контент', tr: 'İçerik' })}</h3>
          <div className="grid md:grid-cols-2 gap-3">
            {[
              { key: 'GROQ_API_KEY', fa: 'Groq', en: 'Groq' },
              { key: 'IMEJIS_API_KEY', fa: 'Imejis', en: 'Imejis' },
              { key: 'CLOUDFLARE_API_TOKEN', fa: 'Cloudflare', en: 'Cloudflare' },
              { key: 'ELEVENLABS_API_KEY', fa: 'ElevenLabs', en: 'ElevenLabs' },
              { key: 'ZERNIO_API_KEY', fa: 'Zernio', en: 'Zernio' },
            ].map(item => {
              const st = contentSecrets[item.key] || { configured: false };
              return (
                <div key={item.key} className="bg-[#fcfcfc] border border-[#dcdcde] rounded-[2px] p-3">
                  <div className="flex items-center justify-between mb-2"><span className="text-[12px] font-medium text-[#1d2327]">{item.fa}</span><span className={`text-[10px] px-1.5 py-0.5 rounded border ${st.configured ? 'bg-[#d5e9f0] border-[#a7d0e4] text-[#0676a3]' : 'bg-[#fcf0f1] border-[#e9a0a0] text-[#8a2424]'}`}>{st.configured ? 'OK' : 'Missing'}</span></div>
                  <div className="flex gap-1">
                    <input type={showSecrets[item.key] ? 'text' : 'password'} value={contentInputs[item.key] || ''} onChange={e => setContentInputs(s => ({ ...s, [item.key]: e.target.value }))} placeholder={st.configured ? '••••••••' : 'Paste key'} className={`${inputCls} font-mono flex-1`} />
                    <button onClick={() => setShowSecrets(s => ({ ...s, [item.key]: !s[item.key] }))} className="h-[30px] px-2 bg-white border border-[#dcdcde] rounded-[3px] text-[#50575e]">{showSecrets[item.key] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}</button>
                    <button onClick={() => saveContentSecret(item.key)} disabled={!contentInputs[item.key]} className={btnPrimary}><Save className="w-4 h-4" /></button>
                  </div>
                  <div className="text-[10px] text-[#a7aaad] font-mono mt-1">{item.key}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {(activeCat === 'all' || activeCat === 'social') && (
        <div className={`${cardCls} p-4`}>
          <h3 className="text-[13px] font-semibold text-[#1d2327] flex items-center gap-2 mb-3"><Video className="w-4 h-4 text-[#2271b1]" />{L(language, { fa: 'شبکه', en: 'Social', ru: 'Соцсети', tr: 'Sosyal' })}</h3>
          <div className="grid md:grid-cols-2 gap-3">
            {[
              { key: 'YOUTUBE_API_KEY', fa: 'YouTube', en: 'YouTube' },
              { key: 'TWITCH_CLIENT_ID', fa: 'Twitch ID', en: 'Twitch ID' },
              { key: 'TWITCH_CLIENT_SECRET', fa: 'Twitch Secret', en: 'Twitch Secret' },
            ].map(item => {
              const st = contentSecrets[item.key] || { configured: false };
              return (
                <div key={item.key} className="bg-[#fcfcfc] border border-[#dcdcde] rounded-[2px] p-3">
                  <div className="flex items-center justify-between mb-2"><span className="text-[12px] font-medium text-[#1d2327]">{item.fa}</span><span className={`text-[10px] px-1.5 py-0.5 rounded border ${st.configured ? 'bg-[#d5e9f0] border-[#a7d0e4] text-[#0676a3]' : 'bg-[#fcf0f1] border-[#e9a0a0] text-[#8a2424]'}`}>{st.configured ? 'OK' : 'Missing'}</span></div>
                  <div className="flex gap-1">
                    <input type={showSecrets[item.key] ? 'text' : 'password'} value={contentInputs[item.key] || ''} onChange={e => setContentInputs(s => ({ ...s, [item.key]: e.target.value }))} placeholder={st.configured ? '••••••••' : 'Paste key'} className={`${inputCls} font-mono flex-1`} />
                    <button onClick={() => setShowSecrets(s => ({ ...s, [item.key]: !s[item.key] }))} className="h-[30px] px-2 bg-white border border-[#dcdcde] rounded-[3px] text-[#50575e]">{showSecrets[item.key] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}</button>
                    <button onClick={() => saveContentSecret(item.key)} disabled={!contentInputs[item.key]} className={btnPrimary}><Save className="w-4 h-4" /></button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {(activeCat === 'all' || activeCat === 'affiliate') && (
        <div className={`${cardCls} p-4`}>
          <h3 className="text-[13px] font-semibold text-[#1d2327] flex items-center gap-2 mb-3"><Shield className="w-4 h-4 text-[#2271b1]" />{L(language, { fa: 'همکاری', en: 'Affiliate', ru: 'Партнёры', tr: 'Ortaklar' })}<span className="text-[10px] font-mono bg-[#f0f0f1] border border-[#dcdcde] px-1.5 py-0.5 rounded text-[#646970]">{tokens.length}</span></h3>
          <div className="space-y-2 max-h-[300px] overflow-y-auto">
            {tokens.length === 0 && <p className="text-[12px] text-[#646970]">{L(language, { fa: 'توکنی نیست', en: 'No tokens', ru: 'Нет токенов', tr: 'Token yok' })}</p>}
            {tokens.map(t => (
              <div key={t.id} className="flex items-center gap-2 bg-[#fcfcfc] border border-[#dcdcde] rounded-[2px] p-2">
                <span className="flex-1 text-[12px] text-[#1d2327] font-medium truncate">{t.name}</span>
                <span className="text-[10px] font-mono text-[#a7aaad] hidden sm:inline">••••{String(t.token || '').slice(-4)}</span>
                <button onClick={() => copyToClipboard(t.token)} className="h-[26px] px-2 bg-white border border-[#dcdcde] rounded-[3px] text-[#50575e]"><Copy className="w-3.5 h-3.5" /></button>
              </div>
            ))}
          </div>
          <div className="mt-3 flex gap-1.5 flex-wrap">{allowedScopes.map(s => <span key={s} className="text-[10px] font-mono bg-[#f0f0f1] border border-[#dcdcde] rounded px-1.5 py-0.5 text-[#646970]">{s}</span>)}</div>
        </div>
      )}

      {(activeCat === 'all' || activeCat === 'publishing') && (
        <div className={`${cardCls} p-4`}>
          <h3 className="text-[13px] font-semibold text-[#1d2327] flex items-center gap-2 mb-3"><MessageSquare className="w-4 h-4 text-[#2271b1]" />{L(language, { fa: 'انتشار', en: 'Publish', ru: 'Публикация', tr: 'Yayın' })}</h3>
          <div className="grid md:grid-cols-2 gap-3 text-[12px]">
            <div className="bg-[#fcfcfc] rounded-[2px] p-3 border border-[#dcdcde]"><div className="text-[#646970] text-[11px] mb-1">mediagenEnabled</div><div className="text-[#1d2327] font-medium">{String(pubSettings?.mediagenEnabled ?? '—')}</div></div>
            <div className="bg-[#fcfcfc] rounded-[2px] p-3 border border-[#dcdcde]"><div className="text-[#646970] text-[11px] mb-1">designs</div><div className="text-[#1d2327] font-mono text-[11px] truncate">{JSON.stringify(pubSettings?.designs || pubSettings?.allowedDesigns || '—')}</div></div>
          </div>
        </div>
      )}

      <div className="bg-white border border-[#c3c4c7] shadow-[0_1px_1px_rgba(0,0,0,0.04)] rounded-[2px] p-4 flex gap-3">
        <div className="w-8 h-8 rounded-[2px] bg-[#f0f0f1] border border-[#dcdcde] text-[#50575e] flex items-center justify-center shrink-0"><ExternalLink className="w-4 h-4" /></div>
        <div>
          <h4 className="text-[12px] font-semibold text-[#1d2327]">{L(language, { fa: 'راهنما', en: 'Help', ru: 'Помощь', tr: 'Yardım' })}</h4>
          <ul className="text-[11px] text-[#50575e] leading-relaxed mt-1 list-disc ps-4 space-y-0.5 font-mono">
            <li>Groq: groq.com → API Keys</li>
            <li>OpenRouter: openrouter.ai → Keys</li>
            <li>YouTube: console.cloud.google.com → YouTube Data v3</li>
            <li>Twitch: dev.twitch.tv → Applications</li>
            <li>Cloudflare R2: dash.cloudflare.com → R2 → API Tokens</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
