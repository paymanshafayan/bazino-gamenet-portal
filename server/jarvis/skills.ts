/**
 * Jarvis skill registry — every admin-panel capability the assistant may use.
 *
 * Risk tiers (the agent loop enforces them):
 *   read      → runs automatically, answers facts from the real database
 *   write     → runs automatically (low-risk outbound), fully audited
 *   sensitive → NEVER runs from chat; files an approval for the admin instead
 *
 * Hard exclusions (no skill will ever exist for them): API keys, integration
 * tokens, secrets vault, staff/operator management, password or permission
 * changes, database reset/clear, data-source switching, payment-provider
 * settings. Guarded by tests.
 */
import { OpsCore, fail, nowISO } from '../management/core';
import { DurableQueue } from '../publishing/queue';
import { ContentService } from '../management/content';
import { PromotionService } from '../management/promotions';
import { PublishingSettings } from '../publishing/settings';
import { sanitizeAwaySettings } from '../affiliate/awayPolicy';
import { randomUUID } from 'node:crypto';

export type SkillRisk = 'read' | 'write' | 'sensitive';

export interface SkillContext { core: OpsCore; store: any; actor: string }

export interface Skill {
  id: string;
  title: string;
  description: string;
  risk: SkillRisk;
  params: Record<string, any>; // JSON schema (object)
  run: (ctx: SkillContext, input: any) => Promise<{ ok: boolean; summary: string; data?: any }>;
}

const OK = (summary: string, data?: any) => ({ ok: true, summary, data });
const ERR = (summary: string) => ({ ok: false, summary });
const obj = (properties: Record<string, any>, required: string[] = []) => ({ type: 'object', properties, required });
const str = (description: string) => ({ type: 'string', description });
const num = (description: string) => ({ type: 'number', description });
const cap = <T>(arr: T[], n: number) => arr.slice(0, n);

const today = () => new Date().toISOString().slice(0, 10);

export const SKILL_EXCLUSIONS = [
  'api keys / integration tokens', 'secrets vault', 'staff & operator management',
  'passwords & permissions', 'database reset or clear', 'data-source switch', 'payment provider settings',
];

export function buildSkillRegistry(): Skill[] {
  const skills: Skill[] = [];

  /* ── READ skills ─────────────────────────────────────────────── */

  skills.push({
    id: 'portal_stats', title: 'آمار کلی پورتال', risk: 'read',
    description: 'Counts of users, systems (free/reserved), open tickets, unread user messages, today reservations, menu/shop/tournament/article counts.',
    params: obj({}),
    run: async (ctx) => {
      const s = ctx.store;
      const [users, systems, tickets, msgs, reservations, cafe, shop, tournaments, articles] = await Promise.all([
        s.listUsers(), s.listSystems(), s.listTickets().catch(() => []), s.listUserMessages().catch(() => []),
        s.listReservationLogs().catch(() => []), s.listCafeItems(), s.listAccessories(), s.listTournaments(), s.listArticles(),
      ]);
      const openTickets = (tickets || []).filter((t: any) => t.status === 'open').length;
      const unread = (msgs || []).filter((m: any) => !m.isRead).length;
      const todayRes = (reservations || []).filter((r: any) => String(r.date || r.createdAt || '').includes(today())).length;
      return OK(`کاربران: ${users.length} · سیستم‌ها: ${systems.length} (آزاد ${systems.filter((x: any) => !x.isReserved).length}) · تیکت باز: ${openTickets} · پیام خوانده‌نشده: ${unread} · رزرو امروز: ${todayRes} · آیتم کافه: ${cafe.length} · کالای فروشگاه: ${shop.length} · تورنمنت: ${tournaments.length} · مقاله: ${articles.length}`, {
        users: users.length, systems: systems.length, freeSystems: systems.filter((x: any) => !x.isReserved).length,
        openTickets, unreadMessages: unread, todayReservations: todayRes, cafeItems: cafe.length, shopItems: shop.length, tournaments: tournaments.length, articles: articles.length,
      });
    },
  });

  skills.push({
    id: 'list_reservations', title: 'رزروها', risk: 'read',
    description: 'Recent reservation logs (date, user, system, status).',
    params: obj({ limit: num('Max rows (default 15, max 50)') }),
    run: async (ctx, input) => {
      const rows = await ctx.store.listReservationLogs().catch(() => []);
      const list = cap(rows as any[], Math.min(Number(input?.limit) || 15, 50));
      return OK(`${rows.length} رکورد رزرو؛ آخرین‌ها: ${list.map((r: any) => `${r.username || r.user || '?'}→${r.systemName || r.systemId || '?'} (${r.date || r.createdAt || '?'})`).join(' | ')}`, { total: rows.length, items: list });
    },
  });

  skills.push({
    id: 'search_user', title: 'جستجوی کاربر', risk: 'read',
    description: 'Find portal users by username/displayName/phone substring.',
    params: obj({ query: str('Search text (username, name or phone)') }, ['query']),
    run: async (ctx, input) => {
      const q = String(input?.query || '').toLowerCase().trim();
      if (!q) return ERR('متن جستجو خالی است');
      const users = await ctx.store.listUsers();
      const hits = cap(users.filter((u: any) =>
        [u.username, u.displayName, u.phone].some(v => String(v || '').toLowerCase().includes(q))), 15);
      if (!hits.length) return ERR(`کاربری شبیه «${q}» پیدا نشد`);
      return OK(`${hits.length} کاربر: ${hits.map((u: any) => `${u.displayName || u.username} (${u.username})`).join(' · ')}`, { users: hits.map((u: any) => ({ username: u.username, displayName: u.displayName, credits: u.credits, loyaltyPoints: u.loyaltyPoints, phone: u.phone })) });
    },
  });

  skills.push({
    id: 'user_details', title: 'جزئیات کاربر', risk: 'read',
    description: 'Wallet credits, loyalty points and recent transactions of one user.',
    params: obj({ username: str('Exact username') }, ['username']),
    run: async (ctx, input) => {
      const u = await ctx.store.getUserByUsername(String(input?.username || ''));
      if (!u) return ERR('کاربر پیدا نشد');
      const tx = cap((await ctx.store.listTransactions().catch(() => [])).filter((t: any) => t.username === u.username), 10);
      const res = await ctx.store.getActiveReservationForUser(u.username).catch(() => null);
      return OK(`${u.displayName || u.username} · کردیت: ${u.credits ?? 0} · امتیاز: ${u.loyaltyPoints ?? 0} · رزرو فعال: ${res?.systemName || '—'} · ${tx.length} تراکنش اخیر`, { user: { username: u.username, credits: u.credits, loyaltyPoints: u.loyaltyPoints }, activeReservation: res || null, transactions: tx });
    },
  });

  skills.push({
    id: 'list_tickets', title: 'تیکت‌های پشتیبانی', risk: 'read',
    description: 'Support tickets with status filter (open/answered/closed).',
    params: obj({ status: str("Filter by status, e.g. 'open'") }),
    run: async (ctx, input) => {
      const status = input?.status ? String(input.status) : undefined;
      const rows = await ctx.store.listTickets(status).catch(() => []);
      return OK(`${rows.length} تیکت: ${cap(rows, 15).map((t: any) => `#${t.id.slice(-6)} ${t.username}: ${t.subject} [${t.status}]`).join(' | ')}`, { total: rows.length, items: cap(rows, 15) });
    },
  });

  skills.push({
    id: 'ticket_details', title: 'جزئیات تیکت', risk: 'read',
    description: 'Full message thread of one support ticket.',
    params: obj({ ticketId: str('Ticket id') }, ['ticketId']),
    run: async (ctx, input) => {
      const t = await ctx.store.getTicketById(String(input?.ticketId || ''));
      if (!t) return ERR('تیکت پیدا نشد');
      const msgs = await ctx.store.listTicketMessages(t.id).catch(() => []);
      return OK(`تیکت ${t.subject} (${t.status}): ${msgs.map((m: any) => `${m.isStaff ? 'پشتیبانی' : m.author}: ${m.body.slice(0, 120)}`).join(' || ')}`, { ticket: t, messages: msgs });
    },
  });

  skills.push({
    id: 'list_user_messages', title: 'پیام‌های کاربران', risk: 'read',
    description: 'Inbox messages users received from the management (optionally only unread).',
    params: obj({ unreadOnly: { type: 'boolean', description: 'Only unread' } }),
    run: async (ctx, input) => {
      const rows = await ctx.store.listUserMessages().catch(() => []);
      const list = input?.unreadOnly ? rows.filter((m: any) => !m.isRead) : rows;
      return OK(`${list.length} پیام: ${cap(list, 15).map((m: any) => `${m.recipient}←«${m.title}»${m.isRead ? '' : ' (خوانده‌نشده)'}`).join(' | ')}`, { total: list.length, items: cap(list, 15) });
    },
  });

  skills.push({
    id: 'list_cafe_menu', title: 'منوی کافه', risk: 'read',
    description: 'Cafe items with price, inventory and availability.',
    params: obj({}),
    run: async (ctx) => {
      const rows = await ctx.store.listCafeItems();
      return OK(`${rows.length} آیتم: ${cap(rows, 25).map((i: any) => `${i.name} ${i.price}₺ (موجود ${i.inventory})`).join(' · ')}`, { items: rows });
    },
  });

  skills.push({
    id: 'list_shop_items', title: 'کالاهای فروشگاه', risk: 'read',
    description: 'Shop accessories with price and stock.',
    params: obj({}),
    run: async (ctx) => {
      const rows = await ctx.store.listAccessories();
      return OK(`${rows.length} کالا: ${cap(rows, 25).map((i: any) => `${i.name} ${i.price}₺ (موجود ${i.inventory ?? i.stock ?? '?'})`).join(' · ')}`, { items: rows });
    },
  });

  skills.push({
    id: 'list_tournaments', title: 'تورنمنت‌ها', risk: 'read',
    description: 'Tournaments with date, prize and status.',
    params: obj({}),
    run: async (ctx) => {
      const rows = await ctx.store.listTournaments();
      return OK(`${rows.length} تورنمنت: ${cap(rows, 20).map((t: any) => `${t.title || t.name} (${t.date || '?'}) جایزه ${t.prize ?? '?'}₺`).join(' · ')}`, { items: rows });
    },
  });

  skills.push({
    id: 'list_coupons', title: 'کوپن‌ها', risk: 'read',
    description: 'Active coupons with value and expiry.',
    params: obj({}),
    run: async (ctx) => {
      const svc = new PromotionService(ctx.core);
      const rows = await svc.listCoupons().catch(async () => await ctx.store.listCoupons());
      return OK(`${(rows as any[]).length} کوپن: ${cap(rows as any[], 20).map((c: any) => `${c.code} (${c.percent ? c.percent + '%' : (c.amount ?? '?') + '₺'}${c.expiresAt ? ' تا ' + String(c.expiresAt).slice(0, 10) : ''})`).join(' · ')}`, { items: rows });
    },
  });

  skills.push({
    id: 'list_transactions', title: 'تراکنش‌ها', risk: 'read',
    description: 'Recent wallet/credit transactions.',
    params: obj({ limit: num('Max rows (default 15)') }),
    run: async (ctx, input) => {
      const rows = await ctx.store.listTransactions();
      const list = cap(rows as any[], Math.min(Number(input?.limit) || 15, 50));
      return OK(`${rows.length} تراکنش؛ آخرین‌ها: ${list.map((t: any) => `${t.username} ${t.points > 0 ? '+' : ''}${t.points} (${t.type})`).join(' | ')}`, { total: rows.length, items: list });
    },
  });

  skills.push({
    id: 'list_articles', title: 'مقاله‌های بلاگ', risk: 'read',
    description: 'Blog articles with title and date.',
    params: obj({}),
    run: async (ctx) => {
      const rows = await ctx.store.listArticles();
      return OK(`${rows.length} مقاله: ${cap(rows, 15).map((a: any) => `${a.title} (${String(a.date || '').slice(0, 10)})`).join(' · ')}`, { items: cap(rows, 15) });
    },
  });

  skills.push({
    id: 'ig_inbox_summary', title: 'صندوق دایرکت اینستاگرام', risk: 'read',
    description: 'Recent inbound Instagram DMs with language, reply status and reason.',
    params: obj({}),
    run: async (ctx) => {
      const rows = (await ctx.core.list('ig-inbox')).map((r: any) => ({ id: r.id, ...r.data }))
        .sort((a: any, b: any) => String(b.receivedAt).localeCompare(String(a.receivedAt)));
      const unanswered = rows.filter((r: any) => !r.replied).length;
      return OK(`${rows.length} پیام ثبت‌شده، ${unanswered} بی‌پاسخ: ${cap(rows, 12).map((r: any) => `@${r.username || r.authorId} [${r.language}] ${r.replied ? 'پاسخ‌داده' : 'بی‌پاسخ (' + (r.reason || '') + ')'}: ${String(r.text || '').slice(0, 40)}`).join(' | ')}`, { total: rows.length, unanswered, items: cap(rows, 12) });
    },
  });

  skills.push({
    id: 'publishing_report', title: 'گزارش انتشار و صف', risk: 'read',
    description: 'Publishing inbox/outbox queue health, campaign members and campaigns.',
    params: obj({}),
    run: async (ctx) => {
      const q = new DurableQueue(ctx.core);
      const rep: any = await q.report();
      const members = await ctx.core.list('pub-member');
      const campaigns = await ctx.core.list('pub-campaign');
      return OK(`صف: دریافت ${rep.counts.received} · ارسال‌شده ${rep.counts.sent} · در صف ${rep.counts.queued} · نامشخص ${rep.counts.unknown} · شرکت‌کننده ${members.length} · کمپین ${campaigns.length}`, { report: rep, members: members.length, campaigns: campaigns.map((c: any) => ({ id: c.id, name: c.data.name, active: c.data.active })) });
    },
  });

  skills.push({
    id: 'content_list', title: 'محتواهای پیش‌نویس/انتشار', risk: 'read',
    description: 'Content pipeline items (draft/review/scheduled/published).',
    params: obj({}),
    run: async (ctx) => {
      const svc = new ContentService(ctx.core);
      const rows: any[] = await svc.list();
      return OK(`${rows.length} محتوا: ${cap(rows, 15).map((c: any) => `«${c.title}» [${c.status}]`).join(' · ')}`, { items: cap(rows, 15) });
    },
  });

  skills.push({
    id: 'audit_recent', title: 'آخرین رویدادهای ممیزی', risk: 'read',
    description: 'Recent audit log entries (actor, action, target).',
    params: obj({}),
    run: async (ctx) => {
      const rows = (await ctx.core.list('audit')).sort((a: any, b: any) => String(b.data.createdAt).localeCompare(String(a.data.createdAt)));
      return OK(`${rows.length} رویداد؛ آخرین‌ها: ${cap(rows, 15).map((r: any) => `${r.data.actor} ${r.data.action}`).join(' | ')}`, { items: cap(rows, 15).map((r: any) => r.data) });
    },
  });

  skills.push({
    id: 'away_status', title: 'وضعیت پاسخ خودکار غیبت', risk: 'read',
    description: 'Instagram away auto-reply settings and whether it is active right now.',
    params: obj({}),
    run: async (ctx) => {
      const raw = await ctx.store.getSetting('ig_away_settings');
      const s = sanitizeAwaySettings(raw ? JSON.parse(String(raw)) : {});
      const hour = new Intl.DateTimeFormat('en-GB', { timeZone: s.timezone, hour: 'numeric', hour12: false }).format(new Date());
      const active = s.enabled && (s.startHour === s.endHour || (s.startHour < s.endHour ? Number(hour) >= s.startHour && Number(hour) < s.endHour : Number(hour) >= s.startHour || Number(hour) < s.endHour));
      return OK(`پاسخ غیبت: ${s.enabled ? 'روشن' : 'خاموش'} · پنجره ${s.startHour}:00–${s.endHour}:00 (${s.timezone}) · الان ${active ? 'فعال' : 'غیرفعال'} (ساعت محلی ${hour}:00)`, { settings: s, activeNow: !!active });
    },
  });

  skills.push({
    id: 'chat_rooms', title: 'اتاق‌های چت', risk: 'read',
    description: 'Chat room names and recent messages of one room.',
    params: obj({ room: str('Room name (optional; without it lists rooms)') }),
    run: async (ctx, input) => {
      const rooms = await ctx.store.listChatRooms().catch(() => []);
      if (!input?.room) return OK(`اتاق‌ها: ${rooms.join(' · ') || '—'}`, { rooms });
      const msgs = cap(await ctx.store.listChatMessages(String(input.room)).catch(() => []), 20);
      return OK(`${msgs.length} پیام در ${input.room}: ${msgs.map((m: any) => `${m.username}: ${String(m.message || '').slice(0, 60)}`).join(' | ')}`, { messages: msgs });
    },
  });

  /* ── WRITE skills (low-risk, execute directly) ───────────────── */

  skills.push({
    id: 'send_user_message', title: 'ارسال پیام به کاربر', risk: 'write',
    description: 'Send an inbox message/notification from the management to one portal user.',
    params: obj({ recipient: str('Username'), title: str('Message title'), body: str('Message body'), notification: { type: 'boolean', description: 'Send as notification' } }, ['recipient', 'title', 'body']),
    run: async (ctx, input) => {
      const recipient = String(input?.recipient || '').trim();
      const u = await ctx.store.getUserByUsername(recipient);
      if (!u) return ERR('کاربر پیدا نشد');
      const msg = {
        id: 'msg-' + randomUUID().slice(0, 8), sender: 'جارویس (مدیریت)', recipient,
        title: String(input.title).slice(0, 120), body: String(input.body).slice(0, 2000),
        date: 'امروز', isRead: false, type: input?.notification ? 'notification' : 'message',
      };
      await ctx.store.addUserMessage(msg);
      return OK(`پیام «${msg.title}» برای ${recipient} ارسال شد.`, { messageId: msg.id });
    },
  });

  skills.push({
    id: 'create_content_draft', title: 'ساخت پیش‌نویس محتوا', risk: 'write',
    description: 'Create a blog content DRAFT (never publishes; admin approves in Content & Publish Queue).',
    params: obj({ title: str('Draft title'), body: str('Blog body text'), language: str('fa|en|tr|ru'), category: str('Category (default Instagram)'), idempotencyKey: str('Unique key') }, ['title', 'body']),
    run: async (ctx, input) => {
      const language = ['fa', 'en', 'tr', 'ru'].includes(String(input?.language)) ? String(input.language) : 'fa';
      const svc = new ContentService(ctx.core);
      const saved: any = await svc.create(`jarvis`, {
        idempotencyKey: String(input?.idempotencyKey || `jarvis-draft-${randomUUID()}`).slice(0, 100),
        title: String(input.title).slice(0, 200), destinations: ['blog'],
        versions: { blog: { title: String(input.title).slice(0, 200), body: String(input.body).slice(0, 8000), language, mediaUrl: '', mediaType: 'image', category: String(input?.category || 'Instagram').slice(0, 80) } },
      });
      return OK(`پیش‌نویس «${saved.data.title}» ساخته شد (${saved.id}) — انتشار نیازمند تأیید ادمین است.`, { contentId: saved.id });
    },
  });

  /* ── SENSITIVE skills (approval queue only) ──────────────────── */

  skills.push({
    id: 'adjust_credits', title: 'شارژ/کسر کردیت', risk: 'sensitive',
    description: 'Add or subtract Bazino credits (BC) of a user. Mirrors /api/admin/credits/adjust.',
    params: obj({ username: str('Username'), delta: num('Non-zero integer, positive=charge negative=deduct'), note: str('Reason note') }, ['username', 'delta']),
    run: async (ctx, input) => {
      const username = String(input?.username || '').trim();
      const delta = Number(input?.delta);
      if (!Number.isSafeInteger(delta) || delta === 0 || Math.abs(delta) > 1_000_000) return ERR('مقدار دلتا نامعتبر است');
      const u = await ctx.store.getUserByUsername(username);
      if (!u) return ERR('کاربر پیدا نشد');
      const before = Number(u.credits) || 0;
      if (before + delta < 0) return ERR('کردیت کافی نیست (نتیجه منفی می‌شود)');
      await ctx.store.addCreditsToUser(username, delta);
      await ctx.store.addTransaction({
        id: randomUUID().slice(0, 7), points: delta,
        description: `${delta > 0 ? 'شارژ' : 'کسر'} ${Math.abs(delta)} کردیت (BC) توسط جارویس${input?.note ? ` — ${String(input.note).slice(0, 180)}` : ''}`,
        type: 'Credits', date: 'امروز', username,
      });
      return OK(`کردیت ${username}: ${before} → ${before + delta}`, { username, before, after: before + delta });
    },
  });

  skills.push({
    id: 'update_cafe_item', title: 'ویرایش آیتم کافه', risk: 'sensitive',
    description: 'Update price, inventory or availability of a cafe item.',
    params: obj({ id: str('Cafe item id'), price: num('New price (TL)'), inventory: num('New stock count'), isAvailable: { type: 'boolean', description: 'Available on/off' } }, ['id']),
    run: async (ctx, input) => {
      const id = String(input?.id || '');
      const items = await ctx.store.listCafeItems();
      const item = items.find((i: any) => i.id === id || i.name === input?.name);
      if (!item) return ERR('آیتم کافه پیدا نشد');
      const fields: any = {};
      if (input?.price !== undefined && Number.isFinite(Number(input.price))) fields.price = Math.max(0, Number(input.price));
      if (input?.inventory !== undefined && Number.isFinite(Number(input.inventory))) fields.inventory = Math.max(0, Math.round(Number(input.inventory)));
      if (input?.isAvailable !== undefined) fields.isAvailable = input.isAvailable === true;
      if (!Object.keys(fields).length) return ERR('هیچ فیلدی برای تغییر داده نشد');
      await ctx.store.updateCafeItem(item.id, fields);
      return OK(`«${item.name}» به‌روز شد: ${Object.entries(fields).map(([k, v]) => `${k}=${v}`).join(', ')}`, { itemId: item.id, fields });
    },
  });

  skills.push({
    id: 'create_coupon', title: 'ساخت کوپن تخفیف', risk: 'sensitive',
    description: 'Create a discount coupon via the promotions service.',
    params: obj({ code: str('Coupon code'), percent: num('Percent discount 1-100'), amount: num('Fixed amount discount (TL)'), minAmount: num('Minimum order amount'), expiresAt: str('ISO date') }, ['code']),
    run: async (ctx, input) => {
      const svc = new PromotionService(ctx.core);
      const saved: any = await svc.saveCoupon(ctx.actor, {
        code: String(input?.code || '').toUpperCase().slice(0, 20),
        ...(input?.percent !== undefined ? { percent: Number(input.percent) } : {}),
        ...(input?.amount !== undefined ? { amount: Number(input.amount) } : {}),
        ...(input?.minAmount !== undefined ? { minAmount: Number(input.minAmount) } : {}),
        ...(input?.expiresAt ? { expiresAt: String(input.expiresAt).slice(0, 30) } : {}),
      });
      return OK(`کوپن «${input?.code}» ساخته شد.`, { coupon: saved?.data || saved });
    },
  });

  skills.push({
    id: 'answer_ticket', title: 'پاسخ تیکت', risk: 'sensitive',
    description: 'Post a staff reply on a support ticket and mark it answered.',
    params: obj({ ticketId: str('Ticket id'), body: str('Reply text') }, ['ticketId', 'body']),
    run: async (ctx, input) => {
      const t = await ctx.store.getTicketById(String(input?.ticketId || ''));
      if (!t) return ERR('تیکت پیدا نشد');
      const now = nowISO();
      await ctx.store.addTicketMessage({ id: 'tm-' + randomUUID().slice(0, 8), ticketId: t.id, author: 'جارویس', isStaff: 1, body: String(input.body).slice(0, 4000), createdAt: now });
      await ctx.store.updateTicket(t.id, { status: 'answered', lastStaffReplyAt: now, updatedAt: now });
      return OK(`پاسخ روی تیکت «${t.subject}» ثبت شد.`, { ticketId: t.id });
    },
  });

  skills.push({
    id: 'ig_away_toggle', title: 'روشن/خاموش کردن پاسخ غیبت', risk: 'sensitive',
    description: 'Enable/disable the Instagram away auto-reply and optionally change its window hours.',
    params: obj({ enabled: { type: 'boolean', description: 'On/off' }, startHour: num('Start hour 0-23'), endHour: num('End hour 0-23') }, ['enabled']),
    run: async (ctx, input) => {
      const raw = await ctx.store.getSetting('ig_away_settings');
      const current = sanitizeAwaySettings(raw ? JSON.parse(String(raw)) : {});
      const next = sanitizeAwaySettings({ ...current, enabled: input?.enabled === true, ...(Number.isFinite(Number(input?.startHour)) ? { startHour: Number(input.startHour) } : {}), ...(Number.isFinite(Number(input?.endHour)) ? { endHour: Number(input.endHour) } : {}) });
      await ctx.store.setSetting('ig_away_settings', JSON.stringify(next));
      return OK(`پاسخ غیبت ${next.enabled ? 'روشن' : 'خاموش'} شد (پنجره ${next.startHour}:00–${next.endHour}:00).`, { settings: next });
    },
  });

  skills.push({
    id: 'publish_content', title: 'انتشار محتوای تأییدشده', risk: 'sensitive',
    description: 'Approve and publish-now a content item that already has a version (blog destination).',
    params: obj({ contentId: str('Content id'), version: num('Current version number') }, ['contentId']),
    run: async (ctx, input) => {
      const svc = new ContentService(ctx.core);
      const row: any = await ctx.core.read('content', String(input?.contentId || ''));
      if (!row) return ERR('محتوا پیدا نشد');
      const version = Number.isFinite(Number(input?.version)) ? Number(input.version) : row.version;
      await svc.approve(ctx.actor, row.id, { version, destination: 'blog', idempotencyKey: `jarvis-approve-${row.id}-${version}` });
      await svc.schedule(ctx.actor, row.id, { publishNow: true, idempotencyKey: `jarvis-publish-${row.id}-${version}` });
      return OK(`محتوای «${row.data.title}» تأیید و برای انتشار فوری زمان‌بندی شد.`, { contentId: row.id });
    },
  });

  skills.push({
    id: 'send_ig_reply', title: 'ارسال دایرکت اینستاگرام', risk: 'sensitive',
    description: 'Send a DM reply in an Instagram conversation through the durable outbox (stage jarvis_reply).',
    params: obj({ conversationId: str('Conversation id'), authorId: str('Recipient user id'), text: str('Message text'), accountId: str('Zernio account id (optional)'), username: str('Username (optional)') }, ['conversationId', 'authorId', 'text']),
    run: async (ctx, input) => {
      const conversationId = String(input?.conversationId || '');
      const authorId = String(input?.authorId || '');
      const text = String(input?.text || '').trim();
      if (!conversationId || !authorId || !text) return ERR('پارامتر ناقص است');
      let accountId = String(input?.accountId || '');
      if (!accountId) {
        const settings = new PublishingSettings(ctx.core);
        accountId = String((await settings.config()).data.zernioAccountId || '');
        if (!accountId) {
          const rows = await ctx.core.list('ig-inbox');
          const last = rows.find((r: any) => r.data.conversationId === conversationId);
          accountId = String(last?.data?.accountId || '');
        }
      }
      if (!accountId) return ERR('اکانت زرنیو مشخص نیست (تنظیمات انتشار را کامل کنید)');
      const q = new DurableQueue(ctx.core);
      const outboxId = await q.enqueue({
        kind: 'dm', accountId, mediaId: '', memberId: `jarvis:${conversationId}:${authorId}`,
        recipientId: authorId, conversationId, text: text.slice(0, 900), buttons: [],
        expiresAt: new Date(Date.now() + 24 * 3600000).toISOString(),
      }, 'jarvis_reply');
      // Mark the newest unanswered ig-inbox row of this conversation as handled.
      const rows = (await ctx.core.list('ig-inbox'))
        .map((r: any) => ({ ...r, data: r.data }))
        .filter((r: any) => r.data.conversationId === conversationId && !r.data.replied)
        .sort((a: any, b: any) => String(b.data.receivedAt).localeCompare(String(a.data.receivedAt)));
      if (rows[0]) await ctx.core.save('ig-inbox', rows[0].id, { ...rows[0].data, replied: true, replyLanguage: 'jarvis', replyOutboxId: outboxId, reason: 'jarvis_reply' }, rows[0].version);
      return OK(`پاسخ در صف ارسال دایرکت قرار گرفت (${outboxId.slice(0, 10)}…).`, { outboxId });
    },
  });

  return skills;
}

export interface SkillRegistry {
  skills: Skill[];
  byId(id: string): Skill | undefined;
  catalog(): Array<{ id: string; title: string; description: string; risk: SkillRisk; params: any }>;
  tools(): any[];
  run(ctx: SkillContext, id: string, input: any): Promise<{ ok: boolean; summary: string; data?: any; approvalRequired?: boolean; approvalId?: string }>;
  /** Direct handler execution — ONLY for the approval executor after an admin said yes. */
  runDirect(ctx: SkillContext, id: string, input: any): Promise<{ ok: boolean; summary: string; data?: any }>;
}

/** Sensitive skills never run directly — callers must route them to approvals. */
export const SENSITIVE_IDS = ['adjust_credits', 'update_cafe_item', 'create_coupon', 'answer_ticket', 'ig_away_toggle', 'publish_content', 'send_ig_reply'];

export function createSkillRegistry(approvals: { create: (core: OpsCore, a: any) => Promise<any> }): SkillRegistry {
  const skills = buildSkillRegistry();
  const map = new Map(skills.map(s => [s.id, s]));
  return {
    skills,
    byId: id => map.get(String(id)),
    catalog: () => skills.map(s => ({ id: s.id, title: s.title, description: s.description, risk: s.risk, params: s.params })),
    tools: () => skills.map(s => ({ type: 'function', function: { name: s.id, description: `[${s.risk}] ${s.title} — ${s.description}`, parameters: s.params } })),
    runDirect: async (ctx, id, input) => {
      const skill = map.get(String(id));
      if (!skill) return ERR(`مهارت «${id}» وجود ندارد`);
      const result = await skill.run(ctx, input);
      await ctx.core.audit(ctx.actor, `jarvis.approved.${skill.id}`, skill.id, { input, ok: result.ok });
      return result;
    },
    async run(ctx, id, input) {
      const skill = map.get(String(id));
      if (!skill) return ERR(`مهارت «${id}» وجود ندارد`);
      if (skill.risk === 'sensitive') {
        const approval = await approvals.create(ctx.core, {
          skillId: skill.id, title: skill.title, params: input, risk: skill.risk, requestedBy: ctx.actor,
        });
        return { ok: true, approvalRequired: true, approvalId: approval.id, summary: `اقدام حساس است؛ برای اجرا به تأیید ادمین نیاز دارد (درخواست #${String(approval.id).slice(-6)} ثبت شد).` };
      }
      try {
        const result = await skill.run(ctx, input);
        await ctx.core.audit(ctx.actor, `jarvis.skill.${skill.id}`, skill.id, { input, ok: result.ok });
        return result;
      } catch (e: any) {
        const message = /^[A-Z0-9_]+$/.test(e?.code || '') ? e.code : 'SKILL_FAILED';
        await ctx.core.audit(ctx.actor, `jarvis.skill.${skill.id}`, skill.id, { input, error: message });
        return ERR(`اجرای مهارت شکست خورد: ${message}`);
      }
    },
  };
}

export { fail };
