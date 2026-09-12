import React, { useEffect, useRef, useState } from 'react';
import { Check, ExternalLink, FlaskConical, Info, Loader2, MonitorSmartphone, RefreshCw, Send, Trash2, Upload } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import type { AppetizeStatus } from '../types/appetize';
import { getAuthToken } from '../services/authToken';

interface Props {
  addNotification: (message: string, type: 'success' | 'error' | 'info') => void;
}

const MAX_APK_BYTES = 160 * 1024 * 1024;

/**
 * آزمایشگاه اپ (App Lab) — امولاتور وب روی Appetize.io
 *
 * ادمین یک‌بار توکن API Appetize را ذخیره می‌کند؛ بعد با یک کلیک APK سایت
 * (یا هر فایل/URL دلخواه) به امولاتور سپرده می‌شود و همان لحظه روی صفحهٔ
 * عمومی /app-download برای همهٔ بازدیدکنندگان قابل اجراست — بدون نصب.
 */
export default function AdminAppLabPanel({ addNotification }: Props) {
  const { language, dir } = useLanguage();
  const isFa = language === 'fa';
  const [status, setStatus] = useState<AppetizeStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [tokenInput, setTokenInput] = useState('');
  const [busy, setBusy] = useState<'token' | 'push-site' | 'push-url' | 'upload' | 'delete' | null>(null);
  const [urlInput, setUrlInput] = useState('');
  const [forceNew, setForceNew] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(-1);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const loadStatus = async () => {
    setLoading(true);
    try {
      const data = await fetch('/api/admin/appetize/status').then((r) => r.json());
      setStatus(data);
    } catch {
      setStatus(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadStatus();
  }, []);

  const readError = async (res: Response, fallback: string) => {
    try {
      const body = await res.json();
      return String(body?.error || body?.code || fallback);
    } catch {
      return fallback;
    }
  };

  const saveToken = async () => {
    const token = tokenInput.trim();
    if (token.length < 8) {
      addNotification(isFa ? 'توکن Appetize معتبر نیست (حداقل ۸ کاراکتر)' : 'Invalid Appetize token (at least 8 characters)', 'error');
      return;
    }
    setBusy('token');
    try {
      const res = await fetch('/api/admin/appetize/token', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });
      if (!res.ok) throw new Error(await readError(res, 'save failed'));
      setTokenInput('');
      addNotification(isFa ? 'توکن Appetize ذخیره شد — حالا می‌توانید APK بفرستید' : 'Appetize token saved — you can now push an APK', 'success');
      await loadStatus();
    } catch (e) {
      addNotification(isFa ? `ذخیرهٔ توکن ناموفق: ${String((e as Error).message || e)}` : `Failed to save token: ${String((e as Error).message || e)}`, 'error');
    } finally {
      setBusy(null);
    }
  };

  const clearToken = async () => {
    setBusy('token');
    try {
      await fetch('/api/admin/appetize/token', { method: 'DELETE' });
      addNotification(isFa ? 'توکن Appetize حذف شد' : 'Appetize token removed', 'info');
      await loadStatus();
    } finally {
      setBusy(null);
    }
  };

  const pushApk = async (source: 'site-apk' | 'url') => {
    if (source === 'url' && !/^https?:\/\//i.test(urlInput.trim())) {
      addNotification(isFa ? 'آدرس APK باید با http یا https شروع شود' : 'The APK URL must start with http or https', 'error');
      return;
    }
    setBusy(source === 'site-apk' ? 'push-site' : 'push-url');
    try {
      const res = await fetch('/api/admin/appetize/push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(source === 'site-apk' ? { source, forceNew } : { source, url: urlInput.trim(), forceNew }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(String(body?.error || body?.code || `HTTP ${res.status}`));
      addNotification(
        isFa
          ? `APK به امولاتور سپرده شد (${body?.app?.publicKey || '?'}) — از صفحهٔ دانلود اپ قابل تست است`
          : `APK pushed to the emulator (${body?.app?.publicKey || '?'}) — testable from the app download page`,
        'success',
      );
      await loadStatus();
    } catch (e) {
      addNotification(isFa ? `ارسال ناموفق: ${String((e as Error).message || e)}` : `Push failed: ${String((e as Error).message || e)}`, 'error');
    } finally {
      setBusy(null);
    }
  };

  const uploadCustomApk = (file: File) => {
    if (!file.name.toLowerCase().endsWith('.apk')) {
      addNotification(isFa ? 'فقط فایل APK قابل آپلود است' : 'Only APK files are allowed', 'error');
      return;
    }
    if (file.size > MAX_APK_BYTES) {
      addNotification(isFa ? 'حجم فایل بیشتر از ۱۶۰ مگابایت است' : 'File is larger than 160 MB', 'error');
      return;
    }
    setBusy('upload');
    setUploadProgress(0);
    const formData = new FormData();
    formData.append('file', file, file.name);
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `/api/admin/appetize/upload${forceNew ? '?forceNew=1' : ''}`);
    // درخواست XHR از فیلتر سراسری fetch رد نمی‌شود؛ توکن دستی ست می‌شود
    const authToken = getAuthToken();
    if (authToken) xhr.setRequestHeader('Authorization', `Bearer ${authToken}`);
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) setUploadProgress(Math.round((event.loaded / event.total) * 100));
    };
    xhr.onload = () => {
      setUploadProgress(-1);
      setBusy(null);
      let body: any = null;
      try { body = JSON.parse(xhr.responseText); } catch { /* ignore */ }
      if (xhr.status >= 200 && xhr.status < 300) {
        addNotification(
          isFa
            ? `APK آپلود و به امولاتور سپرده شد (${body?.app?.publicKey || '?'})`
            : `APK uploaded and pushed to the emulator (${body?.app?.publicKey || '?'})`,
          'success',
        );
        void loadStatus();
      } else {
        addNotification(String(body?.error || body?.code || `HTTP ${xhr.status}`), 'error');
      }
    };
    xhr.onerror = () => {
      setUploadProgress(-1);
      setBusy(null);
      addNotification(isFa ? 'خطای شبکه در آپلود APK' : 'Network error while uploading the APK', 'error');
    };
    xhr.send(formData);
  };

  const deleteApp = async () => {
    if (!window.confirm(isFa ? 'اپ از امولاتور حذف شود؟ صفحهٔ عمومی دیگر امولاتور را نشان نمی‌دهد.' : 'Delete the app from the emulator? The public page will stop showing it.')) return;
    setBusy('delete');
    try {
      const res = await fetch('/api/admin/appetize/app', { method: 'DELETE' });
      if (!res.ok) throw new Error(await readError(res, 'delete failed'));
      addNotification(isFa ? 'اپ از امولاتور حذف شد' : 'App removed from the emulator', 'info');
      await loadStatus();
    } catch (e) {
      addNotification(isFa ? `حذف ناموفق: ${String((e as Error).message || e)}` : `Delete failed: ${String((e as Error).message || e)}`, 'error');
    } finally {
      setBusy(null);
    }
  };

  const t = (fa: string, en: string) => (isFa ? fa : en);

  return (
    <div className="bg-[#0b1020] border border-white/10 rounded-2xl p-6 overflow-hidden relative" dir={dir}>
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-fuchsia-400 via-cyan-400 to-emerald-300" />

      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-fuchsia-400/10 text-fuchsia-200 border border-fuchsia-300/20 flex items-center justify-center">
            <FlaskConical className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-black text-white">{t('آزمایشگاه اپ — امولاتور وب', 'App Lab — web emulator')}</h3>
            <p className="mt-1 max-w-2xl text-xs leading-6 text-slate-400">
              {t(
                'APK را روی دستگاه مجازی Appetize نصب کنید و همان لحظه در مرورگر بازدیدکنندگان (صفحهٔ دانلود اپ) قابل اجرا باشد — بدون نیاز به نصب.',
                'Install the APK on an Appetize virtual device and let visitors run it right in their browser (app download page) — no installation needed.',
              )}
            </p>
          </div>
        </div>
        <button onClick={loadStatus} disabled={loading} className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-[11px] font-bold text-slate-300 hover:bg-white/10 disabled:opacity-50">
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          {t('وضعیت تازه', 'Refresh')}
        </button>
      </div>

      {/* توکن Appetize */}
      <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="text-xs font-black text-slate-200">{t('۱) توکن API اپتایز', '1) Appetize API token')}</div>
          {status?.configured ? (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-[10px] font-black text-emerald-200">
              <Check className="h-3 w-3" />
              {t('ثبت‌شده', 'saved')} {status.tokenHint}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-300/20 bg-amber-300/10 px-3 py-1 text-[10px] font-black text-amber-100">
              <Info className="h-3 w-3" />
              {t('ثبت نشده', 'not set')}
            </span>
          )}
        </div>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <input
            type="password"
            value={tokenInput}
            onChange={(e) => setTokenInput(e.target.value)}
            placeholder={t('توکن API از appetize.io (حساب رایگان بسازید و از Settings → API بگیرید)', 'API token from appetize.io (create a free account → Settings → API)')}
            className="flex-1 rounded-xl border border-white/10 bg-[#070b16] px-4 py-2.5 text-xs text-white placeholder:text-slate-500 focus:border-fuchsia-300/40 focus:outline-none"
            autoComplete="off"
          />
          <button
            onClick={saveToken}
            disabled={busy === 'token'}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-fuchsia-400 px-4 py-2.5 text-xs font-black text-[#160b20] hover:bg-fuchsia-300 disabled:opacity-50"
          >
            {busy === 'token' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            {t('ذخیرهٔ توکن', 'Save token')}
          </button>
          {status?.configured && (
            <button onClick={clearToken} disabled={busy === 'token'} className="inline-flex items-center justify-center gap-2 rounded-xl border border-red-400/20 bg-red-400/10 px-4 py-2.5 text-xs font-black text-red-200 hover:bg-red-400/20 disabled:opacity-50">
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>
        <p className="mt-2 text-[10px] leading-5 text-slate-500">
          {t(
            'توکن فقط روی سرور ذخیره می‌شود و هرگز به مرورگر برگردانده نمی‌شود. پلن رایگان Appetize دقیق مصرف محدودی دارد؛ برای استفادهٔ سنگین پلن پولی بگیرید.',
            'The token is stored server-side only and never returned to the browser. The free Appetize plan has limited monthly minutes; pick a paid plan for heavy use.',
          )}
        </p>
      </div>

      {/* ارسال APK */}
      <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
        <div className="text-xs font-black text-slate-200">{t('۲) APK را به امولاتور بفرستید', '2) Push an APK to the emulator')}</div>
        <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-2">
          <button
            onClick={() => pushApk('site-apk')}
            disabled={!status?.configured || !status?.apkAvailable || busy !== null}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-cyan-400 px-4 py-3 text-xs font-black text-[#06121f] hover:bg-cyan-300 disabled:opacity-40"
          >
            {busy === 'push-site' ? <Loader2 className="h-4 w-4 animate-spin" /> : <MonitorSmartphone className="h-4 w-4" />}
            {t('ارسال APK سایت', 'Push the site APK')}
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={!status?.configured || busy !== null}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-white/10 border border-white/10 px-4 py-3 text-xs font-black text-white hover:bg-white/15 disabled:opacity-40"
          >
            {busy === 'upload' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            {t('آپلود APK دلخواه', 'Upload any APK')}
          </button>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept=".apk"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = '';
            if (file) uploadCustomApk(file);
          }}
        />
        {uploadProgress >= 0 && (
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
            <div className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-fuchsia-400 transition-all" style={{ width: `${uploadProgress}%` }} />
          </div>
        )}
        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <input
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            placeholder={t('یا آدرس عمومی APK (https://…/app.apk)', 'or a public APK URL (https://…/app.apk)')}
            className="flex-1 rounded-xl border border-white/10 bg-[#070b16] px-4 py-2.5 text-xs text-white placeholder:text-slate-500 focus:border-cyan-300/40 focus:outline-none"
            dir="ltr"
          />
          <button
            onClick={() => pushApk('url')}
            disabled={!status?.configured || busy !== null}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-white/10 border border-white/10 px-4 py-2.5 text-xs font-black text-white hover:bg-white/15 disabled:opacity-40"
          >
            {busy === 'push-url' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            {t('ارسال از URL', 'Push from URL')}
          </button>
        </div>
        <label className="mt-3 flex cursor-pointer items-center gap-2 text-[11px] text-slate-400">
          <input type="checkbox" checked={forceNew} onChange={(e) => setForceNew(e.target.checked)} className="h-3.5 w-3.5 accent-fuchsia-400" />
          {t('اپ جدید بساز (پیش‌فرض: همان اپ قبلی به‌روزرسانی می‌شود)', 'Create a new app (default: update the existing one)')}
        </label>
        {status && !status.apkAvailable && (
          <p className="mt-2 text-[10px] text-amber-200">{t('هنوز APK روی سایت آپلود نشده است؛ اول فایل APK را در بخش بالا آپلود کنید.', 'No APK has been uploaded to the site yet; upload the APK file in the section above first.')}</p>
        )}
      </div>

      {/* اپ فعال */}
      {status?.app && (
        <div className="mt-4 rounded-2xl border border-emerald-400/15 bg-emerald-400/[0.04] p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="text-xs font-black text-emerald-200">{t('اپ فعال روی امولاتور', 'Active app on the emulator')}</div>
            <div className="flex items-center gap-2">
              <a
                href={`/app-download#emulator`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-[10px] font-black text-white hover:bg-white/10"
              >
                <ExternalLink className="h-3 w-3" />
                {t('مشاهده در صفحهٔ عمومی', 'Open public page')}
              </a>
              <button
                onClick={deleteApp}
                disabled={busy !== null}
                className="inline-flex items-center gap-1.5 rounded-lg border border-red-400/20 bg-red-400/10 px-3 py-1.5 text-[10px] font-black text-red-200 hover:bg-red-400/20 disabled:opacity-50"
              >
                {busy === 'delete' ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
                {t('حذف از امولاتور', 'Remove')}
              </button>
            </div>
          </div>
          <div className="mt-3 grid grid-cols-1 gap-2 font-mono text-[10px] text-slate-300 sm:grid-cols-2">
            <div className="truncate rounded-lg bg-black/30 px-3 py-2" dir="ltr">publicKey: {status.app.publicKey}</div>
            <div className="truncate rounded-lg bg-black/30 px-3 py-2" dir="ltr">{status.app.embedUrl}</div>
          </div>
        </div>
      )}
    </div>
  );
}
