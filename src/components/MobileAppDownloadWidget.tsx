import { Download, QrCode, Smartphone, X } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

interface Props {
  onOpenDownloadPage: () => void;
}

export default function MobileAppDownloadWidget({ onOpenDownloadPage }: Props) {
  const { language, dir } = useLanguage();
  const [isFa, isRu, isTr] = [language === 'fa', language === 'ru', language === 'tr'];
  const pageUrl = `${window.location.origin}/app-download`;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=148x148&margin=8&data=${encodeURIComponent(pageUrl)}`;

  const copy = {
    title: isFa ? 'اپلیکیشن موبایل بازینو' : isRu ? 'Мобильное приложение Bazino' : isTr ? 'Bazino Mobil Uygulaması' : 'Bazino Mobile App',
    body: isFa
      ? 'برای رزرو سریع سیستم، مشاهده مسابقات و دریافت اعلان‌های باشگاه، اپلیکیشن را نصب کنید.'
      : isRu
        ? 'Установите приложение для быстрого бронирования, турниров и уведомлений клуба.'
        : isTr
          ? 'Hızlı rezervasyon, turnuvalar ve kulüp bildirimleri için mobil uygulamayı yükleyin.'
          : 'Install the app for quick reservations, tournaments, and club notifications.',
    button: isFa ? 'رفتن به صفحه دانلود' : isRu ? 'Страница загрузки' : isTr ? 'İndirme sayfasına git' : 'Open download page',
    scan: isFa ? 'اسکن برای دانلود' : isRu ? 'Сканировать' : isTr ? 'İndirmek için tara' : 'Scan to download',
    close: isFa ? 'بستن' : isRu ? 'Закрыть' : isTr ? 'Kapat' : 'Close',
  };

  return (
    <aside
      dir={dir}
      aria-label={copy.title}
      className="fixed bottom-5 right-5 left-5 sm:left-auto sm:w-[360px] z-[85] rounded-[28px] border border-white/10 bg-[#070b16]/95 text-white shadow-[0_24px_80px_rgba(0,0,0,0.55)] backdrop-blur-2xl overflow-hidden"
      style={{ colorScheme: 'dark' }}
    >
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-cyan-400 via-violet-400 to-amber-300" />
      <div className="p-4 flex gap-4 items-center">
        <div className="shrink-0 rounded-2xl bg-white p-2 shadow-lg shadow-cyan-500/10">
          <img src={qrUrl} alt={copy.scan} width="112" height="112" className="block w-28 h-28" loading="lazy" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-cyan-400/10 border border-cyan-300/20 px-2.5 py-1 text-[10px] font-black text-cyan-200">
              <QrCode className="w-3.5 h-3.5" />
              {copy.scan}
            </span>
            <button
              type="button"
              onClick={(e) => {
                const card = (e.currentTarget.closest('aside') as HTMLElement | null);
                if (card) card.style.display = 'none';
              }}
              aria-label={copy.close}
              className="rounded-full p-1.5 text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <h2 className="mt-3 text-base font-black tracking-tight text-white">{copy.title}</h2>
          <p className="mt-1.5 text-[11px] leading-5 text-slate-300">{copy.body}</p>
          <button
            type="button"
            onClick={onOpenDownloadPage}
            className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-white px-4 py-3 text-xs font-black text-[#07111f] shadow-lg shadow-white/10 transition-transform hover:-translate-y-0.5 active:translate-y-0"
          >
            <Smartphone className="w-4 h-4" />
            <span>{copy.button}</span>
            <Download className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
