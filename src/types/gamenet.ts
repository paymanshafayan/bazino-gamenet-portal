export interface UserState {
  username: string;
  email: string;
  phone: string;
  loyaltyPoints: number;
  /** موجودی کردیت بازینو (BC) */
  credits?: number;
  role?: string;
  /** پروفایل (تسک ۱۲) — از /api/auth/me و /api/me/profile */
  displayName?: string;
  avatarUrl?: string;
  bio?: string;
  gamerTag?: string;
  city?: string;
  birthDate?: string;
  phoneVerified?: boolean;
  hasPassword?: boolean;
  createdAt?: string;
}

export interface LoyaltyTx {
  id: string;
  points: number;
  description: string;
  // 'Bonus' هم یک نوع واقعی است (هدیه‌ی خوش‌آمدگویی در server/sampleData.ts) اما
  // در این تایپ نیامده بود، برای همین UI آن را به شاخه‌ی «خرج امتیاز» می‌فرستاد.
  // 'Credits' = حرکت کردیت بازینو (BC)؛ علامت points جهت را مشخص می‌کند (مثبت=شارژ/بازگشت، منفی=خرج)
  type: 'Earned' | 'Redeemed' | 'Bonus' | 'Credits';
  date: string;
  /** صاحب تراکنش. سرور تضمین می‌کند فقط تراکنش‌های خودِ کاربر برگردانده شوند. */
  username?: string;
}

export interface GameSystem {
  id: string;
  name: string;
  nameFa?: string;
  nameEn?: string;
  nameRu?: string;
  nameTr?: string;
  type: 'PC' | 'PS5' | 'Xbox';
  hourlyRate: number; // in TL (Turkish lira)
  isActive: boolean;
  isReserved: boolean;
  /** دستهٔ مخاطب در صفحهٔ Games: 'kids' | 'adults' | '' (خالی = هر دو دسته) */
  audience?: string;
}

export interface Reservation {
  id: string;
  systemName: string;
  startTime: string;
  endTime: string;
  totalPrice: number;
  paidAmount: number;
  discountApplied: number;
  pointsEarned: number;
  date: string;
}

export interface CafeItem {
  id: string;
  name: string;
  category: 'Drinks' | 'Foods' | 'Snacks';
  price: number; // in TL (Turkish lira)
  imageUrl: string;
  inventory: number;
  isAvailable: boolean;
  /** قیمت کردیتی (BC) — ۰/خالی یعنی بدون قیمت کردیتی */
  creditPrice?: number;
}

export interface CafeOrderItem {
  item: CafeItem;
  quantity: number;
}

export interface Accessory {
  id: string;
  name: string;
  description: string;
  price: number; // TL
  imageUrl: string;
  stock: number;
  category: 'Keyboard' | 'Mouse' | 'Headset' | 'Controller';
  /** قیمت کردیتی (BC) — ۰/خالی یعنی بدون قیمت کردیتی */
  creditPrice?: number;
}

export interface Tournament {
  id: string;
  title: string;
  game: string;
  registrationFee: number;
  startDate: string;
  maxTeams: number;
  status: 'Upcoming' | 'Active' | 'Completed';
  registeredTeamsCount: number;
  teams?: Array<{
    name: string;
    leader: string;
    members: string[];
  }>;
  bracket?: {
    round1?: Array<{ id: string; teamA: string; teamB: string; scoreA?: number; scoreB?: number; winner?: string }>;
    semis?: Array<{ id: string; teamA: string; teamB: string; scoreA?: number; scoreB?: number; winner?: string }>;
    finals?: Array<{ id: string; teamA: string; teamB: string; scoreA?: number; scoreB?: number; winner?: string }>;
  };
}

export interface Article {
  id: string;
  title: string;
  content: string;
  category: string;
  imageUrl: string;
  author: string;
  date: string;
  comments: Array<{
    id: string;
    gamerTag: string;
    content: string;
    date: string;
  }>;
}

export interface DiscountCode {
  code: string;
  type: 'Percent' | 'Fixed';
  value: number; // percentage or fixed TL amount
  minOrder: number;
  expiry: string;
  isActive: boolean;
  /** خالی = کد تبلیغاتی عمومی. پر = کد شخصیِ حاصل از تبدیل امتیاز، فقط برای همان کاربر. */
  ownerUsername?: string;
}
