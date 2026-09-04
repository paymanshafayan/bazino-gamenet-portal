import React, { useState } from 'react';
import { Download, Monitor, Smartphone, ExternalLink, Sparkles, FileText, CheckCircle, ShieldCheck, Eye } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { L } from '../utils/i18n';

interface Props {
  addNotification: (message: string, type: 'success' | 'error' | 'info') => void;
}

export default function PresentationTab({ addNotification }: Props) {
  const { dir, language } = useLanguage();
  const [activeMode, setActiveMode] = useState<'desktop' | 'mobile'>('desktop');

  const handleDownloadSuccess = (fileName: string) => {
    addNotification(
      L(language, { fa: `دانلود فایل ${fileName} با موفقیت شروع شد.`, en: `Started downloading ${fileName} successfully.`, ru: `Загрузка файла ${fileName} началась.`, tr: `${fileName} dosyasının indirilmesi başladı.` }),
      'success'
    );
  };

  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur-md p-6 md:p-8 animate-fade-in max-w-6xl mx-auto w-full" dir={dir}>
      
      {/* Header Info */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 mb-8 border-b border-white/10 pb-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-6 bg-primary rounded-full shadow-[0_0_12px_rgba(255,184,0,0.5)]"></span>
            <h2 className="text-xl md:text-2xl font-black text-white font-display">
              {L(language, { fa: 'اسلایدهای معرفی جامع سیستم مدیریت بازینو پرو', en: 'Bazino Pro System Presentation Slides', ru: 'Презентация системы управления Bazino Pro', tr: 'Bazino Pro Yönetim Sistemi Tanıtım Slaytları' })}
            </h2>
          </div>
          <p className="text-gray-400 text-xs md:text-sm font-medium leading-relaxed max-w-3xl">
            {L(language, { fa: 'توضیحات فنی، تجاری و معماری نرم‌افزار بازینو پرو (نسخه دسکتاپ و موبایل) به صورت اسلایدهای تعاملی و فایل‌های چاپی استاندارد PDF.', en: 'Technical, commercial and structural architecture details of Bazino Pro platform available in interactive slides and standard PDF prints.', ru: 'Технические, коммерческие и архитектурные детали платформы Bazino Pro (десктоп и мобильная версии) в виде интерактивных слайдов и печатных PDF.', tr: 'Bazino Pro platformunun (masaüstü ve mobil) teknik, ticari ve mimari detayları; etkileşimli slaytlar ve standart PDF çıktıları halinde.' })}
          </p>
        </div>

        {/* Presentation File Selection Toggle */}
        <div className="flex bg-black/40 border border-white/10 p-1 rounded-2xl self-start lg:self-auto shrink-0">
          <button
            onClick={() => setActiveMode('desktop')}
            className={`px-4 py-2.5 rounded-xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer ${
              activeMode === 'desktop'
                ? 'bg-primary text-black font-extrabold shadow-[0_0_12px_rgba(255,184,0,0.4)]'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Monitor className="w-4 h-4" />
            <span>{L(language, { fa: 'نسخه دسکتاپ (۱۶:۹)', en: 'Desktop Version', ru: 'Десктоп-версия (16:9)', tr: 'Masaüstü Sürümü (16:9)' })}</span>
          </button>
          <button
            onClick={() => setActiveMode('mobile')}
            className={`px-4 py-2.5 rounded-xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer ${
              activeMode === 'mobile'
                ? 'bg-primary text-black font-extrabold shadow-[0_0_12px_rgba(255,184,0,0.4)]'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Smartphone className="w-4 h-4" />
            <span>{L(language, { fa: 'نسخه موبایل (عمودی)', en: 'Mobile Version', ru: 'Мобильная версия (вертикальная)', tr: 'Mobil Sürüm (Dikey)' })}</span>
          </button>
        </div>
      </div>

      {/* Crucial Notice regarding Code Editor File Explorer PDF Viewer */}
      <div className="mb-6 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-200 text-xs leading-relaxed flex items-start gap-3">
        <ShieldCheck className="w-5 h-5 shrink-0 text-amber-400 mt-0.5" />
        <div>
          <p className="font-bold">
            {L(language, { fa: 'راهنمای مشاهده فایل‌های PDF:', en: 'Notice about viewing PDF files:', ru: 'О просмотре PDF-файлов:', tr: 'PDF dosyalarını görüntüleme hakkında:' })}
          </p>
          <p className="mt-1">
            {L(language, { fa: 'محیط مرورگر به دلیل محدودیت امنیتی قادر به نمایش مستقیم فایل‌های باینری PDF نیست و پیغام "Failed to load PDF document" را نشان می‌دهد. فایل‌های تولید شده کاملا سالم هستند و می‌توانید آن‌ها را مستقیماً از دکمه‌های زیر دانلود کرده یا به صورت آنلاین اسلایدهای تعاملی را در زیر ورق بزنید.', en: 'The built-in file explorer inside the code editor cannot render binary PDF documents directly, resulting in "Failed to load PDF document". The files are 100% valid and correct. Please download them using the links below or view the interactive HTML version.', ru: 'Встроенный просмотрщик редактора кода не может напрямую отображать бинарные PDF и показывает «Failed to load PDF document». Файлы полностью корректны — скачайте их и откройте любым PDF-ридером.', tr: 'Kod düzenleyicinin yerleşik dosya görüntüleyicisi ikili PDF belgelerini doğrudan gösteremez ve “Failed to load PDF document” hatası verir. Dosyalar tamamen sağlamdır; indirip herhangi bir PDF okuyucuyla açın.' })}
          </p>
        </div>
      </div>

      {/* Main Download & Web View Container */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
        
        {/* Info & Direct Download Section */}
        <div className="lg:col-span-4 flex flex-col justify-between bg-dark-card border border-white/10 rounded-2xl p-6 space-y-6">
          <div className="space-y-4">
            <span className="px-2.5 py-1 text-[10px] bg-primary/25 border border-primary/50 text-primary font-black rounded-lg inline-block uppercase tracking-wider font-mono">
              {activeMode === 'desktop' ? 'DESKTOP-PDF-1.4' : 'MOBILE-PDF-1.4'}
            </span>
            <h3 className="text-md font-black text-white font-display uppercase">
              {activeMode === 'desktop' 
                ? (L(language, { fa: 'دانلود پی‌دی‌اف دسکتاپ', en: 'Download Desktop PDF', ru: 'Скачать PDF (десктоп)', tr: 'Masaüstü PDF’i İndir' }))
                : (L(language, { fa: 'دانلود پی‌دی‌اف نسخه موبایل', en: 'Download Mobile PDF', ru: 'Скачать PDF (мобильная)', tr: 'Mobil PDF’i İndir' }))}
            </h3>
            <p className="text-gray-400 text-xs leading-relaxed">
              {activeMode === 'desktop'
                ? (L(language, { fa: 'این فایل شامل ۲۴ اسلاید کامل با جزئیات فنی بک‌اند C# ASP.NET، ساختار دیتابیس، سناریوهای باشگاه مشتریان و نمودارهای پیشرفته مدیریت است.', en: 'Features 24 presentation slides containing detailed back-end models, database schemas, loyalty calculations and comprehensive admin views.', ru: '24 слайда с подробностями бэкенда C# ASP.NET, схемой базы данных, сценариями клуба лояльности и продвинутыми панелями администратора.', tr: 'C# ASP.NET arka uç detayları, veritabanı şeması, sadakat kulübü senaryoları ve gelişmiş yönetim panelleri içeren 24 tam slayt.' }))
                : (L(language, { fa: 'پرزنتیشن اختصاصی و واکنش‌گرا مناسب موبایل و تبلت با ساختار عمودی (فایل‌های گرافیکی سبک‌تر) جهت معرفی سیستم بازینو پرو به کارفرما.', en: 'Optimized vertical layout suited perfectly for phone screens. Offers complete modular explanations, designed for quick onboarding of clients.', ru: 'Адаптивная вертикальная презентация для телефонов и планшетов (более лёгкая графика) для представления Bazino Pro заказчику.', tr: 'Bazino Pro’yu müşteriye tanıtmak için telefon ve tabletlere uygun, dikey yapılı ve hafif grafikli duyarlı sunum.' }))}
            </p>

            <div className="pt-4 border-t border-white/15 space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-gray-300">
                <CheckCircle className="w-4 h-4 text-emerald-400" />
                <span>{L(language, { fa: 'فرمت فایل: PDF استاندارد چاپی', en: 'Format: Print-ready Standard PDF', ru: 'Формат: печатный PDF', tr: 'Dosya biçimi: Baskıya hazır standart PDF' })}</span>
              </div>
              <div className="flex items-center gap-2 text-xs font-bold text-gray-300">
                <CheckCircle className="w-4 h-4 text-emerald-400" />
                <span>
                  {L(language, { fa: `حجم فایل: ${activeMode === 'desktop' ? '۳.۰ مگابایت' : '۴.۲ مگابایت'}`, en: `File Size: ${activeMode === 'desktop' ? '3.0 MB' : '4.2 MB'}`, ru: `Размер файла: ${activeMode === 'desktop' ? '3,0 МБ' : '4,2 МБ'}`, tr: `Dosya boyutu: ${activeMode === 'desktop' ? '3,0 MB' : '4,2 MB'}` })}
                </span>
              </div>
            </div>
          </div>

          <div className="space-y-3 pt-6 border-t border-white/10">
            {/* Download PDF Button */}
            <a
              href={activeMode === 'desktop' ? '/Bazino_Pro_Presentation.pdf' : '/Bazino_Pro_Mobile_Presentation.pdf'}
              download={activeMode === 'desktop' ? 'Bazino_Pro_Presentation.pdf' : 'Bazino_Pro_Mobile_Presentation.pdf'}
              onClick={() => handleDownloadSuccess(activeMode === 'desktop' ? 'Bazino_Pro_Presentation.pdf' : 'Bazino_Pro_Mobile_Presentation.pdf')}
              className="w-full py-3.5 bg-primary hover:bg-primary-hover text-black font-black text-xs rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-[0_0_20px_rgba(255,184,0,0.3)] hover:scale-[1.02] active:scale-95"
            >
              <Download className="w-4 h-4" />
              <span>{L(language, { fa: 'دانلود فایل پی‌دی‌اف (PDF)', en: 'Download PDF File', ru: 'Скачать PDF-файл', tr: 'PDF Dosyasını İndir' })}</span>
            </a>

            {/* View HTML in New Tab */}
            <a
              href={activeMode === 'desktop' ? '/Bazino_Pro_Presentation.html' : '/Bazino_Pro_Mobile_Presentation.html'}
              target="_blank"
              rel="noreferrer"
              className="w-full py-3 bg-white/5 hover:bg-white/10 border border-white/15 hover:border-white/30 text-white font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <ExternalLink className="w-4 h-4 text-primary" />
              <span>{L(language, { fa: 'نمایش تمام‌صفحه تعاملی (HTML)', en: 'Full-Screen Presentation', ru: 'Полноэкранная презентация (HTML)', tr: 'Tam Ekran Etkileşimli Sunum (HTML)' })}</span>
            </a>
          </div>
        </div>

        {/* Live Responsive Frame Slider Viewer */}
        <div className="lg:col-span-8 flex flex-col gap-3">
          <div className="flex items-center justify-between px-2 text-xs text-gray-400 font-bold">
            <span className="flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-primary animate-pulse" />
              <span>{L(language, { fa: 'پیش‌نمایش آنلاین اسلایدهای تعاملی', en: 'Live Interactive Slides Preview', ru: 'Онлайн-превью интерактивных слайдов', tr: 'Etkileşimli Slaytların Canlı Önizlemesi' })}</span>
            </span>
            <span>{L(language, { fa: 'با کلیدهای چپ/راست کیبورد یا دکمه‌های زیر ورق بزنید', en: 'Use Swipe / Arrows to Navigate', ru: 'Листайте стрелками клавиатуры или кнопками ниже', tr: 'Klavye ok tuşları veya aşağıdaki düğmelerle gezinin' })}</span>
          </div>

          <div className="relative border border-white/15 rounded-2xl overflow-hidden bg-[#0a0b10] shadow-2xl flex-grow flex flex-col">
            {/* Aspect ratio frame holder for slide deck */}
            <div className={`w-full relative ${activeMode === 'desktop' ? 'aspect-[16/9]' : 'aspect-[3/4] max-h-[500px]'} bg-black`}>
              <iframe
                src={activeMode === 'desktop' ? '/Bazino_Pro_Presentation.html' : '/Bazino_Pro_Mobile_Presentation.html'}
                className="w-full h-full border-0 absolute inset-0"
                title="Interactive Slide Deck"
                allowFullScreen
              />
            </div>
            
            {/* Quick action info under slider */}
            <div className="p-4 bg-black/60 border-t border-white/10 flex items-center justify-between text-xs text-gray-400 font-semibold">
              <span>{L(language, { fa: 'ورق‌زدن با لمس یا دکمه‌های جهت‌نما', en: 'Navigate using touch gestures or keys', ru: 'Листайте касанием или клавишами', tr: 'Dokunarak veya yön tuşlarıyla gezinin' })}</span>
              <a 
                href={activeMode === 'desktop' ? '/Bazino_Pro_Presentation.html' : '/Bazino_Pro_Mobile_Presentation.html'}
                target="_blank" 
                rel="noreferrer" 
                className="text-primary hover:underline flex items-center gap-1"
              >
                <span>{L(language, { fa: 'بازکردن در صفحه جدید', en: 'Open standalone', ru: 'Открыть в новой вкладке', tr: 'Yeni sekmede aç' })}</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}
