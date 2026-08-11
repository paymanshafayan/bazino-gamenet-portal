import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, MapPin, Phone, Mail, Youtube, Facebook, Twitter, Trophy, Gamepad2, CalendarDays, Sparkles, Send } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

export default function GamingAmpHome({ 
  featuredGames, 
  gameGenres, 
  matchHistory, 
  pricingPackages, 
  staffTeam, 
  loungeSections,
  onNavigate, 
  tournaments 
}: any) {
  const { language, dir } = useLanguage();
  const [activeSlide, setActiveSlide] = useState(0);

  const getLocText = (obj: any) => {
    if (!obj) return '';
    return obj[language] || obj.fa || '';
  };

  const getButtonText = (target: string) => {
    const normTarget = target === 'reserve' ? 'reservations' : target;
    switch (normTarget) {
      case 'cafe':
        return {
          fa: 'سفارش آنلاین بوفه',
          en: 'Order Cafe Online',
          ru: 'Заказать в кафе',
          tr: 'Cafe Siparişi'
        };
      case 'shop':
        return {
          fa: 'مشاهده فروشگاه جانبی',
          en: 'Browse Gear Shop',
          ru: 'Перейти в магазин',
          tr: 'Mağazayı İncele'
        };
      case 'tournaments':
        return {
          fa: 'ورود به مسابقات',
          en: 'Join Tournaments',
          ru: 'Турниры',
          tr: 'Turnuvalara Katıl'
        };
      case 'blog':
        return {
          fa: 'اخبار کلوپ و مقالات',
          en: 'Club Blog & News',
          ru: 'Новости клуба',
          tr: 'Kulüp Haberleri'
        };
      default:
        return {
          fa: 'همین حالا رزرو کن',
          en: 'Reserve System Now',
          ru: 'Забронировать сейчас',
          tr: 'Hemen Rezervasyon Yap'
        };
    }
  };

  const heroGame = featuredGames?.[0];
  const spotlightGames = featuredGames?.slice(1) || [];

  return (
    <div className="w-[calc(100%+2rem)] md:w-[calc(100%+4rem)] -mx-4 md:-mx-8 bg-[#111119] text-white font-sans overflow-hidden" dir={dir}>
      
      {/* 1. HERO SLIDER */}
      <section className="relative w-full aspect-[21/9] min-h-[600px] flex items-center justify-center border-b-2 border-[#00d8ff]/30" style={{ clipPath: 'polygon(0 0, 100% 0, 100% 95%, 0% 100%)' }}>
        <img loading="lazy" 
          src={heroGame?.imageUrl || "https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=1920&q=80"} 
          alt="Hero" 
          className="absolute inset-0 w-full h-full object-cover opacity-100" 
        />
        <div className="absolute inset-0 bg-transparent"></div>
        
        <div className="relative z-10 flex flex-col items-start px-8 md:px-24 w-full max-w-7xl mx-auto">
          <div className="flex items-center gap-3 mb-4">
            <span className="w-8 h-1 bg-[#00d8ff] animate-pulse"></span>
            <h2 className="text-[#00d8ff] text-sm md:text-lg tracking-[0.3em] uppercase font-bold text-shadow-[0_0_10px_#00d8ff]">
              {heroGame?.badge || 'GAMESITE TEMPLATE'}
            </h2>
          </div>
          <h1 className="text-5xl md:text-7xl font-black text-white mb-6 leading-tight uppercase max-w-3xl font-display">
            {getLocText(heroGame?.title) || 'HTML Web Page Design'}
          </h1>
          <p className="text-gray-300 max-w-2xl text-sm md:text-lg border-l-2 border-[#00d8ff] pl-4 mb-8 bg-black/40 p-4 font-mono leading-relaxed">
            {getLocText(heroGame?.desc)}
          </p>
          <div className="flex gap-4">
            <button 
              onClick={() => {
                const targetRoute = heroGame?.target === 'reserve' ? 'reservations' : (heroGame?.target || 'reservations');
                onNavigate(targetRoute);
              }}
              className="bg-[#00d8ff] text-[#111119] px-8 py-3 rounded-sm text-sm font-black tracking-widest hover:bg-white hover:text-black transition-colors uppercase shadow-[0_0_20px_rgba(0,216,255,0.4)]"
            >
              {getButtonText(heroGame?.target || 'reserve')[language] || getButtonText(heroGame?.target || 'reserve')['en']}
            </button>
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-6 sm:px-12 py-16 space-y-32">
        
        {/* 2. IN THE SPOTLIGHT (Featured Games) */}
        {spotlightGames.length > 0 && (
          <section className="space-y-12 relative">
            <div className="absolute top-0 right-0 text-[150px] font-black text-white/5 uppercase select-none pointer-events-none -mt-20 -mr-10">SPOTLIGHT</div>
            <h2 className="text-center text-3xl font-black uppercase tracking-[0.2em] mb-16 text-white relative inline-block w-full">
              <span className="relative z-10">{language === 'fa' ? 'در کانون توجه' : 'IN THE SPOTLIGHT'}</span>
            </h2>
            
            {spotlightGames.map((game: any, index: number) => (
              <div key={game.id} className={`flex flex-col md:flex-row gap-0 rounded-xl overflow-hidden bg-[#161622] border border-white/5 shadow-2xl transition-transform hover:-translate-y-1 ${index % 2 !== 0 ? 'md:flex-row-reverse' : ''}`}>
                <div className="w-full md:w-1/2 p-12 flex flex-col justify-center relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-[#00d8ff]/5 rounded-bl-full transition-transform group-hover:scale-150"></div>
                  <h3 className="text-3xl font-black mb-2 uppercase tracking-wide">{getLocText(game.title)}</h3>
                  <span className="text-xs text-[#00d8ff] mb-6 block uppercase tracking-[0.3em] font-bold">{game.badge}</span>
                  <p className="text-gray-300 text-sm md:text-base leading-loose mb-8 font-mono">
                    {getLocText(game.desc)}
                  </p>
                  <button 
                    onClick={() => onNavigate('reservations')}
                    className="self-start border-2 border-[#00d8ff] text-[#00d8ff] px-8 py-3 rounded-sm text-xs font-black tracking-[0.2em] hover:bg-[#00d8ff] hover:text-black transition-colors uppercase"
                  >
                    {language === 'fa' ? 'بازی کنید' : 'PLAY NOW'}
                  </button>
                </div>
                <div className="w-full md:w-1/2 relative group">
                  <div className="absolute inset-0 bg-[#00d8ff]/20 opacity-0 group-hover:opacity-100 transition-opacity z-10 mix-blend-overlay"></div>
                  <img loading="lazy" src={game.imageUrl} alt={getLocText(game.title)} className="w-full h-full object-cover min-h-[400px] filter grayscale-[0.3] group-hover:grayscale-0 transition-all duration-500" />
                </div>
              </div>
            ))}
          </section>
        )}

        {/* 3. LOUNGE ZONES (VIRTUAL GAMING Style) */}
        {loungeSections && loungeSections.length > 0 && (
          <section className="space-y-24">
             {loungeSections.map((zone: any, i: number) => (
               <div key={i} className={`flex flex-col md:flex-row gap-12 items-center ${i % 2 !== 0 ? 'md:flex-row-reverse' : ''}`}>
                 <div className="w-full md:w-1/2 space-y-6">
                   <div className="flex items-center gap-4 mb-2">
                     <div className="p-3 bg-[#00d8ff]/10 rounded-lg text-[#00d8ff]">{zone.icon}</div>
                     <span className="text-[#00d8ff] text-sm font-bold uppercase tracking-widest">{language === 'fa' ? 'بخش‌های کلوپ' : 'ELITE ZONES'}</span>
                   </div>
                   <h2 className="text-4xl font-black uppercase tracking-wide">{getLocText(zone.title)}</h2>
                   <p className="text-gray-300 text-sm md:text-base leading-loose font-mono bg-white/5 p-6 rounded-lg border-l-2 border-[#00d8ff]">
                     {getLocText(zone.desc)}
                   </p>
                   <button 
                     onClick={() => onNavigate(zone.id === 'cafe' ? 'cafe' : 'reservations')}
                     className="bg-transparent border border-white text-white px-8 py-3 rounded-sm text-xs font-black tracking-[0.2em] hover:bg-white hover:text-black transition-colors uppercase"
                   >
                     {getLocText(zone.btnText)}
                   </button>
                 </div>
                 <div className="w-full md:w-1/2 relative">
                   <div className="absolute -inset-4 bg-gradient-to-r from-[#00d8ff]/20 to-transparent blur-2xl rounded-full opacity-50"></div>
                   <img loading="lazy" src={zone.imageUrl} alt="Zone" className="w-full rounded-2xl shadow-2xl relative z-10 border border-white/10" />
                 </div>
               </div>
             ))}
          </section>
        )}

        {/* 4. TOURNAMENTS CAROUSEL */}
        {tournaments && tournaments.length > 0 && (
          <section className="relative w-full py-16">
            <h2 className="text-center text-3xl font-black uppercase tracking-[0.2em] mb-12 text-white">
              {language === 'fa' ? 'تورنمنت‌های فعال' : 'ACTIVE TOURNAMENTS'}
            </h2>
            <div className="relative bg-[#161622] rounded-xl overflow-hidden border border-[#00d8ff]/20 shadow-[0_0_30px_rgba(0,216,255,0.1)]">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#00d8ff] to-purple-500"></div>
              <div className="flex flex-col md:flex-row">
                <div className="w-full md:w-1/2 p-12 flex flex-col justify-center">
                  <div className="inline-flex items-center gap-2 bg-[#00d8ff]/10 text-[#00d8ff] px-3 py-1 rounded-full text-xs font-bold w-fit mb-4 uppercase">
                    <Trophy className="w-4 h-4" />
                    Max Teams: {tournaments[0].maxTeams || 8}
                  </div>
                  <h3 className="text-4xl font-black mb-4 uppercase">{tournaments[0].title}</h3>
                  <div className="flex items-center gap-4 text-sm text-gray-400 mb-6 font-mono">
                     <span className="flex items-center gap-1"><CalendarDays className="w-4 h-4" /> {tournaments[0].startDate || 'TBA'}</span>
                     <span className="flex items-center gap-1"><Gamepad2 className="w-4 h-4" /> {tournaments[0].game}</span>
                  </div>
                  <button 
                    onClick={() => onNavigate('tournaments')}
                    className="self-start bg-[#00d8ff] text-black px-8 py-3 rounded-sm text-sm font-black tracking-widest hover:bg-white transition-colors uppercase"
                  >
                    {language === 'fa' ? 'ثبت‌نام در براکت' : 'JOIN BRACKET'}
                  </button>
                </div>
                <div className="w-full md:w-1/2 aspect-video md:aspect-auto min-h-[300px] relative bg-black">
                   <img loading="lazy" src={`https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=1200&q=80`} alt="Tournament" className="absolute inset-0 w-full h-full object-cover opacity-80" />
                   <div className="absolute inset-0 bg-gradient-to-l from-transparent to-[#161622]"></div>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* 5. LIVE ARENA MATCHBOARD (MASS DEFECT style) */}
        {matchHistory && matchHistory.length > 0 && (
          <section className="grid md:grid-cols-2 gap-16 py-12 bg-[#161622] p-8 md:p-12 rounded-2xl border border-white/5">
            <div>
              <div className="flex justify-between items-baseline mb-4">
                <span className="text-[#00d8ff] text-sm font-black tracking-widest uppercase">{language === 'fa' ? 'آرنای زنده' : 'LIVE ARENA'}</span>
                <span className="text-gray-500 text-xs font-mono">SYS_STATUS: ONLINE</span>
              </div>
              <h2 className="text-4xl font-black mb-6 uppercase tracking-wide">MATCH RESULTS</h2>
              <p className="text-gray-300 text-sm leading-loose mb-8 font-mono">
                {language === 'fa' ? 'نتایج لحظه‌ای رقابت‌های کلن‌ها و تیم‌های حرفه‌ای در بازینو. تاریخ‌سازی در جریان است.' : 'Real-time results of clan battles and pro teams at BAZINO. History is being made right now.'}
              </p>
              <div className="flex gap-2">
                {[1,2,3,4,5].map(i => (
                  <div key={i} className={`w-4 h-4 transform rotate-45 ${i === 5 ? 'bg-white/20' : 'bg-[#00d8ff]'}`}></div>
                ))}
              </div>
            </div>
            <div className="space-y-4 flex flex-col justify-center">
              {matchHistory.slice(0, 4).map((match: any, idx: number) => (
                <div key={match.id} className="bg-[#111119] p-4 rounded-lg flex items-center justify-between border border-white/5 hover:border-[#00d8ff]/50 transition-colors group">
                  <div className="flex flex-col w-1/3 text-left">
                    <span className="font-bold text-sm truncate">{match.teamA}</span>
                  </div>
                  <div className="w-1/3 flex justify-center items-center gap-3">
                    <span className={`text-2xl font-black ${match.scoreA > match.scoreB ? 'text-[#00d8ff]' : 'text-white'}`}>{match.scoreA}</span>
                    <span className="text-gray-600 text-sm">-</span>
                    <span className={`text-2xl font-black ${match.scoreB > match.scoreA ? 'text-[#00d8ff]' : 'text-white'}`}>{match.scoreB}</span>
                  </div>
                  <div className="flex flex-col w-1/3 text-right">
                    <span className="font-bold text-sm truncate">{match.teamB}</span>
                  </div>
                  <div className={`absolute left-0 top-0 bottom-0 w-1 ${match.status === 'Live' ? 'bg-[#ff003c] animate-pulse' : 'bg-transparent'}`}></div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* 6. LOUNGE PASSES (RATINGS style but for pricing) */}
        {pricingPackages && pricingPackages.length > 0 && (
          <section className="py-16">
            <h2 className="text-center text-3xl font-black uppercase tracking-[0.2em] mb-16 text-white">
              {language === 'fa' ? 'تعرفه‌های اشتراک' : 'LOUNGE PASSES'}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {pricingPackages.map((pkg: any, i: number) => (
                <div key={pkg.id} className={`bg-[#161622] p-10 flex flex-col items-center justify-center rounded-xl border relative transition-transform hover:-translate-y-2 ${pkg.popular ? 'border-[#00d8ff] shadow-[0_0_30px_rgba(0,216,255,0.15)]' : 'border-white/10'}`}>
                  {pkg.popular && (
                    <div className="absolute top-0 right-0 bg-[#00d8ff] text-black text-[10px] font-black px-4 py-1 rounded-bl-lg uppercase tracking-wider">
                      {language === 'fa' ? 'پیشنهاد ویژه' : 'MOST POPULAR'}
                    </div>
                  )}
                  <h3 className="text-xl font-bold mb-2 uppercase text-center">{getLocText(pkg.title)}</h3>
                  <div className="text-[#00d8ff] font-black text-4xl my-6 flex items-baseline gap-1">
                    {pkg.price.toLocaleString()} <span className="text-sm text-gray-400 font-normal">{language === 'fa' ? 'تومان' : 'IRR'}</span>
                  </div>
                  <span className="text-xs text-gray-400 uppercase tracking-widest text-center mb-8 bg-white/5 px-4 py-2 rounded-full w-full">{getLocText(pkg.duration)}</span>
                  
                  <div className="space-y-4 w-full text-sm font-mono text-gray-300 mb-8 flex-grow">
                    {pkg.features.slice(0,3).map((f: any, idx: number) => (
                      <div key={idx} className="flex items-start gap-2 border-b border-white/5 pb-3">
                        <Sparkles className="w-4 h-4 text-[#00d8ff] shrink-0 mt-0.5" />
                        <span>{getLocText(f)}</span>
                      </div>
                    ))}
                  </div>
                  <button className={`w-full py-3 rounded-sm text-sm font-black tracking-widest uppercase transition-colors ${pkg.popular ? 'bg-[#00d8ff] text-black hover:bg-white' : 'bg-white/10 text-white hover:bg-[#00d8ff] hover:text-black'}`}>
                    {language === 'fa' ? 'خرید پکیج' : 'BUY PASS'}
                  </button>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* 7. COACHES / EXPERTS */}
        {staffTeam && staffTeam.length > 0 && (
          <section className="bg-[#161622] rounded-2xl p-12 relative overflow-hidden border border-white/5">
            <div className="absolute right-0 top-0 opacity-5 w-64 h-64 -mt-10 -mr-10">
              <Trophy className="w-full h-full" />
            </div>
            <div className="flex justify-between items-center mb-12 relative z-10">
               <span className="text-[#00d8ff] text-sm font-black uppercase tracking-widest">{language === 'fa' ? 'اساتید و مربیان' : 'MEET OUR EXPERTS'}</span>
            </div>
            <div className="grid md:grid-cols-3 gap-8 relative z-10">
               {staffTeam.slice(0,3).map((coach: any, idx: number) => (
                 <div key={idx} className="flex gap-4 items-center bg-[#111119] p-6 rounded-xl border border-white/5 hover:border-[#00d8ff]/30 transition-colors">
                   <img loading="lazy" src={coach.imageUrl} alt={getLocText(coach.name)} className="w-20 h-20 rounded-full border-2 border-[#00d8ff] bg-black" />
                   <div>
                     <h4 className="text-xl font-bold">{getLocText(coach.name)}</h4>
                     <p className="text-gray-400 text-xs uppercase tracking-widest mb-2">{getLocText(coach.role)}</p>
                     <div className="flex gap-1">
                        {[1,2,3,4,5].map(i => (
                          <div key={i} className={`w-2 h-2 rounded-full ${i <= 5 ? 'bg-[#00d8ff]' : 'bg-white/20'}`}></div>
                        ))}
                     </div>
                   </div>
                 </div>
               ))}
            </div>
          </section>
        )}

        {/* 8. FAQ */}
        <section className="py-12 max-w-4xl mx-auto">
          <h2 className="text-center text-3xl font-black uppercase tracking-[0.2em] mb-16 text-white">Q&A</h2>
          <div className="grid md:grid-cols-2 gap-x-12 gap-y-12">
            {[
              { num: '01', q: 'رزرو سیستم چطور انجام می‌شود؟', a: 'از طریق پنل کاربری یا اپلیکیشن، بخش، زمان و صندلی خود را انتخاب کرده و آنلاین پرداخت کنید.' },
              { num: '02', q: 'کلوپ چه ساعاتی باز است؟', a: 'بازینو ۲۴ ساعته در ۷ روز هفته آماده میزبانی از شماست. پکیج‌های شبانه از ۱۲ شب تا ۸ صبح فعال هستند.' },
              { num: '03', q: 'کلوپ هواداران چیست؟', a: 'با هر ساعت بازی و هر خرید از کافه، امتیاز دریافت می‌کنید که می‌توانید آنها را به ساعت رایگان یا غذای مجانی تبدیل کنید.' },
              { num: '04', q: 'آیا برای تیم‌ها فضای اختصاصی دارید؟', a: 'بله، اتاق‌های بوت‌کمپ ۵ نفره مخصوص تمرین تیم‌ها با امکانات رفاهی اختصاصی قابل رزرو هستند.' }
            ].map((qa, i) => (
              <div key={i} className="flex gap-6 items-start">
                <div className="w-16 h-16 rounded-full bg-[#161622] border-2 border-[#00d8ff]/30 flex items-center justify-center text-[#00d8ff] text-xl font-black shrink-0 font-mono shadow-[0_0_15px_rgba(0,216,255,0.1)]">
                  {qa.num}
                </div>
                <div>
                  <h4 className="text-lg font-bold mb-3">{qa.q}</h4>
                  <p className="text-gray-400 text-sm leading-relaxed font-mono">{qa.a}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* 9. CONTACT FORM */}
        <section className="max-w-4xl mx-auto py-12">
          <div className="bg-[#161622] p-8 md:p-16 rounded-2xl border border-white/5 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-[#00d8ff]/5 rounded-full blur-3xl"></div>
            <h2 className="text-center text-3xl font-black uppercase tracking-[0.2em] mb-12 relative z-10">
              {language === 'fa' ? 'ارتباط با ما' : 'CONTACT FORM'}
            </h2>
            <div className="relative z-10 space-y-6">
              <div className="flex flex-col md:flex-row gap-6">
                <input type="text" placeholder={language === 'fa' ? 'نام و نام خانوادگی' : 'Full Name'} className="w-full md:w-1/2 bg-[#111119] border border-white/10 rounded-sm px-6 py-4 text-sm focus:outline-none focus:border-[#00d8ff] transition-colors text-white font-mono" />
                <input type="email" placeholder={language === 'fa' ? 'آدرس ایمیل' : 'E-mail Address'} className="w-full md:w-1/2 bg-[#111119] border border-white/10 rounded-sm px-6 py-4 text-sm focus:outline-none focus:border-[#00d8ff] transition-colors text-white font-mono" />
              </div>
              <textarea placeholder={language === 'fa' ? 'پیام شما...' : 'Message...'} rows={6} className="w-full bg-[#111119] border border-white/10 rounded-sm px-6 py-4 text-sm focus:outline-none focus:border-[#00d8ff] transition-colors text-white font-mono resize-none"></textarea>
              <div className="text-center pt-4">
                <button className="bg-[#00d8ff] text-black font-black tracking-[0.2em] px-16 py-4 rounded-sm text-sm hover:bg-white transition-colors uppercase inline-flex items-center gap-3">
                  {language === 'fa' ? 'ارسال پیام' : 'SEND MESSAGE'}
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* 10. OUR CONTACTS & MAP */}
        <section className="py-12 border-t border-white/10 pt-24 pb-12">
          <div className="flex flex-col md:flex-row gap-16 items-center">
            <div className="w-full md:w-1/2 h-[450px] bg-[#161622] rounded-2xl flex items-center justify-center relative overflow-hidden border border-white/5">
               {/* Cyberpunk Map placeholder */}
               <img loading="lazy" src="https://images.unsplash.com/photo-1524661135-423995f22d0b?auto=format&fit=crop&w=800&q=80" alt="Map" className="absolute inset-0 w-full h-full object-cover opacity-30 mix-blend-luminosity filter invert hue-rotate-[180deg]" />
               <div className="absolute inset-0 bg-[#00d8ff]/10 mix-blend-overlay"></div>
               
               {/* Custom Marker */}
               <div className="relative z-10 flex flex-col items-center">
                 <div className="w-16 h-16 bg-[#00d8ff]/20 rounded-full flex items-center justify-center animate-ping absolute"></div>
                 <div className="w-12 h-12 bg-[#111119] border-2 border-[#00d8ff] rounded-full flex items-center justify-center relative shadow-[0_0_20px_#00d8ff]">
                   <MapPin className="w-5 h-5 text-[#00d8ff]" />
                 </div>
                 <div className="mt-4 bg-[#111119] text-[#00d8ff] px-4 py-2 rounded text-xs font-black uppercase tracking-widest border border-[#00d8ff]/30 font-mono shadow-2xl">
                   BAZINO ARENA
                 </div>
               </div>
            </div>
            <div className="w-full md:w-1/2 space-y-10">
              <div>
                <h3 className="text-4xl font-black uppercase tracking-wide mb-4">CONTACT INFO</h3>
                <p className="text-gray-400 text-sm font-mono leading-relaxed max-w-md">
                  {language === 'fa' ? 'برای هماهنگی بوت‌کمپ، رزرو گروهی و یا پشتیبانی با ما در تماس باشید.' : 'Get in touch for clan bootcamps, group reservations, or 24/7 technical support.'}
                </p>
              </div>
              
              <div className="space-y-8">
                <div className="flex items-center gap-6 group">
                  <div className="w-14 h-14 bg-[#161622] border border-[#00d8ff]/20 rounded-xl flex items-center justify-center text-[#00d8ff] group-hover:bg-[#00d8ff] group-hover:text-black transition-colors">
                    <Phone className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 uppercase tracking-widest mb-1 font-bold">PHONE</div>
                    <div className="font-mono text-lg text-white">021-9100XXXX</div>
                  </div>
                </div>
                <div className="flex items-center gap-6 group">
                  <div className="w-14 h-14 bg-[#161622] border border-[#00d8ff]/20 rounded-xl flex items-center justify-center text-[#00d8ff] group-hover:bg-[#00d8ff] group-hover:text-black transition-colors">
                    <MapPin className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 uppercase tracking-widest mb-1 font-bold">LOCATION</div>
                    <div className="font-mono text-base text-white">Tehran, Iran - BAZINO HQ</div>
                  </div>
                </div>
                <div className="flex items-center gap-6 group">
                  <div className="w-14 h-14 bg-[#161622] border border-[#00d8ff]/20 rounded-xl flex items-center justify-center text-[#00d8ff] group-hover:bg-[#00d8ff] group-hover:text-black transition-colors">
                    <Mail className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 uppercase tracking-widest mb-1 font-bold">EMAIL</div>
                    <div className="font-mono text-base text-white">arena@bazino.com</div>
                  </div>
                </div>
              </div>

              <div className="flex gap-4 pt-6">
                <a href="#" className="w-12 h-12 rounded-xl bg-[#161622] border border-white/10 flex items-center justify-center text-gray-400 hover:border-[#00d8ff] hover:text-[#00d8ff] transition-all"><Youtube className="w-5 h-5" /></a>
                <a href="#" className="w-12 h-12 rounded-xl bg-[#161622] border border-white/10 flex items-center justify-center text-gray-400 hover:border-[#00d8ff] hover:text-[#00d8ff] transition-all"><Facebook className="w-5 h-5" /></a>
                <a href="#" className="w-12 h-12 rounded-xl bg-[#161622] border border-white/10 flex items-center justify-center text-gray-400 hover:border-[#00d8ff] hover:text-[#00d8ff] transition-all"><Twitter className="w-5 h-5" /></a>
              </div>
            </div>
          </div>
        </section>

      </div>
    </div>
  );
}
