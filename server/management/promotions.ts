/**
 * Batch 6 — promotions: discount coupons and free / half-price hours, managed from
 * BOTH the operations console (Management App) and the website admin panel.
 *
 *  • Coupons are stored as versioned OpsRecords (CAS editing, soft-delete) AND synced
 *    into the store's own coupon table so the existing checkout/quote engine
 *    (`validateCouponServerSide` in server.ts) validates and consumes them unchanged.
 *  • Special hours ("happy hours") are OpsRecords only; they price SESSION time
 *    segment-by-segment in `sessionSegmentRate()` — a session that crosses a special
 *    interval is discounted only for that interval (acceptance criterion 12), and an
 *    already-issued invoice is never recomputed because costs are frozen at checkout.
 */
import type express from 'express';
import { OpsCore, endpoint, fail, newId, nowISO, stringValue } from './core';
import { zonedParts, dayAt } from './time';

export type CouponKind = 'percent' | 'fixed';
export type CouponScope = 'reservation' | 'cafe' | 'shop' | 'tournament';
export const COUPON_SCOPES: CouponScope[] = ['reservation', 'cafe', 'shop', 'tournament'];
export type HourMode = 'free' | 'half' | 'percent';

export interface CouponData {
  code: string; kind: CouponKind; value: number; scopes: CouponScope[];
  minOrder: number; maxUsage: number; perUserMax: number; startsAt: string; endsAt: string;
  active: boolean; ownerUsername?: string; note?: string; usage: number; createdBy: string;
}
export interface SpecialHourData {
  name: string; mode: HourMode; percent: number; /** weekdays: 0=Sunday … 6=Saturday; empty = every day */ weekdays: number[];
  stationTypes: string[]; /** empty = every station type */ startHour: number; startMinute: number;
  endHour: number; endMinute: number; active: boolean; createdBy: string; note?: string;
}

const up = (v: unknown) => String(v ?? '').trim().toUpperCase().replace(/\s+/g, '');
const inOrder = (aH: number, aM: number, bH: number, bM: number) => aH * 60 + aM <= bH * 60 + bM;

export class PromotionService {
  constructor(public core: OpsCore) {}

  // ---------------- coupons ----------------
  async listCoupons() {
    const rows = await this.core.list<CouponData>('coupon');
    return rows
      .map(r => ({ ...r.data, id: r.id, version: r.version }))
      .filter(c => c.code)
      .sort((a, b) => b.code.localeCompare(a.code));
  }

  /** Upsert. New coupons are created inactive-safe: code uniqueness is enforced via the
   *  store coupon table + ops record; usage counters on the store row are authoritative. */
  async saveCoupon(actor: string, b: any) {
    return this.core.command(actor, b.idempotencyKey, 'save-coupon', b, async () => {
      const code = up(b.code);
      if (!/^[A-Z0-9_-]{3,30}$/.test(code)) fail('INVALID_CODE');
      const kind: CouponKind = b.kind === 'fixed' ? 'fixed' : 'percent';
      const value = Number(b.value);
      if (!Number.isFinite(value) || value < 0) fail('INVALID_VALUE');
      if (kind === 'percent' && value > 100) fail('INVALID_VALUE');
      if (kind === 'fixed' && value > 1_000_000) fail('INVALID_VALUE');
      const scopes: CouponScope[] = Array.isArray(b.scopes) ? b.scopes.filter((x: unknown): x is CouponScope => typeof x === 'string' && (COUPON_SCOPES as string[]).includes(x)) : [];
      if (!scopes.length) fail('SCOPE_REQUIRED');
      const minOrder = Math.max(0, Number(b.minOrder) || 0);
      const maxUsage = Number(b.maxUsage);
      if (!Number.isInteger(maxUsage) || maxUsage < 1 || maxUsage > 100_000) fail('INVALID_USAGE_LIMIT');
      const perUserMax = b.perUserMax === '' || b.perUserMax === undefined ? maxUsage : Number(b.perUserMax);
      if (!Number.isInteger(perUserMax) || perUserMax < 1 || perUserMax > maxUsage) fail('INVALID_PER_USER');
      const startsAt = b.startsAt ? new Date(b.startsAt).toISOString() : nowISO();
      const endsAt = b.endsAt ? new Date(b.endsAt).toISOString() : '';
      if (endsAt && Date.parse(endsAt) <= Date.parse(startsAt)) fail('INVALID_DATE_RANGE');
      const ownerUsername = stringValue(b.ownerUsername, 100);
      if (ownerUsername && !(await this.core.store.getUserByUsername(ownerUsername))) fail('USER_NOT_FOUND', 404);

      // Record identity is the record id passed by the editor (existing record) or the
      // normalized code for a new coupon. A second save of the same code with no id
      // targets the same single record, so codes can never collide on two records.
      const existingByCode = (await this.core.list<CouponData>('coupon')).find(r => r.data.code && up(r.data.code) === code);
      const id = b.id ? stringValue(b.id, 100) : (existingByCode?.id || `coupon-${code}`);
      const named = b.id ? await this.core.read<CouponData>('coupon', id) : (existingByCode || undefined);
      // A record id that exists but claims a different code than the record's code → that
      // code belongs to another record already → clash (checked before the NOT_FOUND rule).
      if (existingByCode && existingByCode.id !== id) fail('CODE_TAKEN', 409);
      if (b.id && !named) fail('NOT_FOUND', 404);
      const old = named;
      if (!old) {
        const storeClash = await this.core.store.getCouponByCode(code);
        if (storeClash) fail('CODE_TAKEN', 409);
      }
      const data: CouponData = {
        code, kind, value: Math.round(value * 100) / 100, scopes, minOrder, maxUsage, perUserMax,
        startsAt, endsAt, active: b.active !== false,
        ownerUsername: ownerUsername || undefined, note: stringValue(b.note, 300),
        usage: old?.data.usage || 0, createdBy: old?.data.createdBy || actor,
      };
      // Mirror into the store coupon table (source of truth for checkout validation).
      const storeRow = {
        code, type: kind === 'percent' ? 'Percent' : 'Fixed', value: data.value, minOrder,
        expiry: endsAt ? new Date(endsAt).toISOString().slice(0, 10) : new Date(Date.now() + 365 * 86400000).toISOString().slice(0, 10),
        expiryDate: endsAt || new Date(Date.now() + 365 * 86400000).toISOString(), maxUsageCount: maxUsage, usageCount: old?.data.usage || 0,
        isActive: data.active, ownerUsername: ownerUsername || '',
        scopes: JSON.stringify(scopes),
      };
      const existing = await this.core.store.getCouponByCode(code);
      try {
        if (existing) await this.core.store.updateCoupon(code, storeRow as any);
        else await this.core.store.createCoupon(storeRow as any);
      } catch (e: any) {
        // Race with a concurrent create on the unique code column.
        if (/UNIQUE|duplicate/i.test(String(e?.message || ''))) fail('CODE_TAKEN', 409);
        throw e;
      }
      return this.core.save('coupon', id, data, old?.version ?? 0, `coupon:${code}`);
    });
  }

  /** Soft delete: deactivate on the store table and mark inactive; history stays for audit. */
  async deleteCoupon(actor: string, id: string) {
    return this.core.command(actor, null, 'delete-coupon', { id }, async () => {
      const row = await this.core.read<CouponData>('coupon', id);
      if (!row) fail('NOT_FOUND', 404);
      const data = { ...row.data, active: false };
      await this.core.store.deactivateCoupon(row.data.code);
      return this.core.save('coupon', id, data, row.version);
    });
  }

  async refreshUsage() {
    for (const row of await this.core.list<CouponData>('coupon')) {
      const store = await this.core.store.getCouponByCode(row.data.code);
      if (store && store.usageCount !== row.data.usage) {
        await this.core.save('coupon', row.id, { ...row.data, usage: store.usageCount, active: !!store.isActive }, row.version);
      }
    }
    return { success: true };
  }

  // ---------------- special hours ----------------
  async listHours() {
    return (await this.core.list<SpecialHourData>('happy-hour'))
      .map(r => ({ ...r.data, id: r.id, version: r.version }))
      .sort((a, b) => a.startHour - b.startHour || a.startMinute - b.startMinute);
  }

  async saveHour(actor: string, b: any) {
    return this.core.command(actor, b.idempotencyKey, 'save-hour', b, async () => {
      const name = stringValue(b.name, 120, true);
      const mode: HourMode = ['free', 'half', 'percent'].includes(b.mode) ? b.mode : 'half';
      const percent = mode === 'percent' ? Number(b.percent) : mode === 'free' ? 100 : 50;
      if (!Number.isFinite(percent) || percent <= 0 || percent > 100) fail('INVALID_VALUE');
      const weekdays = Array.isArray(b.weekdays) ? [...new Set((b.weekdays as unknown[]).map(Number).filter((d:number) => Number.isInteger(d) && d >= 0 && d <= 6))].sort((a,b)=>a-b) : [];
      const stationTypes = Array.isArray(b.stationTypes) ? b.stationTypes.map((s: unknown) => stringValue(s, 40)).filter(Boolean) : [];
      const startHour = Number(b.startHour), startMinute = Number(b.startMinute || 0), endHour = Number(b.endHour), endMinute = Number(b.endMinute || 0);
      for (const n of [startHour, endHour]) if (!Number.isInteger(n) || n < 0 || n > 23) fail('INVALID_TIME');
      for (const n of [startMinute, endMinute]) if (!Number.isInteger(n) || n < 0 || n > 59) fail('INVALID_TIME');
      // end == start (clock time) means the whole day; any other valid range is allowed
      // (overnight ranges wrap automatically when pricing by instant).
      const id = b.id ? stringValue(b.id, 100) : newId('HH');
      const old = await this.core.read<SpecialHourData>('happy-hour', id);
      if (b.id && !old) fail('NOT_FOUND', 404);
      const data: SpecialHourData = {
        name, mode, percent, weekdays, stationTypes, startHour, startMinute, endHour, endMinute,
        active: b.active !== false, createdBy: old?.data.createdBy || actor, note: stringValue(b.note, 300),
      };
      return this.core.save('happy-hour', id, data, old?.version ?? 0);
    });
  }

  async deleteHour(actor: string, id: string) {
    return this.core.command(actor, null, 'delete-hour', { id }, async () => {
      const row = await this.core.read<SpecialHourData>('happy-hour', id);
      if (!row) fail('NOT_FOUND', 404);
      await this.core.save('happy-hour', id, { ...row.data, active: false }, row.version);
      return { success: true };
    });
  }

  /** Active special hours covering a given station type at a venue-local instant.
   *  Used by session pricing; reads are outside commands (no mutation). */
  async activeHoursFor(stationType: string, atMs: number, zone: string): Promise<SpecialHourData[]> {
    const p = zonedParts(atMs, zone);
    // Weekday in venue-local terms. JS getDay() on the zoned Y-M-D calendar date.
    const weekday = new Date(Date.UTC(p.year, p.month - 1, p.day)).getUTCDay();
    const mins = p.hour * 60 + p.minute;
    const out: SpecialHourData[] = [];
    for (const row of await this.core.list<SpecialHourData>('happy-hour')) {
      const h = row.data;
      if (!h.active) continue;
      if (h.weekdays.length && !h.weekdays.includes(weekday)) continue;
      if (h.stationTypes.length && !h.stationTypes.includes(stationType)) continue;
      const start = h.startHour * 60 + h.startMinute, end = h.endHour * 60 + h.endMinute;
      const inside = start === end ? true : end > start ? inOrder(start, 0, mins, 0) && !inOrder(end, 0, mins, 0) : (mins >= start || mins < end);
      if (inside) out.push(h);
    }
    return out;
  }
}

/** Discount fraction (0..1) applied to play time at the given instant; strongest wins. */
export function hourDiscountFraction(hours: SpecialHourData[]): number {
  let f = 0;
  for (const h of hours) f = Math.max(f, h.mode === 'free' ? 1 : h.mode === 'half' ? 0.5 : h.percent / 100);
  return f;
}

export function registerPromotions(app: express.Express, service: PromotionService) {
  const { core } = service, base = '/api/management';
  app.get(`${base}/coupons`, core.guard('promotions'), endpoint(async (_req, res) => res.json(await service.listCoupons())));
  app.post(`${base}/coupons`, core.guard('promotions'), endpoint(async (req, res) => res.json(await service.saveCoupon((req as any).staff.username, req.body || {}))));
  app.post(`${base}/coupons/:id/delete`, core.guard('promotions'), endpoint(async (req, res) => res.json(await service.deleteCoupon((req as any).staff.username, String(req.params.id)))));
  app.post(`${base}/coupons/refresh`, core.guard('promotions'), endpoint(async (_req, res) => res.json(await service.refreshUsage())));
  app.get(`${base}/special-hours`, core.guard('promotions'), endpoint(async (_req, res) => res.json(await service.listHours())));
  app.post(`${base}/special-hours`, core.guard('promotions'), endpoint(async (req, res) => res.json(await service.saveHour((req as any).staff.username, req.body || {}))));
  app.post(`${base}/special-hours/:id/delete`, core.guard('promotions'), endpoint(async (req, res) => res.json(await service.deleteHour((req as any).staff.username, String(req.params.id)))));
  // Read-only preview for staff allowed to sell/quote.
  app.get(`${base}/promotions/active`, core.guard('orders'), endpoint(async (req, res) => {
    const zone = await core.timezone();
    const at = Number(req.query.at) || Date.now();
    const type = String(req.query.type || '');
    res.json({ hours: (await service.activeHoursFor(type, at, zone)).map(h => ({ mode: h.mode, percent: h.percent, name: h.name })), day: dayAt(at, zone) });
  }));
}
