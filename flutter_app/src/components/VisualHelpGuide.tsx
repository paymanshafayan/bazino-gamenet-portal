import React, { useState, useEffect } from 'react';
import { 
  X, 
  HelpCircle, 
  ArrowLeft, 
  ArrowRight, 
  Sparkles, 
  Monitor, 
  ShieldCheck, 
  Cpu, 
  Clock, 
  DollarSign, 
  Coffee, 
  ShoppingBag, 
  Trophy, 
  CheckCircle, 
  Database, 
  Sliders, 
  Zap, 
  Info, 
  Download, 
  MessageSquare, 
  Activity, 
  Wifi, 
  Key, 
  BookOpen,
  MousePointerClick
} from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  mode: 'admin' | 'gamenet';
  initialSection?: string;
  language: 'fa' | 'en' | 'ru' | 'tr';
  dir: 'rtl' | 'ltr';
}

export default function VisualHelpGuide({ isOpen, onClose, mode, initialSection, language, dir }: Props) {
  const [activeStep, setActiveStep] = useState(0);
  const [selectedHotspot, setSelectedHotspot] = useState<string | null>(null);

  const isFa = language === 'fa';

  // Define full onboarding slides for Admin Mode
  const adminSlides = [
    {
      title: isFa ? '۱. داشبورد و رصدخانه مرکزی' : '1. Central Command Dashboard',
      subtitle: isFa ? 'مدیریت زنده درآمد، کاربران فعال و پینگ سالن' : 'Real-time monitoring of revenue, active players and salon latency',
      description: isFa 
        ? 'در این بخش آمار مالی، تعداد تراکنش‌ها و نمودارهای توزیع کاربران در ۲۴ ساعت گذشته نمایش داده می‌شود. پینگ لحظه‌ای ارتباط سرور با نودهای کلاینت در اینجا رصد می‌گردد.'
        : 'Displays financial statistics, transaction counts and gamer distribution charts over the last 24 hours. Monitor direct server latency with client nodes here.',
      icon: Activity,
      highlight: 'dashboard',
      mockup: 'dashboard'
    },
    {
      title: isFa ? '۲. مانیتورینگ هوشمند کلاینت‌ها (سیستم‌ها)' : '2. Smart Client Monitoring & Control',
      subtitle: isFa ? 'کنترل از راه دور، قفل صفحه، شارژ کیف‌پول و مانیتورینگ PCها' : 'Remote control, screen locking, wallet billing and PC stats',
      description: isFa
        ? 'سیستم‌های کلوپ (PC و کنسول‌ها) را به صورت لحظه‌ای مشاهده کنید. می‌توانید وضعیت اتصال، زمان باقی‌مانده و نرخ ساعتی هر سیستم را تغییر داده یا دستور خاموش/روشن ارسال کنید.'
        : 'View gaming stations (PCs & Consoles) in real-time. Lock/unlock screens, monitor remaining time, configure hourly rates, or send remote power signals.',
      icon: Monitor,
      highlight: 'systems',
      mockup: 'systems'
    },
    {
      title: isFa ? '۳. مدیریت هوشمند سفارشات بوفه و کافه' : '3. Intelligent Cafe Buffet & Orders',
      subtitle: isFa ? 'بروزرسانی وضعیت سفارشات و مدیریت خودکار انبار کافه' : 'Update order dispatch statuses & automated cafe inventory control',
      description: isFa
        ? 'سفارشات ارسالی از سمت گیمرها را به صورت زنده دریافت کنید. وضعیت آن‌ها را به «در حال آماده‌سازی» یا «تحویل داده شده» تغییر دهید تا هزینه به فاکتور کلاینت اضافه شود.'
        : 'Receive live snack/food orders from active gamers. Instantly update order status to "Preparing" or "Completed" to sync with client billing.',
      icon: Coffee,
      highlight: 'cafe',
      mockup: 'cafe'
    },
    {
      title: isFa ? '۴. انبارداری قطعات و سخت‌افزار گیمینگ' : '4. Accessory Storehouse & Gaming Gear',
      subtitle: isFa ? 'کنترل موجودی انبار، ثبت تجهیزات و کدهای تخفیف باشگاه' : 'Stock control, hardware inventory & club redemption codes',
      description: isFa
        ? 'قطعات و لوازم جانبی (کیبورد، هدست، ماوس) موجود در فروشگاه گیم‌نت را مدیریت کنید. گیمرها می‌توانند امتیازات خود را برای خرید این قطعات مبادله کنند.'
        : 'Manage premium peripherals (keyboards, headsets, mice) available in the store. Gamers can redeem their earned loyalty points for store items.',
      icon: ShoppingBag,
      highlight: 'shop',
      mockup: 'shop'
    },
    {
      title: isFa ? '۵. زمان‌بندی براکت مسابقات (Esports)' : '5. Esports Tournaments & Brackets',
      subtitle: isFa ? 'ساخت مسابقات جدید، تعیین حق ورودی و ثبت لیدرهای تیم' : 'Create tournaments, set entry fees & register team leaders',
      description: isFa
        ? 'بزرگ‌ترین تورنمنت‌های محلی و استانی را با چند کلیک تعریف کنید. سقف تیم‌ها، حق ورودی و تاریخ برگزاری را مشخص کرده و لیست شرکت‌کنندگان را مشاهده نمایید.'
        : 'Organize major local esports tournaments with a few clicks. Specify team limits, entry fees, start dates, and track registered teams easily.',
      icon: Trophy,
      highlight: 'tournaments',
      mockup: 'tournaments'
    }
  ];

  // Define full onboarding slides for GameNet Client Mode
  const gamenetSlides = [
    {
      title: isFa ? '۱. رزرو آنی سیستم‌های گیمینگ' : '1. Instant Gaming Station Booking',
      subtitle: isFa ? 'انتخاب پلتفرم، سیستم‌های VIP و رزرو ساعت نبرد' : 'Choose platforms, select VIP rigs & book your battle time',
      description: isFa
        ? 'به راحتی سیستم مورد نظر خود (PC، پی‌اس‌۵ یا شبیه‌ساز رانندگی) را انتخاب کنید، پکیج ساعتی دلخواه را برگزینید و با اعمال تخفیف رزرو خود را قطعی نمایید.'
        : 'Easily select your preferred gaming rig (PC, PS5, or Simulator), choose hourly packages, apply active coupons and finalize your booking.',
      icon: Monitor,
      highlight: 'reservations',
      mockup: 'reservations'
    },
    {
      title: isFa ? '۲. سفارش آنلاین از بوفه کافه' : '2. Direct Cafe Ordering',
      subtitle: isFa ? 'سفارش انواع نوشیدنی انرژی‌زا، برگر و اسنک از روی صندلی' : 'Order energy drinks, burgers & snacks straight to your desk',
      description: isFa
        ? 'نیازی به بلند شدن از پشت سیستم نیست! منوی کافه را باز کنید، سفارش خود را ثبت نمایید تا پرسنل سالن آن را در سریع‌ترین زمان ممکن به صندلی شما تحویل دهند.'
        : 'No need to leave your setup! Open the cafe menu, order snacks or drinks, and our staff will deliver them directly to your desk.',
      icon: Coffee,
      highlight: 'cafe',
      mockup: 'user-cafe'
    },
    {
      title: isFa ? '۳. باشگاه مشتریان وفادار (Loyalty Club)' : '3. Gamers Loyalty Club & Levels',
      subtitle: isFa ? 'کسب امتیاز با هر بازی، افزایش سطح کاربری و کدهای تخفیف' : 'Earn XP, upgrade gamer level & redeem cash-back coupons',
      description: isFa
        ? 'با هر ساعت بازی در سالن یا خرید از بوفه، امتیاز وفاداری (XP) دریافت کنید. با افزایش سطح خود می‌توانید امتیازات را به کدهای تخفیف یا ورودی رایگان مسابقات تبدیل کنید.'
        : 'Earn loyalty points (XP) for every hour played or snack ordered. Level up your gamer profile and convert points to discount coupons or free entry keys.',
      icon: Sparkles,
      highlight: 'loyalty',
      mockup: 'user-loyalty'
    }
  ];

  const slides = mode === 'admin' ? adminSlides : gamenetSlides;

  useEffect(() => {
    if (initialSection) {
      const index = slides.findIndex(s => s.highlight === initialSection);
      if (index !== -1) {
        setActiveStep(index);
      }
    } else {
      setActiveStep(0);
    }
    setSelectedHotspot(null);
  }, [isOpen, initialSection, mode]);

  if (!isOpen) return null;

  const handleNext = () => {
    if (activeStep < slides.length - 1) {
      setActiveStep(activeStep + 1);
      setSelectedHotspot(null);
    }
  };

  const handlePrev = () => {
    if (activeStep > 0) {
      setActiveStep(activeStep - 1);
      setSelectedHotspot(null);
    }
  };

  // Hotspots info depending on the mockup view
  const getHotspots = (mockupType: string) => {
    switch (mockupType) {
      case 'dashboard':
        return [
          { id: 'revenue', x: '18%', y: '25%', title: isFa ? 'درآمد کل روز' : 'Total Revenue', desc: isFa ? 'مجموع درآمد حاصل از رزروها، خرید بوفه و انبار کلوپ با سیستم همگام‌سازی ابری.' : 'Aggregated earnings from reservations, cafe and store synced with database.' },
          { id: 'active', x: '52%', y: '25%', title: isFa ? 'کلاینت‌های متصل' : 'Connected Clients', desc: isFa ? 'نمایش تعداد لحظه‌ای گیمرهای متصل به شبکه محلی گیم‌نت.' : 'Live count of gamers currently playing inside the gaming LAN.' },
          { id: 'chart', x: '45%', y: '65%', title: isFa ? 'نمودار اوج مصرف' : 'Peak Traffic Chart', desc: isFa ? 'نمایش ساعات شلوغی سالن جهت بهینه‌سازی شیفت کاری اپراتورها.' : 'Visualizes busiest hours in the club to help schedule operator shifts.' }
        ];
      case 'systems':
        return [
          { id: 'power', x: '25%', y: '32%', title: isFa ? 'روشن/خاموش از راه دور' : 'Remote Power Signal', desc: isFa ? 'ارسال سیگنال خاموش، ریستارت یا لاگ‌آوت مستقیم به کلاینت‌های تحت شبکه.' : 'Send direct shutdown, reboot, or forced logout commands to any client PC.' },
          { id: 'time', x: '75%', y: '32%', title: isFa ? 'تایمر مانیتورینگ' : 'Active Session Timer', desc: isFa ? 'نمایش دقیق زمان باقیمانده حساب هر کاربر با آلارم صوتی در دقایق پایانی.' : 'Shows exact time remaining for the user session with built-in voice alert.' },
          { id: 'rates', x: '50%', y: '75%', title: isFa ? 'تنظیمات نرخ ساعتی' : 'Hourly Rates Config', desc: isFa ? 'تعریف نرخ پویای معمولی و VIP بر اساس ساعات پیک یا تخفیف‌های شبانه.' : 'Configure dynamic hourly rates for standard and VIP setups based on times.' }
        ];
      case 'cafe':
        return [
          { id: 'pending', x: '25%', y: '25%', title: isFa ? 'سفارشات جدید بوفه' : 'New Incoming Orders', desc: isFa ? 'سفارشات جدید به همراه شماره سیستم و نام مشتری در صف آماده‌سازی.' : 'Lists newly submitted snacks with target PC station number and gamer tag.' },
          { id: 'stocks', x: '75%', y: '75%', title: isFa ? 'انبار مکانیزه کافه' : 'Automated Cafe Stocks', desc: isFa ? 'کاهش خودکار موجودی انبار کافه (نوشیدنی، انرژی‌زا، چیپس) بلافاصله پس از ثبت نهایی.' : 'Instantly decrements inventory count for sodas and energy drinks upon order completion.' }
        ];
      case 'reservations':
        return [
          { id: 'grid', x: '45%', y: '45%', title: isFa ? 'جدول زمان‌بندی صندلی‌ها' : 'Station Timeline Grid', desc: isFa ? 'جدول گرافیکی هوشمند با امکان درگ و دراپ زمان رزرو برای انواع سیستم‌ها.' : 'Visual interactive timeline to view, drag, and drop reservations across rigs.' },
          { id: 'vip_badge', x: '82%', y: '22%', title: isFa ? 'سیستم‌های VIP و فوق‌پیشرفته' : 'VIP High-End Rigs', desc: isFa ? 'تفاوت قیمت‌گذاری خودکار بر اساس سخت‌افزار (RTX 4090) و صندلی‌های گیمینگ راحتی.' : 'Custom billing tiers automatically applied to premium setups featuring RTX 4090 graphics.' }
        ];
      default:
        return [];
    }
  };

  const currentMockup = slides[activeStep]?.mockup;
  const hotspots = getHotspots(currentMockup);

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 overflow-y-auto" dir={dir}>
      {/* Dark Overlay */}
      <div 
        className="fixed inset-0 bg-black/90 backdrop-blur-md transition-opacity duration-300"
        onClick={onClose}
      />

      {/* Main Help Frame Container */}
      <div className="relative bg-[#0d0f19] border border-white/10 rounded-3xl w-full max-w-5xl shadow-[0_0_50px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col max-h-[90vh] z-10 animate-scale-up">
        
        {/* Header Bar */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-white/10 bg-black/40">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-primary/20 border border-primary/40 rounded-xl flex items-center justify-center text-primary shadow-[0_0_12px_rgba(255,184,0,0.2)]">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-md md:text-lg font-black text-white font-display flex items-center gap-2">
                <span>{mode === 'admin' ? (isFa ? 'راهنمای تصویری پنل مدیریت سایت' : 'Admin Portal Visual Walkthrough') : (isFa ? 'راهنمای کاربری و کلاینت بازینو پرو' : 'Gamer Interface User Manual')}</span>
                <span className="text-[10px] bg-primary/10 border border-primary/20 text-primary px-2 py-0.5 rounded-md font-mono">V2.4</span>
              </h2>
              <p className="text-xs text-gray-400 mt-0.5 font-medium">
                {isFa ? 'آموزش تصویری، نکات فنی و سناریوهای مدیریتی کلوپ' : 'Interactive blueprints, operational workflows and server diagrams'}
              </p>
            </div>
          </div>
          
          <button 
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 text-gray-400 hover:text-white flex items-center justify-center transition-all cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Notice Info Box */}
        <div className="bg-amber-500/10 border-b border-amber-500/20 px-6 py-3 text-amber-200 text-xs leading-relaxed flex items-center gap-3">
          <Info className="w-4.5 h-4.5 text-amber-400 shrink-0" />
          <p className="font-semibold">
            {isFa 
              ? 'با کلیک روی دکمه‌های راهنمای تصویری هر بخش، ترفندهای هوشمند مانیتورینگ سیستم‌ها و اتصالات دیتابیس را به صورت مصور و گام‌به‌گام فرا بگیرید.' 
              : 'Click help badges inside the panel to master remote management, inventory pipelines, and SQLite/EF Core database configurations.'}
          </p>
        </div>

        {/* Core Multi-tab / Slide Viewer Area */}
        <div className="flex-grow overflow-y-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 max-h-[55vh]">
          
          {/* Left/Right Narrative Slide details */}
          <div className="lg:col-span-5 flex flex-col justify-between space-y-6">
            <div className="space-y-4">
              <div className="flex items-center gap-2.5">
                <span className="p-2 bg-primary/10 border border-primary/30 text-primary rounded-xl">
                  {React.createElement(slides[activeStep]?.icon || HelpCircle, { className: 'w-5 h-5' })}
                </span>
                <span className="text-xs font-black text-primary font-mono bg-primary/5 px-2.5 py-1 rounded-lg">
                  {isFa ? `گام ${activeStep + 1} از ${slides.length}` : `Step ${activeStep + 1} of ${slides.length}`}
                </span>
              </div>

              <h3 className="text-md md:text-lg font-black text-white font-display">
                {slides[activeStep]?.title}
              </h3>
              
              <h4 className="text-xs font-black text-primary/95 leading-relaxed">
                {slides[activeStep]?.subtitle}
              </h4>

              <p className="text-gray-300 text-xs md:text-sm leading-relaxed font-medium">
                {slides[activeStep]?.description}
              </p>

              {/* Action Tip Card */}
              <div className="p-4 rounded-xl bg-[#131628] border border-white/5 space-y-2">
                <span className="text-[10px] font-black text-purple-400 uppercase tracking-widest block font-mono">Pro Tip / ترفند ویژه</span>
                <p className="text-gray-400 text-xs leading-relaxed">
                  {mode === 'admin' 
                    ? (isFa 
                        ? 'شما می‌توانید کلیه کارهای انبارداری، سفارش کافه و مانیتورینگ PC را از طریق این پنل مدیریت تحت کلاینت به صورت متمرکز انجام دهید.' 
                        : 'You can control client power, logs and accessory stocks directly. Use hotkeys on physical PCs to send automatic alerts to this admin board.')
                    : (isFa 
                        ? 'با ارتقای سطح خود در باشگاه مشتریان، بازی‌های بیشتر و آفرهای هیجان‌انگیزتری در صفحه شخصی دریافت خواهید کرد!' 
                        : 'Leveling up grants you multiplier boosters on loyalty XP. Spend points in the store tab to claim free peripheral gears.')}
                </p>
              </div>
            </div>

            {/* Slide Navigation Buttons */}
            <div className="flex items-center gap-3 pt-4 border-t border-white/10 shrink-0">
              <button
                disabled={activeStep === 0}
                onClick={handlePrev}
                className="flex-1 py-3 bg-white/5 hover:bg-white/10 disabled:opacity-30 border border-white/10 hover:border-white/20 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>{isFa ? 'قبلی' : 'Previous'}</span>
              </button>
              <button
                disabled={activeStep === slides.length - 1}
                onClick={handleNext}
                className="flex-1 py-3 bg-primary hover:bg-primary-hover disabled:opacity-30 text-black rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 cursor-pointer shadow-[0_0_15px_rgba(255,184,0,0.3)]"
              >
                <span>{isFa ? 'بعدی' : 'Next'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Right/Left Pictorial Simulation (Schematic diagram / Animated Mockup screen) */}
          <div className="lg:col-span-7 bg-[#07080f] border border-white/10 rounded-2xl relative overflow-hidden flex flex-col min-h-[300px] justify-center items-center p-4">
            
            {/* Guide simulation label */}
            <div className="absolute top-3 left-3 px-2 py-0.5 bg-black/70 border border-white/10 rounded-md text-[10px] text-gray-400 font-mono tracking-wider flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>SIMULATED_INTERFACE_VIEW</span>
            </div>

            {/* Custom Interactive Hotspots Simulation on Mockups */}
            {currentMockup === 'dashboard' && (
              <div className="w-full max-w-sm space-y-4 animate-fade-in py-6">
                {/* Stats Cards Row */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-[#121424] border border-white/10 rounded-xl p-3 relative">
                    <span className="text-[10px] text-gray-500 font-bold block uppercase">Sales Today</span>
                    <span className="text-md font-black text-emerald-400 font-mono block mt-1">4,250,000 T</span>
                    <div className="absolute -top-1.5 -right-1.5 w-3 h-3 bg-primary rounded-full animate-ping"></div>
                  </div>
                  <div className="bg-[#121424] border border-white/10 rounded-xl p-3">
                    <span className="text-[10px] text-gray-500 font-bold block uppercase">Active Gamers</span>
                    <span className="text-md font-black text-primary font-mono block mt-1">24 / 30</span>
                  </div>
                </div>
                {/* Visual Chart Graphic */}
                <div className="bg-[#121424] border border-white/10 rounded-xl p-4 space-y-3">
                  <div className="flex justify-between items-center text-[10px] text-gray-400 font-bold">
                    <span>Peak Hour Analyzer</span>
                    <span className="flex items-center gap-1"><Wifi className="w-3 h-3 text-emerald-400" /> Live</span>
                  </div>
                  {/* Mock bar chart graphic */}
                  <div className="flex items-end justify-between h-20 gap-1.5 pt-2">
                    <div className="bg-primary/25 h-[30%] w-full rounded-sm"></div>
                    <div className="bg-primary/25 h-[50%] w-full rounded-sm"></div>
                    <div className="bg-primary/50 h-[85%] w-full rounded-sm"></div>
                    <div className="bg-primary/95 h-[100%] w-full rounded-sm shadow-[0_0_8px_rgba(255,184,0,0.5)]"></div>
                    <div className="bg-primary/40 h-[65%] w-full rounded-sm"></div>
                    <div className="bg-primary/20 h-[40%] w-full rounded-sm"></div>
                  </div>
                </div>
              </div>
            )}

            {currentMockup === 'systems' && (
              <div className="w-full max-w-sm space-y-4 animate-fade-in py-4">
                <div className="bg-[#121424] border border-white/10 rounded-xl p-4 space-y-4">
                  <div className="flex items-center justify-between border-b border-white/5 pb-2">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                      <span className="text-xs font-black text-white font-mono">STATION_04 (VIP PC)</span>
                    </div>
                    <span className="text-[10px] font-mono bg-primary/20 text-primary px-2 py-0.5 rounded-md">ACTIVE</span>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="bg-black/40 p-2 rounded-lg">
                      <Clock className="w-4 h-4 mx-auto text-primary mb-1" />
                      <span className="text-[10px] text-gray-500 block">Time Left</span>
                      <span className="text-xs font-black text-white font-mono">01:42:10</span>
                    </div>
                    <div className="bg-black/40 p-2 rounded-lg">
                      <DollarSign className="w-4 h-4 mx-auto text-primary mb-1" />
                      <span className="text-[10px] text-gray-500 block">Rate/Hr</span>
                      <span className="text-xs font-black text-white font-mono">35K T</span>
                    </div>
                    <div className="bg-black/40 p-2 rounded-lg">
                      <Cpu className="w-4 h-4 mx-auto text-primary mb-1" />
                      <span className="text-[10px] text-gray-500 block">Usage XP</span>
                      <span className="text-xs font-black text-white font-mono">+120 XP</span>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button className="flex-1 py-1.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 rounded-lg text-[10px] font-black uppercase">Lock Client</button>
                    <button className="flex-1 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-lg text-[10px] font-black uppercase">Add Time</button>
                  </div>
                </div>
              </div>
            )}

            {currentMockup === 'cafe' && (
              <div className="w-full max-w-sm space-y-3 animate-fade-in py-4">
                <div className="bg-[#121424] border border-white/10 rounded-xl p-4 space-y-3">
                  <span className="text-[10px] text-gray-500 font-black uppercase tracking-wider block">Cafe Order Dispatcher</span>
                  
                  {/* Mock Cafe Orders */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between p-2.5 bg-black/40 rounded-lg border border-white/5">
                      <div className="flex items-center gap-2">
                        <Coffee className="w-3.5 h-3.5 text-primary" />
                        <div>
                          <span className="text-xs font-bold text-white block">RedBull Energy + HotDog</span>
                          <span className="text-[10px] text-gray-400 block font-mono">STATION_08 (Console) • 120,000 T</span>
                        </div>
                      </div>
                      <span className="text-[10px] bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-md font-black">PENDING</span>
                    </div>
                    
                    <div className="flex items-center justify-between p-2.5 bg-black/40 rounded-lg border border-white/5 opacity-60">
                      <div className="flex items-center gap-2">
                        <Coffee className="w-3.5 h-3.5 text-emerald-400" />
                        <div>
                          <span className="text-xs font-bold text-white block">Double Espresso Shot</span>
                          <span className="text-[10px] text-gray-400 block font-mono">STATION_01 (PC VIP) • 45,000 T</span>
                        </div>
                      </div>
                      <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-md font-black">DELIVERED</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {currentMockup === 'shop' && (
              <div className="w-full max-w-sm space-y-3 animate-fade-in py-4">
                <div className="bg-[#121424] border border-white/10 rounded-xl p-4 space-y-3">
                  <span className="text-[10px] text-gray-500 font-black uppercase tracking-wider block">Gamer Accessories Store</span>
                  
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-black/40 p-2.5 rounded-lg border border-white/5 flex flex-col items-center text-center space-y-1">
                      <ShoppingBag className="w-6 h-6 text-primary" />
                      <span className="text-xs font-bold text-white">Razer DeathAdder V3</span>
                      <span className="text-[10px] text-primary font-bold">1,450 Points</span>
                      <span className="text-[10px] text-gray-400">Stock: 4 units</span>
                    </div>
                    
                    <div className="bg-black/40 p-2.5 rounded-lg border border-white/5 flex flex-col items-center text-center space-y-1">
                      <ShoppingBag className="w-6 h-6 text-primary" />
                      <span className="text-xs font-bold text-white">HyperX Cloud II</span>
                      <span className="text-[10px] text-primary font-bold">2,800 Points</span>
                      <span className="text-[10px] text-gray-400">Stock: 2 units</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {currentMockup === 'tournaments' && (
              <div className="w-full max-w-sm space-y-3 animate-fade-in py-4">
                <div className="bg-[#121424] border border-white/10 rounded-xl p-4 space-y-3">
                  <span className="text-[10px] text-gray-500 font-black uppercase tracking-wider block">Esports Bracket Manager</span>
                  
                  {/* Mock tournament card */}
                  <div className="p-3 bg-black/40 rounded-lg border border-white/5 space-y-2.5">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-black text-white">CS2 Major Gamenet Cup</span>
                      <span className="text-[10px] bg-primary/20 text-primary px-1.5 py-0.5 rounded font-mono">8 TEAMS MAX</span>
                    </div>
                    <div className="flex justify-between text-[10px] text-gray-400">
                      <span>Prize: 15,000,000 T</span>
                      <span>Starts: 1405/05/15</span>
                    </div>
                    <div className="pt-2 border-t border-white/5 flex gap-1.5 justify-end">
                      <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">Active Brackets</span>
                      <span className="text-[10px] font-bold text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded">Live Teams (6/8)</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {currentMockup === 'reservations' && (
              <div className="w-full max-w-sm space-y-3 animate-fade-in py-4">
                <div className="bg-[#121424] border border-white/10 rounded-xl p-4 space-y-3">
                  <span className="text-[10px] text-gray-500 font-black uppercase tracking-wider block">Gamer Online Booking Screen</span>
                  
                  <div className="p-3 bg-black/40 rounded-lg border border-white/5 space-y-3">
                    <div className="space-y-1">
                      <span className="text-[10px] text-gray-400 block font-bold">Step 1: Choose Gaming Rig</span>
                      <div className="flex gap-2">
                        <span className="flex-1 py-1.5 text-center text-[10px] font-bold border border-primary text-primary rounded-lg bg-primary/5">PC VIP-04</span>
                        <span className="flex-1 py-1.5 text-center text-[10px] font-bold border border-white/5 text-gray-400 rounded-lg">PS5 CON-02</span>
                      </div>
                    </div>
                    
                    <div className="space-y-1">
                      <span className="text-[10px] text-gray-400 block font-bold">Step 2: Choose Duration</span>
                      <div className="flex gap-2">
                        <span className="flex-1 py-1 text-center text-[10px] font-bold border border-white/5 text-gray-400 rounded-lg">2 Hours</span>
                        <span className="flex-1 py-1 text-center text-[10px] font-bold border border-primary text-primary rounded-lg bg-primary/5">4 Hours Pass</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {currentMockup === 'user-cafe' && (
              <div className="w-full max-w-sm space-y-3 animate-fade-in py-4">
                <div className="bg-[#121424] border border-white/10 rounded-xl p-4 space-y-3">
                  <span className="text-[10px] text-gray-500 font-black uppercase tracking-wider block font-mono">Gamer Quick Snack Menu</span>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-black/30 p-2 rounded-lg border border-white/5 flex flex-col items-center">
                      <Coffee className="w-5 h-5 text-primary mb-1" />
                      <span className="text-[10px] font-bold text-white">Iced Latte</span>
                      <span className="text-[10px] text-gray-400">45,000 T</span>
                      <button className="mt-1.5 px-3 py-1 bg-primary text-black font-black text-[10px] rounded-md">Order Now</button>
                    </div>
                    <div className="bg-black/30 p-2 rounded-lg border border-white/5 flex flex-col items-center">
                      <Coffee className="w-5 h-5 text-primary mb-1" />
                      <span className="text-[10px] font-bold text-white">Monster Blue</span>
                      <span className="text-[10px] text-gray-400">75,000 T</span>
                      <button className="mt-1.5 px-3 py-1 bg-primary text-black font-black text-[10px] rounded-md">Order Now</button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {currentMockup === 'user-loyalty' && (
              <div className="w-full max-w-sm space-y-3 animate-fade-in py-4">
                <div className="bg-[#121424] border border-white/10 rounded-xl p-4 space-y-3">
                  <span className="text-[10px] text-gray-500 font-black uppercase tracking-wider block font-mono">Gamer Level Dashboard</span>
                  
                  <div className="p-3 bg-black/40 rounded-lg border border-white/5 space-y-2">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-black text-white">Level 12 (Elite Vanguard)</span>
                      <span className="text-[10px] text-primary font-black">4,500 XP</span>
                    </div>
                    {/* XP Progress bar */}
                    <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
                      <div className="h-full bg-primary shadow-[0_0_8px_rgba(255,184,0,0.6)]" style={{ width: '75%' }}></div>
                    </div>
                    <span className="text-[10px] text-gray-400 block">Play 3 more hours to unlock Level 13 (Aura booster)</span>
                  </div>
                </div>
              </div>
            )}

            {/* Glowing Hotspots overlay */}
            {hotspots.map((hs) => (
              <button
                key={hs.id}
                onClick={() => setSelectedHotspot(selectedHotspot === hs.id ? null : hs.id)}
                className={`absolute w-7 h-7 rounded-full flex items-center justify-center transition-all cursor-pointer z-20 ${
                  selectedHotspot === hs.id 
                    ? 'bg-primary text-black scale-125 shadow-[0_0_20px_rgba(255,184,0,0.8)] border-2 border-white' 
                    : 'bg-primary/20 text-primary border border-primary/50 hover:scale-110 shadow-[0_0_10px_rgba(255,184,0,0.3)]'
                }`}
                style={{ top: hs.y, left: hs.x }}
              >
                <MousePointerClick className="w-3.5 h-3.5 animate-pulse" />
              </button>
            ))}

            {/* Selected Hotspot Detailed Popup Panel */}
            {selectedHotspot && (() => {
              const hsInfo = hotspots.find(h => h.id === selectedHotspot);
              if (!hsInfo) return null;
              return (
                <div className="absolute bottom-4 right-4 left-4 p-4 rounded-xl bg-black/90 border border-primary/30 text-white text-xs space-y-1 z-30 animate-fade-in shadow-2xl">
                  <div className="flex justify-between items-center">
                    <span className="font-black text-primary font-display flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5 text-primary" />
                      <span>{hsInfo.title}</span>
                    </span>
                    <button 
                      onClick={() => setSelectedHotspot(null)} 
                      className="text-gray-400 hover:text-white"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <p className="text-gray-300 text-xs leading-relaxed font-medium">
                    {hsInfo.desc}
                  </p>
                </div>
              );
            })()}

          </div>

        </div>

        {/* Footer actions & manual downloads */}
        <div className="p-6 bg-black/40 border-t border-white/10 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
            <span className="text-xs text-gray-400 font-semibold">
              {isFa ? 'راهنمای تصویری به زبان شیرین فارسی آماده است.' : 'Full system visual onboarding manuals compiled successfully.'}
            </span>
          </div>

          <div className="flex gap-3">
            {/* Quick Link to Manual Slides PDF */}
            <a 
              href="/Bazino_Pro_Presentation.pdf"
              download="Bazino_Pro_Presentation.pdf"
              className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/25 rounded-xl text-xs font-bold text-white flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-primary" />
              <span>{isFa ? 'دانلود دفترچه چاپی PDF دسکتاپ' : 'Download Print Manual PDF'}</span>
            </a>
            
            <a 
              href="/Bazino_Pro_Mobile_Presentation.pdf"
              download="Bazino_Pro_Mobile_Presentation.pdf"
              className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/25 rounded-xl text-xs font-bold text-white flex items-center gap-1.5 transition-all transition-all cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-primary" />
              <span>{isFa ? 'دانلود پی‌دی‌اف موبایل' : 'Download Mobile PDF'}</span>
            </a>
          </div>
        </div>

      </div>
    </div>
  );
}
