import React, { useState, useEffect } from 'react';
import { useModalDismiss } from '../utils/useModalDismiss';
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
import { L } from '../utils/i18n';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  mode: 'admin' | 'gamenet';
  initialSection?: string;
  language: 'fa' | 'en' | 'ru' | 'tr';
  dir: 'rtl' | 'ltr';
}

export default function VisualHelpGuide({ isOpen, onClose, mode, initialSection, language, dir }: Props) {
  useModalDismiss(isOpen, onClose);
  const [activeStep, setActiveStep] = useState(0);
  const [selectedHotspot, setSelectedHotspot] = useState<string | null>(null);


  // Define full onboarding slides for Admin Mode
  const adminSlides = [
    {
      title: L(language, { fa: '۱. داشبورد و رصدخانه مرکزی', en: '1. Central Command Dashboard', ru: '1. Центральная панель управления', tr: '1. Merkezi Komuta Paneli' }),
      subtitle: L(language, { fa: 'مدیریت زنده درآمد، کاربران فعال و پینگ سالن', en: 'Real-time monitoring of revenue, active players and salon latency', ru: 'Мониторинг дохода, активных игроков и пинга зала в реальном времени', tr: 'Gelir, aktif oyuncular ve salon gecikmesinin gerçek zamanlı izlenmesi' }),
      description: L(language, { fa: 'در این بخش آمار مالی، تعداد تراکنش‌ها و نمودارهای توزیع کاربران در ۲۴ ساعت گذشته نمایش داده می‌شود. پینگ لحظه‌ای ارتباط سرور با نودهای کلاینت در اینجا رصد می‌گردد.', en: 'Displays financial statistics, transaction counts and gamer distribution charts over the last 24 hours. Monitor direct server latency with client nodes here.', ru: 'Здесь отображаются финансовая статистика, число транзакций и графики распределения игроков за последние 24 часа. Пинг сервера с клиентскими узлами отслеживается тут же.', tr: 'Son 24 saatin finansal istatistikleri, işlem sayıları ve oyuncu dağılım grafikleri burada görüntülenir. Sunucu ile istemci düğümleri arasındaki anlık gecikme buradan izlenir.' }),
      icon: Activity,
      highlight: 'dashboard',
      mockup: 'dashboard'
    },
    {
      title: L(language, { fa: '۲. مانیتورینگ هوشمند کلاینت‌ها (سیستم‌ها)', en: '2. Smart Client Monitoring & Control', ru: '2. Умный мониторинг и контроль клиентов', tr: '2. Akıllı İstemci İzleme ve Kontrol' }),
      subtitle: L(language, { fa: 'کنترل از راه دور، قفل صفحه، شارژ کیف‌پول و مانیتورینگ PCها', en: 'Remote control, screen locking, wallet billing and PC stats', ru: 'Удалённое управление, блокировка экрана, кошелёк и статистика ПК', tr: 'Uzaktan kontrol, ekran kilidi, cüzdan yükleme ve PC izleme' }),
      description: L(language, { fa: 'سیستم‌های کلوپ (PC و کنسول‌ها) را به صورت لحظه‌ای مشاهده کنید. می‌توانید وضعیت اتصال، زمان باقی‌مانده و نرخ ساعتی هر سیستم را تغییر داده یا دستور خاموش/روشن ارسال کنید.', en: 'View gaming stations (PCs & Consoles) in real-time. Lock/unlock screens, monitor remaining time, configure hourly rates, or send remote power signals.', ru: 'Смотрите игровые станции (ПК и консоли) в реальном времени. Блокируйте экраны, следите за оставшимся временем, настраивайте почасовые тарифы или отправляйте сигналы питания.', tr: 'Kulüp sistemlerini (PC ve konsollar) anlık olarak görün. Bağlantı durumunu, kalan süreyi ve saatlik ücreti değiştirin ya da uzaktan açma/kapatma komutu gönderin.' }),
      icon: Monitor,
      highlight: 'systems',
      mockup: 'systems'
    },
    {
      title: L(language, { fa: '۳. مدیریت هوشمند سفارشات بوفه و کافه', en: '3. Intelligent Cafe Buffet & Orders', ru: '3. Умное управление заказами кафе и буфета', tr: '3. Akıllı Kafe Büfe Sipariş Yönetimi' }),
      subtitle: L(language, { fa: 'بروزرسانی وضعیت سفارشات و مدیریت خودکار انبار کافه', en: 'Update order dispatch statuses & automated cafe inventory control', ru: 'Обновление статусов заказов и автоматический учёт склада кафе', tr: 'Sipariş durumlarını güncelleme ve otomatik kafe stok yönetimi' }),
      description: L(language, { fa: 'سفارشات ارسالی از سمت گیمرها را به صورت زنده دریافت کنید. وضعیت آن‌ها را به «در حال آماده‌سازی» یا «تحویل داده شده» تغییر دهید تا هزینه به فاکتور کلاینت اضافه شود.', en: 'Receive live snack/food orders from active gamers. Instantly update order status to "Preparing" or "Completed" to sync with client billing.', ru: 'Получайте заказы игроков в реальном времени. Меняйте статус на «Готовится» или «Доставлен», чтобы сумма попала в счёт клиента.', tr: 'Oyunculardan gelen siparişleri canlı alın. Durumlarını «Hazırlanıyor» veya «Teslim Edildi» olarak değiştirin; tutar istemci faturasına eklensin.' }),
      icon: Coffee,
      highlight: 'cafe',
      mockup: 'cafe'
    },
    {
      title: L(language, { fa: '۴. انبارداری قطعات و سخت‌افزار گیمینگ', en: '4. Accessory Storehouse & Gaming Gear', ru: '4. Склад комплектующих и игрового оборудования', tr: '4. Donanım ve Oyun Ekipmanı Deposu' }),
      subtitle: L(language, { fa: 'کنترل موجودی انبار، ثبت تجهیزات و کدهای تخفیف باشگاه', en: 'Stock control, hardware inventory & club redemption codes', ru: 'Контроль остатков, учёт оборудования и промокоды клуба', tr: 'Stok kontrolü, ekipman kaydı ve kulüp indirim kodları' }),
      description: L(language, { fa: 'قطعات و لوازم جانبی (کیبورد، هدست، ماوس) موجود در فروشگاه گیم‌نت را مدیریت کنید. گیمرها می‌توانند امتیازات خود را برای خرید این قطعات مبادله کنند.', en: 'Manage premium peripherals (keyboards, headsets, mice) available in the store. Gamers can redeem their earned loyalty points for store items.', ru: 'Управляйте периферией (клавиатуры, гарнитуры, мыши) в магазине клуба. Игроки могут обменивать накопленные баллы на эти товары.', tr: 'Mağazadaki çevre birimlerini (klavye, kulaklık, fare) yönetin. Oyuncular kazandıkları puanları bu ürünlerle takas edebilir.' }),
      icon: ShoppingBag,
      highlight: 'shop',
      mockup: 'shop'
    },
    {
      title: L(language, { fa: '۵. زمان‌بندی براکت مسابقات (Esports)', en: '5. Esports Tournaments & Brackets', ru: '5. Расписание турнирных сеток (Esports)', tr: '5. Turnuva Eşleşme Planlaması (Esports)' }),
      subtitle: L(language, { fa: 'ساخت مسابقات جدید، تعیین حق ورودی و ثبت لیدرهای تیم', en: 'Create tournaments, set entry fees & register team leaders', ru: 'Создание турниров, вступительные взносы и регистрация капитанов', tr: 'Yeni turnuva oluşturma, giriş ücreti belirleme ve takım liderlerini kaydetme' }),
      description: L(language, { fa: 'بزرگ‌ترین تورنمنت‌های محلی و استانی را با چند کلیک تعریف کنید. سقف تیم‌ها، حق ورودی و تاریخ برگزاری را مشخص کرده و لیست شرکت‌کنندگان را مشاهده نمایید.', en: 'Organize major local esports tournaments with a few clicks. Specify team limits, entry fees, start dates, and track registered teams easily.', ru: 'Организуйте крупные локальные турниры в пару кликов. Задайте лимит команд, взнос, дату проведения и следите за списком участников.', tr: 'En büyük yerel turnuvaları birkaç tıkla tanımlayın. Takım limitini, giriş ücretini ve tarihi belirleyip katılımcı listesini görüntüleyin.' }),
      icon: Trophy,
      highlight: 'tournaments',
      mockup: 'tournaments'
    }
  ];

  // Define full onboarding slides for GameNet Client Mode
  const gamenetSlides = [
    {
      title: L(language, { fa: '۱. رزرو آنی سیستم‌های گیمینگ', en: '1. Instant Gaming Station Booking', ru: '1. Мгновенное бронирование игровых станций', tr: '1. Anında Oyun İstasyonu Rezervasyonu' }),
      subtitle: L(language, { fa: 'انتخاب پلتفرم، سیستم‌های VIP و رزرو ساعت نبرد', en: 'Choose platforms, select VIP rigs & book your battle time', ru: 'Выбор платформы, VIP-станций и времени игры', tr: 'Platform seçimi, VIP sistemler ve savaş saatini ayırtma' }),
      description: L(language, { fa: 'به راحتی سیستم مورد نظر خود (PC، پی‌اس‌۵ یا شبیه‌ساز رانندگی) را انتخاب کنید، پکیج ساعتی دلخواه را برگزینید و با اعمال تخفیف رزرو خود را قطعی نمایید.', en: 'Easily select your preferred gaming rig (PC, PS5, or Simulator), choose hourly packages, apply active coupons and finalize your booking.', ru: 'Легко выберите нужную станцию (ПК, PS5 или симулятор), почасовой пакет, примените скидку и подтвердите бронь.', tr: 'İstediğiniz sistemi (PC, PS5 veya sürüş simülatörü) kolayca seçin, saatlik paketi belirleyin ve indirim uygulayarak rezervasyonunuzu kesinleştirin.' }),
      icon: Monitor,
      highlight: 'reservations',
      mockup: 'reservations'
    },
    {
      title: L(language, { fa: '۲. سفارش آنلاین از بوفه کافه', en: '2. Direct Cafe Ordering', ru: '2. Онлайн-заказ из кафе', tr: '2. Kafe Büfeden Online Sipariş' }),
      subtitle: L(language, { fa: 'سفارش انواع نوشیدنی انرژی‌زا، برگر و اسنک از روی صندلی', en: 'Order energy drinks, burgers & snacks straight to your desk', ru: 'Энергетики, бургеры и снеки прямо к вашему месту', tr: 'Enerji içeceği, burger ve atıştırmalıkları koltuğunuzdan sipariş edin' }),
      description: L(language, { fa: 'نیازی به بلند شدن از پشت سیستم نیست! منوی کافه را باز کنید، سفارش خود را ثبت نمایید تا پرسنل سالن آن را در سریع‌ترین زمان ممکن به صندلی شما تحویل دهند.', en: 'No need to leave your setup! Open the cafe menu, order snacks or drinks, and our staff will deliver them directly to your desk.', ru: 'Не нужно вставать из-за компьютера! Откройте меню кафе, оформите заказ — персонал доставит его к вашему месту максимально быстро.', tr: 'Sistemin başından kalkmanıza gerek yok! Kafe menüsünü açın, siparişinizi verin; salon personeli en kısa sürede koltuğunuza teslim etsin.' }),
      icon: Coffee,
      highlight: 'cafe',
      mockup: 'user-cafe'
    },
    {
      title: L(language, { fa: '۳. باشگاه مشتریان وفادار (Loyalty Club)', en: '3. Gamers Loyalty Club & Levels', ru: '3. Клуб лояльности (Loyalty Club)', tr: '3. Sadık Müşteri Kulübü (Loyalty Club)' }),
      subtitle: L(language, { fa: 'کسب امتیاز با هر بازی، افزایش سطح کاربری و کدهای تخفیف', en: 'Earn XP, upgrade gamer level & redeem cash-back coupons', ru: 'Баллы за каждую игру, рост уровня и промокоды', tr: 'Her oyunda puan kazanma, seviye yükseltme ve indirim kodları' }),
      description: L(language, { fa: 'با هر ساعت بازی در سالن یا خرید از بوفه، امتیاز وفاداری (XP) دریافت کنید. با افزایش سطح خود می‌توانید امتیازات را به کدهای تخفیف یا ورودی رایگان مسابقات تبدیل کنید.', en: 'Earn loyalty points (XP) for every hour played or snack ordered. Level up your gamer profile and convert points to discount coupons or free entry keys.', ru: 'Получайте баллы лояльности (XP) за каждый час игры или покупку в буфете. Повышая уровень, обменивайте баллы на промокоды или бесплатный вход на турниры.', tr: 'Salondaki her oyun saati veya büfe alışverişinde sadakat puanı (XP) kazanın. Seviyeniz yükseldikçe puanları indirim koduna veya ücretsiz turnuva girişine dönüştürün.' }),
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
          { id: 'revenue', x: '18%', y: '25%', title: L(language, { fa: 'درآمد کل روز', en: 'Total Revenue', ru: 'Доход за день', tr: 'Günlük Toplam Gelir' }), desc: L(language, { fa: 'مجموع درآمد حاصل از رزروها، خرید بوفه و انبار کلوپ با سیستم همگام‌سازی ابری.', en: 'Aggregated earnings from reservations, cafe and store synced with database.', ru: 'Суммарный доход от броней, буфета и склада клуба с облачной синхронизацией.', tr: 'Rezervasyon, büfe ve kulüp deposundan elde edilen toplam gelir; bulut senkronizasyonlu.' }) },
          { id: 'active', x: '52%', y: '25%', title: L(language, { fa: 'کلاینت‌های متصل', en: 'Connected Clients', ru: 'Подключённые клиенты', tr: 'Bağlı İstemciler' }), desc: L(language, { fa: 'نمایش تعداد لحظه‌ای گیمرهای متصل به شبکه محلی گیم‌نت.', en: 'Live count of gamers currently playing inside the gaming LAN.', ru: 'Текущее число игроков, подключённых к локальной сети клуба.', tr: 'Oyun salonu yerel ağına bağlı oyuncuların anlık sayısı.' }) },
          { id: 'chart', x: '45%', y: '65%', title: L(language, { fa: 'نمودار اوج مصرف', en: 'Peak Traffic Chart', ru: 'График пиковой нагрузки', tr: 'Yoğunluk Grafiği' }), desc: L(language, { fa: 'نمایش ساعات شلوغی سالن جهت بهینه‌سازی شیفت کاری اپراتورها.', en: 'Visualizes busiest hours in the club to help schedule operator shifts.', ru: 'Показывает часы наибольшей загрузки зала для оптимизации смен операторов.', tr: 'Operatör vardiyalarını optimize etmek için salonun en yoğun saatlerini gösterir.' }) }
        ];
      case 'systems':
        return [
          { id: 'power', x: '25%', y: '32%', title: L(language, { fa: 'روشن/خاموش از راه دور', en: 'Remote Power Signal', ru: 'Удалённое включение/выключение', tr: 'Uzaktan Aç/Kapat' }), desc: L(language, { fa: 'ارسال سیگنال خاموش، ریستارت یا لاگ‌آوت مستقیم به کلاینت‌های تحت شبکه.', en: 'Send direct shutdown, reboot, or forced logout commands to any client PC.', ru: 'Отправка команд выключения, перезагрузки или выхода напрямую на клиенты в сети.', tr: 'Ağdaki istemcilere doğrudan kapatma, yeniden başlatma veya oturum kapatma sinyali gönderme.' }) },
          { id: 'time', x: '75%', y: '32%', title: L(language, { fa: 'تایمر مانیتورینگ', en: 'Active Session Timer', ru: 'Таймер мониторинга', tr: 'İzleme Zamanlayıcısı' }), desc: L(language, { fa: 'نمایش دقیق زمان باقیمانده حساب هر کاربر با آلارم صوتی در دقایق پایانی.', en: 'Shows exact time remaining for the user session with built-in voice alert.', ru: 'Точное оставшееся время сеанса каждого пользователя со звуковым сигналом в последние минуты.', tr: 'Her kullanıcının kalan süresini son dakikalarda sesli uyarıyla birlikte tam olarak gösterir.' }) },
          { id: 'rates', x: '50%', y: '75%', title: L(language, { fa: 'تنظیمات نرخ ساعتی', en: 'Hourly Rates Config', ru: 'Настройки почасовых тарифов', tr: 'Saatlik Ücret Ayarları' }), desc: L(language, { fa: 'تعریف نرخ پویای معمولی و VIP بر اساس ساعات پیک یا تخفیف‌های شبانه.', en: 'Configure dynamic hourly rates for standard and VIP setups based on times.', ru: 'Динамические тарифы для обычных и VIP-станций в зависимости от пиковых часов и ночных скидок.', tr: 'Yoğun saatlere veya gece indirimlerine göre standart ve VIP için dinamik ücret tanımlama.' }) }
        ];
      case 'cafe':
        return [
          { id: 'pending', x: '25%', y: '25%', title: L(language, { fa: 'سفارشات جدید بوفه', en: 'New Incoming Orders', ru: 'Новые заказы буфета', tr: 'Yeni Büfe Siparişleri' }), desc: L(language, { fa: 'سفارشات جدید به همراه شماره سیستم و نام مشتری در صف آماده‌سازی.', en: 'Lists newly submitted snacks with target PC station number and gamer tag.', ru: 'Новые заказы с номером станции и именем клиента в очереди на приготовление.', tr: 'Sistem numarası ve müşteri adıyla birlikte hazırlık kuyruğundaki yeni siparişler.' }) },
          { id: 'stocks', x: '75%', y: '75%', title: L(language, { fa: 'انبار مکانیزه کافه', en: 'Automated Cafe Stocks', ru: 'Автоматизированный склад кафе', tr: 'Otomatik Kafe Stoğu' }), desc: L(language, { fa: 'کاهش خودکار موجودی انبار کافه (نوشیدنی، انرژی‌زا، چیپس) بلافاصله پس از ثبت نهایی.', en: 'Instantly decrements inventory count for sodas and energy drinks upon order completion.', ru: 'Автоматическое списание остатков кафе (напитки, энергетики, чипсы) сразу после подтверждения.', tr: 'Nihai onaydan hemen sonra kafe stoğunun (içecek, enerji içeceği, cips) otomatik düşülmesi.' }) }
        ];
      case 'reservations':
        return [
          { id: 'grid', x: '45%', y: '45%', title: L(language, { fa: 'جدول زمان‌بندی صندلی‌ها', en: 'Station Timeline Grid', ru: 'Сетка расписания станций', tr: 'İstasyon Zaman Çizelgesi' }), desc: L(language, { fa: 'جدول گرافیکی هوشمند با امکان درگ و دراپ زمان رزرو برای انواع سیستم‌ها.', en: 'Visual interactive timeline to view, drag, and drop reservations across rigs.', ru: 'Умная графическая сетка с перетаскиванием времени брони для всех типов станций.', tr: 'Her sistem türü için rezervasyon saatlerini sürükle-bırak ile yönetebileceğiniz akıllı grafik tablo.' }) },
          { id: 'vip_badge', x: '82%', y: '22%', title: L(language, { fa: 'سیستم‌های VIP و فوق‌پیشرفته', en: 'VIP High-End Rigs', ru: 'VIP и топовые станции', tr: 'VIP ve Üst Düzey Sistemler' }), desc: L(language, { fa: 'تفاوت قیمت‌گذاری خودکار بر اساس سخت‌افزار (RTX 4090) و صندلی‌های گیمینگ راحتی.', en: 'Custom billing tiers automatically applied to premium setups featuring RTX 4090 graphics.', ru: 'Автоматическая разница в цене в зависимости от железа (RTX 4090) и комфортных игровых кресел.', tr: 'Donanıma (RTX 4090) ve konforlu oyuncu koltuklarına göre otomatik fiyat farkı.' }) }
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
                <span>{mode === 'admin' ? (L(language, { fa: 'راهنمای تصویری پنل مدیریت سایت', en: 'Admin Portal Visual Walkthrough', ru: 'Визуальный гид по админ-панели сайта', tr: 'Site Yönetim Paneli Görsel Rehberi' })) : (L(language, { fa: 'راهنمای کاربری و کلاینت بازینو پرو', en: 'Gamer Interface User Manual', ru: 'Руководство пользователя и клиента Bazino Pro', tr: 'Bazino Pro Kullanıcı ve İstemci Rehberi' }))}</span>
                <span className="text-[10px] bg-primary/10 border border-primary/20 text-primary px-2 py-0.5 rounded-md font-mono">V2.4</span>
              </h2>
              <p className="text-xs text-gray-400 mt-0.5 font-medium">
                {L(language, { fa: 'آموزش تصویری، نکات فنی و سناریوهای مدیریتی کلوپ', en: 'Interactive blueprints, operational workflows and server diagrams', ru: 'Наглядное обучение, технические советы и сценарии управления клубом', tr: 'Görsel eğitim, teknik ipuçları ve kulüp yönetim senaryoları' })}
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
            {L(language, { fa: 'با کلیک روی دکمه‌های راهنمای تصویری هر بخش، ترفندهای هوشمند مانیتورینگ سیستم‌ها و اتصالات دیتابیس را به صورت مصور و گام‌به‌گام فرا بگیرید.', en: 'Click help badges inside the panel to master remote management, inventory pipelines, and SQLite/EF Core database configurations.', ru: 'Нажимайте на кнопки визуального гида в каждом разделе, чтобы шаг за шагом освоить приёмы мониторинга систем и подключения базы данных.', tr: 'Her bölümdeki görsel rehber düğmelerine tıklayarak sistem izleme ve veritabanı bağlantısı ipuçlarını adım adım görsel olarak öğrenin.' })}
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
                  {L(language, { fa: `گام ${activeStep + 1} از ${slides.length}`, en: `Step ${activeStep + 1} of ${slides.length}`, ru: `Шаг ${activeStep + 1} из ${slides.length}`, tr: `Adım ${activeStep + 1} / ${slides.length}` })}
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
                <span className="text-[10px] font-black text-purple-400 uppercase tracking-widest block font-mono">{L(language, { fa: 'ترفند ویژه', en: 'Pro Tip', ru: 'Совет', tr: 'İpucu' })}</span>
                <p className="text-gray-400 text-xs leading-relaxed">
                  {mode === 'admin' 
                    ? (L(language, { fa: 'شما می‌توانید کلیه کارهای انبارداری، سفارش کافه و مانیتورینگ PC را از طریق این پنل مدیریت تحت کلاینت به صورت متمرکز انجام دهید.', en: 'You can control client power, logs and accessory stocks directly. Use hotkeys on physical PCs to send automatic alerts to this admin board.', ru: 'Все задачи склада, заказов кафе и мониторинга ПК можно централизованно выполнять через эту клиентскую админ-панель.', tr: 'Tüm depo, kafe siparişi ve PC izleme işlemlerini bu istemci tabanlı yönetim panelinden merkezi olarak yapabilirsiniz.' }))
                    : (L(language, { fa: 'با ارتقای سطح خود در باشگاه مشتریان، بازی‌های بیشتر و آفرهای هیجان‌انگیزتری در صفحه شخصی دریافت خواهید کرد!', en: 'Leveling up grants you multiplier boosters on loyalty XP. Spend points in the store tab to claim free peripheral gears.', ru: 'Повышая уровень в клубе лояльности, вы получите больше игр и ещё более интересные предложения в личном кабинете!', tr: 'Müşteri kulübünde seviyenizi yükselterek kişisel sayfanızda daha fazla oyun ve daha heyecanlı teklifler alırsınız!' }))}
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
                <span>{L(language, { fa: 'قبلی', en: 'Previous', ru: 'Назад', tr: 'Önceki' })}</span>
              </button>
              <button
                disabled={activeStep === slides.length - 1}
                onClick={handleNext}
                className="flex-1 py-3 bg-primary hover:bg-primary-hover disabled:opacity-30 text-black rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 cursor-pointer shadow-[0_0_15px_rgba(255,184,0,0.3)]"
              >
                <span>{L(language, { fa: 'بعدی', en: 'Next', ru: 'Далее', tr: 'Sonraki' })}</span>
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
              {L(language, { fa: 'راهنمای تصویری به زبان شیرین فارسی آماده است.', en: 'Full system visual onboarding manuals compiled successfully.', ru: 'Визуальное руководство готово.', tr: 'Görsel rehber hazır.' })}
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
              <span>{L(language, { fa: 'دانلود دفترچه چاپی PDF دسکتاپ', en: 'Download Print Manual PDF', ru: 'Скачать печатное руководство PDF', tr: 'Yazdırılabilir Masaüstü PDF Kılavuzunu İndir' })}</span>
            </a>
            
            <a 
              href="/Bazino_Pro_Mobile_Presentation.pdf"
              download="Bazino_Pro_Mobile_Presentation.pdf"
              className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/25 rounded-xl text-xs font-bold text-white flex items-center gap-1.5 transition-all transition-all cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-primary" />
              <span>{L(language, { fa: 'دانلود پی‌دی‌اف موبایل', en: 'Download Mobile PDF', ru: 'Скачать мобильный PDF', tr: 'Mobil PDF İndir' })}</span>
            </a>
          </div>
        </div>

      </div>
    </div>
  );
}
