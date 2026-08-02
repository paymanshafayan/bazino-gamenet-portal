import { Station, BuffetItem, Customer, TariffRate, ShopExpense, Operator, AppTheme, SoundAlarmConfig } from '../types';

export const INITIAL_TARIFFS: TariffRate[] = [
  { id: 't1', name: 'PS5 VIP (تک نفره / دو نفره)', hourlyRate: 180, specialScheduleActive: true, startHour: 22, endHour: 4, specialRate: 220 },
  { id: 't2', name: 'PS5 معمولی (چهار نفره)', hourlyRate: 220, specialScheduleActive: false },
  { id: 't3', name: 'PC Gaming High-End (Pro)', hourlyRate: 140, specialScheduleActive: true, startHour: 18, endHour: 2, specialRate: 170 },
  { id: 't4', name: 'VR Simulator (واقعیت مجازی)', hourlyRate: 250, specialScheduleActive: false },
  { id: 't5', name: 'بیلیارد و اسنوکر', hourlyRate: 200, specialScheduleActive: false },
];

export const INITIAL_STATIONS: Station[] = [
  {
    id: 'st-1',
    name: 'ایستگاه 01 - PS5 VIP 👑',
    type: 'PS5_VIP',
    icon: 'Gamepad2',
    status: 'PLAYING',
    currentTariffId: 't1',
    totalServiceHoursToday: 6.5,
    activeSession: {
      sessionId: 'sess-101',
      stationId: 'st-1',
      customerName: 'آرش علوی',
      customerId: 'cust-1',
      startTime: Date.now() - (45 * 60 * 1000), // played 45 mins ago
      durationMinutes: 60, // 1 hour set
      paidAmountTarget: 180,
      paymentType: 'PRE_PAY',
      tariffId: 't1',
      currentHourlyRate: 180,
      elapsedSeconds: 45 * 60,
      pausedSeconds: 0,
      isPaused: false,
      services: [
        { id: 'srv-1', name: 'ردبول انرژی‌زا', price: 65, qty: 2 },
        { id: 'srv-2', name: 'دسته اضافه PS5', price: 30, qty: 1 }
      ]
    }
  },
  {
    id: 'st-2',
    name: 'ایستگاه 02 - PS5 VIP 🔥',
    type: 'PS5_VIP',
    icon: 'Gamepad2',
    status: 'WARNING',
    currentTariffId: 't1',
    totalServiceHoursToday: 8.0,
    activeSession: {
      sessionId: 'sess-102',
      stationId: 'st-2',
      customerName: 'کامران امیری',
      customerId: 'cust-2',
      startTime: Date.now() - (56 * 60 * 1000), // 4 mins left of 60 mins
      durationMinutes: 60,
      paidAmountTarget: 180,
      paymentType: 'POST_PAY',
      tariffId: 't1',
      currentHourlyRate: 180,
      elapsedSeconds: 56 * 60,
      pausedSeconds: 0,
      isPaused: false,
      services: []
    }
  },
  {
    id: 'st-3',
    name: 'ایستگاه 03 - PS5 Standard',
    type: 'PS5_REGULAR',
    icon: 'Gamepad',
    status: 'IDLE',
    currentTariffId: 't2',
    totalServiceHoursToday: 4.2
  },
  {
    id: 'st-4',
    name: 'ایستگاه 04 - PS5 Standard',
    type: 'PS5_REGULAR',
    icon: 'Gamepad',
    status: 'FINISHED',
    currentTariffId: 't2',
    totalServiceHoursToday: 7.1,
    activeSession: {
      sessionId: 'sess-104',
      stationId: 'st-4',
      customerName: 'سهراب احمدی',
      customerId: 'cust-3',
      startTime: Date.now() - (122 * 60 * 1000),
      durationMinutes: 120, // Time ended 2 mins ago
      paidAmountTarget: 440,
      paymentType: 'POST_PAY',
      tariffId: 't2',
      currentHourlyRate: 220,
      elapsedSeconds: 120 * 60,
      pausedSeconds: 0,
      isPaused: false,
      services: [
        { id: 'srv-3', name: 'چیپس بزرگ + دیپ پنیر', price: 45, qty: 1 }
      ]
    }
  },
  {
    id: 'st-5',
    name: 'ایستگاه PC 01 - RTX 4090 ⚡',
    type: 'PC_GAMING',
    icon: 'Monitor',
    status: 'PLAYING',
    currentTariffId: 't3',
    totalServiceHoursToday: 11.0,
    activeSession: {
      sessionId: 'sess-105',
      stationId: 'st-5',
      customerName: 'مشتری آزاد (آزاد)',
      startTime: Date.now() - (90 * 60 * 1000),
      paymentType: 'POST_PAY', // Open-ended
      tariffId: 't3',
      currentHourlyRate: 140,
      elapsedSeconds: 90 * 60,
      pausedSeconds: 0,
      isPaused: false,
      services: [
        { id: 'srv-4', name: 'اسپرسو دوبل', price: 40, qty: 2 }
      ]
    }
  },
  {
    id: 'st-6',
    name: 'ایستگاه PC 02 - RTX 4090 ⚡',
    type: 'PC_GAMING',
    icon: 'Monitor',
    status: 'IDLE',
    currentTariffId: 't3',
    totalServiceHoursToday: 9.5
  },
  {
    id: 'st-7',
    name: 'ایستگاه VR 01 - Oculus Meta 3 🥽',
    type: 'VR',
    icon: 'Glasses',
    status: 'IDLE',
    currentTariffId: 't4',
    totalServiceHoursToday: 3.0
  },
  {
    id: 'st-8',
    name: 'میز بیلیارد 01 - 8 Ball 🎱',
    type: 'BILLIARDS',
    icon: 'CircleDot',
    status: 'PAUSED',
    currentTariffId: 't5',
    totalServiceHoursToday: 5.8,
    activeSession: {
      sessionId: 'sess-108',
      stationId: 'st-8',
      customerName: 'فریدون مرادی',
      customerId: 'cust-4',
      startTime: Date.now() - (75 * 60 * 1000),
      durationMinutes: 120,
      paidAmountTarget: 400,
      paymentType: 'POST_PAY',
      tariffId: 't5',
      currentHourlyRate: 200,
      elapsedSeconds: 75 * 60,
      pausedSeconds: 300,
      isPaused: true,
      services: [
        { id: 'srv-5', name: 'پیتزا پپرونی بوفه', price: 140, qty: 1 }
      ]
    }
  }
];

export const INITIAL_BUFFET_ITEMS: BuffetItem[] = [
  { id: 'buf-1', name: 'ردبول 250ml', category: 'نوشیدنی', buyPrice: 35, sellPrice: 65, stockQuantity: 42, soldQuantity: 128, unit: 'عدد' },
  { id: 'buf-2', name: 'کولا قوطی', category: 'نوشیدنی', buyPrice: 15, sellPrice: 30, stockQuantity: 85, soldQuantity: 310, unit: 'عدد' },
  { id: 'buf-3', name: 'اسپرسو دوبل', category: 'نوشیدنی گرم', buyPrice: 12, sellPrice: 40, stockQuantity: 200, soldQuantity: 180, unit: 'فنجان' },
  { id: 'buf-4', name: 'چیپس باتاتو بزرگ', category: 'تنقلات', buyPrice: 20, sellPrice: 45, stockQuantity: 30, soldQuantity: 95, unit: 'بسته' },
  { id: 'buf-5', name: 'شکلات کیت‌کت', category: 'تنقلات', buyPrice: 18, sellPrice: 35, stockQuantity: 50, soldQuantity: 140, unit: 'عدد' },
  { id: 'buf-6', name: 'اسنک کلاپ مرغ و قارچ', category: 'غذای گرم', buyPrice: 45, sellPrice: 95, stockQuantity: 18, soldQuantity: 64, unit: 'پرس' },
  { id: 'buf-7', name: 'پیتزا مخصوص BAZINO', category: 'غذای گرم', buyPrice: 70, sellPrice: 140, stockQuantity: 12, soldQuantity: 48, unit: 'عدد' },
  { id: 'buf-8', name: 'آب معدنی', category: 'نوشیدنی', buyPrice: 5, sellPrice: 15, stockQuantity: 120, soldQuantity: 420, unit: 'عدد' },
];

export const INITIAL_CUSTOMERS: Customer[] = [
  {
    id: 'cust-1',
    name: 'آرش علوی',
    phone: '+90 533 812 3456',
    walletBalance: 450, // 450 TL credit
    totalHoursPlayed: 62,
    rank: 'الماس',
    birthDate: '1998-07-24', // Today is birthday in metadata!
    isBirthdayThisMonth: true,
    isBirthdayToday: true,
    notes: 'مشتری قدیمی - علاقه مند به فیفا ۲۴',
    registeredAt: '2023-11-10'
  },
  {
    id: 'cust-2',
    name: 'کامران امیری',
    phone: '+90 548 987 6543',
    walletBalance: -120, // 120 TL debt
    totalHoursPlayed: 34,
    rank: 'طلایی',
    birthDate: '2001-07-15',
    isBirthdayThisMonth: true,
    isBirthdayToday: false,
    notes: 'تسویه بدهی با کارتخوان',
    registeredAt: '2024-01-05'
  },
  {
    id: 'cust-3',
    name: 'سهراب احمدی',
    phone: '+90 533 444 1122',
    walletBalance: 0,
    totalHoursPlayed: 18,
    rank: 'نقره',
    birthDate: '1995-10-08',
    registeredAt: '2024-03-12'
  },
  {
    id: 'cust-4',
    name: 'فریدون مرادی',
    phone: '+90 542 111 8899',
    walletBalance: 1100,
    totalHoursPlayed: 125,
    rank: 'الماس',
    birthDate: '1992-07-30',
    isBirthdayThisMonth: true,
    notes: 'بازیکن حرفه‌ای بیلیارد',
    registeredAt: '2023-08-01'
  }
];

export const INITIAL_EXPENSES: ShopExpense[] = [
  { id: 'exp-1', title: 'قبوض برق و اینترنت گیم‌نت', category: 'قبوض', amount: 3200, date: '2026-07-01', operatorName: 'مدیر اصلی' },
  { id: 'exp-2', title: 'خرید دسته‌های جدید PS5', category: 'خرید تجهیزات', amount: 2800, date: '2026-07-10', operatorName: 'مدیر اصلی' },
  { id: 'exp-3', title: 'شارژ موجودی بوفه (ردبول و تنقلات)', category: 'بوفه', amount: 4500, date: '2026-07-15', operatorName: 'اپراتور شیفت' },
  { id: 'exp-4', title: 'حقوق اپراتور شیفت شب', category: 'حقوق کارمندان', amount: 6000, date: '2026-07-20', operatorName: 'مدیر اصلی' },
];

export const INITIAL_OPERATORS: Operator[] = [
  {
    id: 'op-1',
    name: 'مدیر کل (فرتاش)',
    username: 'admin',
    role: 'ADMIN',
    active: true,
    permissions: {
      canAccessReports: true,
      canManagePricesAndTariffs: true,
      canManageExpenses: true,
      canManageBuffetStock: true,
      canManageOperators: true,
      canGiveDiscounts: true,
    }
  },
  {
    id: 'op-2',
    name: 'اپراتور شیفت روز (سینا)',
    username: 'op_day',
    role: 'OPERATOR',
    active: true,
    permissions: {
      canAccessReports: false,
      canManagePricesAndTariffs: false,
      canManageExpenses: false,
      canManageBuffetStock: true,
      canManageOperators: false,
      canGiveDiscounts: true,
    }
  },
  {
    id: 'op-3',
    name: 'اپراتور شیفت شب (رضا)',
    username: 'op_night',
    role: 'OPERATOR',
    active: true,
    permissions: {
      canAccessReports: false,
      canManagePricesAndTariffs: false,
      canManageExpenses: false,
      canManageBuffetStock: true,
      canManageOperators: false,
      canGiveDiscounts: false,
    }
  }
];

// 20 Themes matching user requirements
export const THEMES_LIST: AppTheme[] = [
  { id: 'theme-gold-crown', name: '👑 BAZINO Gold Crown (پیش‌فرض)', primaryColor: '#EAB308', accentColor: '#CA8A04', bgColor: '#09090b', cardBg: '#18181b', previewGradient: 'from-amber-500 to-yellow-700' },
  { id: 'theme-cyber-neon', name: '⚡ نئون سایبرپانک', primaryColor: '#06B6D4', accentColor: '#3B82F6', bgColor: '#030712', cardBg: '#111827', previewGradient: 'from-cyan-500 to-blue-600' },
  { id: 'theme-emerald-vip', name: '💎 زمردی لاکچری VIP', primaryColor: '#10B981', accentColor: '#059669', bgColor: '#022C22', cardBg: '#064E3B', previewGradient: 'from-emerald-500 to-teal-700' },
  { id: 'theme-midnight-purple', name: '🔮 بنفش گیمینگ', primaryColor: '#A855F7', accentColor: '#7C3AED', bgColor: '#0F0728', cardBg: '#1E1035', previewGradient: 'from-purple-500 to-indigo-700' },
  { id: 'theme-crimson-red', name: '🔥 قرمز هیجانی (Ares)', primaryColor: '#EF4444', accentColor: '#DC2626', bgColor: '#180505', cardBg: '#2A0A0A', previewGradient: 'from-red-500 to-rose-700' },
  { id: 'theme-sunset-orange', name: '🌅 نارنجی غروب', primaryColor: '#F97316', accentColor: '#EA580C', bgColor: '#0F0904', cardBg: '#1F1207', previewGradient: 'from-orange-500 to-amber-700' },
  { id: 'theme-titanium-silver', name: '🛡️ نقره‌ای متالیک BAZINO', primaryColor: '#E4E4E7', accentColor: '#A1A1AA', bgColor: '#09090B', cardBg: '#27272A', previewGradient: 'from-zinc-300 to-zinc-600' },
  { id: 'theme-rgb-matrix', name: '🟩 ماتریکس و هک', primaryColor: '#22C55E', accentColor: '#16A34A', bgColor: '#021206', cardBg: '#052E16', previewGradient: 'from-green-500 to-emerald-800' },
  { id: 'theme-deep-blue', name: '🌊 آبی عمیق آتلانتیس', primaryColor: '#2563EB', accentColor: '#1D4ED8', bgColor: '#030B1E', cardBg: '#0A192F', previewGradient: 'from-blue-600 to-cyan-800' },
  { id: 'theme-pink-cyber', name: '💖 صورتی نئونی چری', primaryColor: '#EC4899', accentColor: '#DB2777', bgColor: '#18030E', cardBg: '#2D061A', previewGradient: 'from-pink-500 to-rose-700' },
  { id: 'theme-dark-obsidian', name: '🖤 آبسیدیان تاریک مطلق', primaryColor: '#D4D4D8', accentColor: '#71717A', bgColor: '#000000', cardBg: '#121212', previewGradient: 'from-zinc-700 to-black' },
  { id: 'theme-bronze-warrior', name: '🛡️ برنز و مسی اسپارتان', primaryColor: '#B45309', accentColor: '#78350F', bgColor: '#120A03', cardBg: '#241407', previewGradient: 'from-amber-700 to-yellow-900' },
  { id: 'theme-royal-gold', name: '🔱 طلایی سلطنتی ۲۴ عیار', primaryColor: '#FACC15', accentColor: '#EAB308', bgColor: '#131102', cardBg: '#262205', previewGradient: 'from-yellow-400 to-amber-600' },
  { id: 'theme-toxic-green', name: '☣️ سبز سمی و گیمینگ', primaryColor: '#84CC16', accentColor: '#65A30D', bgColor: '#0B1302', cardBg: '#162605', previewGradient: 'from-lime-500 to-green-700' },
  { id: 'theme-ice-blue', name: '❄️ آبی یخی گلیشر', primaryColor: '#38BDF8', accentColor: '#0284C7', bgColor: '#03141F', cardBg: '#07283E', previewGradient: 'from-sky-400 to-cyan-700' },
  { id: 'theme-electric-violet', name: '⚡ والکیریا بنفش نئون', primaryColor: '#C084FC', accentColor: '#9333EA', bgColor: '#11031F', cardBg: '#23073E', previewGradient: 'from-fuchsia-500 to-purple-800' },
  { id: 'theme-coffee-wood', name: '☕ چوب و کافه رز', primaryColor: '#D97706', accentColor: '#B45309', bgColor: '#1C120B', cardBg: '#2E1E12', previewGradient: 'from-amber-600 to-amber-900' },
  { id: 'theme-cyber-yellow', name: '🟡 زرد سایبر punk 2077', primaryColor: '#FDE047', accentColor: '#EAB308', bgColor: '#131201', cardBg: '#262402', previewGradient: 'from-yellow-300 to-yellow-600' },
  { id: 'theme-blood-moon', name: '🌕 ماه خونی دراکولا', primaryColor: '#F43F5E', accentColor: '#E11D48', bgColor: '#1A0308', cardBg: '#32060F', previewGradient: 'from-rose-500 to-red-800' },
  { id: 'theme-steel-blue', name: '⚙️ استیل و فولاد گیمینگ', primaryColor: '#64748B', accentColor: '#475569', bgColor: '#0F172A', cardBg: '#1E293B', previewGradient: 'from-slate-400 to-slate-700' },
];

export const DEFAULT_SOUND_CONFIG: SoundAlarmConfig = {
  enabled: true,
  soundType: 'arcade_bell',
  volume: 0.85,
  repeatIntervalSeconds: 15,
  play5MinWarning: true,
};
