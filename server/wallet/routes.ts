/**
 * تسک ۱۳ — کیف پول حضوری + «پرداخت در محل» (جایگزین درگاه آنلاین که در KKTC در دسترس نیست).
 *
 *   GET  /api/payments/methods                    → روش‌های مجاز هر نوع سفارش (فرانت‌اند)
 *   GET  /api/me/wallet                           → موجودی + گردش کاربر
 *   GET  /api/me/onsite-orders                    → سفارش‌های در انتظار پرداخت حضوری کاربر
 *   POST /api/checkout/wallet   {kind, params}    → کسر از کیف پول + تکمیل فوری سفارش (fulfil)
 *   POST /api/checkout/onsite   {kind, params}    → ثبت سفارش «پرداخت در محل» با مهلت
 *   POST /api/checkout/onsite/:id/cancel          → لغو توسط کاربر (قبل از تسویه)
 *   POST /api/sync/wallet/topup  {phone, amount, operator, note, idempotencyKey}   ← نرم‌افزار مدیریت
 *   POST /api/sync/wallet/charge {phone, amount, operator, note, idempotencyKey}   ← برداشت حضوری
 *   GET  /api/sync/wallet/:phone                  ← موجودی و گردش برای نرم‌افزار مدیریت
 *   GET  /api/sync/onsite-orders[?status=]        ← فهرست سفارش‌های حضوری برای نرم‌افزار مدیریت
 *   POST /api/sync/onsite-orders/:id/settle {operator, method}  ← تأیید پرداخت حضوری
 *   GET  /api/admin/wallet/transactions, POST /api/admin/wallet/adjust, GET/POST /api/admin/onsite-orders…
 *
 * قوانین:
 *  - موجودی هرگز منفی نمی‌شود (appendWalletTx در لایه‌ی داده اتمیک است).
 *  - رزرو ایستگاه با پرداخت در محل: مهلت = ۱۰ دقیقه قبل از شروع سانس؛ تورنمنت: ۴۸ ساعت قبل از شروع.
 *    گذشت مهلت بدون تسویه → ابطال خودکار (sweep دوره‌ای + تنبل هنگام خواندن فهرست‌ها).
 *  - بوفه/فروشگاه فقط «پرداخت در محل» و بدون مهلت؛ امتیاز فقط بعد از تسویه‌ی حضوری داده می‌شود.
 *  - رزرو/تورنمنت با کیف پول فوراً تأیید می‌شوند؛ لغو توسط کاربر قبل از مهلت → بازگشت کامل به کیف پول.
 */
import type express from 'express';
import { transactional } from '../management/core';
import { randomBytes } from 'crypto';
import type { IDataStore, OnsiteOrderRow, WalletTxRow } from '../dataProviders';
import { normalizePhone } from '../accountRoutes';
import { onOrderPaid, onOrderReversed, approveDueCommissions } from '../affiliate/engine';

export type OrderKind = 'reservation' | 'cafe' | 'shop' | 'tournament';
export type PayMethod = 'wallet' | 'onsite' | 'online';

/** مهلت‌های پرداخت حضوری */
export const ONSITE_RESERVATION_LEAD_MS = 10 * 60 * 1000;          // ۱۰ دقیقه قبل از سانس
export const ONSITE_TOURNAMENT_LEAD_MS = 48 * 60 * 60 * 1000;      // ۴۸ ساعت قبل از تورنمنت

/** روش‌های پرداخت مجاز هر نوع سفارش (بدون احتساب «آنلاین» که با فلگ اضافه می‌شود) */
export const METHODS_BY_KIND: Record<OrderKind, PayMethod[]> = {
  reservation: ['wallet', 'onsite'],
  tournament: ['wallet', 'onsite'],
  cafe: ['onsite'],
  shop: ['onsite'],
};

export const ONSITE_STATUSES = ['pending_onsite', 'settled', 'cancelled_unpaid', 'cancelled_user', 'cancelled_admin'] as const;

export interface WalletDeps {
  app: express.Express;
  getStore: () => IDataStore;
  requireAuth: express.RequestHandler;
  requireSyncApiKey: express.RequestHandler;
  authUsername: (req: express.Request) => string | undefined;
  quote: (kind: OrderKind, params: any, username: string | undefined) => Promise<{ amount: number; payload: any; description: string }>;
  /** تکمیل سفارش (همان مسیر PayTR): ثبت رزرو/تیم/سفارش + امتیاز. */
  fulfil: (kind: OrderKind, payload: any, username: string, order: { merchantOid: string; kind: string; username: string }) => Promise<any>;
  /** برگرداندن اثر یک سفارش تکمیل‌شده (آزاد کردن ایستگاه/ظرفیت) — برای لغو رزرو/تورنمنتِ کیف‌پولی. */
  unfulfil: (kind: OrderKind, payload: any, username: string, result: any) => Promise<void>;
  /** آیا پرداخت آنلاین فعال است؟ */
  onlineEnabled: () => boolean;
  /** ثبت لاگ */
  log?: (msg: string) => void;
}

const iso = (t = Date.now()) => new Date(t).toISOString();
const newId = (p: string) => `${p}-${Date.now().toString(36).toUpperCase()}${randomBytes(3).toString('hex').toUpperCase()}`;
const round2 = (n: number) => Math.round(n * 100) / 100;

/* ---------- تبدیل تاریخ‌های سایت به زمان مطلق ---------- */
const PERSIAN_DIGITS = '۰۱۲۳۴۵۶۷۸۹';
export function toLatinDigits(s: string): string {
  return String(s ?? '').replace(/[۰-۹]/g, d => String(PERSIAN_DIGITS.indexOf(d))).replace(/[٠-٩]/g, d => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)));
}
function jalaliToGregorian(jy: number, jm: number, jd: number): Date {
  jy += 1595;
  let days = -355668 + 365 * jy + Math.floor(jy / 33) * 8 + Math.floor(((jy % 33) + 3) / 4) + jd + (jm < 7 ? (jm - 1) * 31 : (jm - 7) * 30 + 186);
  let gy = 400 * Math.floor(days / 146097);
  days %= 146097;
  if (days > 36524) { gy += 100 * Math.floor(--days / 36524); days %= 36524; if (days >= 365) days++; }
  gy += 4 * Math.floor(days / 1461);
  days %= 1461;
  if (days > 365) { gy += Math.floor((days - 1) / 365); days = (days - 1) % 365; }
  let gd = days + 1;
  const leap = (gy % 4 === 0 && gy % 100 !== 0) || gy % 400 === 0;
  const sal = [0, 31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  let gm = 1;
  for (gm = 1; gm <= 12 && gd > sal[gm]; gm++) gd -= sal[gm];
  return new Date(gy, gm - 1, gd);
}
/**
 * تاریخ رشته‌ای سایت → Date (نیمه‌شب محلی). پشتیبانی: «امروز»/«فردا»، ISO/YYYY-MM-DD، جلالی «۱۴۰۵/۰۴/۲۰».
 * برمی‌گرداند null اگر قابل تفسیر نباشد.
 */
export function parseSiteDate(raw: string, now = new Date()): Date | null {
  const s = toLatinDigits(raw || '').trim();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (!s || /^(امروز|today|bugün|сегодня)$/i.test(s)) return today;
  if (/^(فردا|tomorrow|yarın|завтра)$/i.test(s)) return new Date(today.getTime() + 86400000);
  const m = s.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (m) {
    const y = Number(m[1]), mo = Number(m[2]), d = Number(m[3]);
    if (y >= 1300 && y < 1500) return jalaliToGregorian(y, mo, d);
    if (y >= 1900) return new Date(y, mo - 1, d);
  }
  const t = Date.parse(s);
  return Number.isNaN(t) ? null : new Date(t);
}
/** «HH:MM» روی یک روز مشخص */
export function combineDateTime(day: Date, hhmm: string): Date | null {
  const m = toLatinDigits(hhmm || '').match(/^(\d{1,2}):(\d{2})/);
  if (!m) return null;
  return new Date(day.getFullYear(), day.getMonth(), day.getDate(), Number(m[1]), Number(m[2]), 0, 0);
}

/** محاسبه‌ی مهلت پرداخت حضوری بر اساس نوع سفارش. برای بوفه/فروشگاه '' (بدون مهلت). */
export function computeOnsiteDueAt(kind: OrderKind, payload: any, now = new Date()): { dueAt: string; startsAt: string } {
  if (kind === 'reservation') {
    const day = parseSiteDate(payload?.date, now) || new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const start = combineDateTime(day, payload?.startTime) || new Date(day.getTime() + 12 * 3600000);
    return { dueAt: iso(start.getTime() - ONSITE_RESERVATION_LEAD_MS), startsAt: start.toISOString() };
  }
  if (kind === 'tournament') {
    const day = parseSiteDate(payload?.startDate, now);
    const start = day ? new Date(day.getTime() + 12 * 3600000) : new Date(now.getTime() + 7 * 86400000); // بدون تاریخ معتبر: یک هفته بعد
    return { dueAt: iso(start.getTime() - ONSITE_TOURNAMENT_LEAD_MS), startsAt: start.toISOString() };
  }
  return { dueAt: '', startsAt: '' };
}

/** ابطال خودکار سفارش‌های حضوری که مهلت‌شان گذشته. برمی‌گرداند تعداد ابطال‌شده‌ها. */
export async function expireOnsiteOrders(store: IDataStore, deps: Pick<WalletDeps, 'unfulfil'>, now = Date.now()): Promise<number> {
  return store.runInTransaction(() => expireOnsiteOrdersAtomic(store, deps, now));
}
async function expireOnsiteOrdersAtomic(store: IDataStore, deps: Pick<WalletDeps, 'unfulfil'>, now: number): Promise<number> {
  const pending = await store.listOnsiteOrders({ status: 'pending_onsite' });
  let n = 0;
  for (const o of pending) {
    if (!o.dueAt) continue;
    const due = Date.parse(o.dueAt);
    if (!Number.isFinite(due) || due > now) continue;
    await store.updateOnsiteOrder(o.id, { status: 'cancelled_unpaid', updatedAt: iso(now) });
    try {
      const payload = JSON.parse(o.payload || '{}');
      const result = o.result ? JSON.parse(o.result) : null;
      await deps.unfulfil(o.kind as OrderKind, payload, o.username, result);
    } catch { /* ignore */ }
    try { await onOrderReversed(store, o.id, 'expire'); } catch { /* ignore */ }
    n++;
  }
  return n;
}

function httpError(res: express.Response, e: any, fallback = 500) {
  const status = e?.statusCode || fallback;
  return res.status(status).json({ error: e?.code || e?.message || String(e), code: e?.code || undefined, message: e?.message, balance: e?.balance });
}

export function registerWalletRoutes(d: WalletDeps) {
  const { app, requireAuth, requireSyncApiKey } = d;
  const store = () => d.getStore();
  const log = d.log || (() => {});

  const sweep = () => expireOnsiteOrders(store(), d).catch(() => 0);
  const timer = setInterval(() => {
    sweep();
    approveDueCommissions(store()).catch(() => 0);
  }, 60 * 1000);
  timer.unref?.();

  const methodsFor = (kind: OrderKind): PayMethod[] => {
    const base = [...(METHODS_BY_KIND[kind] || [])];
    if (d.onlineEnabled()) base.push('online');
    return base;
  };

  /* ---------- عمومی ---------- */
  app.get('/api/payments/methods', (_req, res) => {
    res.json({
      online: d.onlineEnabled(),
      currency: 'TL',
      methods: { reservation: methodsFor('reservation'), tournament: methodsFor('tournament'), cafe: methodsFor('cafe'), shop: methodsFor('shop') },
      onsiteLeadMinutes: { reservation: ONSITE_RESERVATION_LEAD_MS / 60000, tournament: ONSITE_TOURNAMENT_LEAD_MS / 60000 },
    });
  });

  /* ---------- کاربر ---------- */
  app.get('/api/me/wallet', requireAuth, async (req, res) => {
    try {
      const username = d.authUsername(req)!;
      const user = await store().getUserByUsername(username);
      const tx = await store().listWalletTxFor(username, 100);
      const balance = await store().getWalletBalance(username);
      res.json({ balance: round2(balance), currency: 'TL', transactions: tx });
    } catch (e) { httpError(res, e); }
  });

  app.get('/api/me/onsite-orders', requireAuth, async (req, res) => {
    try {
      await sweep();
      const username = d.authUsername(req)!;
      const list = await store().listOnsiteOrders({ username });
      res.json(list.map(o => ({ ...o, payload: safeJson(o.payload), result: safeJson(o.result) })));
    } catch (e) { httpError(res, e); }
  });

  /** پرداخت با کیف پول: قیمت سمت سرور، کسر اتمیک، تکمیل فوری. */
  app.post('/api/checkout/wallet', requireAuth, transactional(d.getStore, async (req, res) => {
    try {
      const { kind, params } = req.body || {};
      if (!methodsFor(kind).includes('wallet')) return res.status(400).json({ error: 'Wallet payment is not allowed for this order kind', code: 'METHOD_NOT_ALLOWED' });
      const username = d.authUsername(req)!;
      const q = await d.quote(kind, params || {}, username);
      const orderId = newId('WL');
      let tx: WalletTxRow | null = null;
      if (q.amount > 0) {
        tx = await store().appendWalletTx({ id: newId('TX'), username, amount: -round2(q.amount), type: 'purchase', ref: orderId, operator: '', note: q.description, idempotencyKey: '', createdAt: iso() });
      }
      let result: any;
      try {
        result = await d.fulfil(kind, q.payload, username, { merchantOid: orderId, kind, username });
      } catch (e) {
        // برگشت پول اگر تکمیل سفارش شکست خورد
        if (tx) await store().appendWalletTx({ id: newId('TX'), username, amount: round2(q.amount), type: 'refund', ref: orderId, operator: 'system', note: 'fulfil failed', idempotencyKey: '', createdAt: iso() });
        throw e;
      }
      // رکورد سفارش برای لغو/گزارش (وضعیت settled با روش wallet)
      const dueAt = computeOnsiteDueAt(kind, q.payload).dueAt;
      await store().createOnsiteOrder({ id: orderId, kind, username, amount: q.amount, status: 'settled', dueAt, payload: JSON.stringify(q.payload), description: q.description, result: JSON.stringify({ method: 'wallet', ...result }), createdAt: iso(), updatedAt: iso(), settledAt: iso(), settledBy: 'wallet' });
      try {
        const u = await store().getUserByUsername(username);
        await onOrderPaid(store(), { username, orderId, kind, amount: q.amount, dueAt, payload: q.payload, userRole: u?.role });
      } catch { /* commission must never fail checkout */ }
      log(`Wallet checkout ${orderId} (${kind}) by ${username}: ${q.amount} TL`);
      res.json({ success: true, orderId, amount: q.amount, balance: tx ? tx.balanceAfter : undefined, result });
    } catch (e) { httpError(res, e); }
  }));

  /** پرداخت در محل: فقط ثبت سفارش با مهلت؛ رزرو ایستگاه/ظرفیت تورنمنت همین حالا گرفته می‌شود. */
  app.post('/api/checkout/onsite', requireAuth, transactional(d.getStore, async (req, res) => {
    try {
      const { kind, params } = req.body || {};
      if (!methodsFor(kind).includes('onsite')) return res.status(400).json({ error: 'On-site payment is not allowed for this order kind', code: 'METHOD_NOT_ALLOWED' });
      const username = d.authUsername(req)!;
      const q = await d.quote(kind, params || {}, username);
      const { dueAt, startsAt } = computeOnsiteDueAt(kind, q.payload);
      if (dueAt && Date.parse(dueAt) <= Date.now()) {
        return res.status(400).json({ error: 'Too late for on-site payment', code: 'ONSITE_TOO_LATE', dueAt, startsAt });
      }
      const orderId = newId('OS');
      // رزرو/تورنمنت: جا همین حالا گرفته می‌شود (بدون امتیاز) تا ابطال خودکار بتواند آزادش کند
      let result: any = null;
      if (kind === 'reservation' || kind === 'tournament') {
        result = await d.fulfil(kind, { ...q.payload, __noPoints: true, __pendingOnsite: true }, username, { merchantOid: orderId, kind, username });
      }
      await store().createOnsiteOrder({ id: orderId, kind, username, amount: q.amount, status: 'pending_onsite', dueAt, payload: JSON.stringify(q.payload), description: q.description, result: result ? JSON.stringify(result) : '', createdAt: iso(), updatedAt: iso(), settledAt: '', settledBy: '' });
      log(`On-site order ${orderId} (${kind}) by ${username}: ${q.amount} TL, due ${dueAt || '-'}`);
      res.json({ success: true, orderId, amount: q.amount, status: 'pending_onsite', dueAt, startsAt, result });
    } catch (e) { httpError(res, e); }
  }));

  /** لغو توسط کاربر: در انتظار → لغو؛ کیف‌پولی قبل از مهلت → بازگشت کامل. */
  app.post('/api/checkout/onsite/:id/cancel', requireAuth, transactional(d.getStore, async (req, res) => {
    try {
      const username = d.authUsername(req)!;
      const o = await store().getOnsiteOrder(String(req.params.id));
      if (!o || o.username !== username) return res.status(404).json({ error: 'Order not found', code: 'NOT_FOUND' });
      if (o.kind !== 'reservation' && o.kind !== 'tournament') return res.status(400).json({ error: 'Only reservations/tournaments can be cancelled', code: 'NOT_CANCELLABLE' });
      const payload = safeJson(o.payload); const result = safeJson(o.result);
      if (o.status === 'pending_onsite') {
        await store().updateOnsiteOrder(o.id, { status: 'cancelled_user', updatedAt: iso() });
        await d.unfulfil(o.kind as OrderKind, payload, username, result);
        try { await onOrderReversed(store(), o.id, username); } catch { /* ignore */ }
        return res.json({ success: true, status: 'cancelled_user', refunded: 0 });
      }
      if (o.status === 'settled' && o.settledBy === 'wallet') {
        if (o.dueAt && Date.parse(o.dueAt) <= Date.now()) return res.status(400).json({ error: 'Cancellation window has passed', code: 'TOO_LATE', dueAt: o.dueAt });
        await store().updateOnsiteOrder(o.id, { status: 'cancelled_user', updatedAt: iso() });
        await d.unfulfil(o.kind as OrderKind, payload, username, result);
        const tx = o.amount > 0 ? await store().appendWalletTx({ id: newId('TX'), username, amount: round2(o.amount), type: 'refund', ref: o.id, operator: username, note: 'cancelled by user', idempotencyKey: '', createdAt: iso() }) : null;
        try { await onOrderReversed(store(), o.id, username); } catch { /* ignore */ }
        return res.json({ success: true, status: 'cancelled_user', refunded: o.amount, balance: tx?.balanceAfter });
      }
      return res.status(400).json({ error: `Order is ${o.status}`, code: 'BAD_STATE' });
    } catch (e) { httpError(res, e); }
  }));

  /* ---------- نرم‌افزار مدیریت (sync API key) ---------- */
  async function userForPhone(phoneRaw: unknown, createIfMissing: boolean) {
    const phone = normalizePhone(phoneRaw);
    if (!phone) throw Object.assign(new Error('Invalid phone'), { statusCode: 400, code: 'BAD_PHONE' });
    let user = await store().getUserByPhone(phone);
    // سازگاری با شماره‌های قدیمی ذخیره‌شده بدون نرمال‌سازی (مثل 0912…): تطبیق با ۱۰ رقم آخر
    if (!user && typeof phoneRaw === 'string') user = await store().getUserByPhone(phoneRaw.trim());
    if (!user) {
      const tail = phone.replace(/\D/g, '').slice(-10);
      const all = await store().listUsers();
      user = all.find(u => String(u.phone || '').replace(/\D/g, '').slice(-10) === tail && tail.length === 10);
    }
    if (!user && createIfMissing) {
      let username = phone.replace(/^\+/, '');
      if (await store().getUserByUsername(username)) username = `${username}-${randomBytes(2).toString('hex')}`;
      await store().createUser({ username, password: randomBytes(24).toString('base64url'), email: '', phone });
      await store().updateUserFields(username, { hasPassword: 0, createdAt: iso() });
      user = await store().getUserByUsername(username);
    }
    if (!user) throw Object.assign(new Error('Customer not found'), { statusCode: 404, code: 'NOT_FOUND' });
    return user;
  }

  async function walletOp(req: express.Request, res: express.Response, sign: 1 | -1, type: 'topup' | 'purchase') {
    try {
      const { phone, amount, operator, note, idempotencyKey } = req.body || {};
      const amt = round2(Number(amount));
      if (!(amt > 0)) return res.status(400).json({ error: 'Amount must be positive', code: 'BAD_AMOUNT' });
      const key = idempotencyKey ? String(idempotencyKey).slice(0, 100) : '';
      if (key) {
        const dup = await store().getWalletTxByIdempotencyKey(key);
        if (dup) return res.json({ success: true, duplicate: true, transaction: dup, balance: dup.balanceAfter });
      }
      const user = await userForPhone(phone, sign === 1);
      const tx = await store().appendWalletTx({ id: newId('TX'), username: user.username, amount: sign * amt, type, ref: '', operator: String(operator || 'management-app').slice(0, 100), note: String(note || '').slice(0, 500), idempotencyKey: key, createdAt: iso() });
      log(`Wallet ${type} ${sign * amt} TL for ${user.username} by ${tx.operator}`);
      res.json({ success: true, username: user.username, phone: user.phone, transaction: tx, balance: tx.balanceAfter });
    } catch (e) { httpError(res, e); }
  }
  app.post('/api/sync/wallet/topup', requireSyncApiKey, (req, res) => walletOp(req, res, 1, 'topup'));
  app.post('/api/sync/wallet/charge', requireSyncApiKey, (req, res) => walletOp(req, res, -1, 'purchase'));
  app.get('/api/sync/wallet/:phone', requireSyncApiKey, async (req, res) => {
    try {
      const user = await userForPhone(req.params.phone, false);
      const tx = await store().listWalletTxFor(user.username, 50);
      res.json({ username: user.username, phone: user.phone, displayName: user.displayName || '', balance: round2(tx.length ? tx[0].balanceAfter : Number(user.walletBalance || 0)), transactions: tx });
    } catch (e) { httpError(res, e); }
  });

  const listOnsite = async (req: express.Request, res: express.Response) => {
    try {
      await sweep();
      const status = typeof req.query.status === 'string' && req.query.status ? req.query.status : undefined;
      const kind = typeof req.query.kind === 'string' && req.query.kind ? req.query.kind : undefined;
      const list = await store().listOnsiteOrders({ status, kind });
      res.json(list.map(o => ({ ...o, payload: safeJson(o.payload), result: safeJson(o.result) })));
    } catch (e) { httpError(res, e); }
  };
  const settleOnsite = async (req: express.Request, res: express.Response, who: string) => {
    try {
      const o = await store().getOnsiteOrder(String(req.params.id));
      if (!o) return res.status(404).json({ error: 'Order not found', code: 'NOT_FOUND' });
      if (o.status !== 'pending_onsite') return res.status(400).json({ error: `Order is ${o.status}`, code: 'BAD_STATE' });
      const method = String((req.body || {}).method || 'cash');
      const payload = safeJson(o.payload) || {};
      let result: any = safeJson(o.result);
      if (method === 'wallet') {
        // تسویه از کیف پول مشتری در محل
        await store().appendWalletTx({ id: newId('TX'), username: o.username, amount: -round2(o.amount), type: 'purchase', ref: o.id, operator: who, note: o.description, idempotencyKey: '', createdAt: iso() });
      }
      if (o.kind === 'cafe' || o.kind === 'shop') {
        // بوفه/فروشگاه: تکمیل واقعی (کسر موجودی، سفارش، امتیاز) فقط الان
        result = await d.fulfil(o.kind as OrderKind, payload, o.username, { merchantOid: o.id, kind: o.kind, username: o.username });
      } else {
        // رزرو/تورنمنت: جا قبلاً گرفته شده؛ فقط امتیاز
        result = { ...(result || {}), ...(await d.fulfil(o.kind as OrderKind, { ...payload, __pointsOnly: true }, o.username, { merchantOid: o.id, kind: o.kind, username: o.username })) };
      }
      await store().updateOnsiteOrder(o.id, { status: 'settled', settledAt: iso(), settledBy: `${method}:${who}`, result: JSON.stringify({ method, ...(result || {}) }), updatedAt: iso() });
      try {
        const u = await store().getUserByUsername(o.username);
        await onOrderPaid(store(), { username: o.username, orderId: o.id, kind: o.kind, amount: o.amount, dueAt: o.dueAt, payload, userRole: u?.role });
      } catch { /* commission must never fail settle */ }
      log(`On-site order ${o.id} settled (${method}) by ${who}`);
      res.json({ success: true, status: 'settled', result });
    } catch (e) { httpError(res, e); }
  };
  const cancelOnsiteByStaff = async (req: express.Request, res: express.Response, who: string) => {
    try {
      const o = await store().getOnsiteOrder(String(req.params.id));
      if (!o) return res.status(404).json({ error: 'Order not found', code: 'NOT_FOUND' });
      if (o.status !== 'pending_onsite') return res.status(400).json({ error: `Order is ${o.status}`, code: 'BAD_STATE' });
      await store().updateOnsiteOrder(o.id, { status: 'cancelled_admin', settledBy: who, updatedAt: iso() });
      await d.unfulfil(o.kind as OrderKind, safeJson(o.payload), o.username, safeJson(o.result));
      try { await onOrderReversed(store(), o.id, who); } catch { /* ignore */ }
      res.json({ success: true, status: 'cancelled_admin' });
    } catch (e) { httpError(res, e); }
  };

  app.get('/api/sync/onsite-orders', requireSyncApiKey, listOnsite);
  app.post('/api/sync/onsite-orders/:id/settle', requireSyncApiKey, (req, res) => settleOnsite(req, res, String((req.body || {}).operator || 'management-app').slice(0, 100)));
  app.post('/api/sync/onsite-orders/:id/cancel', requireSyncApiKey, (req, res) => cancelOnsiteByStaff(req, res, String((req.body || {}).operator || 'management-app').slice(0, 100)));

  /* ---------- ادمین (پشت /api/admin → requireAdmin سراسری) ---------- */
  app.get('/api/admin/wallet/transactions', async (req, res) => {
    try { res.json(await store().listWalletTx(Number(req.query.limit) || 300)); } catch (e) { httpError(res, e); }
  });
  app.get('/api/admin/wallet/:username', async (req, res) => {
    try {
      const user = await store().getUserByUsername(String(req.params.username));
      if (!user) return res.status(404).json({ error: 'User not found', code: 'NOT_FOUND' });
      const tx = await store().listWalletTxFor(user.username, 100);
      res.json({ username: user.username, phone: user.phone, balance: round2(tx.length ? tx[0].balanceAfter : Number(user.walletBalance || 0)), transactions: tx });
    } catch (e) { httpError(res, e); }
  });
  /** شارژ/اصلاح دستی توسط ادمین (مثبت یا منفی) */
  app.post('/api/admin/wallet/adjust', async (req, res) => {
    try {
      const { username, phone, amount, note } = req.body || {};
      const amt = round2(Number(amount));
      if (!amt || !Number.isFinite(amt)) return res.status(400).json({ error: 'Amount must be a non-zero number', code: 'BAD_AMOUNT' });
      const user = username ? await store().getUserByUsername(String(username)) : await userForPhone(phone, true);
      if (!user) return res.status(404).json({ error: 'User not found', code: 'NOT_FOUND' });
      const tx = await store().appendWalletTx({ id: newId('TX'), username: user.username, amount: amt, type: amt > 0 ? 'topup' : 'adjust', ref: '', operator: `admin:${d.authUsername(req)}`, note: String(note || '').slice(0, 500), idempotencyKey: '', createdAt: iso() });
      res.json({ success: true, username: user.username, transaction: tx, balance: tx.balanceAfter });
    } catch (e) { httpError(res, e); }
  });
  app.get('/api/admin/onsite-orders', listOnsite);
  app.post('/api/admin/onsite-orders/:id/settle', (req, res) => settleOnsite(req, res, `admin:${d.authUsername(req)}`));
  app.post('/api/admin/onsite-orders/:id/cancel', (req, res) => cancelOnsiteByStaff(req, res, `admin:${d.authUsername(req)}`));
}

function safeJson(s: string | null | undefined): any {
  if (!s) return null;
  try { return JSON.parse(s); } catch { return null; }
}
