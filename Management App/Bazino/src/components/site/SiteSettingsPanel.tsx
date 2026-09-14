/**
 * تب «تنظیمات سایت» در WebSyncModal — همان بخش «سفارشی‌سازی کلوپ» پنل ادمین وب:
 * منبع داده (نمونه⇄دیتابیس)، مشخصات تماس کلوپ، پرچم‌های قابلیت + قیمت‌گذاری +
 * شارژ دستی کردیت، شبکه‌های اجتماعی، بخش‌های صفحه اصلی (۴ زبان)، مشخصات قانونی
 * شرکت و متن‌های قانونی، و بازنشانی/پاک‌سازی دیتابیس.
 * مسیرها: GET/POST /api/sync/site-settings ، POST /api/sync/data-source ،
 * POST /api/sync/credits/adjust ، POST /api/sync/reset-database ، POST /api/sync/clear-database
 */
import React, { useCallback, useEffect, useState } from 'react';
import {
  Settings, RefreshCw, AlertCircle, CheckCircle2, Database, Save, Users, Trash2,
  Sliders, Scale, Plus, Pencil, Coins,
} from 'lucide-react';
import { siteFetch, prettySiteError } from '../../utils/siteClient';

interface Props {
  webServerUrl: string;
  apiKey: string;
}

type SectionKey = 'genres' | 'services' | 'matches' | 'tournaments' | 'pricing' | 'coaches' | 'address';
const SECTIONS: { key: SectionKey; name: string; defaultTitle: string }[] = [
  { key: 'genres', name: '🎮 دسته‌بندی و ژانرهای بازی', defaultTitle: 'داستان نبرد خود را انتخاب کنید' },
  { key: 'services', name: '🌟 سالن‌ها و خدمات ویژه', defaultTitle: 'امکانات و بخش‌های ویژه سالن بازی نو' },
  { key: 'matches', name: '🏆 جدول زنده نتایج مسابقات', defaultTitle: 'جدول نتایج و رتبه‌بندی رقابت‌ها' },
  { key: 'tournaments', name: '🛡️ تورنمنت‌های فعال', defaultTitle: 'تورنمنت‌های فعال و ثبت‌نام سریع' },
  { key: 'pricing', name: '💎 بسته‌های زمانی و عضویت', defaultTitle: 'بسته‌های زمانی و کارت‌های عضویت' },
  { key: 'coaches', name: '👤 مربیان و پرسنل', defaultTitle: 'مربیان حرفه‌ای و پرسنل کلوپ' },
  { key: 'address', name: '📍 نقشه و اطلاعات تماس', defaultTitle: 'نشانی و راه‌های ارتباطی با ما' },
];
const LANGS: { code: 'fa' | 'en' | 'ru' | 'tr'; label: string }[] = [
  { code: 'fa', label: 'فارسی' }, { code: 'en', label: 'انگلیسی' }, { code: 'ru', label: 'روسی' }, { code: 'tr', label: 'ترکی' },
];
const LEGAL_SLUGS: { slug: string; label: string }[] = [
  { slug: 'privacy', label: 'حریم خصوصی' },
  { slug: 'kvkk', label: 'KVKK (حفاظت داده)' },
  { slug: 'terms', label: 'قوانین و مقررات' },
  { slug: 'distance-sales', label: 'قرارداد فروش از راه دور' },
  { slug: 'pre-information', label: 'اطلاعات پیش از خرید' },
  { slug: 'refund', label: 'سیاست بازگشت وجه' },
  { slug: 'delivery', label: 'تحویل و ارسال' },
  { slug: 'cookies', label: 'کوکی‌ها' },
  { slug: 'affiliate', label: 'قوانین همکاری در فروش' },
];
const COMPANY_FIELDS: { key: string; label: string; ltr?: boolean }[] = [
  { key: 'company_legal_name', label: 'نام حقوقی شرکت' },
  { key: 'company_tax_no', label: 'شماره مالیاتی', ltr: true },
  { key: 'company_registration_no', label: 'شماره ثبت', ltr: true },
  { key: 'company_country', label: 'کشور' },
  { key: 'company_email', label: 'ایمیل شرکت', ltr: true },
  { key: 'company_landline', label: 'تلفن ثابت', ltr: true },
];
const CLUB_FIELDS: { key: string; label: string; ltr?: boolean; placeholder: string }[] = [
  { key: 'club_phone', label: 'تلفن پشتیبانی کلوپ', ltr: true, placeholder: '+90 539 133 37 47' },
  { key: 'club_hours', label: 'ساعت‌های عملیاتی', placeholder: '۲۴ ساعته شبانه‌روز (۷ روز هفته)' },
  { key: 'club_address', label: 'آدرس فیزیکی کلوپ', placeholder: 'Derviş İzzigil Sokak No.12, İskele — Vista Mare' },
  { key: 'club_map_url', label: 'لینک Google Maps', ltr: true, placeholder: 'https://maps.app.goo.gl/…' },
  { key: 'club_map_lat', label: 'عرض جغرافیایی (Lat)', ltr: true, placeholder: '35.2628' },
  { key: 'club_map_lng', label: 'طول جغرافیایی (Lng)', ltr: true, placeholder: '33.9084' },
];
const PLATFORMS = ['instagram', 'telegram', 'youtube', 'x', 'discord', 'twitch'];

interface SocialLink { id: string; name: string; platform: string; url: string; }

const inp = 'w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-100 focus:outline-none focus:border-amber-500/50';
const box = 'bg-zinc-900 border border-zinc-800 rounded-2xl p-4 space-y-3';

export const SiteSettingsPanel: React.FC<Props> = ({ webServerUrl, apiKey }) => {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [dataSource, setDataSource] = useState<'sample' | 'database'>('sample');
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  // شبکه‌های اجتماعی
  const [social, setSocial] = useState<SocialLink[]>([]);
  const [socialEdit, setSocialEdit] = useState<SocialLink | null>(null);

  // بخش صفحه اصلی انتخاب‌شده
  const [sectionKey, setSectionKey] = useState<SectionKey>('genres');

  // کردیت دستی
  const [creditUser, setCreditUser] = useState('');
  const [creditDelta, setCreditDelta] = useState('');
  const [creditNote, setCreditNote] = useState('');

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const d = await siteFetch(webServerUrl, apiKey, '/api/sync/site-settings');
      setSettings(d.settings || {});
      setDataSource(d.dataSource || 'sample');
      setDraft({});
      try {
        setSocial(d.settings?.social_media_links ? JSON.parse(d.settings.social_media_links) : []);
      } catch { setSocial([]); }
    } catch (err) {
      setError(prettySiteError(err));
    } finally {
      setLoading(false);
    }
  }, [webServerUrl, apiKey]);

  useEffect(() => { void load(); }, [load]);

  const val = (k: string) => (k in draft ? draft[k] : (settings[k] ?? ''));
  const setVal = (k: string, v: string) => setDraft((d) => ({ ...d, [k]: v }));

  const saveUpdates = async (tag: string, updates: Record<string, string>) => {
    setBusy(tag); setMsg(null);
    try {
      await siteFetch(webServerUrl, apiKey, '/api/sync/site-settings', { method: 'POST', body: { updates } });
      setSettings((s) => ({ ...s, ...updates }));
      setDraft((d) => {
        const n = { ...d };
        for (const k of Object.keys(updates)) delete n[k];
        return n;
      });
      setMsg({ ok: true, text: 'تنظیمات با موفقیت ذخیره شد.' });
    } catch (err) {
      setMsg({ ok: false, text: prettySiteError(err) });
    } finally {
      setBusy(null);
    }
  };

  const switchDataSource = async (mode: 'sample' | 'database') => {
    if (mode === dataSource) return;
    setBusy('ds'); setMsg(null);
    try {
      await siteFetch(webServerUrl, apiKey, '/api/sync/data-source', { method: 'POST', body: { mode } });
      setDataSource(mode);
      setMsg({ ok: true, text: `منبع داده سایت به «${mode === 'sample' ? 'نمونه' : 'دیتابیس'}» تغییر یافت.` });
    } catch (err) {
      setMsg({ ok: false, text: prettySiteError(err) });
    } finally {
      setBusy(null);
    }
  };

  const saveSocial = async (next: SocialLink[]) => {
    setSocial(next);
    await saveUpdates('social', { social_media_links: JSON.stringify(next) });
  };

  const grantCredits = async (e: React.FormEvent) => {
    e.preventDefault();
    const delta = Number(creditDelta);
    if (!creditUser.trim() || !Number.isSafeInteger(delta) || delta === 0) {
      setMsg({ ok: false, text: 'نام کاربری و مقدار کردیت (مثبت/منفی، غیرصفر) لازم است.' });
      return;
    }
    setBusy('credits'); setMsg(null);
    try {
      const d = await siteFetch(webServerUrl, apiKey, '/api/sync/credits/adjust', {
        method: 'POST', body: { username: creditUser.trim(), delta, note: creditNote },
      });
      setMsg({ ok: true, text: `انجام شد — کردیت جدید کاربر «${d.username}»: ${d.credits} BC` });
      setCreditUser(''); setCreditDelta(''); setCreditNote('');
    } catch (err) {
      setMsg({ ok: false, text: prettySiteError(err) });
    } finally {
      setBusy(null);
    }
  };

  const dbAction = async (kind: 'reset' | 'clear') => {
    const label = kind === 'reset' ? 'بازنشانی و نصب مجدد اطلاعات نمونه' : 'پاک‌سازی کامل تمام اطلاعات نمونه و تصاویر';
    if (!window.confirm(`مطمئن هستید؟ عملیات «${label}» روی سایت انجام می‌شود و قابل بازگشت نیست.`)) return;
    setBusy('db-' + kind); setMsg(null);
    try {
      await siteFetch(webServerUrl, apiKey, `/api/sync/${kind === 'reset' ? 'reset-database' : 'clear-database'}`, { method: 'POST' });
      setMsg({ ok: true, text: kind === 'reset' ? 'اطلاعات نمونه دوباره نصب شد.' : 'اطلاعات نمونه پاک‌سازی شد.' });
    } catch (err) {
      setMsg({ ok: false, text: prettySiteError(err) });
    } finally {
      setBusy(null);
    }
  };

  const flagOn = (key: string, defaultOn: boolean) => {
    const v = val(key);
    return v === '' ? defaultOn : v === 'true';
  };
  const toggleFlag = (key: string, _defaultOn: boolean) => {
    setVal(key, String(!flagOn(key, _defaultOn)));
  };

  const secDraftKeys = (k: SectionKey) => [
    `section_${k}_enabled`, ...LANGS.map((l) => `section_${k}_title_${l.code}`), ...LANGS.map((l) => `section_${k}_desc_${l.code}`),
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Settings className="w-4 h-4 text-amber-400" />
          <h3 className="font-bold text-zinc-100">سفارشی‌سازی سایت (همان پنل ادمین وب)</h3>
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

      {/* ۱) منبع داده */}
      <div className={box}>
        <div className="flex items-center gap-2 text-zinc-200 font-bold text-xs">
          <Database className="w-4 h-4 text-amber-400" /> منبع دادهٔ سایت و اپلیکیشن
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <button onClick={() => void switchDataSource('sample')} disabled={busy === 'ds'}
            className={`p-3 border rounded-xl text-right transition ${dataSource === 'sample' ? 'border-sky-400 bg-sky-500/10' : 'border-zinc-800 bg-zinc-950 hover:border-zinc-600'}`}>
            <div className="text-xs font-black text-zinc-100">داده نمونه (Sample)</div>
            <div className="text-[10px] text-sky-400 font-bold mt-0.5">پیش‌فرض — بدون نیاز به دیتابیس</div>
            <p className="text-[10px] text-zinc-500 leading-relaxed mt-1">همه بخش‌ها از داده‌های آماده پر می‌شوند؛ مناسب نمایش و تست.</p>
          </button>
          <button onClick={() => void switchDataSource('database')} disabled={busy === 'ds'}
            className={`p-3 border rounded-xl text-right transition ${dataSource === 'database' ? 'border-emerald-400 bg-emerald-500/10' : 'border-zinc-800 bg-zinc-950 hover:border-zinc-600'}`}>
            <div className="text-xs font-black text-zinc-100">دیتابیس</div>
            <div className="text-[10px] text-emerald-400 font-bold mt-0.5">داده‌های واقعی ذخیره‌شده</div>
            <p className="text-[10px] text-zinc-500 leading-relaxed mt-1">سایت و اپ از رکوردهای واقعی می‌خوانند؛ جدول خالی خودکار از نمونه پر می‌شود.</p>
          </button>
        </div>
      </div>

      {/* ۲) مشخصات تماس کلوپ */}
      <div className={box}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-zinc-200 font-bold text-xs">
            <Settings className="w-4 h-4 text-amber-400" /> مشخصات تماس و برندینگ کلوپ
          </div>
          <button onClick={() => void saveUpdates('club', Object.fromEntries(CLUB_FIELDS.map((f) => [f.key, val(f.key)])))}
            disabled={busy === 'club'}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-zinc-950 font-bold rounded-lg text-[10px]">
            <Save className="w-3.5 h-3.5" /> ذخیره
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {CLUB_FIELDS.map((f) => (
            <div key={f.key} className={f.key === 'club_address' ? 'md:col-span-2' : ''}>
              <label className="text-[10px] text-zinc-500 font-bold block mb-1">{f.label}</label>
              <input type="text" dir={f.ltr ? 'ltr' : undefined} value={val(f.key)} onChange={(e) => setVal(f.key, e.target.value)}
                placeholder={f.placeholder} className={inp} />
            </div>
          ))}
        </div>
      </div>

      {/* ۳) پرچم‌ها + قیمت‌گذاری + کردیت */}
      <div className={box}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-zinc-200 font-bold text-xs">
            <Sliders className="w-4 h-4 text-amber-400" /> پرچم‌های قابلیت، قیمت‌گذاری و کردیت
          </div>
          <button
            onClick={() => void saveUpdates('flags', {
              chat_enabled: String(flagOn('chat_enabled', false)),
              food_coming_soon: String(flagOn('food_coming_soon', true)),
              shop_coming_soon: String(flagOn('shop_coming_soon', true)),
              extra_controller_hourly: val('extra_controller_hourly') || '25',
              gaming_credits_per_hour: val('gaming_credits_per_hour') || '100',
              extra_controller_credits_per_hour: val('extra_controller_credits_per_hour') || '20',
            })}
            disabled={busy === 'flags'}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-zinc-950 font-bold rounded-lg text-[10px]">
            <Save className="w-3.5 h-3.5" /> ذخیره
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          {([
            { key: 'chat_enabled', def: false, on: 'گفتگو فعال است', off: 'گفتگو غیرفعال (پنهان از منو)' },
            { key: 'food_coming_soon', def: true, on: 'کافه: به‌زودی (سفارش بسته)', off: 'کافه: فعال (سفارش باز)' },
            { key: 'shop_coming_soon', def: true, on: 'فروشگاه: به‌زودی (خرید بسته)', off: 'فروشگاه: فعال (خرید باز)' },
          ] as const).map((f) => {
            const on = flagOn(f.key, f.def);
            return (
              <label key={f.key} className="flex items-center gap-2.5 bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2.5 cursor-pointer">
                <input type="checkbox" checked={on} onChange={() => toggleFlag(f.key, f.def)} className="accent-amber-400 w-4 h-4" />
                <span className="text-[11px] text-zinc-200 font-bold">{on ? f.on : f.off}</span>
              </label>
            );
          })}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {([
            { key: 'extra_controller_hourly', label: 'دستهٔ اضافه (لیر/ساعت)', ph: '25' },
            { key: 'gaming_credits_per_hour', label: 'نرخ کردیت بازی (BC/ساعت)', ph: '100' },
            { key: 'extra_controller_credits_per_hour', label: 'کردیت دستهٔ اضافه (BC/ساعت)', ph: '20' },
          ] as const).map((f) => (
            <div key={f.key}>
              <label className="text-[10px] text-zinc-500 font-bold block mb-1">{f.label}</label>
              <input type="number" dir="ltr" min={0} value={val(f.key)} onChange={(e) => setVal(f.key, e.target.value)}
                placeholder={f.ph} className={`${inp} font-mono`} />
            </div>
          ))}
        </div>
        <form onSubmit={grantCredits} className="border-t border-zinc-800 pt-3 space-y-2">
          <div className="text-[11px] text-zinc-300 font-bold flex items-center gap-1.5">
            <Coins className="w-3.5 h-3.5 text-amber-400" /> شارژ دستی کردیت کاربر (BC)
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
            <input type="text" dir="ltr" placeholder="username" value={creditUser} onChange={(e) => setCreditUser(e.target.value)} className={`${inp} font-mono`} />
            <input type="number" dir="ltr" placeholder="+250 / -50" value={creditDelta} onChange={(e) => setCreditDelta(e.target.value)} className={`${inp} font-mono`} />
            <input type="text" placeholder="یادداشت (اختیاری)" maxLength={200} value={creditNote} onChange={(e) => setCreditNote(e.target.value)} className={inp} />
            <button type="submit" disabled={busy === 'credits'}
              className="px-4 py-2 bg-amber-400 hover:bg-amber-300 disabled:opacity-50 text-zinc-950 font-bold rounded-lg text-xs">
              {busy === 'credits' ? '…' : 'ثبت شارژ/کسر'}
            </button>
          </div>
        </form>
      </div>

      {/* ۴) شبکه‌های اجتماعی */}
      <div className={box}>
        <div className="flex items-center gap-2 text-zinc-200 font-bold text-xs">
          <Users className="w-4 h-4 text-amber-400" /> شبکه‌های اجتماعی سایت
        </div>
        <div className="flex flex-col gap-2">
          {social.length === 0 && <p className="text-xs text-zinc-500">شبکه‌ای ثبت نشده است (پیش‌فرض سایت: اینستاگرام، تلگرام، یوتیوب).</p>}
          {social.map((s, i) => (
            <div key={s.id || i} className="flex items-center gap-2 bg-zinc-950 border border-zinc-800 rounded-lg p-2">
              <span className="text-[10px] px-2 py-0.5 bg-zinc-800 rounded text-zinc-300 font-bold">{s.platform}</span>
              <span className="text-xs text-zinc-200 font-bold flex-1 truncate">{s.name}</span>
              <span className="text-[10px] text-zinc-500 truncate max-w-[35%]" dir="ltr">{s.url}</span>
              <button onClick={() => setSocialEdit(s)} className="p-1.5 rounded-lg text-zinc-400 border border-zinc-800 hover:text-amber-400" title="ویرایش">
                <Pencil className="w-3.5 h-3.5" />
              </button>
              <button onClick={() => void saveSocial(social.filter((x) => x.id !== s.id))} className="p-1.5 rounded-lg text-zinc-500 border border-zinc-800 hover:bg-rose-500/20 hover:text-rose-400" title="حذف">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
        {socialEdit ? (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-2 border-t border-zinc-800 pt-3">
            <select value={socialEdit.platform} onChange={(e) => setSocialEdit({ ...socialEdit, platform: e.target.value })} className={inp}>
              {PLATFORMS.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
            <input type="text" placeholder="نام نمایشی" value={socialEdit.name} onChange={(e) => setSocialEdit({ ...socialEdit, name: e.target.value })} className={inp} />
            <input type="text" dir="ltr" placeholder="https://…" value={socialEdit.url} onChange={(e) => setSocialEdit({ ...socialEdit, url: e.target.value })} className={inp} />
            <div className="flex gap-2">
              <button
                onClick={async () => {
                  if (!socialEdit.name.trim() || !socialEdit.url.trim()) return;
                  const exists = social.some((s) => s.id === socialEdit.id);
                  const next = exists ? social.map((s) => (s.id === socialEdit.id ? socialEdit : s)) : [...social, { ...socialEdit, id: socialEdit.id || 'sl-' + Date.now().toString(36) }];
                  setSocialEdit(null);
                  await saveSocial(next);
                }}
                className="flex-1 px-3 py-2 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold rounded-lg text-xs">
                ذخیره
              </button>
              <button onClick={() => setSocialEdit(null)} className="px-3 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg text-xs">انصراف</button>
            </div>
          </div>
        ) : (
          <button onClick={() => setSocialEdit({ id: '', name: '', platform: 'instagram', url: '' })}
            className="self-start flex items-center gap-1.5 px-3 py-1.5 border border-zinc-700 hover:border-amber-500/50 text-zinc-300 rounded-lg text-[10px] font-bold">
            <Plus className="w-3.5 h-3.5" /> افزودن شبکهٔ جدید
          </button>
        )}
      </div>

      {/* ۵) بخش‌های صفحه اصلی */}
      <div className={box}>
        <div className="flex items-center gap-2 text-zinc-200 font-bold text-xs">
          <Sliders className="w-4 h-4 text-amber-400" /> بخش‌های صفحه اصلی سایت (فعال/مخفی + متن ۴ زبان)
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-1.5">
          {SECTIONS.map((s) => (
            <button key={s.key} onClick={() => setSectionKey(s.key)}
              className={`px-2.5 py-2 rounded-lg text-[10px] font-bold text-right transition ${
                sectionKey === s.key ? 'bg-emerald-500/10 border border-emerald-500/40 text-emerald-300' : 'bg-zinc-950 border border-zinc-800 text-zinc-400 hover:text-zinc-200'
              }`}>
              {s.name}
            </button>
          ))}
        </div>
        <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-3 space-y-3">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
            <span className="text-[10px] font-mono text-zinc-500">بخش: {sectionKey}</span>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={val(`section_${sectionKey}_enabled`) !== 'false'}
                onChange={(e) => setVal(`section_${sectionKey}_enabled`, e.target.checked ? 'true' : 'false')}
                className="accent-emerald-400 w-4 h-4"
              />
              <span className="text-[10px] text-zinc-300 font-bold">نمایش در صفحه اصلی</span>
            </label>
          </div>
          {LANGS.map((l) => (
            <div key={l.code} className="grid grid-cols-1 md:grid-cols-3 gap-2 items-start">
              <div>
                <label className="text-[10px] text-zinc-500 font-bold block mb-1">عنوان ({l.label})</label>
                <input
                  type="text"
                  value={val(`section_${sectionKey}_title_${l.code}`)}
                  onChange={(e) => setVal(`section_${sectionKey}_title_${l.code}`, e.target.value)}
                  placeholder={l.code === 'fa' ? SECTIONS.find((s) => s.key === sectionKey)?.defaultTitle : 'خالی = پیش‌فرض قالب'}
                  className={inp}
                />
              </div>
              <div className="md:col-span-2">
                <label className="text-[10px] text-zinc-500 font-bold block mb-1">توضیحات بالای بخش ({l.label}) — خالی = پیش‌فرض قالب</label>
                <textarea
                  rows={2}
                  value={val(`section_${sectionKey}_desc_${l.code}`)}
                  onChange={(e) => setVal(`section_${sectionKey}_desc_${l.code}`, e.target.value)}
                  className={inp}
                />
              </div>
            </div>
          ))}
          <button
            onClick={() => void saveUpdates('sec-' + sectionKey, Object.fromEntries(secDraftKeys(sectionKey).map((k) => [k, val(k)])))}
            disabled={busy === 'sec-' + sectionKey}
            className="self-start flex items-center gap-1.5 px-4 py-2 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-zinc-950 font-black rounded-lg text-[10px]">
            <Save className="w-3.5 h-3.5" /> ذخیرهٔ این بخش
          </button>
        </div>
      </div>

      {/* ۶) مشخصات قانونی و متن‌های قانونی */}
      <div className={box}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-zinc-200 font-bold text-xs">
            <Scale className="w-4 h-4 text-amber-400" /> مشخصات قانونی شرکت و متن‌های قانونی
          </div>
          <button
            onClick={() => void saveUpdates('company', Object.fromEntries(COMPANY_FIELDS.map((f) => [f.key, val(f.key)])))}
            disabled={busy === 'company'}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-zinc-950 font-bold rounded-lg text-[10px]">
            <Save className="w-3.5 h-3.5" /> ذخیرهٔ مشخصات
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {COMPANY_FIELDS.map((f) => (
            <div key={f.key}>
              <label className="text-[10px] text-zinc-500 font-bold block mb-1">{f.label}</label>
              <input type="text" dir={f.ltr ? 'ltr' : undefined} value={val(f.key)} onChange={(e) => setVal(f.key, e.target.value)} className={inp} />
            </div>
          ))}
        </div>
        <LegalTextEditor settings={settings} draft={draft} setVal={setVal} saveUpdates={saveUpdates} busy={busy} />
      </div>

      {/* ۷) منطقه خطر */}
      <div className="rounded-2xl border border-rose-500/25 bg-rose-500/5 p-4 space-y-3">
        <div className="flex items-center gap-2 text-rose-300 font-black text-xs">⚠️ مدیریت داده‌های پایگاه داده سایت</div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="bg-zinc-950 border border-zinc-800 p-3 rounded-xl">
            <h4 className="text-[11px] font-bold text-zinc-100 mb-1">۱. بازنشانی و نصب مجدد اطلاعات نمونه</h4>
            <p className="text-[10px] text-zinc-500 mb-2.5 leading-relaxed">تنظیمات، کدهای تخفیف، تورنمنت‌ها و محصولات پیش‌فرض دوباره نصب می‌شوند.</p>
            <button onClick={() => void dbAction('reset')} disabled={busy === 'db-reset'}
              className="w-full px-4 py-2 bg-rose-600/20 hover:bg-rose-600 text-rose-200 border border-rose-500/30 text-[10px] font-black rounded-lg disabled:opacity-50 flex items-center justify-center gap-2">
              <RefreshCw className={`w-3.5 h-3.5 ${busy === 'db-reset' ? 'animate-spin' : ''}`} /> حذف و بازنشانی به داده نمونه
            </button>
          </div>
          <div className="bg-zinc-950 border border-zinc-800 p-3 rounded-xl">
            <h4 className="text-[11px] font-bold text-zinc-100 mb-1">۲. پاک‌سازی کامل اطلاعات نمونه و تصاویر</h4>
            <p className="text-[10px] text-zinc-500 mb-2.5 leading-relaxed">تمامی بازی‌ها، اخبار، محصولات، رزروها، اسلایدرها و عکس‌ها حذف و دیتابیس سفید می‌شود.</p>
            <button onClick={() => void dbAction('clear')} disabled={busy === 'db-clear'}
              className="w-full px-4 py-2 bg-rose-700 hover:bg-rose-800 text-white text-[10px] font-black rounded-lg disabled:opacity-50 flex items-center justify-center gap-2">
              <Trash2 className="w-3.5 h-3.5" /> پاک‌سازی کل اطلاعات دیتابیس
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

/** ویرایشگر متن قانونی هر سند × ۴ زبان — خالی = متن پیش‌فرض سایت */
function LegalTextEditor({ settings, draft, setVal, saveUpdates, busy }: {
  settings: Record<string, string>;
  draft: Record<string, string>;
  setVal: (k: string, v: string) => void;
  saveUpdates: (tag: string, updates: Record<string, string>) => Promise<void>;
  busy: string | null;
}) {
  const [slug, setSlug] = useState('terms');
  const [lang, setLang] = useState<'fa' | 'en' | 'ru' | 'tr'>('fa');
  const key = `legal_${slug}_${lang}`;
  const v = key in draft ? draft[key] : (settings[key] ?? '');
  const overridden = !!(settings[key] && settings[key].trim());
  return (
    <div className="border-t border-zinc-800 pt-3 space-y-2">
      <div className="text-[11px] text-zinc-300 font-bold">متن‌های قانونی صفحات مستقل سایت</div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        <select value={slug} onChange={(e) => setSlug(e.target.value)} className={inp}>
          {LEGAL_SLUGS.map((s) => <option key={s.slug} value={s.slug}>{s.label}</option>)}
        </select>
        <div className="flex gap-1.5 items-center">
          {LANGS.map((l) => (
            <button key={l.code} onClick={() => setLang(l.code)}
              className={`px-2.5 py-1.5 rounded text-[10px] font-black ${lang === l.code ? 'bg-amber-500 text-zinc-950' : 'bg-zinc-800 text-zinc-300'}`}>
              {l.label}
            </button>
          ))}
        </div>
      </div>
      <textarea rows={5} value={v} onChange={(e) => setVal(key, e.target.value)}
        placeholder={overridden ? '' : 'خالی = متن پیش‌فرض سایت'}
        className={`${inp} leading-relaxed`} />
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-zinc-500">{overridden ? 'متن سفارشی ثبت شده است.' : 'متن پیش‌فرض سایت فعال است.'}</span>
        <button
          onClick={() => void saveUpdates('legal-' + key, { [key]: v })}
          disabled={busy === 'legal-' + key}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-zinc-950 font-bold rounded-lg text-[10px]">
          <Save className="w-3.5 h-3.5" /> ذخیرهٔ متن
        </button>
      </div>
    </div>
  );
}
