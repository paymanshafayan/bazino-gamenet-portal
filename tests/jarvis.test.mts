/**
 * Jarvis admin-assistant suite — engine, skills, approvals, config and routes
 * against a real SQLite store. The Groq API is fully mocked (sandbox egress
 * cannot reach api.groq.com): the mock returns scripted OpenAI-compatible
 * responses with native tool_calls, exactly the shape Groq produces.
 */
import assert from 'node:assert/strict';
import { suite, test, run } from './harness.mts';
import express from 'express';

const { SqliteStore } = await import('../server/dataProviders.ts');
const { OpsCore } = await import('../server/management/core.ts');
const jarvisConfig = await import('../server/jarvis/config.ts');
const { JarvisEngine } = await import('../server/jarvis/agent.ts');
const { createSkillRegistry, SENSITIVE_IDS, buildSkillRegistry } = await import('../server/jarvis/skills.ts');
const { createApproval, listApprovals, decideApproval } = await import('../server/jarvis/approvals.ts');
const { registerJarvis } = await import('../server/jarvis/routes.ts');

const store = new SqliteStore();
store.config = { filePath: ':memory:' };
await store.connect();
await store.createDatabaseIfNotExist();
await store.seedMinimal({ username: 'admin', password: 'x', email: '', phone: '' });
const getStore = () => store;
const core = new OpsCore(getStore);

/* ── scripted Groq mock ─────────────────────────────────────────── */

type Scripted = Array<{ tool_calls?: any[]; content?: string }>;
let script: Scripted = [];
let calls: any[] = [];
const mockFetcher = (async (url: string, init: any) => {
  calls.push({ url, body: JSON.parse(init.body || '{}') });
  const next = script.shift() || { content: 'باشه.' };
  const message: any = next.content !== undefined ? { role: 'assistant', content: next.content } : { role: 'assistant', content: '', tool_calls: next.tool_calls };
  return new Response(JSON.stringify({ choices: [{ message }] }), { status: 200, headers: { 'Content-Type': 'application/json' } });
}) as unknown as typeof fetch;

const toolCall = (id: string, name: string, args: any) => ({
  id, type: 'function', function: { name, arguments: JSON.stringify(args) },
});

async function bootEngine() {
  const registry = createSkillRegistry({ create: createApproval });
  const engine = new JarvisEngine(core, getStore, registry, mockFetcher);
  return { registry, engine };
}

async function setConfig(over: any = {}) {
  await store.setSetting(jarvisConfig.JARVIS_CONFIG_KEY, JSON.stringify({
    apiKey: 'gsk-test-key-1234567890', model: 'llama-3.3-70b-versatile', lightModel: 'llama-3.1-8b-instant', dailyCallCap: 50,
    automation: { dailyBrief: false, weeklyDigest: false, igReplies: false, chatFaq: false, faqAutoSend: false },
    ...over,
  }));
}

/* ── 1. Config ──────────────────────────────────────────────────── */

suite('1. Jarvis config (Groq)');
test('sanitize clamps, masks and keeps the old key on placeholder', async () => {
  const clean = jarvisConfig.sanitizeJarvisConfig({ apiKey: 'k', model: 'x'.repeat(300), dailyCallCap: 999999 });
  assert.equal(clean.model.length <= 120, true);
  assert.equal(clean.dailyCallCap, 100000);
  assert.equal(jarvisConfig.mergeApiKey('********', 'OLD'), 'OLD');
  assert.equal(jarvisConfig.mergeApiKey('', 'OLD'), 'OLD');
  assert.equal(jarvisConfig.mergeApiKey('NEW', 'OLD'), 'NEW');
  const masked: any = jarvisConfig.maskedJarvisConfig({ ...clean, apiKey: 'secret' });
  assert.equal(masked.apiKey, '********');
});
test('groq tool-use model catalog excludes groq/compound (no local tool use)', () => {
  assert.ok(jarvisConfig.FREE_GROQ_MODELS.some((m: any) => m.id === 'llama-3.3-70b-versatile'));
  assert.ok(!jarvisConfig.FREE_GROQ_MODELS.some((m: any) => m.id.includes('compound')));
});
test('provider errors map to stable codes', async () => {
  const badFetcher = (async () => new Response('{"error":"quota"}', { status: 429, headers: { 'retry-after': '5' } })) as unknown as typeof fetch;
  await assert.rejects(() => jarvisConfig.groqChatCompletion({ apiKey: 'k', model: 'm', messages: [{ role: 'user', content: 'x' }], fetcher: badFetcher }), (e: any) => e.code === 'JARVIS_RATE_LIMITED' && e.retryAfter === 5);
});

/* ── 2. Skills registry ─────────────────────────────────────────── */

suite('2. Skill registry and exclusions');
test('hard exclusions: no skill ever touches keys/tokens/staff/db-reset', () => {
  const ids = buildSkillRegistry().map(s => s.id).join(' ');
  for (const banned of ['token', 'secret', 'api_key', 'apikey', 'operator', 'staff', 'password', 'reset', 'clear', 'data_source', 'theme'])
    assert.ok(!ids.includes(banned), `skill id must not mention ${banned}`);
  for (const id of SENSITIVE_IDS) assert.ok(ids.includes(id), `missing sensitive skill ${id}`);
});
test('read skill answers from the real store', async () => {
  const registry = createSkillRegistry({ create: createApproval });
  const r = await registry.run({ core, store, actor: 't' }, 'portal_stats', {});
  assert.equal(r.ok, true);
  assert.ok(r.summary!.includes('کاربران'));
});
test('write skill executes directly and is audited', async () => {
  const registry = createSkillRegistry({ create: createApproval });
  const r = await registry.run({ core, store, actor: 'boss' }, 'send_user_message', { recipient: 'admin', title: 'تست', body: 'سلام' });
  assert.equal(r.ok, true);
  const msgs = await store.listUserMessages();
  assert.ok(msgs.some((m: any) => m.recipient === 'admin' && m.title === 'تست'));
  const audit = (await core.list('audit')).filter((a: any) => a.data.action === 'jarvis.skill.send_user_message');
  assert.ok(audit.length >= 1);
});
test('sensitive skill NEVER executes from run() — it files an approval', async () => {
  const registry = createSkillRegistry({ create: createApproval });
  const before = Number((await store.getUserByUsername('admin'))!.credits || 0);
  const r = await registry.run({ core, store, actor: 'boss' }, 'adjust_credits', { username: 'admin', delta: 25, note: 'تست' });
  assert.equal(r.approvalRequired, true);
  assert.ok(r.approvalId);
  const after = Number((await store.getUserByUsername('admin'))!.credits || 0);
  assert.equal(after, before, 'credits must not change before approval');
});

/* ── 3. Approvals ───────────────────────────────────────────────── */

suite('3. Approval queue');
test('approve executes with the deciding admin as actor', async () => {
  const registry = createSkillRegistry({ create: createApproval });
  const before = Number((await store.getUserByUsername('admin'))!.credits || 0);
  const a = await createApproval(core, { skillId: 'adjust_credits', title: 'شارژ تست', params: { username: 'admin', delta: 30 }, risk: 'sensitive', requestedBy: 'jarvis:test' });
  const decided = await decideApproval(core, { id: a.id, action: 'approve', decidedBy: 'the-admin', getStore, runDirect: (ctx, id, p) => registry.runDirect(ctx, id, p) });
  assert.equal(decided.status, 'approved');
  assert.equal(decided.decidedBy, 'the-admin');
  const after = Number((await store.getUserByUsername('admin'))!.credits || 0);
  assert.equal(after, before + 30);
  const txs = await store.listTransactions();
  assert.ok(txs.some((t: any) => t.username === 'admin' && t.points === 30));
});
test('reject keeps data untouched; double decision is refused', async () => {
  const registry = createSkillRegistry({ create: createApproval });
  const a = await createApproval(core, { skillId: 'adjust_credits', title: 'رد', params: { username: 'admin', delta: 999 }, risk: 'sensitive', requestedBy: 'jarvis:test' });
  const decided = await decideApproval(core, { id: a.id, action: 'reject', decidedBy: 'boss', getStore, runDirect: (c, i, p) => registry.runDirect(c, i, p) });
  assert.equal(decided.status, 'rejected');
  await assert.rejects(() => decideApproval(core, { id: a.id, action: 'approve', decidedBy: 'boss', getStore, runDirect: (c, i, p) => registry.runDirect(c, i, p) }), { code: 'JARVIS_APPROVAL_ALREADY_DECIDED' } as any);
});
test('ig_away_toggle approval flips the shared setting (same key the away engine reads)', async () => {
  const registry = createSkillRegistry({ create: createApproval });
  const a = await createApproval(core, { skillId: 'ig_away_toggle', title: 'روشن‌کردن غیبت', params: { enabled: true }, risk: 'sensitive', requestedBy: 'jarvis:test' });
  await decideApproval(core, { id: a.id, action: 'approve', decidedBy: 'boss', getStore, runDirect: (c, i, p) => registry.runDirect(c, i, p) });
  const raw: any = JSON.parse(String(await store.getSetting('ig_away_settings')));
  assert.equal(raw.enabled, true);
  assert.equal(raw.startHour, 1);
});
test('send_ig_reply approval enqueues a jarvis_reply outbox row', async () => {
  const registry = createSkillRegistry({ create: createApproval });
  // Simulate one recorded inbound DM (same shape the away engine stores).
  const { fingerprint } = await import('../server/management/core.ts');
  const inboxId = fingerprint({ conversation: 'c-jarvis-1', message: 'm1', author: 'a1', text: 'قیمت چنده؟', ts: 't1' });
  await core.save('ig-inbox', inboxId, { accountId: 'acc-1', conversationId: 'c-jarvis-1', authorId: 'a1', username: 'asker', text: 'قیمت چنده؟', language: 'fa', receivedAt: new Date().toISOString(), messageId: 'm1', replied: false, reason: '' }, 0);
  const a = await createApproval(core, { skillId: 'send_ig_reply', title: 'پاسخ دایرکت', params: { conversationId: 'c-jarvis-1', authorId: 'a1', accountId: 'acc-1', text: 'سلام! اطلاعات قیمت در دایرکت می‌آید.' }, risk: 'sensitive', requestedBy: 'jarvis:test' });
  const decided = await decideApproval(core, { id: a.id, action: 'approve', decidedBy: 'boss', getStore, runDirect: (c, i, p) => registry.runDirect(c, i, p) });
  assert.equal(decided.status, 'approved');
  const outbox = await core.list('pub-outbox');
  const row = outbox.find((r: any) => r.data.stage === 'jarvis_reply');
  assert.ok(row, 'jarvis_reply outbox row must exist');
  assert.ok(String(row.data.memberId).startsWith('jarvis:'));
  const inbox = (await core.list('ig-inbox')).find((r: any) => r.id === inboxId)!;
  assert.equal(inbox.data.replied, true, 'ig-inbox row must be marked replied');
});

/* ── 4. Agent loop (mocked Groq with native tool_calls) ──────────── */

suite('4. Agent loop');
test('not configured → friendly reply without any LLM call', async () => {
  await store.setSetting(jarvisConfig.JARVIS_CONFIG_KEY, JSON.stringify(jarvisConfig.sanitizeJarvisConfig({ apiKey: '' })));
  const { engine } = await bootEngine();
  const r = await engine.chat({ message: 'سلام', actor: 'admin' });
  assert.ok(r.reply.includes('تنظیم نشده'));
  assert.equal(calls.length, 0);
});
test('tool round-trip: read skill → final answer; session persisted', async () => {
  await setConfig();
  const { engine } = await bootEngine();
  script = [
    { tool_calls: [toolCall('call-1', 'portal_stats', {})] },
    { content: 'امروز ۱ کاربر داریم.' },
  ];
  const r = await engine.chat({ message: 'آمار پورتال؟', actor: 'admin' });
  assert.equal(r.toolsUsed[0], 'portal_stats');
  assert.equal(r.reply, 'امروز ۱ کاربر داریم.');
  assert.ok(r.sessionId.startsWith('js-'));
  const session = await engine.session(r.sessionId);
  assert.ok((session!.messages || []).some((m: any) => m.role === 'user'));
  assert.equal((await core.list('jarvis-session')).length >= 1, true);
  assert.ok((await jarvisConfig.todayUsage(core)) >= 2, 'each LLM round must count against the daily cap');
});
test('sensitive request through chat lands in approvals, reply mentions confirmation', async () => {
  await setConfig({ dailyCallCap: 500 });
  const { engine } = await bootEngine();
  script = [
    { tool_calls: [toolCall('call-2', 'adjust_credits', { username: 'admin', delta: 10 })] },
    { content: 'درخواست شارژ ثبت شد و به تأیید شما نیاز دارد.' },
  ];
  const r = await engine.chat({ message: 'برای admin ده کردیت شارژ کن', actor: 'admin' });
  assert.equal(r.approvalsCreated.length, 1);
  const pending = await listApprovals(core, 'pending');
  assert.ok(pending.some((p: any) => p.skillId === 'adjust_credits'));
  assert.ok(r.reply.includes('تأیید'));
});
test('unknown tool and malformed arguments fail soft, not crash', async () => {
  await setConfig({ dailyCallCap: 500 });
  const { engine } = await bootEngine();
  script = [
    { tool_calls: [toolCall('call-3', 'does_not_exist', { x: 1 }), toolCall('call-4', 'user_details', 'NOT-JSON')] },
    { content: 'ابزار ناشناخته بود.' },
  ];
  const r = await engine.chat({ message: 'چیزی اجرا کن', actor: 'admin' });
  assert.equal(r.reply, 'ابزار ناشناخته بود.');
});
test('daily cap blocks the LLM call with JARVIS_DAILY_CAP (min clamp = 10)', async () => {
  await setConfig({ dailyCallCap: 10 });
  const { engine } = await bootEngine();
  // Burn the whole daily budget directly (min clamp forbids caps below 10).
  for (let i = 0; i < 10; i++) await jarvisConfig.bumpUsage(core, 1);
  assert.equal(await jarvisConfig.todayUsage(core) >= 10, true);
  script = [{ content: 'should not happen' }];
  await assert.rejects(() => engine.chat({ message: 'سلام', actor: 'admin' }), (e: any) => e.code === 'JARVIS_DAILY_CAP');
});

/* ── 5. Routes (management mount, real express) ─────────────────── */

suite('5. Jarvis HTTP routes');
test('state/chat/approvals/monitor over express with staff auth', async () => {
  await setConfig({ dailyCallCap: 500 });
  const app = express();
  app.use(express.json());
  // Simulate the global JWT middleware: any request carries authUsername=admin.
  app.use((req: any, _res: any, next: any) => { req.authUsername = 'admin'; next(); });
  registerJarvis(app, { core, getStore, fetcher: mockFetcher, startAutomation: false });

  const server = app.listen(0);
  const port = (server.address() as any).port;
  const base = `http://127.0.0.1:${port}`;
  try {
    const state = await (await fetch(`${base}/api/management/jarvis/state`)).json();
    assert.equal(state.configured, true);
    assert.equal(state.config.apiKey, '********', 'masked key only');
    assert.ok(state.skills.length >= 20);
    assert.ok(state.freeModels.some((m: any) => m.id === 'llama-3.3-70b-versatile'));

    script = [{ tool_calls: [toolCall('c', 'away_status', {})] }, { content: 'وضعیت غیبت: خاموش.' }];
    const chat = await (await fetch(`${base}/api/management/jarvis/chat`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'وضعیت پاسخ غیبت؟', language: 'fa' }),
    })).json();
    assert.ok(chat.reply.includes('غیبت'));

    const approvals = await (await fetch(`${base}/api/management/jarvis/approvals?status=pending`)).json();
    assert.ok(Array.isArray(approvals.items));

    const monitor = await (await fetch(`${base}/api/management/jarvis/monitor`)).json();
    assert.ok(monitor.portal && typeof monitor.portal.dbLatencyMs === 'number');

    const briefs = await (await fetch(`${base}/api/management/jarvis/briefs`)).json();
    assert.ok(Array.isArray(briefs.items));
  } finally { server.close(); }
});
test('unauthenticated caller is rejected by the staff guard', async () => {
  const app = express();
  app.use(express.json());
  // No authUsername — the OpsCore guard must refuse.
  registerJarvis(app, { core, getStore, fetcher: mockFetcher, startAutomation: false });
  const server = app.listen(0);
  const port = (server.address() as any).port;
  try {
    const res = await fetch(`http://127.0.0.1:${port}/api/management/jarvis/state`);
    assert.equal(res.status, 401);
  } finally { server.close(); }
});

run({ title: 'Bazino — Jarvis admin assistant (mocked Groq)', jsonOut: 'tests/reports/jarvis.json' });
