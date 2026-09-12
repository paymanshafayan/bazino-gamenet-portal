/**
 * تب «اسلایدر سایت/اپ» در WebSyncModal — همان بخش مدیریت اسلایدر پنل ادمین وب
 * (هم اسلایدر صفحه اصلی سایت، هم اسلایدر اپلیکیشن موبایل):
 * ساخت/ویرایش/حذف اسلاید با تصویر، بخش هدف، عنوان و توضیحات ۴ زبان.
 * مسیرها: GET/POST /api/sync/app-sliders ، PUT/DELETE /api/sync/app-sliders/:id
 */
import React, { useCallback, useEffect, useState } from 'react';
import { Image as ImageIcon, RefreshCw, Plus, Pencil, Trash2, AlertCircle, CheckCircle2, Save } from 'lucide-react';
import { siteFetch, prettySiteError } from '../../utils/siteClient';

interface Props {
  webServerUrl: string;
  apiKey: string;
}

interface SliderRow {
  id: string; imageUrl: string; mobileImageUrl?: string; target: string;
  titleFa: string; titleEn: string; titleRu: string; titleTr: string;
  descFa?: string; descEn?: string; descRu?: string; descTr?: string;
}

const TARGETS: { value: string; label: string }[] = [
  { value: 'reserve', label: 'رزرو سیستم (reserve)' },
  { value: 'tournaments', label: 'تورنمنت‌ها (tournaments)' },
  { value: 'cafe', label: 'کافه (cafe)' },
  { value: 'shop', label: 'فروشگاه (shop)' },
  { value: 'pricing', label: 'تعرفه‌ها (pricing)' },
  { value: 'blog', label: 'بلاگ (blog)' },
  { value: 'home', label: 'صفحه اصلی (home)' },
];

const inp = 'w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-100 focus:outline-none focus:border-amber-500/50';
const emptySlide: SliderRow = {
  id: '', imageUrl: '', mobileImageUrl: '', target: 'reserve',
  titleFa: '', titleEn: '', titleRu: '', titleTr: '', descFa: '', descEn: '', descRu: '', descTr: '',
};

export const SiteSlidersPanel: React.FC<Props> = ({ webServerUrl, apiKey }) => {
  const [sliders, setSliders] = useState<SliderRow[]>([]);
  const [dataSource, setDataSource] = useState<'sample' | 'database'>('sample');
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [form, setForm] = useState<SliderRow | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const d = await siteFetch(webServerUrl, apiKey, '/api/sync/app-sliders');
      setSliders(d.sliders || []);
      setDataSource(d.dataSource || 'sample');
    } catch (err) {
      setError(prettySiteError(err));
    } finally {
      setLoading(false);
    }
  }, [webServerUrl, apiKey]);

  useEffect(() => { void load(); }, [load]);

  const set = (patch: Partial<SliderRow>) => setForm((f) => (f ? { ...f, ...patch } : f));

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form) return;
    if (!form.imageUrl.trim() || !form.target) {
      setMsg({ ok: false, text: 'آدرس تصویر و بخش هدف الزامی است.' });
      return;
    }
    setBusy('save'); setMsg(null);
    try {
      const body = {
        imageUrl: form.imageUrl.trim(),
        mobileImageUrl: form.mobileImageUrl?.trim() || undefined,
        target: form.target,
        titleFa: form.titleFa, titleEn: form.titleEn, titleRu: form.titleRu, titleTr: form.titleTr,
        descFa: form.descFa, descEn: form.descEn, descRu: form.descRu, descTr: form.descTr,
      };
      if (form.id) {
        await siteFetch(webServerUrl, apiKey, `/api/sync/app-sliders/${encodeURIComponent(form.id)}`, { method: 'PUT', body });
      } else {
        await siteFetch(webServerUrl, apiKey, '/api/sync/app-sliders', { method: 'POST', body });
      }
      setMsg({ ok: true, text: form.id ? 'اسلاید ویرایش شد.' : 'اسلاید جدید ساخته شد.' });
      setForm(null);
      void load();
    } catch (err) {
      setMsg({ ok: false, text: prettySiteError(err) });
    } finally {
      setBusy(null);
    }
  };

  const remove = async (id: string) => {
    if (!window.confirm('این اسلاید حذف شود؟')) return;
    setBusy('del-' + id); setMsg(null);
    try {
      await siteFetch(webServerUrl, apiKey, `/api/sync/app-sliders/${encodeURIComponent(id)}`, { method: 'DELETE' });
      setMsg({ ok: true, text: 'اسلاید حذف شد.' });
      void load();
    } catch (err) {
      setMsg({ ok: false, text: prettySiteError(err) });
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ImageIcon className="w-4 h-4 text-amber-400" />
          <h3 className="font-bold text-zinc-100">اسلایدر صفحه اصلی سایت و اپلیکیشن</h3>
          {dataSource === 'sample' && (
            <span className="px-2 py-0.5 bg-sky-500/10 border border-sky-500/30 rounded-full text-[9px] text-sky-300 font-bold">
              حالت نمونه — رکوردهای جدید بعد از تغییر منبع داده به «دیتابیس» نمایش داده می‌شوند
            </span>
          )}
        </div>
        <div className="flex gap-2">
          <button onClick={() => setForm({ ...emptySlide })} className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold rounded-lg text-[10px]">
            <Plus className="w-3.5 h-3.5" /> اسلاید جدید
          </button>
          <button onClick={() => void load()} disabled={loading}
            className="flex items-center gap-1.5 px-2.5 py-1.5 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-zinc-300 disabled:opacity-50">
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            بروزرسانی
          </button>
        </div>
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

      {/* فرم ساخت/ویرایش */}
      {form && (
        <form onSubmit={save} className="bg-zinc-900 border border-amber-500/30 rounded-2xl p-4 space-y-3">
          <div className="text-zinc-200 font-bold text-xs">{form.id ? `ویرایش اسلاید (${form.id})` : 'ساخت اسلاید جدید'}</div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="md:col-span-2">
              <label className="text-[10px] text-zinc-500 font-bold block mb-1">آدرس تصویر اسلاید *</label>
              <input type="text" dir="ltr" required value={form.imageUrl} onChange={(e) => set({ imageUrl: e.target.value })}
                placeholder="/images/home/esports-480.webp" className={`${inp} font-mono`} />
            </div>
            <div className="md:col-span-2">
              <label className="text-[10px] text-zinc-500 font-bold block mb-1">تصویر عمودی نسخه موبایل (اختیاری)</label>
              <input type="text" dir="ltr" value={form.mobileImageUrl || ''} onChange={(e) => set({ mobileImageUrl: e.target.value })}
                placeholder="/images/mobile/…" className={`${inp} font-mono`} />
            </div>
            <div className="md:col-span-2">
              <label className="text-[10px] text-zinc-500 font-bold block mb-1">بخش هدف دکمه اسلاید *</label>
              <select value={form.target} onChange={(e) => set({ target: e.target.value })} className={inp}>
                {TARGETS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            {([
              ['titleFa', 'عنوان فارسی'], ['titleEn', 'عنوان انگلیسی'], ['titleRu', 'عنوان روسی'], ['titleTr', 'عنوان ترکی'],
            ] as const).map(([k, lbl]) => (
              <div key={k}>
                <label className="text-[10px] text-zinc-500 font-bold block mb-1">{lbl}</label>
                <input type="text" value={(form as any)[k]} onChange={(e) => set({ [k]: e.target.value } as any)} className={inp} />
              </div>
            ))}
            {([
              ['descFa', 'توضیح فارسی'], ['descEn', 'توضیح انگلیسی'], ['descRu', 'توضیح روسی'], ['descTr', 'توضیح ترکی'],
            ] as const).map(([k, lbl]) => (
              <div key={k}>
                <label className="text-[10px] text-zinc-500 font-bold block mb-1">{lbl}</label>
                <input type="text" value={(form as any)[k] || ''} onChange={(e) => set({ [k]: e.target.value } as any)} className={inp} />
              </div>
            ))}
          </div>
          <div className="flex gap-2 justify-end border-t border-zinc-800 pt-3">
            <button type="button" onClick={() => setForm(null)} className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg text-xs">انصراف</button>
            <button type="submit" disabled={busy === 'save'}
              className="flex items-center gap-1.5 px-4 py-2 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-zinc-950 font-bold rounded-lg text-xs">
              <Save className="w-3.5 h-3.5" /> {form.id ? 'ذخیرهٔ تغییرات' : 'ساخت اسلاید'}
            </button>
          </div>
        </form>
      )}

      {/* لیست اسلایدها */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 space-y-2">
        <div className="text-zinc-200 font-bold text-xs">اسلایدهای ثبت‌شده ({sliders.length})</div>
        {sliders.length === 0 && !loading && <p className="text-zinc-500 text-xs">اسلایدی ثبت نشده است.</p>}
        <div className="grid gap-2">
          {sliders.map((s) => (
            <div key={s.id} className="flex items-center gap-3 p-2.5 rounded-xl border border-zinc-800 bg-zinc-950">
              <div className="w-24 h-14 rounded-lg overflow-hidden bg-zinc-900 border border-zinc-800 shrink-0">
                <img src={s.imageUrl} alt="" className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.opacity = '0.2'; }} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-bold text-zinc-100 truncate">{s.titleFa || s.titleEn || s.titleTr || s.id}</div>
                <div className="text-[10px] text-zinc-500 truncate" dir="ltr">{s.target} · {s.imageUrl}</div>
              </div>
              <button onClick={() => setForm({ ...s })} title="ویرایش"
                className="shrink-0 p-2 rounded-lg text-zinc-400 border border-zinc-800 hover:text-amber-400">
                <Pencil className="w-4 h-4" />
              </button>
              <button onClick={() => void remove(s.id)} disabled={busy === 'del-' + s.id} title="حذف"
                className="shrink-0 p-2 rounded-lg text-zinc-500 border border-zinc-800 hover:bg-rose-500/20 hover:text-rose-400 disabled:opacity-50">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
