/**
 * مرکز کلیدهای بازینو — همه کلیدها یک‌جا
 * قبلاً: ۳ جای پراکنده (jarvis, apiKeys, affiliates, content settings)
 * الان: یک مرکز دسته‌بندی شده با راهنمای واضح
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
  Cloud,
  Shield,
  Copy,
  Save,
  Eye,
  EyeOff,
  Check,
  AlertTriangle,
  ExternalLink,
  RefreshCw,
} from 'lucide-react';

interface Props {
  addNotification: (m: string, t: 'success' | 'error' | 'info') => void;
  language?: 'fa' | 'en' | 'ru' | 'tr';
  dir?: 'rtl' | 'ltr';
}

type Category = 'all' | 'jarvis' | 'sync' | 'content' | 'social' | 'affiliate' | 'publishing';

const CATEGORIES: { id: Category; fa: string; en: string; icon: React.ComponentType<any>; color: string }[] = [
  { id: 'all', fa: 'همه کلیدها', en: 'All Keys', icon: KeyRound, color: 'text-white' },
  { id: 'jarvis', fa: 'جارویس (AI)', en: 'Jarvis AI', icon: Sparkles, color: 'text-blue-400' },
  { id: 'sync', fa: 'اتصال دسکتاپ', en: 'Desktop Sync', icon: Globe, color: 'text-emerald-400' },
  { id: 'content', fa: 'تولید محتوا', en: 'Content Gen', icon: ImageIcon, color: 'text-violet-400' },
  { id: 'social', fa: 'شبکه اجتماعی', en: 'Social APIs', icon: Video, color: 'text-pink-400' },
  { id: 'affiliate', fa: 'همکاری', en: 'Affiliate', icon: Shield, color: 'text-amber-400' },
  { id: 'publishing', fa: 'انتشار', en: 'Publishing', icon: MessageSquare, color: 'text-cyan-400' },
];

export default function AdminKeysCenter({ addNotification, language: propLang, dir: propDir }: Props) {
  const { language: ctxLang, dir: ctxDir } = useLanguage();
  const language = (propLang || ctxLang) as any;
  const dir = (propDir || ctxDir) as any;
  const [activeCat, setActiveCat] = useState<Category>('all');
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});

  // Jarvis providers
  const [jarvisProviders, setJarvisProviders] = useState<any[]>([]);
  const [isSavingJarvis, setIsSavingJarvis] = useState(false);

  // Sync key
  const [syncKey, setSyncKey] = useState('');
  const [syncMasked, setSyncMasked] = useState('');
  const [syncConfigured, setSyncConfigured] = useState(false);
  const [isSavingSync, setIsSavingSync] = useState(false);

  // Content secrets from /api/admin/content/settings or /api/settings
  const [contentSecrets, setContentSecrets] = useState<Record<string, { configured: boolean; masked?: string }>>({});
  const [contentInputs, setContentInputs] = useState<Record<string, string>>({});
  const [isSavingContent, setIsSavingContent] = useState<string | null>(null);

  // Affiliate tokens
  const [tokens, setTokens] = useState<any[]>([]);
  const [allowedScopes, setAllowedScopes] = useState<string[]>([]);

  // Publishing settings
  const [pubSettings, setPubSettings] = useState<any>(null);

  const [hasEnvFallback, setHasEnvFallback] = useState(false);
  const [envProviders, setEnvProviders] = useState<any[]>([]);

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

      // Jarvis: ensure default keys from env are shown even if DB empty
      let providers = jarvisRes.providers || [];
      if (providers.length === 0 && jarvisRes.envProviders?.length) {
        providers = jarvisRes.envProviders;
      }
      // If still empty, create 3 default slots so admin sees boxes
      if (providers.length === 0) {
        providers = [
          { id: 'provider-1', provider: 'groq', label: 'Groq — سریع و ارزان (پیشنهاد اول)', model: 'llama-3.1-8b-instant', apiKey: '', enabled: true },
          { id: 'provider-2', provider: 'openrouter', label: 'OpenRouter — رایگان (پشتیبان)', model: 'meta-llama/llama-3.1-8b-instruct:free', apiKey: '', enabled: false },
          { id: 'provider-3', provider: 'gemini', label: 'Gemini — قدرتمند (پشتیبان سوم)', model: 'gemini-3.6-flash', apiKey: '', enabled: false },
        ];
      }
      // Ensure 3 slots
      while (providers.length < 3) {
        const idx = providers.length + 1;
        providers.push({ id: `provider-${idx}`, provider: idx === 1 ? 'groq' : idx === 2 ? 'openrouter' : 'gemini', label: '', model: '', apiKey: '', enabled: idx === 1 });
      }
      setJarvisProviders(providers);
      setHasEnvFallback(!!jarvisRes.hasEnvFallback);
      setEnvProviders(jarvisRes.envProviders || []);

      setSyncConfigured(!!syncRes.configured);
      setSyncMasked(syncRes.masked || '');
      setTokens(tokenRes.tokens || []);
      setAllowedScopes(tokenRes.scopes || []);
      setPubSettings(pubRes || {});

      // Content secrets: merge vault status + settings existence + env
      const secretKeys = ['ZERNIO_API_KEY', 'IMEJIS_API_KEY', 'CLOUDFLARE_API_TOKEN', 'ELEVENLABS_API_KEY', 'YOUTUBE_API_KEY', 'TWITCH_CLIENT_ID', 'TWITCH_CLIENT_SECRET', 'GROQ_API_KEY', 'GEMINI_API_KEY', 'OPENROUTER_API_KEY', 'MANUS_API_KEY'];
      const status: any = {};
      // from publishing config secrets
      const pubSecrets = contentRes?.secrets || contentRes?.secretsStatus || {};
      secretKeys.forEach(k => {
        const lower = k.toLowerCase();
        const fromPub = pubSecrets[k] || pubSecrets[lower] || pubSecrets[k.toLowerCase()];
        const fromSettings = settingsRes[k] || settingsRes[lower] || settingsRes[k.toLowerCase()];
        const configured = !!(fromPub?.configured || fromPub?.source === 'host' || fromSettings);
        status[k] = { configured, masked: fromPub?.masked || (configured ? '••••••••' : ''), source: fromPub?.source || (fromSettings ? 'panel' : 'none') };
      });
      // Also include any keys returned from contentRes directly
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
      addNotification(L(language, { fa: 'کلیدهای جارویس ذخیره شد', en: 'Jarvis keys saved', ru: 'Ключи Jarvis сохранены', tr: 'Jarvis anahtarları kaydedildi' }), 'success');
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
      addNotification(L(language, { fa: 'کلید Web Sync ذخیره شد', en: 'Web Sync key saved', ru: 'Ключ Web Sync сохранён', tr: 'Web Sync anahtarı kaydedildi' }), 'success');
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
      addNotification(L(language, { fa: `کلید ${key} ذخیره شد`, en: `Key ${key} saved`, ru: `Ключ ${key} сохранён`, tr: `${key} anahtarı kaydedildi` }), 'success');
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

  const filteredCats = activeCat === 'all' ? CATEGORIES.filter(c => c.id !== 'all') : CATEGORIES.filter(c => c.id === activeCat);

  return (
    <div className="space-y-6 animate-fade-in" dir={dir}>
      {/* Header */}
      <div className="bg-gradient-to-br from-blue-500/10 via-violet-500/10 to-cyan-500/10 border border-blue-500/20 rounded-2xl p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500 text-white flex items-center justify-center shadow-[0_0_20px_rgba(59,130,246,0.3)]">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-[15px] font-black text-white">
                {L(language, { fa: 'مرکز کلیدها — همه API ها یک‌جا', en: 'Keys Center — All APIs in One Place', ru: 'Центр ключей — все API в одном месте', tr: 'Anahtar Merkezi — Tüm API\'ler Tek Yerde' })}
              </h2>
              <p className="text-[11px] text-white/60 mt-1 max-w-2xl leading-relaxed">
                {L(language, {
                  fa: 'قبلاً کلیدها ۳ جای مختلف پراکنده بود. الان همه اینجاست: جارویس، اتصال دسکتاپ، تولید محتوا، شبکه اجتماعی، توکن‌های همکاری. هر بخش را باز کن، کلید را بگذار، ذخیره کن.',
                  en: 'Previously keys were scattered in 3 places. Now all here: Jarvis, desktop sync, content gen, social, affiliate tokens. Open a section, paste key, save.',
                  ru: 'Раньше ключи были в 3 местах. Теперь всё здесь: Jarvis, синхронизация, контент, соцсети, токены.',
                  tr: 'Önceden anahtarlar 3 yere dağılmıştı. Şimdi hepsi burada: Jarvis, masaüstü senk, içerik, sosyal, affiliate tokenları.',
                })}
              </p>
            </div>
          </div>
          <button onClick={loadAll} className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 hover:text-white">
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        {/* Category tabs */}
        <div className="flex flex-wrap gap-2 mt-4">
          {CATEGORIES.map(cat => {
            const Icon = cat.icon;
            const isActive = activeCat === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setActiveCat(cat.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold border transition-all
                  ${isActive ? 'bg-white text-black border-white shadow' : 'bg-black/30 text-white/60 border-white/10 hover:text-white hover:border-white/20'}`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-black' : cat.color}`} />
                {L(language, { fa: cat.fa, en: cat.en, ru: cat.en, tr: cat.en })}
              </button>
            );
          })}
        </div>
      </div>

      {/* Jarvis Section — now with explicit key boxes and default from env */}
      {(activeCat === 'all' || activeCat === 'jarvis') && (
        <div className="bg-[#0e1020] border border-blue-500/20 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-black text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-blue-400" />
              {L(language, { fa: 'جارویس — مدل‌های AI (تا ۳ تا) + کلیدها', en: 'Jarvis — AI Models (up to 3) + Keys', ru: 'Jarvis — модели ИИ + ключи', tr: 'Jarvis — AI Modelleri + Anahtarlar' })}
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30">Groq / OpenRouter / Gemini / Ollama</span>
            </h3>
            <button onClick={saveJarvis} disabled={isSavingJarvis} className="px-3 py-1.5 bg-blue-500 hover:bg-blue-400 disabled:opacity-50 text-black text-xs font-black rounded-lg flex items-center gap-1.5">
              <Save className="w-3.5 h-3.5" /> {L(language, { fa: 'ذخیره جارویس', en: 'Save Jarvis', ru: 'Сохранить Jarvis', tr: 'Jarvis Kaydet' })}
            </button>
          </div>
          {hasEnvFallback && (
            <div className="mb-3 p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 flex gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
              <p className="text-[11px] text-amber-200/80 leading-relaxed">
                {L(language, { fa: 'کلیدهای پیش‌فرض از سرویس (ENV) لود شده — در پنل به صورت ماسک شده دیده می‌شوند. مدیر فقط تغییر می‌دهد، نیازی به ثبت از صفر نیست. برای تغییر، کلید جدید را وارد و ذخیره کن.', en: 'Default keys loaded from ENV — shown masked in panel. Admin only changes them, no need to register from scratch. Enter new key and save to override.', ru: 'Ключи по умолчанию из ENV — показаны маскированно. Админ только меняет.', tr: 'Varsayılan anahtarlar ENV’den yüklendi — maskeli görünür. Yönetici sadece değiştirir.' })}
              </p>
            </div>
          )}
          <div className="grid md:grid-cols-3 gap-3">
            {jarvisProviders.slice(0, 3).map((p, i) => (
              <div key={p.id || i} className="bg-black/40 border border-white/10 rounded-xl p-3 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-white flex items-center gap-1.5">
                    #{i + 1} <span className="px-1.5 py-0.5 rounded bg-white/10 text-[10px]">{p.provider || 'groq'}</span>
                    {p.apiKey === '********' && <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/20">ENV پیش‌فرض</span>}
                  </span>
                  <label className="flex items-center gap-1 text-[10px] text-white/60 cursor-pointer">
                    <input type="checkbox" checked={p.enabled !== false} onChange={e => setJarvisProviders(prev => prev.map((x, idx) => idx === i ? { ...x, enabled: e.target.checked } : x))} />
                    {L(language, { fa: 'فعال', en: 'Enabled', ru: 'Вкл', tr: 'Aktif' })}
                  </label>
                </div>
                <div>
                  <div className="text-[10px] text-white/40 mb-1">{L(language, { fa: 'نام نمایشی', en: 'Display name', ru: 'Имя', tr: 'Görünen ad' })}</div>
                  <input value={p.label || ''} onChange={e => setJarvisProviders(prev => prev.map((x, idx) => idx === i ? { ...x, label: e.target.value } : x))} placeholder="label" className="w-full bg-[#0d1224] border border-white/10 rounded-lg px-2 py-1.5 text-[11px] text-white" />
                </div>
                <div>
                  <div className="text-[10px] text-white/40 mb-1">Model</div>
                  <input value={p.model || ''} onChange={e => setJarvisProviders(prev => prev.map((x, idx) => idx === i ? { ...x, model: e.target.value } : x))} placeholder="model" className="w-full bg-[#0d1224] border border-white/10 rounded-lg px-2 py-1.5 text-[11px] text-white font-mono" />
                </div>
                <div>
                  <div className="text-[10px] text-white/40 mb-1 flex items-center justify-between">
                    <span>{L(language, { fa: 'کلید API', en: 'API Key', ru: 'API ключ', tr: 'API Anahtarı' })}</span>
                    {p.apiKey === '********' && <span className="text-[9px] text-emerald-300">{L(language, { fa: 'از ENV لود شده — برای تغییر، کلید جدید وارد کن', en: 'Loaded from ENV — enter new to override', ru: 'Из ENV — введите новый для замены', tr: 'ENV’den yüklendi — değiştirmek için yeni girin' })}</span>}
                  </div>
                  <div className="flex gap-1">
                    <input type={showSecrets[`jarvis-${i}`] ? 'text' : 'password'} value={p.apiKey || ''} onChange={e => setJarvisProviders(prev => prev.map((x, idx) => idx === i ? { ...x, apiKey: e.target.value } : x))} placeholder={p.apiKey === '********' ? '•••••••• (پیش‌فرض ENV) — کلید جدید برای تغییر' : 'Paste API Key here'} className="flex-1 bg-[#0d1224] border border-white/10 rounded-lg px-2 py-1.5 text-[11px] text-white font-mono" />
                    <button onClick={() => setShowSecrets(s => ({ ...s, [`jarvis-${i}`]: !s[`jarvis-${i}`] }))} className="p-1.5 bg-white/5 rounded-lg text-white/40 hover:text-white">
                      {showSecrets[`jarvis-${i}`] ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
                {p.provider === 'ollama' && (
                  <div>
                    <div className="text-[10px] text-white/40 mb-1">Base URL (Ollama)</div>
                    <input value={p.baseUrl || ''} onChange={e => setJarvisProviders(prev => prev.map((x, idx) => idx === i ? { ...x, baseUrl: e.target.value } : x))} placeholder="http://127.0.0.1:11434" className="w-full bg-[#0d1224] border border-white/10 rounded-lg px-2 py-1.5 text-[11px] text-white font-mono" />
                  </div>
                )}
                <p className="text-[10px] text-white/30 leading-relaxed">
                  {p.provider === 'groq' ? L(language, { fa: 'Groq سریع و ارزان — پیشنهاد اول، از ENV پیش‌فرض دارد', en: 'Groq fast & cheap — first choice, has ENV default', ru: 'Groq быстро и дешево', tr: 'Groq hızlı ve ucuz' }) : p.provider === 'openrouter' ? L(language, { fa: 'OpenRouter رایگان — پشتیبان دوم', en: 'OpenRouter free — second fallback', ru: 'OpenRouter бесплатно', tr: 'OpenRouter ücretsiz' }) : L(language, { fa: 'Gemini قدرتمند — پشتیبان سوم', en: 'Gemini powerful — third fallback', ru: 'Gemini мощный', tr: 'Gemini güçlü' })}
                </p>
              </div>
            ))}
          </div>
          <div className="mt-4 grid md:grid-cols-3 gap-3">
            {[
              { key: 'GROQ_API_KEY', fa: 'Groq API Key (پیش‌فرض ENV)', en: 'Groq API Key (ENV default)' },
              { key: 'GEMINI_API_KEY', fa: 'Gemini API Key (پیش‌فرض ENV)', en: 'Gemini API Key (ENV default)' },
              { key: 'OPENROUTER_API_KEY', fa: 'OpenRouter API Key', en: 'OpenRouter API Key' },
            ].map(item => {
              const st = contentSecrets[item.key] || { configured: false };
              return (
                <div key={item.key} className="bg-black/30 border border-white/5 rounded-xl p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-bold text-white">{L(language, { fa: item.fa, en: item.en, ru: item.en, tr: item.en })}</span>
                    <span className={`text-[9px] px-1.5 py-0.5 rounded-full border ${st.configured ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/20' : 'bg-rose-500/15 text-rose-300 border-rose-500/20'}`}>{st.configured ? 'پیش‌فرض ثبت شده' : 'Missing'}</span>
                  </div>
                  <div className="flex gap-1.5">
                    <input type={showSecrets[item.key] ? 'text' : 'password'} value={contentInputs[item.key] || ''} onChange={e => setContentInputs(s => ({ ...s, [item.key]: e.target.value }))} placeholder={st.configured ? '•••••••• (برای تغییر کلید جدید وارد کن)' : 'Paste key — پیش‌فرض از ENV اگر ست باشد'} className="flex-1 bg-[#0d1224] border border-white/10 rounded-lg px-2 py-1.5 text-[11px] text-white font-mono" />
                    <button onClick={() => setShowSecrets(s => ({ ...s, [item.key]: !s[item.key] }))} className="p-1.5 bg-white/5 rounded-lg text-white/40">{showSecrets[item.key] ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}</button>
                    <button onClick={() => saveContentSecret(item.key)} disabled={!contentInputs[item.key]} className="px-2.5 py-1.5 bg-blue-500 hover:bg-blue-400 disabled:opacity-40 text-black rounded-lg"><Save className="w-3.5 h-3.5" /></button>
                  </div>
                  <div className="text-[10px] text-white/30 mt-1 font-mono">{item.key} — {st.source === 'host' ? 'منبع: ENV (پیش‌فرض)' : st.source === 'panel' ? 'منبع: پنل' : 'منبع: —'}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Sync Section */}
      {(activeCat === 'all' || activeCat === 'sync') && (
        <div className="bg-[#0e1020] border border-emerald-500/20 rounded-2xl p-5">
          <h3 className="text-sm font-black text-white flex items-center gap-2 mb-3">
            <Globe className="w-4 h-4 text-emerald-400" />
            {L(language, { fa: 'اتصال امن دسکتاپ (Web Sync)', en: 'Desktop Secure Link (Web Sync)', ru: 'Связь с десктопом', tr: 'Masaüstü Güvenli Bağlantı' })}
            <span className={`text-[10px] px-2 py-0.5 rounded-full border ${syncConfigured ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' : 'bg-amber-500/15 text-amber-300 border-amber-500/30'}`}>
              {syncConfigured ? L(language, { fa: 'فعال', en: 'Active', ru: 'Активно', tr: 'Aktif' }) : L(language, { fa: 'تنظیم نشده', en: 'Not set', ru: 'Не задано', tr: 'Ayarlanmadı' })}
            </span>
          </h3>
          <div className="flex flex-col md:flex-row gap-2">
            <div className="flex-1 relative">
              <input type={showSecrets['sync'] ? 'text' : 'password'} value={syncKey} onChange={e => setSyncKey(e.target.value)} placeholder={syncMasked ? `Current: ${syncMasked} — enter new to change` : 'Enter at least 16 chars'} className="w-full bg-[#0d1224] border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white font-mono" />
              <button onClick={() => setShowSecrets(s => ({ ...s, sync: !s.sync }))} className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-white/40 hover:text-white">
                {showSecrets['sync'] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <button onClick={() => saveSync(false)} disabled={isSavingSync || syncKey.length < 16} className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-black font-black text-xs rounded-xl">
              {L(language, { fa: 'ذخیره', en: 'Save', ru: 'Сохранить', tr: 'Kaydet' })}
            </button>
            <button onClick={() => saveSync(true)} disabled={isSavingSync} className="px-4 py-2.5 bg-white/5 hover:bg-white/10 text-white font-bold text-xs rounded-xl flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" /> {L(language, { fa: 'تولید جدید', en: 'Generate', ru: 'Генерировать', tr: 'Oluştur' })}
            </button>
            {syncKey && (
              <button onClick={() => copyToClipboard(syncKey)} className="px-3 py-2.5 bg-white/5 hover:bg-white/10 text-white rounded-xl">
                <Copy className="w-4 h-4" />
              </button>
            )}
          </div>
          <p className="text-[10px] text-white/40 mt-2">
            {L(language, { fa: 'این کلید را در برنامه دسکتاپ بخش Web Sync وارد کن. آدرس: https://bazino.pro', en: 'Enter this key in desktop app Web Sync. Address: https://bazino.pro', ru: 'Введите этот ключ в десктоп-приложении Web Sync.', tr: 'Bu anahtarı masaüstü uygulamasında Web Sync bölümüne girin.' })}
          </p>
        </div>
      )}

      {/* Content Gen */}
      {(activeCat === 'all' || activeCat === 'content') && (
        <div className="bg-[#0e1020] border border-violet-500/20 rounded-2xl p-5">
          <h3 className="text-sm font-black text-white flex items-center gap-2 mb-4">
            <ImageIcon className="w-4 h-4 text-violet-400" />
            {L(language, { fa: 'تولید محتوا و هوش تصویری', en: 'Content & Visual AI', ru: 'Генерация контента', tr: 'İçerik ve Görsel AI' })}
          </h3>
          <div className="grid md:grid-cols-2 gap-3">
            {[
              { key: 'GROQ_API_KEY', fa: 'Groq (ترجمه و متن)', en: 'Groq (translate & text)', icon: Sparkles },
              { key: 'IMEJIS_API_KEY', fa: 'Imejis / Flux (عکس)', en: 'Imejis / Flux (image)', icon: ImageIcon },
              { key: 'CLOUDFLARE_API_TOKEN', fa: 'Cloudflare (ذخیره عکس)', en: 'Cloudflare (image store)', icon: Cloud },
              { key: 'ELEVENLABS_API_KEY', fa: 'ElevenLabs (صدا)', en: 'ElevenLabs (voice)', icon: MessageSquare },
              { key: 'ZERNIO_API_KEY', fa: 'Zernio (انتشار)', en: 'Zernio (publish)', icon: Send },
            ].map(item => {
              const st = contentSecrets[item.key] || { configured: false };
              return (
                <div key={item.key} className="bg-black/30 border border-white/5 rounded-xl p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-bold text-white flex items-center gap-1.5">
                      <item.icon className="w-3.5 h-3.5 text-violet-400" />
                      {L(language, { fa: item.fa, en: item.en, ru: item.en, tr: item.en })}
                    </span>
                    <span className={`text-[9px] px-1.5 py-0.5 rounded-full border ${st.configured ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/20' : 'bg-rose-500/15 text-rose-300 border-rose-500/20'}`}>
                      {st.configured ? 'OK' : 'Missing'}
                    </span>
                  </div>
                  <div className="flex gap-1.5">
                    <input type={showSecrets[item.key] ? 'text' : 'password'} value={contentInputs[item.key] || ''} onChange={e => setContentInputs(s => ({ ...s, [item.key]: e.target.value }))} placeholder={st.configured ? '•••••••• (enter new to replace)' : 'Paste key here'} className="flex-1 bg-[#0d1224] border border-white/10 rounded-lg px-2 py-1.5 text-[11px] text-white font-mono" />
                    <button onClick={() => setShowSecrets(s => ({ ...s, [item.key]: !s[item.key] }))} className="p-1.5 bg-white/5 rounded-lg text-white/40">
                      {showSecrets[item.key] ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                    <button onClick={() => saveContentSecret(item.key)} disabled={!contentInputs[item.key] || isSavingContent === item.key} className="px-2.5 py-1.5 bg-violet-500 hover:bg-violet-400 disabled:opacity-40 text-black rounded-lg">
                      {isSavingContent === item.key ? '...' : <Save className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                  <div className="text-[10px] text-white/30 mt-1.5 font-mono">{item.key}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Social */}
      {(activeCat === 'all' || activeCat === 'social') && (
        <div className="bg-[#0e1020] border border-pink-500/20 rounded-2xl p-5">
          <h3 className="text-sm font-black text-white flex items-center gap-2 mb-4">
            <Video className="w-4 h-4 text-pink-400" />
            {L(language, { fa: 'شبکه اجتماعی و ترند', en: 'Social & Trends', ru: 'Соцсети и тренды', tr: 'Sosyal ve Trendler' })}
          </h3>
          <div className="grid md:grid-cols-2 gap-3">
            {[
              { key: 'YOUTUBE_API_KEY', fa: 'YouTube API (ترند گیمینگ)', en: 'YouTube API (gaming trends)' },
              { key: 'TWITCH_CLIENT_ID', fa: 'Twitch Client ID', en: 'Twitch Client ID' },
              { key: 'TWITCH_CLIENT_SECRET', fa: 'Twitch Secret', en: 'Twitch Secret' },
            ].map(item => {
              const st = contentSecrets[item.key] || { configured: false };
              return (
                <div key={item.key} className="bg-black/30 border border-white/5 rounded-xl p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-bold text-white">{L(language, { fa: item.fa, en: item.en, ru: item.en, tr: item.en })}</span>
                    <span className={`text-[9px] px-1.5 py-0.5 rounded-full border ${st.configured ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/20' : 'bg-rose-500/15 text-rose-300 border-rose-500/20'}`}>{st.configured ? 'OK' : 'Missing'}</span>
                  </div>
                  <div className="flex gap-1.5">
                    <input type={showSecrets[item.key] ? 'text' : 'password'} value={contentInputs[item.key] || ''} onChange={e => setContentInputs(s => ({ ...s, [item.key]: e.target.value }))} placeholder={st.configured ? '••••••••' : 'Paste key'} className="flex-1 bg-[#0d1224] border border-white/10 rounded-lg px-2 py-1.5 text-[11px] text-white font-mono" />
                    <button onClick={() => setShowSecrets(s => ({ ...s, [item.key]: !s[item.key] }))} className="p-1.5 bg-white/5 rounded-lg text-white/40">
                      {showSecrets[item.key] ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                    <button onClick={() => saveContentSecret(item.key)} disabled={!contentInputs[item.key]} className="px-2.5 py-1.5 bg-pink-500 hover:bg-pink-400 disabled:opacity-40 text-black rounded-lg">
                      <Save className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-3 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 flex gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <p className="text-[11px] text-amber-200/80 leading-relaxed">
              {L(language, { fa: 'این کلیدها برای بخش ترند یابی (YouTube Gaming + Twitch Top) لازم است. بدون آن، تب ترندها خالی می‌ماند.', en: 'These keys are needed for Trends (YouTube Gaming + Twitch). Without them, trends tab stays empty.', ru: 'Эти ключи нужны для вкладки трендов.', tr: 'Bu anahtarlar Trendler sekmesi için gereklidir.' })}
            </p>
          </div>
        </div>
      )}

      {/* Affiliate Tokens */}
      {(activeCat === 'all' || activeCat === 'affiliate') && (
        <div className="bg-[#0e1020] border border-amber-500/20 rounded-2xl p-5">
          <h3 className="text-sm font-black text-white flex items-center gap-2 mb-3">
            <Shield className="w-4 h-4 text-amber-400" />
            {L(language, { fa: 'توکن‌های همکاری (baz_...) — برای Manus / Zernio', en: 'Affiliate Tokens (baz_...) — for Manus / Zernio', ru: 'Токены партнёрки (baz_...)', tr: 'İşbirliği Tokenları (baz_...)' })}
            <span className="text-[10px] font-mono bg-white/5 text-white/40 px-2 py-0.5 rounded-full">{tokens.length} tokens</span>
          </h3>
          <div className="space-y-2 max-h-[300px] overflow-y-auto">
            {tokens.length === 0 && <p className="text-xs text-white/30">{L(language, { fa: 'هنوز توکنی ساخته نشده', en: 'No tokens yet', ru: 'Токенов нет', tr: 'Henüz token yok' })}</p>}
            {tokens.map(t => (
              <div key={t.id} className="flex items-center gap-2 bg-black/30 border border-white/5 rounded-lg p-2">
                <span className="flex-1 text-xs text-white font-bold truncate">{t.name}</span>
                <span className="text-[10px] font-mono text-white/30 hidden sm:inline">baz_••••{String(t.token || '').slice(-4)}</span>
                <button onClick={() => copyToClipboard(t.token)} className="p-1.5 text-amber-300 hover:text-amber-100">
                  <Copy className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
          <div className="mt-3 flex gap-2 flex-wrap">
            {allowedScopes.map(s => (
              <span key={s} className="text-[10px] font-mono bg-amber-500/10 text-amber-200/70 border border-amber-500/20 rounded px-1.5 py-0.5">{s}</span>
            ))}
          </div>
          <p className="text-[10px] text-white/40 mt-3">
            {L(language, { fa: 'این توکن‌ها در بخش همکاری (/admin/affiliates) ساخته می‌شوند اما اینجا هم نمایش داده می‌شوند تا همه کلیدها یک‌جا باشند. برای ساخت جدید به تب همکاری برو.', en: 'These tokens are created in Affiliates section but shown here to centralize. To create new, go to Affiliates tab.', ru: 'Токены создаются в разделе партнёрки, но показываются здесь для централизации.', tr: 'Bu tokenlar Affiliates bölümünde oluşturulur ancak merkezileştirme için burada da gösterilir.' })}
          </p>
        </div>
      )}

      {/* Publishing */}
      {(activeCat === 'all' || activeCat === 'publishing') && (
        <div className="bg-[#0e1020] border border-cyan-500/20 rounded-2xl p-5">
          <h3 className="text-sm font-black text-white flex items-center gap-2 mb-3">
            <MessageSquare className="w-4 h-4 text-cyan-400" />
            {L(language, { fa: 'انتشار و صف محتوا', en: 'Publishing & Queue', ru: 'Публикация и очередь', tr: 'Yayınlama ve Kuyruk' })}
          </h3>
          <div className="grid md:grid-cols-2 gap-3 text-xs">
            <div className="bg-black/30 rounded-xl p-3 border border-white/5">
              <div className="text-white/60 text-[11px] mb-1">mediagenEnabled</div>
              <div className="text-white font-bold">{String(pubSettings?.mediagenEnabled ?? '—')}</div>
            </div>
            <div className="bg-black/30 rounded-xl p-3 border border-white/5">
              <div className="text-white/60 text-[11px] mb-1">designs allowlist</div>
              <div className="text-white font-mono text-[11px] truncate">{JSON.stringify(pubSettings?.designs || pubSettings?.allowedDesigns || '—')}</div>
            </div>
          </div>
          <p className="text-[11px] text-white/40 mt-3">
            {L(language, { fa: 'تنظیمات صف انتشار و تولید تصویر در /admin/content → تنظیمات است. اینجا فقط نمایش وضعیت است.', en: 'Publishing queue and image gen settings live in /admin/content → Settings. Here is just status.', ru: 'Настройки очереди публикаций — в /admin/content → Настройки.', tr: 'Yayın kuyruğu ve görsel üretim ayarları /admin/content → Ayarlar bölümündedir.' })}
          </p>
        </div>
      )}

      {/* Help */}
      <div className="bg-white/[0.02] border border-white/5 rounded-xl p-4 flex gap-3">
        <div className="w-8 h-8 rounded-lg bg-primary/15 text-primary flex items-center justify-center shrink-0">
          <ExternalLink className="w-4 h-4" />
        </div>
        <div>
          <h4 className="text-xs font-black text-white">{L(language, { fa: 'چطور کلید بگیرم؟', en: 'How to get keys?', ru: 'Как получить ключи?', tr: 'Anahtarlar nasıl alınır?' })}</h4>
          <ul className="text-[11px] text-white/50 leading-relaxed mt-1 list-disc ps-4 space-y-1">
            <li>Groq: groq.com → API Keys → Create</li>
            <li>OpenRouter: openrouter.ai → Keys</li>
            <li>YouTube: console.cloud.google.com → APIs → YouTube Data v3 → Credentials</li>
            <li>Twitch: dev.twitch.tv → Applications → Register</li>
            <li>Cloudflare R2: dash.cloudflare.com → R2 → Manage R2 API Tokens</li>
            <li>Imejis: imejis.com → API</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

function Send(props: any) {
  return <MessageSquare {...props} />;
}
