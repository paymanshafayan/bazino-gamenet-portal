import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import fs from 'fs';
import path from 'path';

const outputPath = path.join(process.cwd(), 'public', 'bazino-admin-guide.pdf');

// Helper to add page with text wrapping - ASCII only for WinAnsi
function sanitizeAscii(str) {
  return str
    .replace(/→/g, '->')
    .replace(/—/g, '-')
    .replace(/–/g, '-')
    .replace(/•/g, '-')
    .replace(/…/g, '...')
    .replace(/“/g, '"').replace(/”/g, '"')
    .replace(/‘/g, "'").replace(/’/g, "'")
    .replace(/[^\x00-\x7F]/g, ''); // strip any remaining non-ASCII
}

function wrapText(text, maxChars = 80) {
  const clean = sanitizeAscii(text);
  const words = clean.split(' ');
  const lines = [];
  let current = '';
  for (const w of words) {
    if ((current + ' ' + w).trim().length > maxChars) {
      lines.push(current.trim());
      current = w;
    } else {
      current = (current + ' ' + w).trim();
    }
  }
  if (current) lines.push(current.trim());
  return lines;
}

async function main() {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  // For Persian, we skip embedding due to fontkit requirement - will use English only in PDF, Persian in web guide
  let faFont = font;
  let faFontBold = fontBold;

  const sections = [
    {
      id: 'intro',
      titleFa: 'راهنمای جامع پنل مدیریت بازینو - نسخه وردپرس استایل',
      titleEn: 'Bazino Admin Comprehensive Guide - WordPress Style',
      contentFa: [
        'این راهنما برای صاحب گیم‌نت که هیچی حالیش نیست نوشته شده. پنل مدیریت بازینو دقیقاً شبیه پنل وردپرس طراحی شده: سایدبار 160 پیکسل مشکی #1d2327 سمت چپ/راست، نوار بالای 32 پیکسل، محتوای اصلی با پس‌زمینه #f0f0f1 و کارت‌های سفید با بوردر #c3c4c7.',
        'ساختار وردپرس: در وردپرس، منوی ادمین سمت چپ ثابت است، هر آیتم 34 پیکسل ارتفاع دارد، آیکون 20 پیکسل، متن 14 پیکسل، رنگ #eee، هاور #72aee6 با پس‌زمینه #2c3338، فعال #3858e9 با بوردر چپ 4 پیکسل #72aee6. ساب‌منو پس‌زمینه #2c3338 دارد.',
        'در بازینو، همین ساختار پیاده شده: گروه‌های منو مثل وردپرس (داشبورد، مدیریت، فروش، محتوا، هوش و فنی، پیشرفته) با قابلیت جمع شدن، جستجوی منو، و نشان تعداد.',
        'کلیدهای پیش‌فرض: تمام کلیدهایی که در سرویس (ENV) ذخیره شده‌اند به صورت پیش‌فرض در مرکز کلیدها ثبت شده دیده می‌شوند. مدیر فقط تغییر می‌دهد، نیازی به ثبت از صفر نیست. مثلاً GROQ_API_KEY, GEMINI_API_KEY, OPENROUTER_API_KEY, OLLAMA_BASE_URL.',
        'راهنمای هر بخش: روی آیکون ؟ یا دکمه راهنما در هر بخش کلیک کن تا همین راهنما در حالت فول‌اسکرین با قابلیت جستجو، قبلی/بعدی، و بستن باز شود.',
      ],
      contentEn: [
        'This guide is for non-technical game-net owners. Bazino admin is designed exactly like WordPress admin: 160px dark sidebar #1d2327, 32px top bar, main content #f0f0f1 with white cards border #c3c4c7.',
        'WordPress structure: fixed left menu, 34px item height, 20px icon, 14px text, color #eee, hover #72aee6 bg #2c3338, active #3858e9 with 4px left border #72aee6. Submenu bg #2c3338.',
        'In Bazino, same structure: menu groups (Dashboard, Management, Sales, Content, Intelligence, Advanced) collapsible, menu search, count badges.',
        'Default keys: all keys stored in service (ENV) appear as default registered in Keys Center. Admin only changes them.',
        'Guide per section: click ? icon or Guide button to open this guide fullscreen with search, prev/next, close.',
      ],
      steps: [
        { fa: 'وارد پنل /admin شوید - سایدبار 160px مشکی و نوار 32px بالا را می‌بینید', en: 'Enter /admin - see 160px dark sidebar and 32px top bar' },
        { fa: 'منوی سمت چپ را ببینید - هر گروه یک کار مشخص دارد', en: 'See left menu - each group has one job' },
        { fa: 'روی هر بخش کلیک کنید - محتوای اصلی با کارت‌های سفید وردپرس استایل لود می‌شود', en: 'Click any section - main content loads as WP-style white cards' },
      ]
    },
    {
      id: 'dashboard',
      titleFa: 'داشبورد و آمار زنده (/admin/dashboard)',
      titleEn: 'Dashboard & Live Stats (/admin/dashboard)',
      contentFa: [
        'هدف: بدانی امروز چقدر درآوردی، کدام سیستم‌ها پر/خراب هستند، سالن شلوغ است یا خلوت.',
        'کارت‌های بالا: 4 کارت - درآمد امروز، رزروهای فعال، کاربر آنلاین، تیکت باز. هر کارت عدد بزرگ و نمودار کوچک دارد. اگر درآمد صفر است، منبع داده روی Sample است نه Database.',
        'نمودار اوج مصرف: میله‌ای - کدام ساعت شلوغ‌ترین بوده. برای شیفت کارمند و قیمت پویا.',
        'لیست سیستم‌ها و سفارشات اخیر: پایین - سیستم‌ها با وضعیت آنلاین/آفلاین و آخرین سفارشات کافه. کلیک به تب خودش.',
      ],
      contentEn: ['Purpose: know today earnings, busy/broken systems, crowded or not.', 'Top cards: 4 cards - today revenue, active reservations, online users, open tickets.', 'Peak chart: bar - busiest hour.', 'Lists: systems online/offline and recent cafe orders.'],
      steps: [
        { fa: 'کارت درآمد امروز را چک کن - اگر صفر بود، به سفارشی‌سازی > منبع داده برو و Database را انتخاب کن', en: 'Check today revenue card - if zero, go to Customization > Data Source and choose Database' },
        { fa: 'نمودار اوج مصرف را ببین - ساعت شلوغ را برای افزایش قیمت یا شیفت بیشتر استفاده کن', en: 'See peak usage chart - use busiest hour for dynamic pricing' },
        { fa: 'لیست سیستم‌ها را مرور کن - سیستم خراب را OFF کن تا رزرو نگیرد', en: 'Review systems list - turn OFF broken system' },
      ]
    },
    {
      id: 'systems',
      titleFa: 'مدیریت کلاینت‌ها و سیستم‌ها (/admin/systems)',
      titleEn: 'Clients & Systems (/admin/systems)',
      contentFa: [
        'هدف: سیستم جدید اضافه کنی، قیمت ساعتی عوض کنی، سیستم خراب را غیرفعال کنی.',
        'افزودن: فرم بالا - نام (PC VIP 04)، نوع (PC/PS5/Xbox/Simulator)، قیمت ساعتی، دسته مخاطب (اختیاری). دکمه افزودن.',
        'ویرایش: در جدول، دکمه ON/OFF یا قیمت را ویرایش کن. فوری روی سایت اعمال می‌شود.',
        'حذف: اگر جمع شد، حذف کن. رزروهای قبلی پاک نمی‌شود، فقط دیگر قابل رزرو نیست.',
      ],
      contentEn: ['Purpose: add new system, change hourly price, disable broken.', 'Add: top form - name, type, hourly rate, audience.', 'Edit: table toggle or price edit - instant.', 'Delete: past reservations stay.'],
      steps: [
        { fa: 'فرم افزودن را پر کن: نام، نوع، قیمت - افزودن بزن', en: 'Fill add form: name, type, price - click Add' },
        { fa: 'در لیست، سیستم را ON/OFF کن - خراب‌ها را OFF', en: 'In list toggle ON/OFF - OFF broken ones' },
        { fa: 'قیمت را ویرایش کن - ذخیره خودکار', en: 'Edit price - auto save' },
      ]
    },
    {
      id: 'cafe',
      titleFa: 'بوفه و کافه (/admin/cafe)',
      titleEn: 'Cafe Buffet (/admin/cafe)',
      contentFa: [
        'هدف: منوی کافه بچینی، موجودی کم‌وزیاد کنی، سفارش گیمر را آماده کنی.',
        'افزودن آیتم: نام، دسته (Foods/Drinks)، قیمت، عکس، موجودی. تیک موجود بودن.',
        'مدیریت سفارشات: سفارشات جدید Pending می‌آید. آماده شد Preparing یا Delivered کن تا به فاکتور اضافه شود.',
        'اشتباه رایج: عکس نگذاشتن و زشت شدن منو، موجودی صفر ولی تیک موجود روشن.',
      ],
      contentEn: ['Purpose: set cafe menu, manage stock, fulfill orders.', 'Add item: name, category, price, image, stock.', 'Orders: Pending -> Preparing/Delivered to bill.', 'Mistakes: no image, zero stock but available checked.'],
      steps: [
        { fa: 'نام، دسته، قیمت، عکس، موجودی را وارد کن - ذخیره', en: 'Enter name, category, price, image, stock - save' },
        { fa: 'سفارشات جدید را در تب سفارشات ببین - وضعیت را تغییر بده', en: 'See new orders in orders tab - change status' },
      ]
    },
    {
      id: 'shop',
      titleFa: 'فروشگاه لوازم جانبی (/admin/shop)',
      titleEn: 'Accessory Shop (/admin/shop)',
      contentFa: [
        'هدف: موس، هدست، کیبورد اضافه کنی، مشتری با امتیاز بخرد.',
        'افزودن کالا: نام، توضیح، قیمت، عکس، دسته، موجودی.',
        'سفارشات فروشگاه: مثل کافه، تأیید یا رد کن.',
      ],
      contentEn: ['Purpose: add mouse, headset, keyboard - customer buys with points.', 'Add product: name, desc, price, image, category, stock.', 'Orders: approve/reject like cafe.'],
      steps: [
        { fa: 'کالا اضافه کن - قیمت و موجودی دقیق', en: 'Add product - accurate price and stock' },
        { fa: 'سفارشات را تأیید کن', en: 'Approve orders' },
      ]
    },
    {
      id: 'tournaments',
      titleFa: 'مسابقات و تورنمنت‌ها (/admin/tournaments)',
      titleEn: 'Tournaments (/admin/tournaments)',
      contentFa: [
        'هدف: تورنمنت جدید بسازی - جایزه، بازی، تاریخ، تعداد تیم.',
        'ساخت: عنوان، بازی (Valorant)، هزینه ثبت‌نام، تاریخ شروع (شمسی)، تعداد تیم. افزودن.',
        'دیدن تیم‌ها: در لیست تعداد ثبت‌نام شده را می‌بینی. برای براکت به تب مدیریت عملیاتی برو.',
      ],
      contentEn: ['Purpose: create tournament - prize, game, date, teams.', 'Create: title, game, entry fee, start date, max teams.', 'See teams: registered count in list. For bracket go to ops tab.'],
      steps: [
        { fa: 'عنوان، بازی، هزینه، تاریخ، تعداد تیم - افزودن', en: 'Title, game, fee, date, max teams - Add' },
        { fa: 'ثبت‌نام تیم‌ها را ببین', en: 'See team registrations' },
      ]
    },
    {
      id: 'content',
      titleFa: 'استودیوی محتوا و انتشار (/admin/content) - بازطراحی v2',
      titleEn: 'Content Studio (/admin/content) - v2 Redesigned',
      contentFa: [
        'قبلاً 13 تب شلوغ بود، الان 4 کارت بزرگ: راهنمای سریع، تولید تصویر، ترندهای روز، صف انتشار.',
        'مسیر انتشار 4 مرحله‌ای: آماده‌سازی → پیش‌نمایش و تأیید → انتشار و ثبت رسانه → دعوت و انتساب.',
        'تولید تصویر: کارت تولید تصویر - سهمیه روزانه Flux/Imejis/Compose را بالا می‌بینی. فرم: عنوان، مدل (Flux بهترین برای گیمینگ نئونی)، پرامپت دقیق فارسی/انگلیسی مثل "سالن گیمینگ تاریک با نور نئون آبی و بنفش، 10 PC با کیس RGB". تیک تأیید هزینه و تولید. وظیفه در لیست پایین، Completed شد "ورود به پیش‌نویس" بزن.',
        'ترندهای روز: دو ستون YouTube Gaming (عنوان ویدیوهای داغ امروز با کانال و بازدید) و Twitch (پربازدیدترین بازی‌ها با بیننده). برای ایده محتوا عالیه. اگر خالیه، کلید YouTube API یا Twitch Client ID را در مرکز کلیدها وارد نکردی.',
        'صف انتشار: پست‌های ساخته شده - هر کارت عنوان، کپشن، وضعیت (draft/approved)، زبان، تعداد رسانه. روی پست بزن ویرایش: عکس‌ها را مرتب کن (درگ و دراپ)، کپشن بنویس، پیش‌نمایش ببین، تأیید کن (تیک)، بعد انتشار/زمان‌بندی. اگر ارسال زنده خاموشه، در صف می‌ماند تا مدیر در تنظیمات فعال کند.',
      ],
      contentEn: [
        'Previously 13 messy tabs, now 4 big cards: Quick Guide, MediaGen, Trends, Publish Queue.',
        '4-step publishing: Prep → Preview & Approve → Publish & Record Media → Invite & Assign.',
        'MediaGen: quota top, form title, model (Flux best for neon), detailed prompt, confirm cost and generate. Task below, when completed Import to draft.',
        'Trends: YouTube Gaming and Twitch columns for ideas. If empty, need API keys in Keys Center.',
        'Queue: list posts - title, caption, status, language, media count. Click to edit: reorder images drag&drop, caption, preview, approve, publish/schedule.',
      ],
      steps: [
        { fa: 'وارد /admin/content شو - 4 کارت بزرگ را ببین', en: 'Enter /admin/content - see 4 big cards' },
        { fa: 'تولید تصویر: مدل Flux، پرامپت دقیق، تأیید هزینه، تولید', en: 'MediaGen: Flux model, detailed prompt, confirm cost, generate' },
        { fa: 'ترندها: YouTube و Twitch را برای ایده ببین - اگر خالیه کلید API بگذار', en: 'Trends: see YouTube & Twitch for ideas - if empty add API keys' },
        { fa: 'صف انتشار: پست را ویرایش، عکس‌ها را مرتب، کپشن، پیش‌نمایش، تأیید، انتشار', en: 'Queue: edit post, reorder images, caption, preview, approve, publish' },
      ]
    },
    {
      id: 'apiKeys',
      titleFa: 'مرکز کلیدها - همه API یک‌جا (/admin/apiKeys) - مهم‌ترین بخش',
      titleEn: 'Keys Center - All APIs in One Place (/admin/apiKeys) - Most Important',
      contentFa: [
        'قبلاً کلیدها 3 جای مختلف پراکنده بود. الان همه اینجاست: جارویس، اتصال دسکتاپ، تولید محتوا، شبکه اجتماعی، توکن‌های همکاری. هر بخش را باز کن، کلید را بگذار، ذخیره کن.',
        'جارویس (AI): تا 3 مدل - Groq (سریع و ارزان پیشنهاد اول)، OpenRouter (رایگان پشتیبان دوم)، Gemini (قدرتمند پشتیبان سوم)، Ollama (لوکال). هر کدام: نام نمایشی، مدل، کلید API، فعال/غیرفعال، Base URL برای Ollama.',
        'کلیدهای پیش‌فرض از ENV: اگر در سرویس (Railway/ENV) کلیدها ست شده باشند، اینجا به صورت ماسک شده "••••••••" و برچسب "ENV پیش‌فرض" دیده می‌شوند. مدیر فقط تغییر می‌دهد، نیازی به ثبت از صفر نیست. برای تغییر، کلید جدید را وارد و ذخیره کن.',
        'اتصال دسکتاپ (Web Sync): کلید امن برای اتصال برنامه دسکتاپ به وب. حداقل 16 کاراکتر. تولید جدید یا ذخیره دستی. این کلید را در برنامه دسکتاپ بخش Web Sync وارد کن. آدرس: https://bazino.pro',
        'تولید محتوا: GROQ_API_KEY (ترجمه و متن)، IMEJIS_API_KEY (عکس Flux)، CLOUDFLARE_API_TOKEN (ذخیره عکس)، ELEVENLABS_API_KEY (صدا)، ZERNIO_API_KEY (انتشار).',
        'شبکه اجتماعی و ترند: YOUTUBE_API_KEY (ترند گیمینگ)، TWITCH_CLIENT_ID، TWITCH_CLIENT_SECRET. برای بخش ترند یابی لازم است. بدون آن، تب ترندها خالی می‌ماند.',
        'توکن‌های همکاری (baz_...): برای Manus/Zernio - در بخش همکاری ساخته می‌شوند اما اینجا هم نمایش داده می‌شوند تا همه کلیدها یک‌جا باشند.',
        'انتشار و صف: mediagenEnabled، designs allowlist - تنظیمات صف انتشار و تولید تصویر در /admin/content → تنظیمات است. اینجا فقط نمایش وضعیت است.',
      ],
      contentEn: [
        'Previously keys scattered in 3 places. Now all here: Jarvis, desktop sync, content gen, social, affiliate tokens.',
        'Jarvis: up to 3 models - Groq fast & cheap first choice, OpenRouter free second, Gemini powerful third, Ollama local. Each: display name, model, API key, enabled, baseUrl for Ollama.',
        'Default keys from ENV: if set in service (Railway/ENV), shown masked as "••••••••" with label "ENV default". Admin only changes.',
        'Desktop Secure Link (Web Sync): secure key for desktop app to web. Min 16 chars. Generate or save manual. Enter in desktop app Web Sync. Address: https://bazino.pro',
        'Content: GROQ_API_KEY, IMEJIS_API_KEY, CLOUDFLARE_API_TOKEN, ELEVENLABS_API_KEY, ZERNIO_API_KEY.',
        'Social & Trends: YOUTUBE_API_KEY, TWITCH_CLIENT_ID, TWITCH_CLIENT_SECRET needed for Trends tab.',
        'Affiliate tokens (baz_...): for Manus/Zernio - created in Affiliates but shown here to centralize.',
        'Publishing: mediagenEnabled, designs allowlist - settings live in /admin/content → Settings.',
      ],
      steps: [
        { fa: 'بالا دسته را انتخاب کن: جارویس، دسکتاپ، محتوا، اجتماعی، همکاری - همه کلیدها یک‌جاست', en: 'Top choose category: Jarvis, Desktop, Content, Social, Affiliate - all keys in one place' },
        { fa: 'جارویس: 3 باکس می‌بینی - #1 Groq (پیش‌فرض ENV دارد)، #2 OpenRouter، #3 Gemini - هر کدام کلید، مدل، فعال/غیرفعال - کلید پیش‌فرض ماسک شده است، برای تغییر کلید جدید وارد کن و ذخیره', en: 'Jarvis: see 3 boxes - #1 Groq (has ENV default), #2 OpenRouter, #3 Gemini - each key, model, enabled - default masked, enter new to override and save' },
        { fa: 'اتصال دسکتاپ: کلید Web Sync را تولید یا دستی وارد کن - حداقل 16 کاراکتر - در برنامه دسکتاپ وارد کن', en: 'Desktop: generate or enter Web Sync key - min 16 chars - enter in desktop app' },
        { fa: 'تولید محتوا: Groq, Imejis, Cloudflare, ElevenLabs, Zernio را وارد کن - اگر قبلاً در ENV ست شده، پیش‌فرض ثبت شده نشان داده می‌شود', en: 'Content: enter Groq, Imejis, Cloudflare, ElevenLabs, Zernio - if set in ENV, shown as default registered' },
        { fa: 'اجتماعی: YouTube و Twitch را برای ترندها وارد کن - بدون آن ترندها خالی می‌ماند', en: 'Social: enter YouTube and Twitch for Trends - without it trends empty' },
      ]
    },
    {
      id: 'jarvis',
      titleFa: 'جارویس - دستیار مدیر (AI) (/admin/jarvis)',
      titleEn: 'Jarvis - Admin AI Assistant (/admin/jarvis)',
      contentFa: [
        'هدف: مدیریت سریع با زبان طبیعی - دستور بده، کار انجام می‌دهد.',
        'نوشتن دستور: مثلاً "سیستم 4 را غیرفعال کن" یا "امروز چقدر فروختیم؟" یا "یک تورنمنت Valorant بساز".',
        'دیدن نتیجه: جارویس جواب می‌دهد و اگر نیاز باشد کار را انجام می‌دهد (رزرو، قیمت، سفارش).',
        'کلیدهای جارویس: باید در مرکز کلیدها (/admin/apiKeys → جارویس) حداقل یک کلید Groq یا OpenRouter یا Gemini وارد کرده باشی. اگر در ENV ست شده، پیش‌فرض دارد و نیازی به ثبت از صفر نیست.',
        'مدل‌ها: تا 3 مدل با ترتیب اولویت - اولی فعال، دومی و سومی پشتیبان اگر اولی خطا داد.',
      ],
      contentEn: [
        'Purpose: fast management with natural language - command, it does.',
        'Write command: e.g. "disable system 4" or "how much sold today?" or "create Valorant tournament".',
        'See result: Jarvis answers and does task if needed.',
        'Jarvis keys: must have at least one key in Keys Center → Jarvis. If set in ENV, has default.',
        'Models: up to 3 models with priority - first active, second/third fallback.',
      ],
      steps: [
        { fa: 'به /admin/apiKeys → جارویس برو - چک کن حداقل یک کلید ثبت شده (ENV پیش‌فرض) دارد', en: 'Go to /admin/apiKeys → Jarvis - check at least one key registered (ENV default)' },
        { fa: 'به /admin/jarvis برو - دستور فارسی بنویس: مثلاً "سیستم 2 را 30000 کن"', en: 'Go to /admin/jarvis - write Persian command: e.g. "set system 2 to 30000"' },
        { fa: 'نتیجه را ببین - اگر خطا داد، کلید را چک کن', en: 'See result - if error, check key' },
      ]
    },
    {
      id: 'menu',
      titleFa: 'توضیح کامل منوی مدیریت - هر آیتم چه کاری انجام می‌دهد',
      titleEn: 'Full Admin Menu Explanation - What Each Item Does',
      contentFa: [
        'گروه داشبورد: داشبورد و آمار زنده - قلب تپنده، درآمد، سیستم‌ها، سفارشات، تیکت‌ها.',
        'گروه مدیریت: مدیریت کلاینت‌ها و سیستم‌ها - PC/PS5/Xbox/Simulator، قیمت ساعتی، فعال/غیرفعال. بوفه و کافه - منو و سفارشات. فروشگاه لوازم جانبی - کالا و موجودی. مسابقات و تورنمنت‌ها - ساخت تورنمنت. مدیریت عملیاتی مسابقات - براکت، چک‌این، نتیجه.',
        'گروه پیام و محتوا: پیامک گروهی - SMS/Viber/WhatsApp با Messaggio، کمپین. وبلاگ و اخبار - مقاله. استودیوی محتوا و انتشار - 4 کارت بزرگ: تولید تصویر AI، ترندهای روز YouTube/Twitch، صف انتشار اینستا/تلگرام.',
        'گروه فروش و مالی: کوپن‌ها و ساعات رایگان/نیم‌بها - کد تخفیف، ساعت ویژه. کیف پول و پرداخت حضوری - شارژ دستی، تاریخچه. همکاری در فروش - معرف، کمیسیون، لینک دعوت ?ref=CODE.',
        'گروه ارتباط: اتاق‌های گفتگوی زنده - چت گیمرها. پیام‌ها و اعلان‌ها - ارسال به کاربر تکی/گروهی. تیکت‌های پشتیبانی - پاسخ و بستن.',
        'گروه هوش و فنی: جارویس دستیار مدیر (AI) - دستور زبان طبیعی. مرکز کلیدها - همه API یک‌جا: جارویس 3 مدل با کلید پیش‌فرض ENV، Web Sync، تولید محتوا، اجتماعی، همکاری.',
        'گروه پیشرفته: مدیریت قالب‌ها - نصب ZIP (theme.json+theme.css+assets)، فعال‌سازی سراسری، خروجی. اسلایدر صفحه اصلی و اپ - بنر بزرگ. دانلود اپلیکیشن موبایل - لینک APK. سفارشی‌سازی سایت و اطلاعات کلوپ - آدرس، تلفن، شبکه اجتماعی، منبع داده Sample/Database. لاگ‌های دیتابیس - دیباگ. مهاجرت‌های دیتابیس - کد C# برای EF Core. پرزنتیشن - معرفی بازینو.',
      ],
      contentEn: [
        'Dashboard group: Dashboard & Live Stats - heart, revenue, systems, orders, tickets.',
        'Management group: Clients & Systems - PC/PS5/Xbox/Simulator, hourly rate, active/inactive. Cafe Buffet - menu and orders. Accessory Shop - products and stock. Tournaments - create tournament. Tournament Operations - bracket, check-in, result.',
        'Messaging & Content group: Bulk Messaging - SMS/Viber/WhatsApp via Messaggio, campaigns. Blog & News - articles. Content & Publish Queue - 4 big cards: AI image gen, daily trends YouTube/Twitch, publish queue Insta/Telegram.',
        'Sales & Finance group: Coupons & Free/Half Hours - discount code, special hours. Wallet & On-site Payments - manual top-up, history. Affiliate Marketing - referral, commission, invite link ?ref=CODE.',
        'Communication group: Live Chat Rooms - gamers chat. Messages & Notifications - send to single/bulk users. Support Tickets - reply and close.',
        'Intelligence & Technical group: Jarvis AI Assistant - natural language commands. Keys Center - all APIs in one place: Jarvis 3 models with ENV default keys, Web Sync, Content, Social, Affiliate.',
        'Advanced group: Themes - install ZIP (theme.json+theme.css+assets), site-wide activate, export. Home & App Slider - big banner. Mobile App Download - APK link. Site Customization & Club Info - address, phone, social, data source Sample/Database. Database Logs - debug. Database Migrations - C# code for EF Core. Presentation - Bazino intro.',
      ],
      steps: [
        { fa: 'سایدبار 160px را ببین - 7 گروه اصلی دارد: داشبورد، مدیریت، پیام و محتوا، فروش و مالی، ارتباط، هوش و فنی، پیشرفته', en: 'See 160px sidebar - 7 main groups: Dashboard, Management, Messaging & Content, Sales & Finance, Communication, Intelligence & Technical, Advanced' },
        { fa: 'هر گروه را باز کن - تعداد بخش‌ها را می‌بینی - روی هر بخش کلیک کن تا کارت‌های سفید وردپرس استایل لود شود', en: 'Open each group - see count - click any section to load WP-style white cards' },
        { fa: 'برای کلیدها همیشه به هوش و فنی → مرکز کلیدها برو - همه یک‌جاست', en: 'For keys always go to Intelligence → Keys Center - all in one place' },
      ]
    },
  ];

  let currentPage = pdfDoc.addPage([595, 842]); // A4
  let y = 800;
  const margin = 40;
  const maxWidth = 515;

  function addNewPage() {
    currentPage = pdfDoc.addPage([595, 842]);
    y = 800;
    return currentPage;
  }

  function checkSpace(needed = 100) {
    if (y < needed) {
      addNewPage();
    }
  }

  // Title page
  currentPage.drawText('Bazino GameNet', { x: margin, y: y, size: 28, font: fontBold, color: rgb(0.13, 0.2, 0.27) });
  y -= 35;
  currentPage.drawText('Admin Panel Comprehensive Guide', { x: margin, y: y, size: 18, font: fontBold, color: rgb(0.13, 0.44, 0.69) });
  y -= 25;
  currentPage.drawText('WordPress-Style Redesign v2 - 160px Sidebar, 32px Top Bar, #f0f0f1 Content', { x: margin, y: y, size: 10, font: font, color: rgb(0.4, 0.42, 0.46) });
  y -= 20;
  currentPage.drawText('Generated: 2026-09-15 - All keys default registered from ENV, Jarvis boxes, Guide centered', { x: margin, y: y, size: 9, font: font, color: rgb(0.5, 0.5, 0.5) });
  y -= 40;

  currentPage.drawText('This PDF is the complete step-by-step guide for the entire admin panel.', { x: margin, y: y, size: 11, font: font, color: rgb(0.2, 0.2, 0.2) });
  y -= 18;
  currentPage.drawText('Each section help icon opens relevant PDF section fullscreen with prev/next, search, close.', { x: margin, y: y, size: 11, font: font, color: rgb(0.2, 0.2, 0.2) });
  y -= 18;
  currentPage.drawText('Menu is explained item-by-item. Images have highlighted referenced areas.', { x: margin, y: y, size: 11, font: font, color: rgb(0.2, 0.2, 0.2) });
  y -= 30;

  // Table of contents
  currentPage.drawText('Table of Contents / Menu Explanation:', { x: margin, y: y, size: 13, font: fontBold, color: rgb(0.13, 0.2, 0.27) });
  y -= 20;
  sections.forEach((sec, idx) => {
    checkSpace(20);
    currentPage.drawText(`${idx + 1}. ${sec.titleEn} (${sec.id})`, { x: margin, y: y, size: 10, font: font, color: rgb(0.13, 0.2, 0.27) });
    y -= 15;
  });

  // Sections
  for (const sec of sections) {
    addNewPage();
    y = 800;
    // Header
    currentPage.drawText(`${sec.titleEn}`, { x: margin, y: y, size: 16, font: fontBold, color: rgb(0.13, 0.2, 0.27) });
    y -= 22;
    currentPage.drawText(`Section: /admin/${sec.id} - WordPress Style #1d2327 sidebar 160px, top bar 32px, content #f0f0f1`, { x: margin, y: y, size: 9, font: font, color: rgb(0.4, 0.42, 0.46) });
    y -= 25;

    // Content EN
    currentPage.drawText('Description (EN):', { x: margin, y: y, size: 11, font: fontBold, color: rgb(0.13, 0.44, 0.69) });
    y -= 16;
    for (const para of sec.contentEn) {
      const lines = wrapText(para, 85);
      for (const line of lines) {
        checkSpace(20);
        currentPage.drawText(line, { x: margin, y: y, size: 9.5, font: font, color: rgb(0.2, 0.2, 0.2) });
        y -= 13;
      }
      y -= 6;
    }

    y -= 10;
    // Content FA - placeholder note to avoid encoding issues, full Persian in web guide
    currentPage.drawText('Description (FA): Full Persian guide available in web UI modal - /admin/' + sec.id, { x: margin, y: y, size: 9, font: font, color: rgb(0.5, 0.5, 0.5) });
    y -= 16;
    // Skip actual Persian paragraphs to avoid WinAnsi encoding error - they are in web guide
    // For PDF we keep English only, but note Persian exists in web

    y -= 10;
    currentPage.drawText('Step-by-Step:', { x: margin, y: y, size: 11, font: fontBold, color: rgb(0.13, 0.2, 0.27) });
    y -= 16;
    sec.steps.forEach((step, idx) => {
      checkSpace(30);
      const enLines = wrapText(`${idx + 1}. ${step.en}`, 85);
      for (const line of enLines) {
        currentPage.drawText(line, { x: margin, y: y, size: 9, font: font, color: rgb(0.2, 0.2, 0.2) });
        y -= 12;
      }
      y -= 4;
    });

    // Highlight note
    y -= 10;
    checkSpace(30);
    currentPage.drawText('Image Highlight Note:', { x: margin, y: y, size: 10, font: fontBold, color: rgb(0.8, 0.2, 0.2) });
    y -= 14;
    currentPage.drawText('In the web guide, each screenshot has highlighted overlay boxes showing referenced UI parts.', { x: margin, y: y, size: 9, font: font, color: rgb(0.5, 0.2, 0.2) });
    y -= 12;
    currentPage.drawText('E.g., API key input is highlighted with yellow border and label "Paste key here".', { x: margin, y: y, size: 9, font: font, color: rgb(0.5, 0.2, 0.2) });
    y -= 20;
  }

  // Final page - WordPress design research
  addNewPage();
  y = 800;
  currentPage.drawText('WordPress Admin Research & Design Applied', { x: margin, y: y, size: 16, font: fontBold, color: rgb(0.13, 0.2, 0.27) });
  y -= 25;
  const wpNotes = [
    'WordPress admin top bar #wpadminbar: height 32px, bg #1d2327, color #eee, sticky top 0, z-index 9999.',
    'Sidebar #adminmenumain: width 160px, bg #1d2327, min-height calc(100vh - 32px).',
    'Menu top level .wp-menu-top: height 34px, padding 0 12px, font 14px, color #eee, icon 20px #a7aaad.',
    'Hover: bg #2c3338, color #72aee6, icon #72aee6.',
    'Active: bg #3858e9 (or #2271b1), color white, left border 4px solid #72aee6, icon white.',
    'Submenu .wp-submenu: bg #2c3338, padding 7px 0, items height 34px, font 13px, color #c3c4c7, hover #72aee6 bg #1d2327.',
    'Main content #wpcontent: flex 1, bg #f0f0f1, min-height calc(100vh - 32px).',
    'Wrap .wrap: max-width 1280px, cards .postbox bg white border #c3c4c7 shadow 0 1px 1px rgba(0,0,0,0.04).',
    'Page title .wp-heading-inline: font 23px normal, color #1d2327.',
    'Buttons: primary bg #2271b1 border #2271b1 color white hover #135e96, secondary bg white border #8c8f94.',
    'Inputs: height 30px, bg white border #8c8f94 focus #2271b1 shadow 0 0 0 1px #2271b1.',
    'Guide modal: fixed top 32px (accounting for admin bar), left 0 right 0 bottom 0, height calc(100vh - 32px), centered flex, z 100.',
    'Image annotations: absolute overlay boxes with border 2px solid #f0c040 or #2271b1, label badge.',
    'PDF viewer: fullscreen modal with iframe, prev/next buttons, search box filtering steps, close icon X top-right.',
    'Keys Center: default ENV keys shown masked, admin only edits - implemented via getJarvisAiProviders(true) returning envProviders.',
  ];
  for (const note of wpNotes) {
    const lines = wrapText(note, 90);
    for (const line of lines) {
      checkSpace(15);
      currentPage.drawText(line, { x: margin, y: y, size: 9, font: font, color: rgb(0.2, 0.2, 0.2) });
      y -= 12;
    }
    y -= 4;
  }

  const pdfBytes = await pdfDoc.save();
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, pdfBytes);
  console.log(`PDF generated at ${outputPath}, ${pdfBytes.length} bytes, ${pdfDoc.getPageCount()} pages`);
}

main().catch(e => { console.error(e); process.exit(1); });
