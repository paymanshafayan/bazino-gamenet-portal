/**
 * مسیرهای افیلیت: کلیک عمومی، داشبورد همکار، CRUD ادمین، گزارش، نقد کیف پول.
 */
import type express from 'express';
import type { IDataStore, AffiliateRow } from '../dataProviders';
import { AFFILIATE_SETTING_KEYS, readAffiliateSettings, seedAffiliateSettings } from './settings';
import {
  approveDueCommissions, claimAttribution, isValidCode, loadRates, newAffId,
  normalizeCode, onOrderPaid, publicAffiliateDashboard, recordClick, resolveActiveAffiliate,
  statsForAffiliate, addStats, emptyStats, stripPii,
} from './engine';

export interface AffiliateDeps {
  app: express.Express;
  getStore: () => IDataStore;
  requireAuth: express.RequestHandler;
  requireSyncApiKey: express.RequestHandler;
  authUsername: (req: express.Request) => string | undefined;
}

const iso = () => new Date().toISOString();

function clientIp(req: express.Request): string {
  const cf = req.headers['cf-connecting-ip'];
  if (typeof cf === 'string' && cf) return cf.trim();
  const xff = req.headers['x-forwarded-for'];
  const first = Array.isArray(xff) ? xff[0] : xff;
  if (first) return first.split(',')[0].trim();
  return (req.ip || req.socket?.remoteAddress || '').replace(/^::ffff:/, '');
}

function httpError(res: express.Response, e: any, fallback = 500) {
  const status = e?.statusCode || fallback;
  return res.status(status).json({ error: e?.code || e?.message || String(e), code: e?.code || undefined, message: e?.message });
}

function sanitizeAffiliateInput(body: any): Partial<AffiliateRow> {
  const out: Partial<AffiliateRow> = {};
  if (body.code !== undefined) out.code = normalizeCode(body.code);
  if (body.username !== undefined) out.username = String(body.username || '').trim();
  if (body.name !== undefined) out.name = String(body.name || '').trim().slice(0, 120);
  if (body.type !== undefined) out.type = String(body.type || 'gamer').slice(0, 30);
  if (body.language !== undefined) out.language = String(body.language || 'tr').slice(0, 8);
  if (body.destination !== undefined) out.destination = String(body.destination || '/').slice(0, 200);
  if (body.parentId !== undefined) out.parentId = String(body.parentId || '');
  if (body.status !== undefined) out.status = String(body.status || 'active').slice(0, 20);
  const num = (k: 'newPct' | 'returnPct' | 'tournamentPct' | 'overridePct') => {
    if (body[k] === undefined) return;
    if (body[k] === null || body[k] === '') { out[k] = -1; return; }
    const n = Number(body[k]);
    out[k] = Number.isFinite(n) ? n : -1;
  };
  num('newPct'); num('returnPct'); num('tournamentPct'); num('overridePct');
  if (body.notes !== undefined) out.notes = String(body.notes || '').slice(0, 2000);
  return out;
}

async function assertParentOk(store: IDataStore, parentId: string, selfId?: string) {
  if (!parentId) return;
  if (selfId && parentId === selfId) throw Object.assign(new Error('PARENT_SELF'), { statusCode: 400, code: 'PARENT_SELF' });
  const p = await store.getAffiliateById(parentId);
  if (!p) throw Object.assign(new Error('PARENT_NOT_FOUND'), { statusCode: 400, code: 'PARENT_NOT_FOUND' });
  if (p.parentId) throw Object.assign(new Error('PARENT_ALREADY_CHILD'), { statusCode: 400, code: 'MAX_DEPTH' });
  if (selfId) {
    const kids = (await store.listAffiliates()).filter(a => a.parentId === selfId);
    if (kids.length) throw Object.assign(new Error('HAS_CHILDREN'), { statusCode: 400, code: 'MAX_DEPTH' });
  }
}

function genCode(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let s = '';
  for (let i = 0; i < 6; i++) s += alphabet[Math.floor(Math.random() * alphabet.length)];
  return s;
}

export function registerAffiliateRoutes(d: AffiliateDeps) {
  const { app, requireAuth, requireSyncApiKey } = d;
  const store = () => d.getStore();

  const timer = setInterval(() => { approveDueCommissions(store()).catch(() => 0); }, 60 * 1000);
  timer.unref?.();

  app.post('/api/affiliate/click', async (req, res) => {
    try {
      const rates = await loadRates(store());
      if (!rates.programOpen) return res.status(403).json({ error: 'PROGRAM_CLOSED', code: 'PROGRAM_CLOSED' });
      const code = normalizeCode(req.body?.code || req.query.code);
      const r = await recordClick(store(), {
        code,
        path: String(req.body?.path || req.query.path || req.headers.referer || '/').slice(0, 200),
        ip: clientIp(req),
        ua: String(req.headers['user-agent'] || ''),
        visitorId: String(req.body?.visitorId || '').slice(0, 80),
      });
      if (!r.ok) return res.status(404).json({ error: 'INVALID_CODE', code: 'INVALID_CODE' });
      res.json({ success: true, code: r.code, duplicate: !!r.duplicate });
    } catch (e) { httpError(res, e); }
  });

  app.get('/api/affiliate/lookup', async (req, res) => {
    try {
      const aff = await resolveActiveAffiliate(store(), String(req.query.code || ''));
      if (!aff) return res.status(404).json({ error: 'INVALID_CODE', code: 'INVALID_CODE' });
      res.json({ ok: true, code: aff.code, name: aff.name, destination: aff.destination, language: aff.language });
    } catch (e) { httpError(res, e); }
  });

  app.post('/api/affiliate/claim', async (req, res) => {
    try {
      const rates = await loadRates(store());
      if (!rates.programOpen) return res.status(403).json({ error: 'PROGRAM_CLOSED', code: 'PROGRAM_CLOSED' });
      const username = d.authUsername(req) || String(req.body?.username || '');
      const r = await claimAttribution(store(), {
        code: String(req.body?.code || ''),
        username,
        visitorId: String(req.body?.visitorId || ''),
        source: 'link',
        actor: username || 'visitor',
      });
      if (!r.ok) return res.status(400).json({ error: r.error, code: r.error });
      res.json({ success: true, code: r.code });
    } catch (e) { httpError(res, e); }
  });

  app.get('/api/me/affiliate', requireAuth, async (req, res) => {
    try {
      const username = d.authUsername(req)!;
      const aff = await store().getAffiliateByUsername(username);
      if (!aff) return res.status(404).json({ error: 'NOT_AFFILIATE', code: 'NOT_AFFILIATE' });
      const settings = await readAffiliateSettings(store());
      const stats = await statsForAffiliate(store(), aff);
      const children = (await store().listAffiliates()).filter(a => a.parentId === aff.id);
      const childStats = [];
      for (const ch of children) childStats.push({ code: ch.code, name: ch.name, stats: await statsForAffiliate(store(), ch) });
      const comm = (await store().listAffiliateCommissions({ affiliateId: aff.id })).slice(0, 50).map(stripPii);
      res.json({ ...publicAffiliateDashboard(aff, stats, childStats, settings), commissions: comm });
    } catch (e) { httpError(res, e); }
  });

  /* ---------- ادمین ---------- */
  app.get('/api/admin/affiliate-settings', async (_req, res) => {
    try {
      await seedAffiliateSettings(store());
      res.json(await readAffiliateSettings(store()));
    } catch (e) { httpError(res, e); }
  });

  app.put('/api/admin/affiliate-settings', async (req, res) => {
    try {
      const body = req.body || {};
      for (const k of AFFILIATE_SETTING_KEYS) {
        if (body[k] === undefined || body[k] === null) continue;
        await store().setSetting(k, String(body[k]));
      }
      res.json({ success: true, settings: await readAffiliateSettings(store()) });
    } catch (e) { httpError(res, e); }
  });

  app.get('/api/admin/affiliates/report', async (req, res) => {
    try {
      const since = typeof req.query.since === 'string' ? req.query.since : undefined;
      const list = await store().listAffiliates();
      const rows = [];
      let totals = emptyStats();
      for (const a of list) {
        const stats = await statsForAffiliate(store(), a, since);
        totals = addStats(totals, stats);
        rows.push({ id: a.id, code: a.code, name: a.name, username: a.username, type: a.type, status: a.status, parentId: a.parentId, stats });
      }
      res.json({ totals, affiliates: rows, since: since || null });
    } catch (e) { httpError(res, e); }
  });

  app.get('/api/admin/affiliates', async (_req, res) => {
    try {
      const list = await store().listAffiliates();
      const out = [];
      for (const a of list) out.push({ ...a, stats: await statsForAffiliate(store(), a) });
      res.json(out);
    } catch (e) { httpError(res, e); }
  });

  app.get('/api/admin/affiliates/:id', async (req, res) => {
    try {
      const a = await store().getAffiliateById(String(req.params.id));
      if (!a) return res.status(404).json({ error: 'NOT_FOUND', code: 'NOT_FOUND' });
      const children = (await store().listAffiliates()).filter(x => x.parentId === a.id);
      const commissions = await store().listAffiliateCommissions({ affiliateId: a.id });
      const audit = await store().listAffiliateAudit(a.id, 100);
      const stats = await statsForAffiliate(store(), a);
      const childRows = [];
      for (const ch of children) childRows.push({ ...ch, stats: await statsForAffiliate(store(), ch) });
      res.json({ affiliate: a, stats, children: childRows, commissions, audit });
    } catch (e) { httpError(res, e); }
  });

  app.post('/api/admin/affiliates', async (req, res) => {
    try {
      const f = sanitizeAffiliateInput(req.body || {});
      let code = f.code || genCode();
      if (!isValidCode(code)) return res.status(400).json({ error: 'BAD_CODE', code: 'BAD_CODE' });
      if (await store().getAffiliateByCode(code)) {
        if (f.code) return res.status(409).json({ error: 'CODE_TAKEN', code: 'CODE_TAKEN' });
        for (let i = 0; i < 6; i++) { code = genCode(); if (!(await store().getAffiliateByCode(code))) break; }
      }
      if (f.username && await store().getAffiliateByUsername(f.username)) {
        return res.status(409).json({ error: 'USER_TAKEN', code: 'USER_TAKEN' });
      }
      await assertParentOk(store(), f.parentId || '');
      const now = iso();
      const row: AffiliateRow = {
        id: newAffId('AFF'),
        code,
        username: f.username || '',
        name: f.name || code,
        type: f.type || 'gamer',
        language: f.language || 'tr',
        destination: f.destination || '/',
        parentId: f.parentId || '',
        status: f.status || 'active',
        newPct: f.newPct ?? -1,
        returnPct: f.returnPct ?? -1,
        tournamentPct: f.tournamentPct ?? -1,
        overridePct: f.overridePct ?? -1,
        notes: f.notes || '',
        createdAt: now,
        updatedAt: now,
      };
      await store().createAffiliate(row);
      await store().createAffiliateAudit({
        id: newAffId('AUD'), affiliateId: row.id, commissionId: '', actor: d.authUsername(req) || 'admin',
        action: 'create', fromStatus: '', toStatus: row.status, detail: `code=${row.code}`, createdAt: now,
      });
      res.json({ success: true, affiliate: row });
    } catch (e) { httpError(res, e); }
  });

  app.put('/api/admin/affiliates/:id', async (req, res) => {
    try {
      const id = String(req.params.id);
      const cur = await store().getAffiliateById(id);
      if (!cur) return res.status(404).json({ error: 'NOT_FOUND', code: 'NOT_FOUND' });
      const f = sanitizeAffiliateInput(req.body || {});
      if (f.code && f.code !== cur.code) {
        if (!isValidCode(f.code)) return res.status(400).json({ error: 'BAD_CODE', code: 'BAD_CODE' });
        const clash = await store().getAffiliateByCode(f.code);
        if (clash && clash.id !== id) return res.status(409).json({ error: 'CODE_TAKEN', code: 'CODE_TAKEN' });
      }
      if (f.username && f.username !== cur.username) {
        const clash = await store().getAffiliateByUsername(f.username);
        if (clash && clash.id !== id) return res.status(409).json({ error: 'USER_TAKEN', code: 'USER_TAKEN' });
      }
      if (f.parentId !== undefined) await assertParentOk(store(), f.parentId || '', id);
      const patch = { ...f, updatedAt: iso() };
      await store().updateAffiliate(id, patch);
      await store().createAffiliateAudit({
        id: newAffId('AUD'), affiliateId: id, commissionId: '', actor: d.authUsername(req) || 'admin',
        action: 'update', fromStatus: cur.status, toStatus: f.status || cur.status, detail: JSON.stringify(f).slice(0, 500), createdAt: iso(),
      });
      res.json({ success: true, affiliate: await store().getAffiliateById(id) });
    } catch (e) { httpError(res, e); }
  });

  app.post('/api/admin/affiliates/commissions/:id/reject', async (req, res) => {
    try {
      const c = await store().getAffiliateCommissionById(String(req.params.id));
      if (!c) return res.status(404).json({ error: 'NOT_FOUND' });
      if (c.status !== 'pending') return res.status(400).json({ error: 'BAD_STATE', code: 'BAD_STATE' });
      await store().updateAffiliateCommission(c.id, { status: 'rejected', note: String((req.body || {}).note || ''), updatedAt: iso() });
      res.json({ success: true });
    } catch (e) { httpError(res, e); }
  });

  app.post('/api/admin/affiliates/commissions/:id/approve', async (req, res) => {
    try {
      const c = await store().getAffiliateCommissionById(String(req.params.id));
      if (!c) return res.status(404).json({ error: 'NOT_FOUND' });
      if (c.status !== 'pending') return res.status(400).json({ error: 'BAD_STATE', code: 'BAD_STATE' });
      await store().updateAffiliateCommission(c.id, { holdUntil: iso(), flag: '', updatedAt: iso() });
      const n = await approveDueCommissions(store());
      res.json({ success: true, approved: n });
    } catch (e) { httpError(res, e); }
  });

  /* ---------- همگام‌سازی اپ مدیریت ---------- */
  app.post('/api/sync/wallet/cashout', requireSyncApiKey, async (req, res) => {
    try {
      const { phone, amount, operator, note, idempotencyKey } = req.body || {};
      const amt = Math.round(Number(amount) * 100) / 100;
      if (!(amt > 0)) return res.status(400).json({ error: 'BAD_AMOUNT', code: 'BAD_AMOUNT' });
      const rates = await loadRates(store());
      if (amt + 1e-9 < rates.cashoutMin) return res.status(400).json({ error: 'CASHOUT_MIN', code: 'CASHOUT_MIN', min: rates.cashoutMin });
      const key = idempotencyKey ? String(idempotencyKey).slice(0, 100) : '';
      if (key) {
        const dup = await store().getWalletTxByIdempotencyKey(key);
        if (dup) return res.json({ success: true, duplicate: true, transaction: dup, balance: dup.balanceAfter });
      }
      const norm = String(phone || '').replace(/\D/g, '');
      let user = await store().getUserByPhone(String(phone || '').trim());
      if (!user) {
        const all = await store().listUsers();
        user = all.find(u => String(u.phone || '').replace(/\D/g, '').slice(-10) === norm.slice(-10) && norm.slice(-10).length === 10);
      }
      if (!user) return res.status(404).json({ error: 'NOT_FOUND', code: 'NOT_FOUND' });
      const tx = await store().appendWalletTx({
        id: newAffId('TX'), username: user.username, amount: -amt, type: 'cashout', ref: '',
        operator: String(operator || 'management-app').slice(0, 100),
        note: String(note || 'cashout').slice(0, 500), idempotencyKey: key, createdAt: iso(),
      });
      res.json({ success: true, username: user.username, phone: user.phone, transaction: tx, balance: tx.balanceAfter });
    } catch (e) { httpError(res, e); }
  });

  app.post('/api/sync/affiliate/attach', requireSyncApiKey, async (req, res) => {
    try {
      const { phone, code, operator } = req.body || {};
      const all = await store().listUsers();
      const tail = String(phone || '').replace(/\D/g, '').slice(-10);
      const user = (await store().getUserByPhone(String(phone || '').trim()))
        || all.find(u => String(u.phone || '').replace(/\D/g, '').slice(-10) === tail && tail.length === 10);
      if (!user) return res.status(404).json({ error: 'NOT_FOUND', code: 'NOT_FOUND' });
      const r = await claimAttribution(store(), {
        code: String(code || ''), username: user.username, source: 'walkin', actor: String(operator || 'management-app'),
      });
      if (!r.ok) return res.status(400).json({ error: r.error, code: r.error });
      res.json({ success: true, username: user.username, code: r.code });
    } catch (e) { httpError(res, e); }
  });

}
