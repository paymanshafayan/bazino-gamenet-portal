import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Tournament } from '../types/gamenet';
import { useLanguage } from '../context/LanguageContext';
import GamingAmpHome from './GamingAmpHome';
import GecoPurpleHome from './GecoPurpleHome';
import { hasComponent, mountComponent, unmountComponent } from '../themeSdk/sdk';
import { 
  Gamepad2, 
  Tv, 
  Utensils, 
  ShoppingBag, 
  Trophy, 
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
  Award
} from 'lucide-react';

interface Props {
  themeId?: string;
  tournaments: Tournament[];
  onNavigate: (tab: 'loyalty' | 'reservations' | 'cafe' | 'shop' | 'tournaments' | 'blog' | 'csharp') => void;
  /** قالب‌های دارای کامپوننت اختصاصی (theme.js) — اطلاعات از App می‌آید */
  themeComponent?: { cssUrl: string; assetsBase: string } | null;
}

export default function HomeTab({ tournaments, onNavigate, themeId, themeComponent,
}: Props) {
  const { language, dir, t } = useLanguage();


  const [activeBanner, setActiveBanner] = useState(0);
  const [activeTournamentSlide, setActiveTournamentSlide] = useState(0);
  const tournamentRefs = useRef<(HTMLDivElement | null)[]>([]);
  const tournamentContainerRef = useRef<HTMLDivElement | null>(null);

  const [siteSettings, setSiteSettings] = useState<Record<string, string>>({});
  const [appSliders, setAppSliders] = useState<any[]>([]);
  const themeComponentHostRef = useRef<HTMLDivElement | null>(null);
  const [themeComponentVersion, setThemeComponentVersion] = useState(0);
  // بارگذاری theme.js قالب (فقط وقتی قالب کامپوننت دارد)
  useEffect(() => {
    if (!themeComponent) return;
    let cancelled = false;
    const script = document.createElement('script');
    script.src = themeComponent.cssUrl.replace(/\/theme\.css$/, '/theme.js');
    script.async = true;
    script.onload = () => {
      if (!cancelled) setThemeComponentVersion(v => v + 1);
    };
    script.onerror = () => {
      console.warn('[ThemeSDK] theme.js failed to load:', script.src);
    };
    document.body.appendChild(script);
    return () => {
      cancelled = true;
      if (script.parentNode) script.parentNode.removeChild(script);
    };
  }, [themeComponent]);



  const getSocialLinks = () => {
    try {
      if (siteSettings['social_media_links']) {
        return JSON.parse(siteSettings['social_media_links']);
      }
    } catch (e) {
      console.error('Failed to parse social links on home:', e);
    }
    return [
      { id: '1', name: language === 'fa' ? 'اینستاگرام کلوپ' : 'Instagram', platform: 'instagram', url: 'https://instagram.com/bazino' },
      { id: '2', name: language === 'fa' ? 'کانال تلگرام' : 'Telegram', platform: 'telegram', url: 'https://t.me/bazino' },
      { id: '3', name: language === 'fa' ? 'یوتیوب کلوپ' : 'Youtube', platform: 'youtube', url: 'https://youtube.com/bazino' }
    ];
  };

  const getSocialIcon = (platform: string) => {
    switch (platform.toLowerCase()) {
      case 'instagram': return <Instagram className="w-4 h-4" />;
      case 'telegram': return <Send className="w-4 h-4" style={{ transform: 'rotate(-25deg)' }} />;
      case 'youtube': return <Youtube className="w-4 h-4" />;
      case 'twitter':
      case 'x': return <Twitter className="w-4 h-4" />;
      default: return <Compass className="w-4 h-4" />;
    }
  };

  useEffect(() => {
    Promise.all([
      fetch('/api/settings').then(r => r.json()).catch(() => ({})),
      fetch('/api/app-sliders').then(r => r.json()).catch(() => [])
    ]).then(([settingsData, slidersData]) => {
      setSiteSettings(settingsData || {});
      if (slidersData && slidersData.length > 0) {
        setAppSliders(slidersData);
      }
    }).catch(err => console.error('Error fetching settings/sliders:', err));
  }, []);

  // Auto-slide game banners
  useEffect(() => {
    if (typeof featuredGames === 'undefined' || featuredGames.length === 0) return;
    const interval = setInterval(() => {
      setActiveBanner((prev) => (prev + 1) % featuredGames.length);
    }, 6000);
    return () => clearInterval(interval);
  }, []);

  // Auto-slide tournaments
  useEffect(() => {
    if (tournaments.length === 0) return;
    const interval = setInterval(() => {
      setActiveTournamentSlide((prev) => (prev + 1) % tournaments.length);
    }, 4500);
    return () => clearInterval(interval);
  }, [tournaments.length]);

  // Smooth scroll active tournament horizontally
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
      
      container.scrollTo({
        left: targetScrollLeft,
        behavior: 'smooth'
      });
    }
  }, [activeTournamentSlide]);

  const getTournamentImage = (game: string) => {
    const lowercaseGame = game.toLowerCase();
    if (lowercaseGame.includes('cs') || lowercaseGame.includes('counter')) {
      return 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=800&q=80';
    }
    if (lowercaseGame.includes('fifa') || lowercaseGame.includes('soccer') || lowercaseGame.includes('football')) {
      return 'https://images.unsplash.com/photo-1606144042614-b2417e99c4e3?auto=format&fit=crop&w=800&q=80';
    }
    if (lowercaseGame.includes('dota') || lowercaseGame.includes('lol') || lowercaseGame.includes('league')) {
      return 'https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&w=800&q=80';
    }
    return 'https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&w=800&q=80';
  };


  

  // Featured game slides data (styled in GamingAMP style)
  const featuredGames = [
    {
      id: 'cs2',
      title: {
        fa: 'مسابقات بزرگ کانتر استرایک ۲',
        en: 'Counter-Strike 2 Global Cup',
        ru: 'Турнир Counter-Strike 2',
        tr: 'Büyük Counter-Strike 2 Turnuvası'
      },
      desc: {
        fa: 'فریم‌ریت بی‌نهایت و پینگ تک‌رقمی را در سالن مجهز به سیستم‌های RTX 5080 تجربه کنید. تیم تشکیل دهید، در براکت ثبت‌نام کنید و قهرمان شوید.',
        en: 'Experience absolute low latency and infinite frames with NVIDIA RTX 5080 rigs. Form your squad, join the tournament brackets, and win cash pools.',
        ru: 'Испытайте безупречный FPS и минимальный пинг на игровых ПК с картами RTX 5080. Создайте команду и побеждайте в турнирах.',
        tr: 'NVIDIA RTX 5080 sistemlerimizle yüksek kare hızı ve tek haneli pingi deneyimleyin. Takımınızı kurun, turnuvaya katılın ve şampiyon olun.'
      },
      imageUrl: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=1200&q=80',
      badge: 'FPS GLOBAL CHALLENGE'
    },
    {
      id: 'dota2',
      title: {
        fa: 'دوتا ۲ - مبارزه نهایی جاودانه‌ها',
        en: 'Dota 2 - Battle of the Ancients',
        ru: 'Dota 2 - Битва за Древних',
        tr: 'Dota 2 - Kadimlerin Savaşı'
      },
      desc: {
        fa: 'رقابتی‌ترین ورزش الکترونیک جهان را در بازی نو با مانیتورهای ۳۶۰ هرتز تجربه کنید. نبردهای تیمی با استراتژی دقیق و جوایز باشگاه وفاداری.',
        en: 'Play the world\'s premiere MOBA at BAZINO with elite ROG 360Hz monitors. Team-oriented gameplay with physical rewards and pro training.',
        ru: 'Играйте в лучшую MOBA-игру мира на новейших мониторах ROG 360 Гц. Командные сражения с физическими призами и поддержкой тренеров.',
        tr: 'BAZINO\'ta elit ROG 360Hz monitörlerle dünyanın en çok tercih edilen MOBA oyununu oynayın. Harika ödüllü takım savaşları sizi bekliyor.'
      },
      imageUrl: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&w=1200&q=80',
      badge: 'MOBA ARENA PRO'
    },
    {
      id: 'fifa26',
      title: {
        fa: 'فیفا ۲۶ - اتاق‌های VIP کنسول ال‌جی',
        en: 'FIFA 26 - Ultimate Console Rivals',
        ru: 'FIFA 26 - Лучшие консольные дуэли',
        tr: 'FIFA 26 - En Büyük Konsol Rekabeti'
      },
      desc: {
        fa: 'اتاق‌های VIP مجهز به پلی‌استیشن ۵ و تلویزیون‌های بزرگ ۸۵ اینچی ال‌جی OLED. هیجان داغ فوتبال را با رفقا در دنج‌ترین کلوپ تجربه کنید.',
        en: 'VIP Booths featuring PlayStation 5 and massive LG OLED 85-inch screens. Experience ultimate soccer rivalries in cozy, high-tech lounge booths.',
        ru: 'Консольные VIP-кабины с PS5 и большими 85" телевизорами LG OLED. Сражайтесь с друзьями в уютной атмосфере киберклуба.',
        tr: 'PlayStation 5 ve devasa LG OLED 85 inç ekranlı VIP kabinler. En konforlu lounge alanında arkadaşlarınızla futbol heyecanını yaşayın.'
      },
      imageUrl: 'https://images.unsplash.com/photo-1606144042614-b2417e99c4e3?auto=format&fit=crop&w=1200&q=80',
      badge: 'VIP CONSOLE ROOM'
    }
  ];

  // GamingAMP Signature Section: Choose Your Story / Game Genres
  const gameGenres = [
    {
      id: 'shooters',
      title: {
        fa: 'شوتینگ و تاکتیکال',
        en: 'Tactical Shooters',
        ru: 'Тактические шутеры',
        tr: 'Taktiksel Nişancılar'
      },
      subtitle: {
        fa: 'نبرد هیجان‌انگیز ۵به۵ با پینگ صفر',
        en: 'Intense 5v5 FPS showdowns',
        ru: 'Захватывающие бои 5 на 5',
        tr: 'Nefes kesen 5v5 FPS düelloları'
      },
      imageUrl: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=600&q=80',
      tag: 'FPS AREA',
      games: 'CS2, Valorant, Apex Legends'
    },
    {
      id: 'rpg',
      title: {
        fa: 'جهان باز و داستانی',
        en: 'RPG & Open Worlds',
        ru: 'RPG и открытые миры',
        tr: 'RPG ve Açık Dünyalar'
      },
      subtitle: {
        fa: 'غرق در روایت‌های حماسی جهان بازی',
        en: 'Immersive stories & high detail',
        ru: 'Глубокие сюжеты и графика',
        tr: 'Sürükleyici hikayeler ve grafikler'
      },
      imageUrl: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&w=600&q=80',
      tag: 'RTX ULTRA',
      games: 'Cyberpunk, Elden Ring, Witcher 3'
    },
    {
      id: 'moba',
      title: {
        fa: 'استراتژی تیمی و موبا',
        en: 'MOBA & Strategy',
        ru: 'MOBA и стратегии',
        tr: 'MOBA ve Strateji'
      },
      subtitle: {
        fa: 'تفکر سریع تاکتیکال و هماهنگی کلن',
        en: 'Rapid tactics & team bootcamp',
        ru: 'Быстрые тактики и игра в клане',
        tr: 'Hızlı taktikler ve takım oyunu'
      },
      imageUrl: 'https://images.unsplash.com/photo-1553481187-be93c21490a9?auto=format&fit=crop&w=600&q=80',
      tag: 'TACTICAL ZONE',
      games: 'Dota 2, League of Legends, SC2'
    },
    {
      id: 'sports',
      title: {
        fa: 'ورزشی و مسابقه‌ای',
        en: 'Sports & Racing',
        ru: 'Спорт и автогонки',
        tr: 'Spor ve Yarış'
      },
      subtitle: {
        fa: 'رقابت نفس‌گیر روی کاناپه‌های چرمی',
        en: 'High speed console action',
        ru: 'Скоростные дуэли на консолях',
        tr: 'Derbi heyecanı ve yüksek hız'
      },
      imageUrl: 'https://images.unsplash.com/photo-1606144042614-b2417e99c4e3?auto=format&fit=crop&w=600&q=80',
      tag: 'VIP LOUNGE',
      games: 'FIFA 26, Forza Horizon, NBA 2K'
    }
  ];

  // GamingAMP Signature Section: Match Results Board
  const matchHistory = [
    {
      id: 'm1',
      title: { fa: 'کاپ هفتگی کلن‌های دوتا ۲', en: 'Dota 2 Arena Weekly Cup', ru: 'Еженедельный кубок Dota 2', tr: 'Dota 2 Haftalık Arena Kupası' },
      teamA: 'VIP Gladiators',
      teamB: 'Persian Hawks',
      scoreA: 2,
      scoreB: 1,
      status: 'Finished', // Finished, Live, Scheduled
      time: '۱۴۰۵/۰۴/۱۴',
      game: 'Dota 2'
    },
    {
      id: 'm2',
      title: { fa: 'لیگ انتخابی کانتر استرایک ۲', en: 'CS2 Pro League Selection', ru: 'Отбор в Про-Лигу CS2', tr: 'CS2 Pro Lig Eleme Mücadeleleri' },
      teamA: 'Zero Ping',
      teamB: 'Cyber Storm',
      scoreA: 14,
      scoreB: 10,
      status: 'Live',
      time: 'زنده - راند ۲۵',
      game: 'CS2'
    },
    {
      id: 'm3',
      title: { fa: 'جام قهرمانی باشگاه‌های فیفا ۲۶', en: 'FIFA 26 Club Championship', ru: 'Клубный чемпионат FIFA 26', tr: 'FIFA 26 Kulüpler Şampiyonası' },
      teamA: 'Barca King',
      teamB: 'Real Madrid Fan',
      scoreA: 0,
      scoreB: 0,
      status: 'Scheduled',
      time: 'امروز ساعت ۲۱:۰۰',
      game: 'FIFA 26'
    }
  ];

  // GamingAMP Signature Section: Lounge Pricing / Membership Passes
  const pricingPackages = [
    {
      id: 'silver',
      title: { fa: 'پکیج نقره‌ای کلوپ', en: 'Silver Pass Ticket', ru: 'Серебряный билет', tr: 'Gümüş Üye Paketi' },
      price: 70000,
      duration: { fa: '۳ ساعت بازی با سیستم استاندارد', en: '3 Hours Standard PC Time', ru: '3 часа на стандартном ПК', tr: '3 Saat Standart PC Oyunu' },
      features: [
        { fa: 'سیستم‌های گیمینگ مجهز به RTX 4060', en: 'RTX 4060 Powered Gaming Rig', ru: 'Игровой ПК на RTX 4060', tr: 'RTX 4060 Güçlü Oyuncu Masası' },
        { fa: 'صندلی‌های گیمینگ کاملاً ارگونومیک', en: 'Full Ergonomic Esports Chairs', ru: 'Эргономичные кресла', tr: 'Konforlu Ergonomik Koltuklar' },
        { fa: '۱ نوشیدنی خنک بوفه به انتخاب شما', en: '1 Free Soft Drink from Buffet', ru: '1 бесплатный напиток из буфета', tr: 'Büfeden 1 Ücretsiz Soğuk İçecek' },
        { fa: 'پینگ فوق‌العاده پایین و هدست حرفه‌ای', en: 'Low Ping & Standard Gear', ru: 'Низкий пинг и наушники', tr: 'Düşük Gecikme ve Kaliteli Kulaklık' }
      ],
      popular: false
    },
    {
      id: 'gold',
      title: { fa: 'بلیط طلایی VIP آرنا (پیشنهادی)', en: 'Gold VIP Arena Pass', ru: 'Золотой VIP билет', tr: 'Altın VIP Arena Kartı' },
      price: 150000,
      duration: { fa: '۵ ساعت بازی با سیستم فوق‌حرفه ای', en: '5 Hours VIP PC Time + Double Pts', ru: '5 часов VIP-ПК + Двойные баллы', tr: '5 Saat VIP PC + Çift Sadakat Puanı' },
      features: [
        { fa: 'دسترسی به هیولاهای گرافیکی RTX 5080', en: 'Elite RTX 5080 Extreme Rigs', ru: 'Элитный ПК на RTX 5080', tr: 'Canavar Grafik Kartlı RTX 5080' },
        { fa: 'مانیتورهای فوق‌سریع ۳۶۰ هرتز ASUS', en: 'ASUS ROG 360Hz Monitors', ru: 'Мониторы ASUS ROG 360 Гц', tr: 'ASUS ROG 360Hz Akıcı Monitörler' },
        { fa: '۱ نوشابه انرژی‌زا ردبول سرد هدیه', en: '1 Free Ice Cold RedBull Can', ru: '1 холодная банка RedBull в подарок', tr: '1 Adet Buz Gibi RedBull Hediyesi' },
        { fa: 'دریافت ۲ برابر امتیاز وفاداری بیشتر', en: '2x Loyalty Points Booster Reward', ru: 'В 2 раза больше баллов лояльности', tr: 'Siparişlerde 2 Kat Fazla Sadakat Puanı' }
      ],
      popular: true
    },
    {
      id: 'squad',
      title: { fa: 'پکیج شبانه تیمی (Night-Pass)', en: 'Night-Owl Squad Ticket', ru: 'Ночной командный абонемент', tr: 'Gece Kuşu Takım Bileti' },
      price: 190000,
      duration: { fa: '۸ ساعت کامل (۱۲ شب الی ۸ صبح)', en: '8 Hours (Midnight to 8 AM)', ru: '8 часов (с полночи до 8 утра)', tr: '8 Saat (Gece Yarısı - 08:00)' },
      features: [
        { fa: 'انتخاب هر کدام از سیستم‌های VIP/معمولی', en: 'Access Any Standard or VIP System', ru: 'Доступ к любому ПК (VIP/Стандарт)', tr: 'VIP veya Standart Fark Etmeden Erişim' },
        { fa: 'اسلایس پیتزا پپرونی داغ به همراه قهوه اسپرسو', en: '1 Hot Pepperoni Slice + Double Espresso', ru: '1 слайс пепперони + двойной эспрессо', tr: '1 Dilim Pizza + Çift Shot Espresso' },
        { fa: 'پینگ تک‌رقمی و اینترنت فیبر نوری اختصاصی', en: 'Single-digit ping, fiber internet', ru: 'Минимальный пинг, выделенный интернет', tr: 'Özel Fiber İnternet ve Sabit Ping' },
        { fa: 'محیط دنج و هماهنگ مخصوص تمرین کلن', en: 'Perfect for local Clan Training sessions', ru: 'Идеально для тренировки клана', tr: 'Takım Antrenmanları İçin Kusursuz Ortam' }
      ],
      popular: false
    }
  ];

  // GamingAMP Signature Section: Meet Our Experts / Coaches
  const staffTeam = [
    {
      id: 'sina',
      name: { fa: 'سینا رضایی', en: 'Sina Razavi', ru: 'Сина Разави', tr: 'Sina Razavi' },
      gamerTag: 'Apex_C',
      role: { fa: 'سرمربی ارشد کانتر استرایک ۲', en: 'Head CS2 Coach', ru: 'Старший тренер CS2', tr: 'Baş CS2 Espor Koçu' },
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sina',
      specialty: 'CS2, Valorant, Precision FPS'
    },
    {
      id: 'sorena',
      name: { fa: 'سورنا قاسمی', en: 'Sorena Ghasemi', ru: 'Сорена Гасеми', tr: 'Sorena Ghasemi' },
      gamerTag: 'Vortex_X',
      role: { fa: 'تحلیل‌گر ارشد بازی‌های تیمی', en: 'Senior MOBA Analyst', ru: 'Старший аналитик MOBA', tr: 'Kıdemli MOBA Analisti' },
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sorena',
      specialty: 'Dota 2, League of Legends'
    },
    {
      id: 'aria',
      name: { fa: 'آریا محمدی', en: 'Aria Mohammadi', ru: 'Ариа Мохаммади', tr: 'Aria Mohammadi' },
      gamerTag: 'Ghost_F',
      role: { fa: 'سوپروایزر سالن کنسول و فیفا', en: 'VIP Console Supervisor', ru: 'Супервайзер консольной зоны', tr: 'VIP Konsol Sorumlusu' },
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Aria',
      specialty: 'FIFA 26, Fighting Games'
    }
  ];

  // Lounge Sections Intro data
  const loungeSections = [
    {
      id: 'reservations',
      title: {
        fa: 'سالن فوق‌حرفه‌ای PC Arena',
        en: 'High-End PC Arena',
        ru: 'Игровая ПК-арена премиум-класса',
        tr: 'Üst Düzey PC Arenası'
      },
      desc: {
        fa: 'مجهز به پردازنده‌های نسل جدید Core i9، کارت گرافیک RTX 5080، مانیتورهای ۳۶۰ هرتز ASUS ROG و هدست‌های فوق پیشرفته Razer. رزرو کنید و با نهایت قدرت پلی دهید!',
        en: 'Equipped with next-gen Intel Core i9, RTX 5080 graphics, ASUS ROG 360Hz monitors, and premium Razer headsets. Book now and play with zero limits!',
        ru: 'Оснащен новейшими Intel Core i9, графикой RTX 5080, мониторами ASUS ROG 360 Гц и гарнитурами Razer. Забронируйте и играйте на максимуме!',
        tr: 'Yeni nesil Intel Core i9, RTX 5080 grafik kartları, ASUS ROG 360Hz monitörler ve birinci sınıf Razer kulaklıklar ile donatılmıştır. Sınırsız güçle oyna!'
      },
      icon: <Gamepad2 className="w-6 h-6 text-primary" />,
      imageUrl: 'https://images.unsplash.com/photo-1538481199705-c710c4e965fc?auto=format&fit=crop&w=600&q=80',
      color: 'border-primary/20 hover:border-primary hover:shadow-[0_0_20px_rgba(255,184,0,0.15)]',
      btnText: {
        fa: 'رزرو آنلاین سیستم',
        en: 'Book Online Now',
        ru: 'Забронировать онлайн',
        tr: 'Online Rezervasyon'
      }
    },
    {
      id: 'consoles',
      title: {
        fa: 'بخش VIP کنسول‌ها (PS5 & Xbox)',
        en: 'VIP Console Booths',
        ru: 'VIP-кабины консолей',
        tr: 'VIP Konsol Odaları'
      },
      desc: {
        fa: 'محیط صمیمی، مبلمان چرمی تخت‌خواب‌شو ویژه، مجهز به آخرین بازی‌های سال روی پلی‌استیشن ۵ و ایکس‌باکس سری ایکس به همراه تلویزیون‌های ۸۵ اینچی ال‌جی OLED ۱۲۰ هرتز.',
        en: 'Relaxing environment with specialized leather recliners, loaded with the year\'s top titles on PS5 & Xbox Series X with massive 85" LG OLED 120Hz screens.',
        ru: 'Уютная атмосфера, кожаные реклайнеры, лучшие игры года на PS5 и Xbox Series X в сочетании с огромными 85" экранами LG OLED 120 Гц.',
        tr: 'Özel deri uzanma koltuklarına sahip rahat bir ortam, PS5 ve Xbox Series X üzerinde devasa 85" LG OLED 120Hz ekranlar ile yılın en popüler oyunları.'
      },
      icon: <Tv className="w-6 h-6 text-primary" />,
      imageUrl: 'https://images.unsplash.com/photo-1606144042614-b2417e99c4e3?auto=format&fit=crop&w=600&q=80',
      color: 'border-primary/20 hover:border-primary hover:shadow-[0_0_20px_rgba(255,184,0,0.15)]',
      btnText: {
        fa: 'رزرو سیستم و کنسول',
        en: 'Reserve Consoles',
        ru: 'Забронировать консоль',
        tr: 'Konsol Rezervasyonu'
      }
    },
    {
      id: 'cafe',
      title: {
        fa: 'بوفه و کافه گیمینگ سایبر',
        en: 'Cyber Buffet & Cafe',
        ru: 'Кибер-кафе и буфет',
        tr: 'Siber Kafe ve Büfe'
      },
      desc: {
        fa: 'بدون خارج شدن از بازی، همبرگر دوبل، پیتزا پپرونی ویژه، نوشابه انرژی‌زا ردبول یا قهوه اسپرسو سفارش دهید تا پرسنل ما آن را مستقیماً پشت سیستم به شما تحویل دهند!',
        en: 'Order double burgers, premium pepperoni pizza, RedBull energy drinks, or espresso without leaving your game. Our staff delivers it right to your desktop!',
        ru: 'Заказывайте двойные бургеры, пиццу пепперони, энергетики RedBull или эспрессо, не отрываясь от игры. Персонал доставит заказ прямо к вашему ПК!',
        tr: 'Oyununuzu hiç bölmeden çift köfteli burger, özel pepperoni pizza, RedBull veya dikey espresso sipariş edin, personelimiz doğrudan masanıza getirsin!'
      },
      icon: <Utensils className="w-6 h-6 text-primary" />,
      imageUrl: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=600&q=80',
      color: 'border-primary/20 hover:border-primary hover:shadow-[0_0_20px_rgba(255,184,0,0.15)]',
      btnText: {
        fa: 'سفارش آنلاین بوفه',
        en: 'Order Snacks & Food',
        ru: 'Заказать еду онлайн',
        tr: 'Online Sipariş'
      }
    },
    {
      id: 'shop',
      title: {
        fa: 'فروشگاه تجهیزات جانبی گیمینگ',
        en: 'Gaming Accessories Shop',
        ru: 'Магазиن игровых аксессуаров',
        tr: 'Oyuncu Ekipmanları Mağazası'
      },
      desc: {
        fa: 'خرید تجهیزات اورجینال از برندهای برتر جهان (Razer, Logitech, Redragon) با گارانتی فیزیکی سالن. امتیاز جمع کنید و کدهای تخفیف شگفت‌انگیز برای خرید کالا صادر کنید.',
        en: 'Get original gear from top global brands (Razer, Logitech, Redragon) with lounge physical warranty. Redeem earned loyalty points for massive coupon discounts.',
        ru: 'Оригинальные девайсы ведущих мировых брендов (Razer, Logitech, Redragon) с гарантией клуба. Обменивайте баллы лояльности на отличные скидки.',
        tr: 'Dünya markalarından (Razer, Logitech, Redragon) orijinal ekipmanları salon garantisiyle alın. Sadakat puanlarınızı büyük indirim kuponlarına dönüştürün.'
      },
      icon: <ShoppingBag className="w-6 h-6 text-primary" />,
      imageUrl: 'https://images.unsplash.com/photo-1618384887929-16ec33fab9ef?auto=format&fit=crop&w=600&q=80',
      color: 'border-primary/20 hover:border-primary hover:shadow-[0_0_20px_rgba(255,184,0,0.15)]',
      btnText: {
        fa: 'مشاهده فروشگاه جانبی',
        en: 'Browse Gear Shop',
        ru: 'Перейти в магазин',
        tr: 'Mağazayı İncele'
      }
    }
  ];

  const activeBanners = appSliders.length > 0
    ? appSliders.map((slide, idx) => ({
        id: `custom-slide-${slide.id || idx}`,
        title: {
          fa: slide.titleFa || '',
          en: slide.titleEn || '',
          ru: slide.titleEn || '',
          tr: slide.titleEn || ''
        },
        desc: {
          fa: slide.titleFa ? `${slide.titleFa} - اسلاید ویژه کلوپ` : '',
          en: slide.titleEn ? `${slide.titleEn} - Club Featured` : '',
          ru: slide.titleEn ? `${slide.titleEn} - Club Featured` : '',
          tr: slide.titleEn ? `${slide.titleEn} - Club Featured` : ''
        },
        image: slide.imageUrl,
        imageUrl: slide.imageUrl,
        tag: 'HOT',
        badge: 'FEATURED',
        target: slide.target || 'reserve',
        stats: [
          { label: { fa: 'پینگ', en: 'PING' }, value: '8ms' },
          { label: { fa: 'تجهیزات', en: 'GPU' }, value: 'RTX 5080' }
        ]
      }))
    : featuredGames;

  // mount کامپوننت قالب وقتی ثبت شد
  useEffect(() => {
    if (!themeComponent || !themeComponentHostRef.current) return;
    if (!hasComponent('home')) return;

    const mounted = mountComponent('home', themeComponentHostRef.current, {
      language,
      dir,
      t,
      onNavigate: onNavigate as any,
      featuredGames: activeBanners,
      gameGenres,
      matchHistory,
      pricingPackages,
      loungeSections,
      staffTeam,
      tournaments,
      settings: siteSettings,
      logoUrl: '/logo.png',
      assetsBase: themeComponent.assetsBase,
      themeId: themeId || 'dark-gold',
    });
    if (!mounted) return;
    // پاک‌سازی هنگام تغییر
    return () => { unmountComponent('home'); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [themeComponentVersion, themeComponent, language, dir, tournaments, activeBanners, siteSettings]);


  // Helper to translate text dynamically
  const getLocText = (obj: any) => {
    return obj[language] || obj['en'] || '';
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

  const isSectionEnabled = (key: string) => {
    return siteSettings[`section_${key}_enabled`] !== 'false';
  };

  const getSectionTitle = (key: string, defaultVal: string) => {
    const customKey = `section_${key}_title_${language}`;
    return siteSettings[customKey] || defaultVal;
  };

  const getSectionDesc = (key: string, defaultVal: string) => {
    const customKey = `section_${key}_desc_${language}`;
    return siteSettings[customKey] || defaultVal;
  };

  // قالب‌های دارای کامپوننت اختصاصی (theme.js نصب‌شده با ZIP):
  // کامپوننت قالب در یک هاست رندر می‌شود تا چیدمان کاملاً اختصاصی
  // داشته باشد — دقیقاً مثل قالب‌های سیستمی Geco/GamingAmp.
  if (themeComponent && hasComponent('home')) {
    return (
      <div className="w-full animate-fade-in" dir={dir}>
        <div ref={themeComponentHostRef} className="w-full" />
      </div>
    );
  }

  if (themeId === 'geco-purple') {
    return (
      <GecoPurpleHome
        featuredGames={activeBanners}
        matchHistory={matchHistory}
        pricingPackages={pricingPackages}
        loungeSections={loungeSections}
        tournaments={tournaments}
        staffTeam={staffTeam}
        onNavigate={onNavigate}
      />
    );
  }

  const handleNextBanner = () => {
    setActiveBanner((prev) => (prev + 1) % activeBanners.length);
  };

  const handlePrevBanner = () => {
    setActiveBanner((prev) => (prev - 1 + activeBanners.length) % activeBanners.length);
  };

  const handleNextTournament = () => {
    setActiveTournamentSlide((prev) => (prev + 1) % tournaments.length);
  };

  const handlePrevTournament = () => {
    setActiveTournamentSlide((prev) => (prev - 1 + tournaments.length) % tournaments.length);
  };

  // Get a suitable image for each tournament


  if (themeId === 'gaming-amp') {
    return (
      <GamingAmpHome
        featuredGames={activeBanners}
        gameGenres={gameGenres}
        matchHistory={matchHistory}
        pricingPackages={pricingPackages}
        staffTeam={staffTeam}
        loungeSections={loungeSections}
        onNavigate={onNavigate}
        tournaments={tournaments}
      />
    );
  }

  return (
    <div className="space-y-16 animate-fade-in" dir={dir}>
      
      {/* 1. HERO GAME SLIDER (FULL WIDTH, SLANTED & MOBIRISE GAMINGAMP STYLED) */}
      <section className="relative w-[calc(100%+2rem)] md:w-[calc(100%+4rem)] -mx-4 md:-mx-8 overflow-hidden bg-[#050608] shadow-[0_0_50px_rgba(0,0,0,0.8)] aspect-[21/9] min-h-[340px] group border-b-4 border-primary">
        {activeBanners.map((game, idx) => (
          <div
            key={game.id}
            className={`absolute inset-0 w-full h-full transition-all duration-1000 ease-in-out ${
              activeBanner === idx ? 'opacity-100 z-10 scale-100' : 'opacity-0 z-0 scale-105 pointer-events-none'
            }`}
          >
            {/* Soft lightweight overlay removed to keep images bright as per user request */}
            <div className="absolute inset-0 bg-transparent z-10" />
            
            {/* Slide Image */}
            <img
              src={game.imageUrl}
              alt={getLocText(game.title)}
              className="w-full h-full object-cover opacity-100 group-hover:scale-105 transition-all duration-[10s] ease-out"
              referrerPolicy="no-referrer"
            />
 
            {/* Slider Content */}
            <div className={`absolute inset-y-0 ${dir === 'rtl' ? 'right-6 md:right-16 lg:right-24 xl:right-32 text-right' : 'left-6 md:left-16 lg:left-24 xl:left-32 text-left'} z-20 flex flex-col justify-center max-w-xl md:max-w-2xl gap-3.5 md:gap-4`}>
              <span className="self-start px-3 py-1 bg-primary/20 border border-primary text-primary notched-clip-sm text-[10px] md:text-xs font-black tracking-widest uppercase font-display neon-text-glow">
                {game.badge}
              </span>
              
              <h1 className="text-xl sm:text-2xl md:text-4xl lg:text-5xl font-extrabold text-white leading-tight drop-shadow-[0_4px_12px_rgba(0,0,0,0.9)] font-display uppercase tracking-tight">
                {getLocText(game.title)}
              </h1>
              
              <p className="text-xs sm:text-sm md:text-base text-gray-300 leading-relaxed max-w-xl">
                {getLocText(game.desc)}
              </p>
 
              <div className="flex flex-wrap gap-3 mt-2">
                <button
                  onClick={() => {
                    const targetRoute = game.target === 'reserve' ? 'reservations' : (game.target || 'reservations');
                    onNavigate(targetRoute);
                  }}
                  className="px-6 py-3 bg-primary hover:bg-primary-hover text-black font-black text-xs notched-clip-sm shadow-[0_0_20px_rgba(255,184,0,0.4)] border border-primary transition-all flex items-center gap-2 cursor-pointer font-display uppercase tracking-wider"
                >
                  {getButtonIcon(game.target || 'reserve')}
                  <span>
                    {getButtonText(game.target || 'reserve')[language] || getButtonText(game.target || 'reserve')['en']}
                  </span>
                </button>
              </div>
            </div>
          </div>
        ))}
 
        {/* Slider Controls (Manual Arrow Navigation) */}
        <button
          onClick={handlePrevBanner}
          className={`absolute ${dir === 'rtl' ? 'right-6' : 'left-6'} top-1/2 -translate-y-1/2 z-30 w-11 h-11 rounded-none notched-clip-sm bg-black/80 border border-white/10 flex items-center justify-center text-white hover:bg-primary hover:text-black hover:border-primary hover:scale-105 transition-all opacity-0 group-hover:opacity-100 cursor-pointer`}
        >
          {dir === 'rtl' ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
        </button>
        <button
          onClick={handleNextBanner}
          className={`absolute ${dir === 'rtl' ? 'left-6' : 'right-6'} top-1/2 -translate-y-1/2 z-30 w-11 h-11 rounded-none notched-clip-sm bg-black/80 border border-white/10 flex items-center justify-center text-white hover:bg-primary hover:text-black hover:border-primary hover:scale-105 transition-all opacity-0 group-hover:opacity-100 cursor-pointer`}
        >
          {dir === 'rtl' ? <ChevronLeft className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
        </button>
  
        {/* Carousel Indicators */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30 flex gap-2 bg-black/80 backdrop-blur-md px-4 py-2.5 rounded-none notched-clip-sm border border-white/10">
          {featuredGames.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setActiveBanner(idx)}
              className={`w-2.5 h-2.5 transition-all cursor-pointer ${
                activeBanner === idx ? 'bg-primary w-6 shadow-[0_0_8px_rgba(255,184,0,0.8)]' : 'bg-gray-600 hover:bg-gray-500'
              }`}
            />
          ))}
        </div>
      </section>

      {/* 2. CHOOSE YOUR STORY / GAME GENRES (NEW SIGNATURE MOBIRISE SECTION) */}
      {isSectionEnabled('genres') && (
        <section className="space-y-8">
          <div className="flex flex-col gap-2">
            <span className="text-primary font-bold text-xs uppercase tracking-widest block font-display neon-text-glow">
              {language === 'fa' ? 'ژانرهای محبوب کلوپ' : 'CHOOSE YOUR GAME'}
            </span>
            <h2 className="text-3xl font-black text-white flex items-center gap-3 font-display uppercase tracking-tight">
              <span className="w-3 h-8 bg-primary rounded-none shadow-[0_0_15px_rgba(255,184,0,0.8)]"></span>
              <span>
                {getSectionTitle('genres', language === 'fa' ? 'داستان نبرد خود را انتخاب کنید' : 'Choose Your Story & Universe')}
              </span>
            </h2>
            <p className="text-gray-400 text-sm max-w-2xl font-medium">
              {getSectionDesc('genres', language === 'fa' ? 'محبوب‌ترین دسته‌بندی بازی‌ها مجهز به کانفیگ اختصاصی و ریگ‌های پرقدرت گیمینگ آماده اجرای حماسی‌ترین نبردهای شماست.' : 'Immerse yourself in world-class gaming experiences customized for the most popular competitive and open-world titles.')}
            </p>
          </div>

          {/* Diagonal Angled Grid of Genres */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {gameGenres.map((genre) => (
              <div
                key={genre.id}
                className="group relative h-96 overflow-hidden rounded-none notched-clip border border-white/10 hover:border-primary hover:shadow-[0_0_30px_rgba(255,184,0,0.2)] bg-[#0d0e15] transition-all duration-300"
              >
                {/* Image banner */}
                <img
                  src={genre.imageUrl}
                  alt={getLocText(genre.title)}
                  className="w-full h-full object-cover opacity-50 group-hover:scale-110 group-hover:opacity-60 transition-all duration-500"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent z-10" />

                {/* Tag header */}
                <div className="absolute top-4 left-4 z-20">
                  <span className="px-2.5 py-1 text-[9px] font-black tracking-wider bg-black/80 text-primary border border-primary/40 rounded-none notched-clip-sm font-mono">
                    {genre.tag}
                  </span>
                </div>

                {/* Text Body */}
                <div className="absolute bottom-5 right-5 left-5 z-20 flex flex-col gap-2">
                  <h3 className="text-lg font-black text-white group-hover:text-primary transition-colors font-display uppercase tracking-tight">
                    {getLocText(genre.title)}
                  </h3>
                  <p className="text-gray-300 text-xs font-semibold leading-relaxed">
                    {getLocText(genre.subtitle)}
                  </p>
                  <div className="pt-2 border-t border-white/10 mt-1">
                    <span className="block text-[9px] text-gray-500 font-bold uppercase tracking-widest font-mono">
                      {language === 'fa' ? 'بازی‌های شاخص:' : 'Featured Games:'}
                    </span>
                    <span className="text-[10px] text-primary font-bold">
                      {genre.games}
                    </span>
                  </div>

                  <button
                    onClick={() => onNavigate('reservations')}
                    className="mt-4 w-full py-2 bg-primary/10 hover:bg-primary border border-primary/30 hover:border-primary text-primary hover:text-black font-black text-[10px] notched-clip-sm transition-all duration-300 font-display uppercase tracking-wider cursor-pointer"
                  >
                    {language === 'fa' ? 'مشاهده رزروها' : 'Launch Session'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 3. LOUNGE SECTIONS INTRO (SLANTED CYBER FRAMING) */}
      {isSectionEnabled('services') && (
        <section className="space-y-8">
          <div className="flex flex-col gap-2">
            <span className="text-primary font-bold text-xs uppercase tracking-widest block font-display neon-text-glow">
              {language === 'fa' ? 'سالن‌ها و سرویس‌های ویژه' : 'PREMIUM SERVICES'}
            </span>
            <h2 className="text-3xl font-black text-white flex items-center gap-3 font-display uppercase tracking-tight">
              <span className="w-3 h-8 bg-primary rounded-none shadow-[0_0_15px_rgba(255,184,0,0.8)]"></span>
              <span>
                {getSectionTitle('services', language === 'fa' ? 'کلوپ‌های تخصصی و خدمات بازی نو' : 'BAZINO Elite Zones & Services')}
              </span>
            </h2>
            <p className="text-gray-400 text-sm max-w-2xl font-medium">
              {getSectionDesc('services', language === 'fa' ? 'مجموعه ما با ادغام پیشرفته‌ترین سخت‌افزارها، بوفه هوشمند لحظه‌ای و فروشگاه تجهیزات، بی‌نظیرترین کلوپ بازی منطقه است.' : 'Explore our integrated ecosystem of state-of-the-art gaming zones, real-time buffet ordering, and accessories shop.')}
            </p>
          </div>

          {/* 4-Column Bento Grid with Angled Borders */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {loungeSections.map((sect) => (
              <div
                key={sect.id}
                className="group rounded-none notched-clip border border-white/10 hover:border-primary bg-dark-card flex flex-col justify-between hover:shadow-[0_0_30px_rgba(255,184,0,0.15)] hover:-translate-y-1 transition-all duration-300"
              >
                {/* Card Image */}
                <div className="relative aspect-[16/10] w-full bg-[#050608] overflow-hidden border-b border-white/10">
                  <img
                    src={sect.imageUrl}
                    alt={getLocText(sect.title)}
                    className="w-full h-full object-cover group-hover:scale-105 opacity-70 group-hover:opacity-85 transition-all duration-500"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent" />
                  <div className="absolute bottom-3 right-4 left-4 flex items-center justify-between z-10">
                    <div className="p-2 bg-black/90 rounded-none notched-clip-sm border border-white/10 shadow-md">
                      {sect.icon}
                    </div>
                  </div>
                </div>

                {/* Card Body */}
                <div className="p-5 flex-1 flex flex-col justify-between gap-4">
                  <div className="space-y-2">
                    <h3 className="text-sm font-black text-white group-hover:text-primary transition-colors leading-snug font-display uppercase">
                      {getLocText(sect.title)}
                    </h3>
                    <p className="text-gray-400 text-xs leading-relaxed font-semibold">
                      {getLocText(sect.desc)}
                    </p>
                  </div>

                  <button
                    onClick={() => onNavigate(sect.id === 'consoles' ? 'reservations' : (sect.id as any))}
                    className="w-full py-2.5 bg-transparent hover:bg-primary border-2 border-primary/20 hover:border-primary text-gray-300 hover:text-black font-black text-[10px] notched-clip-sm font-display uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <span>{getLocText(sect.btnText)}</span>
                    {dir === 'rtl' ? <ArrowLeft className="w-3.5 h-3.5 group-hover:translate-x-[-3px] transition-transform" /> : <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-[3px] transition-transform" />}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 4. MATCH RESULTS BOARD (NEW SIGNATURE MOBIRISE SECTION) */}
      {isSectionEnabled('matches') && (
        <section className="space-y-8">
          <div className="flex flex-col gap-2">
            <span className="text-primary font-bold text-xs uppercase tracking-widest block font-display neon-text-glow">
              {language === 'fa' ? 'نتایج نبردهای سایبری کلوپ' : 'LIVE ARENA MATCHBOARD'}
            </span>
            <h2 className="text-3xl font-black text-white flex items-center gap-3 font-display uppercase tracking-tight">
              <span className="w-3 h-8 bg-primary rounded-none shadow-[0_0_15px_rgba(255,184,0,0.8)]"></span>
              <span>
                {getSectionTitle('matches', language === 'fa' ? 'جدول زنده مسابقات و نبردها' : 'Live Matches & Tournament Scoreboard')}
              </span>
            </h2>
            <p className="text-gray-400 text-sm max-w-2xl font-medium">
              {getSectionDesc('matches', language === 'fa' ? 'مستندات نبردهای داغ کلن‌های کلوپ بازی نو. بازی‌ها را زنده دنبال کنید یا رقیب بطلبید!' : 'Track live scores, scheduled challenges, and finished esports clashes of our local gaming guilds.')}
            </p>
          </div>

          {/* Scoreboard table / list */}
          <div className="bg-dark-card border border-white/10 rounded-none notched-clip overflow-hidden">
            <div className="p-5 border-b border-white/10 bg-[#0d0e15] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sword className="w-5 h-5 text-primary" />
                <span className="text-xs font-bold font-display uppercase text-white">Esports Arena Matches</span>
              </div>
              <div className="flex items-center gap-1.5 bg-primary/10 border border-primary/20 text-primary px-2.5 py-0.5 rounded-none notched-clip-sm text-[9px] font-mono font-bold uppercase">
                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></span>
                <span>Lobby Connected</span>
              </div>
            </div>

            <div className="divide-y divide-white/5">
              {matchHistory.map((match) => (
                <div key={match.id} className="p-5 flex flex-col md:flex-row items-center justify-between gap-4 hover:bg-[#141624]/30 transition-all">
                  {/* Game badge & Title */}
                  <div className="flex items-center gap-3 w-full md:w-1/3">
                    <span className="px-2.5 py-1 bg-black text-primary font-mono font-bold text-[9px] border border-primary/30 notched-clip-sm shrink-0">
                      {match.game}
                    </span>
                    <div className={`${dir === 'rtl' ? 'text-right' : 'text-left'}`}>
                      <h4 className="text-xs font-bold text-white font-display line-clamp-1">{getLocText(match.title)}</h4>
                      <span className="text-[9px] text-gray-500 font-bold">{match.time}</span>
                    </div>
                  </div>

                  {/* Score section (Futuristic) */}
                  <div className="flex items-center justify-center gap-6 py-2 px-6 bg-black/40 border border-white/5 notched-clip-sm w-full md:w-auto">
                    <div className="text-right">
                      <span className="text-xs font-black text-white hover:text-primary transition-colors">{match.teamA}</span>
                    </div>
                    <div className="flex items-center gap-2 font-display text-sm font-black px-4 py-1.5 bg-black/80 text-primary border border-primary/20">
                      <span className={match.status === 'Scheduled' ? 'text-gray-600' : 'text-white'}>{match.scoreA}</span>
                      <span className="text-gray-500 text-xs">:</span>
                      <span className={match.status === 'Scheduled' ? 'text-gray-600' : 'text-white'}>{match.scoreB}</span>
                    </div>
                    <div className="text-left">
                      <span className="text-xs font-black text-white hover:text-primary transition-colors">{match.teamB}</span>
                    </div>
                  </div>

                  {/* Status indicator */}
                  <div className="flex items-center justify-end w-full md:w-1/4 gap-3">
                    {match.status === 'Live' && (
                      <span className="flex items-center gap-1.5 px-3 py-1 bg-red-500/10 border border-red-500/30 text-red-500 text-[9px] font-black uppercase notched-clip-sm">
                        <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-ping"></span>
                        <span>{language === 'fa' ? 'در حال پخش زنده' : 'LIVE'}</span>
                      </span>
                    )}
                    {match.status === 'Finished' && (
                      <span className="px-3 py-1 bg-gray-500/10 border border-gray-500/30 text-gray-400 text-[9px] font-black uppercase notched-clip-sm">
                        {language === 'fa' ? 'پایان یافته' : 'Finished'}
                      </span>
                    )}
                    {match.status === 'Scheduled' && (
                      <span className="px-3 py-1 bg-amber-500/10 border border-amber-500/30 text-amber-500 text-[9px] font-black uppercase notched-clip-sm">
                        {language === 'fa' ? 'برنامه‌ریزی شده' : 'Scheduled'}
                      </span>
                    )}
                    <button 
                      onClick={() => onNavigate('tournaments')}
                      className="p-1.5 bg-white/5 hover:bg-primary hover:text-black border border-white/10 rounded-none notched-clip-sm transition-all"
                    >
                      <ChevronLeft className={`w-3.5 h-3.5 ${dir === 'rtl' ? 'rotate-180' : ''}`} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* 5. TOURNAMENTS CAROUSEL (SLANTED DESIGN) */}
      {isSectionEnabled('tournaments') && (
        <section className="space-y-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex flex-col gap-1.5">
              <span className="text-primary font-bold text-xs uppercase tracking-widest block font-display neon-text-glow">
                {language === 'fa' ? 'مسابقات بزرگ قهرمانی' : 'CHAMPIONSHIP BRACKETS'}
              </span>
              <h2 className="text-3xl font-black text-white flex items-center gap-3 font-display uppercase tracking-tight">
                <span className="w-3 h-8 bg-primary rounded-none shadow-[0_0_15px_rgba(255,184,0,0.8)]"></span>
                <span>
                  {getSectionTitle('tournaments', language === 'fa' ? 'تورنمنت‌های فعال و ثبت‌نام سریع' : 'Active Tournaments & Fast Brackets')}
                </span>
              </h2>
              <p className="text-gray-400 text-sm max-w-2xl font-medium">
                {getSectionDesc('tournaments', language === 'fa' ? 'همراه تیمی خود ثبت‌نام کنید، حریفان را در براکت‌های آنلاین حذف کنید و جوایز نقدی کلوپ وفاداری را از آن خود سازید.' : 'Challenge elite local squads, win massive cash prize pools and bonus loyalty rewards, and climb to legendary status.')}
              </p>
            </div>

          {/* Nav Controls */}
          <div className="flex items-center gap-2 self-start sm:self-auto bg-black/60 border border-white/10 p-1.5 rounded-none notched-clip-sm">
            <button
              onClick={handlePrevTournament}
              className="p-2 hover:bg-primary hover:text-black text-gray-400 rounded-none notched-clip-sm transition-all cursor-pointer"
            >
              {dir === 'rtl' ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            </button>
            <span className="text-[10px] font-mono font-bold px-3 text-gray-400 border-x border-white/10">
              {tournaments.length > 0 ? `${activeTournamentSlide + 1} / ${tournaments.length}` : '0 / 0'}
            </span>
            <button
              onClick={handleNextTournament}
              className="p-2 hover:bg-primary hover:text-black text-gray-400 rounded-none notched-clip-sm transition-all cursor-pointer"
            >
              {dir === 'rtl' ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Sliding Tournament cards */}
        {tournaments.length === 0 ? (
          <div className="p-8 text-center bg-dark-card rounded-none notched-clip border border-white/10 text-gray-500 text-sm font-sans">
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
                  className="w-full md:w-[calc(50%-12px)] lg:w-[calc(33.333%-16px)] shrink-0 snap-center rounded-none notched-clip border border-white/10 bg-dark-card overflow-hidden flex flex-col justify-between group hover:border-primary hover:shadow-[0_0_25px_rgba(255,184,0,0.15)] transition-all duration-300"
                >
                  {/* Image and status badge */}
                  <div className="relative aspect-[16/10] w-full bg-[#050608] overflow-hidden">
                    <img
                      src={getTournamentImage(tournament.game)}
                      alt={tournament.title}
                      className="w-full h-full object-cover opacity-70 group-hover:scale-105 transition-all duration-500"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent" />
                    
                    {/* Status badge */}
                    <span className={`absolute top-4 right-4 px-3 py-1 text-[10px] font-black border rounded-none notched-clip-sm backdrop-blur-sm ${
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
                    <span className="absolute bottom-4 right-4 px-3 py-1 bg-black/80 border border-white/10 text-white text-[9px] font-mono font-bold rounded-none notched-clip-sm">
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
                      className="w-full py-2.5 bg-primary text-black hover:bg-primary-hover border-2 border-primary text-[10px] font-black rounded-none notched-clip-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer font-display uppercase tracking-wider"
                    >
                      <span>
                        {language === 'fa' && 'مشاهده جدول مسابقات و ثبت‌نام'}
                        {language === 'en' && 'View Bracket & Register'}
                        {language === 'ru' && 'Сетка и регистрация'}
                        {language === 'tr' && 'Fikstürü Gör و Kaydol'}
                      </span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
      )}

      {/* 6. LOUNGE PASSES & PRICING PLANS (NEW SIGNATURE MOBIRISE SECTION) */}
      {isSectionEnabled('pricing') && (
        <section className="space-y-8">
          <div className="flex flex-col gap-2 text-center items-center">
            <span className="text-primary font-bold text-xs uppercase tracking-widest block font-display neon-text-glow">
              {language === 'fa' ? 'پیشنهادهای ویژه ساعات بازی' : 'CHOOSE YOUR ARENA PASS'}
            </span>
            <h2 className="text-3xl font-black text-white flex items-center gap-3 justify-center font-display uppercase tracking-tight">
              <span>
                {getSectionTitle('pricing', language === 'fa' ? 'بسته‌های زمانی و کارتهای عضویت' : 'Lounge passes & Pricing Tickets')}
              </span>
            </h2>
            <p className="text-gray-400 text-sm max-w-xl font-medium">
              {getSectionDesc('pricing', language === 'fa' ? 'با خرید پکیج‌های بهینه، تا ۵۰ درصد هزینه بر ساعت بازی خود را کاهش دهید و ردبول رایگان و امتیاز کلوپ وفاداری جایزه بگیرید.' : 'Get up to 50% discount per hour by choosing our high-value passes packed with energy drinks and loyalty boosters.')}
            </p>
          </div>

        {/* Pricing Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-stretch">
          {pricingPackages.map((pack) => (
            <div
              key={pack.id}
              className={`rounded-none notched-clip border flex flex-col justify-between bg-dark-card transition-all duration-300 ${
                pack.popular 
                  ? 'border-primary shadow-[0_0_30px_rgba(255,184,0,0.15)] -translate-y-2 relative' 
                  : 'border-white/10 hover:border-white/20'
              }`}
            >
              {/* Popular Tag */}
              {pack.popular && (
                <span className="absolute top-4 right-4 bg-primary text-black font-black text-[9px] px-3 py-1 notched-clip-sm uppercase tracking-widest font-display animate-pulse">
                  {language === 'fa' ? 'محبوب‌ترین پیشنهاد' : 'RECOMMENDED'}
                </span>
              )}

              {/* Package Header */}
              <div className="p-6 border-b border-white/15 bg-[#0d0e15]">
                <h3 className="text-md font-black text-white font-display uppercase">{getLocText(pack.title)}</h3>
                <p className="text-gray-400 text-xs mt-1.5 font-bold">{getLocText(pack.duration)}</p>
                <div className="mt-4 flex items-baseline gap-1">
                  <span className="text-3xl font-black text-primary font-mono">{pack.price.toLocaleString()}</span>
                  <span className="text-xs text-gray-500 font-bold">{language === 'fa' ? 'تومان' : 'Tümen'}</span>
                </div>
              </div>

              {/* Feature List */}
              <div className="p-6 flex-1 flex flex-col gap-4">
                <ul className="space-y-3.5 flex-1">
                  {pack.features.map((feature: any, fIdx: number) => (
                    <li key={fIdx} className="flex items-start gap-2.5 text-xs font-semibold text-gray-300">
                      <Zap className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                      <span>{getLocText(feature)}</span>
                    </li>
                  ))}
                </ul>

                <button
                  onClick={() => onNavigate('reservations')}
                  className={`w-full py-3 text-xs font-black notched-clip-sm transition-all duration-300 font-display uppercase tracking-widest cursor-pointer border ${
                    pack.popular
                      ? 'bg-primary hover:bg-primary-hover border-primary text-black shadow-[0_0_15px_rgba(255,184,0,0.3)]'
                      : 'bg-white/5 hover:bg-white/10 border-white/10 text-white'
                  }`}
                >
                  {language === 'fa' ? 'شارژ حساب و خرید پکیج' : 'Purchase Pass Ticket'}
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>
      )}

      {/* 7. MEET THE COACHES & EXPERTS (NEW SIGNATURE MOBIRISE SECTION) */}
      {isSectionEnabled('coaches') && (
        <section className="space-y-8">
          <div className="flex flex-col gap-2">
            <span className="text-primary font-bold text-xs uppercase tracking-widest block font-display neon-text-glow">
              {language === 'fa' ? 'مربیان و اساتید ورزش الکترونیک' : 'MEET OUR EXPERT COACHES'}
            </span>
            <h2 className="text-3xl font-black text-white flex items-center gap-3 font-display uppercase tracking-tight">
              <span className="w-3 h-8 bg-primary rounded-none shadow-[0_0_15px_rgba(255,184,0,0.8)]"></span>
              <span>
                {getSectionTitle('coaches', language === 'fa' ? 'مربیان حرفه‌ای و پرسنل کلوپ' : 'Meet Our Pro Gaming Coaches & Staff')}
              </span>
            </h2>
            <p className="text-gray-400 text-sm max-w-2xl font-medium">
              {getSectionDesc('coaches', language === 'fa' ? 'گروه مربیان برتر و سازمان‌دهندگان سالن بازی نو آماده هدایت شما برای پیروزی در تورنمنت‌ها و ساختن کلن‌های حرفه‌ای هستند.' : 'Our elite instructors and staff are dedicated to helping you optimize your gaming gear, build clan structures, and dominate.')}
            </p>
          </div>

        {/* Staff Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {staffTeam.map((staff) => (
            <div
              key={staff.id}
              className="group rounded-none notched-clip border border-white/10 hover:border-primary bg-dark-card p-6 flex flex-col items-center text-center gap-4 hover:shadow-[0_0_25px_rgba(255,184,0,0.15)] hover:-translate-y-1 transition-all duration-300"
            >
              {/* Avatar Frame with custom gold borders */}
              <div className="relative w-24 h-24 rounded-full border-4 border-primary p-1 bg-black group-hover:scale-105 transition-all duration-300">
                <img
                  src={staff.avatar}
                  alt={getLocText(staff.name)}
                  className="rounded-full bg-dark-bg w-full h-full object-cover"
                />
                <span className="absolute -bottom-1 -right-1 bg-primary text-black font-mono font-black text-[9px] px-2 py-0.5 notched-clip-sm shadow-md">
                  PRO
                </span>
              </div>

              {/* Info */}
              <div className="space-y-1">
                <h3 className="text-md font-black text-white font-display uppercase">
                  {getLocText(staff.name)}
                </h3>
                <span className="block text-primary font-mono text-xs font-black">
                  @{staff.gamerTag}
                </span>
                <span className="block text-gray-400 text-xs font-bold uppercase tracking-wider">
                  {getLocText(staff.role)}
                </span>
              </div>

              {/* Specialty */}
              <div className="w-full pt-3.5 border-t border-white/10 flex flex-col items-center gap-1.5">
                <span className="text-[9px] text-gray-500 font-bold uppercase tracking-widest font-mono">
                  {language === 'fa' ? 'حوزه تخصصی:' : 'Core Specialty:'}
                </span>
                <span className="text-xs text-gray-300 font-black">{staff.specialty}</span>
              </div>

              {/* Social icons */}
              <div className="flex gap-3 justify-center text-gray-500 mt-2">
                <a href="#" className="p-1.5 rounded-none notched-clip-sm bg-black border border-white/5 hover:border-primary hover:text-primary transition-all">
                  <Instagram className="w-4 h-4" />
                </a>
                <a href="#" className="p-1.5 rounded-none notched-clip-sm bg-black border border-white/5 hover:border-primary hover:text-primary transition-all">
                  <Youtube className="w-4 h-4" />
                </a>
                <a href="#" className="p-1.5 rounded-none notched-clip-sm bg-black border border-white/5 hover:border-primary hover:text-primary transition-all">
                  <Twitter className="w-4 h-4" />
                </a>
              </div>
            </div>
          ))}
        </div>
      </section>
      )}

      {/* 8. ADDRESS, CONSOLE TICKETING & DARK-THEMED OSM LOCATION MAP */}
      {isSectionEnabled('address') && (
        <section className="w-[calc(100%+2rem)] md:w-[calc(100%+4rem)] -mx-4 md:-mx-8 bg-dark-card px-6 md:px-16 lg:px-24 xl:px-32 py-12 md:py-16 border-t-4 border-primary rounded-none shadow-[0_-10px_50px_rgba(0,0,0,0.3)]">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            
            {/* Text block / Contact */}
            <div className="lg:col-span-5 space-y-6">
              <div className="space-y-2">
                <span className="px-3.5 py-1 bg-primary/20 border border-primary text-primary rounded-none notched-clip-sm text-[10px] font-black uppercase font-mono tracking-widest neon-text-glow">
                  BAZINO HQ Command
                </span>
                <h2 className="text-xl sm:text-2xl lg:text-3xl font-black text-white font-display uppercase tracking-tight">
                  {getSectionTitle('address', language === 'fa' ? 'نشانی و راه‌های ارتباطی با ما' : 'Our Location & Contact Command')}
                </h2>
                <p className="text-gray-400 text-xs sm:text-sm leading-relaxed font-semibold">
                  {getSectionDesc('address', language === 'fa' ? 'بازی نو مکانی ایده‌آل برای گردهمایی گیمرهای حرفه‌ای و برگزاری پرشورترین تورنمنت‌ها با تجهیزاتی کلاس جهانی است.' : 'Visit our high-tech lounge anytime to play with absolute low latency, order premium snacks straight to your desk, and enjoy absolute comfort.')}
                </p>
              </div>

              {/* List details */}
              <div className="space-y-4 text-xs font-semibold text-gray-300">
                <div className="flex items-start gap-3 bg-black/60 border border-white/10 p-3.5 rounded-none notched-clip">
                  <MapPin className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <span className="block font-bold text-gray-500 text-[10px] uppercase font-mono">
                      {language === 'fa' && 'نشانی فیزیکی کلوپ'}
                      {language === 'en' && 'Lounge Location'}
                    </span>
                    <p className="leading-relaxed text-xs">
                      {siteSettings['club_address'] || (language === 'fa' ? 'تهران، اتوبان صدر، خیابان شریعتی، بن‌بست پلاک ۲۴، مجتمع تجاری بازی نو، طبقه منفی ۱' : 'Level -1, BAZINO Plaza, No. 24, Shariati St., Sadr Hwy, Tehran')}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex items-center gap-3 bg-black/60 border border-white/10 p-3.5 rounded-none notched-clip">
                    <Clock className="w-5 h-5 text-primary shrink-0" />
                    <div className="space-y-1">
                      <span className="block font-bold text-gray-500 text-[10px] uppercase font-mono">
                        {language === 'fa' && 'ساعت‌های عملیاتی'}
                        {language === 'en' && 'Operational Hours'}
                      </span>
                      <span className="text-white text-xs font-black">
                        {siteSettings['club_hours'] || (language === 'fa' ? '۲۴ ساعته شبانه‌روز (۷ روز هفته)' : 'Open 24/7 (Non-stop)')}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 bg-black/60 border border-white/10 p-3.5 rounded-none notched-clip">
                    <Phone className="w-5 h-5 text-primary shrink-0" />
                    <div className="space-y-1">
                      <span className="block font-bold text-gray-500 text-[10px] uppercase font-mono">
                        {language === 'fa' && 'شماره تماس پشتیبانی'}
                        {language === 'en' && 'Support Phone Line'}
                      </span>
                      <span className="text-white font-mono text-xs font-black" style={{ direction: 'ltr' }}>
                        {siteSettings['club_phone'] || '۰۲۱-۲۲۴۴۶۶۸۸'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Dynamic Club Social Links Bar */}
                <div className="mt-6 pt-5 border-t border-white/10 space-y-3">
                  <span className="block font-bold text-gray-500 text-[10px] uppercase font-mono tracking-widest">
                    {language === 'fa' ? 'شبکه‌های اجتماعی و ارتباطی کلوپ' : 'CLUB SOCIAL CHANNELS'}
                  </span>
                  <div className="flex flex-wrap gap-2.5">
                    {getSocialLinks().map((item: any) => (
                      <a
                        key={item.id}
                        href={item.url}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-2 px-3.5 py-2 bg-black/60 border border-white/10 hover:border-primary hover:text-primary transition-all text-xs font-bold group notched-clip-sm"
                      >
                        <span className="text-gray-400 group-hover:text-primary transition-colors animate-pulse">
                          {getSocialIcon(item.platform)}
                        </span>
                        <span>{item.name}</span>
                      </a>
                    ))}
                  </div>
                </div>
              </div>

            </div>

            {/* Interactive OSM Map (CYBERPUNK INVERT FILTER) */}
            <div className="lg:col-span-7 h-[320px] md:h-[370px] w-full rounded-none notched-clip border border-white/10 relative bg-[#050608] group">
              {/* Map border glowing */}
              <div className="absolute inset-0 border border-primary/20 pointer-events-none z-10 rounded-none" />
              
              <iframe
                title="BAZINO Lounge Location Map"
                src="https://www.openstreetmap.org/export/embed.html?bbox=51.4285%2C35.7760%2C51.4395%2C35.7860&amp;layer=mapnik&amp;marker=35.7810%2C51.4340"
                className="w-full h-full border-0 rounded-none"
                style={{
                  filter: 'invert(93%) hue-rotate(185deg) brightness(90%) contrast(100%)',
                  opacity: 0.8
                }}
                loading="lazy"
              />

              {/* Custom overlay tracker */}
              <div className="absolute top-4 right-4 bg-black border border-primary/40 px-3 py-1.5 text-[9px] font-black text-primary flex items-center gap-1.5 backdrop-blur-sm pointer-events-none uppercase font-mono shadow-md notched-clip-sm">
                <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
                <span>GPS Tracking: Live Lock</span>
              </div>
              
              <div className="absolute bottom-4 left-4 bg-black/90 border border-white/10 px-3 py-1.5 text-[9px] font-medium text-gray-400 flex items-center gap-1.5 backdrop-blur-sm pointer-events-none shadow-md font-mono notched-clip-sm">
                <span>Lat: 35.7810° N | Lon: 51.4340° E</span>
              </div>
            </div>

          </div>
        </section>
      )}

    </div>
  );
}
