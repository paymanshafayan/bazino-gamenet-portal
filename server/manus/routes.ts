/**
 * Manus ↔ Portal ↔ Telegram Gateway routes (plan §4).
 * Manus bearer endpoints use the `baz_` token system with scope `manus:telegram`.
 * Campaign approval / resolve / direct-send are ADMIN JWT ONLY — a Manus token
 * can never approve (plan test 16). Storage uses generic ops-records so all
 * three providers (SQLite / SQL Server / MongoDB) work with zero migration.
 */
import type express from 'express';
import { OpsCore, endpoint, fail, newId, nowISO, stringValue, fingerprint } from '../management/core';
import type { IDataStore } from '../dataProviders';
import { isValidApiToken } from '../affiliate/igSettings';
import { AffiliateService } from '../management/affiliates';
import { TelegramGatewayClient, readGatewayConfig } from './gateway';
import {
  TG_KINDS, TG_KILL_SWITCH_KEY, TG_AUTOSTOP_ERRORS, sha256Hex,
  evaluateDraft, evaluateDirectSend, buildManusHealth, buildAffiliateDaily,
  type TgCampaign, type TgEvalContext,
} from './policy';

export const MANUS_TG_SCOPE = 'manus:telegram';

export interface ManusRouteDeps {
  app: express.Express;
  getStore: () => IDataStore;
}

function bearer(req: express.Request): string {
  const h = req.headers.authorization;
  if (typeof h === 'string' && h.startsWith('Bearer ')) return h.slice(7).trim();
  return '';
}

function httpError(res: express.Response, e: any, fallback = 500) {
  const status = e?.statusCode || fallback;
  return res.status(status).json({ error: e?.code || e?.message || String(e), code: e?.code || undefined, message: e?.message });
}

/** Dialog item allowlist — PII can never leak to Manus. */
function publicDialog(d: any) {
  return {
    dialog_id: String(d.dialog_id ?? d.id ?? ''),
    title: String(d.title ?? '').slice(0, 120),
    username: d.username ? String(d.username).slice(0, 60) : null,
    type: String(d.type ?? ''),
    is_member: !!d.is_member,
    is_admin: !!d.is_admin,
    can_send: !!d.can_send,
    can_send_media: !!d.can_send_media,
    language: d.language ? String(d.language).slice(0, 8) : null,
    last_checked_at: d.last_checked_at || d.checked_at || null,
  };
}

export function registerManusRoutes(d: ManusRouteDeps) {
  const { app } = d;
  const store = () => d.getStore();
  const core = () => new OpsCore(store);
  const gateway = () => {
    const cfg = readGatewayConfig();
    return cfg ? new TelegramGatewayClient(cfg) : null;
  };

  async function requireManus(req: express.Request): Promise<void> {
    if (!(await isValidApiToken(store(), bearer(req), MANUS_TG_SCOPE))) fail('UNAUTHORIZED', 401);
  }
  /** Admin JWT only (staff identity comes from the JWT middleware, never from a bearer token). */
  async function requireAdmin(req: express.Request): Promise<string> {
    const staff = await core().authorize(req as any);
    if (!staff?.admin) fail('ADMIN_ONLY', 403);
    return staff.username;
  }
  async function killOn(): Promise<boolean> {
    return (await store().getSetting(TG_KILL_SWITCH_KEY)) === '1';
  }

  // ---- Health (public, no secrets — plan test 9) ----
  app.get('/api/manus/health', endpoint(async (_req, res) => {
    const g = gateway();
    let status: 'reachable' | 'unreachable' = 'unreachable';
    if (g) {
      try { await g.health(); status = 'reachable'; } catch { status = 'unreachable'; }
    }
    res.json(buildManusHealth(status, nowISO()));
  }));

  // ---- Dialogs (Manus) ----
  app.get('/api/manus/telegram/dialogs', endpoint(async (req, res) => {
    await requireManus(req as any);
    const g = gateway();
    if (!g) fail('GATEWAY_UNREACHABLE', 503);
    const q = req.query as Record<string, string>;
    const raw = await g.dialogs();
    let items = ((raw?.items || []) as any[]).map(publicDialog).filter(x => x.dialog_id);
    if (q.type) items = items.filter(x => x.type === q.type);
    if (q.member_only === 'true') items = items.filter(x => x.is_member);
    if (q.sendable_only === 'true') items = items.filter(x => x.is_member && x.can_send);
    if (q.language) items = items.filter(x => !x.language || x.language === q.language);
    res.json({ items });
  }));

  // ---- Permissions (Manus) ----
  app.get('/api/manus/telegram/dialogs/:id/permissions', endpoint(async (req, res) => {
    await requireManus(req as any);
    const g = gateway();
    if (!g) fail('GATEWAY_UNREACHABLE', 503);
    const id = stringValue(req.params.id, 64, true);
    let p: any = null;
    try { p = await g.permissions(id); } catch { p = null; }
    // Unknown membership/permission → can_send=false and the destination is rejected.
    res.json({
      dialog_id: id,
      is_member: !!p?.is_member,
      is_admin: !!p?.is_admin,
      can_send: !!p?.is_member && !!p?.can_send,
      can_send_media: !!p?.is_member && !!p?.can_send_media,
      checked_at: p?.checked_at || nowISO(),
    });
  }));

  // ---- Message search (Manus, minimal public data) ----
  app.get('/api/manus/telegram/dialogs/:id/messages/search', endpoint(async (req, res) => {
    await requireManus(req as any);
    const g = gateway();
    if (!g) fail('GATEWAY_UNREACHABLE', 503);
    const id = stringValue(req.params.id, 64, true);
    const q = req.query as Record<string, string>;
    const raw = await g.search(id, {
      keywords: stringValue(q.keywords, 300),
      lookback_hours: stringValue(q.lookback_hours, 8) || '72',
      limit: stringValue(q.limit, 8) || '20',
    });
    res.json({
      dialog_id: id,
      items: ((raw?.items || []) as any[]).slice(0, 20).map(m => ({
        message_id: String(m.message_id ?? ''),
        date: m.date || null,
        keyword: m.keyword ? String(m.keyword).slice(0, 40) : null,
        text: String(m.text ?? '').slice(0, 300),
      })),
    });
  }));

  /** Shared send attempt: builds the signed command, records the result, enforces AUTO_STOP. */
  async function attemptSend(c: OpsCore, draftRec: any, dialogId: string, message: string, requestId: string, idemKey: string) {
    const g = gateway();
    if (!g) fail('GATEWAY_UNREACHABLE', 503);
    const cmd = {
      request_id: requestId, draft_id: draftRec.id, dialog_id: dialogId, message,
      idempotency_key: idemKey || sha256Hex(`${requestId}:${draftRec.id}`),
      expires_at: new Date(Date.now() + 10 * 60_000).toISOString(),
    };
    const out = await g.send(cmd);
    const data = { ...draftRec.data, status: out.status, telegramMessageId: out.telegram_message_id || '', sentAt: out.sent_at || '', errorCode: out.error_code || '', updatedAt: nowISO() };
    await c.save(TG_KINDS.draft, draftRec.id, data, draftRec.version);
    if (out.status === 'failed' && out.error_code && (TG_AUTOSTOP_ERRORS as readonly string[]).includes(out.error_code)) {
      const campId = String(draftRec.data.campaignId || '');
      if (campId) {
        const camp = await c.read(TG_KINDS.campaign, campId);
        if (camp) await c.save(TG_KINDS.campaign, campId, { ...camp.data, lastError: out.error_code, status: 'paused', updatedAt: nowISO() }, camp.version);
      }
    }
    return out;
  }

  async function draftContext(c: OpsCore, campaign: TgCampaign, dialogId: string, textHash: string, requestId: string, idemKey: string): Promise<TgEvalContext> {
    const g = gateway();
    let permission: TgEvalContext['permission'] = null;
    if (g) {
      try {
        const p = await g.permissions(dialogId);
        permission = { isMember: !!p?.is_member, canSend: !!p?.can_send, canSendMedia: !!p?.can_send_media, type: String(p?.type || '') };
      } catch { permission = null; }
    }
    const today = nowISO().slice(0, 10);
    const drafts = await c.list(TG_KINDS.draft);
    const mine = drafts.filter(r => r.data.campaignId === campaign.id);
    return {
      nowIso: nowISO(),
      killSwitch: await killOn(),
      permission,
      sentToday: mine.filter(r => r.data.status === 'sent' && String(r.data.sentAt || '').startsWith(today)).length,
      lastSentAt: mine.map(r => String(r.data.sentAt || '')).filter(Boolean).sort().pop(),
      duplicateSent: mine.some(r => r.data.status === 'sent' && r.data.dialogId === dialogId && r.data.textHash === textHash),
      requestSeen: drafts.some(r => r.data.requestId === requestId),
      idempotencySeen: !!idemKey && drafts.some(r => r.data.idempotencyKey === idemKey),
      hasKeywordContext: false,
    };
  }

  // ---- Draft submit (Manus) ----
  app.post('/api/manus/campaign/drafts', endpoint(async (req, res) => {
    await requireManus(req as any);
    const b = req.body || {};
    const input = {
      campaignId: stringValue(b.campaign_id ?? b.campaignId, 80, true),
      dialogId: stringValue(b.dialog_id ?? b.dialogId, 64, true),
      dialogType: stringValue(b.dialog_type ?? b.dialogType, 24),
      message: stringValue(b.message, 4000, true),
      language: stringValue(b.language, 8),
      contextMessageId: stringValue(b.context_message_id ?? b.contextMessageId, 64),
      requestId: stringValue(b.request_id ?? b.requestId, 120, true),
      idempotencyKey: stringValue(b.idempotency_key ?? b.idempotencyKey, 160),
      dialogUsername: stringValue(b.dialog_username ?? b.dialogUsername, 60),
      ctaUrl: stringValue(b.cta_url ?? b.ctaUrl, 300),
      affiliateCode: stringValue(b.affiliate_code ?? b.affiliateCode, 60),
    };
    const c = core();
    const out = await c.command('manus', input.requestId, 'tg-draft-submit', input, async () => {
      const campRec = await c.read(TG_KINDS.campaign, input.campaignId);
      if (!campRec) fail('CAMPAIGN_NOT_FOUND', 404);
      const campaign = { id: campRec.id, ...campRec.data } as TgCampaign;
      const textHash = sha256Hex(input.message);
      const ctx = await draftContext(c, campaign, input.dialogId, textHash, input.requestId, input.idempotencyKey);
      if (input.contextMessageId) ctx.hasKeywordContext = true;
      const decision = evaluateDraft(campaign, { ...input }, ctx);
      const id = newId('TGD');
      const rec = await c.save(TG_KINDS.draft, id, {
        ...input, textHash, source: 'manus', status: decision.outcome === 'auto_approved' ? 'approved' : decision.outcome,
        reason: decision.reason, telegramMessageId: '', sentAt: '', errorCode: '', createdAt: nowISO(), updatedAt: nowISO(),
      }, 0);
      await c.save(TG_KINDS.decision, newId('TGX'), { draftId: id, campaignId: input.campaignId, actor: 'policy-engine', outcome: decision.outcome, reason: decision.reason, textHash, createdAt: nowISO() }, 0);
      if (decision.pauseCampaign) {
        await c.save(TG_KINDS.campaign, campRec.id, { ...campRec.data, status: 'paused', updatedAt: nowISO() }, campRec.version);
      }
      let send: any = null;
      if (decision.allow) {
        try {
          send = await attemptSend(c, rec, input.dialogId, input.message, input.requestId, input.idempotencyKey);
        } catch (e: any) {
          await c.save(TG_KINDS.draft, id, { ...rec.data, status: 'approved_queued', reason: e?.code || 'GATEWAY_ERROR', updatedAt: nowISO() }, rec.version);
          return { draft_id: id, status: 'approved_queued', created_at: rec.data.createdAt, reason: e?.code || 'GATEWAY_ERROR' };
        }
        const fresh = await c.read(TG_KINDS.draft, id);
        return { draft_id: id, status: fresh?.data.status || 'sent', created_at: rec.data.createdAt, telegram_message_id: fresh?.data.telegramMessageId || undefined };
      }
      return { draft_id: id, status: rec.data.status, created_at: rec.data.createdAt, reason: decision.reason };
    });
    res.json(out);
  }));

  // ---- Draft status (Manus) ----
  app.get('/api/manus/campaign/drafts/:id', endpoint(async (req, res) => {
    await requireManus(req as any);
    const r = await core().read(TG_KINDS.draft, stringValue(req.params.id, 80, true));
    if (!r) fail('NOT_FOUND', 404);
    const d = r.data;
    res.json({
      draft_id: r.id, status: d.status, campaign_id: d.campaignId, dialog_id: d.dialogId,
      message: d.message, language: d.language || null, created_at: d.createdAt, sent_at: d.sentAt || null,
      telegram_message_id: d.telegramMessageId || null, error_code: d.errorCode || null, reason: d.reason || null,
    });
  }));

  // ---- Campaigns (ADMIN ONLY) ----
  app.post('/api/manus/campaigns', endpoint(async (req, res) => {
    const actor = await requireAdmin(req as any);
    const b = req.body || {};
    const c = core();
    const id = newId('TGC');
    const rec = await c.save(TG_KINDS.campaign, id, {
      name: stringValue(b.name, 120, true),
      text: stringValue(b.text, 4000, true),
      textHash: sha256Hex(stringValue(b.text, 4000, true)),
      ctaUrl: stringValue(b.cta_url ?? b.ctaUrl, 300),
      affiliateCode: stringValue(b.affiliate_code ?? b.affiliateCode, 60),
      affiliateUrl: stringValue(b.affiliate_url ?? b.affiliateUrl, 300),
      disclosure: stringValue(b.disclosure, 300),
      language: stringValue(b.language, 8) || 'fa',
      fence: { allowDialogIds: Array.isArray(b.fence?.allowDialogIds) ? b.fence.allowDialogIds.map(String).slice(0, 50) : [], requireKeywordContext: b.fence?.requireKeywordContext !== false },
      caps: { maxPerDay: Math.min(Math.max(Number(b.caps?.maxPerDay) || 2, 1), 10), minIntervalMinutes: Math.min(Math.max(Number(b.caps?.minIntervalMinutes) || 60, 5), 1440) },
      status: 'draft', approvedBy: '', approvedAt: '', lastError: '',
      expiresAt: stringValue(b.expires_at ?? b.expiresAt, 32) || new Date(Date.now() + 30 * 86400_000).toISOString(),
      createdAt: nowISO(), updatedAt: nowISO(),
    }, 0);
    await c.audit(actor, 'tg-campaign.create', id, { name: rec.data.name });
    res.json({ campaign_id: id, status: 'draft', version: rec.version });
  }));

  app.get('/api/manus/campaigns', endpoint(async (req, res) => {
    await requireAdmin(req as any);
    const rows = await core().list(TG_KINDS.campaign);
    res.json({ items: rows.map(r => ({ campaign_id: r.id, version: r.version, ...r.data })) });
  }));

  app.put('/api/manus/campaigns/:id', endpoint(async (req, res) => {
    const actor = await requireAdmin(req as any);
    const c = core();
    const id = stringValue(req.params.id, 80, true);
    const old = await c.read(TG_KINDS.campaign, id);
    if (!old) fail('NOT_FOUND', 404);
    const b = req.body || {};
    const version = Number(b.version);
    if (!Number.isInteger(version)) fail('VERSION_REQUIRED', 400);
    const next = { ...old.data };
    if (b.name !== undefined) next.name = stringValue(b.name, 120, true);
    if (b.text !== undefined) { next.text = stringValue(b.text, 4000, true); next.textHash = sha256Hex(next.text); }
    for (const k of ['ctaUrl', 'affiliateCode', 'affiliateUrl', 'disclosure', 'language', 'expiresAt'] as const) {
      const v = b[k] ?? b[{ ctaUrl: 'cta_url', affiliateCode: 'affiliate_code', affiliateUrl: 'affiliate_url', disclosure: 'disclosure', language: 'language', expiresAt: 'expires_at' }[k]];
      if (v !== undefined) next[k] = String(v).slice(0, 400);
    }
    if (b.fence !== undefined) next.fence = { allowDialogIds: Array.isArray(b.fence?.allowDialogIds) ? b.fence.allowDialogIds.map(String).slice(0, 50) : [], requireKeywordContext: b.fence?.requireKeywordContext !== false };
    if (b.caps !== undefined) next.caps = { maxPerDay: Math.min(Math.max(Number(b.caps?.maxPerDay) || 2, 1), 10), minIntervalMinutes: Math.min(Math.max(Number(b.caps?.minIntervalMinutes) || 60, 5), 1440) };
    // Any edit on a live/approved campaign resets it to draft (hash-lock: must be re-approved).
    if (old.data.status === 'live') { next.status = 'draft'; next.approvedBy = ''; next.approvedAt = ''; }
    next.updatedAt = nowISO();
    const rec = await c.save(TG_KINDS.campaign, id, next, version);
    await c.audit(actor, 'tg-campaign.update', id, { status: rec.data.status });
    res.json({ campaign_id: id, status: rec.data.status, version: rec.version });
  }));

  app.post('/api/manus/campaigns/:id/approve', endpoint(async (req, res) => {
    const actor = await requireAdmin(req as any);
    const c = core();
    const id = stringValue(req.params.id, 80, true);
    const old = await c.read(TG_KINDS.campaign, id);
    if (!old) fail('NOT_FOUND', 404);
    if (!old.data.text || !old.data.textHash) fail('CAMPAIGN_EMPTY', 422);
    const rec = await c.save(TG_KINDS.campaign, id, {
      ...old.data, status: 'live', approvedBy: actor, approvedAt: nowISO(), lastError: '', updatedAt: nowISO(),
    }, old.version);
    await c.audit(actor, 'tg-campaign.approve', id, { textHash: rec.data.textHash, expiresAt: rec.data.expiresAt });
    res.json({ campaign_id: id, status: 'live', approved_by: actor, approved_at: rec.data.approvedAt });
  }));

  app.post('/api/manus/campaigns/:id/pause', endpoint(async (req, res) => {
    const actor = await requireAdmin(req as any);
    const c = core();
    const id = stringValue(req.params.id, 80, true);
    const old = await c.read(TG_KINDS.campaign, id);
    if (!old) fail('NOT_FOUND', 404);
    const rec = await c.save(TG_KINDS.campaign, id, { ...old.data, status: 'paused', updatedAt: nowISO() }, old.version);
    await c.audit(actor, 'tg-campaign.pause', id, {});
    res.json({ campaign_id: id, status: 'paused' });
  }));

  app.post('/api/manus/campaigns/:id/revoke', endpoint(async (req, res) => {
    const actor = await requireAdmin(req as any);
    const c = core();
    const id = stringValue(req.params.id, 80, true);
    const old = await c.read(TG_KINDS.campaign, id);
    if (!old) fail('NOT_FOUND', 404);
    const rec = await c.save(TG_KINDS.campaign, id, { ...old.data, status: 'revoked', updatedAt: nowISO() }, old.version);
    await c.audit(actor, 'tg-campaign.revoke', id, {});
    res.json({ campaign_id: id, status: 'revoked' });
  }));

  // ---- Resolve a pending/deferred draft (ADMIN ONLY — one-time human override) ----
  app.post('/api/manus/campaign/drafts/:id/resolve', endpoint(async (req, res) => {
    const actor = await requireAdmin(req as any);
    const c = core();
    const id = stringValue(req.params.id, 80, true);
    const b = req.body || {};
    const action = stringValue(b.action, 16, true);
    if (!['approve', 'reject'].includes(action)) fail('INVALID_ACTION', 400);
    const old = await c.read(TG_KINDS.draft, id);
    if (!old) fail('NOT_FOUND', 404);
    if (!['pending_approval', 'deferred', 'approved_queued'].includes(old.data.status)) fail('BAD_STATE', 409);
    if (action === 'reject') {
      await c.save(TG_KINDS.draft, id, { ...old.data, status: 'rejected', reason: stringValue(b.note, 300) || 'REJECTED_BY_ADMIN', updatedAt: nowISO() }, old.version);
      await c.audit(actor, 'tg-draft.reject', id, {});
      return res.json({ draft_id: id, status: 'rejected' });
    }
    await c.audit(actor, 'tg-draft.approve', id, { note: stringValue(b.note, 300) });
    try {
      const out = await attemptSend(c, old, old.data.dialogId, old.data.message, old.data.requestId, old.data.idempotencyKey);
      return res.json({ draft_id: id, status: out.status, telegram_message_id: out.telegram_message_id || null });
    } catch (e: any) {
      return httpError(res, e);
    }
  }));

  // ---- Manager direct send (ADMIN ONLY, §5.1) ----
  app.post('/api/manus/telegram/send-direct', endpoint(async (req, res) => {
    const actor = await requireAdmin(req as any);
    const b = req.body || {};
    const input = {
      dialogId: stringValue(b.dialog_id ?? b.dialogId, 64, true),
      dialogType: stringValue(b.dialog_type ?? b.dialogType, 24),
      message: stringValue(b.message, 4000, true),
      idempotencyKey: stringValue(b.idempotency_key ?? b.idempotencyKey, 160, true),
    };
    const c = core();
    const out = await c.command(actor, input.idempotencyKey, 'tg-direct-send', input, async () => {
      const g = gateway();
      if (!g) fail('GATEWAY_UNREACHABLE', 503);
      let permission: TgEvalContext['permission'] = null;
      try {
        const p = await g.permissions(input.dialogId);
        permission = { isMember: !!p?.is_member, canSend: !!p?.can_send, canSendMedia: !!p?.can_send_media, type: String(p?.type || '') };
      } catch { permission = null; }
      const drafts = await c.list(TG_KINDS.draft);
      const decision = evaluateDirectSend(input, {
        nowIso: nowISO(), killSwitch: await killOn(), permission,
        idempotencySeen: drafts.some(r => r.data.idempotencyKey === input.idempotencyKey),
      });
      const id = newId('TGD');
      const rec = await c.save(TG_KINDS.draft, id, {
        campaignId: '', ...input, textHash: sha256Hex(input.message), source: 'manager-direct',
        status: decision.allow ? 'approved' : 'rejected', reason: decision.reason,
        warnings: decision.warnings || [], telegramMessageId: '', sentAt: '', errorCode: '',
        createdAt: nowISO(), updatedAt: nowISO(),
      }, 0);
      await c.save(TG_KINDS.decision, newId('TGX'), { draftId: id, campaignId: '', actor, outcome: decision.outcome, reason: decision.reason, textHash: sha256Hex(input.message), createdAt: nowISO() }, 0);
      if (!decision.allow) fail(decision.reason, decision.reason === 'KILL_SWITCH_ON' ? 503 : 422);
      const sendOut = await attemptSend(c, rec, input.dialogId, input.message, `direct-${id}`, input.idempotencyKey);
      return { draft_id: id, status: sendOut.status, telegram_message_id: sendOut.telegram_message_id || null, warnings: decision.warnings || [] };
    });
    res.json(out);
  }));

  // ---- Kill switch (ADMIN ONLY) ----
  app.post('/api/manus/admin/kill-switch', endpoint(async (req, res) => {
    const actor = await requireAdmin(req as any);
    const stopped = !!(req.body || {}).stopped;
    await store().setSetting(TG_KILL_SWITCH_KEY, stopped ? '1' : '0');
    await core().audit(actor, stopped ? 'tg-kill.on' : 'tg-kill.off', 'global', {});
    res.json({ stopped });
  }));
  app.get('/api/manus/admin/kill-switch', endpoint(async (req, res) => {
    await requireAdmin(req as any);
    res.json({ stopped: await killOn() });
  }));

  // ---- Affiliate daily report (Manus) — aggregates only, never PII ----
  app.get('/api/manus/reports/affiliate/daily', endpoint(async (req, res) => {
    await requireManus(req as any);
    const date = stringValue((req.query as any).date, 16) || nowISO().slice(0, 10);
    const svc = new AffiliateService(core());
    const report = await svc.report(`${date}T00:00:00.000Z`);
    const rows: any[] = report?.affiliates || [];
    let topCode: string | null = null;
    let topPaid = -1;
    for (const a of rows) {
      const paid = Number(a?.stats?.paid) || 0;
      if (paid > topPaid) { topPaid = paid; topCode = String(a.code || null); }
    }
    res.json(buildAffiliateDaily({ totals: (report?.totals || {}) as Record<string, number>, affiliateCount: rows.length, topCode }, date));
  }));

  // Silence unused helper warning in minimal builds.
  void fingerprint;
}
