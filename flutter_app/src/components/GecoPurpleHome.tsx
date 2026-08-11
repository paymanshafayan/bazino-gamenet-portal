import React, { useState, useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { 
  Gamepad2, Trophy, Clock, Search, ShoppingBag, Facebook, Twitter, Youtube, 
  User, Play, Star, MessageSquare, ShieldAlert, Plus, ArrowRight, ArrowLeft
} from 'lucide-react';

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

  useEffect(() => {
    const timer = setInterval(() => {
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
  }, []);

  // Format numbers to have zero prefixes
  const padZero = (n: number) => n.toString().padStart(2, '0');

  return (
    <div className="w-full bg-[#1a1c29] text-white overflow-hidden pb-20 font-sans" dir={dir}>
      
      {/* 1. HERO SECTION */}
      <section className="relative w-full h-[600px] flex items-center justify-center -mt-[90px] pt-[90px]">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=2000&q=80')] bg-cover bg-center opacity-100"></div>
        <div className="absolute inset-0 bg-transparent"></div>
        
        <div className="relative z-10 flex flex-col items-center text-center max-w-4xl px-4">
          <div className="flex items-center gap-4 mb-4">
            <div className="h-[1px] w-12 bg-[#ffb800]"></div>
            <span className="text-[#ffb800] uppercase tracking-widest text-xs md:text-sm font-black">{t('brand.name', 'BAZINO')}</span>
            <div className="h-[1px] w-12 bg-[#ffb800]"></div>
          </div>
          <h1 className="text-5xl md:text-8xl font-black uppercase tracking-tighter mb-6 font-display">
            <span className="text-white">{language === 'fa' ? 'کلوپ بازی' : 'GAMING'}</span> <span className="text-[#ffb800]">{language === 'fa' ? 'بازینو' : 'BAZINO'}</span>
          </h1>
          <p className="text-gray-300 text-base md:text-lg font-medium mb-10 max-w-2xl leading-relaxed">
            {language === 'fa' 
              ? 'مدرن‌ترین مرکز گیمینگ و ورزش‌های الکترونیکی. مجهز به سیستم‌های فوق قدرتمند، اتاق‌های VIP مجهز به PS5، بوفه هوشمند آنلاین و مسابقات هفتگی با جوایز نفیس.' 
              : 'The most advanced gaming and esports center. Equipped with high-end RTX workstations, custom VIP PS5 booths, smart online café ordering, and pro tournaments.'}
          </p>
          <button 
            onClick={() => onNavigate('reservations')} 
            className="bg-[#ffb800] hover:bg-white text-black font-black uppercase tracking-wider px-10 py-4 transform -skew-x-12 hover:scale-105 transition-all shadow-[0_0_20px_rgba(255,184,0,0.3)] cursor-pointer"
          >
            <span className="transform skew-x-12 inline-block">
              {language === 'fa' ? 'رزرو سریع سیستم ها' : 'BOOK STATION NOW'}
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
              <div className="w-20 h-20 md:w-24 md:h-24 rounded-full bg-[#111119] border-2 border-white/10 flex items-center justify-center hover:border-[#ffb800] hover:scale-110 hover:shadow-[0_0_25px_rgba(255,184,0,0.4)] transition-all duration-300">
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
      <section className="max-w-7xl mx-auto px-4 mb-24">
        <div className="mb-10 flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
          <div>
            <span className="text-xs text-[#ffb800] uppercase tracking-widest font-black block mb-2">
              {language === 'fa' ? 'سخت‌افزار ممتاز کلوپ' : 'PREMIUM HARDWARE'}
            </span>
            <h2 className="text-3xl md:text-5xl font-black uppercase">
              {language === 'fa' ? 'سیستم‌ها و مانیتورها' : 'Stations &'} <span className="text-[#ffb800]">{language === 'fa' ? 'فوق‌حرفه‌ای' : 'Equipment'}</span>
            </h2>
          </div>
          <div className="flex gap-2">
            <button onClick={() => onNavigate('reservations')} className="px-5 py-2.5 bg-white/5 border border-white/10 hover:border-[#ffb800] text-[#ffb800] font-black text-xs uppercase tracking-wider transform -skew-x-12 hover:scale-105 transition-all cursor-pointer">
              <span className="transform skew-x-12 inline-block">
                {language === 'fa' ? 'مشاهده کاتالوگ' : 'VIEW ALL'}
              </span>
            </button>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {featuredGames?.slice(0, 3).map((game: any, i: number) => (
            <div key={i} className="group cursor-pointer bg-[#111119] border border-white/5 p-4 transition-all hover:border-[#ffb800]/20" onClick={() => onNavigate('reservations')}>
              <div className="relative aspect-video overflow-hidden border border-white/10 mb-6">
                <img loading="lazy" src={game.imageUrl} alt={getLocText(game.title)} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
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
                <span>{language === 'fa' ? 'حداقل رزرو :' : 'MINIMUM RESERVATION :'}</span>
                <span className="text-[#ffb800] font-black">{i === 0 ? (language === 'fa' ? '۱ ساعت' : '1 HR') : (language === 'fa' ? '۲ ساعت' : '2 HRS')}</span>
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* 4. ABOUT STORY */}
      <section className="bg-[#111119] border-y border-white/5 py-24 mb-24">
        <div className="max-w-7xl mx-auto px-4 flex flex-col lg:flex-row gap-16 items-center">
          <div className="w-full lg:w-1/2">
            <span className="text-xs text-gray-400 uppercase tracking-widest font-bold block mb-2">
              {language === 'fa' ? 'درباره کلوپ ما' : 'ABOUT STORY'}
            </span>
            <h2 className="text-4xl md:text-5xl font-black uppercase mb-6 leading-none">
              {language === 'fa' ? 'بستری برای رشد' : 'Bazino Premium'}<br/>
              <span className="text-[#ffb800]">{language === 'fa' ? 'ورزش‌های الکترونیکی' : 'Tournaments Area'}</span>
            </h2>
            <div className="flex items-center gap-4 mb-6">
               <div className="h-[2px] flex-1 bg-white/10"></div>
               <Gamepad2 className="w-5 h-5 text-[#ffb800]" />
               <div className="h-[2px] flex-1 bg-white/10"></div>
            </div>
            <p className="text-gray-400 mb-8 leading-relaxed font-medium">
              {language === 'fa'
                ? 'کلوپ بازینو با گردآوری به‌روزترین تجهیزات گیمینگ و ایجاد محیطی آرام، پرنشاط و دنج، پذیرای تمامی علاقه‌مندان به گیمینگ حرفه‌ای و تفریحی است. در بوفه آنلاین سفارش ثبت کنید، امتیاز وفاداری بگیرید و در تورنمنت‌های ما شرکت کنید.'
                : 'BAZINO Club serves the elite gaming communities with custom designed liquid-cooled machines and luxury console rooms. Order snacks directly at your desk, join our loyalty ladder, and participate in tournaments.'}
            </p>
            <div className="grid grid-cols-2 gap-4 mb-8">
              <div className="border border-white/5 bg-[#1a1c29] p-4">
                <div className="text-2xl font-black text-[#ffb800] mb-1">360Hz</div>
                <div className="text-xs text-gray-400 uppercase font-bold tracking-wider">{language === 'fa' ? 'مانیتورهای گیمینگ' : 'PRO MONITORS'}</div>
              </div>
              <div className="border border-white/5 bg-[#1a1c29] p-4">
                <div className="text-2xl font-black text-[#ffb800] mb-1">RTX 5080</div>
                <div className="text-xs text-gray-400 uppercase font-bold tracking-wider">{language === 'fa' ? 'قدرتمندترین کارت گرافیک' : 'ULTIMATE GRAPHICS'}</div>
              </div>
            </div>
            <button onClick={() => onNavigate('reservations')} className="bg-[#ffb800] hover:bg-white text-black font-black uppercase tracking-wider px-8 py-3.5 transform -skew-x-12 hover:scale-105 transition-transform cursor-pointer">
              <span className="transform skew-x-12 inline-block">{language === 'fa' ? 'همین حالا رزرو کنید' : 'BOOK A STATION'}</span>
            </button>
          </div>
          <div className="w-full lg:w-1/2 relative group cursor-pointer" onClick={() => onNavigate('tournaments')}>
            <div className="absolute inset-0 bg-[#ffb800] transform translate-x-4 translate-y-4 border border-white/10 opacity-20 group-hover:translate-x-2 group-hover:translate-y-2 transition-transform"></div>
            <img loading="lazy" src="https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=800&q=80" alt="About" className="relative z-10 w-full h-[360px] object-cover border-4 border-white/10" />
            <div className="absolute inset-0 z-20 flex items-center justify-center">
              <div className="w-20 h-20 bg-black/60 rounded-full flex items-center justify-center border-2 border-[#ffb800] group-hover:scale-110 transition-transform backdrop-blur-sm">
                <Play className="w-8 h-8 text-[#ffb800] ml-1" fill="currentColor" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 5. MATCHES - FOCUS AND GAME MANAGE */}
      <section className="max-w-7xl mx-auto px-4 mb-24">
        <div className="text-center mb-16">
          <span className="text-xs text-gray-400 uppercase tracking-widest font-bold block mb-2">
            {language === 'fa' ? 'بزرگترین رقابت‌های کلوپ' : 'COME THE END OF THE WORLD'}
          </span>
          <h2 className="text-3xl md:text-5xl font-black uppercase mb-6">
            {language === 'fa' ? 'تمرکز و مدیریت' : 'Focus And Game'} <span className="text-[#ffb800]">{language === 'fa' ? 'رقابت‌ها' : 'Manage'}</span>
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
                  <span className="transform skew-x-12">{language === 'fa' ? 'جزئیات مسابقه' : 'VIEW DETAILS'}</span>
                </button>
                <button onClick={() => onNavigate('chat')} className="flex-1 border border-white/20 hover:border-[#ffb800] text-white font-black text-xs uppercase tracking-wider py-3 transform -skew-x-12 hover:bg-white/5 transition-all flex items-center justify-center cursor-pointer">
                  <span className="transform skew-x-12 flex items-center gap-2">
                    <MessageSquare className="w-3 h-3" /> {language === 'fa' ? 'چت روم' : 'CHAT ROOM'}
                  </span>
                </button>
              </div>

              {/* Dynamic timer display */}
              <div className="flex justify-between w-full text-center px-4">
                <div className="flex flex-col">
                  <span className="text-[#ffb800] font-black text-xl">{padZero(timeLeft.days)}</span>
                  <span className="text-[9px] uppercase tracking-widest text-gray-500 font-bold">{language === 'fa' ? 'روز' : 'DAYS'}</span>
                </div>
                <span className="text-white/20 font-black text-xl">:</span>
                <div className="flex flex-col">
                  <span className="text-[#ffb800] font-black text-xl">{padZero(timeLeft.hours)}</span>
                  <span className="text-[9px] uppercase tracking-widest text-gray-500 font-bold">{language === 'fa' ? 'ساعت' : 'HRS'}</span>
                </div>
                <span className="text-white/20 font-black text-xl">:</span>
                <div className="flex flex-col">
                  <span className="text-[#ffb800] font-black text-xl">{padZero(timeLeft.mins)}</span>
                  <span className="text-[9px] uppercase tracking-widest text-gray-500 font-bold">{language === 'fa' ? 'دقیقه' : 'MINS'}</span>
                </div>
                <span className="text-white/20 font-black text-xl">:</span>
                <div className="flex flex-col">
                  <span className="text-[#ffb800] font-black text-xl">{padZero(timeLeft.secs)}</span>
                  <span className="text-[9px] uppercase tracking-widest text-gray-500 font-bold">{language === 'fa' ? 'ثانیه' : 'SECS'}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 6. JOINING TOURNAMENT (Fully Connected to dynamic database tournaments) */}
      <section className="bg-[#111119] border-y border-white/5 py-24 mb-24">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-12 border-b border-white/10 pb-4">
            <h2 className="text-4xl md:text-5xl font-black uppercase mb-4 md:mb-0">
              {language === 'fa' ? 'ثبت نام و ورود به' : 'Joining'} <span className="text-[#ffb800]">{language === 'fa' ? 'مسابقات فعال' : 'Tournament'}</span>
            </h2>
            <div className="flex gap-6 text-xs font-bold uppercase tracking-widest overflow-x-auto w-full md:w-auto">
              <span className="text-[#ffb800] border-b-2 border-[#ffb800] pb-4 cursor-pointer whitespace-nowrap">{language === 'fa' ? 'همه مسابقات کلوپ' : 'ALL ACTIVE'}</span>
              <span onClick={() => onNavigate('tournaments')} className="text-gray-400 hover:text-[#ffb800] pb-4 cursor-pointer whitespace-nowrap">{language === 'fa' ? 'مشاهده جدول زمانی' : 'SCHEDULE'}</span>
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
                      {tournament.status === 'active' ? (language === 'fa' ? 'در حال ثبت‌نام' : 'ACTIVE') : (language === 'fa' ? 'به زودی' : 'UPCOMING')}
                    </span>
                  </div>
                  <h3 className="text-2xl font-black uppercase tracking-wider group-hover:text-[#ffb800] transition-colors">
                    {tournament.title}
                  </h3>
                  <p className="text-sm text-gray-400 mt-2">
                    {language === 'fa' 
                      ? `جایزه بزرگ مسابقات با ارزش ${tournament.prizePool || 'نامشخص'} به صورت نقد و تخفیف‌های ویژه کلوپ وفاداری.` 
                      : `Grand tournament prize pool valued at ${tournament.prizePool || 'TBA'} with loyalty rewards.`}
                  </p>
                </div>

                <div className="flex items-center gap-8 shrink-0 flex-col sm:flex-row">
                  <div className="text-sm font-black uppercase tracking-wider text-gray-300">
                    {language === 'fa' ? 'هزینه ورودی:' : 'ENTRY FEE:'} <span className="text-[#ffb800]">{tournament.registrationFee > 0 ? `$${tournament.registrationFee}` : (language === 'fa' ? 'رایگان' : 'FREE')}</span>
                  </div>
                  <button onClick={() => onNavigate('tournaments')} className="bg-[#ffb800] hover:bg-white text-black text-xs font-black uppercase tracking-widest px-6 py-3 transition-colors flex items-center gap-2 transform -skew-x-12 cursor-pointer">
                    <span className="transform skew-x-12 flex items-center gap-1.5">
                      {language === 'fa' ? 'ورود به جدول' : 'JOIN NOW'} <ArrowRight className="w-4 h-4" />
                    </span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 7. WHY CHOOSE US & STATS */}
      <section className="max-w-7xl mx-auto px-4 mb-24">
        <div className="text-center mb-16">
          <span className="text-xs text-gray-400 uppercase tracking-widest font-bold block mb-2">
            {language === 'fa' ? 'خدمات ویژه ما به گیمرها' : 'WHAT WE GIVE PLAYERS'}
          </span>
          <h2 className="text-3xl md:text-5xl font-black uppercase mb-6">
            {language === 'fa' ? 'چرا کلوپ بازی' : 'Why Choose'} <span className="text-[#ffb800]">{language === 'fa' ? 'بازینو ؟' : 'Bazino'}</span>
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
              tag: language === 'fa' ? 'سخت‌افزار' : 'HARDWARE',
              title: language === 'fa' ? 'سیستم‌های بسیار قدرتمند گیمینگ' : 'High-end Gaming Rigs',
              desc: language === 'fa' ? 'تمام سیستم‌های کلوپ بازینو مجهز به جدیدترین کارت‌های گرافیک RTX و مانیتورهای ۳۶۰ هرتز هستند.' : 'All Bazino systems are equipped with the latest RTX graphic cards and 360Hz ultra-fast gaming monitors.',
              targetTab: 'reservations'
            },
            {
              tag: language === 'fa' ? 'کافه بوفه' : 'BUFFET',
              title: language === 'fa' ? 'بوفه و کافه هوشمند با سفارش آنلاین' : 'Smart Cafe & Buffet Online',
              desc: language === 'fa' ? 'در حین بازی، سفارش بوفه خود را به صورت کاملاً آنلاین ثبت کرده و در محل سیستم خود تحویل بگیرید.' : 'Order your favorite gaming snacks and drinks online and have them delivered directly to your station.',
              targetTab: 'cafe'
            },
            {
              tag: language === 'fa' ? 'وفاداری' : 'LOYALTY',
              title: language === 'fa' ? 'سیستم امتیازدهی و باشگاه مشتریان' : 'Premium Loyalty Program',
              desc: language === 'fa' ? 'با هر دقیقه بازی کردن و ثبت سفارش در کافه امتیاز جمع کنید و کدهای تخفیف شگفت‌انگیز بگیرید.' : 'Collect loyalty points with every minute of gameplay or cafe orders to redeem for high-value discount coupons.',
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
                   <span className="text-[#ffb800] border border-[#ffb800] text-[9px] font-black uppercase px-2 py-0.5 mb-2 inline-block">BAZINO</span>
                   <h4 className="text-sm font-bold leading-tight">{language === 'fa' ? 'کلیک کنید و کشف کنید' : 'Click to discover'}</h4>
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
              <div className="text-xs text-gray-400 uppercase tracking-widest font-bold">{language === 'fa' ? 'سیستم گیمینگ' : 'GAMING SYSTEMS'}</div>
            </div>
          </div>
          <div className="flex items-center gap-4 justify-center">
            <User className="w-12 h-12 text-[#ffb800]" />
            <div>
              <div className="text-4xl font-black mb-1">2,000+</div>
              <div className="text-xs text-gray-400 uppercase tracking-widest font-bold">{language === 'fa' ? 'گیمر فعال' : 'ACTIVE GAMERS'}</div>
            </div>
          </div>
          <div className="flex items-center gap-4 justify-center">
            <Clock className="w-12 h-12 text-[#ffb800]" />
            <div>
              <div className="text-4xl font-black mb-1">24/7</div>
              <div className="text-xs text-gray-400 uppercase tracking-widest font-bold">{language === 'fa' ? 'ساعت کاری' : 'OPEN HOURS'}</div>
            </div>
          </div>
          <div className="flex items-center gap-4 justify-center">
            <Gamepad2 className="w-12 h-12 text-[#ffb800]" />
            <div>
              <div className="text-4xl font-black mb-1">100+</div>
              <div className="text-xs text-gray-400 uppercase tracking-widest font-bold">{language === 'fa' ? 'بازی نصب شده' : 'INSTALLED GAMES'}</div>
            </div>
          </div>
        </div>
      </section>

      {/* 8. PRODUCTS CORNER */}
      <section className="max-w-7xl mx-auto px-4 mb-24">
        <div className="text-center mb-16">
          <span className="text-xs text-gray-400 uppercase tracking-widest font-bold block mb-2">
            {language === 'fa' ? 'تجهیزات گیمینگ با کیفیت' : 'GAMING ACCESSORIES'}
          </span>
          <h2 className="text-4xl md:text-5xl font-black uppercase mb-6">
            {language === 'fa' ? 'فروشگاه لوازم' : 'Gaming Products'} <span className="text-[#ffb800]">{language === 'fa' ? 'جانبی' : 'Corner'}</span>
          </h2>
          <div className="flex items-center gap-4 max-w-xs mx-auto">
             <div className="h-[2px] flex-1 bg-white/10"></div>
             <Trophy className="w-4 h-4 text-[#ffb800]" />
             <div className="h-[2px] flex-1 bg-white/10"></div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            { id: 'HEADSET', name: { fa: 'هدست حرفه‌ای گیمینگ', en: 'Pro Gaming Headset' }, price: '$89.00', url: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=400&q=80' },
            { id: 'KEYBOARD', name: { fa: 'کیبورد مکانیکال نوری', en: 'Optical Mechanical Keyboard' }, price: '$129.00', url: 'https://images.unsplash.com/photo-1606144042614-b2417e99c4e3?auto=format&fit=crop&w=400&q=80' },
            { id: 'MOUSE', name: { fa: 'ماوس بی‌سیم گیمینگ', en: 'Ultra-light Gaming Mouse' }, price: '$79.00', url: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&w=400&q=80' },
            { id: 'GAMEPAD', name: { fa: 'دسته بازی الیت کنسول', en: 'Custom Elite Gamepad' }, price: '$99.00', url: 'https://images.unsplash.com/photo-1606144042614-b2417e99c4e3?auto=format&fit=crop&w=400&q=80' },
          ].map((prod, i) => (
            <div key={i} className="bg-[#111119] border border-white/5 group cursor-pointer" onClick={() => onNavigate('shop')}>
              <div className="h-64 p-8 flex items-center justify-center bg-[#161824] border-b border-white/5 relative overflow-hidden">
                <ShoppingBag className="w-24 h-24 text-white/5 group-hover:scale-125 transition-transform duration-500" />
                <div className="absolute inset-0 flex items-center justify-center p-8">
                   <img loading="lazy" src={prod.url} alt={prod.name} className="max-w-full max-h-full object-contain mix-blend-screen opacity-50 group-hover:opacity-100 transition-opacity" />
                </div>
              </div>
              <div className="p-6 flex flex-col items-center text-center">
                <span className="bg-[#ffb800] text-black text-[9px] font-black uppercase px-3 py-1 mb-4 inline-block">{prod.id}</span>
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

    </div>
  );
}
