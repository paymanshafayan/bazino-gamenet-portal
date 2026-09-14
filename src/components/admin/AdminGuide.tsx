/**
 * سیستم راهنمای جدید بازینو — جایگزین VisualHelpGuide بی‌مصرف
 * برای هر بخش: گام‌به‌گام، با تصویر، قابل فهم برای صاحب گیم‌نت
 */
import React, { useState } from 'react';
import { L } from '../../utils/i18n';
import type { AdminSection } from '../../utils/routes';
import { ADMIN_SECTION_META } from '../AdminPanelTab';
import { groupForSection } from './adminGroups';
import {
  BookOpen,
  ChevronRight,
  ChevronLeft,
  CheckCircle2,
  AlertTriangle,
  Lightbulb,
  Image as ImageIcon,
  Play,
  X,
  HelpCircle,
} from 'lucide-react';

interface GuideStep {
  titleFa: string;
  titleEn: string;
  descFa: string;
  descEn: string;
  imagePrompt?: string; // for generation
  imageUrl?: string;
  tipFa?: string;
  tipEn?: string;
  warningFa?: string;
  warningEn?: string;
}

interface SectionGuide {
  section: AdminSection;
  introFa: string;
  introEn: string;
  purposeFa: string;
  purposeEn: string;
  steps: GuideStep[];
  commonMistakesFa: string[];
  commonMistakesEn: string[];
  videoUrl?: string;
}

export const ADMIN_GUIDES: Record<AdminSection, SectionGuide> = {
  dashboard: {
    section: 'dashboard',
    introFa: 'داشبورد قلب تپنده سالن است. همه‌چیز را یک‌جا می‌بینی: پول امروز، سیستم‌های پر، مشتری‌های فعال.',
    introEn: 'Dashboard is the beating heart. See everything at once: today revenue, busy systems, active customers.',
    purposeFa: 'بدانی امروز چقدر درآوردی، کدام سیستم‌ها خراب یا پر هستند، و آیا سالن شلوغ است یا خلوت.',
    purposeEn: 'Know today earnings, which systems are broken/busy, and if venue is crowded.',
    steps: [
      {
        titleFa: '۱. نگاه اول به کارت‌های بالا',
        titleEn: '1. First look at top cards',
        descFa: 'بالای داشبورد ۴ کارت می‌بینی: درآمد امروز، رزروهای فعال، کاربر آنلاین، تیکت باز. هر کارت یک عدد بزرگ و یک نمودار کوچک دارد.',
        descEn: 'Top has 4 cards: today revenue, active reservations, online users, open tickets. Each has big number and mini chart.',
        imageUrl: '/images/admin-guides/dashboard-step1.png',
        tipFa: 'اگر درآمد صفر است، احتمالاً منبع داده روی Sample است نه Database.',
        tipEn: 'If revenue is zero, data source might be Sample not Database.',
      },
      {
        titleFa: '۲. نمودار اوج مصرف',
        titleEn: '2. Peak usage chart',
        descFa: 'نمودار میله‌ای نشان می‌دهد کدام ساعت شلوغ‌ترین بوده. برای تنظیم شیفت کارمند و قیمت پویا عالیه.',
        descEn: 'Bar chart shows busiest hour. Great for staff shift and dynamic pricing.',
        imageUrl: '/images/admin-guides/dashboard-step2.png',
      },
      {
        titleFa: '۳. لیست سیستم‌ها و سفارشات اخیر',
        titleEn: '3. Systems and recent orders list',
        descFa: 'پایین داشبورد لیست سیستم‌ها با وضعیت آنلاین/آفلاین و آخرین سفارشات کافه را می‌بینی. روی هر کدام بزن به تب خودش می‌روی.',
        descEn: 'Bottom shows systems with online/offline and recent cafe orders. Click goes to its tab.',
        imageUrl: '/images/admin-guides/dashboard-step3.png',
      },
    ],
    commonMistakesFa: ['فکر کردن درآمد صفر یعنی باگ — در حالی که Sample mode است', 'نادیده گرفتن تیکت‌های باز'],
    commonMistakesEn: ['Thinking zero revenue is bug while in Sample mode', 'Ignoring open tickets'],
  },
  systems: {
    section: 'systems',
    introFa: 'اینجا همه PC و کنسول‌ها را مدیریت می‌کنی. اسم، قیمت ساعتی، فعال/غیرفعال.',
    introEn: 'Manage all PCs and consoles. Name, hourly rate, active/inactive.',
    purposeFa: 'سیستم جدید اضافه کنی، قیمت را عوض کنی، یا سیستمی که خراب است را غیرفعال کنی.',
    purposeEn: 'Add new system, change price, disable broken one.',
    steps: [
      { titleFa: '۱. افزودن سیستم جدید', titleEn: '1. Add new system', descFa: 'فرم بالا را پر کن: نام (مثل PC VIP 04)، نوع (PC/PS5)، قیمت ساعتی، دسته مخاطب (اختیاری). دکمه افزودن.',
        imageUrl: '/images/admin-guides/systems-step1.png', descEn: 'Fill top form: name, type, hourly rate, audience. Click add.' },
      { titleFa: '۲. ویرایش قیمت و وضعیت', titleEn: '2. Edit price and status', descFa: 'در جدول، روی دکمه فعال/غیرفعال بزن یا قیمت را ویرایش کن. تغییر فوری روی سایت اعمال می‌شود.',
        imageUrl: '/images/admin-guides/systems-step2.png', descEn: 'In table, toggle active or edit price. Change applies instantly to site.' },
      { titleFa: '۳. حذف سیستم', titleEn: '3. Delete system', descFa: 'اگر سیستمی جمع شد، حذف کن. رزروهای قبلی پاک نمی‌شود، فقط دیگر قابل رزرو نیست.',
        imageUrl: '/images/admin-guides/systems-step3.png', descEn: 'If system removed, delete it. Past reservations stay, just not bookable.' },
    ],
    commonMistakesFa: ['گذاشتن قیمت خیلی پایین و ضرر', 'غیرفعال نکردن سیستم خراب و رزرو گرفتن برای آن'],
    commonMistakesEn: ['Too low price', 'Not disabling broken system'],
  },
  cafe: {
    section: 'cafe',
    introFa: 'منوی کافه و بوفه را اینجا می‌چینی. سفارشات زنده هم همین‌جاست.',
    introEn: 'Cafe menu here. Live orders too.',
    purposeFa: 'غذا، نوشیدنی اضافه کنی، موجودی را کم‌وزیاد کنی، سفارش گیمر را آماده کنی.',
    purposeEn: 'Add food/drink, manage stock, fulfill gamer orders.',
    steps: [
      { titleFa: '۱. افزودن آیتم جدید', titleEn: '1. Add new item', descFa: 'نام، دسته (Foods/Drinks)، قیمت، عکس، موجودی. تیک موجود بودن را بزن.',
        imageUrl: '/images/admin-guides/cafe-step1.png', descEn: 'Name, category, price, image, stock. Check available.' },
      { titleFa: '۲. مدیریت سفارشات', titleEn: '2. Manage orders', descFa: 'سفارشات جدید با وضعیت Pending می‌آید. وقتی آماده شد، وضعیت را به Preparing یا Delivered تغییر بده تا به فاکتور مشتری اضافه شود.',
        imageUrl: '/images/admin-guides/cafe-step2.png', descEn: 'New orders come as Pending. Change to Preparing/Delivered to bill customer.' },
    ],
    commonMistakesFa: ['عکس نگذاشتن و زشت شدن منو', 'موجودی صفر ولی تیک موجود بودن روشن'],
    commonMistakesEn: ['No image', 'Zero stock but marked available'],
  },
  shop: {
    section: 'shop',
    introFa: 'فروشگاه لوازم جانبی: موس، هدست، کیبورد. مشتری با امتیاز می‌خرد.',
    introEn: 'Accessory shop: mouse, headset, keyboard. Customer buys with points.',
    purposeFa: 'کالا اضافه کنی، قیمت و موجودی را مدیریت کنی.',
    purposeEn: 'Add products, manage price and stock.',
    steps: [
      { titleFa: '۱. افزودن کالا', titleEn: '1. Add product', descFa: 'نام، توضیح، قیمت، عکس، دسته، موجودی. ذخیره.',
        imageUrl: '/images/admin-guides/shop-step1.png', descEn: 'Name, description, price, image, category, stock. Save.' },
      { titleFa: '۲. سفارشات فروشگاه', titleEn: '2. Shop orders', descFa: 'مثل کافه، سفارشات را تأیید یا رد کن.',
        imageUrl: '/images/admin-guides/shop-step2.png', descEn: 'Like cafe, approve or reject orders.' },
    ],
    commonMistakesFa: ['قیمت خیلی بالا و نخریدن مشتری', 'عکس بی‌کیفیت'],
    commonMistakesEn: ['Too high price', 'Low quality image'],
  },
  tournaments: {
    section: 'tournaments',
    introFa: 'مسابقات و تورنمنت‌ها را اینجا می‌سازی. جایزه، بازی، تاریخ.',
    introEn: 'Tournaments here. Prize, game, date.',
    purposeFa: 'تورنمنت جدید بسازی و ثبت‌نام تیم‌ها را ببینی.',
    purposeEn: 'Create tournament and see team registrations.',
    steps: [
      { titleFa: '۱. ساخت تورنمنت', titleEn: '1. Create tournament', descFa: 'عنوان، بازی (مثل Valorant)، هزینه ثبت‌نام، تاریخ شروع، تعداد تیم. افزودن.',
        imageUrl: '/images/admin-guides/tournaments-step1.png', descEn: 'Title, game, entry fee, start date, max teams. Add.' },
      { titleFa: '۲. دیدن تیم‌ها', titleEn: '2. See teams', descFa: 'در لیست، تعداد ثبت‌نام شده را می‌بینی. برای مدیریت براکت به تب بعدی برو.',
        imageUrl: '/images/admin-guides/tournaments-step2.png', descEn: 'In list see registered count. For bracket go to next tab.' },
    ],
    commonMistakesFa: ['تاریخ شمسی اشتباه', 'جایزه نگذاشتن'],
    commonMistakesEn: ['Wrong date', 'No prize'],
  },
  tournamentOps: {
    section: 'tournamentOps',
    introFa: 'مدیریت عملیاتی مسابقات: براکت، چک‌این تیم، نتیجه بازی.',
    introEn: 'Tournament operations: bracket, team check-in, match results.',
    purposeFa: 'مسابقه را زنده مدیریت کنی.',
    purposeEn: 'Manage tournament live.',
    steps: [
      { titleFa: '۱. انتخاب تورنمنت', titleEn: '1. Select tournament', descFa: 'از لیست تورنمنت فعال را انتخاب کن.',
        imageUrl: '/images/admin-guides/tournamentOps-step1.png', descEn: 'Select active tournament from list.' },
      { titleFa: '۲. ثبت نتیجه', titleEn: '2. Record result', descFa: 'برنده هر بازی را مشخص کن، براکت خودکار جلو می‌رود.',
        imageUrl: '/images/admin-guides/tournamentOps-step2.png', descEn: 'Set winner, bracket auto advances.' },
    ],
    commonMistakesFa: ['فراموش کردن چک‌این', 'نتیجه اشتباه'],
    commonMistakesEn: ['Forgetting check-in', 'Wrong result'],
  },
  blog: {
    section: 'blog',
    introFa: 'وبلاگ و اخبار کلوپ. مقاله جدید بنویس و منتشر کن.',
    introEn: 'Blog and club news. Write and publish.',
    purposeFa: 'خبر تورنمنت، آموزش، اطلاعیه.',
    purposeEn: 'Tournament news, tutorials, announcements.',
    steps: [
      { titleFa: '۱. نوشتن مقاله', titleEn: '1. Write article', descFa: 'عنوان، محتوا، دسته، عکس. انتشار.',
        imageUrl: '/images/admin-guides/blog-step1.png', descEn: 'Title, content, category, image. Publish.' },
    ],
    commonMistakesFa: ['متن خیلی کوتاه', 'بدون عکس'],
    commonMistakesEn: ['Too short', 'No image'],
  },
  content: {
    section: 'content',
    introFa: 'استودیوی محتوا و انتشار - نسخه بازطراحی شده v2: ساده، فارسی، برای صاحب گیم‌نت که هیچی حالیش نیست. قبلاً ۱۳ تب شلوغ و درهم بود، الان ۴ کارت بزرگ.',
    introEn: 'Content Studio v2 redesigned: simple, Persian, for non-technical game-net owner. Previously 13 messy tabs, now 4 big cards.',
    purposeFa: 'برای اینستاگرام و تلگرام محتوا بسازی: عکس با هوش مصنوعی، ایده از ترندهای روز، و انتشار زمان‌بندی شده. بدون سردرگمی.',
    purposeEn: 'Create content for Instagram/Telegram: AI images, ideas from daily trends, scheduled publishing. No confusion.',
    steps: [
      { 
        titleFa: '۱. راهنمای سریع - استودیو چیست؟', 
        titleEn: '1. Quick Guide - What is Studio?', 
        descFa: 'وقتی وارد /admin/content می‌شی، بالا ۴ کارت بزرگ می‌بینی: راهنمای سریع، تولید تصویر، ترندهای روز، صف انتشار. اول راهنما را بخون - توضیح می‌دهد مسیر انتشار ۴ مرحله‌ای: آماده‌سازی → پیش‌نمایش و تأیید → انتشار و ثبت رسانه → دعوت و انتساب. همه تصاویر واقعی Chromium هستند.',
        imageUrl: '/images/admin-guides/content.png',
        tipFa: 'طراحی جدید: قبلاً ۱۳ تب کوچک با آیکون‌های ریز بود که هیچکس نمی‌فهمید. الان ۴ کارت بزرگ با توضیح فارسی ساده.',
        descEn: 'When you enter /admin/content, top has 4 big cards: Quick Guide, MediaGen, Trends, Publish Queue. Read guide first - explains 4-step publishing flow. All real Chromium screenshots.'
      },
      { 
        titleFa: '۲. تولید تصویر با AI - Flux / Imejis', 
        titleEn: '2. AI Image Generation - Flux / Imejis', 
        descFa: 'کارت تولید تصویر را بزن. بالا سهمیه روزانه را می‌بینی: Flux (مثلاً ۰/۲۰)، Imejis، Compose. فرم: عنوان (برای خودت)، مدل (Flux بهترین برای گیمینگ نئونی)، پرامپت دقیق فارسی یا انگلیسی مثل "سالن گیمینگ تاریک با نور نئون آبی و بنفش، ۱۰ PC با کیس RGB". تیک تأیید هزینه بزن و تولید. وظیفه در لیست پایین می‌افتد، وقتی Completed شد "ورود به پیش‌نویس" بزن.',
        imageUrl: '/images/admin-guides/content-step1.png',
        tipFa: 'اگر خطا داد، کلید API نداری. برو به هوش و تنظیمات فنی → کلیدهای API و اتصال‌ها → Imejis API Key, Cloudflare Token را وارد کن. همه یک‌جا اونجاست.',
        descEn: 'Click MediaGen card. Top shows daily quota: Flux, Imejis, Compose. Form: title, model (Flux best for neon gaming), detailed prompt. Check cost confirmation and generate. Task appears below, when completed click Import to draft.'
      },
      { 
        titleFa: '۳. ترندهای روز - YouTube و Twitch', 
        titleEn: '3. Daily Trends - YouTube & Twitch', 
        descFa: 'کارت ترندهای روز را بزن. دو ستون می‌بینی: YouTube Gaming (عنوان ویدیوهای داغ امروز با کانال و بازدید) و Twitch (پربازدیدترین بازی‌ها با تعداد بیننده). اینا برای ایده محتوا عالیه. مثلاً اگه Valorant ترند شده، پرامپت بساز "مسابقه Valorant در سالن بازینو". اگر خالیه، یعنی کلید YouTube API یا Twitch Client ID را در مرکز کلیدها وارد نکردی.',
        imageUrl: '/images/admin-guides/content-step2.png',
        warningFa: 'ترندها خالی؟ برو به /admin/apiKeys → شبکه اجتماعی و ترند → YouTube API Key و Twitch Client ID/Secret را وارد کن. بدون کلید، دیتایی نمیاد.',
        descEn: 'Click Trends card. Two columns: YouTube Gaming (hot videos today) and Twitch (most viewed games). Great for content ideas. If empty, you need YouTube API or Twitch keys in Keys Center.'
      },
      { 
        titleFa: '۴. صف انتشار - پیش‌نویس تا اینستا/تلگرام', 
        titleEn: '4. Publish Queue - Draft to Insta/Telegram', 
        descFa: 'کارت صف انتشار را بزن. پست‌هایی که ساختی اینجا لیست می‌شود: هر کارت عنوان، کپشن، وضعیت (draft/approved)، زبان، تعداد رسانه. روی پست بزن ویرایش می‌شود: عکس‌ها را مرتب کن (درگ و دراپ)، کپشن بنویس، پیش‌نمایش ببین، تأیید کن (تیک)، بعد انتشار/زمان‌بندی بزن. اگر ارسال زنده خاموشه، در صف می‌ماند تا مدیر در تنظیمات فعال کند.',
        imageUrl: '/images/admin-guides/content-step3.png',
        tipFa: 'مسیر کامل: تولید رسانه → وظایف → ورود به پیش‌نویس → اینجا کپشن و ترتیب → پیش‌نمایش و تأیید → انتشار. همه گام‌ها فارسی و ساده.',
        descEn: 'Click Publish Queue card. Posts you created list here: title, caption, status, language, media count. Click to edit: reorder images (drag & drop), write caption, preview, approve (check), then publish/schedule. If live delivery paused, stays queued.'
      },
    ],
    commonMistakesFa: [
      'کلید API نگذاشتن و خالی ماندن ترندها و تولید تصویر - راه‌حل: /admin/apiKeys همه یک‌جا',
      'تولید بی‌رویه و تمام شدن سهمیه روزانه Flux/Imejis',
      'فکر کردن انتشار خودکار است در حالی که ارسال زنده خاموش است و باید در تنظیمات فعال شود',
      'نادیده گرفتن راهنمای سریع بالا و گیج شدن در ۱۳ تب قدیمی - الان ۴ کارت ساده کافیست'
    ],
    commonMistakesEn: ['Missing API keys', 'Over-generating and hitting quota', 'Thinking auto-publish while live delivery paused', 'Ignoring quick guide'],
  },
  promotions: {
    section: 'promotions',
    introFa: 'کوپن‌ها و ساعات ویژه: تخفیف، ساعت رایگان، نیم‌بها.',
    introEn: 'Coupons and special hours: discount, free hour, half-price.',
    purposeFa: 'مشتری را با تخفیف برگردانی.',
    purposeEn: 'Bring back customers with discounts.',
    steps: [
      { titleFa: '۱. ساخت کوپن', titleEn: '1. Create coupon', descFa: 'کد، درصد تخفیف، تاریخ انقضا، تعداد استفاده. ذخیره.',
        imageUrl: '/images/admin-guides/promotions-step1.png', descEn: 'Code, discount %, expiry, usage limit. Save.' },
      { titleFa: '۲. ساعت ویژه', titleEn: '2. Special hours', descFa: 'مثلاً جمعه ۱۰ صبح تا ۱۲ ظهر نیم‌بها.',
        imageUrl: '/images/admin-guides/promotions-step2.png', descEn: 'E.g. Friday 10am-12pm half-price.' },
    ],
    commonMistakesFa: ['کوپن بدون تاریخ انقضا و سوءاستفاده', 'درصد تخفیف خیلی بالا'],
    commonMistakesEn: ['No expiry', 'Too high discount'],
  },
  chat: {
    section: 'chat',
    introFa: 'اتاق‌های گفتگوی زنده: گیمرها با هم چت می‌کنند.',
    introEn: 'Live chat rooms: gamers chat together.',
    purposeFa: 'اتاق بسازی، مدیریت کنی، حذف کنی.',
    purposeEn: 'Create, manage, delete rooms.',
    steps: [
      { titleFa: '۱. ساخت اتاق', titleEn: '1. Create room', descFa: 'نام اتاق (مثل Valorant) را بنویس، ایجاد.',
        imageUrl: '/images/admin-guides/chat-step1.png', descEn: 'Write room name, create.' },
    ],
    commonMistakesFa: ['اسم نامناسب', 'اتاق زیاد و شلوغی'],
    commonMistakesEn: ['Bad name', 'Too many rooms'],
  },
  messages: {
    section: 'messages',
    introFa: 'ارسال پیام و نوتیفیکیشن به کاربرها: تکی یا گروهی.',
    introEn: 'Send messages and notifications to users: single or bulk.',
    purposeFa: 'اطلاع‌رسانی، تأیید رزرو، تبلیغ.',
    purposeEn: 'Announcements, reservation confirm, promo.',
    steps: [
      { titleFa: '۱. انتخاب گیرنده', titleEn: '1. Choose recipient', descFa: 'همه یا یک کاربر خاص.',
        imageUrl: '/images/admin-guides/messages-step1.png', descEn: 'All or specific user.' },
      { titleFa: '۲. نوشتن پیام', titleEn: '2. Write message', descFa: 'موضوع و متن. تیک نوتیفیکیشن برای پوش زنده.',
        imageUrl: '/images/admin-guides/messages-step2.png', descEn: 'Subject and body. Check notification for live push.' },
    ],
    commonMistakesFa: ['پیام اسپم و اذیت کاربر', 'موضوع خالی'],
    commonMistakesEn: ['Spam', 'Empty subject'],
  },
  tickets: {
    section: 'tickets',
    introFa: 'تیکت‌های پشتیبانی: مشکل کاربر را حل کن.',
    introEn: 'Support tickets: solve user problems.',
    purposeFa: 'پاسخ به تیکت، بستن تیکت.',
    purposeEn: 'Answer and close tickets.',
    steps: [
      { titleFa: '۱. دیدن تیکت باز', titleEn: '1. See open ticket', descFa: 'لیست تیکت‌های باز. روی یکی بزن.',
        imageUrl: '/images/admin-guides/tickets-step1.png', descEn: 'List of open tickets. Click one.' },
      { titleFa: '۲. پاسخ و بستن', titleEn: '2. Reply and close', descFa: 'پاسخ بنویس، اگر حل شد ببند.',
        imageUrl: '/images/admin-guides/tickets-step2.png', descEn: 'Write reply, close if solved.' },
    ],
    commonMistakesFa: ['دیر جواب دادن', 'نبستن تیکت حل شده'],
    commonMistakesEn: ['Late reply', 'Not closing solved'],
  },
  wallet: {
    section: 'wallet',
    introFa: 'کیف پول و پرداخت حضوری: شارژ، کسر، تاریخچه.',
    introEn: 'Wallet and on-site payments: top-up, deduct, history.',
    purposeFa: 'موجودی کاربر را مدیریت کنی.',
    purposeEn: 'Manage user balance.',
    steps: [
      { titleFa: '۱. جستجوی کاربر', titleEn: '1. Search user', descFa: 'نام کاربری را بزن، کیف پولش را ببین.',
        imageUrl: '/images/admin-guides/wallet-step1.png', descEn: 'Enter username, see wallet.' },
      { titleFa: '۲. شارژ دستی', titleEn: '2. Manual top-up', descFa: 'مبلغ و یادداشت، ثبت.',
        imageUrl: '/images/admin-guides/wallet-step2.png', descEn: 'Amount and note, submit.' },
    ],
    commonMistakesFa: ['شارژ اشتباه به کاربر دیگر', 'بدون یادداشت'],
    commonMistakesEn: ['Wrong user', 'No note'],
  },
  affiliates: {
    section: 'affiliates',
    introFa: 'همکاری در فروش: معرف، کمیسیون، لینک دعوت.',
    introEn: 'Affiliate marketing: referral, commission, invite link.',
    purposeFa: 'همکار اضافه کنی، کمیسیون ببینی، تنظیمات درصد.',
    purposeEn: 'Add affiliate, see commission, set percentages.',
    steps: [
      { titleFa: '۱. تنظیم درصدها', titleEn: '1. Set percentages', descFa: 'بالای صفحه: درصد مشتری جدید، بازگشتی، تورنمنت. ذخیره.',
        imageUrl: '/images/admin-guides/affiliates-step1.png', descEn: 'Top: new customer %, returning, tournament. Save.' },
      { titleFa: '۲. افزودن همکار', titleEn: '2. Add affiliate', descFa: 'کد، نام کاربری کیف پول، نام نمایشی. ثبت.',
        imageUrl: '/images/admin-guides/affiliates-step2.png', descEn: 'Code, wallet username, display name. Create.' },
      { titleFa: '۳. لینک دعوت', titleEn: '3. Invite link', descFa: 'لینک ?ref=CODE را به همکار بده. دوست با لینک بیاید کوپن می‌گیرد، همکار پورسانت.',
        imageUrl: '/images/admin-guides/affiliates-step3.png', descEn: 'Give ?ref=CODE link to partner. Friend via link gets coupon, partner gets commission.' },
    ],
    commonMistakesFa: ['کد تکراری', 'درصد خیلی بالا'],
    commonMistakesEn: ['Duplicate code', 'Too high %'],
  },
  messaging: {
    section: 'messaging',
    introFa: 'پیامک گروهی: SMS, Viber, WhatsApp با Messaggio.',
    introEn: 'Bulk messaging: SMS, Viber, WhatsApp via Messaggio.',
    purposeFa: 'کمپین تبلیغاتی بفرستی.',
    purposeEn: 'Send promo campaigns.',
    steps: [
      { titleFa: '۱. نوشتن متن', titleEn: '1. Write text', descFa: 'متن پیامک را بنویس، کانال انتخاب کن.',
        imageUrl: '/images/admin-guides/messaging-step1.png', descEn: 'Write SMS text, choose channel.' },
      { titleFa: '۲. ارسال', titleEn: '2. Send', descFa: 'پیش‌نمایش تعداد گیرنده، ارسال.',
        imageUrl: '/images/admin-guides/messaging-step2.png', descEn: 'Preview recipient count, send.' },
    ],
    commonMistakesFa: ['متن طولانی و هزینه زیاد', 'بدون تست'],
    commonMistakesEn: ['Too long', 'No test'],
  },
  themes: {
    section: 'themes',
    introFa: 'قالب‌ها: ظاهر سایت را عوض کن.',
    introEn: 'Themes: change site look.',
    purposeFa: 'قالب نصب کنی، فعال کنی، خروجی بگیری.',
    purposeEn: 'Install, activate, export themes.',
    steps: [
      { titleFa: '۱. نصب ZIP', titleEn: '1. Install ZIP', descFa: 'فایل ZIP قالب (theme.json + theme.css + assets) را بکش و رها کن. نصب خودکار.',
        imageUrl: '/images/admin-guides/themes-step1.png', descEn: 'Drag & drop theme ZIP. Auto install.' },
      { titleFa: '۲. فعال‌سازی', titleEn: '2. Activate', descFa: 'روی فعال‌سازی بزن تا برای همه بازدیدکنندگان اعمال شود.',
        imageUrl: '/images/admin-guides/themes-step2.png', descEn: 'Click activate to apply site-wide.' },
    ],
    commonMistakesFa: ['ZIP اشتباه بدون theme.json', 'فعال نکردن بعد نصب و فکر کردن خراب است'],
    commonMistakesEn: ['Wrong ZIP without theme.json', 'Not activating after install'],
  },
  appSlider: {
    section: 'appSlider',
    introFa: 'اسلایدر صفحه اصلی و اپ: بنر بزرگ بالا.',
    introEn: 'Home & App slider: big banner top.',
    purposeFa: 'اسلاید اضافه کنی، عکس، عنوان، لینک.',
    purposeEn: 'Add slide with image, title, link.',
    steps: [
      { titleFa: '۱. افزودن اسلاید', titleEn: '1. Add slide', descFa: 'آدرس عکس، عنوان فارسی/انگلیسی، مقصد کلیک (رزرو/کافه...). افزودن.',
        imageUrl: '/images/admin-guides/appSlider-step1.png', descEn: 'Image URL, FA/EN title, click target. Add.' },
      { titleFa: '۲. ویرایش', titleEn: '2. Edit', descFa: 'روی ویرایش بزن، تغییر بده، ذخیره.',
        imageUrl: '/images/admin-guides/appSlider-step2.png', descEn: 'Click edit, change, save.' },
    ],
    commonMistakesFa: ['عکس خیلی سنگین و کند شدن سایت', 'لینک اشتباه'],
    commonMistakesEn: ['Heavy image', 'Wrong link'],
  },
  mobileAppDownload: {
    section: 'mobileAppDownload',
    introFa: 'دانلود اپ موبایل: لینک APK و توضیح.',
    introEn: 'Mobile app download: APK link and info.',
    purposeFa: 'لینک دانلود را بگذاری.',
    purposeEn: 'Set download link.',
    steps: [
      { titleFa: '۱. تنظیم لینک', titleEn: '1. Set link', descFa: 'آدرس APK و توضیحات.',
        imageUrl: '/images/admin-guides/mobileAppDownload-step1.png', descEn: 'APK URL and description.' },
    ],
    commonMistakesFa: ['لینک خراب', 'نسخه قدیمی'],
    commonMistakesEn: ['Broken link', 'Old version'],
  },
  customization: {
    section: 'customization',
    introFa: 'سفارشی‌سازی سایت و اطلاعات کلوپ: آدرس، تلفن، شبکه اجتماعی، قیمت‌ها.',
    introEn: 'Site customization & club info: address, phone, social, pricing.',
    purposeFa: 'اطلاعات کلوپ را ویرایش کنی.',
    purposeEn: 'Edit club info.',
    steps: [
      { titleFa: '۱. منبع داده', titleEn: '1. Data source', descFa: 'بالا: Sample یا Database. Sample برای نمایش، Database برای واقعی.',
        imageUrl: '/images/admin-guides/customization-step1.png', descEn: 'Top: Sample or Database. Sample for demo, Database for real.' },
      { titleFa: '۲. اطلاعات تماس', titleEn: '2. Contact info', descFa: 'تلفن، آدرس، ساعات کاری، لینک نقشه.',
        imageUrl: '/images/admin-guides/customization-step2.png', descEn: 'Phone, address, hours, map link.' },
      { titleFa: '۳. شبکه اجتماعی', titleEn: '3. Social links', descFa: 'اینستا، تلگرام، یوتیوب اضافه کن.',
        imageUrl: '/images/admin-guides/customization-step3.png', descEn: 'Add Insta, Telegram, YouTube.' },
    ],
    commonMistakesFa: ['آدرس اشتباه روی نقشه', 'Sample ماندن و فکر کردن اطلاعات ذخیره نمی‌شود'],
    commonMistakesEn: ['Wrong address', 'Staying in Sample'],
  },
  dbLogs: {
    section: 'dbLogs',
    introFa: 'لاگ‌های دیتابیس: ببینی چه درخواستی به DB رفته.',
    introEn: 'Database logs: see what queries went to DB.',
    purposeFa: 'دیباگ و بررسی عملکرد.',
    purposeEn: 'Debug and performance.',
    steps: [
      { titleFa: '۱. دیدن لاگ', titleEn: '1. View logs', descFa: 'لیست لاگ‌ها با زمان و نوع عملیات.',
        imageUrl: '/images/admin-guides/dbLogs-step1.png', descEn: 'List with time and operation type.' },
      { titleFa: '۲. رفرش', titleEn: '2. Refresh', descFa: 'دکمه بروزرسانی.',
        imageUrl: '/images/admin-guides/dbLogs-step2.png', descEn: 'Refresh button.' },
    ],
    commonMistakesFa: ['نادیده گرفتن لاگ خطا'],
    commonMistakesEn: ['Ignoring error logs'],
  },
  apiKeys: {
    section: 'apiKeys',
    introFa: 'مرکز کلیدها — قبلاً پراکنده بود، الان همه اینجاست.',
    introEn: 'Keys Center — previously scattered, now all here.',
    purposeFa: 'همه API Key ها را یک‌جا مدیریت کنی.',
    purposeEn: 'Manage all API keys in one place.',
    steps: [
      { titleFa: '۱. انتخاب دسته', titleEn: '1. Choose category', descFa: 'بالا دسته را بزن: جارویس، دسکتاپ، محتوا، اجتماعی، همکاری.',
        imageUrl: '/images/admin-guides/apiKeys-step1.png', descEn: 'Top: choose category: Jarvis, Desktop, Content, Social, Affiliate.' },
      { titleFa: '۲. وارد کردن کلید', titleEn: '2. Enter key', descFa: 'کلید را پیست کن، ذخیره. چشم برای دیدن/مخفی.',
        imageUrl: '/images/admin-guides/apiKeys-step2.png', descEn: 'Paste key, save. Eye to show/hide.' },
      { titleFa: '۳. تست', titleEn: '3. Test', descFa: 'بعد ذخیره، به تب مربوطه برو و تست کن (مثلاً ترندها).',
        imageUrl: '/images/admin-guides/apiKeys-step3.png', descEn: 'After save, go to related tab and test (e.g. trends).' },
    ],
    commonMistakesFa: ['کلید اشتباه یا ناقص', 'ندادن دسترسی درست در کنسول API'],
    commonMistakesEn: ['Wrong/incomplete key', 'Not enabling API in console'],
  },
  presentation: {
    section: 'presentation',
    introFa: 'پرزنتیشن: معرفی بازینو برای سرمایه‌گذار یا مشتری.',
    introEn: 'Presentation: Bazino intro for investor or customer.',
    purposeFa: 'اسلایدها را ببینی، PDF بگیری.',
    purposeEn: 'View slides, get PDF.',
    steps: [
      { titleFa: '۱. دیدن اسلایدها', titleEn: '1. View slides', descFa: 'اسلایدها را ورق بزن.',
        imageUrl: '/images/admin-guides/presentation-step1.png', descEn: 'Flip through slides.' },
    ],
    commonMistakesFa: ['-'],
    commonMistakesEn: ['-'],
  },
  jarvis: {
    section: 'jarvis',
    introFa: 'جارویس دستیار AI مدیر: دستور بده، کار انجام می‌دهد.',
    introEn: 'Jarvis AI assistant: command, it does.',
    purposeFa: 'مدیریت سریع با زبان طبیعی.',
    purposeEn: 'Fast management with natural language.',
    steps: [
      { titleFa: '۱. نوشتن دستور', titleEn: '1. Write command', descFa: 'مثلاً: سیستم ۴ را غیرفعال کن. یا: امروز چقدر فروختیم؟',
        imageUrl: '/images/admin-guides/jarvis-step1.png', descEn: 'E.g. disable system 4. Or: how much sold today?' },
      { titleFa: '۲. دیدن نتیجه', titleEn: '2. See result', descFa: 'جارویس جواب می‌دهد و اگر نیاز باشد کار را انجام می‌دهد.',
        imageUrl: '/images/admin-guides/jarvis-step2.png', descEn: 'Jarvis answers and does task if needed.' },
    ],
    commonMistakesFa: ['دستور مبهم', 'کلید AI نگذاشتن'],
    commonMistakesEn: ['Vague command', 'Missing AI key'],
  },
  migrations: {
    section: 'migrations',
    introFa: 'مهاجرت‌های دیتابیس: کد C# برای EF Core.',
    introEn: 'Database migrations: C# code for EF Core.',
    purposeFa: 'برای دولوپر: ببینی جدول‌ها چطور ساخته می‌شود.',
    purposeEn: 'For dev: see how tables are created.',
    steps: [
      { titleFa: '۱. کپی کد', titleEn: '1. Copy code', descFa: 'کد را کپی کن و در پروژه C# بگذار.',
        imageUrl: '/images/admin-guides/migrations-step1.png', descEn: 'Copy code to C# project.' },
    ],
    commonMistakesFa: ['دست زدن بدون دانش'],
    commonMistakesEn: ['Touching without knowledge'],
  },
};

interface Props {
  section: AdminSection;
  language: 'fa' | 'en' | 'ru' | 'tr';
  dir: 'rtl' | 'ltr';
  isOpen: boolean;
  onClose: () => void;
}

export default function AdminGuide({ section, language, dir, isOpen, onClose }: Props) {
  const [activeStepIdx, setActiveStepIdx] = useState(0);
  if (!isOpen) return null;
  const guide = ADMIN_GUIDES[section];
  if (!guide) return null;
  const step = guide.steps[activeStepIdx];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" dir={dir}>
      <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={onClose} />
      <div className="relative bg-[#0e1020] border border-white/10 rounded-[20px] w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
        {/* Header */}
        <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between bg-gradient-to-r from-primary/10 to-violet-500/10">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary text-black flex items-center justify-center">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-black text-white">{L(language, ADMIN_SECTION_META[section])} — {L(language, { fa: 'راهنمای گام‌به‌گام', en: 'Step-by-step Guide', ru: 'Пошаговое руководство', tr: 'Adım Adım Kılavuz' })}</h2>
              <p className="text-[11px] text-white/60">{L(language, { fa: guide.introFa, en: guide.introEn, ru: guide.introEn, tr: guide.introEn })}</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 hover:text-white flex items-center justify-center">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 grid lg:grid-cols-12 gap-6">
          {/* Steps list */}
          <div className="lg:col-span-4 space-y-3">
            <div className="bg-black/30 rounded-xl p-3 border border-white/5">
              <h4 className="text-[11px] font-black text-white/60 uppercase mb-2 flex items-center gap-1.5">
                <HelpCircle className="w-3.5 h-3.5" /> {L(language, { fa: 'مراحل', en: 'Steps', ru: 'Шаги', tr: 'Adımlar' })} ({guide.steps.length})
              </h4>
              <div className="space-y-1.5">
                {guide.steps.map((s, idx) => (
                  <button
                    key={idx}
                    onClick={() => setActiveStepIdx(idx)}
                    className={`w-full text-left ${dir === 'rtl' ? 'text-right' : ''} px-3 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition-all
                      ${idx === activeStepIdx ? 'bg-primary text-black' : 'bg-white/5 text-white/70 hover:bg-white/10 hover:text-white'}`}
                  >
                    <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black shrink-0 ${idx === activeStepIdx ? 'bg-black text-primary' : 'bg-white/10'}`}>{idx + 1}</span>
                    <span className="truncate">{L(language, { fa: s.titleFa, en: s.titleEn, ru: s.titleEn, tr: s.titleEn })}</span>
                    {idx < activeStepIdx && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 ms-auto" />}
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3">
              <h4 className="text-[11px] font-black text-amber-300 flex items-center gap-1.5 mb-1.5">
                <AlertTriangle className="w-3.5 h-3.5" /> {L(language, { fa: 'اشتباهات رایج', en: 'Common Mistakes', ru: 'Частые ошибки', tr: 'Yaygın Hatalar' })}
              </h4>
              <ul className="text-[11px] text-amber-200/70 leading-relaxed list-disc ps-4 space-y-1">
                {(language === 'fa' ? guide.commonMistakesFa : guide.commonMistakesEn).map((m, i) => (
                  <li key={i}>{m}</li>
                ))}
              </ul>
            </div>
          </div>

          {/* Step detail */}
          <div className="lg:col-span-8 space-y-4">
            <div className="bg-white/[0.02] border border-white/5 rounded-xl p-4">
              <h3 className="text-sm font-black text-white mb-2">{L(language, { fa: step.titleFa, en: step.titleEn, ru: step.titleEn, tr: step.titleEn })}</h3>
              <p className="text-[13px] leading-relaxed text-white/70">{L(language, { fa: step.descFa, en: step.descEn, ru: step.descEn, tr: step.descEn })}</p>

              {step.tipFa && (
                <div className="mt-3 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex gap-2">
                  <Lightbulb className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <p className="text-[11px] text-emerald-200/80 leading-relaxed">{L(language, { fa: step.tipFa, en: step.tipEn || step.tipFa, ru: step.tipEn || '', tr: step.tipEn || '' })}</p>
                </div>
              )}
              {step.warningFa && (
                <div className="mt-3 p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 flex gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  <p className="text-[11px] text-rose-200/80 leading-relaxed">{L(language, { fa: step.warningFa, en: step.warningEn || step.warningFa, ru: step.warningEn || '', tr: step.warningEn || '' })}</p>
                </div>
              )}

              {/* Live screenshot / generated guide image */}
              {step.imageUrl ? (
                <div className="mt-4 rounded-xl overflow-hidden border border-white/10 bg-black/40">
                  <img src={step.imageUrl} alt={L(language,{fa: step.titleFa, en: step.titleEn, ru: step.titleEn, tr: step.titleEn})} className="w-full h-auto object-cover" loading="lazy" />
                  <div className="px-3 py-2 bg-black/60 flex items-center justify-between">
                    <span className="text-[10px] font-mono text-white/40" dir="ltr">{step.imageUrl}</span>
                    <span className="text-[10px] text-white/30">/admin/{section} → step {activeStepIdx + 1}</span>
                  </div>
                </div>
              ) : (
                <div className="mt-4 rounded-xl overflow-hidden border border-white/10 bg-black/40 aspect-video flex flex-col items-center justify-center gap-2 p-4">
                  <ImageIcon className="w-8 h-8 text-white/20" />
                  <p className="text-[11px] text-white/30 text-center">
                    {L(language, {
                      fa: `تصویر راهنما: ${step.titleFa} — اسکرین‌شات زنده از سرور اینجا نمایش داده می‌شود`,
                      en: `Guide image: ${step.titleEn} — live screenshot from server will appear here`,
                      ru: `Изображение: ${step.titleEn}`,
                      tr: `Kılavuz görseli: ${step.titleEn}`,
                    })}
                  </p>
                  <span className="text-[10px] font-mono bg-white/5 text-white/20 px-2 py-1 rounded">/admin/{section} → step {activeStepIdx + 1}</span>
                </div>
              )}
            </div>

            {/* Navigation */}
            <div className="flex items-center justify-between">
              <button
                disabled={activeStepIdx === 0}
                onClick={() => setActiveStepIdx(i => Math.max(0, i - 1))}
                className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 disabled:opacity-30 text-white text-xs font-bold flex items-center gap-1.5"
              >
                <ChevronLeft className="w-4 h-4" /> {L(language, { fa: 'قبلی', en: 'Previous', ru: 'Назад', tr: 'Önceki' })}
              </button>
              <span className="text-[11px] font-mono text-white/40">{activeStepIdx + 1} / {guide.steps.length}</span>
              <button
                disabled={activeStepIdx === guide.steps.length - 1}
                onClick={() => setActiveStepIdx(i => Math.min(guide.steps.length - 1, i + 1))}
                className="px-4 py-2 rounded-lg bg-primary hover:bg-primary-hover disabled:opacity-30 text-black text-xs font-black flex items-center gap-1.5"
              >
                {L(language, { fa: 'بعدی', en: 'Next', ru: 'Далее', tr: 'Sonraki' })} <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Purpose box */}
            <div className="bg-primary/10 border border-primary/20 rounded-xl p-3 flex gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-primary/20 text-primary flex items-center justify-center shrink-0">
                <Play className="w-3.5 h-3.5" />
              </div>
              <div>
                <h4 className="text-[11px] font-black text-primary">{L(language, { fa: 'هدف این بخش', en: 'Purpose of this section', ru: 'Цель раздела', tr: 'Bu bölümün amacı' })}</h4>
                <p className="text-[11px] text-white/60 leading-relaxed mt-1">{L(language, { fa: guide.purposeFa, en: guide.purposeEn, ru: guide.purposeEn, tr: guide.purposeEn })}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
