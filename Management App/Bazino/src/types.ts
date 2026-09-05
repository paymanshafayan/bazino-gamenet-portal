export type CurrencyCode = 'TRY' | 'GBP' | 'EUR' | 'USD';

export type StationType = 'PS5_VIP' | 'PS5_REGULAR' | 'PS4' | 'PC_GAMING' | 'VR' | 'BILLIARDS';

export type StationStatus = 'IDLE' | 'PLAYING' | 'PAUSED' | 'WARNING' | 'FINISHED';

export type PaymentType = 'PRE_PAY' | 'POST_PAY';

export type PaymentMethod = 'CASH' | 'POS' | 'WALLET' | 'SPLIT' | 'DEBT';

export interface TariffRate {
  id: string;
  name: string;
  hourlyRate: number; // in local currency (e.g., TRY ₺)
  specialScheduleActive?: boolean;
  startHour?: number; // 0-23
  endHour?: number; // 0-23
  specialRate?: number;
}

export interface ServiceItem {
  id: string;
  name: string;
  price: number;
  qty: number;
}

export interface StationSession {
  sessionId: string;
  stationId: string;
  customerId?: string;
  customerName?: string;
  startTime: number; // timestamp ms
  durationMinutes?: number; // if set by duration or amount
  paidAmountTarget?: number; // if user paid for specific amount
  paymentType: PaymentType;
  tariffId: string;
  currentHourlyRate: number;
  elapsedSeconds: number;
  pausedSeconds: number;
  isPaused: boolean;
  pausedAt?: number;
  services: ServiceItem[];
  notes?: string;
  /** Money already accrued at earlier rate(s), before the most recent tariff change (0 if the rate was never changed mid-session). */
  costAccruedBeforeRateChange?: number;
  /** elapsedSeconds value at the moment the current rate took effect — used together with costAccruedBeforeRateChange to bill each rate only for its own time segment. */
  rateEffectiveFromSeconds?: number;
  /** Timestamp (ms) of the last time the alarm sound played for this session (set on first FINISHED trigger, then refreshed every soundConfig.repeatIntervalSeconds while still FINISHED and not checked out). */
  lastAlarmAt?: number;
  serverDue?: number;
  serverPrepaid?: number;
  endsAt?: string;
}

export interface Station {
  id: string;
  name: string;
  type: StationType;
  icon: string;
  status: StationStatus;
  currentTariffId: string;
  activeSession?: StationSession;
  totalServiceHoursToday: number;
}

export interface BuffetItem {
  id: string;
  name: string;
  category: string;
  buyPrice: number; // Cost price
  sellPrice: number; // Sales price
  stockQuantity: number;
  soldQuantity: number;
  unit: string;
}

export interface CustomerRank {
  name: 'عادی' | 'برنز' | 'نقره' | 'طلایی' | 'الماس';
  minHours: number;
  discountPercentage: number;
  badgeColor: string;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  walletBalance: number; // Positive = credit, Negative = debt
  totalHoursPlayed: number;
  rank: 'عادی' | 'برنز' | 'نقره' | 'طلایی' | 'الماس';
  birthDate: string; // YYYY-MM-DD
  isBirthdayThisMonth?: boolean;
  isBirthdayToday?: boolean;
  notes?: string;
  registeredAt: string;
}

export interface WalletTransaction {
  id: string;
  customerId: string;
  customerName: string;
  amount: number; // positive for charge, negative for usage/debt
  type: 'CHARGE' | 'PAYMENT' | 'DEBT_SETTLEMENT' | 'BONUS_DISCOUNT' | 'CASHOUT';
  description: string;
  date: string; // ISO string
  operatorName: string;
}

export interface ShopExpense {
  id: string;
  title: string;
  category: 'قبوض' | 'اجاره' | 'خرید تجهیزات' | 'حقوق کارمندان' | 'بوفه' | 'متفرقه';
  amount: number;
  date: string; // YYYY-MM-DD
  operatorName: string;
  notes?: string;
}

export interface Invoice {
  id: string;
  stationId: string;
  stationName: string;
  customerId?: string;
  customerName: string;
  startTime: string;
  endTime: string;
  playDurationMinutes: number;
  gameCost: number;
  buffetCost: number;
  extraServicesCost: number;
  discountAmount: number;
  totalAmount: number;
  paymentMethod: PaymentMethod;
  cashPaid: number;
  posPaid: number;
  walletPaid: number;
  roundingAmount: number; // positive or negative
  operatorName: string;
  date: string; // YYYY-MM-DD
  timestamp: number;
}

export type OperatorRole = 'ADMIN' | 'MANAGER' | 'OPERATOR';

export interface OperatorPermissions {
  canAccessReports: boolean;
  canManagePricesAndTariffs: boolean;
  canManageExpenses: boolean;
  canManageBuffetStock: boolean;
  canManageOperators: boolean;
  canGiveDiscounts: boolean;
}

export interface Operator {
  id: string;
  name: string;
  username: string;
  role: OperatorRole;
  permissions: OperatorPermissions;
  active: boolean;
}

export interface AppTheme {
  id: string;
  name: string;
  primaryColor: string;
  accentColor: string;
  bgColor: string;
  cardBg: string;
  previewGradient: string;
}

export interface SoundAlarmConfig {
  enabled: boolean;
  soundType: 'arcade_bell' | 'siren' | 'gentle_chime' | 'digital_beep' | 'radar_ping';
  volume: number; // 0 to 1
  repeatIntervalSeconds: number; // repeat alarm every X seconds until dismissed
  play5MinWarning: boolean;
}

export interface BackupSettings {
  autoDailyBackup: boolean;
  lastBackupTime?: string;
}

export interface WebSyncStatus {
  isConnected: boolean;
  lastSyncTime?: string;
  pendingTransactionsCount: number;
  /** تسک ۱۳: تعداد تراکنش‌های کیف پول که هنوز به سرور سایت ارسال نشده‌اند (صف آفلاین) */
  walletQueueCount?: number;
  /**
   * Base URL of the ONLINE website's server (e.g. "https://bazino.pro"), used when
   * this Management App runs standalone (e.g. the desktop build) with its own local
   * server+database and needs to sync reservations/status with the real website over the
   * internet. Leave empty to use the co-located/relative-path behavior (when Management
   * App is served from the exact same server as the website, e.g. plain web-app mode).
   */
  webServerUrl: string;
  /** Shared secret sent as `Authorization: Bearer <apiKey>` on every sync call. */
  apiKey: string;
}
