export type LanguageType = 'fa' | 'en' | 'ru' | 'tr';

export interface TranslationDictionary {
  [key: string]: {
    [lang in LanguageType]: string;
  };
}

export const translations: TranslationDictionary = {
  // Brand & Header
  'brand.name': {
    fa: 'بازینو',
    en: 'BAZINO',
    ru: 'BAZINO',
    tr: 'BAZINO',
  },
  'brand.tagline': {
    fa: 'سیستم رزرو آنلاین، بوفه هوشمند، تورنمنت‌ها و کلوپ وفاداری یکپارچه گیم‌نت',
    en: 'Integrated game-net reservation system, smart buffet, tournaments & loyalty club',
    ru: 'Интегрированная система бронирования гейм-клуба, умный буфет, турниры и клуб лояльности',
    tr: 'Entegre oyun salonu rezervasyon sistemi, akıllı büfe, turnuvalar ve sadakat kulübü',
  },
  'brand.version': {
    fa: 'نسخه کلاینت + کدهای C#',
    en: 'Client Version + C# Codes',
    ru: 'Клиентская версия + коды C#',
    tr: 'İstemci Sürümü + C# Kodları',
  },
  'user.pts': {
    fa: 'امتیاز',
    en: 'Points',
    ru: 'Баллы',
    tr: 'Puan',
  },
  'user.loyalGamer': {
    fa: 'گیمر وفادار',
    en: 'Loyal Gamer',
    ru: 'Лояльный геймер',
    tr: 'Sadık Oyuncu',
  },

  // Tabs
  'nav.home': {
    fa: 'صفحه اصلی',
    en: 'Home',
    ru: 'Главная',
    tr: 'Ana Sayfa',
  },
  'nav.loyalty': {
    fa: 'باشگاه مشتریان',
    en: 'Loyalty Club',
    ru: 'Клуб лояльности',
    tr: 'Sadakat Kulübü',
  },
  'nav.reservations': {
    fa: 'رزرو آنلاین سیستم',
    en: 'Online Booking',
    ru: 'Бронирование систем',
    tr: 'Online Rezervasyon',
  },
  'nav.cafe': {
    fa: 'کافه و بوفه آنلاین',
    en: 'Online Cafe & Buffet',
    ru: 'Онлайн кафе и буфет',
    tr: 'Online Kafe ve Büfe',
  },
  'nav.shop': {
    fa: 'فروشگاه لوازم جانبی',
    en: 'Accessories Shop',
    ru: 'Магазин аксессуаров',
    tr: 'Aksesuar Mağazası',
  },
  'nav.tournaments': {
    fa: 'ثبت‌نام تورنمنت‌ها',
    en: 'Tournaments',
    ru: 'Регистрация на турниры',
    tr: 'Turnuva Kaydı',
  },
  'nav.blog': {
    fa: 'اخبار و بلاگ بازی‌ها',
    en: 'Gaming News & Blog',
    ru: 'Новости и блоги',
    tr: 'Oyun Haberleri & Blog',
  },
  'nav.csharp': {
    fa: 'کدهای دات‌نت (C# Code)',
    en: 'C# .NET Codes',
    ru: 'Коды C# .NET',
    tr: 'C# .NET Kodları',
  },

  // Loyalty Tab
  'loyalty.title': {
    fa: 'کلوپ وفاداری',
    en: 'Loyalty Club',
    ru: 'Клуб лояльности',
    tr: 'Sadakat Kulübü',
  },
  'loyalty.balance': {
    fa: 'امتیاز وفاداری شما',
    en: 'Your Loyalty Points',
    ru: 'Ваши баллы лояльности',
    tr: 'Sadakat Puanınız',
  },
  'loyalty.approxValue': {
    fa: 'برابر با ارزش حدودی',
    en: 'Approximate value of',
    ru: 'Эквивалентно примерно',
    tr: 'Yaklaşık değeri',
  },
  'loyalty.discountDirect': {
    fa: 'تخفیف مستقیم کافه و سیستم',
    en: 'direct discount for cafe & systems',
    ru: 'прямой скидки на кафе и системы',
    tr: 'kafe ve sistemlerde doğrudan indirim',
  },
  'loyalty.currentLevel': {
    fa: 'سطح فعلی: برنزی',
    en: 'Current Level: Bronze',
    ru: 'Текущий уровень: Бронзовый',
    tr: 'Mevcut Seviye: Bronz',
  },
  'loyalty.pointsToSilver': {
    fa: 'امتیاز تا نقره‌ای',
    en: 'points to Silver',
    ru: 'баллов до Серебряного',
    tr: 'Gümüş seviyeye kalan puan',
  },
  'loyalty.convertTitle': {
    fa: 'تبدیل امتیاز به کد تخفیف',
    en: 'Convert Points to Coupon',
    ru: 'Обмен баллов на скидку',
    tr: 'Puanı Kupona Dönüştür',
  },
  'loyalty.convertDesc': {
    fa: 'شما می‌توانید با خرج کردن امتیازهای وفاداری خود، کدهای تخفیف با مبالغ مختلف صادر کرده و در بوفه، رزرو سیستم یا فروشگاه استفاده کنید.',
    en: 'By spending your loyalty points, you can generate coupon codes of various amounts and use them in the buffet, system booking, or accessories shop.',
    ru: 'Тратя свои баллы лояльности, вы можете создавать промокоды на различные суммы для использования в буфете, бронировании систем или магазине.',
    tr: 'Sadakat puanlarınızı harcayarak çeşitli tutarlarda indirim kodları oluşturabilir ve bunları büfe, sistem rezervasyonu veya mağazada kullanabilirsiniz.',
  },
  'loyalty.pointsToRedeem': {
    fa: 'امتیاز برای صادر کردن کد:',
    en: 'Points to redeem:',
    ru: 'Баллы для обмена:',
    tr: 'Dönüştürülecek puan:',
  },
  'loyalty.couponValue': {
    fa: 'ارزش کد تخفیف:',
    en: 'Coupon value:',
    ru: 'Сумма скидки:',
    tr: 'Kupon değeri:',
  },
  'loyalty.minOrder': {
    fa: 'حداقل سفارش خرید:',
    en: 'Minimum order amount:',
    ru: 'Минимальный заказ:',
    tr: 'Minimum sipariş tutarı:',
  },
  'loyalty.validity': {
    fa: 'مدت اعتبار کد تخفیف:',
    en: 'Coupon validity:',
    ru: 'Срок действия купона:',
    tr: 'Kupon geçerlilik süresi:',
  },
  'loyalty.daysFromIssue': {
    fa: '۳۰ روز از زمان صدور',
    en: '30 days from issuance',
    ru: '30 дней с момента выдачи',
    tr: 'düzenleme tarihinden itibaren 30 gün',
  },
  'loyalty.btnRedeem': {
    fa: 'تبدیل امتیاز به کوپن تخفیف',
    en: 'Convert Points to Coupon',
    ru: 'Обменять баллы на купон',
    tr: 'Puanları Kupona Dönüştür',
  },
  'loyalty.btnMinRequired': {
    fa: 'حداقل ۱۰۰ امتیاز لازم است',
    en: 'Min 100 points required',
    ru: 'Требуется минимум 100 баллов',
    tr: 'En az 100 puan gereklidir',
  },
  'loyalty.activeCoupons': {
    fa: 'کدهای تخفیف فعال شما',
    en: 'Your Active Coupon Codes',
    ru: 'Ваши активные промокоды',
    tr: 'Aktif İndirim Kodlarınız',
  },
  'loyalty.noCoupons': {
    fa: 'کد تخفیف فعالی صادر نشده است',
    en: 'No active coupon codes issued',
    ru: 'Нет активных промокодов',
    tr: 'Aktif indirim kodu bulunmamaktadır',
  },
  'loyalty.noCouponsDesc': {
    fa: 'با بازی کردن و کسب امتیاز، کدهای تخفیف اختصاصی بسازید!',
    en: 'Play games and earn points to create custom discount coupons!',
    ru: 'Играйте и зарабатывайте баллы, чтобы создавать свои промокоды!',
    tr: 'Oyun oynayıp puan kazanarak özel indirim kuponları oluşturun!',
  },
  'loyalty.typeFixed': {
    fa: 'مبلغ ثابت',
    en: 'Fixed Amount',
    ru: 'Фиксированная сумма',
    tr: 'Sabit Tutar',
  },
  'loyalty.typePercent': {
    fa: 'درصدی',
    en: 'Percentage',
    ru: 'Процентная',
    tr: 'Yüzdelik',
  },
  'loyalty.couponLabel': {
    fa: 'کد کوپن:',
    en: 'Coupon Code:',
    ru: 'Код купона:',
    tr: 'Kupon Kodu:',
  },
  'loyalty.minOrderLabel': {
    fa: 'حداقل خرید:',
    en: 'Min purchase:',
    ru: 'Мин. покупка:',
    tr: 'Min. alışveriş:',
  },
  'loyalty.howToEarnTitle': {
    fa: 'چگونه امتیاز کسب کنم؟',
    en: 'How do I earn points?',
    ru: 'Как зарабатывать баллы?',
    tr: 'Nasıl puan kazanırım?',
  },
  'loyalty.howToEarnDesc': {
    fa: 'به ازای هر ۱۰ لیر هزینه در بوفه، رزرو سیستم یا خرید تجهیزات جانبی، ۱ امتیاز وفاداری دریافت می‌کنید.',
    en: 'For every 10 TL spent in the buffet, system booking, or purchasing accessories, you receive 1 loyalty point.',
    ru: 'За каждые 10 TL, потраченных в буфете, бронировании или покупке аксессуаров, вы получаете 1 балл.',
    tr: 'Büfede, sistem rezervasyonunda veya aksesuar alımında harcanan her 10 TL için 1 sadakat puanı kazanırsınız.',
  },
  'loyalty.levelsTitle': {
    fa: 'سطوح کاربری گیمرها',
    en: 'Gamer Account Levels',
    ru: 'Уровни аккаунтов геймеров',
    tr: 'Oyuncu Seviyeleri',
  },
  'loyalty.levelsDesc': {
    fa: 'برنزی (زیر ۱۰۰۰ امتیاز)، نقره‌ای (۱۰٪ تخفیف کل فاکتور بوفه)، طلایی (۲۰٪ تخفیف کافه و اولویت حداکثری رزرو سیستم‌های VIP).',
    en: 'Bronze (under 1000 pts), Silver (10% discount on entire buffet), Gold (20% discount on cafe & maximum booking priority for VIP systems).',
    ru: 'Бронзовый (до 1000 б.), Серебряный (10% скидка на весь буфет), Золотой (20% скидка в кафе и высший приоритет бронирования VIP систем).',
    tr: 'Bronz (1000 puan altı), Gümüş (tüm büfede %10 indirim), Altın (%20 kafe indirimi ve VIP sistemler için maksimum rezervasyon önceliği).',
  },
  'loyalty.historyTitle': {
    fa: 'تاریخچه امتیازات باشگاه مشتریان',
    en: 'Loyalty Program Transaction History',
    ru: 'История транзакций клуба лояльности',
    tr: 'Sadakat Kulübü İşlem Geçmişi',
  },
  'loyalty.tableDesc': {
    fa: 'شرح تراکنش وفاداری',
    en: 'Loyalty Transaction Description',
    ru: 'Описание транзакции лояльности',
    tr: 'Sadakat İşlemi Açıklaması',
  },
  'loyalty.tableType': {
    fa: 'نوع تراکنش',
    en: 'Transaction Type',
    ru: 'Тип транзакции',
    tr: 'İşlem Türü',
  },
  'loyalty.tablePoints': {
    fa: 'تغییر امتیاز',
    en: 'Points Change',
    ru: 'Изменение баллов',
    tr: 'Puan Değişimi',
  },
  'loyalty.tableDate': {
    fa: 'تاریخ ثبت',
    en: 'Date Registered',
    ru: 'Дата регистрации',
    tr: 'Kayıt Tarihi',
  },
  'loyalty.earned': {
    fa: 'کسب امتیاز',
    en: 'Earned Points',
    ru: 'Получено',
    tr: 'Kazanılan',
  },
  'loyalty.redeemed': {
    fa: 'خرج امتیاز',
    en: 'Redeemed Points',
    ru: 'Потрачено',
    tr: 'Harcanan',
  },

  // Booking / Reservations Tab
  'booking.title': {
    fa: 'رزرو آنلاین سیستم‌های بازی',
    en: 'Online Booking of Gaming Systems',
    ru: 'Онлайн бронирование игровых систем',
    tr: 'Oyun Sistemlerinin Online Rezervasyonu',
  },
  'booking.desc': {
    fa: 'سیستم‌های PC گیمینگ فوق پیشرفته یا کنسول‌های نسل نهم (PS5 & Xbox Series X) مورد نظر خود را به صورت آنلاین و در ساعت‌های مشخص رزرو کنید.',
    en: 'Book high-end PC gaming systems or ninth-generation consoles (PS5 & Xbox Series X) online for specific hours.',
    ru: 'Забронируйте передовые игровые ПК или консоли девятого поколения (PS5 и Xbox Series X) онлайн на определенное время.',
    tr: 'Gelişmiş oyun bilgisayarlarını veya dokuzuncu nesil konsolları (PS5 ve Xbox Series X) belirli saatler için online rezerve edin.',
  },
  'booking.hourlyRate': {
    fa: 'نرخ ساعتی:',
    en: 'Hourly Rate:',
    ru: 'Почасовой тариф:',
    tr: 'Saatlik Ücret:',
  },
  'booking.available': {
    fa: 'آزاد و آماده رزرو',
    en: 'Available & Ready',
    ru: 'Свободно и готово',
    tr: 'Müsait ve Hazır',
  },
  'booking.reserved': {
    fa: 'رزرو شده / در حال استفاده',
    en: 'Reserved / In Use',
    ru: 'Занято / Используется',
    tr: 'Rezerve / Kullanımda',
  },
  'booking.btnReserve': {
    fa: 'انتخاب و رزرو آنلاین سیستم',
    en: 'Select & Book System',
    ru: 'Выбрать и забронировать',
    tr: 'Sistemi Seç ve Rezerve Et',
  },
  'booking.hours': {
    fa: 'ساعت',
    en: 'hours',
    ru: 'ч.',
    tr: 'saat',
  },
  'booking.checkoutTitle': {
    fa: 'پیش‌فاکتور رزرو سیستم',
    en: 'System Booking Invoice',
    ru: 'Счет на бронирование системы',
    tr: 'Sistem Rezervasyon Faturası',
  },
  'booking.selectedSys': {
    fa: 'سیستم انتخاب شده:',
    en: 'Selected System:',
    ru: 'Выбранная система:',
    tr: 'Seçilen Sistem:',
  },
  'booking.hoursLabel': {
    fa: 'مدت زمان رزرو (ساعت):',
    en: 'Booking Duration (Hours):',
    ru: 'Длительность бронирования (часов):',
    tr: 'Rezervasyon Süresi (Saat):',
  },
  'booking.promoLabel': {
    fa: 'کد تخفیف (در صورت وجود):',
    en: 'Promo Code (if any):',
    ru: 'Промокод (при наличии):',
    tr: 'İndirim Kodu (varsa):',
  },
  'booking.placeholderPromo': {
    fa: 'مثال: GAMER2026',
    en: 'e.g. GAMER2026',
    ru: 'Например: GAMER2026',
    tr: 'Örn: GAMER2026',
  },
  'booking.btnApply': {
    fa: 'اعمال کد',
    en: 'Apply',
    ru: 'Применить',
    tr: 'Uygula',
  },
  'booking.totalPrice': {
    fa: 'مبلغ کل فاکتور:',
    en: 'Total Bill Amount:',
    ru: 'Итоговая сумма:',
    tr: 'Toplam Fatura Tutarı:',
  },
  'booking.pointsToEarn': {
    fa: 'امتیاز وفاداری دریافتی:',
    en: 'Loyalty Points to Earn:',
    ru: 'Будет начислено баллов:',
    tr: 'Kazandıracağı Sadakat Puanı:',
  },
  'booking.btnConfirm': {
    fa: 'پرداخت و تایید نهایی رزرو',
    en: 'Pay & Confirm Booking',
    ru: 'Оплатить и подтвердить бронь',
    tr: 'Öde ve Rezervasyonu Onayla',
  },

  // Cafe Tab
  'cafe.title': {
    fa: 'کلوپ کافه و بوفه آنلاین گیم‌نت',
    en: 'Online Cafe & Buffet Menu',
    ru: 'Онлайн буфет и меню кафе',
    tr: 'Online Kafe & Büfe Menüsü',
  },
  'cafe.desc': {
    fa: 'تنها با چند کلیک، بدون قطع کردن بازی خود، سفارش خود را به بوفه سالن بفرستید تا پرسنل آن را مستقیماً روی میز سیستم شما تحویل دهند!',
    en: 'With just a few clicks, without interrupting your game, send your order to the buffet and have staff deliver it directly to your desk!',
    ru: 'Всего в несколько кликов, не прерывая игру, отправьте заказ в буфет, и персонал доставит его прямо к вашему столу!',
    tr: 'Sadece birkaç tıklamayla, oyununuzu bölmeden siparişinizi büfeye gönderin, personel doğrudan masanıza teslim etsin!',
  },
  'cafe.categoryAll': {
    fa: 'همه خوراکی‌ها',
    en: 'All Items',
    ru: 'Все товары',
    tr: 'Tüm Yiyecekler',
  },
  'cafe.categoryFoods': {
    fa: 'غذاهای گرم',
    en: 'Hot Foods',
    ru: 'Горячая еда',
    tr: 'Sıcak Yemekler',
  },
  'cafe.categoryDrinks': {
    fa: 'نوشیدنی‌های خنک/گرم',
    en: 'Drinks & Beverages',
    ru: 'Напитки',
    tr: 'İçecekler',
  },
  'cafe.categorySnacks': {
    fa: 'تنقلات و چیپس',
    en: 'Snacks & Chips',
    ru: 'Закуски и чипсы',
    tr: 'Atıştırmalıklar',
  },
  'cafe.inventory': {
    fa: 'موجودی بوفه:',
    en: 'Buffet Stock:',
    ru: 'В наличии в буфете:',
    tr: 'Büfe Stoğu:',
  },
  'cafe.pcs': {
    fa: 'عدد',
    en: 'pcs',
    ru: 'шт.',
    tr: 'adet',
  },
  'cafe.outOfStock': {
    fa: 'اتمام موجودی',
    en: 'Out of Stock',
    ru: 'Нет в наличии',
    tr: 'Tükendi',
  },
  'cafe.addToCart': {
    fa: 'افزودن به سبد خرید',
    en: 'Add to Cart',
    ru: 'В корзину',
    tr: 'Sepete Ekle',
  },
  'cafe.cartTitle': {
    fa: 'سبد خرید خوراکی کلاینت',
    en: 'Buffet Shopping Cart',
    ru: 'Корзина буфета',
    tr: 'Büfe Alışveriş Sepeti',
  },
  'cafe.emptyCart': {
    fa: 'سبد خرید شما خالی است',
    en: 'Your cart is empty',
    ru: 'Ваша корзина пуста',
    tr: 'Sepetiniz boş',
  },
  'cafe.emptyCartDesc': {
    fa: 'از منوی بوفه، پیتزا، ردبول یا تنقلات مورد نظرتان را اضافه کنید.',
    en: 'Add pizza, RedBull, or snacks from the buffet menu.',
    ru: 'Добавьте пиццу, RedBull или закуски из меню буфета.',
    tr: 'Büfe menüsünden pizza, RedBull veya atıştırmalıklar ekleyin.',
  },
  'cafe.tableItem': {
    fa: 'آیتم',
    en: 'Item',
    ru: 'Товар',
    tr: 'Ürün',
  },
  'cafe.tableQty': {
    fa: 'تعداد',
    en: 'Qty',
    ru: 'Кол-во',
    tr: 'Adet',
  },
  'cafe.tableSubtotal': {
    fa: 'جمع جزء',
    en: 'Subtotal',
    ru: 'Подытог',
    tr: 'Ara Toplam',
  },
  'cafe.btnOrder': {
    fa: 'ثبت نهایی سفارش بوفه',
    en: 'Finalize Buffet Order',
    ru: 'Оформить заказ в буфете',
    tr: 'Büfe Siparişini Tamamla',
  },

  // Accessories Shop Tab
  'shop.title': {
    fa: 'فروشگاه تجهیزات جانبی گیمینگ حرفه‌ای',
    en: 'Professional Gaming Gear Shop',
    ru: 'Магазин игровых аксессуаров',
    tr: 'Profesyonel Oyuncu Ekipmanları Mağazası',
  },
  'shop.desc': {
    fa: 'محصولات جانبی اورجینال گیمینگ با گارانتی معتبر را به صورت نقد یا با تخفیف‌های ویژه امتیازی به صورت آنی خرید کنید.',
    en: 'Buy original gaming accessories with valid warranty instantly, with cash or special point discounts.',
    ru: 'Покупайте оригинальные игровые аксессуары с гарантией за наличные или со скидками за баллы.',
    tr: 'Orijinal, garantili oyun ekipmanlarını nakit veya puan indirimleriyle anında satın alın.',
  },
  'shop.stock': {
    fa: 'موجودی در انبار:',
    en: 'In Stock:',
    ru: 'В наличии:',
    tr: 'Stokta:',
  },
  'shop.btnBuy': {
    fa: 'خرید فوری کالا',
    en: 'Buy Instantly',
    ru: 'Купить сразу',
    tr: 'Anında Satın Al',
  },

  // Tournaments Tab
  'tournaments.title': {
    fa: 'تقویم زمان‌بندی مسابقات و رویدادها (Schedule)',
    en: 'Tournaments Schedule & Events Calendar',
    ru: 'Расписание турниров и календарь событий',
    tr: 'Turnuva Programı ve Etkinlik Takvimi',
  },
  'tournaments.desc': {
    fa: 'زمان‌بندی مسابقات، مراحل حذفی و بازی‌های خود را روی تقویم دنبال کنید.',
    en: 'Track tournament schedules, elimination brackets, and your games on the calendar.',
    ru: 'Следите за расписанием турниров, сеткой плей-офф и своими играми в календаре.',
    tr: 'Turnuva programlarını, eleme fikstürlerini ve kendi oyunlarınızı takvimden takip edin.',
  },
  'tournaments.allGames': {
    fa: 'همه بازی‌ها',
    en: 'All Games',
    ru: 'Все игры',
    tr: 'Tüm Oyunlar',
  },
  'tournaments.myGames': {
    fa: 'بازی‌های من (VIP Gladiators)',
    en: 'My Games (VIP Gladiators)',
    ru: 'Мои игры (VIP Gladiators)',
    tr: 'Oyunlarım (VIP Gladiators)',
  },
  'tournaments.onlyFinals': {
    fa: 'فقط فینال‌ها',
    en: 'Only Finals',
    ru: 'Только финалы',
    tr: 'Sadece Finaller',
  },
  'tournaments.bracketTitle': {
    fa: 'جدول درختی مسابقات حذفی (Bracket)',
    en: 'Tournament Bracket Tree',
    ru: 'Турнирная сетка плей-офф',
    tr: 'Turnuva Eleme Ağacı (Fikstür)',
  },
  'tournaments.btnRegister': {
    fa: 'ثبت‌نام تیم در تورنمنت',
    en: 'Register Team in Tournament',
    ru: 'Регистрация команды',
    tr: 'Takımı Turnuvaya Kaydet',
  },

  // Blog Tab
  'blog.title': {
    fa: 'بلاگ اخبار بازی‌ها و اطلاعیه‌های سالن',
    en: 'Gaming News Blog & Arena Announcements',
    ru: 'Блог игровых новостей и объявлений',
    tr: 'Oyun Haberleri Bloğu ve Salon Duyuruları',
  },
  'blog.desc': {
    fa: 'جدیدترین اخبار دنیای گیمینگ، تحلیل سخت‌افزار، مقاله‌های آموزشی و تورنمنت‌های آینده سالن را در این بخش مطالعه کنید.',
    en: 'Read the latest gaming news, hardware reviews, tutorials, and upcoming arena events here.',
    ru: 'Читайте здесь свежие игровые новости, обзоры оборудования, гайды и анонсы событий.',
    tr: 'En son oyun dünyası haberlerini, donanım incelemelerini, eğitimleri ve yaklaşan etkinlikleri buradan okuyun.',
  },
  'blog.author': {
    fa: 'نویسنده:',
    en: 'Author:',
    ru: 'Автор:',
    tr: 'Yazar:',
  },
  'blog.btnComments': {
    fa: 'دیدگاه‌ها',
    en: 'Comments',
    ru: 'Комментарии',
    tr: 'Yorumlar',
  },
  'blog.addComment': {
    fa: 'ارسال دیدگاه جدید',
    en: 'Post a Comment',
    ru: 'Написать комментарий',
    tr: 'Yeni Yorum Gönder',
  },

  // C# Code Tab
  'csharp.title': {
    fa: 'کدهای لایه بک‌اند دات‌نت (C# Code Integration)',
    en: 'C# .NET Backend Code Integration',
    ru: 'Интеграция бэкенда на C# .NET',
    tr: 'C# .NET Backend Kod Entegrasyonu',
  },
  'csharp.desc': {
    fa: 'کدهای نوشته شده با معماری پیشرفته سه لایه دات‌نت برای ثبت و اعتبارسنجی فرآیندهای دیتابیس در کلوپ وفاداری.',
    en: 'C# backend code implemented in modern three-tier architecture for validating and registering database processes in the Loyalty Club.',
    ru: 'Код бэкенда на C# в современной трехслойной архитектуре для валидации процессов базы данных в клубе лояльности.',
    tr: 'Sadakat Kulübü veritabanı süreçlerini doğrulamak için modern üç katmanlı mimaride yazılmış C# backend kodları.',
  },

  // Common UI words
  'common.currency': {
    fa: 'لیر',
    en: 'TL',
    ru: 'TL',
    tr: 'TL',
  },
  'common.today': {
    fa: 'امروز',
    en: 'Today',
    ru: 'Сегодня',
    tr: 'Bugün',
  },
  'common.search': {
    fa: 'جستجو...',
    en: 'Search...',
    ru: 'Поиск...',
    tr: 'Ara...',
  },
  'common.points': {
    fa: 'امتیاز',
    en: 'Points',
    ru: 'баллов',
    tr: 'Puan',
  },
  'common.gamerTag': {
    fa: 'گیمرتگ',
    en: 'GamerTag',
    ru: 'Геймертаг',
    tr: 'Oyuncu Adı',
  },
  'common.level': {
    fa: 'سطح',
    en: 'Level',
    ru: 'Уровень',
    tr: 'Seviye',
  },
  'common.back': {
    fa: 'بازگشت',
    en: 'Back',
    ru: 'Назад',
    tr: 'Geri',
  },
};
