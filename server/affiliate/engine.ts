/**
 * موتور افیلیت: انتساب، کمیسیون، تأیید پس از مهلت لغو، شارژ کیف پول.
 */
import { createHash, randomBytes } from 'crypto';
import type { IDataStore, AffiliateRow, AffiliateCommissionRow, OnsiteOrderRow } from '../dataProviders';
import { parseDays, parsePct, readAffiliateSettings } from './settings';

const iso = (t = Date.now()) => new Date(t).toISOString();
const round2 = (n: number) => Math.round(n * 100) / 100;
export const newAffId = (p: string) => `${p}-${Date.now().toString(36).toUpperCase()}${randomBytes(3).toString('hex').toUpperCase()}`;

export function normalizeCode(raw: unknown): string {
  return String(raw || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 16);
}
export function isValidCode(code: string): boolean {
  return /^[A-Z0-9]{4,16}$/.test(code);
}
export function hashIp(ip: string): string {
  return createHash('sha256').update(`bz-aff-ip:${ip || ''}`).digest('hex').slice(0, 32);
}
export function hashUa(ua: string): string {
  return createHash('sha256').update(`bz-aff-ua:${ua || ''}`).digest('hex').slice(0, 32);
}

export async function loadRates(store: IDataStore) {
  const s = await readAffiliateSettings(store);
  return {
    newPct: parsePct(s.affiliate_new_pct, 10),
    returnPct: parsePct(s.affiliate_return_pct, 5),
    tournamentPct: parsePct(s.affiliate_tournament_pct, 10),
    overridePct: parsePct(s.affiliate_override_pct, 0),
    windowDays: parseDays(s.affiliate_window_days, 30),
    cashoutMin: Math.max(0, Number(s.wallet_cashout_min_tl) || 0),
    excludedRoles: String(s.affiliate_excluded_roles || 'admin').split(',').map(x => x.trim().toLowerCase()).filter(Boolean),
    programOpen: s.affiliate_program_open !== '0',
  };
}

function inheritRate(custom: number | null | undefined, global: number): number {
  if (custom === null || custom === undefined || custom < 0) return global;
  return custom;
}

export async function resolveActiveAffiliate(store: IDataStore, code: string): Promise<AffiliateRow | undefined> {
  const c = normalizeCode(code);
  if (!isValidCode(c)) return undefined;
  const a = await store.getAffiliateByCode(c);
  if (!a || a.status !== 'active') return undefined;
  return a;
}

/** کلیک: تکراری همان IP+UA در ۱۵ دقیقه شمارش جدا نمی‌شود. */
export async function recordClick(store: IDataStore, opts: { code: string; path: string; ip: string; ua: string; visitorId: string }): Promise<{ ok: boolean; duplicate?: boolean; code?: string }> {
  const aff = await resolveActiveAffiliate(store, opts.code);
  if (!aff) return { ok: false };
  const ipHash = hashIp(opts.ip);
  const uaHash = hashUa(opts.ua);
  const since = iso(Date.now() - 15 * 60 * 1000);
  const n = await store.countRecentAffiliateClicks(aff.code, ipHash, uaHash, since);
  if (n > 0) return { ok: true, duplicate: true, code: aff.code };
  await store.createAffiliateClick({
    id: newAffId('CLK'),
    code: aff.code,
    path: String(opts.path || '/').slice(0, 200),
    ipHash,
    uaHash,
    visitorId: String(opts.visitorId || '').slice(0, 80),
    createdAt: iso(),
  });
  return { ok: true, code: aff.code };
}

export async function claimAttribution(store: IDataStore, opts: {
  code: string;
  username?: string;
  visitorId?: string;
  source: 'link' | 'form' | 'walkin';
  actor?: string;
}): Promise<{ ok: boolean; code?: string; error?: string }> {
  const aff = await resolveActiveAffiliate(store, opts.code);
  if (!aff) return { ok: false, error: 'INVALID_CODE' };
  const username = String(opts.username || '');
  if (username && aff.username && aff.username.toLowerCase() === username.toLowerCase()) {
    return { ok: false, error: 'SELF_REFERRAL' };
  }
  const rates = await loadRates(store);
  const expiresAt = iso(Date.now() + rates.windowDays * 86400000);
  const now = iso();
  const row = {
    id: newAffId('ATT'),
    username,
    visitorId: String(opts.visitorId || '').slice(0, 80),
    code: aff.code,
    source: opts.source,
    expiresAt,
    createdAt: now,
    updatedAt: now,
  };
  await store.upsertAffiliateAttribution(row);
  await store.createAffiliateAudit({
    id: newAffId('AUD'),
    affiliateId: aff.id,
    commissionId: '',
    actor: opts.actor || username || 'system',
    action: 'attribute',
    fromStatus: '',
    toStatus: opts.source,
    detail: `code=${aff.code} user=${username || '-'} visitor=${row.visitorId || '-'}`,
    createdAt: now,
  });
  return { ok: true, code: aff.code };
}

async function attributionForUser(store: IDataStore, username: string): Promise<{ aff: AffiliateRow; source: string } | null> {
  const att = await store.getAttributionForUser(username);
  if (!att || !att.code) return null;
  if (att.expiresAt && Date.parse(att.expiresAt) < Date.now()) return null;
  const aff = await store.getAffiliateByCode(att.code);
  if (!aff || aff.status !== 'active') return null;
  return { aff, source: att.source };
}

async function hasPriorPaid(store: IDataStore, username: string, exceptOrderId?: string): Promise<boolean> {
  const orders = await store.listOnsiteOrders({ username });
  return orders.some(o =>
    o.status === 'settled'
    && (o.kind === 'reservation' || o.kind === 'tournament')
    && o.id !== exceptOrderId
  );
}

/**
 * پس از پرداخت قطعی رزرو/تورنمنت: کمیسیون pending تا holdUntil.
 * کد فرم (referralCode در payload) بر انتساب کوکی اولویت دارد.
 */
export async function onOrderPaid(store: IDataStore, opts: {
  username: string;
  orderId: string;
  kind: string;
  amount: number;
  dueAt?: string;
  payload?: any;
  userRole?: string;
}): Promise<AffiliateCommissionRow[]> {
  if (opts.kind !== 'reservation' && opts.kind !== 'tournament') return [];
  const amount = round2(Number(opts.amount) || 0);
  if (!(amount > 0)) return [];
  const rates = await loadRates(store);
  const role = String(opts.userRole || 'gamer').toLowerCase();
  if (rates.excludedRoles.includes(role)) return [];

  const formCode = normalizeCode(opts.payload?.referralCode);
  if (formCode) {
    await claimAttribution(store, { code: formCode, username: opts.username, source: 'form' });
  }
  const resolved = await attributionForUser(store, opts.username);
  if (!resolved) return [];
  const { aff } = resolved;
  if (aff.username && aff.username.toLowerCase() === opts.username.toLowerCase()) return [];

  const existing = (await store.listAffiliateCommissions({ orderId: opts.orderId }))
    .filter(c => c.eventType !== 'override');
  if (existing.length) return existing;

  const returning = await hasPriorPaid(store, opts.username, opts.orderId);
  let eventType: string;
  let pct: number;
  if (opts.kind === 'tournament') {
    eventType = 'tournament';
    pct = inheritRate(aff.tournamentPct, rates.tournamentPct);
  } else if (returning) {
    eventType = 'returning';
    pct = inheritRate(aff.returnPct, rates.returnPct);
  } else {
    eventType = 'new';
    pct = inheritRate(aff.newPct, rates.newPct);
  }
  if (!(pct > 0)) return [];

  const holdUntil = opts.dueAt && Date.parse(opts.dueAt) > Date.now() ? opts.dueAt : iso();
  const now = iso();
  const commission: AffiliateCommissionRow = {
    id: newAffId('COM'),
    affiliateId: aff.id,
    code: aff.code,
    username: opts.username,
    orderId: opts.orderId,
    kind: opts.kind,
    eventType,
    netAmount: amount,
    ratePct: pct,
    commissionAmount: round2(amount * pct / 100),
    status: 'pending',
    holdUntil,
    flag: '',
    walletTxId: '',
    parentCommissionId: '',
    createdAt: now,
    updatedAt: now,
    approvedAt: '',
    paidOutAt: '',
    reversedAt: '',
    note: '',
    attendedAt: '',
  };
  await store.createAffiliateCommission(commission);
  await store.createAffiliateAudit({
    id: newAffId('AUD'), affiliateId: aff.id, commissionId: commission.id, actor: 'system',
    action: 'create', fromStatus: '', toStatus: 'pending',
    detail: `${eventType} ${pct}% of ${amount} TL order ${opts.orderId}`, createdAt: now,
  });

  const created = [commission];
  const overridePct = inheritRate(aff.overridePct, rates.overridePct);
  if (aff.parentId && overridePct > 0) {
    const parent = await store.getAffiliateById(aff.parentId);
    if (parent && parent.status === 'active') {
      const ov: AffiliateCommissionRow = {
        ...commission,
        id: newAffId('COM'),
        affiliateId: parent.id,
        code: parent.code,
        eventType: 'override',
        ratePct: overridePct,
        commissionAmount: round2(amount * overridePct / 100),
        parentCommissionId: commission.id,
      };
      await store.createAffiliateCommission(ov);
      created.push(ov);
    }
  }
  return created;
}

export async function onOrderReversed(store: IDataStore, orderId: string, actor = 'system'): Promise<number> {
  const list = await store.listAffiliateCommissions({ orderId });
  let n = 0;
  for (const c of list) {
    if (c.status === 'reversed' || c.status === 'rejected') continue;
    if (c.status === 'paid_out' && c.walletTxId) {
      const aff = await store.getAffiliateById(c.affiliateId);
      if (aff?.username && c.commissionAmount > 0) {
        try {
          await store.appendWalletTx({
            id: newAffId('TX'),
            username: aff.username,
            amount: -round2(c.commissionAmount),
            type: 'commission_reversal',
            ref: c.id,
            operator: actor,
            note: `reverse ${c.orderId}`,
            idempotencyKey: `aff-rev-${c.id}`,
            createdAt: iso(),
          });
        } catch (e: any) {
          await store.updateAffiliateCommission(c.id, {
            flag: 'reversal_failed',
            note: e?.code || e?.message || 'wallet debit failed',
            updatedAt: iso(),
          });
          await store.createAffiliateAudit({
            id: newAffId('AUD'), affiliateId: c.affiliateId, commissionId: c.id, actor,
            action: 'flag', fromStatus: c.status, toStatus: c.status,
            detail: 'commission_reversal failed — insufficient affiliate wallet', createdAt: iso(),
          });
          continue;
        }
      }
    }
    await store.updateAffiliateCommission(c.id, { status: 'reversed', reversedAt: iso(), updatedAt: iso() });
    await store.createAffiliateAudit({
      id: newAffId('AUD'), affiliateId: c.affiliateId, commissionId: c.id, actor,
      action: 'reverse', fromStatus: c.status, toStatus: 'reversed', detail: `order ${orderId}`, createdAt: iso(),
    });
    n++;
  }
  return n;
}

export async function onReservationAttended(store: IDataStore, reservationId: string, username: string): Promise<void> {
  const list = await store.listAffiliateCommissions({ username });
  for (const c of list) {
    if (c.kind !== 'reservation') continue;
    if (c.attendedAt) continue;
    const order = await store.getOnsiteOrder(c.orderId);
    let match = false;
    try {
      const result = order?.result ? JSON.parse(order.result) : {};
      match = result?.reservationId === reservationId;
    } catch { /* ignore */ }
    if (!match && c.orderId === reservationId) match = true;
    if (match) await store.updateAffiliateCommission(c.id, { attendedAt: iso(), updatedAt: iso() });
  }
}

/** pending بدون flag که holdUntil گذشته → approved و شارژ کیف پول → paid_out */
export async function approveDueCommissions(store: IDataStore): Promise<number> {
  const pending = await store.listAffiliateCommissions({ status: 'pending' });
  const now = Date.now();
  let n = 0;
  for (const c of pending) {
    if (c.flag) continue;
    const hold = c.holdUntil ? Date.parse(c.holdUntil) : 0;
    if (Number.isFinite(hold) && hold > now) continue;
    const aff = await store.getAffiliateById(c.affiliateId);
    if (!aff || aff.status !== 'active' || !aff.username) {
      await store.updateAffiliateCommission(c.id, { flag: 'no_wallet_user', updatedAt: iso() });
      continue;
    }
    const approvedAt = iso();
    await store.updateAffiliateCommission(c.id, { status: 'approved', approvedAt, updatedAt: approvedAt });
    let txId = '';
    if (c.commissionAmount > 0) {
      const tx = await store.appendWalletTx({
        id: newAffId('TX'),
        username: aff.username,
        amount: round2(c.commissionAmount),
        type: 'commission',
        ref: c.id,
        operator: 'affiliate',
        note: `${c.eventType} ${c.ratePct}% · ${c.orderId}`,
        idempotencyKey: `aff-pay-${c.id}`,
        createdAt: approvedAt,
      });
      txId = tx.id;
    }
    await store.updateAffiliateCommission(c.id, {
      status: 'paid_out',
      paidOutAt: iso(),
      walletTxId: txId,
      updatedAt: iso(),
    });
    await store.createAffiliateAudit({
      id: newAffId('AUD'), affiliateId: c.affiliateId, commissionId: c.id, actor: 'system',
      action: 'payout', fromStatus: 'pending', toStatus: 'paid_out',
      detail: `wallet ${c.commissionAmount} TL`, createdAt: iso(),
    });
    n++;
  }
  return n;
}

export function funnelOf(clicks: number, leads: number, reserved: number, paid: number, attended: number) {
  return { clicks, leads, reserved, paid, attended };
}

export interface AffiliateStats {
  clicks: number;
  leads: number;
  reserved: number;
  paid: number;
  attended: number;
  netSales: number;
  pending: number;
  approved: number;
  paidOut: number;
  reversed: number;
  rejected: number;
  commissionCost: number;
}

export function emptyStats(): AffiliateStats {
  return { clicks: 0, leads: 0, reserved: 0, paid: 0, attended: 0, netSales: 0, pending: 0, approved: 0, paidOut: 0, reversed: 0, rejected: 0, commissionCost: 0 };
}

export function addStats(a: AffiliateStats, b: AffiliateStats): AffiliateStats {
  const o = emptyStats();
  (Object.keys(o) as (keyof AffiliateStats)[]).forEach(k => { (o as any)[k] = (a[k] || 0) + (b[k] || 0); });
  return o;
}

export async function statsForAffiliate(store: IDataStore, aff: AffiliateRow, since?: string): Promise<AffiliateStats> {
  const s = emptyStats();
  s.clicks = await store.countAffiliateClicks(aff.code, since);
  const atts = await store.listAttributionsByCode(aff.code);
  s.leads = atts.filter(a => a.username && (!since || a.createdAt >= since)).length;
  const comm = await store.listAffiliateCommissions({ affiliateId: aff.id });
  for (const c of comm) {
    if (since && c.createdAt < since) continue;
    if (c.eventType === 'override') {
      // override still counts as commission cost for the parent, not as a sale of the parent
    } else {
      s.reserved += 1;
      if (c.status !== 'reversed' && c.status !== 'rejected') {
        s.paid += 1;
        s.netSales += c.netAmount;
      }
      if (c.attendedAt) s.attended += 1;
    }
    if (c.status === 'pending') s.pending += c.commissionAmount;
    else if (c.status === 'approved') s.approved += c.commissionAmount;
    else if (c.status === 'paid_out') { s.paidOut += c.commissionAmount; s.approved += c.commissionAmount; s.commissionCost += c.commissionAmount; }
    else if (c.status === 'reversed') s.reversed += c.commissionAmount;
    else if (c.status === 'rejected') s.rejected += c.commissionAmount;
  }
  return s;
}

export function publicAffiliateDashboard(aff: AffiliateRow, stats: AffiliateStats, children: Array<{ code: string; name: string; stats: AffiliateStats }>, settings: Record<string, string>) {
  return {
    code: aff.code,
    name: aff.name,
    type: aff.type,
    language: aff.language,
    destination: aff.destination,
    status: aff.status,
    link: `/?ref=${aff.code}`,
    rates: {
      newPct: aff.newPct != null && aff.newPct >= 0 ? aff.newPct : Number(settings.affiliate_new_pct),
      returnPct: aff.returnPct != null && aff.returnPct >= 0 ? aff.returnPct : Number(settings.affiliate_return_pct),
      tournamentPct: aff.tournamentPct != null && aff.tournamentPct >= 0 ? aff.tournamentPct : Number(settings.affiliate_tournament_pct),
    },
    stats,
    children: children.map(ch => ({ code: ch.code, name: ch.name, stats: ch.stats })),
  };
}

export function stripPii(c: AffiliateCommissionRow) {
  const { username: _u, ...rest } = c;
  return rest;
}
