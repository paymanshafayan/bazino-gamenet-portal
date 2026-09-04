import React, { useState, useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { DeferredSection, getResponsiveSrcSet } from './PerformanceGuards';
import {
  Gamepad2, Trophy, Clock, Search, ShoppingBag, Facebook, Twitter, Youtube, 
  User, Play, Star, MessageSquare, ShieldAlert, Plus, ArrowRight, ArrowLeft
} from 'lucide-react';
import { vimg } from '../utils/assetVersion';
import { L } from '../utils/i18n';

export default function GecoPurpleHome({ 
  featuredGames, 
  matchHistory, 
  pricingPackages, 
  loungeSections,
  tournaments,
  staffTeam,
  onNavigate 
}: any) {
  const { language, t, dir } = useLanguage();
  const getLocText = (obj: any) => obj ? (obj[language] || obj['en']) : '';

  // 1. Ticking Countdown Timer (To next Friday 9 PM)
  const [timeLeft, setTimeLeft] = useState({ days: 3, hours: 8, mins: 24, secs: 15 });
  const [isMatchSectionVisible, setIsMatchSectionVisible] = useState(false);

  useEffect(() => {
    if (!isMatchSectionVisible) return;
    const timer = setInterval(() => {
      if (document.visibilityState !== 'visible') return;
      setTimeLeft(prev => {
        if (prev.secs > 0) {
          return { ...prev, secs: prev.secs - 1 };
        } else if (prev.mins > 0) {
          return { ...prev, mins: prev.mins - 1, secs: 59 };
        } else if (prev.hours > 0) {
          return { ...prev, hours: prev.hours - 1, mins: 59, secs: 59 };
        } else if (prev.days > 0) {
          return { ...prev, days: prev.days - 1, hours: 23, mins: 59, secs: 59 };
        }
        return { days: 4, hours: 12, mins: 0, secs: 0 }; // reset to next cycle
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [isMatchSectionVisible]);

  // Format numbers to have zero prefixes
  const padZero = (n: number) => n.toString().padStart(2, '0');

  return (
    <div className="w-full bg-[#1a1c29] text-white overflow-hidden pb-20 font-sans" dir={dir}>
      
      {/* 1. HERO SECTION */}
      <section className="relative w-full h-[600px] flex items-center justify-center -mt-[90px] pt-[90px]">
        <img
          loading="eager"
          fetchpriority="high"
          src={vimg("/images/home/esports-1600.webp")}
          srcSet={getResponsiveSrcSet('/images/home/esports-1600.webp', [480, 800, 1200, 1600])}
          sizes="100vw"
          width="1600"
          height="900"
          alt="Bazino gaming arena"
          className="absolute inset-0 w-full h-full object-cover"
          referrerPolicy="no-referrer"
        />
        <div className="absolute inset-0 bg-transparent"></div>
        
        <div className="relative z-10 flex flex-col items-center text-center max-w-4xl px-4">
          <div className="flex items-center gap-4 mb-4">
            <div className="h-[1px] w-12 bg-[#ffb800]"></div>
            <span className="text-[#ffb800] uppercase tracking-widest text-xs md:text-sm font-black">{t('brand.name', 'BAZINO')}</span>
            <div className="h-[1px] w-12 bg-[#ffb800]"></div>
          </div>
          <h1 className="text-5xl md:text-8xl font-black uppercase tracking-tighter mb-6 font-display">
            <span className="text-white">{L(language, { fa: 'کلوپ بازی', en: 'GAMING', ru: 'ИГРОВОЙ', tr: 'OYUN' })}</span> <span className="text-[#ffb800]">{L(language, { fa: 'بازینو', en: 'BAZINO', ru: 'BAZINO', tr: 'BAZINO' })}</span>
          </h1>
          <p className="text-gray-300 text-base md:text-lg font-medium mb-10 max-w-2xl leading-relaxed">
            {L(language, { fa: 'مدرن‌ترین مرکز گیمینگ و ورزش‌های الکترونیکی. مجهز به سیستم‌های فوق قدرتمند، اتاق‌های VIP مجهز به PS5، بوفه هوشمند آنلاین و مسابقات هفتگی با جوایز نفیس.', en: 'The most advanced gaming and esports center. Equipped with high-end RTX workstations, custom VIP PS5 booths, smart online café ordering, and pro tournaments.', ru: 'Самый современный центр гейминга и киберспорта: мощные RTX-станции, VIP-комнаты с PS5, умный онлайн-заказ из кафе и еженедельные турниры с ценными призами.', tr: 'En modern oyun ve espor merkezi: üst düzey RTX sistemler, PS5’li özel VIP odalar, akıllı online kafe siparişi ve değerli ödüllü haftalık turnuvalar.' })}
          </p>
          <button 
            onClick={() => onNavigate('reservations')} 
            className="bg-[#ffb800] hover:bg-white text-black font-black uppercase tracking-wider px-10 py-4 transform -skew-x-12 hover:scale-105 transition-transform shadow-[0_0_20px_rgba(255,184,0,0.3)] cursor-pointer"
          >
            <span className="transform skew-x-12 inline-block">
              {L(language, { fa: 'رزرو سریع سیستم ها', en: 'BOOK STATION NOW', ru: 'БЫСТРАЯ БРОНЬ', tr: 'HEMEN İSTASYON AYIRT' })}
            </span>
          </button>
        </div>
      </section>

      {/* 2. DYNAMIC SERVICE SHORTCUTS (Replacing static mockup) */}
      <section className="relative z-20 max-w-7xl mx-auto px-4 -mt-16 mb-24">
        <div className="flex flex-wrap justify-center gap-6 md:gap-10">
          {loungeSections?.map((section: any, idx: number) => (
            <div 
              key={section.id || idx} 
              onClick={() => onNavigate('reservations')}
              className="flex flex-col items-center gap-3 group cursor-pointer w-28 md:w-32"
            >
              <div className="w-20 h-20 md:w-24 md:h-24 rounded-full bg-[#111119] border-2 border-white/10 flex items-center justify-center hover:border-[#ffb800] hover:scale-110 hover:shadow-[0_0_25px_rgba(255,184,0,0.4)] transition-transform duration-300">
                <Gamepad2 className={`w-8 h-8 md:w-10 md:h-10 ${idx === 0 ? 'text-[#ffb800]' : 'text-gray-400 group-hover:text-[#ffb800]'}`} />
              </div>
              <span className="text-[10px] md:text-xs font-black uppercase tracking-wider text-gray-400 group-hover:text-[#ffb800] transition-colors text-center w-full truncate">
                {getLocText(section.name)}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* 3. LATEST RELEASES / DETAILED RIGS */}
      <DeferredSection minHeight={620} render={() => (
      <section className="max-w-7xl mx-auto px-4 mb-24">
        <div className="mb-10 flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
          <div>
            <span className="text-xs text-[#ffb800] uppercase tracking-widest font-black block mb-2">
              {L(language, { fa: 'سخت‌افزار ممتاز کلوپ', en: 'PREMIUM HARDWARE', ru: 'ПРЕМИУМ-ОБОРУДОВАНИЕ', tr: 'PREMIUM DONANIM' })}
            </span>
            <h2 className="text-3xl md:text-5xl font-black uppercase">
              {L(language, { fa: 'سیستم‌ها و مانیتورها', en: 'Stations &', ru: 'Станции и', tr: 'İstasyonlar ve' })} <span className="text-[#ffb800]">{L(language, { fa: 'فوق‌حرفه‌ای', en: 'Equipment', ru: 'оборудование', tr: 'Ekipman' })}</span>
            </h2>
          </div>
          <div className="flex gap-2">
            <button onClick={() => onNavigate('reservations')} className="px-5 py-2.5 bg-white/5 border border-white/10 hover:border-[#ffb800] text-[#ffb800] font-black text-xs uppercase tracking-wider transform -skew-x-12 hover:scale-105 transition-transform cursor-pointer">
              <span className="transform skew-x-12 inline-block">
                {L(language, { fa: 'مشاهده کاتالوگ', en: 'VIEW ALL', ru: 'СМОТРЕТЬ ВСЕ', tr: 'TÜMÜNÜ GÖR' })}
              </span>
            </button>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {featuredGames?.slice(0, 3).map((game: any, i: number) => (
            <div key={i} className="group cursor-pointer bg-[#111119] border border-white/5 p-4 transition-all hover:border-[#ffb800]/20" onClick={() => onNavigate('reservations')}>
              <div className="relative aspect-video overflow-hidden border border-white/10 mb-6">
                <img loading="lazy" src={game.imageUrl} srcSet={getResponsiveSrcSet(game.imageUrl, [320, 640, 800])} sizes="(min-width: 768px) 33vw, 100vw" width="800" height="450" alt={getLocText(game.title)} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                <div className="absolute bottom-4 left-4 bg-[#ffb800] text-black text-[10px] font-black px-3 py-1 uppercase tracking-wider">
                  {game.badge || 'GAMING'}
                </div>
              </div>
              <h3 className="text-xl md:text-2xl font-black uppercase tracking-wider mb-2 group-hover:text-[#ffb800] transition-colors line-clamp-1">
                {getLocText(game.title)}
              </h3>
              <p className="text-xs text-gray-400 mb-4 line-clamp-2 leading-relaxed">
                {getLocText(game.desc)}
              </p>
              <p className="text-sm font-bold text-gray-400 uppercase tracking-wider pt-3 border-t border-white/5 flex justify-between items-center">
                <span>{L(language, { fa: 'حداقل رزرو :', en: 'MINIMUM RESERVATION :', ru: 'МИНИМАЛЬНАЯ БРОНЬ :', tr: 'MİNİMUM REZERVASYON :' })}</span>
                <span className="text-[#ffb800] font-black">{i === 0 ? (L(language, { fa: '۱ ساعت', en: '1 HR', ru: '1 ЧАС', tr: '1 SAAT' })) : (L(language, { fa: '۲ ساعت', en: '2 HRS', ru: '2 ЧАСА', tr: '2 SAAT' }))}</span>
              </p>
            </div>
          ))}
        </div>
      </section>
      )} />

      {/* 4. ABOUT STORY */}
      <DeferredSection minHeight={620} render={() => (
      <section className="bg-[#111119] border-y border-white/5 py-24 mb-24">
        <div className="max-w-7xl mx-auto px-4 flex flex-col lg:flex-row gap-16 items-center">
          <div className="w-full lg:w-1/2">
            <span className="text-xs text-gray-400 uppercase tracking-widest font-bold block mb-2">
              {L(language, { fa: 'درباره کلوپ ما', en: 'ABOUT STORY', ru: 'О НАШЕМ КЛУБЕ', tr: 'HAKKIMIZDA' })}
            </span>
            <h2 className="text-4xl md:text-5xl font-black uppercase mb-6 leading-none">
              {L(language, { fa: 'بستری برای رشد', en: 'Bazino Premium', ru: 'Bazino Premium', tr: 'Bazino Premium' })}<br/>
              <span className="text-[#ffb800]">{L(language, { fa: 'ورزش‌های الکترونیکی', en: 'Tournaments Area', ru: 'Турнирная зона', tr: 'Turnuva Alanı' })}</span>
            </h2>
            <div className="flex items-center gap-4 mb-6">
               <div className="h-[2px] flex-1 bg-white/10"></div>
               <Gamepad2 className="w-5 h-5 text-[#ffb800]" />
               <div className="h-[2px] flex-1 bg-white/10"></div>
            </div>
            <p className="text-gray-400 mb-8 leading-relaxed font-medium">
              {L(language, { fa: 'کلوپ بازینو با گردآوری به‌روزترین تجهیزات گیمینگ و ایجاد محیطی آرام، پرنشاط و دنج، پذیرای تمامی علاقه‌مندان به گیمینگ حرفه‌ای و تفریحی است. در بوفه آنلاین سفارش ثبت کنید، امتیاز وفاداری بگیرید و در تورنمنت‌های ما شرکت کنید.', en: 'BAZINO Club serves the elite gaming communities with custom designed liquid-cooled machines and luxury console rooms. Order snacks directly at your desk, join our loyalty ladder, and participate in tournaments.', ru: 'Клуб BAZINO принимает всех любителей профессионального и развлекательного гейминга: новейшее оборудование, спокойная и уютная атмосфера. Заказывайте в онлайн-буфете, копите баллы лояльности и участвуйте в турнирах.', tr: 'BAZINO Kulübü, en güncel oyun ekipmanları ve huzurlu, keyifli bir ortamla profesyonel ve eğlence amaçlı tüm oyunseverleri ağırlıyor. Online büfeden sipariş verin, sadakat puanı biriktirin ve turnuvalara katılın.' })}
            </p>
            <div className="grid grid-cols-2 gap-4 mb-8">
              <div className="border border-white/5 bg-[#1a1c29] p-4">
                <div className="text-2xl font-black text-[#ffb800] mb-1">360Hz</div>
                <div className="text-xs text-gray-400 uppercase font-bold tracking-wider">{L(language, { fa: 'مانیتورهای گیمینگ', en: 'PRO MONITORS', ru: 'ПРО-МОНИТОРЫ', tr: 'PRO MONİTÖRLER' })}</div>
              </div>
              <div className="border border-white/5 bg-[#1a1c29] p-4">
                <div className="text-2xl font-black text-[#ffb800] mb-1">RTX 5080</div>
                <div className="text-xs text-gray-400 uppercase font-bold tracking-wider">{L(language, { fa: 'قدرتمندترین کارت گرافیک', en: 'ULTIMATE GRAPHICS', ru: 'МАКСИМАЛЬНАЯ ГРАФИКА', tr: 'EN GÜÇLÜ EKRAN KARTI' })}</div>
              </div>
            </div>
            <button onClick={() => onNavigate('reservations')} className="bg-[#ffb800] hover:bg-white text-black font-black uppercase tracking-wider px-8 py-3.5 transform -skew-x-12 hover:scale-105 transition-transform cursor-pointer">
              <span className="transform skew-x-12 inline-block">{L(language, { fa: 'همین حالا رزرو کنید', en: 'BOOK A STATION', ru: 'ЗАБРОНИРОВАТЬ СТАНЦИЮ', tr: 'HEMEN REZERVE EDİN' })}</span>
            </button>
          </div>
          <div className="w-full lg:w-1/2 relative group cursor-pointer" onClick={() => onNavigate('tournaments')}>
            <div className="absolute inset-0 bg-[#ffb800] transform translate-x-4 translate-y-4 border border-white/10 opacity-20 group-hover:translate-x-2 group-hover:translate-y-2 transition-transform"></div>
            <img loading="lazy" src={vimg("/images/home/esports-800.webp")} srcSet={getResponsiveSrcSet('/images/home/esports-800.webp', [480, 800])} sizes="(min-width: 768px) 50vw, 100vw" width="800" height="450" alt="About" className="relative z-10 w-full h-[360px] object-cover border-4 border-white/10" />
            <div className="absolute inset-0 z-20 flex items-center justify-center">
              <div className="w-20 h-20 bg-black/60 rounded-full flex items-center justify-center border-2 border-[#ffb800] group-hover:scale-110 transition-transform backdrop-blur-sm">
                <Play className="w-8 h-8 text-[#ffb800] ml-1" fill="currentColor" />
              </div>
            </div>
          </div>
        </div>
      </section>
      )} />

      {/* 5. MATCHES - FOCUS AND GAME MANAGE */}
      <DeferredSection minHeight={720} onVisible={() => setIsMatchSectionVisible(true)} render={() => (
      <section className="max-w-7xl mx-auto px-4 mb-24">
        <div className="text-center mb-16">
          <span className="text-xs text-gray-400 uppercase tracking-widest font-bold block mb-2">
            {L(language, { fa: 'بزرگترین رقابت‌های کلوپ', en: 'COME THE END OF THE WORLD', ru: 'ГЛАВНЫЕ БИТВЫ КЛУБА', tr: 'KULÜBÜN EN BÜYÜK MÜCADELELERİ' })}
          </span>
          <h2 className="text-3xl md:text-5xl font-black uppercase mb-6">
            {L(language, { fa: 'تمرکز و مدیریت', en: 'Focus And Game', ru: 'Фокус и', tr: 'Odaklan ve' })} <span className="text-[#ffb800]">{L(language, { fa: 'رقابت‌ها', en: 'Manage', ru: 'Игра', tr: 'Yönet' })}</span>
          </h2>
          <div className="flex items-center gap-4 max-w-xs mx-auto">
             <div className="h-[2px] flex-1 bg-white/10"></div>
             <Trophy className="w-4 h-4 text-[#ffb800]" />
             <div className="h-[2px] flex-1 bg-white/10"></div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {matchHistory?.slice(0, 3).map((match: any, idx: number) => (
            <div key={idx} className="bg-[#111119] border border-white/10 hover:border-[#ffb800]/50 transition-colors pt-12 pb-8 px-6 flex flex-col items-center relative">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[#ffb800] to-transparent opacity-50"></div>
              
              <div className="flex items-center justify-between w-full mb-8">
                <div className="flex flex-col items-center">
                  <div className="w-20 h-20 bg-[#1a1c29] rounded-full flex items-center justify-center border border-white/10 mb-3 shadow-[0_0_15px_rgba(255,184,0,0.1)]">
                     <ShieldAlert className="w-10 h-10 text-[#ffb800]" />
                  </div>
                  <span className="font-black text-sm uppercase text-gray-300">{match.teamA}</span>
                </div>
                
                <div className="w-12 h-12 bg-[#ffb800] rounded-full flex items-center justify-center font-black text-black text-xl shrink-0">
                  VS
                </div>
                
                <div className="flex flex-col items-center">
                  <div className="w-20 h-20 bg-[#1a1c29] rounded-full flex items-center justify-center border border-white/10 mb-3 shadow-[0_0_15px_rgba(255,184,0,0.1)]">
                     <Gamepad2 className="w-10 h-10 text-purple-500" />
                  </div>
                  <span className="font-black text-sm uppercase text-gray-300">{match.teamB}</span>
                </div>
              </div>

              <h3 className="text-xl font-black uppercase tracking-wider mb-2 text-center">{match.game}</h3>
              <div className="flex gap-1 mb-8">
                {[1,2,3,4,5].map(s => <Star key={s} className="w-4 h-4 text-[#ffb800]" fill="currentColor" />)}
              </div>

              <div className="flex gap-4 mb-8 w-full">
                <button onClick={() => onNavigate('tournaments')} className="flex-1 bg-[#ffb800] text-black font-black text-xs uppercase tracking-wider py-3 transform -skew-x-12 hover:scale-105 transition-transform flex items-center justify-center cursor-pointer">
                  <span className="transform skew-x-12">{L(language, { fa: 'جزئیات مسابقه', en: 'VIEW DETAILS', ru: 'ПОДРОБНЕЕ', tr: 'DETAYLARI GÖR' })}</span>
                </button>
                <button onClick={() => onNavigate('chat')} className="flex-1 border border-white/20 hover:border-[#ffb800] text-white font-black text-xs uppercase tracking-wider py-3 transform -skew-x-12 hover:bg-white/5 transition-all flex items-center justify-center cursor-pointer">
                  <span className="transform skew-x-12 flex items-center gap-2">
                    <MessageSquare className="w-3 h-3" /> {L(language, { fa: 'چت روم', en: 'CHAT ROOM', ru: 'ЧАТ', tr: 'SOHBET ODASI' })}
                  </span>
                </button>
              </div>

              {/* Dynamic timer display */}
              <div className="flex justify-between w-full text-center px-4">
                <div className="flex flex-col">
                  <span className="text-[#ffb800] font-black text-xl">{padZero(timeLeft.days)}</span>
                  <span className="text-[10px] uppercase tracking-widest text-gray-500 font-bold">{L(language, { fa: 'روز', en: 'DAYS', ru: 'ДН', tr: 'GÜN' })}</span>
                </div>
                <span className="text-white/20 font-black text-xl">:</span>
                <div className="flex flex-col">
                  <span className="text-[#ffb800] font-black text-xl">{padZero(timeLeft.hours)}</span>
                  <span className="text-[10px] uppercase tracking-widest text-gray-500 font-bold">{L(language, { fa: 'ساعت', en: 'HRS', ru: 'ЧАС', tr: 'SAAT' })}</span>
                </div>
                <span className="text-white/20 font-black text-xl">:</span>
                <div className="flex flex-col">
                  <span className="text-[#ffb800] font-black text-xl">{padZero(timeLeft.mins)}</span>
                  <span className="text-[10px] uppercase tracking-widest text-gray-500 font-bold">{L(language, { fa: 'دقیقه', en: 'MINS', ru: 'МИН', tr: 'DK' })}</span>
                </div>
                <span className="text-white/20 font-black text-xl">:</span>
                <div className="flex flex-col">
                  <span className="text-[#ffb800] font-black text-xl">{padZero(timeLeft.secs)}</span>
                  <span className="text-[10px] uppercase tracking-widest text-gray-500 font-bold">{L(language, { fa: 'ثانیه', en: 'SECS', ru: 'СЕК', tr: 'SN' })}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
      )} />

      {/* 6. JOINING TOURNAMENT (Fully Connected to dynamic database tournaments) */}
      <DeferredSection minHeight={680} render={() => (
      <section className="bg-[#111119] border-y border-white/5 py-24 mb-24">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-12 border-b border-white/10 pb-4">
            <h2 className="text-4xl md:text-5xl font-black uppercase mb-4 md:mb-0">
              {L(language, { fa: 'ثبت نام و ورود به', en: 'Joining', ru: 'Регистрация в', tr: 'Kayıt ve Katılım:' })} <span className="text-[#ffb800]">{L(language, { fa: 'مسابقات فعال', en: 'Tournament', ru: 'турнирах', tr: 'Aktif Turnuvalar' })}</span>
            </h2>
            <div className="flex gap-6 text-xs font-bold uppercase tracking-widest overflow-x-auto w-full md:w-auto">
              <span className="text-[#ffb800] border-b-2 border-[#ffb800] pb-4 cursor-pointer whitespace-nowrap">{L(language, { fa: 'همه مسابقات کلوپ', en: 'ALL ACTIVE', ru: 'ВСЕ АКТИВНЫЕ', tr: 'TÜM AKTİF' })}</span>
              <span onClick={() => onNavigate('tournaments')} className="text-gray-400 hover:text-[#ffb800] pb-4 cursor-pointer whitespace-nowrap">{L(language, { fa: 'مشاهده جدول زمانی', en: 'SCHEDULE', ru: 'РАСПИСАНИЕ', tr: 'PROGRAM' })}</span>
            </div>
          </div>

          <div className="space-y-6">
            {tournaments?.slice(0, 4).map((tournament: any, idx: number) => (
              <div key={tournament.id || idx} className="bg-[#1a1c29] p-8 border border-white/5 hover:border-[#ffb800]/30 transition-all hover:scale-[1.01] flex flex-col md:flex-row items-center gap-8 group">
                <div className="flex items-center gap-4 shrink-0">
                   <div className="w-16 h-16 bg-[#111119] rounded-full flex items-center justify-center border border-white/10 shadow-[0_0_15px_rgba(255,184,0,0.1)]">
                     <Trophy className="w-8 h-8 text-[#ffb800]" />
                   </div>
                   <div className="w-12 h-12 bg-[#ffb800] text-black font-black text-xs rounded-full flex items-center justify-center shadow-lg font-mono">
                     {tournament.id ? `#${tournament.id.toString().slice(-2)}` : `${idx + 1}`}
                   </div>
                </div>

                <div className="flex-1 text-center md:text-start">
                  <div className="flex items-center gap-3 justify-center md:justify-start mb-2">
                    <span className="bg-[#ffb800]/10 text-[#ffb800] text-[10px] font-black uppercase px-2.5 py-0.5 tracking-wider border border-[#ffb800]/20">
                      {tournament.game}
                    </span>
                    <span className="text-emerald-400 text-[10px] font-bold uppercase tracking-widest">
                      {tournament.status === 'active' ? (L(language, { fa: 'در حال ثبت‌نام', en: 'ACTIVE', ru: 'ИДЁТ РЕГИСТРАЦИЯ', tr: 'KAYIT AÇIK' })) : (L(language, { fa: 'به زودی', en: 'UPCOMING', ru: 'СКОРО', tr: 'YAKINDA' }))}
                    </span>
                  </div>
                  <h3 className="text-2xl font-black uppercase tracking-wider group-hover:text-[#ffb800] transition-colors">
                    {tournament.title}
                  </h3>
                  <p className="text-sm text-gray-400 mt-2">
                    {L(language, { fa: `جایزه بزرگ مسابقات با ارزش ${tournament.prizePool || 'نامشخص'} به صورت نقد و تخفیف‌های ویژه کلوپ وفاداری.`, en: `Grand tournament prize pool valued at ${tournament.prizePool || 'TBA'} with loyalty rewards.`, ru: `Главный призовой фонд турнира ${tournament.prizePool || 'уточняется'} плюс бонусы лояльности.`, tr: `${tournament.prizePool || 'Açıklanacak'} değerinde büyük turnuva ödül havuzu ve sadakat ödülleri.` })}
                  </p>
                </div>

                <div className="flex items-center gap-8 shrink-0 flex-col sm:flex-row">
                  <div className="text-sm font-black uppercase tracking-wider text-gray-300">
                    {L(language, { fa: 'هزینه ورودی:', en: 'ENTRY FEE:', ru: 'ВЗНОС:', tr: 'GİRİŞ ÜCRETİ:' })} <span className="text-[#ffb800]">{tournament.registrationFee > 0 ? `$${tournament.registrationFee}` : (L(language, { fa: 'رایگان', en: 'FREE', ru: 'БЕСПЛАТНО', tr: 'ÜCRETSİZ' }))}</span>
                  </div>
                  <button onClick={() => onNavigate('tournaments')} className="bg-[#ffb800] hover:bg-white text-black text-xs font-black uppercase tracking-widest px-6 py-3 transition-colors flex items-center gap-2 transform -skew-x-12 cursor-pointer">
                    <span className="transform skew-x-12 flex items-center gap-1.5">
                      {L(language, { fa: 'ورود به جدول', en: 'JOIN NOW', ru: 'УЧАСТВОВАТЬ', tr: 'HEMEN KATIL' })} <ArrowRight className="w-4 h-4" />
                    </span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
      )} />

      {/* 7. WHY CHOOSE US & STATS */}
      <DeferredSection minHeight={720} render={() => (
      <section className="max-w-7xl mx-auto px-4 mb-24">
        <div className="text-center mb-16">
          <span className="text-xs text-gray-400 uppercase tracking-widest font-bold block mb-2">
            {L(language, { fa: 'خدمات ویژه ما به گیمرها', en: 'WHAT WE GIVE PLAYERS', ru: 'ЧТО МЫ ДАЁМ ИГРОКАМ', tr: 'OYUNCULARA SUNDUKLARIMIZ' })}
          </span>
          <h2 className="text-3xl md:text-5xl font-black uppercase mb-6">
            {L(language, { fa: 'چرا کلوپ بازی', en: 'Why Choose', ru: 'Почему выбирают', tr: 'Neden' })} <span className="text-[#ffb800]">{L(language, { fa: 'بازینو ؟', en: 'Bazino', ru: 'Bazino', tr: 'Bazino?' })}</span>
          </h2>
          <div className="flex items-center gap-4 max-w-xs mx-auto">
             <div className="h-[2px] flex-1 bg-white/10"></div>
             <Trophy className="w-4 h-4 text-[#ffb800]" />
             <div className="h-[2px] flex-1 bg-white/10"></div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-20">
          {[
            {
              tag: L(language, { fa: 'سخت‌افزار', en: 'HARDWARE', ru: 'ОБОРУДОВАНИЕ', tr: 'DONANIM' }),
              title: L(language, { fa: 'سیستم‌های بسیار قدرتمند گیمینگ', en: 'High-end Gaming Rigs', ru: 'Мощнейшие игровые системы', tr: 'Üst Düzey Oyun Sistemleri' }),
              desc: L(language, { fa: 'تمام سیستم‌های کلوپ بازینو مجهز به جدیدترین کارت‌های گرافیک RTX و مانیتورهای ۳۶۰ هرتز هستند.', en: 'All Bazino systems are equipped with the latest RTX graphic cards and 360Hz ultra-fast gaming monitors.', ru: 'Все системы Bazino оснащены новейшими видеокартами RTX и мониторами 360 Гц.', tr: 'Tüm Bazino sistemleri en yeni RTX ekran kartları ve 360Hz oyun monitörleriyle donatılmıştır.' }),
              targetTab: 'reservations'
            },
            {
              tag: L(language, { fa: 'کافه بوفه', en: 'BUFFET', ru: 'БУФЕТ', tr: 'BÜFE' }),
              title: L(language, { fa: 'بوفه و کافه هوشمند با سفارش آنلاین', en: 'Smart Cafe & Buffet Online', ru: 'Умное кафе и буфет с онлайн-заказом', tr: 'Online Siparişli Akıllı Kafe ve Büfe' }),
              desc: L(language, { fa: 'در حین بازی، سفارش بوفه خود را به صورت کاملاً آنلاین ثبت کرده و در محل سیستم خود تحویل بگیرید.', en: 'Order your favorite gaming snacks and drinks online and have them delivered directly to your station.', ru: 'Заказывайте любимые закуски и напитки онлайн прямо во время игры и получайте их к своей станции.', tr: 'Oyun sırasında büfe siparişinizi tamamen online verin ve doğrudan istasyonunuza teslim alın.' }),
              targetTab: 'cafe'
            },
            {
              tag: L(language, { fa: 'وفاداری', en: 'LOYALTY', ru: 'ЛОЯЛЬНОСТЬ', tr: 'SADAKAT' }),
              title: L(language, { fa: 'سیستم امتیازدهی و باشگاه مشتریان', en: 'Premium Loyalty Program', ru: 'Программа лояльности и клуб', tr: 'Puan Sistemi ve Sadakat Kulübü' }),
              desc: L(language, { fa: 'با هر دقیقه بازی کردن و ثبت سفارش در کافه امتیاز جمع کنید و کدهای تخفیف شگفت‌انگیز بگیرید.', en: 'Collect loyalty points with every minute of gameplay or cafe orders to redeem for high-value discount coupons.', ru: 'Копите баллы за каждую минуту игры и заказы в кафе и обменивайте их на выгодные промокоды.', tr: 'Her oyun dakikası ve kafe siparişinizle puan biriktirin, harika indirim kodları kazanın.' }),
              targetTab: 'loyalty'
            }
          ].map((item: any, i) => (
            <div 
              key={i} 
              onClick={() => onNavigate(item.targetTab)}
              className="bg-[#111119] border border-white/5 p-8 flex flex-col justify-between hover:-translate-y-2 hover:border-[#ffb800]/20 transition-all cursor-pointer shadow-lg"
            >
              <div>
                <span className="bg-[#ffb800] text-black text-[10px] font-black uppercase tracking-widest px-3 py-1 inline-block mb-6 transform -skew-x-12">
                  <span className="transform skew-x-12 inline-block">{item.tag}</span>
                </span>
                <h3 className="text-xl font-black uppercase leading-snug mb-4">{item.title}</h3>
                <p className="text-sm text-gray-400 leading-relaxed mb-8">{item.desc}</p>
              </div>
              <div className="flex items-center gap-4 pt-6 border-t border-white/5">
                 <div className="flex-1">
                   <span className="text-[#ffb800] border border-[#ffb800] text-[10px] font-black uppercase px-2 py-0.5 mb-2 inline-block">BAZINO</span>
                   <h4 className="text-sm font-bold leading-tight">{L(language, { fa: 'کلیک کنید و کشف کنید', en: 'Click to discover', ru: 'Нажмите, чтобы узнать больше', tr: 'Keşfetmek için tıklayın' })}</h4>
                 </div>
                 <div className="w-12 h-12 bg-[#1a1c29] border border-white/10 shrink-0 flex items-center justify-center rounded-full">
                    <ArrowRight className="w-5 h-5 text-[#ffb800]" />
                 </div>
              </div>
            </div>
          ))}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 py-12 border-y border-white/10">
          <div className="flex items-center gap-4 justify-center">
            <Trophy className="w-12 h-12 text-[#ffb800]" />
            <div>
              <div className="text-4xl font-black mb-1">50+</div>
              <div className="text-xs text-gray-400 uppercase tracking-widest font-bold">{L(language, { fa: 'سیستم گیمینگ', en: 'GAMING SYSTEMS', ru: 'ИГРОВЫХ СИСТЕМ', tr: 'OYUN SİSTEMİ' })}</div>
            </div>
          </div>
          <div className="flex items-center gap-4 justify-center">
            <User className="w-12 h-12 text-[#ffb800]" />
            <div>
              <div className="text-4xl font-black mb-1">2,000+</div>
              <div className="text-xs text-gray-400 uppercase tracking-widest font-bold">{L(language, { fa: 'گیمر فعال', en: 'ACTIVE GAMERS', ru: 'АКТИВНЫХ ИГРОКОВ', tr: 'AKTİF OYUNCU' })}</div>
            </div>
          </div>
          <div className="flex items-center gap-4 justify-center">
            <Clock className="w-12 h-12 text-[#ffb800]" />
            <div>
              <div className="text-4xl font-black mb-1">24/7</div>
              <div className="text-xs text-gray-400 uppercase tracking-widest font-bold">{L(language, { fa: 'ساعت کاری', en: 'OPEN HOURS', ru: 'ЧАСЫ РАБОТЫ', tr: 'ÇALIŞMA SAATİ' })}</div>
            </div>
          </div>
          <div className="flex items-center gap-4 justify-center">
            <Gamepad2 className="w-12 h-12 text-[#ffb800]" />
            <div>
              <div className="text-4xl font-black mb-1">100+</div>
              <div className="text-xs text-gray-400 uppercase tracking-widest font-bold">{L(language, { fa: 'بازی نصب شده', en: 'INSTALLED GAMES', ru: 'УСТАНОВЛЕННЫХ ИГР', tr: 'YÜKLÜ OYUN' })}</div>
            </div>
          </div>
        </div>
      </section>
      )} />

      {/* 8. PRODUCTS CORNER */}
      <DeferredSection minHeight={620} render={() => (
      <section className="max-w-7xl mx-auto px-4 mb-24">
        <div className="text-center mb-16">
          <span className="text-xs text-gray-400 uppercase tracking-widest font-bold block mb-2">
            {L(language, { fa: 'تجهیزات گیمینگ با کیفیت', en: 'GAMING ACCESSORIES', ru: 'ИГРОВЫЕ АКСЕССУАРЫ', tr: 'KALİTELİ OYUN AKSESUARLARI' })}
          </span>
          <h2 className="text-4xl md:text-5xl font-black uppercase mb-6">
            {L(language, { fa: 'فروشگاه لوازم', en: 'Gaming Products', ru: 'Магазин игровых', tr: 'Aksesuar' })} <span className="text-[#ffb800]">{L(language, { fa: 'جانبی', en: 'Corner', ru: 'товаров', tr: 'Mağazası' })}</span>
          </h2>
          <div className="flex items-center gap-4 max-w-xs mx-auto">
             <div className="h-[2px] flex-1 bg-white/10"></div>
             <Trophy className="w-4 h-4 text-[#ffb800]" />
             <div className="h-[2px] flex-1 bg-white/10"></div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            { id: 'HEADSET', name: { fa: 'هدست حرفه‌ای گیمینگ', en: 'Pro Gaming Headset' }, price: '$89.00', url: vimg('/images/home/gear-shop-480.webp') },
            { id: 'KEYBOARD', name: { fa: 'کیبورد مکانیکال نوری', en: 'Optical Mechanical Keyboard' }, price: '$129.00', url: vimg('/images/home/gear-shop-480.webp') },
            { id: 'MOUSE', name: { fa: 'ماوس بی‌سیم گیمینگ', en: 'Ultra-light Gaming Mouse' }, price: '$79.00', url: vimg('/images/home/gear-shop-480.webp') },
            { id: 'GAMEPAD', name: { fa: 'دسته بازی الیت کنسول', en: 'Custom Elite Gamepad' }, price: '$99.00', url: vimg('/images/home/sports-console-480.webp') },
          ].map((prod, i) => (
            <div key={i} className="bg-[#111119] border border-white/5 group cursor-pointer" onClick={() => onNavigate('shop')}>
              <div className="h-64 p-8 flex items-center justify-center bg-[#161824] border-b border-white/5 relative overflow-hidden">
                <ShoppingBag className="w-24 h-24 text-white/5 group-hover:scale-125 transition-transform duration-500" />
                <div className="absolute inset-0 flex items-center justify-center p-8">
                   <img loading="lazy" src={prod.url} srcSet={getResponsiveSrcSet(prod.url, [320, 480])} sizes="(min-width: 1280px) 302px, (min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw" width="400" height="400" alt={getLocText(prod.name)} className="max-w-full max-h-full object-contain mix-blend-screen opacity-50 group-hover:opacity-100 transition-opacity" />
                </div>
              </div>
              <div className="p-6 flex flex-col items-center text-center">
                <span className="bg-[#ffb800] text-black text-[10px] font-black uppercase px-3 py-1 mb-4 inline-block">{prod.id}</span>
                <h4 className="text-sm font-black uppercase mb-4 group-hover:text-[#ffb800] transition-colors">
                  {getLocText(prod.name)}
                </h4>
                <div className="flex items-center justify-between w-full pt-4 border-t border-white/5">
                  <span className="text-[#ffb800] font-black text-lg">{prod.price}</span>
                  <button className="text-gray-400 hover:text-[#ffb800] transition-colors cursor-pointer"><ShoppingBag className="w-4 h-4" /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
      )} />

    </div>
  );
}
