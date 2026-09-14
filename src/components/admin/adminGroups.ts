/**
 * گروه‌بندی جدید پنل مدیریت بازینو
 * هدف: قابل فهم برای صاحب گیم‌نت غیرفنی، همه چیز در دسترس، بدون پراکندگی
 */
import type { AdminSection } from '../../utils/routes';

export type AdminGroupId = 'overview' | 'venue' | 'customers' | 'content' | 'site' | 'advanced';

export interface AdminGroup {
  id: AdminGroupId;
  fa: string;
  en: string;
  ru: string;
  tr: string;
  descFa: string;
  descEn: string;
  icon: string; // lucide icon name
  color: string; // tailwind color class prefix
  sections: AdminSection[];
}

export const ADMIN_GROUPS: AdminGroup[] = [
  {
    id: 'overview',
    fa: 'نمای کلی',
    en: 'Overview',
    ru: 'Обзор',
    tr: 'Genel Bakış',
    descFa: 'آمار زنده، درآمد و وضعیت سالن در یک نگاه',
    descEn: 'Live stats, revenue and venue status at a glance',
    icon: 'LayoutDashboard',
    color: 'emerald',
    sections: ['dashboard'],
  },
  {
    id: 'venue',
    fa: 'سالن و بازی',
    en: 'Venue & Play',
    ru: 'Зал и игра',
    tr: 'Salon ve Oyun',
    descFa: 'هرچیزی که داخل سالن اتفاق می‌افتد: سیستم‌ها، کافه، فروشگاه، مسابقات',
    descEn: 'Everything happening inside: systems, cafe, shop, tournaments',
    icon: 'Gamepad2',
    color: 'cyan',
    sections: ['systems', 'tournaments', 'tournamentOps', 'cafe', 'shop'],
  },
  {
    id: 'customers',
    fa: 'مشتریان و مالی',
    en: 'Customers & Finance',
    ru: 'Клиенты и финансы',
    tr: 'Müşteriler ve Finans',
    descFa: 'پول، مشتری، پیام و پشتیبانی — همه‌چیز درباره آدم‌ها',
    descEn: 'Money, people, messages and support',
    icon: 'Users',
    color: 'amber',
    sections: ['wallet', 'promotions', 'affiliates', 'messaging', 'messages', 'chat', 'tickets'],
  },
  {
    id: 'content',
    fa: 'محتوا و بازاریابی',
    en: 'Content & Marketing',
    ru: 'Контент и маркетинг',
    tr: 'İçerik ve Pazarlama',
    descFa: 'چیزی که مشتری بیرون سالن می‌بیند: پست، بلاگ، اسلایدر',
    descEn: 'What customer sees outside: posts, blog, sliders',
    icon: 'Megaphone',
    color: 'violet',
    sections: ['content', 'blog', 'appSlider'],
  },
  {
    id: 'site',
    fa: 'سایت و ظاهر',
    en: 'Site & Appearance',
    ru: 'Сайт и внешний вид',
    tr: 'Site ve Görünüm',
    descFa: 'شکل و شمایل سایت و اپ: تم، اطلاعات کلوپ، دانلود اپ',
    descEn: 'Look and feel of site and app',
    icon: 'Palette',
    color: 'fuchsia',
    sections: ['themes', 'customization', 'mobileAppDownload', 'presentation'],
  },
  {
    id: 'advanced',
    fa: 'هوش و تنظیمات فنی',
    en: 'Intelligence & Tech',
    ru: 'ИИ и техника',
    tr: 'Zeka ve Teknik',
    descFa: 'جارویس، کلیدهای API، لاگ‌ها و تنظیمات پیشرفته — مرکز کلیدها',
    descEn: 'Jarvis, API keys, logs and advanced settings — Keys Center',
    icon: 'Brain',
    color: 'blue',
    sections: ['jarvis', 'apiKeys', 'dbLogs', 'migrations'],
  },
];

export function groupForSection(section: AdminSection): AdminGroup | undefined {
  return ADMIN_GROUPS.find(g => g.sections.includes(section));
}

export const SECTION_ICONS: Record<AdminSection, string> = {
  dashboard: 'BarChart3',
  jarvis: 'Sparkles',
  systems: 'Monitor',
  cafe: 'Coffee',
  shop: 'ShoppingBag',
  tournaments: 'Trophy',
  tournamentOps: 'Swords',
  blog: 'Newspaper',
  content: 'Send',
  promotions: 'Ticket',
  chat: 'MessageSquare',
  messages: 'Mail',
  migrations: 'Database',
  themes: 'Palette',
  appSlider: 'Images',
  mobileAppDownload: 'Smartphone',
  customization: 'Sliders',
  dbLogs: 'FileClock',
  apiKeys: 'KeyRound',
  presentation: 'Presentation',
  tickets: 'LifeBuoy',
  wallet: 'Wallet',
  affiliates: 'Handshake',
  messaging: 'MessageCircleMore',
};

export const SECTION_COLORS: Record<AdminSection, string> = {
  dashboard: 'emerald',
  jarvis: 'blue',
  systems: 'cyan',
  cafe: 'amber',
  shop: 'orange',
  tournaments: 'yellow',
  tournamentOps: 'yellow',
  blog: 'violet',
  content: 'violet',
  promotions: 'pink',
  chat: 'sky',
  messages: 'blue',
  migrations: 'zinc',
  themes: 'fuchsia',
  appSlider: 'amber',
  mobileAppDownload: 'cyan',
  customization: 'emerald',
  dbLogs: 'emerald',
  apiKeys: 'blue',
  presentation: 'indigo',
  tickets: 'rose',
  wallet: 'green',
  affiliates: 'amber',
  messaging: 'violet',
};
