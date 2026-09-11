/**
 * Jarvis automation — scheduled jobs (no user prompt):
 *   dailyBrief   09:00 Cyprus  — yesterday's summary + 3 content ideas (filed
 *                                as draft approvals, never auto-published)
 *   weeklyDigest Monday 10:00  — Instagram/Telegram publishing performance
 *   igReplies    every 10 min  — draft DM replies for unanswered ig-inbox rows
 *                                (approval queue; the away message stays separate)
 *   chatFaq      every 10 min  — draft ticket answers; auto-send only for
 *                                high-confidence FAQs when the admin enabled it
 * Every LLM call passes the shared daily cap; failures never crash the timer.
 */
import { OpsCore, nowISO } from '../management/core';
import { getJarvisConfig, providerConfigured, todayUsage, groqChatCompletion, cyprusNowKey } from './config';
import type { JarvisEngine } from './agent';
import type { SkillRegistry } from './skills';
import { createApproval } from './approvals';
import { DurableQueue } from '../publishing/queue';

const CRON_ID = 'jarvis-cron';
const IG_BATCH = 5;
const FAQ_BATCH = 5;

interface CronState {
  lastDailyKey: string; lastWeeklyKey: string;
  igProposed: string[]; faqProposed: string[];
  igCount: { dateKey: string; count: number };
  faqCount: { dateKey: string; count: number };
  lastErrors: string[]; lastRun: string;
}

const emptyState = (): CronState => ({
  lastDailyKey: '', lastWeeklyKey: '', igProposed: [], faqProposed: [],
  igCount: { dateKey: '', count: 0 }, faqCount: { dateKey: '', count: 0 }, lastErrors: [], lastRun: '',
});

async function loadState(core: OpsCore): Promise<{ state: CronState; version: number }> {
  const row = await core.read<CronState>('jarvis-cron', CRON_ID);
  return { state: { ...emptyState(), ...(row?.data || {}) }, version: row?.version || 0 };
}

async function saveState(core: OpsCore, state: CronState, version: number) {
  state.igProposed = state.igProposed.slice(-300);
  state.faqProposed = state.faqProposed.slice(-300);
  state.lastErrors = state.lastErrors.slice(-5);
  await core.save('jarvis-cron', CRON_ID, state, version);
}

function cyprusHour(): number {
  try {
    return Number(new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Nicosia', hour: 'numeric', hour12: false }).format(new Date())) % 24;
  } catch { return new Date().getUTCHours() + 3; }
}

function cyprusWeekday(): number {
  try {
    return new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Nicosia', weekday: 'short' }).format(new Date()) === 'Mon' ? 1 : 0;
  } catch { return 0; }
}

async function llm(engine: JarvisEngine, prompt: string, system: string, maxTokens = 1800): Promise<string> {
  const cfg = await getJarvisConfig(engine.getStore());
  if (!providerConfigured(cfg)) throw Object.assign(new Error('JARVIS_NOT_CONFIGURED'), { code: 'JARVIS_NOT_CONFIGURED' });
  if (await todayUsage(engine.core) >= cfg.dailyCallCap) throw Object.assign(new Error('JARVIS_DAILY_CAP'), { code: 'JARVIS_DAILY_CAP' });
  const data: any = await groqChatCompletion({
    apiKey: cfg.apiKey, model: cfg.lightModel || cfg.model, temperature: 0.4, maxTokens, fetcher: (engine as any).fetcher,
    messages: [{ role: 'system', content: system }, { role: 'user', content: prompt }],
  });
  return String(data?.choices?.[0]?.message?.content || '');
}

/* ── Jobs ─────────────────────────────────────────────────────────── */

async function gatherStats(engine: JarvisEngine): Promise<string> {
  const store = engine.getStore();
  const [users, systems, tickets, cafe, tournaments, transactions] = await Promise.all([
    store.listUsers(), store.listSystems(), store.listTickets().catch(() => []), store.listCafeItems(), store.listTournaments(), store.listTransactions().catch(() => []),
  ]);
  const ig = (await engine.core.list('ig-inbox')).map((r: any) => r.data);
  const rep: any = await new DurableQueue(engine.core).report().catch(() => null);
  return [
    `کاربران: ${users.length} · سیستم‌ها: ${systems.length} (آزاد ${systems.filter((s: any) => !s.isReserved).length})`,
    `تیکت‌ها: ${(tickets || []).length} (باز ${(tickets || []).filter((t: any) => t.status === 'open').length})`,
    `آیتم کافه: ${cafe.length} · تورنمنت: ${tournaments.length} · تراکنش‌ها: ${(transactions || []).length}`,
    `دایرکت اینستاگرام ثبت‌شده: ${ig.length} (بی‌پاسخ ${ig.filter((i: any) => !i.replied).length})`,
    rep ? `صف انتشار: دریافت ${rep.counts.received} · ارسال ${rep.counts.sent} · در صف ${rep.counts.queued}` : 'صف انتشار: در دسترس نیست',
  ].join('\n');
}

const MARKETING_SYSTEM = 'تو دستیار بازاریابی بازینو پرو (گیم‌نت و کلوپ گیمینگ در قبرس، سایت bazino.pro) هستی. فقط فارسی، دقیق و کاربردی بنویس. هرگز آماد جعل نکن؛ فقط از دادهٔ داده‌شده استفاده کن.';
const MARKETING_SYSTEM_EN = 'You are the marketing assistant of BAZINO Pro gaming lounge (Cyprus, bazino.pro). Persian only, precise, practical. Never invent data; use only the provided numbers.';

async function runDailyBrief(engine: JarvisEngine, registry: SkillRegistry): Promise<string> {
  const dateKey = cyprusNowKey();
  const stats = await gatherStats(engine);
  const raw = await llm(engine, `داده‌های دیروز/امروز پورتال:\n${stats}\n\nیک بریف روزانهٔ بازاریابی بنویس: ۱) خلاصهٔ وضعیت (۳-۴ خط) ۲) سه ایدهٔ محتوا برای امروز (هرکدام عنوان + کپشن اینستاگرام + یک پاراگراف پیش‌نویس بلاگ) ۳) دو نکتهٔ کوتاه SEO/GEO. پاسخ را فقط به صورت JSON بده: {"summary":"...","ideas":[{"title":"","caption":"","blog":""}],"seo":["",""]}`, MARKETING_SYSTEM);
  let parsed: any = null;
  try { parsed = JSON.parse(String(raw).replace(/```json|```/g, '')); } catch { parsed = null; }
  const brief = {
    id: `jb-${dateKey}`, type: 'daily', dateKey, createdAt: nowISO(),
    summary: parsed?.summary || String(raw).slice(0, 2500),
    ideas: Array.isArray(parsed?.ideas) ? parsed.ideas.slice(0, 3) : [],
    seo: Array.isArray(parsed?.seo) ? parsed.seo.slice(0, 3) : [],
  };
  await engine.core.save('jarvis-brief', brief.id, brief, 0);
  // File draft proposals for the ideas — admin approves each in the Jarvis tab.
  const pending = (await engine.core.list('jarvis-approval')).filter((r: any) => r.data.status === 'pending').length;
  let filed = 0;
  for (const idea of brief.ideas) {
    if (pending + filed >= 20) break;
    if (!idea?.title || !idea?.blog) continue;
    await createApproval(engine.core, {
      skillId: 'create_content_draft', title: `پیش‌نویس بلاگ: ${String(idea.title).slice(0, 60)}`,
      params: { title: String(idea.title).slice(0, 200), body: String(idea.blog).slice(0, 4000), language: 'fa', category: 'Instagram', idempotencyKey: `jarvis-brief-${dateKey}-${filed}` },
      risk: 'write', requestedBy: 'jarvis:dailyBrief', note: 'از بریف روزانه',
    });
    filed++;
  }
  return `بریف ${dateKey} ساخته شد (${brief.ideas.length} ایده، ${filed} پیشنهاد پیش‌نویس).`;
}

async function runWeeklyDigest(engine: JarvisEngine): Promise<string> {
  const dateKey = cyprusNowKey();
  const weekKey = dateKey.slice(0, 7) + '-w' + Math.ceil(new Date().getUTCDate() / 7);
  const stats = await gatherStats(engine);
  const ig = (await engine.core.list('ig-inbox')).map((r: any) => r.data);
  const byLang: any = {};
  for (const row of ig) byLang[row.language] = (byLang[row.language] || 0) + 1;
  const raw = await llm(engine, `داده‌های هفته:\n${stats}\nزبان پیام‌های دریافتی اینستاگرام: ${JSON.stringify(byLang)}\n\nیک دایجست هفتگی بنویس: ۱) عملکرد انتشار و پیام‌ها ۲) سه راهکار مشخص برای ارتقاء بازخورد پست‌ها. JSON: {"summary":"","recommendations":["","",""]}`, MARKETING_SYSTEM);
  let parsed: any = null;
  try { parsed = JSON.parse(String(raw).replace(/```json|```/g, '')); } catch { parsed = null; }
  const brief = {
    id: `jbw-${weekKey}`, type: 'weekly', weekKey, dateKey, createdAt: nowISO(),
    summary: parsed?.summary || String(raw).slice(0, 2500),
    recommendations: Array.isArray(parsed?.recommendations) ? parsed.recommendations.slice(0, 5) : [],
  };
  await engine.core.save('jarvis-brief', brief.id, brief, 0);
  return `دایجست هفتگی ${weekKey} ساخته شد.`;
}

async function runIgReplies(engine: JarvisEngine): Promise<string> {
  const state = await loadState(engine.core);
  const dateKey = cyprusNowKey();
  if (state.state.igCount.dateKey !== dateKey) state.state.igCount = { dateKey, count: 0 };
  const budget = IG_BATCH - state.state.igCount.count;
  if (budget <= 0) return 'سقف روزانهٔ پیشنهاد دایرکت پر است.';
  const rows = (await engine.core.list('ig-inbox'))
    .map((r: any) => ({ id: r.id, version: r.version, ...r.data }))
    .filter((r: any) => !r.replied && r.text && !state.state.igProposed.includes(r.id))
    .filter((r: any) => Date.now() - Date.parse(String(r.receivedAt)) < 48 * 3600000)
    .sort((a: any, b: any) => String(a.receivedAt).localeCompare(String(b.receivedAt)))
    .slice(0, budget);
  if (!rows.length) return 'پیام بی‌پاسخ جدیدی نیست.';
  const store = engine.getStore();
  const [systems, cafe, tournaments] = await Promise.all([store.listSystems(), store.listCafeItems(), store.listTournaments()]);
  const knowledge = `بازینو پرو — گیم‌نت و کلوپ گیمینگ. سیستم‌ها: ${systems.length} (${systems.filter((s: any) => !s.isReserved).length} آزاد). نمونهٔ منو: ${cafe.slice(0, 6).map((c: any) => `${c.name} ${c.price}₺`).join('، ')}. تورنمنت‌ها: ${tournaments.slice(0, 3).map((t: any) => t.title || t.name).join('، ')}. رزرو و شرایط فقط در bazino.pro.`;
  let filed = 0;
  for (const row of rows) {
    try {
      const langName: any = { fa: 'فارسی', en: 'English', tr: 'Türkçe', ru: 'Русский' }[row.language] || 'English';
      const raw = await llm(engine, `پیام کاربر اینستاگرام (زبان ${langName}): «${String(row.text).slice(0, 500)}»\nدانش پورتال: ${knowledge}\nیک پاسخ کوتاه، مؤدبانه و دقیق به همین زبان بنویس. اگر پاسخ قطعی در دانش نیست، بگو مدیریت صبح پاسخ می‌دهد. JSON: {"reply":""}`, MARKETING_SYSTEM_EN, 700);
      let parsed: any = null;
      try { parsed = JSON.parse(String(raw).replace(/```json|```/g, '')); } catch { parsed = null; }
      const text = String(parsed?.reply || '').slice(0, 800).trim();
      if (text) {
        await createApproval(engine.core, {
          skillId: 'send_ig_reply', title: `پاسخ دایرکت به @${row.username || row.authorId} (${row.language})`,
          params: { conversationId: row.conversationId, authorId: row.authorId, accountId: row.accountId, text, username: row.username },
          risk: 'sensitive', requestedBy: 'jarvis:igReplies', note: `پیام: «${String(row.text).slice(0, 120)}»`,
        });
        state.state.igCount.count++; filed++;
      }
    } catch (e: any) { state.state.lastErrors.unshift(`ig:${e?.code || e?.message}`); }
    state.state.igProposed.push(row.id);
  }
  state.state.lastRun = nowISO();
  await saveState(engine.core, state.state, state.version);
  return `${filed} پیشنهاد پاسخ دایرکت ثبت شد.`;
}

async function runChatFaq(engine: JarvisEngine, registry: SkillRegistry): Promise<string> {
  const state = await loadState(engine.core);
  const dateKey = cyprusNowKey();
  if (state.state.faqCount.dateKey !== dateKey) state.state.faqCount = { dateKey, count: 0 };
  const budget = FAQ_BATCH - state.state.faqCount.count;
  if (budget <= 0) return 'سقف روزانهٔ پاسخ تیکت پر است.';
  const cfg = await getJarvisConfig(engine.getStore());
  const tickets = (await engine.getStore().listTickets('open').catch(() => []))
    .filter((t: any) => !state.state.faqProposed.includes(t.id))
    .filter((t: any) => !t.lastStaffReplyAt || Date.now() - Date.parse(t.lastStaffReplyAt) > 2 * 3600000)
    .slice(0, budget);
  if (!tickets.length) { await saveState(engine.core, state.state, state.version); return 'تیکت باز جدیدی نیست.'; }
  const store = engine.getStore();
  const [systems, cafe, tournaments] = await Promise.all([store.listSystems(), store.listCafeItems(), store.listTournaments()]);
  const knowledge = `سیستم‌ها: ${systems.length}. منو: ${cafe.slice(0, 8).map((c: any) => `${c.name} ${c.price}₺`).join('، ')}. تورنمنت‌ها: ${tournaments.slice(0, 3).map((t: any) => t.title || t.name).join('، ')}. رزرو: bazino.pro`;
  let sent = 0, filed = 0;
  for (const t of tickets) {
    try {
      const msgs = await store.listTicketMessages(t.id).catch(() => []);
      const thread = msgs.map((m: any) => `${m.isStaff ? 'پشتیبانی' : m.author}: ${m.body}`).join('\n').slice(0, 1500);
      const raw = await llm(engine, `تیکت «${t.subject}» از ${t.username}:\n${thread || '(بدون پیام)'}\nدانش پورتال: ${knowledge}\nپاسخ فارسی کوتاه بنویس. اگر و ا только اگر پاسخ از دانش پورتال کاملاً مشخص است (ساعات/قیمت/رزرو) auto=true. JSON: {"auto":true|false,"reply":""}`, MARKETING_SYSTEM, 800);
      let parsed: any = null;
      try { parsed = JSON.parse(String(raw).replace(/```json|```/g, '')); } catch { parsed = null; }
      const reply = String(parsed?.reply || '').slice(0, 1500).trim();
      if (!reply) { state.state.faqProposed.push(t.id); continue; }
      if (parsed?.auto === true && cfg.automation.faqAutoSend) {
        const res = await registry.runDirect({ core: engine.core, store, actor: 'jarvis:faq' }, 'answer_ticket', { ticketId: t.id, body: reply });
        if (res.ok) { sent++; state.state.faqCount.count++; }
      } else {
        await createApproval(engine.core, {
          skillId: 'answer_ticket', title: `پاسخ تیکت: ${String(t.subject).slice(0, 60)}`,
          params: { ticketId: t.id, body: reply }, risk: 'sensitive', requestedBy: 'jarvis:chatFaq',
          note: `کاربر: ${t.username}`,
        });
        filed++; state.state.faqCount.count++;
      }
    } catch (e: any) { state.state.lastErrors.unshift(`faq:${e?.code || e?.message}`); }
    state.state.faqProposed.push(t.id);
  }
  state.state.lastRun = nowISO();
  await saveState(engine.core, state.state, state.version);
  return `${sent} پاسخ خودکار ارسال، ${filed} در صف تأیید.`;
}

/* ── Scheduler ────────────────────────────────────────────────────── */

export async function runJarvisJob(engine: JarvisEngine, registry: SkillRegistry, job: string): Promise<string> {
  if (job === 'dailyBrief') return runDailyBrief(engine, registry);
  if (job === 'weeklyDigest') return runWeeklyDigest(engine);
  if (job === 'igReplies') return runIgReplies(engine);
  if (job === 'chatFaq') return runChatFaq(engine, registry);
  throw Object.assign(new Error('UNKNOWN_JOB'), { statusCode: 404, code: 'UNKNOWN_JOB' });
}

export function startJarvisAutomation(engine: JarvisEngine, registry: SkillRegistry) {
  let busy = false;
  const timer = setInterval(async () => {
    if (busy) return;
    busy = true;
    try {
      const cfg = await getJarvisConfig(engine.getStore());
      if (!providerConfigured(cfg)) return;
      const hour = cyprusHour();
      const dateKey = cyprusNowKey();
      const { state } = await loadState(engine.core);
      if (cfg.automation.dailyBrief && hour >= 9 && state.lastDailyKey !== dateKey) {
        const msg = await runDailyBrief(engine, registry).catch(e => `خطا: ${e?.code || e?.message}`);
        const s = await loadState(engine.core);
        s.state.lastDailyKey = dateKey;
        if (msg.startsWith('خطا')) s.state.lastErrors.unshift(`dailyBrief:${msg}`);
        await saveState(engine.core, s.state, s.version);
      }
      if (cfg.automation.weeklyDigest && cyprusWeekday() === 1 && hour >= 10 && state.lastWeeklyKey !== dateKey) {
        const msg = await runWeeklyDigest(engine).catch(e => `خطا: ${e?.code || e?.message}`);
        const s = await loadState(engine.core);
        s.state.lastWeeklyKey = dateKey;
        if (msg.startsWith('خطا')) s.state.lastErrors.unshift(`weeklyDigest:${msg}`);
        await saveState(engine.core, s.state, s.version);
      }
      if (cfg.automation.igReplies) await runIgReplies(engine).catch(() => {});
      if (cfg.automation.chatFaq) await runChatFaq(engine, registry).catch(() => {});
    } catch { /* never crash the timer */ }
    finally { busy = false; }
  }, 60_000);
  timer.unref();
  return timer;
}
