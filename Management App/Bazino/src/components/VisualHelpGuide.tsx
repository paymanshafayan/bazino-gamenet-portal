import React, { useState, useEffect } from 'react';
import {
  X,
  HelpCircle,
  ArrowLeft,
  ArrowRight,
  Info,
  BookOpen,
  Monitor,
  Coffee,
  Users,
  BarChart3,
  Shield,
  Settings,
} from 'lucide-react';

export type HelpSection = 'stations' | 'buffet' | 'customers' | 'accounting' | 'operators' | 'settings';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  /** Jump straight to this section's slide. Omit (or pass undefined) for the full walkthrough starting at step 1. */
  initialSection?: HelpSection;
}

interface Slide {
  section: HelpSection;
  title: string;
  subtitle: string;
  description: string;
  tip: string;
  icon: React.ComponentType<{ className?: string }>;
}

const SLIDES: Slide[] = [
  {
    section: 'stations',
    title: '۱. مدیریت ایستگاه‌ها',
    subtitle: 'شروع/پایان جلسه، تمدید، توقف موقت و چک‌اوت',
    description:
      'صفحه‌ی اصلی نرم‌افزار — کارت هر ایستگاه رنگ وضعیتش رو نشون می‌ده: خاکستری (خالی)، سبز (در حال بازی)، زرد (کمتر از ۵ دقیقه مونده)، قرمز (تموم شده). با کلیک روی یک ایستگاه خالی، جلسه‌ی جدید شروع می‌کنید (مدت‌زمان، نرخ، مشتری اختیاری)؛ روی ایستگاه فعال، می‌تونید تمدید، توقف موقت، یا تسویه‌حساب (checkout) بزنید.',
    tip: 'وقتی چراغ زرد روشن شد یعنی کمتر از ۵ دقیقه از زمان مشتری مونده — بهتره از قبل بهش اطلاع بدید. اگه ایستگاه به «تموم‌شده» برسه، آلارم صوتی هر چند ثانیه (قابل‌تنظیم در تنظیمات) تکرار می‌شه تا چک‌اوت انجام بشه.',
    icon: Monitor,
  },
  {
    section: 'buffet',
    title: '۲. بوفه و سفارش‌ها',
    subtitle: 'ثبت سفارش نوشیدنی/اسنک برای هر ایستگاه',
    description:
      'از این تب می‌تونید برای هر ایستگاه یا مشتری سفارش بوفه (نوشیدنی، تنقلات، ...) ثبت کنید. هزینه‌ی سفارش خودکار به فاکتور نهایی همون ایستگاه/مشتری در لحظه‌ی چک‌اوت اضافه می‌شه.',
    tip: 'موجودی هر قلم کالا رو می‌تونید از همین‌جا مدیریت کنید — وقتی موجودی صفر بشه، اون قلم برای سفارش‌گیری غیرفعال می‌شه تا اشتباهی فروخته نشه.',
    icon: Coffee,
  },
  {
    section: 'customers',
    title: '۳. مدیریت مشتریان',
    subtitle: 'پروفایل، کیف پول، امتیاز وفاداری، تخفیف تولد',
    description:
      'لیست کامل مشتریان با تاریخچه‌ی بازی، موجودی کیف پول، و رتبه‌ی وفاداری (بر اساس ساعت بازی/خرید). مشتری‌هایی که امروز تولدشونه، به‌طور خودکار با یک نشان 🎂 مشخص می‌شن و تخفیف تولد در لحظه‌ی تسویه‌حساب روی فاکتورشون اعمال می‌شه.',
    tip: 'برای شارژ کیف پول یا اعمال دستی تخفیف، وارد پروفایل مشتری بشید — هر تراکنش کیف پول به‌صورت کامل در تاریخچه ثبت و قابل پیگیریه.',
    icon: Users,
  },
  {
    section: 'accounting',
    title: '۴. حسابداری و گزارش‌ها',
    subtitle: 'درآمد روزانه، هزینه‌ها، نمودارها و خروجی‌های گزارش',
    description:
      'خلاصه‌ی مالی کامل: درآمد ایستگاه‌ها، بوفه، فروشگاه جانبی، و هزینه‌های ثبت‌شده، همراه با نمودار روند. از همین بخش می‌تونید فایل‌های گزارش (امکانات دسکتاپ، معرفی وب‌سایت و ...) رو هم دانلود کنید.',
    tip: 'این بخش فقط برای اپراتورهایی در دسترسه که مجوز «دسترسی به گزارش‌ها» (`canAccessReports`) رو داشته باشن — سطح دسترسی هر اپراتور از تب «اپراتورها» قابل تنظیمه.',
    icon: BarChart3,
  },
  {
    section: 'operators',
    title: '۵. اپراتورها و سطح دسترسی',
    subtitle: 'افزودن اپراتور، تعیین مجوزها، جابه‌جایی شیفت',
    description:
      'هر اپراتور می‌تونه مجوزهای جداگانه‌ای داشته باشه (مدیریت اپراتورها، دسترسی به گزارش‌ها، و غیره). از این بخش می‌تونید بین اپراتورهای فعال جابه‌جا بشید (تعویض شیفت) یا اپراتور جدید تعریف کنید.',
    tip: 'فقط اپراتورهایی با مجوز «مدیریت اپراتورها» (`canManageOperators`) می‌تونن این تب رو ببینن — برای امنیت، این مجوز رو فقط به مدیر اصلی گیم‌نت بدید.',
    icon: Shield,
  },
  {
    section: 'settings',
    title: '۶. تنظیمات',
    subtitle: 'تم گرافیکی، صدای آلارم، پشتیبان‌گیری، Web Sync، نسخه‌ی دسکتاپ',
    description:
      'همه‌ی تنظیمات کلی نرم‌افزار: انتخاب یکی از ۲۰ تم گرافیکی (رنگ‌بندی کل اپ رو تغییر می‌ده)، نوع/شدت صدای آلارم، فعال/غیرفعال کردن پشتیبان‌گیری خودکار روزانه، اتصال به سرور سایت اصلی برای دریافت رزروهای آنلاین (Web Sync)، و دانلود نسخه‌ی دسکتاپ مستقل.',
    tip: 'برای اتصال به سرور سایت (مثلاً روی نسخه‌ی دسکتاپ)، آدرس سایت + کلید API رو در تب «Web Sync → تنظیمات» وارد و ذخیره کنید، بعد «تست اتصال» بزنید.',
    icon: Settings,
  },
];

export default function VisualHelpGuide({ isOpen, onClose, initialSection }: Props) {
  const [activeStep, setActiveStep] = useState(0);

  useEffect(() => {
    if (!isOpen) return;
    if (initialSection) {
      const index = SLIDES.findIndex((s) => s.section === initialSection);
      setActiveStep(index !== -1 ? index : 0);
    } else {
      setActiveStep(0);
    }
  }, [isOpen, initialSection]);

  if (!isOpen) return null;

  const slide = SLIDES[activeStep];
  const handleNext = () => setActiveStep((s) => Math.min(s + 1, SLIDES.length - 1));
  const handlePrev = () => setActiveStep((s) => Math.max(s - 1, 0));

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 overflow-y-auto" dir="rtl">
      <div className="fixed inset-0 bg-black/90 backdrop-blur-md transition-opacity duration-300" onClick={onClose} />

      <div className="relative bg-zinc-950 border border-zinc-800 rounded-3xl w-full max-w-3xl shadow-[0_0_50px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col max-h-[90vh] z-10">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-zinc-800 bg-black/40">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-amber-500/20 border border-amber-500/40 rounded-xl flex items-center justify-center text-amber-400">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-md md:text-lg font-black text-white">راهنمای تصویری نرم‌افزار مدیریت گیم‌نت</h2>
              <p className="text-xs text-zinc-500 mt-0.5 font-medium">آموزش گام‌به‌گام هر بخش از BAZINO PRO</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 hover:text-white flex items-center justify-center transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Notice */}
        <div className="bg-amber-500/10 border-b border-amber-500/20 px-6 py-3 text-amber-200 text-xs leading-relaxed flex items-center gap-3">
          <Info className="w-4 h-4 text-amber-400 shrink-0" />
          <p className="font-semibold">
            با دکمه‌ی «راهنما» بالای صفحه، این راهنما رو از ابتدا ببینید؛ یا از نوار راهنمای بالای هر بخش، مستقیم راهنمای همون بخش رو باز کنید.
          </p>
        </div>

        {/* Slide content */}
        <div className="flex-grow overflow-y-auto p-6 space-y-5">
          <div className="flex items-center gap-2.5">
            <span className="p-2 bg-amber-500/10 border border-amber-500/30 text-amber-400 rounded-xl">
              <slide.icon className="w-5 h-5" />
            </span>
            <span className="text-xs font-black text-amber-400 font-mono bg-amber-500/5 px-2.5 py-1 rounded-lg">
              گام {activeStep + 1} از {SLIDES.length}
            </span>
          </div>

          <h3 className="text-md md:text-lg font-black text-white">{slide.title}</h3>
          <h4 className="text-xs font-black text-amber-400/90 leading-relaxed">{slide.subtitle}</h4>
          <p className="text-zinc-300 text-xs md:text-sm leading-relaxed font-medium">{slide.description}</p>

          <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800 space-y-2">
            <span className="text-[10px] font-black text-purple-400 uppercase tracking-widest block">
              نکته / ترفند
            </span>
            <p className="text-zinc-400 text-xs leading-relaxed">{slide.tip}</p>
          </div>

          {/* Step dots */}
          <div className="flex items-center justify-center gap-2 pt-2">
            {SLIDES.map((s, i) => (
              <button
                key={s.section}
                onClick={() => setActiveStep(i)}
                title={s.title}
                className={`h-2 rounded-full transition-all ${
                  i === activeStep ? 'w-6 bg-amber-500' : 'w-2 bg-zinc-700 hover:bg-zinc-600'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Navigation */}
        <div className="flex items-center gap-3 p-6 pt-4 border-t border-zinc-800 shrink-0">
          <button
            disabled={activeStep === 0}
            onClick={handlePrev}
            className="flex-1 py-3 bg-zinc-900 hover:bg-zinc-800 disabled:opacity-30 border border-zinc-800 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2"
          >
            <ArrowRight className="w-4 h-4" />
            <span>قبلی</span>
          </button>
          <button
            disabled={activeStep === SLIDES.length - 1}
            onClick={handleNext}
            className="flex-1 py-3 bg-amber-500 hover:bg-amber-400 disabled:opacity-30 text-zinc-950 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2"
          >
            <span>بعدی</span>
            <ArrowLeft className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
