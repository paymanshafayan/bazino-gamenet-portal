import React, { useState, useEffect, useRef } from 'react';
import { Tournament } from '../types/gamenet';
import { useLanguage } from '../context/LanguageContext';
import { 
  Gamepad2, 
  Tv, 
  Utensils, 
  ShoppingBag, 
  Trophy, ChevronUp, 
  MapPin, 
  Clock, 
  Phone, 
  ChevronLeft, 
  ChevronRight, 
  Sparkles, 
  Compass, 
  Users, 
  ArrowLeft, 
  ArrowRight,
  ShieldAlert,
  Send,
  Instagram,
  Youtube,
  Twitter,
  Calendar,
  Sword,
  Target,
  User,
  Zap,
  Award,
  HelpCircle,
  Mail,
  MessageSquare,
  ChevronDown
} from 'lucide-react';

export default function DarkGoldHome({ 
  featuredGames, 
  gameGenres, 
  matchHistory, 
  pricingPackages, 
  staffTeam, 
  loungeSections,
  faqItems,
  onNavigate, 
  tournaments 
}: any) {
  const { language, dir, t } = useLanguage();
  
  const [activeBanner, setActiveBanner] = useState(0);
  const [activeTournamentSlide, setActiveTournamentSlide] = useState(0);
  const tournamentRefs = useRef<(HTMLDivElement | null)[]>([]);
  const tournamentContainerRef = useRef<HTMLDivElement | null>(null);

  const [activeFaqIndex, setActiveFaqIndex] = useState<number | null>(null);
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactMessage, setContactMessage] = useState('');
  const [contactSubmitting, setContactSubmitting] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveBanner((prev: number) => (prev + 1) % featuredGames.length);
    }, 6000);
    return () => clearInterval(interval);
  }, [featuredGames.length]);

  useEffect(() => {
    if (tournaments.length === 0) return;
    const interval = setInterval(() => {
      setActiveTournamentSlide((prev: number) => (prev + 1) % tournaments.length);
    }, 4500);
    return () => clearInterval(interval);
  }, [tournaments.length]);

  useEffect(() => {
    const container = tournamentContainerRef.current;
    const activeEl = tournamentRefs.current[activeTournamentSlide];
    if (container && activeEl) {
      const containerWidth = container.clientWidth;
      const elementWidth = activeEl.clientWidth;
      const containerRect = container.getBoundingClientRect();
      const elementRect = activeEl.getBoundingClientRect();
      const relativeLeft = elementRect.left - containerRect.left + container.scrollLeft;
      const targetScrollLeft = relativeLeft - (containerWidth / 2) + (elementWidth / 2);
      container.scrollTo({ left: targetScrollLeft, behavior: 'smooth' });
    }
  }, [activeTournamentSlide]);

  const getLocText = (obj: any) => {
    if (!obj) return '';
    if (typeof obj === 'string') return obj;
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

  const getButtonIcon = (target: string) => {
    const normTarget = target === 'reserve' ? 'reservations' : target;
    switch (normTarget) {
      case 'cafe':
        return <Utensils className="w-4 h-4 text-black" />;
      case 'shop':
        return <ShoppingBag className="w-4 h-4 text-black" />;
      case 'tournaments':
        return <Trophy className="w-4 h-4 text-black" />;
      case 'blog':
        return <Compass className="w-4 h-4 text-black" />;
      default:
        return <Sparkles className="w-4 h-4 text-black" />;
    }
  };
  
  const getTournamentImage = (game: string) => {
    const lowercaseGame = game.toLowerCase();
    if (lowercaseGame.includes('cs2') || lowercaseGame.includes('counter') || lowercaseGame.includes('valorant')) {
      return 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=800&q=80';
    }
    if (lowercaseGame.includes('fifa') || lowercaseGame.includes('fc24') || lowercaseGame.includes('football')) {
      return 'https://images.unsplash.com/photo-1606144042614-b2417e99c4e3?auto=format&fit=crop&w=800&q=80';
    }
    if (lowercaseGame.includes('dota') || lowercaseGame.includes('lol') || lowercaseGame.includes('league')) {
      return 'https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&w=800&q=80';
    }
    return 'https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&w=800&q=80';
  };
  
  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactName.trim() || !contactEmail.trim() || !contactMessage.trim()) return;
    setContactSubmitting(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      setContactName('');
      setContactEmail('');
      setContactMessage('');
    } finally {
      setContactSubmitting(false);
    }
  };
  
  const handlePrevTournament = () => {
    setActiveTournamentSlide((prev: number) => (prev - 1 + tournaments.length) % tournaments.length);
  };
  const handleNextTournament = () => {
    setActiveTournamentSlide((prev: number) => (prev + 1) % tournaments.length);
  };

  let themeId = 'dark-gold' as string;

  return (
    <div className="space-y-16 animate-fade-in" dir={dir}>
      
      {/* 1. HERO GAME SLIDER (FULL WIDTH, SLANTED & MOBIRISE GAMINGAMP STYLED) */}
      {themeId === 'geco-purple' ? (
        <section className="relative w-[calc(100%+2rem)] md:w-[calc(100%+4rem)] -mx-4 md:-mx-8 overflow-hidden bg-black shadow-[0_0_50px_rgba(0,0,0,0.8)] aspect-[21/9] min-h-[500px] flex items-center" style={{ clipPath: 'polygon(0 0, 100% 0, 100% 85%, 0% 100%)' }}>
          <img src="https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=1920&q=80" alt="Hero Background" className="absolute inset-0 w-full h-full object-cover opacity-60 mix-blend-luminosity" />
          <div className="absolute inset-0 bg-gradient-to-r from-black via-black/80 to-transparent"></div>
          
          <div className="relative z-10 w-full max-w-7xl mx-auto px-8 py-20 flex flex-col justify-center h-full">
            <div className="max-w-2xl transform -skew-x-12 ml-12">
              <span className="text-primary font-black tracking-widest text-lg uppercase block mb-4 transform skew-x-12">Level Up Your Game</span>
              <h1 className="text-5xl md:text-7xl font-black text-white uppercase leading-[1.1] transform skew-x-12">
                THE HARDER YOU PUSH<br/>
                <span className="text-primary">THE HARDER WE GO</span>
              </h1>
              <p className="text-gray-300 mt-6 text-lg max-w-lg transform skew-x-12">
                {language === 'fa' ? 'پیشرفته‌ترین تجهیزات گیمینگ و حرفه‌ای‌ترین محیط برای مسابقات و تمرین‌های گروهی شما در بازینو.' : 'Experience the most advanced gaming equipment and professional environments for your matches and team practices at Bazino.'}
              </p>
              
              <div className="flex gap-4 mt-8 transform skew-x-12">
                <button onClick={() => onNavigate('reservations')} className="bg-primary text-black px-8 py-4 font-black uppercase text-sm -skew-x-12 hover:bg-white transition-colors border-none">
                  <span className="block skew-x-12">{language === 'fa' ? 'همین حالا رزرو کن' : 'GET STARTED'}</span>
                </button>
              </div>
            </div>
          </div>
        </section>
      ) : themeId === 'cyberpunk-cyan' ? (
        <section className="relative w-[calc(100%+2rem)] md:w-[calc(100%+4rem)] -mx-4 md:-mx-8 overflow-hidden bg-[#070b19] min-h-[650px] flex items-center justify-start border-b-[3px] border-[#00f0ff] shadow-[0_10px_50px_rgba(0,240,255,0.2)]">
          <img src="https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=1920&q=80" alt="Cyberpunk Background" className="absolute inset-0 w-full h-full object-cover opacity-40 mix-blend-luminosity filter contrast-125 brightness-75" />
          
          {/* Cyberpunk Grid Overlay */}
          <div className="absolute inset-0" style={{ backgroundImage: 'linear-gradient(rgba(0, 240, 255, 0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(0, 240, 255, 0.1) 1px, transparent 1px)', backgroundSize: '40px 40px', opacity: '0.2' }}></div>
          <div className="absolute inset-0 bg-gradient-to-r from-[#070b19]/90 via-[#070b19]/60 to-transparent"></div>
          
          <div className="relative z-10 w-full max-w-7xl mx-auto px-8 py-20 flex flex-col items-start border-l-4 border-[#ff003c] pl-8 ml-4 md:ml-8 bg-black/20 backdrop-blur-sm">
            <div className="flex items-center gap-3 mb-4">
              <span className="w-8 h-1 bg-[#00f0ff] animate-pulse"></span>
              <h2 className="text-[#00f0ff] tracking-[0.4em] uppercase text-xs md:text-sm font-black text-shadow-[0_0_10px_#00f0ff]">SYSTEM OVERRIDE</h2>
            </div>
            <h1 className="text-6xl md:text-8xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-400 uppercase leading-[1.1] mb-2 font-display relative">
              <span className="absolute -inset-1 blur-sm bg-gradient-to-r from-[#00f0ff]/50 to-[#ff003c]/50 bg-clip-text text-transparent opacity-50 animate-pulse">NEON FUTURE</span>
              NEON FUTURE
            </h1>
            <h2 className="text-3xl md:text-5xl font-black text-[#ff003c] uppercase leading-tight mb-8 font-display tracking-widest text-shadow-[2px_2px_0px_#00f0ff]">
              {language === 'fa' ? 'سایبرپانک آرنا' : 'CYBERPUNK ARENA'}
            </h2>
            <p className="text-gray-300 max-w-xl text-sm md:text-base border-l border-dashed border-[#00f0ff]/50 pl-4 mb-10 bg-black/40 p-4 font-mono">
              {language === 'fa' ? 'پیشرفته‌ترین تکنولوژی گیمینگ در فضای سایبرپانک. آینده همین الان اینجاست.' : 'The most advanced gaming tech in a cyberpunk environment. The future is now.'}
            </p>
            
            <div className="flex flex-wrap gap-6">
              <button onClick={() => onNavigate('reservations')} className="theme-btn px-10 py-4 bg-[#00f0ff] text-black font-black uppercase text-sm hover:bg-white hover:text-black transition-colors relative group overflow-hidden">
                <span className="relative z-10">{language === 'fa' ? 'شروع هک سیستم' : 'INITIATE PROTOCOL'}</span>
                <div className="absolute inset-0 bg-[#ff003c] transform -translate-x-full group-hover:translate-x-0 transition-transform duration-300 ease-in-out z-0"></div>
                <span className="relative z-10 group-hover:text-white transition-colors duration-300"> {language === 'fa' ? 'شروع هک سیستم' : 'INITIATE PROTOCOL'}</span>
              </button>
            </div>
          </div>
          
          {/* Decorative Elements */}
          <div className="absolute top-10 right-10 flex gap-2 opacity-50">
            <div className="w-2 h-2 bg-[#ff003c] animate-ping"></div>
            <div className="w-2 h-2 bg-[#00f0ff]"></div>
            <div className="w-2 h-2 bg-[#00f0ff]"></div>
          </div>
          <div className="absolute bottom-0 right-10 w-64 h-64 bg-[#00f0ff]/20 blur-[100px] rounded-full"></div>
        </section>
      ) : (
        <section className="relative w-[calc(100%+2rem)] md:w-[calc(100%+4rem)] -mx-4 md:-mx-8 overflow-hidden bg-dark-bg shadow-[0_0_50px_rgba(0,0,0,0.8)] aspect-[21/9] min-h-[340px] group border-b-4 border-primary">
          {featuredGames.map((game: any, idx: number) => (
            <div
              key={game.id}
              className={`absolute inset-0 transition-opacity duration-1000 ${
                idx === activeBanner ? 'opacity-100 z-10' : 'opacity-0 z-0'
              }`}
            >
              <img
                src={game.imageUrl}
                alt={getLocText(game.title)}
                className="w-full h-full object-cover opacity-100 scale-105 group-hover:scale-100 transition-transform duration-[10s] ease-out"
                referrerPolicy="no-referrer"
              />
              {/* Soft Gradient Overlay to keep text readable */}
              <div className="absolute inset-0 bg-gradient-to-r from-dark-bg/85 via-dark-bg/25 to-transparent z-10"></div>
              
              <div className="absolute inset-0 flex items-center">
                <div className="px-6 md:px-16 lg:px-24 w-full max-w-7xl mx-auto transform -translate-y-4">
                  {/* ... Existing hero content ... */}
                  <span className="text-primary font-bold text-xs uppercase tracking-[0.2em] mb-4 block font-display animate-pulse">
                    {language === 'fa' ? 'ویژه فصل' : 'SEASONAL FEATURED'}
                  </span>
                  
                  <h1 className="text-4xl sm:text-5xl md:text-6xl font-black text-white uppercase tracking-tight leading-[1.1] mb-4 max-w-2xl font-display">
                    {getLocText(game.title)}
                  </h1>
                  
                  <p className="text-gray-300 text-sm md:text-base max-w-xl mb-8 leading-relaxed font-medium">
                    {getLocText(game.desc)}
                  </p>
                  
                  <div className="flex flex-wrap gap-3 mt-2">
                    <button
                      onClick={() => {
                        const targetRoute = game.target === 'reserve' ? 'reservations' : (game.target || 'reservations');
                        onNavigate(targetRoute);
                      }}
                      className="btn btn-primary-outline display-4 flex items-center gap-2 notched-clip-sm"
                    >
                      {getButtonIcon(game.target || 'reserve')}
                      <span>
                        {getButtonText(game.target || 'reserve')[language] || getButtonText(game.target || 'reserve')['en']}
                      </span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}

          {/* Slider Controls */}
          <div className="absolute bottom-6 right-6 md:right-16 lg:right-24 z-20 flex gap-2">
            {featuredGames.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setActiveBanner(idx)}
                className={`h-1.5 transition-all duration-300 notched-clip-sm ${
                  idx === activeBanner ? 'w-8 bg-primary shadow-[0_0_10px_rgba(255,184,0,0.8)]' : 'w-4 bg-white/30 hover:bg-white/50'
                }`}
                aria-label={`Go to slide ${idx + 1}`}
              />
            ))}
          </div>
        </section>
      )}

      {/* 2. CHOOSE YOUR STORY / GAME GENRES (NEW SIGNATURE MOBIRISE SECTION) */}
      <section className="space-y-8">
        <div className={`flex flex-col gap-2 ${themeId === 'cyberpunk-cyan' ? 'items-center text-center' : ''}`}>
          <span className="text-primary font-bold text-xs uppercase tracking-widest block font-display neon-text-glow">
            {themeId === 'cyberpunk-cyan' ? 'GAMESITE TEMPLATE' : (language === 'fa' ? 'انتخاب داستان شما' : 'CHOOSE YOUR STORY')}
          </span>
          <h2 className="text-3xl md:text-4xl font-black text-white uppercase font-display tracking-tight">
            {themeId === 'cyberpunk-cyan' ? 'IN THE SPOTLIGHT' : (language === 'fa' ? 'ژانرها و محبوب‌ترین‌ها' : 'GAME GENRES')}
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {gameGenres.map((genre) => (
              <div
                key={genre.id}
                className="group relative h-96 overflow-hidden notched-clip border border-white/10 hover:border-primary hover:shadow-[0_0_30px_rgba(27,194,202,0.2)] bg-dark-card transition-all duration-300"
              >
                {/* Image banner */}
                <img
                  src={genre.imageUrl}
                  alt={getLocText(genre.title)}
                  className="w-full h-full object-cover opacity-60 group-hover:scale-110 group-hover:opacity-80 transition-all duration-500"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent z-10" />

                {/* Tag header */}
                <div className="absolute top-4 left-4 z-20">
                  <span className="px-3 py-1 text-[10px] font-black tracking-wider bg-black/80 text-primary border border-primary/40 notched-clip-sm font-mono shadow-md">
                    {genre.tag}
                  </span>
                </div>

                {/* Content */}
                <div className="absolute inset-x-0 bottom-0 p-6 z-20 flex flex-col justify-end">
                  <h3 className="text-xl font-black text-white font-display uppercase tracking-wider group-hover:text-primary transition-colors">
                    {getLocText(genre.title)}
                  </h3>
                  
                  <div className="mt-3 flex items-center justify-between text-xs text-gray-300">
                    <span className="font-bold flex items-center gap-1.5 opacity-80">
                      <Gamepad2 className="w-3.5 h-3.5" />
                      {genre.games}
                    </span>
                  </div>

                  <button
                    onClick={() => onNavigate('reservations')}
                    className="mt-4 w-full py-2.5 bg-primary/20 hover:bg-primary text-primary hover:text-black font-black text-xs border border-primary/40 hover:border-primary transition-all duration-200 cursor-pointer flex items-center justify-center gap-1 notched-clip-sm"
                  >
                    <span>{language === 'fa' ? 'مشاهده رزروها' : 'Launch Session'}</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        
      </section>

      {/* 3. LOUNGE SECTIONS INTRO (SLANTED CYBER FRAMING) */}
      <section className="space-y-8">
        <div className="flex flex-col gap-2">
          <span className="text-primary font-bold text-xs uppercase tracking-widest block font-display neon-text-glow">
            {language === 'fa' ? 'سالن‌ها و سرویس‌های ویژه' : 'PREMIUM SERVICES'}
          </span>
          <h2 className="text-3xl font-black text-white flex items-center gap-3 font-display uppercase tracking-tight">
            <span className="w-3 h-8 bg-primary rounded-none shadow-[0_0_15px_rgba(27,194,202,0.8)]"></span>
            <span>
              {language === 'fa' && 'کلوپ‌های تخصصی و خدمات بازینو'}
              {language === 'en' && 'BAZINO Elite Zones & Services'}
              {language === 'ru' && 'Премиум-залы и услуги BAZINO'}
              {language === 'tr' && 'BAZINO Seçkin Hizmetleri'}
            </span>
          </h2>
          <p className="text-gray-400 text-sm max-w-2xl font-medium">
            {language === 'fa' && 'مجموعه ما با ادغام پیشرفته‌ترین سخت‌افزارها، بوفه هوشمند لحظه‌ای و فروشگاه تجهیزات، بی‌نظیرترین کلوپ بازی منطقه است.'}
            {language === 'en' && 'Explore our integrated ecosystem of state-of-the-art gaming zones, real-time buffet ordering, and accessories shop.'}
          </p>
        </div>

        {/* 4-Column Bento Grid with Angled Borders */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {loungeSections.map((sect, idx) => (
            <div
              key={idx}
              className="group theme-box border border-white/10 hover:border-primary bg-dark-card flex flex-col justify-between hover:shadow-[0_0_30px_rgba(27,194,202,0.15)] hover:-translate-y-1 transition-all duration-300 relative"
            >
              {/* Card Image */}
              <div className="relative aspect-[16/10] w-full bg-dark-bg overflow-hidden border-b border-white/10 shrink-0">
                <img
                  src={sect.imageUrl}
                  alt={getLocText(sect.title)}
                  className="w-full h-full object-cover group-hover:scale-105 opacity-75 group-hover:opacity-90 transition-all duration-500"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-transparent to-transparent" />
                
                {/* Floating circular gold badge overlapping slightly at the bottom-right */}
                <div className="absolute bottom-0 right-4 translate-y-1/2 w-10 h-10 rounded-full bg-black border-2 border-primary flex items-center justify-center z-10 shadow-[0_0_12px_rgba(255,184,0,0.6)]">
                  {sect.icon}
                </div>
              </div>

              {/* Card Body */}
              <div className="p-5 pt-7 flex-1 flex flex-col justify-between gap-4">
                <div className="space-y-2">
                  <h3 className="text-sm font-black text-primary leading-snug font-display uppercase">
                    {getLocText(sect.title)}
                  </h3>
                  <p className="text-gray-300 text-xs leading-relaxed font-semibold">
                    {getLocText(sect.desc)}
                  </p>
                </div>

                <button
                  onClick={() => onNavigate(sect.id === 'consoles' ? 'reservations' : (sect.id as any))}
                  className="w-full py-2.5 btn btn-primary-outline display-4 text-[11px] flex items-center justify-center gap-1.5 theme-btn"
                >
                  <span>{getLocText(sect.btnText)}</span>
                  {dir === 'rtl' ? <ArrowLeft className="w-3.5 h-3.5 group-hover:translate-x-[-3px] transition-transform" /> : <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-[3px] transition-transform" />}
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 4. MATCH RESULTS BOARD (NEW SIGNATURE MOBIRISE SECTION) */}
      <section className="space-y-8">
        <div className="flex flex-col gap-2">
          <span className="text-primary font-bold text-xs uppercase tracking-widest block font-display neon-text-glow">
            {language === 'fa' ? 'نتایج نبردهای سایبری کلوپ' : 'LIVE ARENA MATCHBOARD'}
          </span>
          <h2 className="text-3xl font-black text-white flex items-center gap-3 font-display uppercase tracking-tight">
            <span className="w-3 h-8 bg-primary rounded-none shadow-[0_0_15px_rgba(27,194,202,0.8)]"></span>
            <span>
              {language === 'fa' && 'جدول زنده مسابقات و نبردها'}
              {language === 'en' && 'Live Matches & Tournament Scoreboard'}
              {language === 'ru' && 'Табло матчей и результатов'}
              {language === 'tr' && 'Canlı Maçlar ve Turnuva Skorbordu'}
            </span>
          </h2>
          <p className="text-gray-400 text-sm max-w-2xl font-medium">
            {language === 'fa' && 'مستندات نبردهای داغ کلن‌های کلوپ بازینو. بازی‌ها را زنده دنبال کنید یا رقیب بطلبید!'}
            {language === 'en' && 'Track live scores, scheduled challenges, and finished esports clashes of our local gaming guilds.'}
          </p>
        </div>

        {/* Scoreboard table / list */}
        <div className="bg-dark-card border border-white/10 rounded-2xl overflow-hidden shadow-xl">
          <div className="p-5 border-b border-white/10 bg-dark-card flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sword className="w-5 h-5 text-primary" />
              <span className="text-xs font-bold font-display uppercase text-white">
                {language === 'fa' ? 'جدول زنده مسابقات و نبردها' : 'Esports Live Matchboard'}
              </span>
            </div>
            <div className="flex items-center gap-1.5 bg-primary/10 border border-primary/20 text-primary px-2.5 py-0.5 rounded-lg text-[9px] font-mono font-bold uppercase">
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></span>
              <span>Lobby Connected</span>
            </div>
          </div>

          <div className="divide-y divide-white/5" dir={dir}>
            {matchHistory.map((match) => (
              <div key={match.id} className="p-5 flex flex-row items-center justify-between gap-4 hover:bg-[#141624]/40 transition-all duration-200">
                {/* 1. Right Side (RTL): Title & Game Badge */}
                <div className="flex items-center gap-3 w-1/3 justify-start">
                  <span className="px-2.5 py-1 bg-black text-primary font-mono font-bold text-[9px] border border-primary/30 rounded-md shrink-0">
                    {match.game}
                  </span>
                  <div className="text-right">
                    <h4 className="text-xs font-bold text-white font-display line-clamp-1">{getLocText(match.title)}</h4>
                    <span className="text-[9px] text-gray-500 font-bold">{match.time}</span>
                  </div>
                </div>

                {/* 2. Center: Teams & Score (Futuristic Pill Box) */}
                <div className="flex items-center justify-center gap-5 py-2 px-5 bg-black/40 border border-white/5 rounded-2xl w-auto">
                  <span className="text-xs font-black text-white">{match.teamA}</span>
                  <div className="flex items-center gap-2 font-display text-xs font-black px-3.5 py-1 bg-black/80 text-primary border border-primary/20 rounded-lg">
                    <span className={match.status === 'Scheduled' ? 'text-gray-600' : 'text-white'}>{match.scoreA}</span>
                    <span className="text-gray-500 text-xs">:</span>
                    <span className={match.status === 'Scheduled' ? 'text-gray-600' : 'text-white'}>{match.scoreB}</span>
                  </div>
                  <span className="text-xs font-black text-white">{match.teamB}</span>
                </div>

                {/* 3. Left Side (RTL): Action & Status badge */}
                <div className="flex items-center gap-3 w-1/3 justify-end">
                  {match.status === 'Live' && (
                    <span className="flex items-center gap-1.5 px-3 py-1 bg-red-500/10 border border-red-500/30 text-red-500 text-[9px] font-black uppercase rounded-md">
                      <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-ping"></span>
                      <span>{language === 'fa' ? 'در حال پخش زنده' : 'LIVE'}</span>
                    </span>
                  )}
                  {match.status === 'Finished' && (
                    <span className="px-3 py-1 bg-gray-500/10 border border-gray-500/30 text-gray-400 text-[9px] font-black uppercase rounded-md">
                      {language === 'fa' ? 'پایان یافته' : 'Finished'}
                    </span>
                  )}
                  {match.status === 'Scheduled' && (
                    <span className="px-3 py-1 bg-amber-500/10 border border-amber-500/30 text-amber-500 text-[9px] font-black uppercase rounded-md">
                      {language === 'fa' ? 'برنامه‌ریزی شده' : 'Scheduled'}
                    </span>
                  )}
                  <button 
                    onClick={() => onNavigate('tournaments')}
                    className="p-1.5 bg-white/5 hover:bg-primary hover:text-black border border-white/10 hover:border-primary rounded-full transition-all shrink-0 cursor-pointer"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 5. TOURNAMENTS CAROUSEL (SLANTED DESIGN) */}
      <section className="space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex flex-col gap-1.5">
            <span className="text-primary font-bold text-xs uppercase tracking-widest block font-display neon-text-glow">
              {language === 'fa' ? 'مسابقات بزرگ قهرمانی' : 'CHAMPIONSHIP BRACKETS'}
            </span>
            <h2 className="text-3xl font-black text-white flex items-center gap-3 font-display uppercase tracking-tight">
              <span className="w-3 h-8 bg-primary rounded-none shadow-[0_0_15px_rgba(27,194,202,0.8)]"></span>
              <span>
                {language === 'fa' && 'تورنمنت‌های فعال و ثبت‌نام سریع'}
                {language === 'en' && 'Active Tournaments & Fast Brackets'}
                {language === 'ru' && 'Активные турниры и регистрация'}
                {language === 'tr' && 'Aktif Turnuvalar ve Hızlı Kayıt'}
              </span>
            </h2>
            <p className="text-gray-400 text-sm max-w-2xl font-medium">
              {language === 'fa' && 'همراه تیمی خود ثبت‌نام کنید، حریفان را در براکت‌های آنلاین حذف کنید و جوایز نقدی کلوپ وفاداری را از آن خود سازید.'}
              {language === 'en' && 'Challenge elite local squads, win massive cash prize pools and bonus loyalty rewards, and climb to legendary status.'}
            </p>
          </div>

          {/* Nav Controls */}
          <div className="flex items-center gap-2 self-start sm:self-auto bg-black/60 border border-white/10 p-1.5 rounded-full">
            <button
              onClick={handlePrevTournament}
              className="p-2 hover:bg-primary hover:text-black text-gray-400 rounded-full transition-all cursor-pointer"
            >
              {dir === 'rtl' ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            </button>
            <span className="text-[10px] font-mono font-bold px-3 text-gray-400 border-x border-white/10">
              {tournaments.length > 0 ? `${activeTournamentSlide + 1} / ${tournaments.length}` : '0 / 0'}
            </span>
            <button
              onClick={handleNextTournament}
              className="p-2 hover:bg-primary hover:text-black text-gray-400 rounded-full transition-all cursor-pointer"
            >
              {dir === 'rtl' ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Sliding Tournament cards */}
        {tournaments.length === 0 ? (
          <div className="p-8 text-center bg-dark-card rounded-2xl border border-white/10 text-gray-500 text-sm font-sans">
            {language === 'fa' && 'تورنمنت فعالی وجود ندارد.'}
            {language === 'en' && 'No active tournaments found.'}
          </div>
        ) : (
          <div ref={tournamentContainerRef} className="flex gap-6 overflow-x-auto scrollbar-none py-4 snap-x snap-mandatory scroll-smooth w-full">
            {tournaments.map((tournament, idx) => {
              if (!tournament) return null;

              return (
                <div
                  ref={(el) => { tournamentRefs.current[idx] = el; }}
                  key={tournament.id}
                  className="w-full md:w-[calc(50%-12px)] lg:w-[calc(33.333%-16px)] shrink-0 snap-center rounded-2xl border border-white/10 bg-dark-card overflow-hidden flex flex-col justify-between group hover:border-primary hover:shadow-[0_0_25px_rgba(27,194,202,0.15)] transition-all duration-300"
                >
                  {/* Image and status badge */}
                  <div className="relative aspect-[16/10] w-full bg-dark-bg overflow-hidden rounded-t-2xl">
                    <img
                      src={getTournamentImage(tournament.game)}
                      alt={tournament.title}
                      className="w-full h-full object-cover opacity-70 group-hover:scale-105 transition-all duration-500"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent" />
                    
                    {/* Status badge */}
                    <span className={`absolute top-4 right-4 px-3 py-1 text-[10px] font-black border rounded-md backdrop-blur-sm ${
                      tournament.status === 'Active'
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                        : tournament.status === 'Upcoming'
                        ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                        : 'bg-gray-500/10 border-gray-500/30 text-gray-400'
                    }`}>
                      {tournament.status === 'Active' && (language === 'fa' ? 'در حال برگزاری' : language === 'en' ? 'Active' : language === 'ru' ? 'Идет' : 'Devam Ediyor')}
                      {tournament.status === 'Upcoming' && (language === 'fa' ? 'ثبت‌نام باز است' : language === 'en' ? 'Upcoming' : language === 'ru' ? 'Скоро' : 'Yaklaşan')}
                      {tournament.status === 'Completed' && (language === 'fa' ? 'پایان یافته' : language === 'en' ? 'Completed' : language === 'ru' ? 'Завершен' : 'Tamamlandı')}
                    </span>

                    {/* Game badge */}
                    <span className="absolute bottom-4 right-4 px-3 py-1 bg-black/80 border border-white/10 text-white text-[9px] font-mono font-bold rounded-md">
                      {tournament.game}
                    </span>
                  </div>

                  {/* Body info */}
                  <div className="p-5 flex-1 flex flex-col justify-between gap-5">
                    <div className="space-y-3">
                      <h3 className="text-sm font-black text-white leading-snug line-clamp-1 group-hover:text-primary transition-colors font-display">
                        {tournament.title}
                      </h3>
                      
                      <div className="grid grid-cols-2 gap-3 text-[10px] border-y border-white/5 py-3 font-medium text-gray-400">
                        <div className="space-y-1">
                          <span className="block text-gray-500 text-[9px] font-bold">
                            {language === 'fa' && 'هزینه ثبت‌نام تیم'}
                            {language === 'en' && 'Team Entry Fee'}
                            {language === 'ru' && 'Взнос с команды'}
                            {language === 'tr' && 'Giriş Ücreti'}
                          </span>
                          <span className="font-mono text-primary font-black text-xs">
                            {tournament.registrationFee.toLocaleString()} {language === 'fa' ? 'تومان' : 'Tümen'}
                          </span>
                        </div>
                        <div className="space-y-1">
                          <span className="block text-gray-500 text-[9px] font-bold">
                            {language === 'fa' && 'ظرفیت ثبت‌نام'}
                            {language === 'en' && 'Capacity Status'}
                            {language === 'ru' && 'Зарегистрировано'}
                            {language === 'tr' && 'Kapasite'}
                          </span>
                          <span className="font-mono font-bold text-white text-xs">
                            {tournament.registeredTeamsCount} / {tournament.maxTeams} {language === 'fa' ? 'تیم' : 'Teams'}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 text-[10px] text-gray-400 font-medium">
                        <Calendar className="w-3.5 h-3.5 text-primary" />
                        <span>
                          {language === 'fa' && `تاریخ شروع: ${tournament.startDate}`}
                          {language === 'en' && `Start Date: ${tournament.startDate}`}
                          {language === 'ru' && `Старт: ${tournament.startDate}`}
                          {language === 'tr' && `Başlangıç: ${tournament.startDate}`}
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={() => onNavigate('tournaments')}
                      className="w-full py-2.5 btn btn-primary-outline display-4 text-[11px] flex items-center justify-center gap-1.5 theme-btn"
                    >
                      <span>
                        {language === 'fa' && 'مشاهده جدول مسابقات و ثبت‌نام'}
                        {language === 'en' && 'View Bracket & Register'}
                        {language === 'ru' && 'Сетка и регистрация'}
                        {language === 'tr' && 'Fikstürü Gör ve Kaydol'}
                      </span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        
        )}
      </section>

      {/* 6. LOUNGE PASSES & PRICING PLANS (NEW SIGNATURE MOBIRISE SECTION) */}
      <section className="space-y-8">
        <div className="flex flex-col gap-2 text-center items-center">
          <span className="text-primary font-bold text-xs uppercase tracking-widest block font-display neon-text-glow">
            {language === 'fa' ? 'پیشنهادهای ویژه ساعات بازی' : 'CHOOSE YOUR ARENA PASS'}
          </span>
          <h2 className="text-3xl font-black text-white flex items-center gap-3 justify-center font-display uppercase tracking-tight">
            <span>
              {language === 'fa' && 'بسته‌های زمانی و کارتهای عضویت'}
              {language === 'en' && 'Lounge passes & Pricing Tickets'}
              {language === 'ru' && 'Абонементы и цены'}
              {language === 'tr' && 'Oyun Paketleri ve Fiyatlandırma'}
            </span>
          </h2>
          <p className="text-gray-400 text-sm max-w-xl font-medium">
            {language === 'fa' && 'با خرید پکیج‌های بهینه، تا ۵۰ درصد هزینه بر ساعت بازی خود را کاهش دهید و ردبول رایگان و امتیاز کلوپ وفاداری جایزه بگیرید.'}
            {language === 'en' && 'Get up to 50% discount per hour by choosing our high-value passes packed with energy drinks and loyalty boosters.'}
          </p>
        </div>

        
{/* Pricing Layouts */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-stretch mb-20">
            {pricingPackages.map((pack) => (
              <div key={pack.id} className={`theme-box border flex flex-col justify-between bg-dark-card transition-all duration-300 ${pack.popular ? 'border-primary shadow-[0_0_30px_rgba(27,194,202,0.15)] -translate-y-2 relative' : 'border-white/10 hover:border-white/20'}`}>
                {pack.popular && (
                  <span className="absolute top-4 right-4 bg-primary text-black font-black text-[9px] px-3 py-1 theme-btn uppercase tracking-widest font-display animate-pulse">
                    {language === 'fa' ? 'محبوب‌ترین پیشنهاد' : 'RECOMMENDED'}
                  </span>
                )}
                
                <div className="p-6 border-b border-white/15 bg-dark-card">
                  <h3 className="text-md font-black text-white font-display uppercase">{getLocText(pack.title)}</h3>
                  <p className="text-gray-400 text-xs mt-1.5 font-bold">{getLocText(pack.duration)}</p>
                  <div className="mt-4 flex items-baseline gap-1">
                    <span className="text-3xl font-black text-primary font-mono">{pack.price.toLocaleString()}</span>
                    <span className="text-xs text-gray-500 font-bold">{language === 'fa' ? 'تومان' : 'Tümen'}</span>
                  </div>
                </div>
                <div className="p-6 flex-1 flex flex-col gap-4">
                  <ul className="space-y-3.5 flex-1">
                    {pack.features.map((feature, fIdx) => (
                      <li key={fIdx} className="flex items-start gap-2.5 text-xs font-semibold text-gray-300">
                        <Zap className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                        <span>{getLocText(feature as any)}</span>
                      </li>
                    ))}
                  </ul>
                  <button onClick={() => onNavigate('reservations')} className="w-full py-3 btn btn-primary-outline display-4 text-[11px] flex items-center justify-center theme-btn">
                    {language === 'fa' ? 'شارژ حساب و خرید پکیج' : 'Purchase Pass Ticket'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        
      </section>

      {/* 8. FAQ & CONTACT US FORM */}
      <section className="pt-4">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
            {/* FAQ - 7 Cols */}
            <div className="lg:col-span-7 space-y-6">
              <div className="flex flex-col gap-2 mb-8">
                <span className="text-primary font-bold text-xs uppercase tracking-widest block font-display neon-text-glow">
                  {language === 'fa' ? 'سوالات شما' : 'QUESTIONS'}
                </span>
                <h2 className="text-3xl md:text-4xl font-black text-white uppercase font-display tracking-tight">
                  {language === 'fa' ? 'سوالات متداول (FAQ)' : 'FREQUENTLY ASKED'}
                </h2>
              </div>

              <div className="space-y-4">
                {faqItems.map((faq, idx) => (
                  <div
                    key={idx}
                    className={`border border-white/10 bg-dark-card notched-clip overflow-hidden transition-all duration-300 ${
                      activeFaqIndex === idx ? 'border-primary shadow-[0_0_20px_rgba(27,194,202,0.1)]' : 'hover:border-white/20'
                    }`}
                  >
                    <button
                      onClick={() => setActiveFaqIndex(activeFaqIndex === idx ? null : idx)}
                      className="w-full px-6 py-5 flex items-center justify-between text-left cursor-pointer outline-none group"
                    >
                      <span className={`font-bold text-sm md:text-base pr-4 ${activeFaqIndex === idx ? 'text-primary' : 'text-gray-200 group-hover:text-white'}`}>
                        {getLocText(faq.question)}
                      </span>
                      {activeFaqIndex === idx ? (
                        <ChevronUp className="w-5 h-5 text-primary shrink-0" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-gray-500 group-hover:text-gray-300 shrink-0" />
                      
                      )}
                      </button>
                    
                    <div
                      className={`px-6 overflow-hidden transition-all duration-300 ease-in-out ${
                        activeFaqIndex === idx ? 'max-h-96 pb-6 opacity-100' : 'max-h-0 opacity-0'
                      }`}
                    >
                      <p className="text-gray-400 text-sm leading-relaxed border-t border-white/5 pt-4">
                        {getLocText(faq.answer)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Contact Form - 5 Cols */}
            <div className="lg:col-span-5 relative">
              <div className="absolute -inset-4 bg-primary/5 blur-3xl -z-10 rounded-full"></div>
              <div className="bg-dark-card border border-primary/20 notched-clip p-6 md:p-8 sticky top-24 shadow-[0_0_40px_rgba(27,194,202,0.1)]">
                <div className="flex flex-col gap-2 mb-6">
                  <h3 className="text-2xl font-black text-white uppercase font-display">
                    {language === 'fa' ? 'ارتباط مستقیم' : 'TRANSMIT SIGNAL'}
                  </h3>
                  <p className="text-gray-400 text-xs">
                    {language === 'fa' ? 'پشتیبانی ۲۴ ساعته کلوپ' : '24/7 priority support for club members'}
                  </p>
                </div>

                <form onSubmit={handleContactSubmit} className="space-y-4 relative z-10">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider px-1">
                      {language === 'fa' ? 'نام شما' : 'IDENTIFICATION'}
                    </label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                      <input
                        type="text"
                        required
                        className="w-full bg-dark-bg border border-white/10 notched-clip-sm pl-10 pr-4 py-3 text-sm text-white focus:outline-none focus:border-primary transition-colors"
                        placeholder={language === 'fa' ? 'نام و نام خانوادگی' : 'Player Name'}
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider px-1">
                      {language === 'fa' ? 'اطلاعات تماس' : 'COMMLINK'}
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                      <input
                        type="text"
                        required
                        className="w-full bg-dark-bg border border-white/10 notched-clip-sm pl-10 pr-4 py-3 text-sm text-white focus:outline-none focus:border-primary transition-colors"
                        placeholder={language === 'fa' ? 'ایمیل یا شماره تماس' : 'Email or Phone'}
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider px-1">
                      {language === 'fa' ? 'متن پیام' : 'MESSAGE PAYLOAD'}
                    </label>
                    <textarea
                      required
                      rows={4}
                      className="w-full bg-dark-bg border border-white/10 notched-clip-sm px-4 py-3 text-sm text-white focus:outline-none focus:border-primary transition-colors resize-none"
                      placeholder={language === 'fa' ? 'چگونه می‌توانیم کمک کنیم؟' : 'How can we assist you?'}
                    ></textarea>
                  </div>

                  <button
                    type="submit"
                    disabled={contactSubmitting}
                    className="w-full py-3 btn btn-primary-outline display-4 flex items-center justify-center gap-2 notched-clip-sm mt-2"
                  >
                    {contactSubmitting ? (
                      <>
                        <span className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></span>
                        <span>{language === 'fa' ? 'در حال ارسال پیام...' : 'TRANSMITTING...'}</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        <span>{language === 'fa' ? 'ارسال تیکت' : 'SEND TRANSMISSION'}</span>
                      </>
                      )}
                      </button>
                </form>
              </div>
            </div>
          </div>
        
      </section>

      {/* 9. ADDRESS, CONSOLE TICKETING & DARK-THEMED OSM LOCATION MAP */}
      <section className="w-[calc(100%+2rem)] md:w-[calc(100%+4rem)] -mx-4 md:-mx-8 bg-dark-card px-6 md:px-16 lg:px-24 xl:px-32 py-12 md:py-16 border-t-4 border-primary rounded-none shadow-[0_-10px_50px_rgba(0,0,0,0.3)]">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          
          {/* Text block / Contact */}
          <div className="lg:col-span-5 space-y-6">
            <div className="space-y-2">
              <span className="px-3.5 py-1 bg-primary/20 border border-primary text-primary rounded-md text-[10px] font-black uppercase font-mono tracking-widest neon-text-glow">
                BAZINO HQ Command
              </span>
              <h2 className="text-xl sm:text-2xl lg:text-3xl font-black text-white font-display uppercase tracking-tight">
                {language === 'fa' && 'نشانی و راه‌های ارتباطی با ما'}
                {language === 'en' && 'Our Location & Contact Command'}
                {language === 'ru' && 'Где мы находимся и контакты'}
                {language === 'tr' && 'Ulaşım ve İletişim Hattımız'}
              </h2>
              <p className="text-gray-400 text-xs sm:text-sm leading-relaxed font-semibold">
                {language === 'fa' && 'بازینو مکانی ایده‌آل برای گردهمایی گیمرهای حرفه‌ای و برگزاری پرشورترین تورنمنت‌ها با تجهیزاتی کلاس جهانی است.'}
                {language === 'en' && 'Visit our high-tech lounge anytime to play with absolute low latency, order premium snacks straight to your desk, and enjoy absolute comfort.'}
              </p>
            </div>

            {/* List details */}
            <div className="space-y-4 text-xs font-semibold text-gray-300">
              <div className="flex items-start gap-3 bg-dark-card/80 border border-white/10 p-4 rounded-xl shadow-[0_0_15px_rgba(0,0,0,0.2)]">
                <MapPin className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <span className="block font-bold text-gray-500 text-[10px] uppercase font-mono">
                    {language === 'fa' && 'نشانی فیزیکی کلوپ'}
                    {language === 'en' && 'Lounge Location'}
                  </span>
                  <p className="leading-relaxed text-xs font-semibold">
                    {language === 'fa' && 'تهران، اتوبان صدر، خیابان شریعتی، بن‌بست پلاک ۲۴، مجتمع تجاری بازینو، طبقه منفی ۱'}
                    {language === 'en' && 'Level -1, BAZINO Plaza, No. 24, Shariati St., Sadr Hwy, Tehran, Iran'}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex items-center gap-3 bg-dark-card/80 border border-white/10 p-4 rounded-xl shadow-[0_0_15px_rgba(0,0,0,0.2)]">
                  <Clock className="w-5 h-5 text-primary shrink-0" />
                  <div className="space-y-1">
                    <span className="block font-bold text-gray-500 text-[10px] uppercase font-mono">
                      {language === 'fa' && 'ساعت‌های عملیاتی'}
                      {language === 'en' && 'Operational Hours'}
                    </span>
                    <span className="text-white text-xs font-black">
                      {language === 'fa' && '۲۴ ساعته شبانه‌روز (۷ روز هفته)'}
                      {language === 'en' && 'Open 24/7 (Non-stop)'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3 bg-dark-card/80 border border-white/10 p-4 rounded-xl shadow-[0_0_15px_rgba(0,0,0,0.2)]">
                  <Phone className="w-5 h-5 text-primary shrink-0" />
                  <div className="space-y-1">
                    <span className="block font-bold text-gray-500 text-[10px] uppercase font-mono">
                      {language === 'fa' && 'شماره تماس پشتیبانی'}
                      {language === 'en' && 'Support Phone Line'}
                    </span>
                    <span className="text-white font-mono text-xs font-black" style={{ direction: 'ltr' }}>
                      ۰۲۱-۲۲۴۴۶۶۸۸
                    </span>
                  </div>
                </div>
              </div>
            </div>

          </div>

          {/* Interactive OSM Map (CYBERPUNK INVERT FILTER) */}
          <div className="lg:col-span-7 h-[320px] md:h-[370px] w-full rounded-2xl border border-white/10 relative bg-dark-bg group overflow-hidden">
            {/* Map border glowing */}
            <div className="absolute inset-0 border border-primary/20 pointer-events-none z-10 rounded-2xl" />
            
            <iframe
              title="Bazino Lounge Location Map"
              src="https://www.openstreetmap.org/export/embed.html?bbox=51.4285%2C35.7760%2C51.4395%2C35.7860&amp;layer=mapnik&amp;marker=35.7810%2C51.4340"
              className="w-full h-full border-0 rounded-2xl"
              style={{
                filter: 'invert(93%) hue-rotate(185deg) brightness(90%) contrast(100%)',
                opacity: 0.8
              }}
              loading="lazy"
            />

            {/* Custom overlay tracker */}
            <div className="absolute top-4 right-4 bg-black border border-primary/40 px-3 py-1.5 text-[9px] font-black text-primary flex items-center gap-1.5 backdrop-blur-sm pointer-events-none uppercase font-mono shadow-md rounded-md">
              <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
              <span>GPS Tracking: Live Lock</span>
            </div>
            
            <div className="absolute bottom-4 left-4 bg-black/90 border border-white/10 px-3 py-1.5 text-[9px] font-medium text-gray-400 flex items-center gap-1.5 backdrop-blur-sm pointer-events-none shadow-md font-mono rounded-md">
              <span>Lat: 35.7810° N | Lon: 51.4340° E</span>
            </div>
          </div>

        </div>
      </section>
    </div>
  );
}
