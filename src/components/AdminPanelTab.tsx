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
  Download
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import ThemeScreenshot from './ThemeScreenshot';
import VisualHelpGuide from './VisualHelpGuide';
import AdminMobileAppDownloadPanel from './AdminMobileAppDownloadPanel';
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
  systems:           { fa: 'مدیریت کلاینت‌ها و سیستم‌ها', en: 'Clients & Systems', ru: 'Клиенты и системы', tr: 'İstemciler ve Sistemler', keywords: 'pc ps5 console کنسول کامپیوتر رزرو reservation station' },
  cafe:              { fa: 'بوفه و کافه', en: 'Cafe Buffet', ru: 'Кафе-буфет', tr: 'Kafe Büfe', keywords: 'menu منو غذا نوشیدنی food drink' },
  shop:              { fa: 'فروشگاه لوازم جانبی', en: 'Accessory Shop', ru: 'Магазин аксессуаров', tr: 'Ekipman Mağazası', keywords: 'products محصول کالا mouse headset' },
  tournaments:       { fa: 'مسابقات و تورنمنت‌ها', en: 'Tournaments', ru: 'Турниры', tr: 'Turnuvalar', keywords: 'match تورنمنت جایزه prize bracket' },
  blog:              { fa: 'وبلاگ و اخبار', en: 'Blog & News', ru: 'Блог и новости', tr: 'Blog ve Haberler', keywords: 'article مقاله خبر post' },
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
};

const PresentationTab = React.lazy(() => import('./PresentationTab'));

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

  // Messages form and states
  const [recipient, setRecipient] = useState('All');
  const [msgTitle, setMsgTitle] = useState('');
  const [msgBody, setMsgBody] = useState('');
  const [sendAsNotification, setSendAsNotification] = useState(false);
  const [registeredUsers, setRegisteredUsers] = useState<any[]>([]);
  const [messagesList, setMessagesList] = useState<any[]>([]);

  // Form states for adding items
  const [newSystem, setNewSystem] = useState({ name: '', type: 'PC', hourlyRate: 25000, isActive: true });
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
        setAppSliders(res.appSliders);
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
        setAppSliders(res.appSliders);
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
        setAppSliders(res.appSliders);
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

  /* ---------- نصب روی سرور (پوشه اختصاصی قالب + assets) ---------- */
  const handleInstallZip = async () => {
    if (!zipParsed || !zipFileBytes) return;
    if (!setAvailableThemes) return;

    setIsInstallingZip(true);
    try {
      const replace = zipReplacesExisting ? '&replace=1' : '';
      const res = await fetch(`/api/admin/themes/install?name=${encodeURIComponent(zipParsed.meta.name || zipFileName)}${replace}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/zip' },
        body: zipFileBytes as unknown as BodyInit,
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setZipError(data.error || L(language, { fa: 'خطا در نصب قالب', en: 'Theme installation failed', ru: 'Не удалось установить тему', tr: 'Tema kurulumu başarısız' }));
        addNotification(L(language, { fa: `خطا در نصب: ${data.error || ''}`, en: `Install error: ${data.error || ''}`, ru: `Ошибка установки: ${data.error || ''}`, tr: `Yükleme hatası: ${data.error || ''}` }), 'error');
        return;
      }

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

  const handleDeleteSystem = async (sysId: string) => {
    try {
      const res = await fetch(`/api/admin/systems/${sysId}`, { method: 'DELETE' }).then(r => r.json());
      if (res.success) {
        setSystems(res.systems);
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
        setCafeItems(res.cafeItems);
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
        setTournaments(res.tournaments);
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
        setAccessories(res.accessories);
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
        setArticles(res.articles);
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
        setChatRooms(res.chatRooms);
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
        setChatRooms(res.chatRooms);
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
        setNewSystem({ name: '', type: 'PC', hourlyRate: 25000, isActive: true });
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

  return (
    <div className="animate-fade-in font-sans" dir={dir}>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Admin Left/Right Sidebar Menu (Adaptive direction) */}
        <div className="lg:col-span-3 flex flex-col gap-2 bg-dark-card border border-white/10 p-4 rounded-2xl h-fit">
          <div className="mb-4 border-b border-white/5 pb-4">
            <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
              <Settings className="w-4 h-4 text-primary animate-spin" />
              <span>
                {L(language, { fa: 'پنل مدیریت سالن', en: 'Gaming Arena Admin', ru: 'Панель управления клубом', tr: 'Salon Yönetim Paneli' })}
              </span>
            </h3>
            <p className="text-[10px] text-gray-500 font-bold mt-1">BAZINO HQ Control Station</p>
          </div>

          <button
            onClick={() => setActiveSubTab('dashboard')}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition-all text-left ${dir === 'rtl' ? 'text-right' : 'text-left'} ${
              activeSubTab === 'dashboard'
                ? 'bg-primary text-black shadow-[0_0_12px_rgba(0,240,255,0.3)]'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            <span>{L(language, { fa: 'داشبورد و آمار زنده', en: 'Dashboard & Live Stats', ru: 'Дашборд и живая статистика', tr: 'Gösterge Paneli ve Canlı İstatistikler' })}</span>
          </button>

          <button
            onClick={() => setActiveSubTab('systems')}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition-all text-left ${dir === 'rtl' ? 'text-right' : 'text-left'} ${
              activeSubTab === 'systems'
                ? 'bg-primary text-black shadow-[0_0_12px_rgba(0,240,255,0.3)]'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Monitor className="w-4 h-4" />
            <span>{L(language, { fa: 'مدیریت کلاینت‌ها / سیستم‌ها', en: 'Systems & Clients', ru: 'Системы и клиенты', tr: 'İstemciler / Sistemler' })}</span>
          </button>

          <button
            onClick={() => setActiveSubTab('cafe')}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition-all text-left ${dir === 'rtl' ? 'text-right' : 'text-left'} ${
              activeSubTab === 'cafe'
                ? 'bg-primary text-black shadow-[0_0_12px_rgba(0,240,255,0.3)]'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Coffee className="w-4 h-4" />
            <span>{L(language, { fa: 'بوفه کافه و سفارشات', en: 'Cafe Buffet Orders', ru: 'Буфет и заказы', tr: 'Kafe Büfe ve Siparişler' })}</span>
          </button>

          <button
            onClick={() => setActiveSubTab('shop')}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition-all text-left ${dir === 'rtl' ? 'text-right' : 'text-left'} ${
              activeSubTab === 'shop'
                ? 'bg-primary text-black shadow-[0_0_12px_rgba(0,240,255,0.3)]'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <ShoppingBag className="w-4 h-4" />
            <span>{L(language, { fa: 'انبار فروشگاه قطعات', en: 'Accessory Storehouse', ru: 'Склад магазина', tr: 'Aksesuar Mağaza Deposu' })}</span>
          </button>

          <button
            onClick={() => setActiveSubTab('tournaments')}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition-all text-left ${dir === 'rtl' ? 'text-right' : 'text-left'} ${
              activeSubTab === 'tournaments'
                ? 'bg-primary text-black shadow-[0_0_12px_rgba(0,240,255,0.3)]'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Trophy className="w-4 h-4" />
            <span>{L(language, { fa: 'برنامه‌ریزی تورنمنت‌ها', en: 'Tournaments Planner', ru: 'Планировщик турниров', tr: 'Turnuva Planlayıcı' })}</span>
          </button>

          <button
            onClick={() => setActiveSubTab('blog')}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition-all text-left ${dir === 'rtl' ? 'text-right' : 'text-left'} ${
              activeSubTab === 'blog'
                ? 'bg-primary text-black shadow-[0_0_12px_rgba(0,240,255,0.3)]'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Newspaper className="w-4 h-4" />
            <span>{L(language, { fa: 'انتشار اخبار بلاگ', en: 'Blog News Publisher', ru: 'Публикация блога', tr: 'Blog Haber Yayını' })}</span>
          </button>

          <button
            onClick={() => setActiveSubTab('chat')}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition-all text-left ${dir === 'rtl' ? 'text-right' : 'text-left'} ${
              activeSubTab === 'chat'
                ? 'bg-primary text-black shadow-[0_0_12px_rgba(0,240,255,0.3)]'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            <span>{L(language, { fa: 'اتاق‌های گفتگوی زنده', en: 'Live Chat Rooms', ru: 'Живые чат-комнаты', tr: 'Canlı Sohbet Odaları' })}</span>
          </button>

          <button
            onClick={() => setActiveSubTab('messages')}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition-all text-left ${dir === 'rtl' ? 'text-right' : 'text-left'} ${
              activeSubTab === 'messages'
                ? 'bg-primary text-black shadow-[0_0_12px_rgba(255,184,0,0.3)]'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Mail className="w-4 h-4" />
            <span>{L(language, { fa: 'ارسال پیام و نوتیفیکیشن', en: 'Send Messages / Notifs', ru: 'Сообщения и уведомления', tr: 'Mesaj ve Bildirim Gönder' })}</span>
          </button>

          <button
            onClick={() => setActiveSubTab('migrations')}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition-all text-left ${dir === 'rtl' ? 'text-right' : 'text-left'} ${
              activeSubTab === 'migrations'
                ? 'bg-[#A855F7] text-white shadow-[0_0_12px_rgba(168,85,247,0.3)] border border-[#A855F7]/30'
                : 'text-purple-400 hover:text-white hover:bg-[#A855F7]/5'
            }`}
          >
            <Database className="w-4 h-4" />
            <span>{L(language, { fa: 'مهاجرت‌های EF Core', en: 'EF Core Migrations', ru: 'Миграции EF Core', tr: 'EF Core Geçişleri' })}</span>
          </button>
          <button
            onClick={() => setActiveSubTab('themes')}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition-all text-left ${dir === 'rtl' ? 'text-right' : 'text-left'} ${
              activeSubTab === 'themes'
                ? 'bg-[#1bc2ca] text-black shadow-[0_0_12px_rgba(27,194,202,0.3)]'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
            </svg>
            <span>{L(language, { fa: 'مدیریت قالب‌ها', en: 'Themes', ru: 'Темы', tr: 'Tema Yönetimi' })}</span>
          </button>
          <button
            onClick={() => setActiveSubTab('appSlider')}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition-all text-left ${dir === 'rtl' ? 'text-right' : 'text-left'} ${
              activeSubTab === 'appSlider'
                ? 'bg-amber-500 text-black shadow-[0_0_12px_rgba(245,158,11,0.3)]'
                : 'text-amber-500 hover:text-white hover:bg-amber-500/5'
            }`}
          >
            <Sparkles className="w-4 h-4 animate-pulse" />
            <span>{L(language, { fa: 'اسلایدر اپلیکیشن فلاتر', en: 'Flutter App Slider', ru: 'Слайдер Flutter-приложения', tr: 'Flutter Uygulama Slaytı' })}</span>
          </button>
          <button
            onClick={() => setActiveSubTab('mobileAppDownload')}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition-all text-left ${dir === 'rtl' ? 'text-right' : 'text-left'} ${
              activeSubTab === 'mobileAppDownload'
                ? 'bg-cyan-400 text-black shadow-[0_0_12px_rgba(34,211,238,0.3)]'
                : 'text-cyan-300 hover:text-white hover:bg-cyan-400/5'
            }`}
          >
            <Smartphone className="w-4 h-4" />
            <span>{L(language, { fa: 'دانلود اپلیکیشن', en: 'App Download', ru: 'Скачать приложение', tr: 'Uygulama İndirme' })}</span>
          </button>
          <button
            onClick={() => setActiveSubTab('customization')}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition-all text-left ${dir === 'rtl' ? 'text-right' : 'text-left'} ${
              activeSubTab === 'customization'
                ? 'bg-emerald-500 text-black shadow-[0_0_12px_rgba(16,185,129,0.3)]'
                : 'text-emerald-400 hover:text-white hover:bg-emerald-500/5'
            }`}
          >
            <Sliders className="w-4 h-4" />
            <span>{L(language, { fa: 'سفارشی‌سازی کلوپ', en: 'Club Customization', ru: 'Настройка клуба', tr: 'Kulüp Özelleştirme' })}</span>
          </button>
          <button
            onClick={() => setActiveSubTab('dbLogs')}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition-all text-left ${dir === 'rtl' ? 'text-right' : 'text-left'} ${
              activeSubTab === 'dbLogs'
                ? 'bg-emerald-500 text-black shadow-[0_0_12px_rgba(16,185,129,0.3)]'
                : 'text-emerald-400 hover:text-white hover:bg-emerald-500/5'
            }`}
          >
            <Database className="w-4 h-4" />
            <span>{L(language, { fa: 'لاگ‌های دیتابیس (SQL/NoSQL)', en: 'Database Provider Logs', ru: 'Логи БД (SQL/NoSQL)', tr: 'Veritabanı Günlükleri (SQL/NoSQL)' })}</span>
          </button>
          
          <button
            onClick={() => setActiveSubTab('apiKeys')}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition-all text-left ${dir === 'rtl' ? 'text-right' : 'text-left'} ${
              activeSubTab === 'apiKeys'
                ? 'bg-blue-500 text-black shadow-[0_0_12px_rgba(59,130,246,0.3)]'
                : 'text-blue-400 hover:text-white hover:bg-blue-500/5'
            }`}
          >
            <Key className="w-4 h-4" />
            <span>{L(language, { fa: 'تنظیمات API Key و اتصالات', en: 'API Keys & Connections', ru: 'API-ключи и подключения', tr: 'API Anahtarları ve Bağlantılar' })}</span>
          </button>
          
          <button
            onClick={() => setActiveSubTab('presentation')}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition-all text-left ${dir === 'rtl' ? 'text-right' : 'text-left'} ${
              activeSubTab === 'presentation'
                ? 'bg-primary text-black shadow-[0_0_12px_rgba(0,240,255,0.3)]'
                : 'text-primary hover:text-white hover:bg-primary/5'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>{L(language, { fa: 'پرزنتیشن', en: 'Presentation', ru: 'Презентация', tr: 'Sunum' })}</span>
          </button>
        </div>

        {/* Admin Center Control Panel Workspace */}
        <div className="lg:col-span-9 flex flex-col gap-6">

          {/* Section header: عنوان بخش فعال + جستجوی سریع بخش‌ها */}
          <div className="bg-dark-card border border-white/10 px-5 py-4 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0" data-testid="admin-section-header">
            <div className="min-w-0">
              <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest font-mono">
                {L(language, { fa: 'پنل مدیریت', en: 'Admin Panel', ru: 'Панель управления', tr: 'Yönetim Paneli' })} <span className="text-gray-600">/</span> <span className="text-primary/80" dir="ltr">{pathFromAdminSection(activeSubTab)}</span>
              </p>
              <h2 className="text-lg md:text-xl font-black text-white font-display mt-1 truncate" data-testid="admin-section-title">
                {L(language, ADMIN_SECTION_META[activeSubTab])}
              </h2>
            </div>
            <div className="relative w-full md:w-80 shrink-0" ref={sectionSearchRef}>
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
                placeholder={L(language, { fa: 'جستجوی سریع بخش‌ها… (مثلاً قالب، اسلایدر)', en: 'Quick find a section… (e.g. themes, slider)', ru: 'Быстрый поиск раздела… (темы, слайдер)', tr: 'Bölüm ara… (tema, slayt)' })}
                aria-label={L(language, { fa: 'جستجوی بخش‌های پنل', en: 'Search admin sections', ru: 'Поиск разделов', tr: 'Bölüm ara' })}
                data-testid="admin-section-search"
                className={`w-full bg-black/40 border border-white/10 focus:border-primary/60 rounded-xl py-2.5 text-xs text-white placeholder:text-gray-600 outline-none transition-colors ${dir === 'rtl' ? 'pr-9 pl-3' : 'pl-9 pr-3'}`}
              />
              {isSectionSearchOpen && sectionQuery.trim() && (
                <ul className="absolute z-40 mt-2 w-full bg-[#0d1020] border border-white/10 rounded-xl shadow-2xl overflow-hidden max-h-72 overflow-y-auto" role="listbox" data-testid="admin-section-results">
                  {sectionMatches.length === 0 && (
                    <li className="px-4 py-3 text-xs text-gray-500">{L(language, { fa: 'بخشی پیدا نشد', en: 'No section found', ru: 'Раздел не найден', tr: 'Bölüm bulunamadı' })}</li>
                  )}
                  {sectionMatches.map((k) => (
                    <li key={k} role="option">
                      <a
                        href={pathFromAdminSection(k)}
                        onClick={(e) => { e.preventDefault(); setActiveSubTab(k); setSectionQuery(''); setIsSectionSearchOpen(false); }}
                        className={`flex items-center justify-between gap-3 px-4 py-2.5 text-xs hover:bg-primary/10 transition-colors ${activeSubTab === k ? 'text-primary' : 'text-gray-200'}`}
                      >
                        <span className="font-bold">{L(language, ADMIN_SECTION_META[k])}</span>
                        <span className="text-[10px] text-gray-500 font-mono" dir="ltr">{pathFromAdminSection(k)}</span>
                      </a>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
          
          {/* Quick Context-Aware Section Guide Bar */}
          <div className="bg-[#121424] border border-white/10 p-4 rounded-2xl flex items-center justify-between gap-4 animate-fade-in shrink-0">
            <div className="flex items-center gap-3">
              <span className="p-2 bg-primary/15 border border-primary/30 text-primary rounded-xl">
                <HelpCircle className="w-5 h-5 text-primary" />
              </span>
              <div>
                <h4 className="text-xs font-black text-white font-display">
                  {(() => {
                    const names: Record<string, { fa: string; en: string; ru: string; tr: string }> = {
                      dashboard: { fa: 'داشبورد', en: 'Dashboard', ru: 'Панель', tr: 'Panel' },
                      systems: { fa: 'مدیریت کلاینت‌ها', en: 'Client Management', ru: 'Управление клиентами', tr: 'İstemci Yönetimi' },
                      cafe: { fa: 'بوفه کافه', en: 'Cafe Buffet', ru: 'Кафе-буфет', tr: 'Kafe Büfe' },
                      shop: { fa: 'فروشگاه جانبی', en: 'Accessory Shop', ru: 'Магазин аксессуаров', tr: 'Ekipman Mağazası' },
                      tournaments: { fa: 'مسابقات', en: 'Tournaments', ru: 'Турниры', tr: 'Turnuvalar' },
                      blog: { fa: 'وبلاگ و اخبار', en: 'Blog & News', ru: 'Блог и новости', tr: 'Blog ve Haberler' },
                      chat: { fa: 'اتاق‌های گفتگوی زنده', en: 'Live Chat Rooms', ru: 'Живые чат-комнаты', tr: 'Canlı Sohbet Odaları' },
                      migrations: { fa: 'مهاجرت‌های دیتابیس', en: 'Database Migrations', ru: 'Миграции БД', tr: 'Veritabanı Geçişleri' },
                      messages: { fa: 'پیام‌ها و اعلان‌ها', en: 'Messages & Notifications', ru: 'Сообщения и уведомления', tr: 'Mesajlar ve Bildirimler' },
                      themes: { fa: 'قالب‌ها', en: 'Themes', ru: 'Темы', tr: 'Temalar' },
                      appSlider: { fa: 'اسلایدر اپ', en: 'App Slider', ru: 'Слайдер приложения', tr: 'Uygulama Slaytı' },
                      mobileAppDownload: { fa: 'دانلود اپلیکیشن', en: 'App Download', ru: 'Загрузка приложения', tr: 'Uygulama İndirme' },
                      customization: { fa: 'سفارشی‌سازی', en: 'Customization', ru: 'Настройка', tr: 'Özelleştirme' },
                      dbLogs: { fa: 'لاگ‌های دیتابیس', en: 'Database Logs', ru: 'Логи БД', tr: 'Veritabanı Günlükleri' },
                      presentation: { fa: 'پرزنتیشن', en: 'Presentation', ru: 'Презентация', tr: 'Sunum' },
                    };
                    const name = L(language, names[activeSubTab] ?? { fa: 'تنظیمات کلید‌ها', en: 'API Keys', ru: 'Настройки ключей', tr: 'Anahtar Ayarları' });
                    return L(language, {
                      fa: `آیا در کار با بخش «${name}» نیاز به راهنمایی دارید؟`,
                      en: `Need assistance with the "${name}" section?`,
                      ru: `Нужна помощь с разделом «${name}»?`,
                      tr: `"${name}" bölümünde yardıma mı ihtiyacınız var?`,
                    });
                  })()}
                </h4>
                <p className="text-[10px] text-gray-400 font-medium mt-0.5">
                  {L(language, { fa: 'مشاهده راهنمای مصور تعاملی، چیدمان فیلدها و سناریوهای کاربردی این زبانه.', en: 'Open interactive screenshots, simulated flows and visual walkthrough steps.', ru: 'Интерактивные скриншоты, схемы полей и практические сценарии этой вкладки.', tr: 'Bu sekmenin etkileşimli ekran görüntüleri, alan düzeni ve kullanım senaryoları.' })}
                </p>
              </div>
            </div>

            <button
              onClick={() => setIsLocalHelpOpen(true)}
              className="px-3.5 py-2 bg-primary hover:bg-primary-hover text-black text-[10px] font-black rounded-lg transition-all flex items-center gap-1 cursor-pointer active:scale-95 shadow-[0_0_12px_rgba(255,184,0,0.2)]"
            >
              <span>{L(language, { fa: 'راهنمای تصویری این بخش', en: 'Section Visual Guide', ru: 'Визуальный гид раздела', tr: 'Bölüm Görsel Rehberi' })}</span>
            </button>
          </div>
          
          {activeSubTab === 'appSlider' && (
            <div className="animate-fade-in space-y-6">
              <div className="bg-dark-card border border-white/10 rounded-2xl p-6">
                <h3 className="text-sm font-bold text-white mb-6 flex items-center gap-2 font-display uppercase tracking-wider border-b border-white/5 pb-3">
                  <Sparkles className="w-4 h-4 text-amber-500 animate-pulse" />
                  <span>{L(language, { fa: 'افزودن اسلاید جدید برای اپلیکیشن فلاتر', en: 'Add New Slide for Flutter App', ru: 'Добавить слайд для Flutter-приложения', tr: 'Flutter Uygulaması için Yeni Slayt Ekle' })}</span>
                </h3>

                <form onSubmit={handleAddSlide} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="text-xs text-gray-400 block mb-1.5 font-bold">{L(language, { fa: 'آدرس تصویر اسلایدر', en: 'Slider image URL', ru: 'URL изображения слайдера', tr: 'Slayt görsel adresi' })}</label>
                    <input 
                      type="text" 
                      required 
                      placeholder="/images/home/esports-480.webp"
                      value={newSlideUrl}
                      onChange={(e) => setNewSlideUrl(e.target.value)}
                      className="w-full bg-[#0d122b] border border-white/10 rounded-lg px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-primary font-mono"
                    />
                  </div>
                  <div className="md:col-span-2 space-y-2">
                    <label className="text-xs text-gray-400 block mb-1 font-bold">{L(language, { fa: 'تصویر عمودی نسخه موبایل (اختیاری)', en: 'Vertical mobile version image (optional)', ru: 'Вертикальное изображение для мобильной версии (необязательно)', tr: 'Dikey mobil sürüm görseli (isteğe bağlı)' })}</label>
                    <input 
                      type="text"
                      placeholder="/images/mobile/generated/..."
                      value={newSlideMobileUrl}
                      onChange={(e) => setNewSlideMobileUrl(e.target.value)}
                      className="w-full bg-[#0d122b] border border-white/10 rounded-lg px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-primary font-mono"
                    />
                    <label className="flex items-center gap-2 text-[10px] text-gray-400 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={newSlideAutoMobile}
                        onChange={(e) => setNewSlideAutoMobile(e.target.checked)}
                        className="accent-primary w-3.5 h-3.5"
                      />
                      <span>{L(language, { fa: 'اگر فیلد بالا خالی بود، ساخت خودکار نسخه عمودی موبایل از روی تصویر اصلی', en: 'If empty, auto-generate a vertical mobile version from the main image', ru: 'Если поле пустое — вертикальная мобильная версия создаётся автоматически из основного изображения', tr: 'Üstteki alan boşsa, ana görselden otomatik olarak dikey mobil sürüm oluşturulur' })}</span>
                    </label>
                  </div>
                  
                  <div>
                    <label className="text-xs text-gray-400 block mb-1.5 font-bold">{L(language, { fa: 'عنوان فارسی اسلاید (توضیحات کوتاه)', en: 'Slide title (Persian, short)', ru: 'Заголовок слайда (персидский, кратко)', tr: 'Slayt başlığı (Farsça, kısa)' })}</label>
                    <input 
                      type="text" 
                      placeholder={L(language, { fa: 'مثلا: سفارش برگر مخصوص کافه با ۳۰٪ تخفیف', en: 'e.g. Special cafe burger with 30% off', ru: 'Напр.: фирменный бургер со скидкой 30%', tr: 'Örn: %30 indirimli özel kafe burgeri' })}
                      value={newSlideTitleFa}
                      onChange={(e) => setNewSlideTitleFa(e.target.value)}
                      className="w-full bg-[#0d122b] border border-white/10 rounded-lg px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-primary font-bold"
                    />
                  </div>

                  <div>
                    <label className="text-xs text-gray-400 block mb-1.5 font-bold">{L(language, { fa: 'عنوان انگلیسی اسلاید', en: 'Slide title (English)', ru: 'Заголовок слайда (английский)', tr: 'Slayt başlığı (İngilizce)' })}</label>
                    <input 
                      type="text" 
                      placeholder="e.g. 30% Off Special Burgers"
                      value={newSlideTitleEn}
                      onChange={(e) => setNewSlideTitleEn(e.target.value)}
                      className="w-full bg-[#0d122b] border border-white/10 rounded-lg px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-primary"
                    />
                  </div>

                  <div>
                    <label className="text-xs text-gray-400 block mb-1.5 font-bold">{L(language, { fa: 'بخش هدف (وقتی کاربر روی این اسلاید کلیک کند به اینجا هدایت می‌شود)', en: 'Target section (where the user goes when tapping this slide)', ru: 'Целевой раздел (куда ведёт нажатие на слайд)', tr: 'Hedef bölüm (kullanıcı bu slayta dokununca buraya gider)' })}</label>
                    <select
                      value={newSlideTarget}
                      onChange={(e) => setNewSlideTarget(e.target.value)}
                      className="w-full bg-[#0d122b] border border-white/10 rounded-lg px-3 py-2.5 text-xs text-white focus:outline-none focus:border-primary font-bold"
                    >
                      <option value="reserve">{L(language, { fa: 'صفحه رزرو سیستم‌ها', en: 'Systems Reservation', ru: 'Бронирование систем', tr: 'Sistem Rezervasyon Sayfası' })}</option>
                      <option value="cafe">{L(language, { fa: 'بخش منو و سفارشات کافه', en: 'Cafe Menu & Orders', ru: 'Меню и заказы кафе', tr: 'Kafe Menüsü ve Siparişler' })}</option>
                      <option value="shop">{L(language, { fa: 'فروشگاه جانبی گیمینگ', en: 'Gaming Accessories Shop', ru: 'Магазин игровых аксессуаров', tr: 'Oyun Aksesuar Mağazası' })}</option>
                      <option value="tournaments">{L(language, { fa: 'لیست مسابقات و تورنمنت‌ها', en: 'Tournaments & Esports', ru: 'Турниры и киберспорт', tr: 'Turnuvalar ve Espor' })}</option>
                      <option value="loyalty">{L(language, { fa: 'باشگاه مشتریان و مشخصات کاربری', en: 'Loyalty Club & User Profile', ru: 'Клуб лояльности и профиль', tr: 'Sadakat Kulübü ve Kullanıcı Profili' })}</option>
                    </select>
                  </div>

                  <div className="md:col-span-2 flex justify-end">
                    <button 
                      type="submit"
                      className="px-6 bg-amber-500 hover:bg-amber-600 text-black py-2.5 rounded-lg text-xs font-black cursor-pointer flex items-center gap-1.5 border border-amber-500/20 shadow-[0_0_15px_rgba(245,158,11,0.2)] transition-all font-display uppercase tracking-wide"
                    >
                      <Plus className="w-4 h-4" />
                      <span>{L(language, { fa: 'ثبت و انتشار در اسلایدر اپلیکیشن', en: 'Save & publish to app slider', ru: 'Сохранить и опубликовать в слайдере приложения', tr: 'Kaydet ve uygulama slaytında yayınla' })}</span>
                    </button>
                  </div>
                </form>
              </div>

              {/* Slider preview & existing list */}
              <div className="bg-dark-card border border-white/10 rounded-2xl p-6">
                <h3 className="text-sm font-bold text-white mb-4">{L(language, { fa: 'اسلایدهای فعال در اپلیکیشن موبایل', en: 'Active slides in the mobile app', ru: 'Активные слайды мобильного приложения', tr: 'Mobil uygulamadaki aktif slaytlar' })}</h3>
                {appSliders.length === 0 ? (
                  <div className="text-center py-8 text-gray-500 text-xs font-bold">
                    {L(language, { fa: 'هیچ تصویری برای اسلایدر ثبت نشده است.', en: 'No slider images registered.', ru: 'Изображения для слайдера не добавлены.', tr: 'Slayt için kayıtlı görsel yok.' })}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {appSliders.map((slide) => (
                      <div key={slide.id} className="relative bg-[#0d122b] border border-white/5 rounded-xl overflow-hidden flex flex-col group">
                        <div className="h-40 w-full relative overflow-hidden bg-black/50">
                          <img loading="lazy" 
                            src={slide.imageUrl} 
                            alt={slide.titleFa} 
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover transition-transform group-hover:scale-105"
                          />
                          <div className="absolute top-2 left-2 bg-black/65 px-2.5 py-1 rounded-full text-[10px] font-mono text-amber-500 font-bold uppercase tracking-wider border border-white/5">
                            {slide.target}
                          </div>
                        </div>
                        <div className="p-4 flex flex-col justify-between flex-grow gap-2">
                          <div>
                            <p className="text-xs font-bold text-white mb-1">{slide.titleFa || L(language, { fa: 'بدون عنوان فارسی', en: 'No Persian title', ru: 'Без персидского заголовка', tr: 'Farsça başlık yok' })}</p>
                            <p className="text-[10px] text-gray-400 font-mono">{slide.titleEn || 'No English Title'}</p>
                          </div>
                          <div className="flex justify-between items-center border-t border-white/5 pt-3 mt-1">
                            <span className="text-[10px] font-bold text-gray-500">
                              ID: <span className="font-mono">{slide.id}</span>
                            </span>
                            <button
                              onClick={() => handleDeleteSlide(slide.id)}
                              className="text-red-400 hover:text-red-500 hover:bg-red-500/10 p-1.5 rounded-lg transition-all"
                              title={L(language, { fa: 'حذف اسلاید', en: 'Delete Slide', ru: 'Удалить слайд', tr: 'Slaytı Sil' })}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeSubTab === 'mobileAppDownload' && (
            <div className="animate-fade-in">
              <AdminMobileAppDownloadPanel addNotification={addNotification} />
            </div>
          )}
          
          {activeSubTab === 'themes' && (
            <div className="animate-fade-in space-y-6">
              {storageStatus && (
                <div className={`rounded-xl border p-4 text-xs flex flex-col md:flex-row md:items-center gap-3 md:gap-6 ${storageStatus.persistent ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-amber-500/10 border-amber-500/30'}`}>
                  <div className="flex-1 space-y-1">
                    <div className="font-black uppercase tracking-wider text-[10px] text-gray-400">{L(language, { fa: 'زیرساخت ذخیره‌سازی قالب‌ها', en: 'Theme storage infrastructure', ru: 'Инфраструктура хранения тем', tr: 'Tema depolama altyapısı' })}</div>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 font-mono text-[11px]">
                      <span dir="ltr">{L(language, { fa: 'مسیر داده:', en: 'Data dir:', ru: 'Каталог данных:', tr: 'Veri dizini:' })} <b className="text-white">{storageStatus.dataDir}</b></span>
                      <span>{L(language, { fa: 'ماندگاری:', en: 'Persistent:', ru: 'Постоянное:', tr: 'Kalıcı:' })} <b className={storageStatus.persistent ? 'text-emerald-400' : 'text-amber-400'}>{storageStatus.persistent ? L(language, { fa: 'بله (Volume)', en: 'yes (volume)', ru: 'да (volume)', tr: 'evet (volume)' }) : L(language, { fa: 'خیر — موقتی', en: 'no — ephemeral', ru: 'нет — временное', tr: 'hayır — geçici' })}</b></span>
                      <span>{L(language, { fa: 'دیتابیس:', en: 'Database:', ru: 'База данных:', tr: 'Veritabanı:' })} <b className="text-white">{storageStatus.db?.provider}</b> <span className="text-gray-500">({storageStatus.db?.configSource})</span></span>
                      <span>{L(language, { fa: 'قالب‌های نصب‌شده:', en: 'Installed themes:', ru: 'Установлено тем:', tr: 'Yüklü temalar:' })} <b className="text-white">{storageStatus.installedThemes?.length ?? 0}</b></span>
                      <span>{L(language, { fa: 'قالب پیش‌فرض سایت:', en: 'Site default theme:', ru: 'Тема сайта по умолчанию:', tr: 'Site varsayılan teması:' })} <b className="text-primary">{storageStatus.activeThemeId}</b></span>
                    </div>
                    {!storageStatus.persistent && (
                      <p className="text-amber-300 leading-relaxed mt-1">
                        {L(language, { fa: 'هشدار: پوشه‌ی قالب‌ها روی فایل‌سیستم موقتی سرور است و با هر دیپلوی/ری‌استارت پاک می‌شود. روی Railway یک Volume با مسیر /data بسازید و متغیر BAZINO_DATA_DIR=/data را تنظیم کنید.', en: 'Warning: the themes folder lives on the server\'s ephemeral filesystem and is wiped on every deploy/restart. On Railway, add a Volume mounted at /data and set BAZINO_DATA_DIR=/data.', ru: 'Внимание: папка тем находится на временной файловой системе сервера и очищается при каждом деплое/перезапуске. На Railway добавьте Volume с путём /data и задайте BAZINO_DATA_DIR=/data.', tr: 'Uyarı: tema klasörü sunucunun geçici dosya sisteminde ve her dağıtımda/yeniden başlatmada silinir. Railway\'de /data yoluna bağlı bir Volume ekleyin ve BAZINO_DATA_DIR=/data ayarlayın.' })}
                      </p>
                    )}
                  </div>
                </div>
              )}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-dark-card p-6 border border-white/5 rounded-xl">
                <div>
                  <h3 className="text-xl font-black uppercase mb-1">{L(language, { fa: 'مدیریت قالب‌ها', en: 'Theme Management', ru: 'Управление темами', tr: 'Tema Yönetimi' })}</h3>
                  <p className="text-gray-400 text-sm">
                    {L(language, { fa: 'قالب را با فایل ZIP نصب کنید: theme.css (اجباری) + theme.json (رنگ‌ها، tokens، strings چهارزبانه) + theme.js (اختیاری — بخش‌های اختصاصی مثل header/hero/footer یا کل صفحه‌ی اصلی). بخش‌هایی که قالب ندهد، پیش‌فرض سایت رندر می‌شود.', en: 'Install themes from ZIP: theme.css (required) + theme.json (colors, tokens, 4-language strings) + theme.js (optional — custom regions such as header/hero/footer or the whole home). Regions the theme does not provide fall back to the site defaults.', ru: 'Устанавливайте темы из ZIP: theme.css (обязательно) + theme.json (цвета, токены, строки на 4 языках) + theme.js (необязательно — свои области header/hero/footer или вся главная). Не заданные области берутся из сайта.', tr: 'Temaları ZIP ile yükleyin: theme.css (zorunlu) + theme.json (renkler, token, 4 dilli metinler) + theme.js (isteğe bağlı — header/hero/footer gibi özel bölgeler ya da tüm ana sayfa). Tema vermeyen bölgeler site varsayılanıyla çizilir.' })}
                  </p>
                  <p className="text-[10px] text-gray-500 font-mono mt-1">
                    {L(language, { fa: 'هر قالب یک فایل CSS مستقل است و تمام صفحات سایت را پوشش می‌دهد', en: 'Each theme is a standalone CSS file covering every page of the site', ru: 'Каждая тема — отдельный CSS-файл, покрывающий все страницы сайта', tr: 'Her tema bağımsız bir CSS dosyasıdır ve sitenin tüm sayfalarını kapsar' })}
                  </p>
                </div>
                <div className="flex gap-2">
                   <button 
                     onClick={handleDownloadSampleZip}
                     className="btn btn-primary-outline text-xs px-4 py-2 flex items-center gap-2 rounded-xl"
                     title={L(language, { fa: 'دانلود قالب نمونه با فرمت ZIP جدید', en: 'Download a sample theme zip', ru: 'Скачать образец темы (ZIP)', tr: 'Yeni ZIP biçiminde örnek temayı indir' })}
                   >
                     <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                     </svg>
                     {L(language, { fa: 'دانلود قالب نمونه', en: 'Sample Theme', ru: 'Образец темы', tr: 'Örnek Tema' })}
                   </button>
                   <button 
                     onClick={openThemeUploadPanel}
                     className="btn btn-primary-outline text-xs px-4 py-2 flex items-center gap-2 rounded-xl"
                   >
                     <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                     </svg>
                     {L(language, { fa: 'نصب قالب جدید', en: 'Install Theme', ru: 'Установить тему', tr: 'Tema Yükle' })}
                   </button>
                </div>
              </div>

              {/* LAYOUT MODE CHANGER */}
              <div className="bg-dark-card border border-white/10 rounded-2xl p-6 space-y-4">
                <div className="border-b border-white/5 pb-3">
                  <h4 className="font-bold text-md text-primary flex items-center gap-2">
                    <Layers className="w-5 h-5 text-primary" />
                    <span>{L(language, { fa: 'انتخاب معماری و نمای کلی سایت', en: 'Select Site Layout Architecture', ru: 'Выбор архитектуры и общего вида сайта', tr: 'Site Düzeni Mimarisini Seçin' })}</span>
                  </h4>
                  <p className="text-gray-400 text-xs mt-1">
                    {L(language, { fa: 'مدیر گرامی، می‌توانید مشخص کنید که کاربران پس از ورود به وب‌سایت کدام چیدمان را مشاهده کنند.', en: 'Choose between the multi-tab layout and the integrated single-page console layout.', ru: 'Выберите, какой макет увидят пользователи после входа на сайт.', tr: 'Sayın yönetici, kullanıcıların siteye girdiğinde hangi düzeni göreceğini belirleyebilirsiniz.' })}
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Classic Option */}
                  <div 
                    onClick={() => setLayoutMode && setLayoutMode('classic')}
                    className={`p-4 border rounded-xl cursor-pointer transition-all flex flex-col gap-2 relative overflow-hidden ${
                      layoutMode === 'classic' 
                        ? 'border-primary bg-primary/[0.03] shadow-[0_0_15px_rgba(255,184,0,0.1)]' 
                        : 'border-white/5 bg-black/10 hover:border-white/20'
                    }`}
                  >
                    {layoutMode === 'classic' && (
                      <div className="absolute top-3 right-3 bg-primary text-black p-1 rounded-full">
                        <Check className="w-3 h-3 stroke-[3]" />
                      </div>
                    )}
                    <h5 className="font-black text-sm text-white">{L(language, { fa: '۱. نمای کلاسیک چندبرگه‌ای', en: '1. Classic Tabbed Layout', ru: '1. Классический макет с вкладками', tr: '1. Klasik Sekmeli Düzen' })}</h5>
                    <p className="text-xs text-gray-400 leading-relaxed font-semibold">
                      {L(language, { fa: 'ساختار سنتی چندبرگه‌ای که بخش‌ها (کافه، کلاینت‌ها، مسابقات، فروشگاه سخت‌افزار) در تب‌های مجزا بارگذاری می‌شوند.', en: 'The traditional design where users browse through independent pages via the main tab bar.', ru: 'Традиционная структура: разделы (кафе, клиенты, турниры, магазин) открываются на отдельных вкладках.', tr: 'Bölümlerin (kafe, istemciler, turnuvalar, donanım mağazası) ayrı sekmelerde yüklendiği geleneksel yapı.' })}
                    </p>
                  </div>

                  {/* Hub Option */}
                  <div 
                    onClick={() => setLayoutMode && setLayoutMode('hub')}
                    className={`p-4 border rounded-xl cursor-pointer transition-all flex flex-col gap-2 relative overflow-hidden ${
                      layoutMode === 'hub' 
                        ? 'border-primary bg-primary/[0.03] shadow-[0_0_15px_rgba(255,184,0,0.1)]' 
                        : 'border-white/5 bg-black/10 hover:border-white/20'
                    }`}
                  >
                    {layoutMode === 'hub' && (
                      <div className="absolute top-3 right-3 bg-primary text-black p-1 rounded-full">
                        <Check className="w-3 h-3 stroke-[3]" />
                      </div>
                    )}
                    <h5 className="font-black text-sm text-white">{L(language, { fa: '۲. نمای هاب یکپارچه (تک‌صفحه‌ای)', en: '2. Single-Page Console Hub', ru: '2. Единый хаб (одностраничный)', tr: '2. Entegre Hub Görünümü (Tek Sayfa)' })}</h5>
                    <p className="text-xs text-gray-400 leading-relaxed font-semibold">
                      {L(language, { fa: 'یک پنل تک‌صفحه‌ای فوق‌العاده زنده که تمامی امکانات (رزرو، بوفه، فروشگاه، مسابقات، گفتگو، باشگاه مشتریان) را در قالب ویجت‌های تعاملی نمایش می‌دهد.', en: 'A single-page gaming hub aggregating all core functions as fully responsive live modules on a single screen.', ru: 'Одностраничный живой хаб, объединяющий все функции (бронь, буфет, магазин, турниры, чат, клуб) на одном экране.', tr: 'Tüm özellikleri (rezervasyon, büfe, mağaza, turnuvalar, sohbet, sadakat kulübü) tek ekranda canlı modüller olarak toplayan tek sayfalık panel.' })}
                    </p>
                  </div>
                </div>
              </div>

              {showUploadForm && (
                <div ref={themeUploadPanelRef} className="bg-dark-card border border-white/10 rounded-2xl p-6 space-y-4 animate-fade-in scroll-mt-24">
                  <div className="flex justify-between items-center border-b border-white/5 pb-3">
                    <h4 className="font-bold text-md text-primary flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-primary animate-pulse" />
                      <span>{L(language, { fa: 'نصب قالب جدید', en: 'Install New Theme', ru: 'Установить новую тему', tr: 'Yeni Tema Yükle' })}</span>
                    </h4>
                    <button 
                      type="button" 
                      onClick={() => setShowUploadForm(false)} 
                      className="text-gray-400 hover:text-white transition-colors"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Mode Tabs */}
                  <div className="flex gap-2 flex-wrap">
                    <button
                      type="button"
                      onClick={() => { setUploadMode('zip'); setZipError(''); }}
                      className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5 border ${
                        uploadMode === 'zip'
                          ? 'bg-primary text-black border-primary shadow-[0_0_12px_rgba(255,184,0,0.25)]'
                          : 'bg-white/5 text-gray-400 border-white/10 hover:text-white'
                      }`}
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                      <span>{L(language, { fa: 'نصب از فایل ZIP (فرمت جدید)', en: 'Install from ZIP', ru: 'Установка из ZIP', tr: 'ZIP Dosyasından Yükle' })}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => { setUploadMode('quick'); setZipError(''); }}
                      className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5 border ${
                        uploadMode === 'quick'
                          ? 'bg-primary text-black border-primary shadow-[0_0_12px_rgba(255,184,0,0.25)]'
                          : 'bg-white/5 text-gray-400 border-white/10 hover:text-white'
                      }`}
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                      </svg>
                      <span>{L(language, { fa: 'ساخت سریع با رنگ', en: 'Quick Build (Colors)', ru: 'Быстрая сборка (цвета)', tr: 'Renklerle Hızlı Oluştur' })}</span>
                    </button>
                  </div>

                  {uploadMode === 'zip' ? (
                    <div className="space-y-4">
                      {/* ZIP Upload Slot */}
                      <div className="flex flex-col gap-2">
                        <label className="text-xs text-gray-400 font-bold uppercase">
                          {L(language, { fa: 'فایل پکیج قالب (.zip)', en: 'Theme Package (.zip)', ru: 'Пакет темы (.zip)', tr: 'Tema Paketi (.zip)' })}
                        </label>
                        <div className="border border-dashed border-white/10 hover:border-primary/40 rounded-xl p-5 flex flex-col items-center justify-center gap-2 bg-black/10 transition-colors relative cursor-pointer group min-h-[130px]">
                          <input 
                            type="file" 
                            accept=".zip" 
                            onChange={handleZipFileSelect}
                            className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                          />
                          {isParsingZip ? (
                            <>
                              <span className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                              <span className="text-xs font-bold text-gray-300">{L(language, { fa: 'در حال استخراج متادیتا و CSS قالب...', en: 'Extracting theme metadata & CSS...', ru: 'Извлечение метаданных и CSS темы...', tr: 'Tema meta verileri ve CSS çıkarılıyor...' })}</span>
                            </>
                          ) : zipParsed ? (
                            <>
                              <span className="w-10 h-10 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center">
                                <Check className="w-5 h-5" strokeWidth={3} />
                              </span>
                              <span className="text-xs font-black text-emerald-400">{zipParsed.meta.name}</span>
                              <span className="text-[10px] text-gray-500 font-mono">{zipFileName}</span>
                            </>
                          ) : (
                            <>
                              <svg className="w-8 h-8 text-gray-500 group-hover:text-primary transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                              </svg>
                              <span className="text-xs font-bold text-gray-400 group-hover:text-white transition-colors text-center">{L(language, { fa: 'فایل zip قالب را انتخاب کنید', en: 'Select theme zip file', ru: 'Выберите ZIP-файл темы', tr: 'Tema zip dosyasını seçin' })}</span>
                              <span className="text-[10px] text-gray-600 font-bold text-center">{L(language, { fa: 'فرمت: theme.json + theme.css + پوشه assets/ (اختیاری)', en: 'Format: theme.json + theme.css + assets/ folder (optional)', ru: 'Формат: theme.json + theme.css + папка assets/ (необязательно)', tr: 'Biçim: theme.json + theme.css + assets/ klasörü (isteğe bağlı)' })}</span>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Parse Error */}
                      {zipError && (
                        <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-bold leading-relaxed flex items-start gap-2">
                          <X className="w-4 h-4 shrink-0 mt-0.5" />
                          <span>{zipError}</span>
                        </div>
                      )}

                      {/* Parsed Metadata Preview */}
                      {zipParsed && !zipError && zipReplacesExisting && (
                        <div className="bg-cyan-500/10 border border-cyan-500/30 rounded-xl p-3 text-xs text-cyan-200 leading-relaxed">
                          {L(language, { fa: `حالت به‌روزرسانی: قالب «${zipReplacesExisting.name}» (نسخه ${zipReplacesExisting.version || '?'}) هم‌اکنون نصب است. با نصب، نسخه‌ی قبلی به‌صورت اتمیک با نسخه ${zipParsed.meta.version || '?'} جایگزین می‌شود و قالب فعال می‌ماند.`, en: `Update mode: "${zipReplacesExisting.name}" (v${zipReplacesExisting.version || '?'}) is already installed. Installing will atomically replace it with v${zipParsed.meta.version || '?'} and keep it active.`, ru: `Режим обновления: «${zipReplacesExisting.name}» (v${zipReplacesExisting.version || '?'}) уже установлена. Установка атомарно заменит её на v${zipParsed.meta.version || '?'} и оставит активной.`, tr: `Güncelleme modu: «${zipReplacesExisting.name}» (v${zipReplacesExisting.version || '?'}) zaten yüklü. Kurulum, onu v${zipParsed.meta.version || '?'} ile atomik olarak değiştirir ve etkin tutar.` })}
                        </div>
                      )}
                      {zipParsed && !zipError && (
                        <div className="bg-black/30 border border-white/10 rounded-xl p-4 space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-black uppercase tracking-wider text-gray-400">
                              {L(language, { fa: 'پیش‌نمایش متادیتای قالب', en: 'Parsed Theme Metadata', ru: 'Метаданные темы', tr: 'Tema Meta Verisi Önizlemesi' })}
                            </span>
                            <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full text-[10px] font-mono font-bold">
                              {L(language, { fa: 'آماده نصب', en: 'READY TO INSTALL', ru: 'ГОТОВО К УСТАНОВКЕ', tr: 'YÜKLEMEYE HAZIR' })}
                            </span>
                          </div>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                            <div>
                              <span className="block text-[10px] text-gray-500 font-bold uppercase">{L(language, { fa: 'نام', en: 'Name', ru: 'Название', tr: 'Ad' })}</span>
                              <span className="text-white font-black">{zipParsed.meta.name}</span>
                            </div>
                            <div>
                              <span className="block text-[10px] text-gray-500 font-bold uppercase">ID</span>
                              <span className="text-primary font-mono font-bold" dir="ltr">{zipParsed.meta.id}</span>
                            </div>
                            <div>
                              <span className="block text-[10px] text-gray-500 font-bold uppercase">{L(language, { fa: 'نسخه', en: 'Version', ru: 'Версия', tr: 'Sürüm' })}</span>
                              <span className="text-white font-mono font-bold">{zipParsed.meta.version || '—'}</span>
                            </div>
                            <div className="col-span-2 md:col-span-4">
                              <span className="block text-[10px] text-gray-500 font-bold uppercase">{L(language, { fa: 'بخش‌های اختصاصی (theme.js)', en: 'Custom regions (theme.js)', ru: 'Свои области (theme.js)', tr: 'Özel bölgeler (theme.js)' })}</span>
                              {(() => {
                                const regions = zipParsed.componentJs ? Array.from(zipParsed.componentJs.matchAll(/\.registerComponent\s*\(\s*['"]([a-zA-Z0-9_.-]+)['"]/g)).map(m => m[1]) : [];
                                const langs = zipParsed.meta.strings ? Object.keys(zipParsed.meta.strings) : [];
                                return (
                                  <span className="flex flex-wrap gap-1 mt-1">
                                    {regions.length === 0 && <span className="text-gray-400 text-[10px]">{L(language, { fa: 'فقط CSS — همه‌ی بخش‌ها از پیش‌فرض سایت (رنگ‌ها/توکن‌ها اعمال می‌شود)', en: 'CSS-only — all regions use the site defaults (colors/tokens applied)', ru: 'Только CSS — все области берутся из сайта (цвета/токены применяются)', tr: 'Yalnızca CSS — tüm bölgeler site varsayılanı (renk/token uygulanır)' })}</span>}
                                    {regions.map(r => <span key={r} className="px-1.5 py-0.5 rounded bg-primary/10 text-primary border border-primary/20 text-[10px] font-mono font-bold" dir="ltr">{r}</span>)}
                                    {langs.length > 0 && <span className="px-1.5 py-0.5 rounded bg-white/5 text-gray-300 border border-white/10 text-[10px] font-mono" dir="ltr">strings: {langs.join('/')}</span>}
                                    {zipParsed.meta.tokens && <span className="px-1.5 py-0.5 rounded bg-white/5 text-gray-300 border border-white/10 text-[10px] font-mono" dir="ltr">tokens: {Object.keys(zipParsed.meta.tokens).length}</span>}
                                  </span>
                                );
                              })()}
                            </div>
                            <div>
                              <span className="block text-[10px] text-gray-500 font-bold uppercase">CSS / Assets</span>
                              <span className="text-white font-mono font-bold">{(zipParsed.css.length / 1024).toFixed(1)}KB{Object.keys(zipParsed.assets).length > 0 ? ` + ${Object.keys(zipParsed.assets).length}` : ''}</span>
                            </div>
                          </div>
                          {zipParsed.meta.description && (
                            <p className="text-xs text-gray-400 leading-relaxed">{zipParsed.meta.description}</p>
                          )}
                          <div className="flex items-center gap-3 pt-2 border-t border-white/5">
                            <span className="text-[10px] text-gray-500 font-bold uppercase">{L(language, { fa: 'رنگ‌ها:', en: 'Colors:', ru: 'Цвета:', tr: 'Renkler:' })}</span>
                            {(['primary', 'bg', 'card'] as const).map(k => (
                              <span key={k} className="flex items-center gap-1.5 text-[10px] font-mono text-gray-300">
                                <span className="w-4 h-4 rounded border border-white/20" style={{ backgroundColor: zipParsed.meta.colors?.[k] || '#333' }} />
                                <span className="hidden md:inline">{zipParsed.meta.colors?.[k]}</span>
                              </span>
                            ))}
                            <span className="text-[10px] text-gray-500 font-mono mr-auto">{Object.keys(zipParsed.assets).length > 0 ? `assets: ${Object.keys(zipParsed.assets).join(', ')}` : L(language, { fa: 'بدون assets', en: 'no assets', ru: 'без assets', tr: 'assets yok' })}</span>
                          </div>
                        </div>
                      )}

                      <div className="flex flex-wrap justify-between items-center gap-2 pt-2 border-t border-white/5">
                        <button 
                          type="button" 
                          onClick={handleDownloadSampleZip}
                          className="px-3 py-2 text-[10px] font-bold uppercase rounded-xl bg-white/5 text-cyan-400 hover:text-white border border-white/10 hover:border-cyan-400/40 transition-all flex items-center gap-1.5"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                          </svg>
                          <span>{L(language, { fa: 'دانلود قالب نمونه (فرمت جدید)', en: 'Download Sample ZIP', ru: 'Скачать образец ZIP', tr: 'Örnek ZIP İndir' })}</span>
                        </button>
                        <div className="flex gap-2">
                          <button 
                            type="button" 
                            onClick={() => setShowUploadForm(false)} 
                            className="px-4 py-2 text-xs font-bold uppercase rounded-xl bg-white/5 text-gray-400 hover:text-white transition-colors"
                          >
                            {L(language, { fa: 'انصراف', en: 'Cancel', ru: 'Отмена', tr: 'İptal' })}
                          </button>
                          <button 
                            type="button" 
                            onClick={handleInstallZip}
                            disabled={!zipParsed || !!zipError || isParsingZip || isInstallingZip}
                            className="px-5 py-2 text-xs font-black uppercase rounded-xl bg-primary text-black hover:opacity-90 shadow-[0_0_15px_rgba(255,184,0,0.3)] transition-all disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-1.5"
                          >
                            {isInstallingZip && (
                              <span className="w-3.5 h-3.5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                            )}
                            {isInstallingZip
                              ? (L(language, { fa: 'در حال نصب روی سرور...', en: 'Installing on server...', ru: 'Установка на сервер...', tr: 'Sunucuya yükleniyor...' }))
                              : (L(language, { fa: 'نصب و فعال‌سازی', en: 'Install & Activate', ru: 'Установить и активировать', tr: 'Yükle ve Etkinleştir' }))}
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <form onSubmit={handleCreateTheme} className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="flex flex-col gap-1.5">
                          <label className="text-xs text-gray-400 font-bold uppercase">{L(language, { fa: 'نام قالب', en: 'Theme Name', ru: 'Название темы', tr: 'Tema Adı' })}</label>
                          <input 
                            type="text" 
                            required
                            value={newThemeName}
                            onChange={(e) => setNewThemeName(e.target.value)}
                            placeholder="e.g. Synthwave Horizon"
                            className="px-4 py-2.5 bg-black/20 border border-white/5 rounded-xl text-xs text-white placeholder-gray-600 outline-none focus:border-primary/50 transition-colors w-full"
                          />
                        </div>

                        <div className="grid grid-cols-3 gap-2 items-end">
                          <div className="flex flex-col gap-1.5">
                            <label className="text-[10px] text-gray-500 font-bold uppercase">{L(language, { fa: 'رنگ اصلی', en: 'Primary', ru: 'Основной цвет', tr: 'Ana Renk' })}</label>
                            <div className="flex items-center gap-1.5 bg-black/20 border border-white/5 rounded-xl p-1.5">
                              <input 
                                type="color" 
                                value={newThemePrimary}
                                onChange={(e) => setNewThemePrimary(e.target.value)}
                                className="w-6 h-6 bg-transparent border-none cursor-pointer rounded-md overflow-hidden shrink-0"
                              />
                              <span className="text-[10px] font-mono text-gray-400 truncate">{newThemePrimary}</span>
                            </div>
                          </div>

                          <div className="flex flex-col gap-1.5">
                            <label className="text-[10px] text-gray-500 font-bold uppercase">{L(language, { fa: 'پس‌زمینه', en: 'Background', ru: 'Фон', tr: 'Arka Plan' })}</label>
                            <div className="flex items-center gap-1.5 bg-black/20 border border-white/5 rounded-xl p-1.5">
                              <input 
                                type="color" 
                                value={newThemeBg}
                                onChange={(e) => setNewThemeBg(e.target.value)}
                                className="w-6 h-6 bg-transparent border-none cursor-pointer rounded-md overflow-hidden shrink-0"
                              />
                              <span className="text-[10px] font-mono text-gray-400 truncate">{newThemeBg}</span>
                            </div>
                          </div>

                          <div className="flex flex-col gap-1.5">
                            <label className="text-[10px] text-gray-500 font-bold uppercase">{L(language, { fa: 'کارت‌ها', en: 'Cards', ru: 'Карточки', tr: 'Kartlar' })}</label>
                            <div className="flex items-center gap-1.5 bg-black/20 border border-white/5 rounded-xl p-1.5">
                              <input 
                                type="color" 
                                value={newThemeCard}
                                onChange={(e) => setNewThemeCard(e.target.value)}
                                className="w-6 h-6 bg-transparent border-none cursor-pointer rounded-md overflow-hidden shrink-0"
                              />
                              <span className="text-[10px] font-mono text-gray-400 truncate">{newThemeCard}</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="flex justify-end gap-2 pt-2 border-t border-white/5">
                        <button 
                          type="button" 
                          onClick={() => setShowUploadForm(false)} 
                          className="px-4 py-2 text-xs font-bold uppercase rounded-xl bg-white/5 text-gray-400 hover:text-white transition-colors"
                        >
                          {L(language, { fa: 'انصراف', en: 'Cancel', ru: 'Отмена', tr: 'İptal' })}
                        </button>
                        <button 
                          type="submit" 
                          className="px-5 py-2 text-xs font-black uppercase rounded-xl bg-primary text-black hover:opacity-90 shadow-[0_0_15px_rgba(255,184,0,0.3)] transition-all"
                        >
                          {L(language, { fa: 'ساخت و نصب قالب', en: 'Build & Install', ru: 'Собрать и установить', tr: 'Oluştur ve Yükle' })}
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {availableThemes.map(theme => (
                  <div key={theme.id} className={`bg-dark-card border rounded-xl p-6 flex flex-col gap-4 transition-all ${themeId === theme.id ? 'border-primary shadow-[0_0_15px_rgba(255,184,0,0.2)]' : 'border-white/5 hover:border-white/20'}`}>
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${themeId === theme.id ? 'bg-primary text-black' : 'bg-white/10 text-white'}`}>
                          {themeId === theme.id ? (
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                          ) : (
                            <span className="text-sm font-black">{theme.name.charAt(0)}</span>
                          )}
                        </div>
                        <div>
                          <h4 className="font-bold text-lg">{theme.name}</h4>
                          <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                            <span className="text-[10px] uppercase tracking-wider text-gray-500">
                              {theme.type === 'built-in' 
                                ? (L(language, { fa: 'سیستمی', en: 'Built-in', ru: 'Встроенная', tr: 'Yerleşik' })) 
                                : theme.kind === 'server'
                                    ? (L(language, { fa: 'سروری (پوشه اختصاصی)', en: 'Server (own folder)', ru: 'Серверная (своя папка)', tr: 'Sunucu (özel klasör)' }))
                                : (theme.kind === 'zip' 
                                    ? (L(language, { fa: 'پکیج ZIP', en: 'ZIP Package', ru: 'ZIP-пакет', tr: 'ZIP Paketi' }))
                                    : (L(language, { fa: 'سفارشی (رنگ)', en: 'Custom (Colors)', ru: 'Пользовательская (цвета)', tr: 'Özel (Renk)' })))}
                            </span>
                            {theme.hasAssets && (
                              <span className="px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[10px] font-mono font-bold" title={theme.assetFiles?.join(', ')}>
                                📁 {theme.assetFiles?.length || 0} assets
                              </span>
                            )}
                            {theme.type === 'custom' && theme.css && (
                              <span className="px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 text-[10px] font-mono font-bold">
                                CSS {(theme.css.length / 1024).toFixed(1)}KB
                              </span>
                            )}
                            {theme.version && (
                              <span className="px-1.5 py-0.5 rounded bg-white/5 text-gray-400 border border-white/10 text-[10px] font-mono font-bold">
                                v{theme.version}
                              </span>
                            )}
                            {theme.kind === 'server' && (theme.regions && theme.regions.length > 0 ? theme.regions.map(r => (
                              <span key={r} className="px-1.5 py-0.5 rounded bg-primary/10 text-primary border border-primary/20 text-[10px] font-mono font-bold" dir="ltr" title={L(language, { fa: 'بخش اختصاصی قالب', en: 'Theme-provided region', ru: 'Область темы', tr: 'Temaya özel bölge' })}>{r}</span>
                            )) : (
                              <span className="px-1.5 py-0.5 rounded bg-white/5 text-gray-400 border border-white/10 text-[10px] font-mono">CSS-only</span>
                            ))}
                          </div>
                          {theme.description && (
                            <p className="text-[10px] text-gray-500 mt-1.5 leading-relaxed line-clamp-2">{theme.description}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-1.5">
                        {theme.type !== 'built-in' && (
                          <>
                            <button 
                              onClick={() => handleExportThemeZip(theme)}
                              className="p-1.5 text-gray-500 hover:text-cyan-400 hover:bg-cyan-500/10 rounded-lg transition-colors"
                              title={L(language, { fa: 'دانلود پکیج ZIP این قالب', en: 'Download this theme as ZIP', ru: 'Скачать ZIP этой темы', tr: 'Bu temayı ZIP olarak indir' })}
                            >
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                              </svg>
                            </button>
                            <button 
                              onClick={() => handleDeleteTheme(theme)}
                              className="p-1.5 text-gray-500 hover:text-accent-red hover:bg-red-500/10 rounded-lg transition-colors"
                              title={L(language, { fa: 'حذف (پوشه قالب نیز حذف می‌شود)', en: 'Delete (theme folder removed too)', ru: 'Удалить (папка темы тоже удаляется)', tr: 'Sil (tema klasörü de silinir)' })}
                            >
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Automatically Generated Dynamic Screenshot/Viewport Preview */}
                    <div className="w-full mt-1">
                      <ThemeScreenshot theme={theme as any} language={language} />
                    </div>
                    
                    <div className="mt-auto pt-4 border-t border-white/5 flex gap-2">
                      <button 
                        onClick={() => handleActivateTheme(theme)}
                        disabled={themeId === theme.id}
                        className={`flex-1 py-2 text-xs font-bold uppercase rounded-lg transition-colors ${themeId === theme.id ? 'bg-primary/20 text-primary cursor-default' : 'bg-white/5 text-gray-300 hover:bg-primary hover:text-black'}`}
                      >
                        {themeId === theme.id ? (L(language, { fa: 'فعال (پیش‌فرض سایت)', en: 'Active (site default)', ru: 'Активна (по умолчанию)', tr: 'Aktif (site varsayılanı)' })) : (L(language, { fa: 'انتخاب به‌عنوان قالب سایت', en: 'Set as site theme', ru: 'Сделать темой сайта', tr: 'Site teması yap' }))}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Dashboard Subtab */}
          {activeSubTab === 'dashboard' && stats && (
            <div className="flex flex-col gap-6">
              {/* Stats Bento Grid */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="p-5 bg-white/5 border border-white/10 rounded-2xl flex flex-col gap-1 relative overflow-hidden group">
                  <div className="absolute top-4 right-4 w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400">
                    <TrendingUp className="w-4 h-4" />
                  </div>
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{L(language, { fa: 'کل درآمد فروشگاه و بوفه', en: 'Total Revenue', ru: 'Общая выручка магазина и буфета', tr: 'Toplam Mağaza ve Büfe Geliri' })}</span>
                  <span className="text-xl font-black text-white mt-1">{(stats.totalSales || 0).toLocaleString(localeOf(language))} <span className="text-xs text-primary font-bold">{L(language, { fa: 'لیر', en: 'TL', ru: 'TL', tr: 'TL' })}</span></span>
                  <p className="text-[10px] text-gray-500 font-bold mt-2 font-mono">Real-time ledger audit log</p>
                </div>

                <div className="p-5 bg-white/5 border border-white/10 rounded-2xl flex flex-col gap-1 relative overflow-hidden group">
                  <div className="absolute top-4 right-4 w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                    <Clock className="w-4 h-4" />
                  </div>
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{L(language, { fa: 'تعداد رزرو سانس‌ها', en: 'Total System Bookings', ru: 'Всего бронирований', tr: 'Toplam Sistem Rezervasyonu' })}</span>
                  <span className="text-xl font-black text-white mt-1">{stats.totalReservations || 0} <span className="text-xs text-primary font-bold">{L(language, { fa: 'سانس', en: 'sessions', ru: 'сеансов', tr: 'seans' })}</span></span>
                  <p className="text-[10px] text-gray-500 font-bold mt-2 font-mono">Active schedule pool size</p>
                </div>

                <div className="p-5 bg-white/5 border border-white/10 rounded-2xl flex flex-col gap-1 relative overflow-hidden group">
                  <div className="absolute top-4 right-4 w-8 h-8 rounded-lg bg-cyan-500/10 flex items-center justify-center text-cyan-400">
                    <Monitor className="w-4 h-4 animate-pulse" />
                  </div>
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{L(language, { fa: 'سیستم‌های در حال بازی', en: 'Occupied PCs/Consoles', ru: 'Занятые ПК/консоли', tr: 'Oyunda Olan Sistemler' })}</span>
                  <span className="text-xl font-black text-cyan-400 mt-1">{stats.activeReservations || 0} / {stats.activeSystems || 8} <span className="text-xs font-bold text-white">{L(language, { fa: 'روشن', en: 'online', ru: 'вкл.', tr: 'açık' })}</span></span>
                  <p className="text-[10px] text-gray-500 font-bold mt-2 font-mono">Live bandwidth load check</p>
                </div>

                <div className="p-5 bg-white/5 border border-white/10 rounded-2xl flex flex-col gap-1 relative overflow-hidden group">
                  <div className="absolute top-4 right-4 w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center text-purple-400">
                    <Users className="w-4 h-4" />
                  </div>
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{L(language, { fa: 'گیمرهای ثبت‌شده', en: 'Registered Gamers', ru: 'Зарегистрированные игроки', tr: 'Kayıtlı Oyuncular' })}</span>
                  <span className="text-xl font-black text-white mt-1">{stats.totalUsers || 147} <span className="text-xs text-purple-400 font-bold">{L(language, { fa: 'نفر', en: 'users', ru: 'чел.', tr: 'kişi' })}</span></span>
                  <p className="text-[10px] text-gray-500 font-bold mt-2 font-mono">Loyalty club members list</p>
                </div>
              </div>

              {/* Game Net Desktop App Sync Status */}
              <div className="bg-dark-card border border-white/10 rounded-2xl p-6 flex flex-col gap-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/5 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-[#1bc2ca]/10 border border-[#1bc2ca]/30 rounded-xl text-[#1bc2ca]">
                      <Database className="w-5 h-5 animate-pulse" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-sm text-white">
                          {L(language, { fa: 'وضعیت اتصال و همگام‌سازی نرم‌افزار مدیریت دسکتاپ (بازینو پرو دسکتاپ)', en: 'Bazino Pro Desktop Software Sync Status', ru: 'Состояние подключения и синхронизации десктоп-ПО (Bazino Pro Desktop)', tr: 'Masaüstü Yönetim Yazılımı (Bazino Pro Desktop) Bağlantı ve Senkronizasyon Durumu' })}
                        </h3>
                        <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${stats.gamenetSyncStatus ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20' : 'bg-amber-500/15 text-amber-400 border border-amber-500/20'}`}>
                          {stats.gamenetSyncStatus 
                            ? (L(language, { fa: 'متصل و فعال (Live)', en: 'Connected & Live', ru: 'Подключено (Live)', tr: 'Bağlı ve Etkin (Canlı)' })) 
                            : (L(language, { fa: 'در انتظار اولین اتصال (Offline)', en: 'Pending First Sync', ru: 'Ожидание первой синхронизации (Offline)', tr: 'İlk bağlantı bekleniyor (Çevrimdışı)' }))}
                        </span>
                      </div>
                      <p className="text-xs text-gray-400 mt-1">
                        {L(language, { fa: 'نمای زنده کلاینت‌ها، صندوق، بوفه و فاکتورهای صادر شده توسط نسخه دسکتاپ کلوب', en: 'Live central dashboard syncing PCs/consoles, buffet sales, and customer tabs from the local desk.', ru: 'Живой дашборд: ПК/консоли, касса, буфет и счета, выпущенные десктоп-версией клуба', tr: 'Masaüstü sürüm tarafından oluşturulan istemciler, kasa, büfe ve faturaların canlı görünümü' })}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <a 
                      href="/management-app/" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="bg-[#1bc2ca] hover:bg-[#1bc2ca]/90 text-black px-4 py-2 rounded-xl transition-all font-bold text-xs flex items-center gap-2 cursor-pointer shadow-[0_0_15px_rgba(27,194,202,0.3)] hover:scale-[1.02] active:scale-95"
                    >
                      <span>{L(language, { fa: 'ورود به نرم‌افزار مدیریت دسکتاپ', en: 'Open Desktop Management App', ru: 'Открыть десктоп-приложение', tr: 'Masaüstü Yönetim Uygulamasını Aç' })}</span>
                      <ChevronLeft className="w-4 h-4" />
                    </a>
                  </div>
                </div>

                {stats.gamenetSyncStatus ? (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="flex flex-col gap-4">
                      <div className="grid grid-cols-2 gap-3">
                        <div className="p-4 bg-white/5 border border-white/5 rounded-xl flex flex-col">
                          <span className="text-[10px] text-gray-400 font-bold">{L(language, { fa: 'سیستم‌های فعال کلوپ', en: 'Active Synced PCs', ru: 'Активные системы клуба', tr: 'Aktif Kulüp Sistemleri' })}</span>
                          <span className="text-lg font-black text-[#1bc2ca] mt-1">
                            {stats.gamenetSyncStatus.active_stations_count || 0} {L(language, { fa: 'سیستم', en: 'PCs', ru: 'ПК', tr: 'Sistem' })}
                          </span>
                        </div>
                        <div className="p-4 bg-white/5 border border-white/5 rounded-xl flex flex-col">
                          <span className="text-[10px] text-gray-400 font-bold">{L(language, { fa: 'درآمد امروز دسکتاپ', en: 'Synced Sales Today', ru: 'Выручка десктопа сегодня', tr: 'Bugünkü Masaüstü Geliri' })}</span>
                          <span className="text-lg font-black text-white mt-1">
                            {(stats.gamenetSyncStatus.total_revenue_today || 0).toLocaleString(localeOf(language))} <span className="text-xs text-primary font-bold">{L(language, { fa: 'لیر', en: 'TL', ru: 'TL', tr: 'TL' })}</span>
                          </span>
                        </div>
                      </div>

                      <div className="p-4 bg-white/5 border border-white/5 rounded-xl flex flex-col gap-1.5">
                        <div className="flex justify-between text-xs text-gray-400 font-bold">
                          <span>{L(language, { fa: 'زمان آخرین بروزرسانی', en: 'Last Sync Timestamp', ru: 'Время последней синхронизации', tr: 'Son Güncelleme Zamanı' })}</span>
                          <span className="text-white font-mono">{new Date(stats.gamenetSyncStatus.timestamp).toLocaleTimeString(localeOf(language))}</span>
                        </div>
                        <div className="flex justify-between text-xs text-gray-400 font-bold">
                          <span>{L(language, { fa: 'شناسه ایستگاه مرکزی', en: 'Central ID', ru: 'ID центральной станции', tr: 'Merkezi İstasyon Kimliği' })}</span>
                          <span className="text-white font-mono">{stats.gamenetSyncStatus.station_id}</span>
                        </div>
                      </div>
                    </div>

                    <div className="md:col-span-2 p-4 bg-white/5 border border-white/5 rounded-xl flex flex-col gap-3">
                      <h4 className="text-xs font-bold text-gray-300 flex items-center gap-1.5 uppercase tracking-wider">
                        <span className="w-1.5 h-1.5 bg-[#1bc2ca] rounded-full"></span>
                        <span>{L(language, { fa: 'موقعیت و وضعیت لحظه‌ای سیستم‌های کلوب (Live Grid)', en: 'Live Lounge System Grid', ru: 'Живая сетка систем клуба (Live Grid)', tr: 'Kulüp Sistemlerinin Anlık Konum ve Durumu (Canlı Izgara)' })}</span>
                      </h4>

                      {stats.gamenetSyncStatus.stations && stats.gamenetSyncStatus.stations.length > 0 ? (
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                          {stats.gamenetSyncStatus.stations.map((st: any) => (
                            <div key={st.id} className="p-2.5 bg-black/30 border border-white/5 rounded-xl flex flex-col gap-1">
                              <span className="text-xs font-bold text-white truncate">{st.name}</span>
                              <div className="flex items-center gap-1.5 mt-1">
                                <span className={`w-2 h-2 rounded-full ${st.status === 'PLAYING' ? 'bg-emerald-400 animate-pulse' : st.status === 'DIRTY' ? 'bg-amber-400' : st.status === 'MAINTENANCE' ? 'bg-red-400' : 'bg-gray-500'}`}></span>
                                <span className="text-[10px] text-gray-400 font-bold">
                                  {st.status === 'PLAYING' ? (L(language, { fa: 'در حال بازی', en: 'Playing', ru: 'Играет', tr: 'Oyunda' }))
                                   : st.status === 'DIRTY' ? (L(language, { fa: 'کثیف / آماده‌سازی', en: 'Dirty', ru: 'Грязно / уборка', tr: 'Kirli / Hazırlanıyor' }))
                                   : st.status === 'MAINTENANCE' ? (L(language, { fa: 'خراب / تعمیر', en: 'Maintenance', ru: 'Неисправна / ремонт', tr: 'Arızalı / Bakımda' }))
                                   : (L(language, { fa: 'آزاد و آماده', en: 'Free', ru: 'Свободна', tr: 'Boş ve Hazır' }))}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-gray-500 py-6 text-center font-bold">{L(language, { fa: 'هیچ ایستگاهی گزارش نشده است', en: 'No active stations synchronized yet.', ru: 'Станции не переданы', tr: 'Henüz bildirilen istasyon yok' })}</p>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="py-10 text-center flex flex-col items-center gap-3">
                    <Database className="w-10 h-10 text-gray-600 animate-bounce" />
                    <p className="text-xs text-gray-400 font-bold">
                      {L(language, { fa: 'در حال حاضر هیچ اتصالی از دسکتاپ ثبت نشده است.', en: 'Currently no connection received from the local desktop app.', ru: 'Подключений от десктоп-приложения пока нет.', tr: 'Şu anda masaüstü uygulamasından kayıtlı bir bağlantı yok.' })}
                    </p>
                    <p className="text-[10px] text-gray-500 max-w-md mx-auto">
                      {L(language, { fa: 'برای ثبت همگام‌سازی، نرم‌افزار دسکتاپ را باز کرده و در بخش همگام‌سازی وب‌سایت، کلید شروع ارسال اطلاعات را بفشارید.', en: 'To test synchronization, open the Desktop Management App and click on "Trigger Sync" inside the WebSync panel.', ru: 'Чтобы запустить синхронизацию, откройте десктоп-приложение и нажмите «Начать отправку данных» в разделе Web Sync.', tr: 'Senkronizasyonu başlatmak için masaüstü uygulamasını açın ve Web Senkronizasyonu bölümünde veri gönderme düğmesine basın.' })}
                    </p>
                  </div>
                )}
              </div>

              {/* Cafe buffet live orders pool */}
              <div className="bg-dark-card border border-white/10 rounded-2xl p-6">
                <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2 font-display uppercase tracking-wider border-b border-white/5 pb-3">
                  <span className="w-1 h-4 bg-primary rounded-full"></span>
                  <span>{L(language, { fa: 'سفارشات زنده بوفه و کافه سالن', en: 'Live Cafe Buffet Orders', ru: 'Живые заказы буфета и кафе', tr: 'Canlı Salon Kafe ve Büfe Siparişleri' })}</span>
                </h3>
                
                {(!stats.cafeOrders || stats.cafeOrders.length === 0) ? (
                  <p className="text-gray-500 text-xs py-10 text-center font-bold font-mono">No active cafe orders in queue</p>
                ) : (
                  <div className="flex flex-col gap-4">
                    {stats.cafeOrders.map((order: any) => (
                      <div key={order.id} className="bg-[#0a0e21] border border-white/5 p-4 rounded-xl flex flex-col md:flex-row justify-between gap-4">
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <span className="px-2 py-0.5 bg-primary/10 text-primary text-[10px] font-mono font-bold rounded border border-primary/20">{order.id}</span>
                            <span className="text-gray-400 text-xs font-bold">{L(language, { fa: `تحویل پای: ${order.tableNumber}`, en: `Deliver to: ${order.tableNumber}`, ru: `Доставить к: ${order.tableNumber}`, tr: `Teslimat: ${order.tableNumber}` })}</span>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {order.items.map((it: any, index: number) => (
                              <span key={index} className="text-xs text-gray-300 font-medium bg-white/5 px-2.5 py-1 rounded">
                                {it.item.name} <span className="text-primary font-bold">({it.quantity}x)</span>
                              </span>
                            ))}
                          </div>
                        </div>

                        <div className="flex items-center gap-3 justify-end">
                          <span className="text-xs font-bold text-white font-mono">{(order.finalAmount || order.totalPrice).toLocaleString(localeOf(language))} {L(language, { fa: 'لیر', en: 'TL', ru: 'TL', tr: 'TL' })}</span>
                          
                          {/* Order State Controller dropdown */}
                          <select 
                            value={order.status}
                            onChange={(e) => handleUpdateCafeOrderStatus(order.id, e.target.value)}
                            className="bg-[#0d122b62e] border border-white/10 rounded-lg px-2.5 py-1.5 text-xs font-bold text-gray-300 focus:outline-none focus:border-primary cursor-pointer"
                          >
                            <option value="Pending">{L(language, { fa: 'در انتظار', en: 'Pending', ru: 'В ожидании', tr: 'Beklemede' })}</option>
                            <option value="Preparing">{L(language, { fa: 'در حال آماده‌سازی', en: 'Preparing', ru: 'Готовится', tr: 'Hazırlanıyor' })}</option>
                            <option value="Delivered">{L(language, { fa: 'تحویل داده شد', en: 'Delivered', ru: 'Доставлен', tr: 'Teslim Edildi' })}</option>
                          </select>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Hardware Accessory Orders */}
              <div className="bg-dark-card border border-white/10 rounded-2xl p-6">
                <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2 font-display uppercase tracking-wider border-b border-white/5 pb-3">
                  <span className="w-1 h-4 bg-primary rounded-full"></span>
                  <span>{L(language, { fa: 'فاکتورهای معلق فروشگاه سخت‌افزار', en: 'Accessory Purchase Log', ru: 'Журнал покупок в магазине', tr: 'Donanım Mağazası Bekleyen Faturalar' })}</span>
                </h3>
                
                {(!stats.shopOrders || stats.shopOrders.length === 0) ? (
                  <p className="text-gray-500 text-xs py-10 text-center font-bold font-mono">No hardware accessory orders recorded</p>
                ) : (
                  <div className="flex flex-col gap-4">
                    {stats.shopOrders.map((order: any) => (
                      <div key={order.id} className="bg-[#0a0e21] border border-white/5 p-4 rounded-xl flex flex-col md:flex-row justify-between gap-4">
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <span className="px-2 py-0.5 bg-purple-500/10 text-purple-400 text-[10px] font-mono font-bold rounded border border-purple-500/20">{order.id}</span>
                            <span className="text-gray-400 text-xs font-bold">{L(language, { fa: 'خرید از باشگاه وفاداری', en: 'Loyalty club purchase', ru: 'Покупка в клубе лояльности', tr: 'Sadakat kulübü alışverişi' })}</span>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {order.cart.map((it: any, index: number) => (
                              <span key={index} className="text-xs text-gray-300 font-medium bg-white/5 px-2.5 py-1 rounded">
                                {it.item.name} <span className="text-purple-400 font-bold">({it.quantity}x)</span>
                              </span>
                            ))}
                          </div>
                        </div>

                        <div className="flex items-center gap-3 justify-end">
                          <span className="text-xs font-bold text-white font-mono">{order.finalAmount.toLocaleString(localeOf(language))} {L(language, { fa: 'لیر', en: 'TL', ru: 'TL', tr: 'TL' })}</span>
                          
                          <select 
                            value={order.status}
                            onChange={(e) => handleUpdateShopOrderStatus(order.id, e.target.value)}
                            className="bg-[#0d122b62e] border border-white/10 rounded-lg px-2.5 py-1.5 text-xs font-bold text-gray-300 focus:outline-none focus:border-primary cursor-pointer"
                          >
                            <option value="Processing">{L(language, { fa: 'در حال بررسی', en: 'Processing', ru: 'В обработке', tr: 'İnceleniyor' })}</option>
                            <option value="Shipped">{L(language, { fa: 'ارسال شد', en: 'Shipped', ru: 'Отправлен', tr: 'Gönderildi' })}</option>
                            <option value="Delivered">{L(language, { fa: 'تحویل شد', en: 'Delivered', ru: 'Доставлен', tr: 'Teslim Edildi' })}</option>
                          </select>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Systems Subtab (CRUD Systems) */}
          {activeSubTab === 'systems' && (
            <div className="flex flex-col gap-6">
              <div className="bg-dark-card border border-white/10 rounded-2xl p-6">
                <h3 className="text-sm font-bold text-white mb-6 flex items-center gap-2 font-display uppercase tracking-wider border-b border-white/5 pb-3">
                  <Monitor className="w-4 h-4 text-primary" />
                  <span>{L(language, { fa: 'افزودن سیستم جدید به پایگاه داده دات‌نت', en: 'Add New Game Client System', ru: 'Добавить новую игровую систему', tr: 'Veritabanına Yeni Sistem Ekle' })}</span>
                </h3>

                <form onSubmit={handleAddSystem} className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <label className="text-xs text-gray-400 block mb-1.5 font-bold">{L(language, { fa: 'نام سیستم (Gamer Identifier)', en: 'System name (Gamer Identifier)', ru: 'Название системы (Gamer Identifier)', tr: 'Sistem adı (Gamer Identifier)' })}</label>
                    <input 
                      type="text" 
                      required 
                      placeholder={L(language, { fa: 'مثلا سیستم VIP شماره ۹', en: 'e.g. VIP System #9', ru: 'Напр.: VIP-система №9', tr: 'Örn: VIP Sistem No. 9' })}
                      value={newSystem.name}
                      onChange={(e) => setNewSystem({ ...newSystem, name: e.target.value })}
                      className="w-full bg-[#0d122b] border border-white/10 rounded-lg px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-primary font-bold"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 block mb-1.5 font-bold">{L(language, { fa: 'نوع کلاینت', en: 'Client type', ru: 'Тип клиента', tr: 'İstemci türü' })}</label>
                    <select
                      value={newSystem.type}
                      onChange={(e) => setNewSystem({ ...newSystem, type: e.target.value })}
                      className="w-full bg-[#0d122b] border border-white/10 rounded-lg px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-primary font-bold"
                    >
                      <option value="PC">{L(language, { fa: 'PC (گیمینگ)', en: 'PC (Gaming)', ru: 'PC (игровой)', tr: 'PC (Oyun)' })}</option>
                      <option value="PS5">PlayStation 5</option>
                      <option value="Xbox">Xbox Series X</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 block mb-1.5 font-bold">{L(language, { fa: 'نرخ هر ساعت (TL)', en: 'Hourly rate (TL)', ru: 'Тариф в час (TL)', tr: 'Saatlik ücret (TL)' })}</label>
                    <input 
                      type="number" 
                      required
                      value={newSystem.hourlyRate}
                      onChange={(e) => setNewSystem({ ...newSystem, hourlyRate: Number(e.target.value) })}
                      className="w-full bg-[#0d122b] border border-white/10 rounded-lg px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-primary font-mono font-bold"
                    />
                  </div>
                  <div className="flex items-end">
                    <button 
                      type="submit"
                      className="w-full bg-primary hover:bg-primary-hover text-black py-2.5 rounded-lg text-xs font-black cursor-pointer flex items-center justify-center gap-1.5 border border-primary/20 shadow-[0_0_15px_rgba(0,240,255,0.2)] transition-all font-display uppercase tracking-wide"
                    >
                      <Plus className="w-4 h-4" />
                      <span>{L(language, { fa: 'ثبت کلاینت', en: 'Add Client', ru: 'Добавить клиент', tr: 'İstemci Kaydet' })}</span>
                    </button>
                  </div>
                </form>
              </div>

              {/* Systems List */}
              <div className="bg-dark-card border border-white/10 rounded-2xl p-6">
                <h3 className="text-sm font-bold text-white mb-4">{L(language, { fa: 'سیستم‌های فعال سالن', en: 'Active lounge systems', ru: 'Активные системы зала', tr: 'Salondaki aktif sistemler' })}</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {systems.map((sys) => (
                    <div key={sys.id} className="bg-[#0a0e21] border border-white/5 rounded-xl p-4 flex justify-between items-center">
                      <div>
                        <h4 className="text-xs font-bold text-white flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${sys.isActive ? 'bg-emerald-400 animate-pulse' : 'bg-gray-600'}`}></span>
                          <span>{sys.name}</span>
                        </h4>
                        <p className="text-[10px] text-gray-400 mt-1 font-mono">{sys.type} — {sys.hourlyRate.toLocaleString(localeOf(language))} {L(language, { fa: 'لیر/ساعت', en: 'TL/hr', ru: 'туман/час', tr: 'TL/saat' })}</p>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleToggleSystem(sys.id, sys.isActive)}
                          className={`px-3 py-1.5 rounded-lg text-[10px] font-black transition-all cursor-pointer ${
                            sys.isActive 
                              ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20 hover:bg-rose-500/20' 
                              : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20'
                          }`}
                        >
                          {sys.isActive ? L(language, { fa: 'غیرفعال‌سازی', en: 'Deactivate', ru: 'Отключить', tr: 'Devre dışı bırak' }) : L(language, { fa: 'فعال‌سازی', en: 'Activate', ru: 'Включить', tr: 'Etkinleştir' })}
                        </button>
                        <button
                          onClick={() => { if (confirm(L(language, { fa: 'آیا از حذف این سیستم مطمئن هستید؟', en: 'Delete this system?', ru: 'Удалить эту систему?', tr: 'Bu sistemi silmek istiyor musunuz?' }))) handleDeleteSystem(sys.id); }}
                          className="px-3 py-1.5 rounded-lg text-[10px] font-black transition-all cursor-pointer bg-white/5 text-gray-400 border border-white/10 hover:bg-rose-500/20 hover:text-rose-400"
                        >
                          {L(language, { fa: 'حذف', en: 'Delete', ru: 'Удалить', tr: 'Sil' })}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Cafe Subtab (CRUD Cafe Menu Items) */}
          {activeSubTab === 'cafe' && (
            <div className="flex flex-col gap-6">
              <div className="bg-dark-card border border-white/10 rounded-2xl p-6">
                <h3 className="text-sm font-bold text-white mb-6 flex items-center gap-2 font-display uppercase tracking-wider border-b border-white/5 pb-3">
                  <Coffee className="w-4 h-4 text-primary" />
                  <span>{L(language, { fa: 'افزودن آیتم جدید به منوی کافه بوفه', en: 'Add New Cafe Menu Item', ru: 'Добавить пункт меню буфета', tr: 'Kafe Büfe Menüsüne Yeni Öğe Ekle' })}</span>
                </h3>

                <form onSubmit={handleAddCafeItem} className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="text-xs text-gray-400 block mb-1.5 font-bold">{L(language, { fa: 'نام کالا', en: 'Item name', ru: 'Название позиции', tr: 'Ürün adı' })}</label>
                    <input 
                      type="text" 
                      required 
                      placeholder={L(language, { fa: 'مثلا چیپس چدار بزرگ', en: 'e.g. Large cheddar chips', ru: 'Напр.: большие чипсы чеддер', tr: 'Örn: Büyük cheddar cips' })}
                      value={newCafe.name}
                      onChange={(e) => setNewCafe({ ...newCafe, name: e.target.value })}
                      className="w-full bg-[#0d122b] border border-white/10 rounded-lg px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-primary font-bold"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 block mb-1.5 font-bold">{L(language, { fa: 'دسته‌بندی منو', en: 'Menu category', ru: 'Категория меню', tr: 'Menü kategorisi' })}</label>
                    <select
                      value={newCafe.category}
                      onChange={(e) => setNewCafe({ ...newCafe, category: e.target.value as any })}
                      className="w-full bg-[#0d122b] border border-white/10 rounded-lg px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-primary font-bold"
                    >
                      <option value="Foods">{L(language, { fa: 'غذاها (Foods)', en: 'Foods', ru: 'Еда (Foods)', tr: 'Yemekler (Foods)' })}</option>
                      <option value="Drinks">{L(language, { fa: 'نوشیدنی‌ها (Drinks)', en: 'Drinks', ru: 'Напитки (Drinks)', tr: 'İçecekler (Drinks)' })}</option>
                      <option value="Snacks">{L(language, { fa: 'میان‌وعده‌ها (Snacks)', en: 'Snacks', ru: 'Снеки (Snacks)', tr: 'Atıştırmalıklar (Snacks)' })}</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 block mb-1.5 font-bold">{L(language, { fa: 'قیمت فروش (TL)', en: 'Sale price (TL)', ru: 'Цена продажи (TL)', tr: 'Satış fiyatı (TL)' })}</label>
                    <input 
                      type="number" 
                      required
                      value={newCafe.price}
                      onChange={(e) => setNewCafe({ ...newCafe, price: Number(e.target.value) })}
                      className="w-full bg-[#0d122b] border border-white/10 rounded-lg px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-primary font-mono font-bold"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="text-xs text-gray-400 block mb-1.5 font-bold">{L(language, { fa: 'لینک آدرس تصویر (Unsplash CDN recommended)', en: 'Image URL (Unsplash CDN recommended)', ru: 'URL изображения (рекомендуется Unsplash CDN)', tr: 'Görsel adresi (Unsplash CDN önerilir)' })}</label>
                    <input 
                      type="text"
                      placeholder="/images/home/esports-480.webp"
                      value={newCafe.imageUrl}
                      onChange={(e) => setNewCafe({ ...newCafe, imageUrl: e.target.value })}
                      className="w-full bg-[#0d122b] border border-white/10 rounded-lg px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-primary font-mono"
                    />
                  </div>
                  <div className="md:col-span-2 space-y-2">
                    <label className="text-xs text-gray-400 block mb-1 font-bold">{L(language, { fa: 'تصویر نسخه موبایل (اختیاری)', en: 'Mobile version image (optional)', ru: 'Мобильная версия изображения (необязательно)', tr: 'Mobil sürüm görseli (isteğe bağlı)' })}</label>
                    <input 
                      type="text"
                      placeholder="/images/mobile/generated/..."
                      value={newCafe.mobileImageUrl}
                      onChange={(e) => setNewCafe({ ...newCafe, mobileImageUrl: e.target.value })}
                      className="w-full bg-[#0d122b] border border-white/10 rounded-lg px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-primary font-mono"
                    />
                    <label className="flex items-center gap-2 text-[10px] text-gray-400 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={newCafe.autoGenerateMobile}
                        onChange={(e) => setNewCafe({ ...newCafe, autoGenerateMobile: e.target.checked })}
                        className="accent-primary w-3.5 h-3.5"
                      />
                      <span>{L(language, { fa: 'اگر فیلد بالا خالی بود، ساخت خودکار نسخه بهینه موبایل از روی تصویر اصلی', en: 'If empty, auto-generate an optimized mobile version from the main image', ru: 'Если поле пустое — оптимизированная мобильная версия создаётся автоматически', tr: 'Üstteki alan boşsa, ana görselden otomatik olarak optimize mobil sürüm oluşturulur' })}</span>
                    </label>
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 block mb-1.5 font-bold">{L(language, { fa: 'موجودی اولیه انبار', en: 'Initial stock', ru: 'Начальный остаток', tr: 'Başlangıç stoğu' })}</label>
                    <input 
                      type="number"
                      required
                      value={newCafe.inventory}
                      onChange={(e) => setNewCafe({ ...newCafe, inventory: Number(e.target.value) })}
                      className="w-full bg-[#0d122b] border border-white/10 rounded-lg px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-primary font-mono font-bold"
                    />
                  </div>
                  <div className="md:col-span-3 flex justify-end">
                    <button 
                      type="submit"
                      className="px-6 bg-primary hover:bg-primary-hover text-black py-2.5 rounded-lg text-xs font-black cursor-pointer flex items-center gap-1.5 border border-primary/20 shadow-[0_0_15px_rgba(0,240,255,0.2)] transition-all font-display uppercase tracking-wide"
                    >
                      <Plus className="w-4 h-4" />
                      <span>{L(language, { fa: 'ثبت آیتم در منوی بوفه', en: 'Add item to cafe menu', ru: 'Добавить позицию в меню буфета', tr: 'Öğeyi büfe menüsüne ekle' })}</span>
                    </button>
                  </div>
                </form>
              </div>

              {/* Cafe Inventory Grid */}
              <div className="bg-dark-card border border-white/10 rounded-2xl p-6">
                <h3 className="text-sm font-bold text-white mb-4">{L(language, { fa: 'محصولات موجود در انبار بوفه', en: 'Cafe stock items', ru: 'Товары на складе буфета', tr: 'Büfe stoğundaki ürünler' })}</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {cafeItems.map((item) => (
                    <div key={item.id} className="bg-[#0a0e21] border border-white/5 rounded-xl p-3 flex gap-3">
                      <div className="w-12 h-12 bg-white/5 rounded-lg overflow-hidden border border-white/5 shrink-0">
                        <img loading="lazy" src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-xs font-bold text-white truncate">{item.name}</h4>
                        <div className="flex justify-between items-center mt-1.5">
                          <span className="text-[10px] text-gray-400 font-mono">{item.price.toLocaleString(localeOf(language))} {L(language, { fa: 'لیر', en: 'TL', ru: 'TL', tr: 'TL' })}</span>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono ${item.inventory > 5 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'}`}>
                            {L(language, { fa: 'موجودی:', en: 'Stock:', ru: 'Остаток:', tr: 'Stok:' })} {item.inventory}
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={() => { if (confirm(L(language, { fa: 'آیا از حذف این آیتم مطمئن هستید؟', en: 'Delete this item?', ru: 'Удалить эту позицию?', tr: 'Bu öğeyi silmek istiyor musunuz?' }))) handleDeleteCafeItem(item.id); }}
                        className="self-start px-2.5 py-1 rounded-lg text-[10px] font-black transition-all cursor-pointer bg-white/5 text-gray-400 border border-white/10 hover:bg-rose-500/20 hover:text-rose-400 shrink-0"
                      >
                        {L(language, { fa: 'حذف', en: 'Delete', ru: 'Удалить', tr: 'Sil' })}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Shop Subtab (CRUD Products) */}
          {activeSubTab === 'shop' && (
            <div className="flex flex-col gap-6">
              <div className="bg-dark-card border border-white/10 rounded-2xl p-6">
                <h3 className="text-sm font-bold text-white mb-6 flex items-center gap-2 font-display uppercase tracking-wider border-b border-white/5 pb-3">
                  <ShoppingBag className="w-4 h-4 text-primary" />
                  <span>{L(language, { fa: 'افزودن تجهیزات جدید به فروشگاه', en: 'Add New Hardware Accessory', ru: 'Добавить новый аксессуар в магазин', tr: 'Mağazaya Yeni Ekipman Ekle' })}</span>
                </h3>

                <form onSubmit={handleAddAccessory} className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="text-xs text-gray-400 block mb-1.5 font-bold">{L(language, { fa: 'نام تجهیزات', en: 'Gear name', ru: 'Название оборудования', tr: 'Ekipman adı' })}</label>
                    <input 
                      type="text" 
                      required 
                      placeholder={L(language, { fa: 'مثلا هدست ریزر کراکن', en: 'e.g. Razer Kraken headset', ru: 'Напр.: гарнитура Razer Kraken', tr: 'Örn: Razer Kraken kulaklık' })}
                      value={newAccessory.name}
                      onChange={(e) => setNewAccessory({ ...newAccessory, name: e.target.value })}
                      className="w-full bg-[#0d122b] border border-white/10 rounded-lg px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-primary font-bold"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 block mb-1.5 font-bold">{L(language, { fa: 'دسته‌بندی قطعات', en: 'Gear category', ru: 'Категория оборудования', tr: 'Ekipman kategorisi' })}</label>
                    <select
                      value={newAccessory.category}
                      onChange={(e) => setNewAccessory({ ...newAccessory, category: e.target.value as any })}
                      className="w-full bg-[#0d122b] border border-white/10 rounded-lg px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-primary font-bold"
                    >
                      <option value="Keyboard">{L(language, { fa: 'کیبورد (Keyboard)', en: 'Keyboard', ru: 'Клавиатура (Keyboard)', tr: 'Klavye (Keyboard)' })}</option>
                      <option value="Mouse">{L(language, { fa: 'موس (Mouse)', en: 'Mouse', ru: 'Мышь (Mouse)', tr: 'Fare (Mouse)' })}</option>
                      <option value="Headset">{L(language, { fa: 'هدست (Headset)', en: 'Headset', ru: 'Гарнитура (Headset)', tr: 'Kulaklık (Headset)' })}</option>
                      <option value="Controller">{L(language, { fa: 'دسته بازی (Controller)', en: 'Controller', ru: 'Геймпад (Controller)', tr: 'Oyun kolu (Controller)' })}</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 block mb-1.5 font-bold">{L(language, { fa: 'قیمت (TL)', en: 'Price (TL)', ru: 'Цена (TL)', tr: 'Fiyat (TL)' })}</label>
                    <input 
                      type="number" 
                      required
                      value={newAccessory.price}
                      onChange={(e) => setNewAccessory({ ...newAccessory, price: Number(e.target.value) })}
                      className="w-full bg-[#0d122b] border border-white/10 rounded-lg px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-primary font-mono font-bold"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="text-xs text-gray-400 block mb-1.5 font-bold">{L(language, { fa: 'توضیحات کوتاه فنی محصول', en: 'Short technical description', ru: 'Краткое техническое описание', tr: 'Kısa teknik açıklama' })}</label>
                    <input 
                      type="text"
                      placeholder={L(language, { fa: 'کیبورد سوییچ مکانیکال قرمز با تاخیر صفر میلی‌ثانیه...', en: 'Red mechanical switch keyboard with zero latency...', ru: 'Клавиатура с красными механическими свитчами и нулевой задержкой...', tr: 'Sıfır gecikmeli kırmızı mekanik anahtarlı klavye...' })}
                      value={newAccessory.description}
                      onChange={(e) => setNewAccessory({ ...newAccessory, description: e.target.value })}
                      className="w-full bg-[#0d122b] border border-white/10 rounded-lg px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-primary"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 block mb-1.5 font-bold">{L(language, { fa: 'موجودی انبار', en: 'Stock', ru: 'Остаток на складе', tr: 'Stok' })}</label>
                    <input 
                      type="number"
                      required
                      value={newAccessory.stock}
                      onChange={(e) => setNewAccessory({ ...newAccessory, stock: Number(e.target.value) })}
                      className="w-full bg-[#0d122b] border border-white/10 rounded-lg px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-primary font-mono font-bold"
                    />
                  </div>
                  <div className="md:col-span-3">
                    <label className="text-xs text-gray-400 block mb-1.5 font-bold">{L(language, { fa: 'لینک آدرس تصویر', en: 'Image URL', ru: 'URL изображения', tr: 'Görsel adresi' })}</label>
                    <input 
                      type="text"
                      placeholder="/images/home/esports-480.webp"
                      value={newAccessory.imageUrl}
                      onChange={(e) => setNewAccessory({ ...newAccessory, imageUrl: e.target.value })}
                      className="w-full bg-[#0d122b] border border-white/10 rounded-lg px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-primary font-mono"
                    />
                  </div>
                  <div className="md:col-span-3 space-y-2">
                    <label className="text-xs text-gray-400 block mb-1 font-bold">{L(language, { fa: 'تصویر نسخه موبایل (اختیاری)', en: 'Mobile version image (optional)', ru: 'Мобильная версия изображения (необязательно)', tr: 'Mobil sürüm görseli (isteğe bağlı)' })}</label>
                    <input 
                      type="text"
                      placeholder="/images/mobile/generated/..."
                      value={newAccessory.mobileImageUrl}
                      onChange={(e) => setNewAccessory({ ...newAccessory, mobileImageUrl: e.target.value })}
                      className="w-full bg-[#0d122b] border border-white/10 rounded-lg px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-primary font-mono"
                    />
                    <label className="flex items-center gap-2 text-[10px] text-gray-400 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={newAccessory.autoGenerateMobile}
                        onChange={(e) => setNewAccessory({ ...newAccessory, autoGenerateMobile: e.target.checked })}
                        className="accent-primary w-3.5 h-3.5"
                      />
                      <span>{L(language, { fa: 'اگر فیلد بالا خالی بود، ساخت خودکار نسخه بهینه موبایل از روی تصویر اصلی', en: 'If empty, auto-generate an optimized mobile version from the main image', ru: 'Если поле пустое — оптимизированная мобильная версия создаётся автоматически', tr: 'Üstteki alan boşsa, ana görselden otomatik olarak optimize mobil sürüm oluşturulur' })}</span>
                    </label>
                  </div>
                  <div className="md:col-span-3 flex justify-end">
                    <button 
                      type="submit"
                      className="px-6 bg-primary hover:bg-primary-hover text-black py-2.5 rounded-lg text-xs font-black cursor-pointer flex items-center gap-1.5 border border-primary/20 shadow-[0_0_15px_rgba(0,240,255,0.2)] transition-all font-display uppercase tracking-wide"
                    >
                      <Plus className="w-4 h-4" />
                      <span>{L(language, { fa: 'ثبت در انبار فروشگاه', en: 'Add to store inventory', ru: 'Добавить на склад магазина', tr: 'Mağaza deposuna ekle' })}</span>
                    </button>
                  </div>
                </form>
              </div>

              <div className="bg-dark-card border border-white/10 rounded-2xl p-6">
                <h3 className="text-sm font-bold text-white mb-4">{L(language, { fa: 'کالاهای موجود در فروشگاه', en: 'Products in the store', ru: 'Товары в магазине', tr: 'Mağazadaki ürünler' })}</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {accessories.map((acc) => (
                    <div key={acc.id} className="bg-[#0a0e21] border border-white/5 rounded-xl p-3 flex gap-3">
                      <div className="w-12 h-12 bg-white/5 rounded-lg overflow-hidden border border-white/5 shrink-0">
                        <img loading="lazy" src={acc.imageUrl} alt={acc.name} className="w-full h-full object-cover" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-xs font-bold text-white truncate">{acc.name}</h4>
                        <div className="flex justify-between items-center mt-1.5">
                          <span className="text-[10px] text-gray-400 font-mono">{acc.price.toLocaleString(localeOf(language))} {L(language, { fa: 'لیر', en: 'TL', ru: 'TL', tr: 'TL' })}</span>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono ${acc.stock > 3 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'}`}>
                            {L(language, { fa: 'موجودی:', en: 'Stock:', ru: 'Остаток:', tr: 'Stok:' })} {acc.stock}
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={() => { if (confirm(L(language, { fa: 'آیا از حذف این کالا مطمئن هستید؟', en: 'Delete this product?', ru: 'Удалить этот товар?', tr: 'Bu ürünü silmek istiyor musunuz?' }))) handleDeleteAccessory(acc.id); }}
                        className="self-start px-2.5 py-1 rounded-lg text-[10px] font-black transition-all cursor-pointer bg-white/5 text-gray-400 border border-white/10 hover:bg-rose-500/20 hover:text-rose-400 shrink-0"
                      >
                        {L(language, { fa: 'حذف', en: 'Delete', ru: 'Удалить', tr: 'Sil' })}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Tournaments Subtab (Plan Tournaments) */}
          {activeSubTab === 'tournaments' && (
            <div className="flex flex-col gap-6">
              <div className="bg-dark-card border border-white/10 rounded-2xl p-6">
                <h3 className="text-sm font-bold text-white mb-6 flex items-center gap-2 font-display uppercase tracking-wider border-b border-white/5 pb-3">
                  <Trophy className="w-4 h-4 text-primary" />
                  <span>{L(language, { fa: 'برنامه‌ریزی و فعال‌سازی تورنمنت گیم‌نت', en: 'Schedule New Tournament', ru: 'Запланировать новый турнир', tr: 'Oyun Salonu Turnuvası Planla ve Etkinleştir' })}</span>
                </h3>

                <form onSubmit={handleAddTournament} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-gray-400 block mb-1.5 font-bold">{L(language, { fa: 'عنوان مسابقات', en: 'Tournament title', ru: 'Название турнира', tr: 'Turnuva adı' })}</label>
                    <input 
                      type="text" 
                      required 
                      placeholder={L(language, { fa: 'مثلا لیگ قهرمانان دوتا ۲ سالن', en: 'e.g. Lounge Dota 2 Champions League', ru: 'Напр.: Лига чемпионов Dota 2', tr: 'Örn: Salon Dota 2 Şampiyonlar Ligi' })}
                      value={newTournament.title}
                      onChange={(e) => setNewTournament({ ...newTournament, title: e.target.value })}
                      className="w-full bg-[#0d122b] border border-white/10 rounded-lg px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-primary font-bold"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 block mb-1.5 font-bold">{L(language, { fa: 'بازی و ژانر رقابت', en: 'Game & genre', ru: 'Игра и жанр', tr: 'Oyun ve tür' })}</label>
                    <input 
                      type="text" 
                      required 
                      placeholder="Dota 2 5v5"
                      value={newTournament.game}
                      onChange={(e) => setNewTournament({ ...newTournament, game: e.target.value })}
                      className="w-full bg-[#0d122b] border border-white/10 rounded-lg px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-primary font-bold"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 block mb-1.5 font-bold">{L(language, { fa: 'هزینه ثبت نام تیم (TL)', en: 'Team entry fee (TL)', ru: 'Взнос команды (TL)', tr: 'Takım kayıt ücreti (TL)' })}</label>
                    <input 
                      type="number" 
                      required
                      value={newTournament.registrationFee}
                      onChange={(e) => setNewTournament({ ...newTournament, registrationFee: Number(e.target.value) })}
                      className="w-full bg-[#0d122b] border border-white/10 rounded-lg px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-primary font-mono font-bold"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-xs text-gray-400 block mb-1.5 font-bold">{L(language, { fa: 'تاریخ شروع', en: 'Start date', ru: 'Дата начала', tr: 'Başlangıç tarihi' })}</label>
                      <input 
                        type="text" 
                        required
                        value={newTournament.startDate}
                        onChange={(e) => setNewTournament({ ...newTournament, startDate: e.target.value })}
                        className="w-full bg-[#0d122b] border border-white/10 rounded-lg px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-primary font-bold"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-400 block mb-1.5 font-bold">{L(language, { fa: 'حداکثر تیم‌ها', en: 'Max teams', ru: 'Макс. команд', tr: 'Maksimum takım' })}</label>
                      <input 
                        type="number" 
                        required
                        value={newTournament.maxTeams}
                        onChange={(e) => setNewTournament({ ...newTournament, maxTeams: Number(e.target.value) })}
                        className="w-full bg-[#0d122b] border border-white/10 rounded-lg px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-primary font-bold"
                      />
                    </div>
                  </div>
                  <div className="md:col-span-2 flex justify-end">
                    <button 
                      type="submit"
                      className="px-6 bg-primary hover:bg-primary-hover text-black py-2.5 rounded-lg text-xs font-black cursor-pointer flex items-center gap-1.5 border border-primary/20 shadow-[0_0_15px_rgba(0,240,255,0.2)] transition-all font-display uppercase tracking-wide"
                    >
                      <Trophy className="w-4 h-4" />
                      <span>{L(language, { fa: 'ثبت و انتشار زمان‌بندی لیگ', en: 'Save & publish league schedule', ru: 'Сохранить и опубликовать расписание лиги', tr: 'Lig takvimini kaydet ve yayınla' })}</span>
                    </button>
                  </div>
                </form>
              </div>

              {/* Tournament list review */}
              <div className="bg-dark-card border border-white/10 rounded-2xl p-6">
                <h3 className="text-sm font-bold text-white mb-4">{L(language, { fa: 'تورنمنت‌های فعال و تعداد تیم‌ها', en: 'Active tournaments & team counts', ru: 'Активные турниры и число команд', tr: 'Aktif turnuvalar ve takım sayıları' })}</h3>
                <div className="flex flex-col gap-4">
                  {tournaments.map((tour) => (
                    <div key={tour.id} className="bg-[#0a0e21] border border-white/5 rounded-xl p-4 flex flex-col gap-3">
                      <div className="flex justify-between items-center border-b border-white/5 pb-2">
                        <span className="text-xs font-bold text-white font-display">{tour.title}</span>
                        <div className="flex items-center gap-2">
                          <span className="px-2.5 py-1 rounded bg-primary/10 text-primary text-[10px] font-bold">{tour.status}</span>
                          <button
                            onClick={() => { if (confirm(L(language, { fa: 'آیا از حذف این تورنومنت مطمئن هستید؟', en: 'Delete this tournament?', ru: 'Удалить этот турнир?', tr: 'Bu turnuvayı silmek istiyor musunuz?' }))) handleDeleteTournament(tour.id); }}
                            className="px-2.5 py-1 rounded-lg text-[10px] font-black transition-all cursor-pointer bg-white/5 text-gray-400 border border-white/10 hover:bg-rose-500/20 hover:text-rose-400"
                          >
                            {L(language, { fa: 'حذف', en: 'Delete', ru: 'Удалить', tr: 'Sil' })}
                          </button>
                        </div>
                      </div>
                      <div className="flex justify-between text-xs text-gray-400 font-mono">
                        <span>{L(language, { fa: 'ثبت نام شده:', en: 'Registered:', ru: 'Зарегистрировано:', tr: 'Kayıtlı:' })} {tour.registeredTeamsCount} / {tour.maxTeams} {L(language, { fa: 'تیم', en: 'teams', ru: 'команд', tr: 'takım' })}</span>
                        <span>{L(language, { fa: 'بازی:', en: 'Game:', ru: 'Игра:', tr: 'Oyun:' })} {tour.game}</span>
                      </div>
                      {tour.teams && tour.teams.length > 0 && (
                        <div className="bg-[#171717] p-3 rounded-lg border border-white/5">
                          <p className="text-[10px] text-gray-500 font-bold mb-1.5 uppercase">{L(language, { fa: 'لیست تیم‌های تایید شده:', en: 'Confirmed teams:', ru: 'Подтверждённые команды:', tr: 'Onaylı takımlar:' })}</p>
                          <div className="flex flex-wrap gap-2">
                            {tour.teams.map((team: any, index: number) => (
                              <span key={index} className="text-[10px] font-bold text-white bg-white/5 px-2.5 py-1 rounded-lg border border-white/5">
                                @{team.name} ({team.leader})
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Blog Subtab (CRUD Articles) */}
          {activeSubTab === 'blog' && (
            <div className="flex flex-col gap-6">
              <div className="bg-dark-card border border-white/10 rounded-2xl p-6">
                <h3 className="text-sm font-bold text-white mb-6 flex items-center gap-2 font-display uppercase tracking-wider border-b border-white/5 pb-3">
                  <Newspaper className="w-4 h-4 text-primary" />
                  <span>{L(language, { fa: 'انتشار خبر یا مقاله جدید در بخش بلاگ', en: 'Publish Blog Article', ru: 'Опубликовать статью в блоге', tr: 'Blogda Yeni Haber veya Makale Yayınla' })}</span>
                </h3>

                <form onSubmit={handleAddArticle} className="flex flex-col gap-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs text-gray-400 block mb-1.5 font-bold">{L(language, { fa: 'عنوان مقاله', en: 'Article title', ru: 'Заголовок статьи', tr: 'Makale başlığı' })}</label>
                      <input 
                        type="text" 
                        required 
                        placeholder={L(language, { fa: 'تغییرات گیم‌پلی در پچ جدید بازی...', en: 'Gameplay changes in the new patch...', ru: 'Изменения геймплея в новом патче...', tr: 'Yeni yamadaki oynanış değişiklikleri...' })}
                        value={newArticle.title}
                        onChange={(e) => setNewArticle({ ...newArticle, title: e.target.value })}
                        className="w-full bg-[#0d122b] border border-white/10 rounded-lg px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-primary font-bold"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-400 block mb-1.5 font-bold">{L(language, { fa: 'دسته‌بندی (ژانر / سخت‌افزار)', en: 'Category (genre / hardware)', ru: 'Категория (жанр / железо)', tr: 'Kategori (tür / donanım)' })}</label>
                      <input 
                        type="text" 
                        required 
                        placeholder="News, Hardware, Dota 2, CS2"
                        value={newArticle.category}
                        onChange={(e) => setNewArticle({ ...newArticle, category: e.target.value })}
                        className="w-full bg-[#0d122b] border border-white/10 rounded-lg px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-primary font-bold"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 block mb-1.5 font-bold">{L(language, { fa: 'آدرس لینک تصویر کاور مقاله', en: 'Cover image URL', ru: 'URL обложки статьи', tr: 'Kapak görseli adresi' })}</label>
                    <input 
                      type="text" 
                      placeholder="/images/home/esports-480.webp"
                      value={newArticle.imageUrl}
                      onChange={(e) => setNewArticle({ ...newArticle, imageUrl: e.target.value })}
                      className="w-full bg-[#0d122b] border border-white/10 rounded-lg px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-primary font-mono"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs text-gray-400 block mb-1 font-bold">{L(language, { fa: 'تصویر نسخه موبایل (اختیاری)', en: 'Mobile version image (optional)', ru: 'Мобильная версия изображения (необязательно)', tr: 'Mobil sürüm görseli (isteğe bağlı)' })}</label>
                    <input 
                      type="text"
                      placeholder="/images/mobile/generated/..."
                      value={newArticle.mobileImageUrl}
                      onChange={(e) => setNewArticle({ ...newArticle, mobileImageUrl: e.target.value })}
                      className="w-full bg-[#0d122b] border border-white/10 rounded-lg px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-primary font-mono"
                    />
                    <label className="flex items-center gap-2 text-[10px] text-gray-400 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={newArticle.autoGenerateMobile}
                        onChange={(e) => setNewArticle({ ...newArticle, autoGenerateMobile: e.target.checked })}
                        className="accent-primary w-3.5 h-3.5"
                      />
                      <span>{L(language, { fa: 'اگر فیلد بالا خالی بود، ساخت خودکار نسخه بهینه موبایل از روی تصویر اصلی', en: 'If empty, auto-generate an optimized mobile version from the main image', ru: 'Если поле пустое — оптимизированная мобильная версия создаётся автоматически', tr: 'Üstteki alan boşsa, ana görselden otomatik olarak optimize mobil sürüm oluşturulur' })}</span>
                    </label>
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 block mb-1.5 font-bold">{L(language, { fa: 'متن کامل مقاله', en: 'Full article text', ru: 'Полный текст статьи', tr: 'Makalenin tam metni' })}</label>
                    <textarea 
                      required 
                      rows={6}
                      placeholder={L(language, { fa: 'متن خود را با دقت در این بخش وارد کنید تا کاربران بتوانند در بخش مقالات مطالعه کنند...', en: 'Write the full text here so users can read it in the articles section...', ru: 'Введите текст здесь, чтобы пользователи могли прочитать его в разделе статей...', tr: 'Kullanıcıların makaleler bölümünde okuyabilmesi için metni buraya yazın...' })}
                      value={newArticle.content}
                      onChange={(e) => setNewArticle({ ...newArticle, content: e.target.value })}
                      className="w-full bg-[#0d122b] border border-white/10 rounded-lg px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-primary font-medium leading-relaxed"
                    />
                  </div>
                  <div className="flex justify-end">
                    <button 
                      type="submit"
                      className="px-6 bg-primary hover:bg-primary-hover text-black py-2.5 rounded-lg text-xs font-black cursor-pointer flex items-center gap-1.5 border border-primary/20 shadow-[0_0_15px_rgba(0,240,255,0.2)] transition-all font-display uppercase tracking-wide"
                    >
                      <Plus className="w-4 h-4" />
                      <span>{L(language, { fa: 'انتشار مقاله در وب‌سایت', en: 'Publish article', ru: 'Опубликовать статью', tr: 'Makaleyi yayınla' })}</span>
                    </button>
                  </div>
                </form>
              </div>

              <div className="bg-dark-card border border-white/10 rounded-2xl p-6">
                <h3 className="text-sm font-bold text-white mb-4">{L(language, { fa: 'مقالات منتشرشده', en: 'Published articles', ru: 'Опубликованные статьи', tr: 'Yayınlanan makaleler' })}</h3>
                <div className="flex flex-col gap-3">
                  {articles.map((art) => (
                    <div key={art.id} className="bg-[#0a0e21] border border-white/5 rounded-xl p-3 flex gap-3 items-center">
                      <div className="w-14 h-14 bg-white/5 rounded-lg overflow-hidden border border-white/5 shrink-0">
                        <img loading="lazy" src={art.imageUrl} alt={art.title} className="w-full h-full object-cover" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-xs font-bold text-white truncate">{art.title}</h4>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold font-mono bg-primary/10 text-primary">{art.category}</span>
                          <span className="text-[10px] text-gray-500 font-mono">{art.date}</span>
                        </div>
                      </div>
                      <button
                        onClick={() => { if (confirm(L(language, { fa: 'آیا از حذف این مقاله مطمئن هستید؟', en: 'Delete this article?', ru: 'Удалить эту статью?', tr: 'Bu makaleyi silmek istiyor musunuz?' }))) handleDeleteArticle(art.id); }}
                        className="px-2.5 py-1 rounded-lg text-[10px] font-black transition-all cursor-pointer bg-white/5 text-gray-400 border border-white/10 hover:bg-rose-500/20 hover:text-rose-400 shrink-0"
                      >
                        {L(language, { fa: 'حذف', en: 'Delete', ru: 'Удалить', tr: 'Sil' })}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Chat Rooms Subtab (Manage Live Chat Rooms) */}
          {activeSubTab === 'chat' && (
            <div className="flex flex-col gap-6">
              <div className="bg-dark-card border border-white/10 rounded-2xl p-6">
                <h3 className="text-sm font-bold text-white mb-6 flex items-center gap-2 font-display uppercase tracking-wider border-b border-white/5 pb-3">
                  <MessageSquare className="w-4 h-4 text-primary" />
                  <span>{L(language, { fa: 'ایجاد اتاق گفتگوی جدید', en: 'Create New Chat Room', ru: 'Создать новую чат-комнату', tr: 'Yeni Sohbet Odası Oluştur' })}</span>
                </h3>
                <form onSubmit={handleAddChatRoom} className="flex gap-3">
                  <input
                    type="text"
                    required
                    placeholder={L(language, { fa: 'مثلا Apex Legends', en: 'e.g. Apex Legends', ru: 'Напр.: Apex Legends', tr: 'Örn: Apex Legends' })}
                    value={newChatRoomName}
                    onChange={(e) => setNewChatRoomName(e.target.value)}
                    className="flex-1 bg-[#0d122b] border border-white/10 rounded-lg px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-primary font-bold"
                  />
                  <button
                    type="submit"
                    className="px-6 bg-primary hover:bg-primary-hover text-black py-2.5 rounded-lg text-xs font-black cursor-pointer flex items-center gap-1.5 border border-primary/20 shadow-[0_0_15px_rgba(0,240,255,0.2)] transition-all font-display uppercase tracking-wide"
                  >
                    <Plus className="w-4 h-4" />
                    <span>{L(language, { fa: 'ایجاد اتاق', en: 'Create room', ru: 'Создать комнату', tr: 'Oda oluştur' })}</span>
                  </button>
                </form>
              </div>

              <div className="bg-dark-card border border-white/10 rounded-2xl p-6">
                <h3 className="text-sm font-bold text-white mb-4">{L(language, { fa: 'اتاق‌های گفتگوی فعال', en: 'Active chat rooms', ru: 'Активные чат-комнаты', tr: 'Aktif sohbet odaları' })}</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {chatRooms.map((room) => (
                    <div key={room} className="bg-[#0a0e21] border border-white/5 rounded-xl p-3 flex justify-between items-center gap-2">
                      <span className="text-xs font-bold text-white truncate">{room}</span>
                      <button
                        onClick={() => { if (confirm(L(language, { fa: 'آیا از حذف این اتاق گفتگو مطمئن هستید؟ تمام پیام‌های آن نیز حذف نمی‌شوند ولی اتاق دیگر در دسترس نخواهد بود.', en: 'Delete this chat room? Its messages are kept, but the room will no longer be available.', ru: 'Удалить эту чат-комнату? Сообщения сохранятся, но комната станет недоступна.', tr: 'Bu sohbet odası silinsin mi? Mesajlar korunur ancak oda artık erişilebilir olmaz.' }))) handleDeleteChatRoom(room); }}
                        className="px-2.5 py-1 rounded-lg text-[10px] font-black transition-all cursor-pointer bg-white/5 text-gray-400 border border-white/10 hover:bg-rose-500/20 hover:text-rose-400 shrink-0"
                      >
                        {L(language, { fa: 'حذف', en: 'Delete', ru: 'Удалить', tr: 'Sil' })}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Messages & Notifications Workspace Subtab */}
          {activeSubTab === 'messages' && (
            <div className="flex flex-col gap-6 animate-fade-in">
              <div className="bg-dark-card border border-white/10 rounded-2xl p-6">
                <h3 className="text-sm font-bold text-white flex items-center gap-2 mb-1.5 font-display uppercase tracking-wider">
                  <Mail className="w-4 h-4 text-primary" />
                  <span>{L(language, { fa: 'ارسال پیام جدید (جمعی و فردی)', en: 'Send New Message / Notification', ru: 'Новое сообщение (массовое или личное)', tr: 'Yeni Mesaj Gönder (Toplu ve Bireysel)' })}</span>
                </h3>
                <p className="text-[10px] text-gray-400 border-b border-white/5 pb-4 mb-4">
                  {L(language, { fa: 'از این بخش می‌توانید به کاربران به صورت فردی یا جمعی پیام ارسال کنید. همچنین با فعال‌سازی گزینه نوتیفیکیشن، پیام به صورت اعلان زنده ظاهر خواهد شد.', en: 'Compose messages individually or broadcast collectively. Standard messages show up in the gamer\'s inbox.', ru: 'Отправляйте сообщения пользователям индивидуально или всем сразу. Обычные сообщения попадают во входящие игрока; с опцией уведомления — приходят как живой push.', tr: 'Bu bölümden kullanıcılara bireysel veya toplu mesaj gönderebilirsiniz. Standart mesajlar oyuncunun gelen kutusuna düşer; bildirim seçeneğiyle canlı push olarak iletilir.' })}
                </p>

                <form onSubmit={handleSendMessage} className="flex flex-col gap-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs text-gray-400 block mb-1.5 font-bold">{L(language, { fa: 'گیرنده پیام (کاربر هدف)', en: 'Recipient', ru: 'Получатель (целевой пользователь)', tr: 'Mesaj Alıcısı (Hedef Kullanıcı)' })}</label>
                      <select
                        value={recipient}
                        onChange={(e) => setRecipient(e.target.value)}
                        className="w-full bg-[#0d122b] border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-primary font-bold"
                      >
                        <option value="All">{L(language, { fa: '📢 همه‌ کاربران (ارسال جمعی)', en: '📢 Broadcast to All', ru: '📢 Все пользователи (рассылка)', tr: '📢 Tüm Kullanıcılar (Toplu Gönderim)' })}</option>
                        {registeredUsers.map((u: any) => (
                          <option key={u.username} value={u.username}>
                            👤 {u.username} ({u.email || u.phone})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-xs text-gray-400 block mb-1.5 font-bold">{L(language, { fa: 'موضوع پیام', en: 'Message Title', ru: 'Тема сообщения', tr: 'Mesaj Konusu' })}</label>
                      <input 
                        type="text" 
                        required
                        placeholder={L(language, { fa: 'مثال: تاییدیه رزرو سیستم VIP', en: 'e.g. VIP Reservation Confirmed', ru: 'Напр.: Бронь VIP подтверждена', tr: 'Örn: VIP Sistem Rezervasyon Onayı' })}
                        value={msgTitle}
                        onChange={(e) => setMsgTitle(e.target.value)}
                        className="w-full bg-[#0d122b] border border-white/10 rounded-lg px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-primary font-bold"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs text-gray-400 block mb-1.5 font-bold">{L(language, { fa: 'متن پیام ارسالی', en: 'Message Body', ru: 'Текст сообщения', tr: 'Mesaj Metni' })}</label>
                    <textarea 
                      required 
                      rows={4}
                      placeholder={L(language, { fa: 'متن خود را در این بخش وارد کنید...', en: 'Enter your message details...', ru: 'Введите текст сообщения...', tr: 'Metninizi buraya yazın...' })}
                      value={msgBody}
                      onChange={(e) => setMsgBody(e.target.value)}
                      className="w-full bg-[#0d122b] border border-white/10 rounded-lg px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-primary font-medium"
                    />
                  </div>

                  <div className="flex items-center gap-2 bg-[#0d122b] p-3 rounded-xl border border-white/5 self-start">
                    <input 
                      type="checkbox" 
                      id="sendAsNotif"
                      checked={sendAsNotification}
                      onChange={(e) => setSendAsNotification(e.target.checked)}
                      className="w-4 h-4 accent-primary cursor-pointer"
                    />
                    <label htmlFor="sendAsNotif" className="text-xs text-white font-bold cursor-pointer select-none">
                      {L(language, { fa: '🔔 ارسال به عنوان نوتیفیکیشن فشاری زنده (Live Push Notification)', en: '🔔 Send as Live Push Notification', ru: '🔔 Отправить как живое push-уведомление', tr: '🔔 Canlı Anlık Bildirim (Push) Olarak Gönder' })}
                    </label>
                  </div>

                  <div className="flex justify-end border-t border-white/5 pt-4">
                    <button 
                      type="submit"
                      className="px-6 bg-primary hover:bg-primary-hover text-black py-2.5 rounded-lg text-xs font-black cursor-pointer flex items-center gap-1.5 border border-primary/20 shadow-[0_0_15px_rgba(0,240,255,0.2)] transition-all font-display uppercase tracking-wide"
                    >
                      <Send className="w-4 h-4" />
                      <span>{L(language, { fa: 'ارسال پیام / نوتیفیکیشن', en: 'Send Message', ru: 'Отправить сообщение / уведомление', tr: 'Mesaj / Bildirim Gönder' })}</span>
                    </button>
                  </div>
                </form>
              </div>

              {/* Sent Messages History list */}
              <div className="bg-dark-card border border-white/10 rounded-2xl p-6">
                <h3 className="text-sm font-bold text-white flex items-center gap-2 mb-4 font-display uppercase tracking-wider">
                  <Mail className="w-4 h-4 text-emerald-400" />
                  <span>{L(language, { fa: 'تاریخچه پیام‌های ارسال شده اخیر', en: 'Sent Messages History Log', ru: 'История отправленных сообщений', tr: 'Son Gönderilen Mesajların Geçmişi' })}</span>
                </h3>

                <div className="flex flex-col gap-3 max-h-[400px] overflow-y-auto scrollbar-thin">
                  {messagesList.length === 0 ? (
                    <div className="text-center py-8 text-gray-500 text-xs font-bold">
                      {L(language, { fa: 'هیچ پیامی هنوز ارسال نشده است.', en: 'No messages sent yet.', ru: 'Сообщений пока не отправлено.', tr: 'Henüz mesaj gönderilmedi.' })}
                    </div>
                  ) : (
                    messagesList.map((m: any) => (
                      <div key={m.id} className="p-4 bg-[#0d122b] border border-white/5 rounded-xl flex flex-col gap-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 rounded font-mono font-bold">
                            {L(language, { fa: 'به: ', en: 'To: ', ru: 'Кому: ', tr: 'Kime: ' })}{m.recipient === 'All' ? (L(language, { fa: 'همه کاربران', en: 'All Users', ru: 'Все пользователи', tr: 'Tüm Kullanıcılar' })) : `@${m.recipient}`}
                          </span>
                          <span className="text-[10px] text-gray-500 font-mono">{m.date}</span>
                        </div>
                        <h4 className="text-xs font-bold text-white mt-1">{m.title}</h4>
                        <p className="text-xs text-gray-400 font-medium leading-relaxed">{m.body}</p>
                        <div className="flex items-center gap-1.5 mt-1">
                          <span className={`w-1.5 h-1.5 rounded-full ${m.type === 'notification' ? 'bg-amber-400' : 'bg-blue-400'}`}></span>
                          <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">
                            {m.type === 'notification' ? (L(language, { fa: 'نوع: نوتیفیکیشن لایو', en: 'Type: Live Notification', ru: 'Тип: живое уведомление', tr: 'Tür: Canlı Bildirim' })) : (m.type === 'news' ? (L(language, { fa: 'نوع: خبر بلاگ', en: 'Type: Blog News', ru: 'Тип: новость блога', tr: 'Tür: Blog Haberi' })) : (L(language, { fa: 'نوع: صندوق پیام معمولی', en: 'Type: Inbox Message', ru: 'Тип: обычное сообщение', tr: 'Tür: Normal Gelen Kutusu Mesajı' })))}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {/* EF Core Migrations & C# Code Subtab */}
          {activeSubTab === 'migrations' && migrationsCode && (
            <div className="flex flex-col gap-6">
              <div className="bg-dark-card border border-white/10 rounded-2xl p-6">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4 border-b border-white/5 pb-4">
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-2 font-display uppercase tracking-wider">
                      <Database className="w-4 h-4 text-[#A855F7] animate-pulse" />
                      <span>{L(language, { fa: 'کدهای کلاس دایرکتوری EF Core Code-First Migration', en: 'EF Core Code-First Migration class', ru: 'Класс миграции EF Core Code-First', tr: 'EF Core Code-First Migration sınıfı' })}</span>
                    </h3>
                    <p className="text-[10px] text-gray-400 mt-1">{L(language, { fa: 'تولید خودکار کدهای جدول دیتابیس رابطه‌ای SQL Server بر پایه Fluent API', en: 'Auto-generated SQL Server table code based on Fluent API', ru: 'Автогенерация кода таблиц SQL Server на основе Fluent API', tr: 'Fluent API tabanlı otomatik SQL Server tablo kodu' })}</p>
                  </div>

                  <button
                    onClick={copyMigrationsToClipboard}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#A855F7]/10 hover:bg-[#A855F7]/20 text-[#A855F7] border border-[#A855F7]/20 transition-all font-mono text-[10px] font-bold cursor-pointer"
                  >
                    <ClipboardCopy className="w-3.5 h-3.5" />
                    <span>{L(language, { fa: 'کپی کلاس مهاجرت (Copy Migration)', en: 'Copy Migration', ru: 'Копировать миграцию', tr: 'Geçişi kopyala (Copy Migration)' })}</span>
                  </button>
                </div>

                <div className="relative rounded-2xl overflow-hidden border border-white/10 bg-[#0d122b] p-5 font-mono text-xs leading-relaxed text-slate-300 text-left" style={{ direction: 'ltr' }}>
                  <div className="absolute top-3 right-3 text-slate-500 select-none text-[10px] bg-black/40 px-2.5 py-1 rounded-full border border-white/5 font-bold">
                    InitialGameNetDb.cs (C# Code First)
                  </div>
                  <pre className="overflow-x-auto max-h-[500px] whitespace-pre p-2 scrollbar-thin scrollbar-thumb-slate-800">
                    <code className="text-emerald-400 font-semibold block mb-2">// Migration Name: 20260714_InitialGameNetDb</code>
                    <code>{migrationsCode}</code>
                  </pre>
                </div>

                <div className="mt-4 p-4 rounded-xl bg-[#A855F7]/5 border border-[#A855F7]/20 text-xs leading-relaxed text-purple-300">
                  <p className="font-bold mb-1 flex items-center gap-2 text-white">
                    <span>{L(language, { fa: '💡 راهنمای پیکربندی پایگاه داده رابطه‌ای در دات‌نت:', en: '💡 Relational database setup guide for .NET:', ru: '💡 Руководство по настройке реляционной БД в .NET:', tr: '💡 .NET için ilişkisel veritabanı yapılandırma rehberi:' })}</span>
                  </p>
                  <p className="text-gray-400 text-[10px]">
                    {L(language, { fa: 'کلاس بالا نمونه واقعی تولیدشده از کدهای طراحی‌شده مهاجرت (Code-First) جهت ایجاد پایگاه داده سیستم است. این کلاس تمامی ایندکس‌های منحصربه‌فرد برای فیلدهای ایمیل و کدهای تخفیف را ایجاد کرده و روابط کلید خارجی بین رزروها، غذاهای کافه، کاربران و تراکنش‌های باشگاه مشتریان را به درستی همراه با حذف آبشاری (Cascade Delete) پیکربندی می‌کند. برای ساخت کامل جداول کافیست پکیج <code className="text-[#06B6D4] font-mono">Microsoft.EntityFrameworkCore.SqlServer</code> را نصب کرده و دستور بروزرسانی را اجرا کنید.', en: 'The class above is a real Code-First migration sample for creating the system database. It defines unique indexes for email and discount-code fields and configures the foreign-key relations between tables.', ru: 'Класс выше — реальный пример миграции Code-First для создания базы данных системы. Он задаёт уникальные индексы для полей email и промокодов и настраивает связи внешних ключей между таблицами.', tr: 'Yukarıdaki sınıf, sistem veritabanını oluşturmak için gerçek bir Code-First geçiş örneğidir. E-posta ve indirim kodu alanları için benzersiz indeksler tanımlar ve tablolar arasındaki yabancı anahtar ilişkilerini yapılandırır.' })}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Customization Sub-Tab */}
          {activeSubTab === 'customization' && (
            <div className="animate-fade-in space-y-8 pb-12">

              {/* SECTION 0: DATA SOURCE (SAMPLE ⇄ DATABASE) */}
              <div className="bg-dark-card border border-white/10 rounded-2xl p-6 space-y-5">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-white/5 pb-4">
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-2 font-display uppercase tracking-wider">
                      <Database className="w-4 h-4 text-cyan-400" />
                      <span>{L(language, { fa: 'منبع داده سایت و اپلیکیشن', en: 'Site & App Data Source', ru: 'Источник данных сайта и приложения', tr: 'Site ve Uygulama Veri Kaynağı' })}</span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold border ${
                        dataSource === 'sample'
                          ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30'
                          : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                      }`}>
                        {dataSource === 'sample'
                          ? (L(language, { fa: 'حالت نمونه (پیش‌فرض)', en: 'SAMPLE MODE', ru: 'РЕЖИМ ОБРАЗЦОВ (по умолчанию)', tr: 'ÖRNEK MOD (Varsayılan)' }))
                          : (L(language, { fa: 'حالت دیتابیس', en: 'DATABASE MODE', ru: 'РЕЖИМ БАЗЫ ДАННЫХ', tr: 'VERİTABANI MODU' }))}
                      </span>
                    </h3>
                    <p className="text-[10px] text-gray-400 mt-1">
                      {L(language, { fa: 'سایت و اپلیکیشن موبایل اطلاعات خود را از اینجا می‌گیرند. در حالت نمونه (پیش‌فرض) همه‌چیز از داده‌های آماده (۴-۵ مورد برای هر بخش) پر می‌شود؛ در حالت دیتابیس، جداول خالی به‌صورت خودکار از داده نمونه پر می‌شوند.', en: 'Site & mobile app read their data from here. In sample mode (default) everything is populated from ready-made data (4-5 items per section); in database mode, empty tables automatically fall back to sample data.', ru: 'Сайт и мобильное приложение берут данные отсюда. В режиме образцов (по умолчанию) всё заполняется готовыми данными; в режиме БД — реальными записями.', tr: 'Site ve mobil uygulama verilerini buradan alır. Örnek modda (varsayılan) her şey hazır verilerden doldurulur; veritabanı modunda gerçek kayıtlardan okunur.' })}
                    </p>
                  </div>
                  {isSwitchingDataSource && (
                    <span className="text-[10px] text-gray-400 font-mono flex items-center gap-2">
                      <span className="w-3.5 h-3.5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                      {L(language, { fa: 'در حال تغییر...', en: 'Switching...', ru: 'Переключение...', tr: 'Değiştiriliyor...' })}
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Sample Option */}
                  <div
                    onClick={() => handleSwitchDataSource('sample')}
                    className={`p-4 border rounded-xl cursor-pointer transition-all flex flex-col gap-3 relative overflow-hidden ${
                      dataSource === 'sample'
                        ? 'border-cyan-400 bg-cyan-500/[0.06] shadow-[0_0_15px_rgba(34,211,238,0.15)]'
                        : 'border-white/5 bg-black/10 hover:border-white/20'
                    }`}
                  >
                    {dataSource === 'sample' && (
                      <div className="absolute top-3 right-3 bg-cyan-400 text-black p-1 rounded-full">
                        <Check className="w-3 h-3 stroke-[3]" />
                      </div>
                    )}
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${dataSource === 'sample' ? 'bg-cyan-400/15 text-cyan-400' : 'bg-white/5 text-gray-400'}`}>
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                        </svg>
                      </div>
                      <div>
                        <h5 className="font-black text-sm text-white">{L(language, { fa: 'داده نمونه (Sample)', en: 'Sample Data', ru: 'Образцы данных (Sample)', tr: 'Örnek Veri (Sample)' })}</h5>
                        <span className="text-[10px] text-cyan-400 font-bold">{L(language, { fa: 'پیش‌فرض — بدون نیاز به دیتابیس', en: 'Default — no database required', ru: 'По умолчанию — база данных не нужна', tr: 'Varsayılan — veritabanı gerektirmez' })}</span>
                      </div>
                    </div>
                    <p className="text-xs text-gray-400 leading-relaxed font-semibold">
                      {L(language, { fa: 'همه بخش‌ها (سیستم‌ها، کافه، فروشگاه، مسابقات، بلاگ، اسلایدر، کد تخفیف و ...) از داده‌های آماده نمونه پر می‌شوند. مناسب نمایش و تست سایت.', en: 'All sections (systems, cafe, shop, tournaments, blog, sliders, coupons...) are populated from ready sample data. Ideal for demo & testing.', ru: 'Все разделы (системы, кафе, магазин, турниры, блог, слайдер, промокоды и т.д.) заполняются готовыми образцами.', tr: 'Tüm bölümler (sistemler, kafe, mağaza, turnuvalar, blog, slayt, indirim kodu vb.) hazır örnek verilerden doldurulur.' })}
                    </p>
                    {dataSourceInfo && (
                      <div className="flex flex-wrap gap-1.5 pt-2 border-t border-white/5">
                        {Object.entries(dataSourceInfo.sample).map(([k, v]) => (
                          <span key={k} className="px-1.5 py-0.5 bg-black/30 border border-white/10 rounded text-[10px] font-mono text-gray-400">
                            {k}: <span className="text-cyan-400 font-black">{v}</span>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Database Option */}
                  <div
                    onClick={() => handleSwitchDataSource('database')}
                    className={`p-4 border rounded-xl cursor-pointer transition-all flex flex-col gap-3 relative overflow-hidden ${
                      dataSource === 'database'
                        ? 'border-emerald-400 bg-emerald-500/[0.06] shadow-[0_0_15px_rgba(16,185,129,0.15)]'
                        : 'border-white/5 bg-black/10 hover:border-white/20'
                    }`}
                  >
                    {dataSource === 'database' && (
                      <div className="absolute top-3 right-3 bg-emerald-400 text-black p-1 rounded-full">
                        <Check className="w-3 h-3 stroke-[3]" />
                      </div>
                    )}
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${dataSource === 'database' ? 'bg-emerald-400/15 text-emerald-400' : 'bg-white/5 text-gray-400'}`}>
                        <Database className="w-5 h-5" />
                      </div>
                      <div>
                        <h5 className="font-black text-sm text-white">{L(language, { fa: 'دیتابیس', en: 'Database', ru: 'База данных', tr: 'Veritabanı' })}</h5>
                        <span className="text-[10px] text-emerald-400 font-bold">{L(language, { fa: 'داده‌های واقعی ذخیره‌شده', en: 'Real stored records', ru: 'Реальные сохранённые записи', tr: 'Gerçek kayıtlı veriler' })}</span>
                      </div>
                    </div>
                    <p className="text-xs text-gray-400 leading-relaxed font-semibold">
                      {L(language, { fa: 'سایت و اپ از رکوردهای واقعی دیتابیس می‌خوانند. اگر جدولی خالی باشد، به‌صورت خودکار از داده نمونه پر می‌شود تا سایت خالی نماند.', en: 'Site & app read from real database records. Empty tables automatically fall back to sample data so the site never looks empty.', ru: 'Сайт и приложение читают реальные записи БД. Пустые таблицы автоматически заполняются образцами.', tr: 'Site ve uygulama gerçek veritabanı kayıtlarını okur. Boş tablolar otomatik olarak örnek verilerle doldurulur.' })}
                    </p>
                    {dataSourceInfo && (
                      <div className="flex flex-wrap gap-1.5 pt-2 border-t border-white/5">
                        {Object.entries(dataSourceInfo.database).map(([k, v]) => (
                          <span key={k} className="px-1.5 py-0.5 bg-black/30 border border-white/10 rounded text-[10px] font-mono text-gray-400">
                            {k}: <span className="text-emerald-400 font-black">{v}</span>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-black/30 border border-white/5 text-[10px] text-gray-500 leading-relaxed flex items-start gap-2">
                  <HelpCircle className="w-3.5 h-3.5 text-cyan-400 shrink-0 mt-0.5" />
                  <span>
                    {L(language, { fa: 'تغییر منبع داده بلافاصله روی سایت و اپلیکیشن موبایل اعمال می‌شود (بدون رفرش). سفارش‌ها، رزروها و ثبت‌نام‌ها در هر دو حالت در دیتابیس ذخیره می‌شوند.', en: 'Switching the data source applies to the site and mobile app immediately (no refresh). Orders, reservations and registrations are always stored in the database in both modes.', ru: 'Смена источника данных применяется к сайту и приложению мгновенно (без обновления). Заказы, брони и регистрации всегда сохраняются в БД.', tr: 'Veri kaynağı değişikliği siteye ve mobil uygulamaya anında uygulanır (yenileme gerekmez). Siparişler, rezervasyonlar ve kayıtlar her zaman veritabanına yazılır.' })}
                  </span>
                </div>
              </div>

              {/* SECTION 1: SLIDER MANAGEMENT */}
              <div className="bg-dark-card border border-white/10 rounded-2xl p-6">
                <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2 font-display uppercase tracking-wider border-b border-white/5 pb-3">
                  <Sparkles className="w-4 h-4 text-emerald-400" />
                  <span>
                    {editingSlideId 
                      ? (L(language, { fa: 'ویرایش اسلاید صفحه اصلی', en: 'Edit Homepage Slider', ru: 'Редактировать слайд главной', tr: 'Ana Sayfa Slaytını Düzenle' }))
                      : (L(language, { fa: 'بارگذاری و مدیریت اسلایدر صفحه اصلی', en: 'Homepage Slider Management', ru: 'Управление слайдером главной страницы', tr: 'Ana Sayfa Slayt Yönetimi' }))}
                  </span>
                </h3>
                <p className="text-[10px] text-gray-400 mb-6">
                  {L(language, { fa: 'در این بخش می‌توانید تصاویر، عناوین و لینک هدف دکمه‌های اسلایدر بالای صفحه اصلی وب‌سایت را بارگذاری، تغییر داده یا حذف کنید.', en: 'Manage banners, title overlays, and navigation button targets for the main homepage hero slider. Upload, edit, or delete slides.', ru: 'Здесь можно загружать, менять и удалять изображения, заголовки и целевые ссылки кнопок слайдера в верхней части главной страницы.', tr: 'Bu bölümden ana sayfanın üst kısmındaki slaytın görsellerini, başlıklarını ve düğme hedef bağlantılarını yükleyebilir, değiştirebilir ve silebilirsiniz.' })}
                </p>

                {/* Slider creation/edit form */}
                <form onSubmit={editingSlideId ? handleEditSlide : handleAddSlide} className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8 bg-black/30 p-4 rounded-xl border border-white/5">
                  <div className="md:col-span-2">
                    <label className="text-xs text-gray-400 block mb-1.5 font-bold">{L(language, { fa: 'آدرس تصویر اسلاید', en: 'Slider Image URL', ru: 'URL изображения слайда', tr: 'Slayt Görsel Adresi' })}</label>
                    <input 
                      type="text" 
                      required 
                      placeholder="/images/home/esports-480.webp"
                      value={newSlideUrl}
                      onChange={(e) => setNewSlideUrl(e.target.value)}
                      className="w-full bg-[#0d122b] border border-white/10 rounded-lg px-3.5 py-2 text-xs text-white focus:outline-none focus:border-primary font-mono"
                    />
                  </div>
                  <div className="md:col-span-2 space-y-2">
                    <label className="text-xs text-gray-400 block mb-1 font-bold">{L(language, { fa: 'تصویر عمودی نسخه موبایل (اختیاری)', en: 'Vertical mobile version image (optional)', ru: 'Вертикальное изображение для мобильной версии (необязательно)', tr: 'Dikey mobil sürüm görseli (isteğe bağlı)' })}</label>
                    <input 
                      type="text"
                      placeholder="/images/mobile/generated/..."
                      value={newSlideMobileUrl}
                      onChange={(e) => setNewSlideMobileUrl(e.target.value)}
                      className="w-full bg-[#0d122b] border border-white/10 rounded-lg px-3.5 py-2 text-xs text-white focus:outline-none focus:border-primary font-mono"
                    />
                    <label className="flex items-center gap-2 text-[10px] text-gray-400 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={newSlideAutoMobile}
                        onChange={(e) => setNewSlideAutoMobile(e.target.checked)}
                        className="accent-primary w-3.5 h-3.5"
                      />
                      <span>{L(language, { fa: 'اگر فیلد بالا خالی بود، ساخت خودکار نسخه عمودی موبایل از روی تصویر اصلی', en: 'If empty, auto-generate a vertical mobile version from the main image', ru: 'Если поле пустое — вертикальная мобильная версия создаётся автоматически', tr: 'Üstteki alan boşsa, ana görselden otomatik olarak dikey mobil sürüm oluşturulur' })}</span>
                    </label>
                  </div>
                  
                  <div className="md:col-span-2 bg-emerald-500/5 border border-emerald-500/10 p-3 rounded-lg flex flex-col sm:flex-row items-center justify-between gap-3">
                    <div className="space-y-0.5">
                      <h4 className="text-xs font-bold text-emerald-400 flex items-center gap-1">
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>{L(language, { fa: 'دستیار ترجمه هوش مصنوعی (جمینای)', en: 'Gemini AI Translation Assistant', ru: 'ИИ-помощник перевода (Gemini)', tr: 'Yapay Zekâ Çeviri Asistanı (Gemini)' })}</span>
                      </h4>
                      <p className="text-[10px] text-gray-400">
                        {L(language, { fa: 'یکی از کادرها (مثلاً فارسی) را بنویسید، سپس روی دکمه مقابل کلیک کنید تا متن سایر زبان‌ها خودکار تولید و جایگذاری شود.', en: 'Write either Persian or English, then click translate to generate all other languages automatically.', ru: 'Заполните одно поле (например, персидское), затем нажмите кнопку — тексты на остальных языках сгенерируются автоматически.', tr: 'Kutulardan birini (örneğin Farsça) doldurun, ardından yandaki düğmeye tıklayın; diğer dillerin metni otomatik oluşturulur.' })}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        disabled={isTranslating}
                        onClick={() => {
                          const srcText = newSlideTitleFa || newSlideTitleEn;
                          const srcLang = newSlideTitleFa ? 'fa' : 'en';
                          handleAITranslate(srcText, srcLang, (trans) => {
                            setNewSlideTitleFa(trans.fa);
                            setNewSlideTitleEn(trans.en);
                            setNewSlideTitleRu(trans.ru);
                            setNewSlideTitleTr(trans.tr);
                          });
                        }}
                        className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-950 text-black font-black text-[10px] rounded transition-all flex items-center gap-1 cursor-pointer"
                      >
                        {isTranslating ? (
                          <span className="w-3 h-3 border-2 border-black/30 border-t-black rounded-full animate-spin"></span>
                        ) : (
                          <Sparkles className="w-3 h-3" />
                        )}
                        <span>{L(language, { fa: 'تولید خودکار زبان‌ها', en: 'Generate All Languages', ru: 'Сгенерировать все языки', tr: 'Tüm Dilleri Otomatik Oluştur' })}</span>
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="text-xs text-gray-400 block mb-1.5 font-bold">{L(language, { fa: 'عنوان فارسی اسلاید', en: 'Persian Title', ru: 'Заголовок слайда (персидский)', tr: 'Slayt Başlığı (Farsça)' })}</label>
                    <input 
                      type="text" 
                      required 
                      placeholder={L(language, { fa: 'توضیحات جذاب کوتاه روی اسلاید', en: 'Short catchy slide caption', ru: 'Короткая привлекательная подпись слайда', tr: 'Slayt için kısa ve çekici açıklama' })}
                      value={newSlideTitleFa}
                      onChange={(e) => setNewSlideTitleFa(e.target.value)}
                      className="w-full bg-[#0d122b] border border-white/10 rounded-lg px-3.5 py-2 text-xs text-white focus:outline-none focus:border-primary font-bold"
                    />
                  </div>

                  <div>
                    <label className="text-xs text-gray-400 block mb-1.5 font-bold">{L(language, { fa: 'عنوان انگلیسی اسلاید', en: 'English Title', ru: 'Заголовок слайда (английский)', tr: 'Slayt Başlığı (İngilizce)' })}</label>
                    <input 
                      type="text" 
                      required 
                      placeholder="Slide English Title"
                      value={newSlideTitleEn}
                      onChange={(e) => setNewSlideTitleEn(e.target.value)}
                      className="w-full bg-[#0d122b] border border-white/10 rounded-lg px-3.5 py-2 text-xs text-white focus:outline-none focus:border-primary font-bold"
                    />
                  </div>

                  <div>
                    <label className="text-xs text-gray-400 block mb-1.5 font-bold">{L(language, { fa: 'عنوان روسی اسلاید', en: 'Russian Title', ru: 'Заголовок слайда (русский)', tr: 'Slayt Başlığı (Rusça)' })}</label>
                    <input 
                      type="text" 
                      required 
                      placeholder="Slide Russian Title"
                      value={newSlideTitleRu}
                      onChange={(e) => setNewSlideTitleRu(e.target.value)}
                      className="w-full bg-[#0d122b] border border-white/10 rounded-lg px-3.5 py-2 text-xs text-white focus:outline-none focus:border-primary font-bold"
                    />
                  </div>

                  <div>
                    <label className="text-xs text-gray-400 block mb-1.5 font-bold">{L(language, { fa: 'عنوان ترکی اسلاید', en: 'Turkish Title', ru: 'Заголовок слайда (турецкий)', tr: 'Slayt Başlığı (Türkçe)' })}</label>
                    <input 
                      type="text" 
                      required 
                      placeholder="Slide Turkish Title"
                      value={newSlideTitleTr}
                      onChange={(e) => setNewSlideTitleTr(e.target.value)}
                      className="w-full bg-[#0d122b] border border-white/10 rounded-lg px-3.5 py-2 text-xs text-white focus:outline-none focus:border-primary font-bold"
                    />
                  </div>

                  {(['fa', 'en', 'ru', 'tr'] as const).map((lng) => (
                    <div key={`slide-desc-${lng}`}>
                      <label className="text-xs text-gray-400 block mb-1.5 font-bold">
                        {L(language, { fa: 'توضیح اسلاید', en: 'Slide description', ru: 'Описание слайда', tr: 'Slayt açıklaması' })} ({lng.toUpperCase()})
                        <span className="text-gray-600 font-normal ms-1">{L(language, { fa: '(اختیاری — در هرو سایت و قالب‌ها نمایش داده می‌شود)', en: '(optional — shown in site hero and themes)', ru: '(необязательно — показывается в hero сайта и темах)', tr: '(isteğe bağlı — site hero ve temalarda gösterilir)' })}</span>
                      </label>
                      <input
                        type="text"
                        dir={lng === 'fa' ? 'rtl' : 'ltr'}
                        value={newSlideDesc[lng]}
                        onChange={(e) => setNewSlideDesc(d => ({ ...d, [lng]: e.target.value }))}
                        className="w-full bg-[#0d122b] border border-white/10 rounded-lg px-3.5 py-2 text-xs text-white focus:outline-none focus:border-primary"
                      />
                    </div>
                  ))}

                  <div className="md:col-span-2 flex items-center gap-4">
                    <div className="flex-1">
                      <label className="text-xs text-gray-400 block mb-1.5 font-bold">{L(language, { fa: 'هدایت به بخش (هدف کلیک)', en: 'Button Click Target', ru: 'Переход в раздел (цель клика)', tr: 'Yönlendirilecek Bölüm (Tıklama Hedefi)' })}</label>
                      <select 
                        value={newSlideTarget}
                        onChange={(e) => setNewSlideTarget(e.target.value)}
                        className="w-full bg-[#0d122b] border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-primary font-bold"
                      >
                        <option value="reserve">{L(language, { fa: 'سامانه رزرو سیستم‌ها', en: 'Reservations', ru: 'Бронирование систем', tr: 'Sistem Rezervasyon Sistemi' })}</option>
                        <option value="cafe">{L(language, { fa: 'سفارش آنلاین کافه بوفه', en: 'Cafe & Buffet', ru: 'Онлайн-заказ в кафе', tr: 'Kafe Büfe Online Sipariş' })}</option>
                        <option value="shop">{L(language, { fa: 'فروشگاه تجهیزات گیمینگ', en: 'Gaming Accessories Shop', ru: 'Магазин игровых аксессуаров', tr: 'Oyun Ekipmanları Mağazası' })}</option>
                        <option value="tournaments">{L(language, { fa: 'تورنمنت‌ها و مسابقات فعال', en: 'Active Tournaments', ru: 'Активные турниры', tr: 'Aktif Turnuvalar ve Müsabakalar' })}</option>
                        <option value="blog">{L(language, { fa: 'اخبار کلوپ و مقالات', en: 'Blog', ru: 'Новости клуба и статьи', tr: 'Kulüp Haberleri ve Makaleler' })}</option>
                      </select>
                    </div>

                    <div className="flex gap-2 mt-6">
                      <button 
                        type="submit"
                        className="px-6 py-2 bg-primary hover:bg-primary-hover text-black font-black text-xs h-[38px] notched-clip-sm transition-all cursor-pointer"
                      >
                        {editingSlideId 
                          ? (L(language, { fa: 'ذخیره تغییرات', en: 'Save Changes', ru: 'Сохранить изменения', tr: 'Değişiklikleri Kaydet' })) 
                          : (L(language, { fa: 'افزودن اسلاید', en: 'Add Slide', ru: 'Добавить слайд', tr: 'Slayt Ekle' }))}
                      </button>
                      
                      {editingSlideId && (
                        <button 
                          type="button"
                          onClick={cancelEditSlide}
                          className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white font-black text-xs h-[38px] notched-clip-sm transition-all cursor-pointer"
                        >
                          {L(language, { fa: 'انصراف', en: 'Cancel', ru: 'Отмена', tr: 'İptal' })}
                        </button>
                      )}
                    </div>
                  </div>
                </form>

                {/* Sliders list */}
                <h4 className="text-xs font-bold text-white mb-3">{L(language, { fa: 'اسلایدهای فعال کنونی', en: 'Current Active Slides', ru: 'Текущие активные слайды', tr: 'Mevcut Aktif Slaytlar' })}</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {appSliders.length === 0 ? (
                    <div className="col-span-2 text-center py-6 bg-black/20 border border-white/5 rounded-xl text-gray-500 text-xs">
                      {L(language, { fa: 'هیچ اسلایدی یافت نشد.', en: 'No sliders active.', ru: 'Слайды не найдены.', tr: 'Slayt bulunamadı.' })}
                    </div>
                  ) : (
                    appSliders.map((slide) => (
                      <div key={slide.id} className="p-3 bg-[#0d122b] border border-white/5 rounded-xl flex gap-3 group relative overflow-hidden">
                        <img loading="lazy" 
                          src={slide.imageUrl} 
                          alt={slide.titleFa} 
                          className="w-16 h-16 object-cover rounded-lg border border-white/10"
                          referrerPolicy="no-referrer"
                        />
                        <div className="flex-1 min-w-0">
                          <span className="text-[10px] px-2 py-0.5 bg-primary/20 text-primary border border-primary/20 rounded-full font-mono uppercase font-bold">
                            Target: {slide.target}
                          </span>
                          <h5 className="text-xs font-bold text-white mt-1 truncate" title={slide.titleFa}>{slide.titleFa}</h5>
                          <h6 className="text-[10px] text-gray-400 font-medium truncate" title={slide.titleEn}>{slide.titleEn}</h6>
                        </div>
                        <div className="absolute top-2 right-2 flex gap-1">
                          <button 
                            onClick={() => startEditSlide(slide)}
                            className="p-1 bg-blue-500/10 border border-blue-500/20 text-blue-400 hover:bg-blue-500 hover:text-white rounded transition-all cursor-pointer"
                            title={L(language, { fa: 'ویرایش اسلاید', en: 'Edit Slide', ru: 'Редактировать слайд', tr: 'Slaytı Düzenle' })}
                          >
                            <Edit className="w-3 h-3" />
                          </button>
                          <button 
                            onClick={() => handleDeleteSlide(slide.id)}
                            className="p-1 bg-red-500/10 border border-red-500/20 text-red-500 hover:bg-red-500 hover:text-white rounded transition-all cursor-pointer"
                            title={L(language, { fa: 'حذف اسلاید', en: 'Delete Slide', ru: 'Удалить слайд', tr: 'Slaytı Sil' })}
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* SECTION 2: HOMEPAGE SECTIONS CONFIGURATION */}
              <div className="bg-dark-card border border-white/10 rounded-2xl p-6">
                <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2 font-display uppercase tracking-wider border-b border-white/5 pb-3">
                  <Sliders className="w-4 h-4 text-emerald-400" />
                  <span>{L(language, { fa: 'مدیریت و فعال‌سازی بخش‌های مختلف صفحه اصلی', en: 'Homepage Section Config', ru: 'Управление разделами главной страницы', tr: 'Ana Sayfa Bölümlerini Yönet ve Etkinleştir' })}</span>
                </h3>
                <p className="text-[10px] text-gray-400 mb-6">
                  {L(language, { fa: 'از این قسمت می‌توانید هر یک از بخش‌های بزرگ صفحه اصلی (مانند جدول نتایج، کلوپ مربیان و ...) را مخفی/نمایان کرده و متون، عناوین و توضیحات بالای آن‌ها را ویرایش کنید.', en: 'Toggle structural homepage sections and customize their heading titles, subtitles, and introductory paragraphs dynamically.', ru: 'Скрывайте/показывайте крупные разделы главной (табло результатов, тренеры и т.д.) и редактируйте их заголовки, подзаголовки и вводные тексты.', tr: 'Ana sayfanın büyük bölümlerini (sonuç tablosu, koçlar kulübü vb.) gizleyip gösterebilir; başlık, alt başlık ve giriş metinlerini düzenleyebilirsiniz.' })}
                </p>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  {/* Sidebar select section */}
                  <div className="lg:col-span-4 flex flex-col gap-1.5">
                    <span className="text-[10px] text-gray-500 font-bold uppercase mb-2">{L(language, { fa: 'انتخاب بخش جهت ویرایش', en: 'Select Section to Edit', ru: 'Выберите раздел для редактирования', tr: 'Düzenlenecek Bölümü Seçin' })}</span>
                    {[
                      { key: 'genres', name: { fa: '🎮 دسته‌بندی و ژانرهای بازی نو', en: 'Game Genres', ru: 'Жанры игр', tr: 'Oyun Türleri' } },
                      { key: 'services', name: { fa: '🌟 سالن‌ها و خدمات ویژه کلوپ', en: 'Lounge Services', ru: 'Залы и услуги клуба', tr: 'Salon Hizmetleri' } },
                      { key: 'matches', name: { fa: '🏆 جدول زنده نتایج مسابقات', en: 'Live Match Results', ru: 'Живые результаты матчей', tr: 'Canlı Maç Sonuçları' } },
                      { key: 'tournaments', name: { fa: '🛡️ تورنمنت‌های فعال و ثبت‌نام سریع', en: 'Tournaments Carousel', ru: 'Карусель турниров', tr: 'Turnuva Karuseli' } },
                      { key: 'pricing', name: { fa: '💎 بسته‌های زمانی و کارت عضویت', en: 'Pricing passes', ru: 'Тарифы и абонементы', tr: 'Fiyat Paketleri' } },
                      { key: 'coaches', name: { fa: '👤 مربیان حرفه‌ای و پرسنل', en: 'Pro Coaches & Staff', ru: 'Тренеры и персонал', tr: 'Profesyonel Koçlar ve Personel' } },
                      { key: 'address', name: { fa: '📍 نقشه و اطلاعات تماس کلوپ', en: 'Address & Location Map', ru: 'Адрес и карта', tr: 'Adres ve Konum Haritası' } },
                    ].map(sec => (
                      <button
                        key={sec.key}
                        onClick={() => setSelectedSectionKey(sec.key)}
                        className={`px-3 py-2.5 rounded-lg text-xs font-bold text-right flex items-center justify-between transition-all ${
                          selectedSectionKey === sec.key
                            ? 'bg-[#10B981]/10 border border-[#10B981]/30 text-emerald-400 font-black shadow-inner'
                            : 'bg-black/30 border border-white/5 text-gray-400 hover:text-white hover:bg-black/50'
                        }`}
                      >
                        <span>{L(language, sec.name)}</span>
                        <ChevronLeft className={`w-3.5 h-3.5 transition-transform ${selectedSectionKey === sec.key ? '-translate-x-1 text-[#10B981]' : 'opacity-40'}`} />
                      </button>
                    ))}
                  </div>

                  {/* Editor panel form */}
                  <div className="lg:col-span-8 p-5 bg-black/30 border border-white/5 rounded-xl space-y-4">
                    <div className="flex items-center justify-between border-b border-white/5 pb-3 mb-2">
                      <span className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                        Editor: {selectedSectionKey}
                      </span>
                      
                      {/* Section Toggle */}
                      <div className="flex items-center gap-2">
                        <label className="text-xs text-gray-400 font-bold cursor-pointer select-none" htmlFor="secEnable">
                          {L(language, { fa: 'وضعیت نمایش:', en: 'Visibility:', ru: 'Видимость:', tr: 'Görünürlük Durumu:' })}
                        </label>
                        <button
                          id="secEnable"
                          onClick={() => setSecIsEnabled(!secIsEnabled)}
                          className={`px-3 py-1 text-[10px] font-black uppercase notched-clip-sm transition-all border ${
                            secIsEnabled 
                              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' 
                              : 'bg-red-500/10 border-red-500/30 text-red-400'
                          }`}
                        >
                          {secIsEnabled ? (L(language, { fa: 'فعال (نمایش)', en: 'Enabled', ru: 'Включён (показывать)', tr: 'Etkin (Görünür)' })) : (L(language, { fa: 'غیرفعال (مخفی)', en: 'Hidden', ru: 'Выключен (скрыт)', tr: 'Devre Dışı (Gizli)' }))}
                        </button>
                      </div>
                    </div>

                    {/* Translation Wizard Card */}
                    <div className="bg-emerald-500/5 border border-emerald-500/10 p-3 rounded-lg flex flex-col sm:flex-row items-center justify-between gap-3">
                      <div className="space-y-0.5">
                        <h4 className="text-xs font-bold text-emerald-400 flex items-center gap-1">
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>{L(language, { fa: 'دستیار ترجمه هوش مصنوعی (جمینای)', en: 'Gemini AI Translation Assistant', ru: 'ИИ-помощник перевода (Gemini)', tr: 'Yapay Zekâ Çeviri Asistanı (Gemini)' })}</span>
                        </h4>
                        <p className="text-[10px] text-gray-400">
                          {L(language, { fa: 'عنوان یا توضیحات بخش را به زبان فارسی یا انگلیسی بنویسید، سپس روی دکمه مقابل کلیک کنید تا متن سایر زبان‌ها خودکار تولید و جایگذاری شود.', en: 'Write the title or description in Persian or English, then click to auto-translate into all other languages.', ru: 'Введите заголовок или описание раздела на персидском или английском, затем нажмите кнопку для автоперевода на остальные языки.', tr: 'Bölümün başlığını veya açıklamasını Farsça ya da İngilizce yazın, ardından diğer dillere otomatik çeviri için yandaki düğmeye tıklayın.' })}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          disabled={isTranslating}
                          onClick={() => {
                            // Translate Title
                            const srcTitle = secTitleFa || secTitleEn;
                            const srcTitleLang = secTitleFa ? 'fa' : 'en';
                            if (srcTitle) {
                              handleAITranslate(srcTitle, srcTitleLang, (trans) => {
                                setSecTitleFa(trans.fa);
                                setSecTitleEn(trans.en);
                                setSecTitleRu(trans.ru);
                                setSecTitleTr(trans.tr);
                              });
                            }

                            // Translate Description
                            const srcDesc = secDescFa || secDescEn;
                            const srcDescLang = secDescFa ? 'fa' : 'en';
                            if (srcDesc) {
                              handleAITranslate(srcDesc, srcDescLang, (trans) => {
                                setSecDescFa(trans.fa);
                                setSecDescEn(trans.en);
                                setSecDescRu(trans.ru);
                                setSecDescTr(trans.tr);
                              });
                            }
                          }}
                          className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-950 text-black font-black text-[10px] rounded transition-all flex items-center gap-1 cursor-pointer"
                        >
                          {isTranslating ? (
                            <span className="w-3 h-3 border-2 border-black/30 border-t-black rounded-full animate-spin"></span>
                          ) : (
                            <Sparkles className="w-3 h-3" />
                          )}
                          <span>{L(language, { fa: 'ترجمه خودکار کل بخش', en: 'Auto-Translate Section', ru: 'Автоперевод всего раздела', tr: 'Tüm Bölümü Otomatik Çevir' })}</span>
                        </button>
                      </div>
                    </div>

                    {/* Section Titles */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-[10px] text-gray-500 block mb-1 font-bold">{L(language, { fa: 'عنوان بخش (فارسی)', en: 'Section Title (FA)', ru: 'Заголовок раздела (FA)', tr: 'Bölüm Başlığı (Farsça)' })}</label>
                        <input 
                          type="text"
                          value={secTitleFa}
                          onChange={(e) => setSecTitleFa(e.target.value)}
                          className="w-full bg-[#0d122b] border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#10B981] font-bold"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-gray-500 block mb-1 font-bold">{L(language, { fa: 'عنوان بخش (انگلیسی)', en: 'Section Title (EN)', ru: 'Заголовок раздела (EN)', tr: 'Bölüm Başlığı (İngilizce)' })}</label>
                        <input 
                          type="text"
                          value={secTitleEn}
                          onChange={(e) => setSecTitleEn(e.target.value)}
                          className="w-full bg-[#0d122b] border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#10B981] font-bold"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-gray-500 block mb-1 font-bold">{L(language, { fa: 'عنوان بخش (روسی)', en: 'Section Title (RU)', ru: 'Заголовок раздела (RU)', tr: 'Bölüm Başlığı (Rusça)' })}</label>
                        <input 
                          type="text"
                          value={secTitleRu}
                          onChange={(e) => setSecTitleRu(e.target.value)}
                          className="w-full bg-[#0d122b] border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#10B981] font-bold"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-gray-500 block mb-1 font-bold">{L(language, { fa: 'عنوان بخش (ترکی)', en: 'Section Title (TR)', ru: 'Заголовок раздела (TR)', tr: 'Bölüm Başlığı (Türkçe)' })}</label>
                        <input 
                          type="text"
                          value={secTitleTr}
                          onChange={(e) => setSecTitleTr(e.target.value)}
                          className="w-full bg-[#0d122b] border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#10B981] font-bold"
                        />
                      </div>
                    </div>

                    {/* Section Descs */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-[10px] text-gray-500 block mb-1 font-bold">{L(language, { fa: 'متن توضیحات بالای بخش (فارسی)', en: 'Section Subtitle / Description (FA)', ru: 'Подзаголовок / описание раздела (FA)', tr: 'Bölüm Üst Açıklama Metni (Farsça)' })}</label>
                        <textarea 
                          rows={3}
                          value={secDescFa}
                          onChange={(e) => setSecDescFa(e.target.value)}
                          className="w-full bg-[#0d122b] border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#10B981] font-medium leading-relaxed"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] text-gray-500 block mb-1 font-bold">{L(language, { fa: 'متن توضیحات بالای بخش (انگلیسی)', en: 'Section Subtitle / Description (EN)', ru: 'Подзаголовок / описание раздела (EN)', tr: 'Bölüm Üst Açıklama Metni (İngilizce)' })}</label>
                        <textarea 
                          rows={3}
                          value={secDescEn}
                          onChange={(e) => setSecDescEn(e.target.value)}
                          className="w-full bg-[#0d122b] border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#10B981] font-medium leading-relaxed"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] text-gray-500 block mb-1 font-bold">{L(language, { fa: 'متن توضیحات بالای بخش (روسی)', en: 'Section Subtitle / Description (RU)', ru: 'Подзаголовок / описание раздела (RU)', tr: 'Bölüm Üst Açıklama Metni (Rusça)' })}</label>
                        <textarea 
                          rows={3}
                          value={secDescRu}
                          onChange={(e) => setSecDescRu(e.target.value)}
                          className="w-full bg-[#0d122b] border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#10B981] font-medium leading-relaxed"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] text-gray-500 block mb-1 font-bold">{L(language, { fa: 'متن توضیحات بالای بخش (ترکی)', en: 'Section Subtitle / Description (TR)', ru: 'Подзаголовок / описание раздела (TR)', tr: 'Bölüm Üst Açıklama Metni (Türkçe)' })}</label>
                        <textarea 
                          rows={3}
                          value={secDescTr}
                          onChange={(e) => setSecDescTr(e.target.value)}
                          className="w-full bg-[#0d122b] border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#10B981] font-medium leading-relaxed"
                        />
                      </div>
                    </div>

                    <div className="flex justify-end pt-2 border-t border-white/5">
                      <button
                        onClick={() => handleSaveSection(selectedSectionKey, { 
                          isEnabled: secIsEnabled, 
                          titleFa: secTitleFa, 
                          titleEn: secTitleEn, 
                          titleRu: secTitleRu,
                          titleTr: secTitleTr,
                          descFa: secDescFa, 
                          descEn: secDescEn,
                          descRu: secDescRu,
                          descTr: secDescTr
                        })}
                        className="px-5 py-2 bg-emerald-500 hover:bg-emerald-600 text-black font-black text-xs notched-clip-sm transition-all flex items-center gap-1.5 cursor-pointer font-display uppercase tracking-wider"
                      >
                        <Save className="w-3.5 h-3.5" />
                        <span>{L(language, { fa: 'ذخیره تنظیمات بخش', en: 'Save Section settings', ru: 'Сохранить настройки раздела', tr: 'Bölüm Ayarlarını Kaydet' })}</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* SECTION 3: SOCIAL MEDIA LINKS */}
              <div className="bg-dark-card border border-white/10 rounded-2xl p-6">
                <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2 font-display uppercase tracking-wider border-b border-white/5 pb-3">
                  <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                  </svg>
                  <span>{L(language, { fa: 'افزودن و مدیریت شبکه‌های اجتماعی کلوپ', en: 'Social Media Links Manager', ru: 'Соцсети клуба', tr: 'Kulüp Sosyal Medya Hesaplarını Ekle ve Yönet' })}</span>
                </h3>
                <p className="text-[10px] text-gray-400 mb-6">
                  {L(language, { fa: 'آدرس و پیوندهای شبکه‌های اجتماعی کلوپ (اینستاگرام، یوتیوب، تلگرام، توییتر و ...) را در این بخش اضافه، ویرایش یا حذف کنید تا در پاورقی وب‌سایت نمایش داده شوند.', en: 'Manage active social channels and platforms that display in the club footer and main pages.', ru: 'Добавляйте, редактируйте и удаляйте ссылки на соцсети клуба (Instagram, YouTube, Telegram, Twitter и др.).', tr: 'Kulübün sosyal medya bağlantılarını (Instagram, YouTube, Telegram, Twitter vb.) bu bölümden ekleyin, düzenleyin veya silin.' })}
                </p>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                  {/* Social Link Form */}
                  <form onSubmit={editingSocialId ? handleEditSocialSubmit : handleAddSocial} className="md:col-span-5 bg-black/30 border border-white/5 rounded-xl p-4 space-y-3.5 h-fit">
                    <h4 className="text-xs font-bold text-white uppercase font-mono border-b border-white/5 pb-1.5">
                      {editingSocialId 
                        ? (L(language, { fa: 'ویرایش پیوند اجتماعی', en: 'Edit Social Link', ru: 'Редактировать соцссылку', tr: 'Sosyal Bağlantıyı Düzenle' }))
                        : (L(language, { fa: 'افزودن لینک جدید', en: 'Add Social Link', ru: 'Добавить ссылку', tr: 'Yeni Bağlantı Ekle' }))}
                    </h4>
                    
                    <div>
                      <label className="text-[10px] text-gray-400 block mb-1 font-bold">{L(language, { fa: 'عنوان نمایشی', en: 'Display Label Name', ru: 'Отображаемое название', tr: 'Görünen Ad' })}</label>
                      <input 
                        type="text" 
                        required 
                        placeholder={L(language, { fa: 'مثال: کانال تلگرام کلوپ', en: 'e.g. Telegram Channel', ru: 'Напр.: Telegram-канал клуба', tr: 'Örn: Kulüp Telegram Kanalı' })}
                        value={newSocialName}
                        onChange={(e) => setNewSocialName(e.target.value)}
                        className="w-full bg-[#0d122b] border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-primary font-bold"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] text-gray-400 block mb-1 font-bold">{L(language, { fa: 'پلتفرم شبکه‌ اجتماعی', en: 'Social Platform', ru: 'Платформа', tr: 'Sosyal Medya Platformu' })}</label>
                      <select 
                        value={newSocialPlatform}
                        onChange={(e) => setNewSocialPlatform(e.target.value)}
                        className="w-full bg-[#0d122b] border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-primary font-bold"
                      >
                        <option value="instagram">{L(language, { fa: 'Instagram (اینستاگرام)', en: 'Instagram', ru: 'Instagram', tr: 'Instagram' })}</option>
                        <option value="telegram">{L(language, { fa: 'Telegram (تلگرام)', en: 'Telegram', ru: 'Telegram', tr: 'Telegram' })}</option>
                        <option value="youtube">{L(language, { fa: 'Youtube (یوتیوب)', en: 'YouTube', ru: 'YouTube', tr: 'YouTube' })}</option>
                        <option value="twitter">{L(language, { fa: 'X / Twitter (توییتر)', en: 'X / Twitter', ru: 'X / Twitter', tr: 'X / Twitter' })}</option>
                        <option value="aparat">{L(language, { fa: 'Aparat (آپارات)', en: 'Aparat', ru: 'Aparat', tr: 'Aparat' })}</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[10px] text-gray-400 block mb-1 font-bold">{L(language, { fa: 'آدرس اینترنتی (URL)', en: 'URL Address', ru: 'Адрес (URL)', tr: 'İnternet Adresi (URL)' })}</label>
                      <input 
                        type="url" 
                        required 
                        placeholder="https://..."
                        value={newSocialUrl}
                        onChange={(e) => setNewSocialUrl(e.target.value)}
                        className="w-full bg-[#0d122b] border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-primary font-mono"
                      />
                    </div>

                    <div className="flex gap-2">
                      <button
                        type="submit"
                        className="flex-1 py-2 bg-primary hover:bg-primary-hover text-black font-black text-xs notched-clip-sm transition-all uppercase tracking-wider h-[36px] cursor-pointer"
                      >
                        {editingSocialId 
                          ? (L(language, { fa: 'ذخیره تغییرات', en: 'Save Changes', ru: 'Сохранить изменения', tr: 'Değişiklikleri Kaydet' })) 
                          : (L(language, { fa: 'افزودن لینک اجتماعی', en: 'Add Social Link', ru: 'Добавить соцссылку', tr: 'Sosyal Bağlantı Ekle' }))}
                      </button>

                      {editingSocialId && (
                        <button
                          type="button"
                          onClick={cancelEditSocial}
                          className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white font-black text-xs notched-clip-sm transition-all h-[36px] cursor-pointer"
                        >
                          {L(language, { fa: 'انصراف', en: 'Cancel', ru: 'Отмена', tr: 'İptal' })}
                        </button>
                      )}
                    </div>
                  </form>

                  {/* Social links list */}
                  <div className="md:col-span-7 bg-[#0d122b]/40 border border-white/5 rounded-xl p-4 flex flex-col gap-3">
                    <h4 className="text-xs font-bold text-white uppercase font-mono border-b border-white/5 pb-1.5">{L(language, { fa: 'لیست پیوندهای فعال', en: 'Active Social Links', ru: 'Активные ссылки', tr: 'Aktif Bağlantı Listesi' })}</h4>
                    {socialMediaList.length === 0 ? (
                      <div className="text-center py-12 text-gray-500 text-xs font-bold">
                        {L(language, { fa: 'هیچ لینک اجتماعی ثبت نشده است.', en: 'No social links registered.', ru: 'Соцссылки не добавлены.', tr: 'Kayıtlı sosyal bağlantı yok.' })}
                      </div>
                    ) : (
                      <div className="flex flex-col gap-2 max-h-[300px] overflow-y-auto scrollbar-thin">
                        {socialMediaList.map((item) => (
                          <div key={item.id} className="p-3 bg-black/40 border border-white/5 rounded-xl flex items-center justify-between group">
                            <div className="flex items-center gap-2.5">
                              <span className="text-[10px] px-2 py-0.5 rounded bg-white/5 border border-white/10 text-primary font-mono font-bold uppercase">
                                {item.platform}
                              </span>
                              <div>
                                <h5 className="text-xs font-bold text-white">{item.name}</h5>
                                <a href={item.url} target="_blank" rel="noreferrer" className="text-[10px] text-gray-400 font-mono hover:text-primary leading-none block truncate max-w-[150px] md:max-w-[220px]" title={item.url}>
                                  {item.url}
                                </a>
                              </div>
                            </div>
                            <div className="flex gap-1">
                              <button
                                onClick={() => startEditSocial(item)}
                                className="p-1.5 text-blue-400 hover:text-white hover:bg-blue-500/20 rounded-md transition-all cursor-pointer border border-transparent hover:border-blue-500/30"
                                title={L(language, { fa: 'ویرایش لینک', en: 'Edit Link', ru: 'Редактировать ссылку', tr: 'Bağlantıyı Düzenle' })}
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteSocial(item.id)}
                                className="p-1.5 text-red-400 hover:text-white hover:bg-red-500/20 rounded-md transition-all cursor-pointer border border-transparent hover:border-red-500/30"
                                title={L(language, { fa: 'حذف لینک', en: 'Delete Link', ru: 'Удалить ссылку', tr: 'Bağlantıyı Sil' })}
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* SECTION 4: CLUB INFORMATION & CONTACT BRANDING */}
              <div className="bg-dark-card border border-white/10 rounded-2xl p-6">
                <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2 font-display uppercase tracking-wider border-b border-white/5 pb-3">
                  <Settings className="w-4 h-4 text-emerald-400" />
                  <span>{L(language, { fa: 'ویرایش مشخصات تماس و برندینگ کلوپ', en: 'Club Branding & Support Details', ru: 'Контакты и брендинг клуба', tr: 'Kulüp İletişim ve Marka Bilgilerini Düzenle' })}</span>
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-gray-400 block mb-1.5 font-bold">{L(language, { fa: 'تلفن پشتیبانی کلوپ', en: 'Support Phone line', ru: 'Телефон поддержки клуба', tr: 'Kulüp Destek Telefonu' })}</label>
                    <input 
                      type="text" 
                      placeholder="+90 539 133 37 47"
                      value={siteSettings['club_phone'] || '+90 539 133 37 47'}
                      onChange={(e) => handleSaveSetting('club_phone', e.target.value)}
                      className="w-full bg-[#0d122b] border border-white/10 rounded-lg px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-[#10B981] font-mono font-bold"
                    />
                  </div>
                  
                  <div>
                    <label className="text-xs text-gray-400 block mb-1.5 font-bold">{L(language, { fa: 'ساعت‌های عملیاتی', en: 'Operational Working Hours', ru: 'Часы работы', tr: 'Çalışma Saatleri' })}</label>
                    <input 
                      type="text" 
                      placeholder={L(language, { fa: '۲۴ ساعته شبانه‌روز (۷ روز هفته)', en: '24/7 (7 days a week)', ru: 'Круглосуточно (7 дней в неделю)', tr: '7/24 (haftanın 7 günü)' })}
                      value={siteSettings['club_hours'] || (L(language, { fa: '۲۴ ساعته شبانه‌روز (۷ روز هفته)', en: 'Open 24/7 (Non-stop)', ru: 'Круглосуточно (7 дней в неделю)', tr: '7/24 Açık (Kesintisiz)' }))}
                      onChange={(e) => handleSaveSetting('club_hours', e.target.value)}
                      className="w-full bg-[#0d122b] border border-white/10 rounded-lg px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-[#10B981] font-bold"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="text-xs text-gray-400 block mb-1.5 font-bold">{L(language, { fa: 'آدرس فیزیکی کلوپ', en: 'Lounge Physical Address', ru: 'Физический адрес клуба', tr: 'Kulübün Fiziksel Adresi' })}</label>
                    <input 
                      type="text" 
                      placeholder="Derviş İzzigil Sokak No.12, İskele — Vista Mare Ana Lobi, dükkan No.5"
                      value={siteSettings['club_address'] || (L(language, { fa: 'درویش ایزیگیل سوکاک، شماره ۱۲، اسکله (İskele) — لابی اصلی Vista Mare، مغازه شماره ۵', en: 'Derviş İzzigil Sokak No.12, İskele — Vista Mare Main Lobby, Shop No.5', ru: 'Derviş İzzigil Sokak No.12, Искеле — главное лобби Vista Mare, магазин №5', tr: 'Derviş İzzigil Sokak No.12, İskele adresinde kain Vista Mare Ana Lobi dükkan No.5 olarak tasniflendirilmiş dükkan' }))}
                      onChange={(e) => handleSaveSetting('club_address', e.target.value)}
                      className="w-full bg-[#0d122b] border border-white/10 rounded-lg px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-[#10B981] font-bold"
                    />
                  </div>

                  <div>
                    <label className="text-xs text-gray-400 block mb-1.5 font-bold">{L(language, { fa: 'لینک Google Maps', en: 'Google Maps link', ru: 'Ссылка Google Maps', tr: 'Google Maps bağlantısı' })}</label>
                    <input type="url" dir="ltr" placeholder="https://maps.app.goo.gl/rUohkLWxSmpBTjsKA"
                      value={siteSettings['club_map_url'] || 'https://maps.app.goo.gl/rUohkLWxSmpBTjsKA'}
                      onChange={(e) => handleSaveSetting('club_map_url', e.target.value)}
                      className="w-full bg-[#0d122b] border border-white/10 rounded-lg px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-[#10B981] font-mono" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-gray-400 block mb-1.5 font-bold">{L(language, { fa: 'عرض جغرافیایی نقشه (Lat)', en: 'Map latitude', ru: 'Широта', tr: 'Enlem (Lat)' })}</label>
                      <input type="text" dir="ltr" placeholder="35.2628" value={siteSettings['club_map_lat'] || '35.2628'} onChange={(e) => handleSaveSetting('club_map_lat', e.target.value)}
                        className="w-full bg-[#0d122b] border border-white/10 rounded-lg px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-[#10B981] font-mono" />
                    </div>
                    <div>
                      <label className="text-xs text-gray-400 block mb-1.5 font-bold">{L(language, { fa: 'طول جغرافیایی نقشه (Lng)', en: 'Map longitude', ru: 'Долгота', tr: 'Boylam (Lng)' })}</label>
                      <input type="text" dir="ltr" placeholder="33.9084" value={siteSettings['club_map_lng'] || '33.9084'} onChange={(e) => handleSaveSetting('club_map_lng', e.target.value)}
                        className="w-full bg-[#0d122b] border border-white/10 rounded-lg px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-[#10B981] font-mono" />
                    </div>
                  </div>
                </div>
              </div>

              {/* SECTION 4b: LEGAL / COMPANY / PAYMENTS (feeds the theme-independent pages) */}
              <LegalAdminSection siteSettings={siteSettings} saveSetting={handleSaveSetting} addNotification={addNotification} />

              {/* SECTION 5: FACTORY RESET & DATABASE PURGE */}
              <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-6 space-y-6">
                <div className="space-y-1">
                  <h3 className="text-sm font-black text-red-400 flex items-center gap-2">
                    <span>⚠️</span>
                    <span>{L(language, { fa: 'مدیریت و کنترل داده‌های پایگاه داده (دیتابیس)', en: 'Database Data Control & Administration', ru: 'Управление данными базы данных', tr: 'Veritabanı Verilerini Yönet ve Kontrol Et' })}</span>
                  </h3>
                  <p className="text-[10px] text-gray-400 leading-relaxed font-semibold">
                    {L(language, { fa: 'در این بخش می‌توانید اطلاعات نمونه سایت را پاک‌سازی کرده یا کل کلوپ را به تنظیمات و داده‌های نمونه پیش‌فرض ریست کنید.', en: 'Reset the lounge database to default factory sample data or completely purge all data to start with a blank canvas.', ru: 'Здесь можно очистить образцы данных или вернуть клуб к заводским настройкам и образцам.', tr: 'Bu bölümden sitenin örnek verilerini temizleyebilir veya kulübü varsayılan ayarlara ve örnek verilere sıfırlayabilirsiniz.' })}
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-4">
                  {/* Reseed Option */}
                  <div className="flex-1 bg-black/30 p-4 rounded-xl border border-white/5 flex flex-col justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-white mb-1">
                        {L(language, { fa: '۱. بازنشانی و نصب مجدد اطلاعات نمونه', en: '1. Reset & Seed Sample Data', ru: '1. Сброс и переустановка образцов', tr: '1. Örnek Verileri Sıfırla ve Yeniden Yükle' })}
                      </h4>
                      <p className="text-[10px] text-gray-400 mb-4 leading-normal">
                        {L(language, { fa: 'تنظیمات، کدهای تخفیف، تورنمنت‌ها و محصولات پیش‌فرض اولیه کلوپ مجدداً نصب خواهند شد.', en: 'Restore original pre-populated tournament tables, products, blog items, and settings.', ru: 'Настройки, промокоды, турниры и товары по умолчанию будут установлены заново.', tr: 'Kulübün varsayılan ayarları, indirim kodları, turnuvaları ve ürünleri yeniden yüklenecek.' })}
                      </p>
                    </div>
                    <button
                      onClick={handleResetDatabase}
                      disabled={isResettingDb}
                      className="w-full px-4 py-2.5 bg-red-600/20 hover:bg-red-600 text-red-200 hover:text-white border border-red-500/30 text-xs font-black rounded-lg transition-all flex items-center justify-center gap-2 cursor-pointer uppercase"
                    >
                      {isResettingDb ? (
                        <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                      ) : (
                        <RefreshCw className="w-3.5 h-3.5" />
                      )}
                      <span>{L(language, { fa: 'حذف و بازنشانی به داده نمونه', en: 'Reset & Reseed DB', ru: 'Удалить и сбросить к образцам', tr: 'Sil ve Örnek Veriye Sıfırla' })}</span>
                    </button>
                  </div>

                  {/* Clean Slate Purge Option */}
                  <div className="flex-1 bg-black/30 p-4 rounded-xl border border-white/5 flex flex-col justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-white mb-1">
                        {L(language, { fa: '۲. پاک‌سازی کامل تمام اطلاعات نمونه و تصاویر (شروع از صفر)', en: '2. Complete Database Purge (Blank Slate)', ru: '2. Полная очистка всех образцов и изображений (с нуля)', tr: '2. Tüm Örnek Verileri ve Görselleri Tamamen Temizle (Sıfırdan Başla)' })}
                      </h4>
                      <p className="text-[10px] text-gray-400 mb-4 leading-normal">
                        {L(language, { fa: 'تمامی بازی‌ها، اخبار، محصولات، رزروها، اسلایدرها و عکس‌ها کاملاً حذف شده و دیتابیس کاملاً سفید می‌شود.', en: 'Permanently wipe all records, sliders, custom posts, and images. Starts with a clean empty database.', ru: 'Все игры, новости, товары, брони, слайды и изображения будут удалены; база станет полностью пустой.', tr: 'Tüm oyunlar, haberler, ürünler, rezervasyonlar, slaytlar ve görseller tamamen silinir; veritabanı bembeyaz olur.' })}
                      </p>
                    </div>
                    <button
                      onClick={handlePurgeDatabase}
                      disabled={isResettingDb}
                      className="w-full px-4 py-2.5 bg-red-700 hover:bg-red-800 text-white text-xs font-black rounded-lg border border-red-600 shadow-[0_0_15px_rgba(239,68,68,0.15)] transition-all flex items-center justify-center gap-2 cursor-pointer uppercase"
                    >
                      {isResettingDb ? (
                        <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                      ) : (
                        <Trash2 className="w-3.5 h-3.5" />
                      )}
                      <span>{L(language, { fa: 'پاک‌سازی کل اطلاعات دیتابیس', en: 'Completely Purge DB', ru: 'Полностью очистить БД', tr: 'Tüm Veritabanını Temizle' })}</span>
                    </button>
                  </div>
                </div>
              </div>

            </div>
          )}

          {activeSubTab === 'dbLogs' && (
            <div className="animate-fade-in space-y-6">
              <div className="bg-dark-card border border-white/10 rounded-2xl p-6">
                <div className="flex justify-between items-center mb-6 border-b border-white/5 pb-4">
                  <div>
                    <h3 className="text-lg font-black text-white flex items-center gap-2 font-display uppercase tracking-wider">
                      <Database className="w-5 h-5 text-emerald-500 animate-pulse" />
                      <span>{L(language, { fa: 'لاگ موتور دیتابیس فعال', en: 'Active Database Provider Logs', ru: 'Логи активного движка БД', tr: 'Aktif Veritabanı Motoru Günlükleri' })}</span>
                    </h3>
                    <p className="text-xs text-gray-400 mt-1">
                      {L(language, { fa: 'مشاهده لاگ درخواست‌ها، دستورات SQL یا فرامین NoSQL (MongoDB) و مدت زمان اجرای آن‌ها', en: 'Review native SQL / NoSQL operations executed by the current BaseDataProvider.', ru: 'Просмотр запросов, SQL-команд или NoSQL-операций (MongoDB) и времени их выполнения', tr: 'İstek günlüklerini, SQL komutlarını veya NoSQL (MongoDB) işlemlerini ve çalışma sürelerini görüntüleyin' })}
                    </p>
                  </div>
                  <button
                    onClick={async () => {
                      try {
                        const r = await fetch('/api/admin/db-logs').then(res => res.json());
                        if (r.logs) setDbLogsList(r.logs);
                        addNotification(L(language, { fa: 'لاگ‌ها بروزرسانی شدند', en: 'Logs updated', ru: 'Логи обновлены', tr: 'Günlükler güncellendi' }), 'success');
                      } catch (e) {}
                    }}
                    className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-black text-xs font-black rounded-lg transition-all flex items-center gap-1.5 cursor-pointer font-display"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>{L(language, { fa: 'بروزرسانی لاگ‌ها', en: 'Refresh Logs', ru: 'Обновить логи', tr: 'Günlükleri Yenile' })}</span>
                  </button>
                </div>

                {/* DB Logs list */}
                <div className="bg-black/80 border border-white/5 rounded-xl p-4 font-mono text-xs max-h-[500px] overflow-y-auto scrollbar-thin space-y-2 text-left" dir="ltr">
                  {dbLogsList.length === 0 ? (
                    <div className="text-center py-12 text-gray-500 font-bold uppercase tracking-wider">
                      {L(language, { fa: 'هیچ لاگی در سیستم ثبت نشده است.', en: 'No database queries logged yet.', ru: 'Логи в системе отсутствуют.', tr: 'Sistemde kayıtlı günlük yok.' })}
                    </div>
                  ) : (
                    dbLogsList.map((log: any, idx: number) => {
                      // سرور این لاگ‌ها را با فیلدهای { provider, type, command, timestamp }
                      // می‌فرستد (server/dataProviders.ts → logDbQuery). این کامپوننت قبلاً
                      // دنبال log.operation و log.query می‌گشت که هرگز وجود نداشتند، برای همین
                      // ردیف‌ها بدون متن SQL و بدون برچسب نوع عملیات رندر می‌شدند.
                      // هر دو شکل پشتیبانی می‌شود تا اگر جای دیگری نام قدیمی را بفرستد نشکند.
                      const operation = log.type ?? log.operation ?? '—';
                      const command = log.command ?? log.query ?? '';
                      return (
                      <div key={log.id ?? idx} className="p-2.5 bg-white/5 border-l-2 border-emerald-500 rounded-r-lg space-y-1.5 hover:bg-white/10 transition-all">
                        <div className="flex justify-between items-center text-[10px]">
                          <div className="flex items-center gap-2">
                            <span className="px-1.5 py-0.5 bg-emerald-950 text-emerald-400 rounded border border-emerald-900 font-bold">
                              {log.provider}
                            </span>
                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-black uppercase ${
                              operation === 'INSERT' || operation === 'UPDATE' || operation === 'SQL' ? 'bg-amber-950 text-amber-400' :
                              operation === 'SELECT' ? 'bg-blue-950 text-blue-400' : 'bg-purple-950 text-purple-400'
                            }`}>
                              {operation}
                            </span>
                          </div>
                          <span className="text-gray-500 font-mono">{log.timestamp}</span>
                        </div>
                        <p className="text-gray-300 font-mono text-xs leading-relaxed break-words">{command}</p>
                        {log.params && log.params.length > 0 && (
                          <div className="text-[10px] text-gray-500 font-mono bg-black/40 p-1 rounded">
                            Parameters: <span className="text-gray-400">{JSON.stringify(log.params)}</span>
                          </div>
                        )}
                      </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          )}

          {activeSubTab === 'apiKeys' && (
            <div className="animate-fade-in space-y-6">
              <div className="bg-dark-card border border-emerald-500/20 rounded-2xl p-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-5 border-b border-white/5 pb-4">
                  <div>
                    <h3 className="text-lg font-black text-white flex items-center gap-2 font-display">
                      <Globe className="w-5 h-5 text-emerald-400" />
                      <span>{L(language, { fa: 'اتصال Web Sync دسکتاپ', en: 'Desktop Web Sync connection', ru: 'Подключение Web Sync десктопа', tr: 'Masaüstü Web Sync Bağlantısı' })}</span>
                      <span className={`text-[10px] px-2 py-1 rounded-full ${isSyncKeyConfigured ? 'bg-emerald-500/15 text-emerald-300' : 'bg-amber-500/15 text-amber-300'}`}>
                        {isSyncKeyConfigured ? (L(language, { fa: 'فعال', en: 'Configured', ru: 'Настроено', tr: 'Etkin' })) : (L(language, { fa: 'تنظیم نشده', en: 'Not configured', ru: 'Не настроено', tr: 'Ayarlanmadı' }))}
                      </span>
                    </h3>
                    <p className="text-xs text-gray-400 mt-1 max-w-3xl leading-relaxed">
                      {L(language, { fa: 'این کلید برای اتصال امن برنامه دسکتاپ به سایت استفاده می‌شود؛ مقدار واقعی فقط بعد از ذخیره/تولید نمایش داده می‌شود.', en: 'This secret authenticates the desktop app to the website; the full value is shown only after save or generation.', ru: 'Этот ключ используется для безопасного подключения десктоп-приложения к сайту; полное значение показывается только после сохранения/генерации.', tr: 'Bu anahtar masaüstü uygulamasının siteye güvenli bağlanması için kullanılır; gerçek değer yalnızca kaydettikten/oluşturduktan sonra gösterilir.' })}
                    </p>
                  </div>
                  <button onClick={() => void saveSyncApiKey(true)} disabled={isSavingSyncKey} className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-zinc-950 font-black text-xs rounded-xl flex items-center gap-2">
                    <Sparkles className="w-4 h-4" />
                    {L(language, { fa: 'تولید کلید جدید', en: 'Generate new key', ru: 'Сгенерировать новый ключ', tr: 'Yeni Anahtar Oluştur' })}
                  </button>
                </div>
                <div className="flex flex-col md:flex-row gap-3">
                  <input type="password" value={syncApiKey} onChange={(e) => setSyncApiKey(e.target.value)} placeholder={isSyncKeyConfigured ? L(language, { fa: `کلید فعلی: ${syncApiKeyMasked} — برای تغییر مقدار جدید وارد کنید`, en: `Current key: ${syncApiKeyMasked} — enter a new value to change`, ru: `Текущий ключ: ${syncApiKeyMasked} — введите новое значение для замены`, tr: `Mevcut anahtar: ${syncApiKeyMasked} — değiştirmek için yeni değer girin` }) : L(language, { fa: 'یک کلید حداقل ۱۶ کاراکتری وارد کنید', en: 'Enter a key of at least 16 characters', ru: 'Введите ключ не короче 16 символов', tr: 'En az 16 karakterlik bir anahtar girin' })} className="flex-1 bg-[#0d1224] border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white font-mono dir-ltr text-left" />
                  <button onClick={() => void saveSyncApiKey(false)} disabled={isSavingSyncKey || syncApiKey.trim().length < 16} className="px-4 py-2.5 bg-blue-500 hover:bg-blue-400 disabled:opacity-40 text-black font-black text-xs rounded-xl">
                    {L(language, { fa: 'ذخیره کلید', en: 'Save key', ru: 'Сохранить ключ', tr: 'Anahtarı Kaydet' })}
                  </button>
                  <button onClick={() => void copySyncApiKey()} disabled={!syncApiKey} className="px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 text-white font-bold text-xs rounded-xl flex items-center gap-2">
                    <ClipboardCopy className="w-4 h-4" /> {L(language, { fa: 'کپی', en: 'Copy', ru: 'Копировать', tr: 'Kopyala' })}
                  </button>
                </div>
                <p className="text-[10px] text-gray-500 mt-3" dir={language === 'fa' ? 'rtl' : 'ltr'}>{L(language, { fa: 'آدرس اتصال در برنامه دسکتاپ:', en: 'Connection address in the desktop app:', ru: 'Адрес подключения в десктоп-приложении:', tr: 'Masaüstü uygulamasındaki bağlantı adresi:' })} <span className="font-mono text-emerald-300" dir="ltr">https://bazino.pro</span> — {L(language, { fa: 'سپس همین کلید را در Web Sync وارد کنید.', en: 'then enter this same key in Web Sync.', ru: 'затем введите этот же ключ в Web Sync.', tr: 'ardından aynı anahtarı Web Sync bölümüne girin.' })}</p>
              </div>

              <div className="bg-dark-card border border-white/10 rounded-2xl p-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 border-b border-white/5 pb-4">
                  <div>
                    <h3 className="text-lg font-black text-white flex items-center gap-2 font-display uppercase tracking-wider">
                      <Key className="w-5 h-5 text-blue-500 animate-pulse" />
                      <span>{L(language, { fa: 'مدل‌های هوش مصنوعی جارویس', en: 'Jarvis AI Model Failover', ru: 'ИИ-модели Jarvis', tr: 'Jarvis Yapay Zekâ Modelleri' })}</span>
                    </h3>
                    <p className="text-xs text-gray-400 mt-1 leading-relaxed max-w-3xl">
                      {L(language, { fa: 'تا ۳ مدل را همراه با API Key تعریف کنید. جارویس اول فرمان‌های واضح اپ را بدون هزینه و با Rule Router اجرا می‌کند؛ فقط مکالمه‌های مبهم/آزاد به این مدل‌ها می‌روند و در صورت خطای مدل اول، خودکار مدل بعدی امتحان می‌شود.', en: 'Configure up to 3 models with API keys. Jarvis routes clear app commands for free via rules first; only ambiguous/free chat goes to these models, with automatic failover to the next enabled provider.', ru: 'Настройте до 3 моделей с API-ключами. Сначала Jarvis бесплатно выполняет понятные команды через Rule Router; только для сложных запросов обращается к моделям по порядку.', tr: 'API anahtarıyla birlikte en fazla 3 model tanımlayın. Jarvis önce net uygulama komutlarını ücretsiz Rule Router ile çalıştırır; yalnızca karmaşık isteklerde modellere sırayla başvurur.' })}
                    </p>
                  </div>
                  <button
                    onClick={saveJarvisProviders}
                    disabled={isSavingJarvisProviders}
                    className="px-4 py-2.5 bg-blue-500 hover:bg-blue-400 disabled:opacity-50 text-black font-black text-xs rounded-xl flex items-center gap-2"
                  >
                    <Save className="w-4 h-4" />
                    <span>{isSavingJarvisProviders ? (L(language, { fa: 'در حال ذخیره...', en: 'Saving...', ru: 'Сохранение...', tr: 'Kaydediliyor...' })) : (L(language, { fa: 'ذخیره مدل‌ها', en: 'Save providers', ru: 'Сохранить модели', tr: 'Modelleri Kaydet' }))}</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
                  {jarvisAiProviders.slice(0, 3).map((provider, index) => (
                    <div key={provider.id || index} className="bg-black/40 border border-blue-500/20 rounded-2xl p-5 space-y-4">
                      <div className="flex items-center justify-between gap-3">
                        <h4 className="text-sm font-black text-white flex items-center gap-2">
                          <span className="w-6 h-6 rounded-lg bg-blue-500/20 text-blue-300 flex items-center justify-center text-[10px]">{index + 1}</span>
                          {L(language, { fa: 'مدل جایگزین', en: 'Fallback model', ru: 'Резервная модель', tr: 'Yedek Model' })}
                        </h4>
                        <label className="flex items-center gap-2 text-[11px] text-gray-300">
                          <input type="checkbox" checked={provider.enabled !== false} onChange={(e) => updateJarvisProvider(index, { enabled: e.target.checked })} />
                          {L(language, { fa: 'فعال', en: 'Enabled', ru: 'Включена', tr: 'Etkin' })}
                        </label>
                      </div>

                      <div>
                        <label className="block text-[11px] text-gray-400 mb-1">Provider</label>
                        <select
                          value={provider.provider || 'groq'}
                          onChange={(e) => {
                            const defaults: Record<string, string> = {
                              groq: 'llama-3.1-8b-instant',
                              openrouter: 'meta-llama/llama-3.1-8b-instruct:free',
                              gemini: 'gemini-3.6-flash',
                              ollama: 'qwen2.5:3b',
                              custom: provider.model || ''
                            };
                            updateJarvisProvider(index, { provider: e.target.value, model: defaults[e.target.value] || provider.model });
                          }}
                          className="w-full bg-[#0d1224] border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white"
                        >
                          <option value="groq">Groq</option>
                          <option value="openrouter">OpenRouter</option>
                          <option value="gemini">Gemini</option>
                          <option value="ollama">Ollama</option>
                          <option value="custom">OpenAI-compatible Custom</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[11px] text-gray-400 mb-1">Label</label>
                        <input value={provider.label || ''} onChange={(e) => updateJarvisProvider(index, { label: e.target.value })} className="w-full bg-[#0d1224] border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white" placeholder="Groq primary" />
                      </div>

                      <div>
                        <label className="block text-[11px] text-gray-400 mb-1">Model</label>
                        <input value={provider.model || ''} onChange={(e) => updateJarvisProvider(index, { model: e.target.value })} className="w-full bg-[#0d1224] border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white font-mono" placeholder="llama-3.1-8b-instant" />
                      </div>

                      {(provider.provider === 'custom' || provider.provider === 'ollama') && (
                        <div>
                          <label className="block text-[11px] text-gray-400 mb-1">Base URL</label>
                          <input value={provider.baseUrl || ''} onChange={(e) => updateJarvisProvider(index, { baseUrl: e.target.value })} className="w-full bg-[#0d1224] border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white font-mono" placeholder={provider.provider === 'ollama' ? 'http://127.0.0.1:11434' : 'https://api.example.com/openai/v1'} />
                        </div>
                      )}

                      {provider.provider !== 'ollama' && (
                        <div>
                          <label className="block text-[11px] text-gray-400 mb-1">API Key</label>
                          <input type="password" value={provider.apiKey || ''} onChange={(e) => updateJarvisProvider(index, { apiKey: e.target.value })} className="w-full bg-[#0d1224] border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white font-mono" placeholder="Paste API key or leave ******** unchanged" />
                          {provider.apiKey === '********' && <p className="mt-1 text-[10px] text-emerald-400">{L(language, { fa: 'کلید قبلی محفوظ است؛ فقط برای تغییر، مقدار جدید وارد کنید.', en: 'Existing key is preserved; enter a new value only to replace it.', ru: 'Прежний ключ сохранён; введите новое значение только для замены.', tr: 'Önceki anahtar korunur; yalnızca değiştirmek için yeni değer girin.' })}</p>}
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                <div className="mt-5 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-xs text-emerald-100 leading-relaxed">
                  {L(language, { fa: 'پیشنهاد: مدل اول Groq با llama-3.1-8b-instant برای سرعت و هزینه کم، مدل دوم OpenRouter free، مدل سوم Gemini یا Ollama محلی. API Key ها فقط در سمت سرور ذخیره و استفاده می‌شوند و از /api/settings عمومی حذف شده‌اند.', en: 'Recommended order: Groq llama-3.1-8b-instant first for speed/cost, OpenRouter free second, Gemini or local Ollama third. Keys are stored and used server-side only and are excluded from public /api/settings.', ru: 'Рекомендация: первая модель Groq llama-3.1-8b-instant (скорость и цена), вторая OpenRouter free, третья Gemini или локальная модель.', tr: 'Öneri: birinci model hız ve düşük maliyet için Groq llama-3.1-8b-instant, ikinci OpenRouter free, üçüncü Gemini veya yerel model.' })}
                </div>
              </div>
            </div>
          )}

          {activeSubTab === 'presentation' && (
            <React.Suspense fallback={<div className="p-8 text-center text-primary text-xs font-bold animate-pulse">Loading Presentation...</div>}>
              <PresentationTab addNotification={addNotification} />
            </React.Suspense>
          )}

        </div>
      </div>

      {/* Visual Onboarding/Tutorial Help System */}
      <VisualHelpGuide 
        isOpen={isLocalHelpOpen} 
        onClose={() => setIsLocalHelpOpen(false)} 
        mode="admin" 
        initialSection={activeSubTab} 
        language={language} 
        dir={dir} 
      />
    </div>
  );
}
