/**
 * Manus ↔ Telegram gateway suite — pure logic, no server, no network, no DB.
 * Covers plan docs/manus/TELEGRAM_CAMPAIGN_PLAN.md §10 (tests 1–16):
 * policy fence, direct-send path, HMAC scheme, mock gateway, report/health mappers.
 */
import { suite, test, assert, run } from './harness.mts';

const policy = await import('../server/manus/policy.ts');
const gateway = await import('../server/manus/gateway.ts');

const {
  sha256Hex, evaluateDraft, evaluateDirectSend, scanUnverifiedClaims,
  buildManusHealth, buildAffiliateDaily,
} = policy;
const { signCommand, verifyCommandSignature, readGatewayConfig, MockTelegramGateway } = gateway;

const NOW = '2026-09-09T10:00:00.000Z';
const TEXT = 'Weekly FC night at Bazino Pro — see https://bazino.pro for details.';

function liveCampaign(over: Record<string, any> = {}): any {
  return {
    id: 'TGC-1', name: 'tg-launch', text: TEXT, textHash: sha256Hex(TEXT),
    language: 'en', fence: { allowDialogIds: [], requireKeywordContext: true },
    caps: { maxPerDay: 2, minIntervalMinutes: 60 },
    status: 'live', approvedBy: 'admin', approvedAt: NOW,
    expiresAt: '2026-10-09T00:00:00.000Z', lastError: '',
    ...over,
  };
}
function draftInput(over: Record<string, any> = {}): any {
  return {
    campaignId: 'TGC-1', dialogId: '-100111', dialogType: 'supergroup', message: TEXT,
    language: 'en', contextMessageId: '12345',
    requestId: 'manus-campaign-2026-09-09-001', idempotencyKey: 'idem-001',
    ...over,
  };
}
function ctx(over: Record<string, any> = {}): any {
  return {
    nowIso: NOW, killSwitch: false,
    permission: { isMember: true, canSend: true, canSendMedia: true, type: 'supergroup' },
    sentToday: 0, lastSentAt: undefined, duplicateSent: false,
    requestSeen: false, idempotencySeen: false, hasKeywordContext: true,
    ...over,
  };
}

suite('1. Text hash binding — approval locks the exact text');
test('sha256 is stable and mismatch is detectable', () => {
  assert.equal(sha256Hex(TEXT), sha256Hex(TEXT));
  assert.equal(sha256Hex(TEXT).length, 64);
  assert.ok(sha256Hex(TEXT) !== sha256Hex(TEXT + ' '), 'trailing space changes the hash');
});
test('happy path → auto_approved', () => {
  const d = evaluateDraft(liveCampaign(), draftInput(), ctx());
  assert.equal(d.outcome, 'auto_approved');
  assert.equal(d.allow, true);
  assert.equal(d.reason, 'ALL_CHECKS_PASSED');
});
test('changed text → pending_approval, never auto-send (plan test 13)', () => {
  const d = evaluateDraft(liveCampaign(), draftInput({ message: TEXT + ' (edited)' }), ctx());
  assert.equal(d.allow, false);
  assert.equal(d.outcome, 'pending_approval');
  assert.equal(d.reason, 'TEXT_HASH_MISMATCH');
});

suite('2. Campaign liveness — no approval, no send (plan test 1)');
test('draft-status campaign → pending CAMPAIGN_NOT_LIVE', () => {
  const d = evaluateDraft(liveCampaign({ status: 'draft' }), draftInput(), ctx());
  assert.equal(d.outcome, 'pending_approval');
  assert.equal(d.reason, 'CAMPAIGN_NOT_LIVE');
});
test('paused campaign → pending', () => {
  const d = evaluateDraft(liveCampaign({ status: 'paused' }), draftInput(), ctx());
  assert.equal(d.reason, 'CAMPAIGN_NOT_LIVE');
});
test('expired campaign → rejected CAMPAIGN_EXPIRED (plan test 4)', () => {
  const d = evaluateDraft(liveCampaign({ expiresAt: '2026-09-01T00:00:00.000Z' }), draftInput(), ctx());
  assert.equal(d.outcome, 'rejected');
  assert.equal(d.reason, 'CAMPAIGN_EXPIRED');
});
test('kill switch → pending KILL_SWITCH_ON', () => {
  const d = evaluateDraft(liveCampaign(), draftInput(), ctx({ killSwitch: true }));
  assert.equal(d.outcome, 'pending_approval');
  assert.equal(d.reason, 'KILL_SWITCH_ON');
});
test('first failing check wins (order is deterministic)', () => {
  const d = evaluateDraft(
    liveCampaign({ expiresAt: '2026-09-01T00:00:00.000Z' }),
    draftInput({ dialogType: 'private' }),
    ctx({ permission: { isMember: false, canSend: false, canSendMedia: false, type: 'private' } }),
  );
  assert.equal(d.reason, 'CAMPAIGN_EXPIRED', 'liveness is checked before destination');
});

suite('3. Destination safety — membership, type, fence (plan tests 2, 3, 6, 14)');
test('non-member → rejected (plan test 2)', () => {
  const d = evaluateDraft(liveCampaign(), draftInput(), ctx({ permission: { isMember: false, canSend: false, canSendMedia: false, type: 'supergroup' } }));
  assert.equal(d.outcome, 'rejected');
  assert.equal(d.reason, 'DEST_FRESH_CHECK');
});
test('member without send right → rejected (plan test 3)', () => {
  const d = evaluateDraft(liveCampaign(), draftInput(), ctx({ permission: { isMember: true, canSend: false, canSendMedia: false, type: 'supergroup' } }));
  assert.equal(d.reason, 'DEST_FRESH_CHECK');
});
test('unknown permission (null) → rejected, fail-closed', () => {
  const d = evaluateDraft(liveCampaign(), draftInput(), ctx({ permission: null }));
  assert.equal(d.outcome, 'rejected');
  assert.equal(d.reason, 'DEST_FRESH_CHECK');
});
test('DM/private → rejected (plan test 6)', () => {
  const d = evaluateDraft(liveCampaign(), draftInput({ dialogType: 'private' }), ctx({ permission: { isMember: true, canSend: true, canSendMedia: false, type: 'private' } }));
  assert.equal(d.reason, 'DEST_TYPE_BLOCKED');
});
test('dialog outside campaign fence → pending (plan test 14)', () => {
  const d = evaluateDraft(liveCampaign({ fence: { allowDialogIds: ['-100999'], requireKeywordContext: true } }), draftInput(), ctx());
  assert.equal(d.outcome, 'pending_approval');
  assert.equal(d.reason, 'DEST_NOT_IN_FENCE');
});
test('no relevant context → rejected', () => {
  const d = evaluateDraft(liveCampaign(), draftInput({ contextMessageId: '' }), ctx({ hasKeywordContext: false }));
  assert.equal(d.reason, 'NO_RELEVANT_CONTEXT');
});

suite('4. Replay & duplicates (plan test 5)');
test('already-sent (dialog+hash) → rejected DUPLICATE_SEND', () => {
  const d = evaluateDraft(liveCampaign(), draftInput(), ctx({ duplicateSent: true }));
  assert.equal(d.reason, 'DUPLICATE_SEND');
});
test('seen request_id → rejected REPLAY_DETECTED', () => {
  const d = evaluateDraft(liveCampaign(), draftInput(), ctx({ requestSeen: true }));
  assert.equal(d.reason, 'REPLAY_DETECTED');
});
test('seen idempotency key → rejected REPLAY_DETECTED', () => {
  const d = evaluateDraft(liveCampaign(), draftInput(), ctx({ idempotencySeen: true }));
  assert.equal(d.reason, 'REPLAY_DETECTED');
});

suite('5. Caps — defer, never exceed');
test('daily cap reached → deferred', () => {
  const d = evaluateDraft(liveCampaign(), draftInput(), ctx({ sentToday: 2 }));
  assert.equal(d.outcome, 'deferred');
  assert.equal(d.reason, 'DAILY_CAP_REACHED');
});
test('minimum interval not met → deferred', () => {
  const d = evaluateDraft(liveCampaign(), draftInput(), ctx({ sentToday: 1, lastSentAt: '2026-09-09T09:30:00.000Z' }));
  assert.equal(d.reason, 'MIN_INTERVAL_NOT_MET');
});

suite('6. Unverified claims review (plan test 7)');
test('fa/en/tr/ru claim terms are flagged', () => {
  assert.equal(scanUnverifiedClaims('مسابقه با جایزه نقدی').flagged, true);
  assert.equal(scanUnverifiedClaims('big prize pool').terms.includes('prize'), true);
  assert.equal(scanUnverifiedClaims('%50 indirim var').terms.includes('discount'), true);
  assert.equal(scanUnverifiedClaims('цена и скидка').flagged, true);
  assert.equal(scanUnverifiedClaims(TEXT).flagged, false);
});
test('flagged text → pending CLAIMS_REVIEW with terms', () => {
  const msg = 'Tournament with جایزه — details soon';
  const d = evaluateDraft(liveCampaign({ text: msg, textHash: sha256Hex(msg) }), draftInput({ message: msg }), ctx());
  assert.equal(d.outcome, 'pending_approval');
  assert.equal(d.reason, 'CLAIMS_REVIEW');
  assert.ok((d.warnings || []).length > 0);
});

suite('7. Auto-stop on flood/permission errors (plan test 15)');
test('prior FLOOD_WAIT → pending AUTO_STOP + pause signal', () => {
  const d = evaluateDraft(liveCampaign({ lastError: 'FLOOD_WAIT' }), draftInput(), ctx());
  assert.equal(d.reason, 'AUTO_STOP');
  assert.equal(d.pauseCampaign, true);
});
test('prior PERMISSION_DENIED → pending AUTO_STOP + pause signal', () => {
  const d = evaluateDraft(liveCampaign({ lastError: 'PERMISSION_DENIED' }), draftInput(), ctx());
  assert.equal(d.reason, 'AUTO_STOP');
  assert.equal(d.pauseCampaign, true);
});

suite('8. Manager direct send path (§5.1)');
const directCtx = (over: Record<string, any> = {}) => ({
  nowIso: NOW, killSwitch: false,
  permission: { isMember: true, canSend: true, canSendMedia: true, type: 'channel' },
  idempotencySeen: false, ...over,
});
test('manager happy path → allow', () => {
  const d = evaluateDirectSend({ dialogId: '-100222', dialogType: 'channel', message: TEXT, idempotencyKey: 'm-1' }, directCtx());
  assert.equal(d.allow, true);
  assert.equal(d.reason, 'MANAGER_DIRECT_OK');
});
test('claims only warn on the manager path (flagged in log)', () => {
  const d = evaluateDirectSend({ dialogId: '-100222', dialogType: 'channel', message: 'Night with جایزه', idempotencyKey: 'm-2' }, directCtx());
  assert.equal(d.allow, true);
  assert.ok((d.warnings || []).some(w => w.startsWith('CLAIMS_FLAGGED')));
});
test('manager DM → rejected', () => {
  const d = evaluateDirectSend({ dialogId: '777', dialogType: 'private', message: TEXT, idempotencyKey: 'm-3' },
    directCtx({ permission: { isMember: true, canSend: true, canSendMedia: false, type: 'private' } }));
  assert.equal(d.reason, 'DEST_TYPE_BLOCKED');
});
test('manager replay / missing key / unknown perm / kill → rejected', () => {
  const base = { dialogId: '-100222', dialogType: 'channel', message: TEXT, idempotencyKey: 'm-4' };
  assert.equal(evaluateDirectSend(base, directCtx({ idempotencySeen: true })).reason, 'REPLAY_DETECTED');
  assert.equal(evaluateDirectSend({ ...base, idempotencyKey: '' }, directCtx()).reason, 'IDEMPOTENCY_REQUIRED');
  assert.equal(evaluateDirectSend(base, directCtx({ permission: null })).reason, 'DEST_FRESH_CHECK');
  assert.equal(evaluateDirectSend(base, directCtx({ killSwitch: true })).reason, 'KILL_SWITCH_ON');
});

suite('9. HMAC command scheme — portal signs, gateway verifies');
test('sign → verify roundtrip passes', () => {
  const raw = Buffer.from(JSON.stringify({ request_id: 'r1', message: 'hi' }), 'utf8');
  const sig = `sha256=${signCommand('s3cret', raw)}`;
  assert.equal(verifyCommandSignature(raw, sig, 's3cret'), true);
});
test('tampered body, wrong secret, malformed signature fail', () => {
  const raw = Buffer.from('{"a":1}', 'utf8');
  const sig = `sha256=${signCommand('s3cret', raw)}`;
  assert.equal(verifyCommandSignature(Buffer.from('{"a":2}', 'utf8'), sig, 's3cret'), false);
  assert.equal(verifyCommandSignature(raw, sig, 'other'), false);
  assert.equal(verifyCommandSignature(raw, 'not-hex', 's3cret'), false);
  assert.equal(verifyCommandSignature(raw, sig, ''), false);
});
test('gateway config is null unless fully configured (readonly default)', () => {
  assert.equal(readGatewayConfig({} as any), null);
  assert.equal(readGatewayConfig({ TG_GATEWAY_URL: 'http://x' } as any), null);
  const cfg = readGatewayConfig({ TG_GATEWAY_URL: 'http://gw:8000/', TG_GATEWAY_BEARER: 'b', TG_GATEWAY_HMAC_SECRET: 'h' } as any);
  assert.ok(cfg && cfg.baseUrl === 'http://gw:8000' && cfg.timeoutMs > 0);
});

suite('10. No live sends in tests (plan test 10)');
test('mock gateway records sends with zero network', async () => {
  const mock = new MockTelegramGateway();
  assert.equal((mock as any).fetchImpl, undefined, 'mock must not hold any fetch implementation');
  const out = await mock.send({ request_id: 'r1', draft_id: 'd1', dialog_id: '-100111', message: 'hi', idempotency_key: 'k1', expires_at: NOW });
  assert.equal(out.status, 'sent');
  assert.equal(mock.sentCommands().length, 1);
  assert.equal(mock.sentCommands()[0].dialog_id, '-100111');
});
test('mock surfaces failure codes for the caller to honor (no auto-retry here)', async () => {
  const mock = new MockTelegramGateway();
  mock.failNextSendWith = { status: 'failed', error_code: 'FLOOD_WAIT', retryable: false };
  const out = await mock.send({ request_id: 'r2', draft_id: 'd2', dialog_id: '-100111', message: 'hi', idempotency_key: 'k2', expires_at: NOW });
  assert.equal(out.status, 'failed');
  assert.equal(out.error_code, 'FLOOD_WAIT');
  assert.equal(out.retryable, false);
});

suite('11. Health & report mappers — no secrets, no PII, no fabricated numbers');
test('health payload has exactly the public keys (plan test 9)', () => {
  const h: any = buildManusHealth('reachable', NOW);
  assert.deepEqual(Object.keys(h).sort(), ['ok', 'service', 'telegram_gateway', 'timestamp']);
  const blob = JSON.stringify(h).toLowerCase();
  for (const banned of ['secret', 'session', 'phone', 'api_hash', 'api_id', 'token', 'bearer', 'password']) {
    assert.ok(!blob.includes(banned), `health must not contain "${banned}"`);
  }
});
test('empty affiliate data → data_unavailable, never fake zeros (plan test 8)', () => {
  const r: any = buildAffiliateDaily({ totals: {}, affiliateCount: 0, topCode: null }, '2026-09-09');
  assert.equal(r.status, 'data_unavailable');
  assert.equal(r.message, 'داده‌ای ثبت نشده/دسترسی موجود نیست');
  assert.ok(!('clicks' in r), 'no zero-filled metrics on unavailable data');
});
test('daily mapping passes aggregates and strips PII (plan test 12)', () => {
  const r: any = buildAffiliateDaily({
    totals: { clicks: 10, leads: 3, reserved: 2, paid: 1, attended: 1, pending: 50, approved: 40, reversed: 1, rejected: 0, paidOut: 40, username: 1 } as any,
    affiliateCount: 2, topCode: 'AFF-1',
  }, '2026-09-09');
  assert.equal(r.status, 'ok');
  assert.equal(r.clicks, 10);
  assert.equal(r.reservations, 2);
  assert.equal(r.reversedCancelled, 1);
  assert.equal(r.topAffiliate, 'AFF-1');
  const blob = JSON.stringify(r).toLowerCase();
  for (const banned of ['username', 'email', 'phone', 'password', 'secret']) {
    assert.ok(!blob.includes(`"${banned}"`), `report must not contain "${banned}"`);
  }
});
test('policy decisions never carry the message text (hash only)', () => {
  const d = evaluateDraft(liveCampaign(), draftInput(), ctx());
  assert.ok(!JSON.stringify(d).includes(TEXT.slice(0, 20)), 'decision must not embed message text');
});

await run({ title: 'Bazino — Manus/Telegram gateway tests', jsonOut: 'tests/reports/manus.json' });
