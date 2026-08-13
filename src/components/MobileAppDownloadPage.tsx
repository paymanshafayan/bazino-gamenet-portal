import React, { useEffect, useMemo, useState } from 'react';
import {
  Apple,
  Download,
  ExternalLink,
  Github,
  PackageOpen,
  Play,
  RefreshCw,
  ShieldCheck,
  Smartphone,
  Store,
  Zap,
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import type { MobileAppDownloadConfig, MobileAppStoreKind, MobileAppStoreLink } from '../types/mobileApp';
import bazinoLogo from '../assets/images/bazino_logo_user-80.webp'; // نمایش ۴۰px → واریانت ۸۰px

interface Props {
  onBackHome: () => void;
}

const getStoreIcon = (kind: MobileAppStoreKind) => {
  if (kind === 'app-store' || kind === 'testflight') return Apple;
  if (kind === 'github') return Github;
  if (kind === 'google-play') return Play;
  if (kind === 'direct') return Download;
  if (kind === 'myket' || kind === 'cafebazaar') return Store;
  return PackageOpen;
};

const formatBytes = (bytes?: number, isFa = false) => {
  if (!bytes || bytes <= 0) return '';
  const mb = bytes / (1024 * 1024);
  return `${mb.toFixed(mb >= 100 ? 0 : 1)} ${isFa ? 'مگابایت' : 'MB'}`;
};

export default function MobileAppDownloadPage({ onBackHome }: Props) {
  const { language, dir } = useLanguage();
  const isFa = language === 'fa';
  const isRu = language === 'ru';
  const isTr = language === 'tr';
  const [config, setConfig] = useState<MobileAppDownloadConfig | null>(null);
  const [loading, setLoading] = useState(true);

  const text = useMemo(() => ({
    badge: isFa ? 'دانلود رسمی اپلیکیشن' : isRu ? 'Официальная загрузка' : isTr ? 'Resmi uygulama indirme' : 'Official app download',
    title: isFa ? 'اپلیکیشن موبایل بازینو را نصب کنید' : isRu ? 'Установите мобильное приложение Bazino' : isTr ? 'Bazino mobil uygulamasını yükleyin' : 'Install the Bazino mobile app',
    desc: isFa
      ? 'رزرو سیستم، پیگیری مسابقات، سفارش کافه، باشگاه وفاداری و پیام‌های زنده را همیشه در جیب خود داشته باشید.'
      : isRu
        ? 'Бронирование, турниры, кафе, клуб лояльности и live-сообщения всегда под рукой.'
        : isTr
          ? 'Rezervasyon, turnuvalar, kafe siparişleri, sadakat kulübü ve canlı mesajlar cebinizde.'
          : 'Keep reservations, tournaments, cafe orders, loyalty rewards, and live messages in your pocket.',
    direct: isFa ? 'دانلود مستقیم APK' : isRu ? 'Скачать APK' : isTr ? 'Doğrudan APK indir' : 'Direct APK download',
    unavailable: isFa ? 'فایل APK هنوز توسط مدیر آپلود نشده است' : isRu ? 'APK ещё не загружен администратором' : isTr ? 'APK henüz yönetici tarafından yüklenmedi' : 'APK has not been uploaded by the admin yet',
    otherStores: isFa ? 'دانلود از فروشگاه‌ها و مخازن دیگر' : isRu ? 'Другие магазины и репозитории' : isTr ? 'Diğer mağazalar ve depolar' : 'Other stores and repositories',
    noStores: isFa ? 'هنوز لینک فروشگاه دیگری ثبت نشده است.' : isRu ? 'Другие ссылки пока не добавлены.' : isTr ? 'Henüz başka mağaza bağlantısı eklenmedi.' : 'No store links have been added yet.',
    back: isFa ? 'بازگشت به سایت' : isRu ? 'Назад на сайт' : isTr ? 'Siteye dön' : 'Back to site',
    refresh: isFa ? 'بارگذاری دوباره' : isRu ? 'Обновить' : isTr ? 'Yenile' : 'Refresh',
    secure: isFa ? 'فایل‌ها توسط مدیر سایت کنترل می‌شوند' : isRu ? 'Файлы контролируются администратором сайта' : isTr ? 'Dosyalar site yöneticisi tarafından kontrol edilir' : 'Files are controlled by the site admin',
  }), [isFa, isRu, isTr]);

  const loadConfig = async () => {
    setLoading(true);
    try {
      const data = await fetch('/api/mobile-app').then((r) => r.json());
      setConfig(data);
    } catch (e) {
      setConfig({ apkAvailable: false, directDownloadUrl: '/api/mobile-app/download', storeLinks: [] });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadConfig();
  }, []);

  const activeLinks: MobileAppStoreLink[] = (config?.storeLinks || []).filter((x) => x.isActive && x.url);
  const apkSizeText = formatBytes(config?.apkSize, isFa);

  return (
    <div dir={dir} className="min-h-[100dvh] bg-[#060914] text-white overflow-hidden relative" style={{ colorScheme: 'dark' }}>
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-28 -right-28 h-80 w-80 rounded-full bg-cyan-400/10 blur-3xl" />
        <div className="absolute top-1/3 -left-32 h-96 w-96 rounded-full bg-violet-500/10 blur-3xl" />
        <div className="absolute -bottom-24 right-1/4 h-80 w-80 rounded-full bg-amber-300/10 blur-3xl" />
      </div>

      <header className="relative z-10 mx-auto flex max-w-6xl items-center justify-between px-5 py-5">
        <button onClick={onBackHome} className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-2.5 text-xs font-bold text-slate-200 hover:bg-white/10">
          {text.back}
        </button>
        <div className="flex items-center gap-3">
          <img src={bazinoLogo} alt="Bazino Pro" width="40" height="40" className="h-10 w-auto" />
          <span className="font-black tracking-wider">BAZINO <span className="text-cyan-300">PRO</span></span>
        </div>
      </header>

      <main className="relative z-10 mx-auto grid max-w-6xl grid-cols-1 gap-8 px-5 pb-16 pt-6 lg:grid-cols-[1fr_420px] lg:items-center">
        <section className="space-y-6">
          <span className="inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-300/10 px-4 py-2 text-xs font-black text-cyan-200">
            <Smartphone className="h-4 w-4" />
            {text.badge}
          </span>
          <div className="space-y-4">
            <h1 className="max-w-3xl text-4xl font-black leading-tight tracking-tight md:text-6xl">{text.title}</h1>
            <p className="max-w-2xl text-sm leading-8 text-slate-300 md:text-base">{text.desc}</p>
          </div>
          <div className="flex flex-wrap gap-3">
            {config?.apkAvailable ? (
              <a
                href={config.directDownloadUrl || '/api/mobile-app/download'}
                className="inline-flex items-center gap-3 rounded-2xl bg-white px-6 py-4 text-sm font-black text-[#07111f] shadow-2xl shadow-white/10 transition-transform hover:-translate-y-0.5"
              >
                <Download className="h-5 w-5" />
                <span>{text.direct}</span>
                {apkSizeText && <span className="rounded-full bg-slate-900/10 px-2 py-1 text-[10px]">{apkSizeText}</span>}
              </a>
            ) : (
              <div className="rounded-2xl border border-amber-300/20 bg-amber-300/10 px-5 py-4 text-xs font-bold text-amber-100">
                {text.unavailable}
              </div>
            )}
            <button onClick={loadConfig} disabled={loading} className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-5 py-4 text-xs font-bold text-slate-200 hover:bg-white/10 disabled:opacity-50">
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              {text.refresh}
            </button>
          </div>
          <div className="inline-flex items-center gap-2 rounded-2xl border border-emerald-300/20 bg-emerald-300/10 px-4 py-3 text-[11px] font-bold text-emerald-100">
            <ShieldCheck className="h-4 w-4" />
            {text.secure}
          </div>
        </section>

        <aside className="rounded-[34px] border border-white/10 bg-white/[0.06] p-5 shadow-[0_30px_90px_rgba(0,0,0,0.45)] backdrop-blur-2xl">
          <div className="rounded-[28px] border border-white/10 bg-[#0b1020] p-5">
            <div className="mb-5 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-black text-white">{text.otherStores}</h2>
                <p className="mt-1 text-[11px] text-slate-400">{isFa ? 'لینک‌ها از پنل مدیریت خوانده می‌شوند.' : 'Links are controlled from the admin panel.'}</p>
              </div>
              <Zap className="h-6 w-6 text-amber-300" />
            </div>

            <div className="space-y-3">
              {activeLinks.length === 0 && (
                <div className="rounded-2xl border border-dashed border-white/10 p-5 text-center text-xs text-slate-400">{text.noStores}</div>
              )}
              {activeLinks.map((link) => {
                const Icon = getStoreIcon(link.kind);
                const label = isFa ? link.labelFa || link.labelEn : link.labelEn || link.labelFa;
                return (
                  <a
                    key={link.id}
                    href={link.url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-black text-white hover:border-cyan-300/30 hover:bg-cyan-300/10"
                  >
                    <span className="flex items-center gap-3">
                      <span className="grid h-10 w-10 place-items-center rounded-xl bg-white/10 text-cyan-200">
                        <Icon className="h-5 w-5" />
                      </span>
                      {label}
                    </span>
                    <ExternalLink className="h-4 w-4 text-slate-400" />
                  </a>
                );
              })}
            </div>
          </div>
        </aside>
      </main>
    </div>
  );
}
