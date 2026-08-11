import React, { useState, useEffect } from 'react';
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
  HelpCircle,
  MessageSquare
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import ThemeScreenshot from './ThemeScreenshot';
import VisualHelpGuide from './VisualHelpGuide';
import type { ThemeInfo } from '../themes';
import {
  parseThemeZip,
  buildSampleThemeZip,
  buildThemeZip,
  downloadZip,
  type ParsedZipTheme
} from '../themes/zip';

interface Props {
  themeId?: string;
  setThemeId?: (id: string) => void;
  availableThemes?: ThemeInfo[];
  setAvailableThemes?: React.Dispatch<React.SetStateAction<ThemeInfo[]>>;
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
  layoutMode = 'classic',
  setLayoutMode
}: Props) {
  const { language, dir } = useLanguage();
  const [activeSubTab, setActiveSubTab] = useState<'dashboard' | 'systems' | 'cafe' | 'shop' | 'tournaments' | 'blog' | 'chat' | 'migrations' | 'messages' | 'themes' | 'appSlider' | 'customization' | 'dbLogs' | 'apiKeys'>('dashboard');
  const [isLocalHelpOpen, setIsLocalHelpOpen] = useState(false);
  
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
  const [newCafe, setNewCafe] = useState({ name: '', category: 'Foods', price: 50000, imageUrl: '', inventory: 20, isAvailable: true });
  const [newAccessory, setNewAccessory] = useState({ name: '', description: '', price: 1000000, imageUrl: '', stock: 5, category: 'Keyboard' });
  const [newTournament, setNewTournament] = useState({ title: '', game: '', registrationFee: 100000, startDate: '۱۴۰۵/۰۵/۰۱', maxTeams: 8 });
  const [newArticle, setNewArticle] = useState({ title: '', content: '', category: 'News', imageUrl: '' });

  // Slider form states
  const [newSlideUrl, setNewSlideUrl] = useState('');
  const [newSlideTarget, setNewSlideTarget] = useState('reserve');
  const [newSlideTitleFa, setNewSlideTitleFa] = useState('');
  const [newSlideTitleEn, setNewSlideTitleEn] = useState('');
  const [newSlideTitleRu, setNewSlideTitleRu] = useState('');
  const [newSlideTitleTr, setNewSlideTitleTr] = useState('');
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
        fetch('/api/csharp/migrations').then(r => r.json()),
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
      addNotification('خطا در برقراری ارتباط با سرور دات‌نت/اکسپرس', 'error');
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
          { id: '1', name: 'اینستاگرام', platform: 'instagram', url: 'https://instagram.com/bazino' },
          { id: '2', name: 'تلگرام', platform: 'telegram', url: 'https://t.me/bazino' },
          { id: '3', name: 'یوتیوب', platform: 'youtube', url: 'https://youtube.com/bazino' }
        ]);
      }
    } catch (e) {
      console.error('Failed to parse social_media_links:', e);
    }
  }, [siteSettings]);

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
        addNotification(language === 'fa' ? 'تنظیمات با موفقیت ذخیره شد' : 'Setting saved successfully', 'success');
        return true;
      } else {
        addNotification(language === 'fa' ? 'خطا در ذخیره تنظیمات' : 'Error saving setting', 'error');
        return false;
      }
    } catch (err) {
      console.error(err);
      addNotification(language === 'fa' ? 'خطا در ذخیره تنظیمات' : 'Error saving setting', 'error');
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

      addNotification(language === 'fa' ? `تنظیمات بخش با موفقیت بروزرسانی شد` : `Section settings updated successfully`, 'success');
    } catch (err) {
      console.error(err);
      addNotification(language === 'fa' ? 'خطا در ذخیره تنظیمات بخش' : 'Failed to save section settings', 'error');
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
      addNotification(language === 'fa' ? 'لینک اجتماعی با موفقیت ویرایش شد' : 'Social link updated successfully', 'success');
    }
  };

  const startEditSocial = (item: any) => {
    setEditingSocialId(item.id);
    setNewSocialName(item.name);
    setNewSocialPlatform(item.platform);
    setNewSocialUrl(item.url);
    addNotification(language === 'fa' ? 'پیوند اجتماعی جهت ویرایش بارگذاری شد' : 'Social link loaded for editing', 'info');
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
    if (!window.confirm(language === 'fa' ? '⚠️ هشدار جدی! آیا واقعاً می‌خواهید کل پایگاه داده را ریست کرده و اطلاعات نمونه اولیه را مجدداً نصب کنید؟ تمامی تغییرات، محصولات کافه، تجهیزات، رزروها و تنظیمات شما حذف خواهند شد.' : '⚠️ Warning! Are you sure you want to completely reset and reseed the database? All custom database rows and settings will be wiped.')) {
      return;
    }
    
    try {
      setIsResettingDb(true);
      const res = await fetch('/api/admin/reset-database', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        addNotification(language === 'fa' ? 'پایگاه داده با موفقیت ریست شد و اطلاعات نمونه اولیه نصب گردید.' : 'Database reset successfully.', 'success');
        await fetchData();
      } else {
        addNotification(language === 'fa' ? 'خطا در ریست دیتابیس' : 'Failed to reset database', 'error');
      }
    } catch (e) {
      console.error(e);
      addNotification(language === 'fa' ? 'خطا در برقراری ارتباط با سرور' : 'Connection error', 'error');
    } finally {
      setIsResettingDb(false);
    }
  };

  const handlePurgeDatabase = async () => {
    if (!window.confirm(language === 'fa' 
      ? '⚠️ هشدار بسیار جدی! آیا واقعاً می‌خواهید تمامی اطلاعات نمونه (از جمله بازی‌ها، غذاها، تجهیزات، رزروها، اسلایدرها و مقالات) را کاملاً پاک کنید؟ دیتابیس به حالت کاملاً خام و خالی باز خواهد گشت. حساب‌های کاربری مدیر و روت جهت دسترسی شما حفظ خواهند شد.' 
      : '⚠️ Critical Warning! Are you sure you want to permanently delete all sample database rows (tournaments, products, custom sliders, reservations, articles)? The database will be returned to a completely blank, empty state. Only admin and root accounts will be kept to ensure you don\'t lose access.')) {
      return;
    }
    
    try {
      setIsResettingDb(true);
      const res = await fetch('/api/admin/clear-database', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        addNotification(language === 'fa' ? 'تمامی اطلاعات نمونه و تصاویر با موفقیت حذف شدند و دیتابیس کاملاً پاک‌سازی شد.' : 'All sample info and sliders have been completely purged.', 'success');
        await fetchData();
      } else {
        addNotification(language === 'fa' ? 'خطا در پاک‌سازی دیتابیس' : 'Failed to purge database', 'error');
      }
    } catch (e) {
      console.error(e);
      addNotification(language === 'fa' ? 'خطا در برقراری ارتباط با سرور' : 'Connection error', 'error');
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
        language === 'fa' ? 'لطفاً ابتدا متنی را به یکی از دو زبان فارسی یا انگلیسی بنویسید' : 'Please enter text in Persian or English first', 
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
          language === 'fa' 
            ? 'ترجمه و تولید خودکار سایر زبان‌ها با موفقیت انجام شد!' 
            : 'Translations generated successfully!', 
          'success'
        );
      } else {
        addNotification(language === 'fa' ? 'خطا در برقراری ارتباط با سرویس ترجمه' : 'Translation service error', 'error');
      }
    } catch (err) {
      console.error(err);
      addNotification(language === 'fa' ? 'خطا در ارتباط با سرور' : 'Connection error', 'error');
    } finally {
      setIsTranslating(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!msgTitle || !msgBody) {
      addNotification(language === 'fa' ? 'لطفاً موضوع و متن پیام را وارد کنید' : 'Please fill in title and body', 'error');
      return;
    }

    try {
      const res = await fetch('/api/admin/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipient, title: msgTitle, body: msgBody, sendAsNotification })
      });
      if (res.ok) {
        addNotification(language === 'fa' ? 'پیام شما با موفقیت ارسال شد' : 'Message sent successfully', 'success');
        setMsgTitle('');
        setMsgBody('');
        setSendAsNotification(false);
        fetchData();
      } else {
        addNotification('خطا در ارسال پیام', 'error');
      }
    } catch (err) {
      addNotification('خطا در ارسال پیام', 'error');
    }
  };

  const handleAddSlide = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSlideUrl || !newSlideTarget) {
      addNotification(language === 'fa' ? 'لطفاً آدرس تصویر و بخش هدف را وارد کنید' : 'Please fill in image URL and target section', 'error');
      return;
    }
    try {
      const res = await fetch('/api/admin/app-sliders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageUrl: newSlideUrl,
          target: newSlideTarget,
          titleFa: newSlideTitleFa,
          titleEn: newSlideTitleEn,
          titleRu: newSlideTitleRu,
          titleTr: newSlideTitleTr,
        }),
      }).then(r => r.json());

      if (res.success) {
        setAppSliders(res.appSliders);
        addNotification(language === 'fa' ? 'اسلاید جدید با موفقیت اضافه شد' : 'New slide added successfully', 'success');
        setNewSlideUrl('');
        setNewSlideTitleFa('');
        setNewSlideTitleEn('');
        setNewSlideTitleRu('');
        setNewSlideTitleTr('');
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
        addNotification(language === 'fa' ? 'اسلاید حذف شد' : 'Slide deleted successfully', 'success');
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
      addNotification(language === 'fa' ? 'لطفاً آدرس تصویر و بخش هدف را وارد کنید' : 'Please fill in image URL and target section', 'error');
      return;
    }
    try {
      const res = await fetch(`/api/admin/app-sliders/${editingSlideId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageUrl: newSlideUrl,
          target: newSlideTarget,
          titleFa: newSlideTitleFa,
          titleEn: newSlideTitleEn,
          titleRu: newSlideTitleRu,
          titleTr: newSlideTitleTr,
        }),
      }).then(r => r.json());

      if (res.success) {
        setAppSliders(res.appSliders);
        addNotification(language === 'fa' ? 'اسلاید با موفقیت ویرایش شد' : 'Slide updated successfully', 'success');
        setEditingSlideId(null);
        setNewSlideUrl('');
        setNewSlideTitleFa('');
        setNewSlideTitleEn('');
        setNewSlideTitleRu('');
        setNewSlideTitleTr('');
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
    setNewSlideTarget(slide.target);
    setNewSlideTitleFa(slide.titleFa || '');
    setNewSlideTitleEn(slide.titleEn || '');
    setNewSlideTitleRu(slide.titleRu || '');
    setNewSlideTitleTr(slide.titleTr || '');
    addNotification(language === 'fa' ? 'اطلاعات اسلاید جهت ویرایش بارگذاری شد' : 'Slide info loaded for editing', 'info');
  };

  const cancelEditSlide = () => {
    setEditingSlideId(null);
    setNewSlideUrl('');
    setNewSlideTitleFa('');
    setNewSlideTitleEn('');
    setNewSlideTitleRu('');
    setNewSlideTitleTr('');
    setNewSlideTarget('reserve');
  };

  const handleCreateTheme = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newThemeName.trim()) {
      addNotification(language === 'fa' ? 'لطفا نام قالب را وارد کنید' : 'Please enter theme name', 'error');
      return;
    }
    
    // Build a CSS-safe theme id (persian/non-latin chars are stripped)
    let id = newThemeName.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-_]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
    if (!id) id = 'custom-theme-' + Date.now();
    
    // Check if it already exists
    if (availableThemes.some(t => t.id === id)) {
      addNotification(language === 'fa' ? 'این قالب قبلا ثبت شده است' : 'This theme is already registered', 'error');
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
    
    addNotification(language === 'fa' ? `قالب "${newTheme.name}" با موفقیت نصب شد` : `Theme "${newTheme.name}" successfully installed`, 'success');
    
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
        addNotification(language === 'fa' ? `خطا در خواندن ZIP: ${result.error}` : `ZIP parse error: ${result.error}`, 'error');
        return;
      }

      // بررسی تکراری نبودن شناسه (بین قالب‌های محلی و سروری)
      if (availableThemes.some(t => t.id === result.meta.id)) {
        setZipError(language === 'fa'
          ? `قالبی با شناسه «${result.meta.id}» قبلاً نصب شده است`
          : `A theme with id "${result.meta.id}" is already installed`);
        addNotification(language === 'fa' ? 'قالب تکراری است' : 'Duplicate theme', 'error');
        return;
      }

      const assetCount = Object.keys(result.assets).length;
      setZipParsed(result);
      addNotification(language === 'fa'
        ? `فایل ZIP با موفقیت خوانده شد: «${result.meta.name}» (${(result.css.length / 1024).toFixed(1)}KB CSS${assetCount > 0 ? ` + ${assetCount} فایل assets` : ''})`
        : `ZIP parsed: "${result.meta.name}" (${(result.css.length / 1024).toFixed(1)}KB CSS${assetCount > 0 ? ` + ${assetCount} assets` : ''})`, 'success');
    } catch (err) {
      console.error('[Themes] ZIP parse error:', err);
      setZipError(language === 'fa' ? 'خطا در خواندن فایل ZIP' : 'Failed to read ZIP file');
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
      const res = await fetch(`/api/admin/themes/install?name=${encodeURIComponent(zipParsed.meta.name || zipFileName)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/zip' },
        body: zipFileBytes as unknown as BodyInit,
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setZipError(data.error || 'خطا در نصب قالب');
        addNotification(language === 'fa' ? `خطا در نصب: ${data.error || ''}` : `Install error: ${data.error || ''}`, 'error');
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
      };

      setAvailableThemes(prev => [...prev, serverTheme]);
      addNotification(language === 'fa'
        ? `قالب «${serverTheme.name}» روی سرور نصب و فعال شد${serverTheme.hasAssets ? ` (${serverTheme.assetFiles?.length} فایل assets)` : ''}`
        : `Theme "${serverTheme.name}" installed on server & activated${serverTheme.hasAssets ? ` (${serverTheme.assetFiles?.length} assets)` : ''}`, 'success');

      // فعال‌سازی فوری
      if (setThemeId) setThemeId(serverTheme.id);

      setZipParsed(null);
      setZipFileBytes(null);
      setZipFileName('');
      setZipError('');
      setShowUploadForm(false);
      setUploadMode('zip');
    } catch (err) {
      console.error('[Themes] Install error:', err);
      setZipError(language === 'fa' ? 'خطا در ارتباط با سرور' : 'Server connection error');
    } finally {
      setIsInstallingZip(false);
    }
  };

  /* ---------- دانلود قالب نمونه (فرمت جدید ZIP) ---------- */
  const handleDownloadSampleZip = () => {
    try {
      downloadZip(buildSampleThemeZip(), 'bazino-theme-sample.zip');
      addNotification(language === 'fa'
        ? 'فایل قالب نمونه دانلود شد — ساختار theme.json + theme.css را ببینید'
        : 'Sample theme zip downloaded — see theme.json + theme.css structure', 'success');
    } catch (e) {
      console.error(e);
      addNotification(language === 'fa' ? 'خطا در ساخت فایل نمونه' : 'Failed to build sample zip', 'error');
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
      addNotification(language === 'fa' ? `پکیج ZIP قالب «${theme.name}» دانلود شد` : `Theme "${theme.name}" zip downloaded`, 'success');
    } catch (e) {
      console.error(e);
      addNotification(language === 'fa' ? 'خطا در ساخت فایل ZIP' : 'Failed to build zip', 'error');
    }
  };

  const handleDeleteTheme = async (theme: ThemeInfo) => {
    // قالب‌های سروری: پوشه اختصاصی قالب روی سرور هم حذف می‌شود
    if (theme.kind === 'server') {
      try {
        const res = await fetch(`/api/admin/themes/${encodeURIComponent(theme.id)}`, { method: 'DELETE' });
        const data = await res.json();
        if (!res.ok || !data.success) {
          addNotification(language === 'fa' ? 'خطا در حذف قالب از سرور' : 'Failed to delete theme on server', 'error');
          return;
        }
      } catch (e) {
        console.error(e);
        addNotification(language === 'fa' ? 'خطا در ارتباط با سرور' : 'Server connection error', 'error');
        return;
      }
    }

    if (setAvailableThemes) {
      setAvailableThemes(prev => prev.filter(t => t.id !== theme.id));
    }
    if (themeId === theme.id && setThemeId) {
      setThemeId('dark-gold');
    }
    addNotification(
      language === 'fa'
        ? (theme.kind === 'server' ? `قالب "${theme.name}" و پوشه آن حذف شد` : `قالب "${theme.name}" با موفقیت حذف شد`)
        : (theme.kind === 'server' ? `Theme "${theme.name}" and its folder deleted` : `Theme "${theme.name}" deleted successfully`),
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
          language === 'fa'
            ? (mode === 'sample' ? 'منبع داده به «نمونه» تغییر کرد — سایت و اپ از داده‌های نمونه می‌خوانند' : 'منبع داده به «دیتابیس» تغییر کرد — سایت و اپ از دیتابیس می‌خوانند')
            : (mode === 'sample' ? 'Data source switched to Sample — site & app read from sample data' : 'Data source switched to Database — site & app read from the database'),
          'success'
        );
      } else {
        addNotification(language === 'fa' ? 'خطا در تغییر منبع داده' : 'Failed to switch data source', 'error');
      }
    } catch (e) {
      console.error(e);
      addNotification(language === 'fa' ? 'خطا در ارتباط با سرور' : 'Connection error', 'error');
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
        addNotification(`وضعیت سفارش ${orderId} با موفقیت بروزرسانی شد`, 'success');
        fetchData();
      }
    } catch (e) {
      addNotification('خطا در بروزرسانی وضعیت سفارش', 'error');
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
        addNotification(`وضعیت سفارش فروشگاه ${orderId} با موفقیت بروزرسانی شد`, 'success');
        fetchData();
      }
    } catch (e) {
      addNotification('خطا در بروزرسانی وضعیت سفارش', 'error');
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
        addNotification('وضعیت سیستم با موفقیت تغییر یافت', 'success');
        fetchData();
      }
    } catch (e) {
      addNotification('خطا در بروزرسانی سیستم', 'error');
    }
  };

  const handleDeleteSystem = async (sysId: string) => {
    try {
      const res = await fetch(`/api/admin/systems/${sysId}`, { method: 'DELETE' }).then(r => r.json());
      if (res.success) {
        setSystems(res.systems);
        addNotification(language === 'fa' ? 'سیستم حذف شد' : 'System deleted successfully', 'success');
      } else {
        addNotification(res.error || 'Failed', 'error');
      }
    } catch (e) {
      addNotification('خطا در حذف سیستم', 'error');
    }
  };

  const handleDeleteCafeItem = async (itemId: string) => {
    try {
      const res = await fetch(`/api/admin/cafe/${itemId}`, { method: 'DELETE' }).then(r => r.json());
      if (res.success) {
        setCafeItems(res.cafeItems);
        addNotification(language === 'fa' ? 'آیتم منو حذف شد' : 'Menu item deleted successfully', 'success');
      } else {
        addNotification(res.error || 'Failed', 'error');
      }
    } catch (e) {
      addNotification('خطا در حذف آیتم', 'error');
    }
  };

  const handleDeleteTournament = async (tourId: string) => {
    try {
      const res = await fetch(`/api/admin/tournaments/${tourId}`, { method: 'DELETE' }).then(r => r.json());
      if (res.success) {
        setTournaments(res.tournaments);
        addNotification(language === 'fa' ? 'تورنومنت حذف شد' : 'Tournament deleted successfully', 'success');
      } else {
        addNotification(res.error || 'Failed', 'error');
      }
    } catch (e) {
      addNotification('خطا در حذف تورنومنت', 'error');
    }
  };

  const handleDeleteAccessory = async (accId: string) => {
    try {
      const res = await fetch(`/api/admin/accessories/${accId}`, { method: 'DELETE' }).then(r => r.json());
      if (res.success) {
        setAccessories(res.accessories);
        addNotification(language === 'fa' ? 'کالا از فروشگاه حذف شد' : 'Accessory deleted successfully', 'success');
      } else {
        addNotification(res.error || 'Failed', 'error');
      }
    } catch (e) {
      addNotification('خطا در حذف کالا', 'error');
    }
  };

  const handleDeleteArticle = async (artId: string) => {
    try {
      const res = await fetch(`/api/admin/articles/${artId}`, { method: 'DELETE' }).then(r => r.json());
      if (res.success) {
        setArticles(res.articles);
        addNotification(language === 'fa' ? 'مقاله حذف شد' : 'Article deleted successfully', 'success');
      } else {
        addNotification(res.error || 'Failed', 'error');
      }
    } catch (e) {
      addNotification('خطا در حذف مقاله', 'error');
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
        addNotification(language === 'fa' ? 'اتاق گفتگو ایجاد شد' : 'Chat room created successfully', 'success');
      } else {
        addNotification(res.error || 'Failed', 'error');
      }
    } catch (e) {
      addNotification('خطا در ایجاد اتاق گفتگو', 'error');
    }
  };

  const handleDeleteChatRoom = async (name: string) => {
    try {
      const res = await fetch(`/api/admin/chat-rooms/${encodeURIComponent(name)}`, { method: 'DELETE' }).then(r => r.json());
      if (res.success) {
        setChatRooms(res.chatRooms);
        addNotification(language === 'fa' ? 'اتاق گفتگو حذف شد' : 'Chat room deleted successfully', 'success');
      } else {
        addNotification(res.error || 'Failed', 'error');
      }
    } catch (e) {
      addNotification('خطا در حذف اتاق گفتگو', 'error');
    }
  };

  // Submit new items
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
        addNotification('سیستم گیمینگ جدید با موفقیت به سرور افزوده شد', 'success');
        setNewSystem({ name: '', type: 'PC', hourlyRate: 25000, isActive: true });
        fetchData();
      }
    } catch (e) {
      addNotification('خطا در ثبت سیستم جدید', 'error');
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
        addNotification('آیتم بوفه جدید با موفقیت در دیتابیس ثبت شد', 'success');
        setNewCafe({ name: '', category: 'Foods', price: 50000, imageUrl: '', inventory: 20, isAvailable: true });
        fetchData();
      }
    } catch (e) {
      addNotification('خطا در ثبت کالا', 'error');
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
        addNotification('تجهیزات گیمینگ جدید در انبار دیتابیس ذخیره شد', 'success');
        setNewAccessory({ name: '', description: '', price: 1000000, imageUrl: '', stock: 5, category: 'Keyboard' });
        fetchData();
      }
    } catch (e) {
      addNotification('خطا در ثبت سخت‌افزار جدید', 'error');
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
        addNotification('تورنمنت گیمینگ جدید با موفقیت فعال گردید', 'success');
        setNewTournament({ title: '', game: '', registrationFee: 100000, startDate: '۱۴۰۵/۰۵/۰۱', maxTeams: 8 });
        fetchData();
      }
    } catch (e) {
      addNotification('خطا در ثبت تورنمنت', 'error');
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
        addNotification('مقاله جدید در بخش اخبار بلاگ منتشر شد', 'success');
        setNewArticle({ title: '', content: '', category: 'News', imageUrl: '' });
        fetchData();
      }
    } catch (e) {
      addNotification('خطا در ثبت مقاله خبررسانی', 'error');
    }
  };

  const copyMigrationsToClipboard = () => {
    navigator.clipboard.writeText(migrationsCode);
    addNotification('کد کلاس مهاجرت EF Core با موفقیت کپی شد', 'success');
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
                {language === 'fa' ? 'پنل مدیریت سالن' : 'Gaming Arena Admin'}
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
            <span>{language === 'fa' ? 'داشبورد و آمار زنده' : 'Dashboard & Live Stats'}</span>
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
            <span>{language === 'fa' ? 'مدیریت کلاینت‌ها / سیستم‌ها' : 'Systems & Clients'}</span>
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
            <span>{language === 'fa' ? 'بوفه کافه و سفارشات' : 'Cafe Buffet Orders'}</span>
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
            <span>{language === 'fa' ? 'انبار فروشگاه قطعات' : 'Accessory Storehouse'}</span>
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
            <span>{language === 'fa' ? 'برنامه‌ریزی تورنمنت‌ها' : 'Tournaments Planner'}</span>
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
            <span>{language === 'fa' ? 'انتشار اخبار بلاگ' : 'Blog News Publisher'}</span>
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
            <span>{language === 'fa' ? 'اتاق‌های گفتگوی زنده' : 'Live Chat Rooms'}</span>
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
            <span>{language === 'fa' ? 'ارسال پیام و نوتیفیکیشن' : 'Send Messages / Notifs'}</span>
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
            <span>{language === 'fa' ? 'مهاجرت‌های EF Core' : 'EF Core Migrations'}</span>
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
            <span>{language === 'fa' ? 'مدیریت قالب‌ها' : 'Themes'}</span>
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
            <span>{language === 'fa' ? 'اسلایدر اپلیکیشن فلاتر' : 'Flutter App Slider'}</span>
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
            <span>{language === 'fa' ? 'سفارشی‌سازی کلوپ' : 'Club Customization'}</span>
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
            <span>{language === 'fa' ? 'لاگ‌های دیتابیس (SQL/NoSQL)' : 'Database Provider Logs'}</span>
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
            <span>{language === 'fa' ? 'تنظیمات API Key و اتصالات' : 'API Keys & Connections'}</span>
          </button>
        </div>

        {/* Admin Center Control Panel Workspace */}
        <div className="lg:col-span-9 flex flex-col gap-6">
          
          {/* Quick Context-Aware Section Guide Bar */}
          <div className="bg-[#121424] border border-white/10 p-4 rounded-2xl flex items-center justify-between gap-4 animate-fade-in shrink-0">
            <div className="flex items-center gap-3">
              <span className="p-2 bg-primary/15 border border-primary/30 text-primary rounded-xl">
                <HelpCircle className="w-5 h-5 text-primary" />
              </span>
              <div>
                <h4 className="text-xs font-black text-white font-display">
                  {language === 'fa' 
                    ? `آیا در کار با بخش «${
                        activeSubTab === 'dashboard' ? 'داشبورد' :
                        activeSubTab === 'systems' ? 'مدیریت کلاینت‌ها' :
                        activeSubTab === 'cafe' ? 'بوفه کافه' :
                        activeSubTab === 'shop' ? 'فروشگاه جانبی' :
                        activeSubTab === 'tournaments' ? 'مسابقات' :
                        activeSubTab === 'blog' ? 'وبلاگ و اخبار' :
                        activeSubTab === 'chat' ? 'اتاق‌های گفتگوی زنده' :
                        activeSubTab === 'migrations' ? 'مهاجرت‌های دیتابیس' :
                        activeSubTab === 'messages' ? 'پیام‌ها و اعلان‌ها' :
                        activeSubTab === 'themes' ? 'قالب‌ها' :
                        activeSubTab === 'appSlider' ? 'اسلایدر اپ' :
                        activeSubTab === 'customization' ? 'سفارشی‌سازی' :
                        activeSubTab === 'dbLogs' ? 'لاگ‌های دیتابیس' :
                        'تنظیمات کلید‌ها'
                      }» نیاز به راهنمایی دارید؟`
                    : `Need assistance with "${activeSubTab.toUpperCase()}" section?`}
                </h4>
                <p className="text-[10px] text-gray-400 font-medium mt-0.5">
                  {language === 'fa' 
                    ? 'مشاهده راهنمای مصور تعاملی، چیدمان فیلدها و سناریوهای کاربردی این زبانه.' 
                    : 'Open interactive screenshots, simulated flows and visual walkthrough steps.'}
                </p>
              </div>
            </div>

            <button
              onClick={() => setIsLocalHelpOpen(true)}
              className="px-3.5 py-2 bg-primary hover:bg-primary-hover text-black text-[10px] font-black rounded-lg transition-all flex items-center gap-1 cursor-pointer active:scale-95 shadow-[0_0_12px_rgba(255,184,0,0.2)]"
            >
              <span>{language === 'fa' ? 'راهنمای تصویری این بخش' : 'Section Visual Guide'}</span>
            </button>
          </div>
          
          {activeSubTab === 'appSlider' && (
            <div className="animate-fade-in space-y-6">
              <div className="bg-dark-card border border-white/10 rounded-2xl p-6">
                <h3 className="text-sm font-bold text-white mb-6 flex items-center gap-2 font-display uppercase tracking-wider border-b border-white/5 pb-3">
                  <Sparkles className="w-4 h-4 text-amber-500 animate-pulse" />
                  <span>{language === 'fa' ? 'افزودن اسلاید جدید برای اپلیکیشن فلاتر' : 'Add New Slide for Flutter App'}</span>
                </h3>

                <form onSubmit={handleAddSlide} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="text-xs text-gray-400 block mb-1.5 font-bold">آدرس تصویر اسلایدر</label>
                    <input 
                      type="text" 
                      required 
                      placeholder="https://images.unsplash.com/photo-..."
                      value={newSlideUrl}
                      onChange={(e) => setNewSlideUrl(e.target.value)}
                      className="w-full bg-[#0d122b] border border-white/10 rounded-lg px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-primary font-mono"
                    />
                  </div>
                  
                  <div>
                    <label className="text-xs text-gray-400 block mb-1.5 font-bold">عنوان فارسی اسلاید (توضیحات کوتاه)</label>
                    <input 
                      type="text" 
                      placeholder="مثلا: سفارش برگر مخصوص کافه با ۳۰٪ تخفیف"
                      value={newSlideTitleFa}
                      onChange={(e) => setNewSlideTitleFa(e.target.value)}
                      className="w-full bg-[#0d122b] border border-white/10 rounded-lg px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-primary font-bold"
                    />
                  </div>

                  <div>
                    <label className="text-xs text-gray-400 block mb-1.5 font-bold">عنوان انگلیسی اسلاید</label>
                    <input 
                      type="text" 
                      placeholder="e.g. 30% Off Special Burgers"
                      value={newSlideTitleEn}
                      onChange={(e) => setNewSlideTitleEn(e.target.value)}
                      className="w-full bg-[#0d122b] border border-white/10 rounded-lg px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-primary"
                    />
                  </div>

                  <div>
                    <label className="text-xs text-gray-400 block mb-1.5 font-bold">بخش هدف (وقتی کاربر روی این اسلاید کلیک کند به اینجا هدایت می‌شود)</label>
                    <select
                      value={newSlideTarget}
                      onChange={(e) => setNewSlideTarget(e.target.value)}
                      className="w-full bg-[#0d122b] border border-white/10 rounded-lg px-3 py-2.5 text-xs text-white focus:outline-none focus:border-primary font-bold"
                    >
                      <option value="reserve">{language === 'fa' ? 'صفحه رزرو سیستم‌ها' : 'Systems Reservation'}</option>
                      <option value="cafe">{language === 'fa' ? 'بخش منو و سفارشات کافه' : 'Cafe Menu & Orders'}</option>
                      <option value="shop">{language === 'fa' ? 'فروشگاه جانبی گیمینگ' : 'Gaming Accessories Shop'}</option>
                      <option value="tournaments">{language === 'fa' ? 'لیست مسابقات و تورنمنت‌ها' : 'Tournaments & Esports'}</option>
                      <option value="loyalty">{language === 'fa' ? 'باشگاه مشتریان و مشخصات کاربری' : 'Loyalty Club & User Profile'}</option>
                    </select>
                  </div>

                  <div className="md:col-span-2 flex justify-end">
                    <button 
                      type="submit"
                      className="px-6 bg-amber-500 hover:bg-amber-600 text-black py-2.5 rounded-lg text-xs font-black cursor-pointer flex items-center gap-1.5 border border-amber-500/20 shadow-[0_0_15px_rgba(245,158,11,0.2)] transition-all font-display uppercase tracking-wide"
                    >
                      <Plus className="w-4 h-4" />
                      <span>ثبت و انتشار در اسلایدر اپلیکیشن</span>
                    </button>
                  </div>
                </form>
              </div>

              {/* Slider preview & existing list */}
              <div className="bg-dark-card border border-white/10 rounded-2xl p-6">
                <h3 className="text-sm font-bold text-white mb-4">اسلایدهای فعال در اپلیکیشن موبایل</h3>
                {appSliders.length === 0 ? (
                  <div className="text-center py-8 text-gray-500 text-xs font-bold">
                    {language === 'fa' ? 'هیچ تصویری برای اسلایدر ثبت نشده است.' : 'No slider images registered.'}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {appSliders.map((slide) => (
                      <div key={slide.id} className="relative bg-[#0d122b] border border-white/5 rounded-xl overflow-hidden flex flex-col group">
                        <div className="h-40 w-full relative overflow-hidden bg-black/50">
                          <img 
                            src={slide.imageUrl} 
                            alt={slide.titleFa} 
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover transition-transform group-hover:scale-105"
                          />
                          <div className="absolute top-2 left-2 bg-black/65 px-2.5 py-1 rounded-full text-[9px] font-mono text-amber-500 font-bold uppercase tracking-wider border border-white/5">
                            {slide.target}
                          </div>
                        </div>
                        <div className="p-4 flex flex-col justify-between flex-grow gap-2">
                          <div>
                            <p className="text-xs font-bold text-white mb-1">{slide.titleFa || 'بدون عنوان فارسی'}</p>
                            <p className="text-[10px] text-gray-400 font-mono">{slide.titleEn || 'No English Title'}</p>
                          </div>
                          <div className="flex justify-between items-center border-t border-white/5 pt-3 mt-1">
                            <span className="text-[10px] font-bold text-gray-500">
                              ID: <span className="font-mono">{slide.id}</span>
                            </span>
                            <button
                              onClick={() => handleDeleteSlide(slide.id)}
                              className="text-red-400 hover:text-red-500 hover:bg-red-500/10 p-1.5 rounded-lg transition-all"
                              title={language === 'fa' ? 'حذف اسلاید' : 'Delete Slide'}
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
          
          {activeSubTab === 'themes' && (
            <div className="animate-fade-in space-y-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-dark-card p-6 border border-white/5 rounded-xl">
                <div>
                  <h3 className="text-xl font-black uppercase mb-1">{language === 'fa' ? 'مدیریت قالب‌ها' : 'Theme Management'}</h3>
                  <p className="text-gray-400 text-sm">
                    {language === 'fa'
                      ? 'قالب را با فایل ZIP نصب کنید (فقط فایل CSS کافی است؛ theme.json اختیاری است) یا با رنگ‌ها قالب بسازید.'
                      : 'Install themes from ZIP packages (CSS file is enough; theme.json optional) or build with colors.'}
                  </p>
                  <p className="text-[10px] text-gray-500 font-mono mt-1">
                    {language === 'fa'
                      ? 'هر قالب یک فایل CSS مستقل است و تمام صفحات سایت را پوشش می‌دهد'
                      : 'Each theme is a standalone CSS file covering every page of the site'}
                  </p>
                </div>
                <div className="flex gap-2">
                   <button 
                     onClick={handleDownloadSampleZip}
                     className="btn btn-primary-outline text-xs px-4 py-2 flex items-center gap-2 rounded-xl"
                     title={language === 'fa' ? 'دانلود قالب نمونه با فرمت ZIP جدید' : 'Download a sample theme zip'}
                   >
                     <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                     </svg>
                     {language === 'fa' ? 'دانلود قالب نمونه' : 'Sample Theme'}
                   </button>
                   <button 
                     onClick={() => setShowUploadForm(!showUploadForm)}
                     className="btn btn-primary-outline text-xs px-4 py-2 flex items-center gap-2 rounded-xl"
                   >
                     <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                     </svg>
                     {language === 'fa' ? 'نصب قالب جدید' : 'Install Theme'}
                   </button>
                </div>
              </div>

              {/* LAYOUT MODE CHANGER */}
              <div className="bg-dark-card border border-white/10 rounded-2xl p-6 space-y-4">
                <div className="border-b border-white/5 pb-3">
                  <h4 className="font-bold text-md text-primary flex items-center gap-2">
                    <Layers className="w-5 h-5 text-primary" />
                    <span>{language === 'fa' ? 'انتخاب معماری و نمای کلی سایت' : 'Select Site Layout Architecture'}</span>
                  </h4>
                  <p className="text-gray-400 text-xs mt-1">
                    {language === 'fa' 
                      ? 'مدیر گرامی، می‌توانید مشخص کنید که کاربران پس از ورود به وب‌سایت کدام چیدمان را مشاهده کنند.' 
                      : 'Choose between the multi-tab layout and the integrated single-page console layout.'}
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
                    <h5 className="font-black text-sm text-white">{language === 'fa' ? '۱. نمای کلاسیک چندبرگه‌ای' : '1. Classic Tabbed Layout'}</h5>
                    <p className="text-xs text-gray-400 leading-relaxed font-semibold">
                      {language === 'fa' 
                        ? 'ساختار سنتی چندبرگه‌ای که بخش‌ها (کافه، کلاینت‌ها، مسابقات، فروشگاه سخت‌افزار) در تب‌های مجزا بارگذاری می‌شوند.' 
                        : 'The traditional design where users browse through independent pages via the main tab bar.'}
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
                    <h5 className="font-black text-sm text-white">{language === 'fa' ? '۲. نمای هاب یکپارچه (تک‌صفحه‌ای)' : '2. Single-Page Console Hub'}</h5>
                    <p className="text-xs text-gray-400 leading-relaxed font-semibold">
                      {language === 'fa' 
                        ? 'یک پنل تک‌صفحه‌ای فوق‌العاده زنده که تمامی امکانات (رزرو، بوفه، فروشگاه، مسابقات، گفتگو، باشگاه مشتریان) را در قالب ویجت‌های تعاملی نمایش می‌دهد.' 
                        : 'A single-page gaming hub aggregating all core functions as fully responsive live modules on a single screen.'}
                    </p>
                  </div>
                </div>
              </div>

              {showUploadForm && (
                <div className="bg-dark-card border border-white/10 rounded-2xl p-6 space-y-4 animate-fade-in">
                  <div className="flex justify-between items-center border-b border-white/5 pb-3">
                    <h4 className="font-bold text-md text-primary flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-primary animate-pulse" />
                      <span>{language === 'fa' ? 'نصب قالب جدید' : 'Install New Theme'}</span>
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
                      <span>{language === 'fa' ? 'نصب از فایل ZIP (فرمت جدید)' : 'Install from ZIP'}</span>
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
                      <span>{language === 'fa' ? 'ساخت سریع با رنگ' : 'Quick Build (Colors)'}</span>
                    </button>
                  </div>

                  {uploadMode === 'zip' ? (
                    <div className="space-y-4">
                      {/* ZIP Upload Slot */}
                      <div className="flex flex-col gap-2">
                        <label className="text-xs text-gray-400 font-bold uppercase">
                          {language === 'fa' ? 'فایل پکیج قالب (.zip)' : 'Theme Package (.zip)'}
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
                              <span className="text-xs font-bold text-gray-300">{language === 'fa' ? 'در حال استخراج متادیتا و CSS قالب...' : 'Extracting theme metadata & CSS...'}</span>
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
                              <span className="text-xs font-bold text-gray-400 group-hover:text-white transition-colors text-center">{language === 'fa' ? 'فایل zip قالب را انتخاب کنید' : 'Select theme zip file'}</span>
                              <span className="text-[10px] text-gray-600 font-bold text-center">{language === 'fa' ? 'فرمت: theme.json + theme.css + پوشه assets/ (اختیاری)' : 'Format: theme.json + theme.css + assets/ folder (optional)'}</span>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Parse Error */}
                      {zipError && (
                        <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-[11px] font-bold leading-relaxed flex items-start gap-2">
                          <X className="w-4 h-4 shrink-0 mt-0.5" />
                          <span>{zipError}</span>
                        </div>
                      )}

                      {/* Parsed Metadata Preview */}
                      {zipParsed && !zipError && (
                        <div className="bg-black/30 border border-white/10 rounded-xl p-4 space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-black uppercase tracking-wider text-gray-400">
                              {language === 'fa' ? 'پیش‌نمایش متادیتای قالب' : 'Parsed Theme Metadata'}
                            </span>
                            <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full text-[9px] font-mono font-bold">
                              {language === 'fa' ? 'آماده نصب' : 'READY TO INSTALL'}
                            </span>
                          </div>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-[11px]">
                            <div>
                              <span className="block text-[9px] text-gray-500 font-bold uppercase">{language === 'fa' ? 'نام' : 'Name'}</span>
                              <span className="text-white font-black">{zipParsed.meta.name}</span>
                            </div>
                            <div>
                              <span className="block text-[9px] text-gray-500 font-bold uppercase">ID</span>
                              <span className="text-primary font-mono font-bold" dir="ltr">{zipParsed.meta.id}</span>
                            </div>
                            <div>
                              <span className="block text-[9px] text-gray-500 font-bold uppercase">{language === 'fa' ? 'نسخه' : 'Version'}</span>
                              <span className="text-white font-mono font-bold">{zipParsed.meta.version || '—'}</span>
                            </div>
                            <div>
                              <span className="block text-[9px] text-gray-500 font-bold uppercase">CSS / Assets</span>
                              <span className="text-white font-mono font-bold">{(zipParsed.css.length / 1024).toFixed(1)}KB{Object.keys(zipParsed.assets).length > 0 ? ` + ${Object.keys(zipParsed.assets).length}` : ''}</span>
                            </div>
                          </div>
                          {zipParsed.meta.description && (
                            <p className="text-[11px] text-gray-400 leading-relaxed">{zipParsed.meta.description}</p>
                          )}
                          <div className="flex items-center gap-3 pt-2 border-t border-white/5">
                            <span className="text-[9px] text-gray-500 font-bold uppercase">{language === 'fa' ? 'رنگ‌ها:' : 'Colors:'}</span>
                            {(['primary', 'bg', 'card'] as const).map(k => (
                              <span key={k} className="flex items-center gap-1.5 text-[10px] font-mono text-gray-300">
                                <span className="w-4 h-4 rounded border border-white/20" style={{ backgroundColor: zipParsed.meta.colors?.[k] || '#333' }} />
                                <span className="hidden md:inline">{zipParsed.meta.colors?.[k]}</span>
                              </span>
                            ))}
                            <span className="text-[9px] text-gray-500 font-mono mr-auto">{Object.keys(zipParsed.assets).length > 0 ? `assets: ${Object.keys(zipParsed.assets).join(', ')}` : 'بدون assets'}</span>
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
                          <span>{language === 'fa' ? 'دانلود قالب نمونه (فرمت جدید)' : 'Download Sample ZIP'}</span>
                        </button>
                        <div className="flex gap-2">
                          <button 
                            type="button" 
                            onClick={() => setShowUploadForm(false)} 
                            className="px-4 py-2 text-xs font-bold uppercase rounded-xl bg-white/5 text-gray-400 hover:text-white transition-colors"
                          >
                            {language === 'fa' ? 'انصراف' : 'Cancel'}
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
                              ? (language === 'fa' ? 'در حال نصب روی سرور...' : 'Installing on server...')
                              : (language === 'fa' ? 'نصب و فعال‌سازی' : 'Install & Activate')}
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <form onSubmit={handleCreateTheme} className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="flex flex-col gap-1.5">
                          <label className="text-xs text-gray-400 font-bold uppercase">{language === 'fa' ? 'نام قالب' : 'Theme Name'}</label>
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
                            <label className="text-[10px] text-gray-500 font-bold uppercase">{language === 'fa' ? 'رنگ اصلی' : 'Primary'}</label>
                            <div className="flex items-center gap-1.5 bg-black/20 border border-white/5 rounded-xl p-1.5">
                              <input 
                                type="color" 
                                value={newThemePrimary}
                                onChange={(e) => setNewThemePrimary(e.target.value)}
                                className="w-6 h-6 bg-transparent border-none cursor-pointer rounded-md overflow-hidden shrink-0"
                              />
                              <span className="text-[9px] font-mono text-gray-400 truncate">{newThemePrimary}</span>
                            </div>
                          </div>

                          <div className="flex flex-col gap-1.5">
                            <label className="text-[10px] text-gray-500 font-bold uppercase">{language === 'fa' ? 'پس‌زمینه' : 'Background'}</label>
                            <div className="flex items-center gap-1.5 bg-black/20 border border-white/5 rounded-xl p-1.5">
                              <input 
                                type="color" 
                                value={newThemeBg}
                                onChange={(e) => setNewThemeBg(e.target.value)}
                                className="w-6 h-6 bg-transparent border-none cursor-pointer rounded-md overflow-hidden shrink-0"
                              />
                              <span className="text-[9px] font-mono text-gray-400 truncate">{newThemeBg}</span>
                            </div>
                          </div>

                          <div className="flex flex-col gap-1.5">
                            <label className="text-[10px] text-gray-500 font-bold uppercase">{language === 'fa' ? 'کارت‌ها' : 'Cards'}</label>
                            <div className="flex items-center gap-1.5 bg-black/20 border border-white/5 rounded-xl p-1.5">
                              <input 
                                type="color" 
                                value={newThemeCard}
                                onChange={(e) => setNewThemeCard(e.target.value)}
                                className="w-6 h-6 bg-transparent border-none cursor-pointer rounded-md overflow-hidden shrink-0"
                              />
                              <span className="text-[9px] font-mono text-gray-400 truncate">{newThemeCard}</span>
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
                          {language === 'fa' ? 'انصراف' : 'Cancel'}
                        </button>
                        <button 
                          type="submit" 
                          className="px-5 py-2 text-xs font-black uppercase rounded-xl bg-primary text-black hover:opacity-90 shadow-[0_0_15px_rgba(255,184,0,0.3)] transition-all"
                        >
                          {language === 'fa' ? 'ساخت و نصب قالب' : 'Build & Install'}
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
                                ? (language === 'fa' ? 'سیستمی' : 'Built-in') 
                                : theme.kind === 'server'
                                    ? (language === 'fa' ? 'سروری (پوشه اختصاصی)' : 'Server (own folder)')
                                : (theme.kind === 'zip' 
                                    ? (language === 'fa' ? 'پکیج ZIP' : 'ZIP Package')
                                    : (language === 'fa' ? 'سفارشی (رنگ)' : 'Custom (Colors)'))}
                            </span>
                            {theme.hasAssets && (
                              <span className="px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[8px] font-mono font-bold" title={theme.assetFiles?.join(', ')}>
                                📁 {theme.assetFiles?.length || 0} assets
                              </span>
                            )}
                            {theme.type === 'custom' && theme.css && (
                              <span className="px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 text-[8px] font-mono font-bold">
                                CSS {(theme.css.length / 1024).toFixed(1)}KB
                              </span>
                            )}
                            {theme.version && (
                              <span className="px-1.5 py-0.5 rounded bg-white/5 text-gray-400 border border-white/10 text-[8px] font-mono font-bold">
                                v{theme.version}
                              </span>
                            )}
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
                              title={language === 'fa' ? 'دانلود پکیج ZIP این قالب' : 'Download this theme as ZIP'}
                            >
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                              </svg>
                            </button>
                            <button 
                              onClick={() => handleDeleteTheme(theme)}
                              className="p-1.5 text-gray-500 hover:text-accent-red hover:bg-red-500/10 rounded-lg transition-colors"
                              title={language === 'fa' ? 'حذف (پوشه قالب نیز حذف می‌شود)' : 'Delete (theme folder removed too)'}
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
                        onClick={() => setThemeId && setThemeId(theme.id)}
                        disabled={themeId === theme.id}
                        className={`flex-1 py-2 text-xs font-bold uppercase rounded-lg transition-colors ${themeId === theme.id ? 'bg-primary/20 text-primary cursor-default' : 'bg-white/5 text-gray-300 hover:bg-primary hover:text-black'}`}
                      >
                        {themeId === theme.id ? (language === 'fa' ? 'فعال' : 'Active') : (language === 'fa' ? 'انتخاب' : 'Select')}
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
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{language === 'fa' ? 'کل درآمد فروشگاه و بوفه' : 'Total Revenue'}</span>
                  <span className="text-xl font-black text-white mt-1">{(stats.totalSales || 0).toLocaleString()} <span className="text-xs text-primary font-bold">تومان</span></span>
                  <p className="text-[9px] text-gray-500 font-bold mt-2 font-mono">Real-time ledger audit log</p>
                </div>

                <div className="p-5 bg-white/5 border border-white/10 rounded-2xl flex flex-col gap-1 relative overflow-hidden group">
                  <div className="absolute top-4 right-4 w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                    <Clock className="w-4 h-4" />
                  </div>
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{language === 'fa' ? 'تعداد رزرو سانس‌ها' : 'Total System Bookings'}</span>
                  <span className="text-xl font-black text-white mt-1">{stats.totalReservations || 0} <span className="text-xs text-primary font-bold">سانس</span></span>
                  <p className="text-[9px] text-gray-500 font-bold mt-2 font-mono">Active schedule pool size</p>
                </div>

                <div className="p-5 bg-white/5 border border-white/10 rounded-2xl flex flex-col gap-1 relative overflow-hidden group">
                  <div className="absolute top-4 right-4 w-8 h-8 rounded-lg bg-cyan-500/10 flex items-center justify-center text-cyan-400">
                    <Monitor className="w-4 h-4 animate-pulse" />
                  </div>
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{language === 'fa' ? 'سیستم‌های در حال بازی' : 'Occupied PCs/Consoles'}</span>
                  <span className="text-xl font-black text-cyan-400 mt-1">{stats.activeReservations || 0} / {stats.activeSystems || 8} <span className="text-xs font-bold text-white">روشن</span></span>
                  <p className="text-[9px] text-gray-500 font-bold mt-2 font-mono">Live bandwidth load check</p>
                </div>

                <div className="p-5 bg-white/5 border border-white/10 rounded-2xl flex flex-col gap-1 relative overflow-hidden group">
                  <div className="absolute top-4 right-4 w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center text-purple-400">
                    <Users className="w-4 h-4" />
                  </div>
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{language === 'fa' ? 'گیمرهای ثبت‌شده' : 'Registered Gamers'}</span>
                  <span className="text-xl font-black text-white mt-1">{stats.totalUsers || 147} <span className="text-xs text-purple-400 font-bold">نفر</span></span>
                  <p className="text-[9px] text-gray-500 font-bold mt-2 font-mono">Loyalty club members list</p>
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
                          {language === 'fa' ? 'وضعیت اتصال و همگام‌سازی نرم‌افزار مدیریت دسکتاپ (بازینو پرو دسکتاپ)' : 'Bazino Pro Desktop Software Sync Status'}
                        </h3>
                        <span className={`px-2 py-0.5 text-[9px] font-bold rounded-full ${stats.gamenetSyncStatus ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20' : 'bg-amber-500/15 text-amber-400 border border-amber-500/20'}`}>
                          {stats.gamenetSyncStatus 
                            ? (language === 'fa' ? 'متصل و فعال (Live)' : 'Connected & Live') 
                            : (language === 'fa' ? 'در انتظار اولین اتصال (Offline)' : 'Pending First Sync')}
                        </span>
                      </div>
                      <p className="text-xs text-gray-400 mt-1">
                        {language === 'fa' 
                          ? 'نمای زنده کلاینت‌ها، صندوق، بوفه و فاکتورهای صادر شده توسط نسخه دسکتاپ کلوب' 
                          : 'Live central dashboard syncing PCs/consoles, buffet sales, and customer tabs from the local desk.'}
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
                      <span>{language === 'fa' ? 'ورود به نرم‌افزار مدیریت دسکتاپ' : 'Open Desktop Management App'}</span>
                      <ChevronLeft className="w-4 h-4" />
                    </a>
                  </div>
                </div>

                {stats.gamenetSyncStatus ? (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="flex flex-col gap-4">
                      <div className="grid grid-cols-2 gap-3">
                        <div className="p-4 bg-white/5 border border-white/5 rounded-xl flex flex-col">
                          <span className="text-[10px] text-gray-400 font-bold">{language === 'fa' ? 'سیستم‌های فعال کلوپ' : 'Active Synced PCs'}</span>
                          <span className="text-lg font-black text-[#1bc2ca] mt-1">
                            {stats.gamenetSyncStatus.active_stations_count || 0} {language === 'fa' ? 'سیستم' : 'PCs'}
                          </span>
                        </div>
                        <div className="p-4 bg-white/5 border border-white/5 rounded-xl flex flex-col">
                          <span className="text-[10px] text-gray-400 font-bold">{language === 'fa' ? 'درآمد امروز دسکتاپ' : 'Synced Sales Today'}</span>
                          <span className="text-lg font-black text-white mt-1">
                            {(stats.gamenetSyncStatus.total_revenue_today || 0).toLocaleString()} <span className="text-xs text-primary font-bold">تومان</span>
                          </span>
                        </div>
                      </div>

                      <div className="p-4 bg-white/5 border border-white/5 rounded-xl flex flex-col gap-1.5">
                        <div className="flex justify-between text-xs text-gray-400 font-bold">
                          <span>{language === 'fa' ? 'زمان آخرین بروزرسانی' : 'Last Sync Timestamp'}</span>
                          <span className="text-white font-mono">{new Date(stats.gamenetSyncStatus.timestamp).toLocaleTimeString('fa-IR')}</span>
                        </div>
                        <div className="flex justify-between text-xs text-gray-400 font-bold">
                          <span>{language === 'fa' ? 'شناسه ایستگاه مرکزی' : 'Central ID'}</span>
                          <span className="text-white font-mono">{stats.gamenetSyncStatus.station_id}</span>
                        </div>
                      </div>
                    </div>

                    <div className="md:col-span-2 p-4 bg-white/5 border border-white/5 rounded-xl flex flex-col gap-3">
                      <h4 className="text-xs font-bold text-gray-300 flex items-center gap-1.5 uppercase tracking-wider">
                        <span className="w-1.5 h-1.5 bg-[#1bc2ca] rounded-full"></span>
                        <span>{language === 'fa' ? 'موقعیت و وضعیت لحظه‌ای سیستم‌های کلوب (Live Grid)' : 'Live Lounge System Grid'}</span>
                      </h4>

                      {stats.gamenetSyncStatus.stations && stats.gamenetSyncStatus.stations.length > 0 ? (
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                          {stats.gamenetSyncStatus.stations.map((st: any) => (
                            <div key={st.id} className="p-2.5 bg-black/30 border border-white/5 rounded-xl flex flex-col gap-1">
                              <span className="text-xs font-bold text-white truncate">{st.name}</span>
                              <div className="flex items-center gap-1.5 mt-1">
                                <span className={`w-2 h-2 rounded-full ${st.status === 'PLAYING' ? 'bg-emerald-400 animate-pulse' : st.status === 'DIRTY' ? 'bg-amber-400' : st.status === 'MAINTENANCE' ? 'bg-red-400' : 'bg-gray-500'}`}></span>
                                <span className="text-[10px] text-gray-400 font-bold">
                                  {st.status === 'PLAYING' ? (language === 'fa' ? 'در حال بازی' : 'Playing')
                                   : st.status === 'DIRTY' ? (language === 'fa' ? 'کثیف / آماده‌سازی' : 'Dirty')
                                   : st.status === 'MAINTENANCE' ? (language === 'fa' ? 'خراب / تعمیر' : 'Maintenance')
                                   : (language === 'fa' ? 'آزاد و آماده' : 'Free')}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-gray-500 py-6 text-center font-bold">{language === 'fa' ? 'هیچ ایستگاهی گزارش نشده است' : 'No active stations synchronized yet.'}</p>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="py-10 text-center flex flex-col items-center gap-3">
                    <Database className="w-10 h-10 text-gray-600 animate-bounce" />
                    <p className="text-xs text-gray-400 font-bold">
                      {language === 'fa' ? 'در حال حاضر هیچ اتصالی از دسکتاپ ثبت نشده است.' : 'Currently no connection received from the local desktop app.'}
                    </p>
                    <p className="text-[10px] text-gray-500 max-w-md mx-auto">
                      {language === 'fa' 
                        ? 'برای ثبت همگام‌سازی، نرم‌افزار دسکتاپ را باز کرده و در بخش همگام‌سازی وب‌سایت، کلید شروع ارسال اطلاعات را بفشارید.' 
                        : 'To test synchronization, open the Desktop Management App and click on "Trigger Sync" inside the WebSync panel.'}
                    </p>
                  </div>
                )}
              </div>

              {/* Cafe buffet live orders pool */}
              <div className="bg-dark-card border border-white/10 rounded-2xl p-6">
                <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2 font-display uppercase tracking-wider border-b border-white/5 pb-3">
                  <span className="w-1 h-4 bg-primary rounded-full"></span>
                  <span>{language === 'fa' ? 'سفارشات زنده بوفه و کافه سالن' : 'Live Cafe Buffet Orders'}</span>
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
                            <span className="text-gray-400 text-xs font-bold">{language === 'fa' ? `تحویل پای: ${order.tableNumber}` : `Deliver to: ${order.tableNumber}`}</span>
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
                          <span className="text-xs font-bold text-white font-mono">{(order.finalAmount || order.totalPrice).toLocaleString()} تومان</span>
                          
                          {/* Order State Controller dropdown */}
                          <select 
                            value={order.status}
                            onChange={(e) => handleUpdateCafeOrderStatus(order.id, e.target.value)}
                            className="bg-[#0d122b62e] border border-white/10 rounded-lg px-2.5 py-1.5 text-xs font-bold text-gray-300 focus:outline-none focus:border-primary cursor-pointer"
                          >
                            <option value="Pending">{language === 'fa' ? 'در انتظار' : 'Pending'}</option>
                            <option value="Preparing">{language === 'fa' ? 'در حال آماده‌سازی' : 'Preparing'}</option>
                            <option value="Delivered">{language === 'fa' ? 'تحویل داده شد' : 'Delivered'}</option>
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
                  <span>{language === 'fa' ? 'فاکتورهای معلق فروشگاه سخت‌افزار' : 'Accessory Purchase Log'}</span>
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
                            <span className="text-gray-400 text-xs font-bold">خرید از باشگاه وفاداری</span>
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
                          <span className="text-xs font-bold text-white font-mono">{order.finalAmount.toLocaleString()} تومان</span>
                          
                          <select 
                            value={order.status}
                            onChange={(e) => handleUpdateShopOrderStatus(order.id, e.target.value)}
                            className="bg-[#0d122b62e] border border-white/10 rounded-lg px-2.5 py-1.5 text-xs font-bold text-gray-300 focus:outline-none focus:border-primary cursor-pointer"
                          >
                            <option value="Processing">{language === 'fa' ? 'در حال بررسی' : 'Processing'}</option>
                            <option value="Shipped">{language === 'fa' ? 'ارسال شد' : 'Shipped'}</option>
                            <option value="Delivered">{language === 'fa' ? 'تحویل شد' : 'Delivered'}</option>
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
                  <span>{language === 'fa' ? 'افزودن سیستم جدید به پایگاه داده دات‌نت' : 'Add New Game Client System'}</span>
                </h3>

                <form onSubmit={handleAddSystem} className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <label className="text-xs text-gray-400 block mb-1.5 font-bold">نام سیستم (Gamer Identifier)</label>
                    <input 
                      type="text" 
                      required 
                      placeholder="مثلا سیستم VIP شماره ۹"
                      value={newSystem.name}
                      onChange={(e) => setNewSystem({ ...newSystem, name: e.target.value })}
                      className="w-full bg-[#0d122b] border border-white/10 rounded-lg px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-primary font-bold"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 block mb-1.5 font-bold">نوع کلاینت</label>
                    <select
                      value={newSystem.type}
                      onChange={(e) => setNewSystem({ ...newSystem, type: e.target.value })}
                      className="w-full bg-[#0d122b] border border-white/10 rounded-lg px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-primary font-bold"
                    >
                      <option value="PC">PC (گیمینگ)</option>
                      <option value="PS5">PlayStation 5</option>
                      <option value="Xbox">Xbox Series X</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 block mb-1.5 font-bold">نرخ هر ساعت (تومان)</label>
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
                      <span>{language === 'fa' ? 'ثبت کلاینت' : 'Add Client'}</span>
                    </button>
                  </div>
                </form>
              </div>

              {/* Systems List */}
              <div className="bg-dark-card border border-white/10 rounded-2xl p-6">
                <h3 className="text-sm font-bold text-white mb-4">سیستم‌های فعال سالن</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {systems.map((sys) => (
                    <div key={sys.id} className="bg-[#0a0e21] border border-white/5 rounded-xl p-4 flex justify-between items-center">
                      <div>
                        <h4 className="text-xs font-bold text-white flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${sys.isActive ? 'bg-emerald-400 animate-pulse' : 'bg-gray-600'}`}></span>
                          <span>{sys.name}</span>
                        </h4>
                        <p className="text-[10px] text-gray-400 mt-1 font-mono">{sys.type} — {sys.hourlyRate.toLocaleString()} تومان/ساعت</p>
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
                          {sys.isActive ? 'غیرفعال‌سازی' : 'فعال‌سازی'}
                        </button>
                        <button
                          onClick={() => { if (confirm('آیا از حذف این سیستم مطمئن هستید؟')) handleDeleteSystem(sys.id); }}
                          className="px-3 py-1.5 rounded-lg text-[10px] font-black transition-all cursor-pointer bg-white/5 text-gray-400 border border-white/10 hover:bg-rose-500/20 hover:text-rose-400"
                        >
                          حذف
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
                  <span>{language === 'fa' ? 'افزودن آیتم جدید به منوی کافه بوفه' : 'Add New Cafe Menu Item'}</span>
                </h3>

                <form onSubmit={handleAddCafeItem} className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="text-xs text-gray-400 block mb-1.5 font-bold">نام کالا</label>
                    <input 
                      type="text" 
                      required 
                      placeholder="مثلا چیپس چدار بزرگ"
                      value={newCafe.name}
                      onChange={(e) => setNewCafe({ ...newCafe, name: e.target.value })}
                      className="w-full bg-[#0d122b] border border-white/10 rounded-lg px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-primary font-bold"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 block mb-1.5 font-bold">دسته‌بندی منو</label>
                    <select
                      value={newCafe.category}
                      onChange={(e) => setNewCafe({ ...newCafe, category: e.target.value as any })}
                      className="w-full bg-[#0d122b] border border-white/10 rounded-lg px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-primary font-bold"
                    >
                      <option value="Foods">غذاها (Foods)</option>
                      <option value="Drinks">نوشیدنی‌ها (Drinks)</option>
                      <option value="Snacks">میان‌وعده‌ها (Snacks)</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 block mb-1.5 font-bold">قیمت فروش (تومان)</label>
                    <input 
                      type="number" 
                      required
                      value={newCafe.price}
                      onChange={(e) => setNewCafe({ ...newCafe, price: Number(e.target.value) })}
                      className="w-full bg-[#0d122b] border border-white/10 rounded-lg px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-primary font-mono font-bold"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="text-xs text-gray-400 block mb-1.5 font-bold">لینک آدرس تصویر (Unsplash CDN recommended)</label>
                    <input 
                      type="text"
                      placeholder="https://images.unsplash.com/photo-..."
                      value={newCafe.imageUrl}
                      onChange={(e) => setNewCafe({ ...newCafe, imageUrl: e.target.value })}
                      className="w-full bg-[#0d122b] border border-white/10 rounded-lg px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-primary font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 block mb-1.5 font-bold">موجودی اولیه انبار</label>
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
                      <span>ثبت آیتم در منوی بوفه</span>
                    </button>
                  </div>
                </form>
              </div>

              {/* Cafe Inventory Grid */}
              <div className="bg-dark-card border border-white/10 rounded-2xl p-6">
                <h3 className="text-sm font-bold text-white mb-4">محصولات موجود در انبار بوفه</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {cafeItems.map((item) => (
                    <div key={item.id} className="bg-[#0a0e21] border border-white/5 rounded-xl p-3 flex gap-3">
                      <div className="w-12 h-12 bg-white/5 rounded-lg overflow-hidden border border-white/5 shrink-0">
                        <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-xs font-bold text-white truncate">{item.name}</h4>
                        <div className="flex justify-between items-center mt-1.5">
                          <span className="text-[10px] text-gray-400 font-mono">{item.price.toLocaleString()} تومان</span>
                          <span className={`px-2 py-0.5 rounded text-[9px] font-bold font-mono ${item.inventory > 5 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'}`}>
                            موجودی: {item.inventory}
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={() => { if (confirm('آیا از حذف این آیتم مطمئن هستید؟')) handleDeleteCafeItem(item.id); }}
                        className="self-start px-2.5 py-1 rounded-lg text-[9px] font-black transition-all cursor-pointer bg-white/5 text-gray-400 border border-white/10 hover:bg-rose-500/20 hover:text-rose-400 shrink-0"
                      >
                        حذف
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
                  <span>{language === 'fa' ? 'افزودن تجهیزات جدید به فروشگاه' : 'Add New Hardware Accessory'}</span>
                </h3>

                <form onSubmit={handleAddAccessory} className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="text-xs text-gray-400 block mb-1.5 font-bold">نام تجهیزات</label>
                    <input 
                      type="text" 
                      required 
                      placeholder="مثلا هدست ریزر کراکن"
                      value={newAccessory.name}
                      onChange={(e) => setNewAccessory({ ...newAccessory, name: e.target.value })}
                      className="w-full bg-[#0d122b] border border-white/10 rounded-lg px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-primary font-bold"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 block mb-1.5 font-bold">دسته‌بندی قطعات</label>
                    <select
                      value={newAccessory.category}
                      onChange={(e) => setNewAccessory({ ...newAccessory, category: e.target.value as any })}
                      className="w-full bg-[#0d122b] border border-white/10 rounded-lg px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-primary font-bold"
                    >
                      <option value="Keyboard">کیبورد (Keyboard)</option>
                      <option value="Mouse">موس (Mouse)</option>
                      <option value="Headset">هدست (Headset)</option>
                      <option value="Controller">دسته بازی (Controller)</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 block mb-1.5 font-bold">قیمت (تومان)</label>
                    <input 
                      type="number" 
                      required
                      value={newAccessory.price}
                      onChange={(e) => setNewAccessory({ ...newAccessory, price: Number(e.target.value) })}
                      className="w-full bg-[#0d122b] border border-white/10 rounded-lg px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-primary font-mono font-bold"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="text-xs text-gray-400 block mb-1.5 font-bold">توضیحات کوتاه فنی محصول</label>
                    <input 
                      type="text"
                      placeholder="کیبورد سوییچ مکانیکال قرمز با تاخیر صفر میلی‌ثانیه..."
                      value={newAccessory.description}
                      onChange={(e) => setNewAccessory({ ...newAccessory, description: e.target.value })}
                      className="w-full bg-[#0d122b] border border-white/10 rounded-lg px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-primary"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 block mb-1.5 font-bold">موجودی انبار</label>
                    <input 
                      type="number"
                      required
                      value={newAccessory.stock}
                      onChange={(e) => setNewAccessory({ ...newAccessory, stock: Number(e.target.value) })}
                      className="w-full bg-[#0d122b] border border-white/10 rounded-lg px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-primary font-mono font-bold"
                    />
                  </div>
                  <div className="md:col-span-3">
                    <label className="text-xs text-gray-400 block mb-1.5 font-bold">لینک آدرس تصویر</label>
                    <input 
                      type="text"
                      placeholder="https://images.unsplash.com/photo-..."
                      value={newAccessory.imageUrl}
                      onChange={(e) => setNewAccessory({ ...newAccessory, imageUrl: e.target.value })}
                      className="w-full bg-[#0d122b] border border-white/10 rounded-lg px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-primary font-mono"
                    />
                  </div>
                  <div className="md:col-span-3 flex justify-end">
                    <button 
                      type="submit"
                      className="px-6 bg-primary hover:bg-primary-hover text-black py-2.5 rounded-lg text-xs font-black cursor-pointer flex items-center gap-1.5 border border-primary/20 shadow-[0_0_15px_rgba(0,240,255,0.2)] transition-all font-display uppercase tracking-wide"
                    >
                      <Plus className="w-4 h-4" />
                      <span>ثبت در انبار فروشگاه</span>
                    </button>
                  </div>
                </form>
              </div>

              <div className="bg-dark-card border border-white/10 rounded-2xl p-6">
                <h3 className="text-sm font-bold text-white mb-4">کالاهای موجود در فروشگاه</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {accessories.map((acc) => (
                    <div key={acc.id} className="bg-[#0a0e21] border border-white/5 rounded-xl p-3 flex gap-3">
                      <div className="w-12 h-12 bg-white/5 rounded-lg overflow-hidden border border-white/5 shrink-0">
                        <img src={acc.imageUrl} alt={acc.name} className="w-full h-full object-cover" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-xs font-bold text-white truncate">{acc.name}</h4>
                        <div className="flex justify-between items-center mt-1.5">
                          <span className="text-[10px] text-gray-400 font-mono">{acc.price.toLocaleString()} تومان</span>
                          <span className={`px-2 py-0.5 rounded text-[9px] font-bold font-mono ${acc.stock > 3 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'}`}>
                            موجودی: {acc.stock}
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={() => { if (confirm('آیا از حذف این کالا مطمئن هستید؟')) handleDeleteAccessory(acc.id); }}
                        className="self-start px-2.5 py-1 rounded-lg text-[9px] font-black transition-all cursor-pointer bg-white/5 text-gray-400 border border-white/10 hover:bg-rose-500/20 hover:text-rose-400 shrink-0"
                      >
                        حذف
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
                  <span>{language === 'fa' ? 'برنامه‌ریزی و فعال‌سازی تورنمنت گیم‌نت' : 'Schedule New Tournament'}</span>
                </h3>

                <form onSubmit={handleAddTournament} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-gray-400 block mb-1.5 font-bold">عنوان مسابقات</label>
                    <input 
                      type="text" 
                      required 
                      placeholder="مثلا لیگ قهرمانان دوتا ۲ سالن"
                      value={newTournament.title}
                      onChange={(e) => setNewTournament({ ...newTournament, title: e.target.value })}
                      className="w-full bg-[#0d122b] border border-white/10 rounded-lg px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-primary font-bold"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 block mb-1.5 font-bold">بازی و ژانر رقابت</label>
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
                    <label className="text-xs text-gray-400 block mb-1.5 font-bold">هزینه ثبت نام تیم (تومان)</label>
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
                      <label className="text-xs text-gray-400 block mb-1.5 font-bold">تاریخ شروع</label>
                      <input 
                        type="text" 
                        required
                        value={newTournament.startDate}
                        onChange={(e) => setNewTournament({ ...newTournament, startDate: e.target.value })}
                        className="w-full bg-[#0d122b] border border-white/10 rounded-lg px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-primary font-bold"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-400 block mb-1.5 font-bold">حداکثر تیم‌ها</label>
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
                      <span>ثبت و انتشار زمان‌بندی لیگ</span>
                    </button>
                  </div>
                </form>
              </div>

              {/* Tournament list review */}
              <div className="bg-dark-card border border-white/10 rounded-2xl p-6">
                <h3 className="text-sm font-bold text-white mb-4">تورنمنت‌های فعال و تعداد تیم‌ها</h3>
                <div className="flex flex-col gap-4">
                  {tournaments.map((tour) => (
                    <div key={tour.id} className="bg-[#0a0e21] border border-white/5 rounded-xl p-4 flex flex-col gap-3">
                      <div className="flex justify-between items-center border-b border-white/5 pb-2">
                        <span className="text-xs font-bold text-white font-display">{tour.title}</span>
                        <div className="flex items-center gap-2">
                          <span className="px-2.5 py-1 rounded bg-primary/10 text-primary text-[10px] font-bold">{tour.status}</span>
                          <button
                            onClick={() => { if (confirm('آیا از حذف این تورنومنت مطمئن هستید؟')) handleDeleteTournament(tour.id); }}
                            className="px-2.5 py-1 rounded-lg text-[9px] font-black transition-all cursor-pointer bg-white/5 text-gray-400 border border-white/10 hover:bg-rose-500/20 hover:text-rose-400"
                          >
                            حذف
                          </button>
                        </div>
                      </div>
                      <div className="flex justify-between text-xs text-gray-400 font-mono">
                        <span>ثبت نام شده: {tour.registeredTeamsCount} / {tour.maxTeams} تیم</span>
                        <span>بازی: {tour.game}</span>
                      </div>
                      {tour.teams && tour.teams.length > 0 && (
                        <div className="bg-[#171717] p-3 rounded-lg border border-white/5">
                          <p className="text-[10px] text-gray-500 font-bold mb-1.5 uppercase">لیست تیم‌های تایید شده:</p>
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
                  <span>{language === 'fa' ? 'انتشار خبر یا مقاله جدید در بخش بلاگ' : 'Publish Blog Article'}</span>
                </h3>

                <form onSubmit={handleAddArticle} className="flex flex-col gap-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs text-gray-400 block mb-1.5 font-bold">عنوان مقاله</label>
                      <input 
                        type="text" 
                        required 
                        placeholder="تغییرات گیم‌پلی در پچ جدید بازی..."
                        value={newArticle.title}
                        onChange={(e) => setNewArticle({ ...newArticle, title: e.target.value })}
                        className="w-full bg-[#0d122b] border border-white/10 rounded-lg px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-primary font-bold"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-400 block mb-1.5 font-bold">دسته‌بندی (ژانر / سخت‌افزار)</label>
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
                    <label className="text-xs text-gray-400 block mb-1.5 font-bold">آدرس لینک تصویر کاور مقاله</label>
                    <input 
                      type="text" 
                      placeholder="https://images.unsplash.com/photo-..."
                      value={newArticle.imageUrl}
                      onChange={(e) => setNewArticle({ ...newArticle, imageUrl: e.target.value })}
                      className="w-full bg-[#0d122b] border border-white/10 rounded-lg px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-primary font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 block mb-1.5 font-bold">متن کامل مقاله</label>
                    <textarea 
                      required 
                      rows={6}
                      placeholder="متن خود را با دقت در این بخش وارد کنید تا کاربران بتوانند در بخش مقالات مطالعه کنند..."
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
                      <span>انتشار مقاله در وب‌سایت</span>
                    </button>
                  </div>
                </form>
              </div>

              <div className="bg-dark-card border border-white/10 rounded-2xl p-6">
                <h3 className="text-sm font-bold text-white mb-4">مقالات منتشرشده</h3>
                <div className="flex flex-col gap-3">
                  {articles.map((art) => (
                    <div key={art.id} className="bg-[#0a0e21] border border-white/5 rounded-xl p-3 flex gap-3 items-center">
                      <div className="w-14 h-14 bg-white/5 rounded-lg overflow-hidden border border-white/5 shrink-0">
                        <img src={art.imageUrl} alt={art.title} className="w-full h-full object-cover" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-xs font-bold text-white truncate">{art.title}</h4>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="px-2 py-0.5 rounded text-[9px] font-bold font-mono bg-primary/10 text-primary">{art.category}</span>
                          <span className="text-[10px] text-gray-500 font-mono">{art.date}</span>
                        </div>
                      </div>
                      <button
                        onClick={() => { if (confirm('آیا از حذف این مقاله مطمئن هستید؟')) handleDeleteArticle(art.id); }}
                        className="px-2.5 py-1 rounded-lg text-[9px] font-black transition-all cursor-pointer bg-white/5 text-gray-400 border border-white/10 hover:bg-rose-500/20 hover:text-rose-400 shrink-0"
                      >
                        حذف
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
                  <span>{language === 'fa' ? 'ایجاد اتاق گفتگوی جدید' : 'Create New Chat Room'}</span>
                </h3>
                <form onSubmit={handleAddChatRoom} className="flex gap-3">
                  <input
                    type="text"
                    required
                    placeholder="مثلا Apex Legends"
                    value={newChatRoomName}
                    onChange={(e) => setNewChatRoomName(e.target.value)}
                    className="flex-1 bg-[#0d122b] border border-white/10 rounded-lg px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-primary font-bold"
                  />
                  <button
                    type="submit"
                    className="px-6 bg-primary hover:bg-primary-hover text-black py-2.5 rounded-lg text-xs font-black cursor-pointer flex items-center gap-1.5 border border-primary/20 shadow-[0_0_15px_rgba(0,240,255,0.2)] transition-all font-display uppercase tracking-wide"
                  >
                    <Plus className="w-4 h-4" />
                    <span>ایجاد اتاق</span>
                  </button>
                </form>
              </div>

              <div className="bg-dark-card border border-white/10 rounded-2xl p-6">
                <h3 className="text-sm font-bold text-white mb-4">اتاق‌های گفتگوی فعال</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {chatRooms.map((room) => (
                    <div key={room} className="bg-[#0a0e21] border border-white/5 rounded-xl p-3 flex justify-between items-center gap-2">
                      <span className="text-xs font-bold text-white truncate">{room}</span>
                      <button
                        onClick={() => { if (confirm('آیا از حذف این اتاق گفتگو مطمئن هستید؟ تمام پیام‌های آن نیز حذف نمی‌شوند ولی اتاق دیگر در دسترس نخواهد بود.')) handleDeleteChatRoom(room); }}
                        className="px-2.5 py-1 rounded-lg text-[9px] font-black transition-all cursor-pointer bg-white/5 text-gray-400 border border-white/10 hover:bg-rose-500/20 hover:text-rose-400 shrink-0"
                      >
                        حذف
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
                  <span>{language === 'fa' ? 'ارسال پیام جدید (جمعی و فردی)' : 'Send New Message / Notification'}</span>
                </h3>
                <p className="text-[10px] text-gray-400 border-b border-white/5 pb-4 mb-4">
                  {language === 'fa' 
                    ? 'از این بخش می‌توانید به کاربران به صورت فردی یا جمعی پیام ارسال کنید. همچنین با فعال‌سازی گزینه نوتیفیکیشن، پیام به صورت اعلان زنده ظاهر خواهد شد.' 
                    : 'Compose messages individually or broadcast collectively. Standard messages show up in the gamer\'s inbox.'}
                </p>

                <form onSubmit={handleSendMessage} className="flex flex-col gap-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs text-gray-400 block mb-1.5 font-bold">{language === 'fa' ? 'گیرنده پیام (کاربر هدف)' : 'Recipient'}</label>
                      <select
                        value={recipient}
                        onChange={(e) => setRecipient(e.target.value)}
                        className="w-full bg-[#0d122b] border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-primary font-bold"
                      >
                        <option value="All">{language === 'fa' ? '📢 همه‌ کاربران (ارسال جمعی)' : '📢 Broadcast to All'}</option>
                        {registeredUsers.map((u: any) => (
                          <option key={u.username} value={u.username}>
                            👤 {u.username} ({u.email || u.phone})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-xs text-gray-400 block mb-1.5 font-bold">{language === 'fa' ? 'موضوع پیام' : 'Message Title'}</label>
                      <input 
                        type="text" 
                        required
                        placeholder={language === 'fa' ? 'مثال: تاییدیه رزرو سیستم VIP' : 'e.g. VIP Reservation Confirmed'}
                        value={msgTitle}
                        onChange={(e) => setMsgTitle(e.target.value)}
                        className="w-full bg-[#0d122b] border border-white/10 rounded-lg px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-primary font-bold"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs text-gray-400 block mb-1.5 font-bold">{language === 'fa' ? 'متن پیام ارسالی' : 'Message Body'}</label>
                    <textarea 
                      required 
                      rows={4}
                      placeholder={language === 'fa' ? 'متن خود را در این بخش وارد کنید...' : 'Enter your message details...'}
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
                      {language === 'fa' ? '🔔 ارسال به عنوان نوتیفیکیشن فشاری زنده (Live Push Notification)' : '🔔 Send as Live Push Notification'}
                    </label>
                  </div>

                  <div className="flex justify-end border-t border-white/5 pt-4">
                    <button 
                      type="submit"
                      className="px-6 bg-primary hover:bg-primary-hover text-black py-2.5 rounded-lg text-xs font-black cursor-pointer flex items-center gap-1.5 border border-primary/20 shadow-[0_0_15px_rgba(0,240,255,0.2)] transition-all font-display uppercase tracking-wide"
                    >
                      <Send className="w-4 h-4" />
                      <span>{language === 'fa' ? 'ارسال پیام / نوتیفیکیشن' : 'Send Message'}</span>
                    </button>
                  </div>
                </form>
              </div>

              {/* Sent Messages History list */}
              <div className="bg-dark-card border border-white/10 rounded-2xl p-6">
                <h3 className="text-sm font-bold text-white flex items-center gap-2 mb-4 font-display uppercase tracking-wider">
                  <Mail className="w-4 h-4 text-emerald-400" />
                  <span>{language === 'fa' ? 'تاریخچه پیام‌های ارسال شده اخیر' : 'Sent Messages History Log'}</span>
                </h3>

                <div className="flex flex-col gap-3 max-h-[400px] overflow-y-auto scrollbar-thin">
                  {messagesList.length === 0 ? (
                    <div className="text-center py-8 text-gray-500 text-xs font-bold">
                      {language === 'fa' ? 'هیچ پیامی هنوز ارسال نشده است.' : 'No messages sent yet.'}
                    </div>
                  ) : (
                    messagesList.map((m: any) => (
                      <div key={m.id} className="p-4 bg-[#0d122b] border border-white/5 rounded-xl flex flex-col gap-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 rounded font-mono font-bold">
                            {language === 'fa' ? 'به: ' : 'To: '}{m.recipient === 'All' ? (language === 'fa' ? 'همه کاربران' : 'All Users') : `@${m.recipient}`}
                          </span>
                          <span className="text-[10px] text-gray-500 font-mono">{m.date}</span>
                        </div>
                        <h4 className="text-xs font-bold text-white mt-1">{m.title}</h4>
                        <p className="text-[11px] text-gray-400 font-medium leading-relaxed">{m.body}</p>
                        <div className="flex items-center gap-1.5 mt-1">
                          <span className={`w-1.5 h-1.5 rounded-full ${m.type === 'notification' ? 'bg-amber-400' : 'bg-blue-400'}`}></span>
                          <span className="text-[9px] text-gray-500 font-bold uppercase tracking-wider">
                            {m.type === 'notification' ? (language === 'fa' ? 'نوع: نوتیفیکیشن لایو' : 'Type: Live Notification') : (m.type === 'news' ? (language === 'fa' ? 'نوع: خبر بلاگ' : 'Type: Blog News') : (language === 'fa' ? 'نوع: صندوق پیام معمولی' : 'Type: Inbox Message'))}
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
                      <span>کدهای کلاس دایرکتوری EF Core Code-First Migration</span>
                    </h3>
                    <p className="text-[10px] text-gray-400 mt-1">تولید خودکار کدهای جدول دیتابیس رابطه‌ای SQL Server بر پایه Fluent API</p>
                  </div>

                  <button
                    onClick={copyMigrationsToClipboard}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#A855F7]/10 hover:bg-[#A855F7]/20 text-[#A855F7] border border-[#A855F7]/20 transition-all font-mono text-[10px] font-bold cursor-pointer"
                  >
                    <ClipboardCopy className="w-3.5 h-3.5" />
                    <span>کپی کلاس مهاجرت (Copy Migration)</span>
                  </button>
                </div>

                <div className="relative rounded-2xl overflow-hidden border border-white/10 bg-[#0d122b] p-5 font-mono text-[11px] leading-relaxed text-slate-300 text-left" style={{ direction: 'ltr' }}>
                  <div className="absolute top-3 right-3 text-slate-500 select-none text-[9px] bg-black/40 px-2.5 py-1 rounded-full border border-white/5 font-bold">
                    InitialGameNetDb.cs (C# Code First)
                  </div>
                  <pre className="overflow-x-auto max-h-[500px] whitespace-pre p-2 scrollbar-thin scrollbar-thumb-slate-800">
                    <code className="text-emerald-400 font-semibold block mb-2">// Migration Name: 20260714_InitialGameNetDb</code>
                    <code>{migrationsCode}</code>
                  </pre>
                </div>

                <div className="mt-4 p-4 rounded-xl bg-[#A855F7]/5 border border-[#A855F7]/20 text-[11px] leading-relaxed text-purple-300">
                  <p className="font-bold mb-1 flex items-center gap-2 text-white">
                    <span>💡 راهنمای پیکربندی پایگاه داده رابطه‌ای در دات‌نت:</span>
                  </p>
                  <p className="text-gray-400 text-[10px]">
                    کلاس بالا نمونه واقعی تولیدشده از کدهای طراحی‌شده مهاجرت (Code-First) جهت ایجاد پایگاه داده سیستم است. این کلاس تمامی ایندکس‌های منحصربه‌فرد برای فیلدهای ایمیل و کدهای تخفیف را ایجاد کرده و روابط کلید خارجی بین رزروها، غذاهای کافه، کاربران و تراکنش‌های باشگاه مشتریان را به درستی همراه با حذف آبشاری (Cascade Delete) پیکربندی می‌کند. برای ساخت کامل جداول کافیست پکیج <code className="text-[#06B6D4] font-mono">Microsoft.EntityFrameworkCore.SqlServer</code> را نصب کرده و دستور بروزرسانی را اجرا کنید.
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
                      <span>{language === 'fa' ? 'منبع داده سایت و اپلیکیشن' : 'Site & App Data Source'}</span>
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-mono font-bold border ${
                        dataSource === 'sample'
                          ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30'
                          : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                      }`}>
                        {dataSource === 'sample'
                          ? (language === 'fa' ? 'حالت نمونه (پیش‌فرض)' : 'SAMPLE MODE')
                          : (language === 'fa' ? 'حالت دیتابیس' : 'DATABASE MODE')}
                      </span>
                    </h3>
                    <p className="text-[10px] text-gray-400 mt-1">
                      {language === 'fa'
                        ? 'سایت و اپلیکیشن موبایل اطلاعات خود را از اینجا می‌گیرند. در حالت نمونه (پیش‌فرض) همه‌چیز از داده‌های آماده (۴-۵ مورد برای هر بخش) پر می‌شود؛ در حالت دیتابیس، جداول خالی به‌صورت خودکار از داده نمونه پر می‌شوند.'
                        : 'Site & mobile app read their data from here. In sample mode (default) everything is populated from ready-made data (4-5 items per section); in database mode, empty tables automatically fall back to sample data.'}
                    </p>
                  </div>
                  {isSwitchingDataSource && (
                    <span className="text-[10px] text-gray-400 font-mono flex items-center gap-2">
                      <span className="w-3.5 h-3.5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                      {language === 'fa' ? 'در حال تغییر...' : 'Switching...'}
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
                        <h5 className="font-black text-sm text-white">{language === 'fa' ? 'داده نمونه (Sample)' : 'Sample Data'}</h5>
                        <span className="text-[10px] text-cyan-400 font-bold">{language === 'fa' ? 'پیش‌فرض — بدون نیاز به دیتابیس' : 'Default — no database required'}</span>
                      </div>
                    </div>
                    <p className="text-xs text-gray-400 leading-relaxed font-semibold">
                      {language === 'fa'
                        ? 'همه بخش‌ها (سیستم‌ها، کافه، فروشگاه، مسابقات، بلاگ، اسلایدر، کد تخفیف و ...) از داده‌های آماده نمونه پر می‌شوند. مناسب نمایش و تست سایت.'
                        : 'All sections (systems, cafe, shop, tournaments, blog, sliders, coupons...) are populated from ready sample data. Ideal for demo & testing.'}
                    </p>
                    {dataSourceInfo && (
                      <div className="flex flex-wrap gap-1.5 pt-2 border-t border-white/5">
                        {Object.entries(dataSourceInfo.sample).map(([k, v]) => (
                          <span key={k} className="px-1.5 py-0.5 bg-black/30 border border-white/10 rounded text-[8px] font-mono text-gray-400">
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
                        <h5 className="font-black text-sm text-white">{language === 'fa' ? 'دیتابیس' : 'Database'}</h5>
                        <span className="text-[10px] text-emerald-400 font-bold">{language === 'fa' ? 'داده‌های واقعی ذخیره‌شده' : 'Real stored records'}</span>
                      </div>
                    </div>
                    <p className="text-xs text-gray-400 leading-relaxed font-semibold">
                      {language === 'fa'
                        ? 'سایت و اپ از رکوردهای واقعی دیتابیس می‌خوانند. اگر جدولی خالی باشد، به‌صورت خودکار از داده نمونه پر می‌شود تا سایت خالی نماند.'
                        : 'Site & app read from real database records. Empty tables automatically fall back to sample data so the site never looks empty.'}
                    </p>
                    {dataSourceInfo && (
                      <div className="flex flex-wrap gap-1.5 pt-2 border-t border-white/5">
                        {Object.entries(dataSourceInfo.database).map(([k, v]) => (
                          <span key={k} className="px-1.5 py-0.5 bg-black/30 border border-white/10 rounded text-[8px] font-mono text-gray-400">
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
                    {language === 'fa'
                      ? 'تغییر منبع داده بلافاصله روی سایت و اپلیکیشن موبایل اعمال می‌شود (بدون رفرش). سفارش‌ها، رزروها و ثبت‌نام‌ها در هر دو حالت در دیتابیس ذخیره می‌شوند.'
                      : 'Switching the data source applies to the site and mobile app immediately (no refresh). Orders, reservations and registrations are always stored in the database in both modes.'}
                  </span>
                </div>
              </div>

              {/* SECTION 1: SLIDER MANAGEMENT */}
              <div className="bg-dark-card border border-white/10 rounded-2xl p-6">
                <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2 font-display uppercase tracking-wider border-b border-white/5 pb-3">
                  <Sparkles className="w-4 h-4 text-emerald-400" />
                  <span>
                    {editingSlideId 
                      ? (language === 'fa' ? 'ویرایش اسلاید صفحه اصلی' : 'Edit Homepage Slider')
                      : (language === 'fa' ? 'بارگذاری و مدیریت اسلایدر صفحه اصلی' : 'Homepage Slider Management')}
                  </span>
                </h3>
                <p className="text-[10px] text-gray-400 mb-6">
                  {language === 'fa' 
                    ? 'در این بخش می‌توانید تصاویر، عناوین و لینک هدف دکمه‌های اسلایدر بالای صفحه اصلی وب‌سایت را بارگذاری، تغییر داده یا حذف کنید.' 
                    : 'Manage banners, title overlays, and navigation button targets for the main homepage hero slider. Upload, edit, or delete slides.'}
                </p>

                {/* Slider creation/edit form */}
                <form onSubmit={editingSlideId ? handleEditSlide : handleAddSlide} className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8 bg-black/30 p-4 rounded-xl border border-white/5">
                  <div className="md:col-span-2">
                    <label className="text-xs text-gray-400 block mb-1.5 font-bold">{language === 'fa' ? 'آدرس تصویر اسلاید' : 'Slider Image URL'}</label>
                    <input 
                      type="text" 
                      required 
                      placeholder="https://images.unsplash.com/photo-..."
                      value={newSlideUrl}
                      onChange={(e) => setNewSlideUrl(e.target.value)}
                      className="w-full bg-[#0d122b] border border-white/10 rounded-lg px-3.5 py-2 text-xs text-white focus:outline-none focus:border-primary font-mono"
                    />
                  </div>
                  
                  <div className="md:col-span-2 bg-emerald-500/5 border border-emerald-500/10 p-3 rounded-lg flex flex-col sm:flex-row items-center justify-between gap-3">
                    <div className="space-y-0.5">
                      <h4 className="text-[11px] font-bold text-emerald-400 flex items-center gap-1">
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>{language === 'fa' ? 'دستیار ترجمه هوش مصنوعی (جمینای)' : 'Gemini AI Translation Assistant'}</span>
                      </h4>
                      <p className="text-[10px] text-gray-400">
                        {language === 'fa' 
                          ? 'یکی از کادرها (مثلاً فارسی) را بنویسید، سپس روی دکمه مقابل کلیک کنید تا متن سایر زبان‌ها خودکار تولید و جایگذاری شود.' 
                          : 'Write either Persian or English, then click translate to generate all other languages automatically.'}
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
                        <span>{language === 'fa' ? 'تولید خودکار زبان‌ها' : 'Generate All Languages'}</span>
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="text-xs text-gray-400 block mb-1.5 font-bold">{language === 'fa' ? 'عنوان فارسی اسلاید' : 'Persian Title'}</label>
                    <input 
                      type="text" 
                      required 
                      placeholder="توضیحات جذاب کوتاه روی اسلاید"
                      value={newSlideTitleFa}
                      onChange={(e) => setNewSlideTitleFa(e.target.value)}
                      className="w-full bg-[#0d122b] border border-white/10 rounded-lg px-3.5 py-2 text-xs text-white focus:outline-none focus:border-primary font-bold"
                    />
                  </div>

                  <div>
                    <label className="text-xs text-gray-400 block mb-1.5 font-bold">{language === 'fa' ? 'عنوان انگلیسی اسلاید' : 'English Title'}</label>
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
                    <label className="text-xs text-gray-400 block mb-1.5 font-bold">{language === 'fa' ? 'عنوان روسی اسلاید' : 'Russian Title'}</label>
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
                    <label className="text-xs text-gray-400 block mb-1.5 font-bold">{language === 'fa' ? 'عنوان ترکی اسلاید' : 'Turkish Title'}</label>
                    <input 
                      type="text" 
                      required 
                      placeholder="Slide Turkish Title"
                      value={newSlideTitleTr}
                      onChange={(e) => setNewSlideTitleTr(e.target.value)}
                      className="w-full bg-[#0d122b] border border-white/10 rounded-lg px-3.5 py-2 text-xs text-white focus:outline-none focus:border-primary font-bold"
                    />
                  </div>

                  <div className="md:col-span-2 flex items-center gap-4">
                    <div className="flex-1">
                      <label className="text-xs text-gray-400 block mb-1.5 font-bold">{language === 'fa' ? 'هدایت به بخش (هدف کلیک)' : 'Button Click Target'}</label>
                      <select 
                        value={newSlideTarget}
                        onChange={(e) => setNewSlideTarget(e.target.value)}
                        className="w-full bg-[#0d122b] border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-primary font-bold"
                      >
                        <option value="reserve">{language === 'fa' ? 'سامانه رزرو سیستم‌ها' : 'Reservations'}</option>
                        <option value="cafe">{language === 'fa' ? 'سفارش آنلاین کافه بوفه' : 'Cafe & Buffet'}</option>
                        <option value="shop">{language === 'fa' ? 'فروشگاه تجهیزات گیمینگ' : 'Gaming Accessories Shop'}</option>
                        <option value="tournaments">{language === 'fa' ? 'تورنمنت‌ها و مسابقات فعال' : 'Active Tournaments'}</option>
                        <option value="blog">{language === 'fa' ? 'اخبار کلوپ و مقالات' : 'Blog'}</option>
                      </select>
                    </div>

                    <div className="flex gap-2 mt-6">
                      <button 
                        type="submit"
                        className="px-6 py-2 bg-primary hover:bg-primary-hover text-black font-black text-xs h-[38px] notched-clip-sm transition-all cursor-pointer"
                      >
                        {editingSlideId 
                          ? (language === 'fa' ? 'ذخیره تغییرات' : 'Save Changes') 
                          : (language === 'fa' ? 'افزودن اسلاید' : 'Add Slide')}
                      </button>
                      
                      {editingSlideId && (
                        <button 
                          type="button"
                          onClick={cancelEditSlide}
                          className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white font-black text-xs h-[38px] notched-clip-sm transition-all cursor-pointer"
                        >
                          {language === 'fa' ? 'انصراف' : 'Cancel'}
                        </button>
                      )}
                    </div>
                  </div>
                </form>

                {/* Sliders list */}
                <h4 className="text-xs font-bold text-white mb-3">{language === 'fa' ? 'اسلایدهای فعال کنونی' : 'Current Active Slides'}</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {appSliders.length === 0 ? (
                    <div className="col-span-2 text-center py-6 bg-black/20 border border-white/5 rounded-xl text-gray-500 text-xs">
                      {language === 'fa' ? 'هیچ اسلایدی یافت نشد.' : 'No sliders active.'}
                    </div>
                  ) : (
                    appSliders.map((slide) => (
                      <div key={slide.id} className="p-3 bg-[#0d122b] border border-white/5 rounded-xl flex gap-3 group relative overflow-hidden">
                        <img 
                          src={slide.imageUrl} 
                          alt={slide.titleFa} 
                          className="w-16 h-16 object-cover rounded-lg border border-white/10"
                          referrerPolicy="no-referrer"
                        />
                        <div className="flex-1 min-w-0">
                          <span className="text-[8px] px-2 py-0.5 bg-primary/20 text-primary border border-primary/20 rounded-full font-mono uppercase font-bold">
                            Target: {slide.target}
                          </span>
                          <h5 className="text-xs font-bold text-white mt-1 truncate" title={slide.titleFa}>{slide.titleFa}</h5>
                          <h6 className="text-[10px] text-gray-400 font-medium truncate" title={slide.titleEn}>{slide.titleEn}</h6>
                        </div>
                        <div className="absolute top-2 right-2 flex gap-1">
                          <button 
                            onClick={() => startEditSlide(slide)}
                            className="p-1 bg-blue-500/10 border border-blue-500/20 text-blue-400 hover:bg-blue-500 hover:text-white rounded transition-all cursor-pointer"
                            title={language === 'fa' ? 'ویرایش اسلاید' : 'Edit Slide'}
                          >
                            <Edit className="w-3 h-3" />
                          </button>
                          <button 
                            onClick={() => handleDeleteSlide(slide.id)}
                            className="p-1 bg-red-500/10 border border-red-500/20 text-red-500 hover:bg-red-500 hover:text-white rounded transition-all cursor-pointer"
                            title={language === 'fa' ? 'حذف اسلاید' : 'Delete Slide'}
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
                  <span>{language === 'fa' ? 'مدیریت و فعال‌سازی بخش‌های مختلف صفحه اصلی' : 'Homepage Section Config'}</span>
                </h3>
                <p className="text-[10px] text-gray-400 mb-6">
                  {language === 'fa' 
                    ? 'از این قسمت می‌توانید هر یک از بخش‌های بزرگ صفحه اصلی (مانند جدول نتایج، کلوپ مربیان و ...) را مخفی/نمایان کرده و متون، عناوین و توضیحات بالای آن‌ها را ویرایش کنید.' 
                    : 'Toggle structural homepage sections and customize their heading titles, subtitles, and introductory paragraphs dynamically.'}
                </p>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  {/* Sidebar select section */}
                  <div className="lg:col-span-4 flex flex-col gap-1.5">
                    <span className="text-[10px] text-gray-500 font-bold uppercase mb-2">{language === 'fa' ? 'انتخاب بخش جهت ویرایش' : 'Select Section to Edit'}</span>
                    {[
                      { key: 'genres', nameFa: '🎮 دسته‌بندی و ژانرهای بازی نو', nameEn: 'Game Genres' },
                      { key: 'services', nameFa: '🌟 سالن‌ها و خدمات ویژه کلوپ', nameEn: 'Lounge Services' },
                      { key: 'matches', nameFa: '🏆 جدول زنده نتایج مسابقات', nameEn: 'Live Match Results' },
                      { key: 'tournaments', nameFa: '🛡️ تورنمنت‌های فعال و ثبت‌نام سریع', nameEn: 'Tournaments Carousel' },
                      { key: 'pricing', nameFa: '💎 بسته‌های زمانی و کارت عضویت', nameEn: 'Pricing passes' },
                      { key: 'coaches', nameFa: '👤 مربیان حرفه‌ای و پرسنل', nameEn: 'Pro Coaches & Staff' },
                      { key: 'address', nameFa: '📍 نقشه و اطلاعات تماس کلوپ', nameEn: 'Address & Location Map' },
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
                        <span>{language === 'fa' ? sec.nameFa : sec.nameEn}</span>
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
                        <label className="text-[11px] text-gray-400 font-bold cursor-pointer select-none" htmlFor="secEnable">
                          {language === 'fa' ? 'وضعیت نمایش:' : 'Visibility:'}
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
                          {secIsEnabled ? (language === 'fa' ? 'فعال (نمایش)' : 'Enabled') : (language === 'fa' ? 'غیرفعال (مخفی)' : 'Hidden')}
                        </button>
                      </div>
                    </div>

                    {/* Translation Wizard Card */}
                    <div className="bg-emerald-500/5 border border-emerald-500/10 p-3 rounded-lg flex flex-col sm:flex-row items-center justify-between gap-3">
                      <div className="space-y-0.5">
                        <h4 className="text-[11px] font-bold text-emerald-400 flex items-center gap-1">
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>{language === 'fa' ? 'دستیار ترجمه هوش مصنوعی (جمینای)' : 'Gemini AI Translation Assistant'}</span>
                        </h4>
                        <p className="text-[10px] text-gray-400">
                          {language === 'fa' 
                            ? 'عنوان یا توضیحات بخش را به زبان فارسی یا انگلیسی بنویسید، سپس روی دکمه مقابل کلیک کنید تا متن سایر زبان‌ها خودکار تولید و جایگذاری شود.' 
                            : 'Write the title or description in Persian or English, then click to auto-translate into all other languages.'}
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
                          <span>{language === 'fa' ? 'ترجمه خودکار کل بخش' : 'Auto-Translate Section'}</span>
                        </button>
                      </div>
                    </div>

                    {/* Section Titles */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-[10px] text-gray-500 block mb-1 font-bold">{language === 'fa' ? 'عنوان بخش (فارسی)' : 'Section Title (FA)'}</label>
                        <input 
                          type="text"
                          value={secTitleFa}
                          onChange={(e) => setSecTitleFa(e.target.value)}
                          className="w-full bg-[#0d122b] border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#10B981] font-bold"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-gray-500 block mb-1 font-bold">{language === 'fa' ? 'عنوان بخش (انگلیسی)' : 'Section Title (EN)'}</label>
                        <input 
                          type="text"
                          value={secTitleEn}
                          onChange={(e) => setSecTitleEn(e.target.value)}
                          className="w-full bg-[#0d122b] border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#10B981] font-bold"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-gray-500 block mb-1 font-bold">{language === 'fa' ? 'عنوان بخش (روسی)' : 'Section Title (RU)'}</label>
                        <input 
                          type="text"
                          value={secTitleRu}
                          onChange={(e) => setSecTitleRu(e.target.value)}
                          className="w-full bg-[#0d122b] border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#10B981] font-bold"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-gray-500 block mb-1 font-bold">{language === 'fa' ? 'عنوان بخش (ترکی)' : 'Section Title (TR)'}</label>
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
                        <label className="text-[10px] text-gray-500 block mb-1 font-bold">{language === 'fa' ? 'متن توضیحات بالای بخش (فارسی)' : 'Section Subtitle / Description (FA)'}</label>
                        <textarea 
                          rows={3}
                          value={secDescFa}
                          onChange={(e) => setSecDescFa(e.target.value)}
                          className="w-full bg-[#0d122b] border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#10B981] font-medium leading-relaxed"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] text-gray-500 block mb-1 font-bold">{language === 'fa' ? 'متن توضیحات بالای بخش (انگلیسی)' : 'Section Subtitle / Description (EN)'}</label>
                        <textarea 
                          rows={3}
                          value={secDescEn}
                          onChange={(e) => setSecDescEn(e.target.value)}
                          className="w-full bg-[#0d122b] border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#10B981] font-medium leading-relaxed"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] text-gray-500 block mb-1 font-bold">{language === 'fa' ? 'متن توضیحات بالای بخش (روسی)' : 'Section Subtitle / Description (RU)'}</label>
                        <textarea 
                          rows={3}
                          value={secDescRu}
                          onChange={(e) => setSecDescRu(e.target.value)}
                          className="w-full bg-[#0d122b] border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#10B981] font-medium leading-relaxed"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] text-gray-500 block mb-1 font-bold">{language === 'fa' ? 'متن توضیحات بالای بخش (ترکی)' : 'Section Subtitle / Description (TR)'}</label>
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
                        <span>{language === 'fa' ? 'ذخیره تنظیمات بخش' : 'Save Section settings'}</span>
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
                  <span>{language === 'fa' ? 'افزودن و مدیریت شبکه‌های اجتماعی کلوپ' : 'Social Media Links Manager'}</span>
                </h3>
                <p className="text-[10px] text-gray-400 mb-6">
                  {language === 'fa' 
                    ? 'آدرس و پیوندهای شبکه‌های اجتماعی کلوپ (اینستاگرام، یوتیوب، تلگرام، توییتر و ...) را در این بخش اضافه، ویرایش یا حذف کنید تا در پاورقی وب‌سایت نمایش داده شوند.' 
                    : 'Manage active social channels and platforms that display in the club footer and main pages.'}
                </p>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                  {/* Social Link Form */}
                  <form onSubmit={editingSocialId ? handleEditSocialSubmit : handleAddSocial} className="md:col-span-5 bg-black/30 border border-white/5 rounded-xl p-4 space-y-3.5 h-fit">
                    <h4 className="text-xs font-bold text-white uppercase font-mono border-b border-white/5 pb-1.5">
                      {editingSocialId 
                        ? (language === 'fa' ? 'ویرایش پیوند اجتماعی' : 'Edit Social Link')
                        : (language === 'fa' ? 'افزودن لینک جدید' : 'Add Social Link')}
                    </h4>
                    
                    <div>
                      <label className="text-[10px] text-gray-400 block mb-1 font-bold">{language === 'fa' ? 'عنوان نمایشی' : 'Display Label Name'}</label>
                      <input 
                        type="text" 
                        required 
                        placeholder={language === 'fa' ? 'مثال: کانال تلگرام کلوپ' : 'e.g. Telegram Channel'}
                        value={newSocialName}
                        onChange={(e) => setNewSocialName(e.target.value)}
                        className="w-full bg-[#0d122b] border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-primary font-bold"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] text-gray-400 block mb-1 font-bold">{language === 'fa' ? 'پلتفرم شبکه‌ اجتماعی' : 'Social Platform'}</label>
                      <select 
                        value={newSocialPlatform}
                        onChange={(e) => setNewSocialPlatform(e.target.value)}
                        className="w-full bg-[#0d122b] border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-primary font-bold"
                      >
                        <option value="instagram">Instagram (اینستاگرام)</option>
                        <option value="telegram">Telegram (تلگرام)</option>
                        <option value="youtube">Youtube (یوتیوب)</option>
                        <option value="twitter">X / Twitter (توییتر)</option>
                        <option value="aparat">Aparat (آپارات)</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[10px] text-gray-400 block mb-1 font-bold">{language === 'fa' ? 'آدرس اینترنتی (URL)' : 'URL Address'}</label>
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
                          ? (language === 'fa' ? 'ذخیره تغییرات' : 'Save Changes') 
                          : (language === 'fa' ? 'افزودن لینک اجتماعی' : 'Add Social Link')}
                      </button>

                      {editingSocialId && (
                        <button
                          type="button"
                          onClick={cancelEditSocial}
                          className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white font-black text-xs notched-clip-sm transition-all h-[36px] cursor-pointer"
                        >
                          {language === 'fa' ? 'انصراف' : 'Cancel'}
                        </button>
                      )}
                    </div>
                  </form>

                  {/* Social links list */}
                  <div className="md:col-span-7 bg-[#0d122b]/40 border border-white/5 rounded-xl p-4 flex flex-col gap-3">
                    <h4 className="text-xs font-bold text-white uppercase font-mono border-b border-white/5 pb-1.5">{language === 'fa' ? 'لیست پیوندهای فعال' : 'Active Social Links'}</h4>
                    {socialMediaList.length === 0 ? (
                      <div className="text-center py-12 text-gray-500 text-xs font-bold">
                        {language === 'fa' ? 'هیچ لینک اجتماعی ثبت نشده است.' : 'No social links registered.'}
                      </div>
                    ) : (
                      <div className="flex flex-col gap-2 max-h-[300px] overflow-y-auto scrollbar-thin">
                        {socialMediaList.map((item) => (
                          <div key={item.id} className="p-3 bg-black/40 border border-white/5 rounded-xl flex items-center justify-between group">
                            <div className="flex items-center gap-2.5">
                              <span className="text-[9px] px-2 py-0.5 rounded bg-white/5 border border-white/10 text-primary font-mono font-bold uppercase">
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
                                title={language === 'fa' ? 'ویرایش لینک' : 'Edit Link'}
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteSocial(item.id)}
                                className="p-1.5 text-red-400 hover:text-white hover:bg-red-500/20 rounded-md transition-all cursor-pointer border border-transparent hover:border-red-500/30"
                                title={language === 'fa' ? 'حذف لینک' : 'Delete Link'}
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
                  <span>{language === 'fa' ? 'ویرایش مشخصات تماس و برندینگ کلوپ' : 'Club Branding & Support Details'}</span>
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-gray-400 block mb-1.5 font-bold">{language === 'fa' ? 'تلفن پشتیبانی کلوپ' : 'Support Phone line'}</label>
                    <input 
                      type="text" 
                      placeholder="۰۲۱-۲۲۴۴۶۶۸۸"
                      value={siteSettings['club_phone'] || '۰۲۱-۲۲۴۴۶۶۸۸'}
                      onChange={(e) => handleSaveSetting('club_phone', e.target.value)}
                      className="w-full bg-[#0d122b] border border-white/10 rounded-lg px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-[#10B981] font-mono font-bold"
                    />
                  </div>
                  
                  <div>
                    <label className="text-xs text-gray-400 block mb-1.5 font-bold">{language === 'fa' ? 'ساعت‌های عملیاتی' : 'Operational Working Hours'}</label>
                    <input 
                      type="text" 
                      placeholder="۲۴ ساعته شبانه‌روز (۷ روز هفته)"
                      value={siteSettings['club_hours'] || (language === 'fa' ? '۲۴ ساعته شبانه‌روز (۷ روز هفته)' : 'Open 24/7 (Non-stop)')}
                      onChange={(e) => handleSaveSetting('club_hours', e.target.value)}
                      className="w-full bg-[#0d122b] border border-white/10 rounded-lg px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-[#10B981] font-bold"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="text-xs text-gray-400 block mb-1.5 font-bold">{language === 'fa' ? 'آدرس فیزیکی کلوپ' : 'Lounge Physical Address'}</label>
                    <input 
                      type="text" 
                      placeholder="تهران، اتوبان صدر، خیابان شریعتی، بن‌بست پلاک ۲۴، مجتمع تجاری بازی نو، طبقه منفی ۱"
                      value={siteSettings['club_address'] || (language === 'fa' ? 'تهران، اتوبان صدر، خیابان شریعتی، بن‌بست پلاک ۲۴، مجتمع تجاری بازی نو، طبقه منفی ۱' : 'Level -1, BAZINO Plaza, No. 24, Shariati St., Sadr Hwy, Tehran')}
                      onChange={(e) => handleSaveSetting('club_address', e.target.value)}
                      className="w-full bg-[#0d122b] border border-white/10 rounded-lg px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-[#10B981] font-bold"
                    />
                  </div>
                </div>
              </div>

              {/* SECTION 5: FACTORY RESET & DATABASE PURGE */}
              <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-6 space-y-6">
                <div className="space-y-1">
                  <h3 className="text-sm font-black text-red-400 flex items-center gap-2">
                    <span>⚠️</span>
                    <span>{language === 'fa' ? 'مدیریت و کنترل داده‌های پایگاه داده (دیتابیس)' : 'Database Data Control & Administration'}</span>
                  </h3>
                  <p className="text-[10px] text-gray-400 leading-relaxed font-semibold">
                    {language === 'fa' 
                      ? 'در این بخش می‌توانید اطلاعات نمونه سایت را پاک‌سازی کرده یا کل کلوپ را به تنظیمات و داده‌های نمونه پیش‌فرض ریست کنید.' 
                      : 'Reset the lounge database to default factory sample data or completely purge all data to start with a blank canvas.'}
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-4">
                  {/* Reseed Option */}
                  <div className="flex-1 bg-black/30 p-4 rounded-xl border border-white/5 flex flex-col justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-white mb-1">
                        {language === 'fa' ? '۱. بازنشانی و نصب مجدد اطلاعات نمونه' : '1. Reset & Seed Sample Data'}
                      </h4>
                      <p className="text-[10px] text-gray-400 mb-4 leading-normal">
                        {language === 'fa'
                          ? 'تنظیمات، کدهای تخفیف، تورنمنت‌ها و محصولات پیش‌فرض اولیه کلوپ مجدداً نصب خواهند شد.'
                          : 'Restore original pre-populated tournament tables, products, blog items, and settings.'}
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
                      <span>{language === 'fa' ? 'حذف و بازنشانی به داده نمونه' : 'Reset & Reseed DB'}</span>
                    </button>
                  </div>

                  {/* Clean Slate Purge Option */}
                  <div className="flex-1 bg-black/30 p-4 rounded-xl border border-white/5 flex flex-col justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-white mb-1">
                        {language === 'fa' ? '۲. پاک‌سازی کامل تمام اطلاعات نمونه و تصاویر (شروع از صفر)' : '2. Complete Database Purge (Blank Slate)'}
                      </h4>
                      <p className="text-[10px] text-gray-400 mb-4 leading-normal">
                        {language === 'fa'
                          ? 'تمامی بازی‌ها، اخبار، محصولات، رزروها، اسلایدرها و عکس‌ها کاملاً حذف شده و دیتابیس کاملاً سفید می‌شود.'
                          : 'Permanently wipe all records, sliders, custom posts, and images. Starts with a clean empty database.'}
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
                      <span>{language === 'fa' ? 'پاک‌سازی کل اطلاعات دیتابیس' : 'Completely Purge DB'}</span>
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
                      <span>{language === 'fa' ? 'لاگ موتور دیتابیس فعال' : 'Active Database Provider Logs'}</span>
                    </h3>
                    <p className="text-[11px] text-gray-400 mt-1">
                      {language === 'fa' 
                        ? 'مشاهده لاگ درخواست‌ها، دستورات SQL یا فرامین NoSQL (MongoDB) و مدت زمان اجرای آن‌ها' 
                        : 'Review native SQL / NoSQL operations executed by the current BaseDataProvider.'}
                    </p>
                  </div>
                  <button
                    onClick={async () => {
                      try {
                        const r = await fetch('/api/admin/db-logs').then(res => res.json());
                        if (r.logs) setDbLogsList(r.logs);
                        addNotification(language === 'fa' ? 'لاگ‌ها بروزرسانی شدند' : 'Logs updated', 'success');
                      } catch (e) {}
                    }}
                    className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-black text-xs font-black rounded-lg transition-all flex items-center gap-1.5 cursor-pointer font-display"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>{language === 'fa' ? 'بروزرسانی لاگ‌ها' : 'Refresh Logs'}</span>
                  </button>
                </div>

                {/* DB Logs list */}
                <div className="bg-black/80 border border-white/5 rounded-xl p-4 font-mono text-xs max-h-[500px] overflow-y-auto scrollbar-thin space-y-2 text-left" dir="ltr">
                  {dbLogsList.length === 0 ? (
                    <div className="text-center py-12 text-gray-500 font-bold uppercase tracking-wider">
                      {language === 'fa' ? 'هیچ لاگی در سیستم ثبت نشده است.' : 'No database queries logged yet.'}
                    </div>
                  ) : (
                    dbLogsList.map((log: any, idx: number) => (
                      <div key={idx} className="p-2.5 bg-white/5 border-l-2 border-emerald-500 rounded-r-lg space-y-1.5 hover:bg-white/10 transition-all">
                        <div className="flex justify-between items-center text-[10px]">
                          <div className="flex items-center gap-2">
                            <span className="px-1.5 py-0.5 bg-emerald-950 text-emerald-400 rounded border border-emerald-900 font-bold">
                              {log.provider}
                            </span>
                            <span className={`px-1.5 py-0.5 rounded text-[9px] font-black uppercase ${
                              log.operation === 'INSERT' || log.operation === 'UPDATE' ? 'bg-amber-950 text-amber-400' :
                              log.operation === 'SELECT' ? 'bg-blue-950 text-blue-400' : 'bg-purple-950 text-purple-400'
                            }`}>
                              {log.operation}
                            </span>
                          </div>
                          <span className="text-gray-500 font-mono">{log.timestamp}</span>
                        </div>
                        <p className="text-gray-300 font-mono text-[11px] leading-relaxed break-words">{log.query}</p>
                        {log.params && log.params.length > 0 && (
                          <div className="text-[10px] text-gray-500 font-mono bg-black/40 p-1 rounded">
                            Parameters: <span className="text-gray-400">{JSON.stringify(log.params)}</span>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {activeSubTab === 'apiKeys' && (
            <div className="animate-fade-in space-y-6">
              <div className="bg-dark-card border border-white/10 rounded-2xl p-6">
                <div className="flex justify-between items-center mb-6 border-b border-white/5 pb-4">
                  <div>
                    <h3 className="text-lg font-black text-white flex items-center gap-2 font-display uppercase tracking-wider">
                      <Key className="w-5 h-5 text-blue-500 animate-pulse" />
                      <span>{language === 'fa' ? 'تنظیمات API Key ها' : 'API Keys Settings'}</span>
                    </h3>
                    <p className="text-[11px] text-gray-400 mt-1">
                      {language === 'fa' 
                        ? 'مدیریت کلیدهای امنیتی برای ارتباط با سرویس‌های خارجی مانند هوش مصنوعی' 
                        : 'Manage security keys for integrating with external services like AI.'}
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="bg-black/40 border border-blue-500/20 rounded-xl p-5">
                    <h4 className="text-sm font-bold text-white mb-2 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                      Gemini AI API Key
                    </h4>
                    <p className="text-xs text-gray-400 mb-4 leading-relaxed">
                      {language === 'fa' ? (
                        <>
                          برای فعال‌سازی قابلیت‌های هوش مصنوعی (مانند ربات Jarvis و ترجمه خودکار متن)، سیستم نیازمند <strong className="text-white">Gemini API Key</strong> است. این کلید به‌صورت خودکار در سرور توسط محیط AI Studio تزریق می‌شود، اما باید آن را از سایت گوگل دریافت کرده و در پنل مدیریت محیط تنظیم کنید.
                        </>
                      ) : (
                        <>
                          To enable AI features (like the Jarvis assistant and auto-translations), the system requires a <strong className="text-white">Gemini API Key</strong>. This key is automatically injected by the AI Studio environment, but you need to obtain it from Google and configure it in the platform.
                        </>
                      )}
                    </p>

                    <div className="bg-[#0a0e21] border border-white/5 p-4 rounded-lg">
                      <h5 className="text-[11px] font-bold text-blue-400 uppercase tracking-wider mb-3">
                        {language === 'fa' ? 'راهنمای دریافت و ثبت کلید' : 'How to get and set the key'}
                      </h5>
                      <ol className="list-decimal list-inside text-xs text-gray-300 space-y-2 leading-loose">
                        {language === 'fa' ? (
                          <>
                            <li>به سایت <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" className="text-blue-400 hover:underline font-mono">aistudio.google.com</a> مراجعه کنید.</li>
                            <li>با اکانت گوگل خود وارد شوید و یک API Key جدید بسازید (Create API Key).</li>
                            <li>کلید ساخته شده را کپی کنید (شبیه به <code className="text-emerald-400 font-mono bg-black px-1 py-0.5 rounded">AIzaSy...</code>).</li>
                            <li>در همین محیط (AI Studio)، روی دکمه <strong>Settings</strong> (آیکون چرخ‌دنده در منوی پلتفرم) کلیک کنید.</li>
                            <li>به بخش <strong>Secrets</strong> بروید.</li>
                            <li>یک Secret جدید با نام دقیق <code className="text-amber-400 font-mono bg-black px-1 py-0.5 rounded">GEMINI_API_KEY</code> بسازید.</li>
                            <li>مقدار کلید کپی شده را در آن قرار داده و ذخیره کنید.</li>
                            <li>ممکن است نیاز باشد یک بار کانتینر اپلیکیشن مجددا راه‌اندازی (Restart) شود.</li>
                          </>
                        ) : (
                          <>
                            <li>Go to <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" className="text-blue-400 hover:underline font-mono">aistudio.google.com</a>.</li>
                            <li>Log in with your Google account and click "Create API Key".</li>
                            <li>Copy the generated key (looks like <code className="text-emerald-400 font-mono bg-black px-1 py-0.5 rounded">AIzaSy...</code>).</li>
                            <li>In this platform (AI Studio), click the <strong>Settings</strong> button (gear icon).</li>
                            <li>Navigate to the <strong>Secrets</strong> section.</li>
                            <li>Create a new secret with the exact name <code className="text-amber-400 font-mono bg-black px-1 py-0.5 rounded">GEMINI_API_KEY</code>.</li>
                            <li>Paste the copied key as its value and save.</li>
                            <li>You might need to restart the application container for the changes to take effect.</li>
                          </>
                        )}
                      </ol>
                    </div>

                    <div className="mt-4 p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg text-[11px] text-blue-200 flex items-start gap-2">
                      <FileText className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                      <p>
                        {language === 'fa' 
                          ? 'توجه: به دلایل امنیتی، هرگز نباید API Key را مستقیماً در کدهای کلاینت قرار دهید. ما از طریق متغیر محیطی (Environment Variable) در سمت سرور این کلید را فراخوانی می‌کنیم تا امنیت حفظ شود.'
                          : 'Note: For security reasons, you should never put the API Key directly in client-side code. We access it securely via environment variables on the backend.'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
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
