/**
 * استودیوی محتوا و انتشار - نسخه بازطراحی شده برای صاحب گیم‌نت
 * ساده، فارسی، با راهنمای تصویری واقعی
 * جایگزین PublishingStudio شلوغ قبلی
 */
import React, { useState, useEffect, useCallback } from 'react';
import { 
  Sparkles, ImagePlus, TrendingUp, Send, Layers, 
  RefreshCw, Wand2, Eye, Clock, CheckCircle2, 
  AlertTriangle, Lightbulb, Film, FileText,
  Bot, Settings2, ChevronDown, ChevronUp,
  Play, Plus, Trash2, Copy, ExternalLink,
  BookOpen, HelpCircle
} from 'lucide-react';
import { L } from '../../utils/i18n';

type SimpleTab = 'guide' | 'mediagen' | 'trends' | 'posts';

interface Props {
  language: 'fa' | 'en' | 'ru' | 'tr';
  dir: 'rtl' | 'ltr';
  addNotification: (msg: string, type: 'success' | 'error' | 'info') => void;
}

function usePublishingApi() {
  const getToken = () => localStorage.getItem('bazino.authToken') || '';
  const api = useCallback(async (path: string, method: string = 'GET', body?: any) => {
    const res = await fetch(`/api/management/publishing${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${getToken()}`,
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw { code: data.error || `HTTP_${res.status}`, message: data.error };
    return data;
  }, []);
  return api;
}

function MediaGenSimple({ language, dir, addNotification }: Props) {
  const api = usePublishingApi();
  const [quota, setQuota] = useState<any>(null);
  const [tasks, setTasks] = useState<any[]>([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ provider: 'flux', prompt: '', title: '', language: 'fa', confirmed: false });
  const [showGuide, setShowGuide] = useState(false);

  const reload = useCallback(async () => {
    try {
      const q = await api('/mediagen/quota');
      setQuota(q);
      const t = await api('/mediagen/tasks');
      setTasks(t.tasks || []);
    } catch (e: any) { setError(e.code || e.message); }
  }, [api]);

  useEffect(() => { void reload(); const id = setInterval(() => void reload(), 10000); return () => clearInterval(id); }, [reload]);

  async function generate(e: React.FormEvent) {
    e.preventDefault();
    if (!form.confirmed) { addNotification('لطفاً تأیید هزینه را بزن', 'error'); return; }
    setBusy(true); setError('');
    try {
      await api('/mediagen/generate', 'POST', {
        provider: form.provider,
        title: form.title,
        prompt: form.prompt,
        language: form.language,
        confirmedCost: true,
      });
      addNotification('درخواست تولید ثبت شد - چند ثانیه صبر کن', 'success');
      setForm({ ...form, prompt: '', title: '' });
      await reload();
    } catch (e: any) { setError(e.code || e.message); addNotification('خطا: ' + (e.code || e.message), 'error'); }
    finally { setBusy(false); }
  }

  return (
    <div className="space-y-5">
      {/* Guide Banner */}
      <div className="bg-gradient-to-r from-purple-500/10 to-cyan-500/10 border border-purple-500/20 rounded-2xl p-5">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center shrink-0">
            <Wand2 className="w-5 h-5 text-purple-300" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-black text-white text-sm">تولید تصویر با هوش مصنوعی - چطور کار می‌کند؟</h3>
            <p className="text-[12px] text-gray-300 mt-1.5 leading-relaxed">
              اینجا برای اینستاگرام و تلگرام عکس می‌سازی. پرامپت بنویس (مثلاً: "سالن گیمینگ نئونی با PC های RGB")، دکمه تولید بزن. 
              سیستم با Flux یا Imejis عکس می‌سازد و در صف وظایف می‌افتد. بعد می‌توانی به پیش‌نویس اضافه کنی.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <span className="text-[10px] px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-gray-400">💡 پرامپت فارسی هم کار می‌کند</span>
              <span className="text-[10px] px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-gray-400">⚡ سهمیه روزانه: Flux {quota?.flux?.used || 0}/{quota?.flux?.limit || 20}</span>
              <button onClick={() => setShowGuide(!showGuide)} className="text-[10px] px-2.5 py-1 rounded-lg bg-primary/10 border border-primary/20 text-primary hover:bg-primary/20">راهنما {showGuide ? '▲' : '▼'}</button>
            </div>
            {showGuide && (
              <div className="mt-3 p-3 bg-black/30 rounded-xl border border-white/5 space-y-2">
                <p className="text-[11px] text-gray-400"><b className="text-white">گام ۱:</b> عنوان کوتاه بنویس (مثلاً "شب گیمینگ")</p>
                <p className="text-[11px] text-gray-400"><b className="text-white">گام ۲:</b> پرامپت دقیق بنویس - هرچه دقیق‌تر، عکس بهتر</p>
                <p className="text-[11px] text-gray-400"><b className="text-white">گام ۳:</b> تیک تأیید هزینه بزن و تولید</p>
                <p className="text-[11px] text-gray-400"><b className="text-white">گام ۴:</b> در لیست وظایف پایین، وقتی Completed شد، "ورود به پیش‌نویس" بزن</p>
                <img src="/images/admin-guides/content-step1.png" alt="guide" className="mt-2 w-full rounded-lg border border-white/10 max-h-64 object-contain bg-black/20" />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Quota Cards */}
      {quota && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="bg-dark-card border border-white/10 rounded-xl p-4 flex items-center justify-between">
            <div><p className="text-[10px] text-gray-500 font-bold">Flux (هوش مصنوعی)</p><p className="text-lg font-black text-white mt-1">{quota.flux?.used || 0} / {quota.flux?.limit || 20}</p></div>
            <ImagePlus className="w-6 h-6 text-cyan-400" />
          </div>
          <div className="bg-dark-card border border-white/10 rounded-xl p-4 flex items-center justify-between">
            <div><p className="text-[10px] text-gray-500 font-bold">Imejis (قالب)</p><p className="text-lg font-black text-white mt-1">{quota.imejis?.used || 0} / {quota.imejis?.limit || 50}</p></div>
            <Layers className="w-6 h-6 text-purple-400" />
          </div>
          <div className="bg-dark-card border border-white/10 rounded-xl p-4 flex items-center justify-between">
            <div><p className="text-[10px] text-gray-500 font-bold">Compose (ریلز)</p><p className="text-lg font-black text-white mt-1">{quota.compose?.used || 0} / {quota.compose?.limit || 10}</p></div>
            <Film className="w-6 h-6 text-pink-400" />
          </div>
        </div>
      )}

      {/* Generate Form */}
      <div className="bg-dark-card border border-white/10 rounded-2xl p-5">
        <h4 className="font-black text-white text-sm flex items-center gap-2"><Sparkles className="w-4 h-4 text-primary" /> فرم تولید تصویر</h4>
        <form onSubmit={generate} className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-[11px] text-gray-400 font-bold block mb-1.5">عنوان (برای خودت)</label>
            <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} required maxLength={200} placeholder="مثلاً: شب گیمینگ نئونی" className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white placeholder:text-gray-600 outline-none focus:border-primary/50" />
          </div>
          <div>
            <label className="text-[11px] text-gray-400 font-bold block mb-1.5">مدل هوش مصنوعی</label>
            <select value={form.provider} onChange={e => setForm({ ...form, provider: e.target.value })} className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white outline-none">
              <option value="flux">Flux - هوش مصنوعی آزاد (بهترین برای گیمینگ)</option>
              <option value="imejis">Imejis - قالب آماده</option>
              <option value="compose">Compose - ویدیو ریلز</option>
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="text-[11px] text-gray-400 font-bold block mb-1.5">پرامپت - توضیح دقیق عکس (فارسی یا انگلیسی)</label>
            <textarea value={form.prompt} onChange={e => setForm({ ...form, prompt: e.target.value })} required rows={3} placeholder="مثلاً: سالن گیمینگ تاریک با نور نئون آبی و بنفش، ۱۰ PC با کیس RGB، گیمرها در حال بازی Valorant، کیفیت 4K، سینمایی" className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white placeholder:text-gray-600 outline-none focus:border-primary/50 resize-none" />
          </div>
          <div className="md:col-span-2 flex items-center gap-3 bg-amber-500/5 border border-amber-500/20 rounded-xl p-3">
            <input type="checkbox" checked={form.confirmed} onChange={e => setForm({ ...form, confirmed: e.target.checked })} className="w-4 h-4 accent-primary" id="confirm-cost" />
            <label htmlFor="confirm-cost" className="text-[11px] text-amber-200/80 leading-relaxed">تأیید می‌کنم که این تولید از سهمیه روزانه کم می‌کند و ممکن است هزینه داشته باشد. اگر کلید API ندارید، در <b>/admin/apiKeys</b> اضافه کنید.</label>
          </div>
          <div className="md:col-span-2">
            <button disabled={busy || !form.confirmed} className="w-full md:w-auto px-6 py-3 bg-primary hover:bg-primary-hover disabled:opacity-40 text-black font-black rounded-xl text-xs flex items-center justify-center gap-2">
              {busy ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
              {busy ? 'در حال تولید...' : 'تولید تصویر'}
            </button>
          </div>
        </form>
        {error && <div className="mt-3 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-[11px] text-red-300">{error}</div>}
      </div>

      {/* Tasks */}
      <div className="bg-dark-card border border-white/10 rounded-2xl p-5">
        <div className="flex items-center justify-between">
          <h4 className="font-black text-white text-sm flex items-center gap-2"><Clock className="w-4 h-4 text-gray-400" /> وظایف اخیر</h4>
          <button onClick={() => void reload()} className="p-2 bg-white/5 hover:bg-white/10 rounded-lg border border-white/10"><RefreshCw className="w-4 h-4 text-gray-400" /></button>
        </div>
        <div className="mt-4 space-y-2 max-h-80 overflow-y-auto">
          {tasks.length === 0 && <p className="text-[11px] text-gray-500 py-8 text-center">هنوز وظیفه‌ای نداری - بالا عکس بساز</p>}
          {tasks.map((t: any) => (
            <div key={t.id} className="flex items-center justify-between p-3 bg-black/30 border border-white/5 rounded-xl">
              <div className="min-w-0 flex-1"><p className="text-xs font-bold text-white truncate">{t.title || 'بدون عنوان'}</p><p className="text-[10px] text-gray-500 font-mono mt-0.5">{t.id.slice(0, 12)} • {t.provider} • {t.status}</p></div>
              <span className={`text-[10px] px-2.5 py-1 rounded-lg border font-bold ${t.status === 'completed' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300' : t.status === 'failed' ? 'bg-red-500/10 border-red-500/20 text-red-300' : 'bg-amber-500/10 border-amber-500/20 text-amber-300'}`}>{t.status}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function TrendsSimple({ language, dir }: Props) {
  const api = usePublishingApi();
  const [latest, setLatest] = useState<any>(null);
  const [error, setError] = useState('');
  const [showGuide, setShowGuide] = useState(false);

  useEffect(() => { api('/trends/latest').then(setLatest).catch((e: any) => setError(e.code || e.message)); }, [api]);

  return (
    <div className="space-y-5">
      <div className="bg-gradient-to-r from-emerald-500/10 to-blue-500/10 border border-emerald-500/20 rounded-2xl p-5">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center shrink-0"><TrendingUp className="w-5 h-5 text-emerald-300" /></div>
          <div className="flex-1">
            <h3 className="font-black text-white text-sm">ترندهای روز گیمینگ - برای ایده محتوا</h3>
            <p className="text-[12px] text-gray-300 mt-1.5 leading-relaxed">اینجا آخرین ترندهای YouTube Gaming و Twitch رو می‌بینی. برای اینکه بدونی امروز چی مد شده، چه بازی‌هایی داغه، و چه محتوایی بسازی.</p>
            <button onClick={() => setShowGuide(!showGuide)} className="mt-3 text-[10px] px-2.5 py-1 rounded-lg bg-primary/10 border border-primary/20 text-primary">راهنما {showGuide ? '▲' : '▼'}</button>
            {showGuide && (
              <div className="mt-3 p-3 bg-black/30 rounded-xl border border-white/5 space-y-2">
                <p className="text-[11px] text-gray-400">• اگه ترندها خالیه، یعنی کلید YouTube API یا Twitch Client ID رو در <b className="text-white">مرکز کلیدها /admin/apiKeys</b> وارد نکردی</p>
                <p className="text-[11px] text-gray-400">• از عنوان ترندها برای پرامپت تولید عکس استفاده کن</p>
                <img src="/images/admin-guides/content-step2.png" alt="trends guide" className="mt-2 w-full rounded-lg border border-white/10 max-h-64 object-contain bg-black/20" />
              </div>
            )}
          </div>
        </div>
      </div>

      {error && <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-[11px] text-red-300">{error} - کلید API را در /admin/apiKeys چک کن</div>}

      {!latest ? <div className="bg-dark-card border border-white/10 rounded-2xl p-10 text-center"><RefreshCw className="w-6 h-6 text-gray-600 mx-auto animate-spin" /><p className="text-[11px] text-gray-500 mt-2">در حال بارگذاری ترندها...</p></div> : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-dark-card border border-white/10 rounded-2xl p-5">
            <h4 className="font-black text-white text-sm flex items-center gap-2"><span className="w-6 h-6 rounded-lg bg-red-500/20 border border-red-500/30 flex items-center justify-center text-[10px] font-black text-red-300">YT</span> YouTube Gaming - ترند امروز</h4>
            <div className="mt-4 space-y-3">
              {(latest.youtube || []).slice(0, 8).map((y: any, i: number) => (
                <div key={i} className="p-3 bg-black/30 border border-white/5 rounded-xl hover:border-white/10 transition-colors">
                  <p className="text-xs font-bold text-white line-clamp-2">{y.title}</p>
                  <p className="text-[10px] text-gray-500 mt-1">{y.channel} • {y.views} بازدید</p>
                </div>
              ))}
              {(!latest.youtube || latest.youtube.length === 0) && <p className="text-[11px] text-gray-500 py-6 text-center">داده‌ای نیست - کلید YouTube API را در مرکز کلیدها وارد کن</p>}
            </div>
          </div>
          <div className="bg-dark-card border border-white/10 rounded-2xl p-5">
            <h4 className="font-black text-white text-sm flex items-center gap-2"><span className="w-6 h-6 rounded-lg bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-[10px] font-black text-purple-300">TW</span> Twitch - پربازدیدترین</h4>
            <div className="mt-4 space-y-3">
              {(latest.twitch || []).slice(0, 8).map((t: any, i: number) => (
                <div key={i} className="p-3 bg-black/30 border border-white/5 rounded-xl hover:border-white/10 transition-colors">
                  <p className="text-xs font-bold text-white">{t.name}</p>
                  <p className="text-[10px] text-gray-500 mt-1">{t.viewers} بیننده • {t.category || 'Gaming'}</p>
                </div>
              ))}
              {(!latest.twitch || latest.twitch.length === 0) && <p className="text-[11px] text-gray-500 py-6 text-center">داده‌ای نیست - کلید Twitch را در مرکز کلیدها وارد کن</p>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function PostsSimple({ language, dir, addNotification }: Props) {
  const api = usePublishingApi();
  const [drafts, setDrafts] = useState<any[]>([]);
  const [showGuide, setShowGuide] = useState(false);

  const reload = useCallback(async () => {
    try { const d = await api('/drafts'); setDrafts(d); } catch {}
  }, [api]);

  useEffect(() => { void reload(); }, [reload]);

  return (
    <div className="space-y-5">
      <div className="bg-gradient-to-r from-cyan-500/10 to-blue-500/10 border border-cyan-500/20 rounded-2xl p-5">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center shrink-0"><Send className="w-5 h-5 text-cyan-300" /></div>
          <div className="flex-1">
            <h3 className="font-black text-white text-sm">صف انتشار - پست‌های آماده اینستا/تلگرام</h3>
            <p className="text-[12px] text-gray-300 mt-1.5 leading-relaxed">اینجا پست‌هایی که ساختی می‌مونه. ادمین تأیید می‌کنه، بعد به اینستا و تلگرام می‌ره. هر پست: عکس + کپشن + زمان انتشار.</p>
            <button onClick={() => setShowGuide(!showGuide)} className="mt-3 text-[10px] px-2.5 py-1 rounded-lg bg-primary/10 border border-primary/20 text-primary">راهنما {showGuide ? '▲' : '▼'}</button>
            {showGuide && (
              <div className="mt-3 p-3 bg-black/30 rounded-xl border border-white/5 space-y-2">
                <p className="text-[11px] text-gray-400"><b className="text-white">گام ۱:</b> در تب تولید رسانه، عکس بساز و "ورود به پیش‌نویس" بزن</p>
                <p className="text-[11px] text-gray-400"><b className="text-white">گام ۲:</b> اینجا کپشن بنویس و عکس‌ها را مرتب کن</p>
                <p className="text-[11px] text-gray-400"><b className="text-white">گام ۳:</b> "پیش‌نمایش و تأیید" بزن، تیک بزن، تأیید</p>
                <p className="text-[11px] text-gray-400"><b className="text-white">گام ۴:</b> "انتشار / زمان‌بندی" بزن - اگر ارسال زنده خاموشه، در صف می‌مونه تا فعال کنی</p>
                <img src="/images/admin-guides/content-step3.png" alt="posts guide" className="mt-2 w-full rounded-lg border border-white/10 max-h-64 object-contain bg-black/20" />
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="bg-dark-card border border-white/10 rounded-2xl p-5">
        <div className="flex items-center justify-between">
          <h4 className="font-black text-white text-sm">پست‌ها و پیش‌نویس‌ها ({drafts.length})</h4>
          <button onClick={() => void reload()} className="p-2 bg-white/5 hover:bg-white/10 rounded-lg border border-white/10"><RefreshCw className="w-4 h-4 text-gray-400" /></button>
        </div>
        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {drafts.length === 0 && <p className="col-span-full text-[11px] text-gray-500 py-10 text-center">هنوز پستی نداری - اول در تب تولید رسانه عکس بساز</p>}
          {drafts.map((d: any) => (
            <div key={d.id} className="bg-black/30 border border-white/10 rounded-xl p-4 hover:border-white/20 transition-colors">
              <div className="flex items-center justify-between"><span className={`text-[10px] px-2 py-0.5 rounded-lg border font-bold ${d.data.status === 'approved' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300' : 'bg-white/5 border-white/10 text-gray-400'}`}>{d.data.status}</span><span className="text-[10px] text-gray-500 font-mono">{d.data.language?.toUpperCase()} • {d.data.format}</span></div>
              <h5 className="font-bold text-white text-xs mt-2 truncate">{d.data.title || 'بدون عنوان'}</h5>
              <p className="text-[11px] text-gray-400 mt-1 line-clamp-2">{d.data.caption || '—'}</p>
              <p className="text-[10px] text-gray-600 mt-2 font-mono">{d.id.slice(0, 12)} • {d.data.assetIds?.length || 0} رسانه</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function AdminContentStudioRedesigned({ language, dir, addNotification }: Props) {
  const [activeTab, setActiveTab] = useState<SimpleTab>('guide');
  const [showAdvanced, setShowAdvanced] = useState(false);

  const tabs: { id: SimpleTab; fa: string; en: string; icon: any; descFa: string }[] = [
    { id: 'guide', fa: 'راهنمای سریع', en: 'Quick Guide', icon: BookOpen, descFa: 'برای صاحب گیم‌نت: استودیو چیست و چطور استفاده کنیم' },
    { id: 'mediagen', fa: 'تولید تصویر', en: 'MediaGen', icon: Wand2, descFa: 'با AI عکس بساز - Flux / Imejis' },
    { id: 'trends', fa: 'ترندهای روز', en: 'Trends', icon: TrendingUp, descFa: 'YouTube و Twitch چی مد شده' },
    { id: 'posts', fa: 'صف انتشار', en: 'Publish Queue', icon: Send, descFa: 'پست‌های آماده اینستا و تلگرام' },
  ];

  return (
    <div className="space-y-6" dir={dir}>
      {/* Header with Breadcrumb */}
      <div className="bg-dark-card border border-white/10 rounded-2xl p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-[10px] text-gray-500 font-mono font-bold uppercase tracking-widest">پنل مدیریت / محتوا و بازاریابی / /admin/content</p>
            <h1 className="text-xl font-black text-white mt-1 flex items-center gap-2"><Sparkles className="w-5 h-5 text-primary" /> استودیوی محتوا و انتشار</h1>
            <p className="text-[12px] text-gray-400 mt-1 max-w-3xl leading-relaxed">
              اینجا برای گیم‌نت محتوا می‌سازی: عکس با هوش مصنوعی، ترندهای روز گیمینگ، و صف انتشار برای اینستاگرام و تلگرام. ساده، فارسی، برای کسی که هیچی از ادمین حالیش نیست.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setActiveTab('guide')} className="px-3 py-2 rounded-xl bg-primary/10 hover:bg-primary/20 border border-primary/20 text-primary text-[11px] font-black flex items-center gap-1.5"><HelpCircle className="w-4 h-4" /> راهنما</button>
          </div>
        </div>

        {/* Simple Tab Switcher - Big Cards */}
        <div className="mt-5 grid grid-cols-1 md:grid-cols-4 gap-3">
          {tabs.map(t => (
            <button key={t.id} onClick={() => setActiveTab(t.id)} className={`text-right p-4 rounded-xl border transition-all ${activeTab === t.id ? 'bg-primary text-black border-primary shadow-[0_0_20px_rgba(27,194,202,0.3)]' : 'bg-white/5 border-white/10 hover:bg-white/10 text-white'}`}>
              <div className="flex items-center gap-2"><t.icon className={`w-5 h-5 ${activeTab === t.id ? 'text-black' : 'text-primary'}`} /><span className="font-black text-xs">{t.fa}</span></div>
              <p className={`text-[10px] mt-1.5 leading-relaxed ${activeTab === t.id ? 'text-black/70' : 'text-gray-400'}`}>{t.descFa}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="min-h-[400px]">
        {activeTab === 'guide' && (
          <div className="space-y-5">
            <div className="bg-dark-card border border-white/10 rounded-2xl p-6">
              <h3 className="font-black text-white text-base flex items-center gap-2"><BookOpen className="w-5 h-5 text-primary" /> استودیوی محتوا چیست؟ (برای صاحب گیم‌نت)</h3>
              <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-black/30 border border-white/5 rounded-xl p-4"><div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center"><Wand2 className="w-5 h-5 text-cyan-400" /></div><h4 className="font-bold text-white text-xs mt-3">۱. تولید عکس</h4><p className="text-[11px] text-gray-400 mt-1 leading-relaxed">با هوش مصنوعی برای اینستاگرام عکس بساز. پرامپت بنویس مثل "سالن گیمینگ نئونی".</p></div>
                <div className="bg-black/30 border border-white/5 rounded-xl p-4"><div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center"><TrendingUp className="w-5 h-5 text-emerald-400" /></div><h4 className="font-bold text-white text-xs mt-3">۲. ترند یابی</h4><p className="text-[11px] text-gray-400 mt-1 leading-relaxed">ببین امروز تو YouTube و Twitch چی مد شده تا ایده بگیری.</p></div>
                <div className="bg-black/30 border border-white/5 rounded-xl p-4"><div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center"><Send className="w-5 h-5 text-purple-400" /></div><h4 className="font-bold text-white text-xs mt-3">۳. انتشار</h4><p className="text-[11px] text-gray-400 mt-1 leading-relaxed">پست‌ها در صف می‌مونه، تو تأیید می‌کنی، بعد به اینستا/تلگرام می‌ره.</p></div>
              </div>
              <div className="mt-6 p-4 bg-amber-500/5 border border-amber-500/20 rounded-xl">
                <p className="text-[11px] text-amber-200/80 flex items-start gap-2"><AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" /><span><b>نکته مهم:</b> اگر ترندها یا تولید تصویر کار نمی‌کنه، یعنی کلید API نداری. برو به <b className="text-white">هوش و تنظیمات فنی → کلیدهای API و اتصال‌ها</b> و کلیدها رو وارد کن: YouTube API, Twitch Client ID, Imejis API, Cloudflare Token. همه یک‌جا اونجا هست.</span></p>
              </div>
              <div className="mt-5">
                <h4 className="font-bold text-white text-xs">تصاویر واقعی از پنل جدید (Chromium):</h4>
                <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3">
                  <img src="/images/admin-guides/content-step1.png" alt="step1" className="w-full rounded-xl border border-white/10 bg-black/20 max-h-56 object-contain" />
                  <img src="/images/admin-guides/content-step2.png" alt="step2" className="w-full rounded-xl border border-white/10 bg-black/20 max-h-56 object-contain" />
                  <img src="/images/admin-guides/content-step3.png" alt="step3" className="w-full rounded-xl border border-white/10 bg-black/20 max-h-56 object-contain" />
                </div>
              </div>
            </div>

            <div className="bg-dark-card border border-white/10 rounded-2xl p-5">
              <h4 className="font-black text-white text-sm flex items-center gap-2"><Layers className="w-4 h-4 text-primary" /> مسیر انتشار - گام به گام</h4>
              <div className="mt-4 flex flex-wrap items-center gap-2 text-[11px]">
                <span className="px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary font-bold">۰۱ آماده‌سازی محتوا</span>
                <span className="text-gray-600">→</span>
                <span className="px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-gray-300">۰۲ پیش‌نمایش و تأیید</span>
                <span className="text-gray-600">→</span>
                <span className="px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-gray-300">۰۳ انتشار و ثبت رسانه</span>
                <span className="text-gray-600">→</span>
                <span className="px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-gray-300">۰۴ دعوت و انتساب</span>
              </div>
              <p className="text-[11px] text-gray-500 mt-3">عامل فقط شناسه رسانه منتشرشده را اعلام می‌کند. کد همکار، لینک دوست و کوپن در بک‌اند مدیریت می‌شوند.</p>
            </div>
          </div>
        )}
        {activeTab === 'mediagen' && <MediaGenSimple language={language} dir={dir} addNotification={addNotification} />}
        {activeTab === 'trends' && <TrendsSimple language={language} dir={dir} addNotification={addNotification} />}
        {activeTab === 'posts' && <PostsSimple language={language} dir={dir} addNotification={addNotification} />}
      </div>

      {/* Advanced Toggle */}
      <div className="bg-dark-card border border-white/10 rounded-2xl p-4">
        <button onClick={() => setShowAdvanced(!showAdvanced)} className="w-full flex items-center justify-between text-right">
          <span className="font-bold text-white text-xs flex items-center gap-2"><Settings2 className="w-4 h-4 text-gray-400" /> تنظیمات پیشرفته (برای ادمین فنی) - کمپین‌ها، رسانه‌های مجاز، عامل‌ها، اتصال</span>
          {showAdvanced ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
        </button>
        {showAdvanced && (
          <div className="mt-4 p-4 bg-amber-500/5 border border-amber-500/10 rounded-xl">
            <p className="text-[11px] text-gray-400">این بخش برای ادمین فنی است. اگر صاحب گیم‌نت هستی و چیزی حالیت نیست، نیازی به اینجا نداری. همه چیز ساده بالا هست.</p>
            <p className="text-[11px] text-gray-500 mt-2">برای دسترسی به نسخه قدیمی کامل، به تب‌های قدیمی برو: کمپین‌ها، رسانه‌های مجاز، رویدادها، عامل‌ها، تنظیمات، تلگرام، اینباکس.</p>
            <p className="text-[10px] text-gray-600 mt-2 font-mono">قدیمی: /admin/content با پارامتر ?advanced=1 نسخه کامل را باز می‌کند - در حال حاضر این نسخه ساده پیش‌فرض است.</p>
          </div>
        )}
      </div>
    </div>
  );
}
