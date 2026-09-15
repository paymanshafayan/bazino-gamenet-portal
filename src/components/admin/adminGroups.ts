/**
 * گروه‌بندی پنل مدیریت - کوتاه و واضح
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
  icon: string;
  color: string;
  sections: AdminSection[];
}

export const ADMIN_GROUPS: AdminGroup[] = [
  {
    id: 'overview',
    fa: 'داشبورد',
    en: 'Dashboard',
    ru: 'Дашборд',
    tr: 'Panel',
    descFa: 'آمار و وضعیت سالن',
    descEn: 'Stats and venue status',
    icon: 'LayoutDashboard',
    color: 'emerald',
    sections: ['dashboard'],
  },
  {
    id: 'venue',
    fa: 'سالن',
    en: 'Venue',
    ru: 'Зал',
    tr: 'Salon',
    descFa: 'سیستم‌ها، کافه، فروشگاه، مسابقات',
    descEn: 'Systems, cafe, shop, tournaments',
    icon: 'Gamepad2',
    color: 'cyan',
    sections: ['systems', 'tournaments', 'tournamentOps', 'cafe', 'shop'],
  },
  {
    id: 'customers',
    fa: 'مشتریان',
    en: 'Customers',
    ru: 'Клиенты',
    tr: 'Müşteriler',
    descFa: 'کیف پول، پیام، چت، تیکت',
    descEn: 'Wallet, messages, chat, tickets',
    icon: 'Users',
    color: 'amber',
    sections: ['wallet', 'promotions', 'affiliates', 'messaging', 'messages', 'chat', 'tickets'],
  },
  {
    id: 'content',
    fa: 'محتوا',
    en: 'Content',
    ru: 'Контент',
    tr: 'İçerik',
    descFa: 'محتوا، وبلاگ، اسلایدر',
    descEn: 'Content, blog, slider',
    icon: 'Megaphone',
    color: 'violet',
    sections: ['content', 'blog', 'appSlider'],
  },
  {
    id: 'site',
    fa: 'سایت',
    en: 'Site',
    ru: 'Сайт',
    tr: 'Site',
    descFa: 'قالب، تنظیمات، اپ',
    descEn: 'Themes, settings, app',
    icon: 'Palette',
    color: 'fuchsia',
    sections: ['themes', 'customization', 'mobileAppDownload', 'presentation'],
  },
  {
    id: 'advanced',
    fa: 'فنی',
    en: 'Tech',
    ru: 'Тех',
    tr: 'Teknik',
    descFa: 'جارویس، کلیدها، لاگ‌ها',
    descEn: 'Jarvis, keys, logs',
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
