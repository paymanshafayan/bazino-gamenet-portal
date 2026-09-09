/**
 * Telegram campaign policy engine — pure functions (no express, no DB, no network).
 * Implements docs/manus/TELEGRAM_CAMPAIGN_PLAN.md §5 (draft fence) + §5.1 (manager direct send).
 * All decisions are fail-closed: first failing check wins, unknown permission = reject.
 */
import { createHash } from 'node:crypto';

/** Destination types the automation may ever send to. DMs are never allowed. */
export const TG_SENDABLE_TYPES = ['channel', 'group', 'supergroup'] as const;
export type TgSendableType = (typeof TG_SENDABLE_TYPES)[number];

export const TG_DEFAULT_CAPS = { maxPerDay: 2, minIntervalMinutes: 60 } as const;
/** Campaign errors that force auto-stop (plan §5 check 9). */
export const TG_AUTOSTOP_ERRORS = ['FLOOD_WAIT', 'PERMISSION_DENIED', 'SPAM_BLOCKED', 'ACCOUNT_RESTRICTED'] as const;

export function sha256Hex(s: string): string {
  return createHash('sha256').update(String(s ?? ''), 'utf8').digest('hex');
}

export interface TgCampaignFence {
  /** If set, only these dialog ids are auto-sendable. Empty = any verified dialog within rules. */
  allowDialogIds?: string[];
  languages?: string[];
  requireKeywordContext?: boolean;
}

export interface TgCampaign {
  id: string;
  name: string;
  text: string;
  textHash: string;
  ctaUrl?: string;
  affiliateCode?: string;
  affiliateUrl?: string;
  disclosure?: string;
  language?: string;
  fence?: TgCampaignFence;
  caps?: { maxPerDay?: number; minIntervalMinutes?: number };
  status: 'draft' | 'live' | 'paused' | 'completed' | 'revoked';
  approvedBy?: string;
  approvedAt?: string;
  expiresAt?: string;
  lastError?: string;
}

export interface TgDraftInput {
  campaignId: string;
  dialogId: string;
  dialogType: string;
  message: string;
  language?: string;
  contextMessageId?: string;
  requestId: string;
  idempotencyKey: string;
}

export interface TgFreshPermission {
  isMember: boolean;
  canSend: boolean;
  canSendMedia: boolean;
  type: string;
}

/** Everything the evaluator needs, gathered by the routes layer (fresh permission, counts, lookups). */
export interface TgEvalContext {
  nowIso: string;
  killSwitch: boolean;
  permission: TgFreshPermission | null;
  sentToday: number;
  lastSentAt?: string;
  duplicateSent: boolean;
  requestSeen: boolean;
  idempotencySeen: boolean;
  hasKeywordContext: boolean;
}

export type TgOutcome = 'auto_approved' | 'pending_approval' | 'rejected' | 'deferred';

export interface TgDecision {
  allow: boolean;
  outcome: TgOutcome;
  /** Machine-readable reason code for audit (e.g. TEXT_HASH_MATCH, DEST_TYPE_OK). */
  reason: string;
  failedCheck?: string;
  /** When true, the routes layer must pause the campaign immediately (auto-stop). */
  pauseCampaign?: boolean;
  warnings?: string[];
}

const deny = (outcome: TgOutcome, reason: string, extra?: Partial<TgDecision>): TgDecision => ({
  allow: false, outcome, reason, failedCheck: reason, ...extra,
});

/**
 * Ordered §5 fence evaluation. Returns auto_approved only when EVERY check passes.
 */
export function evaluateDraft(campaign: TgCampaign, draft: TgDraftInput, ctx: TgEvalContext): TgDecision {
  // 1. CAMPAIGN_LIVE
  if (ctx.killSwitch) return deny('pending_approval', 'KILL_SWITCH_ON');
  if (!campaign || campaign.status !== 'live') return deny('pending_approval', 'CAMPAIGN_NOT_LIVE');
  if (campaign.expiresAt && Date.parse(campaign.expiresAt) <= Date.parse(ctx.nowIso)) {
    return deny('rejected', 'CAMPAIGN_EXPIRED');
  }
  // 2. TEXT_HASH_MATCH — exact text binding; mismatch needs a human, never auto-sends.
  if (sha256Hex(draft.message) !== campaign.textHash) return deny('pending_approval', 'TEXT_HASH_MISMATCH');
  // 3. DEST_FRESH_CHECK — unknown permission = reject.
  const p = ctx.permission;
  if (!p || !p.isMember || !p.canSend) return deny('rejected', 'DEST_FRESH_CHECK');
  // 4. DEST_TYPE_OK — channel/group/supergroup only.
  const t = String(draft.dialogType || p.type || '').toLowerCase();
  if (!(TG_SENDABLE_TYPES as readonly string[]).includes(t)) return deny('rejected', 'DEST_TYPE_BLOCKED');
  // Fence allowlist (when the approved campaign pins dialog ids).
  const allow = campaign.fence?.allowDialogIds;
  if (Array.isArray(allow) && allow.length && !allow.includes(draft.dialogId)) {
    return deny('pending_approval', 'DEST_NOT_IN_FENCE');
  }
  // 5. RELEVANCE_OK — needs linked public context.
  if (campaign.fence?.requireKeywordContext !== false && !draft.contextMessageId && !ctx.hasKeywordContext) {
    return deny('rejected', 'NO_RELEVANT_CONTEXT');
  }
  // 6. NOT_DUPLICATE — replay-safe.
  if (ctx.duplicateSent) return deny('rejected', 'DUPLICATE_SEND');
  if (ctx.requestSeen || ctx.idempotencySeen) return deny('rejected', 'REPLAY_DETECTED');
  // 7. CAPS_OK — defer, never exceed.
  const maxPerDay = campaign.caps?.maxPerDay ?? TG_DEFAULT_CAPS.maxPerDay;
  const minGap = campaign.caps?.minIntervalMinutes ?? TG_DEFAULT_CAPS.minIntervalMinutes;
  if (ctx.sentToday >= maxPerDay) return deny('deferred', 'DAILY_CAP_REACHED');
  if (ctx.lastSentAt && Date.parse(ctx.nowIso) - Date.parse(ctx.lastSentAt) < minGap * 60_000) {
    return deny('deferred', 'MIN_INTERVAL_NOT_MET');
  }
  // 8. CLAIMS_OK — unverified commercial claims go to a human.
  const claims = scanUnverifiedClaims(draft.message);
  if (claims.flagged) return deny('pending_approval', 'CLAIMS_REVIEW', { warnings: claims.terms });
  // 9. AUTO_STOP — a prior flood/permission/spam error pauses everything.
  if (campaign.lastError && (TG_AUTOSTOP_ERRORS as readonly string[]).includes(campaign.lastError)) {
    return deny('pending_approval', 'AUTO_STOP', { pauseCampaign: true });
  }
  return { allow: true, outcome: 'auto_approved', reason: 'ALL_CHECKS_PASSED' };
}

export interface TgDirectSendInput {
  dialogId: string;
  dialogType: string;
  message: string;
  idempotencyKey: string;
}

export interface TgDirectContext {
  nowIso: string;
  killSwitch: boolean;
  permission: TgFreshPermission | null;
  idempotencySeen: boolean;
}

/**
 * §5.1 manager direct send — no campaign fence (the manager IS the human approval),
 * but destination safety + idempotency stay mandatory. Claims only warn (flagged in log).
 */
export function evaluateDirectSend(input: TgDirectSendInput, ctx: TgDirectContext): TgDecision {
  if (ctx.killSwitch) return deny('rejected', 'KILL_SWITCH_ON');
  const p = ctx.permission;
  if (!p || !p.isMember || !p.canSend) return deny('rejected', 'DEST_FRESH_CHECK');
  const t = String(input.dialogType || p.type || '').toLowerCase();
  if (!(TG_SENDABLE_TYPES as readonly string[]).includes(t)) return deny('rejected', 'DEST_TYPE_BLOCKED');
  if (!input.idempotencyKey) return deny('rejected', 'IDEMPOTENCY_REQUIRED');
  if (ctx.idempotencySeen) return deny('rejected', 'REPLAY_DETECTED');
  const claims = scanUnverifiedClaims(input.message);
  return {
    allow: true, outcome: 'auto_approved', reason: 'MANAGER_DIRECT_OK',
    warnings: claims.flagged ? [`CLAIMS_FLAGGED:${claims.terms.join(',')}`] : [],
  };
}

/** Terms that require a verified source before an automated send (fa/en/tr/ru). */
const CLAIM_PATTERNS: Array<{ re: RegExp; term: string }> = [
  { re: /جایزه|prize|ödül|приз/i, term: 'prize' },
  { re: /تخفیف|discount|indirim|скидк/i, term: 'discount' },
  { re: /نیم‌بها|نیم بها|half[- ]price/i, term: 'half-price' },
  { re: /ظرفیت|capacity|kontenjan|вместимость/i, term: 'capacity' },
  { re: /قیمت|\bprice\b|fiyat|цена/i, term: 'price' },
  { re: /قرعه‌کشی|قرعه کشی|lottery|çekiliş|розыгрыш/i, term: 'lottery' },
  { re: /رایگان\s*(بازی|ساعت|عضویت)|free\s*(game|hour|play|membership)/i, term: 'free-offer' },
];

export function scanUnverifiedClaims(text: string): { flagged: boolean; terms: string[] } {
  const s = String(text || '');
  const terms = CLAIM_PATTERNS.filter(p => p.re.test(s)).map(p => p.term);
  return { flagged: terms.length > 0, terms };
}

/** Ops-record kinds for Telegram campaign data (works on all three providers). */
export const TG_KINDS = {
  campaign: 'tg-campaign',
  draft: 'tg-draft',
  decision: 'tg-decision',
  idem: 'tg-idem',
} as const;

export const TG_KILL_SWITCH_KEY = 'tg_kill_switch';

/** Health payload builder — must never include secrets (plan test 9). */
export function buildManusHealth(gateway: 'reachable' | 'unreachable', nowIso: string) {
  return { ok: true, service: 'bazino-portal', telegram_gateway: gateway, timestamp: nowIso };
}

export interface TgAffiliateDailyInput {
  totals: Record<string, number>;
  affiliateCount: number;
  topCode: string | null;
}

/**
 * Maps affiliate engine aggregates to the Manus daily shape.
 * Empty data → data_unavailable (never fabricated zeros). Output keys are
 * allowlisted — customer PII can never pass through (plan tests 8 + 12).
 */
export function buildAffiliateDaily(input: TgAffiliateDailyInput, date: string) {
  if (!input || input.affiliateCount <= 0) {
    return {
      date, status: 'data_unavailable',
      message: 'داده‌ای ثبت نشده/دسترسی موجود نیست',
    };
  }
  const n = (v: unknown) => (Number.isFinite(Number(v)) ? Number(v) : 0);
  const t = input.totals || {};
  return {
    date,
    status: 'ok',
    clicks: n(t.clicks),
    leads: n(t.leads),
    reservations: n(t.reserved),
    paidTransactions: n(t.paid),
    attendedVisits: n(t.attended),
    pendingCommission: n(t.pending),
    approvedCommission: n(t.approved),
    reversedCancelled: n(t.reversed) + n(t.rejected),
    paidOut: n(t.paidOut),
    topAffiliate: input.topCode,
    topDestination: null as string | null,
  };
}
