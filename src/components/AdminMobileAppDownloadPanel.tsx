import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Apple, Check, Copy, Download, Edit, ExternalLink, Github, PackageOpen, Play, Plus, QrCode, Save, Smartphone, Store, Trash2, Upload, X } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import type { MobileAppDownloadConfig, MobileAppStoreKind, MobileAppStoreLink } from '../types/mobileApp';
import { getAuthToken } from '../services/authToken';

interface Props {
  addNotification: (message: string, type: 'success' | 'error' | 'info') => void;
}

const STORE_OPTIONS: Array<{ kind: MobileAppStoreKind; fa: string; en: string }> = [
  { kind: 'google-play', fa: 'Google Play', en: 'Google Play' },
  { kind: 'cafebazaar', fa: 'کافه‌بازار', en: 'Cafe Bazaar' },
  { kind: 'myket', fa: 'مایکت', en: 'Myket' },
  { kind: 'app-store', fa: 'App Store', en: 'App Store' },
  { kind: 'testflight', fa: 'TestFlight', en: 'TestFlight' },
  { kind: 'github', fa: 'GitHub Releases', en: 'GitHub Releases' },
  { kind: 'direct', fa: 'لینک مستقیم خارجی', en: 'External direct link' },
  { kind: 'other', fa: 'سایر مخازن', en: 'Other repository' },
];

const iconFor = (kind: MobileAppStoreKind) => {
  if (kind === 'app-store' || kind === 'testflight') return Apple;
  if (kind === 'github') return Github;
  if (kind === 'google-play') return Play;
  if (kind === 'cafebazaar' || kind === 'myket') return Store;
  if (kind === 'direct') return Download;
  return PackageOpen;
};

const emptyForm = {
  kind: 'cafebazaar' as MobileAppStoreKind,
  labelFa: '',
  labelEn: '',
  url: '',
  isActive: true,
};

const formatBytes = (bytes?: number) => {
  if (!bytes) return '';
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const MAX_APK_BYTES = 160 * 1024 * 1024;
const APK_UPLOAD_TIMEOUT_MS = 5 * 60 * 1000;

type ApkUploadFailureReason = 'http' | 'network' | 'timeout' | 'aborted';

interface ApkUploadErrorDetails {
  httpStatus: number;
  responseBody: string;
  lastProgress: number;
  reason: ApkUploadFailureReason;
}

class ApkUploadRequestError extends Error {
  details: ApkUploadErrorDetails;

  constructor(details: ApkUploadErrorDetails) {
    super(`APK upload failed (${details.reason}, HTTP ${details.httpStatus || 0})`);
    this.name = 'ApkUploadRequestError';
    this.details = details;
  }
}

const responseTextOr = (xhr: XMLHttpRequest, fallback: string) => {
  try {
    return xhr.responseText || fallback;
  } catch {
    return fallback;
  }
};

const sendApkForm = (
  form: FormData,
  authToken: string | null,
  onProgress: (percent: number) => void,
) => new Promise<void>((resolve, reject) => {
  const xhr = new XMLHttpRequest();
  let settled = false;
  let lastProgress = 0;

  const fail = (reason: ApkUploadFailureReason, fallbackBody: string) => {
    if (settled) return;
    settled = true;
    reject(new ApkUploadRequestError({
      httpStatus: xhr.status || 0,
      responseBody: responseTextOr(xhr, fallbackBody),
      lastProgress,
      reason,
    }));
  };

  xhr.open('POST', '/api/admin/mobile-app/upload-apk');
  xhr.timeout = APK_UPLOAD_TIMEOUT_MS;
  // Do not set Content-Type: the browser must include FormData's multipart boundary.
  // Raw XHR does not pass through the global fetch interceptor.
  if (authToken) xhr.setRequestHeader('Authorization', `Bearer ${authToken}`);
  xhr.upload.onprogress = (event) => {
    if (!event.lengthComputable) return;
    lastProgress = Math.min(100, Math.max(0, Math.round((event.loaded / event.total) * 100)));
    onProgress(lastProgress);
  };
  xhr.onload = () => {
    if (settled) return;
    if (xhr.status >= 200 && xhr.status < 300) {
      settled = true;
      resolve();
      return;
    }
    fail('http', '(empty response body)');
  };
  xhr.onerror = () => fail('network', 'Network error: no response body was received');
  xhr.ontimeout = () => fail('timeout', `Upload request timed out after ${APK_UPLOAD_TIMEOUT_MS / 1000} seconds`);
  xhr.onabort = () => fail('aborted', 'Upload request was aborted before the server responded');

  try {
    xhr.send(form);
  } catch (error) {
    fail('network', String(error));
  }
});

export default function AdminMobileAppDownloadPanel({ addNotification }: Props) {
  const { language, dir } = useLanguage();
  const isFa = language === 'fa';
  const [config, setConfig] = useState<MobileAppDownloadConfig | null>(null);
  const [links, setLinks] = useState<MobileAppStoreLink[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isSavingLinks, setIsSavingLinks] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<ApkUploadErrorDetails | null>(null);

  const selectedOption = useMemo(() => STORE_OPTIONS.find((x) => x.kind === form.kind) || STORE_OPTIONS[0], [form.kind]);

  const loadConfig = async () => {
    const data = await fetch('/api/mobile-app').then((r) => r.json());
    setConfig(data);
    setLinks(Array.isArray(data.storeLinks) ? data.storeLinks : []);
  };

  useEffect(() => {
    void loadConfig().catch(() => addNotification(isFa ? 'خطا در دریافت تنظیمات دانلود اپلیکیشن' : 'Failed to load app download settings', 'error'));
  }, []);

  const resetForm = () => {
    setEditingId(null);
    setForm(emptyForm);
  };

  const persistLinks = async (nextLinks: MobileAppStoreLink[]) => {
    setIsSavingLinks(true);
    try {
      const res = await fetch('/api/admin/mobile-app/store-links', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ links: nextLinks }),
      });
      if (!res.ok) throw new Error('save failed');
      const data = await res.json();
      setLinks(data.storeLinks || nextLinks);
      setConfig((prev) => prev ? { ...prev, storeLinks: data.storeLinks || nextLinks } : prev);
      addNotification(isFa ? 'لینک‌های دانلود اپلیکیشن ذخیره شد' : 'App download links saved', 'success');
    } catch (e) {
      addNotification(isFa ? 'خطا در ذخیره لینک‌ها' : 'Failed to save links', 'error');
    } finally {
      setIsSavingLinks(false);
    }
  };

  const submitLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.url.trim()) return;
    const autoFa = form.labelFa.trim() || selectedOption.fa;
    const autoEn = form.labelEn.trim() || selectedOption.en;
    const item: MobileAppStoreLink = {
      id: editingId || `store-${Date.now()}`,
      kind: form.kind,
      labelFa: autoFa,
      labelEn: autoEn,
      url: form.url.trim(),
      isActive: form.isActive,
    };
    const next = editingId ? links.map((x) => (x.id === editingId ? item : x)) : [...links, item];
    await persistLinks(next);
    resetForm();
  };

  const editLink = (link: MobileAppStoreLink) => {
    setEditingId(link.id);
    setForm({ kind: link.kind, labelFa: link.labelFa, labelEn: link.labelEn, url: link.url, isActive: link.isActive });
  };

  const removeLink = async (id: string) => {
    await persistLinks(links.filter((x) => x.id !== id));
  };

  const toggleLink = async (id: string) => {
    await persistLinks(links.map((x) => x.id === id ? { ...x, isActive: !x.isActive } : x));
  };

  const uploadApk = async (file: File) => {
    if (!file.name.toLowerCase().endsWith('.apk')) {
      addNotification(isFa ? 'فقط فایل APK قابل آپلود است' : 'Only APK files are allowed', 'error');
      return;
    }
    if (file.size < 1) {
      addNotification(isFa ? 'فایل APK خالی است' : 'The APK file is empty', 'error');
      return;
    }
    if (file.size > MAX_APK_BYTES) {
      addNotification(isFa ? 'حجم فایل APK بیشتر از ۱۶۰ مگابایت است' : 'APK file is larger than 160 MB', 'error');
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);
    setUploadError(null);

    const form = new FormData();
    form.append('file', file);

    let lastProgress = 0;
    try {
      await sendApkForm(form, getAuthToken(), (percent) => {
        lastProgress = percent;
        setUploadProgress(percent);
      });
      setUploadProgress(100);
      setUploadError(null);
      addNotification(isFa ? 'فایل APK با موفقیت آپلود شد' : 'APK uploaded successfully', 'success');
      void loadConfig().catch(() => addNotification(isFa ? 'آپلود انجام شد، اما دریافت متادیتای تازه ناموفق بود' : 'Upload succeeded, but refreshing metadata failed', 'error'));
    } catch (error) {
      const details = error instanceof ApkUploadRequestError
        ? error.details
        : {
            httpStatus: 0,
            responseBody: String(error),
            lastProgress,
            reason: 'network' as const,
          };
      setUploadProgress(details.lastProgress);
      setUploadError(details);
      addNotification(isFa ? 'آپلود APK ناموفق بود؛ جزئیات خطا در پنل نمایش داده شد' : 'APK upload failed; diagnostics are shown in the panel', 'error');
    } finally {
      setIsUploading(false);
    }
  };

  const copyUploadError = async () => {
    if (!uploadError) return;
    const diagnostic = [
      `HTTP status: ${uploadError.httpStatus || 0}`,
      `Reason: ${uploadError.reason}`,
      `Last progress: ${uploadError.lastProgress}%`,
      'Response body:',
      uploadError.responseBody,
    ].join('\n');

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(diagnostic);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = diagnostic;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        textarea.remove();
      }
      addNotification(isFa ? 'جزئیات خطا کپی شد' : 'Error details copied', 'success');
    } catch {
      addNotification(isFa ? 'کپی جزئیات خطا ناموفق بود' : 'Failed to copy error details', 'error');
    }
  };

  return (
    <div className="space-y-6" dir={dir}>
      <div className="bg-[#0b1020] border border-white/10 rounded-2xl p-6 overflow-hidden relative">
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-cyan-400 via-violet-400 to-amber-300" />
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-cyan-400/10 text-cyan-200 border border-cyan-300/20 flex items-center justify-center">
              <Smartphone className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-black text-white">{isFa ? 'دانلود اپلیکیشن موبایل' : 'Mobile App Download'}</h2>
              <p className="mt-1 text-xs leading-6 text-gray-400 max-w-2xl">
                {isFa
                  ? 'فایل APK و لینک فروشگاه‌های اپلیکیشن را از اینجا مدیریت کنید. صفحه دانلود و کارت QR پایین صفحه اصلی به‌صورت مستقل از قالب سایت از همین تنظیمات استفاده می‌کنند.'
                  : 'Manage the APK file and app store links here. The download page and homepage QR card use these settings independently from site themes.'}
              </p>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <a href="/api/mobile-app/qr.png?size=1600" className="inline-flex items-center justify-center gap-2 rounded-xl bg-cyan-300 text-slate-950 px-4 py-3 text-xs font-black">
              <QrCode className="w-4 h-4" />
              {isFa ? 'دانلود QR باکیفیت' : 'Download hi-res QR'}
            </a>
            <a href="/app-download" target="_blank" rel="noreferrer" className="inline-flex items-center justify-center gap-2 rounded-xl bg-white text-slate-950 px-4 py-3 text-xs font-black">
              <ExternalLink className="w-4 h-4" />
              {isFa ? 'مشاهده صفحه دانلود' : 'View download page'}
            </a>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[0.95fr_1.05fr] gap-6">
        <section className="bg-dark-card border border-white/10 rounded-2xl p-6">
          <h3 className="text-sm font-black text-white flex items-center gap-2 mb-4">
            <Upload className="w-4 h-4 text-cyan-300" />
            {isFa ? 'آپلود فایل APK' : 'Upload APK file'}
          </h3>
          <label className="block rounded-2xl border border-dashed border-cyan-300/25 bg-cyan-300/[0.04] p-6 text-center cursor-pointer hover:bg-cyan-300/[0.08] transition-colors">
            <input
              type="file"
              accept=".apk,application/vnd.android.package-archive"
              className="hidden"
              disabled={isUploading}
              onChange={(event) => {
                const file = event.currentTarget.files?.[0];
                event.currentTarget.value = '';
                if (file) void uploadApk(file);
              }}
            />
            <Upload className="w-8 h-8 text-cyan-200 mx-auto mb-3" />
            <div className="text-sm font-black text-white">{isFa ? 'انتخاب و آپلود APK' : 'Choose and upload APK'}</div>
            <p className="text-[11px] text-gray-400 mt-2">{isFa ? 'فایل با نام ثابت روی سرور ذخیره می‌شود و دکمه دانلود مستقیم را فعال می‌کند.' : 'The file is saved on the server and enables the direct download button.'}</p>
          </label>

          {(isUploading || uploadProgress > 0) && (
            <div className="mt-4">
              <div className="flex items-center justify-between text-[11px] text-gray-400 mb-1">
                <span>{isFa ? 'پیشرفت آپلود' : 'Upload progress'}</span>
                <span>{uploadProgress}%</span>
              </div>
              <div className="h-3 rounded-full bg-black/40 border border-white/10 overflow-hidden">
                <div className="h-full bg-gradient-to-r from-cyan-400 to-emerald-400 transition-all" style={{ width: `${uploadProgress}%` }} />
              </div>
            </div>
          )}

          {uploadError && (
            <div className="mt-4 rounded-2xl border border-red-400/35 bg-red-500/10 p-4 text-xs text-red-50" role="alert">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-5 h-5 text-red-300 shrink-0 mt-0.5" />
                  <div>
                    <div className="font-black text-red-200">{isFa ? 'جزئیات خطای آپلود APK' : 'APK upload error details'}</div>
                    <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-1 text-[11px]">
                      <span>{isFa ? 'وضعیت HTTP:' : 'HTTP status:'} <b dir="ltr">{uploadError.httpStatus || 0}</b></span>
                      <span>{isFa ? 'نوع خطا:' : 'Failure type:'} <b dir="ltr">{uploadError.reason}</b></span>
                      <span className="sm:col-span-2">{isFa ? 'آخرین درصد پیشرفت:' : 'Last progress:'} <b dir="ltr">{uploadError.lastProgress}%</b></span>
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => void copyUploadError()}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-200 text-red-950 px-3 py-2 text-[11px] font-black shrink-0"
                >
                  <Copy className="w-3.5 h-3.5" />
                  {isFa ? 'کپی جزئیات' : 'Copy details'}
                </button>
              </div>
              <div className="mt-3 text-[10px] font-bold text-red-200">{isFa ? 'بدنهٔ پاسخ سرور' : 'Server response body'}</div>
              <pre className="mt-1 max-h-44 overflow-auto whitespace-pre-wrap break-all rounded-xl border border-red-300/15 bg-black/35 p-3 text-[10px] leading-5 text-red-100" dir="ltr">
                {uploadError.responseBody || '(empty response body)'}
              </pre>
            </div>
          )}

          <div className="mt-5 rounded-2xl bg-black/25 border border-white/5 p-4 text-xs text-gray-300 space-y-2">
            <div className="flex items-center gap-2">
              {config?.apkAvailable ? <Check className="w-4 h-4 text-emerald-400" /> : <X className="w-4 h-4 text-amber-300" />}
              <span className="font-bold">{config?.apkAvailable ? (isFa ? 'APK فعال است' : 'APK is available') : (isFa ? 'APK هنوز آپلود نشده' : 'APK not uploaded yet')}</span>
            </div>
            {config?.apkAvailable && (
              <>
                <div>{isFa ? 'نام فایل:' : 'File:'} <span className="font-mono text-cyan-200">{config.apkFileName || 'bazino-app.apk'}</span></div>
                <div>{isFa ? 'حجم:' : 'Size:'} <span className="font-mono text-cyan-200">{formatBytes(config.apkSize)}</span></div>
                <a href={config.directDownloadUrl} className="inline-flex items-center gap-2 text-cyan-200 hover:text-white font-bold">
                  <Download className="w-3.5 h-3.5" />
                  {isFa ? 'تست دانلود مستقیم' : 'Test direct download'}
                </a>
              </>
            )}
          </div>
        </section>

        <section className="bg-dark-card border border-white/10 rounded-2xl p-6">
          <h3 className="text-sm font-black text-white flex items-center gap-2 mb-4">
            <Store className="w-4 h-4 text-amber-300" />
            {isFa ? 'فروشگاه‌ها و مخازن اپلیکیشن' : 'App stores and repositories'}
          </h3>

          <form onSubmit={submitLink} className="grid grid-cols-1 md:grid-cols-2 gap-3 bg-black/25 border border-white/5 rounded-2xl p-4 mb-5">
            <div>
              <label className="block text-[11px] text-gray-400 mb-1">{isFa ? 'نوع فروشگاه' : 'Store type'}</label>
              <select value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value as MobileAppStoreKind })} className="w-full bg-[#0d1224] border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white">
                {STORE_OPTIONS.map((o) => <option key={o.kind} value={o.kind}>{isFa ? o.fa : o.en}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[11px] text-gray-400 mb-1">{isFa ? 'آدرس دانلود' : 'Download URL'}</label>
              <input required value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} placeholder="https://..." className="w-full bg-[#0d1224] border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white font-mono" />
            </div>
            <div>
              <label className="block text-[11px] text-gray-400 mb-1">{isFa ? 'عنوان فارسی' : 'Persian label'}</label>
              <input value={form.labelFa} onChange={(e) => setForm({ ...form, labelFa: e.target.value })} placeholder={selectedOption.fa} className="w-full bg-[#0d1224] border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white" />
            </div>
            <div>
              <label className="block text-[11px] text-gray-400 mb-1">{isFa ? 'عنوان انگلیسی' : 'English label'}</label>
              <input value={form.labelEn} onChange={(e) => setForm({ ...form, labelEn: e.target.value })} placeholder={selectedOption.en} className="w-full bg-[#0d1224] border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white" />
            </div>
            <label className="flex items-center gap-2 text-xs text-gray-300 md:col-span-2">
              <input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} />
              {isFa ? 'نمایش این لینک در صفحه دانلود' : 'Show this link on the download page'}
            </label>
            <div className="md:col-span-2 flex gap-2">
              <button disabled={isSavingLinks} className="inline-flex items-center gap-2 rounded-xl bg-emerald-400 text-black px-4 py-2.5 text-xs font-black disabled:opacity-50">
                {editingId ? <Save className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                {editingId ? (isFa ? 'ذخیره ویرایش' : 'Save changes') : (isFa ? 'افزودن لینک' : 'Add link')}
              </button>
              {editingId && <button type="button" onClick={resetForm} className="rounded-xl bg-white/10 text-white px-4 py-2.5 text-xs font-bold">{isFa ? 'انصراف' : 'Cancel'}</button>}
            </div>
          </form>

          <div className="space-y-2">
            {links.length === 0 && <div className="rounded-xl border border-dashed border-white/10 p-4 text-xs text-gray-500 text-center">{isFa ? 'هنوز لینکی ثبت نشده است.' : 'No links have been added yet.'}</div>}
            {links.map((link) => {
              const Icon = iconFor(link.kind);
              return (
                <div key={link.id} className="flex flex-col md:flex-row md:items-center justify-between gap-3 rounded-2xl bg-black/25 border border-white/5 p-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-white/10 text-cyan-200 flex items-center justify-center shrink-0"><Icon className="w-5 h-5" /></div>
                    <div className="min-w-0">
                      <div className="text-sm font-black text-white truncate">{isFa ? link.labelFa : link.labelEn}</div>
                      <div className="text-[10px] text-gray-500 font-mono truncate">{link.url}</div>
                      <div className={`text-[10px] font-bold ${link.isActive ? 'text-emerald-400' : 'text-amber-300'}`}>{link.isActive ? (isFa ? 'فعال' : 'Active') : (isFa ? 'مخفی' : 'Hidden')}</div>
                    </div>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button onClick={() => toggleLink(link.id)} className="p-2 rounded-lg bg-white/10 text-gray-200" title={isFa ? 'فعال/مخفی' : 'Toggle'}><Check className="w-4 h-4" /></button>
                    <button onClick={() => editLink(link)} className="p-2 rounded-lg bg-blue-500/15 text-blue-200"><Edit className="w-4 h-4" /></button>
                    <button onClick={() => removeLink(link.id)} className="p-2 rounded-lg bg-red-500/15 text-red-200"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}
