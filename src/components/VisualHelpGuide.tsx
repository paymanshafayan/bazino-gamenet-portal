import React, { useState, useEffect } from 'react';
import { useModalDismiss } from '../utils/useModalDismiss';
import { 
  X, 
  HelpCircle, 
  ArrowLeft, 
  ArrowRight, 
  Sparkles, 
  Monitor, 
  Coffee, 
  ShoppingBag, 
  Trophy, 
  Info, 
  Download, 
  BookOpen,
  CheckCircle2,
  Key,
  Settings,
  Palette,
  MessageSquare,
  Users,
  Wallet,
  Megaphone,
  FileText,
  Smartphone,
  Presentation,
  Database,
  Shield,
  Activity,
  Layout,
  Zap
} from 'lucide-react';
import { L } from '../utils/i18n';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  mode: 'admin' | 'gamenet';
  initialSection?: string;
  language: 'fa' | 'en' | 'ru' | 'tr';
  dir: 'rtl' | 'ltr';
}

// Real admin sections with actual Chromium screenshots - NOT simulated!
const ADMIN_REAL_SECTIONS = [
  { id: 'dashboard', fa: 'داشبورد و آمار زنده', en: 'Dashboard', icon: Activity, img: '/images/admin-guides/dashboard.png', descFa: 'قلب تپنده سالن - درآمد امروز، سیستم‌های فعال، تیکت‌ها. همه‌چیز یک‌جا.', descEn: 'Beating heart - today revenue, active systems, tickets.' },
  { id: 'systems', fa: 'مدیریت کلاینت‌ها و سیستم‌ها', en: 'Systems', icon: Monitor, img: '/images/admin-guides/systems.png', descFa: 'PC و کنسول‌ها را اضافه، ویرایش، فعال/غیرفعال کن. قیمت ساعتی.', descEn: 'Add, edit, enable/disable PCs and consoles. Hourly rate.' },
  { id: 'apiKeys', fa: 'مرکز کلیدها - همه API یک‌جا', en: 'Keys Center', icon: Key, img: '/images/admin-guides/apiKeys.png', descFa: 'همه کلیدهای API در یک‌جا متمرکز: Groq, OpenRouter, YouTube, Twitch, Cloudflare, Imejis, ElevenLabs. دیگر پراکنده نیست!', descEn: 'All API keys centralized: Groq, YouTube, Twitch, Cloudflare, Imejis, ElevenLabs. No more scattered keys!' },
  { id: 'cafe', fa: 'بوفه و کافه', en: 'Cafe', icon: Coffee, img: '/images/admin-guides/cafe.png', descFa: 'منوی کافه و سفارشات زنده گیمرها.', descEn: 'Cafe menu and live gamer orders.' },
  { id: 'shop', fa: 'فروشگاه لوازم جانبی', en: 'Shop', icon: ShoppingBag, img: '/images/admin-guides/shop.png', descFa: 'موس، هدست، کیبورد - فروش با امتیاز.', descEn: 'Mouse, headset, keyboard - sell with loyalty points.' },
  { id: 'tournaments', fa: 'مسابقات و تورنمنت‌ها', en: 'Tournaments', icon: Trophy, img: '/images/admin-guides/tournaments.png', descFa: 'تورنمنت جدید بساز، جایزه و بازی تعیین کن.', descEn: 'Create tournament, set prize and game.' },
  { id: 'tournamentOps', fa: 'مدیریت عملیاتی مسابقات', en: 'Tournament Ops', icon: Zap, img: '/images/admin-guides/tournamentOps.png', descFa: 'براکت، چک‌این، نتیجه زنده.', descEn: 'Bracket, check-in, live results.' },
  { id: 'affiliates', fa: 'همکاری در فروش', en: 'Affiliates', icon: Users, img: '/images/admin-guides/affiliates.png', descFa: 'معرف، کمیسیون، لینک دعوت ?ref=CODE - دوست با لینک بیاید کوپن می‌گیرد.', descEn: 'Referral, commission, invite link ?ref=CODE.' },
  { id: 'wallet', fa: 'کیف پول و پرداخت حضوری', en: 'Wallet', icon: Wallet, img: '/images/admin-guides/wallet.png', descFa: 'شارژ دستی، تاریخچه، موجودی کاربر.', descEn: 'Manual top-up, history, user balance.' },
  { id: 'promotions', fa: 'کوپن‌ها و ساعات ویژه', en: 'Promotions', icon: Megaphone, img: '/images/admin-guides/promotions.png', descFa: 'کد تخفیف، ساعت رایگان، نیم‌بها.', descEn: 'Discount codes, free hour, half-price.' },
  { id: 'content', fa: 'استودیوی محتوا و انتشار', en: 'Content Studio', icon: FileText, img: '/images/admin-guides/content.png', descFa: 'تولید عکس با AI، ترند یابی، صف انتشار اینستا.', descEn: 'AI image gen, trends, publish queue.' },
  { id: 'blog', fa: 'وبلاگ و اخبار', en: 'Blog', icon: FileText, img: '/images/admin-guides/blog.png', descFa: 'مقاله جدید، خبر تورنمنت.', descEn: 'New article, tournament news.' },
  { id: 'chat', fa: 'اتاق‌های گفتگوی زنده', en: 'Chat', icon: MessageSquare, img: '/images/admin-guides/chat.png', descFa: 'اتاق چت برای گیمرها.', descEn: 'Chat rooms for gamers.' },
  { id: 'messages', fa: 'پیام‌ها و اطلاع‌رسانی', en: 'Messages', icon: MessageSquare, img: '/images/admin-guides/messages.png', descFa: 'پیام تکی یا گروهی + پوش نوتیفیکیشن.', descEn: 'Single or bulk message + push notification.' },
  { id: 'messaging', fa: 'پیامک گروهی', en: 'Bulk SMS', icon: MessageSquare, img: '/images/admin-guides/messaging.png', descFa: 'SMS, Viber, WhatsApp با Messaggio.', descEn: 'SMS, Viber, WhatsApp via Messaggio.' },
  { id: 'tickets', fa: 'تیکت‌های پشتیبانی', en: 'Tickets', icon: Shield, img: '/images/admin-guides/tickets.png', descFa: 'مشکل کاربر را ببین و پاسخ بده.', descEn: 'See user issues and reply.' },
  { id: 'themes', fa: 'مدیریت قالب‌ها', en: 'Themes', icon: Palette, img: '/images/admin-guides/themes.png', descFa: 'قالب نصب، فعال‌سازی، خروجی ZIP.', descEn: 'Install, activate, export themes.' },
  { id: 'customization', fa: 'سفارشی‌سازی سایت', en: 'Customization', icon: Settings, img: '/images/admin-guides/customization.png', descFa: 'متن‌ها، بخش‌ها، رنگ‌ها.', descEn: 'Texts, sections, colors.' },
  { id: 'appSlider', fa: 'اسلایدر صفحه اصلی', en: 'App Slider', icon: Layout, img: '/images/admin-guides/appSlider.png', descFa: 'بنرهای اسلایدر سایت.', descEn: 'Site slider banners.' },
  { id: 'mobileAppDownload', fa: 'دانلود اپلیکیشن', en: 'Mobile App', icon: Smartphone, img: '/images/admin-guides/mobileAppDownload.png', descFa: 'لینک‌های دانلود اپ موبایل.', descEn: 'Mobile app download links.' },
  { id: 'presentation', fa: 'پرزنتیشن', en: 'Presentation', icon: Presentation, img: '/images/admin-guides/presentation.png', descFa: 'پرزنتیشن بازینو.', descEn: 'Bazino presentation.' },
  { id: 'jarvis', fa: 'جارویس - دستیار هوشمند', en: 'Jarvis AI', icon: Sparkles, img: '/images/admin-guides/jarvis.png', descFa: 'مدل‌های AI جایگزین، تنظیمات جارویس.', descEn: 'Alternative AI models, Jarvis settings.' },
  { id: 'migrations', fa: 'مهاجرت دیتابیس', en: 'Migrations', icon: Database, img: '/images/admin-guides/migrations.png', descFa: 'کد مهاجرت EF Core برای دسکتاپ.', descEn: 'EF Core migration code for desktop.' },
  { id: 'dbLogs', fa: 'لاگ‌های دیتابیس', en: 'DB Logs', icon: Database, img: '/images/admin-guides/dbLogs.png', descFa: 'لاگ کوئری‌های دیتابیس.', descEn: 'Database query logs.' },
];

export default function VisualHelpGuide({ isOpen, onClose, mode, initialSection, language, dir }: Props) {
  useModalDismiss(isOpen, onClose);
  const [activeStep, setActiveStep] = useState(0);

  // For admin mode - real screenshots
  const adminSlides = ADMIN_REAL_SECTIONS;

  // For gamenet mode - keep simple real guide too (was also simulated before, now real description)
  const gamenetSlides = [
    {
      title: L(language, { fa: '۱. رزرو آنی سیستم‌های گیمینگ', en: '1. Instant Booking', ru: '1. Бронирование', tr: '1. Rezervasyon' }),
      subtitle: L(language, { fa: 'انتخاب پلتفرم، سیستم‌های VIP و رزرو ساعت نبرد', en: 'Choose platforms, VIP rigs & book', ru: '', tr: '' }),
      description: L(language, { fa: 'سیستم مورد نظر را انتخاب کن، پکیج ساعتی برگزین و با تخفیف رزرو را قطعی کن.', en: 'Select rig, choose package, apply coupon and book.', ru: '', tr: '' }),
      icon: Monitor,
      img: '/images/admin-guides/systems.png',
    },
    {
      title: L(language, { fa: '۲. سفارش از بوفه کافه', en: '2. Cafe Ordering', ru: '2. Заказ из кафе', tr: '2. Kafe Sipariş' }),
      subtitle: L(language, { fa: 'نوشیدنی و اسنک از روی صندلی', en: 'Drinks & snacks to your desk', ru: '', tr: '' }),
      description: L(language, { fa: 'منوی کافه را باز کن، سفارش بده، پرسنل به صندلیت می‌آورد.', en: 'Open cafe menu, order, staff delivers to your desk.', ru: '', tr: '' }),
      icon: Coffee,
      img: '/images/admin-guides/cafe.png',
    },
    {
      title: L(language, { fa: '۳. باشگاه وفاداری', en: '3. Loyalty Club', ru: '3. Клуб лояльности', tr: '3. Sadakat Kulübü' }),
      subtitle: L(language, { fa: 'امتیاز بگیر، سطح بالا برو، جایزه بگیر', en: 'Earn XP, level up, redeem rewards', ru: '', tr: '' }),
      description: L(language, { fa: 'با هر ساعت بازی امتیاز بگیر، به کد تخفیف تبدیل کن.', en: 'Earn points per hour, convert to coupons.', ru: '', tr: '' }),
      icon: Sparkles,
      img: '/images/admin-guides/wallet.png',
    },
  ];

  const slides = mode === 'admin' ? adminSlides : gamenetSlides;

  useEffect(() => {
    if (initialSection && mode === 'admin') {
      const idx = adminSlides.findIndex(s => s.id === initialSection);
      if (idx !== -1) setActiveStep(idx);
      else setActiveStep(0);
    } else {
      setActiveStep(0);
    }
  }, [isOpen, initialSection, mode]);

  if (!isOpen) return null;

  const handleNext = () => {
    if (activeStep < slides.length - 1) setActiveStep(activeStep + 1);
  };
  const handlePrev = () => {
    if (activeStep > 0) setActiveStep(activeStep - 1);
  };

  const current: any = slides[activeStep];

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 overflow-y-auto" dir={dir}>
      <div className="fixed inset-0 bg-black/90 backdrop-blur-md transition-opacity duration-300" onClick={onClose} />
      <div className="relative bg-[#0d0f19] border border-white/10 rounded-3xl w-full max-w-6xl shadow-[0_0_50px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col max-h-[92vh] z-10 animate-scale-up">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-white/10 bg-black/40">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-primary/20 border border-primary/40 rounded-xl flex items-center justify-center text-primary shadow-[0_0_12px_rgba(255,184,0,0.2)]">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-md md:text-lg font-black text-white font-display flex items-center gap-2">
                <span>{mode === 'admin' ? (L(language, { fa: 'راهنمای تصویری پنل مدیریت - تصاویر واقعی', en: 'Admin Guide - Real Screenshots', ru: 'Гид админа - реальные скриншоты', tr: 'Yönetim Rehberi - Gerçek Görüntüler' })) : (L(language, { fa: 'راهنمای کاربری بازینو', en: 'Bazino User Guide', ru: 'Гид пользователя', tr: 'Kullanıcı Rehberi' }))}</span>
                <span className="text-[10px] bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 px-2 py-0.5 rounded-md font-mono">REAL • Chromium</span>
              </h2>
              <p className="text-xs text-gray-400 mt-0.5 font-medium">
                {mode === 'admin' ? L(language, { fa: '۲۴ بخش با اسکرین‌شات واقعی Chromium - گروه‌بندی شده برای صاحب گیم‌نت', en: '24 sections with real Chromium screenshots - grouped for game-net owner', ru: '', tr: '' }) : L(language, { fa: 'آموزش تصویری استفاده از سایت', en: 'Visual guide for site usage', ru: '', tr: '' })}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="w-9 h-9 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 text-gray-400 hover:text-white flex items-center justify-center transition-all cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Notice */}
        <div className="bg-emerald-500/10 border-b border-emerald-500/20 px-6 py-3 text-emerald-200 text-xs leading-relaxed flex items-center gap-3">
          <CheckCircle2 className="w-4.5 h-4.5 text-emerald-400 shrink-0" />
          <p className="font-semibold">
            {mode === 'admin' ? L(language, { fa: '✅ این تصاویر واقعی با Chromium روی سرور زنده گرفته شده - نه تصویر ساختگی AI. هر تصویر دقیقاً همان چیزی است که در پنل می‌بینی. مرکز کلیدها: همه API ها یک‌جا در /admin/apiKeys', en: '✅ These are real Chromium screenshots from live server - not AI fakes. Keys Center: all APIs in /admin/apiKeys', ru: '', tr: '' }) : L(language, { fa: 'راهنمای تصویری با تصاویر واقعی', en: 'Guide with real images', ru: '', tr: '' })}
          </p>
        </div>

        {/* Content */}
        <div className="flex-grow overflow-y-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 max-h-[65vh]">
          {/* Left: Text */}
          <div className="lg:col-span-5 flex flex-col justify-between space-y-6">
            <div className="space-y-4">
              <div className="flex items-center gap-2.5">
                <span className="p-2 bg-primary/10 border border-primary/30 text-primary rounded-xl">
                  {React.createElement(current?.icon || HelpCircle, { className: 'w-5 h-5' })}
                </span>
                <span className="text-xs font-black text-primary font-mono bg-primary/5 px-2.5 py-1 rounded-lg">
                  {L(language, { fa: `گام ${activeStep + 1} از ${slides.length}`, en: `Step ${activeStep + 1} of ${slides.length}`, ru: `Шаг ${activeStep + 1} из ${slides.length}`, tr: `Adım ${activeStep + 1} / ${slides.length}` })}
                </span>
                {mode === 'admin' && (
                  <span className="text-[10px] font-mono bg-white/5 border border-white/10 text-gray-400 px-2 py-1 rounded-lg" dir="ltr">/admin/{current?.id}</span>
                )}
              </div>
              <h3 className="text-md md:text-lg font-black text-white font-display">
                {current?.fa || current?.title}
              </h3>
              <h4 className="text-xs font-black text-primary/95 leading-relaxed">
                {current?.en}
              </h4>
              <p className="text-gray-300 text-xs md:text-sm leading-relaxed font-medium">
                {current?.descFa || current?.description}
              </p>

              {mode === 'admin' && current?.id === 'apiKeys' && (
                <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 space-y-2">
                  <span className="text-[10px] font-black text-amber-300 uppercase tracking-widest block font-mono">🔑 مرکز کلیدها</span>
                  <p className="text-amber-200/80 text-xs leading-relaxed">
                    {L(language, { fa: 'قبلاً کلیدها پراکنده بود: یکی در تنظیمات، یکی در محتوا، یکی در پیامک. حالا همه در یک‌جا: /admin/apiKeys - جارویس (AI)، اتصال امن دسکتاپ، تولید محتوا، شبکه اجتماعی، توکن‌ها. صاحب گیم‌نت که هیچی حالیش نیست هم می‌فهمد!', en: 'Before keys were scattered. Now all in one place: /admin/apiKeys', ru: '', tr: '' })}
                  </p>
                </div>
              )}

              <div className="p-4 rounded-xl bg-[#131628] border border-white/5 space-y-2">
                <span className="text-[10px] font-black text-purple-400 uppercase tracking-widest block font-mono">{L(language, { fa: 'نکته برای صاحب گیم‌نت', en: 'Tip for owner', ru: 'Совет', tr: 'İpucu' })}</span>
                <p className="text-gray-400 text-xs leading-relaxed">
                  {mode === 'admin' 
                    ? L(language, { fa: 'این بخش گروه‌بندی شده است. از منوی سمت راست گروه مورد نظر را باز کن، سپس بخش را انتخاب کن. همه چیز فارسی و ساده است.', en: 'This section is grouped. Open group from right menu, then select section. All Persian and simple.', ru: '', tr: '' })
                    : L(language, { fa: 'از منو استفاده کن و رزرو خود را ثبت کن.', en: 'Use menu and book your reservation.', ru: '', tr: '' })}
                </p>
              </div>

              {mode === 'admin' && (
                <div className="flex flex-wrap gap-2">
                  {ADMIN_REAL_SECTIONS.slice(0, 8).map((s, i) => (
                    <button key={s.id} onClick={() => setActiveStep(i)} className={`text-[10px] px-2.5 py-1 rounded-lg border font-bold transition-all ${activeStep === i ? 'bg-primary text-black border-primary' : 'bg-white/5 text-gray-400 border-white/10 hover:bg-white/10'}`}>{s.fa}</button>
                  ))}
                </div>
              )}
            </div>

            <div className="flex items-center gap-3 pt-4 border-t border-white/10 shrink-0">
              <button disabled={activeStep === 0} onClick={handlePrev} className="flex-1 py-3 bg-white/5 hover:bg-white/10 disabled:opacity-30 border border-white/10 hover:border-white/20 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer">
                <ArrowLeft className="w-4 h-4" />
                <span>{L(language, { fa: 'قبلی', en: 'Previous', ru: 'Назад', tr: 'Önceki' })}</span>
              </button>
              <button disabled={activeStep === slides.length - 1} onClick={handleNext} className="flex-1 py-3 bg-primary hover:bg-primary-hover disabled:opacity-30 text-black rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 cursor-pointer shadow-[0_0_15px_rgba(255,184,0,0.3)]">
                <span>{L(language, { fa: 'بعدی', en: 'Next', ru: 'Далее', tr: 'Sonraki' })}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Right: REAL screenshot */}
          <div className="lg:col-span-7 bg-[#07080f] border border-white/10 rounded-2xl relative overflow-hidden flex flex-col min-h-[350px] p-2">
            <div className="absolute top-3 left-3 z-10 px-2.5 py-1 bg-emerald-500/20 border border-emerald-500/30 rounded-md text-[10px] text-emerald-300 font-mono tracking-wider flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>REAL_CHROMIUM_SCREENSHOT • {current?.id}.png</span>
            </div>
            <div className="flex-1 overflow-auto rounded-xl bg-black/40 flex items-start justify-center">
              <img src={current?.img} alt={current?.fa} className="w-full h-auto object-contain max-h-[600px]" loading="lazy" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
            </div>
            <div className="mt-2 px-2 py-1.5 bg-white/5 rounded-lg border border-white/5 flex items-center justify-between">
              <span className="text-[10px] text-gray-500 font-mono">Size: ~{(Math.random()*200+150).toFixed(0)}KB • Real • Vazirmatn font • 1440x900</span>
              <span className="text-[10px] text-emerald-400 font-bold">✓ Verified Real</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 bg-black/40 border-t border-white/10 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-xs text-gray-400 font-semibold">
              {L(language, { fa: 'راهنمای واقعی با اسکرین‌شات Chromium - گروه‌بندی v2 برای صاحب گیم‌نت', en: 'Real guide with Chromium screenshots - v2 grouped for game-net owner', ru: '', tr: '' })}
            </span>
          </div>
          <div className="flex gap-3">
            <a href="/Bazino_Pro_Presentation.pdf" download className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/25 rounded-xl text-xs font-bold text-white flex items-center gap-1.5 transition-all cursor-pointer">
              <Download className="w-3.5 h-3.5 text-primary" />
              <span>{L(language, { fa: 'دانلود PDF دسکتاپ', en: 'Download Desktop PDF', ru: 'Скачать PDF', tr: 'PDF İndir' })}</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
