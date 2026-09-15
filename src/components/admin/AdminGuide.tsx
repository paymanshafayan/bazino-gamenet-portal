/**
 * سیستم راهنمای جدید بازینو — بازطراحی کامل v2
 * - مدیریت استایل: کارت سفید، بوردر #c3c4c7، هدر #f0f0f1
 * - مودال وسط‌چین با در نظر گرفتن هدر 32px ( admin bar)
 * - تصاویر با هایلایت overlay (باکس زرد/آبی دور ناحیه مرجع)
 * - PDF جامع با viewer فول‌اسکرین: prev/next، search، close
 * - توضیح کامل منو، هر آیتم چه کار می‌کند
 */
import React, { useState, useMemo, useEffect } from 'react';
import { L } from '../../utils/i18n';
import type { AdminSection } from '../../utils/routes';
import { ADMIN_SECTION_META } from '../AdminPanelTab';
import { groupForSection, ADMIN_GROUPS } from './adminGroups';
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
  Search,
  FileText,
  ExternalLink,
  Maximize2,
  Minimize2,
} from 'lucide-react';

interface Highlight {
  x: number; // percent 0-100
  y: number;
  w: number;
  h: number;
  labelFa?: string;
  labelEn?: string;
  color?: 'yellow' | 'blue' | 'red' | 'green';
}

interface GuideStep {
  titleFa: string;
  titleEn: string;
  descFa: string;
  descEn: string;
  imageUrl?: string;
  highlights?: Highlight[];
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
  menuExplainFa?: string;
  menuExplainEn?: string;
}

export const ADMIN_GUIDES: Record<AdminSection, SectionGuide> = {
  dashboard: {
    section: 'dashboard',
    introFa: 'داشبورد قلب تپنده سالن است. همه‌چیز را یک‌جا می‌بینی: پول امروز، سیستم‌های پر، مشتری‌های فعال. طراحی مدیریت: کارت‌های سفید با بوردر #c3c4c7 و سایه ملایم.',
    introEn: 'Dashboard is the beating heart. See everything at once: today revenue, busy systems, active customers.  style: white cards border #c3c4c7.',
    purposeFa: 'بدانی امروز چقدر درآوردی، کدام سیستم‌ها خراب یا پر هستند، و آیا سالن شلوغ است یا خلوت. اگر درآمد صفر است، منبع داده Sample است.',
    purposeEn: 'Know today earnings, which systems are broken/busy, and if venue is crowded. If zero revenue, data source is Sample.',
    menuExplainFa: 'داشبورد در گروه داشبورد - اولین آیتم منو. آیکون LayoutDashboard، مسیر /admin/dashboard.',
    menuExplainEn: 'Dashboard in Dashboard group - first menu item. Icon LayoutDashboard, path /admin/dashboard.',
    steps: [
      {
        titleFa: '۱. نگاه اول به کارت‌های بالا - درآمد، رزرو، آنلاین، تیکت',
        titleEn: '1. First look at top cards - revenue, reservations, online, tickets',
        descFa: 'بالای داشبورد ۴ کارت سفید مدیریت استایل می‌بینی: درآمد امروز (با عدد بزرگ و نمودار کوچک)، رزروهای فعال، کاربر آنلاین، تیکت باز. هر کارت بوردر #c3c4c7 و سایه 0 1px 1px دارد. اگر درآمد صفر است، احتمالاً منبع داده روی Sample است نه Database - به سفارشی‌سازی > منبع داده برو و Database را انتخاب کن. این کارت‌ها مثل مدیریت At a Glance هستند.',
        descEn: 'Top has 4 white -style cards: today revenue (big number + mini chart), active reservations, online users, open tickets. Each border #c3c4c7 shadow 0 1px 1px. If revenue zero, data source might be Sample not Database - go to Customization > Data Source and choose Database. Like  At a Glance.',
        imageUrl: '/images/admin-guides/dashboard-step1.png',
        highlights: [
          { x: 5, y: 5, w: 22, h: 30, labelFa: 'درآمد امروز', labelEn: 'Today Revenue', color: 'yellow' },
          { x: 28, y: 5, w: 22, h: 30, labelFa: 'رزرو فعال', labelEn: 'Active Reservations', color: 'blue' },
          { x: 51, y: 5, w: 22, h: 30, labelFa: 'آنلاین', labelEn: 'Online', color: 'green' },
          { x: 74, y: 5, w: 22, h: 30, labelFa: 'تیکت باز', labelEn: 'Open Tickets', color: 'red' },
        ],
        tipFa: 'اگر درآمد صفر است، منبع داده را چک کن - Sample vs Database.',
        tipEn: 'If revenue zero, check data source - Sample vs Database.',
      },
      {
        titleFa: '۲. نمودار اوج مصرف - کدام ساعت شلوغ‌ترین بوده',
        titleEn: '2. Peak usage chart - busiest hour',
        descFa: 'نمودار میله‌ای وسط صفحه نشان می‌دهد کدام ساعت شلوغ‌ترین بوده - مثلاً ۱۸ تا ۲۲. برای تنظیم شیفت کارمند و قیمت پویا عالیه. می‌توانی جمعه‌ها را نیم‌بها کنی اگر خلوت است. در مدیریت، این بخش مثل Activity chart است.',
        descEn: 'Bar chart middle shows busiest hour - e.g. 18-22. Great for staff shift and dynamic pricing. Make Fridays half-price if empty. Like  Activity chart.',
        imageUrl: '/images/admin-guides/dashboard-step2.png',
        highlights: [
          { x: 10, y: 15, w: 80, h: 60, labelFa: 'نمودار اوج - ساعت شلوغ', labelEn: 'Peak chart - busy hour', color: 'blue' },
        ],
      },
      {
        titleFa: '۳. لیست سیستم‌ها و سفارشات اخیر - پایین داشبورد',
        titleEn: '3. Systems and recent orders list - bottom',
        descFa: 'پایین داشبورد لیست سیستم‌ها با وضعیت آنلاین/آفلاین (سبز/قرمز) و آخرین سفارشات کافه را می‌بینی. روی هر سیستم بزن به تب مدیریت کلاینت‌ها می‌روی. روی سفارش بزن به کافه. این لیست مثل مدیریت Recent Posts / Recent Comments است.',
        descEn: 'Bottom shows systems with online/offline (green/red) and recent cafe orders. Click system goes to Clients tab. Click order goes to Cafe. Like  Recent Posts.',
        imageUrl: '/images/admin-guides/dashboard-step3.png',
        highlights: [
          { x: 5, y: 10, w: 45, h: 80, labelFa: 'لیست سیستم‌ها - کلیک به تب سیستم‌ها', labelEn: 'Systems list - click to Systems tab', color: 'yellow' },
          { x: 52, y: 10, w: 45, h: 80, labelFa: 'سفارشات اخیر کافه', labelEn: 'Recent cafe orders', color: 'blue' },
        ],
      },
    ],
    commonMistakesFa: ['فکر کردن درآمد صفر یعنی باگ — در حالی که Sample mode است، باید Database کنی', 'نادیده گرفتن تیکت‌های باز و ناراضی شدن مشتری', 'ندیدن نمودار اوج و قیمت ثابت در ساعت شلوغ'],
    commonMistakesEn: ['Thinking zero revenue is bug while in Sample mode - should switch to Database', 'Ignoring open tickets', 'Not seeing peak chart and keeping fixed price at busy hour'],
  },
  systems: {
    section: 'systems',
    introFa: 'اینجا همه PC و کنسول‌ها را مدیریت می‌کنی. اسم، قیمت ساعتی، فعال/غیرفعال. طراحی مدیریت: فرم بالا سفید، لیست پایین کارت‌های سفید.',
    introEn: 'Manage all PCs and consoles. Name, hourly rate, active/inactive.  style: top form white, list bottom white cards.',
    purposeFa: 'سیستم جدید اضافه کنی، قیمت را عوض کنی، یا سیستمی که خراب است را غیرفعال کنی تا رزرو نگیرد.',
    purposeEn: 'Add new system, change price, disable broken one to not get reservations.',
    menuExplainFa: 'در گروه مدیریت - آیتم مدیریت کلاینت‌ها و سیستم‌ها، آیکون Monitor، مسیر /admin/systems.',
    menuExplainEn: 'In Management group - Clients & Systems item, icon Monitor, path /admin/systems.',
    steps: [
      {
        titleFa: '۱. افزودن سیستم جدید - فرم بالای صفحه',
        titleEn: '1. Add new system - top form',
        descFa: 'فرم بالا را پر کن: نام (مثل PC VIP 04 یا PS5 Pro 02)، نوع (PC/PS5/Xbox/Simulator از select)، قیمت ساعتی (مثلاً 25000 تومان)، دسته مخاطب (اختیاری - مثلاً VIP، Standard). دکمه افزودن آبی مدیریت استایل (#2271b1) را بزن. فوری در لیست پایین ظاهر می‌شود و در سایت قابل رزرو است. اگر منبع داده Sample است، پیام می‌دهد باید Database کنی تا نمایش داده شود.',
        descEn: 'Fill top form: name (e.g. PC VIP 04), type (PC/PS5/Xbox/Simulator from select), hourly rate (e.g. 25000), audience (optional - VIP, Standard). Click Add blue -style button (#2271b1). Instantly appears in bottom list and bookable on site. If data source Sample, shows note to switch to Database.',
        imageUrl: '/images/admin-guides/systems-step1.png',
        highlights: [
          { x: 5, y: 10, w: 20, h: 15, labelFa: 'نام سیستم', labelEn: 'System name', color: 'yellow' },
          { x: 27, y: 10, w: 15, h: 15, labelFa: 'نوع', labelEn: 'Type', color: 'blue' },
          { x: 44, y: 10, w: 18, h: 15, labelFa: 'قیمت ساعتی', labelEn: 'Hourly rate', color: 'green' },
          { x: 80, y: 10, w: 15, h: 15, labelFa: 'دکمه افزودن #2271b1', labelEn: 'Add button #2271b1', color: 'red' },
        ],
      },
      {
        titleFa: '۲. ویرایش قیمت و وضعیت ON/OFF - در جدول',
        titleEn: '2. Edit price and status ON/OFF - in table',
        descFa: 'در جدول لیست، هر سیستم یک کارت سفید دارد: نام، نوع، قیمت، دکمه ON (سبز #d5e9f0 بوردر #a7d0e4) یا OFF (قرمز #fcf0f1 بوردر #e9a0a0). روی ON/OFF بزن تا فعال/غیرفعال شود. قیمت را ویرایش کن - ذخیره خودکار و فوری روی سایت اعمال می‌شود. سیستم خراب را OFF کن تا کسی رزرو نکند.',
        descEn: 'In table list, each system white card: name, type, price, ON button (green #d5e9f0 border #a7d0e4) or OFF (red #fcf0f1 border #e9a0a0). Click ON/OFF to toggle. Edit price - auto save instantly to site. OFF broken system so no one books.',
        imageUrl: '/images/admin-guides/systems-step2.png',
        highlights: [
          { x: 70, y: 20, w: 12, h: 10, labelFa: 'ON/OFF - فعال/غیرفعال', labelEn: 'ON/OFF toggle', color: 'yellow' },
          { x: 40, y: 20, w: 18, h: 10, labelFa: 'قیمت - ویرایش فوری', labelEn: 'Price - instant edit', color: 'blue' },
        ],
      },
      {
        titleFa: '۳. حذف سیستم - وقتی جمع شد',
        titleEn: '3. Delete system - when removed',
        descFa: 'اگر سیستمی جمع شد یا فروختی، دکمه حذف قرمز (آیکون Trash2) را بزن. رزروهای قبلی پاک نمی‌شود (برای حسابداری می‌ماند)، فقط دیگر قابل رزرو نیست. مثل مدیریت Trash.',
        descEn: 'If system removed/sold, click delete red button (Trash2 icon). Past reservations stay (for accounting), just not bookable anymore. Like  Trash.',
        imageUrl: '/images/admin-guides/systems-step3.png',
        highlights: [
          { x: 85, y: 20, w: 8, h: 10, labelFa: 'حذف - سطل زباله قرمز', labelEn: 'Delete - red trash', color: 'red' },
        ],
      },
    ],
    commonMistakesFa: ['گذاشتن قیمت خیلی پایین و ضرر - باید با نمودار اوج چک کنی', 'غیرفعال نکردن سیستم خراب و رزرو گرفتن برای آن و نارضایتی مشتری', 'حذف سیستم بدون چک کردن رزروهای فعال'],
    commonMistakesEn: ['Too low price and loss - should check peak chart', 'Not disabling broken system and getting reservations', 'Deleting system without checking active reservations'],
  },
  cafe: {
    section: 'cafe',
    introFa: 'منوی کافه و بوفه را اینجا می‌چینی. سفارشات زنده هم همین‌جاست. مدیریت استایل: کارت سفید.',
    introEn: 'Cafe menu here. Live orders too.  style white cards.',
    purposeFa: 'غذا، نوشیدنی اضافه کنی، موجودی را کم‌وزیاد کنی، سفارش گیمر را آماده کنی.',
    purposeEn: 'Add food/drink, manage stock, fulfill gamer orders.',
    menuExplainFa: 'گروه مدیریت - بوفه و کافه، آیکون Coffee، مسیر /admin/cafe.',
    menuExplainEn: 'Management group - Cafe Buffet, icon Coffee, path /admin/cafe.',
    steps: [
      {
        titleFa: '۱. افزودن آیتم جدید - نام، دسته، قیمت، عکس، موجودی',
        titleEn: '1. Add new item - name, category, price, image, stock',
        descFa: 'فرم: نام (مثلاً پیتزا مخصوص)، دسته (Foods/Drinks از select)، قیمت (50000)، آدرس عکس (/images/...), موجودی (20)، تیک موجود بودن. دکمه افزودن زرد/آبی مدیریت. عکس را حتماً بگذار - بدون عکس منو زشت می‌شود. موجودی صفر ولی تیک موجود روشن نباشد.',
        descEn: 'Form: name (e.g. Special Pizza), category (Foods/Drinks from select), price (50000), image URL (/images/...), stock (20), available check. Add button yellow/blue . Always add image - without image menu ugly. Zero stock but available checked should not happen.',
        imageUrl: '/images/admin-guides/cafe-step1.png',
        highlights: [
          { x: 5, y: 10, w: 18, h: 12, labelFa: 'نام غذا', labelEn: 'Food name', color: 'yellow' },
          { x: 25, y: 10, w: 12, h: 12, labelFa: 'قیمت', labelEn: 'Price', color: 'blue' },
          { x: 40, y: 10, w: 20, h: 12, labelFa: 'عکس - حتماً بگذار', labelEn: 'Image - must add', color: 'red' },
        ],
      },
      {
        titleFa: '۲. مدیریت سفارشات - Pending به Preparing/Delivered',
        titleEn: '2. Manage orders - Pending to Preparing/Delivered',
        descFa: 'سفارشات جدید با وضعیت Pending (زرد) می‌آید. وقتی آشپز شروع کرد، Preparing (آبی) کن. وقتی آماده شد و به میز گیمر بردی، Delivered (سبز) کن تا به فاکتور مشتری اضافه شود و از موجودی کم شود. مثل مدیریت Order status.',
        descEn: 'New orders come as Pending (yellow). When chef starts, set Preparing (blue). When ready and delivered to gamer desk, set Delivered (green) to bill customer and deduct stock. Like  Order status.',
        imageUrl: '/images/admin-guides/cafe-step2.png',
        highlights: [
          { x: 60, y: 15, w: 18, h: 10, labelFa: 'وضعیت Pending زرد', labelEn: 'Pending status yellow', color: 'yellow' },
          { x: 80, y: 15, w: 15, h: 10, labelFa: 'تغییر به Delivered', labelEn: 'Change to Delivered', color: 'green' },
        ],
      },
    ],
    commonMistakesFa: ['عکس نگذاشتن و زشت شدن منو', 'موجودی صفر ولی تیک موجود بودن روشن و سفارش گرفتن', 'دیر Delivered کردن و نارضایتی'],
    commonMistakesEn: ['No image and ugly menu', 'Zero stock but marked available', 'Late Delivered and unhappy customer'],
  },
  shop: {
    section: 'shop',
    introFa: 'فروشگاه لوازم جانبی: موس، هدست، کیبورد. مشتری با امتیاز می‌خرد. کارت سفید مدیریت.',
    introEn: 'Accessory shop: mouse, headset, keyboard. Customer buys with points. White  card.',
    purposeFa: 'کالا اضافه کنی، قیمت و موجودی را مدیریت کنی.',
    purposeEn: 'Add products, manage price and stock.',
    menuExplainFa: 'گروه مدیریت - فروشگاه لوازم جانبی، آیکون ShoppingBag، مسیر /admin/shop.',
    menuExplainEn: 'Management group - Accessory Shop, icon ShoppingBag, path /admin/shop.',
    steps: [
      {
        titleFa: '۱. افزودن کالا - نام، توضیح، قیمت، عکس، دسته، موجودی',
        titleEn: '1. Add product - name, desc, price, image, category, stock',
        descFa: 'فرم: نام (مثلاً موس Logitech G502)، توضیح، قیمت (1000)، عکس، دسته (Keyboard/Mouse/Headset)، موجودی (5). ذخیره آبی #2271b1. قیمت خیلی بالا نگذار - مشتری با امتیاز می‌خرد، اگر گران باشد نمی‌خرد.',
        descEn: 'Form: name (e.g. Logitech G502 Mouse), description, price (1000), image, category (Keyboard/Mouse/Headset), stock (5). Save blue #2271b1. Not too high price - customer buys with points, if expensive wont buy.',
        imageUrl: '/images/admin-guides/shop-step1.png',
        highlights: [
          { x: 5, y: 10, w: 20, h: 12, labelFa: 'نام کالا', labelEn: 'Product name', color: 'yellow' },
          { x: 27, y: 10, w: 12, h: 12, labelFa: 'قیمت', labelEn: 'Price', color: 'blue' },
          { x: 80, y: 10, w: 12, h: 12, labelFa: 'ذخیره', labelEn: 'Save', color: 'green' },
        ],
      },
      {
        titleFa: '۲. سفارشات فروشگاه - تأیید یا رد',
        titleEn: '2. Shop orders - approve or reject',
        descFa: 'مثل کافه، سفارشات فروشگاه می‌آید. موجودی داری تأیید کن، نداری رد کن و به مشتری پیام بده.',
        descEn: 'Like cafe, shop orders come. If stock available approve, else reject and message customer.',
        imageUrl: '/images/admin-guides/shop-step2.png',
      },
    ],
    commonMistakesFa: ['قیمت خیلی بالا و نخریدن مشتری', 'عکس بی‌کیفیت و نفروختن'],
    commonMistakesEn: ['Too high price and no buy', 'Low quality image and no sale'],
  },
  tournaments: {
    section: 'tournaments',
    introFa: 'مسابقات و تورنمنت‌ها را اینجا می‌سازی. جایزه، بازی، تاریخ شمسی. مدیریت استایل.',
    introEn: 'Tournaments here. Prize, game, date.  style.',
    purposeFa: 'تورنمنت جدید بسازی و ثبت‌نام تیم‌ها را ببینی.',
    purposeEn: 'Create tournament and see team registrations.',
    menuExplainFa: 'گروه مدیریت - مسابقات و تورنمنت‌ها، آیکون Trophy، مسیر /admin/tournaments.',
    menuExplainEn: 'Management group - Tournaments, icon Trophy, path /admin/tournaments.',
    steps: [
      {
        titleFa: '۱. ساخت تورنمنت - عنوان، بازی، هزینه، تاریخ، تعداد تیم',
        titleEn: '1. Create tournament - title, game, fee, date, teams',
        descFa: 'فرم: عنوان (مثلاً جام Valorant تابستان)، بازی (Valorant از لیست)، هزینه ثبت‌نام (100000)، تاریخ شروع شمسی (۱۴۰۵/۰۵/۰۱)، تعداد تیم (8). افزودن. جایزه را در توضیح بنویس. تاریخ شمسی را درست وارد کن - اشتباه رایج.',
        descEn: 'Form: title (e.g. Summer Valorant Cup), game (Valorant from list), entry fee (100000), start date Persian (1405/05/01), max teams (8). Add. Write prize in description. Enter Persian date correctly - common mistake.',
        imageUrl: '/images/admin-guides/tournaments-step1.png',
        highlights: [
          { x: 5, y: 10, w: 20, h: 12, labelFa: 'عنوان تورنمنت', labelEn: 'Tournament title', color: 'yellow' },
          { x: 27, y: 10, w: 12, h: 12, labelFa: 'بازی', labelEn: 'Game', color: 'blue' },
          { x: 60, y: 10, w: 15, h: 12, labelFa: 'تاریخ شمسی', labelEn: 'Persian date', color: 'red' },
        ],
      },
      {
        titleFa: '۲. دیدن تیم‌ها و ثبت‌نام',
        titleEn: '2. See teams and registrations',
        descFa: 'در لیست کارت‌ها، هر تورنمنت تعداد ثبت‌نام شده / حداکثر را نشان می‌دهد. مثلاً 6/8. برای مدیریت براکت و بازی‌ها به تب مدیریت عملیاتی مسابقات برو (/admin/tournamentOps).',
        descEn: 'In list cards, each tournament shows registered / max e.g. 6/8. For bracket and matches go to Tournament Operations tab (/admin/tournamentOps).',
        imageUrl: '/images/admin-guides/tournaments-step2.png',
      },
    ],
    commonMistakesFa: ['تاریخ شمسی اشتباه و گیج شدن تیم‌ها', 'جایزه نگذاشتن و ثبت‌نام نکردن'],
    commonMistakesEn: ['Wrong Persian date and confusing teams', 'No prize and no registration'],
  },
  tournamentOps: {
    section: 'tournamentOps',
    introFa: 'مدیریت عملیاتی مسابقات: براکت، چک‌این تیم، نتیجه بازی. زنده.',
    introEn: 'Tournament operations: bracket, team check-in, match results. Live.',
    purposeFa: 'مسابقه را زنده مدیریت کنی.',
    purposeEn: 'Manage tournament live.',
    menuExplainFa: 'گروه مدیریت - مدیریت عملیاتی مسابقات، آیکون Swords، مسیر /admin/tournamentOps.',
    menuExplainEn: 'Management group - Tournament Operations, icon Swords, path /admin/tournamentOps.',
    steps: [
      {
        titleFa: '۱. انتخاب تورنمنت فعال',
        titleEn: '1. Select active tournament',
        descFa: 'از لیست کشویی تورنمنت فعال را انتخاب کن - فقط تورنمنت‌هایی که تاریخ‌شان نرسیده یا در جریان هستند.',
        descEn: 'Select active tournament from dropdown - only upcoming or ongoing.',
        imageUrl: '/images/admin-guides/tournamentOps-step1.png',
        highlights: [
          { x: 10, y: 10, w: 30, h: 12, labelFa: 'انتخاب تورنمنت', labelEn: 'Select tournament', color: 'yellow' },
        ],
      },
      {
        titleFa: '۲. ثبت نتیجه و براکت خودکار',
        titleEn: '2. Record result and auto bracket',
        descFa: 'برای هر بازی، برنده را انتخاب کن - براکت خودکار جلو می‌رود. چک‌این تیم را قبل بازی تأیید کن. اگر تیم نیامد، بازنده کن.',
        descEn: 'For each match, set winner - bracket auto advances. Confirm team check-in before match. If team no-show, set loser.',
        imageUrl: '/images/admin-guides/tournamentOps-step2.png',
      },
    ],
    commonMistakesFa: ['فراموش کردن چک‌این و شروع بازی بدون تیم', 'نتیجه اشتباه و خراب شدن براکت'],
    commonMistakesEn: ['Forgetting check-in and starting without team', 'Wrong result and broken bracket'],
  },
  blog: {
    section: 'blog',
    introFa: 'وبلاگ و اخبار کل. مقاله جدید بنویس و منتشر کن. مدیریت استایل مثل Posts.',
    introEn: 'Blog and club news. Write and publish.  style like Posts.',
    purposeFa: 'خبر تورنمنت، آموزش بازی، اطلاعیه کل.',
    purposeEn: 'Tournament news, game tutorials, club announcements.',
    menuExplainFa: 'گروه پیام و محتوا - وبلاگ و اخبار، آیکون Newspaper، مسیر /admin/blog.',
    menuExplainEn: 'Messaging & Content group - Blog & News, icon Newspaper, path /admin/blog.',
    steps: [
      {
        titleFa: '۱. نوشتن مقاله - عنوان، محتوا، دسته، عکس',
        titleEn: '1. Write article - title, content, category, image',
        descFa: 'فرم: عنوان (مثلاً نتایج تورنمنت هفته)، محتوا (متن کامل - حداقل 100 کلمه)، دسته (News/Tutorial)، عکس (حتماً). انتشار آبی #2271b1. متن خیلی کوتاه نگذار - سئو خراب می‌شود. بدون عکس هم زشت است.',
        descEn: 'Form: title (e.g. Weekly tournament results), content (full text - min 100 words), category (News/Tutorial), image (must). Publish blue #2271b1. Not too short - SEO bad. No image ugly.',
        imageUrl: '/images/admin-guides/blog-step1.png',
        highlights: [
          { x: 5, y: 10, w: 25, h: 12, labelFa: 'عنوان مقاله', labelEn: 'Article title', color: 'yellow' },
          { x: 5, y: 25, w: 60, h: 30, labelFa: 'محتوا - حداقل 100 کلمه', labelEn: 'Content - min 100 words', color: 'blue' },
          { x: 70, y: 10, w: 15, h: 12, labelFa: 'انتشار', labelEn: 'Publish', color: 'green' },
        ],
      },
    ],
    commonMistakesFa: ['متن خیلی کوتاه و سئو ضعیف', 'بدون عکس و زشت'],
    commonMistakesEn: ['Too short and weak SEO', 'No image and ugly'],
  },
  content: {
    section: 'content',
    introFa: 'استودیوی محتوا و انتشار - نسخه بازطراحی شده v2: ساده، فارسی، برای صاحب گیم‌نت که هیچی حالیش نیست. قبلاً ۱۳ تب شلوغ و درهم بود، الان ۴ کارت بزرگ سفید مدیریت استایل.',
    introEn: 'Content Studio v2 redesigned: simple, Persian, for non-technical owner. Previously 13 messy tabs, now 4 big white -style cards.',
    purposeFa: 'برای اینستاگرام و تلگرام محتوا بسازی: عکس با هوش مصنوعی Flux/Imejis، ایده از ترندهای روز YouTube/Twitch، و انتشار زمان‌بندی شده. بدون سردرگمی.',
    purposeEn: 'Create content for Instagram/Telegram: AI images Flux/Imejis, ideas from daily trends YouTube/Twitch, scheduled publishing. No confusion.',
    menuExplainFa: 'گروه پیام و محتوا - استودیوی محتوا و انتشار، آیکون Images، مسیر /admin/content. مهم‌ترین بخش بعد از کلیدها.',
    menuExplainEn: 'Messaging & Content group - Content Studio, icon Images, path /admin/content. Most important after keys.',
    steps: [
      {
        titleFa: '۱. راهنمای سریع - استودیو چیست؟ ۴ کارت بزرگ',
        titleEn: '1. Quick Guide - What is Studio? 4 big cards',
        descFa: 'وقتی وارد /admin/content می‌شی، بالا ۴ کارت بزرگ سفید مدیریت می‌بینی: راهنمای سریع (توضیح مسیر ۴ مرحله‌ای: آماده‌سازی -> پیش‌نمایش و تأیید -> انتشار و ثبت رسانه -> دعوت و انتساب)، تولید تصویر (MediaGen)، ترندهای روز (Trends)، صف انتشار (Publish Queue). اول راهنما را بخون - همه تصاویر واقعی Chromium هستند، نه ساختگی. قبلاً ۱۳ تب کوچک با آیکون ریز بود که هیچکس نمی‌فهمید، الان ۴ کارت بزرگ با توضیح فارسی ساده.',
        descEn: 'When you enter /admin/content, top has 4 big white  cards: Quick Guide (explains 4-step flow: Prep -> Preview & Approve -> Publish & Record Media -> Invite & Assign), MediaGen, Trends, Publish Queue. Read guide first - all real Chromium screenshots, not fake. Previously 13 small tabs with tiny icons no one understood, now 4 big cards with simple Persian.',
        imageUrl: '/images/admin-guides/content.png',
        highlights: [
          { x: 5, y: 5, w: 22, h: 25, labelFa: 'راهنمای سریع - اول بخون', labelEn: 'Quick Guide - read first', color: 'yellow' },
          { x: 28, y: 5, w: 22, h: 25, labelFa: 'تولید تصویر Flux', labelEn: 'MediaGen Flux', color: 'blue' },
          { x: 51, y: 5, w: 22, h: 25, labelFa: 'ترندهای روز YouTube/Twitch', labelEn: 'Daily Trends', color: 'green' },
          { x: 74, y: 5, w: 22, h: 25, labelFa: 'صف انتشار', labelEn: 'Publish Queue', color: 'red' },
        ],
        tipFa: 'طراحی جدید: ۴ کارت بزرگ جای ۱۳ تب شلوغ.',
        tipEn: 'New design: 4 big cards instead of 13 messy tabs.',
      },
      {
        titleFa: '۲. تولید تصویر با AI - Flux / Imejis - سهمیه روزانه',
        titleEn: '2. AI Image Generation - Flux / Imejis - daily quota',
        descFa: 'کارت تولید تصویر را بزن. بالا سهمیه روزانه را می‌بینی: Flux (مثلاً ۰/۲۰ یعنی ۰ از ۲۰ استفاده شده)، Imejis، Compose. فرم: عنوان (برای خودت - مثلاً پوستر تورنمنت)، مدل (Flux بهترین برای گیمینگ نئونی - pro یا dev)، پرامپت دقیق فارسی یا انگلیسی مثل "سالن گیمینگ تاریک با نور نئون آبی و بنفش، ۱۰ PC با کیس RGB، پوستر Valorant روی دیوار، سینماتیک". تیک تأیید هزینه (مثلاً ۲ کردیت) بزن و تولید. وظیفه در لیست پایین می‌افتد با وضعیت Queued/Processing/Completed. وقتی Completed شد، دکمه "ورود به پیش‌نویس" آبی را بزن تا به صف انتشار برود.',
        descEn: 'Click MediaGen card. Top shows daily quota: Flux (e.g. 0/20), Imejis, Compose. Form: title (for you - e.g. tournament poster), model (Flux best for neon gaming - pro or dev), detailed prompt English/Persian e.g. "dark gaming lounge with blue purple neon, 10 PCs with RGB cases, Valorant poster on wall, cinematic". Check cost confirmation (e.g. 2 credits) and generate. Task appears below with Queued/Processing/Completed. When Completed, click blue "Import to draft" to go to publish queue.',
        imageUrl: '/images/admin-guides/content-step1.png',
        highlights: [
          { x: 5, y: 5, w: 90, h: 12, labelFa: 'سهمیه روزانه Flux 0/20', labelEn: 'Daily quota Flux 0/20', color: 'yellow' },
          { x: 5, y: 20, w: 30, h: 12, labelFa: 'مدل Flux - بهترین برای نئون', labelEn: 'Model Flux - best for neon', color: 'blue' },
          { x: 5, y: 35, w: 60, h: 20, labelFa: 'پرامپت دقیق - فارسی/انگلیسی', labelEn: 'Detailed prompt', color: 'green' },
          { x: 70, y: 60, w: 20, h: 10, labelFa: 'تولید - تأیید هزینه', labelEn: 'Generate - confirm cost', color: 'red' },
        ],
        tipFa: 'اگر خطا داد، کلید API نداری. برو به هوش و فنی → مرکز کلیدها → Imejis API Key, Cloudflare Token را وارد کن. همه یک‌جا اونجاست و پیش‌فرض ENV دارد.',
        tipEn: 'If error, you miss API key. Go to Intelligence → Keys Center → Imejis API Key, Cloudflare Token. All in one place and has ENV default.',
      },
      {
        titleFa: '۳. ترندهای روز - YouTube Gaming و Twitch - ایده محتوا',
        titleEn: '3. Daily Trends - YouTube Gaming & Twitch - content ideas',
        descFa: 'کارت ترندهای روز را بزن. دو ستون سفید می‌بینی: YouTube Gaming (عنوان ویدیوهای داغ امروز با کانال، بازدید، تاریخ) و Twitch (پربازدیدترین بازی‌ها با تعداد بیننده لحظه‌ای). اینا برای ایده محتوا عالیه. مثلاً اگه Valorant با 100k بیننده ترند شده، پرامپت بساز "مسابقه Valorant در سالن بازینو با جایزه 5 میلیون". اگر خالیه، یعنی کلید YouTube API یا Twitch Client ID/Secret را در مرکز کلیدها وارد نکردی - برو /admin/apiKeys → شبکه اجتماعی و ترند.',
        descEn: 'Click Trends card. Two white columns: YouTube Gaming (hot videos today with channel, views, date) and Twitch (most viewed games with live viewers). Great for content ideas. E.g. if Valorant with 100k viewers trending, make prompt "Valorant tournament in Bazino lounge prize 5M". If empty, you need YouTube API or Twitch Client ID/Secret in Keys Center - go /admin/apiKeys → Social & Trends.',
        imageUrl: '/images/admin-guides/content-step2.png',
        highlights: [
          { x: 5, y: 10, w: 45, h: 70, labelFa: 'YouTube Gaming - ویدیوهای داغ امروز', labelEn: 'YouTube Gaming - hot today', color: 'red' },
          { x: 52, y: 10, w: 45, h: 70, labelFa: 'Twitch - بازی‌های پربازدید', labelEn: 'Twitch - most viewed', color: 'blue' },
        ],
        warningFa: 'ترندها خالی؟ برو به /admin/apiKeys → شبکه اجتماعی و ترند → YouTube API Key و Twitch Client ID/Secret را وارد کن. بدون کلید، دیتایی نمیاد. اگر در ENV ست شده، پیش‌فرض ثبت شده است.',
        warningEn: 'Trends empty? Go to /admin/apiKeys → Social & Trends → YouTube API Key and Twitch Client ID/Secret. Without keys no data. If set in ENV, shown as default registered.',
      },
      {
        titleFa: '۴. صف انتشار - پیش‌نویس تا اینستا/تلگرام - درگ و دراپ',
        titleEn: '4. Publish Queue - Draft to Insta/Telegram - drag & drop',
        descFa: 'کارت صف انتشار را بزن. پست‌هایی که ساختی اینجا لیست می‌شود: هر کارت سفید عنوان، کپشن، وضعیت (draft زرد/approved سبز)، زبان (fa/en)، تعداد رسانه (مثلاً 3 عکس). روی پست بزن ویرایش می‌شود: عکس‌ها را مرتب کن (درگ و دراپ - بکش و رها کن)، کپشن فارسی/انگلیسی بنویس، پیش‌نمایش اینستاگرام/تلگرام ببین (موبایل فریم)، تأیید کن (تیک سبز)، بعد انتشار فوری یا زمان‌بندی (تقویم) بزن. اگر ارسال زنده خاموشه (mediagenEnabled false)، در صف می‌ماند تا مدیر در تنظیمات فعال کند. مثل مدیریت Posts list.',
        descEn: 'Click Publish Queue card. Posts you created list here: each white card title, caption, status (draft yellow/approved green), language (fa/en), media count (e.g. 3 images). Click to edit: reorder images (drag & drop), write caption FA/EN, preview Insta/Telegram (mobile frame), approve (green check), then publish now or schedule (calendar). If live delivery paused (mediagenEnabled false), stays queued until admin enables in settings. Like  Posts list.',
        imageUrl: '/images/admin-guides/content-step3.png',
        highlights: [
          { x: 5, y: 10, w: 90, h: 15, labelFa: 'لیست پست‌ها - کارت سفید', labelEn: 'Posts list - white card', color: 'yellow' },
          { x: 10, y: 30, w: 30, h: 40, labelFa: 'عکس‌ها - درگ و دراپ مرتب کن', labelEn: 'Images - drag & drop reorder', color: 'blue' },
          { x: 45, y: 30, w: 25, h: 15, labelFa: 'کپشن بنویس', labelEn: 'Write caption', color: 'green' },
          { x: 75, y: 30, w: 20, h: 15, labelFa: 'تأیید و انتشار', labelEn: 'Approve & Publish', color: 'red' },
        ],
        tipFa: 'مسیر کامل: تولید رسانه → وظایف → ورود به پیش‌نویس → اینجا کپشن و ترتیب → پیش‌نمایش و تأیید → انتشار. همه گام‌ها فارسی و ساده، مثل مدیریت.',
        tipEn: 'Full path: MediaGen -> Tasks -> Import to draft -> here caption & order -> preview & approve -> publish. All steps Persian simple like .',
      },
    ],
    commonMistakesFa: [
      'کلید API نگذاشتن و خالی ماندن ترندها و تولید تصویر - راه‌حل: /admin/apiKeys همه یک‌جا و پیش‌فرض ENV دارد',
      'تولید بی‌رویه و تمام شدن سهمیه روزانه Flux/Imejis (مثلاً 20/20) - باید صبر کنی تا فردا',
      'فکر کردن انتشار خودکار است در حالی که ارسال زنده خاموش است (mediagenEnabled false) و باید در تنظیمات فعال شود',
      'نادیده گرفتن راهنمای سریع بالا و گیج شدن در 13 تب قدیمی - الان 4 کارت ساده کافیست',
    ],
    commonMistakesEn: ['Missing API keys and empty trends/media - solution: /admin/apiKeys all in one and has ENV default', 'Over-generating and hitting daily quota Flux/Imejis (e.g. 20/20) - wait till tomorrow', 'Thinking auto-publish while live delivery paused (mediagenEnabled false)', 'Ignoring quick guide top and confusing in 13 old tabs - now 4 simple cards enough'],
  },
  promotions: {
    section: 'promotions',
    introFa: 'کن‌ها و ساعات ویژه: تخفیف، ساعت رایگان، نیم‌بها. مدیریت استایل.',
    introEn: 'Coupons and special hours: discount, free hour, half-price.  style.',
    purposeFa: 'مشتری را با تخفیف برگردانی - مثلاً جمعه صبح نیم‌بها.',
    purposeEn: 'Bring back customers with discounts - e.g. Friday morning half-price.',
    menuExplainFa: 'گروه فروش و مالی - کن‌ها و ساعات رایگان/نیم‌بها، آیکون Ticket، مسیر /admin/promotions.',
    menuExplainEn: 'Sales & Finance group - Coupons & Free/Half Hours, icon Ticket, path /admin/promotions.',
    steps: [
      {
        titleFa: '۱. ساخت کن - کد، درصد، انقضا، تعداد',
        titleEn: '1. Create coupon - code, %, expiry, limit',
        descFa: 'فرم: کد (مثلاً WELCOME10)، درصد تخفیف (10%)، تاریخ انقضا (۱۴۰۵/۰۶/۳۰)، تعداد استفاده (100). ذخیره آبی #2271b1. کن بدون تاریخ انقضا نگذار - سوءاستفاده می‌شود.',
        descEn: 'Form: code (e.g. WELCOME10), discount % (10%), expiry (1405/06/30), usage limit (100). Save blue #2271b1. Not without expiry - abuse.',
        imageUrl: '/images/admin-guides/promotions-step1.png',
        highlights: [
          { x: 5, y: 10, w: 15, h: 10, labelFa: 'کد کن', labelEn: 'Coupon code', color: 'yellow' },
          { x: 22, y: 10, w: 10, h: 10, labelFa: 'درصد', labelEn: '%', color: 'blue' },
          { x: 50, y: 10, w: 15, h: 10, labelFa: 'انقضا', labelEn: 'Expiry', color: 'red' },
        ],
      },
      {
        titleFa: '۲. ساعت ویژه - مثلاً جمعه ۱۰ تا ۱۲ نیم‌بها',
        titleEn: '2. Special hours - e.g. Friday 10-12 half-price',
        descFa: 'ساعت ویژه: روز هفته (جمعه)، ساعت شروع (10 صبح)، ساعت پایان (12 ظهر)، نوع (نیم‌بها/رایگان). ذخیره. مشتری در آن ساعت رزرو کند تخفیف می‌گیرد.',
        descEn: 'Special hours: weekday (Friday), start (10am), end (12pm), type (half-price/free). Save. Customer booking in that hour gets discount.',
        imageUrl: '/images/admin-guides/promotions-step2.png',
      },
    ],
    commonMistakesFa: ['کن بدون تاریخ انقضا و سوءاستفاده', 'درصد تخفیف خیلی بالا (90%) و ضرر'],
    commonMistakesEn: ['No expiry and abuse', 'Too high discount % (90%) and loss'],
  },
  chat: {
    section: 'chat',
    introFa: 'اتاق‌های گفتگوی زنده: گیمرها با هم چت می‌کنند. مدیریت استایل.',
    introEn: 'Live chat rooms: gamers chat together.  style.',
    purposeFa: 'اتاق بسازی، مدیریت کنی، حذف کنی.',
    purposeEn: 'Create, manage, delete rooms.',
    menuExplainFa: 'گروه ارتباط - اتاق‌های گفتگوی زنده، آیکون MessageSquare، مسیر /admin/chat.',
    menuExplainEn: 'Communication group - Live Chat Rooms, icon MessageSquare, path /admin/chat.',
    steps: [
      {
        titleFa: '۱. ساخت اتاق - نام',
        titleEn: '1. Create room - name',
        descFa: 'فرم: نام اتاق (مثلاً Valorant یا General). ایجاد آبی #2271b1. اسم نامناسب نگذار - باید مرتبط با بازی باشد. اتاق زیاد نساز - شلوغی.',
        descEn: 'Form: room name (e.g. Valorant or General). Create blue #2271b1. Not bad name - should be game related. Not too many rooms - crowded.',
        imageUrl: '/images/admin-guides/chat-step1.png',
        highlights: [
          { x: 10, y: 20, w: 30, h: 12, labelFa: 'نام اتاق - مثلاً Valorant', labelEn: 'Room name - e.g. Valorant', color: 'yellow' },
          { x: 45, y: 20, w: 10, h: 12, labelFa: 'ایجاد', labelEn: 'Create', color: 'blue' },
        ],
      },
    ],
    commonMistakesFa: ['اسم نامناسب و بی‌ربط', 'اتاق زیاد (20 تا) و شلوغی و گیجی'],
    commonMistakesEn: ['Bad irrelevant name', 'Too many rooms (20) and crowded confusion'],
  },
  messages: {
    section: 'messages',
    introFa: 'ارسال پیام و نوتیفیکیشن به کاربرها: تکی یا گروهی. مدیریت استایل.',
    introEn: 'Send messages and notifications to users: single or bulk.  style.',
    purposeFa: 'اطلاع‌رسانی، تأیید رزرو، تبلیغ.',
    purposeEn: 'Announcements, reservation confirm, promo.',
    menuExplainFa: 'گروه ارتباط - پیام‌ها و اعلان‌ها، آیکون Mail، مسیر /admin/messages.',
    menuExplainEn: 'Communication group - Messages & Notifications, icon Mail, path /admin/messages.',
    steps: [
      {
        titleFa: '۱. انتخاب گیرنده - همه یا یک کاربر',
        titleEn: '1. Choose recipient - all or one user',
        descFa: 'Select: All Users (همه) یا یک نام کاربری خاص (مثلاً ali_gamer). اگر همه را انتخاب کنی، پیام گروهی است.',
        descEn: 'Select: All Users or specific username (e.g. ali_gamer). If All, bulk message.',
        imageUrl: '/images/admin-guides/messages-step1.png',
        highlights: [
          { x: 10, y: 15, w: 25, h: 12, labelFa: 'گیرنده - همه یا تکی', labelEn: 'Recipient - all or single', color: 'yellow' },
        ],
      },
      {
        titleFa: '۲. نوشتن پیام - موضوع، متن، تیک نوتیفیکیشن',
        titleEn: '2. Write message - subject, body, notification check',
        descFa: 'موضوع (مثلاً رزرو شما تأیید شد)، متن (متن کامل)، تیک ارسال به عنوان نوتیفیکیشن زنده (پوش) برای نمایش فوری. ارسال آبی #2271b1. پیام اسپم نفرست - کاربر اذیت می‌شود.',
        descEn: 'Subject (e.g. Your reservation confirmed), body (full text), check send as live notification (push) for instant display. Send blue #2271b1. Not spam - user annoyed.',
        imageUrl: '/images/admin-guides/messages-step2.png',
        highlights: [
          { x: 10, y: 30, w: 30, h: 12, labelFa: 'موضوع', labelEn: 'Subject', color: 'blue' },
          { x: 10, y: 45, w: 50, h: 20, labelFa: 'متن پیام', labelEn: 'Message body', color: 'green' },
          { x: 10, y: 70, w: 20, h: 10, labelFa: 'تیک نوتیفیکیشن زنده', labelEn: 'Live notification check', color: 'red' },
        ],
      },
    ],
    commonMistakesFa: ['پیام اسپم و اذیت کاربر و بلاک کردن', 'موضوع خالی و نفهمیدن'],
    commonMistakesEn: ['Spam and annoying user and blocking', 'Empty subject and not understanding'],
  },
  tickets: {
    section: 'tickets',
    introFa: 'تیکت‌های پشتیبانی: مشکل کاربر را حل کن. مدیریت استایل.',
    introEn: 'Support tickets: solve user problems.  style.',
    purposeFa: 'پاسخ به تیکت، بستن تیکت.',
    purposeEn: 'Answer and close tickets.',
    menuExplainFa: 'گروه ارتباط - تیکت‌های پشتیبانی، آیکون LifeBuoy، مسیر /admin/tickets. نشان تعداد باز دارد.',
    menuExplainEn: 'Communication group - Support Tickets, icon LifeBuoy, path /admin/tickets. Has open count badge.',
    steps: [
      {
        titleFa: '۱. دیدن تیکت باز - لیست',
        titleEn: '1. See open ticket - list',
        descFa: 'لیست تیکت‌های باز با وضعیت Open (قرمز) - روی یکی بزن تا جزئیات باز شود. مثل مدیریت Comments list.',
        descEn: 'List of open tickets with Open status (red) - click one to see details. Like  Comments list.',
        imageUrl: '/images/admin-guides/tickets-step1.png',
        highlights: [
          { x: 5, y: 10, w: 90, h: 15, labelFa: 'لیست تیکت باز - کلیک برای جزئیات', labelEn: 'Open tickets list - click for details', color: 'yellow' },
        ],
      },
      {
        titleFa: '۲. پاسخ و بستن - اگر حل شد',
        titleEn: '2. Reply and close - if solved',
        descFa: 'پاسخ را بنویس (فارسی)، اگر مشکل حل شد، دکمه بستن (Close) را بزن تا وضعیت Closed (سبز) شود. دیر جواب نده - مشتری ناراضی می‌شود. تیکت حل شده را باز نگذار.',
        descEn: 'Write reply (Persian), if solved click Close button to make Closed (green). Not late reply - unhappy customer. Not leave solved open.',
        imageUrl: '/images/admin-guides/tickets-step2.png',
        highlights: [
          { x: 10, y: 50, w: 50, h: 20, labelFa: 'پاسخ بنویس', labelEn: 'Write reply', color: 'blue' },
          { x: 70, y: 50, w: 15, h: 12, labelFa: 'بستن تیکت', labelEn: 'Close ticket', color: 'green' },
        ],
      },
    ],
    commonMistakesFa: ['دیر جواب دادن (بعد 2 روز) و نارضایتی', 'نبستن تیکت حل شده و شلوغی لیست'],
    commonMistakesEn: ['Late reply (after 2 days) and unhappy', 'Not closing solved and crowded list'],
  },
  wallet: {
    section: 'wallet',
    introFa: 'کیف پول و پرداخت حضوری: شارژ، کسر، تاریخچه. مدیریت استایل.',
    introEn: 'Wallet and on-site payments: top-up, deduct, history.  style.',
    purposeFa: 'موجودی کاربر را مدیریت کنی - شارژ دستی.',
    purposeEn: 'Manage user balance - manual top-up.',
    menuExplainFa: 'گروه فروش و مالی - کیف پول و پرداخت حضوری، آیکون Wallet، مسیر /admin/wallet.',
    menuExplainEn: 'Sales & Finance group - Wallet & On-site Payments, icon Wallet, path /admin/wallet.',
    steps: [
      {
        titleFa: '۱. جستجوی کاربر - نام کاربری',
        titleEn: '1. Search user - username',
        descFa: 'نام کاربری را در جستجو بزن (مثلاً ali_gamer)، کیف پولش را با موجودی و تاریخچه می‌بینی.',
        descEn: 'Enter username in search (e.g. ali_gamer), see wallet with balance and history.',
        imageUrl: '/images/admin-guides/wallet-step1.png',
        highlights: [
          { x: 10, y: 10, w: 30, h: 12, labelFa: 'جستجوی کاربر', labelEn: 'Search user', color: 'yellow' },
          { x: 50, y: 10, w: 20, h: 12, labelFa: 'موجودی', labelEn: 'Balance', color: 'blue' },
        ],
      },
      {
        titleFa: '۲. شارژ دستی - مبلغ و یادداشت',
        titleEn: '2. Manual top-up - amount and note',
        descFa: 'فرم: مبلغ (مثلاً 100000)، یادداشت (مثلاً شارژ حضوری نقدی). ثبت آبی #2271b1. یادداشت حتماً بنویس - برای حسابداری. شارژ اشتباه به کاربر دیگر نزن - چک کن.',
        descEn: 'Form: amount (e.g. 100000), note (e.g. cash on-site top-up). Submit blue #2271b1. Must write note - for accounting. Not wrong user top-up - check.',
        imageUrl: '/images/admin-guides/wallet-step2.png',
        highlights: [
          { x: 10, y: 20, w: 15, h: 10, labelFa: 'مبلغ', labelEn: 'Amount', color: 'yellow' },
          { x: 30, y: 20, w: 25, h: 10, labelFa: 'یادداشت - حتماً', labelEn: 'Note - must', color: 'red' },
        ],
      },
    ],
    commonMistakesFa: ['شارژ اشتباه به کاربر دیگر و ضرر', 'بدون یادداشت و گیجی حسابداری'],
    commonMistakesEn: ['Wrong user top-up and loss', 'No note and accounting confusion'],
  },
  affiliates: {
    section: 'affiliates',
    introFa: 'همکاری در فروش: معرف، کمیسیون، لینک دعوت. مدیریت استایل.',
    introEn: 'Affiliate marketing: referral, commission, invite link.  style.',
    purposeFa: 'همکار اضافه کنی، کمیسیون ببینی، تنظیمات درصد.',
    purposeEn: 'Add affiliate, see commission, set percentages.',
    menuExplainFa: 'گروه فروش و مالی - همکاری در فروش، آیکون Handshake، مسیر /admin/affiliates. جریان جدید: کامنت کلیدواژه -> PR guide + follow button -> follow check -> DM private invite link -> share -> coupon -> commission.',
    menuExplainEn: 'Sales & Finance group - Affiliate Marketing, icon Handshake, path /admin/affiliates. New flow: keyword comment -> PR guide + follow button -> follow check -> DM private invite link -> share -> coupon -> commission.',
    steps: [
      {
        titleFa: '۱. تنظیم درصدها - مشتری جدید، بازگشتی، تورنمنت',
        titleEn: '1. Set percentages - new, returning, tournament',
        descFa: 'بالای صفحه: درصد کمیسیون مشتری جدید (مثلاً 20%)، مشتری بازگشتی (10%)، تورنمنت (15%). ذخیره آبی #2271b1. درصد خیلی بالا نگذار - ضرر.',
        descEn: 'Top: new customer commission % (e.g. 20%), returning (10%), tournament (15%). Save blue #2271b1. Not too high % - loss.',
        imageUrl: '/images/admin-guides/affiliates-step1.png',
        highlights: [
          { x: 5, y: 10, w: 25, h: 12, labelFa: 'درصد جدید', labelEn: 'New %', color: 'yellow' },
          { x: 32, y: 10, w: 25, h: 12, labelFa: 'درصد بازگشتی', labelEn: 'Returning %', color: 'blue' },
          { x: 60, y: 10, w: 20, h: 12, labelFa: 'ذخیره', labelEn: 'Save', color: 'green' },
        ],
      },
      {
        titleFa: '۲. افزودن همکار - کد، نام کاربری کیف پول، نام نمایشی',
        titleEn: '2. Add affiliate - code, wallet username, display name',
        descFa: 'فرم: کد معرف (مثلاً ALI2024 - یکتا)، نام کاربری کیف پول (ali_gamer - برای واریز پورسانت)، نام نمایشی (علی گیمر). ثبت. کد تکراری نگذار.',
        descEn: 'Form: referral code (e.g. ALI2024 - unique), wallet username (ali_gamer - for commission payout), display name (Ali Gamer). Create. Not duplicate code.',
        imageUrl: '/images/admin-guides/affiliates-step2.png',
      },
      {
        titleFa: '۳. لینک دعوت خصوصی - ?ref=CODE - جریان جدید',
        titleEn: '3. Private invite link - ?ref=CODE - new flow',
        descFa: 'جریان جدید: ۱) کاربر کامنت کلیدواژه (مثلاً "بازینو") می‌گذارد، ۲) سیستم PR guide + دکمه فالو می‌فرستد، ۳) فالو چک می‌کند، ۴) لینک دعوت خصوصی ?ref=CODE را در DM می‌فرستد (فقط در دیسپچ محاسبه می‌شود، هرگز در لیست ادمین ذخیره نمی‌شود)، ۵) همکار لینک را شیر می‌کند، ۶) دوست از طریق لینک بیاید کن می‌گیرد، ۷) همکار به ازای هر پرداخت پورسانت می‌گیرد. لینک خصوصی فقط در لحظه ارسال ساخته می‌شود.',
        descEn: 'New flow: 1) User comments keyword (e.g. "bazino"), 2) System sends PR guide + follow button, 3) Checks follow, 4) Sends private invite link ?ref=CODE in DM (computed only at dispatch, never stored in admin lists), 5) Partner shares link, 6) Friend via link gets coupon, 7) Partner gets commission per payment. Private link computed only at dispatch.',
        imageUrl: '/images/admin-guides/affiliates-step3.png',
        highlights: [
          { x: 10, y: 20, w: 40, h: 12, labelFa: 'لینک ?ref=CODE - خصوصی، فقط در DM', labelEn: 'Link ?ref=CODE - private, only in DM', color: 'yellow' },
          { x: 10, y: 40, w: 60, h: 15, labelFa: 'محاسبه فقط در لحظه ارسال - ذخیره نمی‌شود', labelEn: 'Computed only at dispatch - not stored', color: 'red' },
        ],
      },
    ],
    commonMistakesFa: ['کد تکراری و خطا', 'درصد خیلی بالا (50%) و ضرر', 'فرستادن لینک عمومی به جای خصوصی'],
    commonMistakesEn: ['Duplicate code and error', 'Too high % (50%) and loss', 'Sending public link instead of private'],
  },
  messaging: {
    section: 'messaging',
    introFa: 'پیامک گروهی: SMS, Viber, WhatsApp با Messaggio. مدیریت استایل.',
    introEn: 'Bulk messaging: SMS, Viber, WhatsApp via Messaggio.  style.',
    purposeFa: 'کمپین تبلیغاتی بفرستی - مثلاً تخفیف جمعه.',
    purposeEn: 'Send promo campaigns - e.g. Friday discount.',
    menuExplainFa: 'گروه پیام و محتوا - پیامک گروهی، آیکون Megaphone، مسیر /admin/messaging.',
    menuExplainEn: 'Messaging & Content group - Bulk Messaging, icon Megaphone, path /admin/messaging.',
    steps: [
      {
        titleFa: '۱. نوشتن متن - کانال',
        titleEn: '1. Write text - channel',
        descFa: 'متن پیامک را بنویس (فارسی - مثلاً "جمعه نیم‌بها در بازینو!")، کانال (SMS/Viber/WhatsApp) را انتخاب کن. متن طولانی هزینه زیاد دارد.',
        descEn: 'Write SMS text (Persian - e.g. "Friday half-price in Bazino!"), choose channel (SMS/Viber/WhatsApp). Long text high cost.',
        imageUrl: '/images/admin-guides/messaging-step1.png',
        highlights: [
          { x: 10, y: 20, w: 50, h: 20, labelFa: 'متن پیامک - کوتاه', labelEn: 'SMS text - short', color: 'yellow' },
          { x: 65, y: 20, w: 20, h: 12, labelFa: 'کانال', labelEn: 'Channel', color: 'blue' },
        ],
      },
      {
        titleFa: '۲. پیش‌نمایش و ارسال',
        titleEn: '2. Preview and send',
        descFa: 'پیش‌نمایش تعداد گیرنده (مثلاً 150 نفر) را ببین، هزینه تخمینی، بعد ارسال. بدون تست نفرست.',
        descEn: 'Preview recipient count (e.g. 150), estimated cost, then send. Not without test.',
        imageUrl: '/images/admin-guides/messaging-step2.png',
      },
    ],
    commonMistakesFa: ['متن طولانی (200 کاراکتر) و هزینه زیاد', 'بدون تست و اشتباه'],
    commonMistakesEn: ['Too long (200 chars) and high cost', 'No test and mistake'],
  },
  themes: {
    section: 'themes',
    introFa: 'قالب‌ها: ظاهر سایت را عوض کن. مدیریت استایل دقیقاً مثل Appearance > Themes.',
    introEn: 'Themes: change site look.  style exactly like Appearance > Themes.',
    purposeFa: 'قالب نصب کنی، فعال کنی، خروجی بگیری.',
    purposeEn: 'Install, activate, export themes.',
    menuExplainFa: 'گروه پیشرفته - مدیریت قالب‌ها، آیکون Palette، مسیر /admin/themes. مثل مدیریت Appearance > Themes.',
    menuExplainEn: 'Advanced group - Themes, icon Palette, path /admin/themes. Like  Appearance > Themes.',
    steps: [
      {
        titleFa: '۱. نصب ZIP - theme.json + theme.css + assets',
        titleEn: '1. Install ZIP - theme.json + theme.css + assets',
        descFa: 'فایل ZIP قالب (ساختار: theme.json متادیتا، theme.css استایل، پوشه assets تصاویر، اختیاری theme.js کامپوننت) را بکش و رها کن (drag & drop) یا انتخاب فایل. نصب خودکار در پس‌زمینه (job) با پیشرفت filesDone/filesTotal. اگر شناسه تکراری و سروری باشد، به‌روزرسانی اتمیک می‌شود. اگر داخلی/محلی باشد خطا.',
        descEn: 'Theme ZIP file (structure: theme.json metadata, theme.css styles, assets folder images, optional theme.js components) drag & drop or file select. Auto install in background (job) with progress filesDone/filesTotal. If duplicate id and server kind, atomic update. If built-in/local error.',
        imageUrl: '/images/admin-guides/themes-step1.png',
        highlights: [
          { x: 10, y: 20, w: 40, h: 15, labelFa: 'درگ و دراپ ZIP - theme.json لازم', labelEn: 'Drag & drop ZIP - theme.json required', color: 'yellow' },
          { x: 55, y: 20, w: 30, h: 15, labelFa: 'پیشرفت نصب - filesDone/total', labelEn: 'Install progress', color: 'blue' },
        ],
      },
      {
        titleFa: '۲. فعال‌سازی سراسری - برای همه بازدیدکنندگان',
        titleEn: '2. Site-wide activation - for all visitors',
        descFa: 'روی فعال‌سازی (Activate) بزن تا برای همه بازدیدکنندگان اعمال شود - انتخاب ادمین = پیش‌فرض سایت. قبلاً فقط localStorage همین مرورگر عوض می‌شد و ادمین فکر می‌کرد پیش‌فرض سایت عوض شده. الان درست است. اگر قالب فقط محلی (colors/zip) باشد، نمی‌تواند پیش‌فرض سراسری باشد - باید روی سرور نصب شود.',
        descEn: 'Click Activate to apply site-wide for all visitors - admin choice = site default. Previously only localStorage of this browser changed and admin thought site default changed. Now correct. If theme only local (colors/zip), cannot be site default - must be installed on server.',
        imageUrl: '/images/admin-guides/themes-step2.png',
        highlights: [
          { x: 10, y: 60, w: 15, h: 10, labelFa: 'فعال‌سازی سراسری #2271b1', labelEn: 'Site-wide Activate #2271b1', color: 'green' },
        ],
      },
    ],
    commonMistakesFa: ['ZIP اشتباه بدون theme.json و خطا', 'فعال نکردن بعد نصب و فکر کردن خراب است - باید Activate بزنی'],
    commonMistakesEn: ['Wrong ZIP without theme.json and error', 'Not activating after install and thinking broken - must click Activate'],
  },
  appSlider: {
    section: 'appSlider',
    introFa: 'اسلایدر صفحه اصلی و اپ: بنر بزرگ بالا. مدیریت استایل.',
    introEn: 'Home & App slider: big banner top.  style.',
    purposeFa: 'اسلاید اضافه کنی، عکس، عنوان، لینک مقصد.',
    purposeEn: 'Add slide with image, title, link target.',
    menuExplainFa: 'گروه پیشرفته - اسلایدر صفحه اصلی و اپ، آیکون Images، مسیر /admin/appSlider.',
    menuExplainEn: 'Advanced group - Home & App Slider, icon Images, path /admin/appSlider.',
    steps: [
      {
        titleFa: '۱. افزودن اسلاید - عکس، عنوان فارسی/انگلیسی، مقصد',
        titleEn: '1. Add slide - image, FA/EN title, target',
        descFa: 'فرم: آدرس عکس (/images/slider/...), عنوان فارسی (مثلاً "تورنمنت تابستان")، عنوان انگلیسی (Summer Tournament)، مقصد کلیک (reserve/cafe/shop/tournaments - از select). افزودن آبی #2271b1. عکس خیلی سنگین (5MB) نگذار - سایت کند می‌شود. لینک اشتباه نگذار.',
        descEn: 'Form: image URL (/images/slider/...), FA title (e.g. Summer Tournament FA), EN title (Summer Tournament), click target (reserve/cafe/shop/tournaments - from select). Add blue #2271b1. Not heavy image (5MB) - site slow. Not wrong link.',
        imageUrl: '/images/admin-guides/appSlider-step1.png',
        highlights: [
          { x: 5, y: 10, w: 40, h: 12, labelFa: 'آدرس عکس - سبک', labelEn: 'Image URL - light', color: 'yellow' },
          { x: 5, y: 25, w: 20, h: 10, labelFa: 'عنوان فارسی', labelEn: 'FA title', color: 'blue' },
          { x: 30, y: 25, w: 20, h: 10, labelFa: 'عنوان انگلیسی', labelEn: 'EN title', color: 'green' },
        ],
      },
      {
        titleFa: '۲. ویرایش و حذف',
        titleEn: '2. Edit and delete',
        descFa: 'در لیست، روی ویرایش (Edit آیکون آبی) بزن، تغییر بده، ذخیره. حذف قرمز.',
        descEn: 'In list, click edit (blue Edit icon), change, save. Delete red.',
        imageUrl: '/images/admin-guides/appSlider-step2.png',
      },
    ],
    commonMistakesFa: ['عکس خیلی سنگین (5MB) و کند شدن سایت', 'لینک اشتباه و 404'],
    commonMistakesEn: ['Heavy image (5MB) and slow site', 'Wrong link and 404'],
  },
  mobileAppDownload: {
    section: 'mobileAppDownload',
    introFa: 'دانلود اپ موبایل: لینک APK و توضیح. مدیریت استایل.',
    introEn: 'Mobile app download: APK link and info.  style.',
    purposeFa: 'لینک دانلود اپ را بگذاری.',
    purposeEn: 'Set download link for app.',
    menuExplainFa: 'گروه پیشرفته - دانلود اپلیکیشن موبایل، آیکون Smartphone، مسیر /admin/mobileAppDownload.',
    menuExplainEn: 'Advanced group - Mobile App Download, icon Smartphone, path /admin/mobileAppDownload.',
    steps: [
      {
        titleFa: '۱. تنظیم لینک APK',
        titleEn: '1. Set APK link',
        descFa: 'فرم: آدرس APK (https://.../app.apk)، توضیحات، نسخه. ذخیره. لینک خراب نگذار - تست کن. نسخه قدیمی نگذار.',
        descEn: 'Form: APK URL (https://.../app.apk), description, version. Save. Not broken link - test. Not old version.',
        imageUrl: '/images/admin-guides/mobileAppDownload-step1.png',
        highlights: [
          { x: 10, y: 20, w: 40, h: 12, labelFa: 'لینک APK - تست کن', labelEn: 'APK link - test', color: 'yellow' },
        ],
      },
    ],
    commonMistakesFa: ['لینک خراب و دانلود نشدن', 'نسخه قدیمی و باگ'],
    commonMistakesEn: ['Broken link and no download', 'Old version and bugs'],
  },
  customization: {
    section: 'customization',
    introFa: 'سفارشی‌سازی سایت و اطلاعات کل: آدرس، تلفن، شبکه اجتماعی، قیمت‌ها. مثل مدیریت Settings.',
    introEn: 'Site customization & club info: address, phone, social, pricing. Like  Settings.',
    purposeFa: 'اطلاعات کل را ویرایش کنی.',
    purposeEn: 'Edit club info.',
    menuExplainFa: 'گروه پیشرفته - سفارشی‌سازی سایت و اطلاعات کل، آیکون Sliders، مسیر /admin/customization. منبع داده اینجاست.',
    menuExplainEn: 'Advanced group - Site Customization & Club Info, icon Sliders, path /admin/customization. Data source here.',
    steps: [
      {
        titleFa: '۱. منبع داده - Sample یا Database - مهم‌ترین',
        titleEn: '1. Data source - Sample or Database - most important',
        descFa: 'بالا: دو دکمه Sample (آبی روشن #d5e9f0) و Database (سبز #d5e9f0 فعال). Sample برای نمایش دمو با داده آماده، Database برای واقعی با داده‌ای که خودت وارد کردی. اگر روی Sample بمانی و سیستم اضافه کنی، ذخیره می‌شود ولی سایت همچنان داده آماده را نشان می‌دهد - فکر می‌کنی گم شده. باید Database کنی تا نمایش داده شود. این رفتار عمدی است ولی قبلاً توضیح نداشت.',
        descEn: 'Top: two buttons Sample (light blue #d5e9f0) and Database (green #d5e9f0 active). Sample for demo with ready data, Database for real with data you entered. If you stay on Sample and add system, it saves but site still shows ready data - you think lost. Must switch to Database to display. Intentional but previously no explanation.',
        imageUrl: '/images/admin-guides/customization-step1.png',
        highlights: [
          { x: 10, y: 10, w: 15, h: 12, labelFa: 'Sample - دمو', labelEn: 'Sample - demo', color: 'yellow' },
          { x: 28, y: 10, w: 15, h: 12, labelFa: 'Database - واقعی - باید این باشد', labelEn: 'Database - real - must be this', color: 'green' },
        ],
        tipFa: 'برای نمایش اطلاعات واقعی، حتماً Database را انتخاب کن.',
        tipEn: 'To display real info, must choose Database.',
      },
      {
        titleFa: '۲. اطلاعات تماس - تلفن، آدرس، ساعات، نقشه',
        titleEn: '2. Contact info - phone, address, hours, map',
        descFa: 'فرم: تلفن کل، آدرس (برای نقشه)، ساعات کاری، لینک نقشه Google. ذخیره. آدرس اشتباه روی نقشه نرود.',
        descEn: 'Form: club phone, address (for map), hours, Google map link. Save. Not wrong address on map.',
        imageUrl: '/images/admin-guides/customization-step2.png',
      },
      {
        titleFa: '۳. شبکه اجتماعی - اینستا، تلگرام، یوتیوب',
        titleEn: '3. Social links - Insta, Telegram, YouTube',
        descFa: 'لیست لینک‌ها: اینستا، تلگرام، یوتیوب. افزودن/ویرایش/حذف. مثل مدیریت Social Links.',
        descEn: 'Links list: Insta, Telegram, YouTube. Add/edit/delete. Like  Social Links.',
        imageUrl: '/images/admin-guides/customization-step3.png',
      },
    ],
    commonMistakesFa: ['آدرس اشتباه روی نقشه و گم شدن مشتری', 'Sample ماندن و فکر کردن اطلاعات ذخیره نمی‌شود - باید Database کنی'],
    commonMistakesEn: ['Wrong address on map and lost customer', 'Staying in Sample and thinking info not saved - must switch to Database'],
  },
  dbLogs: {
    section: 'dbLogs',
    introFa: 'لاگ‌های دیتابیس: ببینی چه درخواستی به DB رفته. برای دولر.',
    introEn: 'Database logs: see what queries went to DB. For dev.',
    purposeFa: 'دیباگ و بررسی عملکرد - چه خطایی رفته.',
    purposeEn: 'Debug and performance - what error went.',
    menuExplainFa: 'گروه پیشرفته - لاگ‌های دیتابیس، آیکون Database، مسیر /admin/dbLogs.',
    menuExplainEn: 'Advanced group - Database Logs, icon Database, path /admin/dbLogs.',
    steps: [
      {
        titleFa: '۱. دیدن لاگ - زمان و نوع',
        titleEn: '1. View logs - time and type',
        descFa: 'لیست لاگ‌ها با زمان، نوع عملیات (query/error)، provider. مثل مدیریت Debug log.',
        descEn: 'List with time, operation type (query/error), provider. Like  Debug log.',
        imageUrl: '/images/admin-guides/dbLogs-step1.png',
      },
      {
        titleFa: '۲. رفرش',
        titleEn: '2. Refresh',
        descFa: 'دکمه بروزرسانی - لاگ جدید بیاید.',
        descEn: 'Refresh button - new logs.',
        imageUrl: '/images/admin-guides/dbLogs-step2.png',
      },
    ],
    commonMistakesFa: ['نادیده گرفتن لاگ خطا و خراب ماندن'],
    commonMistakesEn: ['Ignoring error logs and staying broken'],
  },
  apiKeys: {
    section: 'apiKeys',
    introFa: 'مرکز کلیدها — قبلاً پراکنده بود، الان همه اینجاست. مهم‌ترین بخش. مدیریت استایل با تب دسته‌بندی.',
    introEn: 'Keys Center — previously scattered, now all here. Most important.  style with category tabs.',
    purposeFa: 'همه API Key ها را یک‌جا مدیریت کنی - جارویس 3 مدل با کلید پیش‌فرض ENV.',
    purposeEn: 'Manage all API keys in one place - Jarvis 3 models with ENV default keys.',
    menuExplainFa: 'گروه هوش و فنی - مرکز کلیدها، آیکون KeyRound، مسیر /admin/apiKeys. همه کلیدها یک‌جاست - قبلاً 3 جا پراکنده بود.',
    menuExplainEn: 'Intelligence & Technical group - Keys Center, icon KeyRound, path /admin/apiKeys. All keys in one place - previously 3 places scattered.',
    steps: [
      {
        titleFa: '۱. انتخاب دسته - جارویس، دسکتاپ، محتوا، اجتماعی، همکاری',
        titleEn: '1. Choose category - Jarvis, Desktop, Content, Social, Affiliate',
        descFa: 'بالا 7 تب دایره‌ای: همه کلیدها، جارویس (AI)، اتصال دسکتاپ، تولید محتوا، شبکه اجتماعی، همکاری، انتشار. روی هر کدام بزن تا کارت‌های آن دسته بیاید. مثل مدیریت Settings tabs.',
        descEn: 'Top 7 circle tabs: All Keys, Jarvis AI, Desktop Sync, Content Gen, Social APIs, Affiliate, Publishing. Click each to show its cards. Like  Settings tabs.',
        imageUrl: '/images/admin-guides/apiKeys-step1.png',
        highlights: [
          { x: 5, y: 5, w: 90, h: 12, labelFa: 'تب دسته‌ها - 7 دسته', labelEn: 'Category tabs - 7 categories', color: 'yellow' },
        ],
      },
      {
        titleFa: '۲. جارویس - 3 باکس کلید با پیش‌فرض ENV - مهم‌ترین',
        titleEn: '2. Jarvis - 3 key boxes with ENV default - most important',
        descFa: 'بخش جارویس: 3 کارت سیاه با بوردر آبی #3b82f6: #1 Groq (سریع و ارزان پیشنهاد اول - پیش‌فرض ENV دارد و ماسک "••••••••" با برچسب "ENV پیش‌فرض" دیده می‌شود)، #2 OpenRouter (رایگان پشتیبان دوم)، #3 Gemini (قدرتمند پشتیبان سوم). هر کارت: نام نمایشی (label)، مدل (model - مثلاً llama-3.1-8b-instant)، کلید API (apiKey - input password با چشم برای دیدن)، فعال (checkbox)، Base URL برای Ollama (اگر provider ollama). برای تغییر کلید پیش‌فرض، کلید جدید را در input وارد کن (placeholder می‌گوید "•••••••• (پیش‌فرض ENV) - کلید جدید برای تغییر") و ذخیره جارویس (دکمه آبی بالا) بزن. مدیر فقط تغییر می‌دهد، نیازی به ثبت از صفر نیست - کلیدهای پیش‌فرض از سرویس لود شده.',
        descEn: 'Jarvis section: 3 black cards border blue #3b82f6: #1 Groq (fast cheap first - has ENV default and masked "••••••••" with label "ENV default"), #2 OpenRouter (free second), #3 Gemini (powerful third). Each card: display name (label), model (e.g. llama-3.1-8b-instant), API key (apiKey - password input with eye), enabled (checkbox), Base URL for Ollama if provider ollama. To change default key, enter new key in input (placeholder says "•••••••• (ENV default) - new key to change") and click Save Jarvis (blue top button). Admin only changes, no need from scratch - default keys loaded from service.',
        imageUrl: '/images/admin-guides/apiKeys-step2.png',
        highlights: [
          { x: 5, y: 15, w: 28, h: 60, labelFa: '#1 Groq - پیش‌فرض ENV ماسک', labelEn: '#1 Groq - ENV default masked', color: 'yellow' },
          { x: 35, y: 15, w: 28, h: 60, labelFa: '#2 OpenRouter - باکس کلید', labelEn: '#2 OpenRouter - key box', color: 'blue' },
          { x: 65, y: 15, w: 28, h: 60, labelFa: '#3 Gemini - باکس کلید', labelEn: '#3 Gemini - key box', color: 'green' },
          { x: 5, y: 80, w: 90, h: 10, labelFa: 'ذخیره جارویس - آبی #3b82f6', labelEn: 'Save Jarvis - blue #3b82f6', color: 'red' },
        ],
        tipFa: 'کلیدهای پیش‌فرض از ENV لود شده - ماسک دیده می‌شود. برای تغییر، کلید جدید وارد و ذخیره کن.',
        tipEn: 'Default keys loaded from ENV - shown masked. To change, enter new key and save.',
      },
      {
        titleFa: '۳. اتصال دسکتاپ و بقیه کلیدها',
        titleEn: '3. Desktop sync and other keys',
        descFa: 'اتصال دسکتاپ (Web Sync): کلید امن (حداقل 16 کاراکتر) - input password با چشم، دکمه ذخیره سبز، تولید جدید (Generate) با آیکون Sparkles، کپی (Copy). این کلید را در برنامه دسکتاپ بخش Web Sync وارد کن - آدرس https://bazino.pro. تولید محتوا: 5 کارت برای GROQ_API_KEY, IMEJIS_API_KEY, CLOUDFLARE_API_TOKEN, ELEVENLABS_API_KEY, ZERNIO_API_KEY - هر کدام OK/Missing، input، چشم، ذخیره. اجتماعی: YouTube API, Twitch Client ID/Secret - برای ترندها لازم است، بدون آن خالی می‌ماند - هشدار زرد. همکاری: توکن‌های baz_... لیست. انتشار: وضعیت mediagenEnabled و designs allowlist - فقط نمایش.',
        descEn: 'Desktop Sync (Web Sync): secure key (min 16 chars) - password input with eye, save green button, generate new (Generate) with Sparkles icon, copy. Enter this key in desktop app Web Sync - address https://bazino.pro. Content: 5 cards for GROQ_API_KEY, IMEJIS_API_KEY, CLOUDFLARE_API_TOKEN, ELEVENLABS_API_KEY, ZERNIO_API_KEY - each OK/Missing, input, eye, save. Social: YouTube API, Twitch Client ID/Secret - needed for Trends, without empty - yellow warning. Affiliate: baz_... tokens list. Publishing: mediagenEnabled and designs allowlist status only.',
        imageUrl: '/images/admin-guides/apiKeys-step3.png',
        highlights: [
          { x: 10, y: 15, w: 60, h: 12, labelFa: 'کلید Web Sync - حداقل 16 کاراکتر', labelEn: 'Web Sync key - min 16 chars', color: 'green' },
          { x: 75, y: 15, w: 10, h: 12, labelFa: 'تولید جدید', labelEn: 'Generate new', color: 'yellow' },
          { x: 10, y: 35, w: 25, h: 25, labelFa: 'Groq API - پیش‌فرض ثبت شده', labelEn: 'Groq API - default registered', color: 'blue' },
        ],
      },
      {
        titleFa: '۴. تست بعد ذخیره',
        titleEn: '4. Test after save',
        descFa: 'بعد ذخیره هر کلید، به تب مربوطه برو و تست کن: مثلاً بعد YouTube API، به /admin/content → ترندهای روز برو - باید ویدیوهای داغ بیاید. بعد Groq، به /admin/jarvis برو و دستور بده. بعد Imejis، به /admin/content → تولید تصویر برو و تولید کن.',
        descEn: 'After saving each key, go to related tab and test: e.g. after YouTube API, go to /admin/content -> Trends - should show hot videos. After Groq, go to /admin/jarvis and command. After Imejis, go to /admin/content -> MediaGen and generate.',
        imageUrl: '/images/admin-guides/apiKeys-step1.png',
      },
    ],
    commonMistakesFa: ['کلید اشتباه یا ناقص پیست کردن و خطا', 'ندادن دسترسی درست در کنسول API (مثلاً YouTube Data v3 فعال نکردن)', 'فکر کردن باید از صفر ثبت کنی در حالی که پیش‌فرض ENV دارد - فقط تغییر بده'],
    commonMistakesEn: ['Pasting wrong/incomplete key and error', 'Not enabling API in console (e.g. YouTube Data v3 not enabled)', 'Thinking must register from scratch while has ENV default - only change'],
  },
  presentation: {
    section: 'presentation',
    introFa: 'پرزنتیشن: معرفی بازینو برای سرمایه‌گذار یا مشتری. اسلایدها.',
    introEn: 'Presentation: Bazino intro for investor or customer. Slides.',
    purposeFa: 'اسلایدها را ببینی، PDF بگیری.',
    purposeEn: 'View slides, get PDF.',
    menuExplainFa: 'گروه پیشرفته - پرزنتیشن، آیکون Presentation، مسیر /admin/presentation.',
    menuExplainEn: 'Advanced group - Presentation, icon Presentation, path /admin/presentation.',
    steps: [
      {
        titleFa: '۱. دیدن اسلایدها',
        titleEn: '1. View slides',
        descFa: 'اسلایدها را با قبلی/بعدی ورق بزن - مثل مدیریت Presentation.',
        descEn: 'Flip through slides with prev/next - like  Presentation.',
        imageUrl: '/images/admin-guides/presentation-step1.png',
      },
    ],
    commonMistakesFa: ['-'],
    commonMistakesEn: ['-'],
  },
  jarvis: {
    section: 'jarvis',
    introFa: 'جارویس دستیار AI مدیر: دستور بده، کار انجام می‌دهد. مثل مدیریت AI assistant.',
    introEn: 'Jarvis AI assistant: command, it does. Like  AI assistant.',
    purposeFa: 'مدیریت سریع با زبان طبیعی - بدون کلیک زیاد.',
    purposeEn: 'Fast management with natural language - without many clicks.',
    menuExplainFa: 'گروه هوش و فنی - جارویس دستیار مدیر (AI)، آیکون Brain، مسیر /admin/jarvis. نیاز به کلید در مرکز کلیدها دارد.',
    menuExplainEn: 'Intelligence & Technical group - Jarvis Admin AI Assistant, icon Brain, path /admin/jarvis. Needs key in Keys Center.',
    steps: [
      {
        titleFa: '۱. چک کلید پیش‌فرض - مرکز کلیدها',
        titleEn: '1. Check default key - Keys Center',
        descFa: 'به /admin/apiKeys → جارویس برو - باید حداقل یک کلید با برچسب "ENV پیش‌فرض" و ماسک "••••••••" ببینی. اگر نداری، کلید Groq از groq.com → API Keys → Create بگیر و وارد کن. Groq سریع و ارزان است - پیشنهاد اول.',
        descEn: 'Go to /admin/apiKeys -> Jarvis - should see at least one key with label "ENV default" and masked "••••••••". If not, get Groq key from groq.com -> API Keys -> Create and enter. Groq fast cheap - first choice.',
        imageUrl: '/images/admin-guides/jarvis-step1.png',
        highlights: [
          { x: 5, y: 15, w: 28, h: 50, labelFa: 'Groq - ENV پیش‌فرض ماسک - باید باشد', labelEn: 'Groq - ENV default masked - must exist', color: 'yellow' },
          { x: 5, y: 70, w: 20, h: 10, labelFa: 'ذخیره جارویس', labelEn: 'Save Jarvis', color: 'blue' },
        ],
      },
      {
        titleFa: '۲. نوشتن دستور فارسی',
        titleEn: '2. Write Persian command',
        descFa: 'به /admin/jarvis برو - input پایین: مثلاً بنویس "سیستم ۴ را غیرفعال کن" یا "امروز چقدر فروختیم؟" یا "یک تورنمنت Valorant با 8 تیم بساز". Enter بزن. جارویس فکر می‌کند (loading) و جواب می‌دهد.',
        descEn: 'Go to /admin/jarvis - bottom input: e.g. "disable system 4" or "how much sold today?" or "create Valorant tournament 8 teams". Press Enter. Jarvis thinks (loading) and answers.',
        imageUrl: '/images/admin-guides/jarvis-step2.png',
        highlights: [
          { x: 10, y: 75, w: 60, h: 12, labelFa: 'دستور فارسی بنویس - Enter', labelEn: 'Write Persian command - Enter', color: 'yellow' },
          { x: 10, y: 20, w: 80, h: 50, labelFa: 'جواب جارویس - نتیجه', labelEn: 'Jarvis answer - result', color: 'blue' },
        ],
      },
      {
        titleFa: '۳. دیدن نتیجه و اقدام خودکار',
        titleEn: '3. See result and auto action',
        descFa: 'جارویس جواب می‌دهد و اگر نیاز باشد کار را انجام می‌دهد: مثلاً سیستم را غیرفعال می‌کند، قیمت را عوض می‌کند، مقاله می‌سازد. در لیست مهارت‌ها (skills) می‌بینی چه کارهایی بلد است.',
        descEn: 'Jarvis answers and does task if needed: e.g. disables system, changes price, creates article. In skills list see what it can do.',
        imageUrl: '/images/admin-guides/jarvis-step1.png',
      },
    ],
    commonMistakesFa: ['دستور مبهم مثل "درستش کن" - باید دقیق بگی', 'کلید AI نگذاشتن و خطای 401', 'فکر کردن جارویس همه‌چیز را می‌فهمد - فقط مهارت‌های لیست شده'],
    commonMistakesEn: ['Vague command like "fix it" - must be precise', 'Missing AI key and 401 error', 'Thinking Jarvis understands everything - only listed skills'],
  },
  migrations: {
    section: 'migrations',
    introFa: 'مهاجرت‌های دیتابیس: کد C# برای EF Core. برای دولر.',
    introEn: 'Database migrations: C# code for EF Core. For dev.',
    purposeFa: 'برای دولر: ببینی جدول‌ها چطور ساخته می‌شود.',
    purposeEn: 'For dev: see how tables are created.',
    menuExplainFa: 'گروه پیشرفته - مهاجرت‌های دیتابیس (EF Core)، آیکون FileClock، مسیر /admin/migrations.',
    menuExplainEn: 'Advanced group - Database Migrations (EF Core), icon FileClock, path /admin/migrations.',
    steps: [
      {
        titleFa: '۱. کپی کد C#',
        titleEn: '1. Copy C# code',
        descFa: 'کد کلاس مهاجرت EF Core را کپی کن و در پروژه C# بگذار. بدون دانش دست نزن.',
        descEn: 'Copy EF Core migration class code to C# project. Not touch without knowledge.',
        imageUrl: '/images/admin-guides/migrations-step1.png',
      },
    ],
    commonMistakesFa: ['دست زدن بدون دانش C# و خراب کردن DB'],
    commonMistakesEn: ['Touching without C# knowledge and breaking DB'],
  },
};

// PDF sections for viewer - comprehensive
export const PDF_SECTIONS = [
  { id: 'intro', titleFa: 'مقدمه و طراحی مدیریت', titleEn: 'Intro &  Design', pages: '1-2' },
  { id: 'dashboard', titleFa: 'داشبورد', titleEn: 'Dashboard', pages: '3' },
  { id: 'systems', titleFa: 'سیستم‌ها', titleEn: 'Systems', pages: '4' },
  { id: 'cafe', titleFa: 'کافه', titleEn: 'Cafe', pages: '5' },
  { id: 'shop', titleFa: 'فروشگاه', titleEn: 'Shop', pages: '5' },
  { id: 'tournaments', titleFa: 'تورنمنت‌ها', titleEn: 'Tournaments', pages: '6' },
  { id: 'content', titleFa: 'محتوا و انتشار', titleEn: 'Content & Publish', pages: '7-8' },
  { id: 'apiKeys', titleFa: 'مرکز کلیدها - مهم‌ترین', titleEn: 'Keys Center - Most Important', pages: '9-10' },
  { id: 'jarvis', titleFa: 'جارویس AI', titleEn: 'Jarvis AI', pages: '11' },
  { id: 'menu', titleFa: 'توضیح کامل منو', titleEn: 'Full Menu Explanation', pages: '12' },
];

interface Props {
  section: AdminSection;
  language: 'fa' | 'en' | 'ru' | 'tr';
  dir: 'rtl' | 'ltr';
  isOpen: boolean;
  onClose: () => void;
  initialStep?: number;
}

export default function AdminGuide({ section, language, dir, isOpen, onClose, initialStep = 0 }: Props) {
  const [activeStepIdx, setActiveStepIdx] = useState(initialStep);
  const [searchQuery, setSearchQuery] = useState('');
  const [isPdfViewerOpen, setIsPdfViewerOpen] = useState(false);
  const [pdfSearchQuery, setPdfSearchQuery] = useState('');
  const [pdfPage, setPdfPage] = useState(0);

  useEffect(() => {
    setActiveStepIdx(initialStep);
  }, [initialStep, section, isOpen]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  if (!isOpen) return null;
  const guide = ADMIN_GUIDES[section];
  if (!guide) return null;

  const filteredSteps = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return guide.steps;
    return guide.steps.filter(s => {
      const hay = [s.titleFa, s.titleEn, s.descFa, s.descEn, s.tipFa || '', s.warningFa || ''].join(' ').toLowerCase();
      return hay.includes(q);
    });
  }, [guide.steps, searchQuery]);

  const step = filteredSteps[activeStepIdx] || guide.steps[0];

  const filteredPdfSections = useMemo(() => {
    const q = pdfSearchQuery.trim().toLowerCase();
    if (!q) return PDF_SECTIONS;
    return PDF_SECTIONS.filter(s => [s.id, s.titleFa, s.titleEn].join(' ').toLowerCase().includes(q));
  }, [pdfSearchQuery]);

  // مدیریت style modal centered accounting for header height 32px
  return (
    <>
      <div
        className="fixed z-[100] flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-sm"
        dir={dir}
        style={{
          top: '32px', // accounting for  admin bar height 32px - not hidden under header
          left: 0,
          right: 0,
          bottom: 0,
          height: 'calc(100vh - 32px)', // centered considering header height
        }}
      >
        <div className="absolute inset-0" onClick={onClose} />
        <div className="relative bg-white border border-[#c3c4c7] shadow-[0_5px_15px_rgba(0,0,0,0.3)] rounded-[2px] w-full max-w-5xl max-h-[calc(100vh-32px-16px)] overflow-hidden flex flex-col animate-fade-in" style={{ fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Oxygen-Sans,Ubuntu,Cantarell,"Helvetica Neue",sans-serif' }}>
          {/*  Header */}
          <div className="px-4 py-3 border-b border-[#dcdcde] flex items-center justify-between bg-[#fcfcfc]">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-8 h-8 rounded-[2px] bg-[#2271b1] text-white flex items-center justify-center shrink-0">
                <BookOpen className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <h2 className="text-[14px] font-semibold text-[#1d2327] truncate">
                  {L(language, ADMIN_SECTION_META[section])} — {L(language, { fa: 'راهنمای گام‌به‌گام جامع', en: 'Comprehensive Step-by-Step Guide', ru: 'Подробное руководство', tr: 'Kapsamlı Kılavuz' })}
                </h2>
                <p className="text-[12px] text-[#50575e] truncate max-w-[600px]">{L(language, { fa: guide.introFa, en: guide.introEn, ru: guide.introEn, tr: guide.introEn })}</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                onClick={() => setIsPdfViewerOpen(true)}
                className="h-[28px] px-2.5 rounded-[3px] bg-[#2271b1] border border-[#2271b1] text-white hover:bg-[#135e96] text-[12px] font-normal flex items-center gap-1"
              >
                <FileText className="w-3.5 h-3.5" />
                PDF
              </button>
              <button onClick={onClose} className="w-7 h-7 rounded-[3px] bg-white border border-[#dcdcde] hover:bg-[#f6f7f7] text-[#50575e] hover:text-[#1d2327] flex items-center justify-center">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Search bar */}
          <div className="px-4 py-2 border-b border-[#dcdcde] bg-[#f6f7f7] flex items-center gap-2">
            <Search className="w-4 h-4 text-[#646970] shrink-0" />
            <input
              type="search"
              value={searchQuery}
              onChange={e => { setSearchQuery(e.target.value); setActiveStepIdx(0); }}
              placeholder={L(language, { fa: 'جستجو در مراحل این بخش...', en: 'Search steps in this section...', ru: 'Поиск шагов...', tr: 'Bu bölümde adımları ara...' })}
              className="flex-1 h-[28px] bg-white border border-[#8c8f94] focus:border-[#2271b1] focus:shadow-[0_0_0_1px_#2271b1] rounded-[3px] px-2.5 text-[13px] text-[#2c3338] placeholder:text-[#8c8f94] outline-none"
            />
            {searchQuery && (
              <button onClick={() => { setSearchQuery(''); setActiveStepIdx(0); }} className="text-[#646970] hover:text-[#1d2327]">
                <X className="w-4 h-4" />
              </button>
            )}
            <span className="text-[11px] text-[#646970] font-mono hidden sm:inline">{filteredSteps.length} steps</span>
          </div>

          <div className="flex-1 overflow-y-auto p-4 grid lg:grid-cols-12 gap-4 bg-[#f0f0f1]">
            {/* Steps list -  style */}
            <div className="lg:col-span-4 space-y-3">
              <div className="bg-white border border-[#c3c4c7] shadow-[0_1px_1px_rgba(0,0,0,0.04)] rounded-[2px] p-3">
                <h4 className="text-[11px] font-bold text-[#646970] uppercase tracking-wide mb-2 flex items-center gap-1.5">
                  <HelpCircle className="w-3.5 h-3.5" /> {L(language, { fa: 'مراحل جامع', en: 'Comprehensive Steps', ru: 'Шаги', tr: 'Adımlar' })} ({filteredSteps.length})
                </h4>
                <div className="space-y-1">
                  {filteredSteps.map((s, idx) => (
                    <button
                      key={idx}
                      onClick={() => setActiveStepIdx(idx)}
                      className={`w-full text-left ${dir === 'rtl' ? 'text-right' : ''} px-2.5 py-2 rounded-[2px] text-[13px] font-normal flex items-center gap-2 transition-colors border
                        ${idx === activeStepIdx ? 'bg-[#2271b1] text-white border-[#2271b1]' : 'bg-white text-[#3c434a] border-[#dcdcde] hover:bg-[#f6f7f7] hover:border-[#8c8f94]'}`}
                    >
                      <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0 ${idx === activeStepIdx ? 'bg-white text-[#2271b1]' : 'bg-[#f0f0f1] text-[#50575e] border border-[#dcdcde]'}`}>{idx + 1}</span>
                      <span className="truncate flex-1">{L(language, { fa: s.titleFa, en: s.titleEn, ru: s.titleEn, tr: s.titleEn })}</span>
                      {idx < activeStepIdx && <CheckCircle2 className="w-3.5 h-3.5 text-[#00a32a] ms-auto" />}
                    </button>
                  ))}
                </div>
              </div>

              <div className="bg-white border border-[#dba617] shadow-[0_1px_1px_rgba(0,0,0,0.04)] rounded-[2px] p-3">
                <h4 className="text-[12px] font-semibold text-[#996800] flex items-center gap-1.5 mb-2">
                  <AlertTriangle className="w-3.5 h-3.5" /> {L(language, { fa: 'اشتباهات رایج', en: 'Common Mistakes', ru: 'Частые ошибки', tr: 'Yaygın Hatalar' })}
                </h4>
                <ul className="text-[12px] text-[#3c434a] leading-[1.5] list-disc ps-4 space-y-1">
                  {(language === 'fa' ? guide.commonMistakesFa : guide.commonMistakesEn).map((m, i) => (
                    <li key={i}>{m}</li>
                  ))}
                </ul>
              </div>

              <div className="bg-white border border-[#c3c4c7] shadow-[0_1px_1px_rgba(0,0,0,0.04)] rounded-[2px] p-3">
                <h4 className="text-[11px] font-bold text-[#646970] uppercase mb-1">{L(language, { fa: 'توضیح منو', en: 'Menu Explanation', ru: 'Меню', tr: 'Menü' })}</h4>
                <p className="text-[12px] text-[#50575e] leading-[1.5]">{L(language, { fa: guide.menuExplainFa || '', en: guide.menuExplainEn || '', ru: guide.menuExplainEn || '', tr: guide.menuExplainEn || '' })}</p>
              </div>
            </div>

            {/* Step detail -  style with highlight overlays */}
            <div className="lg:col-span-8 space-y-3">
              <div className="bg-white border border-[#c3c4c7] shadow-[0_1px_1px_rgba(0,0,0,0.04)] rounded-[2px] p-4">
                <h3 className="text-[14px] font-semibold text-[#1d2327] mb-2">{L(language, { fa: step.titleFa, en: step.titleEn, ru: step.titleEn, tr: step.titleEn })}</h3>
                <p className="text-[13px] leading-[1.6] text-[#3c434a]">{L(language, { fa: step.descFa, en: step.descEn, ru: step.descEn, tr: step.descEn })}</p>

                {step.tipFa && (
                  <div className="mt-3 p-3 rounded-[2px] bg-[#f0f6fc] border border-[#c3c4c7] border-l-4 border-l-[#2271b1] flex gap-2">
                    <Lightbulb className="w-4 h-4 text-[#2271b1] shrink-0 mt-0.5" />
                    <p className="text-[12px] text-[#3c434a] leading-[1.5]">{L(language, { fa: step.tipFa, en: step.tipEn || step.tipFa, ru: step.tipEn || '', tr: step.tipEn || '' })}</p>
                  </div>
                )}
                {step.warningFa && (
                  <div className="mt-3 p-3 rounded-[2px] bg-[#fcf0f1] border border-[#e9a0a0] border-l-4 border-l-[#d63638] flex gap-2">
                    <AlertTriangle className="w-4 h-4 text-[#d63638] shrink-0 mt-0.5" />
                    <p className="text-[12px] text-[#3c434a] leading-[1.5]">{L(language, { fa: step.warningFa, en: step.warningEn || step.warningFa, ru: step.warningEn || '', tr: step.warningEn || '' })}</p>
                  </div>
                )}

                {/* Image with highlight overlays - not simple screenshot */}
                {step.imageUrl ? (
                  <div className="mt-4 rounded-[2px] overflow-hidden border border-[#c3c4c7] bg-[#fcfcfc] relative group">
                    <div className="relative">
                      <img src={step.imageUrl} alt={L(language, { fa: step.titleFa, en: step.titleEn, ru: step.titleEn, tr: step.titleEn })} className="w-full h-auto object-cover" loading="lazy" />
                      {/* Highlight overlays */}
                      {step.highlights?.map((hl, hi) => (
                        <div
                          key={hi}
                          className={`absolute border-2 rounded-[2px] pointer-events-none animate-pulse
                            ${hl.color === 'yellow' ? 'border-[#f0c040] bg-[#f0c040]/15' : ''}
                            ${hl.color === 'blue' ? 'border-[#2271b1] bg-[#2271b1]/15' : ''}
                            ${hl.color === 'red' ? 'border-[#d63638] bg-[#d63638]/15' : ''}
                            ${hl.color === 'green' ? 'border-[#00a32a] bg-[#00a32a]/15' : ''}
                            ${!hl.color ? 'border-[#f0c040] bg-[#f0c040]/15' : ''}
                          `}
                          style={{
                            left: `${hl.x}%`,
                            top: `${hl.y}%`,
                            width: `${hl.w}%`,
                            height: `${hl.h}%`,
                            boxShadow: '0 0 0 2px rgba(255,255,255,0.8), 0 0 8px rgba(0,0,0,0.3)',
                          }}
                        >
                          <span className={`absolute -top-6 left-0 text-[10px] font-bold px-1.5 py-0.5 rounded-[2px] whitespace-nowrap shadow
                            ${hl.color === 'yellow' ? 'bg-[#f0c040] text-black' : ''}
                            ${hl.color === 'blue' ? 'bg-[#2271b1] text-white' : ''}
                            ${hl.color === 'red' ? 'bg-[#d63638] text-white' : ''}
                            ${hl.color === 'green' ? 'bg-[#00a32a] text-white' : ''}
                            ${!hl.color ? 'bg-[#f0c040] text-black' : ''}
                          `}>
                            {L(language, { fa: hl.labelFa || '', en: hl.labelEn || hl.labelFa || '', ru: hl.labelEn || '', tr: hl.labelEn || '' })}
                          </span>
                        </div>
                      ))}
                    </div>
                    <div className="px-3 py-2 bg-[#f6f7f7] border-t border-[#dcdcde] flex items-center justify-between">
                      <span className="text-[11px] font-mono text-[#646970]" dir="ltr">{step.imageUrl}</span>
                      <span className="text-[11px] text-[#a7aaad]">/admin/{section} → step {activeStepIdx + 1} • {L(language, { fa: 'هایلایت شده', en: 'highlighted', ru: 'выделено', tr: 'vurgulandı' })}</span>
                    </div>
                  </div>
                ) : (
                  <div className="mt-4 rounded-[2px] overflow-hidden border border-[#c3c4c7] bg-[#fcfcfc] aspect-video flex flex-col items-center justify-center gap-2 p-4">
                    <ImageIcon className="w-8 h-8 text-[#a7aaad]" />
                    <p className="text-[12px] text-[#646970] text-center">
                      {L(language, {
                        fa: `تصویر راهنما: ${step.titleFa} — اسکرین‌شات واقعی Chromium با هایلایت اینجا نمایش داده می‌شود`,
                        en: `Guide image: ${step.titleEn} — real Chromium screenshot with highlights will appear here`,
                        ru: `Изображение: ${step.titleEn}`,
                        tr: `Kılavuz görseli: ${step.titleEn}`,
                      })}
                    </p>
                    <span className="text-[11px] font-mono bg-[#f0f0f1] text-[#646970] px-2 py-1 rounded-[2px] border border-[#dcdcde]">/admin/{section} → step {activeStepIdx + 1}</span>
                  </div>
                )}
              </div>

              {/* Navigation -  style */}
              <div className="flex items-center justify-between bg-white border border-[#c3c4c7] rounded-[2px] p-3 shadow-[0_1px_1px_rgba(0,0,0,0.04)]">
                <button
                  disabled={activeStepIdx === 0}
                  onClick={() => setActiveStepIdx(i => Math.max(0, i - 1))}
                  className="h-[30px] px-3 rounded-[3px] bg-white border border-[#8c8f94] hover:bg-[#f6f7f7] disabled:opacity-40 text-[#2c3338] text-[13px] font-normal flex items-center gap-1.5"
                >
                  <ChevronLeft className="w-4 h-4" /> {L(language, { fa: 'قبلی', en: 'Previous', ru: 'Назад', tr: 'Önceki' })}
                </button>
                <span className="text-[12px] font-mono text-[#646970] bg-[#f6f7f7] border border-[#dcdcde] px-2 py-1 rounded-[2px]">{activeStepIdx + 1} / {filteredSteps.length}</span>
                <button
                  disabled={activeStepIdx === filteredSteps.length - 1}
                  onClick={() => setActiveStepIdx(i => Math.min(filteredSteps.length - 1, i + 1))}
                  className="h-[30px] px-3 rounded-[3px] bg-[#2271b1] hover:bg-[#135e96] disabled:opacity-40 border border-[#2271b1] text-white text-[13px] font-normal flex items-center gap-1.5"
                >
                  {L(language, { fa: 'بعدی', en: 'Next', ru: 'Далее', tr: 'Sonraki' })} <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              {/* Purpose box -  style */}
              <div className="bg-white border border-[#c3c4c7] border-l-4 border-l-[#2271b1] shadow-[0_1px_1px_rgba(0,0,0,0.04)] rounded-[2px] p-3 flex gap-2.5">
                <div className="w-7 h-7 rounded-[2px] bg-[#f0f6fc] border border-[#c3c4c7] text-[#2271b1] flex items-center justify-center shrink-0">
                  <Play className="w-3.5 h-3.5" />
                </div>
                <div>
                  <h4 className="text-[12px] font-semibold text-[#1d2327]">{L(language, { fa: 'هدف این بخش', en: 'Purpose of this section', ru: 'Цель раздела', tr: 'Bu bölümün amacı' })}</h4>
                  <p className="text-[12px] text-[#50575e] leading-[1.5] mt-1">{L(language, { fa: guide.purposeFa, en: guide.purposeEn, ru: guide.purposeEn, tr: guide.purposeEn })}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* PDF Viewer Fullscreen - with prev/next, search, close */}
      {isPdfViewerOpen && (
        <div className="fixed inset-0 z-[200] bg-[#f0f0f1] flex flex-col" dir={dir} style={{ fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Oxygen-Sans,Ubuntu,Cantarell,"Helvetica Neue",sans-serif' }}>
          {/* PDF Top Bar -  style */}
          <div className="h-[50px] bg-[#1d2327] text-white flex items-center justify-between px-4 shrink-0">
            <div className="flex items-center gap-3">
              <FileText className="w-5 h-5 text-[#72aee6]" />
              <span className="text-[14px] font-semibold">Bazino Admin Guide PDF — {L(language, { fa: 'راهنمای جامع', en: 'Comprehensive Guide', ru: 'Полное руководство', tr: 'Kapsamlı Kılavuz' })}</span>
              <span className="text-[11px] font-mono bg-[#2c3338] px-2 py-0.5 rounded text-[#a7aaad] hidden sm:inline">/bazino-admin-guide.pdf</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative hidden md:flex items-center gap-2">
                <Search className="w-4 h-4 text-[#a7aaad]" />
                <input
                  value={pdfSearchQuery}
                  onChange={e => setPdfSearchQuery(e.target.value)}
                  placeholder={L(language, { fa: 'جستجو در PDF...', en: 'Search in PDF...', ru: 'Поиск в PDF...', tr: 'PDF içinde ara...' })}
                  className="h-[30px] w-[200px] bg-[#2c3338] border border-[#50575e] rounded-[3px] px-2.5 text-[13px] text-white placeholder:text-[#a7aaad] outline-none focus:border-[#72aee6]"
                />
              </div>
              <button
                onClick={() => window.open('/bazino-admin-guide.pdf', '_blank')}
                className="h-[30px] px-2.5 bg-[#2c3338] hover:bg-[#3858e9] rounded-[3px] text-[12px] flex items-center gap-1"
              >
                <ExternalLink className="w-3.5 h-3.5" /> {L(language, { fa: 'دانلود', en: 'Download', ru: 'Скачать', tr: 'İndir' })}
              </button>
              <button onClick={() => setIsPdfViewerOpen(false)} className="w-8 h-8 rounded-[3px] bg-[#d63638] hover:bg-[#b32d2e] text-white flex items-center justify-center">
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="flex-1 flex overflow-hidden">
            {/* PDF Sidebar - sections list */}
            <div className="w-[260px] bg-white border-r border-[#c3c4c7] overflow-y-auto p-3 hidden lg:block">
              <h4 className="text-[11px] font-bold text-[#646970] uppercase tracking-wide mb-2">{L(language, { fa: 'بخش‌های PDF', en: 'PDF Sections', ru: 'Разделы PDF', tr: 'PDF Bölümleri' })}</h4>
              <div className="space-y-1">
                {filteredPdfSections.map((sec, idx) => (
                  <button
                    key={sec.id}
                    onClick={() => { setPdfPage(idx); }}
                    className={`w-full text-left px-2.5 py-2 rounded-[2px] text-[13px] border ${pdfPage === idx ? 'bg-[#2271b1] text-white border-[#2271b1]' : 'bg-white text-[#3c434a] border-[#dcdcde] hover:bg-[#f6f7f7]'}`}
                  >
                    <div className="font-medium truncate">{L(language, { fa: sec.titleFa, en: sec.titleEn, ru: sec.titleEn, tr: sec.titleEn })}</div>
                    <div className="text-[11px] opacity-70 font-mono">{sec.pages} • {sec.id}</div>
                  </button>
                ))}
              </div>
              <div className="mt-4 p-2 bg-[#f6f7f7] border border-[#dcdcde] rounded-[2px]">
                <p className="text-[11px] text-[#50575e] leading-[1.4]">
                  {L(language, {
                    fa: 'هر آیکون راهنما در پنل، بخش مرتبط همین PDF را در حالت فول‌اسکرین باز می‌کند.',
                    en: 'Each help icon in panel opens relevant section of this PDF in fullscreen.',
                    ru: 'Каждая иконка помощи открывает соответствующий раздел PDF.',
                    tr: 'Paneldeki her yardım simgesi bu PDF’nin ilgili bölümünü tam ekranda açar.',
                  })}
                </p>
              </div>
            </div>

            {/* PDF Content - iframe + navigation */}
            <div className="flex-1 flex flex-col bg-[#50575e] overflow-hidden">
              {/* Navigation bar */}
              <div className="h-[44px] bg-[#f6f7f7] border-b border-[#c3c4c7] flex items-center justify-between px-3 shrink-0">
                <div className="flex items-center gap-2">
                  <button
                    disabled={pdfPage === 0}
                    onClick={() => setPdfPage(p => Math.max(0, p - 1))}
                    className="h-[30px] px-3 bg-white border border-[#8c8f94] rounded-[3px] text-[13px] disabled:opacity-40 flex items-center gap-1"
                  >
                    <ChevronLeft className="w-4 h-4" /> {L(language, { fa: 'قبلی', en: 'Prev', ru: 'Назад', tr: 'Önceki' })}
                  </button>
                  <span className="text-[12px] font-mono bg-white border border-[#dcdcde] px-2 py-1 rounded-[2px]">{pdfPage + 1} / {filteredPdfSections.length}</span>
                  <button
                    disabled={pdfPage === filteredPdfSections.length - 1}
                    onClick={() => setPdfPage(p => Math.min(filteredPdfSections.length - 1, p + 1))}
                    className="h-[30px] px-3 bg-[#2271b1] text-white border border-[#2271b1] rounded-[3px] text-[13px] disabled:opacity-40 flex items-center gap-1"
                  >
                    {L(language, { fa: 'بعدی', en: 'Next', ru: 'Далее', tr: 'Sonraki' })} <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[13px] text-[#1d2327] font-medium hidden sm:inline">
                    {filteredPdfSections[pdfPage] ? L(language, { fa: filteredPdfSections[pdfPage].titleFa, en: filteredPdfSections[pdfPage].titleEn, ru: filteredPdfSections[pdfPage].titleEn, tr: filteredPdfSections[pdfPage].titleEn }) : ''}
                  </span>
                  <span className="text-[11px] font-mono text-[#646970] hidden md:inline">{filteredPdfSections[pdfPage]?.pages}</span>
                </div>
              </div>

              {/* Iframe */}
              <div className="flex-1 bg-[#32373c] p-2 sm:p-4 overflow-auto flex items-center justify-center">
                <div className="w-full max-w-4xl h-full bg-white shadow-[0_5px_15px_rgba(0,0,0,0.3)] rounded-[2px] overflow-hidden flex flex-col">
                  <iframe
                    src={`/bazino-admin-guide.pdf#page=${pdfPage + 1}`}
                    className="flex-1 w-full border-0"
                    title="Bazino Admin Guide PDF"
                  />
                  <div className="h-[36px] bg-[#fcfcfc] border-t border-[#dcdcde] flex items-center justify-between px-3 text-[11px] text-[#646970]">
                    <span className="font-mono">Page {pdfPage + 1} • {filteredPdfSections[pdfPage]?.id} • مدیریت Style Guide</span>
                    <span className="hidden sm:inline">Use Prev/Next or search to navigate • Close X top-right</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
