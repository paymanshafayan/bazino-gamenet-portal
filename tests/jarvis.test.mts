/**
 * Jarvis admin-assistant suite — engine, skills, approvals, config, provider
 * chain and routes against a real SQLite store. ALL providers (Groq, OpenRouter,
 * OpenAI) are fully mocked (sandbox egress cannot reach them): the mocks return
 * scripted OpenAI-compatible responses with native tool_calls, exactly the
 * shape every provider in the chain produces.
 */
import assert from 'node:assert/strict';
import { suite, test, run } from './harness.mts';
import express from 'express';

const { SqliteStore } = await import('../server/dataProviders.ts');
const { OpsCore } = await import('../server/management/core.ts');
const jarvisConfig = await import('../server/jarvis/config.ts');
const { JarvisEngine } = await import('../server/jarvis/agent.ts');
const { createSkillRegistry, SENSITIVE_IDS, SUPPORT_SKILL_IDS, buildSkillRegistry } = await import('../server/jarvis/skills.ts');
const { createApproval, listApprovals, decideApproval } = await import('../server/jarvis/approvals.ts');
const { listIncidents } = await import('../server/jarvis/incidents.ts');
const { runJarvisJob } = await import('../server/jarvis/automation.ts');
const { registerJarvis } = await import('../server/jarvis/routes.ts');

const store = new SqliteStore();
store.config = { filePath: ':memory:' };
await store.connect();
await store.createDatabaseIfNotExist();
await store.seedMinimal({ username: 'admin', password: 'x', email: '', phone: '' });
const getStore = () => store;
const core = new OpsCore(getStore);

/* ── scripted provider mocks (groq → openrouter → openai chain) ──── */

type Scripted = Array<{ tool_calls?: any[]; content?: string; status?: number; body?: string }>;
let script: Scripted = [];    // groq queue
let orScript: Scripted = [];  // openrouter queue
let oaScript: Scripted = [];  // openai queue
let calls: any[] = [];        // groq calls
let orCalls: any[] = [];
let oaCalls: any[] = [];

const respondScripted = (q: Scripted) => {
  const next = q.shift() || { content: 'باشه.' };
  if (next.status) return new Response(next.body || '{}', { status: next.status, headers: { 'Content-Type': 'application/json' } });
  const message: any = next.content !== undefined ? { role: 'assistant', content: next.content } : { role: 'assistant', content: '', tool_calls: next.tool_calls };
  return new Response(JSON.stringify({ choices: [{ message }] }), { status: 200, headers: { 'Content-Type': 'application/json' } });
};

const modelsResponse = (ids: string[]) => new Response(JSON.stringify({ data: ids.map(id => ({ id })) }), { status: 200, headers: { 'Content-Type': 'application/json' } });

const mockFetcher = (async (url: string, init: any) => {
  const u = String(url);
  if (u.includes('openrouter.ai')) {
    if (u.endsWith('/models')) return new Response(JSON.stringify({ data: [
      { id: 'meta-llama/llama-3.3-70b-instruct:free', supported_parameters: ['tools', 'structured_outputs'] },
      { id: 'openai/gpt-oss-20b:free', supported_parameters: [] },
    ] }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    orCalls.push({ url: u, body: JSON.parse(init.body || '{}') });
    return respondScripted(orScript);
  }
  if (u.includes('api.openai.com')) {
    if (u.endsWith('/models')) return new Response(JSON.stringify({ data: [
      { id: 'gpt-4o-mini' }, { id: 'gpt-4.1-nano' }, { id: 'text-embedding-3-small' }, { id: 'whisper-1' }, { id: 'dall-e-3' },
    ] }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    oaCalls.push({ url: u, body: JSON.parse(init.body || '{}') });
    return respondScripted(oaScript);
  }
  if (u.endsWith('/models')) return modelsResponse(['llama-3.3-70b-versatile']);
  calls.push({ url: u, body: JSON.parse(init.body || '{}') });
  return respondScripted(script);
}) as unknown as typeof fetch;

const toolCall = (id: string, name: string, args: any) => ({
  id, type: 'function', function: { name, arguments: JSON.stringify(args) },
});

/** Groq rate-limited: main model 429 AND light-model retry 429. */
const groqDown = () => { script = [{ status: 429, body: '{"error":"rate"}' }, { status: 429, body: '{"error":"rate"}' }]; };

const clearScripts = () => { script = []; orScript = []; oaScript = []; calls = []; orCalls = []; oaCalls = []; };

async function bootEngine() {
  const registry = createSkillRegistry({ create: createApproval });
  const engine = new JarvisEngine(core, getStore, registry, mockFetcher);
  return { registry, engine };
}

async function setConfig(over: any = {}) {
  await store.setSetting(jarvisConfig.JARVIS_CONFIG_KEY, JSON.stringify({
    apiKey: 'gsk-test-key-1234567890', model: 'openai/gpt-oss-120b', lightModel: 'openai/gpt-oss-20b', dailyCallCap: 50,
    automation: { dailyBrief: false, weeklyDigest: false, igReplies: false, chatFaq: false, faqAutoSend: false },
    backup: {
      openrouter: { enabled: false, apiKey: '', model: 'meta-llama/llama-3.3-70b-instruct:free', dailyCallCap: 50 },
      openai: { enabled: false, apiKey: '', model: 'gpt-4o-mini', dailyCallCap: 200 },
    },
    ...over,
  }));
}

const orBackup = { enabled: true, apiKey: 'sk-or-test-1234567890', model: 'meta-llama/llama-3.3-70b-instruct:free', dailyCallCap: 50 };
const oaBackup = { enabled: true, apiKey: 'sk-oa-test-1234567890', model: 'gpt-4o-mini', dailyCallCap: 200 };

/* ── 1. Config ──────────────────────────────────────────────────── */

suite('1. Jarvis config (Groq + backups)');
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
test('groq tool-use model catalog matches the LIVE catalog (2026-09-11)', () => {
  assert.ok(jarvisConfig.FREE_GROQ_MODELS.some((m: any) => m.id === 'openai/gpt-oss-120b'), 'verified primary');
  assert.ok(jarvisConfig.FREE_GROQ_MODELS.some((m: any) => m.id === 'qwen/qwen3.6-27b'), 'verified qwen3.6');
  assert.ok(!jarvisConfig.FREE_GROQ_MODELS.some((m: any) => m.id.includes('compound')), 'compound has no local tool use');
  assert.ok(!jarvisConfig.FREE_GROQ_MODELS.some((m: any) => m.id === 'qwen/qwen3-32b'), 'qwen3-32b was REMOVED by Groq (live 404)');
  assert.ok(!jarvisConfig.FREE_GROQ_MODELS.some((m: any) => m.id.startsWith('llama-3')), 'llama-3.x models were removed by Groq (live 404)');
  assert.ok(jarvisConfig.DEFAULT_JARVIS_CONFIG.model === 'openai/gpt-oss-120b');
  assert.ok(jarvisConfig.DEFAULT_BACKUP_OPENROUTER.model === 'google/gemma-4-31b-it:free');
  assert.ok(jarvisConfig.OPENROUTER_TOOL_FALLBACKS.length + 1 <= 3, 'OpenRouter models array is hard-limited to 3 items');
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
test('portal_health support skill returns the live monitor snapshot', async () => {
  const registry = createSkillRegistry({ create: createApproval });
  const r = await registry.run({ core, store, actor: 't' }, 'portal_health', {});
  assert.equal(r.ok, true);
  assert.ok(r.summary!.includes('صف انتشار'));
  assert.ok(SUPPORT_SKILL_IDS.includes('portal_health'));
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
  clearScripts();
  await store.setSetting(jarvisConfig.JARVIS_CONFIG_KEY, JSON.stringify(jarvisConfig.sanitizeJarvisConfig({ apiKey: '' })));
  const { engine } = await bootEngine();
  const r = await engine.chat({ message: 'سلام', actor: 'admin' });
  assert.ok(r.reply.includes('تنظیم نشده'));
  assert.equal(calls.length + orCalls.length + oaCalls.length, 0);
});
test('tool round-trip: read skill → final answer; session persisted', async () => {
  clearScripts();
  await setConfig();
  const { engine } = await bootEngine();
  script = [
    { tool_calls: [toolCall('call-1', 'portal_stats', {})] },
    { content: 'امروز ۱ کاربر داریم.' },
  ];
  const r = await engine.chat({ message: 'آمار پورتال؟', actor: 'admin' });
  assert.equal(r.toolsUsed[0], 'portal_stats');
  assert.equal(r.reply, 'امروز ۱ کاربر داریم.');
  assert.equal(r.provider, 'groq');
  assert.equal(r.mode, 'primary');
  assert.ok(r.sessionId.startsWith('js-'));
  const session = await engine.session(r.sessionId);
  assert.ok((session!.messages || []).some((m: any) => m.role === 'user'));
  assert.equal((await core.list('jarvis-session')).length >= 1, true);
  assert.ok((await jarvisConfig.todayUsage(core)) >= 2, 'each LLM round must count against the daily cap');
});
test('sensitive request through chat lands in approvals, reply mentions confirmation', async () => {
  clearScripts();
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
  clearScripts();
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
  clearScripts();
  await setConfig({ dailyCallCap: 10 });
  const { engine } = await bootEngine();
  // Burn the whole daily budget directly (min clamp forbids caps below 10).
  for (let i = 0; i < 10; i++) await jarvisConfig.bumpUsage(core, 1);
  assert.equal(await jarvisConfig.todayUsage(core) >= 10, true);
  script = [{ content: 'should not happen' }];
  await assert.rejects(() => engine.chat({ message: 'سلام', actor: 'admin' }), (e: any) => e.code === 'JARVIS_DAILY_CAP');
});

/* ── 5. Routes (management mount, real express) ──────────────────── */

suite('5. Jarvis HTTP routes');
test('state/chat/approvals/monitor over express with staff auth', async () => {
  clearScripts();
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
    assert.ok(state.freeModels.some((m: any) => m.id === 'openai/gpt-oss-120b'));
    assert.ok(state.providers && state.providers.groq.configured === true, 'state must expose provider statuses');
    assert.ok(Array.isArray(state.incidents), 'state must expose the incident log');
    assert.ok(state.suggestedModels.openrouter.some((m: any) => m.id.endsWith(':free')));

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
test('provider failure → graceful 200 with a readable Persian reply (never a raw 5xx the edge proxy eats)', async () => {
  clearScripts();
  await setConfig({ dailyCallCap: 500 }); // no backup configured
  const app = express();
  app.use(express.json());
  app.use((req: any, _res: any, next: any) => { req.authUsername = 'admin'; next(); });
  registerJarvis(app, { core, getStore, fetcher: mockFetcher, startAutomation: false });
  const server = app.listen(0);
  const port = (server.address() as any).port;
  try {
    // Groq model_not_found (exactly the live failure of the removed qwen3-32b).
    script = [{ status: 404, body: '{"error":{"message":"The model `x` does not exist","code":"model_not_found"}}' }];
    const res = await fetch(`http://127.0.0.1:${port}/api/management/jarvis/chat`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'سلام' }),
    });
    assert.equal(res.status, 200, 'must be 200 — a 502 gets replaced by the proxy HTML page');
    const body: any = await res.json();
    assert.equal(body.providerError, 'JARVIS_PROVIDER_ERROR');
    assert.ok(String(body.reply).includes('مدل'), 'reply must point at the likely model problem');
    assert.ok(String(body.reply).includes('gpt-oss-120b'), 'reply must suggest a working model');
  } finally { server.close(); }
});

/* ── 6. Backup providers (support-only fallback chain) ──────────── */

suite('6. Backup providers — OpenRouter & OpenAI (support-only)');
test('backup config sanitize/mask/defaults; 402 maps to JARVIS_QUOTA_EXHAUSTED', async () => {
  const clean = jarvisConfig.sanitizeJarvisConfig({
    apiKey: 'k',
    backup: { openrouter: { enabled: true, apiKey: 'sk-or-1234567890', model: 'x:free', dailyCallCap: 999999 }, openai: { enabled: 'yes' } },
  });
  assert.equal(clean.backup.openrouter.enabled, true);
  assert.equal(clean.backup.openrouter.dailyCallCap, 100000);
  assert.equal(clean.backup.openai.enabled, false, 'enabled must be a strict boolean');
  assert.equal(clean.backup.openai.model, 'gpt-4o-mini', 'openai default model');
  const masked: any = jarvisConfig.maskedJarvisConfig(clean);
  assert.equal(masked.backup.openrouter.apiKey, '********');
  assert.equal(masked.backup.openai.apiKey, '');
  assert.equal(jarvisConfig.backupConfigured(clean, 'openrouter'), true);
  assert.equal(jarvisConfig.backupConfigured(clean, 'openai'), false, 'no key → not configured');
  assert.equal(jarvisConfig.anyBackupConfigured(clean), true);

  const f402 = (async () => new Response('{}', { status: 402 })) as unknown as typeof fetch;
  await assert.rejects(() => jarvisConfig.jarvisChatCompletion({ provider: 'openrouter', apiKey: 'k', model: 'm', messages: [{ role: 'user', content: 'x' }], fetcher: f402 }), (e: any) => e.code === 'JARVIS_QUOTA_EXHAUSTED');

  let hit = '';
  const fUrl = (async (url: string) => { hit = String(url); return new Response(JSON.stringify({ choices: [{ message: { content: 'ok' } }] }), { status: 200 }); }) as unknown as typeof fetch;
  await jarvisConfig.jarvisChatCompletion({ provider: 'openai', apiKey: 'k', model: 'm', messages: [{ role: 'user', content: 'x' }], fetcher: fUrl });
  assert.ok(hit.includes('api.openai.com/v1/chat/completions'));
  await jarvisConfig.jarvisChatCompletion({ provider: 'openrouter', apiKey: 'k', model: 'm', messages: [{ role: 'user', content: 'x' }], fetcher: fUrl });
  assert.ok(hit.includes('openrouter.ai/api/v1/chat/completions'));
});
test('fallback: Groq 429 (main+light) → OpenRouter answers support-only, admin is reported', async () => {
  clearScripts();
  await setConfig({ dailyCallCap: 500, backup: { openrouter: orBackup } });
  const { engine } = await bootEngine();
  groqDown();
  orScript = [{ tool_calls: [toolCall('f1', 'list_tickets', { status: 'open' })] }, { content: 'دو تیکت باز دارید.' }];
  const r = await engine.chat({ message: 'تیکت‌های باز را نشان بده', actor: 'admin' });
  assert.equal(r.provider, 'openrouter');
  assert.equal(r.mode, 'backup');
  assert.ok(r.reply.includes('دو تیکت باز دارید.'));
  assert.ok(r.reply.includes('حالت پشتیبان'), 'reply must report backup mode to the admin');
  assert.equal(calls.length, 2, 'groq tried main + light model');
  assert.equal(orCalls.length, 2, 'openrouter served both rounds');
  // Backups only ever see SUPPORT tools.
  for (const c of orCalls) {
    const names: string[] = (c.body.tools || []).map((t: any) => t.function.name);
    assert.ok(names.length > 0, 'support tool list must not be empty');
    for (const n of names) assert.ok((SUPPORT_SKILL_IDS as string[]).includes(n), `non-support tool leaked to backup: ${n}`);
    assert.ok(!names.includes('create_coupon'));
    assert.ok(!names.includes('adjust_credits'));
  }
  // Support-mode system note injected.
  assert.ok(orCalls[0].body.messages.some((m: any) => m.role === 'system' && String(m.content).includes('BACKUP MODE')));
  // Incidents reported to the admin.
  const incidents = await listIncidents(core);
  assert.ok(incidents.some((i: any) => i.type === 'GROQ_UNAVAILABLE' && i.provider === 'groq'));
  assert.ok(incidents.some((i: any) => i.type === 'BACKUP_ACTIVE' && i.provider === 'openrouter'));
  // Per-provider budgets.
  assert.ok((await jarvisConfig.todayUsage(core, 'groq')) >= 1, 'failed groq attempts still cost budget');
  assert.equal(await jarvisConfig.todayUsage(core, 'openrouter'), 2);
});
test('non-support tool attempt on a backup is refused and reported (no approval, no change)', async () => {
  clearScripts();
  await setConfig({ dailyCallCap: 500, backup: { openrouter: orBackup } });
  const { engine } = await bootEngine();
  const before = Number((await store.getUserByUsername('admin'))!.credits || 0);
  const pendingBefore = (await listApprovals(core, 'pending')).length;
  groqDown();
  orScript = [
    { tool_calls: [toolCall('b1', 'adjust_credits', { username: 'admin', delta: 50 })] },
    { content: 'در حالت پشتیبان امکان شارژ کردیت نیست.' },
  ];
  const r = await engine.chat({ message: 'برای admin پنجاه کردیت شارژ کن', actor: 'admin' });
  assert.equal(r.mode, 'backup');
  assert.equal(r.approvalsCreated.length, 0, 'non-support sensitive skill must not even file an approval on backup');
  assert.equal((await listApprovals(core, 'pending')).length, pendingBefore);
  assert.equal(Number((await store.getUserByUsername('admin'))!.credits || 0), before, 'credits untouched');
  const incidents = await listIncidents(core);
  assert.ok(incidents.some((i: any) => i.type === 'SUPPORT_ONLY_BLOCKED' && i.provider === 'openrouter' && i.meta?.skill === 'adjust_credits'));
});
test('second-level fallback: OpenRouter fails → OpenAI serves', async () => {
  clearScripts();
  await setConfig({ dailyCallCap: 500, backup: { openrouter: orBackup, openai: oaBackup } });
  const { engine } = await bootEngine();
  groqDown();
  orScript = [{ status: 401, body: '{"error":"bad key"}' }];
  oaScript = [{ content: 'پاسخ از OpenAI رسید.' }];
  const r = await engine.chat({ message: 'پیام‌های خوانده‌نشده؟', actor: 'admin' });
  assert.equal(r.provider, 'openai');
  assert.equal(r.mode, 'backup');
  assert.ok(r.reply.includes('پاسخ از OpenAI رسید.'));
  const incidents = await listIncidents(core);
  assert.ok(incidents.some((i: any) => i.type === 'BACKUP_FAILED' && i.provider === 'openrouter'));
  assert.ok(incidents.some((i: any) => i.type === 'BACKUP_ACTIVE' && i.provider === 'openai'));
  assert.equal(await jarvisConfig.todayUsage(core, 'openai'), 1);
});
test('no backup configured → the original Groq error surfaces', async () => {
  clearScripts();
  await setConfig({ dailyCallCap: 500 });
  const { engine } = await bootEngine();
  groqDown();
  await assert.rejects(() => engine.chat({ message: 'سلام', actor: 'admin' }), (e: any) => e.code === 'JARVIS_RATE_LIMITED');
});
test('marketing job PAUSES when Groq is down (never runs on a backup); support job uses the backup', async () => {
  clearScripts();
  await setConfig({ dailyCallCap: 500, backup: { openrouter: orBackup }, automation: { dailyBrief: true, weeklyDigest: false, igReplies: false, chatFaq: false, faqAutoSend: false } });
  const { engine, registry } = await bootEngine();

  groqDown();
  orScript = []; oaScript = [];
  await assert.rejects(() => runJarvisJob(engine, registry, 'dailyBrief'), (e: any) => e.code === 'JARVIS_PRIMARY_UNAVAILABLE');
  assert.equal(orCalls.length, 0, 'marketing jobs must never touch a backup');
  assert.ok((await listIncidents(core)).some((i: any) => i.type === 'SUPPORT_ONLY_BLOCKED' && i.provider === 'groq'));

  // Support job (igReplies) — an unanswered inbound DM goes through OpenRouter.
  const { fingerprint } = await import('../server/management/core.ts');
  const inboxId = fingerprint({ conversation: 'c-backup-1', message: 'mb1', author: 'ab1', text: 'ساعت کاری؟', ts: 'tb1' });
  await core.save('ig-inbox', inboxId, { accountId: 'acc-1', conversationId: 'c-backup-1', authorId: 'ab1', username: 'backupuser', text: 'ساعت کاری؟', language: 'fa', receivedAt: new Date().toISOString(), messageId: 'mb1', replied: false, reason: '' }, 0);
  groqDown();
  orScript = [{ content: '{"reply":"سلام! هر روز ۱۰ تا ۲۴."}' }];
  const res = await runJarvisJob(engine, registry, 'igReplies');
  assert.ok(String(res).includes('1'), `expected one filed DM draft, got: ${res}`);
  const pending = await listApprovals(core, 'pending');
  assert.ok(pending.some((p: any) => p.skillId === 'send_ig_reply' && p.requestedBy === 'jarvis:igReplies'));
  assert.ok(orCalls.length >= 1, 'support job must run on the backup');
});
test('provider body shaping: openai max_completion_tokens (new models) / no temperature (o-series); openrouter tools routing array', async () => {
  const seen: any[] = [];
  const f = (async (_url: string, init: any) => {
    seen.push(JSON.parse(init.body || '{}'));
    return new Response(JSON.stringify({ choices: [{ message: { content: 'ok' } }] }), { status: 200 });
  }) as unknown as typeof fetch;
  await jarvisConfig.jarvisChatCompletion({ provider: 'openai', apiKey: 'k', model: 'gpt-4.1-mini', messages: [{ role: 'user', content: 'x' }], fetcher: f });
  await jarvisConfig.jarvisChatCompletion({ provider: 'openai', apiKey: 'k', model: 'gpt-5-mini', messages: [{ role: 'user', content: 'x' }], fetcher: f });
  await jarvisConfig.jarvisChatCompletion({ provider: 'openai', apiKey: 'k', model: 'o4-mini', messages: [{ role: 'user', content: 'x' }], fetcher: f });
  await jarvisConfig.jarvisChatCompletion({ provider: 'openai', apiKey: 'k', model: 'gpt-4o-mini', messages: [{ role: 'user', content: 'x' }], fetcher: f });
  await jarvisConfig.jarvisChatCompletion({
    provider: 'openrouter', apiKey: 'k', model: 'google/gemma-4-31b-it:free',
    messages: [{ role: 'user', content: 'x' }], tools: [{ type: 'function', function: { name: 't', parameters: { type: 'object', properties: {} } } }], fetcher: f,
  });
  const [g41, g5, o4, g4o, or] = seen;
  assert.equal(g41.max_completion_tokens, 3000, 'gpt-4.1 must use max_completion_tokens');
  assert.ok(!('max_tokens' in g41));
  assert.equal(g5.max_completion_tokens, 3000, 'gpt-5 must use max_completion_tokens');
  assert.ok(!('max_tokens' in g5));
  assert.ok(!('temperature' in o4), 'o-series must not send temperature');
  assert.ok(!('max_tokens' in o4));
  assert.equal(g4o.max_tokens, 3000, 'gpt-4o keeps classic max_tokens');
  assert.ok(!('max_completion_tokens' in g4o));
  assert.equal(or.models[0], 'google/gemma-4-31b-it:free', 'admin model stays first in the routing array');
  assert.ok(or.models.length >= 2 && or.models.length <= 3, 'openrouter routing array: 2-3 items (hard limit 3)');
  // The 404 no-tool-support error must carry a Persian, actionable message.
  const f404 = (async () => new Response('{"error":"No endpoints found that support tool use"}', { status: 404 })) as unknown as typeof fetch;
  await assert.rejects(() => jarvisConfig.jarvisChatCompletion({ provider: 'openrouter', apiKey: 'k', model: 'x:free', messages: [{ role: 'user', content: 'x' }], tools: [{ type: 'function', function: { name: 't', parameters: {} } }], fetcher: f404 }),
    (e: any) => /فراخوانی ابزار ندارد/.test(e.message));
});
test('routes: backup config save masks keys, keeps old ones; models endpoint per provider', async () => {
  clearScripts();
  await setConfig({ dailyCallCap: 500, backup: { openrouter: orBackup, openai: oaBackup } });
  const app = express();
  app.use(express.json());
  app.use((req: any, _res: any, next: any) => { req.authUsername = 'admin'; next(); });
  registerJarvis(app, { core, getStore, fetcher: mockFetcher, startAutomation: false });
  const server = app.listen(0);
  const port = (server.address() as any).port;
  const base = `http://127.0.0.1:${port}`;
  try {
    // Save: new openrouter key, masked placeholder keeps the stored openai key.
    const saved = await (await fetch(`${base}/api/management/jarvis/config`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        apiKey: '********',
        backup: {
          openrouter: { enabled: true, apiKey: 'sk-or-brand-new-9999', model: 'deepseek/deepseek-chat-v3-0324:free', dailyCallCap: 60 },
          openai: { enabled: true, apiKey: '********', model: 'gpt-4.1-nano', dailyCallCap: 100 },
        },
      }),
    })).json();
    assert.equal(saved.backup.openrouter.apiKey, '********', 'masked after save');
    assert.equal(saved.backup.openai.apiKey, '********', 'masked after save');
    assert.equal(saved.backup.openrouter.model, 'deepseek/deepseek-chat-v3-0324:free');

    // Persisted state: keys functional (configured), openai key was kept.
    const state = await (await fetch(`${base}/api/management/jarvis/state`)).json();
    assert.equal(state.providers.openrouter.configured, true);
    assert.equal(state.providers.openai.configured, true, 'masked placeholder must keep the previously stored key');
    assert.equal(state.providers.openrouter.cap, 60);
    assert.equal(state.config.backup.openai.model, 'gpt-4.1-nano');

    // Models endpoint per provider (openrouter list is public, works keyless).
    const orModels = await (await fetch(`${base}/api/management/jarvis/models`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ provider: 'openrouter' }),
    })).json();
    assert.equal(orModels.provider, 'openrouter');
    assert.ok(orModels.models.includes('meta-llama/llama-3.3-70b-instruct:free'));
    assert.ok(orModels.free.every((m: string) => m.endsWith(':free')));
    assert.deepEqual(orModels.toolModels, ['meta-llama/llama-3.3-70b-instruct:free'], 'toolModels filters on supported_parameters');

    const oaModels = await (await fetch(`${base}/api/management/jarvis/models`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ provider: 'openai' }),
    })).json();
    assert.ok(oaModels.models.includes('gpt-4o-mini'));
    assert.ok(!oaModels.models.some((m: string) => /whisper|dall-e|text-embedding/.test(m)), 'non-chat OpenAI models filtered out');

    // Incidents endpoint (staff).
    const incidents = await (await fetch(`${base}/api/management/jarvis/incidents`)).json();
    assert.ok(Array.isArray(incidents.items));
  } finally { server.close(); }
});

run({ title: 'Bazino — Jarvis admin assistant (mocked Groq/OpenRouter/OpenAI chain)', jsonOut: 'tests/reports/jarvis.json' });
