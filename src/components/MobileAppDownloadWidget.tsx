import { Smartphone } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { L } from '../utils/i18n';

interface Props {
  onOpenDownloadPage: () => void;
}

export default function MobileAppDownloadWidget({ onOpenDownloadPage }: Props) {
  const { language } = useLanguage();
  const label = L(language, {
    fa: 'دانلود اپلیکیشن موبایل بازینو',
    en: 'Download the Bazino mobile app',
    ru: 'Скачать мобильное приложение Bazino',
    tr: 'Bazino mobil uygulamasını indir',
  });

  return (
    <button
      type="button"
      onClick={onOpenDownloadPage}
      aria-label={label}
      title={label}
      data-app-download-bubble
      className="fixed bottom-[calc(64px+env(safe-area-inset-bottom,0px)+1rem)] right-5 z-[55] grid h-14 w-14 place-items-center rounded-full border border-white/30 shadow-[0_18px_50px_rgba(0,0,0,0.5)] backdrop-blur-xl transition-transform duration-200 hover:-translate-y-1 active:translate-y-0"
      style={{
        background: 'linear-gradient(135deg, var(--bz-primary, var(--primary-color, #ffb800)), var(--bz-primary-hover, var(--primary-hover-color, #e09900)))',
        color: '#07111f',
      }}
    >
      <Smartphone className="h-6 w-6" strokeWidth={2.4} />
    </button>
  );
}
