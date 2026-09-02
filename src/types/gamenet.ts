export interface UserState {
  username: string;
  email: string;
  phone: string;
  loyaltyPoints: number;
  role?: string;
}

export interface LoyaltyTx {
  id: string;
  points: number;
  description: string;
  // 'Bonus' هم یک نوع واقعی است (هدیه‌ی خوش‌آمدگویی در server/sampleData.ts) اما
  // در این تایپ نیامده بود، برای همین UI آن را به شاخه‌ی «خرج امتیاز» می‌فرستاد.
  type: 'Earned' | 'Redeemed' | 'Bonus';
  date: string;
}

export interface GameSystem {
  id: string;
  name: string;
  type: 'PC' | 'PS5' | 'Xbox';
  hourlyRate: number; // in Tomans
  isActive: boolean;
  isReserved: boolean;
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
  price: number; // in Tomans
  imageUrl: string;
  inventory: number;
  isAvailable: boolean;
}

export interface CafeOrderItem {
  item: CafeItem;
  quantity: number;
}

export interface Accessory {
  id: string;
  name: string;
  description: string;
  price: number; // Tomans
  imageUrl: string;
  stock: number;
  category: 'Keyboard' | 'Mouse' | 'Headset' | 'Controller';
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
  value: number; // percentage or fixed Toman amount
  minOrder: number;
  expiry: string;
  isActive: boolean;
}
