import { OpsProvider } from '../../shared/management/context';
import { OrdersConsole } from '../../shared/management/Orders';
import React, { useState, useEffect, useRef } from 'react';
import { 
  BarChart3, 
  Monitor, 
  Coffee, 
  ShoppingBag, 
  Trophy, 
  Newspaper, 
  Database, 
  Layers, 
  Plus, 
  Check, 
  X, 
  FileText, 
  TrendingUp, 
  Users, 
  Coins, 
  Edit, 
  Save, 
  Settings, 
  Clock, 
  Trash2, 
  Sparkles, 
  ArrowLeft, 
  ArrowRight,
  ClipboardCopy,
  Mail,
  Bell,
  Send,
  Sliders,
  ChevronLeft,
  RefreshCw,
  Key,
  Globe,
  HelpCircle,
  MessageSquare,
  Smartphone,
  Download,
  LifeBuoy,
  Wallet,
  Megaphone,
  Ticket,
  Image as ImageIcon
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import ThemeScreenshot from './ThemeScreenshot';
import VisualHelpGuide from './VisualHelpGuide';
import AdminMobileAppDownloadPanel from './AdminMobileAppDownloadPanel';
import AdminSidebar from './admin/AdminSidebar';
import AdminKeysCenter from './admin/AdminKeysCenter';
import AdminGuide, { ADMIN_GUIDES } from './admin/AdminGuide';
import { groupForSection } from './admin/adminGroups';
import type { ThemeInfo } from '../themes';
import { invalidateServerThemeCache } from '../themes';
import {
  parseThemeZip,
  buildSampleThemeZip,
  buildThemeZip,
  downloadZip,
  type ParsedZipTheme
} from '../themes/zip';
import { L, localeOf } from '../utils/i18n';
import { adminSectionFromPath, pathFromAdminSection, navigateTo, type AdminSection } from '../utils/routes';
import { Search } from 'lucide-react';
import { LegalAdminSection } from '../legal/LegalAdminSection';

/** نام و کلیدواژه‌های هر بخش پنل — برای عنوان صفحه، هدر بخش و جستجوی سریع */
export const ADMIN_SECTION_META: Record<AdminSection, { fa: string; en: string; ru: string; tr: string; keywords: string }> = {
  dashboard:         { fa: 'داشبورد و آمار زنده', en: 'Dashboard & Live Stats', ru: 'Дашборд и живая статистика', tr: 'Gösterge Paneli ve Canlı İstatistikler', keywords: 'stats آمار statistics dashboard home' },
  jarvis:            { fa: 'جارویس — دستیار مدیر (AI)', en: 'Jarvis — Admin AI Assistant', ru: 'Джарвис — ИИ-помощник админа', tr: 'Jarvis — Yönetici AI Asistanı', keywords: 'ai جارویس jarvis assistant chatbot groq automation' },
  systems:           { fa: 'مدیریت کلاینت‌ها و سیستم‌ها', en: 'Clients & Systems', ru: 'Клиенты и системы', tr: 'İstemciler ve Sistemler', keywords: 'pc ps5 console کنسول کامپیوتر رزرو reservation station' },
  cafe:              { fa: 'بوفه و کافه', en: 'Cafe Buffet', ru: 'Кафе-буфет', tr: 'Kafe Büfe', keywords: 'menu منو غذا نوشیدنی food drink' },
  shop:              { fa: 'فروشگاه لوازم جانبی', en: 'Accessory Shop', ru: 'Магазин аксессуаров', tr: 'Ekipman Mağazası', keywords: 'products محصول کالا mouse headset' },
  tournaments:       { fa: 'مسابقات و تورنمنت‌ها', en: 'Tournaments', ru: 'Турниры', tr: 'Turnuvalar', keywords: 'match تورنمنت جایزه prize bracket' },
  tournamentOps:     { fa: 'مدیریت عملیاتی مسابقات', en: 'Tournament Operations', ru: 'Управление турнирами', tr: 'Turnuva Operasyonları', keywords: 'bracket براکت ثبت‌نام حضور نتیجه تیم checkin team result مساقات' },
  messaging:         { fa: 'پیامک گروهی', en: 'Bulk Messaging', ru: 'Рассылки', tr: 'Toplu Mesaj', keywords: 'sms پیامک وایبر واتساپ whatsapp viber کمپین تبلیغات گروهی messaggio campaign' },
  blog:              { fa: 'وبلاگ و اخبار', en: 'Blog & News', ru: 'Блог и новости', tr: 'Blog ve Haberler', keywords: 'article مقاله خبر post' },
  content:           { fa: 'استودیوی محتوا و انتشار', en: 'Content & Publish Queue', ru: 'Контент и очередь публикаций', tr: 'İçerik ve Yayın Kuyruğu', keywords: 'manus سوشیال social instagram telegram صف انتشار queue publish schedule زمانبندی' },
  promotions:        { fa: 'کوپن‌ها و ساعات رایگان/نیم‌بها', en: 'Coupons & Free/Half Hours', ru: 'Купоны и бесплатные/льготные часы', tr: 'Kuponlar ve Ücretsiz/Yarım Saatler', keywords: 'coupon کوپن تخفیف discount happy hour رایگان نیم‌بها ساعت ویژه' },
  chat:              { fa: 'اتاق‌های گفتگوی زنده', en: 'Live Chat Rooms', ru: 'Живые чат-комнаты', tr: 'Canlı Sohbet Odaları', keywords: 'room پیام گفتگو message' },
  messages:          { fa: 'پیام‌ها و اعلان‌ها', en: 'Messages & Notifications', ru: 'Сообщения и уведомления', tr: 'Mesajlar ve Bildirimler', keywords: 'notification ایمیل تماس contact inbox' },
  migrations:        { fa: 'مهاجرت‌های دیتابیس (EF Core)', en: 'Database Migrations', ru: 'Миграции БД', tr: 'Veritabanı Geçişleri', keywords: 'ef core sql schema جدول' },
  themes:            { fa: 'مدیریت قالب‌ها', en: 'Themes', ru: 'Темы', tr: 'Tema Yönetimi', keywords: 'theme zip css تم پوسته ظاهر skin color رنگ' },
  appSlider:         { fa: 'اسلایدر صفحه اصلی و اپ', en: 'Home & App Slider', ru: 'Слайдер главной и приложения', tr: 'Ana Sayfa ve Uygulama Slaytı', keywords: 'slider hero banner بنر اسلاید تصویر' },
  mobileAppDownload: { fa: 'دانلود اپلیکیشن موبایل', en: 'Mobile App Download', ru: 'Загрузка мобильного приложения', tr: 'Mobil Uygulama İndirme', keywords: 'apk android ios اپ موبایل' },
  customization:     { fa: 'سفارشی‌سازی سایت و اطلاعات کلوپ', en: 'Site Customization & Club Info', ru: 'Настройка сайта и данные клуба', tr: 'Site Özelleştirme ve Kulüp Bilgileri', keywords: 'settings تنظیمات آدرس تلفن logo address phone hours layout' },
  dbLogs:            { fa: 'لاگ‌های دیتابیس', en: 'Database Logs', ru: 'Логи БД', tr: 'Veritabanı Günlükleri', keywords: 'log گزارش خطا error query' },
  apiKeys:           { fa: 'کلیدهای API و اتصال‌ها', en: 'API Keys & Integrations', ru: 'API-ключи и интеграции', tr: 'API Anahtarları ve Entegrasyonlar', keywords: 'token jarvis web sync کلید اتصال integration' },
  presentation:      { fa: 'پرزنتیشن', en: 'Presentation', ru: 'Презентация', tr: 'Sunum', keywords: 'slides معرفی pitch' },
  tickets:           { fa: 'تیکت‌های پشتیبانی', en: 'Support Tickets', ru: 'Обращения в поддержку', tr: 'Destek Talepleri', keywords: 'support help ticket پشتیبانی تیکت destek' },
  wallet:            { fa: 'کیف پول و پرداخت حضوری', en: 'Wallet & On-site Payments', ru: 'Кошелёк и оплата на месте', tr: 'Cüzdan ve Mekânda Ödeme', keywords: 'wallet onsite cash pos payment کیف پول پرداخت حضوری cüzdan ödeme' },
  affiliates:        { fa: 'همکاری در فروش', en: 'Affiliate Marketing', ru: 'Партнёрский маркетинг', tr: 'Satış Ortaklığı', keywords: 'affiliate referral commission همکار معرفی کمیسیون ref کمپین کمپین‌ها campaign squad دعوت اینستاگرام instagram پورسانت کد معرف لینک همکاری' },
};

const PresentationTab = React.lazy(() => import('./PresentationTab'));
const AdminTicketsSection = React.lazy(() => import('./AdminTicketsSection'));
const AdminWalletSection = React.lazy(() => import('./AdminWalletSection'));
const AdminAffiliatesSection = React.lazy(() => import('./AdminAffiliatesSection'));
const PromotionsConsole = React.lazy(async () => ({ default: (await import('../../shared/management/Promotions')).PromotionsConsole as unknown as React.ComponentType }));
const JarvisConsole = React.lazy(async () => ({ default: (await import('../../shared/management/Jarvis')).JarvisConsole as unknown as React.ComponentType }));
const TournamentsOpsConsole = React.lazy(async () => ({ default: (await import('../../shared/management/Tournaments')).TournamentsConsole as unknown as React.ComponentType }));
const AdminTournamentPlanner = React.lazy(() => import('./admin/AdminTournamentPlanner'));
const AdminMessagingPanel = React.lazy(() => import('./admin/AdminMessagingPanel'));
const ContentOpsConsole = React.lazy(async () => ({ default: (await import('../../shared/management/Content')).ContentConsole as unknown as React.ComponentType }));

interface Props {
  themeId?: string;
  setThemeId?: (id: string) => void;
  availableThemes?: ThemeInfo[];
  setAvailableThemes?: React.Dispatch<React.SetStateAction<ThemeInfo[]>>;
  /** بعد از نصب/حذف قالب روی سرور، App لیست سروری را دوباره می‌خواند */
  refreshServerThemes?: () => void;
  addNotification: (message: string, type: 'success' | 'error' | 'info') => void;
  layoutMode?: 'classic' | 'hub';
  setLayoutMode?: (mode: 'classic' | 'hub') => void;
}

export default function AdminPanelTab({ 
  addNotification, 
  themeId, 
  setThemeId, 
  availableThemes = [], 
  setAvailableThemes,
  refreshServerThemes,
  layoutMode = 'classic',
  setLayoutMode
}: Props) {
  const { language, dir } = useLanguage();
  // بخش فعال از آدرس مرورگر خوانده می‌شود (/admin/<section>) تا رفرش همان بخش را باز کند
  const [activeSubTab, setActiveSubTabState] = useState<AdminSection>(() => adminSectionFromPath(window.location.pathname));
  const setActiveSubTab = (sec: AdminSection) => {
    setActiveSubTabState(sec);
    navigateTo(pathFromAdminSection(sec));
  };
  useEffect(() => {
    // اولین ورود از طریق دکمه (آدرس هنوز /admin نیست) → آدرس را بدون افزودن به تاریخچه اصلاح کن
    if (!window.location.pathname.startsWith('/admin')) navigateTo(pathFromAdminSection(activeSubTab), true);
    const onPop = () => setActiveSubTabState(adminSectionFromPath(window.location.pathname));
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);
  // عنوان تب مرورگر = نام بخش فعال
  useEffect(() => {
    const prev = document.title;
    const name = L(language, ADMIN_SECTION_META[activeSubTab]);
    document.title = `${name} | ${L(language, { fa: 'پنل مدیریت بازینو', en: 'Bazino Admin', ru: 'Админ Bazino', tr: 'Bazino Yönetim' })}`;
    return () => { document.title = prev; };
  }, [activeSubTab, language]);
  // جستجوی سریع بخش‌ها
  const [sectionQuery, setSectionQuery] = useState('');
  const [isSectionSearchOpen, setIsSectionSearchOpen] = useState(false);
  // شمارندهٔ تیکت‌های در انتظار پاسخ برای نشان (badge) منوی کناری
  const [openTicketCount, setOpenTicketCount] = useState(0);
  useEffect(() => {
    let cancelled = false;
    const poll = () => fetch('/api/admin/tickets?status=open').then(r => (r.ok ? r.json() : null)).then(d => { if (!cancelled && d) setOpenTicketCount(d.openCount || 0); }).catch(() => {});
    poll();
    const id = window.setInterval(poll, 60_000);
    return () => { cancelled = true; window.clearInterval(id); };
  }, [activeSubTab]);
  const sectionSearchRef = useRef<HTMLDivElement | null>(null);
  const sectionMatches = (() => {
    const q = sectionQuery.trim().toLowerCase();
    if (!q) return [] as AdminSection[];
    return (Object.keys(ADMIN_SECTION_META) as AdminSection[]).filter((k) => {
      const m = ADMIN_SECTION_META[k];
      return [k, m.fa, m.en, m.ru, m.tr, m.keywords].join(' ').toLowerCase().includes(q);
    });
  })();
  useEffect(() => {
    const onDoc = (e: MouseEvent) => { if (sectionSearchRef.current && !sectionSearchRef.current.contains(e.target as Node)) setIsSectionSearchOpen(false); };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);
  const [isLocalHelpOpen, setIsLocalHelpOpen] = useState(false);
  const themeUploadPanelRef = useRef<HTMLDivElement | null>(null);
  
  // Real-time server states
  const [stats, setStats] = useState<any>(null);
  const [systems, setSystems] = useState<any[]>([]);
  const [cafeItems, setCafeItems] = useState<any[]>([]);
  const [accessories, setAccessories] = useState<any[]>([]);
  const [tournaments, setTournaments] = useState<any[]>([]);
  const [articles, setArticles] = useState<any[]>([]);
  const [chatRooms, setChatRooms] = useState<string[]>([]);
  const [newChatRoomName, setNewChatRoomName] = useState('');
  const [appSliders, setAppSliders] = useState<any[]>([]);
  const [migrationsCode, setMigrationsCode] = useState<string>('');
  const [dbLogsList, setDbLogsList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [jarvisAiProviders, setJarvisAiProviders] = useState<any[]>([]);
  const [isSavingJarvisProviders, setIsSavingJarvisProviders] = useState(false);
  const [syncApiKey, setSyncApiKey] = useState('');
  const [syncApiKeyMasked, setSyncApiKeyMasked] = useState('');
  const [isSyncKeyConfigured, setIsSyncKeyConfigured] = useState(false);
  const [isSavingSyncKey, setIsSavingSyncKey] = useState(false);

  // Customization & Settings states
  const [siteSettings, setSiteSettings] = useState<Record<string, string>>({});
  const [isResettingDb, setIsResettingDb] = useState(false);
  // آپلود تصاویر سفارشی قالب هاب (اسلات‌های تزئینی — theme_img.<slot>)
  const [themeImgBusy, setThemeImgBusy] = useState<string | null>(null);
  // فرم شارژ دستی کردیت بازینو (تا نهایی شدن روش‌های کسب کردیت)
  const [grantUsername, setGrantUsername] = useState('');
  const [grantDelta, setGrantDelta] = useState('');
  const [grantNote, setGrantNote] = useState('');
  const [grantBusy, setGrantBusy] = useState(false);

  // Data source state (sample ⇄ database)
  const [dataSource, setDataSource] = useState<'sample' | 'database'>('sample');
  const [dataSourceInfo, setDataSourceInfo] = useState<{ sample: Record<string, number>; database: Record<string, number> } | null>(null);
  const [isSwitchingDataSource, setIsSwitchingDataSource] = useState(false);

  // Theme upload/creation states
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [uploadMode, setUploadMode] = useState<'zip' | 'quick'>('zip');
  const [newThemeName, setNewThemeName] = useState('');
  const [newThemePrimary, setNewThemePrimary] = useState('#1bc2ca');
  const [newThemeBg, setNewThemeBg] = useState('#0b1125');
  const [newThemeCard, setNewThemeCard] = useState('#121a30');

  // ZIP theme install states
  const [zipFileName, setZipFileName] = useState('');
  const [zipParsed, setZipParsed] = useState<ParsedZipTheme | null>(null);
  /** شناسه‌ی موجود که فایل انتخاب‌شده آن را به‌روزرسانی می‌کند (نصب نسخه‌ی جدید) */
  const [zipReplacesExisting, setZipReplacesExisting] = useState<ThemeInfo | null>(null);
  const [storageStatus, setStorageStatus] = useState<any>(null);
  const [zipFileBytes, setZipFileBytes] = useState<Uint8Array | null>(null);
  const [zipError, setZipError] = useState('');
  const [isParsingZip, setIsParsingZip] = useState(false);
  const [isInstallingZip, setIsInstallingZip] = useState(false);
  /** job نصب اِسنک (پاسخ 202 سرور): وضعیت/پیشرفت برای پولینگ و نمایش progress */
  const [installJob, setInstallJob] = useState<{ jobId: string; status: string; filesDone: number; filesTotal: number } | null>(null);

  // Messages form and states
  const [recipient, setRecipient] = useState('All');
  const [msgTitle, setMsgTitle] = useState('');
  const [msgBody, setMsgBody] = useState('');
  const [sendAsNotification, setSendAsNotification] = useState(false);
  const [registeredUsers, setRegisteredUsers] = useState<any[]>([]);
  const [messagesList, setMessagesList] = useState<any[]>([]);

  // Form states for adding items
  const [newSystem, setNewSystem] = useState({ name: '', type: 'PC', hourlyRate: 25000, isActive: true, audience: '' });
  const [newCafe, setNewCafe] = useState({ name: '', category: 'Foods', price: 50000, imageUrl: '', mobileImageUrl: '', autoGenerateMobile: true, inventory: 20, isAvailable: true });
  const [newAccessory, setNewAccessory] = useState({ name: '', description: '', price: 1000, imageUrl: '', mobileImageUrl: '', autoGenerateMobile: true, stock: 5, category: 'Keyboard' });
  const [newTournament, setNewTournament] = useState({ title: '', game: '', registrationFee: 100000, startDate: '۱۴۰۵/۰۵/۰۱', maxTeams: 8 });
  const [newArticle, setNewArticle] = useState({ title: '', content: '', category: 'News', imageUrl: '', mobileImageUrl: '', autoGenerateMobile: true });

  // Slider form states
  const [newSlideUrl, setNewSlideUrl] = useState('');
  const [newSlideMobileUrl, setNewSlideMobileUrl] = useState('');
  const [newSlideAutoMobile, setNewSlideAutoMobile] = useState(true);
  const [newSlideTarget, setNewSlideTarget] = useState('reserve');
  const [newSlideTitleFa, setNewSlideTitleFa] = useState('');
  const [newSlideTitleEn, setNewSlideTitleEn] = useState('');
  const [newSlideTitleRu, setNewSlideTitleRu] = useState('');
  const [newSlideTitleTr, setNewSlideTitleTr] = useState('');
  const [newSlideDesc, setNewSlideDesc] = useState<{ fa: string; en: string; ru: string; tr: string }>({ fa: '', en: '', ru: '', tr: '' });
  const [editingSlideId, setEditingSlideId] = useState<string | null>(null);

  // Section Editor states
  const [selectedSectionKey, setSelectedSectionKey] = useState('genres');
  const [secIsEnabled, setSecIsEnabled] = useState(true);
  const [secTitleFa, setSecTitleFa] = useState('');
  const [secTitleEn, setSecTitleEn] = useState('');
  const [secTitleRu, setSecTitleRu] = useState('');
  const [secTitleTr, setSecTitleTr] = useState('');
  const [secDescFa, setSecDescFa] = useState('');
  const [secDescEn, setSecDescEn] = useState('');
  const [secDescRu, setSecDescRu] = useState('');
  const [secDescTr, setSecDescTr] = useState('');

  // Helper to get default section texts
  const getDefaultSectionTitle = (key: string, lang: 'fa' | 'en' | 'ru' | 'tr') => {
    const defaults: Record<string, Record<string, string>> = {
      genres: { fa: 'داستان نبرد خود را انتخاب کنید', en: 'CHOOSE YOUR ARENA STORY', ru: 'ВЫБЕРИТЕ СВОЮ АРЕНУ', tr: 'ARENA HİKAYENİZİ SEÇİN' },
      services: { fa: 'امکانات و بخش‌های ویژه سالن بازی نو', en: 'OUR PREMIUM LOUNGE SERVICES', ru: 'НАШИ ПРЕМИАЛЬНЫЕ УСЛУГИ', tr: 'PREMIUM LOUNGE HİZMETLERİMİZ' },
      matches: { fa: 'جدول نتایج و رتبه‌بندی رقابت‌ها', en: 'LIVE MATCH RESULTS BOARD', ru: 'ТАБЛИЦА РЕЗУЛЬТАТОВ МАТЧЕЙ', tr: 'CANLI MAÇ SONUÇLARI PANOSU' },
      tournaments: { fa: 'تورنمنت‌های فعال و ثبت‌نام سریع', en: 'ACTIVE TOURNAMENTS & FAST BRACKETS', ru: 'АКТИВНЫЕ ТУРНИРЫ', tr: 'AKTİF TURNUVALAR' },
      pricing: { fa: 'بسته‌های زمانی و کارت‌های عضویت', en: 'LOUNGE PASSES & PRICING TICKETS', ru: 'АБОНЕМЕНТЫ И ЦЕНЫ', tr: 'FİYATLANDIRMA VE GİRİŞ BİLETLERİ' },
      coaches: { fa: 'مربیان حرفه‌ای و پرسنل کلوپ', en: 'MEET OUR EXPERT COACHES', ru: 'НАШИ ПРОФЕССИОНАЛЬНЫЕ ТРЕНЕРЫ', tr: 'UZMAN ANTRENÖRLERİMİZ' },
      address: { fa: 'نشانی و راه‌های ارتباطی با ما', en: 'OUR LOCATION & SUPPORT COMMAND', ru: 'НАШ АДРЕС И КОНТАКТЫ', tr: 'KONUMUMUZ VE DESTEK HATTI' }
    };
    return defaults[key]?.[lang] || defaults[key]?.['en'] || '';
  };

  const getDefaultSectionDesc = (key: string, lang: 'fa' | 'en' | 'ru' | 'tr') => {
    const defaults: Record<string, Record<string, string>> = {
      genres: { 
        fa: 'محبوب‌ترین دسته‌بندی بازی‌ها مجهز به کانفیگ اختصاصی و ریگ‌های پرقدرت گیمینگ آماده اجرای حماسی‌ترین نبردهای شماست.', 
        en: 'Immerse yourself in world-class gaming experiences customized for the most popular competitive and open-world titles.',
        ru: 'Погрузитесь в игровой опыт мирового класса, настроенный для самых популярных соревновательных дисциплин.',
        tr: 'En popüler rekabetçi ve açık dünya oyunları için özelleştirilmiş birinci sınıf oyun deneyimlerine dalın.'
      },
      services: { 
        fa: 'در کلوپ بازی نو، بخش‌های مختلفی متناسب با سلیقه شما طراحی شده است. از سیستم‌های دسکتاپ تا شبیه‌سازها و کنسول‌های پیشرفته.', 
        en: 'Explore our multi-zone premium gaming infrastructure engineered for standard setups, high-refresh desktop gaming, and simulator cockpits.',
        ru: 'Исследуйте нашу премиальную игровую инфраструктуру, разработанную для обычных ПК, арен и автосимуляторов.',
        tr: 'Standart kurulumlar, yüksek yenileme hızına sahip masaüstü oyunları ve simülatör kokpitleri için tasarlanmış çok bölgeli premium oyun altyapımızı keşfedin.'
      },
      matches: { 
        fa: 'نتایج آخرین دیدارهای گیمرها در کلوپ بازینو به همراه وضعیت برندگان، پینگ لحظه‌ای و امتیازهای کسب شده.', 
        en: 'Stay updated with live scores from continuing match-ups, player statistics, and direct game status logs inside the salon.',
        ru: 'Следите за результатами матчей в реальном времени, статистикой игроков и статусом игрового зала.',
        tr: 'Salondaki güncel maç skorları, oyuncu istatistikleri ve doğrudan oyun durumu günlükleri ile güncel kalın.'
      },
      tournaments: { 
        fa: 'همراه تیمی خود ثبت‌نام کنید، حریفان را در براکت‌های آنلاین حذف کنید و جوایز نقدی کلوپ وفاداری را از آن خود سازید.', 
        en: 'Challenge elite local squads, win massive cash prize pools and bonus loyalty rewards, and climb to legendary status.',
        ru: 'Регистрируйтесь с командой, побеждайте соперников, выигрывайте денежные призы и бонусы клуба.',
        tr: 'Seçkin yerel takımlara meydan okuyun, büyük nakit ödül havuzları ve bonus sadakat ödülleri kazanın ve efsanevi statüye yükselin.'
      },
      pricing: { 
        fa: 'با خرید پکیج‌های بهینه، تا ۵۰ درصد هزینه بر ساعت بازی خود را کاهش دهید و ردبول رایگان و امتیاز کلوپ وفاداری جایزه بگیرید.', 
        en: 'Get up to 50% discount per hour by choosing our high-value passes packed with energy drinks and loyalty boosters.',
        ru: 'Получите скидку до 50% в час, выбирая наши абонементы, наполненные энергетиками и бонусами.',
        tr: 'Enerji içecekleri ve sadakat destekleri ile dolu yüksek değerli geçiş kartlarımızı seçerek saat başına %50\'ye varan indirim kazanın.'
      },
      coaches: { 
        fa: 'گروه مربیان برتر و سازمان‌دهندگان سالن بازی نو آماده هدایت شما برای پیروزی در تورنمنت‌ها و ساختن کلن‌های حرفه‌ای هستند.', 
        en: 'Our elite instructors and staff are dedicated to helping you optimize your gaming gear, build clan structures, and dominate.',
        ru: 'Наши сертифицированные тренеры помогут вам оптимизировать девайсы, собрать команду и доминировать в матчах.',
        tr: 'Seçkin eğitmenlerimiz ve personelimiz, oyun donanımınızı optimize etmenize, klan yapıları oluşturmanıza ve hükmetmenize yardımcı olmaya kendini adamıştır.'
      },
      address: { 
        fa: 'بازی نو مکانی ایده‌آل برای گردهمایی گیمرهای حرفه‌ای و برگزاری پرشورترین تورنمنت‌ها با تجهیزاتی کلاس جهانی است.', 
        en: 'Visit our high-tech lounge anytime to play with absolute low latency, order premium snacks straight to your desk, and enjoy absolute comfort.',
        ru: 'Посетите наш киберклуб в любое время для игры с низким пингом и непревзойденным комфортом.',
        tr: 'Düşük gecikme süresiyle oynamak, premium atıştırmalıklar sipariş etmek ve mutlak konforun tadını çıkarmak için yüksek teknolojili salonumuzu istediğiniz zaman ziyaret edin.'
      }
    };
    return defaults[key]?.[lang] || defaults[key]?.[lang === 'fa' ? 'fa' : 'en'] || '';
  };

  useEffect(() => {
    if (!siteSettings) return;
    setSecIsEnabled(siteSettings[`section_${selectedSectionKey}_enabled`] !== 'false');
    setSecTitleFa(siteSettings[`section_${selectedSectionKey}_title_fa`] || getDefaultSectionTitle(selectedSectionKey, 'fa'));
    setSecTitleEn(siteSettings[`section_${selectedSectionKey}_title_en`] || getDefaultSectionTitle(selectedSectionKey, 'en'));
    setSecTitleRu(siteSettings[`section_${selectedSectionKey}_title_ru`] || getDefaultSectionTitle(selectedSectionKey, 'ru'));
    setSecTitleTr(siteSettings[`section_${selectedSectionKey}_title_tr`] || getDefaultSectionTitle(selectedSectionKey, 'tr'));
    setSecDescFa(siteSettings[`section_${selectedSectionKey}_desc_fa`] || getDefaultSectionDesc(selectedSectionKey, 'fa'));
    setSecDescEn(siteSettings[`section_${selectedSectionKey}_desc_en`] || getDefaultSectionDesc(selectedSectionKey, 'en'));
    setSecDescRu(siteSettings[`section_${selectedSectionKey}_desc_ru`] || getDefaultSectionDesc(selectedSectionKey, 'ru'));
    setSecDescTr(siteSettings[`section_${selectedSectionKey}_desc_tr`] || getDefaultSectionDesc(selectedSectionKey, 'tr'));
  }, [selectedSectionKey, siteSettings]);

  // Load backend data on load or tab switch
  const fetchData = async () => {
    try {
      setLoading(true);
      const [resStats, resSys, resCafe, resAcc, resTour, resArt, resMig, resUsers, resMsgs, resSliders, resSettings, resDbLogs, resChatRooms] = await Promise.all([
        fetch('/api/admin/stats').then(r => r.json()),
        fetch('/api/systems').then(r => r.json()),
        fetch('/api/cafe').then(r => r.json()),
        fetch('/api/accessories').then(r => r.json()),
        fetch('/api/tournaments').then(r => r.json()),
        fetch('/api/articles').then(r => r.json()),
        fetch('/api/csharp/migrations').then(r => r.text()).then(text => ({ migrationsCode: text })).catch(() => ({ migrationsCode: '' })),
        fetch('/api/admin/users').then(r => r.json()),
        fetch('/api/messages').then(r => r.json()),
        fetch('/api/app-sliders').then(r => r.json()),
        fetch('/api/settings').then(r => r.json()),
        fetch('/api/admin/db-logs').then(r => r.json()).catch(() => ({ logs: [] })),
        fetch('/api/chat/rooms').then(r => r.json()).catch(() => []),
      ]);

      setStats(resStats);
      setSystems(resSys);
      setCafeItems(resCafe);
      setAccessories(resAcc);
      setTournaments(resTour);
      setArticles(resArt);
      setChatRooms(resChatRooms || []);
      setRegisteredUsers(resUsers || []);
      setMessagesList(resMsgs || []);
      setAppSliders(resSliders || []);
      setSiteSettings(resSettings || {});
      if (resDbLogs && resDbLogs.logs) {
        setDbLogsList(resDbLogs.logs);
      }
      if (resMig && resMig.migrationsCode) {
        setMigrationsCode(resMig.migrationsCode);
      }
    } catch (error) {
      console.error('Failed to load admin stats:', error);
      addNotification(L(language, { fa: 'خطا در برقراری ارتباط با سرور دات‌نت/اکسپرس', en: 'Failed to connect to the .NET/Express server', ru: 'Не удалось подключиться к серверу .NET/Express', tr: '.NET/Express sunucusuna bağlanılamadı' }), 'error');
    } finally {
      setLoading(false);
    }
  };

  // Social media list state sync
  const [socialMediaList, setSocialMediaList] = useState<any[]>([]);
  const [newSocialPlatform, setNewSocialPlatform] = useState('instagram');
  const [newSocialName, setNewSocialName] = useState('');
  const [newSocialUrl, setNewSocialUrl] = useState('');
  const [editingSocialId, setEditingSocialId] = useState<string | null>(null);

  useEffect(() => {
    try {
      if (siteSettings['social_media_links']) {
        setSocialMediaList(JSON.parse(siteSettings['social_media_links']));
      } else {
        setSocialMediaList([
          { id: '1', name: 'Instagram', platform: 'instagram', url: 'https://instagram.com/bazino' },
          { id: '2', name: 'Telegram', platform: 'telegram', url: 'https://t.me/bazino' },
          { id: '3', name: 'YouTube', platform: 'youtube', url: 'https://youtube.com/bazino' }
        ]);
      }
    } catch (e) {
      console.error('Failed to parse social_media_links:', e);
    }
  }, [siteSettings]);

  const loadSyncSettings = async () => {
    try {
      const res = await fetch('/api/admin/sync-settings');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'load failed');
      setIsSyncKeyConfigured(Boolean(data.configured));
      setSyncApiKeyMasked(data.masked || '');
      setSyncApiKey('');
    } catch (e) {
      addNotification(L(language, { fa: 'خطا در دریافت تنظیمات Web Sync', en: 'Failed to load Web Sync settings', ru: 'Не удалось загрузить настройки Web Sync', tr: 'Web Sync ayarları yüklenemedi' }), 'error');
    }
  };

  const saveSyncApiKey = async (generate = false) => {
    setIsSavingSyncKey(true);
    try {
      const res = await fetch('/api/admin/sync-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(generate ? { generate: true } : { apiKey: syncApiKey }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'save failed');
      setSyncApiKey(data.apiKey || '');
      setSyncApiKeyMasked(data.masked || '');
      setIsSyncKeyConfigured(true);
      addNotification(L(language, { fa: 'کلید Web Sync ذخیره شد؛ همین مقدار را در برنامه دسکتاپ وارد کنید.', en: 'Web Sync key saved; enter this value in the desktop app.', ru: 'Ключ Web Sync сохранён; введите это значение в десктоп-приложении.', tr: 'Web Sync anahtarı kaydedildi; bu değeri masaüstü uygulamasına girin.' }), 'success');
    } catch (e) {
      addNotification(L(language, { fa: 'کلید Web Sync ذخیره نشد', en: 'Web Sync key could not be saved', ru: 'Не удалось сохранить ключ Web Sync', tr: 'Web Sync anahtarı kaydedilemedi' }), 'error');
    } finally {
      setIsSavingSyncKey(false);
    }
  };

  const copySyncApiKey = async () => {
    if (!syncApiKey) return;
    await navigator.clipboard.writeText(syncApiKey);
    addNotification(L(language, { fa: 'کلید کپی شد', en: 'Key copied', ru: 'Ключ скопирован', tr: 'Anahtar kopyalandı' }), 'success');
  };

  const loadJarvisProviders = async () => {
    try {
      const data = await fetch('/api/admin/jarvis-ai-providers').then(r => r.json());
      const list = Array.isArray(data.providers) ? data.providers : [];
      setJarvisAiProviders(list.length ? list : [
        { id: 'provider-1', provider: 'groq', label: 'Groq fast fallback', model: 'llama-3.1-8b-instant', apiKey: '', baseUrl: '', enabled: true },
        { id: 'provider-2', provider: 'openrouter', label: 'OpenRouter free fallback', model: 'meta-llama/llama-3.1-8b-instruct:free', apiKey: '', baseUrl: '', enabled: false },
        { id: 'provider-3', provider: 'gemini', label: 'Gemini fallback', model: 'gemini-3.6-flash', apiKey: '', baseUrl: '', enabled: false },
      ]);
    } catch (e) {
      addNotification(L(language, { fa: 'خطا در دریافت مدل‌های جارویس', en: 'Failed to load Jarvis providers', ru: 'Не удалось загрузить модели Jarvis', tr: 'Jarvis modelleri yüklenemedi' }), 'error');
    }
  };

  useEffect(() => {
    if (activeSubTab === 'apiKeys') {
      void loadJarvisProviders();
      void loadSyncSettings();
    }
  }, [activeSubTab]);

  const updateJarvisProvider = (index: number, patch: Record<string, any>) => {
    setJarvisAiProviders(prev => prev.map((p, i) => i === index ? { ...p, ...patch } : p));
  };

  const saveJarvisProviders = async () => {
    setIsSavingJarvisProviders(true);
    try {
      const res = await fetch('/api/admin/jarvis-ai-providers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ providers: jarvisAiProviders.slice(0, 3) })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'save failed');
      setJarvisAiProviders(data.providers || jarvisAiProviders);
      addNotification(L(language, { fa: 'مدل‌های جایگزین جارویس ذخیره شد', en: 'Jarvis AI providers saved', ru: 'Резервные модели Jarvis сохранены', tr: 'Jarvis yapay zekâ modelleri kaydedildi' }), 'success');
    } catch (e) {
      addNotification(L(language, { fa: 'خطا در ذخیره مدل‌های جارویس', en: 'Failed to save Jarvis providers', ru: 'Не удалось сохранить модели Jarvis', tr: 'Jarvis modelleri kaydedilemedi' }), 'error');
    } finally {
      setIsSavingJarvisProviders(false);
    }
  };

  const handleSaveSetting = async (key: string, value: string) => {
    try {
      const response = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, value })
      });
      const data = await response.json();
      if (data.success) {
        setSiteSettings(prev => ({ ...prev, [key]: value }));
        addNotification(L(language, { fa: 'تنظیمات با موفقیت ذخیره شد', en: 'Setting saved successfully', ru: 'Настройка успешно сохранена', tr: 'Ayar başarıyla kaydedildi' }), 'success');
        return true;
      } else {
        addNotification(L(language, { fa: 'خطا در ذخیره تنظیمات', en: 'Error saving setting', ru: 'Ошибка сохранения настройки', tr: 'Ayar kaydedilirken hata oluştu' }), 'error');
        return false;
      }
    } catch (err) {
      console.error(err);
      addNotification(L(language, { fa: 'خطا در ذخیره تنظیمات', en: 'Error saving setting', ru: 'Ошибка сохранения настройки', tr: 'Ayar kaydedilirken hata oluştu' }), 'error');
      return false;
    }
  };

  // آپلود تصویر سفارشی برای اسلات‌های تزئینی قالب هاب: فایل → WebP سرور → تنظیم theme_img.<slot>
  const handleThemeImageUpload = async (slot: string, file: File) => {
    if (!file.type.startsWith('image/')) {
      addNotification(L(language, { fa: 'فقط فایل تصویری مجاز است', en: 'Only image files are allowed', ru: 'Разрешены только изображения', tr: 'Sadece görsel dosyaları kabul edilir' }), 'error');
      return;
    }
    setThemeImgBusy(slot);
    try {
      const res = await fetch(`/api/admin/theme-image?slot=${encodeURIComponent(slot)}`, {
        method: 'POST',
        headers: { 'Content-Type': file.type || 'image/jpeg' },
        body: await file.arrayBuffer(),
      });
      const data = await res.json().catch(() => ({} as any));
      if (res.ok && data.success && data.url) {
        const saved = await handleSaveSetting(`theme_img.${slot}`, data.url);
        if (saved) return;
        throw new Error('save failed');
      }
      throw new Error(data.error || `HTTP ${res.status}`);
    } catch (err) {
      console.error(err);
      addNotification(L(language, { fa: 'خطا در بارگذاری تصویر قالب', en: 'Error uploading theme image', ru: 'Ошибка загрузки изображения темы', tr: 'Tema görseli yüklenirken hata oluştu' }), 'error');
    } finally {
      setThemeImgBusy(null);
    }
  };

  const handleGrantCredits = async (e: React.FormEvent) => {
    e.preventDefault();
    const delta = Math.trunc(Number(grantDelta));
    if (!grantUsername.trim() || !Number.isSafeInteger(delta) || delta === 0) {
      addNotification(L(language, { fa: 'نام کاربری و مبلغ معتبر وارد کنید.', en: 'Enter a valid username and amount.', ru: 'Введите имя пользователя и сумму.', tr: 'Geçerli bir kullanıcı adı ve tutar girin.' }), 'error');
      return;
    }
    setGrantBusy(true);
    try {
      const res = await fetch('/api/admin/credits/adjust', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: grantUsername.trim(), delta, note: grantNote.trim() }),
      }).then(r => r.json());
      if (res.success) {
        addNotification(L(language, { fa: `کردیت ${res.username} به‌روز شد؛ موجودی: ${Number(res.credits).toLocaleString()} BC`, en: `Credits updated for ${res.username}; balance: ${Number(res.credits).toLocaleString()} BC`, ru: `Кредиты ${res.username} обновлены; баланс: ${Number(res.credits).toLocaleString()} BC`, tr: `${res.username} kredileri güncellendi; bakiye: ${Number(res.credits).toLocaleString()} BC` }), 'success');
        setGrantUsername(''); setGrantDelta(''); setGrantNote('');
      } else {
        addNotification(res.error || 'Failed', 'error');
      }
    } catch (err) {
      addNotification(L(language, { fa: 'خطا در شارژ کردیت', en: 'Failed to adjust credits', ru: 'Не удалось изменить кредиты', tr: 'Kredi ayarlanamadı' }), 'error');
    } finally {
      setGrantBusy(false);
    }
  };

  const handleSaveSection = async (
    sectionKey: string, 
    fields: { isEnabled: boolean; titleFa: string; titleEn: string; titleRu?: string; titleTr?: string; descFa: string; descEn: string; descRu?: string; descTr?: string }
  ) => {
    try {
      const updates = [
        { key: `section_${sectionKey}_enabled`, value: String(fields.isEnabled) },
        { key: `section_${sectionKey}_title_fa`, value: fields.titleFa },
        { key: `section_${sectionKey}_title_en`, value: fields.titleEn },
        { key: `section_${sectionKey}_title_ru`, value: fields.titleRu || '' },
        { key: `section_${sectionKey}_title_tr`, value: fields.titleTr || '' },
        { key: `section_${sectionKey}_desc_fa`, value: fields.descFa },
        { key: `section_${sectionKey}_desc_en`, value: fields.descEn },
        { key: `section_${sectionKey}_desc_ru`, value: fields.descRu || '' },
        { key: `section_${sectionKey}_desc_tr`, value: fields.descTr || '' },
      ];
      
      await Promise.all(updates.map(upd => 
        fetch('/api/admin/settings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(upd)
        }).then(r => r.json())
      ));

      setSiteSettings(prev => {
        const next = { ...prev };
        updates.forEach(upd => {
          next[upd.key] = upd.value;
        });
        return next;
      });

      addNotification(L(language, { fa: `تنظیمات بخش با موفقیت بروزرسانی شد`, en: `Section settings updated successfully`, ru: `Настройки раздела успешно обновлены`, tr: `Bölüm ayarları başarıyla güncellendi` }), 'success');
    } catch (err) {
      console.error(err);
      addNotification(L(language, { fa: 'خطا در ذخیره تنظیمات بخش', en: 'Failed to save section settings', ru: 'Не удалось сохранить настройки раздела', tr: 'Bölüm ayarları kaydedilemedi' }), 'error');
    }
  };

  const handleAddSocial = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSocialName || !newSocialUrl) return;
    const newItem = {
      id: 'social-' + Date.now(),
      name: newSocialName,
      platform: newSocialPlatform,
      url: newSocialUrl
    };
    const updatedList = [...socialMediaList, newItem];
    setSocialMediaList(updatedList);
    
    await handleSaveSetting('social_media_links', JSON.stringify(updatedList));
    setNewSocialName('');
    setNewSocialUrl('');
  };

  const handleEditSocialSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSocialId || !newSocialName || !newSocialUrl) return;
    const updatedList = socialMediaList.map(item => {
      if (item.id === editingSocialId) {
        return {
          ...item,
          name: newSocialName,
          platform: newSocialPlatform,
          url: newSocialUrl
        };
      }
      return item;
    });
    setSocialMediaList(updatedList);
    const ok = await handleSaveSetting('social_media_links', JSON.stringify(updatedList));
    if (ok) {
      setEditingSocialId(null);
      setNewSocialName('');
      setNewSocialUrl('');
      setNewSocialPlatform('instagram');
      addNotification(L(language, { fa: 'لینک اجتماعی با موفقیت ویرایش شد', en: 'Social link updated successfully', ru: 'Соцссылка успешно обновлена', tr: 'Sosyal bağlantı başarıyla güncellendi' }), 'success');
    }
  };

  const startEditSocial = (item: any) => {
    setEditingSocialId(item.id);
    setNewSocialName(item.name);
    setNewSocialPlatform(item.platform);
    setNewSocialUrl(item.url);
    addNotification(L(language, { fa: 'پیوند اجتماعی جهت ویرایش بارگذاری شد', en: 'Social link loaded for editing', ru: 'Соцссылка загружена для редактирования', tr: 'Sosyal bağlantı düzenleme için yüklendi' }), 'info');
  };

  const cancelEditSocial = () => {
    setEditingSocialId(null);
    setNewSocialName('');
    setNewSocialUrl('');
    setNewSocialPlatform('instagram');
  };

  const handleDeleteSocial = async (id: string) => {
    const updatedList = socialMediaList.filter(item => item.id !== id);
    setSocialMediaList(updatedList);
    await handleSaveSetting('social_media_links', JSON.stringify(updatedList));
    if (editingSocialId === id) {
      cancelEditSocial();
    }
  };

  const handleResetDatabase = async () => {
    if (!window.confirm(L(language, { fa: '⚠️ هشدار جدی! آیا واقعاً می‌خواهید کل پایگاه داده را ریست کرده و اطلاعات نمونه اولیه را مجدداً نصب کنید؟ تمامی تغییرات، محصولات کافه، تجهیزات، رزروها و تنظیمات شما حذف خواهند شد.', en: '⚠️ Warning! Are you sure you want to completely reset and reseed the database? All custom database rows and settings will be wiped.', ru: '⚠️ Внимание! Вы действительно хотите полностью сбросить базу данных и заново установить образцы данных? Все пользовательские записи и настройки будут удалены.', tr: '⚠️ Uyarı! Veritabanını tamamen sıfırlayıp örnek verileri yeniden yüklemek istediğinize emin misiniz? Tüm özel kayıtlar ve ayarlar silinecek.' }))) {
      return;
    }
    
    try {
      setIsResettingDb(true);
      const res = await fetch('/api/admin/reset-database', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        addNotification(L(language, { fa: 'پایگاه داده با موفقیت ریست شد و اطلاعات نمونه اولیه نصب گردید.', en: 'Database reset successfully.', ru: 'База данных сброшена, образцы данных установлены.', tr: 'Veritabanı başarıyla sıfırlandı ve örnek veriler yüklendi.' }), 'success');
        await fetchData();
      } else {
        addNotification(L(language, { fa: 'خطا در ریست دیتابیس', en: 'Failed to reset database', ru: 'Не удалось сбросить базу данных', tr: 'Veritabanı sıfırlanamadı' }), 'error');
      }
    } catch (e) {
      console.error(e);
      addNotification(L(language, { fa: 'خطا در برقراری ارتباط با سرور', en: 'Connection error', ru: 'Ошибка соединения с сервером', tr: 'Sunucu bağlantı hatası' }), 'error');
    } finally {
      setIsResettingDb(false);
    }
  };

  const handlePurgeDatabase = async () => {
    if (!window.confirm(L(language, { fa: '⚠️ هشدار بسیار جدی! آیا واقعاً می‌خواهید تمامی اطلاعات نمونه (از جمله بازی‌ها، غذاها، تجهیزات، رزروها، اسلایدرها و مقالات) را کاملاً پاک کنید؟ دیتابیس به حالت کاملاً خام و خالی باز خواهد گشت. حساب‌های کاربری مدیر و روت جهت دسترسی شما حفظ خواهند شد.', en: '⚠️ Critical Warning! Are you sure you want to permanently delete all sample database rows (tournaments, products, custom sliders, reservations, articles)? The database will be returned to a completely blank, empty state. Only admin and root accounts will be kept to ensure you don\'t lose access.', ru: '⚠️ Критическое предупреждение! Вы действительно хотите безвозвратно удалить все образцы данных (турниры, товары, оборудование, брони, слайды и изображения)? Это действие нельзя отменить.', tr: '⚠️ Çok ciddi uyarı! Tüm örnek verileri (turnuvalar, ürünler, ekipmanlar, rezervasyonlar, slaytlar ve görseller) kalıcı olarak silmek istediğinize emin misiniz? Bu işlem geri alınamaz.' }))) {
      return;
    }
    
    try {
      setIsResettingDb(true);
      const res = await fetch('/api/admin/clear-database', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        addNotification(L(language, { fa: 'تمامی اطلاعات نمونه و تصاویر با موفقیت حذف شدند و دیتابیس کاملاً پاک‌سازی شد.', en: 'All sample info and sliders have been completely purged.', ru: 'Все образцы данных и изображения удалены, база полностью очищена.', tr: 'Tüm örnek veriler ve görseller silindi, veritabanı tamamen temizlendi.' }), 'success');
        await fetchData();
      } else {
        addNotification(L(language, { fa: 'خطا در پاک‌سازی دیتابیس', en: 'Failed to purge database', ru: 'Не удалось очистить базу данных', tr: 'Veritabanı temizlenemedi' }), 'error');
      }
    } catch (e) {
      console.error(e);
      addNotification(L(language, { fa: 'خطا در برقراری ارتباط با سرور', en: 'Connection error', ru: 'Ошибка соединения с сервером', tr: 'Sunucu bağlantı hatası' }), 'error');
    } finally {
      setIsResettingDb(false);
    }
  };

  const [isTranslating, setIsTranslating] = useState(false);

  const handleAITranslate = async (
    text: string, 
    sourceLang: 'fa' | 'en', 
    onSuccess: (translations: { fa: string; en: string; ru: string; tr: string }) => void
  ) => {
    if (!text || !text.trim()) {
      addNotification(
        L(language, { fa: 'لطفاً ابتدا متنی را به یکی از دو زبان فارسی یا انگلیسی بنویسید', en: 'Please enter text in Persian or English first', ru: 'Сначала введите текст на персидском или английском', tr: 'Lütfen önce Farsça veya İngilizce bir metin yazın' }), 
        'error'
      );
      return;
    }
    try {
      setIsTranslating(true);
      const res = await fetch('/api/admin/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, sourceLang })
      }).then(r => r.json());

      if (res.success && res.translations) {
        onSuccess(res.translations);
        addNotification(
          L(language, { fa: 'ترجمه و تولید خودکار سایر زبان‌ها با موفقیت انجام شد!', en: 'Translations generated successfully!', ru: 'Переводы на остальные языки успешно сгенерированы!', tr: 'Diğer diller başarıyla otomatik çevrildi ve oluşturuldu!' }), 
          'success'
        );
      } else {
        addNotification(L(language, { fa: 'خطا در برقراری ارتباط با سرویس ترجمه', en: 'Translation service error', ru: 'Ошибка связи с сервисом перевода', tr: 'Çeviri servisine bağlanılamadı' }), 'error');
      }
    } catch (err) {
      console.error(err);
      addNotification(L(language, { fa: 'خطا در ارتباط با سرور', en: 'Connection error', ru: 'Ошибка соединения с сервером', tr: 'Sunucu bağlantı hatası' }), 'error');
    } finally {
      setIsTranslating(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!msgTitle || !msgBody) {
      addNotification(L(language, { fa: 'لطفاً موضوع و متن پیام را وارد کنید', en: 'Please fill in title and body', ru: 'Введите тему и текст сообщения', tr: 'Lütfen konu ve mesaj metnini girin' }), 'error');
      return;
    }

    try {
      const res = await fetch('/api/admin/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipient, title: msgTitle, body: msgBody, sendAsNotification })
      });
      if (res.ok) {
        addNotification(L(language, { fa: 'پیام شما با موفقیت ارسال شد', en: 'Message sent successfully', ru: 'Сообщение успешно отправлено', tr: 'Mesajınız başarıyla gönderildi' }), 'success');
        setMsgTitle('');
        setMsgBody('');
        setSendAsNotification(false);
        fetchData();
      } else {
        addNotification(L(language, { fa: 'خطا در ارسال پیام', en: 'Failed to send message', ru: 'Не удалось отправить сообщение', tr: 'Mesaj gönderilemedi' }), 'error');
      }
    } catch (err) {
      addNotification(L(language, { fa: 'خطا در ارسال پیام', en: 'Failed to send message', ru: 'Не удалось отправить сообщение', tr: 'Mesaj gönderilemedi' }), 'error');
    }
  };

  const handleAddSlide = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSlideUrl || !newSlideTarget) {
      addNotification(L(language, { fa: 'لطفاً آدرس تصویر و بخش هدف را وارد کنید', en: 'Please fill in image URL and target section', ru: 'Укажите URL изображения и целевой раздел', tr: 'Lütfen görsel adresini ve hedef bölümü girin' }), 'error');
      return;
    }
    try {
      const res = await fetch('/api/admin/app-sliders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageUrl: newSlideUrl,
          mobileImageUrl: newSlideMobileUrl,
          autoGenerateMobile: newSlideAutoMobile,
          target: newSlideTarget,
          titleFa: newSlideTitleFa,
          titleEn: newSlideTitleEn,
          titleRu: newSlideTitleRu,
          titleTr: newSlideTitleTr,
          descFa: newSlideDesc.fa, descEn: newSlideDesc.en, descRu: newSlideDesc.ru, descTr: newSlideDesc.tr,
        }),
      }).then(r => r.json());

      if (res.success) {
        fetchData(); // بازخوانی از GET ادغام‌شده (فیکس باگ #۴: پاسخ تغییر فقط دیتابیس است)
        addNotification(L(language, { fa: 'اسلاید جدید با موفقیت اضافه شد', en: 'New slide added successfully', ru: 'Новый слайд успешно добавлен', tr: 'Yeni slayt başarıyla eklendi' }), 'success');
        setNewSlideUrl('');
        setNewSlideMobileUrl('');
        setNewSlideAutoMobile(true);
        setNewSlideUrl('');
        setNewSlideTitleFa('');
        setNewSlideTitleEn('');
        setNewSlideTitleRu('');
        setNewSlideTitleTr('');
        setNewSlideDesc({ fa: '', en: '', ru: '', tr: '' });
    setNewSlideDesc({ fa: '', en: '', ru: '', tr: '' });
      } else {
        addNotification(res.error || 'Failed', 'error');
      }
    } catch (err) {
      console.error(err);
      addNotification('Error contacting server', 'error');
    }
  };

  const handleDeleteSlide = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/app-sliders/${id}`, {
        method: 'DELETE',
      }).then(r => r.json());

      if (res.success) {
        fetchData(); // بازخوانی از GET ادغام‌شده (فیکس باگ #۴: پاسخ تغییر فقط دیتابیس است)
        addNotification(L(language, { fa: 'اسلاید حذف شد', en: 'Slide deleted successfully', ru: 'Слайд удалён', tr: 'Slayt silindi' }), 'success');
        if (editingSlideId === id) {
          cancelEditSlide();
        }
      } else {
        addNotification(res.error || 'Failed', 'error');
      }
    } catch (err) {
      console.error(err);
      addNotification('Error contacting server', 'error');
    }
  };

  const handleEditSlide = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSlideId || !newSlideUrl || !newSlideTarget) {
      addNotification(L(language, { fa: 'لطفاً آدرس تصویر و بخش هدف را وارد کنید', en: 'Please fill in image URL and target section', ru: 'Укажите URL изображения и целевой раздел', tr: 'Lütfen görsel adresini ve hedef bölümü girin' }), 'error');
      return;
    }
    try {
      const res = await fetch(`/api/admin/app-sliders/${editingSlideId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageUrl: newSlideUrl,
          mobileImageUrl: newSlideMobileUrl,
          autoGenerateMobile: newSlideAutoMobile,
          target: newSlideTarget,
          titleFa: newSlideTitleFa,
          titleEn: newSlideTitleEn,
          titleRu: newSlideTitleRu,
          titleTr: newSlideTitleTr,
          descFa: newSlideDesc.fa, descEn: newSlideDesc.en, descRu: newSlideDesc.ru, descTr: newSlideDesc.tr,
        }),
      }).then(r => r.json());

      if (res.success) {
        fetchData(); // بازخوانی از GET ادغام‌شده (فیکس باگ #۴: پاسخ تغییر فقط دیتابیس است)
        addNotification(L(language, { fa: 'اسلاید با موفقیت ویرایش شد', en: 'Slide updated successfully', ru: 'Слайд успешно обновлён', tr: 'Slayt başarıyla güncellendi' }), 'success');
        setEditingSlideId(null);
        setNewSlideUrl('');
        setNewSlideMobileUrl('');
        setNewSlideAutoMobile(true);
        setNewSlideTitleFa('');
        setNewSlideTitleEn('');
        setNewSlideTitleRu('');
        setNewSlideTitleTr('');
        setNewSlideDesc({ fa: '', en: '', ru: '', tr: '' });
    setNewSlideDesc({ fa: '', en: '', ru: '', tr: '' });
        setNewSlideTarget('reserve');
      } else {
        addNotification(res.error || 'Failed', 'error');
      }
    } catch (err) {
      console.error(err);
      addNotification('Error contacting server', 'error');
    }
  };

  const startEditSlide = (slide: any) => {
    setEditingSlideId(slide.id);
    setNewSlideUrl(slide.imageUrl);
    setNewSlideMobileUrl(slide.mobileImageUrl || '');
    setNewSlideAutoMobile(!slide.mobileImageUrl);
    setNewSlideTarget(slide.target);
    setNewSlideTitleFa(slide.titleFa || '');
    setNewSlideTitleEn(slide.titleEn || '');
    setNewSlideTitleRu(slide.titleRu || '');
    setNewSlideTitleTr(slide.titleTr || '');
    setNewSlideDesc({ fa: slide.descFa || '', en: slide.descEn || '', ru: slide.descRu || '', tr: slide.descTr || '' });
    addNotification(L(language, { fa: 'اطلاعات اسلاید جهت ویرایش بارگذاری شد', en: 'Slide info loaded for editing', ru: 'Данные слайда загружены для редактирования', tr: 'Slayt bilgileri düzenleme için yüklendi' }), 'info');
  };

  const cancelEditSlide = () => {
    setEditingSlideId(null);
    setNewSlideUrl('');
    setNewSlideMobileUrl('');
    setNewSlideAutoMobile(true);
    setNewSlideTitleFa('');
    setNewSlideTitleEn('');
    setNewSlideTitleRu('');
    setNewSlideTitleTr('');
    setNewSlideDesc({ fa: '', en: '', ru: '', tr: '' });
    setNewSlideTarget('reserve');
  };

  const handleCreateTheme = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newThemeName.trim()) {
      addNotification(L(language, { fa: 'لطفا نام قالب را وارد کنید', en: 'Please enter theme name', ru: 'Введите название темы', tr: 'Lütfen tema adını girin' }), 'error');
      return;
    }
    
    // Build a CSS-safe theme id (persian/non-latin chars are stripped)
    let id = newThemeName.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-_]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
    if (!id) id = 'custom-theme-' + Date.now();
    
    // Check if it already exists
    if (availableThemes.some(t => t.id === id)) {
      addNotification(L(language, { fa: 'این قالب قبلا ثبت شده است', en: 'This theme is already registered', ru: 'Эта тема уже зарегистрирована', tr: 'Bu tema zaten kayıtlı' }), 'error');
      return;
    }
    
    const newTheme: ThemeInfo = {
      id,
      name: newThemeName.trim(),
      type: 'custom',
      kind: 'colors',
      colors: {
        primary: newThemePrimary,
        bg: newThemeBg,
        card: newThemeCard,
      }
    };
    
    if (setAvailableThemes) {
      setAvailableThemes(prev => [...prev, newTheme]);
    }
    
    addNotification(L(language, { fa: `قالب "${newTheme.name}" با موفقیت نصب شد`, en: `Theme "${newTheme.name}" successfully installed`, ru: `Тема "${newTheme.name}" успешно установлена`, tr: `"${newTheme.name}" teması başarıyla yüklendi` }), 'success');
    
    // Reset form
    setNewThemeName('');
    setShowUploadForm(false);
  };

  /* ---------- نصب قالب از فایل ZIP (فرمت جدید: theme.json + theme.css + assets/) ----------
   * پیش‌نمایش متادیتا به‌صورت محلی انجام می‌شود؛ اما خود نصب روی سرور
   * انجام می‌شود تا قالب پوشه اختصاصی خودش (با assets) را داشته باشد. */
  const handleZipFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // اجازه انتخاب دوباره همان فایل
    e.target.value = '';

    setZipFileName(file.name);
    setZipError('');
    setZipParsed(null);
    setZipFileBytes(null);
    setIsParsingZip(true);

    try {
      const buffer = new Uint8Array(await file.arrayBuffer());
      setZipFileBytes(buffer);
      const result = parseThemeZip(buffer, file.name);

      if ('error' in result) {
        setZipError(result.error);
        addNotification(L(language, { fa: `خطا در خواندن ZIP: ${result.error}`, en: `ZIP parse error: ${result.error}`, ru: `Ошибка чтения ZIP: ${result.error}`, tr: `ZIP okuma hatası: ${result.error}` }), 'error');
        return;
      }

      // شناسه‌ی تکراری: اگر قالب سروری است → حالت «به‌روزرسانی» (جایگزینی اتمیک نسخه‌ی قبلی)؛
      // اگر داخلی/محلی است → خطا.
      const existing = availableThemes.find(t => t.id === result.meta.id);
      setZipReplacesExisting(null);
      if (existing) {
        if (existing.kind === 'server') {
          setZipReplacesExisting(existing);
        } else {
          setZipError(L(language, { fa: `شناسه «${result.meta.id}» متعلق به یک قالب داخلی/محلی است و قابل جایگزینی نیست`, en: `Id "${result.meta.id}" belongs to a built-in/local theme and cannot be replaced`, ru: `Идентификатор «${result.meta.id}» принадлежит встроенной/локальной теме и не может быть заменён`, tr: `«${result.meta.id}» kimliği yerleşik/yerel bir temaya ait ve değiştirilemez` }));
          addNotification(L(language, { fa: 'قالب تکراری است', en: 'Duplicate theme', ru: 'Дублирующаяся тема', tr: 'Tema zaten mevcut' }), 'error');
          return;
        }
      }

      // IMPORTANT: do not use `new Function`/`eval` to syntax-check theme.js here.
      // The app ships with CSP `script-src 'self' 'unsafe-inline'` (no `'unsafe-eval'`),
      // so evaluating the uploaded theme source in the browser is blocked and every
      // valid ZIP appears to be a "syntax error". The authoritative syntax check is
      // performed by the server during install (server/themeStore.ts), where Node is
      // not subject to the browser CSP.
      if (result.componentJs && result.componentJs.trim()) {
        const regions = Array.from(result.componentJs.matchAll(/\.registerComponent\s*\(\s*['"]([a-zA-Z0-9_.-]+)['"]/g)).map(m => m[1]);
        if (!/BazinoThemeSDK/.test(result.componentJs) || regions.length === 0) {
          const msg = L(language, { fa: "theme.js باید حداقل یک بخش را با BazinoThemeSDK.registerComponent('<region>', ...) ثبت کند (مثلاً 'hero' یا 'home')", en: "theme.js must register at least one region with BazinoThemeSDK.registerComponent('<region>', ...) (e.g. 'hero' or 'home')", ru: "theme.js должен регистрировать хотя бы одну область через BazinoThemeSDK.registerComponent('<region>', ...) (например 'hero' или 'home')", tr: "theme.js en az bir bölgeyi BazinoThemeSDK.registerComponent('<region>', ...) ile kaydetmelidir (ör. 'hero' veya 'home')" });
          setZipError(msg);
          addNotification(msg, 'error');
          return;
        }
      }

      const assetCount = Object.keys(result.assets).length;
      setZipParsed(result);
      addNotification(L(language, { fa: `فایل ZIP با موفقیت خوانده شد: «${result.meta.name}» (${(result.css.length / 1024).toFixed(1)}KB CSS${assetCount > 0 ? ` + ${assetCount} فایل assets` : ''})`, en: `ZIP parsed: "${result.meta.name}" (${(result.css.length / 1024).toFixed(1)}KB CSS${assetCount > 0 ? ` + ${assetCount} assets` : ''})`, ru: `ZIP прочитан: «${result.meta.name}» (${(result.css.length / 1024).toFixed(1)}KB CSS${assetCount > 0 ? ` + ${assetCount} файлов assets` : ''})`, tr: `ZIP başarıyla okundu: «${result.meta.name}» (${(result.css.length / 1024).toFixed(1)}KB CSS${assetCount > 0 ? ` + ${assetCount} asset dosyası` : ''})` }), 'success');
    } catch (err) {
      console.error('[Themes] ZIP parse error:', err);
      setZipError(L(language, { fa: 'خطا در خواندن فایل ZIP', en: 'Failed to read ZIP file', ru: 'Не удалось прочитать ZIP-файл', tr: 'ZIP dosyası okunamadı' }));
    } finally {
      setIsParsingZip(false);
    }
  };

  /* ---------- نصب روی سرور (پوشه اختصاصی قالب + assets) ----------
   * ۲۰۲۶-۰۹-۱۲: نصب قالب‌های پر-asset دیگر داخل همان درخواست HTTP انجام
   * نمی‌شود (خطای 524 کلادفلر). سرور 202 + jobId برمی‌گرداند و نصب در
   * پس‌زمینه ادامه می‌یابد؛ این‌جا تا وضعیت نهایی poll می‌کنیم و فاز/پیشرفت
   * واقعی را نشان می‌دهیم. پاسخ sync قدیمی (200) هم برای سازگاری هندل می‌شود. */
  const handleInstallZip = async () => {
    if (!zipParsed || !zipFileBytes) return;
    if (!setAvailableThemes) return;

    const installThemeFromServer = (data: any) => {
      const serverTheme: ThemeInfo = {
        id: data.theme.id,
        name: data.theme.name,
        type: 'custom',
        kind: 'server',
        version: data.theme.version,
        description: data.theme.description,
        colors: data.theme.colors,
        cssUrl: data.theme.cssUrl,
        hasAssets: data.theme.hasAssets,
        assetFiles: data.theme.assetFiles,
        installedAt: data.theme.installedAt,
        assetsBase: data.theme.cssUrl ? data.theme.cssUrl.replace(/\/theme\.css$/, '/assets') : undefined,
        hasComponentJs: data.theme.hasComponentJs !== false,
        regions: data.theme.regions,
        strings: data.theme.strings,
        tokens: data.theme.tokens,
        author: data.theme.author,
      };

      // کش CSS نسخه‌ی قبلی (در صورت به‌روزرسانی) باید دور ریخته شود
      invalidateServerThemeCache(serverTheme.id);
      setAvailableThemes(prev => [...prev.filter(t => t.id !== serverTheme.id), serverTheme]);
      const fixedCount = Array.isArray(data.performance?.findings)
        ? data.performance.findings.filter((finding: { severity?: string }) => finding.severity === 'fixed').length
        : 0;
      const warningCount = Array.isArray(data.performance?.findings)
        ? data.performance.findings.filter((finding: { severity?: string }) => finding.severity === 'warning').length
        : 0;
      const assetsNote = serverTheme.hasAssets ? ` (${serverTheme.assetFiles?.length} assets)` : '';
      addNotification(data.replaced
        ? L(language, { fa: `قالب «${serverTheme.name}» به نسخه ${serverTheme.version || ''} به‌روزرسانی و فعال شد${assetsNote}`, en: `Theme "${serverTheme.name}" updated to v${serverTheme.version || ''} & activated${assetsNote}`, ru: `Тема «${serverTheme.name}» обновлена до v${serverTheme.version || ''} и активирована${assetsNote}`, tr: `«${serverTheme.name}» teması v${serverTheme.version || ''} sürümüne güncellendi ve etkinleştirildi${assetsNote}` })
        : L(language, { fa: `قالب «${serverTheme.name}» روی سرور نصب و به‌عنوان قالب پیش‌فرض سایت فعال شد${assetsNote}`, en: `Theme "${serverTheme.name}" installed on server & set as site default${assetsNote}`, ru: `Тема «${serverTheme.name}» установлена на сервер и назначена темой сайта по умолчанию${assetsNote}`, tr: `«${serverTheme.name}» teması sunucuya yüklendi ve site varsayılanı yapıldı${assetsNote}` }), 'success');
      if (fixedCount || warningCount) {
        addNotification(L(language, { fa: `بررسی عملکرد قالب: ${fixedCount} اصلاح خودکار و ${warningCount} مورد نیازمند بررسی دستی.`, en: `Theme performance check: ${fixedCount} automatic fixes and ${warningCount} items needing review.`, ru: `Проверка производительности темы: ${fixedCount} автоисправлений и ${warningCount} замечаний для ручной проверки.`, tr: `Tema performans kontrolü: ${fixedCount} otomatik düzeltme ve ${warningCount} manuel inceleme gerektiren madde.` }), 'info');
      }

      // فعال‌سازی فوری در همین مرورگر (فعال‌سازی سراسری را خود سرور هم‌زمان با نصب انجام داده)
      if (setThemeId) setThemeId(serverTheme.id);
      // لیست سروری را از منبع حقیقت دوباره بخوان (installedAt دقیق برای cache-busting)
      refreshServerThemes?.();

      setZipReplacesExisting(null);
      setZipParsed(null);
      setZipFileBytes(null);
      setZipFileName('');
      setZipError('');
      setShowUploadForm(false);
      setUploadMode('zip');
    };

    setIsInstallingZip(true);
    setInstallJob(null);
    try {
      const replace = zipReplacesExisting ? '&replace=1' : '';
      const res = await fetch(`/api/admin/themes/install?name=${encodeURIComponent(zipParsed.meta.name || zipFileName)}${replace}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/zip' },
        body: zipFileBytes as unknown as BodyInit,
      });
      // سرور (یا پروکسی) ممکن است HTML برگرداند — res.json() خطای بی‌فایده می‌داد؛ متن خام خوانده می‌شود.
      const rawText = await res.text();
      let data: any;
      try { data = JSON.parse(rawText); } catch { data = null; }
      if (!data) {
        const proxyTimeout = res.status === 524 || /524|timeout/i.test(rawText.slice(0, 800));
        const msg = proxyTimeout
          ? L(language, {
              fa: 'سرور پاسخ معتبری به درخواست نصب نداد (HTTP 524). اگر سرور اخیراً به‌روزرسانی شده چند لحظه صبر کنید و دوباره تلاش کنید.',
              en: 'The server did not answer the install request properly (HTTP 524). If the server was updated recently, wait a moment and try again.',
              ru: 'Сервер не ответил на запрос установки (HTTP 524). Если сервер недавно обновлялся — подождите и повторите.',
              tr: 'Sunucu kurulum isteğine geçerli yanıt vermedi (HTTP 524). Sunucu yakın zamanda güncellendiyse biraz bekleyip tekrar deneyin.' })
          : L(language, { fa: `پاسخ نامعتبر سرور (HTTP ${res.status})`, en: `Invalid server response (HTTP ${res.status})`, ru: `Неверный ответ сервера (HTTP ${res.status})`, tr: `Geçersiz sunucu yanıtı (HTTP ${res.status})` });
        setZipError(msg);
        addNotification(msg, 'error');
        return;
      }
      if (!res.ok || !data.success) {
        setZipError(data.error || L(language, { fa: 'خطا در نصب قالب', en: 'Theme installation failed', ru: 'Не удалось установить тему', tr: 'Tema kurulumu başarısız' }));
        addNotification(L(language, { fa: `خطا در نصب: ${data.error || ''}`, en: `Install error: ${data.error || ''}`, ru: `Ошибка установки: ${data.error || ''}`, tr: `Yükleme hatası: ${data.error || ''}` }), 'error');
        return;
      }

      // ── مسیر async (202): نصب در پس‌زمینه؛ تا وضعیت نهایی poll می‌کنیم ──
      if (res.status === 202 && data.jobId) {
        setInstallJob({ jobId: data.jobId, status: 'queued', filesDone: 0, filesTotal: data.progress?.filesTotal ?? 0 });
        const POLL_MS = 1200;
        const TIMEOUT_MS = 10 * 60 * 1000; // نصب‌های سنگین روی volume شبکه‌ای طول می‌کشند
        const MAX_NET_ERRORS = 6; // تحمل خطای شبکه‌ای گذرا حین پولینگ
        const deadline = Date.now() + TIMEOUT_MS;
        let netErrors = 0;
        let job: any = null;
        while (Date.now() < deadline) {
          await new Promise(r => setTimeout(r, POLL_MS));
          try {
            const pollRes = await fetch(`/api/admin/themes/install-jobs/${encodeURIComponent(data.jobId)}`);
            if (!pollRes.ok) { netErrors += 1; if (netErrors >= MAX_NET_ERRORS) break; continue; }
            netErrors = 0;
            job = await pollRes.json();
            setInstallJob({
              jobId: job.jobId,
              status: job.status,
              filesDone: job.progress?.filesDone ?? 0,
              filesTotal: job.progress?.filesTotal ?? 0,
            });
            if (job.status === 'completed' || job.status === 'failed') break;
          } catch { netErrors += 1; if (netErrors >= MAX_NET_ERRORS) break; }
        }
        if (!job || (job.status !== 'completed' && job.status !== 'failed')) {
          const msg = L(language, {
            fa: 'وضعیت نصب پس از مدت طولانی نامشخص باقی ماند. لیست قالب‌ها را رفرش کنید؛ اگر قالب نیامده بود دوباره تلاش کنید.',
            en: 'Install status stayed unknown for too long. Refresh the theme list; if the theme is missing, try again.',
            ru: 'Статус установки слишком долго оставался неизвестным. Обновите список тем; если темы нет — повторите.',
            tr: 'Kurulum durumu çok uzun süre belirsiz kaldı. Tema listesini yenileyin; tema yoksa tekrar deneyin.' });
          setZipError(msg);
          addNotification(msg, 'error');
          return;
        }
        if (job.status === 'failed') {
          // خطای واقعی job (نه 524 هاردکد) — با پیام دقیق سرور
          setInstallJob(null);
          setZipError(job.error || L(language, { fa: 'نصب قالب ناموفق بود', en: 'Theme installation failed', ru: 'Не удалось установить тему', tr: 'Tema kurulumu başarısız' }));
          addNotification(L(language, { fa: `نصب ناموفق: ${job.error || ''}`, en: `Install failed: ${job.error || ''}`, ru: `Ошибка установки: ${job.error || ''}`, tr: `Kurulum başarısız: ${job.error || ''}` }), 'error');
          return;
        }
        // completed — همان جریان موفقیت مسیر sync
        setInstallJob(null);
        installThemeFromServer(job);
        return;
      }

      // ── مسیر sync قدیمی (200): پاسخ نهایی همین‌جا آمده ──
      installThemeFromServer(data);

    } catch (err) {
      console.error('[Themes] Install error:', err);
      setZipError(L(language, { fa: 'خطا در ارتباط با سرور', en: 'Server connection error', ru: 'Ошибка соединения с сервером', tr: 'Sunucu bağlantı hatası' }));
    } finally {
      setIsInstallingZip(false);
    }
  };

  /* ---------- دانلود قالب نمونه (فرمت جدید ZIP) ---------- */
  const openThemeUploadPanel = () => {
    setShowUploadForm(true);
    window.setTimeout(() => {
      themeUploadPanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 80);
  };

  const handleDownloadSampleZip = () => {
    try {
      downloadZip(buildSampleThemeZip(), 'bazino-theme-sample.zip');
      addNotification(L(language, { fa: 'فایل قالب نمونه دانلود شد — ساختار theme.json + theme.css را ببینید', en: 'Sample theme zip downloaded — see theme.json + theme.css structure', ru: 'Образец темы скачан — смотрите структуру theme.json + theme.css', tr: 'Örnek tema dosyası indirildi — theme.json + theme.css yapısına bakın' }), 'success');
    } catch (e) {
      console.error(e);
      addNotification(L(language, { fa: 'خطا در ساخت فایل نمونه', en: 'Failed to build sample zip', ru: 'Не удалось создать образец ZIP', tr: 'Örnek ZIP oluşturulamadı' }), 'error');
    }
  };

  /* ---------- خروجی گرفتن ZIP از یک قالب نصب‌شده ----------
   * قالب‌های سروری از سرور دانلود می‌شوند (شامل پوشه assets)؛
   * قالب‌های محلی با buildThemeZip ساخته می‌شوند. */
  const handleExportThemeZip = async (theme: ThemeInfo) => {
    try {
      if (theme.kind === 'server') {
        const res = await fetch(`/api/themes/${encodeURIComponent(theme.id)}/export`);
        if (!res.ok) throw new Error('export failed');
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${theme.id}.zip`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 2000);
      } else {
        downloadZip(buildThemeZip(theme), `${theme.id}.zip`);
      }
      addNotification(L(language, { fa: `پکیج ZIP قالب «${theme.name}» دانلود شد`, en: `Theme "${theme.name}" zip downloaded`, ru: `ZIP-пакет темы «${theme.name}» скачан`, tr: `«${theme.name}» tema ZIP paketi indirildi` }), 'success');
    } catch (e) {
      console.error(e);
      addNotification(L(language, { fa: 'خطا در ساخت فایل ZIP', en: 'Failed to build zip', ru: 'Не удалось создать ZIP', tr: 'ZIP dosyası oluşturulamadı' }), 'error');
    }
  };

  /* ---------- انتخاب قالب = فعال‌سازی سراسری (پیش‌فرض سایت) + همین مرورگر ----------
   * قبلاً فقط setThemeId محلی صدا زده می‌شد؛ ادمین فکر می‌کرد پیش‌فرض سایت عوض شده
   * ولی فقط مرورگر خودش عوض شده بود. */
  const handleActivateTheme = async (theme: ThemeInfo) => {
    if (setThemeId) setThemeId(theme.id);
    // انتخاب ادمین = پیش‌فرض سایت؛ انتخاب شخصی قبلی همین مرورگر لغو می‌شود
    try { localStorage.removeItem('themeChoice'); } catch { /* ignore */ }
    if (theme.kind === 'colors' || theme.kind === 'zip') {
      // قالب فقط در localStorage همین مرورگر وجود دارد → نمی‌تواند پیش‌فرض سراسری باشد
      addNotification(L(language, { fa: 'این قالب فقط در همین مرورگر ذخیره شده و به‌عنوان پیش‌فرض سایت قابل انتخاب نیست؛ آن را به‌صورت ZIP روی سرور نصب کنید.', en: 'This theme exists only in this browser and cannot be the site default; install it on the server as a ZIP.', ru: 'Эта тема хранится только в этом браузере и не может быть темой сайта по умолчанию; установите её на сервер как ZIP.', tr: 'Bu tema yalnızca bu tarayıcıda kayıtlı ve site varsayılanı olamaz; sunucuya ZIP olarak yükleyin.' }), 'info');
      return;
    }
    try {
      const res = await fetch('/api/admin/themes/activate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ themeId: theme.id }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) throw new Error(data.error || `HTTP ${res.status}`);
      addNotification(L(language, { fa: `قالب «${theme.name}» به‌عنوان قالب پیش‌فرض سایت برای همه‌ی بازدیدکنندگان فعال شد`, en: `"${theme.name}" is now the site-wide default theme`, ru: `«${theme.name}» — теперь тема сайта по умолчанию для всех посетителей`, tr: `«${theme.name}» artık tüm ziyaretçiler için site varsayılan teması` }), 'success');
    } catch (e: any) {
      addNotification(L(language, { fa: `فعال‌سازی سراسری ناموفق بود: ${e?.message || ''}`, en: `Site-wide activation failed: ${e?.message || ''}`, ru: `Не удалось активировать для всего сайта: ${e?.message || ''}`, tr: `Site genelinde etkinleştirme başarısız: ${e?.message || ''}` }), 'error');
    }
  };

  const loadStorageStatus = async () => {
    try {
      const res = await fetch('/api/admin/storage-status', { cache: 'no-store' });
      if (res.ok) setStorageStatus(await res.json());
    } catch { /* اختیاری */ }
  };
  useEffect(() => { if (activeSubTab === 'themes') loadStorageStatus(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [activeSubTab, availableThemes.length]);

  const handleDeleteTheme = async (theme: ThemeInfo) => {
    // قالب‌های سروری: پوشه اختصاصی قالب روی سرور هم حذف می‌شود
    if (theme.kind === 'server') {
      try {
        const res = await fetch(`/api/admin/themes/${encodeURIComponent(theme.id)}`, { method: 'DELETE' });
        const data = await res.json();
        if (!res.ok || !data.success) {
          addNotification(L(language, { fa: 'خطا در حذف قالب از سرور', en: 'Failed to delete theme on server', ru: 'Не удалось удалить тему с сервера', tr: 'Tema sunucudan silinemedi' }), 'error');
          return;
        }
      } catch (e) {
        console.error(e);
        addNotification(L(language, { fa: 'خطا در ارتباط با سرور', en: 'Server connection error', ru: 'Ошибка соединения с сервером', tr: 'Sunucu bağlantı hatası' }), 'error');
        return;
      }
    }

    if (setAvailableThemes) {
      setAvailableThemes(prev => prev.filter(t => t.id !== theme.id));
    }
    invalidateServerThemeCache(theme.id);
    if (theme.kind === 'server') refreshServerThemes?.();
    if (themeId === theme.id && setThemeId) {
      setThemeId('dark-gold');
    }
    addNotification(
      theme.kind === 'server'
        ? L(language, { fa: `قالب "${theme.name}" و پوشه آن حذف شد`, en: `Theme "${theme.name}" and its folder deleted`, ru: `Тема «${theme.name}» и её папка удалены`, tr: `"${theme.name}" teması ve klasörü silindi` })
        : L(language, { fa: `قالب "${theme.name}" با موفقیت حذف شد`, en: `Theme "${theme.name}" deleted successfully`, ru: `Тема «${theme.name}» успешно удалена`, tr: `"${theme.name}" teması başarıyla silindi` }),
      'success'
    );
  };

  useEffect(() => {
    fetchData();
    // خواندن وضعیت فعلی منبع داده (نمونه / دیتابیس)
    fetch('/api/data-source')
      .then(r => r.json())
      .then(data => {
        if (data && (data.mode === 'sample' || data.mode === 'database')) {
          setDataSource(data.mode);
          setDataSourceInfo({ sample: data.sample || {}, database: data.database || {} });
        }
      })
      .catch(err => console.error('Failed to read data source:', err));
  }, []);

  const handleSwitchDataSource = async (mode: 'sample' | 'database') => {
    if (mode === dataSource || isSwitchingDataSource) return;
    setIsSwitchingDataSource(true);
    try {
      const res = await fetch('/api/admin/data-source', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode })
      });
      const data = await res.json();
      if (data.success) {
        setDataSource(mode);
        addNotification(
          mode === 'sample'
            ? L(language, { fa: 'منبع داده به «نمونه» تغییر کرد — سایت و اپ از داده‌های نمونه می‌خوانند', en: 'Data source switched to Sample — site & app read from sample data', ru: 'Источник данных переключён на «Образцы» — сайт и приложение читают образцы', tr: 'Veri kaynağı «Örnek» olarak değiştirildi — site ve uygulama örnek verileri okur' })
            : L(language, { fa: 'منبع داده به «دیتابیس» تغییر کرد — سایت و اپ از دیتابیس می‌خوانند', en: 'Data source switched to Database — site & app read from the database', ru: 'Источник данных переключён на «База данных» — сайт и приложение читают из БД', tr: 'Veri kaynağı «Veritabanı» olarak değiştirildi — site ve uygulama veritabanından okur' }),
          'success'
        );
      } else {
        addNotification(L(language, { fa: 'خطا در تغییر منبع داده', en: 'Failed to switch data source', ru: 'Не удалось переключить источник данных', tr: 'Veri kaynağı değiştirilemedi' }), 'error');
      }
    } catch (e) {
      console.error(e);
      addNotification(L(language, { fa: 'خطا در ارتباط با سرور', en: 'Connection error', ru: 'Ошибка соединения с сервером', tr: 'Sunucu bağlantı hatası' }), 'error');
    } finally {
      setIsSwitchingDataSource(false);
    }
  };

  // Update order status on server
  const handleUpdateCafeOrderStatus = async (orderId: string, status: string) => {
    try {
      const res = await fetch(`/api/admin/cafe-orders/${orderId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      if (res.ok) {
        addNotification(L(language, { fa: `وضعیت سفارش ${orderId} با موفقیت بروزرسانی شد`, en: `Order ${orderId} status updated`, ru: `Статус заказа ${orderId} обновлён`, tr: `${orderId} sipariş durumu güncellendi` }), 'success');
        fetchData();
      }
    } catch (e) {
      addNotification(L(language, { fa: 'خطا در بروزرسانی وضعیت سفارش', en: 'Failed to update order status', ru: 'Не удалось обновить статус заказа', tr: 'Sipariş durumu güncellenemedi' }), 'error');
    }
  };

  const handleUpdateShopOrderStatus = async (orderId: string, status: string) => {
    try {
      const res = await fetch(`/api/admin/shop-orders/${orderId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      if (res.ok) {
        addNotification(L(language, { fa: `وضعیت سفارش فروشگاه ${orderId} با موفقیت بروزرسانی شد`, en: `Shop order ${orderId} status updated`, ru: `Статус заказа магазина ${orderId} обновлён`, tr: `Mağaza siparişi ${orderId} durumu güncellendi` }), 'success');
        fetchData();
      }
    } catch (e) {
      addNotification(L(language, { fa: 'خطا در بروزرسانی وضعیت سفارش', en: 'Failed to update order status', ru: 'Не удалось обновить статус заказа', tr: 'Sipariş durumu güncellenemedi' }), 'error');
    }
  };

  // Toggle system active state
  const handleToggleSystem = async (sysId: string, currentActive: boolean) => {
    try {
      const res = await fetch(`/api/admin/systems/${sysId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !currentActive })
      });
      if (res.ok) {
        addNotification(L(language, { fa: 'وضعیت سیستم با موفقیت تغییر یافت', en: 'System status updated successfully', ru: 'Статус системы успешно изменён', tr: 'Sistem durumu başarıyla değiştirildi' }), 'success');
        fetchData();
      }
    } catch (e) {
      addNotification(L(language, { fa: 'خطا در بروزرسانی سیستم', en: 'Failed to update system', ru: 'Не удалось обновить систему', tr: 'Sistem güncellenemedi' }), 'error');
    }
  };

  const handleSetSystemAudience = async (sysId: string, audience: string) => {
    try {
      const res = await fetch(`/api/admin/systems/${sysId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ audience })
      });
      if (res.ok) {
        addNotification(L(language, { fa: 'دستهٔ مخاطب سیستم به‌روزرسانی شد', en: 'System audience updated', ru: 'Аудитория системы обновлена', tr: 'Sistem hedef kitlesi güncellendi' }), 'success');
        fetchData();
      } else {
        addNotification(L(language, { fa: 'خطا در بروزرسانی دستهٔ مخاطب', en: 'Failed to update audience', ru: 'Не удалось обновить аудиторию', tr: 'Hedef kitle güncellenemedi' }), 'error');
      }
    } catch (e) {
      addNotification(L(language, { fa: 'خطا در بروزرسانی دستهٔ مخاطب', en: 'Failed to update audience', ru: 'Не удалось обновить аудиторию', tr: 'Hedef kitle güncellenemedi' }), 'error');
    }
  };

  const handleDeleteSystem = async (sysId: string) => {
    try {
      const res = await fetch(`/api/admin/systems/${sysId}`, { method: 'DELETE' }).then(r => r.json());
      if (res.success) {
        fetchData(); // بازخوانی از GET ادغام‌شده (فیکس باگ #۴: پاسخ تغییر فقط دیتابیس است)
        addNotification(L(language, { fa: 'سیستم حذف شد', en: 'System deleted successfully', ru: 'Система удалена', tr: 'Sistem silindi' }), 'success');
      } else {
        addNotification(res.error || 'Failed', 'error');
      }
    } catch (e) {
      addNotification(L(language, { fa: 'خطا در حذف سیستم', en: 'Failed to delete system', ru: 'Не удалось удалить систему', tr: 'Sistem silinemedi' }), 'error');
    }
  };

  const handleDeleteCafeItem = async (itemId: string) => {
    try {
      const res = await fetch(`/api/admin/cafe/${itemId}`, { method: 'DELETE' }).then(r => r.json());
      if (res.success) {
        fetchData(); // بازخوانی از GET ادغام‌شده (فیکس باگ #۴: پاسخ تغییر فقط دیتابیس است)
        addNotification(L(language, { fa: 'آیتم منو حذف شد', en: 'Menu item deleted successfully', ru: 'Пункт меню удалён', tr: 'Menü öğesi silindi' }), 'success');
      } else {
        addNotification(res.error || 'Failed', 'error');
      }
    } catch (e) {
      addNotification(L(language, { fa: 'خطا در حذف آیتم', en: 'Failed to delete item', ru: 'Не удалось удалить позицию', tr: 'Öğe silinemedi' }), 'error');
    }
  };

  const handleDeleteTournament = async (tourId: string) => {
    try {
      const res = await fetch(`/api/admin/tournaments/${tourId}`, { method: 'DELETE' }).then(r => r.json());
      if (res.success) {
        fetchData(); // بازخوانی از GET ادغام‌شده (فیکس باگ #۴: پاسخ تغییر فقط دیتابیس است)
        addNotification(L(language, { fa: 'تورنومنت حذف شد', en: 'Tournament deleted successfully', ru: 'Турнир удалён', tr: 'Turnuva silindi' }), 'success');
      } else {
        addNotification(res.error || 'Failed', 'error');
      }
    } catch (e) {
      addNotification(L(language, { fa: 'خطا در حذف تورنومنت', en: 'Failed to delete tournament', ru: 'Не удалось удалить турнир', tr: 'Turnuva silinemedi' }), 'error');
    }
  };

  const handleDeleteAccessory = async (accId: string) => {
    try {
      const res = await fetch(`/api/admin/accessories/${accId}`, { method: 'DELETE' }).then(r => r.json());
      if (res.success) {
        fetchData(); // بازخوانی از GET ادغام‌شده (فیکس باگ #۴: پاسخ تغییر فقط دیتابیس است)
        addNotification(L(language, { fa: 'کالا از فروشگاه حذف شد', en: 'Accessory deleted successfully', ru: 'Товар удалён из магазина', tr: 'Ürün mağazadan silindi' }), 'success');
      } else {
        addNotification(res.error || 'Failed', 'error');
      }
    } catch (e) {
      addNotification(L(language, { fa: 'خطا در حذف کالا', en: 'Failed to delete product', ru: 'Не удалось удалить товар', tr: 'Ürün silinemedi' }), 'error');
    }
  };

  const handleDeleteArticle = async (artId: string) => {
    try {
      const res = await fetch(`/api/admin/articles/${artId}`, { method: 'DELETE' }).then(r => r.json());
      if (res.success) {
        fetchData(); // بازخوانی از GET ادغام‌شده (فیکس باگ #۴: پاسخ تغییر فقط دیتابیس است)
        addNotification(L(language, { fa: 'مقاله حذف شد', en: 'Article deleted successfully', ru: 'Статья удалена', tr: 'Makale silindi' }), 'success');
      } else {
        addNotification(res.error || 'Failed', 'error');
      }
    } catch (e) {
      addNotification(L(language, { fa: 'خطا در حذف مقاله', en: 'Failed to delete article', ru: 'Не удалось удалить статью', tr: 'Makale silinemedi' }), 'error');
    }
  };

  const handleAddChatRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChatRoomName.trim()) return;
    try {
      const res = await fetch('/api/chat/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newChatRoomName.trim() })
      }).then(r => r.json());
      if (res.success) {
        fetchData(); // بازخوانی از GET ادغام‌شده (فیکس باگ #۴: پاسخ تغییر فقط دیتابیس است)
        setNewChatRoomName('');
        addNotification(L(language, { fa: 'اتاق گفتگو ایجاد شد', en: 'Chat room created successfully', ru: 'Чат-комната создана', tr: 'Sohbet odası oluşturuldu' }), 'success');
      } else {
        addNotification(res.error || 'Failed', 'error');
      }
    } catch (e) {
      addNotification(L(language, { fa: 'خطا در ایجاد اتاق گفتگو', en: 'Failed to create chat room', ru: 'Не удалось создать чат-комнату', tr: 'Sohbet odası oluşturulamadı' }), 'error');
    }
  };

  const handleDeleteChatRoom = async (name: string) => {
    try {
      const res = await fetch(`/api/admin/chat-rooms/${encodeURIComponent(name)}`, { method: 'DELETE' }).then(r => r.json());
      if (res.success) {
        fetchData(); // بازخوانی از GET ادغام‌شده (فیکس باگ #۴: پاسخ تغییر فقط دیتابیس است)
        addNotification(L(language, { fa: 'اتاق گفتگو حذف شد', en: 'Chat room deleted successfully', ru: 'Чат-комната удалена', tr: 'Sohbet odası silindi' }), 'success');
      } else {
        addNotification(res.error || 'Failed', 'error');
      }
    } catch (e) {
      addNotification(L(language, { fa: 'خطا در حذف اتاق گفتگو', en: 'Failed to delete chat room', ru: 'Не удалось удалить чат-комнату', tr: 'Sohbet odası silinemedi' }), 'error');
    }
  };

  // Submit new items
  // در حالت داده‌ی نمونه، رکورد تازه در دیتابیس ذخیره می‌شود ولی سایت و همین فهرست‌ها
  // همچنان داده‌ی آماده را نشان می‌دهند. این رفتار عمدی است، اما توست موفقیت قبلاً چیزی
  // درباره‌اش نمی‌گفت و ادمین فکر می‌کرد رکوردش گم شده است.
  /** متن خطای واقعی سرور. این فرم‌ها تا امروز فقط شاخه‌ی res.ok را داشتند، پس اگر سرور
   *  خطا برمی‌گرداند (مثلاً برخورد شناسه) هیچ چیزی به ادمین گفته نمی‌شد و دکمه بی‌صدا می‌ماند. */
  const serverError = async (res: Response, fallback: string) => {
    try {
      const data = await res.json();
      if (data && typeof data.error === 'string') return data.error;
    } catch { /* پاسخ JSON نبود */ }
    return fallback;
  };

  const savedNote = (msg: string) =>
    dataSource === 'sample'
      ? `${msg} — ` + L(language, { fa: 'برای نمایش آن، «منبع داده» را در بخش سفارشی‌سازی کلوپ روی «دیتابیس» بگذارید.', en: 'to display it, set “Data source” to “Database” in Club Customization.', ru: 'чтобы увидеть его, переключите «Источник данных» на «База данных» в разделе настройки клуба.', tr: 'görüntülemek için Kulüp Özelleştirme bölümünde «Veri kaynağı» seçeneğini «Veritabanı» yapın.' })
      : msg;

  const handleAddSystem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSystem.name.trim()) return;
    try {
      const res = await fetch('/api/admin/systems', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSystem)
      });
      if (res.ok) {
        addNotification(savedNote(L(language, { fa: 'سیستم گیمینگ جدید با موفقیت به سرور افزوده شد', en: 'New gaming system added to the server', ru: 'Новая игровая система добавлена на сервер', tr: 'Yeni oyun sistemi sunucuya eklendi' })), 'success');
        setNewSystem({ name: '', type: 'PC', hourlyRate: 25000, isActive: true, audience: '' });
        fetchData();
      } else {
        addNotification(await serverError(res, L(language, { fa: 'خطا در ثبت سیستم جدید', en: 'Failed to add new system', ru: 'Не удалось добавить систему', tr: 'Yeni sistem kaydedilemedi' })), 'error');
      }
    } catch (e) {
      addNotification(L(language, { fa: 'خطا در ثبت سیستم جدید', en: 'Failed to add new system', ru: 'Не удалось добавить систему', tr: 'Yeni sistem kaydedilemedi' }), 'error');
    }
  };

  const handleAddCafeItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCafe.name.trim()) return;
    try {
      const res = await fetch('/api/admin/cafe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newCafe)
      });
      if (res.ok) {
        addNotification(savedNote(L(language, { fa: 'آیتم بوفه جدید با موفقیت در دیتابیس ثبت شد', en: 'New cafe item saved to the database', ru: 'Новая позиция буфета сохранена в БД', tr: 'Yeni büfe öğesi veritabanına kaydedildi' })), 'success');
        setNewCafe({ name: '', category: 'Foods', price: 50000, imageUrl: '', mobileImageUrl: '', autoGenerateMobile: true, inventory: 20, isAvailable: true });
        fetchData();
      } else {
        addNotification(await serverError(res, L(language, { fa: 'خطا در ثبت آیتم بوفه', en: 'Failed to add cafe item', ru: 'Не удалось добавить позицию буфета', tr: 'Büfe öğesi kaydedilemedi' })), 'error');
      }
    } catch (e) {
      addNotification(L(language, { fa: 'خطا در ثبت کالا', en: 'Failed to add item', ru: 'Не удалось добавить товар', tr: 'Ürün kaydedilemedi' }), 'error');
    }
  };

  const handleAddAccessory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAccessory.name.trim()) return;
    try {
      const res = await fetch('/api/admin/accessories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newAccessory)
      });
      if (res.ok) {
        addNotification(savedNote(L(language, { fa: 'تجهیزات گیمینگ جدید در انبار دیتابیس ذخیره شد', en: 'New gaming gear saved to the store database', ru: 'Новое игровое оборудование сохранено в БД склада', tr: 'Yeni oyun ekipmanı depo veritabanına kaydedildi' })), 'success');
        setNewAccessory({ name: '', description: '', price: 1000, imageUrl: '', mobileImageUrl: '', autoGenerateMobile: true, stock: 5, category: 'Keyboard' });
        fetchData();
      } else {
        addNotification(await serverError(res, L(language, { fa: 'خطا در ثبت سخت‌افزار جدید', en: 'Failed to add new hardware', ru: 'Не удалось добавить оборудование', tr: 'Yeni donanım kaydedilemedi' })), 'error');
      }
    } catch (e) {
      addNotification(L(language, { fa: 'خطا در ثبت سخت‌افزار جدید', en: 'Failed to add new hardware', ru: 'Не удалось добавить оборудование', tr: 'Yeni donanım kaydedilemedi' }), 'error');
    }
  };

  const handleAddTournament = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTournament.title.trim() || !newTournament.game.trim()) return;
    try {
      const res = await fetch('/api/admin/tournaments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newTournament)
      });
      if (res.ok) {
        addNotification(L(language, { fa: 'تورنمنت گیمینگ جدید با موفقیت فعال گردید', en: 'New gaming tournament activated', ru: 'Новый турнир успешно активирован', tr: 'Yeni oyun turnuvası etkinleştirildi' }), 'success');
        setNewTournament({ title: '', game: '', registrationFee: 100000, startDate: '۱۴۰۵/۰۵/۰۱', maxTeams: 8 });
        fetchData();
      } else {
        addNotification(await serverError(res, L(language, { fa: 'خطا در ثبت تورنمنت', en: 'Failed to create tournament', ru: 'Не удалось создать турнир', tr: 'Turnuva kaydedilemedi' })), 'error');
      }
    } catch (e) {
      addNotification(L(language, { fa: 'خطا در ثبت تورنمنت', en: 'Failed to create tournament', ru: 'Не удалось создать турнир', tr: 'Turnuva kaydedilemedi' }), 'error');
    }
  };

  const handleAddArticle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newArticle.title.trim() || !newArticle.content.trim()) return;
    try {
      const res = await fetch('/api/admin/articles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newArticle)
      });
      if (res.ok) {
        addNotification(L(language, { fa: 'مقاله جدید در بخش اخبار بلاگ منتشر شد', en: 'New article published to the blog', ru: 'Новая статья опубликована в блоге', tr: 'Yeni makale blogda yayınlandı' }), 'success');
        setNewArticle({ title: '', content: '', category: 'News', imageUrl: '', mobileImageUrl: '', autoGenerateMobile: true });
        fetchData();
      } else {
        addNotification(await serverError(res, L(language, { fa: 'خطا در ثبت مقاله خبررسانی', en: 'Failed to publish article', ru: 'Не удалось опубликовать статью', tr: 'Makale yayınlanamadı' })), 'error');
      }
    } catch (e) {
      addNotification(L(language, { fa: 'خطا در ثبت مقاله خبررسانی', en: 'Failed to publish article', ru: 'Не удалось опубликовать статью', tr: 'Makale yayınlanamadı' }), 'error');
    }
  };

  const copyMigrationsToClipboard = () => {
    navigator.clipboard.writeText(migrationsCode);
    addNotification(L(language, { fa: 'کد کلاس مهاجرت EF Core با موفقیت کپی شد', en: 'EF Core migration class copied', ru: 'Класс миграции EF Core скопирован', tr: 'EF Core geçiş sınıfı kopyalandı' }), 'success');
  };


  if (loading && !stats) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-gray-400 font-mono text-xs font-bold uppercase tracking-widest">Loading Live Server Data...</p>
      </div>
    );
  }

  // Guide modal state for new design
  const [guideOpen, setGuideOpen] = useState(false);
  const currentGroup = groupForSection(activeSubTab);

  return (
    <div className="animate-fade-in font-sans min-h-[70vh]" dir={dir}>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* NEW SIDEBAR */}
        <div className="lg:col-span-3">
          <AdminSidebar
            active={activeSubTab}
            onSelect={(sec)=> setActiveSubTab(sec as any)}
            openTicketCount={openTicketCount}
            dir={dir}
            language={language as any}
          />
        </div>

        {/* MAIN WORKSPACE */}
        <div className="lg:col-span-9 flex flex-col gap-5">
          {/* Header: breadcrumb + search + guide button */}
          <div className="bg-dark-card border border-white/10 px-5 py-4 rounded-2xl flex flex-col gap-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest font-mono flex items-center gap-1.5">
                  <span>{L(language, { fa: 'پنل مدیریت', en: 'Admin Panel', ru: 'Панель', tr: 'Yönetim' })}</span>
                  <span className="text-gray-600">/</span>
                  <span className="px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-[10px]">{currentGroup ? L(language, { fa: currentGroup.fa, en: currentGroup.en, ru: currentGroup.ru, tr: currentGroup.tr }) : ''}</span>
                  <span className="text-gray-600">/</span>
                  <span className="text-primary/80" dir="ltr">{pathFromAdminSection(activeSubTab)}</span>
                </p>
                <h2 className="text-lg md:text-xl font-black text-white font-display mt-1 truncate flex items-center gap-2">
                  {L(language, ADMIN_SECTION_META[activeSubTab])}
                </h2>
                <p className="text-[11px] text-gray-400 mt-1 max-w-2xl leading-relaxed">
                  {(() => {
                    const g = ADMIN_GUIDES[activeSubTab];
                    return g ? L(language, { fa: g.introFa, en: g.introEn, ru: g.introEn, tr: g.introEn } as any) : '';
                  })()}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={()=> setGuideOpen(true)}
                  className="px-3.5 py-2 rounded-xl bg-primary/10 hover:bg-primary/20 border border-primary/20 text-primary text-xs font-black flex items-center gap-1.5 transition-all"
                >
                  <HelpCircle className="w-4 h-4" />
                  {L(language, { fa: 'راهنمای این بخش', en: 'Guide', ru: 'Гид', tr: 'Rehber' })}
                </button>
              </div>
            </div>

            {/* Quick search inside header */}
            <div className="relative w-full" ref={sectionSearchRef}>
              <Search className={`w-4 h-4 text-gray-500 absolute top-1/2 -translate-y-1/2 ${dir === 'rtl' ? 'right-3' : 'left-3'}`} />
              <input
                type="search"
                value={sectionQuery}
                onChange={(e) => { setSectionQuery(e.target.value); setIsSectionSearchOpen(true); }}
                onFocus={() => setIsSectionSearchOpen(true)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && sectionMatches[0]) { setActiveSubTab(sectionMatches[0]); setSectionQuery(''); setIsSectionSearchOpen(false); }
                  if (e.key === 'Escape') setIsSectionSearchOpen(false);
                }}
                placeholder={L(language, { fa: 'جستجوی سریع بخش‌ها… (مثلاً قالب، اسلایدر، کیف پول)', en: 'Quick find… (themes, slider, wallet)', ru: 'Поиск раздела…', tr: 'Bölüm ara…' })}
                className={`w-full bg-black/40 border border-white/10 focus:border-primary/60 rounded-xl py-2.5 text-xs text-white placeholder:text-gray-600 outline-none ${dir === 'rtl' ? 'pr-9 pl-3' : 'pl-9 pr-3'}`}
              />
              {isSectionSearchOpen && sectionQuery.trim() && (
                <ul className="absolute z-40 mt-2 w-full bg-[#0d1020] border border-white/10 rounded-xl shadow-2xl overflow-hidden max-h-72 overflow-y-auto">
                  {sectionMatches.length === 0 && <li className="px-4 py-3 text-xs text-gray-500">{L(language, { fa: 'بخشی پیدا نشد', en: 'No section found', ru: '—', tr: '—' })}</li>}
                  {sectionMatches.map((k) => (
                    <li key={k}>
                      <a href={pathFromAdminSection(k)} onClick={(e)=>{e.preventDefault(); setActiveSubTab(k); setSectionQuery(''); setIsSectionSearchOpen(false);}} className={`flex items-center justify-between gap-3 px-4 py-2.5 text-xs hover:bg-primary/10 ${activeSubTab===k?'text-primary':'text-gray-200'}`}>
                        <span className="font-bold">{L(language, ADMIN_SECTION_META[k])}</span>
                        <span className="text-[10px] text-gray-500 font-mono" dir="ltr">{pathFromAdminSection(k)}</span>
                      </a>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* CONTENT PER SECTION - KEEP EXISTING LOGIC BUT WRAPPED */}
          {activeSubTab === 'apiKeys' ? (
            <AdminKeysCenter language={language as any} dir={dir} addNotification={addNotification} />
          ) : (
            <>

          {/* Dashboard */}
          {activeSubTab === 'dashboard' && stats && (
            <div className="flex flex-col gap-6 animate-fade-in">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-dark-card border border-white/10 rounded-2xl p-5">
                  <p className="text-[10px] text-gray-500 font-bold uppercase">{L(language,{fa:'کاربران ثبت‌نام شده',en:'Registered Users',ru:'Пользователи',tr:'Kullanıcılar'})}</p>
                  <p className="text-2xl font-black text-white mt-2">{stats.users ?? '-'}</p>
                </div>
                <div className="bg-dark-card border border-white/10 rounded-2xl p-5">
                  <p className="text-[10px] text-gray-500 font-bold uppercase">{L(language,{fa:'سیستم‌ها',en:'Systems',ru:'Системы',tr:'Sistemler'})}</p>
                  <p className="text-2xl font-black text-white mt-2">{systems.length}</p>
                </div>
                <div className="bg-dark-card border border-white/10 rounded-2xl p-5">
                  <p className="text-[10px] text-gray-500 font-bold uppercase">{L(language,{fa:'سفارشات کافه',en:'Cafe Orders',ru:'Заказы',tr:'Siparişler'})}</p>
                  <p className="text-2xl font-black text-white mt-2">{stats.cafeOrders ?? '-'}</p>
                </div>
                <div className="bg-dark-card border border-white/10 rounded-2xl p-5">
                  <p className="text-[10px] text-gray-500 font-bold uppercase">{L(language,{fa:'تیکت باز',en:'Open Tickets',ru:'Открытые тикеты',tr:'Açık Talepler'})}</p>
                  <p className="text-2xl font-black text-white mt-2">{openTicketCount}</p>
                </div>
              </div>
              <div className="bg-dark-card border border-white/10 rounded-2xl p-6">
                <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2"><BarChart3 className="w-4 h-4 text-primary" /> {L(language,{fa:'نمای کلی',en:'Overview',ru:'Обзор',tr:'Genel Bakış'})}</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs text-gray-400">
                  <div className="p-3 bg-black/30 rounded-xl border border-white/5"><span className="text-gray-500">Tournaments:</span> {tournaments.length}</div>
                  <div className="p-3 bg-black/30 rounded-xl border border-white/5"><span className="text-gray-500">Articles:</span> {articles.length}</div>
                  <div className="p-3 bg-black/30 rounded-xl border border-white/5"><span className="text-gray-500">Sliders:</span> {appSliders.length}</div>
                  <div className="p-3 bg-black/30 rounded-xl border border-white/5"><span className="text-gray-500">Chat Rooms:</span> {chatRooms.length}</div>
                </div>
              </div>
            </div>
          )}

          {/* Systems */}
          {activeSubTab === 'systems' && (
            <div className="flex flex-col gap-6 animate-fade-in">
              <div className="bg-dark-card border border-white/10 rounded-2xl p-6">
                <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2"><Monitor className="w-4 h-4 text-primary" /> {L(language,{fa:'افزودن سیستم جدید',en:'Add New System',ru:'Добавить систему',tr:'Yeni Sistem Ekle'})}</h3>
                <form onSubmit={handleAddSystem} className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  <input value={newSystem.name} onChange={e=>setNewSystem({...newSystem,name:e.target.value})} placeholder={L(language,{fa:'نام سیستم',en:'System name',ru:'Название',tr:'Sistem adı'})} className="bg-[#0d122b] border border-white/10 rounded-lg px-3 py-2 text-xs text-white" required />
                  <select value={newSystem.type} onChange={e=>setNewSystem({...newSystem,type:e.target.value})} className="bg-[#0d122b] border border-white/10 rounded-lg px-3 py-2 text-xs text-white"><option>PC</option><option>PS5</option><option>Xbox</option><option>Simulator</option></select>
                  <input type="number" value={newSystem.hourlyRate} onChange={e=>setNewSystem({...newSystem,hourlyRate:Number(e.target.value)})} className="bg-[#0d122b] border border-white/10 rounded-lg px-3 py-2 text-xs text-white font-mono" />
                  <button type="submit" className="bg-primary text-black font-black rounded-lg text-xs px-4 py-2">{L(language,{fa:'افزودن',en:'Add',ru:'Добавить',tr:'Ekle'})}</button>
                </form>
              </div>
              <div className="bg-dark-card border border-white/10 rounded-2xl p-6">
                <h3 className="text-sm font-bold text-white mb-3">{L(language,{fa:'لیست سیستم‌ها',en:'Systems list',ru:'Список систем',tr:'Sistem listesi'})} ({systems.length})</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[600px] overflow-y-auto">
                  {systems.map((s:any)=>(
                    <div key={s.id||s.name} className="p-3 bg-black/30 border border-white/5 rounded-xl flex justify-between items-center gap-2">
                      <div><p className="text-xs font-bold text-white">{s.name}</p><p className="text-[10px] text-gray-500">{s.type} — {s.hourlyRate}</p></div>
                      <div className="flex gap-1">
                        <button onClick={()=>handleToggleSystem(s.id,s.isActive)} className={`px-2 py-1 rounded text-[10px] font-bold ${s.isActive?'bg-emerald-500/20 text-emerald-300':'bg-amber-500/20 text-amber-300'}`}>{s.isActive?'ON':'OFF'}</button>
                        <button onClick={()=>handleDeleteSystem(s.id)} className="p-1.5 bg-red-500/10 text-red-400 rounded"><Trash2 className="w-3 h-3" /></button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Cafe */}
          {activeSubTab === 'cafe' && (
            <div className="flex flex-col gap-6 animate-fade-in">
              <div className="bg-dark-card border border-white/10 rounded-2xl p-6">
                <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2"><Coffee className="w-4 h-4 text-amber-400" /> {L(language,{fa:'افزودن آیتم کافه',en:'Add Cafe Item',ru:'Добавить позицию',tr:'Kafe Öğesi Ekle'})}</h3>
                <form onSubmit={handleAddCafeItem} className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <input value={newCafe.name} onChange={e=>setNewCafe({...newCafe,name:e.target.value})} placeholder={L(language,{fa:'نام',en:'Name',ru:'Название',tr:'Ad'})} className="bg-[#0d122b] border border-white/10 rounded-lg px-3 py-2 text-xs text-white" required />
                  <input type="number" value={newCafe.price} onChange={e=>setNewCafe({...newCafe,price:Number(e.target.value)})} className="bg-[#0d122b] border border-white/10 rounded-lg px-3 py-2 text-xs text-white font-mono" />
                  <button type="submit" className="bg-amber-500 text-black font-black rounded-lg text-xs px-4 py-2">{L(language,{fa:'افزودن',en:'Add',ru:'Добавить',tr:'Ekle'})}</button>
                </form>
              </div>
              <div className="bg-dark-card border border-white/10 rounded-2xl p-6">
                <h3 className="text-sm font-bold text-white mb-3">{L(language,{fa:'منو',en:'Menu',ru:'Меню',tr:'Menü'})} ({cafeItems.length})</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {cafeItems.map((c:any)=>(
                    <div key={c.id||c.name} className="p-3 bg-black/30 border border-white/5 rounded-xl flex justify-between items-center"><span className="text-xs text-white">{c.name} — {c.price}</span><button onClick={()=>handleDeleteCafeItem(c.id)} className="text-red-400 p-1"><Trash2 className="w-3 h-3" /></button></div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Shop */}
          {activeSubTab === 'shop' && (
            <div className="flex flex-col gap-6 animate-fade-in">
              <div className="bg-dark-card border border-white/10 rounded-2xl p-6">
                <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2"><ShoppingBag className="w-4 h-4 text-emerald-400" /> {L(language,{fa:'افزودن کالا',en:'Add Product',ru:'Добавить товар',tr:'Ürün Ekle'})}</h3>
                <form onSubmit={handleAddAccessory} className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <input value={newAccessory.name} onChange={e=>setNewAccessory({...newAccessory,name:e.target.value})} placeholder={L(language,{fa:'نام کالا',en:'Product name',ru:'Название',tr:'Ürün adı'})} className="bg-[#0d122b] border border-white/10 rounded-lg px-3 py-2 text-xs text-white" required />
                  <input type="number" value={newAccessory.price} onChange={e=>setNewAccessory({...newAccessory,price:Number(e.target.value)})} className="bg-[#0d122b] border border-white/10 rounded-lg px-3 py-2 text-xs text-white font-mono" />
                  <button type="submit" className="bg-emerald-500 text-black font-black rounded-lg text-xs px-4 py-2">{L(language,{fa:'افزودن',en:'Add',ru:'Добавить',tr:'Ekle'})}</button>
                </form>
              </div>
              <div className="bg-dark-card border border-white/10 rounded-2xl p-6">
                <h3 className="text-sm font-bold text-white mb-3">{L(language,{fa:'انبار',en:'Inventory',ru:'Склад',tr:'Stok'})} ({accessories.length})</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {accessories.map((a:any)=><div key={a.id||a.name} className="p-3 bg-black/30 border border-white/5 rounded-xl flex justify-between items-center"><span className="text-xs text-white">{a.name} — {a.price}</span><button onClick={()=>handleDeleteAccessory(a.id)} className="text-red-400 p-1"><Trash2 className="w-3 h-3" /></button></div>)}
                </div>
              </div>
            </div>
          )}

          {/* Tournaments */}
          {activeSubTab === 'tournaments' && (
            <div className="flex flex-col gap-6 animate-fade-in">
              <React.Suspense fallback={<div className="p-8 text-center text-xs text-gray-500">Loading…</div>}><AdminTournamentPlanner language={language as any} notify={addNotification} /></React.Suspense>
            </div>
          )}

          {/* Blog */}
          {activeSubTab === 'blog' && (
            <div className="flex flex-col gap-6 animate-fade-in">
              <div className="bg-dark-card border border-white/10 rounded-2xl p-6">
                <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2"><Newspaper className="w-4 h-4 text-cyan-400" /> {L(language,{fa:'مقاله جدید',en:'New Article',ru:'Новая статья',tr:'Yeni Makale'})}</h3>
                <form onSubmit={handleAddArticle} className="flex flex-col gap-3">
                  <input value={newArticle.title} onChange={e=>setNewArticle({...newArticle,title:e.target.value})} placeholder={L(language,{fa:'عنوان',en:'Title',ru:'Заголовок',tr:'Başlık'})} className="bg-[#0d122b] border border-white/10 rounded-lg px-3 py-2 text-xs text-white" required />
                  <textarea value={newArticle.content} onChange={e=>setNewArticle({...newArticle,content:e.target.value})} rows={4} placeholder={L(language,{fa:'محتوا',en:'Content',ru:'Содержание',tr:'İçerik'})} className="bg-[#0d122b] border border-white/10 rounded-lg px-3 py-2 text-xs text-white" required />
                  <button type="submit" className="self-start bg-cyan-500 text-black font-black rounded-lg text-xs px-6 py-2">{L(language,{fa:'انتشار',en:'Publish',ru:'Опубликовать',tr:'Yayınla'})}</button>
                </form>
              </div>
              <div className="bg-dark-card border border-white/10 rounded-2xl p-6">
                <h3 className="text-sm font-bold text-white mb-3">{L(language,{fa:'مقالات',en:'Articles',ru:'Статьи',tr:'Makaleler'})} ({articles.length})</h3>
                <div className="flex flex-col gap-2">
                  {articles.map((a:any)=><div key={a.id} className="p-3 bg-black/30 border border-white/5 rounded-xl flex justify-between items-center"><span className="text-xs text-white truncate">{a.title}</span><button onClick={()=>handleDeleteArticle(a.id)} className="text-red-400 p-1"><Trash2 className="w-3 h-3" /></button></div>)}
                </div>
              </div>
            </div>
          )}

          {/* Chat */}
          {activeSubTab === 'chat' && (
            <div className="flex flex-col gap-6 animate-fade-in">
              <div className="bg-dark-card border border-white/10 rounded-2xl p-6">
                <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2"><MessageSquare className="w-4 h-4 text-primary" /> {L(language,{fa:'اتاق جدید',en:'New Room',ru:'Новая комната',tr:'Yeni Oda'})}</h3>
                <form onSubmit={handleAddChatRoom} className="flex gap-3"><input value={newChatRoomName} onChange={e=>setNewChatRoomName(e.target.value)} placeholder="e.g. Apex Legends" className="flex-1 bg-[#0d122b] border border-white/10 rounded-lg px-3 py-2 text-xs text-white" required /><button type="submit" className="bg-primary text-black font-black rounded-lg text-xs px-6 py-2">+</button></form>
              </div>
              <div className="bg-dark-card border border-white/10 rounded-2xl p-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">{chatRooms.map((room:string)=><div key={room} className="p-3 bg-black/30 border border-white/5 rounded-xl flex justify-between items-center"><span className="text-xs text-white">{room}</span><button onClick={()=>handleDeleteChatRoom(room)} className="text-red-400 p-1"><Trash2 className="w-3 h-3" /></button></div>)}</div>
              </div>
            </div>
          )}

          {/* Messages */}
          {activeSubTab === 'messages' && (
            <div className="flex flex-col gap-6 animate-fade-in">
              <div className="bg-dark-card border border-white/10 rounded-2xl p-6">
                <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2"><Mail className="w-4 h-4 text-primary" /> {L(language,{fa:'ارسال پیام',en:'Send Message',ru:'Отправить сообщение',tr:'Mesaj Gönder'})}</h3>
                <form onSubmit={handleSendMessage} className="flex flex-col gap-3">
                  <select value={recipient} onChange={e=>setRecipient(e.target.value)} className="bg-[#0d122b] border border-white/10 rounded-lg px-3 py-2 text-xs text-white"><option value="All">All Users</option>{registeredUsers.map((u:any)=><option key={u.username} value={u.username}>{u.username}</option>)}</select>
                  <input value={msgTitle} onChange={e=>setMsgTitle(e.target.value)} placeholder="Title" className="bg-[#0d122b] border border-white/10 rounded-lg px-3 py-2 text-xs text-white" required />
                  <textarea value={msgBody} onChange={e=>setMsgBody(e.target.value)} rows={3} placeholder="Body" className="bg-[#0d122b] border border-white/10 rounded-lg px-3 py-2 text-xs text-white" required />
                  <button type="submit" className="self-start bg-primary text-black font-black rounded-lg text-xs px-6 py-2 flex items-center gap-1"><Send className="w-3 h-3" /> Send</button>
                </form>
              </div>
            </div>
          )}

          {/* Customization - KEEP ORIGINAL COMPLEX SECTION VIA OLD FILE INCLUDE? We'll reuse old logic chunk */}
          {activeSubTab === 'customization' && (
            <div className="animate-fade-in space-y-6">
              {/* Data source */}
              <div className="bg-dark-card border border-white/10 rounded-2xl p-6">
                <h3 className="text-sm font-bold text-white flex items-center gap-2 mb-3"><Database className="w-4 h-4 text-cyan-400" /> {L(language,{fa:'منبع داده',en:'Data Source',ru:'Источник',tr:'Veri Kaynağı'})}</h3>
                <div className="flex gap-3">
                  <button onClick={()=>handleSwitchDataSource('sample')} className={`px-4 py-2 rounded-xl text-xs font-bold border ${dataSource==='sample'?'bg-cyan-500/20 border-cyan-500/40 text-cyan-300':'bg-white/5 border-white/10 text-gray-400'}`}>Sample</button>
                  <button onClick={()=>handleSwitchDataSource('database')} className={`px-4 py-2 rounded-xl text-xs font-bold border ${dataSource==='database'?'bg-emerald-500/20 border-emerald-500/40 text-emerald-300':'bg-white/5 border-white/10 text-gray-400'}`}>Database</button>
                </div>
              </div>
              {/* Club info simplified */}
              <div className="bg-dark-card border border-white/10 rounded-2xl p-6">
                <h3 className="text-sm font-bold text-white mb-4">{L(language,{fa:'اطلاعات کلوپ',en:'Club Info',ru:'Инфо клуба',tr:'Kulüp Bilgileri'})}</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <input value={siteSettings['club_phone']||''} onChange={e=>handleSaveSetting('club_phone',e.target.value)} placeholder="Phone" className="bg-[#0d122b] border border-white/10 rounded-lg px-3 py-2 text-xs text-white" />
                  <input value={siteSettings['club_address']||''} onChange={e=>handleSaveSetting('club_address',e.target.value)} placeholder="Address" className="bg-[#0d122b] border border-white/10 rounded-lg px-3 py-2 text-xs text-white md:col-span-2" />
                </div>
              </div>
              <LegalAdminSection siteSettings={siteSettings} saveSetting={handleSaveSetting} addNotification={addNotification} />
            </div>
          )}

          {/* Themes */}
          {activeSubTab === 'themes' && (
            <div className="animate-fade-in space-y-6">
              <div className="bg-dark-card border border-white/10 rounded-2xl p-6">
                <div className="flex justify-between items-center mb-4"><h3 className="text-sm font-bold text-white flex items-center gap-2"><Layers className="w-4 h-4 text-[#1bc2ca]" /> {L(language,{fa:'قالب‌ها',en:'Themes',ru:'Темы',tr:'Temalar'})}</h3><button onClick={openThemeUploadPanel} className="px-3 py-1.5 bg-[#1bc2ca] text-black rounded-lg text-xs font-bold">{L(language,{fa:'آپلود قالب',en:'Upload Theme',ru:'Загрузить тему',tr:'Tema Yükle'})}</button></div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {availableThemes.map((th:ThemeInfo)=><div key={th.id} className={`p-4 rounded-xl border ${themeId===th.id?'border-primary bg-primary/10':'border-white/5 bg-black/30'}`}><p className="text-xs font-bold text-white">{th.name}</p><p className="text-[10px] text-gray-500 font-mono">{th.id}</p><div className="flex gap-2 mt-3"><button onClick={()=>handleActivateTheme(th)} className="px-2 py-1 bg-white/10 rounded text-[10px] text-white">Activate</button><button onClick={()=>handleExportThemeZip(th)} className="px-2 py-1 bg-white/5 rounded text-[10px] text-gray-400">Export</button><button onClick={()=>handleDeleteTheme(th)} className="px-2 py-1 bg-red-500/10 rounded text-[10px] text-red-400">Delete</button></div></div>)}
                </div>
              </div>
              {showUploadForm && (
                <div ref={themeUploadPanelRef} className="bg-dark-card border border-white/10 rounded-2xl p-6">
                  <h4 className="text-xs font-bold text-white mb-3">{L(language,{fa:'نصب قالب ZIP',en:'Install ZIP Theme',ru:'Установить ZIP тему',tr:'ZIP Tema Yükle'})}</h4>
                  <input type="file" accept=".zip" onChange={handleZipFileSelect} className="text-xs text-gray-400" />
                  {zipParsed && <div className="mt-3 p-3 bg-black/30 rounded-xl border border-white/5 text-xs text-white"><p>{zipParsed.meta.name} — {(zipParsed.css.length/1024).toFixed(1)}KB</p><button onClick={handleInstallZip} disabled={isInstallingZip} className="mt-2 px-4 py-1.5 bg-primary text-black rounded-lg font-bold text-xs">{isInstallingZip?'Installing…':'Install'}</button></div>}
                  {zipError && <p className="mt-2 text-xs text-red-400">{zipError}</p>}
                  {installJob && <p className="mt-2 text-xs text-amber-300 font-mono">{installJob.status} {installJob.filesDone}/{installJob.filesTotal}</p>}
                </div>
              )}
            </div>
          )}

          {/* App Slider */}
          {activeSubTab === 'appSlider' && (
            <div className="bg-dark-card border border-white/10 rounded-2xl p-6">
              <h3 className="text-sm font-bold text-white mb-4">{L(language,{fa:'اسلایدر',en:'Slider',ru:'Слайдер',tr:'Slayt'})}</h3>
              <form onSubmit={editingSlideId?handleEditSlide:handleAddSlide} className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <input value={newSlideUrl} onChange={e=>setNewSlideUrl(e.target.value)} placeholder="/images/..." className="bg-[#0d122b] border border-white/10 rounded-lg px-3 py-2 text-xs text-white md:col-span-2" required />
                <input value={newSlideTitleFa} onChange={e=>setNewSlideTitleFa(e.target.value)} placeholder="FA Title" className="bg-[#0d122b] border border-white/10 rounded-lg px-3 py-2 text-xs text-white" required />
                <input value={newSlideTitleEn} onChange={e=>setNewSlideTitleEn(e.target.value)} placeholder="EN Title" className="bg-[#0d122b] border border-white/10 rounded-lg px-3 py-2 text-xs text-white" required />
                <button type="submit" className="bg-amber-500 text-black font-black rounded-lg text-xs px-4 py-2">{editingSlideId?'Save':'Add'}</button>
                {editingSlideId && <button type="button" onClick={cancelEditSlide} className="bg-white/10 text-white rounded-lg text-xs px-4 py-2">Cancel</button>}
              </form>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">{appSliders.map((s:any)=><div key={s.id} className="p-3 bg-black/30 border border-white/5 rounded-xl flex justify-between items-center"><span className="text-xs text-white truncate">{s.titleFa}</span><div className="flex gap-1"><button onClick={()=>startEditSlide(s)} className="text-blue-400 p-1"><Edit className="w-3 h-3" /></button><button onClick={()=>handleDeleteSlide(s.id)} className="text-red-400 p-1"><Trash2 className="w-3 h-3" /></button></div></div>)}</div>
            </div>
          )}

          {/* Mobile App */}
          {activeSubTab === 'mobileAppDownload' && (
            <React.Suspense fallback={<div className="p-8 text-center text-xs">Loading…</div>}><AdminMobileAppDownloadPanel addNotification={addNotification} /></React.Suspense>
          )}

          {/* DB Logs */}
          {activeSubTab === 'dbLogs' && (
            <div className="bg-dark-card border border-white/10 rounded-2xl p-6">
              <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2"><Database className="w-4 h-4 text-emerald-400" /> DB Logs ({dbLogsList.length})</h3>
              <div className="bg-black/80 rounded-xl p-3 font-mono text-[11px] max-h-[500px] overflow-y-auto space-y-2">
                {dbLogsList.map((log:any,i:number)=><div key={i} className="p-2 bg-white/5 rounded"><span className="text-emerald-400">{log.provider}</span> <span className="text-amber-300">{log.type||log.operation}</span> <span className="text-gray-300">{log.command||log.query}</span></div>)}
              </div>
            </div>
          )}

          {/* Migrations */}
          {activeSubTab === 'migrations' && (
            <div className="bg-dark-card border border-white/10 rounded-2xl p-6">
              <h3 className="text-sm font-bold text-white mb-3">{L(language,{fa:'مهاجرت‌ها',en:'Migrations',ru:'Миграции',tr:'Geçişler'})}</h3>
              <pre className="bg-black/60 p-4 rounded-xl text-[10px] text-gray-300 overflow-x-auto max-h-[500px]">{migrationsCode||'No code'}</pre>
              <button onClick={copyMigrationsToClipboard} className="mt-3 px-3 py-1.5 bg-white/10 rounded text-xs text-white">Copy</button>
            </div>
          )}

          {/* Presentation */}
          {activeSubTab === 'presentation' && (
            <React.Suspense fallback={<div className="p-8 text-center text-xs">Loading…</div>}><PresentationTab addNotification={addNotification} /></React.Suspense>
          )}
          {activeSubTab === 'tickets' && (
            <React.Suspense fallback={<div className="p-8 text-center text-xs">Loading…</div>}><AdminTicketsSection addNotification={addNotification} /></React.Suspense>
          )}
          {activeSubTab === 'wallet' && (
            <React.Suspense fallback={<div className="p-8 text-center text-xs">Loading…</div>}><AdminWalletSection addNotification={addNotification} /></React.Suspense>
          )}
          {activeSubTab === 'affiliates' && (
            <React.Suspense fallback={<div className="p-8 text-center text-xs">Loading…</div>}><AdminAffiliatesSection addNotification={addNotification} /></React.Suspense>
          )}
          {activeSubTab === 'promotions' && (
            <React.Suspense fallback={<div className="p-8 text-center text-xs">Loading…</div>}><OpsProvider language={language}><PromotionsConsole /></OpsProvider></React.Suspense>
          )}
          {activeSubTab === 'jarvis' && (
            <React.Suspense fallback={<div className="p-8 text-center text-xs">Loading…</div>}><OpsProvider language={language}><JarvisConsole /></OpsProvider></React.Suspense>
          )}
          {activeSubTab === 'tournamentOps' && (
            <React.Suspense fallback={<div className="p-8 text-center text-xs">Loading…</div>}><OpsProvider language={language}><TournamentsOpsConsole /></OpsProvider></React.Suspense>
          )}
          {activeSubTab === 'messaging' && (
            <React.Suspense fallback={<div className="p-8 text-center text-xs">Loading…</div>}><AdminMessagingPanel language={language} notify={addNotification} /></React.Suspense>
          )}
          {activeSubTab === 'content' && (
            <React.Suspense fallback={<div className="p-8 text-center text-xs">Loading…</div>}><OpsProvider language={language}><ContentOpsConsole /></OpsProvider></React.Suspense>
          )}

            </>
          )}
        </div>
      </div>

      {/* New Guide */}
      <AdminGuide section={activeSubTab} isOpen={guideOpen} onClose={()=>setGuideOpen(false)} language={language as any} dir={dir} />
    </div>
  );
}
