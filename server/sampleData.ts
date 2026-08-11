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
  { id: 's1', name: 'سیستم شماره ۱ (VIP PC)', type: 'PC', hourlyRate: 35000, isActive: true, isReserved: false },
  { id: 's2', name: 'سیستم شماره ۲ (VIP PC)', type: 'PC', hourlyRate: 35000, isActive: true, isReserved: true },
  { id: 's3', name: 'سیستم شماره ۳ (Standard)', type: 'PC', hourlyRate: 25000, isActive: true, isReserved: false },
  { id: 's4', name: 'سیستم شماره ۴ (Standard)', type: 'PC', hourlyRate: 25000, isActive: true, isReserved: false },
  { id: 's5', name: 'کنسول پلی‌استیشن ۵ (VIP Booth)', type: 'PS5', hourlyRate: 40000, isActive: true, isReserved: true }
];

/* ---------- منوی کافه و بوفه (۵ مورد) ---------- */
export const SAMPLE_CAFE_ITEMS: CafeItemRow[] = [
  { id: 'c1', name: 'پیتزا پپرونی مخصوص گیمرها', category: 'Foods', price: 95000, imageUrl: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=400&q=80', inventory: 15, isAvailable: true },
  { id: 'c2', name: 'همبرگر دوبل با پنیر گودا', category: 'Foods', price: 85000, imageUrl: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=400&q=80', inventory: 10, isAvailable: true },
  { id: 'c3', name: 'نوشابه ردبول خنک (RedBull)', category: 'Drinks', price: 45000, imageUrl: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?auto=format&fit=crop&w=400&q=80', inventory: 32, isAvailable: true },
  { id: 'c4', name: 'سیب‌زمینی سرخ‌کرده با پنیر چدار', category: 'Snacks', price: 55000, imageUrl: 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?auto=format&fit=crop&w=400&q=80', inventory: 20, isAvailable: true },
  { id: 'c5', name: 'قهوه اسپرسو دبل شات', category: 'Drinks', price: 35000, imageUrl: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=400&q=80', inventory: 25, isAvailable: true }
];

/* ---------- فروشگاه تجهیزات جانبی (۵ مورد) ---------- */
export const SAMPLE_ACCESSORIES: AccessoryRow[] = [
  { id: 'a1', name: 'کیبورد مکانیکال Redragon K552 RGB', description: 'کیبورد مکانیکال گیمینگ با سوییچ‌های آبی مقاوم، نورپردازی RGB.', price: 1450000, imageUrl: 'https://images.unsplash.com/photo-1618384887929-16ec33fab9ef?auto=format&fit=crop&w=400&q=80', stock: 5, category: 'Keyboard' },
  { id: 'a2', name: 'موس گیمینگ Logitech G502 HERO', description: 'موس حرفه‌ای با حسگر HERO 25K، یازده کلید قابل برنامه‌ریزی.', price: 1200000, imageUrl: 'https://images.unsplash.com/photo-1615663245857-ac93bb7c39e7?auto=format&fit=crop&w=400&q=80', stock: 8, category: 'Mouse' },
  { id: 'a3', name: 'هدست گیمینگ Razer Kraken V3', description: 'هدست سیمی با صدای فراگیر ۷.۱، میکروفون نویزگیر.', price: 2350000, imageUrl: 'https://images.unsplash.com/photo-1599669454699-248893623440?auto=format&fit=crop&w=400&q=80', stock: 4, category: 'Headset' },
  { id: 'a4', name: 'دسته بازی پلی‌استیشن ۵ (DualSense)', description: 'دسته رسمی سونی با فناوری هپتیک و تریگرهای تطبیقی.', price: 3200000, imageUrl: 'https://images.unsplash.com/photo-1606813907291-d86efa9b94db?auto=format&fit=crop&w=400&q=80', stock: 6, category: 'Controller' },
  { id: 'a5', name: 'ماوس‌پد گیمینگ RGB 900x400', description: 'ماوس‌پد بزرگ با نورپردازی RGB دورتادور و سطح نرم.', price: 480000, imageUrl: 'https://images.unsplash.com/photo-1605453865916-3c1f9e4a1b5c?auto=format&fit=crop&w=400&q=80', stock: 12, category: 'Mouse' }
];

/* ---------- اسلایدرهای اپلیکیشن/سایت (۴ مورد) ---------- */
export const SAMPLE_SLIDERS: SliderRow[] = [
  { id: 'slide-1', imageUrl: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=800&q=80', target: 'reserve', titleFa: 'رزرو سیستم‌های گیمینگ فوق پیشرفته', titleEn: 'Reserve High-End Gaming Rigs', titleRu: 'Забронировать мощные игровые ПК', titleTr: 'Son Teknoloji Oyun Bilgisayarlarını Rezerve Edin' },
  { id: 'slide-2', imageUrl: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=800&q=80', target: 'cafe', titleFa: 'سفارش آنلاین انواع پیتزا و نوشیدنی انرژی‌زا', titleEn: 'Order Pizza & Energy Drinks Online', titleRu: 'Заказать пиццу и энергетики онлайн', titleTr: 'Online Pizza ve Enerji İçeceği Sipariş Et' },
  { id: 'slide-3', imageUrl: 'https://images.unsplash.com/photo-1618384887929-16ec33fab9ef?auto=format&fit=crop&w=800&q=80', target: 'shop', titleFa: 'تجهیزات اورجینال گیمینگ با گارانتی کلوپ', titleEn: 'Original Gaming Gear with Club Warranty', titleRu: 'Оригинальные игровые девайсы с гарантией', titleTr: 'Kulüp Garantili Orijinal Oyun Ekipmanları' },
  { id: 'slide-4', imageUrl: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&w=800&q=80', target: 'tournaments', titleFa: 'ثبت‌نام در مسابقات با جوایز نقدی بزرگ', titleEn: 'Join Tournaments with Big Cash Prizes', titleRu: 'Участвуйте в турнирах с крупными призами', titleTr: 'Büyük Nakit Ödüllü Turnuvalara Katılın' }
];

/* ---------- مسابقات و تورنمنت‌ها (۴ مورد) ---------- */
export const SAMPLE_TOURNAMENTS: TournamentRow[] = [
  { id: 't1', title: 'مسابقات قهرمانی Counter-Strike 2 سالن', game: 'CS2 5v5', registrationFee: 250000, startDate: '۱۴۰۵/۰۴/۲۰', maxTeams: 8, status: 'Active', registeredTeamsCount: 2, teams: '[{"name":"Zero Ping","leader":"ali_gamer","members":["reza","sina"]},{"name":"Cyber Storm","leader":"neda","members":["aria","sara"]}]', bracket: '{}' },
  { id: 't2', title: 'لیگ هفتگی دوتا ۲ (Dota 2 Arena)', game: 'Dota 2 5v5', registrationFee: 300000, startDate: '۱۴۰۵/۰۵/۰۱', maxTeams: 8, status: 'Upcoming', registeredTeamsCount: 3, teams: '[{"name":"VIP Gladiators","leader":"amir","members":[]},{"name":"Persian Hawks","leader":"hossein","members":[]},{"name":"Night Owls","leader":"maryam","members":[]}]', bracket: '{}' },
  { id: 't3', title: 'جام باشگاه‌های فیفا ۲۶', game: 'FIFA 26 1v1', registrationFee: 100000, startDate: '۱۴۰۵/۰۵/۰۸', maxTeams: 16, status: 'Upcoming', registeredTeamsCount: 5, teams: '[{"name":"Barca King","leader":"ehsan","members":[]},{"name":"Real Fan","leader":"kiarash","members":[]}]', bracket: '{}' },
  { id: 't4', title: 'تورنمنت شبانه والورانت (Midnight Clash)', game: 'Valorant 5v5', registrationFee: 200000, startDate: '۱۴۰۵/۰۵/۱۵', maxTeams: 8, status: 'Completed', registeredTeamsCount: 8, teams: '[{"name":"Phoenix","leader":"sara","members":[]},{"name":"Radiant","leader":"danial","members":[]}]', bracket: '{}' }
];

/* ---------- مقالات و اخبار بلاگ (۴ مورد) ---------- */
export const SAMPLE_ARTICLES: ArticleRow[] = [
  { id: 'art-1', title: 'معرفی آپدیت جدید Counter-Strike 2 و تغییرات کلیدی نقشه‌ها', content: 'شرکت ولو سرانجام آپدیت بزرگ و جدید کانتر استرایک ۲ را منتشر کرد که طی آن نقشه Dust II تغییرات نورپردازی شگفت‌انگیزی داشته است. در این مقاله به بررسی تغییرات کلیدی گیم‌پلی و نقشه‌های محبوب می‌پردازیم.', category: 'CS2', imageUrl: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=800&q=80', author: 'آرش قاسمی (مدیر فنی)', date: '۱۴۰۵/۰۴/۱۱', comments: '[{"id":"cm1","gamerTag":"ali_gamer","content":"مقاله عالی بود!"}]' },
  { id: 'art-2', title: 'راهنمای انتخاب سیستم مناسب برای رقابت‌های حرفه‌ای', content: 'در دنیای رقابت‌های حرفه‌ای، نرخ فریم بالا و پینگ پایین حرف اول را می‌زند. در این راهنما به شما کمک می‌کنیم بر اساس بودجه و سبک بازی، سیستم مناسب را از کلوپ انتخاب کنید.', category: 'Hardware', imageUrl: 'https://images.unsplash.com/photo-1587202372775-e229f172b9d7?auto=format&fit=crop&w=800&q=80', author: 'سینا رضایی', date: '۱۴۰۵/۰۴/۰۵', comments: '[]' },
  { id: 'art-3', title: 'گزارش مسابقات آخر هفته: صدرنشینی تیم Zero Ping', content: 'مسابقات آخر هفته با حضور ۸ تیم برگزار شد و تیم Zero Ping با نتیجه ۲ بر ۱ برابر Cyber Storm به مقام قهرمانی رسید. جوایز و امتیازهای وفاداری به تیم‌های برتر اهدا شد.', category: 'Tournaments', imageUrl: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&w=800&q=80', author: 'سورنا قاسمی', date: '۱۴۰۵/۰۳/۲۸', comments: '[]' },
  { id: 'art-4', title: 'منوی جدید بوفه: پیتزا پپرونی مخصوص گیمرها', content: 'بوفه کلوپ با منوی جدید به‌روزرسانی شد؛ پیتزا پپرونی مخصوص گیمرها، همبرگر دوبل با پنیر گودا و نوشیدنی‌های انرژی‌زا حالا مستقیماً پشت سیستم شما تحویل داده می‌شود.', category: 'Cafe', imageUrl: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=800&q=80', author: 'آریا محمدی', date: '۱۴۰۵/۰۳/۱۵', comments: '[]' }
];

/* ---------- کدهای تخفیف فعال (۴ مورد) ---------- */
export const SAMPLE_COUPONS: CouponRow[] = [
  { code: 'BAZINO10', type: 'Percent', value: 10, minOrder: 100000, expiry: '۳۰ روز دیگر', expiryDate: new Date(Date.now() + 30 * 86400000).toISOString(), maxUsageCount: 100, usageCount: 12, isActive: true },
  { code: 'VIPGOLD', type: 'Percent', value: 15, minOrder: 200000, expiry: '۱۵ روز دیگر', expiryDate: new Date(Date.now() + 15 * 86400000).toISOString(), maxUsageCount: 50, usageCount: 4, isActive: true },
  { code: 'REDBULL', type: 'Fixed', value: 45000, minOrder: 150000, expiry: '۷ روز دیگر', expiryDate: new Date(Date.now() + 7 * 86400000).toISOString(), maxUsageCount: 25, usageCount: 0, isActive: true },
  { code: 'WELCOME', type: 'Fixed', value: 50000, minOrder: 250000, expiry: '۶۰ روز دیگر', expiryDate: new Date(Date.now() + 60 * 86400000).toISOString(), maxUsageCount: 200, usageCount: 31, isActive: true }
];

/* ---------- تراکنش‌های باشگاه وفاداری (۴ مورد) ---------- */
export const SAMPLE_TRANSACTIONS: TransactionRow[] = [
  { id: 'tx-1', points: 100, description: 'شارژ اولیه حساب کاربری (خوش‌آمدگویی)', type: 'Bonus', date: 'امروز' },
  { id: 'tx-2', points: 250, description: 'امتیاز خرید پکیج طلایی VIP آرنا', type: 'Earned', date: 'دیروز' },
  { id: 'tx-3', points: -150, description: 'تبدیل ۱۵۰ امتیاز به کد تخفیف ۱۵۰,۰۰۰ تومانی (VIPGOLD)', type: 'Redeemed', date: '۲ روز پیش' },
  { id: 'tx-4', points: 80, description: 'امتیاز رزرو ۴ ساعته سیستم شماره ۳', type: 'Earned', date: '۴ روز پیش' }
];

/* ---------- لاگ‌های رزرو نمونه (۳ مورد) ---------- */
export const SAMPLE_RESERVATION_LOGS: ReservationLogRow[] = [
  { id: 'r1', systemId: 's2', username: '', systemName: 'سیستم شماره ۲ (VIP PC)', startTime: '14:00', endTime: '16:00', totalPrice: 70000, date: 'امروز', checkedIn: false, timestamp: new Date(Date.now() - 7200000).toISOString() },
  { id: 'r2', systemId: 's5', username: '', systemName: 'کنسول پلی‌استیشن ۵ (VIP Booth)', startTime: '18:00', endTime: '20:00', totalPrice: 80000, date: 'امروز', checkedIn: true, timestamp: new Date(Date.now() - 14400000).toISOString() },
  { id: 'r3', systemId: 's3', username: '', systemName: 'سیستم شماره ۳ (Standard)', startTime: '20:00', endTime: '22:30', totalPrice: 62500, date: 'دیروز', checkedIn: true, timestamp: new Date(Date.now() - 90000000).toISOString() }
];

/* ---------- تنظیمات پیش‌فرض کلوپ (اطلاعات تماس/شبکه‌های اجتماعی) ---------- */
export const SAMPLE_SETTINGS: SettingRow[] = [
  { key: 'club_phone', value: '۰۲۱-۲۲۴۴۶۶۸۸' },
  { key: 'club_hours', value: '۲۴ ساعته شبانه‌روز (۷ روز هفته)' },
  { key: 'club_address', value: 'تهران، اتوبان صدر، خیابان شریعتی، بن‌بست پلاک ۲۴، مجتمع تجاری بازی نو، طبقه منفی ۱' },
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
