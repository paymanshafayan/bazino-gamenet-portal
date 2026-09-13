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
import { FlaskConical, RotateCcw } from 'lucide-react';
import type { AppetizeActive } from '../types/appetize';

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
  // آزمایشگاه اپ — امولاتور وب (Appetize)
  const [appetize, setAppetize] = useState<AppetizeActive | null>(null);
  const [showEmulator, setShowEmulator] = useState(false);
  const [device, setDevice] = useState('');
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('portrait');

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
    emulatorBadge: isFa ? 'بدون نصب — تست زنده در مرورگر' : isRu ? 'Без установки — живой тест в браузере' : isTr ? 'Kurulum olmadan — tarayıcıda canlı test' : 'No install — live test in your browser',
    emulatorTitle: isFa ? 'اپ را همین‌جا امتحان کنید' : isRu ? 'Попробуйте приложение прямо здесь' : isTr ? 'Uygulamayı burada deneyin' : 'Try the app right here',
    emulatorDesc: isFa
      ? 'روی دستگاه مجازی زیر ضربه بزنید تا اپ بازینو نصب و اجرا شود؛ می‌توانید رزرو بگیرید، منو ببینید و همه‌چیز را مثل گوشی واقعی تست کنید.'
      : isRu
        ? 'Коснитесь виртуального устройства ниже — приложение Bazino установится и запустится; бронируйте, смотрите меню и тестируйте всё как на реальном телефоне.'
        : isTr
          ? "Aşağıdaki sanal cihaza dokunun — Bazino uygulaması yüklenip çalışacak; rezervasyon yapın, menüye bakın ve her şeyi gerçek telefondaki gibi test edin."
          : 'Tap the virtual device below — the Bazino app installs and launches; book a system, browse the menu and test everything like on a real phone.',
    emulatorStart: isFa ? 'راه‌اندازی امولاتور' : isRu ? 'Запустить эмулятор' : isTr ? 'Emülatörü başlat' : 'Launch the emulator',
    emulatorDevice: isFa ? 'دستگاه' : isRu ? 'Устройство' : isTr ? 'Cihaz' : 'Device',
    emulatorOrientation: isFa ? 'جهت' : isRu ? 'Ориентация' : isTr ? 'Yön' : 'Orientation',
    emulatorPortrait: isFa ? 'عمودی' : isRu ? 'Портрет' : isTr ? 'Dikey' : 'Portrait',
    emulatorLandscape: isFa ? 'افقی' : isRu ? 'Альбом' : isTr ? 'Yatay' : 'Landscape',
    emulatorRestart: isFa ? 'راه‌اندازی مجدد دستگاه' : isRu ? 'Перезапустить устройство' : isTr ? 'Cihazı yeniden başlat' : 'Restart the device',
    emulatorNote: isFa
      ? 'این دستگاه مجازی توسط Appetize.io اجرا می‌شود و مصرف آن برای سایت محدود است؛ برای استفادهٔ روزمره بهتر است اپ را نصب کنید.'
      : isRu
        ? 'Виртуальное устройство работает на Appetize.io, его использование для сайта ограничено; для повседневной работы лучше установить приложение.'
        : isTr
          ? 'Sanal cihaz Appetize.io tarafından çalıştırılır ve kullanımı site için sınırlıdır; günlük kullanım için uygulamayı kurmanız daha iyi olur.'
          : 'This virtual device is powered by Appetize.io and its usage is limited; for daily use, installing the app is recommended.',
  }), [isFa, isRu, isTr]);

  const loadConfig = async () => {
    setLoading(true);
    try {
      const [data, emulatorData] = await Promise.all([
        fetch('/api/mobile-app').then((r) => r.json()),
        fetch('/api/appetize/active').then((r) => r.json()).catch(() => null),
      ]);
      setConfig(data);
      if (emulatorData && typeof emulatorData === 'object') setAppetize(emulatorData as AppetizeActive);
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

      {/* آزمایشگاه اپ — امولاتور وب: APK روی دستگاه مجازی Appetize نصب و در همین صفحه اجرا می‌شود */}
      {appetize?.active && appetize.app && (
        <section id="emulator" className="relative z-10 mx-auto mt-4 max-w-6xl px-5 pb-16">
          <div className="rounded-[34px] border border-fuchsia-300/15 bg-white/[0.04] p-5 shadow-[0_30px_90px_rgba(0,0,0,0.45)] backdrop-blur-2xl md:p-8">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div className="max-w-2xl">
                <span className="inline-flex items-center gap-2 rounded-full border border-fuchsia-300/20 bg-fuchsia-300/10 px-4 py-1.5 text-[11px] font-black text-fuchsia-200">
                  <FlaskConical className="h-3.5 w-3.5" />
                  {text.emulatorBadge}
                </span>
                <h2 className="mt-3 text-2xl font-black tracking-tight md:text-3xl">{text.emulatorTitle}</h2>
                <p className="mt-2 text-xs leading-7 text-slate-300 md:text-sm">{text.emulatorDesc}</p>
              </div>
              <button
                onClick={() => setShowEmulator((v) => !v)}
                className="inline-flex shrink-0 items-center gap-3 rounded-2xl bg-gradient-to-l from-cyan-400 to-fuchsia-400 px-6 py-4 text-sm font-black text-[#07111f] shadow-2xl shadow-fuchsia-500/20 transition-transform hover:-translate-y-0.5"
              >
                <FlaskConical className="h-5 w-5" />
                {showEmulator ? (isFa ? 'بستن' : isRu ? 'Закрыть' : isTr ? 'Kapat' : 'Close') : text.emulatorStart}
              </button>
            </div>

            {showEmulator && (
              <div className="mt-6 flex flex-col items-center gap-4">
                <div className="flex w-full max-w-md flex-wrap items-center justify-center gap-2">
                  <label className="text-[11px] font-black text-slate-400">{text.emulatorDevice}:</label>
                  {[
                    { id: '', label: isFa ? 'پیش‌فرض' : isRu ? 'По умолчанию' : isTr ? 'Varsayılan' : 'Default' },
                    { id: 'pixel7', label: 'Pixel 7' },
                    { id: 'pixel4', label: 'Pixel 4' },
                  ].map((d) => (
                    <button
                      key={d.id || 'default'}
                      onClick={() => setDevice(d.id)}
                      className={`rounded-full border px-3.5 py-1.5 text-[11px] font-black transition ${
                        device === d.id ? 'border-cyan-300/50 bg-cyan-300/15 text-cyan-100' : 'border-white/10 bg-white/5 text-slate-300 hover:bg-white/10'
                      }`}
                    >
                      {d.label}
                    </button>
                  ))}
                  <span className="mx-1 h-4 w-px bg-white/10" />
                  <label className="text-[11px] font-black text-slate-400">{text.emulatorOrientation}:</label>
                  {(['portrait', 'landscape'] as const).map((o) => (
                    <button
                      key={o}
                      onClick={() => setOrientation(o)}
                      className={`rounded-full border px-3.5 py-1.5 text-[11px] font-black transition ${
                        orientation === o ? 'border-fuchsia-300/50 bg-fuchsia-300/15 text-fuchsia-100' : 'border-white/10 bg-white/5 text-slate-300 hover:bg-white/10'
                      }`}
                    >
                      {o === 'portrait' ? text.emulatorPortrait : text.emulatorLandscape}
                    </button>
                  ))}
                </div>

                {/* هر تغییر انتخاب، کلید iframe را عوض می‌کند تا نشست دستگاه از نو شروع شود */}
                <iframe
                  key={`${device}-${orientation}`}
                  title="Bazino App Lab — Appetize emulator"
                  src={`${appetize.app.embedUrl}?scale=auto&centered=both&orientation=${orientation}${device ? `&device=${device}` : ''}`}
                  className="h-[720px] w-full max-w-md rounded-3xl border border-white/10 bg-black/40"
                  frameBorder={0}
                  scrolling="no"
                  allow="autoplay; clipboard-write"
                />

                <button
                  onClick={() => setShowEmulator(false)}
                  className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-[11px] font-bold text-slate-300 hover:bg-white/10"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  {text.emulatorRestart}
                </button>
                <p className="max-w-xl text-center text-[10px] leading-5 text-slate-500">{text.emulatorNote}</p>
              </div>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
