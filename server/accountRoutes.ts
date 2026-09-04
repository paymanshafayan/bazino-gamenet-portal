/**
 * تسک ۱۲ — احراز هویت پیامکی (OTP)، پروفایل کاربر و تیکت پشتیبانی.
 *
 * این ماژول جدا از server.ts نگه داشته شده تا آن فایل ۴۵۰۰ خطی بزرگ‌تر نشود.
 * server.ts فقط `registerAccountRoutes(app, deps)` را صدا می‌زند.
 */
import express from 'express';
import path from 'path';
import fs from 'fs';
import { createHash, randomBytes, randomInt, randomUUID } from 'crypto';
import { apiError } from './apiMessages';
import { getActiveDataProvider, hashPassword, verifyPassword, USER_PROFILE_COLUMNS, type IDataStore, type UserRow, type TicketRow } from './dataProviders';
import { getSmsProvider, isMockSms, MockSmsProvider } from './sms';

export interface AccountRouteDeps {
  signAuthToken: (username: string) => string;
  requireAuth: express.RequestHandler;
  jsonParser: express.RequestHandler;
  dataDir: string;
  /** لیست‌های سمپل/دیتابیس برای تب‌های پروفایل */
  listMyTransactions: (username: string) => Promise<any[]>;
  listMyReservations: (username: string) => Promise<any[]>;
  listTournaments: () => Promise<any[]>;
}

// ---------------------------------------------------------------------------
// شماره تلفن — نرمال‌سازی به E.164 (پیش‌فرض ترکیه +90)
// ---------------------------------------------------------------------------
export function normalizePhone(raw: unknown, defaultCountry = '+90'): string | null {
  if (typeof raw !== 'string') return null;
  // ارقام فارسی/عربی → لاتین
  let s = raw.replace(/[۰-۹]/g, d => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d))).replace(/[٠-٩]/g, d => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)));
  s = s.replace(/[\s\-().]/g, '');
  if (s.startsWith('00')) s = '+' + s.slice(2);
  if (!s.startsWith('+')) {
    if (s.startsWith('0')) s = defaultCountry + s.slice(1);
    else s = defaultCountry + s;
  }
  if (!/^\+[1-9]\d{7,14}$/.test(s)) return null;
  return s;
}

const OTP_TTL_MS = 5 * 60 * 1000;
const OTP_MAX_ATTEMPTS = 5;
export const OTP_LIMITS = {
  phoneMinGapSec: 60,
  phonePerHour: 5,
  ipPer10Min: 10,
  ipPerHour: 30,
};

function hashOtp(code: string, salt: string) {
  return createHash('sha256').update(`${salt}:${code}`).digest('hex');
}

function clientIp(req: express.Request): string {
  // با app.set('trust proxy', 1) خود express از X-Forwarded-For می‌خواند
  return (req.ip || req.socket?.remoteAddress || '0.0.0.0').replace(/^::ffff:/, '');
}

const iso = (ms: number) => new Date(ms).toISOString();

/** خروجی امن کاربر برای کلاینت (بدون هش رمز) */
export function publicUser(row: UserRow) {
  return {
    username: row.username,
    email: row.email || '',
    phone: row.phone || '',
    loyaltyPoints: row.loyaltyPoints,
    role: row.role || 'gamer',
    displayName: row.displayName || '',
    avatarUrl: row.avatarUrl || '',
    bio: row.bio || '',
    gamerTag: row.gamerTag || '',
    city: row.city || '',
    birthDate: row.birthDate || '',
    phoneVerified: !!row.phoneVerifiedAt,
    hasPassword: row.hasPassword === undefined || row.hasPassword === null ? true : !!row.hasPassword,
    createdAt: row.createdAt || '',
  };
}

/** محاسبهٔ محدودیت‌ها — جدا شده تا در تست‌ها هم قابل استفاده باشد. null = مجاز */
export async function checkOtpRateLimit(store: IDataStore, phone: string, ip: string, now = Date.now()): Promise<{ code: 'OTP_TOO_SOON' | 'OTP_RATE_LIMIT'; retryAfter: number } | null> {
  const hourAgo = iso(now - 3600_000);
  const byPhone = await store.listRecentOtps({ phone, since: hourAgo });
  if (byPhone.length) {
    const newest = byPhone.reduce((a, b) => (a.createdAt > b.createdAt ? a : b));
    const gap = (now - Date.parse(newest.createdAt)) / 1000;
    if (gap < OTP_LIMITS.phoneMinGapSec) return { code: 'OTP_TOO_SOON', retryAfter: Math.ceil(OTP_LIMITS.phoneMinGapSec - gap) };
    if (byPhone.length >= OTP_LIMITS.phonePerHour) {
      const oldest = byPhone.reduce((a, b) => (a.createdAt < b.createdAt ? a : b));
      return { code: 'OTP_RATE_LIMIT', retryAfter: Math.max(1, Math.ceil((Date.parse(oldest.createdAt) + 3600_000 - now) / 1000)) };
    }
  }
  const byIp = await store.listRecentOtps({ ip, since: hourAgo });
  if (byIp.length >= OTP_LIMITS.ipPerHour) {
    const oldest = byIp.reduce((a, b) => (a.createdAt < b.createdAt ? a : b));
    return { code: 'OTP_RATE_LIMIT', retryAfter: Math.max(1, Math.ceil((Date.parse(oldest.createdAt) + 3600_000 - now) / 1000)) };
  }
  const tenMinAgo = now - 600_000;
  const recentIp = byIp.filter(o => Date.parse(o.createdAt) >= tenMinAgo);
  if (recentIp.length >= OTP_LIMITS.ipPer10Min) {
    const oldest = recentIp.reduce((a, b) => (a.createdAt < b.createdAt ? a : b));
    return { code: 'OTP_RATE_LIMIT', retryAfter: Math.max(1, Math.ceil((Date.parse(oldest.createdAt) + 600_000 - now) / 1000)) };
  }
  return null;
}

const TICKET_STATUSES = new Set(['open', 'answered', 'customer_reply', 'closed']);

export async function registerAccountRoutes(app: express.Express, deps: AccountRouteDeps) {
  const { signAuthToken, requireAuth, jsonParser } = deps;
  const isProd = process.env.NODE_ENV === 'production';

  // =========================================================================
  // OTP
  // =========================================================================
  app.post('/api/auth/otp/request', jsonParser, async (req, res) => {
    try {
      const phone = normalizePhone(req.body?.phone);
      if (!phone) return res.status(400).json(apiError(req, 'OTP_PHONE_INVALID'));
      const store = getActiveDataProvider();
      const ip = clientIp(req);
      const limited = await checkOtpRateLimit(store, phone, ip);
      if (limited) {
        res.setHeader('Retry-After', String(limited.retryAfter));
        return res.status(429).json({ ...apiError(req, limited.code, { sec: limited.retryAfter }), retryAfter: limited.retryAfter });
      }
      // کد قبلی همین شماره باطل می‌شود (فقط آخرین کد معتبر است)
      const prev = await store.getLatestActiveOtp(phone, 'login');
      if (prev) await store.updateOtp(prev.id, { consumedAt: iso(Date.now()) });

      const code = String(randomInt(0, 1_000_000)).padStart(6, '0');
      const salt = randomBytes(8).toString('hex');
      const now = Date.now();
      await store.createOtp({
        id: randomUUID(), phone, codeHash: `${salt}$${hashOtp(code, salt)}`, ip, purpose: 'login',
        createdAt: iso(now), expiresAt: iso(now + OTP_TTL_MS), attempts: 0, consumedAt: '',
      });
      const sms = getSmsProvider();
      const result = await sms.send(phone, `Bazino login code: ${code}\nKod ${Math.round(OTP_TTL_MS / 60000)} dk gecerlidir.`);
      if (!result.ok) {
        console.error('[otp] sms send failed:', result.error);
        return res.status(502).json(apiError(req, 'OTP_SEND_FAILED'));
      }
      res.json({ success: true, phone, expiresIn: OTP_TTL_MS / 1000, retryAfter: OTP_LIMITS.phoneMinGapSec, provider: sms.name });
    } catch (e) {
      res.status(500).json({ error: String(e) });
    }
  });

  app.post('/api/auth/otp/verify', jsonParser, async (req, res) => {
    try {
      const phone = normalizePhone(req.body?.phone);
      const code = String(req.body?.code ?? '').replace(/[۰-۹]/g, d => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d))).trim();
      if (!phone) return res.status(400).json(apiError(req, 'OTP_PHONE_INVALID'));
      const store = getActiveDataProvider();
      const otp = await store.getLatestActiveOtp(phone, 'login');
      if (!otp) return res.status(400).json(apiError(req, 'OTP_NOT_FOUND'));
      const now = Date.now();
      if (Date.parse(otp.expiresAt) < now) {
        await store.updateOtp(otp.id, { consumedAt: iso(now) });
        return res.status(400).json(apiError(req, 'OTP_EXPIRED'));
      }
      const [salt, hash] = otp.codeHash.split('$');
      if (!/^\d{6}$/.test(code) || hashOtp(code, salt) !== hash) {
        const attempts = (otp.attempts || 0) + 1;
        if (attempts >= OTP_MAX_ATTEMPTS) {
          await store.updateOtp(otp.id, { attempts, consumedAt: iso(now) });
          return res.status(400).json(apiError(req, 'OTP_LOCKED'));
        }
        await store.updateOtp(otp.id, { attempts });
        return res.status(400).json({ ...apiError(req, 'OTP_WRONG', { left: OTP_MAX_ATTEMPTS - attempts }), attemptsLeft: OTP_MAX_ATTEMPTS - attempts });
      }
      await store.updateOtp(otp.id, { consumedAt: iso(now) });

      let user = await store.getUserByPhone(phone);
      let isNew = false;
      if (!user) {
        // نام کاربری = شمارهٔ تلفن (بدون +)؛ اگر تصادفاً گرفته شده بود پسوند می‌گیرد
        let username = phone.replace(/^\+/, '');
        if (await store.getUserByUsername(username)) username = `${username}-${randomBytes(2).toString('hex')}`;
        await store.createUser({ username, password: randomBytes(24).toString('base64url'), email: '', phone });
        await store.updateUserFields(username, { hasPassword: 0, phoneVerifiedAt: iso(now), createdAt: iso(now) });
        await store.addTransaction({ id: 'wel-' + Math.random().toString(36).substring(2, 9), points: 100, description: 'هدیه خوش‌آمدگویی عضویت طلایی بازینو', type: 'Bonus', date: 'امروز', username });
        user = await store.getUserByUsername(username);
        isNew = true;
      } else if (!user.phoneVerifiedAt) {
        await store.updateUserFields(user.username, { phoneVerifiedAt: iso(now) });
        user = await store.getUserByUsername(user.username);
      }
      if (!user) return res.status(500).json({ error: 'user creation failed' });
      res.json({ success: true, isNew, user: publicUser(user), token: signAuthToken(user.username) });
    } catch (e) {
      res.status(500).json({ error: String(e) });
    }
  });

  /** فقط برای توسعه/تست با درایور mock — آخرین کد ارسال‌شده به یک شماره */
  app.get('/api/auth/otp/dev-peek', (req, res) => {
    // فقط با درایور mock و خارج از production (یا با OTP_DEV_PEEK=1 صریح برای تست‌های e2e)
    if (!isMockSms() || (isProd && process.env.OTP_DEV_PEEK !== '1')) return res.status(404).json({ error: 'Not found' });
    const phone = normalizePhone(String(req.query.phone || ''));
    if (!phone) return res.status(400).json(apiError(req, 'OTP_PHONE_INVALID'));
    const last = (getSmsProvider() as MockSmsProvider).lastFor(phone);
    if (!last) return res.status(404).json({ error: 'no sms' });
    const code = last.message.match(/\d{6}/)?.[0] || '';
    res.json({ phone, code, at: last.at });
  });

  // =========================================================================
  // پروفایل
  // =========================================================================
  const me = async (req: express.Request) => getActiveDataProvider().getUserByUsername((req as any).authUsername);

  app.get('/api/me/profile', requireAuth, async (req, res) => {
    const row = await me(req);
    if (!row) return res.status(401).json(apiError(req, 'USER_NOT_FOUND'));
    res.json({ success: true, user: publicUser(row) });
  });

  app.put('/api/me/profile', requireAuth, jsonParser, async (req, res) => {
    try {
      const row = await me(req);
      if (!row) return res.status(401).json(apiError(req, 'USER_NOT_FOUND'));
      const allowed = ['displayName', 'bio', 'gamerTag', 'city', 'birthDate', 'email'] as const;
      const fields: Partial<UserRow> = {};
      for (const k of allowed) {
        if (req.body?.[k] === undefined || !USER_PROFILE_COLUMNS.has(k)) continue;
        const v = String(req.body[k] ?? '').trim().slice(0, k === 'bio' ? 500 : 120);
        (fields as any)[k] = v;
      }
      if (fields.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fields.email)) return res.status(400).json(apiError(req, 'FILL_REQUIRED_FIELDS'));
      if (fields.birthDate && !/^\d{4}-\d{2}-\d{2}$/.test(fields.birthDate)) fields.birthDate = '';
      await getActiveDataProvider().updateUserFields(row.username, fields);
      const updated = await me(req);
      res.json({ success: true, user: publicUser(updated!) });
    } catch (e) {
      res.status(500).json({ error: String(e) });
    }
  });

  // آواتار: body خام تصویر (image/*) → WebP 256px در DATA_DIR/uploads/avatars
  const avatarDir = path.join(deps.dataDir, 'uploads', 'avatars');
  app.use('/uploads/avatars', express.static(avatarDir, { maxAge: '365d', immutable: true }));
  const rawImage = express.raw({ type: ['image/jpeg', 'image/png', 'image/webp', 'application/octet-stream'], limit: '5mb' });
  app.post('/api/me/avatar', requireAuth, rawImage, async (req, res) => {
    try {
      const row = await me(req);
      if (!row) return res.status(401).json(apiError(req, 'USER_NOT_FOUND'));
      const buf: Buffer | undefined = Buffer.isBuffer(req.body) ? req.body : undefined;
      if (!buf || buf.length < 100) return res.status(400).json(apiError(req, 'INVALID_IMAGE'));
      let out: Buffer;
      try {
        const sharp = (await import('sharp')).default;
        out = await sharp(buf).rotate().resize(256, 256, { fit: 'cover' }).webp({ quality: 82 }).toBuffer();
      } catch (e) {
        console.error('[avatar] sharp failed:', e);
        return res.status(400).json(apiError(req, 'INVALID_IMAGE'));
      }
      fs.mkdirSync(avatarDir, { recursive: true });
      const safe = row.username.replace(/[^a-zA-Z0-9_-]/g, '_');
      const name = `${safe}-${Date.now().toString(36)}.webp`;
      fs.writeFileSync(path.join(avatarDir, name), out);
      // فایل قبلی حذف می‌شود
      if (row.avatarUrl && row.avatarUrl.startsWith('/uploads/avatars/')) {
        try { fs.unlinkSync(path.join(avatarDir, path.basename(row.avatarUrl))); } catch { /* ignore */ }
      }
      const avatarUrl = `/uploads/avatars/${name}`;
      await getActiveDataProvider().updateUserFields(row.username, { avatarUrl });
      res.json({ success: true, avatarUrl });
    } catch (e) {
      res.status(500).json({ error: String(e) });
    }
  });

  app.delete('/api/me/avatar', requireAuth, async (req, res) => {
    const row = await me(req);
    if (!row) return res.status(401).json(apiError(req, 'USER_NOT_FOUND'));
    if (row.avatarUrl && row.avatarUrl.startsWith('/uploads/avatars/')) {
      try { fs.unlinkSync(path.join(avatarDir, path.basename(row.avatarUrl))); } catch { /* ignore */ }
    }
    await getActiveDataProvider().updateUserFields(row.username, { avatarUrl: '' });
    res.json({ success: true });
  });

  /** تنظیم/تغییر رمز دائمی. کاربر OTP-only (hasPassword=0) رمز قبلی لازم ندارد. */
  app.post('/api/me/password', requireAuth, jsonParser, async (req, res) => {
    try {
      const row = await me(req);
      if (!row) return res.status(401).json(apiError(req, 'USER_NOT_FOUND'));
      const newPassword = String(req.body?.newPassword || '');
      if (newPassword.length < 6) return res.status(400).json(apiError(req, 'PASSWORD_TOO_SHORT'));
      const needsOld = row.hasPassword === undefined || row.hasPassword === null || !!row.hasPassword;
      if (needsOld) {
        const ok = await verifyPassword(String(req.body?.oldPassword || ''), row.passwordHash);
        if (!ok) return res.status(400).json(apiError(req, 'OLD_PASSWORD_WRONG'));
      }
      await getActiveDataProvider().updateUserFields(row.username, { passwordHash: await hashPassword(newPassword), hasPassword: 1 });
      res.json({ success: true, user: publicUser({ ...row, hasPassword: 1 }) });
    } catch (e) {
      res.status(500).json({ error: String(e) });
    }
  });

  app.get('/api/me/points', requireAuth, async (req, res) => {
    const row = await me(req);
    if (!row) return res.status(401).json(apiError(req, 'USER_NOT_FOUND'));
    const tx = await deps.listMyTransactions(row.username);
    res.json({ success: true, loyaltyPoints: row.loyaltyPoints, transactions: tx });
  });
  app.get('/api/me/reservations', requireAuth, async (req, res) => {
    const list = await deps.listMyReservations((req as any).authUsername);
    res.json({ success: true, reservations: list });
  });
  app.get('/api/me/orders', requireAuth, async (req, res) => {
    const store = getActiveDataProvider();
    const u = (req as any).authUsername;
    const cafe = (await store.listCafeOrders()).filter(o => (o.username || '') === u).map(o => ({ ...o, kind: 'cafe', items: safeJson(o.items) }));
    const shop = (await store.listShopOrders()).filter(o => (o.username || '') === u).map(o => ({ ...o, kind: 'shop', cart: safeJson(o.cart) }));
    res.json({ success: true, cafe, shop });
  });
  app.get('/api/me/tournaments', requireAuth, async (req, res) => {
    const u = (req as any).authUsername as string;
    const all = await deps.listTournaments();
    const mine = all.filter(t => {
      const teams = Array.isArray(t.teams) ? t.teams : safeJson(t.teams);
      return (teams || []).some((tm: any) => teamHasUser(tm, u));
    }).map(t => ({ id: t.id, title: t.title, titleFa: t.titleFa, titleEn: t.titleEn, titleRu: t.titleRu, titleTr: t.titleTr, game: t.game, startDate: t.startDate, status: t.status, registrationFee: t.registrationFee }));
    res.json({ success: true, tournaments: mine });
  });

  // =========================================================================
  // تیکت پشتیبانی — کاربر
  // =========================================================================
  const ticketOut = (t: TicketRow) => ({ ...t, hasNewReply: !!t.lastStaffReplyAt && t.lastStaffReplyAt > (t.userSeenAt || '') });

  app.get('/api/me/tickets', requireAuth, async (req, res) => {
    const list = await getActiveDataProvider().listTicketsFor((req as any).authUsername);
    res.json({ success: true, tickets: list.map(ticketOut), unread: list.filter(t => ticketOut(t).hasNewReply).length });
  });

  app.post('/api/me/tickets', requireAuth, jsonParser, async (req, res) => {
    try {
      const subject = String(req.body?.subject || '').trim().slice(0, 150);
      const body = String(req.body?.message || '').trim().slice(0, 4000);
      if (!subject || !body) return res.status(400).json(apiError(req, 'TICKET_FIELDS_REQUIRED'));
      const category = String(req.body?.category || 'general').slice(0, 40);
      const priority = ['low', 'normal', 'high'].includes(req.body?.priority) ? req.body.priority : 'normal';
      const now = iso(Date.now());
      const u = (req as any).authUsername;
      const id = 'TK-' + Date.now().toString(36).toUpperCase() + randomBytes(2).toString('hex').toUpperCase();
      const store = getActiveDataProvider();
      await store.createTicket({ id, username: u, subject, category, priority, status: 'open', createdAt: now, updatedAt: now, lastStaffReplyAt: '', userSeenAt: now });
      await store.addTicketMessage({ id: randomUUID(), ticketId: id, author: u, isStaff: 0, body, createdAt: now });
      res.json({ success: true, ticket: ticketOut((await store.getTicketById(id))!) });
    } catch (e) {
      res.status(500).json({ error: String(e) });
    }
  });

  app.get('/api/me/tickets/:id', requireAuth, async (req, res) => {
    const store = getActiveDataProvider();
    const t = await store.getTicketById(req.params.id);
    if (!t || t.username !== (req as any).authUsername) return res.status(404).json(apiError(req, 'TICKET_NOT_FOUND'));
    const messages = await store.listTicketMessages(t.id);
    const now = iso(Date.now());
    await store.updateTicket(t.id, { userSeenAt: now });
    res.json({ success: true, ticket: { ...ticketOut(t), userSeenAt: now, hasNewReply: false }, messages });
  });

  app.post('/api/me/tickets/:id/reply', requireAuth, jsonParser, async (req, res) => {
    const store = getActiveDataProvider();
    const t = await store.getTicketById(req.params.id);
    if (!t || t.username !== (req as any).authUsername) return res.status(404).json(apiError(req, 'TICKET_NOT_FOUND'));
    if (t.status === 'closed') return res.status(400).json(apiError(req, 'TICKET_CLOSED'));
    const body = String(req.body?.message || '').trim().slice(0, 4000);
    if (!body) return res.status(400).json(apiError(req, 'MESSAGE_REQUIRED'));
    const now = iso(Date.now());
    await store.addTicketMessage({ id: randomUUID(), ticketId: t.id, author: t.username, isStaff: 0, body, createdAt: now });
    await store.updateTicket(t.id, { status: 'customer_reply', updatedAt: now, userSeenAt: now });
    res.json({ success: true, ticket: ticketOut((await store.getTicketById(t.id))!), messages: await store.listTicketMessages(t.id) });
  });

  app.post('/api/me/tickets/:id/close', requireAuth, async (req, res) => {
    const store = getActiveDataProvider();
    const t = await store.getTicketById(req.params.id);
    if (!t || t.username !== (req as any).authUsername) return res.status(404).json(apiError(req, 'TICKET_NOT_FOUND'));
    const now = iso(Date.now());
    await store.updateTicket(t.id, { status: 'closed', updatedAt: now, userSeenAt: now });
    res.json({ success: true, ticket: ticketOut((await store.getTicketById(t.id))!) });
  });

  // =========================================================================
  // تیکت — ادمین (پشت app.use('/api/admin', requireAdmin) در server.ts)
  // =========================================================================
  app.get('/api/admin/tickets', async (req, res) => {
    const status = String(req.query.status || '');
    const store = getActiveDataProvider();
    const list = await store.listTickets(TICKET_STATUSES.has(status) ? status : undefined);
    res.json({ success: true, tickets: list, openCount: await store.countOpenTickets() });
  });
  app.get('/api/admin/tickets/:id', async (req, res) => {
    const store = getActiveDataProvider();
    const t = await store.getTicketById(req.params.id);
    if (!t) return res.status(404).json(apiError(req, 'TICKET_NOT_FOUND'));
    const user = await store.getUserByUsername(t.username);
    res.json({ success: true, ticket: t, messages: await store.listTicketMessages(t.id), user: user ? publicUser(user) : null });
  });
  app.post('/api/admin/tickets/:id/reply', jsonParser, async (req, res) => {
    const store = getActiveDataProvider();
    const t = await store.getTicketById(req.params.id);
    if (!t) return res.status(404).json(apiError(req, 'TICKET_NOT_FOUND'));
    const body = String(req.body?.message || '').trim().slice(0, 4000);
    if (!body) return res.status(400).json(apiError(req, 'MESSAGE_REQUIRED'));
    const now = iso(Date.now());
    await store.addTicketMessage({ id: randomUUID(), ticketId: t.id, author: (req as any).authUsername, isStaff: 1, body, createdAt: now });
    await store.updateTicket(t.id, { status: 'answered', updatedAt: now, lastStaffReplyAt: now });
    res.json({ success: true, ticket: await store.getTicketById(t.id), messages: await store.listTicketMessages(t.id) });
  });
  app.post('/api/admin/tickets/:id/status', jsonParser, async (req, res) => {
    const store = getActiveDataProvider();
    const t = await store.getTicketById(req.params.id);
    if (!t) return res.status(404).json(apiError(req, 'TICKET_NOT_FOUND'));
    const status = String(req.body?.status || '');
    if (!TICKET_STATUSES.has(status)) return res.status(400).json({ error: 'invalid status' });
    await store.updateTicket(t.id, { status, updatedAt: iso(Date.now()) });
    res.json({ success: true, ticket: await store.getTicketById(t.id) });
  });
}

function safeJson(s: any) { if (typeof s !== 'string') return s; try { return JSON.parse(s); } catch { return []; } }
function teamHasUser(team: any, username: string): boolean {
  if (!team || typeof team !== 'object') return false;
  const norm = (v: any) => String(v || '').toLowerCase();
  if (norm(team.captain) === username.toLowerCase() || norm(team.username) === username.toLowerCase() || norm(team.owner) === username.toLowerCase()) return true;
  const members = team.members || team.players || [];
  return Array.isArray(members) && members.some((m: any) => norm(typeof m === 'string' ? m : m?.username || m?.name) === username.toLowerCase());
}
