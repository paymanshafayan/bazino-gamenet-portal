import path from 'path';
import { dataPath, installConfigPath as installConfigFile } from './paths';
import bcrypt from 'bcryptjs';
import { createRequire } from 'module';

// ESM compatibility bridge: this file (and its provider classes) uses
// CommonJS `require(...)` for lazy-loading optional DB drivers.
//
// The anchor path matters, because node resolves `node_modules` by walking UP
// from it:
//   • ESM (tsx dev)      → import.meta.url.
//   • CJS bundle         → __filename, i.e. <bundle>/dist/server.cjs, so the
//                          bundle's own node_modules is found no matter where
//                          the process happens to be running from.
//   • last resort        → cwd, which only works when cwd is the project root.
//
// That last resort used to be the CJS branch, and it broke the desktop build
// outright: desktop-app/main.js chdirs to the per-user data folder before
// requiring the bundle (so the SQLite file survives app updates), so the lookup
// went to <userData>/node_modules and died with
// "Cannot find module 'better-sqlite3'". The co-located deployment only ever
// worked because cwd happened to be the project root.
const require = createRequire(
  (typeof import.meta !== 'undefined' && (import.meta as any).url)
    ? (import.meta as any).url
    : (typeof __filename !== 'undefined')
      ? __filename
      : path.join(process.cwd(), 'server', 'dataProviders.ts')
);

// -----------------------------------------------------------------------------
// Query/activity logger shown in the admin panel ("Database Activity" widget)
// -----------------------------------------------------------------------------
export interface DBLog {
  id: string;
  provider: string;
  type: 'SQL' | 'NoSQL' | 'SYSTEM' | 'ERROR';
  command: string;
  timestamp: string;
}

export const dbQueryLogs: DBLog[] = [];

export function logDbQuery(provider: string, type: DBLog['type'], command: string) {
  const log: DBLog = {
    id: 'log-' + Math.random().toString(36).substring(2, 9),
    provider,
    type,
    command,
    timestamp: new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
  };
  dbQueryLogs.unshift(log);
  if (dbQueryLogs.length > 100) dbQueryLogs.pop();
}

// -----------------------------------------------------------------------------
// Password hashing (shared by every provider — not DB-specific)
// -----------------------------------------------------------------------------
const SALT_ROUNDS = 10;

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, SALT_ROUNDS);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  if (!hash) return false;
  return bcrypt.compare(plain, hash);
}

// -----------------------------------------------------------------------------
// Row types (shape returned to server.ts — booleans are real booleans now,
// not 0/1 flags, so existing `!!x` calls in server.ts remain harmless no-ops)
// -----------------------------------------------------------------------------
export interface UserRow {
  username: string;
  passwordHash: string;
  email: string;
  phone: string;
  loyaltyPoints: number;
  role: string;
  /** پروفایل (تسک ۱۲) — همه اختیاری؛ ردیف‌های قدیمی خالی‌اند */
  displayName?: string;
  avatarUrl?: string;
  bio?: string;
  gamerTag?: string;
  city?: string;
  birthDate?: string;
  /** شماره‌ی تأییدشده با OTP (E.164) — خالی = تأیید نشده */
  phoneVerifiedAt?: string;
  /** 1 = کاربر رمز دائمی تنظیم کرده (کاربران OTP-only رمز تصادفی دارند) */
  hasPassword?: number;
  /** تسک ۱۳ — موجودی کیف پول (لیر)، کش دفتر کل */
  walletBalance?: number;
  createdAt?: string;
}
/** ستون‌های قابل ویرایش پروفایل توسط خود کاربر */
export const USER_PROFILE_COLUMNS = new Set(['displayName', 'avatarUrl', 'bio', 'gamerTag', 'city', 'birthDate', 'email', 'phone', 'phoneVerifiedAt', 'hasPassword', 'passwordHash', 'createdAt', 'walletBalance']);

/** کد یک‌بارمصرف پیامکی */
export interface OtpCodeRow { id: string; phone: string; codeHash: string; ip: string; purpose: string; createdAt: string; expiresAt: string; attempts: number; consumedAt: string; }
/** تیکت پشتیبانی */
/** تسک ۱۳ — کیف پول: دفتر کل تراکنش‌ها (مبلغ به لیر؛ مثبت شارژ، منفی برداشت). موجودی = جمع ردیف‌ها و در users.walletBalance کش می‌شود. */
export interface WalletTxRow { id: string; username: string; amount: number; type: string; ref: string; operator: string; note: string; idempotencyKey: string; balanceAfter: number; createdAt: string; }
/** تسک ۱۳ — سفارش‌های «پرداخت در محل»: رزرو/تورنمنت با مهلت (dueAt) و بوفه/فروشگاه بدون مهلت. payload همان payload پیش‌فاکتور است. */
export interface OnsiteOrderRow { id: string; kind: string; username: string; amount: number; status: string; dueAt: string; payload: string; description: string; result: string; createdAt: string; updatedAt: string; settledAt: string; settledBy: string; }
export const ONSITE_ORDER_COLUMNS = new Set(['status', 'result', 'updatedAt', 'settledAt', 'settledBy', 'dueAt']);

/** طرح همکاری در فروش — نرخ‌ها NULL یا منفی یعنی ارث از تنظیمات سراسری */
export interface AffiliateRow {
  id: string; code: string; username: string; name: string; type: string; language: string;
  destination: string; parentId: string; status: string;
  newPct: number; returnPct: number; tournamentPct: number; overridePct: number;
  notes: string; createdAt: string; updatedAt: string;
}
export const AFFILIATE_COLUMNS = new Set(['code','username','name','type','language','destination','parentId','status','newPct','returnPct','tournamentPct','overridePct','notes','updatedAt']);
export interface AffiliateClickRow { id: string; code: string; path: string; ipHash: string; uaHash: string; visitorId: string; createdAt: string; }
export interface AffiliateAttributionRow { id: string; username: string; visitorId: string; code: string; source: string; expiresAt: string; createdAt: string; updatedAt: string; }
export interface AffiliateCommissionRow {
  id: string; affiliateId: string; code: string; username: string; orderId: string; kind: string; eventType: string;
  netAmount: number; ratePct: number; commissionAmount: number; status: string; holdUntil: string; flag: string;
  walletTxId: string; parentCommissionId: string; createdAt: string; updatedAt: string; approvedAt: string; paidOutAt: string;
  reversedAt: string; note: string; attendedAt: string;
}
export const AFFILIATE_COMMISSION_COLUMNS = new Set(['status','holdUntil','flag','walletTxId','updatedAt','approvedAt','paidOutAt','reversedAt','note','attendedAt']);
export interface AffiliateAuditRow { id: string; affiliateId: string; commissionId: string; actor: string; action: string; fromStatus: string; toStatus: string; detail: string; createdAt: string; }

export interface TicketRow { id: string; username: string; subject: string; category: string; priority: string; status: string; createdAt: string; updatedAt: string; lastStaffReplyAt: string; userSeenAt: string; }
export interface TicketMessageRow { id: string; ticketId: string; author: string; isStaff: number; body: string; createdAt: string; }
export const TICKET_COLUMNS = new Set(['subject', 'category', 'priority', 'status', 'updatedAt', 'lastStaffReplyAt', 'userSeenAt']);
export interface ChatMessageRow { id: string; room: string; username: string; message: string; timestamp: string; }
/** username: صاحب تراکنش. رشته‌ی خالی = ردیف میراث (قبل از افزودن این ستون). */
export interface TransactionRow { id: string; points: number; description: string; type: string; date: string; username?: string; }
/** ownerUsername: رشته‌ی خالی = کد تبلیغاتی عمومی؛ نام کاربری = کد شخصیِ حاصل از تبدیل امتیاز
 *  که فقط خودِ آن کاربر باید ببیند و خرج کند. */
export interface CouponRow { code: string; type: string; value: number; minOrder: number; expiry: string; expiryDate: string; maxUsageCount: number; usageCount: number; isActive: boolean; ownerUsername?: string; }
export interface SystemRow { id: string; name: string; nameFa?: string; nameEn?: string; nameRu?: string; nameTr?: string; type: string; hourlyRate: number; isActive: boolean; isReserved: boolean; }
export interface ReservationLogRow { id: string; systemId: string; username: string; systemName: string; startTime: string; endTime: string; totalPrice: number; date: string; checkedIn: boolean; timestamp: string; }
export interface CafeItemRow { id: string; name: string; nameFa?: string; nameEn?: string; nameRu?: string; nameTr?: string; category: string; price: number; imageUrl: string; mobileImageUrl?: string; inventory: number; isAvailable: boolean; }
export interface CafeOrderRow { id: string; items: string; totalPrice: number; discountApplied: number; finalAmount: number; couponCode: string; tableNumber: string; date: string; status: string; username?: string; }
export interface AccessoryRow { id: string; name: string; nameFa?: string; nameEn?: string; nameRu?: string; nameTr?: string; description: string; descriptionFa?: string; descriptionEn?: string; descriptionRu?: string; descriptionTr?: string; price: number; imageUrl: string; mobileImageUrl?: string; stock: number; category: string; }
export interface ShopOrderRow { id: string; cart: string; totalPrice: number; discountApplied: number; finalAmount: number; couponCode: string; date: string; status: string; username?: string; }
export interface TournamentRow { id: string; title: string; titleFa?: string; titleEn?: string; titleRu?: string; titleTr?: string; game: string; registrationFee: number; startDate: string; maxTeams: number; status: string; registeredTeamsCount: number; teams: string; bracket: string; }
export interface ArticleRow { id: string; title: string; titleFa?: string; titleEn?: string; titleRu?: string; titleTr?: string; content: string; contentFa?: string; contentEn?: string; contentRu?: string; contentTr?: string; category: string; imageUrl: string; mobileImageUrl?: string; author: string; authorFa?: string; authorEn?: string; authorRu?: string; authorTr?: string; date: string; comments: string; }
export interface UserMessageRow { id: string; sender: string; recipient: string; title: string; body: string; date: string; isRead: boolean; type: string; }
export interface ThemeRow { id: string; name: string; nameEn: string; primaryColor: string; primaryHover: string; darkBg: string; darkCard: string; accentRed: string; }
export interface SliderRow { id: string; imageUrl: string; mobileImageUrl?: string; target: string; titleFa: string; titleEn: string; titleRu: string; titleTr: string; descFa?: string; descEn?: string; descRu?: string; descTr?: string; }
export interface SettingRow { key: string; value: string; }
/** سفارش پرداخت آنلاین (PayTR). مبالغ به کوروش (×100). payload = JSON اطلاعات لازم برای تکمیل سفارش بعد از تأیید. */
export interface PaymentOrderRow {
  merchantOid: string; kind: string; username: string; email: string; amountKurus: number; currency: string;
  status: string; provider: string; payload: string; result: string; totalAmountKurus: number;
  failedCode: string; failedMsg: string; createdAt: string; updatedAt: string;
}

/** ستون‌های قابل به‌روزرسانی payment_orders (برای پرووایدرهایی که SET را پویا می‌سازند). */
export const PAYMENT_ORDER_COLUMNS = new Set(['status', 'totalAmountKurus', 'failedCode', 'failedMsg', 'result', 'updatedAt', 'email', 'username', 'payload']);

export interface AdminSeedInput { username: string; password: string; email: string; phone: string; }

// -----------------------------------------------------------------------------
// The data-access contract every real database backend implements.
// No raw SQL strings cross this boundary — each provider speaks its own
// database's native language (real T-SQL for SQL Server, real driver calls
// for MongoDB, real SQL for SQLite).
// -----------------------------------------------------------------------------
export interface IDataStore {
  name: string;
  isConnected: boolean;
  config: any;

  connect(): Promise<{ success: boolean; message: string }>;
  createDatabaseIfNotExist(): Promise<{ success: boolean; message: string }>;
  seedMinimal(adminUser: AdminSeedInput): Promise<void>;
  seedSampleData(): Promise<void>;
  /** Removes every row that seedSampleData() would have created (systems, cafe items, accessories, tournaments, articles, chat rooms, reservation logs, sliders) without touching the admin account or theme settings. */
  purgeSampleData(): Promise<void>;

  // Users & auth
  getUserByUsername(username: string): Promise<UserRow | undefined>;
  createUser(user: { username: string; password: string; email: string; phone: string }): Promise<void>;
  verifyLogin(username: string, password: string): Promise<UserRow | undefined>;
  addLoyaltyPointsToUser(username: string, delta: number): Promise<void>;
  listUsers(): Promise<UserRow[]>;
  countUsers(): Promise<number>;

  // Settings (key/value store: active user, active theme, sync status, store name...)
  getSetting(key: string): Promise<string | undefined>;
  setSetting(key: string, value: string): Promise<void>;
  listSettings(): Promise<SettingRow[]>;

  // Online payments (PayTR)
  createPaymentOrder(o: PaymentOrderRow): Promise<void>;
  getPaymentOrder(merchantOid: string): Promise<PaymentOrderRow | undefined>;
  updatePaymentOrder(merchantOid: string, fields: Partial<PaymentOrderRow>): Promise<void>;
  listPaymentOrders(limit?: number): Promise<PaymentOrderRow[]>;

  // Chat
  listChatRooms(): Promise<string[]>;
  createChatRoom(name: string): Promise<void>;
  deleteChatRoom(name: string): Promise<void>;
  listChatMessages(room: string): Promise<ChatMessageRow[]>;
  addChatMessage(msg: ChatMessageRow): Promise<void>;

  // Loyalty transactions
  /** همه‌ی تراکنش‌ها. فیلتر per-user در لایه‌ی مسیرها انجام می‌شود (ادمین به همه نیاز دارد). */
  listTransactions(): Promise<TransactionRow[]>;
  addTransaction(tx: TransactionRow): Promise<void>;

  // Discount coupons
  listCoupons(): Promise<CouponRow[]>;
  getCouponByCode(code: string): Promise<CouponRow | undefined>;
  createCoupon(coupon: CouponRow): Promise<void>;
  deactivateCoupon(code: string): Promise<void>;
  /** مصرف اتمیک: شمارنده را یک واحد بالا می‌برد و در همان دستور، اگر به سقف رسید غیرفعالش می‌کند.
   *  `true` یعنی مصرف ثبت شد؛ `false` یعنی کوپن بین اعتبارسنجی و اینجا تمام/غیرفعال شده بود. */
  recordCouponUsage(code: string): Promise<boolean>;
  /** یک‌بار در بوت: کدهای شخصی قدیمی (پیشوند LOYAL-) که مالک ندارند غیرفعال می‌شوند. */
  deactivateLegacyOwnerlessLoyaltyCoupons(): Promise<number>;

  // Game systems & reservations
  listSystems(): Promise<SystemRow[]>;
  getSystemById(id: string): Promise<SystemRow | undefined>;
  createSystem(system: SystemRow): Promise<void>;
  updateSystem(id: string, fields: Partial<SystemRow>): Promise<void>;
  setSystemReserved(id: string, reserved: boolean): Promise<void>;
  deleteSystem(id: string): Promise<void>;
  countSystems(): Promise<number>;

  listReservationLogs(): Promise<ReservationLogRow[]>;
  listPendingReservationLogs(): Promise<ReservationLogRow[]>;
  getReservationLogById(id: string): Promise<ReservationLogRow | undefined>;
  addReservationLog(log: ReservationLogRow): Promise<void>;
  setReservationCheckedIn(id: string): Promise<void>;
  deleteReservationLog(id: string): Promise<void>;
  /** Extends an existing reservation's end time and adds the extra cost to its total price. */
  extendReservation(id: string, newEndTime: string, additionalPrice: number): Promise<void>;
  /** Returns the user's most recent still-active (not checked-in) reservation, if any — used for assistant context-awareness. */
  getActiveReservationForUser(username: string): Promise<ReservationLogRow | undefined>;
  /** Business rule: true if this system has another PAID/active reservation overlapping [startTime,endTime) on the given date. */
  hasOverlappingReservation(systemId: string, date: string, startTime: string, endTime: string): Promise<boolean>;

  // Cafe
  listCafeItems(): Promise<CafeItemRow[]>;
  getCafeItemById(id: string): Promise<CafeItemRow | undefined>;
  createCafeItem(item: CafeItemRow): Promise<void>;
  updateCafeItem(id: string, fields: Partial<CafeItemRow>): Promise<void>;
  decrementCafeInventory(id: string, qty: number): Promise<void>;
  deleteCafeItem(id: string): Promise<void>;
  countCafeItems(): Promise<number>;

  listCafeOrders(): Promise<CafeOrderRow[]>;
  getCafeOrderById(id: string): Promise<CafeOrderRow | undefined>;
  addCafeOrder(order: CafeOrderRow): Promise<void>;
  setCafeOrderStatus(id: string, status: string): Promise<void>;

  // Accessories / shop
  listAccessories(): Promise<AccessoryRow[]>;
  getAccessoryById(id: string): Promise<AccessoryRow | undefined>;
  createAccessory(acc: AccessoryRow): Promise<void>;
  updateAccessory(id: string, fields: Partial<AccessoryRow>): Promise<void>;
  decrementAccessoryStock(id: string, qty: number): Promise<void>;
  deleteAccessory(id: string): Promise<void>;
  countAccessories(): Promise<number>;

  listShopOrders(): Promise<ShopOrderRow[]>;
  getShopOrderById(id: string): Promise<ShopOrderRow | undefined>;
  addShopOrder(order: ShopOrderRow): Promise<void>;
  setShopOrderStatus(id: string, status: string): Promise<void>;

  // Tournaments
  listTournaments(): Promise<TournamentRow[]>;
  getTournamentById(id: string): Promise<TournamentRow | undefined>;
  createTournament(t: TournamentRow): Promise<void>;
  registerTournamentTeam(id: string, teamsJson: string, registeredTeamsCount: number): Promise<void>;
  deleteTournament(id: string): Promise<void>;
  countTournaments(): Promise<number>;

  // Articles / blog
  listArticles(): Promise<ArticleRow[]>;
  getArticleById(id: string): Promise<ArticleRow | undefined>;
  createArticle(a: ArticleRow): Promise<void>;
  setArticleComments(id: string, commentsJson: string): Promise<void>;
  deleteArticle(id: string): Promise<void>;
  countArticles(): Promise<number>;

  // In-app user messages / notifications
  listUserMessages(): Promise<UserMessageRow[]>;
  listUserMessagesFor(username: string): Promise<UserMessageRow[]>;
  addUserMessage(m: UserMessageRow): Promise<void>;
  setUserMessageRead(id: string): Promise<void>;
  getUserMessageById(id: string): Promise<UserMessageRow | undefined>;

  // Themes
  listThemes(): Promise<ThemeRow[]>;
  createTheme(t: ThemeRow): Promise<void>;

  // App sliders
  listSliders(): Promise<SliderRow[]>;
  getSliderById(id: string): Promise<SliderRow | undefined>;
  createSlider(s: SliderRow): Promise<void>;
  updateSlider(id: string, fields: Partial<SliderRow>): Promise<void>;
  deleteSlider(id: string): Promise<void>;

  countReservationLogs(): Promise<number>;

  // Profile / OTP / Tickets (task 12)
  updateUserFields(username: string, fields: Partial<UserRow>): Promise<void>;
  getUserByPhone(phone: string): Promise<UserRow | undefined>;
  createOtp(o: OtpCodeRow): Promise<void>;
  /** آخرین کدهای این شماره یا این IP از زمان since (برای نرخ‌سنجی سمت سرور) */
  listRecentOtps(filter: { phone?: string; ip?: string; since: string }): Promise<OtpCodeRow[]>;
  getLatestActiveOtp(phone: string, purpose: string): Promise<OtpCodeRow | undefined>;
  updateOtp(id: string, fields: Partial<OtpCodeRow>): Promise<void>;
  createTicket(t: TicketRow): Promise<void>;
  getTicketById(id: string): Promise<TicketRow | undefined>;
  listTicketsFor(username: string): Promise<TicketRow[]>;
  listTickets(status?: string): Promise<TicketRow[]>;
  updateTicket(id: string, fields: Partial<TicketRow>): Promise<void>;
  addTicketMessage(m: TicketMessageRow): Promise<void>;
  listTicketMessages(ticketId: string): Promise<TicketMessageRow[]>;
  countOpenTickets(): Promise<number>;

  // ---- Wallet + on-site orders (task 13) ----
  /** ثبت اتمیک تراکنش کیف پول: موجودی را می‌خواند، اگر منفی می‌شد خطای INSUFFICIENT_FUNDS، وگرنه ردیف + کش را می‌نویسد و ردیف را برمی‌گرداند. */
  appendWalletTx(tx: Omit<WalletTxRow, 'balanceAfter'>): Promise<WalletTxRow>;
  getWalletTxByIdempotencyKey(key: string): Promise<WalletTxRow | undefined>;
  listWalletTxFor(username: string, limit?: number): Promise<WalletTxRow[]>;
  listWalletTx(limit?: number): Promise<WalletTxRow[]>;
  createOnsiteOrder(o: OnsiteOrderRow): Promise<void>;
  getOnsiteOrder(id: string): Promise<OnsiteOrderRow | undefined>;
  listOnsiteOrders(filter?: { status?: string; username?: string; kind?: string }): Promise<OnsiteOrderRow[]>;
  updateOnsiteOrder(id: string, fields: Partial<OnsiteOrderRow>): Promise<void>;

  // ---- Affiliate marketing ----
  listAffiliates(): Promise<AffiliateRow[]>;
  getAffiliateById(id: string): Promise<AffiliateRow | undefined>;
  getAffiliateByCode(code: string): Promise<AffiliateRow | undefined>;
  getAffiliateByUsername(username: string): Promise<AffiliateRow | undefined>;
  createAffiliate(a: AffiliateRow): Promise<void>;
  updateAffiliate(id: string, fields: Partial<AffiliateRow>): Promise<void>;
  createAffiliateClick(c: AffiliateClickRow): Promise<void>;
  countRecentAffiliateClicks(code: string, ipHash: string, uaHash: string, since: string): Promise<number>;
  countAffiliateClicks(code: string, since?: string): Promise<number>;
  upsertAffiliateAttribution(a: AffiliateAttributionRow): Promise<void>;
  getAttributionForUser(username: string): Promise<AffiliateAttributionRow | undefined>;
  getAttributionForVisitor(visitorId: string): Promise<AffiliateAttributionRow | undefined>;
  listAttributionsByCode(code: string): Promise<AffiliateAttributionRow[]>;
  createAffiliateCommission(c: AffiliateCommissionRow): Promise<void>;
  getAffiliateCommissionById(id: string): Promise<AffiliateCommissionRow | undefined>;
  listAffiliateCommissions(filter?: { affiliateId?: string; username?: string; orderId?: string; status?: string }): Promise<AffiliateCommissionRow[]>;
  updateAffiliateCommission(id: string, fields: Partial<AffiliateCommissionRow>): Promise<void>;
  createAffiliateAudit(a: AffiliateAuditRow): Promise<void>;
  listAffiliateAudit(affiliateId?: string, limit?: number): Promise<AffiliateAuditRow[]>;
}

// -----------------------------------------------------------------------------
// Shared seed data (identical across all three real backends so switching
// database provider never changes what the app looks like on first run).
// The actual sample dataset (4-5 items per section) lives in ./sampleData —
// the same single source of truth also powers the "sample data source" mode
// (default) of the site & mobile app.
// -----------------------------------------------------------------------------
import { seedAffiliateSettings } from './affiliate/settings';
import {
  SAMPLE_CHAT_ROOMS,
  SAMPLE_SYSTEMS,
  SAMPLE_CAFE_ITEMS,
  SAMPLE_ACCESSORIES,
  SAMPLE_SLIDERS,
  SAMPLE_ARTICLES,
  SAMPLE_TOURNAMENTS,
  SAMPLE_RESERVATION_LOGS
} from './sampleData';

const DEFAULT_THEMES: ThemeRow[] = [
  { id: 'cyberpunk-cyan', name: 'گیمینگ امپ (سرمه ای و فیروزه ای)', nameEn: 'Gaming AMP (Navy & Cyan)', primaryColor: '#00d8ff', primaryHover: '#00b5d6', darkBg: '#11121a', darkCard: '#191a24', accentRed: '#ff3b30' },
  { id: 'dark-gold', name: 'طلایی ذغالی (کلاسیک قبلی)', nameEn: 'Dark Gold (Classic)', primaryColor: '#ffb800', primaryHover: '#e09900', darkBg: '#07080a', darkCard: '#12141c', accentRed: '#ff3b30' },
];

// =============================================================================
// 1. SQLITE STORE — real embedded database file via better-sqlite3
//    (previously this "provider" only wrote to a JSON blob and parsed raw SQL
//    strings with regular expressions; it now uses an actual SQLite engine)
// =============================================================================
export class SqliteStore implements IDataStore {
  name = 'SQLite';
  isConnected = false;
  config: any = {};
  private db: any;

  private getDbPath(): string {
    return this.config.filePath || dataPath('bazino.sqlite3');
  }

  async connect(): Promise<{ success: boolean; message: string }> {
    // Lazy require so the dependency is only loaded when SQLite is the active provider
    const Database = require('better-sqlite3');
    this.db = new Database(this.getDbPath());
    this.db.pragma('journal_mode = WAL');
    this.isConnected = true;
    logDbQuery(this.name, 'SYSTEM', `Connected to SQLite file: ${this.getDbPath()}`);
    return { success: true, message: 'SQLite connection established successfully.' };
  }

  async createDatabaseIfNotExist(): Promise<{ success: boolean; message: string }> {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS users (username TEXT PRIMARY KEY, passwordHash TEXT NOT NULL, email TEXT, phone TEXT, loyaltyPoints INTEGER DEFAULT 0, role TEXT DEFAULT 'gamer');
      CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT);
      CREATE TABLE IF NOT EXISTS chat_rooms (name TEXT PRIMARY KEY);
      CREATE TABLE IF NOT EXISTS chat_messages (id TEXT PRIMARY KEY, room TEXT, username TEXT, message TEXT, timestamp TEXT);
      CREATE TABLE IF NOT EXISTS transactions (id TEXT PRIMARY KEY, points INTEGER, description TEXT, type TEXT, date TEXT);
      CREATE TABLE IF NOT EXISTS active_coupons (code TEXT PRIMARY KEY, type TEXT, value REAL, minOrder REAL, expiry TEXT, expiryDate TEXT, maxUsageCount INTEGER DEFAULT 1, usageCount INTEGER DEFAULT 0, isActive INTEGER DEFAULT 1);
      CREATE TABLE IF NOT EXISTS systems (id TEXT PRIMARY KEY, name TEXT, type TEXT, hourlyRate REAL, isActive INTEGER DEFAULT 1, isReserved INTEGER DEFAULT 0);
      CREATE TABLE IF NOT EXISTS reservation_logs (id TEXT PRIMARY KEY, systemId TEXT, username TEXT, systemName TEXT, startTime TEXT, endTime TEXT, totalPrice REAL, date TEXT, checkedIn INTEGER DEFAULT 0, timestamp TEXT);
      CREATE TABLE IF NOT EXISTS cafe_items (id TEXT PRIMARY KEY, name TEXT, category TEXT, price REAL, imageUrl TEXT, mobileImageUrl TEXT, inventory INTEGER, isAvailable INTEGER DEFAULT 1);
      CREATE TABLE IF NOT EXISTS cafe_orders (id TEXT PRIMARY KEY, items TEXT, totalPrice REAL, discountApplied REAL, finalAmount REAL, couponCode TEXT, tableNumber TEXT, date TEXT, status TEXT);
      CREATE TABLE IF NOT EXISTS accessories (id TEXT PRIMARY KEY, name TEXT, description TEXT, price REAL, imageUrl TEXT, mobileImageUrl TEXT, stock INTEGER, category TEXT);
      CREATE TABLE IF NOT EXISTS shop_orders (id TEXT PRIMARY KEY, cart TEXT, totalPrice REAL, discountApplied REAL, finalAmount REAL, couponCode TEXT, date TEXT, status TEXT);
      CREATE TABLE IF NOT EXISTS tournaments (id TEXT PRIMARY KEY, title TEXT, game TEXT, registrationFee REAL, startDate TEXT, maxTeams INTEGER, status TEXT, registeredTeamsCount INTEGER, teams TEXT, bracket TEXT);
      CREATE TABLE IF NOT EXISTS articles (id TEXT PRIMARY KEY, title TEXT, content TEXT, category TEXT, imageUrl TEXT, mobileImageUrl TEXT, author TEXT, date TEXT, comments TEXT);
      CREATE TABLE IF NOT EXISTS user_messages (id TEXT PRIMARY KEY, sender TEXT, recipient TEXT, title TEXT, body TEXT, date TEXT, isRead INTEGER DEFAULT 0, type TEXT);
      CREATE TABLE IF NOT EXISTS themes (id TEXT PRIMARY KEY, name TEXT, nameEn TEXT, primaryColor TEXT, primaryHover TEXT, darkBg TEXT, darkCard TEXT, accentRed TEXT);
      CREATE TABLE IF NOT EXISTS app_sliders (id TEXT PRIMARY KEY, imageUrl TEXT, mobileImageUrl TEXT, target TEXT, titleFa TEXT, titleEn TEXT, titleRu TEXT, titleTr TEXT, descFa TEXT, descEn TEXT, descRu TEXT, descTr TEXT);
      CREATE TABLE IF NOT EXISTS otp_codes (id TEXT PRIMARY KEY, phone TEXT, codeHash TEXT, ip TEXT, purpose TEXT, createdAt TEXT, expiresAt TEXT, attempts INTEGER DEFAULT 0, consumedAt TEXT DEFAULT '');
      CREATE INDEX IF NOT EXISTS idx_otp_phone ON otp_codes(phone, createdAt);
      CREATE INDEX IF NOT EXISTS idx_otp_ip ON otp_codes(ip, createdAt);
      CREATE TABLE IF NOT EXISTS wallet_transactions (id TEXT PRIMARY KEY, username TEXT, amount REAL, type TEXT, ref TEXT DEFAULT '', operator TEXT DEFAULT '', note TEXT DEFAULT '', idempotencyKey TEXT DEFAULT '', balanceAfter REAL, createdAt TEXT);
      CREATE INDEX IF NOT EXISTS idx_wallet_user ON wallet_transactions(username, createdAt);
      CREATE UNIQUE INDEX IF NOT EXISTS idx_wallet_idem ON wallet_transactions(idempotencyKey) WHERE idempotencyKey <> '';
      CREATE TABLE IF NOT EXISTS onsite_orders (id TEXT PRIMARY KEY, kind TEXT, username TEXT, amount REAL, status TEXT, dueAt TEXT DEFAULT '', payload TEXT, description TEXT, result TEXT DEFAULT '', createdAt TEXT, updatedAt TEXT, settledAt TEXT DEFAULT '', settledBy TEXT DEFAULT '');
      CREATE INDEX IF NOT EXISTS idx_onsite_status ON onsite_orders(status, dueAt);
      CREATE TABLE IF NOT EXISTS tickets (id TEXT PRIMARY KEY, username TEXT, subject TEXT, category TEXT, priority TEXT, status TEXT, createdAt TEXT, updatedAt TEXT, lastStaffReplyAt TEXT DEFAULT '', userSeenAt TEXT DEFAULT '');
      CREATE TABLE IF NOT EXISTS ticket_messages (id TEXT PRIMARY KEY, ticketId TEXT, author TEXT, isStaff INTEGER DEFAULT 0, body TEXT, createdAt TEXT);
      CREATE INDEX IF NOT EXISTS idx_ticket_msgs ON ticket_messages(ticketId, createdAt);
      CREATE TABLE IF NOT EXISTS payment_orders (merchantOid TEXT PRIMARY KEY, kind TEXT, username TEXT, email TEXT, amountKurus INTEGER, currency TEXT, status TEXT, provider TEXT, payload TEXT, result TEXT, totalAmountKurus INTEGER DEFAULT 0, failedCode TEXT DEFAULT '', failedMsg TEXT DEFAULT '', createdAt TEXT, updatedAt TEXT);
      CREATE TABLE IF NOT EXISTS affiliates (id TEXT PRIMARY KEY, code TEXT UNIQUE, username TEXT DEFAULT '', name TEXT, type TEXT DEFAULT 'gamer', language TEXT DEFAULT 'tr', destination TEXT DEFAULT '/', parentId TEXT DEFAULT '', status TEXT DEFAULT 'active', newPct REAL DEFAULT -1, returnPct REAL DEFAULT -1, tournamentPct REAL DEFAULT -1, overridePct REAL DEFAULT -1, notes TEXT DEFAULT '', createdAt TEXT, updatedAt TEXT);
      CREATE INDEX IF NOT EXISTS idx_aff_code ON affiliates(code);
      CREATE INDEX IF NOT EXISTS idx_aff_user ON affiliates(username);
      CREATE TABLE IF NOT EXISTS affiliate_clicks (id TEXT PRIMARY KEY, code TEXT, path TEXT, ipHash TEXT, uaHash TEXT, visitorId TEXT DEFAULT '', createdAt TEXT);
      CREATE INDEX IF NOT EXISTS idx_aff_click ON affiliate_clicks(code, createdAt);
      CREATE TABLE IF NOT EXISTS affiliate_attributions (id TEXT PRIMARY KEY, username TEXT DEFAULT '', visitorId TEXT DEFAULT '', code TEXT, source TEXT, expiresAt TEXT, createdAt TEXT, updatedAt TEXT);
      CREATE INDEX IF NOT EXISTS idx_aff_att_user ON affiliate_attributions(username);
      CREATE INDEX IF NOT EXISTS idx_aff_att_vis ON affiliate_attributions(visitorId);
      CREATE TABLE IF NOT EXISTS affiliate_commissions (id TEXT PRIMARY KEY, affiliateId TEXT, code TEXT, username TEXT, orderId TEXT, kind TEXT, eventType TEXT, netAmount REAL, ratePct REAL, commissionAmount REAL, status TEXT, holdUntil TEXT DEFAULT '', flag TEXT DEFAULT '', walletTxId TEXT DEFAULT '', parentCommissionId TEXT DEFAULT '', createdAt TEXT, updatedAt TEXT, approvedAt TEXT DEFAULT '', paidOutAt TEXT DEFAULT '', reversedAt TEXT DEFAULT '', note TEXT DEFAULT '', attendedAt TEXT DEFAULT '');
      CREATE INDEX IF NOT EXISTS idx_aff_com_aff ON affiliate_commissions(affiliateId, createdAt);
      CREATE INDEX IF NOT EXISTS idx_aff_com_ord ON affiliate_commissions(orderId);
      CREATE INDEX IF NOT EXISTS idx_aff_com_st ON affiliate_commissions(status, holdUntil);
      CREATE TABLE IF NOT EXISTS affiliate_audit (id TEXT PRIMARY KEY, affiliateId TEXT, commissionId TEXT DEFAULT '', actor TEXT, action TEXT, fromStatus TEXT DEFAULT '', toStatus TEXT DEFAULT '', detail TEXT DEFAULT '', createdAt TEXT);
      CREATE INDEX IF NOT EXISTS idx_aff_aud ON affiliate_audit(affiliateId, createdAt);
    `);
    logDbQuery(this.name, 'SQL', 'CREATE TABLE IF NOT EXISTS ... (17 tables verified)');
    this.addMissingColumns();
    return { success: true, message: 'SQLite schema verified/created.' };
  }

  /** Adds columns introduced after the initial schema to databases that already
   *  exist (CREATE TABLE IF NOT EXISTS never alters an existing table).
   *  Safe to run on every boot: each column is only added when missing. */
  private addMissingColumns(): void {
    const wanted: Array<{ table: string; column: string; type: string }> = [
      { table: 'cafe_items', column: 'mobileImageUrl', type: 'TEXT' },
      { table: 'accessories', column: 'mobileImageUrl', type: 'TEXT' },
      { table: 'articles', column: 'mobileImageUrl', type: 'TEXT' },
      { table: 'app_sliders', column: 'mobileImageUrl', type: 'TEXT' },
      { table: 'app_sliders', column: 'descFa', type: 'TEXT' },
      { table: 'app_sliders', column: 'descEn', type: 'TEXT' },
      { table: 'app_sliders', column: 'descRu', type: 'TEXT' },
      { table: 'app_sliders', column: 'descTr', type: 'TEXT' },
      // مالکیت: تراکنش امتیاز و کد تخفیف شخصی به یک کاربر تعلق دارند.
      { table: 'transactions', column: 'username', type: "TEXT NOT NULL DEFAULT ''" },
      { table: 'active_coupons', column: 'ownerUsername', type: "TEXT NOT NULL DEFAULT ''" },
      // پروفایل کاربر + OTP (تسک ۱۲)
      { table: 'users', column: 'displayName', type: "TEXT DEFAULT ''" },
      { table: 'users', column: 'avatarUrl', type: "TEXT DEFAULT ''" },
      { table: 'users', column: 'bio', type: "TEXT DEFAULT ''" },
      { table: 'users', column: 'gamerTag', type: "TEXT DEFAULT ''" },
      { table: 'users', column: 'city', type: "TEXT DEFAULT ''" },
      { table: 'users', column: 'birthDate', type: "TEXT DEFAULT ''" },
      { table: 'users', column: 'phoneVerifiedAt', type: "TEXT DEFAULT ''" },
      { table: 'users', column: 'hasPassword', type: "INTEGER DEFAULT 1" },
      { table: 'users', column: 'createdAt', type: "TEXT DEFAULT ''" },
      { table: 'users', column: 'walletBalance', type: "REAL DEFAULT 0" },
      // مالکیت سفارش‌ها برای «سفارش‌های من»
      { table: 'cafe_orders', column: 'username', type: "TEXT DEFAULT ''" },
      { table: 'shop_orders', column: 'username', type: "TEXT DEFAULT ''" },
    ];
    for (const { table, column, type } of wanted) {
      try {
        const cols = this.db.prepare(`PRAGMA table_info(${table})`).all() as Array<{ name: string }>;
        if (cols.length > 0 && !cols.some(c => c.name === column)) {
          this.db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${type};`);
          logDbQuery(this.name, 'SQL', `ALTER TABLE ${table} ADD COLUMN ${column}`);
        }
      } catch (e) {
        console.warn(`[SQLite] Could not add ${table}.${column}:`, e);
      }
    }
  }

  // ---- Users ----
  async getUserByUsername(username: string) {
    return this.db.prepare(`SELECT * FROM users WHERE LOWER(username) = LOWER(?)`).get(username) as UserRow | undefined;
  }
  async createUser(u: { username: string; password: string; email: string; phone: string }) {
    const passwordHash = await hashPassword(u.password);
    this.db.prepare(`INSERT INTO users (username, passwordHash, email, phone, loyaltyPoints, role) VALUES (?, ?, ?, ?, 100, 'gamer')`)
      .run(u.username, passwordHash, u.email, u.phone || '');
  }
  async verifyLogin(username: string, password: string) {
    const row = await this.getUserByUsername(username);
    if (!row) return undefined;
    const ok = await verifyPassword(password, row.passwordHash);
    return ok ? row : undefined;
  }
  async addLoyaltyPointsToUser(username: string, delta: number) {
    this.db.prepare(`UPDATE users SET loyaltyPoints = loyaltyPoints + ? WHERE username = ?`).run(delta, username);
  }
  async listUsers() { return this.db.prepare(`SELECT * FROM users`).all() as UserRow[]; }
  async countUsers() { return (this.db.prepare(`SELECT COUNT(*) as c FROM users`).get() as any).c; }

  // ---- Settings ----
  async getSetting(key: string) {
    const row = this.db.prepare(`SELECT value FROM settings WHERE key = ?`).get(key) as any;
    return row ? row.value : undefined;
  }
  async setSetting(key: string, value: string) {
    this.db.prepare(`INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value`).run(key, value);
  }
  async listSettings() { return this.db.prepare(`SELECT * FROM settings`).all() as SettingRow[]; }

  // ---- Chat ----
  async listChatRooms() { return (this.db.prepare(`SELECT name FROM chat_rooms`).all() as any[]).map(r => r.name); }
  async createChatRoom(name: string) { this.db.prepare(`INSERT OR IGNORE INTO chat_rooms (name) VALUES (?)`).run(name); }
  async deleteChatRoom(name: string) { this.db.prepare(`DELETE FROM chat_rooms WHERE name = ?`).run(name); }
  async listChatMessages(room: string) { return this.db.prepare(`SELECT * FROM chat_messages WHERE room = ?`).all(room) as ChatMessageRow[]; }
  async addChatMessage(m: ChatMessageRow) {
    this.db.prepare(`INSERT INTO chat_messages (id, room, username, message, timestamp) VALUES (?, ?, ?, ?, ?)`).run(m.id, m.room, m.username, m.message, m.timestamp);
  }

  // ---- Transactions ----
  async listTransactions() { return this.db.prepare(`SELECT * FROM transactions`).all() as TransactionRow[]; }
  async addTransaction(tx: TransactionRow) {
    this.db.prepare(`INSERT INTO transactions (id, points, description, type, date, username) VALUES (?, ?, ?, ?, ?, ?)`)
      .run(tx.id, tx.points, tx.description, tx.type, tx.date, tx.username || '');
  }

  // ---- Coupons ----
  async listCoupons() {
    return (this.db.prepare(`SELECT * FROM active_coupons`).all() as any[]).map(c => ({ ...c, isActive: !!c.isActive })) as CouponRow[];
  }
  async getCouponByCode(code: string) {
    const row = this.db.prepare(`SELECT * FROM active_coupons WHERE UPPER(code) = UPPER(?)`).get(code) as any;
    return row ? { ...row, isActive: !!row.isActive } : undefined;
  }
  async createCoupon(c: CouponRow) {
    this.db.prepare(`INSERT INTO active_coupons (code, type, value, minOrder, expiry, expiryDate, maxUsageCount, usageCount, isActive, ownerUsername) VALUES (?, ?, ?, ?, ?, ?, ?, 0, 1, ?)`)
      .run(c.code, c.type, c.value, c.minOrder, c.expiry, c.expiryDate || new Date(Date.now() + 30 * 86400000).toISOString(), c.maxUsageCount || 1, c.ownerUsername || '');
  }
  async deactivateCoupon(code: string) { this.db.prepare(`UPDATE active_coupons SET isActive = 0 WHERE code = ?`).run(code); }
  // یک دستور، نه دو تا: قبلاً بین «افزایش شمارنده» و «غیرفعال‌سازی» یک پنجره وجود داشت که
  // دو درخواست هم‌زمان می‌توانستند یک کوپن یک‌بارمصرف را دو بار خرج کنند.
  async recordCouponUsage(code: string) {
    const info = this.db.prepare(
      `UPDATE active_coupons
          SET usageCount = usageCount + 1,
              isActive   = CASE WHEN usageCount + 1 >= maxUsageCount THEN 0 ELSE isActive END
        WHERE code = ? AND isActive = 1 AND usageCount < maxUsageCount`
    ).run(code);
    return info.changes > 0;
  }
  async deactivateLegacyOwnerlessLoyaltyCoupons() {
    const info = this.db.prepare(
      `UPDATE active_coupons SET isActive = 0
        WHERE isActive = 1 AND (ownerUsername IS NULL OR ownerUsername = '') AND code LIKE 'LOYAL-%'`
    ).run();
    return info.changes;
  }

  // ---- Systems ----
  async listSystems() {
    return (this.db.prepare(`SELECT * FROM systems`).all() as any[]).map(s => ({ ...s, isActive: !!s.isActive, isReserved: !!s.isReserved })) as SystemRow[];
  }
  async getSystemById(id: string) {
    const row = this.db.prepare(`SELECT * FROM systems WHERE id = ?`).get(id) as any;
    return row ? { ...row, isActive: !!row.isActive, isReserved: !!row.isReserved } : undefined;
  }
  async createSystem(s: SystemRow) {
    this.db.prepare(`INSERT INTO systems (id, name, type, hourlyRate, isActive, isReserved) VALUES (?, ?, ?, ?, ?, ?)`)
      .run(s.id, s.name, s.type, s.hourlyRate, s.isActive ? 1 : 0, s.isReserved ? 1 : 0);
  }
  async updateSystem(id: string, f: Partial<SystemRow>) {
    const current = await this.getSystemById(id);
    if (!current) return;
    const merged = { ...current, ...f };
    this.db.prepare(`UPDATE systems SET name=?, type=?, hourlyRate=?, isActive=?, isReserved=? WHERE id=?`)
      .run(merged.name, merged.type, merged.hourlyRate, merged.isActive ? 1 : 0, merged.isReserved ? 1 : 0, id);
  }
  async setSystemReserved(id: string, reserved: boolean) {
    this.db.prepare(`UPDATE systems SET isReserved = ? WHERE id = ?`).run(reserved ? 1 : 0, id);
  }
  async deleteSystem(id: string) { this.db.prepare(`DELETE FROM systems WHERE id = ?`).run(id); }
  async countSystems() { return (this.db.prepare(`SELECT COUNT(*) as c FROM systems`).get() as any).c; }

  // ---- Reservations ----
  async listReservationLogs() {
    return (this.db.prepare(`SELECT * FROM reservation_logs`).all() as any[]).map(l => ({ ...l, checkedIn: !!l.checkedIn })) as ReservationLogRow[];
  }
  async listPendingReservationLogs() {
    return (this.db.prepare(`SELECT * FROM reservation_logs WHERE checkedIn = 0`).all() as any[]).map(l => ({ ...l, checkedIn: !!l.checkedIn })) as ReservationLogRow[];
  }
  async getReservationLogById(id: string) {
    const row = this.db.prepare(`SELECT * FROM reservation_logs WHERE id = ?`).get(id) as any;
    return row ? { ...row, checkedIn: !!row.checkedIn } : undefined;
  }
  async addReservationLog(l: ReservationLogRow) {
    this.db.prepare(`INSERT INTO reservation_logs (id, systemId, username, systemName, startTime, endTime, totalPrice, date, checkedIn, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .run(l.id, l.systemId, l.username || '', l.systemName, l.startTime, l.endTime, l.totalPrice, l.date, l.checkedIn ? 1 : 0, l.timestamp);
  }
  async setReservationCheckedIn(id: string) { this.db.prepare(`UPDATE reservation_logs SET checkedIn = 1 WHERE id = ?`).run(id); }
  async deleteReservationLog(id: string) { this.db.prepare(`DELETE FROM reservation_logs WHERE id = ?`).run(id); }
  async countReservationLogs() { return (this.db.prepare(`SELECT COUNT(*) as c FROM reservation_logs`).get() as any).c; }
  async extendReservation(id: string, newEndTime: string, additionalPrice: number) {
    this.db.prepare(`UPDATE reservation_logs SET endTime = ?, totalPrice = totalPrice + ? WHERE id = ?`).run(newEndTime, additionalPrice, id);
  }
  async getActiveReservationForUser(username: string) {
    const row = this.db.prepare(`SELECT * FROM reservation_logs WHERE username = ? AND checkedIn = 0 ORDER BY timestamp DESC LIMIT 1`).get(username) as any;
    return row ? { ...row, checkedIn: !!row.checkedIn } : undefined;
  }
  async hasOverlappingReservation(systemId: string, date: string, startTime: string, endTime: string) {
    const rows = this.db.prepare(`SELECT * FROM reservation_logs WHERE systemId = ? AND date = ? AND checkedIn = 0`).all(systemId, date) as any[];
    return rows.some(r => startTime < r.endTime && endTime > r.startTime);
  }

  // ---- Cafe ----
  async listCafeItems() { return (this.db.prepare(`SELECT * FROM cafe_items`).all() as any[]).map(i => ({ ...i, isAvailable: !!i.isAvailable })) as CafeItemRow[]; }
  async getCafeItemById(id: string) {
    const row = this.db.prepare(`SELECT * FROM cafe_items WHERE id = ?`).get(id) as any;
    return row ? { ...row, isAvailable: !!row.isAvailable } : undefined;
  }
  async createCafeItem(i: CafeItemRow) {
    this.db.prepare(`INSERT INTO cafe_items (id, name, category, price, imageUrl, mobileImageUrl, inventory, isAvailable) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`)
      .run(i.id, i.name, i.category, i.price, i.imageUrl, i.mobileImageUrl ?? null, i.inventory, i.isAvailable ? 1 : 0);
  }
  async updateCafeItem(id: string, f: Partial<CafeItemRow>) {
    const current = await this.getCafeItemById(id);
    if (!current) return;
    const m = { ...current, ...f };
    this.db.prepare(`UPDATE cafe_items SET name=?, category=?, price=?, imageUrl=?, mobileImageUrl=?, inventory=?, isAvailable=? WHERE id=?`)
      .run(m.name, m.category, m.price, m.imageUrl, m.mobileImageUrl ?? null, m.inventory, m.isAvailable ? 1 : 0, id);
  }
  async decrementCafeInventory(id: string, qty: number) {
    this.db.prepare(`UPDATE cafe_items SET inventory = MAX(0, inventory - ?) WHERE id = ?`).run(qty, id);
  }
  async deleteCafeItem(id: string) { this.db.prepare(`DELETE FROM cafe_items WHERE id = ?`).run(id); }
  async countCafeItems() { return (this.db.prepare(`SELECT COUNT(*) as c FROM cafe_items`).get() as any).c; }

  async listCafeOrders() { return this.db.prepare(`SELECT * FROM cafe_orders`).all() as CafeOrderRow[]; }
  async getCafeOrderById(id: string) { return this.db.prepare(`SELECT * FROM cafe_orders WHERE id = ?`).get(id) as CafeOrderRow | undefined; }
  async addCafeOrder(o: CafeOrderRow) {
    this.db.prepare(`INSERT INTO cafe_orders (id, items, totalPrice, discountApplied, finalAmount, couponCode, tableNumber, date, status, username) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .run(o.id, o.items, o.totalPrice, o.discountApplied, o.finalAmount, o.couponCode, o.tableNumber, o.date, o.status, o.username || '');
  }
  async setCafeOrderStatus(id: string, status: string) { this.db.prepare(`UPDATE cafe_orders SET status = ? WHERE id = ?`).run(status, id); }

  // ---- Payment orders (PayTR) ----
  async createPaymentOrder(o: PaymentOrderRow) {
    this.db.prepare(`INSERT INTO payment_orders (merchantOid, kind, username, email, amountKurus, currency, status, provider, payload, result, totalAmountKurus, failedCode, failedMsg, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .run(o.merchantOid, o.kind, o.username, o.email, o.amountKurus, o.currency, o.status, o.provider, o.payload, o.result, o.totalAmountKurus, o.failedCode, o.failedMsg, o.createdAt, o.updatedAt);
  }
  async getPaymentOrder(merchantOid: string) { return this.db.prepare(`SELECT * FROM payment_orders WHERE merchantOid = ?`).get(merchantOid) as PaymentOrderRow | undefined; }
  async updatePaymentOrder(merchantOid: string, f: Partial<PaymentOrderRow>) {
    const keys = Object.keys(f).filter(k => k !== 'merchantOid');
    if (!keys.length) return;
    this.db.prepare(`UPDATE payment_orders SET ${keys.map(k => `${k} = ?`).join(', ')} WHERE merchantOid = ?`).run(...keys.map(k => (f as any)[k]), merchantOid);
  }
  async listPaymentOrders(limit = 200) { return this.db.prepare(`SELECT * FROM payment_orders ORDER BY createdAt DESC LIMIT ?`).all(limit) as PaymentOrderRow[]; }

  // ---- Profile / OTP / Tickets (task 12) ----
  async updateUserFields(username: string, f: Partial<UserRow>) {
    const keys = Object.keys(f).filter(k => USER_PROFILE_COLUMNS.has(k));
    if (!keys.length) return;
    this.db.prepare(`UPDATE users SET ${keys.map(k => `${k} = ?`).join(', ')} WHERE username = ?`).run(...keys.map(k => (f as any)[k]), username);
  }
  async getUserByPhone(phone: string) { return this.db.prepare(`SELECT * FROM users WHERE phone = ?`).get(phone) as UserRow | undefined; }
  async createOtp(o: OtpCodeRow) {
    this.db.prepare(`INSERT INTO otp_codes (id, phone, codeHash, ip, purpose, createdAt, expiresAt, attempts, consumedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .run(o.id, o.phone, o.codeHash, o.ip, o.purpose, o.createdAt, o.expiresAt, o.attempts, o.consumedAt);
  }
  async listRecentOtps(fl: { phone?: string; ip?: string; since: string }) {
    if (fl.phone && fl.ip) return this.db.prepare(`SELECT * FROM otp_codes WHERE (phone = ? OR ip = ?) AND createdAt >= ? ORDER BY createdAt DESC`).all(fl.phone, fl.ip, fl.since) as OtpCodeRow[];
    if (fl.phone) return this.db.prepare(`SELECT * FROM otp_codes WHERE phone = ? AND createdAt >= ? ORDER BY createdAt DESC`).all(fl.phone, fl.since) as OtpCodeRow[];
    return this.db.prepare(`SELECT * FROM otp_codes WHERE ip = ? AND createdAt >= ? ORDER BY createdAt DESC`).all(fl.ip || '', fl.since) as OtpCodeRow[];
  }
  async getLatestActiveOtp(phone: string, purpose: string) {
    return this.db.prepare(`SELECT * FROM otp_codes WHERE phone = ? AND purpose = ? AND consumedAt = '' ORDER BY createdAt DESC LIMIT 1`).get(phone, purpose) as OtpCodeRow | undefined;
  }
  async updateOtp(id: string, f: Partial<OtpCodeRow>) {
    const keys = Object.keys(f).filter(k => k === 'attempts' || k === 'consumedAt');
    if (!keys.length) return;
    this.db.prepare(`UPDATE otp_codes SET ${keys.map(k => `${k} = ?`).join(', ')} WHERE id = ?`).run(...keys.map(k => (f as any)[k]), id);
  }
  async createTicket(t: TicketRow) {
    this.db.prepare(`INSERT INTO tickets (id, username, subject, category, priority, status, createdAt, updatedAt, lastStaffReplyAt, userSeenAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .run(t.id, t.username, t.subject, t.category, t.priority, t.status, t.createdAt, t.updatedAt, t.lastStaffReplyAt, t.userSeenAt);
  }
  async getTicketById(id: string) { return this.db.prepare(`SELECT * FROM tickets WHERE id = ?`).get(id) as TicketRow | undefined; }
  async listTicketsFor(username: string) { return this.db.prepare(`SELECT * FROM tickets WHERE username = ? ORDER BY updatedAt DESC`).all(username) as TicketRow[]; }
  async listTickets(status?: string) {
    return (status ? this.db.prepare(`SELECT * FROM tickets WHERE status = ? ORDER BY updatedAt DESC`).all(status) : this.db.prepare(`SELECT * FROM tickets ORDER BY updatedAt DESC`).all()) as TicketRow[];
  }
  async updateTicket(id: string, f: Partial<TicketRow>) {
    const keys = Object.keys(f).filter(k => TICKET_COLUMNS.has(k));
    if (!keys.length) return;
    this.db.prepare(`UPDATE tickets SET ${keys.map(k => `${k} = ?`).join(', ')} WHERE id = ?`).run(...keys.map(k => (f as any)[k]), id);
  }
  async addTicketMessage(m: TicketMessageRow) {
    this.db.prepare(`INSERT INTO ticket_messages (id, ticketId, author, isStaff, body, createdAt) VALUES (?, ?, ?, ?, ?, ?)`).run(m.id, m.ticketId, m.author, m.isStaff, m.body, m.createdAt);
  }
  async listTicketMessages(ticketId: string) { return this.db.prepare(`SELECT * FROM ticket_messages WHERE ticketId = ? ORDER BY createdAt ASC`).all(ticketId) as TicketMessageRow[]; }
  async countOpenTickets() { return (this.db.prepare(`SELECT COUNT(*) as c FROM tickets WHERE status IN ('open','customer_reply')`).get() as any).c; }

  // ---- Wallet + on-site orders (task 13) ----
  async appendWalletTx(tx: Omit<WalletTxRow, 'balanceAfter'>): Promise<WalletTxRow> {
    const run = this.db.transaction((t: Omit<WalletTxRow, 'balanceAfter'>) => {
      const row = this.db.prepare(`SELECT COALESCE(SUM(amount), 0) as bal FROM wallet_transactions WHERE username = ?`).get(t.username) as any;
      const balanceAfter = Math.round(((row?.bal || 0) + t.amount) * 100) / 100;
      if (balanceAfter < -0.000001) throw Object.assign(new Error('INSUFFICIENT_FUNDS'), { code: 'INSUFFICIENT_FUNDS', statusCode: 402, balance: row?.bal || 0 });
      this.db.prepare(`INSERT INTO wallet_transactions (id, username, amount, type, ref, operator, note, idempotencyKey, balanceAfter, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
        .run(t.id, t.username, t.amount, t.type, t.ref || '', t.operator || '', t.note || '', t.idempotencyKey || '', balanceAfter, t.createdAt);
      this.db.prepare(`UPDATE users SET walletBalance = ? WHERE username = ?`).run(balanceAfter, t.username);
      return { ...t, balanceAfter } as WalletTxRow;
    });
    return run(tx);
  }
  async getWalletTxByIdempotencyKey(key: string) { if (!key) return undefined; return this.db.prepare(`SELECT * FROM wallet_transactions WHERE idempotencyKey = ?`).get(key) as WalletTxRow | undefined; }
  async listWalletTxFor(username: string, limit = 100) { return this.db.prepare(`SELECT * FROM wallet_transactions WHERE username = ? ORDER BY createdAt DESC, rowid DESC LIMIT ?`).all(username, limit) as WalletTxRow[]; }
  async listWalletTx(limit = 300) { return this.db.prepare(`SELECT * FROM wallet_transactions ORDER BY createdAt DESC, rowid DESC LIMIT ?`).all(limit) as WalletTxRow[]; }
  async createOnsiteOrder(o: OnsiteOrderRow) {
    this.db.prepare(`INSERT INTO onsite_orders (id, kind, username, amount, status, dueAt, payload, description, result, createdAt, updatedAt, settledAt, settledBy) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .run(o.id, o.kind, o.username, o.amount, o.status, o.dueAt || '', o.payload, o.description, o.result || '', o.createdAt, o.updatedAt, o.settledAt || '', o.settledBy || '');
  }
  async getOnsiteOrder(id: string) { return this.db.prepare(`SELECT * FROM onsite_orders WHERE id = ?`).get(id) as OnsiteOrderRow | undefined; }
  async listOnsiteOrders(fl: { status?: string; username?: string; kind?: string } = {}) {
    const where: string[] = []; const vals: any[] = [];
    if (fl.status) { where.push('status = ?'); vals.push(fl.status); }
    if (fl.username) { where.push('username = ?'); vals.push(fl.username); }
    if (fl.kind) { where.push('kind = ?'); vals.push(fl.kind); }
    return this.db.prepare(`SELECT * FROM onsite_orders ${where.length ? 'WHERE ' + where.join(' AND ') : ''} ORDER BY createdAt DESC`).all(...vals) as OnsiteOrderRow[];
  }
  async updateOnsiteOrder(id: string, f: Partial<OnsiteOrderRow>) {
    const keys = Object.keys(f).filter(k => ONSITE_ORDER_COLUMNS.has(k));
    if (!keys.length) return;
    this.db.prepare(`UPDATE onsite_orders SET ${keys.map(k => `${k} = ?`).join(', ')} WHERE id = ?`).run(...keys.map(k => (f as any)[k]), id);
  }


  // ---- Affiliate marketing ----
  async listAffiliates() { return this.db.prepare(`SELECT * FROM affiliates ORDER BY createdAt DESC`).all() as AffiliateRow[]; }
  async getAffiliateById(id: string) { return this.db.prepare(`SELECT * FROM affiliates WHERE id = ?`).get(id) as AffiliateRow | undefined; }
  async getAffiliateByCode(code: string) { return this.db.prepare(`SELECT * FROM affiliates WHERE UPPER(code) = UPPER(?)`).get(code) as AffiliateRow | undefined; }
  async getAffiliateByUsername(username: string) { if (!username) return undefined; return this.db.prepare(`SELECT * FROM affiliates WHERE LOWER(username) = LOWER(?)`).get(username) as AffiliateRow | undefined; }
  async createAffiliate(a: AffiliateRow) {
    this.db.prepare(`INSERT INTO affiliates (id, code, username, name, type, language, destination, parentId, status, newPct, returnPct, tournamentPct, overridePct, notes, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .run(a.id, a.code, a.username || '', a.name, a.type || 'gamer', a.language || 'tr', a.destination || '/', a.parentId || '', a.status || 'active', a.newPct ?? -1, a.returnPct ?? -1, a.tournamentPct ?? -1, a.overridePct ?? -1, a.notes || '', a.createdAt, a.updatedAt);
  }
  async updateAffiliate(id: string, f: Partial<AffiliateRow>) {
    const keys = Object.keys(f).filter(k => AFFILIATE_COLUMNS.has(k));
    if (!keys.length) return;
    this.db.prepare(`UPDATE affiliates SET ${keys.map(k => `${k} = ?`).join(', ')} WHERE id = ?`).run(...keys.map(k => (f as any)[k]), id);
  }
  async createAffiliateClick(c: AffiliateClickRow) {
    this.db.prepare(`INSERT INTO affiliate_clicks (id, code, path, ipHash, uaHash, visitorId, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)`).run(c.id, c.code, c.path, c.ipHash, c.uaHash, c.visitorId || '', c.createdAt);
  }
  async countRecentAffiliateClicks(code: string, ipHash: string, uaHash: string, since: string) {
    return (this.db.prepare(`SELECT COUNT(*) as c FROM affiliate_clicks WHERE code = ? AND ipHash = ? AND uaHash = ? AND createdAt >= ?`).get(code, ipHash, uaHash, since) as any).c;
  }
  async countAffiliateClicks(code: string, since?: string) {
    if (since) return (this.db.prepare(`SELECT COUNT(*) as c FROM affiliate_clicks WHERE code = ? AND createdAt >= ?`).get(code, since) as any).c;
    return (this.db.prepare(`SELECT COUNT(*) as c FROM affiliate_clicks WHERE code = ?`).get(code) as any).c;
  }
  async upsertAffiliateAttribution(a: AffiliateAttributionRow) {
    if (a.username) this.db.prepare(`DELETE FROM affiliate_attributions WHERE username = ?`).run(a.username);
    if (a.visitorId) this.db.prepare(`DELETE FROM affiliate_attributions WHERE visitorId = ? AND visitorId <> ''`).run(a.visitorId);
    this.db.prepare(`INSERT INTO affiliate_attributions (id, username, visitorId, code, source, expiresAt, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`)
      .run(a.id, a.username || '', a.visitorId || '', a.code, a.source, a.expiresAt, a.createdAt, a.updatedAt);
  }
  async getAttributionForUser(username: string) { if (!username) return undefined; return this.db.prepare(`SELECT * FROM affiliate_attributions WHERE username = ? ORDER BY updatedAt DESC LIMIT 1`).get(username) as AffiliateAttributionRow | undefined; }
  async getAttributionForVisitor(visitorId: string) { if (!visitorId) return undefined; return this.db.prepare(`SELECT * FROM affiliate_attributions WHERE visitorId = ? ORDER BY updatedAt DESC LIMIT 1`).get(visitorId) as AffiliateAttributionRow | undefined; }
  async listAttributionsByCode(code: string) { return this.db.prepare(`SELECT * FROM affiliate_attributions WHERE code = ?`).all(code) as AffiliateAttributionRow[]; }
  async createAffiliateCommission(c: AffiliateCommissionRow) {
    this.db.prepare(`INSERT INTO affiliate_commissions (id, affiliateId, code, username, orderId, kind, eventType, netAmount, ratePct, commissionAmount, status, holdUntil, flag, walletTxId, parentCommissionId, createdAt, updatedAt, approvedAt, paidOutAt, reversedAt, note, attendedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .run(c.id, c.affiliateId, c.code, c.username, c.orderId, c.kind, c.eventType, c.netAmount, c.ratePct, c.commissionAmount, c.status, c.holdUntil || '', c.flag || '', c.walletTxId || '', c.parentCommissionId || '', c.createdAt, c.updatedAt, c.approvedAt || '', c.paidOutAt || '', c.reversedAt || '', c.note || '', c.attendedAt || '');
  }
  async getAffiliateCommissionById(id: string) { return this.db.prepare(`SELECT * FROM affiliate_commissions WHERE id = ?`).get(id) as AffiliateCommissionRow | undefined; }
  async listAffiliateCommissions(fl: { affiliateId?: string; username?: string; orderId?: string; status?: string } = {}) {
    const where: string[] = []; const vals: any[] = [];
    if (fl.affiliateId) { where.push('affiliateId = ?'); vals.push(fl.affiliateId); }
    if (fl.username) { where.push('username = ?'); vals.push(fl.username); }
    if (fl.orderId) { where.push('orderId = ?'); vals.push(fl.orderId); }
    if (fl.status) { where.push('status = ?'); vals.push(fl.status); }
    return this.db.prepare(`SELECT * FROM affiliate_commissions ${where.length ? 'WHERE ' + where.join(' AND ') : ''} ORDER BY createdAt DESC`).all(...vals) as AffiliateCommissionRow[];
  }
  async updateAffiliateCommission(id: string, f: Partial<AffiliateCommissionRow>) {
    const keys = Object.keys(f).filter(k => AFFILIATE_COMMISSION_COLUMNS.has(k));
    if (!keys.length) return;
    this.db.prepare(`UPDATE affiliate_commissions SET ${keys.map(k => `${k} = ?`).join(', ')} WHERE id = ?`).run(...keys.map(k => (f as any)[k]), id);
  }
  async createAffiliateAudit(a: AffiliateAuditRow) {
    this.db.prepare(`INSERT INTO affiliate_audit (id, affiliateId, commissionId, actor, action, fromStatus, toStatus, detail, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(a.id, a.affiliateId, a.commissionId || '', a.actor, a.action, a.fromStatus || '', a.toStatus || '', a.detail || '', a.createdAt);
  }
  async listAffiliateAudit(affiliateId?: string, limit = 200) {
    if (affiliateId) return this.db.prepare(`SELECT * FROM affiliate_audit WHERE affiliateId = ? ORDER BY createdAt DESC LIMIT ?`).all(affiliateId, limit) as AffiliateAuditRow[];
    return this.db.prepare(`SELECT * FROM affiliate_audit ORDER BY createdAt DESC LIMIT ?`).all(limit) as AffiliateAuditRow[];
  }

  // ---- Accessories / shop ----
  async listAccessories() { return this.db.prepare(`SELECT * FROM accessories`).all() as AccessoryRow[]; }
  async getAccessoryById(id: string) { return this.db.prepare(`SELECT * FROM accessories WHERE id = ?`).get(id) as AccessoryRow | undefined; }
  async createAccessory(a: AccessoryRow) {
    this.db.prepare(`INSERT INTO accessories (id, name, description, price, imageUrl, mobileImageUrl, stock, category) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`)
      .run(a.id, a.name, a.description, a.price, a.imageUrl, a.mobileImageUrl ?? null, a.stock, a.category);
  }
  async updateAccessory(id: string, f: Partial<AccessoryRow>) {
    const current = await this.getAccessoryById(id);
    if (!current) return;
    const m = { ...current, ...f };
    this.db.prepare(`UPDATE accessories SET name=?, description=?, price=?, imageUrl=?, mobileImageUrl=?, stock=?, category=? WHERE id=?`)
      .run(m.name, m.description, m.price, m.imageUrl, m.mobileImageUrl ?? null, m.stock, m.category, id);
  }
  async decrementAccessoryStock(id: string, qty: number) {
    this.db.prepare(`UPDATE accessories SET stock = MAX(0, stock - ?) WHERE id = ?`).run(qty, id);
  }
  async deleteAccessory(id: string) { this.db.prepare(`DELETE FROM accessories WHERE id = ?`).run(id); }
  async countAccessories() { return (this.db.prepare(`SELECT COUNT(*) as c FROM accessories`).get() as any).c; }

  async listShopOrders() { return this.db.prepare(`SELECT * FROM shop_orders`).all() as ShopOrderRow[]; }
  async getShopOrderById(id: string) { return this.db.prepare(`SELECT * FROM shop_orders WHERE id = ?`).get(id) as ShopOrderRow | undefined; }
  async addShopOrder(o: ShopOrderRow) {
    this.db.prepare(`INSERT INTO shop_orders (id, cart, totalPrice, discountApplied, finalAmount, couponCode, date, status, username) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .run(o.id, o.cart, o.totalPrice, o.discountApplied, o.finalAmount, o.couponCode, o.date, o.status, o.username || '');
  }
  async setShopOrderStatus(id: string, status: string) { this.db.prepare(`UPDATE shop_orders SET status = ? WHERE id = ?`).run(status, id); }

  // ---- Tournaments ----
  async listTournaments() { return this.db.prepare(`SELECT * FROM tournaments`).all() as TournamentRow[]; }
  async getTournamentById(id: string) { return this.db.prepare(`SELECT * FROM tournaments WHERE id = ?`).get(id) as TournamentRow | undefined; }
  async createTournament(t: TournamentRow) {
    this.db.prepare(`INSERT INTO tournaments (id, title, game, registrationFee, startDate, maxTeams, status, registeredTeamsCount, teams, bracket) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .run(t.id, t.title, t.game, t.registrationFee, t.startDate, t.maxTeams, t.status, t.registeredTeamsCount, t.teams, t.bracket);
  }
  async registerTournamentTeam(id: string, teamsJson: string, count: number) {
    this.db.prepare(`UPDATE tournaments SET teams = ?, registeredTeamsCount = ? WHERE id = ?`).run(teamsJson, count, id);
  }
  async deleteTournament(id: string) { this.db.prepare(`DELETE FROM tournaments WHERE id = ?`).run(id); }
  async countTournaments() { return (this.db.prepare(`SELECT COUNT(*) as c FROM tournaments`).get() as any).c; }

  // ---- Articles ----
  async listArticles() { return this.db.prepare(`SELECT * FROM articles`).all() as ArticleRow[]; }
  async getArticleById(id: string) { return this.db.prepare(`SELECT * FROM articles WHERE id = ?`).get(id) as ArticleRow | undefined; }
  async createArticle(a: ArticleRow) {
    this.db.prepare(`INSERT INTO articles (id, title, content, category, imageUrl, mobileImageUrl, author, date, comments) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .run(a.id, a.title, a.content, a.category, a.imageUrl, a.mobileImageUrl ?? null, a.author, a.date, a.comments);
  }
  async setArticleComments(id: string, commentsJson: string) { this.db.prepare(`UPDATE articles SET comments = ? WHERE id = ?`).run(commentsJson, id); }
  async deleteArticle(id: string) { this.db.prepare(`DELETE FROM articles WHERE id = ?`).run(id); }
  async countArticles() { return (this.db.prepare(`SELECT COUNT(*) as c FROM articles`).get() as any).c; }

  // ---- User messages ----
  async listUserMessages() {
    return (this.db.prepare(`SELECT * FROM user_messages`).all() as any[]).map(m => ({ ...m, isRead: !!m.isRead })) as UserMessageRow[];
  }
  async listUserMessagesFor(username: string) {
    return (this.db.prepare(`SELECT * FROM user_messages WHERE recipient = 'All' OR recipient = ?`).all(username) as any[])
      .map(m => ({ ...m, isRead: !!m.isRead })) as UserMessageRow[];
  }
  async addUserMessage(m: UserMessageRow) {
    this.db.prepare(`INSERT INTO user_messages (id, sender, recipient, title, body, date, isRead, type) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`)
      .run(m.id, m.sender, m.recipient, m.title, m.body, m.date, m.isRead ? 1 : 0, m.type);
  }
  async setUserMessageRead(id: string) { this.db.prepare(`UPDATE user_messages SET isRead = 1 WHERE id = ?`).run(id); }
  async getUserMessageById(id: string) {
    const row = this.db.prepare(`SELECT * FROM user_messages WHERE id = ?`).get(id) as any;
    return row ? { ...row, isRead: !!row.isRead } : undefined;
  }

  // ---- Themes ----
  async listThemes() { return this.db.prepare(`SELECT * FROM themes`).all() as ThemeRow[]; }
  async createTheme(t: ThemeRow) {
    this.db.prepare(`INSERT OR IGNORE INTO themes (id, name, nameEn, primaryColor, primaryHover, darkBg, darkCard, accentRed) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`)
      .run(t.id, t.name, t.nameEn, t.primaryColor, t.primaryHover, t.darkBg, t.darkCard, t.accentRed);
  }

  // ---- App sliders ----
  async listSliders() { return this.db.prepare(`SELECT * FROM app_sliders`).all() as SliderRow[]; }
  async getSliderById(id: string) { return this.db.prepare(`SELECT * FROM app_sliders WHERE id = ?`).get(id) as SliderRow | undefined; }
  async createSlider(s: SliderRow) {
    this.db.prepare(`INSERT INTO app_sliders (id, imageUrl, mobileImageUrl, target, titleFa, titleEn, titleRu, titleTr, descFa, descEn, descRu, descTr) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .run(s.id, s.imageUrl, s.mobileImageUrl ?? null, s.target, s.titleFa, s.titleEn, s.titleRu, s.titleTr, s.descFa ?? '', s.descEn ?? '', s.descRu ?? '', s.descTr ?? '');
  }
  async updateSlider(id: string, f: Partial<SliderRow>) {
    const current = await this.getSliderById(id);
    if (!current) return;
    const m = { ...current, ...f };
    this.db.prepare(`UPDATE app_sliders SET imageUrl=?, mobileImageUrl=?, target=?, titleFa=?, titleEn=?, titleRu=?, titleTr=?, descFa=?, descEn=?, descRu=?, descTr=? WHERE id=?`)
      .run(m.imageUrl, m.mobileImageUrl ?? null, m.target, m.titleFa, m.titleEn, m.titleRu, m.titleTr, m.descFa ?? '', m.descEn ?? '', m.descRu ?? '', m.descTr ?? '', id);
  }
  async deleteSlider(id: string) { this.db.prepare(`DELETE FROM app_sliders WHERE id = ?`).run(id); }

  // ---- Seeding ----
  async seedMinimal(adminUser: AdminSeedInput): Promise<void> {
    await this.createDatabaseIfNotExist();
    const passwordHash = await hashPassword(adminUser.password || 'admin');
    this.db.prepare(`INSERT OR REPLACE INTO users (username, passwordHash, email, phone, loyaltyPoints, role) VALUES (?, ?, ?, ?, 1000, 'admin')`)
      .run(adminUser.username || 'admin', passwordHash, adminUser.email || 'admin@gamenet.com', adminUser.phone || '09120000000');
    await this.setSetting('activeThemeId', 'dark-gold');
    for (const theme of DEFAULT_THEMES) await this.createTheme(theme);
    await seedAffiliateSettings(this);
    logDbQuery(this.name, 'SYSTEM', 'Minimal database initialized with Admin user (password hashed with bcrypt).');
  }

  async seedSampleData(): Promise<void> {
    for (const room of SAMPLE_CHAT_ROOMS) await this.createChatRoom(room);
    for (const s of SAMPLE_SYSTEMS) await this.createSystem(s);
    for (const c of SAMPLE_CAFE_ITEMS) await this.createCafeItem(c);
    for (const a of SAMPLE_ACCESSORIES) await this.createAccessory(a);
    for (const s of SAMPLE_SLIDERS) await this.createSlider(s);
    for (const a of SAMPLE_ARTICLES) await this.createArticle(a);
    for (const t of SAMPLE_TOURNAMENTS) await this.createTournament(t);
    for (const l of SAMPLE_RESERVATION_LOGS) await this.addReservationLog(l);
    logDbQuery(this.name, 'SYSTEM', 'Sample data seeded successfully.');
  }

  async purgeSampleData(): Promise<void> {
    this.db.exec(`
      DELETE FROM systems; DELETE FROM cafe_items; DELETE FROM accessories;
      DELETE FROM tournaments; DELETE FROM articles; DELETE FROM chat_rooms;
      DELETE FROM reservation_logs; DELETE FROM app_sliders;
      DELETE FROM chat_messages; DELETE FROM cafe_orders; DELETE FROM shop_orders;
    `);
    logDbQuery(this.name, 'SYSTEM', 'Sample data purged (admin account & themes kept).');
  }
}

// =============================================================================
// 2. SQL SERVER STORE — real connection via the `mssql` driver
// =============================================================================
export class SqlServerStore implements IDataStore {
  name = 'SQLServer';
  isConnected = false;
  config: any = {};
  private pool: any;
  private sql: any;

  private buildConfig() {
    if (this.config.connectionString) return this.config.connectionString;
    return {
      server: this.config.host || 'localhost',
      port: Number(this.config.port) || 1433,
      database: this.config.dbName || 'BazinoDb',
      user: this.config.username,
      password: this.config.password,
      options: {
        encrypt: this.config.encrypt !== false,
        trustServerCertificate: this.config.trustServerCertificate !== false,
      },
    };
  }

  async connect(): Promise<{ success: boolean; message: string }> {
    this.sql = require('mssql');
    this.pool = await this.sql.connect(this.buildConfig());
    this.isConnected = true;
    logDbQuery(this.name, 'SYSTEM', `Connected to SQL Server: ${this.config.host || 'localhost'}/${this.config.dbName || 'BazinoDb'}`);
    return { success: true, message: 'Connected to Microsoft SQL Server successfully.' };
  }

  async createDatabaseIfNotExist(): Promise<{ success: boolean; message: string }> {
    const dbName = this.config.dbName || 'BazinoDb';
    // Connect to master to create the database if missing, then reconnect to the target db
    const masterConfig = { ...this.buildConfig(), database: 'master' };
    const masterPool = await this.sql.connect(masterConfig);
    await masterPool.request().query(`IF NOT EXISTS (SELECT * FROM sys.databases WHERE name = N'${dbName}') CREATE DATABASE [${dbName}]`);
    await masterPool.close();

    // Re-connect to the actual target database
    if (this.pool) await this.pool.close();
    this.pool = await this.sql.connect(this.buildConfig());

    const req = this.pool.request();
    await req.query(`
      IF OBJECT_ID('dbo.users','U') IS NULL CREATE TABLE dbo.users (username NVARCHAR(100) PRIMARY KEY, passwordHash NVARCHAR(200) NOT NULL, email NVARCHAR(200), phone NVARCHAR(50), loyaltyPoints INT DEFAULT 0, role NVARCHAR(50) DEFAULT 'gamer');
      IF OBJECT_ID('dbo.settings','U') IS NULL CREATE TABLE dbo.settings ([key] NVARCHAR(100) PRIMARY KEY, value NVARCHAR(MAX));
      IF OBJECT_ID('dbo.chat_rooms','U') IS NULL CREATE TABLE dbo.chat_rooms ([name] NVARCHAR(200) PRIMARY KEY);
      IF OBJECT_ID('dbo.chat_messages','U') IS NULL CREATE TABLE dbo.chat_messages (id NVARCHAR(50) PRIMARY KEY, room NVARCHAR(200), username NVARCHAR(100), message NVARCHAR(MAX), timestamp NVARCHAR(50));
      IF OBJECT_ID('dbo.transactions','U') IS NULL CREATE TABLE dbo.transactions (id NVARCHAR(50) PRIMARY KEY, points INT, description NVARCHAR(MAX), type NVARCHAR(50), date NVARCHAR(50));
      IF OBJECT_ID('dbo.active_coupons','U') IS NULL CREATE TABLE dbo.active_coupons (code NVARCHAR(50) PRIMARY KEY, type NVARCHAR(20), value FLOAT, minOrder FLOAT, expiry NVARCHAR(50), expiryDate NVARCHAR(50), maxUsageCount INT DEFAULT 1, usageCount INT DEFAULT 0, isActive BIT DEFAULT 1);
      IF OBJECT_ID('dbo.systems','U') IS NULL CREATE TABLE dbo.systems (id NVARCHAR(50) PRIMARY KEY, name NVARCHAR(200), type NVARCHAR(50), hourlyRate FLOAT, isActive BIT DEFAULT 1, isReserved BIT DEFAULT 0);
      IF OBJECT_ID('dbo.reservation_logs','U') IS NULL CREATE TABLE dbo.reservation_logs (id NVARCHAR(50) PRIMARY KEY, systemId NVARCHAR(50), username NVARCHAR(100), systemName NVARCHAR(200), startTime NVARCHAR(20), endTime NVARCHAR(20), totalPrice FLOAT, date NVARCHAR(50), checkedIn BIT DEFAULT 0, timestamp NVARCHAR(50));
      IF OBJECT_ID('dbo.cafe_items','U') IS NULL CREATE TABLE dbo.cafe_items (id NVARCHAR(50) PRIMARY KEY, name NVARCHAR(200), category NVARCHAR(50), price FLOAT, imageUrl NVARCHAR(500), mobileImageUrl NVARCHAR(500), inventory INT, isAvailable BIT DEFAULT 1);
      IF OBJECT_ID('dbo.cafe_orders','U') IS NULL CREATE TABLE dbo.cafe_orders (id NVARCHAR(50) PRIMARY KEY, items NVARCHAR(MAX), totalPrice FLOAT, discountApplied FLOAT, finalAmount FLOAT, couponCode NVARCHAR(50), tableNumber NVARCHAR(50), date NVARCHAR(50), status NVARCHAR(50));
      IF OBJECT_ID('dbo.accessories','U') IS NULL CREATE TABLE dbo.accessories (id NVARCHAR(50) PRIMARY KEY, name NVARCHAR(200), description NVARCHAR(MAX), price FLOAT, imageUrl NVARCHAR(500), mobileImageUrl NVARCHAR(500), stock INT, category NVARCHAR(50));
      IF OBJECT_ID('dbo.shop_orders','U') IS NULL CREATE TABLE dbo.shop_orders (id NVARCHAR(50) PRIMARY KEY, cart NVARCHAR(MAX), totalPrice FLOAT, discountApplied FLOAT, finalAmount FLOAT, couponCode NVARCHAR(50), date NVARCHAR(50), status NVARCHAR(50));
      IF OBJECT_ID('dbo.tournaments','U') IS NULL CREATE TABLE dbo.tournaments (id NVARCHAR(50) PRIMARY KEY, title NVARCHAR(200), game NVARCHAR(100), registrationFee FLOAT, startDate NVARCHAR(50), maxTeams INT, status NVARCHAR(50), registeredTeamsCount INT, teams NVARCHAR(MAX), bracket NVARCHAR(MAX));
      IF OBJECT_ID('dbo.articles','U') IS NULL CREATE TABLE dbo.articles (id NVARCHAR(50) PRIMARY KEY, title NVARCHAR(300), content NVARCHAR(MAX), category NVARCHAR(50), imageUrl NVARCHAR(500), mobileImageUrl NVARCHAR(500), author NVARCHAR(100), date NVARCHAR(50), comments NVARCHAR(MAX));
      IF OBJECT_ID('dbo.user_messages','U') IS NULL CREATE TABLE dbo.user_messages (id NVARCHAR(50) PRIMARY KEY, sender NVARCHAR(100), recipient NVARCHAR(100), title NVARCHAR(200), body NVARCHAR(MAX), date NVARCHAR(50), isRead BIT DEFAULT 0, type NVARCHAR(50));
      IF OBJECT_ID('dbo.themes','U') IS NULL CREATE TABLE dbo.themes (id NVARCHAR(50) PRIMARY KEY, name NVARCHAR(100), nameEn NVARCHAR(100), primaryColor NVARCHAR(20), primaryHover NVARCHAR(20), darkBg NVARCHAR(20), darkCard NVARCHAR(20), accentRed NVARCHAR(20));
      IF OBJECT_ID('dbo.payment_orders','U') IS NULL CREATE TABLE dbo.payment_orders (merchantOid NVARCHAR(64) PRIMARY KEY, kind NVARCHAR(50), username NVARCHAR(100), email NVARCHAR(200), amountKurus BIGINT, currency NVARCHAR(10), status NVARCHAR(30), provider NVARCHAR(30), payload NVARCHAR(MAX), result NVARCHAR(MAX), totalAmountKurus BIGINT DEFAULT 0, failedCode NVARCHAR(20) DEFAULT '', failedMsg NVARCHAR(500) DEFAULT '', createdAt NVARCHAR(50), updatedAt NVARCHAR(50));
      IF OBJECT_ID('dbo.app_sliders','U') IS NULL CREATE TABLE dbo.app_sliders (id NVARCHAR(50) PRIMARY KEY, imageUrl NVARCHAR(500), mobileImageUrl NVARCHAR(500), target NVARCHAR(50), titleFa NVARCHAR(300), titleEn NVARCHAR(300), titleRu NVARCHAR(300), titleTr NVARCHAR(300));
    `);
    logDbQuery(this.name, 'SQL', `Schema verified on database [${dbName}] (17 tables).`);

    // Columns introduced after the initial schema — added to pre-existing tables.
    await this.r().query(`
      IF COL_LENGTH('dbo.cafe_items','mobileImageUrl') IS NULL ALTER TABLE dbo.cafe_items ADD mobileImageUrl NVARCHAR(500) NULL;
      IF COL_LENGTH('dbo.accessories','mobileImageUrl') IS NULL ALTER TABLE dbo.accessories ADD mobileImageUrl NVARCHAR(500) NULL;
      IF COL_LENGTH('dbo.articles','mobileImageUrl') IS NULL ALTER TABLE dbo.articles ADD mobileImageUrl NVARCHAR(500) NULL;
      IF COL_LENGTH('dbo.app_sliders','mobileImageUrl') IS NULL ALTER TABLE dbo.app_sliders ADD mobileImageUrl NVARCHAR(500) NULL;
      IF COL_LENGTH('dbo.app_sliders','descFa') IS NULL ALTER TABLE dbo.app_sliders ADD descFa NVARCHAR(1000) NULL;
      IF COL_LENGTH('dbo.app_sliders','descEn') IS NULL ALTER TABLE dbo.app_sliders ADD descEn NVARCHAR(1000) NULL;
      IF COL_LENGTH('dbo.app_sliders','descRu') IS NULL ALTER TABLE dbo.app_sliders ADD descRu NVARCHAR(1000) NULL;
      IF COL_LENGTH('dbo.app_sliders','descTr') IS NULL ALTER TABLE dbo.app_sliders ADD descTr NVARCHAR(1000) NULL;
      IF COL_LENGTH('dbo.users','displayName') IS NULL ALTER TABLE dbo.users ADD displayName NVARCHAR(100) NULL;
      IF COL_LENGTH('dbo.users','avatarUrl') IS NULL ALTER TABLE dbo.users ADD avatarUrl NVARCHAR(500) NULL;
      IF COL_LENGTH('dbo.users','bio') IS NULL ALTER TABLE dbo.users ADD bio NVARCHAR(1000) NULL;
      IF COL_LENGTH('dbo.users','gamerTag') IS NULL ALTER TABLE dbo.users ADD gamerTag NVARCHAR(60) NULL;
      IF COL_LENGTH('dbo.users','city') IS NULL ALTER TABLE dbo.users ADD city NVARCHAR(100) NULL;
      IF COL_LENGTH('dbo.users','birthDate') IS NULL ALTER TABLE dbo.users ADD birthDate NVARCHAR(20) NULL;
      IF COL_LENGTH('dbo.users','phoneVerifiedAt') IS NULL ALTER TABLE dbo.users ADD phoneVerifiedAt NVARCHAR(50) NULL;
      IF COL_LENGTH('dbo.users','hasPassword') IS NULL ALTER TABLE dbo.users ADD hasPassword INT DEFAULT 1;
      IF COL_LENGTH('dbo.users','createdAt') IS NULL ALTER TABLE dbo.users ADD createdAt NVARCHAR(50) NULL;
      IF COL_LENGTH('dbo.users','walletBalance') IS NULL ALTER TABLE dbo.users ADD walletBalance FLOAT DEFAULT 0;
      IF OBJECT_ID('dbo.wallet_transactions','U') IS NULL CREATE TABLE dbo.wallet_transactions (id NVARCHAR(40) PRIMARY KEY, username NVARCHAR(100), amount FLOAT, type NVARCHAR(20), ref NVARCHAR(100) DEFAULT '', operator NVARCHAR(100) DEFAULT '', note NVARCHAR(500) DEFAULT '', idempotencyKey NVARCHAR(100) DEFAULT '', balanceAfter FLOAT, createdAt NVARCHAR(50));
      IF OBJECT_ID('dbo.onsite_orders','U') IS NULL CREATE TABLE dbo.onsite_orders (id NVARCHAR(40) PRIMARY KEY, kind NVARCHAR(20), username NVARCHAR(100), amount FLOAT, status NVARCHAR(30), dueAt NVARCHAR(50) DEFAULT '', payload NVARCHAR(MAX), description NVARCHAR(500), result NVARCHAR(MAX), createdAt NVARCHAR(50), updatedAt NVARCHAR(50), settledAt NVARCHAR(50) DEFAULT '', settledBy NVARCHAR(100) DEFAULT '');
      IF COL_LENGTH('dbo.cafe_orders','username') IS NULL ALTER TABLE dbo.cafe_orders ADD username NVARCHAR(100) NULL;
      IF COL_LENGTH('dbo.shop_orders','username') IS NULL ALTER TABLE dbo.shop_orders ADD username NVARCHAR(100) NULL;
      IF OBJECT_ID('dbo.otp_codes','U') IS NULL CREATE TABLE dbo.otp_codes (id NVARCHAR(40) PRIMARY KEY, phone NVARCHAR(30), codeHash NVARCHAR(128), ip NVARCHAR(64), purpose NVARCHAR(20), createdAt NVARCHAR(50), expiresAt NVARCHAR(50), attempts INT DEFAULT 0, consumedAt NVARCHAR(50) DEFAULT '');
      IF OBJECT_ID('dbo.tickets','U') IS NULL CREATE TABLE dbo.tickets (id NVARCHAR(40) PRIMARY KEY, username NVARCHAR(100), subject NVARCHAR(200), category NVARCHAR(30), priority NVARCHAR(20), status NVARCHAR(30), createdAt NVARCHAR(50), updatedAt NVARCHAR(50), lastStaffReplyAt NVARCHAR(50) DEFAULT '', userSeenAt NVARCHAR(50) DEFAULT '');
      IF OBJECT_ID('dbo.ticket_messages','U') IS NULL CREATE TABLE dbo.ticket_messages (id NVARCHAR(40) PRIMARY KEY, ticketId NVARCHAR(40), author NVARCHAR(100), isStaff INT DEFAULT 0, body NVARCHAR(MAX), createdAt NVARCHAR(50));
      IF COL_LENGTH('dbo.transactions','username') IS NULL ALTER TABLE dbo.transactions ADD username NVARCHAR(100) NOT NULL DEFAULT '';
      IF COL_LENGTH('dbo.active_coupons','ownerUsername') IS NULL ALTER TABLE dbo.active_coupons ADD ownerUsername NVARCHAR(100) NOT NULL DEFAULT '';
      IF OBJECT_ID('dbo.affiliates','U') IS NULL CREATE TABLE dbo.affiliates (id NVARCHAR(40) PRIMARY KEY, code NVARCHAR(20) UNIQUE, username NVARCHAR(100) DEFAULT '', name NVARCHAR(200), type NVARCHAR(30) DEFAULT 'gamer', language NVARCHAR(10) DEFAULT 'tr', destination NVARCHAR(200) DEFAULT '/', parentId NVARCHAR(40) DEFAULT '', status NVARCHAR(20) DEFAULT 'active', newPct FLOAT DEFAULT -1, returnPct FLOAT DEFAULT -1, tournamentPct FLOAT DEFAULT -1, overridePct FLOAT DEFAULT -1, notes NVARCHAR(MAX) DEFAULT '', createdAt NVARCHAR(50), updatedAt NVARCHAR(50));
      IF OBJECT_ID('dbo.affiliate_clicks','U') IS NULL CREATE TABLE dbo.affiliate_clicks (id NVARCHAR(40) PRIMARY KEY, code NVARCHAR(20), path NVARCHAR(200), ipHash NVARCHAR(64), uaHash NVARCHAR(64), visitorId NVARCHAR(80) DEFAULT '', createdAt NVARCHAR(50));
      IF OBJECT_ID('dbo.affiliate_attributions','U') IS NULL CREATE TABLE dbo.affiliate_attributions (id NVARCHAR(40) PRIMARY KEY, username NVARCHAR(100) DEFAULT '', visitorId NVARCHAR(80) DEFAULT '', code NVARCHAR(20), source NVARCHAR(20), expiresAt NVARCHAR(50), createdAt NVARCHAR(50), updatedAt NVARCHAR(50));
      IF OBJECT_ID('dbo.affiliate_commissions','U') IS NULL CREATE TABLE dbo.affiliate_commissions (id NVARCHAR(40) PRIMARY KEY, affiliateId NVARCHAR(40), code NVARCHAR(20), username NVARCHAR(100), orderId NVARCHAR(40), kind NVARCHAR(20), eventType NVARCHAR(20), netAmount FLOAT, ratePct FLOAT, commissionAmount FLOAT, status NVARCHAR(20), holdUntil NVARCHAR(50) DEFAULT '', flag NVARCHAR(40) DEFAULT '', walletTxId NVARCHAR(40) DEFAULT '', parentCommissionId NVARCHAR(40) DEFAULT '', createdAt NVARCHAR(50), updatedAt NVARCHAR(50), approvedAt NVARCHAR(50) DEFAULT '', paidOutAt NVARCHAR(50) DEFAULT '', reversedAt NVARCHAR(50) DEFAULT '', note NVARCHAR(500) DEFAULT '', attendedAt NVARCHAR(50) DEFAULT '');
      IF OBJECT_ID('dbo.affiliate_audit','U') IS NULL CREATE TABLE dbo.affiliate_audit (id NVARCHAR(40) PRIMARY KEY, affiliateId NVARCHAR(40), commissionId NVARCHAR(40) DEFAULT '', actor NVARCHAR(100), action NVARCHAR(30), fromStatus NVARCHAR(20) DEFAULT '', toStatus NVARCHAR(20) DEFAULT '', detail NVARCHAR(MAX) DEFAULT '', createdAt NVARCHAR(50));
    `);
    logDbQuery(this.name, 'SQL', 'Verified mobileImageUrl columns (cafe_items, accessories, articles, app_sliders).');

    return { success: true, message: `SQL Server database [${dbName}] and schema verified/created.` };
  }

  private r() { return this.pool.request(); }

  // ---- Users ----
  async getUserByUsername(username: string) {
    const res = await this.r().input('u', this.sql.NVarChar, username).query(`SELECT * FROM dbo.users WHERE LOWER(username) = LOWER(@u)`);
    return res.recordset[0] as UserRow | undefined;
  }
  async createUser(u: { username: string; password: string; email: string; phone: string }) {
    const passwordHash = await hashPassword(u.password);
    await this.r().input('u', this.sql.NVarChar, u.username).input('p', this.sql.NVarChar, passwordHash)
      .input('e', this.sql.NVarChar, u.email).input('ph', this.sql.NVarChar, u.phone || '')
      .query(`INSERT INTO dbo.users (username, passwordHash, email, phone, loyaltyPoints, role) VALUES (@u, @p, @e, @ph, 100, 'gamer')`);
  }
  async verifyLogin(username: string, password: string) {
    const row = await this.getUserByUsername(username);
    if (!row) return undefined;
    return (await verifyPassword(password, row.passwordHash)) ? row : undefined;
  }
  async addLoyaltyPointsToUser(username: string, delta: number) {
    await this.r().input('d', this.sql.Int, delta).input('u', this.sql.NVarChar, username)
      .query(`UPDATE dbo.users SET loyaltyPoints = loyaltyPoints + @d WHERE username = @u`);
  }
  async listUsers() { return (await this.r().query(`SELECT * FROM dbo.users`)).recordset as UserRow[]; }
  async countUsers() { return (await this.r().query(`SELECT COUNT(*) as c FROM dbo.users`)).recordset[0].c; }

  // ---- Settings ----
  async getSetting(key: string) {
    const res = await this.r().input('k', this.sql.NVarChar, key).query(`SELECT value FROM dbo.settings WHERE [key] = @k`);
    return res.recordset[0]?.value;
  }
  async setSetting(key: string, value: string) {
    await this.r().input('k', this.sql.NVarChar, key).input('v', this.sql.NVarChar, value).query(`
      MERGE dbo.settings AS target USING (SELECT @k AS [key]) AS src ON target.[key] = src.[key]
      WHEN MATCHED THEN UPDATE SET value = @v
      WHEN NOT MATCHED THEN INSERT ([key], value) VALUES (@k, @v);
    `);
  }
  async listSettings() { return (await this.r().query(`SELECT * FROM dbo.settings`)).recordset as SettingRow[]; }

  // ---- Chat ----
  async listChatRooms() { return (await this.r().query(`SELECT name FROM dbo.chat_rooms`)).recordset.map((r: any) => r.name); }
  async createChatRoom(name: string) {
    await this.r().input('n', this.sql.NVarChar, name).query(`IF NOT EXISTS (SELECT 1 FROM dbo.chat_rooms WHERE name=@n) INSERT INTO dbo.chat_rooms (name) VALUES (@n)`);
  }
  async deleteChatRoom(name: string) { await this.r().input('n', this.sql.NVarChar, name).query(`DELETE FROM dbo.chat_rooms WHERE name = @n`); }
  async listChatMessages(room: string) {
    return (await this.r().input('r', this.sql.NVarChar, room).query(`SELECT * FROM dbo.chat_messages WHERE room = @r`)).recordset as ChatMessageRow[];
  }
  async addChatMessage(m: ChatMessageRow) {
    await this.r().input('id', this.sql.NVarChar, m.id).input('room', this.sql.NVarChar, m.room).input('u', this.sql.NVarChar, m.username)
      .input('msg', this.sql.NVarChar, m.message).input('ts', this.sql.NVarChar, m.timestamp)
      .query(`INSERT INTO dbo.chat_messages (id, room, username, message, timestamp) VALUES (@id, @room, @u, @msg, @ts)`);
  }

  // ---- Transactions ----
  async listTransactions() { return (await this.r().query(`SELECT * FROM dbo.transactions`)).recordset as TransactionRow[]; }
  async addTransaction(tx: TransactionRow) {
    await this.r().input('id', this.sql.NVarChar, tx.id).input('p', this.sql.Int, tx.points).input('d', this.sql.NVarChar, tx.description)
      .input('t', this.sql.NVarChar, tx.type).input('dt', this.sql.NVarChar, tx.date)
      .input('u', this.sql.NVarChar, tx.username || '')
      .query(`INSERT INTO dbo.transactions (id, points, description, type, date, username) VALUES (@id, @p, @d, @t, @dt, @u)`);
  }

  // ---- Coupons ----
  async listCoupons() { return (await this.r().query(`SELECT * FROM dbo.active_coupons`)).recordset.map((c: any) => ({ ...c, isActive: !!c.isActive })) as CouponRow[]; }
  async getCouponByCode(code: string) {
    const res = await this.r().input('c', this.sql.NVarChar, code).query(`SELECT * FROM dbo.active_coupons WHERE UPPER(code) = UPPER(@c)`);
    const row = res.recordset[0];
    return row ? { ...row, isActive: !!row.isActive } : undefined;
  }
  async createCoupon(c: CouponRow) {
    await this.r().input('c', this.sql.NVarChar, c.code).input('t', this.sql.NVarChar, c.type).input('v', this.sql.Float, c.value)
      .input('m', this.sql.Float, c.minOrder).input('e', this.sql.NVarChar, c.expiry)
      .input('ed', this.sql.NVarChar, c.expiryDate || new Date(Date.now() + 30 * 86400000).toISOString())
      .input('mu', this.sql.Int, c.maxUsageCount || 1)
      .input('own', this.sql.NVarChar, c.ownerUsername || '')
      .query(`INSERT INTO dbo.active_coupons (code, type, value, minOrder, expiry, expiryDate, maxUsageCount, usageCount, isActive, ownerUsername) VALUES (@c, @t, @v, @m, @e, @ed, @mu, 0, 1, @own)`);
  }
  async deactivateCoupon(code: string) { await this.r().input('c', this.sql.NVarChar, code).query(`UPDATE dbo.active_coupons SET isActive = 0 WHERE code = @c`); }
  // یک UPDATE شرطی — رجوع کنید به توضیح نسخه‌ی SQLite درباره‌ی مصرف هم‌زمان.
  async recordCouponUsage(code: string) {
    const res = await this.r().input('c', this.sql.NVarChar, code).query(`
      UPDATE dbo.active_coupons
         SET usageCount = usageCount + 1,
             isActive   = CASE WHEN usageCount + 1 >= maxUsageCount THEN 0 ELSE isActive END
       WHERE code = @c AND isActive = 1 AND usageCount < maxUsageCount;
    `);
    return (res.rowsAffected?.[0] ?? 0) > 0;
  }
  async deactivateLegacyOwnerlessLoyaltyCoupons() {
    const res = await this.r().query(`
      UPDATE dbo.active_coupons SET isActive = 0
       WHERE isActive = 1 AND (ownerUsername IS NULL OR ownerUsername = '') AND code LIKE 'LOYAL-%';
    `);
    return res.rowsAffected?.[0] ?? 0;
  }

  // ---- Systems ----
  async listSystems() { return (await this.r().query(`SELECT * FROM dbo.systems`)).recordset.map((s: any) => ({ ...s, isActive: !!s.isActive, isReserved: !!s.isReserved })) as SystemRow[]; }
  async getSystemById(id: string) {
    const res = await this.r().input('id', this.sql.NVarChar, id).query(`SELECT * FROM dbo.systems WHERE id = @id`);
    const row = res.recordset[0];
    return row ? { ...row, isActive: !!row.isActive, isReserved: !!row.isReserved } : undefined;
  }
  async createSystem(s: SystemRow) {
    await this.r().input('id', this.sql.NVarChar, s.id).input('n', this.sql.NVarChar, s.name).input('t', this.sql.NVarChar, s.type)
      .input('hr', this.sql.Float, s.hourlyRate).input('a', this.sql.Bit, s.isActive).input('rv', this.sql.Bit, s.isReserved)
      .query(`INSERT INTO dbo.systems (id, name, type, hourlyRate, isActive, isReserved) VALUES (@id, @n, @t, @hr, @a, @rv)`);
  }
  async updateSystem(id: string, f: Partial<SystemRow>) {
    const current = await this.getSystemById(id);
    if (!current) return;
    const m = { ...current, ...f };
    await this.r().input('id', this.sql.NVarChar, id).input('n', this.sql.NVarChar, m.name).input('t', this.sql.NVarChar, m.type)
      .input('hr', this.sql.Float, m.hourlyRate).input('a', this.sql.Bit, m.isActive).input('rv', this.sql.Bit, m.isReserved)
      .query(`UPDATE dbo.systems SET name=@n, type=@t, hourlyRate=@hr, isActive=@a, isReserved=@rv WHERE id=@id`);
  }
  async setSystemReserved(id: string, reserved: boolean) {
    await this.r().input('id', this.sql.NVarChar, id).input('rv', this.sql.Bit, reserved).query(`UPDATE dbo.systems SET isReserved = @rv WHERE id = @id`);
  }
  async deleteSystem(id: string) { await this.r().input('id', this.sql.NVarChar, id).query(`DELETE FROM dbo.systems WHERE id = @id`); }
  async countSystems() { return (await this.r().query(`SELECT COUNT(*) as c FROM dbo.systems`)).recordset[0].c; }

  // ---- Reservations ----
  async listReservationLogs() { return (await this.r().query(`SELECT * FROM dbo.reservation_logs`)).recordset.map((l: any) => ({ ...l, checkedIn: !!l.checkedIn })) as ReservationLogRow[]; }
  async listPendingReservationLogs() {
    return (await this.r().query(`SELECT * FROM dbo.reservation_logs WHERE checkedIn = 0`)).recordset.map((l: any) => ({ ...l, checkedIn: !!l.checkedIn })) as ReservationLogRow[];
  }
  async getReservationLogById(id: string) {
    const res = await this.r().input('id', this.sql.NVarChar, id).query(`SELECT * FROM dbo.reservation_logs WHERE id = @id`);
    const row = res.recordset[0];
    return row ? { ...row, checkedIn: !!row.checkedIn } : undefined;
  }
  async addReservationLog(l: ReservationLogRow) {
    await this.r().input('id', this.sql.NVarChar, l.id).input('sid', this.sql.NVarChar, l.systemId)
      .input('un', this.sql.NVarChar, l.username || '')
      .input('sn', this.sql.NVarChar, l.systemName).input('st', this.sql.NVarChar, l.startTime).input('et', this.sql.NVarChar, l.endTime)
      .input('tp', this.sql.Float, l.totalPrice).input('d', this.sql.NVarChar, l.date).input('ci', this.sql.Bit, l.checkedIn).input('ts', this.sql.NVarChar, l.timestamp)
      .query(`INSERT INTO dbo.reservation_logs (id, systemId, username, systemName, startTime, endTime, totalPrice, date, checkedIn, timestamp) VALUES (@id, @sid, @un, @sn, @st, @et, @tp, @d, @ci, @ts)`);
  }
  async setReservationCheckedIn(id: string) { await this.r().input('id', this.sql.NVarChar, id).query(`UPDATE dbo.reservation_logs SET checkedIn = 1 WHERE id = @id`); }
  async deleteReservationLog(id: string) { await this.r().input('id', this.sql.NVarChar, id).query(`DELETE FROM dbo.reservation_logs WHERE id = @id`); }
  async countReservationLogs() { return (await this.r().query(`SELECT COUNT(*) as c FROM dbo.reservation_logs`)).recordset[0].c; }
  async extendReservation(id: string, newEndTime: string, additionalPrice: number) {
    await this.r().input('id', this.sql.NVarChar, id).input('et', this.sql.NVarChar, newEndTime).input('ap', this.sql.Float, additionalPrice)
      .query(`UPDATE dbo.reservation_logs SET endTime = @et, totalPrice = totalPrice + @ap WHERE id = @id`);
  }
  async getActiveReservationForUser(username: string) {
    const res = await this.r().input('u', this.sql.NVarChar, username)
      .query(`SELECT TOP 1 * FROM dbo.reservation_logs WHERE username = @u AND checkedIn = 0 ORDER BY timestamp DESC`);
    const row = res.recordset[0];
    return row ? { ...row, checkedIn: !!row.checkedIn } : undefined;
  }
  async hasOverlappingReservation(systemId: string, date: string, startTime: string, endTime: string) {
    const res = await this.r().input('sid', this.sql.NVarChar, systemId).input('d', this.sql.NVarChar, date)
      .input('st', this.sql.NVarChar, startTime).input('et', this.sql.NVarChar, endTime)
      .query(`SELECT COUNT(*) as c FROM dbo.reservation_logs WHERE systemId=@sid AND date=@d AND checkedIn=0 AND startTime < @et AND endTime > @st`);
    return res.recordset[0].c > 0;
  }

  // ---- Cafe ----
  async listCafeItems() { return (await this.r().query(`SELECT * FROM dbo.cafe_items`)).recordset.map((i: any) => ({ ...i, isAvailable: !!i.isAvailable })) as CafeItemRow[]; }
  async getCafeItemById(id: string) {
    const res = await this.r().input('id', this.sql.NVarChar, id).query(`SELECT * FROM dbo.cafe_items WHERE id = @id`);
    const row = res.recordset[0];
    return row ? { ...row, isAvailable: !!row.isAvailable } : undefined;
  }
  async createCafeItem(i: CafeItemRow) {
    await this.r().input('id', this.sql.NVarChar, i.id).input('n', this.sql.NVarChar, i.name).input('c', this.sql.NVarChar, i.category)
      .input('p', this.sql.Float, i.price).input('img', this.sql.NVarChar, i.imageUrl).input('mimg', this.sql.NVarChar, i.mobileImageUrl ?? null).input('inv', this.sql.Int, i.inventory).input('a', this.sql.Bit, i.isAvailable)
      .query(`INSERT INTO dbo.cafe_items (id, name, category, price, imageUrl, mobileImageUrl, inventory, isAvailable) VALUES (@id, @n, @c, @p, @img, @mimg, @inv, @a)`);
  }
  async updateCafeItem(id: string, f: Partial<CafeItemRow>) {
    const current = await this.getCafeItemById(id);
    if (!current) return;
    const m = { ...current, ...f };
    await this.r().input('id', this.sql.NVarChar, id).input('n', this.sql.NVarChar, m.name).input('c', this.sql.NVarChar, m.category)
      .input('p', this.sql.Float, m.price).input('img', this.sql.NVarChar, m.imageUrl).input('mimg', this.sql.NVarChar, m.mobileImageUrl ?? null).input('inv', this.sql.Int, m.inventory).input('a', this.sql.Bit, m.isAvailable)
      .query(`UPDATE dbo.cafe_items SET name=@n, category=@c, price=@p, imageUrl=@img, mobileImageUrl=@mimg, inventory=@inv, isAvailable=@a WHERE id=@id`);
  }
  async decrementCafeInventory(id: string, qty: number) {
    await this.r().input('q', this.sql.Int, qty).input('id', this.sql.NVarChar, id)
      .query(`UPDATE dbo.cafe_items SET inventory = CASE WHEN inventory - @q < 0 THEN 0 ELSE inventory - @q END WHERE id = @id`);
  }
  async deleteCafeItem(id: string) { await this.r().input('id', this.sql.NVarChar, id).query(`DELETE FROM dbo.cafe_items WHERE id = @id`); }
  async countCafeItems() { return (await this.r().query(`SELECT COUNT(*) as c FROM dbo.cafe_items`)).recordset[0].c; }

  async listCafeOrders() { return (await this.r().query(`SELECT * FROM dbo.cafe_orders`)).recordset as CafeOrderRow[]; }
  async getCafeOrderById(id: string) { return (await this.r().input('id', this.sql.NVarChar, id).query(`SELECT * FROM dbo.cafe_orders WHERE id = @id`)).recordset[0]; }
  async addCafeOrder(o: CafeOrderRow) {
    await this.r().input('id', this.sql.NVarChar, o.id).input('items', this.sql.NVarChar, o.items).input('tp', this.sql.Float, o.totalPrice)
      .input('da', this.sql.Float, o.discountApplied).input('fa', this.sql.Float, o.finalAmount).input('cc', this.sql.NVarChar, o.couponCode)
      .input('tn', this.sql.NVarChar, o.tableNumber).input('d', this.sql.NVarChar, o.date).input('s', this.sql.NVarChar, o.status).input('u', this.sql.NVarChar, o.username || '')
      .query(`INSERT INTO dbo.cafe_orders (id, items, totalPrice, discountApplied, finalAmount, couponCode, tableNumber, date, status, username) VALUES (@id, @items, @tp, @da, @fa, @cc, @tn, @d, @s, @u)`);
  }
  async setCafeOrderStatus(id: string, status: string) {
    await this.r().input('s', this.sql.NVarChar, status).input('id', this.sql.NVarChar, id).query(`UPDATE dbo.cafe_orders SET status = @s WHERE id = @id`);
  }

  // ---- Payment orders (PayTR) ----
  async createPaymentOrder(o: PaymentOrderRow) {
    await this.r().input('oid', this.sql.NVarChar, o.merchantOid).input('k', this.sql.NVarChar, o.kind).input('u', this.sql.NVarChar, o.username)
      .input('e', this.sql.NVarChar, o.email).input('a', this.sql.BigInt, o.amountKurus).input('c', this.sql.NVarChar, o.currency)
      .input('s', this.sql.NVarChar, o.status).input('p', this.sql.NVarChar, o.provider).input('pl', this.sql.NVarChar, o.payload)
      .input('r', this.sql.NVarChar, o.result).input('t', this.sql.BigInt, o.totalAmountKurus).input('fc', this.sql.NVarChar, o.failedCode)
      .input('fm', this.sql.NVarChar, o.failedMsg).input('ca', this.sql.NVarChar, o.createdAt).input('ua', this.sql.NVarChar, o.updatedAt)
      .query(`INSERT INTO dbo.payment_orders (merchantOid, kind, username, email, amountKurus, currency, status, provider, payload, result, totalAmountKurus, failedCode, failedMsg, createdAt, updatedAt) VALUES (@oid, @k, @u, @e, @a, @c, @s, @p, @pl, @r, @t, @fc, @fm, @ca, @ua)`);
  }
  async getPaymentOrder(merchantOid: string) { return (await this.r().input('oid', this.sql.NVarChar, merchantOid).query(`SELECT * FROM dbo.payment_orders WHERE merchantOid = @oid`)).recordset[0]; }
  async updatePaymentOrder(merchantOid: string, f: Partial<PaymentOrderRow>) {
    // فقط نام ستون‌های شناخته‌شده وارد متن کوئری می‌شوند؛ مقادیر همگی پارامتری‌اند.
    const keys = Object.keys(f).filter(k => k !== 'merchantOid' && PAYMENT_ORDER_COLUMNS.has(k));
    if (!keys.length) return;
    const req = this.r().input('oid', this.sql.NVarChar, merchantOid);
    keys.forEach((k, i) => { const v = (f as any)[k]; req.input(`v${i}`, typeof v === 'number' ? this.sql.BigInt : this.sql.NVarChar, v); });
    const columnSet = keys.map((k, i) => k + ' = @v' + i).join(', ');
    await req.query(`UPDATE dbo.payment_orders SET ${columnSet} WHERE merchantOid = @oid`);
  }
  async listPaymentOrders(limit = 200) { return (await this.r().input('l', this.sql.Int, limit).query(`SELECT TOP (@l) * FROM dbo.payment_orders ORDER BY createdAt DESC`)).recordset as PaymentOrderRow[]; }

  // ---- Profile / OTP / Tickets (task 12) ----
  private async dynUpdate(table: string, allowed: Set<string>, keyCol: string, keyVal: string, f: Record<string, any>) {
    const keys = Object.keys(f).filter(k => allowed.has(k));
    if (!keys.length) return;
    const req = this.r().input('key', this.sql.NVarChar, keyVal);
    keys.forEach((k, i) => { const v = f[k]; req.input(`v${i}`, typeof v === 'number' ? this.sql.BigInt : this.sql.NVarChar, v); });
    const columnSet = keys.map((k, i) => k + ' = @v' + i).join(', ');
    const tableName = 'dbo.' + table; const column = keyCol;
    await req.query(`UPDATE ${tableName} SET ${columnSet} WHERE ${column} = @key`);
  }
  async updateUserFields(username: string, f: Partial<UserRow>) { await this.dynUpdate('users', USER_PROFILE_COLUMNS, 'username', username, f as any); }
  async getUserByPhone(phone: string) { return (await this.r().input('p', this.sql.NVarChar, phone).query(`SELECT * FROM dbo.users WHERE phone = @p`)).recordset[0]; }
  async createOtp(o: OtpCodeRow) {
    await this.r().input('id', this.sql.NVarChar, o.id).input('p', this.sql.NVarChar, o.phone).input('h', this.sql.NVarChar, o.codeHash).input('ip', this.sql.NVarChar, o.ip)
      .input('pu', this.sql.NVarChar, o.purpose).input('c', this.sql.NVarChar, o.createdAt).input('e', this.sql.NVarChar, o.expiresAt).input('a', this.sql.Int, o.attempts).input('co', this.sql.NVarChar, o.consumedAt)
      .query(`INSERT INTO dbo.otp_codes (id, phone, codeHash, ip, purpose, createdAt, expiresAt, attempts, consumedAt) VALUES (@id, @p, @h, @ip, @pu, @c, @e, @a, @co)`);
  }
  async listRecentOtps(fl: { phone?: string; ip?: string; since: string }) {
    return (await this.r().input('p', this.sql.NVarChar, fl.phone || '').input('ip', this.sql.NVarChar, fl.ip || '').input('s', this.sql.NVarChar, fl.since)
      .query(`SELECT * FROM dbo.otp_codes WHERE (phone = @p OR ip = @ip) AND createdAt >= @s ORDER BY createdAt DESC`)).recordset as OtpCodeRow[];
  }
  async getLatestActiveOtp(phone: string, purpose: string) {
    return (await this.r().input('p', this.sql.NVarChar, phone).input('pu', this.sql.NVarChar, purpose).query(`SELECT TOP 1 * FROM dbo.otp_codes WHERE phone = @p AND purpose = @pu AND consumedAt = '' ORDER BY createdAt DESC`)).recordset[0];
  }
  async updateOtp(id: string, f: Partial<OtpCodeRow>) { await this.dynUpdate('otp_codes', new Set(['attempts', 'consumedAt']), 'id', id, f as any); }
  async createTicket(t: TicketRow) {
    await this.r().input('id', this.sql.NVarChar, t.id).input('u', this.sql.NVarChar, t.username).input('s', this.sql.NVarChar, t.subject).input('c', this.sql.NVarChar, t.category)
      .input('p', this.sql.NVarChar, t.priority).input('st', this.sql.NVarChar, t.status).input('ca', this.sql.NVarChar, t.createdAt).input('ua', this.sql.NVarChar, t.updatedAt)
      .input('ls', this.sql.NVarChar, t.lastStaffReplyAt).input('us', this.sql.NVarChar, t.userSeenAt)
      .query(`INSERT INTO dbo.tickets (id, username, subject, category, priority, status, createdAt, updatedAt, lastStaffReplyAt, userSeenAt) VALUES (@id, @u, @s, @c, @p, @st, @ca, @ua, @ls, @us)`);
  }
  async getTicketById(id: string) { return (await this.r().input('id', this.sql.NVarChar, id).query(`SELECT * FROM dbo.tickets WHERE id = @id`)).recordset[0]; }
  async listTicketsFor(username: string) { return (await this.r().input('u', this.sql.NVarChar, username).query(`SELECT * FROM dbo.tickets WHERE username = @u ORDER BY updatedAt DESC`)).recordset as TicketRow[]; }
  async listTickets(status?: string) {
    if (status) return (await this.r().input('s', this.sql.NVarChar, status).query(`SELECT * FROM dbo.tickets WHERE status = @s ORDER BY updatedAt DESC`)).recordset as TicketRow[];
    return (await this.r().query(`SELECT * FROM dbo.tickets ORDER BY updatedAt DESC`)).recordset as TicketRow[];
  }
  async updateTicket(id: string, f: Partial<TicketRow>) { await this.dynUpdate('tickets', TICKET_COLUMNS, 'id', id, f as any); }
  async addTicketMessage(m: TicketMessageRow) {
    await this.r().input('id', this.sql.NVarChar, m.id).input('t', this.sql.NVarChar, m.ticketId).input('a', this.sql.NVarChar, m.author).input('s', this.sql.Int, m.isStaff).input('b', this.sql.NVarChar, m.body).input('c', this.sql.NVarChar, m.createdAt)
      .query(`INSERT INTO dbo.ticket_messages (id, ticketId, author, isStaff, body, createdAt) VALUES (@id, @t, @a, @s, @b, @c)`);
  }
  async listTicketMessages(ticketId: string) { return (await this.r().input('t', this.sql.NVarChar, ticketId).query(`SELECT * FROM dbo.ticket_messages WHERE ticketId = @t ORDER BY createdAt ASC`)).recordset as TicketMessageRow[]; }
  async countOpenTickets() { return (await this.r().query(`SELECT COUNT(*) as c FROM dbo.tickets WHERE status IN ('open','customer_reply')`)).recordset[0].c; }

  // ---- Wallet + on-site orders (task 13) ----
  async appendWalletTx(tx: Omit<WalletTxRow, 'balanceAfter'>): Promise<WalletTxRow> {
    const bal = (await this.r().input('u', this.sql.NVarChar, tx.username).query(`SELECT COALESCE(SUM(amount), 0) as bal FROM dbo.wallet_transactions WHERE username = @u`)).recordset[0]?.bal || 0;
    const balanceAfter = Math.round((bal + tx.amount) * 100) / 100;
    if (balanceAfter < -0.000001) throw Object.assign(new Error('INSUFFICIENT_FUNDS'), { code: 'INSUFFICIENT_FUNDS', statusCode: 402, balance: bal });
    await this.r().input('id', this.sql.NVarChar, tx.id).input('u', this.sql.NVarChar, tx.username).input('a', this.sql.Float, tx.amount).input('t', this.sql.NVarChar, tx.type)
      .input('r', this.sql.NVarChar, tx.ref || '').input('o', this.sql.NVarChar, tx.operator || '').input('n', this.sql.NVarChar, tx.note || '').input('k', this.sql.NVarChar, tx.idempotencyKey || '')
      .input('b', this.sql.Float, balanceAfter).input('c', this.sql.NVarChar, tx.createdAt)
      .query(`INSERT INTO dbo.wallet_transactions (id, username, amount, type, ref, operator, note, idempotencyKey, balanceAfter, createdAt) VALUES (@id, @u, @a, @t, @r, @o, @n, @k, @b, @c)`);
    await this.r().input('b', this.sql.Float, balanceAfter).input('u', this.sql.NVarChar, tx.username).query(`UPDATE dbo.users SET walletBalance = @b WHERE username = @u`);
    return { ...tx, balanceAfter } as WalletTxRow;
  }
  async getWalletTxByIdempotencyKey(key: string) { if (!key) return undefined; return (await this.r().input('k', this.sql.NVarChar, key).query(`SELECT * FROM dbo.wallet_transactions WHERE idempotencyKey = @k`)).recordset[0]; }
  async listWalletTxFor(username: string, limit = 100) { return (await this.r().input('u', this.sql.NVarChar, username).input('l', this.sql.Int, limit).query(`SELECT TOP (@l) * FROM dbo.wallet_transactions WHERE username = @u ORDER BY createdAt DESC`)).recordset as WalletTxRow[]; }
  async listWalletTx(limit = 300) { return (await this.r().input('l', this.sql.Int, limit).query(`SELECT TOP (@l) * FROM dbo.wallet_transactions ORDER BY createdAt DESC`)).recordset as WalletTxRow[]; }
  async createOnsiteOrder(o: OnsiteOrderRow) {
    await this.r().input('id', this.sql.NVarChar, o.id).input('k', this.sql.NVarChar, o.kind).input('u', this.sql.NVarChar, o.username).input('a', this.sql.Float, o.amount)
      .input('s', this.sql.NVarChar, o.status).input('d', this.sql.NVarChar, o.dueAt || '').input('p', this.sql.NVarChar, o.payload).input('de', this.sql.NVarChar, o.description)
      .input('r', this.sql.NVarChar, o.result || '').input('ca', this.sql.NVarChar, o.createdAt).input('ua', this.sql.NVarChar, o.updatedAt).input('sa', this.sql.NVarChar, o.settledAt || '').input('sb', this.sql.NVarChar, o.settledBy || '')
      .query(`INSERT INTO dbo.onsite_orders (id, kind, username, amount, status, dueAt, payload, description, result, createdAt, updatedAt, settledAt, settledBy) VALUES (@id, @k, @u, @a, @s, @d, @p, @de, @r, @ca, @ua, @sa, @sb)`);
  }
  async getOnsiteOrder(id: string) { return (await this.r().input('id', this.sql.NVarChar, id).query(`SELECT * FROM dbo.onsite_orders WHERE id = @id`)).recordset[0]; }
  async listOnsiteOrders(fl: { status?: string; username?: string; kind?: string } = {}) {
    // فیلترهای اختیاری با الگوی «NULL یا برابر» — کوئری ایستا و کاملاً پارامتری
    const req = this.r()
      .input('s', this.sql.NVarChar, fl.status || null)
      .input('u', this.sql.NVarChar, fl.username || null)
      .input('k', this.sql.NVarChar, fl.kind || null);
    return (await req.query(`SELECT * FROM dbo.onsite_orders WHERE (@s IS NULL OR status = @s) AND (@u IS NULL OR username = @u) AND (@k IS NULL OR kind = @k) ORDER BY createdAt DESC`)).recordset as OnsiteOrderRow[];
  }
  async updateOnsiteOrder(id: string, f: Partial<OnsiteOrderRow>) { await this.dynUpdate('onsite_orders', ONSITE_ORDER_COLUMNS, 'id', id, f as any); }


  // ---- Affiliate marketing ----
  async listAffiliates() { return (await this.r().query(`SELECT * FROM dbo.affiliates ORDER BY createdAt DESC`)).recordset as AffiliateRow[]; }
  async getAffiliateById(id: string) { return (await this.r().input('id', this.sql.NVarChar, id).query(`SELECT * FROM dbo.affiliates WHERE id = @id`)).recordset[0]; }
  async getAffiliateByCode(code: string) { return (await this.r().input('c', this.sql.NVarChar, code).query(`SELECT * FROM dbo.affiliates WHERE UPPER(code) = UPPER(@c)`)).recordset[0]; }
  async getAffiliateByUsername(username: string) { if (!username) return undefined; return (await this.r().input('u', this.sql.NVarChar, username).query(`SELECT * FROM dbo.affiliates WHERE LOWER(username) = LOWER(@u)`)).recordset[0]; }
  async createAffiliate(a: AffiliateRow) {
    await this.r().input('id', this.sql.NVarChar, a.id).input('c', this.sql.NVarChar, a.code).input('u', this.sql.NVarChar, a.username || '').input('n', this.sql.NVarChar, a.name)
      .input('t', this.sql.NVarChar, a.type || 'gamer').input('l', this.sql.NVarChar, a.language || 'tr').input('d', this.sql.NVarChar, a.destination || '/')
      .input('p', this.sql.NVarChar, a.parentId || '').input('s', this.sql.NVarChar, a.status || 'active')
      .input('np', this.sql.Float, a.newPct ?? -1).input('rp', this.sql.Float, a.returnPct ?? -1).input('tp', this.sql.Float, a.tournamentPct ?? -1).input('op', this.sql.Float, a.overridePct ?? -1)
      .input('nt', this.sql.NVarChar, a.notes || '').input('ca', this.sql.NVarChar, a.createdAt).input('ua', this.sql.NVarChar, a.updatedAt)
      .query(`INSERT INTO dbo.affiliates (id, code, username, name, type, language, destination, parentId, status, newPct, returnPct, tournamentPct, overridePct, notes, createdAt, updatedAt) VALUES (@id, @c, @u, @n, @t, @l, @d, @p, @s, @np, @rp, @tp, @op, @nt, @ca, @ua)`);
  }
  async updateAffiliate(id: string, f: Partial<AffiliateRow>) {
    const keys = Object.keys(f).filter(k => AFFILIATE_COLUMNS.has(k));
    if (!keys.length) return;
    const req = this.r().input('key', this.sql.NVarChar, id);
    keys.forEach((k, i) => {
      const v = (f as any)[k];
      req.input(`v${i}`, typeof v === 'number' ? this.sql.Float : this.sql.NVarChar, v);
    });
    const columnSet = keys.map((k, i) => k + ' = @v' + i).join(', ');
    await req.query(`UPDATE dbo.affiliates SET ${columnSet} WHERE id = @key`);
  }
  async createAffiliateClick(c: AffiliateClickRow) {
    await this.r().input('id', this.sql.NVarChar, c.id).input('c', this.sql.NVarChar, c.code).input('p', this.sql.NVarChar, c.path).input('ip', this.sql.NVarChar, c.ipHash)
      .input('ua', this.sql.NVarChar, c.uaHash).input('v', this.sql.NVarChar, c.visitorId || '').input('ca', this.sql.NVarChar, c.createdAt)
      .query(`INSERT INTO dbo.affiliate_clicks (id, code, path, ipHash, uaHash, visitorId, createdAt) VALUES (@id, @c, @p, @ip, @ua, @v, @ca)`);
  }
  async countRecentAffiliateClicks(code: string, ipHash: string, uaHash: string, since: string) {
    return (await this.r().input('c', this.sql.NVarChar, code).input('ip', this.sql.NVarChar, ipHash).input('ua', this.sql.NVarChar, uaHash).input('s', this.sql.NVarChar, since)
      .query(`SELECT COUNT(*) as c FROM dbo.affiliate_clicks WHERE code = @c AND ipHash = @ip AND uaHash = @ua AND createdAt >= @s`)).recordset[0].c;
  }
  async countAffiliateClicks(code: string, since?: string) {
    if (since) return (await this.r().input('c', this.sql.NVarChar, code).input('s', this.sql.NVarChar, since).query(`SELECT COUNT(*) as c FROM dbo.affiliate_clicks WHERE code = @c AND createdAt >= @s`)).recordset[0].c;
    return (await this.r().input('c', this.sql.NVarChar, code).query(`SELECT COUNT(*) as c FROM dbo.affiliate_clicks WHERE code = @c`)).recordset[0].c;
  }
  async upsertAffiliateAttribution(a: AffiliateAttributionRow) {
    if (a.username) await this.r().input('u', this.sql.NVarChar, a.username).query(`DELETE FROM dbo.affiliate_attributions WHERE username = @u`);
    if (a.visitorId) await this.r().input('v', this.sql.NVarChar, a.visitorId).query(`DELETE FROM dbo.affiliate_attributions WHERE visitorId = @v AND visitorId <> ''`);
    await this.r().input('id', this.sql.NVarChar, a.id).input('u', this.sql.NVarChar, a.username || '').input('v', this.sql.NVarChar, a.visitorId || '')
      .input('c', this.sql.NVarChar, a.code).input('s', this.sql.NVarChar, a.source).input('e', this.sql.NVarChar, a.expiresAt).input('ca', this.sql.NVarChar, a.createdAt).input('ua', this.sql.NVarChar, a.updatedAt)
      .query(`INSERT INTO dbo.affiliate_attributions (id, username, visitorId, code, source, expiresAt, createdAt, updatedAt) VALUES (@id, @u, @v, @c, @s, @e, @ca, @ua)`);
  }
  async getAttributionForUser(username: string) { if (!username) return undefined; return (await this.r().input('u', this.sql.NVarChar, username).query(`SELECT TOP 1 * FROM dbo.affiliate_attributions WHERE username = @u ORDER BY updatedAt DESC`)).recordset[0]; }
  async getAttributionForVisitor(visitorId: string) { if (!visitorId) return undefined; return (await this.r().input('v', this.sql.NVarChar, visitorId).query(`SELECT TOP 1 * FROM dbo.affiliate_attributions WHERE visitorId = @v ORDER BY updatedAt DESC`)).recordset[0]; }
  async listAttributionsByCode(code: string) { return (await this.r().input('c', this.sql.NVarChar, code).query(`SELECT * FROM dbo.affiliate_attributions WHERE code = @c`)).recordset as AffiliateAttributionRow[]; }
  async createAffiliateCommission(c: AffiliateCommissionRow) {
    await this.r().input('id', this.sql.NVarChar, c.id).input('aid', this.sql.NVarChar, c.affiliateId).input('c', this.sql.NVarChar, c.code).input('u', this.sql.NVarChar, c.username)
      .input('oid', this.sql.NVarChar, c.orderId).input('k', this.sql.NVarChar, c.kind).input('e', this.sql.NVarChar, c.eventType)
      .input('na', this.sql.Float, c.netAmount).input('rp', this.sql.Float, c.ratePct).input('ca', this.sql.Float, c.commissionAmount)
      .input('s', this.sql.NVarChar, c.status).input('h', this.sql.NVarChar, c.holdUntil || '').input('f', this.sql.NVarChar, c.flag || '')
      .input('w', this.sql.NVarChar, c.walletTxId || '').input('p', this.sql.NVarChar, c.parentCommissionId || '')
      .input('cr', this.sql.NVarChar, c.createdAt).input('up', this.sql.NVarChar, c.updatedAt).input('ap', this.sql.NVarChar, c.approvedAt || '')
      .input('po', this.sql.NVarChar, c.paidOutAt || '').input('rv', this.sql.NVarChar, c.reversedAt || '').input('n', this.sql.NVarChar, c.note || '').input('at', this.sql.NVarChar, c.attendedAt || '')
      .query(`INSERT INTO dbo.affiliate_commissions (id, affiliateId, code, username, orderId, kind, eventType, netAmount, ratePct, commissionAmount, status, holdUntil, flag, walletTxId, parentCommissionId, createdAt, updatedAt, approvedAt, paidOutAt, reversedAt, note, attendedAt) VALUES (@id, @aid, @c, @u, @oid, @k, @e, @na, @rp, @ca, @s, @h, @f, @w, @p, @cr, @up, @ap, @po, @rv, @n, @at)`);
  }
  async getAffiliateCommissionById(id: string) { return (await this.r().input('id', this.sql.NVarChar, id).query(`SELECT * FROM dbo.affiliate_commissions WHERE id = @id`)).recordset[0]; }
  async listAffiliateCommissions(fl: { affiliateId?: string; username?: string; orderId?: string; status?: string } = {}) {
    const req = this.r().input('a', this.sql.NVarChar, fl.affiliateId || null).input('u', this.sql.NVarChar, fl.username || null).input('o', this.sql.NVarChar, fl.orderId || null).input('s', this.sql.NVarChar, fl.status || null);
    return (await req.query(`SELECT * FROM dbo.affiliate_commissions WHERE (@a IS NULL OR affiliateId = @a) AND (@u IS NULL OR username = @u) AND (@o IS NULL OR orderId = @o) AND (@s IS NULL OR status = @s) ORDER BY createdAt DESC`)).recordset as AffiliateCommissionRow[];
  }
  async updateAffiliateCommission(id: string, f: Partial<AffiliateCommissionRow>) { await this.dynUpdate('affiliate_commissions', AFFILIATE_COMMISSION_COLUMNS, 'id', id, f as any); }
  async createAffiliateAudit(a: AffiliateAuditRow) {
    await this.r().input('id', this.sql.NVarChar, a.id).input('a', this.sql.NVarChar, a.affiliateId).input('c', this.sql.NVarChar, a.commissionId || '').input('ac', this.sql.NVarChar, a.actor)
      .input('act', this.sql.NVarChar, a.action).input('fs', this.sql.NVarChar, a.fromStatus || '').input('ts', this.sql.NVarChar, a.toStatus || '').input('d', this.sql.NVarChar, a.detail || '').input('ca', this.sql.NVarChar, a.createdAt)
      .query(`INSERT INTO dbo.affiliate_audit (id, affiliateId, commissionId, actor, action, fromStatus, toStatus, detail, createdAt) VALUES (@id, @a, @c, @ac, @act, @fs, @ts, @d, @ca)`);
  }
  async listAffiliateAudit(affiliateId?: string, limit = 200) {
    if (affiliateId) return (await this.r().input('a', this.sql.NVarChar, affiliateId).input('l', this.sql.Int, limit).query(`SELECT TOP (@l) * FROM dbo.affiliate_audit WHERE affiliateId = @a ORDER BY createdAt DESC`)).recordset as AffiliateAuditRow[];
    return (await this.r().input('l', this.sql.Int, limit).query(`SELECT TOP (@l) * FROM dbo.affiliate_audit ORDER BY createdAt DESC`)).recordset as AffiliateAuditRow[];
  }

  // ---- Accessories / shop ----
  async listAccessories() { return (await this.r().query(`SELECT * FROM dbo.accessories`)).recordset as AccessoryRow[]; }
  async getAccessoryById(id: string) { return (await this.r().input('id', this.sql.NVarChar, id).query(`SELECT * FROM dbo.accessories WHERE id = @id`)).recordset[0]; }
  async createAccessory(a: AccessoryRow) {
    await this.r().input('id', this.sql.NVarChar, a.id).input('n', this.sql.NVarChar, a.name).input('desc', this.sql.NVarChar, a.description)
      .input('p', this.sql.Float, a.price).input('img', this.sql.NVarChar, a.imageUrl).input('mimg', this.sql.NVarChar, a.mobileImageUrl ?? null).input('s', this.sql.Int, a.stock).input('c', this.sql.NVarChar, a.category)
      .query(`INSERT INTO dbo.accessories (id, name, description, price, imageUrl, mobileImageUrl, stock, category) VALUES (@id, @n, @desc, @p, @img, @mimg, @s, @c)`);
  }
  async updateAccessory(id: string, f: Partial<AccessoryRow>) {
    const current = await this.getAccessoryById(id);
    if (!current) return;
    const m = { ...current, ...f };
    await this.r().input('id', this.sql.NVarChar, id).input('n', this.sql.NVarChar, m.name).input('desc', this.sql.NVarChar, m.description)
      .input('p', this.sql.Float, m.price).input('img', this.sql.NVarChar, m.imageUrl).input('mimg', this.sql.NVarChar, m.mobileImageUrl ?? null).input('s', this.sql.Int, m.stock).input('c', this.sql.NVarChar, m.category)
      .query(`UPDATE dbo.accessories SET name=@n, description=@desc, price=@p, imageUrl=@img, mobileImageUrl=@mimg, stock=@s, category=@c WHERE id=@id`);
  }
  async decrementAccessoryStock(id: string, qty: number) {
    await this.r().input('q', this.sql.Int, qty).input('id', this.sql.NVarChar, id)
      .query(`UPDATE dbo.accessories SET stock = CASE WHEN stock - @q < 0 THEN 0 ELSE stock - @q END WHERE id = @id`);
  }
  async deleteAccessory(id: string) { await this.r().input('id', this.sql.NVarChar, id).query(`DELETE FROM dbo.accessories WHERE id = @id`); }
  async countAccessories() { return (await this.r().query(`SELECT COUNT(*) as c FROM dbo.accessories`)).recordset[0].c; }

  async listShopOrders() { return (await this.r().query(`SELECT * FROM dbo.shop_orders`)).recordset as ShopOrderRow[]; }
  async getShopOrderById(id: string) { return (await this.r().input('id', this.sql.NVarChar, id).query(`SELECT * FROM dbo.shop_orders WHERE id = @id`)).recordset[0]; }
  async addShopOrder(o: ShopOrderRow) {
    await this.r().input('id', this.sql.NVarChar, o.id).input('cart', this.sql.NVarChar, o.cart).input('tp', this.sql.Float, o.totalPrice)
      .input('da', this.sql.Float, o.discountApplied).input('fa', this.sql.Float, o.finalAmount).input('cc', this.sql.NVarChar, o.couponCode)
      .input('d', this.sql.NVarChar, o.date).input('s', this.sql.NVarChar, o.status).input('u', this.sql.NVarChar, o.username || '')
      .query(`INSERT INTO dbo.shop_orders (id, cart, totalPrice, discountApplied, finalAmount, couponCode, date, status, username) VALUES (@id, @cart, @tp, @da, @fa, @cc, @d, @s, @u)`);
  }
  async setShopOrderStatus(id: string, status: string) {
    await this.r().input('s', this.sql.NVarChar, status).input('id', this.sql.NVarChar, id).query(`UPDATE dbo.shop_orders SET status = @s WHERE id = @id`);
  }

  // ---- Tournaments ----
  async listTournaments() { return (await this.r().query(`SELECT * FROM dbo.tournaments`)).recordset as TournamentRow[]; }
  async getTournamentById(id: string) { return (await this.r().input('id', this.sql.NVarChar, id).query(`SELECT * FROM dbo.tournaments WHERE id = @id`)).recordset[0]; }
  async createTournament(t: TournamentRow) {
    await this.r().input('id', this.sql.NVarChar, t.id).input('ti', this.sql.NVarChar, t.title).input('g', this.sql.NVarChar, t.game)
      .input('rf', this.sql.Float, t.registrationFee).input('sd', this.sql.NVarChar, t.startDate).input('mt', this.sql.Int, t.maxTeams)
      .input('st', this.sql.NVarChar, t.status).input('rtc', this.sql.Int, t.registeredTeamsCount).input('tm', this.sql.NVarChar, t.teams).input('br', this.sql.NVarChar, t.bracket)
      .query(`INSERT INTO dbo.tournaments (id, title, game, registrationFee, startDate, maxTeams, status, registeredTeamsCount, teams, bracket) VALUES (@id, @ti, @g, @rf, @sd, @mt, @st, @rtc, @tm, @br)`);
  }
  async registerTournamentTeam(id: string, teamsJson: string, count: number) {
    await this.r().input('tm', this.sql.NVarChar, teamsJson).input('c', this.sql.Int, count).input('id', this.sql.NVarChar, id)
      .query(`UPDATE dbo.tournaments SET teams = @tm, registeredTeamsCount = @c WHERE id = @id`);
  }
  async deleteTournament(id: string) { await this.r().input('id', this.sql.NVarChar, id).query(`DELETE FROM dbo.tournaments WHERE id = @id`); }
  async countTournaments() { return (await this.r().query(`SELECT COUNT(*) as c FROM dbo.tournaments`)).recordset[0].c; }

  // ---- Articles ----
  async listArticles() { return (await this.r().query(`SELECT * FROM dbo.articles`)).recordset as ArticleRow[]; }
  async getArticleById(id: string) { return (await this.r().input('id', this.sql.NVarChar, id).query(`SELECT * FROM dbo.articles WHERE id = @id`)).recordset[0]; }
  async createArticle(a: ArticleRow) {
    await this.r().input('id', this.sql.NVarChar, a.id).input('ti', this.sql.NVarChar, a.title).input('co', this.sql.NVarChar, a.content)
      .input('ca', this.sql.NVarChar, a.category).input('img', this.sql.NVarChar, a.imageUrl).input('mimg', this.sql.NVarChar, a.mobileImageUrl ?? null).input('au', this.sql.NVarChar, a.author)
      .input('d', this.sql.NVarChar, a.date).input('cm', this.sql.NVarChar, a.comments)
      .query(`INSERT INTO dbo.articles (id, title, content, category, imageUrl, mobileImageUrl, author, date, comments) VALUES (@id, @ti, @co, @ca, @img, @mimg, @au, @d, @cm)`);
  }
  async setArticleComments(id: string, commentsJson: string) {
    await this.r().input('cm', this.sql.NVarChar, commentsJson).input('id', this.sql.NVarChar, id).query(`UPDATE dbo.articles SET comments = @cm WHERE id = @id`);
  }
  async deleteArticle(id: string) { await this.r().input('id', this.sql.NVarChar, id).query(`DELETE FROM dbo.articles WHERE id = @id`); }
  async countArticles() { return (await this.r().query(`SELECT COUNT(*) as c FROM dbo.articles`)).recordset[0].c; }

  // ---- User messages ----
  async listUserMessages() { return (await this.r().query(`SELECT * FROM dbo.user_messages`)).recordset.map((m: any) => ({ ...m, isRead: !!m.isRead })) as UserMessageRow[]; }
  async listUserMessagesFor(username: string) {
    return (await this.r().input('u', this.sql.NVarChar, username).query(`SELECT * FROM dbo.user_messages WHERE recipient = 'All' OR recipient = @u`))
      .recordset.map((m: any) => ({ ...m, isRead: !!m.isRead })) as UserMessageRow[];
  }
  async addUserMessage(m: UserMessageRow) {
    await this.r().input('id', this.sql.NVarChar, m.id).input('s', this.sql.NVarChar, m.sender).input('r', this.sql.NVarChar, m.recipient)
      .input('ti', this.sql.NVarChar, m.title).input('b', this.sql.NVarChar, m.body).input('d', this.sql.NVarChar, m.date)
      .input('ir', this.sql.Bit, m.isRead).input('ty', this.sql.NVarChar, m.type)
      .query(`INSERT INTO dbo.user_messages (id, sender, recipient, title, body, date, isRead, type) VALUES (@id, @s, @r, @ti, @b, @d, @ir, @ty)`);
  }
  async setUserMessageRead(id: string) { await this.r().input('id', this.sql.NVarChar, id).query(`UPDATE dbo.user_messages SET isRead = 1 WHERE id = @id`); }
  async getUserMessageById(id: string) {
    const res = await this.r().input('id', this.sql.NVarChar, id).query(`SELECT * FROM dbo.user_messages WHERE id = @id`);
    const row = res.recordset[0];
    return row ? { ...row, isRead: !!row.isRead } : undefined;
  }

  // ---- Themes ----
  async listThemes() { return (await this.r().query(`SELECT * FROM dbo.themes`)).recordset as ThemeRow[]; }
  async createTheme(t: ThemeRow) {
    await this.r().input('id', this.sql.NVarChar, t.id).input('n', this.sql.NVarChar, t.name).input('ne', this.sql.NVarChar, t.nameEn)
      .input('pc', this.sql.NVarChar, t.primaryColor).input('ph', this.sql.NVarChar, t.primaryHover).input('db', this.sql.NVarChar, t.darkBg)
      .input('dc', this.sql.NVarChar, t.darkCard).input('ar', this.sql.NVarChar, t.accentRed)
      .query(`IF NOT EXISTS (SELECT 1 FROM dbo.themes WHERE id = @id) INSERT INTO dbo.themes (id, name, nameEn, primaryColor, primaryHover, darkBg, darkCard, accentRed) VALUES (@id, @n, @ne, @pc, @ph, @db, @dc, @ar)`);
  }

  // ---- App sliders ----
  async listSliders() { return (await this.r().query(`SELECT * FROM dbo.app_sliders`)).recordset as SliderRow[]; }
  async getSliderById(id: string) { return (await this.r().input('id', this.sql.NVarChar, id).query(`SELECT * FROM dbo.app_sliders WHERE id = @id`)).recordset[0]; }
  async createSlider(s: SliderRow) {
    await this.r().input('id', this.sql.NVarChar, s.id).input('img', this.sql.NVarChar, s.imageUrl).input('mimg', this.sql.NVarChar, s.mobileImageUrl ?? null).input('t', this.sql.NVarChar, s.target)
      .input('fa', this.sql.NVarChar, s.titleFa).input('en', this.sql.NVarChar, s.titleEn).input('ru', this.sql.NVarChar, s.titleRu).input('tr', this.sql.NVarChar, s.titleTr)
      .input('dfa', this.sql.NVarChar, s.descFa ?? '').input('den', this.sql.NVarChar, s.descEn ?? '').input('dru', this.sql.NVarChar, s.descRu ?? '').input('dtr', this.sql.NVarChar, s.descTr ?? '')
      .query(`INSERT INTO dbo.app_sliders (id, imageUrl, mobileImageUrl, target, titleFa, titleEn, titleRu, titleTr, descFa, descEn, descRu, descTr) VALUES (@id, @img, @mimg, @t, @fa, @en, @ru, @tr, @dfa, @den, @dru, @dtr)`);
  }
  async updateSlider(id: string, f: Partial<SliderRow>) {
    const current = await this.getSliderById(id);
    if (!current) return;
    const m = { ...current, ...f };
    await this.r().input('id', this.sql.NVarChar, id).input('img', this.sql.NVarChar, m.imageUrl).input('mimg', this.sql.NVarChar, m.mobileImageUrl ?? null).input('t', this.sql.NVarChar, m.target)
      .input('fa', this.sql.NVarChar, m.titleFa).input('en', this.sql.NVarChar, m.titleEn).input('ru', this.sql.NVarChar, m.titleRu).input('tr', this.sql.NVarChar, m.titleTr)
      .input('dfa', this.sql.NVarChar, m.descFa ?? '').input('den', this.sql.NVarChar, m.descEn ?? '').input('dru', this.sql.NVarChar, m.descRu ?? '').input('dtr', this.sql.NVarChar, m.descTr ?? '')
      .query(`UPDATE dbo.app_sliders SET imageUrl=@img, mobileImageUrl=@mimg, target=@t, titleFa=@fa, titleEn=@en, titleRu=@ru, titleTr=@tr, descFa=@dfa, descEn=@den, descRu=@dru, descTr=@dtr WHERE id=@id`);
  }
  async deleteSlider(id: string) { await this.r().input('id', this.sql.NVarChar, id).query(`DELETE FROM dbo.app_sliders WHERE id = @id`); }

  // ---- Seeding ----
  async seedMinimal(adminUser: AdminSeedInput): Promise<void> {
    const passwordHash = await hashPassword(adminUser.password || 'admin');
    await this.r().input('u', this.sql.NVarChar, adminUser.username || 'admin').input('p', this.sql.NVarChar, passwordHash)
      .input('e', this.sql.NVarChar, adminUser.email || 'admin@gamenet.com').input('ph', this.sql.NVarChar, adminUser.phone || '09120000000')
      .query(`
        MERGE dbo.users AS target USING (SELECT @u AS username) AS src ON target.username = src.username
        WHEN MATCHED THEN UPDATE SET passwordHash=@p, email=@e, phone=@ph, role='admin', loyaltyPoints=1000
        WHEN NOT MATCHED THEN INSERT (username, passwordHash, email, phone, loyaltyPoints, role) VALUES (@u, @p, @e, @ph, 1000, 'admin');
      `);
    await this.setSetting('activeThemeId', 'dark-gold');
    for (const theme of DEFAULT_THEMES) {
      const exists = (await this.r().input('id', this.sql.NVarChar, theme.id).query(`SELECT COUNT(*) c FROM dbo.themes WHERE id=@id`)).recordset[0].c;
      if (!exists) await this.createTheme(theme);
    }
    await seedAffiliateSettings(this);
    logDbQuery(this.name, 'SYSTEM', 'MSSQL: Admin user seeded with hashed password.');
  }

  async seedSampleData(): Promise<void> {
    for (const room of SAMPLE_CHAT_ROOMS) await this.createChatRoom(room);
    if ((await this.countSystems()) === 0) for (const s of SAMPLE_SYSTEMS) await this.createSystem(s);
    if ((await this.countCafeItems()) === 0) for (const c of SAMPLE_CAFE_ITEMS) await this.createCafeItem(c);
    if ((await this.countAccessories()) === 0) for (const a of SAMPLE_ACCESSORIES) await this.createAccessory(a);
    for (const s of SAMPLE_SLIDERS) await this.createSlider(s);
    if ((await this.countArticles()) === 0) for (const a of SAMPLE_ARTICLES) await this.createArticle(a);
    if ((await this.countTournaments()) === 0) for (const t of SAMPLE_TOURNAMENTS) await this.createTournament(t);
    if ((await this.countReservationLogs()) === 0) for (const l of SAMPLE_RESERVATION_LOGS) await this.addReservationLog(l);
    logDbQuery(this.name, 'SYSTEM', 'MSSQL: Sample data seeded.');
  }

  async purgeSampleData(): Promise<void> {
    await this.r().query(`
      DELETE FROM dbo.systems; DELETE FROM dbo.cafe_items; DELETE FROM dbo.accessories;
      DELETE FROM dbo.tournaments; DELETE FROM dbo.articles; DELETE FROM dbo.chat_rooms;
      DELETE FROM dbo.reservation_logs; DELETE FROM dbo.app_sliders;
      DELETE FROM dbo.chat_messages; DELETE FROM dbo.cafe_orders; DELETE FROM dbo.shop_orders;
    `);
    logDbQuery(this.name, 'SQL', 'MSSQL: Sample data purged (admin account & themes kept).');
  }
}

// =============================================================================
// 3. MONGODB STORE — real connection via the official `mongodb` driver
// =============================================================================
export class MongoStore implements IDataStore {
  name = 'MongoDB';
  isConnected = false;
  config: any = {};
  private client: any;
  private db: any;

  private col(name: string) { return this.db.collection(name); }

  async connect(): Promise<{ success: boolean; message: string }> {
    const { MongoClient } = require('mongodb');
    const uri = this.config.connectionString ||
      `mongodb://${this.config.username ? `${this.config.username}:${this.config.password}@` : ''}${this.config.host || 'localhost'}:${this.config.port || 27017}/?authSource=admin`;
    this.client = new MongoClient(uri);
    await this.client.connect();
    let dbName = this.config.dbName || 'bazino';
    let hostLabel = this.config.host || 'localhost';
    try {
      const u = new URL(uri);
      hostLabel = u.host;
      const fromPath = u.pathname.replace(/^\//, '');
      if (!this.config.dbName && fromPath) dbName = fromPath;
    } catch { /* non-URL connection string */ }
    this.db = this.client.db(dbName);
    this.isConnected = true;
    logDbQuery(this.name, 'SYSTEM', `Connected to MongoDB: ${hostLabel}/${dbName}`);
    return { success: true, message: 'Connected to MongoDB successfully.' };
  }

  async createDatabaseIfNotExist(): Promise<{ success: boolean; message: string }> {
    await this.col('users').createIndex({ username: 1 }, { unique: true });
    await this.col('settings').createIndex({ key: 1 }, { unique: true });
    await this.col('chat_rooms').createIndex({ name: 1 }, { unique: true });
    await this.col('active_coupons').createIndex({ code: 1 }, { unique: true });
    await this.col('payment_orders').createIndex({ merchantOid: 1 }, { unique: true });
    await this.col('wallet_transactions').createIndex({ username: 1, createdAt: -1 });
    await this.col('wallet_transactions').createIndex({ idempotencyKey: 1 }, { unique: true, partialFilterExpression: { idempotencyKey: { $gt: '' } } });
    await this.col('onsite_orders').createIndex({ status: 1, dueAt: 1 });
    await this.col('otp_codes').createIndex({ phone: 1, createdAt: -1 });
    await this.col('otp_codes').createIndex({ ip: 1, createdAt: -1 });
    await this.col('tickets').createIndex({ username: 1, updatedAt: -1 });
    await this.col('ticket_messages').createIndex({ ticketId: 1, createdAt: 1 });
    await this.col('affiliates').createIndex({ code: 1 }, { unique: true });
    await this.col('affiliates').createIndex({ username: 1 });
    await this.col('affiliate_clicks').createIndex({ code: 1, createdAt: -1 });
    await this.col('affiliate_attributions').createIndex({ username: 1 });
    await this.col('affiliate_attributions').createIndex({ visitorId: 1 });
    await this.col('affiliate_commissions').createIndex({ affiliateId: 1, createdAt: -1 });
    await this.col('affiliate_commissions').createIndex({ orderId: 1 });
    await this.col('affiliate_commissions').createIndex({ status: 1, holdUntil: 1 });
    await this.col('affiliate_audit').createIndex({ affiliateId: 1, createdAt: -1 });
    logDbQuery(this.name, 'NoSQL', 'db.createIndex(...) on users/settings/chat_rooms/active_coupons');
    return { success: true, message: `MongoDB collections/indexes verified on database [${this.config.dbName || 'bazino'}].` };
  }

  private strip(doc: any) { if (doc) delete doc._id; return doc; }

  // ---- Users ----
  async getUserByUsername(username: string) {
    const row = await this.col('users').findOne({ username: { $regex: `^${username}$`, $options: 'i' } });
    return row ? this.strip(row) : undefined;
  }
  async createUser(u: { username: string; password: string; email: string; phone: string }) {
    const passwordHash = await hashPassword(u.password);
    await this.col('users').insertOne({ username: u.username, passwordHash, email: u.email, phone: u.phone || '', loyaltyPoints: 100, role: 'gamer' });
  }
  async verifyLogin(username: string, password: string) {
    const row = await this.getUserByUsername(username);
    if (!row) return undefined;
    return (await verifyPassword(password, row.passwordHash)) ? row : undefined;
  }
  async addLoyaltyPointsToUser(username: string, delta: number) {
    await this.col('users').updateOne({ username }, { $inc: { loyaltyPoints: delta } });
  }
  async listUsers() { return (await this.col('users').find({}).toArray()).map((r: any) => this.strip(r)); }
  async countUsers() { return this.col('users').countDocuments({}); }

  // ---- Settings ----
  async getSetting(key: string) { const row = await this.col('settings').findOne({ key }); return row?.value; }
  async setSetting(key: string, value: string) { await this.col('settings').updateOne({ key }, { $set: { key, value } }, { upsert: true }); }
  async listSettings() { return (await this.col('settings').find({}).toArray()).map((r: any) => this.strip(r)); }

  // ---- Chat ----
  async listChatRooms() { return (await this.col('chat_rooms').find({}).toArray()).map((r: any) => r.name); }
  async createChatRoom(name: string) { await this.col('chat_rooms').updateOne({ name }, { $setOnInsert: { name } }, { upsert: true }); }
  async deleteChatRoom(name: string) { await this.col('chat_rooms').deleteOne({ name }); }
  async listChatMessages(room: string) { return (await this.col('chat_messages').find({ room }).toArray()).map((r: any) => this.strip(r)); }
  async addChatMessage(m: ChatMessageRow) { await this.col('chat_messages').insertOne({ ...m }); }

  // ---- Transactions ----
  async listTransactions() { return (await this.col('transactions').find({}).toArray()).map((r: any) => this.strip(r)); }
  async addTransaction(tx: TransactionRow) { await this.col('transactions').insertOne({ ...tx, username: tx.username || '' }); }

  // ---- Coupons ----
  async listCoupons() { return (await this.col('active_coupons').find({}).toArray()).map((r: any) => this.strip(r)); }
  async getCouponByCode(code: string) {
    const row = await this.col('active_coupons').findOne({ code: { $regex: `^${code}$`, $options: 'i' } });
    return row ? this.strip(row) : undefined;
  }
  async createCoupon(c: CouponRow) {
    await this.col('active_coupons').insertOne({
      ...c,
      expiryDate: c.expiryDate || new Date(Date.now() + 30 * 86400000).toISOString(),
      maxUsageCount: c.maxUsageCount || 1,
      usageCount: 0,
      isActive: true,
      ownerUsername: c.ownerUsername || ''
    });
  }
  async deactivateCoupon(code: string) { await this.col('active_coupons').updateOne({ code }, { $set: { isActive: false } }); }
  // findOneAndUpdate اتمیک است: فیلتر شامل شرط «هنوز ظرفیت دارد» می‌شود، پس دو درخواست
  // هم‌زمان نمی‌توانند هر دو موفق شوند.
  async recordCouponUsage(code: string) {
    const before = await this.col('active_coupons').findOneAndUpdate(
      { code, isActive: true, $expr: { $lt: ['$usageCount', '$maxUsageCount'] } },
      { $inc: { usageCount: 1 } },
      { returnDocument: 'before' }
    );
    const doc: any = (before as any)?.value ?? before;
    if (!doc) return false;
    if ((doc.usageCount ?? 0) + 1 >= (doc.maxUsageCount ?? 1)) {
      await this.col('active_coupons').updateOne({ code }, { $set: { isActive: false } });
    }
    return true;
  }
  async deactivateLegacyOwnerlessLoyaltyCoupons() {
    const res = await this.col('active_coupons').updateMany(
      { isActive: true, code: { $regex: '^LOYAL-' }, $or: [{ ownerUsername: { $exists: false } }, { ownerUsername: '' }] },
      { $set: { isActive: false } }
    );
    return res.modifiedCount ?? 0;
  }

  // ---- Systems ----
  async listSystems() { return (await this.col('systems').find({}).toArray()).map((r: any) => this.strip(r)); }
  async getSystemById(id: string) { const row = await this.col('systems').findOne({ id }); return row ? this.strip(row) : undefined; }
  async createSystem(s: SystemRow) { await this.col('systems').insertOne({ ...s }); }
  async updateSystem(id: string, f: Partial<SystemRow>) { await this.col('systems').updateOne({ id }, { $set: f }); }
  async setSystemReserved(id: string, reserved: boolean) { await this.col('systems').updateOne({ id }, { $set: { isReserved: reserved } }); }
  async deleteSystem(id: string) { await this.col('systems').deleteOne({ id }); }
  async countSystems() { return this.col('systems').countDocuments({}); }

  // ---- Reservations ----
  async listReservationLogs() { return (await this.col('reservation_logs').find({}).toArray()).map((r: any) => this.strip(r)); }
  async listPendingReservationLogs() { return (await this.col('reservation_logs').find({ checkedIn: false }).toArray()).map((r: any) => this.strip(r)); }
  async getReservationLogById(id: string) { const row = await this.col('reservation_logs').findOne({ id }); return row ? this.strip(row) : undefined; }
  async addReservationLog(l: ReservationLogRow) { await this.col('reservation_logs').insertOne({ ...l }); }
  async setReservationCheckedIn(id: string) { await this.col('reservation_logs').updateOne({ id }, { $set: { checkedIn: true } }); }
  async deleteReservationLog(id: string) { await this.col('reservation_logs').deleteOne({ id }); }
  async countReservationLogs() { return this.col('reservation_logs').countDocuments({}); }
  async extendReservation(id: string, newEndTime: string, additionalPrice: number) {
    await this.col('reservation_logs').updateOne({ id }, { $set: { endTime: newEndTime }, $inc: { totalPrice: additionalPrice } });
  }
  async getActiveReservationForUser(username: string) {
    const row = await this.col('reservation_logs').find({ username, checkedIn: false }).sort({ timestamp: -1 }).limit(1).next();
    return row ? this.strip(row) : undefined;
  }
  async hasOverlappingReservation(systemId: string, date: string, startTime: string, endTime: string) {
    const count = await this.col('reservation_logs').countDocuments({
      systemId, date, checkedIn: false, startTime: { $lt: endTime }, endTime: { $gt: startTime },
    });
    return count > 0;
  }

  // ---- Cafe ----
  async listCafeItems() { return (await this.col('cafe_items').find({}).toArray()).map((r: any) => this.strip(r)); }
  async getCafeItemById(id: string) { const row = await this.col('cafe_items').findOne({ id }); return row ? this.strip(row) : undefined; }
  async createCafeItem(i: CafeItemRow) { await this.col('cafe_items').insertOne({ ...i }); }
  async updateCafeItem(id: string, f: Partial<CafeItemRow>) { await this.col('cafe_items').updateOne({ id }, { $set: f }); }
  async decrementCafeInventory(id: string, qty: number) {
    await this.col('cafe_items').updateOne({ id }, { $inc: { inventory: -qty } });
    await this.col('cafe_items').updateOne({ id, inventory: { $lt: 0 } }, { $set: { inventory: 0 } });
  }
  async deleteCafeItem(id: string) { await this.col('cafe_items').deleteOne({ id }); }
  async countCafeItems() { return this.col('cafe_items').countDocuments({}); }

  async listCafeOrders() { return (await this.col('cafe_orders').find({}).toArray()).map((r: any) => this.strip(r)); }
  async getCafeOrderById(id: string) { const row = await this.col('cafe_orders').findOne({ id }); return row ? this.strip(row) : undefined; }
  async addCafeOrder(o: CafeOrderRow) { await this.col('cafe_orders').insertOne({ ...o }); }
  async setCafeOrderStatus(id: string, status: string) { await this.col('cafe_orders').updateOne({ id }, { $set: { status } }); }

  // ---- Payment orders (PayTR) ----
  async createPaymentOrder(o: PaymentOrderRow) { await this.col('payment_orders').insertOne({ ...o }); }
  async getPaymentOrder(merchantOid: string) { const row = await this.col('payment_orders').findOne({ merchantOid }); return row ? this.strip(row) : undefined; }
  async updatePaymentOrder(merchantOid: string, f: Partial<PaymentOrderRow>) { const { merchantOid: _m, ...rest } = f; await this.col('payment_orders').updateOne({ merchantOid }, { $set: rest }); }
  async listPaymentOrders(limit = 200) { return (await this.col('payment_orders').find({}).sort({ createdAt: -1 }).limit(limit).toArray()).map((r: any) => this.strip(r)); }

  // ---- Profile / OTP / Tickets (task 12) ----
  async updateUserFields(username: string, f: Partial<UserRow>) {
    const set: Record<string, any> = {}; for (const k of Object.keys(f)) if (USER_PROFILE_COLUMNS.has(k)) set[k] = (f as any)[k];
    if (Object.keys(set).length) await this.col('users').updateOne({ username }, { $set: set });
  }
  async getUserByPhone(phone: string) { const row = await this.col('users').findOne({ phone }); return row ? this.strip(row) : undefined; }
  async createOtp(o: OtpCodeRow) { await this.col('otp_codes').insertOne({ ...o }); }
  async listRecentOtps(fl: { phone?: string; ip?: string; since: string }) {
    const or: any[] = []; if (fl.phone) or.push({ phone: fl.phone }); if (fl.ip) or.push({ ip: fl.ip });
    return (await this.col('otp_codes').find({ $and: [{ $or: or.length ? or : [{ phone: '__none__' }] }, { createdAt: { $gte: fl.since } }] }).sort({ createdAt: -1 }).toArray()).map((r: any) => this.strip(r));
  }
  async getLatestActiveOtp(phone: string, purpose: string) { const row = await this.col('otp_codes').find({ phone, purpose, consumedAt: '' }).sort({ createdAt: -1 }).limit(1).next(); return row ? this.strip(row) : undefined; }
  async updateOtp(id: string, f: Partial<OtpCodeRow>) { const { id: _i, ...rest } = f as any; await this.col('otp_codes').updateOne({ id }, { $set: rest }); }
  async createTicket(t: TicketRow) { await this.col('tickets').insertOne({ ...t }); }
  async getTicketById(id: string) { const row = await this.col('tickets').findOne({ id }); return row ? this.strip(row) : undefined; }
  async listTicketsFor(username: string) { return (await this.col('tickets').find({ username }).sort({ updatedAt: -1 }).toArray()).map((r: any) => this.strip(r)); }
  async listTickets(status?: string) { return (await this.col('tickets').find(status ? { status } : {}).sort({ updatedAt: -1 }).toArray()).map((r: any) => this.strip(r)); }
  async updateTicket(id: string, f: Partial<TicketRow>) { const set: Record<string, any> = {}; for (const k of Object.keys(f)) if (TICKET_COLUMNS.has(k)) set[k] = (f as any)[k]; if (Object.keys(set).length) await this.col('tickets').updateOne({ id }, { $set: set }); }
  async addTicketMessage(m: TicketMessageRow) { await this.col('ticket_messages').insertOne({ ...m }); }
  async listTicketMessages(ticketId: string) { return (await this.col('ticket_messages').find({ ticketId }).sort({ createdAt: 1 }).toArray()).map((r: any) => this.strip(r)); }
  async countOpenTickets() { return this.col('tickets').countDocuments({ status: { $in: ['open', 'customer_reply'] } }); }

  // ---- Wallet + on-site orders (task 13) ----
  async appendWalletTx(tx: Omit<WalletTxRow, 'balanceAfter'>): Promise<WalletTxRow> {
    const agg = await this.col('wallet_transactions').aggregate([{ $match: { username: tx.username } }, { $group: { _id: null, bal: { $sum: '$amount' } } }]).toArray();
    const bal = agg[0]?.bal || 0;
    const balanceAfter = Math.round((bal + tx.amount) * 100) / 100;
    if (balanceAfter < -0.000001) throw Object.assign(new Error('INSUFFICIENT_FUNDS'), { code: 'INSUFFICIENT_FUNDS', statusCode: 402, balance: bal });
    const row = { ...tx, ref: tx.ref || '', operator: tx.operator || '', note: tx.note || '', idempotencyKey: tx.idempotencyKey || '', balanceAfter } as WalletTxRow;
    await this.col('wallet_transactions').insertOne({ ...row });
    await this.col('users').updateOne({ username: tx.username }, { $set: { walletBalance: balanceAfter } });
    return row;
  }
  async getWalletTxByIdempotencyKey(key: string) { if (!key) return undefined; const row = await this.col('wallet_transactions').findOne({ idempotencyKey: key }); return row ? this.strip(row) : undefined; }
  async listWalletTxFor(username: string, limit = 100) { return (await this.col('wallet_transactions').find({ username }).sort({ createdAt: -1 }).limit(limit).toArray()).map((r: any) => this.strip(r)); }
  async listWalletTx(limit = 300) { return (await this.col('wallet_transactions').find({}).sort({ createdAt: -1 }).limit(limit).toArray()).map((r: any) => this.strip(r)); }
  async createOnsiteOrder(o: OnsiteOrderRow) { await this.col('onsite_orders').insertOne({ ...o }); }
  async getOnsiteOrder(id: string) { const row = await this.col('onsite_orders').findOne({ id }); return row ? this.strip(row) : undefined; }
  async listOnsiteOrders(fl: { status?: string; username?: string; kind?: string } = {}) {
    const q: Record<string, any> = {}; if (fl.status) q.status = fl.status; if (fl.username) q.username = fl.username; if (fl.kind) q.kind = fl.kind;
    return (await this.col('onsite_orders').find(q).sort({ createdAt: -1 }).toArray()).map((r: any) => this.strip(r));
  }
  async updateOnsiteOrder(id: string, f: Partial<OnsiteOrderRow>) { const set: Record<string, any> = {}; for (const k of Object.keys(f)) if (ONSITE_ORDER_COLUMNS.has(k)) set[k] = (f as any)[k]; if (Object.keys(set).length) await this.col('onsite_orders').updateOne({ id }, { $set: set }); }


  // ---- Affiliate marketing ----
  async listAffiliates() { return (await this.col('affiliates').find({}).sort({ createdAt: -1 }).toArray()).map((r: any) => this.strip(r)); }
  async getAffiliateById(id: string) { const row = await this.col('affiliates').findOne({ id }); return row ? this.strip(row) : undefined; }
  async getAffiliateByCode(code: string) { const row = await this.col('affiliates').findOne({ code: { $regex: `^${code}$`, $options: 'i' } }); return row ? this.strip(row) : undefined; }
  async getAffiliateByUsername(username: string) { if (!username) return undefined; const row = await this.col('affiliates').findOne({ username: { $regex: `^${username}$`, $options: 'i' } }); return row ? this.strip(row) : undefined; }
  async createAffiliate(a: AffiliateRow) { await this.col('affiliates').insertOne({ ...a }); }
  async updateAffiliate(id: string, f: Partial<AffiliateRow>) { const set: Record<string, any> = {}; for (const k of Object.keys(f)) if (AFFILIATE_COLUMNS.has(k)) set[k] = (f as any)[k]; if (Object.keys(set).length) await this.col('affiliates').updateOne({ id }, { $set: set }); }
  async createAffiliateClick(c: AffiliateClickRow) { await this.col('affiliate_clicks').insertOne({ ...c }); }
  async countRecentAffiliateClicks(code: string, ipHash: string, uaHash: string, since: string) { return this.col('affiliate_clicks').countDocuments({ code, ipHash, uaHash, createdAt: { $gte: since } }); }
  async countAffiliateClicks(code: string, since?: string) { const q: any = { code }; if (since) q.createdAt = { $gte: since }; return this.col('affiliate_clicks').countDocuments(q); }
  async upsertAffiliateAttribution(a: AffiliateAttributionRow) {
    if (a.username) await this.col('affiliate_attributions').deleteMany({ username: a.username });
    if (a.visitorId) await this.col('affiliate_attributions').deleteMany({ visitorId: a.visitorId });
    await this.col('affiliate_attributions').insertOne({ ...a });
  }
  async getAttributionForUser(username: string) { if (!username) return undefined; const row = await this.col('affiliate_attributions').find({ username }).sort({ updatedAt: -1 }).limit(1).next(); return row ? this.strip(row) : undefined; }
  async getAttributionForVisitor(visitorId: string) { if (!visitorId) return undefined; const row = await this.col('affiliate_attributions').find({ visitorId }).sort({ updatedAt: -1 }).limit(1).next(); return row ? this.strip(row) : undefined; }
  async listAttributionsByCode(code: string) { return (await this.col('affiliate_attributions').find({ code }).toArray()).map((r: any) => this.strip(r)); }
  async createAffiliateCommission(c: AffiliateCommissionRow) { await this.col('affiliate_commissions').insertOne({ ...c }); }
  async getAffiliateCommissionById(id: string) { const row = await this.col('affiliate_commissions').findOne({ id }); return row ? this.strip(row) : undefined; }
  async listAffiliateCommissions(fl: { affiliateId?: string; username?: string; orderId?: string; status?: string } = {}) {
    const q: Record<string, any> = {}; if (fl.affiliateId) q.affiliateId = fl.affiliateId; if (fl.username) q.username = fl.username; if (fl.orderId) q.orderId = fl.orderId; if (fl.status) q.status = fl.status;
    return (await this.col('affiliate_commissions').find(q).sort({ createdAt: -1 }).toArray()).map((r: any) => this.strip(r));
  }
  async updateAffiliateCommission(id: string, f: Partial<AffiliateCommissionRow>) { const set: Record<string, any> = {}; for (const k of Object.keys(f)) if (AFFILIATE_COMMISSION_COLUMNS.has(k)) set[k] = (f as any)[k]; if (Object.keys(set).length) await this.col('affiliate_commissions').updateOne({ id }, { $set: set }); }
  async createAffiliateAudit(a: AffiliateAuditRow) { await this.col('affiliate_audit').insertOne({ ...a }); }
  async listAffiliateAudit(affiliateId?: string, limit = 200) {
    const q: any = affiliateId ? { affiliateId } : {};
    return (await this.col('affiliate_audit').find(q).sort({ createdAt: -1 }).limit(limit).toArray()).map((r: any) => this.strip(r));
  }

  // ---- Accessories / shop ----
  async listAccessories() { return (await this.col('accessories').find({}).toArray()).map((r: any) => this.strip(r)); }
  async getAccessoryById(id: string) { const row = await this.col('accessories').findOne({ id }); return row ? this.strip(row) : undefined; }
  async createAccessory(a: AccessoryRow) { await this.col('accessories').insertOne({ ...a }); }
  async updateAccessory(id: string, f: Partial<AccessoryRow>) { await this.col('accessories').updateOne({ id }, { $set: f }); }
  async decrementAccessoryStock(id: string, qty: number) {
    await this.col('accessories').updateOne({ id }, { $inc: { stock: -qty } });
    await this.col('accessories').updateOne({ id, stock: { $lt: 0 } }, { $set: { stock: 0 } });
  }
  async deleteAccessory(id: string) { await this.col('accessories').deleteOne({ id }); }
  async countAccessories() { return this.col('accessories').countDocuments({}); }

  async listShopOrders() { return (await this.col('shop_orders').find({}).toArray()).map((r: any) => this.strip(r)); }
  async getShopOrderById(id: string) { const row = await this.col('shop_orders').findOne({ id }); return row ? this.strip(row) : undefined; }
  async addShopOrder(o: ShopOrderRow) { await this.col('shop_orders').insertOne({ ...o }); }
  async setShopOrderStatus(id: string, status: string) { await this.col('shop_orders').updateOne({ id }, { $set: { status } }); }

  // ---- Tournaments ----
  async listTournaments() { return (await this.col('tournaments').find({}).toArray()).map((r: any) => this.strip(r)); }
  async getTournamentById(id: string) { const row = await this.col('tournaments').findOne({ id }); return row ? this.strip(row) : undefined; }
  async createTournament(t: TournamentRow) { await this.col('tournaments').insertOne({ ...t }); }
  async registerTournamentTeam(id: string, teamsJson: string, count: number) {
    await this.col('tournaments').updateOne({ id }, { $set: { teams: teamsJson, registeredTeamsCount: count } });
  }
  async deleteTournament(id: string) { await this.col('tournaments').deleteOne({ id }); }
  async countTournaments() { return this.col('tournaments').countDocuments({}); }

  // ---- Articles ----
  async listArticles() { return (await this.col('articles').find({}).toArray()).map((r: any) => this.strip(r)); }
  async getArticleById(id: string) { const row = await this.col('articles').findOne({ id }); return row ? this.strip(row) : undefined; }
  async createArticle(a: ArticleRow) { await this.col('articles').insertOne({ ...a }); }
  async setArticleComments(id: string, commentsJson: string) { await this.col('articles').updateOne({ id }, { $set: { comments: commentsJson } }); }
  async deleteArticle(id: string) { await this.col('articles').deleteOne({ id }); }
  async countArticles() { return this.col('articles').countDocuments({}); }

  // ---- User messages ----
  async listUserMessages() { return (await this.col('user_messages').find({}).toArray()).map((r: any) => this.strip(r)); }
  async listUserMessagesFor(username: string) {
    return (await this.col('user_messages').find({ $or: [{ recipient: 'All' }, { recipient: username }] }).toArray()).map((r: any) => this.strip(r));
  }
  async addUserMessage(m: UserMessageRow) { await this.col('user_messages').insertOne({ ...m }); }
  async setUserMessageRead(id: string) { await this.col('user_messages').updateOne({ id }, { $set: { isRead: true } }); }
  async getUserMessageById(id: string) { const row = await this.col('user_messages').findOne({ id }); return row ? this.strip(row) : undefined; }

  // ---- Themes ----
  async listThemes() { return (await this.col('themes').find({}).toArray()).map((r: any) => this.strip(r)); }
  async createTheme(t: ThemeRow) { await this.col('themes').updateOne({ id: t.id }, { $setOnInsert: t }, { upsert: true }); }

  // ---- App sliders ----
  async listSliders() { return (await this.col('app_sliders').find({}).toArray()).map((r: any) => this.strip(r)); }
  async getSliderById(id: string) { const row = await this.col('app_sliders').findOne({ id }); return row ? this.strip(row) : undefined; }
  async createSlider(s: SliderRow) { await this.col('app_sliders').insertOne({ ...s }); }
  async updateSlider(id: string, f: Partial<SliderRow>) { await this.col('app_sliders').updateOne({ id }, { $set: f }); }
  async deleteSlider(id: string) { await this.col('app_sliders').deleteOne({ id }); }

  // ---- Seeding ----
  async seedMinimal(adminUser: AdminSeedInput): Promise<void> {
    await this.createDatabaseIfNotExist();
    const passwordHash = await hashPassword(adminUser.password || 'admin');
    await this.col('users').updateOne(
      { username: adminUser.username || 'admin' },
      { $set: { username: adminUser.username || 'admin', passwordHash, email: adminUser.email || 'admin@gamenet.com', phone: adminUser.phone || '09120000000', loyaltyPoints: 1000, role: 'admin' } },
      { upsert: true }
    );
    await this.setSetting('activeThemeId', 'dark-gold');
    for (const theme of DEFAULT_THEMES) await this.createTheme(theme);
    await seedAffiliateSettings(this);
    logDbQuery(this.name, 'NoSQL', 'db.users.updateOne(..., {upsert:true}) — admin seeded with hashed password');
  }

  async seedSampleData(): Promise<void> {
    for (const room of SAMPLE_CHAT_ROOMS) await this.createChatRoom(room);
    if ((await this.countSystems()) === 0) for (const s of SAMPLE_SYSTEMS) await this.createSystem(s);
    if ((await this.countCafeItems()) === 0) for (const c of SAMPLE_CAFE_ITEMS) await this.createCafeItem(c);
    if ((await this.countAccessories()) === 0) for (const a of SAMPLE_ACCESSORIES) await this.createAccessory(a);
    for (const s of SAMPLE_SLIDERS) await this.createSlider(s);
    if ((await this.countArticles()) === 0) for (const a of SAMPLE_ARTICLES) await this.createArticle(a);
    if ((await this.countTournaments()) === 0) for (const t of SAMPLE_TOURNAMENTS) await this.createTournament(t);
    if ((await this.countReservationLogs()) === 0) for (const l of SAMPLE_RESERVATION_LOGS) await this.addReservationLog(l);
    logDbQuery(this.name, 'NoSQL', 'Sample data seeded into collections.');
  }

  async purgeSampleData(): Promise<void> {
    const collections = ['systems', 'cafe_items', 'accessories', 'tournaments', 'articles', 'chat_rooms', 'reservation_logs', 'app_sliders', 'chat_messages', 'cafe_orders', 'shop_orders'];
    for (const c of collections) await this.col(c).deleteMany({});
    logDbQuery(this.name, 'NoSQL', 'Sample data purged from all collections (admin account & themes kept).');
  }
}

// =============================================================================
// ACTIVE PROVIDER SINGLETON
// =============================================================================
let activeProvider: IDataStore = new SqliteStore();

export function getActiveDataProvider(): IDataStore {
  return activeProvider;
}

export function setActiveDataProvider(provider: IDataStore) {
  activeProvider = provider;
}

export async function initializeActiveProvider(): Promise<IDataStore> {
  const fs = require('fs');
  const installConfigPath = installConfigFile();

  let provider: IDataStore = new SqliteStore();
  // اولویت ۱: متغیر محیطی MONGO_URL (Railway MongoDB) — بدون نیاز به صفحه‌ی نصب.
  // اولویت ۲: install-config.json (ویزارد نصب). اولویت ۳: SQLite در DATA_DIR.
  const envMongo = (process.env.MONGO_URL || process.env.MONGODB_URI || '').trim();
  if (envMongo) {
    provider = new MongoStore();
    provider.config = { connectionString: envMongo, dbName: process.env.MONGO_DB_NAME || 'bazino', source: 'env' };
    console.log('[Database Engine] MONGO_URL detected → using MongoDB (env-configured)');
  } else if (fs.existsSync(installConfigPath)) {
    try {
      const configData = JSON.parse(fs.readFileSync(installConfigPath, 'utf8'));
      if (configData.isInstalled) {
        const type = configData.dbType || 'sqlite';
        provider = type === 'sqlserver' ? new SqlServerStore() : type === 'mongodb' ? new MongoStore() : new SqliteStore();
        provider.config = configData.connectionString ? { connectionString: configData.connectionString } : (configData.dbConfig || {});
      }
    } catch (err) {
      console.error('[Database Engine] Error loading install-config.json, falling back to SQLite:', err);
      provider = new SqliteStore();
    }
  }

  await provider.connect();
  await provider.createDatabaseIfNotExist();
  setActiveDataProvider(provider);
  console.log(`[Database Engine] Active provider initialized: ${provider.name}`);
  return provider;
}
