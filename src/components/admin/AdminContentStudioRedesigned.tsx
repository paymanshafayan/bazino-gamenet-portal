/**
 * استودیوی محتوا - نسخه سفید تمیز
 * - کارت‌ها سفید #ffffff border #c3c4c7
 * - ورودی 30px
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  Sparkles, ImagePlus, TrendingUp, Send, Layers,
  RefreshCw, Wand2, Clock, AlertTriangle, BookOpen, HelpCircle, Settings2, ChevronDown, ChevronUp
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
      addNotification('درخواست ثبت شد', 'success');
      setForm({ ...form, prompt: '', title: '' });
      await reload();
    } catch (e: any) { setError(e.code || e.message); addNotification('خطا: ' + (e.code || e.message), 'error'); }
    finally { setBusy(false); }
  }

  const cardCls = "bg-white border border-[#c3c4c7] shadow-[0_1px_1px_rgba(0,0,0,0.04)] rounded-[2px]";
  const inputCls = "h-[30px] bg-white border border-[#8c8f94] focus:border-[#2271b1] focus:shadow-[0_0_0_1px_#2271b1] rounded-[3px] px-2.5 text-[13px] text-[#2c3338] outline-none w-full";

  return (
    <div className="space-y-4">
      <div className={`${cardCls} p-4 bg-[#f0f6fc] border-[#a7d0e4]`}>
        <div className="flex items-start gap-2">
          <div className="w-8 h-8 rounded-[2px] bg-[#2271b1] text-white flex items-center justify-center shrink-0"><Wand2 className="w-4 h-4" /></div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-[#1d2327] text-[13px]">{L(language, { fa: 'تولید تصویر با هوش مصنوعی', en: 'AI Image Generation', ru: 'Генерация изображений', tr: 'AI Görsel Üretimi' })}</h3>
            <p className="text-[12px] text-[#50575e] mt-1 leading-relaxed">{L(language, { fa: 'پرامپت بنویس و تولید بزن. سیستم با Flux عکس می‌سازد.', en: 'Write prompt and generate. System uses Flux.', ru: 'Напишите промпт и сгенерируйте.', tr: 'İstem yaz ve oluştur.' })}</p>
          </div>
        </div>
      </div>

      {quota && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className={`${cardCls} p-4 flex items-center justify-between`}><div><p className="text-[11px] text-[#646970] font-bold uppercase">Flux</p><p className="text-[16px] font-normal text-[#1d2327] mt-1">{quota.flux?.used || 0} / {quota.flux?.limit || 20}</p></div><ImagePlus className="w-5 h-5 text-[#2271b1]" /></div>
          <div className={`${cardCls} p-4 flex items-center justify-between`}><div><p className="text-[11px] text-[#646970] font-bold uppercase">Imejis</p><p className="text-[16px] font-normal text-[#1d2327] mt-1">{quota.imejis?.used || 0} / {quota.imejis?.limit || 50}</p></div><Layers className="w-5 h-5 text-[#2271b1]" /></div>
          <div className={`${cardCls} p-4 flex items-center justify-between`}><div><p className="text-[11px] text-[#646970] font-bold uppercase">Compose</p><p className="text-[16px] font-normal text-[#1d2327] mt-1">{quota.compose?.used || 0} / {quota.compose?.limit || 10}</p></div><Layers className="w-5 h-5 text-[#2271b1]" /></div>
        </div>
      )}

      <div className={`${cardCls} p-4`}>
        <h4 className="font-semibold text-[#1d2327] text-[13px] flex items-center gap-2"><Sparkles className="w-4 h-4 text-[#2271b1]" />{L(language, { fa: 'فرم تولید', en: 'Generate Form', ru: 'Форма', tr: 'Form' })}</h4>
        <form onSubmit={generate} className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
          <div><label className="text-[11px] text-[#646970] font-bold block mb-1">Title</label><input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} required maxLength={200} placeholder="عنوان" className={inputCls} /></div>
          <div><label className="text-[11px] text-[#646970] font-bold block mb-1">Model</label><select value={form.provider} onChange={e => setForm({ ...form, provider: e.target.value })} className={inputCls}><option value="flux">Flux</option><option value="imejis">Imejis</option><option value="compose">Compose</option></select></div>
          <div className="md:col-span-2"><label className="text-[11px] text-[#646970] font-bold block mb-1">Prompt</label><textarea value={form.prompt} onChange={e => setForm({ ...form, prompt: e.target.value })} required rows={3} placeholder="توضیح عکس" className="bg-white border border-[#8c8f94] rounded-[3px] px-2.5 py-2 text-[13px] text-[#2c3338] outline-none w-full" /></div>
          <div className="md:col-span-2 flex items-center gap-2 bg-[#fcf9e8] border border-[#dba617] rounded-[2px] p-2.5"><input type="checkbox" checked={form.confirmed} onChange={e => setForm({ ...form, confirmed: e.target.checked })} className="w-4 h-4" id="confirm-cost" /><label htmlFor="confirm-cost" className="text-[11px] text-[#3c434a]">تأیید هزینه سهمیه</label></div>
          <div className="md:col-span-2"><button disabled={busy || !form.confirmed} className="h-[30px] px-4 bg-[#2271b1] hover:bg-[#135e96] disabled:opacity-40 text-white rounded-[3px] text-[13px] flex items-center gap-2">{busy ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}{busy ? '...' : L(language, { fa: 'تولید', en: 'Generate', ru: 'Генерировать', tr: 'Oluştur' })}</button></div>
        </form>
        {error && <div className="mt-3 p-2.5 bg-[#fcf0f1] border border-[#e9a0a0] rounded-[2px] text-[12px] text-[#8a2424]">{error}</div>}
      </div>

      <div className={`${cardCls} p-4`}>
        <div className="flex items-center justify-between"><h4 className="font-semibold text-[#1d2327] text-[13px] flex items-center gap-2"><Clock className="w-4 h-4 text-[#646970]" />{L(language, { fa: 'وظایف', en: 'Tasks', ru: 'Задачи', tr: 'Görevler' })}</h4><button onClick={() => void reload()} className="h-[30px] px-2 bg-white border border-[#dcdcde] rounded-[3px] text-[#50575e]"><RefreshCw className="w-4 h-4" /></button></div>
        <div className="mt-3 space-y-2 max-h-80 overflow-y-auto">
          {tasks.length === 0 && <p className="text-[11px] text-[#646970] py-8 text-center">—</p>}
          {tasks.map((t: any) => (
            <div key={t.id} className="flex items-center justify-between p-2.5 bg-[#fcfcfc] border border-[#dcdcde] rounded-[2px]">
              <div className="min-w-0 flex-1"><p className="text-[12px] font-medium text-[#1d2327] truncate">{t.title || '—'}</p><p className="text-[10px] text-[#a7aaad] font-mono mt-0.5">{t.id.slice(0, 12)} • {t.provider} • {t.status}</p></div>
              <span className={`text-[10px] px-2 py-0.5 rounded border ${t.status === 'completed' ? 'bg-[#d5e9f0] border-[#a7d0e4] text-[#0676a3]' : t.status === 'failed' ? 'bg-[#fcf0f1] border-[#e9a0a0] text-[#8a2424]' : 'bg-[#fcf9e8] border-[#dba617] text-[#996800]'}`}>{t.status}</span>
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

  useEffect(() => { api('/trends/latest').then(setLatest).catch((e: any) => setError(e.code || e.message)); }, [api]);

  const cardCls = "bg-white border border-[#c3c4c7] shadow-[0_1px_1px_rgba(0,0,0,0.04)] rounded-[2px]";

  return (
    <div className="space-y-4">
      <div className={`${cardCls} p-4 bg-[#f0f6fc] border-[#a7d0e4]`}>
        <div className="flex items-start gap-2">
          <div className="w-8 h-8 rounded-[2px] bg-[#2271b1] text-white flex items-center justify-center shrink-0"><TrendingUp className="w-4 h-4" /></div>
          <div className="flex-1"><h3 className="font-semibold text-[#1d2327] text-[13px]">ترندهای روز</h3><p className="text-[12px] text-[#50575e] mt-1">YouTube و Twitch ترندها برای ایده محتوا</p></div>
        </div>
      </div>
      {error && <div className="p-2.5 bg-[#fcf0f1] border border-[#e9a0a0] rounded-[2px] text-[12px] text-[#8a2424]">{error}</div>}
      {!latest ? <div className={`${cardCls} p-10 text-center`}><RefreshCw className="w-6 h-6 text-[#a7aaad] mx-auto animate-spin" /><p className="text-[11px] text-[#646970] mt-2">Loading...</p></div> : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className={`${cardCls} p-4`}><h4 className="font-semibold text-[#1d2327] text-[13px]">YouTube</h4><div className="mt-3 space-y-2">{(latest.youtube || []).slice(0, 8).map((y: any, i: number) => <div key={i} className="p-2.5 bg-[#fcfcfc] border border-[#dcdcde] rounded-[2px]"><p className="text-[12px] font-medium text-[#1d2327] line-clamp-2">{y.title}</p><p className="text-[10px] text-[#a7aaad] mt-1">{y.channel}</p></div>)}</div></div>
          <div className={`${cardCls} p-4`}><h4 className="font-semibold text-[#1d2327] text-[13px]">Twitch</h4><div className="mt-3 space-y-2">{(latest.twitch || []).slice(0, 8).map((t: any, i: number) => <div key={i} className="p-2.5 bg-[#fcfcfc] border border-[#dcdcde] rounded-[2px]"><p className="text-[12px] font-medium text-[#1d2327]">{t.name}</p><p className="text-[10px] text-[#a7aaad] mt-1">{t.viewers} viewers</p></div>)}</div></div>
        </div>
      )}
    </div>
  );
}

function PostsSimple({ language, dir, addNotification }: Props) {
  const api = usePublishingApi();
  const [drafts, setDrafts] = useState<any[]>([]);
  const reload = useCallback(async () => { try { const d = await api('/drafts'); setDrafts(d); } catch {} }, [api]);
  useEffect(() => { void reload(); }, [reload]);
  const cardCls = "bg-white border border-[#c3c4c7] shadow-[0_1px_1px_rgba(0,0,0,0.04)] rounded-[2px]";
  return (
    <div className="space-y-4">
      <div className={`${cardCls} p-4 bg-[#f0f6fc] border-[#a7d0e4]`}><div className="flex items-start gap-2"><div className="w-8 h-8 rounded-[2px] bg-[#2271b1] text-white flex items-center justify-center shrink-0"><Send className="w-4 h-4" /></div><div className="flex-1"><h3 className="font-semibold text-[#1d2327] text-[13px]">صف انتشار</h3><p className="text-[12px] text-[#50575e] mt-1">پست‌های آماده اینستا/تلگرام</p></div></div></div>
      <div className={`${cardCls} p-4`}><div className="flex items-center justify-between"><h4 className="font-semibold text-[#1d2327] text-[13px]">پست‌ها ({drafts.length})</h4><button onClick={() => void reload()} className="h-[30px] px-2 bg-white border border-[#dcdcde] rounded-[3px] text-[#50575e]"><RefreshCw className="w-4 h-4" /></button></div><div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">{drafts.length === 0 && <p className="col-span-full text-[11px] text-[#646970] py-10 text-center">—</p>}{drafts.map((d: any) => <div key={d.id} className="bg-[#fcfcfc] border border-[#dcdcde] rounded-[2px] p-3"><div className="flex items-center justify-between"><span className={`text-[10px] px-1.5 py-0.5 rounded border ${d.data.status === 'approved' ? 'bg-[#d5e9f0] border-[#a7d0e4] text-[#0676a3]' : 'bg-[#f0f0f1] border-[#dcdcde] text-[#646970]'}`}>{d.data.status}</span><span className="text-[10px] text-[#a7aaad] font-mono">{d.data.language?.toUpperCase()}</span></div><h5 className="font-medium text-[#1d2327] text-[12px] mt-2 truncate">{d.data.title || '—'}</h5><p className="text-[11px] text-[#50575e] mt-1 line-clamp-2">{d.data.caption || '—'}</p></div>)}</div></div>
    </div>
  );
}

export default function AdminContentStudioRedesigned({ language, dir, addNotification }: Props) {
  const [activeTab, setActiveTab] = useState<SimpleTab>('guide');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const tabs: { id: SimpleTab; fa: string; en: string; icon: any; descFa: string }[] = [
    { id: 'guide', fa: 'راهنما', en: 'Guide', icon: BookOpen, descFa: 'معرفی استودیو' },
    { id: 'mediagen', fa: 'تولید تصویر', en: 'MediaGen', icon: Wand2, descFa: 'عکس با AI' },
    { id: 'trends', fa: 'ترندها', en: 'Trends', icon: TrendingUp, descFa: 'YouTube / Twitch' },
    { id: 'posts', fa: 'صف انتشار', en: 'Queue', icon: Send, descFa: 'پست‌های آماده' },
  ];
  const cardCls = "bg-white border border-[#c3c4c7] shadow-[0_1px_1px_rgba(0,0,0,0.04)] rounded-[2px]";

  return (
    <div className="space-y-4" dir={dir}>
      <div className={`${cardCls} p-4`}>
        <p className="text-[10px] text-[#a7aaad] font-mono uppercase">/admin/content</p>
        <h1 className="text-[18px] font-normal text-[#1d2327] mt-1 flex items-center gap-2"><Sparkles className="w-5 h-5 text-[#2271b1]" />{L(language, { fa: 'استودیو محتوا', en: 'Content Studio', ru: 'Студия контента', tr: 'İçerik Stüdyosu' })}</h1>
        <div className="mt-4 grid grid-cols-1 md:grid-cols-4 gap-2">
          {tabs.map(t => (
            <button key={t.id} onClick={() => setActiveTab(t.id)} className={`text-right p-3 rounded-[2px] border text-[13px] ${activeTab === t.id ? 'bg-[#2271b1] text-white border-[#2271b1]' : 'bg-[#fcfcfc] border-[#dcdcde] text-[#50575e] hover:bg-[#f6f7f7]'}`}>
              <div className="flex items-center gap-1.5"><t.icon className="w-4 h-4" /><span className="font-medium">{t.fa}</span></div>
              <p className={`text-[11px] mt-1 ${activeTab === t.id ? 'text-white/80' : 'text-[#a7aaad]'}`}>{t.descFa}</p>
            </button>
          ))}
        </div>
      </div>

      <div className="min-h-[300px]">
        {activeTab === 'guide' && (
          <div className="space-y-4">
            <div className={`${cardCls} p-5`}>
              <h3 className="font-semibold text-[#1d2327] text-[13px] flex items-center gap-2"><BookOpen className="w-4 h-4 text-[#2271b1]" />{L(language, { fa: 'استودیو چیست؟', en: 'What is Studio?', ru: 'Что такое студия?', tr: 'Stüdyo nedir?' })}</h3>
              <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="bg-[#fcfcfc] border border-[#dcdcde] rounded-[2px] p-3"><div className="w-8 h-8 rounded-[2px] bg-[#f0f6fc] border border-[#a7d0e4] flex items-center justify-center"><Wand2 className="w-4 h-4 text-[#2271b1]" /></div><h4 className="font-medium text-[#1d2327] text-[12px] mt-2">تولید عکس</h4><p className="text-[11px] text-[#50575e] mt-1">با AI عکس بساز</p></div>
                <div className="bg-[#fcfcfc] border border-[#dcdcde] rounded-[2px] p-3"><div className="w-8 h-8 rounded-[2px] bg-[#f0f6fc] border border-[#a7d0e4] flex items-center justify-center"><TrendingUp className="w-4 h-4 text-[#2271b1]" /></div><h4 className="font-medium text-[#1d2327] text-[12px] mt-2">ترند</h4><p className="text-[11px] text-[#50575e] mt-1">ترند روز ببین</p></div>
                <div className="bg-[#fcfcfc] border border-[#dcdcde] rounded-[2px] p-3"><div className="w-8 h-8 rounded-[2px] bg-[#f0f6fc] border border-[#a7d0e4] flex items-center justify-center"><Send className="w-4 h-4 text-[#2271b1]" /></div><h4 className="font-medium text-[#1d2327] text-[12px] mt-2">انتشار</h4><p className="text-[11px] text-[#50575e] mt-1">تأیید و انتشار</p></div>
              </div>
            </div>
          </div>
        )}
        {activeTab === 'mediagen' && <MediaGenSimple language={language} dir={dir} addNotification={addNotification} />}
        {activeTab === 'trends' && <TrendsSimple language={language} dir={dir} addNotification={addNotification} />}
        {activeTab === 'posts' && <PostsSimple language={language} dir={dir} addNotification={addNotification} />}
      </div>

      <div className={`${cardCls} p-3`}>
        <button onClick={() => setShowAdvanced(!showAdvanced)} className="w-full flex items-center justify-between text-right text-[12px] text-[#50575e]"><span className="flex items-center gap-1.5"><Settings2 className="w-4 h-4" />پیشرفته</span>{showAdvanced ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}</button>
        {showAdvanced && <div className="mt-3 p-3 bg-[#fcf9e8] border border-[#dba617] rounded-[2px] text-[11px] text-[#3c434a]">تنظیمات پیشرفته برای ادمین فنی</div>}
      </div>
    </div>
  );
}
