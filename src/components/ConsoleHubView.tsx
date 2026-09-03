import React, { useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { ArrowLeft } from 'lucide-react';
import hubBackground768 from '../assets/images/console-hub/background-768.webp';
import hubBackground1536 from '../assets/images/console-hub/background-1536.webp';
import reservations400 from '../assets/images/console-hub/reservations-400.webp';
import reservations800 from '../assets/images/console-hub/reservations-800.webp';
import cafe400 from '../assets/images/console-hub/cafe-400.webp';
import cafe800 from '../assets/images/console-hub/cafe-800.webp';
import shop400 from '../assets/images/console-hub/shop-400.webp';
import shop800 from '../assets/images/console-hub/shop-800.webp';
import tournaments400 from '../assets/images/console-hub/tournaments-400.webp';
import tournaments800 from '../assets/images/console-hub/tournaments-800.webp';
import loyalty400 from '../assets/images/console-hub/loyalty-400.webp';
import loyalty800 from '../assets/images/console-hub/loyalty-800.webp';
import { L } from '../utils/i18n';

interface Props {
  themeId?: string;
  systems?: any[];
  cafeItems?: any[];
  accessories?: any[];
  tournaments?: any[];
  user?: any;
  transactions?: any[];
  activeCoupons?: any[];
  onRedeemPoints?: (points: number, couponValue: number, code: string) => void;
  onAddLoyaltyPoints?: (points: number) => void;
  onOpenAuth?: () => void;
  addNotification: (message: string, type: 'success' | 'error' | 'info') => void;
  refreshData: () => Promise<void>;
  onBackToClassic?: () => void;
  activeTab?: string;
  setActiveTab?: (tab: string) => void;
}

export default function ConsoleHubView({
  onBackToClassic,
  activeTab,
  setActiveTab
 }: Props) {
  const { language } = useLanguage();

  // Esc key to go back
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && onBackToClassic) {
        onBackToClassic();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onBackToClassic]);

  return (
    <div className="fixed inset-0 w-full h-[100dvh] flex flex-col justify-between select-none font-sans text-slate-100 z-30 overflow-hidden pb-[env(safe-area-inset-bottom,0px)]">
      <img
        loading="eager"
        fetchpriority="high"
        src={hubBackground1536}
        srcSet={`${hubBackground768} 768w, ${hubBackground1536} 1536w`}
        sizes="100vw"
        width="1536"
        height="1024"
        alt=""
        aria-hidden="true"
        className="absolute inset-0 w-full h-full object-fill pointer-events-none"
      />
      {/* هدر / Header */}
      <header className="relative z-10 h-auto py-2 pt-[calc(env(safe-area-inset-top,0px)+8px)] border-b border-white/10 flex items-center justify-between px-6 bg-black/40 backdrop-blur-md">
        <div className="flex items-center gap-3">
          {onBackToClassic && (
            <button 
              onClick={onBackToClassic}
              className="flex items-center gap-2 px-2 py-0.5 rounded bg-white hover:bg-slate-100 transition-colors text-[10px] font-semibold text-slate-800 cursor-pointer border border-slate-200/50 shadow-sm"
            >
              <ArrowLeft className="w-3 h-3" />
              <span>{L(language, { fa: 'بازگشت', en: 'Back', ru: 'Назад', tr: 'Geri' })}</span>
            </button>
          )}
        </div>
        <div className="w-20"></div>
      </header>

      {/* بخش میانی / Middle Section */}
      <main className="relative z-10 flex-grow flex w-full overflow-hidden">
        {/* ستون چپ / Left Column (20%) */}
        <div className="w-[20%] border-r border-white/10 flex items-center justify-center bg-black/20 backdrop-blur-[2px]">
          {/* Empty Space according to the user's empty grid layout requirement */}
        </div>

        {/* ستون میانی / Middle Column (60%) */}
        <div className="w-[60%] flex items-center justify-center">
          {/* Empty Space according to the user's empty grid layout requirement */}
        </div>

        {/* ستون راست / Right Column (20%) */}
        <div className="w-[20%] border-l border-white/10 bg-black/20 backdrop-blur-[2px] flex flex-col p-4 gap-4 overflow-y-auto custom-scrollbar justify-start">
          {[
            { id: 'reservations', nameFa: 'رزرو', nameEn: 'RESERVE', bg: reservations400, bgLarge: reservations800, width: 400, height: 218 },
            { id: 'cafe', nameFa: 'کافه', nameEn: 'CAFE', bg: cafe400, bgLarge: cafe800, width: 400, height: 400 },
            { id: 'shop', nameFa: 'فروشگاه', nameEn: 'STORE', bg: shop400, bgLarge: shop800, width: 400, height: 400 },
            { id: 'tournaments', nameFa: 'مسابقات', nameEn: 'ARENA', bg: tournaments400, bgLarge: tournaments800, width: 400, height: 400 },
            { id: 'loyalty', nameFa: 'باشگاه', nameEn: 'CLUB', bg: loyalty400, bgLarge: loyalty800, width: 400, height: 400 },
          ].map((panel) => (
            <button
              key={panel.id}
              onClick={() => {
                if (setActiveTab) {
                  setActiveTab(panel.id);
                }
              }}
              className="relative w-full h-auto bg-transparent border-none p-0 m-0 cursor-pointer block rounded-none transition-transform duration-300 hover:scale-[1.03] focus:outline-none"
              style={{
                background: 'none',
                boxShadow: 'none',
              }}
            >
              {/* Background Panel Image */}
              <img loading="lazy"
                src={panel.bg}
                srcSet={`${panel.bg} 400w, ${panel.bgLarge} 800w`}
                sizes="20vw"
                width={panel.width}
                height={panel.height}
                alt={panel.nameEn}
                className="w-full h-auto block rounded-none border-none p-0 m-0"
                style={{
                  display: 'block',
                  width: '100%',
                  height: 'auto',
                }}
                referrerPolicy="no-referrer"
              />

              {/* Dynamic Orange Glowing Cyberpunk/Fantasy Styled Texts */}
              <div 
                className="absolute top-[35%] right-[44%] z-10 select-none pointer-events-none whitespace-nowrap text-right"
              >
                <span 
                  className="font-display font-black text-[13px] leading-none tracking-wide text-[#ff9d00] uppercase"
                  style={{
                    textShadow: '0 0 10px rgba(255,157,0,0.9), 0 0 20px rgba(255,157,0,0.5)',
                    fontFamily: '"Orbitron", "Vazirmatn", sans-serif'
                  }}
                >
                  {language === 'fa' ? panel.nameFa : panel.nameEn}
                </span>
              </div>
            </button>
          ))}
        </div>
      </main>

      {/* فوتر / Footer */}
      <footer className="relative z-10 h-6 border-t border-white/10 flex items-center justify-center px-6 bg-black/40 backdrop-blur-md">
        {/* Empty Space according to the user's empty grid layout requirement */}
      </footer>
    </div>
  );
}
