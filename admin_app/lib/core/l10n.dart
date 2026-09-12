import 'package:flutter/material.dart';

import 'prefs.dart';

/// زبان اپ: فارسی (پیش‌فرض، RTL) و انگلیسی.
/// رشته‌ها به‌صورت [fa, en] — t(key) بر اساس زبان جاری انتخاب می‌کند.
class AppLang extends ChangeNotifier {
  String code;
  AppLang(this.code);

  bool get isFa => code == 'fa';
  Locale get locale => Locale(code);

  String t(String key) {
    final v = _s[key];
    if (v == null) return key;
    return isFa ? v[0] : v[1];
  }

  void set(String newCode) {
    if (newCode == code) return;
    code = newCode;
    Prefs.lang = newCode;
    notifyListeners();
  }

  void toggle() => set(isFa ? 'en' : 'fa');
}

const Map<String, List<String>> _s = {
  // ── عمومی ──
  'appName': ['پنل مدیریت بازینو', 'Bazino Admin'],
  'login': ['ورود مدیر', 'Admin Sign In'],
  'username': ['نام کاربری', 'Username'],
  'password': ['گذرواژه', 'Password'],
  'serverAddress': ['آدرس سرور', 'Server address'],
  'serverHint': ['مثال: https://bazino.pro', 'e.g. https://bazino.pro'],
  'loginBtn': ['ورود به پنل مدیریت', 'Sign in to admin panel'],
  'loggingIn': ['در حال ورود…', 'Signing in…'],
  'loginFailed': ['ورود ناموفق بود', 'Login failed'],
  'adminOnlyError': ['این حساب کاربری مدیر نیست', 'This account is not an admin'],
  'connectionError': ['ارتباط با سرور برقرار نشد — آدرس را بررسی کنید', 'Could not reach the server — check the address'],
  'fillAllFields': ['همهٔ فیلدها را پر کنید', 'Please fill in all fields'],
  'logout': ['خروج', 'Log out'],
  'logoutConfirm': ['از پنل مدیریت خارج می‌شوید؟', 'Sign out of the admin panel?'],
  'cancel': ['انصراف', 'Cancel'],
  'save': ['ذخیره', 'Save'],
  'delete': ['حذف', 'Delete'],
  'edit': ['ویرایش', 'Edit'],
  'add': ['افزودن', 'Add'],
  'confirm': ['تأیید', 'Confirm'],
  'retry': ['تلاش مجدد', 'Retry'],
  'loading': ['در حال بارگذاری…', 'Loading…'],
  'empty': ['موردی نیست', 'Nothing here yet'],
  'error': ['خطا', 'Error'],
  'refresh': ['به‌روزرسانی', 'Refresh'],
  'all': ['همه', 'All'],
  'status': ['وضعیت', 'Status'],
  'actions': ['عملیات', 'Actions'],
  'details': ['جزئیات', 'Details'],
  'back': ['بازگشت', 'Back'],
  'language': ['زبان', 'Language'],
  'saved': ['ذخیره شد', 'Saved'],
  'deleted': ['حذف شد', 'Deleted'],
  'operationFailed': ['عملیات ناموفق بود', 'Operation failed'],
  'areYouSure': ['مطمئن هستید؟', 'Are you sure?'],
  'deleteConfirmBody': ['این عمل قابل بازگشت نیست.', 'This action cannot be undone.'],
  'active': ['فعال', 'Active'],
  'inactive': ['غیرفعال', 'Inactive'],
  'yes': ['بله', 'Yes'],
  'no': ['خیر', 'No'],
  'sessionExpired': ['نشست منقضی شد — دوباره وارد شوید', 'Session expired — sign in again'],
  'signedInAs': ['ورود به‌عنوان', 'Signed in as'],
  'server': ['سرور', 'Server'],

  // ── داشبورد ──
  'dashboard': ['داشبورد', 'Dashboard'],
  'totalSales': ['کل فروش', 'Total sales'],
  'totalReservations': ['کل رزروها', 'Total reservations'],
  'cafeSales': ['فروش کافه', 'Café sales'],
  'shopSales': ['فروش فروشگاه', 'Shop sales'],
  'activeReservations': ['رزروهای فعال', 'Active reservations'],
  'activeSystems': ['سیستم‌های فعال', 'Active systems'],
  'cafeOrders': ['سفارش‌های کافه', 'Café orders'],
  'shopOrders': ['سفارش‌های فروشگاه', 'Shop orders'],
  'totalUsers': ['کل کاربران', 'Total users'],
  'dataSource': ['منبع داده', 'Data source'],
  'sampleMode': ['نمونه', 'Sample'],
  'databaseMode': ['دیتابیس', 'Database'],
  'switchDataSource': ['تغییر منبع داده', 'Switch data source'],
  'storage': ['ذخیره‌سازی', 'Storage'],
  'dataDir': ['مسیر داده', 'Data directory'],
  'persistent': ['ماندگار', 'Persistent'],
  'dbProvider': ['موتور دیتابیس', 'DB engine'],
  'usedSpace': ['فضای مصرف‌شده', 'Used space'],
  'recentOrders': ['سفارش‌های اخیر', 'Recent orders'],
  'recentReservations': ['رزروهای اخیر', 'Recent reservations'],
  'installedThemesCount': ['قالب‌های نصب‌شده', 'Installed themes'],

  // ── جارویس ──
  'jarvis': ['جارویس', 'Jarvis'],
  'jarvisNotConfigured': ['جارویس پیکربندی نشده — از پنل وب فعالش کنید', 'Jarvis is not configured — enable it from the web panel'],
  'askJarvis': ['از جارویس بپرسید…', 'Ask Jarvis…'],
  'send': ['ارسال', 'Send'],
  'sessions': ['گفتگوها', 'Sessions'],
  'approvals': ['درخواست‌های تأیید', 'Approvals'],
  'approve': ['تأیید', 'Approve'],
  'reject': ['رد', 'Reject'],
  'noSessions': ['گفتگویی نیست', 'No sessions'],
  'noApprovals': ['درخواستی نیست', 'No pending approvals'],
  'pending': ['در انتظار', 'Pending'],

  // ── سیستم‌ها ──
  'systems': ['سیستم‌ها', 'Systems'],
  'addSystem': ['افزودن سیستم', 'Add system'],
  'systemName': ['نام سیستم', 'System name'],
  'systemType': ['نوع', 'Type'],
  'hourlyRate': ['نرخ ساعتی', 'Hourly rate'],
  'floor': ['سالن', 'Floor'],
  'stations': ['ایستگاه‌ها', 'Stations'],
  'activeSessions': ['نشست‌های فعال', 'Active sessions'],
  'finishSession': ['پایان نشست', 'Finish session'],
  'checkin': ['ورود', 'Check-in'],
  'noFloorActivity': ['فعالیت فعالی در سالن نیست', 'No live floor activity'],
  'reservations': ['رزروها', 'Reservations'],

  // ── کافه ──
  'cafe': ['کافه', 'Café'],
  'items': ['آیتم‌ها', 'Items'],
  'addItem': ['افزودن آیتم', 'Add item'],
  'itemName': ['نام آیتم', 'Item name'],
  'category': ['دسته', 'Category'],
  'price': ['قیمت', 'Price'],
  'inventory': ['موجودی', 'Inventory'],
  'orderStatus': ['وضعیت سفارش', 'Order status'],
  'Pending': ['در انتظار', 'Pending'],
  'Preparing': ['در حال آماده‌سازی', 'Preparing'],
  'Delivered': ['تحویل شده', 'Delivered'],
  'customer': ['مشتری', 'Customer'],
  'total': ['مبلغ کل', 'Total'],
  'itemsCount': ['اقلام', 'Items'],

  // ── فروشگاه ──
  'shop': ['فروشگاه', 'Shop'],
  'addProduct': ['افزودن کالا', 'Add product'],
  'description': ['توضیحات', 'Description'],
  'stock': ['انبار', 'Stock'],
  'Processing': ['در حال بررسی', 'Processing'],
  'Shipped': ['ارسال شده', 'Shipped'],

  // ── مسابقات ──
  'tournaments': ['مسابقات', 'Tournaments'],
  'addTournament': ['افزودن مسابقه', 'Add tournament'],
  'title': ['عنوان', 'Title'],
  'game': ['بازی', 'Game'],
  'startDate': ['تاریخ شروع', 'Start date'],
  'registrationFee': ['هزینهٔ ثبت‌نام', 'Registration fee'],
  'maxTeams': ['حداکثر تیم', 'Max teams'],
  'tournamentOps': ['عملیات مسابقات', 'Tournament ops'],
  'checkinTeam': ['ثبت ورود تیم', 'Check-in'],
  'finalizeTournament': ['اختتام مسابقه', 'Finalize'],

  // ── بلاگ ──
  'blog': ['بلاگ', 'Blog'],
  'addArticle': ['افزودن مقاله', 'Add article'],
  'content': ['محتوا', 'Content'],
  'author': ['نویسنده', 'Author'],

  // ── تخفیف‌ها ──
  'promotions': ['تخفیف‌ها', 'Promotions'],
  'coupons': ['کوپن‌ها', 'Coupons'],
  'addCoupon': ['افزودن کوپن', 'Add coupon'],
  'code': ['کد', 'Code'],
  'kind': ['نوع', 'Kind'],
  'percent': ['درصدی', 'Percent'],
  'fixed': ['مبلغ ثابت', 'Fixed amount'],
  'value': ['مقدار', 'Value'],
  'scopes': ['دامنهٔ استفاده', 'Scopes'],
  'reservation': ['رزرو', 'Reservation'],
  'cafeScope': ['کافه', 'Café'],
  'shopScope': ['فروشگاه', 'Shop'],
  'tournamentScope': ['مسابقه', 'Tournament'],
  'minOrder': ['حداقل سفارش', 'Min order'],
  'maxUsage': ['حداکثر استفاده', 'Max usage'],
  'perUserMax': ['سقف هر کاربر', 'Per-user limit'],
  'usage': ['استفاده‌شده', 'Used'],
  'expiry': ['انقضا', 'Expiry'],
  'refreshUsage': ['به‌روزرسانی آمار استفاده', 'Refresh usage'],
  'specialHours': ['ساعات ویژه', 'Special hours'],
  'addSpecialHour': ['افزودن ساعت ویژه', 'Add special hour'],
  'mode': ['حالت', 'Mode'],
  'free': ['رایگان', 'Free'],
  'half': ['نیم‌بها', 'Half price'],
  'percentOff': ['درصد تخفیف', 'Percent off'],
  'name': ['نام', 'Name'],
  'startHour': ['ساعت شروع', 'Start hour'],
  'endHour': ['ساعت پایان', 'End hour'],
  'weekdays': ['روزهای هفته (۰=یکشنبه)', 'Weekdays (0=Sunday)'],

  // ── محتوا (اتوماسیون) ──
  'contentOps': ['محتوا', 'Content'],
  'contentQueue': ['صف محتوا', 'Content queue'],
  'approveContent': ['تأیید', 'Approve'],
  'cancelContent': ['لغو', 'Cancel'],
  'scheduleContent': ['زمان‌بندی', 'Schedule'],
  'publishDue': ['انتشار موارد سرآمده', 'Publish due'],
  'generate': ['تولید متن', 'Generate'],

  // ── چت ──
  'chatRooms': ['اتاق‌های چت', 'Chat rooms'],
  'deleteRoomConfirm': ['این اتاق چت حذف شود؟', 'Delete this chat room?'],

  // ── دیتابیس ──
  'database': ['دیتابیس', 'Database'],
  'dataSourceMode': ['حالت منبع داده', 'Data source mode'],
  'loadSampleData': ['بارگذاری دادهٔ نمونه', 'Load sample data'],
  'clearSampleData': ['حذف دادهٔ نمونه', 'Clear sample data'],
  'dangerZone': ['عملیات خطرناک', 'Danger zone'],
  'resetConfirmBody': [
    'دادهٔ نمونه در دیتابیس نوشته می‌شود؛ دادهٔ واقعی موجود دست‌نخورده می‌ماند. ادامه می‌دهید؟',
    'Sample data will be seeded into the database; existing real data stays untouched. Continue?'
  ],
  'clearConfirmBody': [
    'همهٔ رکوردهای نمونه حذف می‌شوند. ادامه می‌دهید؟',
    'All sample records will be removed. Continue?'
  ],
  'csharpMigrations': ['اسکریپت‌های C# SQL Server', 'C# SQL Server migrations'],
  'switchTo': ['تغییر به', 'Switch to'],

  // ── پیام‌ها ──
  'messages': ['پیام‌ها', 'Messages'],
  'sendMessage': ['ارسال پیام', 'Send message'],
  'recipient': ['گیرنده', 'Recipient'],
  'allUsers': ['همهٔ کاربران', 'All users'],
  'subject': ['موضوع', 'Subject'],
  'messageBody': ['متن پیام', 'Message body'],
  'sendAsNotification': ['به‌عنوان نوتیفیکیشن', 'Send as notification'],
  'messageSent': ['پیام ارسال شد', 'Message sent'],

  // ── قالب‌ها ──
  'themes': ['قالب‌ها', 'Themes'],
  'activeTheme': ['قالب فعال', 'Active theme'],
  'activateTheme': ['فعال‌سازی', 'Activate'],
  'activateThemeConfirm': ['این قالب به‌عنوان قالب پیش‌فرض سایت فعال شود؟', 'Set this theme as the site default?'],
  'deleteThemeConfirm': ['قالب و همهٔ فایل‌هایش حذف شود؟', 'Delete this theme and all its files?'],
  'installTheme': ['نصب قالب از فایل ZIP', 'Install theme from ZIP'],
  'installing': ['در حال نصب…', 'Installing…'],
  'phaseQueued': ['در صف اجرا', 'Queued'],
  'phaseValidating': ['اعتبارسنجی بستهٔ قالب', 'Validating package'],
  'phaseExtracting': ['استخراج و پردازش فایل‌ها', 'Extracting & processing files'],
  'phaseInstalling': ['جایگزینی اتمیک و فعال‌سازی', 'Atomic swap & activation'],
  'installCompleted': ['قالب نصب و فعال شد', 'Theme installed & activated'],
  'installFailed': ['نصب قالب ناموفق بود', 'Theme installation failed'],
  'pickZip': ['انتخاب فایل ZIP', 'Choose ZIP file'],
  'replaceExisting': ['جایگزینی نسخهٔ قبلی', 'Replace existing version'],
  'version': ['نسخه', 'Version'],
  'assets': ['فایل‌ها', 'Assets'],
  'hasComponentJs': ['بخش‌های اختصاصی', 'Custom regions'],
  'cssOnly': ['فقط CSS', 'CSS-only'],
  'noThemes': ['قالبی نصب نیست', 'No themes installed'],

  // ── اسلایدر اپ ──
  'appSlider': ['اسلایدر اپ', 'App slider'],
  'addSlide': ['افزودن اسلاید', 'Add slide'],
  'imageUrl': ['آدرس تصویر', 'Image URL'],
  'mobileImageUrl': ['تصویر موبایل', 'Mobile image URL'],
  'target': ['مقصد', 'Target'],
  'subtitle': ['زیرعنوان', 'Subtitle'],

  // ── اپ موبایل ──
  'mobileApp': ['اپ موبایل', 'Mobile app'],
  'appetizeStatus': ['وضعیت امولاتور Appetize', 'Appetize emulator status'],
  'appetizeToken': ['توکن API اپتایز', 'Appetize API token'],
  'saveToken': ['ذخیرهٔ توکن', 'Save token'],
  'removeToken': ['حذف توکن', 'Remove token'],
  'pushToAppetize': ['ارسال APK به امولاتور', 'Push APK to emulator'],
  'apkUpload': ['آپلود APK', 'Upload APK'],
  'apkFile': ['فایل APK', 'APK file'],
  'apkAvailable': ['APK موجود است', 'APK available'],
  'apkUnavailable': ['APK آپلود نشده', 'No APK uploaded'],
  'storeLinks': ['لینک‌های دانلود', 'Store links'],
  'addLink': ['افزودن لینک', 'Add link'],
  'linkLabel': ['برچسب', 'Label'],
  'linkUrl': ['آدرس لینک', 'Link URL'],
  'linkKind': ['نوع لینک', 'Link kind'],
  'notConfigured': ['پیکربندی نشده', 'Not configured'],
  'configured': ['پیکربندی شده', 'Configured'],
  'apkUploaded': ['APK آپلود شد', 'APK uploaded'],
  'pushed': ['به امولاتور ارسال شد', 'Pushed to emulator'],

  // ── شخصی‌سازی ──
  'customization': ['شخصی‌سازی', 'Customization'],
  'siteSettings': ['تنظیمات سایت', 'Site settings'],
  'settingValue': ['مقدار', 'Value'],
  'themeImages': ['تصاویر قالب', 'Theme images'],
  'uploadImage': ['بارگذاری تصویر', 'Upload image'],
  'slot': ['جایگاه', 'Slot'],
  'imageUploaded': ['تصویر به‌روزرسانی شد', 'Image updated'],

  // ── لاگ دیتابیس ──
  'dbLogs': ['لاگ دیتابیس', 'DB logs'],
  'noLogs': ['لاگی ثبت نشده', 'No logs'],
  'command': ['دستور', 'Command'],
  'time': ['زمان', 'Time'],

  // ── پرزنتیشن ──
  'presentation': ['پرزنتیشن', 'Presentation'],
  'presentationIntro': [
    'معرفی کامل بازینو پرو — نسخهٔ دسکتاپ (۲۴ اسلاید) و نسخهٔ عمودی موبایل',
    'The full Bazino Pro pitch — desktop deck (24 slides) and vertical mobile version'
  ],
  'desktopVersion': ['نسخهٔ دسکتاپ', 'Desktop version'],
  'mobileVersion': ['نسخهٔ موبایل', 'Mobile version'],
  'downloadPdf': ['دانلود PDF', 'Download PDF'],
  'openHtml': ['مشاهدهٔ تعاملی (HTML)', 'Interactive view (HTML)'],

  // ── تیکت‌ها ──
  'tickets': ['تیکت‌ها', 'Tickets'],
  'openTickets': ['تیکت‌های باز', 'Open tickets'],
  'reply': ['پاسخ', 'Reply'],
  'replyPlaceholder': ['پاسخ خود را بنویسید…', 'Write your reply…'],
  'sendReply': ['ارسال پاسخ', 'Send reply'],
  'closeTicket': ['بستن تیکت', 'Close ticket'],
  'markAnswered': ['علامت‌گذاری پاسخ‌داده', 'Mark answered'],
  'noTickets': ['تیکتی نیست', 'No tickets'],
  'answered': ['پاسخ داده شد', 'Answered'],
  'closed': ['بسته شد', 'Closed'],
  'open': ['باز', 'Open'],
  'customerReply': ['پاسخ مشتری', 'Customer replied'],

  // ── کیف پول ──
  'wallet': ['کیف پول', 'Wallet'],
  'customers': ['مشتریان', 'Customers'],
  'balance': ['موجودی', 'Balance'],
  'topup': ['شارژ کیف پول', 'Wallet top-up'],
  'topupAmount': ['مبلغ شارژ', 'Top-up amount'],
  'requestCashout': ['ثبت درخواست برداشت', 'Request cash-out'],
  'cashouts': ['درخواست‌های برداشت', 'Cash-outs'],
  'confirmCashout': ['تأیید پرداخت', 'Confirm paid'],
  'cancelCashout': ['لغو درخواست', 'Cancel request'],
  'adjustCredits': ['تعدادیل اعتبار (credits)', 'Adjust credits'],
  'creditsDelta': ['تغییر اعتبار (±)', 'Credit delta (±)'],
  'note': ['یادداشت', 'Note'],
  'settle': ['تسویهٔ نقدی', 'Settle (cash)'],
  'cancelOrder': ['لغو سفارش', 'Cancel order'],
  'onsiteOrders': ['سفارش‌های حضوری', 'On-site orders'],
  'receipts': ['رسیدها', 'Receipts'],
  'amount': ['مبلغ', 'Amount'],
  'walletOps': ['عملیات مالی', 'Wallet operations'],
  'done': ['انجام شد', 'Done'],
  'confirmSettleBody': ['سفارش به‌صورت نقدی تسویه شود؟', 'Settle this order in cash?'],

  // ── همکاران ──
  'affiliates': ['همکاران', 'Affiliates'],
  'affiliateProgram': ['برنامهٔ همکاری', 'Affiliate program'],
  'affiliatesReport': ['گزارش عملکرد', 'Performance report'],
  'affiliateSettings': ['تنظیمات کمیسیون', 'Commission settings'],
  'addAffiliate': ['افزودن همکار', 'Add affiliate'],
  'affiliateCode': ['کد همکاری', 'Affiliate code'],
  'clicks': ['کلیک', 'Clicks'],
  'leads': ['سرنخ', 'Leads'],
  'netSales': ['فروش خالص', 'Net sales'],
  'commission': ['کمیسیون', 'Commission'],
  'igCampaign': ['کمپین اینستاگرام', 'Instagram campaign'],
  'parentAffiliate': ['معرف (اختیاری)', 'Parent affiliate (optional)'],

  // ── پیام‌رسانی ──
  'messaging': ['پیام‌رسانی', 'Messaging'],
  'campaigns': ['کمپین‌ها', 'Campaigns'],
  'audience': ['مخاطبان', 'Audience'],
  'audienceCount': ['تعداد مخاطبان دارای شماره', 'Audience with phone numbers'],
  'sendMessageCampaign': ['ارسال کمپین', 'Send campaign'],
  'channels': ['کانال‌ها', 'Channels'],
  'smsText': ['متن پیامک', 'SMS text'],
  'viberText': ['متن وایبر', 'Viber text'],
  'useAudience': ['ارسال به همهٔ مخاطبان', 'Send to the whole audience'],
  'manualPhones': ['شماره‌های دستی (با کاما جدا کنید)', 'Manual phone numbers (comma-separated)'],
  'campaignSent': ['کمپین ارسال شد', 'Campaign sent'],
  'noCampaigns': ['کمپینی نیست', 'No campaigns yet'],
  'configFromWebPanel': ['پیکربندی اتصال پیام‌رسان‌ها از پنل وب انجام می‌شود', 'Channel credentials are configured in the web panel'],

  // ── فرم‌ها ──
  'requiredField': ['الزامی است', 'Required'],
  'invalidNumber': ['عدد معتبر نیست', 'Invalid number'],
  'select': ['انتخاب کنید', 'Select'],
};
