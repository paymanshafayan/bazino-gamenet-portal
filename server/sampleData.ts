// ═══════════════════════════════════════════════════════════════════════
//  BAZINO SAMPLE DATA — «بخش داده‌های نمونه»
// ═══════════════════════════════════════════════════════════════════════
//  این فایل تنها منبع داده‌های نمونه (Sample Data) سایت و اپلیکیشن
//  موبایل است. وقتی «منبع داده» روی حالت نمونه (Sample) باشد — که حالت
//  پیش‌فرض است — تمام بخش‌های سایت/اپ (رزرو سیستم، کافه، فروشگاه،
//  مسابقات، بلاگ، اسلایدر، کدهای تخفیف، تراکنش‌ها، اتاق‌های گفتگو و
//  اطلاعات کلوپ) از همین داده‌ها خوانده می‌شوند.
//
//  برای هر بخش ۴ تا ۵ مورد (آیتم) تعریف شده است.
//
//  حالت‌ها:
//    • sample   (پیش‌فرض) → همه‌ی لیست‌ها از این فایل خوانده می‌شوند
//    • database            → لیست‌ها از دیتابیس خوانده می‌شوند؛ اگر جدولی
//                            خالی باشد، به‌صورت خودکار از همین فایل
//                            (نمونه) پر می‌شود تا سایت هیچ‌وقت خالی نباشد.
//
//  تغییر وضعیت: پنل مدیریت ← سفارشی‌سازی کلوپ ← «منبع داده»
//  (کلید تنظیمات: data_source = sample | database)
// ═══════════════════════════════════════════════════════════════════════
import type {
  SystemRow,
  CafeItemRow,
  AccessoryRow,
  TournamentRow,
  ArticleRow,
  SliderRow,
  CouponRow,
  TransactionRow,
  ReservationLogRow,
  SettingRow
} from './dataProviders';

/* ---------- اتاق‌های گفتگو (۵ مورد) ---------- */
export const SAMPLE_CHAT_ROOMS: string[] = ['عمومی (General)', 'CS2', 'FIFA 26', 'Dota 2', 'Valorant'];

/* ---------- سیستم‌های گیمینگ (۵ مورد) ---------- */
export const SAMPLE_SYSTEMS: SystemRow[] = [
  { id: 's1', name: 'سیستم شماره ۱ (VIP PC)', nameFa: 'سیستم شماره ۱ (VIP PC)', nameEn: 'System #1 (VIP PC)', nameRu: 'Система №1 (VIP PC)', nameTr: 'Sistem No.1 (VIP PC)', type: 'PC', hourlyRate: 150, isActive: true, isReserved: false },
  { id: 's2', name: 'سیستم شماره ۲ (VIP PC)', nameFa: 'سیستم شماره ۲ (VIP PC)', nameEn: 'System #2 (VIP PC)', nameRu: 'Система №2 (VIP PC)', nameTr: 'Sistem No.2 (VIP PC)', type: 'PC', hourlyRate: 150, isActive: true, isReserved: true },
  { id: 's3', name: 'سیستم شماره ۳ (Standard)', nameFa: 'سیستم شماره ۳ (Standard)', nameEn: 'System #3 (Standard)', nameRu: 'Система №3 (Standard)', nameTr: 'Sistem No.3 (Standard)', type: 'PC', hourlyRate: 100, isActive: true, isReserved: false },
  { id: 's4', name: 'سیستم شماره ۴ (Standard)', nameFa: 'سیستم شماره ۴ (Standard)', nameEn: 'System #4 (Standard)', nameRu: 'Система №4 (Standard)', nameTr: 'Sistem No.4 (Standard)', type: 'PC', hourlyRate: 100, isActive: true, isReserved: false },
  { id: 's5', name: 'کنسول پلی‌استیشن ۵ (VIP Booth)', nameFa: 'کنسول پلی‌استیشن ۵ (VIP Booth)', nameEn: 'PlayStation 5 Console (VIP Booth)', nameRu: 'Консоль PlayStation 5 (VIP-кабина)', nameTr: 'PlayStation 5 Konsolu (VIP Kabin)', type: 'PS5', hourlyRate: 200, isActive: true, isReserved: true }
];

/* ---------- منوی کافه و بوفه (۵ مورد) ---------- */
export const SAMPLE_CAFE_ITEMS: CafeItemRow[] = [
  { id: 'c1', name: 'پیتزا پپرونی مخصوص گیمرها', nameFa: 'پیتزا پپرونی مخصوص گیمرها', nameEn: 'Gamer Pepperoni Pizza', nameRu: 'Пицца пепперони для геймеров', nameTr: 'Oyuncu Pepperoni Pizzası', category: 'Foods', price: 250, imageUrl: '/images/home/pizza-400.webp', mobileImageUrl: '/images/mobile/item-pizza.webp', inventory: 15, isAvailable: true },
  { id: 'c2', name: 'همبرگر دوبل با پنیر گودا', nameFa: 'همبرگر دوبل با پنیر گودا', nameEn: 'Double Gouda Cheeseburger', nameRu: 'Двойной бургер с гаудой', nameTr: 'Çift Gouda Peynirli Burger', category: 'Foods', price: 220, imageUrl: '/images/home/burger-400.webp', mobileImageUrl: '/images/mobile/item-burger.webp', inventory: 10, isAvailable: true },
  { id: 'c3', name: 'نوشابه ردبول خنک (RedBull)', nameFa: 'نوشابه ردبول خنک', nameEn: 'Cold Red Bull Energy Drink', nameRu: 'Холодный энергетик Red Bull', nameTr: 'Soğuk Red Bull Enerji İçeceği', category: 'Drinks', price: 90, imageUrl: '/images/home/energy-drink-400.webp', mobileImageUrl: '/images/mobile/item-energy-drink.webp', inventory: 32, isAvailable: true },
  { id: 'c4', name: 'سیب‌زمینی سرخ‌کرده با پنیر چدار', nameFa: 'سیب‌زمینی سرخ‌کرده با پنیر چدار', nameEn: 'Cheddar Loaded Fries', nameRu: 'Картофель фри с чеддером', nameTr: 'Çedarlı Patates Kızartması', category: 'Snacks', price: 120, imageUrl: '/images/home/fries-400.webp', mobileImageUrl: '/images/mobile/item-fries.webp', inventory: 20, isAvailable: true },
  { id: 'c5', name: 'قهوه اسپرسو دبل شات', nameFa: 'قهوه اسپرسو دبل شات', nameEn: 'Double Shot Espresso', nameRu: 'Двойной эспрессо', nameTr: 'Double Shot Espresso', category: 'Drinks', price: 80, imageUrl: '/images/home/espresso-400.webp', mobileImageUrl: '/images/mobile/item-espresso.webp', inventory: 25, isAvailable: true }
];

/* ---------- فروشگاه تجهیزات جانبی (۵ مورد) ---------- */
export const SAMPLE_ACCESSORIES: AccessoryRow[] = [
  { id: 'a1', name: 'کیبورد مکانیکال Redragon K552 RGB', nameFa: 'کیبورد مکانیکال Redragon K552 RGB', nameEn: 'Redragon K552 RGB Mechanical Keyboard', nameRu: 'Механическая клавиатура Redragon K552 RGB', nameTr: 'Redragon K552 RGB Mekanik Klavye', description: 'کیبورد مکانیکال گیمینگ با سوییچ‌های آبی مقاوم، نورپردازی RGB.', descriptionFa: 'کیبورد مکانیکال گیمینگ با سوییچ‌های آبی مقاوم و نورپردازی RGB.', descriptionEn: 'Gaming mechanical keyboard with durable blue switches and RGB lighting.', descriptionRu: 'Игровая механическая клавиатура с синими свитчами и RGB подсветкой.', descriptionTr: 'Dayanıklı blue switch ve RGB aydınlatmalı mekanik oyuncu klavyesi.', price: 3500, imageUrl: '/images/home/keyboard-400.webp', mobileImageUrl: '/images/mobile/item-keyboard.webp', stock: 5, category: 'Keyboard' },
  { id: 'a2', name: 'موس گیمینگ Logitech G502 HERO', nameFa: 'موس گیمینگ Logitech G502 HERO', nameEn: 'Logitech G502 HERO Gaming Mouse', nameRu: 'Игровая мышь Logitech G502 HERO', nameTr: 'Logitech G502 HERO Oyuncu Mouse', description: 'موس حرفه‌ای با حسگر HERO 25K، یازده کلید قابل برنامه‌ریزی.', descriptionFa: 'موس حرفه‌ای با حسگر HERO 25K و یازده کلید قابل برنامه‌ریزی.', descriptionEn: 'Pro gaming mouse with HERO 25K sensor and 11 programmable buttons.', descriptionRu: 'Профессиональная мышь с сенсором HERO 25K и 11 кнопками.', descriptionTr: 'HERO 25K sensörlü, 11 programlanabilir tuşlu profesyonel mouse.', price: 2500, imageUrl: '/images/home/mouse-400.webp', mobileImageUrl: '/images/mobile/item-mouse.webp', stock: 8, category: 'Mouse' },
  { id: 'a3', name: 'هدست گیمینگ Razer Kraken V3', nameFa: 'هدست گیمینگ Razer Kraken V3', nameEn: 'Razer Kraken V3 Gaming Headset', nameRu: 'Игровая гарнитура Razer Kraken V3', nameTr: 'Razer Kraken V3 Oyuncu Kulaklığı', description: 'هدست سیمی با صدای فراگیر ۷.۱، میکروفون نویزگیر.', descriptionFa: 'هدست سیمی با صدای فراگیر ۷.۱ و میکروفون نویزگیر.', descriptionEn: 'Wired headset with 7.1 surround sound and noise-cancelling microphone.', descriptionRu: 'Проводная гарнитура 7.1 с микрофоном шумоподавления.', descriptionTr: '7.1 surround ses ve gürültü engelleyici mikrofonlu kablolu kulaklık.', price: 4200, imageUrl: '/images/home/headset-400.webp', mobileImageUrl: '/images/mobile/item-headset.webp', stock: 4, category: 'Headset' },
  { id: 'a4', name: 'دسته بازی پلی‌استیشن ۵ (DualSense)', nameFa: 'دسته بازی پلی‌استیشن ۵', nameEn: 'PlayStation 5 DualSense Controller', nameRu: 'Контроллер PlayStation 5 DualSense', nameTr: 'PlayStation 5 DualSense Kol', description: 'دسته رسمی سونی با فناوری هپتیک و تریگرهای تطبیقی.', descriptionFa: 'دسته رسمی سونی با فناوری هپتیک و تریگرهای تطبیقی.', descriptionEn: 'Official Sony controller with haptics and adaptive triggers.', descriptionRu: 'Официальный контроллер Sony с тактильной отдачей.', descriptionTr: 'Haptik geri bildirimli ve adaptif tetikli resmi Sony kolu.', price: 3900, imageUrl: '/images/home/controller-400.webp', mobileImageUrl: '/images/mobile/item-controller.webp', stock: 6, category: 'Controller' },
  { id: 'a5', name: 'ماوس‌پد گیمینگ RGB 900x400', nameFa: 'ماوس‌پد گیمینگ RGB 900x400', nameEn: 'RGB Gaming Mousepad 900x400', nameRu: 'Игровой коврик RGB 900x400', nameTr: 'RGB Oyuncu Mousepad 900x400', description: 'ماوس‌پد بزرگ با نورپردازی RGB دورتادور و سطح نرم.', descriptionFa: 'ماوس‌پد بزرگ با نورپردازی RGB دورتادور و سطح نرم.', descriptionEn: 'Large soft gaming mousepad with edge-to-edge RGB lighting.', descriptionRu: 'Большой мягкий коврик с RGB подсветкой по краям.', descriptionTr: 'Kenar RGB aydınlatmalı büyük ve yumuşak oyuncu mousepadi.', price: 650, imageUrl: '/images/home/mousepad-400.webp', mobileImageUrl: '/images/mobile/item-mousepad.webp', stock: 12, category: 'Mouse' }
];

/* ---------- اسلایدرهای اپلیکیشن/سایت (۴ مورد) ---------- */
export const SAMPLE_SLIDERS: SliderRow[] = [
  { id: 'slide-1', imageUrl: '/images/home/esports-960.webp', mobileImageUrl: '/images/mobile/slide-esports.webp', target: 'reserve', titleFa: 'رزرو سیستم‌های گیمینگ فوق پیشرفته', titleEn: 'Reserve High-End Gaming Rigs', titleRu: 'Забронировать мощные игровые ПК', titleTr: 'Son Teknoloji Oyun Bilgisayarlarını Rezerve Edin' },
  { id: 'slide-2', imageUrl: '/images/home/pizza-960.webp', mobileImageUrl: '/images/mobile/slide-pizza.webp', target: 'cafe', titleFa: 'سفارش آنلاین انواع پیتزا و نوشیدنی انرژی‌زا', titleEn: 'Order Pizza & Energy Drinks Online', titleRu: 'Заказать пиццу и энергетики онлайн', titleTr: 'Online Pizza ve Enerji İçeceği Sipariş Et' },
  { id: 'slide-3', imageUrl: '/images/home/keyboard-960.webp', mobileImageUrl: '/images/mobile/slide-keyboard.webp', target: 'shop', titleFa: 'تجهیزات اورجینال گیمینگ با گارانتی کلوپ', titleEn: 'Original Gaming Gear with Club Warranty', titleRu: 'Оригинальные игровые девайсы с гарантией', titleTr: 'Kulüp Garantili Orijinal Oyun Ekipmanları' },
  { id: 'slide-4', imageUrl: '/images/home/rpg-openworld-960.webp', mobileImageUrl: '/images/mobile/slide-rpg-openworld.webp', target: 'tournaments', titleFa: 'ثبت‌نام در مسابقات با جوایز نقدی بزرگ', titleEn: 'Join Tournaments with Big Cash Prizes', titleRu: 'Участвуйте в турнирах с крупными призами', titleTr: 'Büyük Nakit Ödüllü Turnuvalara Katılın' }
];

/* ---------- مسابقات و تورنمنت‌ها (۴ مورد) ---------- */
export const SAMPLE_TOURNAMENTS: TournamentRow[] = [
  { id: 't1', title: 'مسابقات قهرمانی Counter-Strike 2 سالن', titleFa: 'مسابقات قهرمانی Counter-Strike 2 سالن', titleEn: 'Counter-Strike 2 Club Championship', titleRu: 'Чемпионат клуба по Counter-Strike 2', titleTr: 'Counter-Strike 2 Kulüp Şampiyonası', game: 'CS2 5v5', registrationFee: 500, startDate: '۱۴۰۵/۰۴/۲۰', maxTeams: 8, status: 'Active', registeredTeamsCount: 2, teams: '[{"name":"Zero Ping","leader":"ali_gamer","members":["reza","sina"]},{"name":"Cyber Storm","leader":"neda","members":["aria","sara"]}]', bracket: '{}' },
  { id: 't2', title: 'لیگ هفتگی دوتا ۲ (Dota 2 Arena)', titleFa: 'لیگ هفتگی دوتا ۲', titleEn: 'Weekly Dota 2 Arena League', titleRu: 'Еженедельная лига Dota 2 Arena', titleTr: 'Haftalık Dota 2 Arena Ligi', game: 'Dota 2 5v5', registrationFee: 600, startDate: '۱۴۰۵/۰۵/۰۱', maxTeams: 8, status: 'Upcoming', registeredTeamsCount: 3, teams: '[{"name":"VIP Gladiators","leader":"amir","members":[]},{"name":"Persian Hawks","leader":"hossein","members":[]},{"name":"Night Owls","leader":"maryam","members":[]}]', bracket: '{}' },
  { id: 't3', title: 'جام باشگاه‌های فیفا ۲۶', titleFa: 'جام باشگاه‌های فیفا ۲۶', titleEn: 'FIFA 26 Clubs Cup', titleRu: 'Кубок клубов FIFA 26', titleTr: 'FIFA 26 Kulüpler Kupası', game: 'FIFA 26 1v1', registrationFee: 300, startDate: '۱۴۰۵/۰۵/۰۸', maxTeams: 16, status: 'Upcoming', registeredTeamsCount: 5, teams: '[{"name":"Barca King","leader":"ehsan","members":[]},{"name":"Real Fan","leader":"kiarash","members":[]}]', bracket: '{}' },
  { id: 't4', title: 'تورنمنت شبانه والورانت (Midnight Clash)', titleFa: 'تورنمنت شبانه والورانت', titleEn: 'Valorant Midnight Clash', titleRu: 'Ночной турнир Valorant', titleTr: 'Valorant Gece Turnuvası', game: 'Valorant 5v5', registrationFee: 400, startDate: '۱۴۰۵/۰۵/۱۵', maxTeams: 8, status: 'Completed', registeredTeamsCount: 8, teams: '[{"name":"Phoenix","leader":"sara","members":[]},{"name":"Radiant","leader":"danial","members":[]}]', bracket: '{}' }
];

/* ---------- مقالات و اخبار بلاگ (۴ مورد) ---------- */
export const SAMPLE_ARTICLES: ArticleRow[] = [
  { id: 'art-1', title: 'معرفی آپدیت جدید Counter-Strike 2 و تغییرات کلیدی نقشه‌ها', titleFa: 'معرفی آپدیت جدید Counter-Strike 2', titleEn: 'Counter-Strike 2 Update Highlights', titleRu: 'Главное в обновлении Counter-Strike 2', titleTr: 'Counter-Strike 2 Güncelleme Özeti', content: 'شرکت ولو آپدیت جدید کانتر استرایک ۲ را منتشر کرد؛ در این مطلب مهم‌ترین تغییرات گیم‌پلی و نقشه‌ها را مرور می‌کنیم.', contentFa: 'شرکت ولو آپدیت جدید کانتر استرایک ۲ را منتشر کرد؛ در این مطلب مهم‌ترین تغییرات گیم‌پلی و نقشه‌ها را مرور می‌کنیم.', contentEn: 'Valve released a new Counter-Strike 2 update. Here we review the key gameplay and map changes.', contentRu: 'Valve выпустила обновление Counter-Strike 2. Разбираем главные изменения карт и геймплея.', contentTr: 'Valve yeni Counter-Strike 2 güncellemesini yayınladı. Harita ve oynanış değişikliklerini inceliyoruz.', category: 'CS2', imageUrl: '/images/home/esports-800.webp', mobileImageUrl: '/images/home/esports-320.webp', author: 'آرش قاسمی', authorFa: 'آرش قاسمی', authorEn: 'Arash Ghasemi', authorRu: 'Араш Гасеми', authorTr: 'Arash Ghasemi', date: '۱۴۰۵/۰۴/۱۱', comments: '[{"id":"cm1","gamerTag":"ali_gamer","content":"مقاله عالی بود!"}]' },
  { id: 'art-2', title: 'راهنمای انتخاب سیستم مناسب برای رقابت‌های حرفه‌ای', titleFa: 'راهنمای انتخاب سیستم مناسب', titleEn: 'Choosing the Right Pro Gaming Rig', titleRu: 'Как выбрать игровой ПК для турниров', titleTr: 'Doğru Profesyonel Oyuncu Bilgisayarını Seçme', content: 'برای رقابت حرفه‌ای، فریم‌ریت بالا و پینگ پایین مهم است. این راهنما انتخاب سیستم مناسب را ساده می‌کند.', contentFa: 'برای رقابت حرفه‌ای، فریم‌ریت بالا و پینگ پایین مهم است. این راهنما انتخاب سیستم مناسب را ساده می‌کند.', contentEn: 'High FPS and low latency matter in competitive play. This guide helps you pick the right rig.', contentRu: 'Для соревнований важны высокий FPS и низкий пинг. Это руководство поможет выбрать ПК.', contentTr: 'Rekabetçi oyunlarda yüksek FPS ve düşük gecikme önemlidir. Bu rehber doğru sistemi seçmenize yardım eder.', category: 'Hardware', imageUrl: '/images/home/hardware-pc-800.webp', mobileImageUrl: '/images/home/hardware-pc-400.webp', author: 'سینا رضایی', authorFa: 'سینا رضایی', authorEn: 'Sina Rezaei', authorRu: 'Сина Резаи', authorTr: 'Sina Rezaei', date: '۱۴۰۵/۰۴/۰۵', comments: '[]' },
  { id: 'art-3', title: 'گزارش مسابقات آخر هفته: صدرنشینی تیم Zero Ping', titleFa: 'گزارش مسابقات آخر هفته', titleEn: 'Weekend Tournament Report', titleRu: 'Отчёт о турнире выходного дня', titleTr: 'Hafta Sonu Turnuva Raporu', content: 'مسابقات آخر هفته با قهرمانی تیم Zero Ping پایان یافت و جوایز به تیم‌های برتر اهدا شد.', contentFa: 'مسابقات آخر هفته با قهرمانی تیم Zero Ping پایان یافت و جوایز به تیم‌های برتر اهدا شد.', contentEn: 'The weekend tournament ended with Zero Ping on top, and rewards went to the best teams.', contentRu: 'Турнир выходного дня завершился победой Zero Ping, призы получили лучшие команды.', contentTr: 'Hafta sonu turnuvası Zero Ping zaferiyle bitti ve ödüller en iyi takımlara verildi.', category: 'Tournaments', imageUrl: '/images/home/rpg-openworld-800.webp', mobileImageUrl: '/images/home/rpg-openworld-320.webp', author: 'سورنا قاسمی', authorFa: 'سورنا قاسمی', authorEn: 'Sorena Ghasemi', authorRu: 'Сорена Гасеми', authorTr: 'Sorena Ghasemi', date: '۱۴۰۵/۰۳/۲۸', comments: '[]' },
  { id: 'art-4', title: 'منوی جدید بوفه: پیتزا پپرونی مخصوص گیمرها', titleFa: 'منوی جدید بوفه بازینو', titleEn: 'New Cafe Menu for Gamers', titleRu: 'Новое меню кафе для геймеров', titleTr: 'Oyuncular İçin Yeni Kafe Menüsü', content: 'منوی بوفه با پیتزا، برگر و نوشیدنی انرژی‌زا به‌روزرسانی شد و سفارش‌ها پشت سیستم تحویل می‌شوند.', contentFa: 'منوی بوفه با پیتزا، برگر و نوشیدنی انرژی‌زا به‌روزرسانی شد و سفارش‌ها پشت سیستم تحویل می‌شوند.', contentEn: 'The cafe menu now includes pizza, burgers, and energy drinks delivered right to your station.', contentRu: 'В меню кафе теперь пицца, бургеры и энергетики с доставкой к игровому месту.', contentTr: 'Kafe menüsünde artık pizza, burger ve enerji içecekleri oyun istasyonunuza teslim ediliyor.', category: 'Cafe', imageUrl: '/images/home/pizza-800.webp', mobileImageUrl: '/images/home/pizza-400.webp', author: 'آریا محمدی', authorFa: 'آریا محمدی', authorEn: 'Aria Mohammadi', authorRu: 'Ария Мохаммади', authorTr: 'Aria Mohammadi', date: '۱۴۰۵/۰۳/۱۵', comments: '[]' }
];

/* ---------- کدهای تخفیف فعال (۴ مورد) ---------- */
// همه‌ی کدهای نمونه تبلیغاتی‌اند: ownerUsername خالی یعنی عمومی و در دسترس همه.
export const SAMPLE_COUPONS: CouponRow[] = [
  { code: 'BAZINO10', type: 'Percent', value: 10, minOrder: 300, expiry: '۳۰ روز دیگر', expiryDate: new Date(Date.now() + 30 * 86400000).toISOString(), maxUsageCount: 100, usageCount: 12, isActive: true, ownerUsername: '' },
  { code: 'VIPGOLD', type: 'Percent', value: 15, minOrder: 600, expiry: '۱۵ روز دیگر', expiryDate: new Date(Date.now() + 15 * 86400000).toISOString(), maxUsageCount: 50, usageCount: 4, isActive: true, ownerUsername: '' },
  { code: 'REDBULL', type: 'Fixed', value: 90, minOrder: 400, expiry: '۷ روز دیگر', expiryDate: new Date(Date.now() + 7 * 86400000).toISOString(), maxUsageCount: 25, usageCount: 0, isActive: true, ownerUsername: '' },
  { code: 'WELCOME', type: 'Fixed', value: 100, minOrder: 500, expiry: '۶۰ روز دیگر', expiryDate: new Date(Date.now() + 60 * 86400000).toISOString(), maxUsageCount: 200, usageCount: 31, isActive: true, ownerUsername: '' }
];

/* ---------- تراکنش‌های باشگاه وفاداری (۴ مورد) ---------- */
// username خالی = ردیف نمایشی بدون مالک. این‌ها فقط تا وقتی نمایش داده می‌شوند که هنوز هیچ
// تراکنش واقعی‌ای وجود نداشته باشد (resolveTransactionalList).
export const SAMPLE_TRANSACTIONS: TransactionRow[] = [
  { id: 'tx-1', points: 100, description: 'شارژ اولیه حساب کاربری (خوش‌آمدگویی)', type: 'Bonus', date: 'امروز', username: '' },
  { id: 'tx-2', points: 250, description: 'امتیاز خرید پکیج طلایی VIP آرنا', type: 'Earned', date: 'دیروز', username: '' },
  { id: 'tx-3', points: -150, description: 'تبدیل ۱۵۰ امتیاز به کد تخفیف ۱۵ لیری (VIPGOLD)', type: 'Redeemed', date: '۲ روز پیش', username: '' },
  { id: 'tx-4', points: 80, description: 'امتیاز رزرو ۴ ساعته سیستم شماره ۳', type: 'Earned', date: '۴ روز پیش', username: '' }
];

/* ---------- لاگ‌های رزرو نمونه (۳ مورد) ---------- */
export const SAMPLE_RESERVATION_LOGS: ReservationLogRow[] = [
  { id: 'r1', systemId: 's2', username: '', systemName: 'سیستم شماره ۲ (VIP PC)', startTime: '14:00', endTime: '16:00', totalPrice: 300, date: 'امروز', checkedIn: false, timestamp: new Date(Date.now() - 7200000).toISOString() },
  { id: 'r2', systemId: 's5', username: '', systemName: 'کنسول پلی‌استیشن ۵ (VIP Booth)', startTime: '18:00', endTime: '20:00', totalPrice: 400, date: 'امروز', checkedIn: true, timestamp: new Date(Date.now() - 14400000).toISOString() },
  { id: 'r3', systemId: 's3', username: '', systemName: 'سیستم شماره ۳ (Standard)', startTime: '20:00', endTime: '22:30', totalPrice: 250, date: 'دیروز', checkedIn: true, timestamp: new Date(Date.now() - 90000000).toISOString() }
];

/* ---------- تنظیمات پیش‌فرض کلوپ (اطلاعات تماس/شبکه‌های اجتماعی) ---------- */
export const SAMPLE_SETTINGS: SettingRow[] = [
  { key: 'club_phone', value: '+90 539 133 37 47' },
  { key: 'club_map_url', value: 'https://maps.app.goo.gl/rUohkLWxSmpBTjsKA' },
  { key: 'club_map_lat', value: '35.2628' },
  { key: 'club_map_lng', value: '33.9084' },
  { key: 'club_hours', value: '۲۴ ساعته شبانه‌روز (۷ روز هفته)' },
  { key: 'club_address', value: 'Derviş İzzigil Sokak No.12, İskele adresinde kain Vista Mare Ana Lobi dükkan No.5 olarak tasniflendirilmiş dükkan' },
  // اطلاعات قانونی شرکت (برای صفحه‌ی تماس، متن‌های قانونی و بررسی درگاه پرداخت) — از پنل قابل ویرایش
  { key: 'company_legal_name', value: 'Bazino Gaming Lounge' },
  { key: 'company_tax_no', value: '' },
  { key: 'company_registration_no', value: '' },
  { key: 'company_email', value: 'info@bazino.club' },
  { key: 'company_landline', value: '' },
  { key: 'company_country', value: 'KKTC' },
  {
    key: 'social_media_links',
    value: JSON.stringify([
      { id: '1', name: 'اینستاگرام کلوپ', platform: 'instagram', url: 'https://instagram.com/bazino' },
      { id: '2', name: 'کانال تلگرام', platform: 'telegram', url: 'https://t.me/bazino' },
      { id: '3', name: 'یوتیوب کلوپ', platform: 'youtube', url: 'https://youtube.com/bazino' }
    ])
  }
];

/* ---------- خلاصه تعداد آیتم‌های هر بخش ---------- */
export const SAMPLE_COUNTS = {
  systems: SAMPLE_SYSTEMS.length,
  cafeItems: SAMPLE_CAFE_ITEMS.length,
  accessories: SAMPLE_ACCESSORIES.length,
  tournaments: SAMPLE_TOURNAMENTS.length,
  articles: SAMPLE_ARTICLES.length,
  sliders: SAMPLE_SLIDERS.length,
  coupons: SAMPLE_COUPONS.length,
  transactions: SAMPLE_TRANSACTIONS.length,
  chatRooms: SAMPLE_CHAT_ROOMS.length,
  reservations: SAMPLE_RESERVATION_LOGS.length,
  settings: SAMPLE_SETTINGS.length
};
