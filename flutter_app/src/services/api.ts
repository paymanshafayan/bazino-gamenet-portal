import { 
  GameSystem, 
  CafeItem, 
  Accessory, 
  Tournament, 
  Article, 
  DiscountCode, 
  UserState, 
  LoyaltyTx,
  Reservation
} from '../types/gamenet';

/**
 * سرویس ارتباط با ای‌پی‌آی‌های بک‌اند (API Service)
 */
export const ApiService = {
  // User & Loyalty Points
  async getUser(): Promise<UserState> {
    const response = await fetch('/api/user');
    if (!response.ok) throw new Error('خطا در دریافت اطلاعات کاربر');
    return response.json();
  },

  async updateUserPoints(points: number, description: string): Promise<{ success: boolean; user: UserState; transactions: LoyaltyTx[] }> {
    const response = await fetch('/api/user/points', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ points, description }),
    });
    if (!response.ok) throw new Error('خطا در بروزرسانی امتیازات کاربر');
    return response.json();
  },

  async getTransactions(): Promise<LoyaltyTx[]> {
    const response = await fetch('/api/transactions');
    if (!response.ok) throw new Error('خطا در دریافت تراکنش‌ها');
    return response.json();
  },

  async getCoupons(): Promise<DiscountCode[]> {
    const response = await fetch('/api/coupons');
    if (!response.ok) throw new Error('خطا در دریافت کدهای تخفیف');
    return response.json();
  },

  async redeemLoyaltyPoints(points: number, couponValue: number, code: string): Promise<{ success: boolean; user: UserState; transactions: LoyaltyTx[]; activeCoupons: DiscountCode[] }> {
    const response = await fetch('/api/loyalty/redeem', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ points, couponValue, code }),
    });
    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error || 'خطا در تبدیل امتیازات');
    }
    return response.json();
  },

  // Game Systems & Reservations
  async getSystems(): Promise<GameSystem[]> {
    const response = await fetch('/api/systems');
    if (!response.ok) throw new Error('خطا در دریافت لیست سیستم‌ها');
    return response.json();
  },

  async reserveSystem(payload: {
    systemId: string;
    startTime: string;
    endTime: string;
    totalPrice: number;
    pointsEarned: number;
    date: string;
  }): Promise<{ success: boolean; systems: GameSystem[]; user: UserState; transactions: LoyaltyTx[]; reservationLogs: Reservation[] }> {
    const response = await fetch('/api/systems/reserve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!response.ok) throw new Error('خطا در ثبت رزرو سیستم');
    return response.json();
  },

  async getReservations(): Promise<Reservation[]> {
    const response = await fetch('/api/reservations');
    if (!response.ok) throw new Error('خطا در دریافت تاریخچه رزروها');
    return response.json();
  },

  async checkInReservation(id: string): Promise<{ success: boolean; reservation: Reservation; reservationLogs: Reservation[] }> {
    const response = await fetch(`/api/reservations/${id}/checkin`, {
      method: 'POST',
    });
    if (!response.ok) throw new Error('خطا در فعال‌سازی رزرو');
    return response.json();
  },

  // Cafe/Buffet Service
  async getCafeItems(): Promise<CafeItem[]> {
    const response = await fetch('/api/cafe');
    if (!response.ok) throw new Error('خطا در دریافت منوی کافه');
    return response.json();
  },

  async orderCafe(payload: {
    items: Array<{ item: CafeItem; quantity: number }>;
    totalPrice: number;
    pointsEarned: number;
    discountApplied: number;
    couponCode?: string;
    tableNumber: string;
  }): Promise<{ success: boolean; cafeItems: CafeItem[]; user: UserState; transactions: LoyaltyTx[]; order: any }> {
    const response = await fetch('/api/cafe/order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!response.ok) throw new Error('خطا در ثبت سفارش کافه');
    return response.json();
  },

  // Accessories Shop Service
  async getAccessories(): Promise<Accessory[]> {
    const response = await fetch('/api/accessories');
    if (!response.ok) throw new Error('خطا در دریافت لیست فروشگاه');
    return response.json();
  },

  async orderAccessories(payload: {
    cart: Array<{ item: Accessory; quantity: number }>;
    totalPrice: number;
    pointsEarned: number;
    discountApplied: number;
    couponCode?: string;
  }): Promise<{ success: boolean; accessories: Accessory[]; user: UserState; transactions: LoyaltyTx[]; order: any }> {
    const response = await fetch('/api/accessories/order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!response.ok) throw new Error('خطا در ثبت خرید فروشگاه');
    return response.json();
  },

  // Tournaments Service
  async getTournaments(): Promise<Tournament[]> {
    const response = await fetch('/api/tournaments');
    if (!response.ok) throw new Error('خطا در دریافت لیست تورنمنت‌ها');
    return response.json();
  },

  async registerTournament(tournamentId: string, team: {
    name: string;
    leader: string;
    members: string[];
  }): Promise<{ success: boolean; tournaments: Tournament[] }> {
    const response = await fetch('/api/tournaments/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tournamentId, team }),
    });
    if (!response.ok) throw new Error('خطا در ثبت نام در تورنمنت');
    return response.json();
  },

  // Blog News Articles & Comments
  async getArticles(): Promise<Article[]> {
    const response = await fetch('/api/articles');
    if (!response.ok) throw new Error('خطا در دریافت مقالات اخبار');
    return response.json();
  },

  async addComment(articleId: string, gamerTag: string, content: string): Promise<{ success: boolean; articles: Article[] }> {
    const response = await fetch(`/api/articles/${articleId}/comment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ gamerTag, content }),
    });
    if (!response.ok) throw new Error('خطا در ثبت نظر');
    return response.json();
  },

  // Promo Coupon Validation Helper
  async validateDiscount(code: string, total: number): Promise<{ valid: boolean; discountAmount: number; coupon: DiscountCode }> {
    const response = await fetch(`/api/discount/validate?code=${encodeURIComponent(code)}&total=${total}`);
    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error || 'کد تخفیف نامعتبر است');
    }
    return response.json();
  },

  // Admin Panel APIs
  async getAdminStats(): Promise<any> {
    const response = await fetch('/api/admin/stats');
    if (!response.ok) throw new Error('خطا در دریافت آمارهای پنل مدیریت');
    return response.json();
  },

  async addAdminSystem(system: Omit<GameSystem, 'id' | 'isReserved'>): Promise<{ success: boolean; systems: GameSystem[] }> {
    const response = await fetch('/api/admin/systems', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(system),
    });
    if (!response.ok) throw new Error('خطا در ثبت سیستم جدید');
    return response.json();
  },

  async updateAdminSystem(id: string, system: Partial<GameSystem>): Promise<{ success: boolean; systems: GameSystem[] }> {
    const response = await fetch(`/api/admin/systems/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(system),
    });
    if (!response.ok) throw new Error('خطا در ویرایش سیستم');
    return response.json();
  },

  async addAdminCafeItem(item: Omit<CafeItem, 'id'>): Promise<{ success: boolean; cafeItems: CafeItem[] }> {
    const response = await fetch('/api/admin/cafe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(item),
    });
    if (!response.ok) throw new Error('خطا در ثبت آیتم جدید بوفه');
    return response.json();
  },

  async updateAdminCafeItem(id: string, item: Partial<CafeItem>): Promise<{ success: boolean; cafeItems: CafeItem[] }> {
    const response = await fetch(`/api/admin/cafe/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(item),
    });
    if (!response.ok) throw new Error('خطا در ویرایش آیتم بوفه');
    return response.json();
  },

  async updateAdminCafeOrderStatus(id: string, status: string): Promise<{ success: boolean; cafeOrders: any[] }> {
    const response = await fetch(`/api/admin/cafe-orders/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    if (!response.ok) throw new Error('خطا در تغییر وضعیت سفارش بوفه');
    return response.json();
  },

  async addAdminAccessory(item: Omit<Accessory, 'id'>): Promise<{ success: boolean; accessories: Accessory[] }> {
    const response = await fetch('/api/admin/accessories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(item),
    });
    if (!response.ok) throw new Error('خطا در ثبت محصول جدید فروشگاه');
    return response.json();
  },

  async updateAdminAccessory(id: string, item: Partial<Accessory>): Promise<{ success: boolean; accessories: Accessory[] }> {
    const response = await fetch(`/api/admin/accessories/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(item),
    });
    if (!response.ok) throw new Error('خطا در ویرایش محصول فروشگاه');
    return response.json();
  },

  async updateAdminShopOrderStatus(id: string, status: string): Promise<{ success: boolean; shopOrders: any[] }> {
    const response = await fetch(`/api/admin/shop-orders/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    if (!response.ok) throw new Error('خطا در تغییر وضعیت سفارش فروشگاه');
    return response.json();
  },

  async addAdminTournament(tour: any): Promise<{ success: boolean; tournaments: Tournament[] }> {
    const response = await fetch('/api/admin/tournaments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(tour),
    });
    if (!response.ok) throw new Error('خطا در ثبت تورنمنت جدید');
    return response.json();
  },

  async addAdminArticle(art: any): Promise<{ success: boolean; articles: Article[] }> {
    const response = await fetch('/api/admin/articles', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(art),
    });
    if (!response.ok) throw new Error('خطا در ثبت خبر جدید');
    return response.json();
  },

  // Settings & Customization
  async getSettings(): Promise<Record<string, string>> {
    const response = await fetch('/api/settings');
    if (!response.ok) throw new Error('خطا در دریافت تنظیمات');
    return response.json();
  },

  async updateSetting(key: string, value: string): Promise<{ success: boolean }> {
    const response = await fetch('/api/admin/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key, value }),
    });
    if (!response.ok) throw new Error('خطا در ذخیره تنظیمات');
    return response.json();
  },

  async resetDatabase(): Promise<{ success: boolean; message: string }> {
    const response = await fetch('/api/admin/reset-database', {
      method: 'POST',
    });
    if (!response.ok) throw new Error('خطا در بازنشانی دیتابیس');
    return response.json();
  }
};
