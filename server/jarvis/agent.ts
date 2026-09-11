/**
 * Jarvis agent loop — native tool-calling over the skill registry, served by
 * the provider chain (Groq primary → OpenRouter/OpenAI support-only backups).
 *
 * Loop: system prompt (persona + rules + skill list + live portal context)
 * → chain chat completion with tools → execute read/write skills, route
 * sensitive ones to the approval queue → feed results back → final reply.
 * Max 6 tool rounds per turn; every LLM attempt counts against its provider's
 * daily cap. When a backup serves the turn, only SUPPORT skills are offered
 * and any other attempt is refused + reported to the admin (incident log).
 */
import { OpsCore, nowISO } from '../management/core';
import { randomUUID } from 'node:crypto';
import {
  getJarvisConfig, providerConfigured, anyBackupConfigured, todayUsage,
  JARVIS_PROVIDERS, type GroqMessage, type JarvisProviderId,
} from './config';
import { runJarvisChain, type ChainBreaker } from './chain';
import { isSupportSkill, SUPPORT_SKILL_IDS, type SkillRegistry } from './skills';
import { recordIncident } from './incidents';

export interface JarvisChatResult {
  sessionId: string;
  reply: string;
  approvalsCreated: string[];
  toolsUsed: string[];
  provider?: JarvisProviderId;
  /** primary = Groq served the turn; backup = support-only fallback. */
  mode?: 'primary' | 'backup';
  usageToday: number;
}

const MAX_TOOL_ROUNDS = 6;
const MAX_SESSION_MESSAGES = 40;

export class JarvisEngine {
  /** Shared circuit-breaker state for the provider chain (chat + automation). */
  public chainState: ChainBreaker = { skipUntil: 0, code: '' };

  constructor(
    public core: OpsCore,
    public getStore: () => any,
    public registry: SkillRegistry,
    public fetcher?: typeof fetch,
  ) {}

  async config() { return getJarvisConfig(this.getStore()); }

  async sessions(limit = 20) {
    return (await this.core.list<any>('jarvis-session'))
      .map(r => ({ id: r.id, ...r.data, messages: undefined, messageCount: (r.data.messages || []).length }))
      .sort((a: any, b: any) => String(b.updatedAt).localeCompare(String(a.updatedAt)))
      .slice(0, Math.min(Math.max(limit, 1), 50));
  }

  async session(id: string) {
    const row = await this.core.read<any>('jarvis-session', id);
    if (!row) return null;
    return { id: row.id, ...row.data };
  }

  private async portalContext(): Promise<string> {
    try {
      const store = this.getStore();
      const [users, systems, tickets, msgs] = await Promise.all([
        store.listUsers(), store.listSystems(), store.listTickets('open').catch(() => []), store.listUserMessages().catch(() => []),
      ]);
      const hour = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Nicosia', hour: 'numeric', minute: '2-digit', hour12: false }).format(new Date());
      return `زمان محلی قبرس: ${hour} · کاربران: ${users.length} · سیستم‌ها: ${systems.length} (آزاد: ${systems.filter((s: any) => !s.isReserved).length}) · تیکت باز: ${(tickets || []).length} · پیام خوانده‌نشده: ${(msgs || []).filter((m: any) => !m.isRead).length}`;
    } catch { return 'زمینهٔ پورتال در دسترس نیست'; }
  }

  private systemPrompt(language: string, context: string): string {
    const langName = language === 'en' ? 'English' : language === 'ru' ? 'Russian' : language === 'tr' ? 'Turkish' : 'Persian (فارسی)';
    const catalog = this.registry.catalog()
      .map(s => `- ${s.id} [${s.risk}] ${s.title}: ${s.description}`)
      .join('\n');
    return `You are Jarvis (جارویس), the admin assistant of the BAZINO gaming-lounge portal (bazino.pro).
You serve the portal ADMIN. Answer in ${langName}.
Rules:
1. For any fact about the portal (numbers, users, prices, queues, tickets) use the tools — never invent data.
2. Sensitive actions are automatically queued for admin approval — tell the admin that confirmation is needed and continue helping.
3. Never claim an action succeeded unless a tool result says so.
4. Be concise and practical; use plain numbers from tool results.
5. You have NO access to API keys, tokens, secrets, staff/permission management, database resets or payment settings. If asked, refuse and explain these are excluded by design.
Current context: ${context}

Available skills:
${catalog}`;
  }

  /** Extra system note injected on BACKUP calls — support-only mode. */
  private supportNote(language: string): string {
    const langName = language === 'en' ? 'English' : language === 'ru' ? 'Russian' : language === 'tr' ? 'Turkish' : 'Persian (فارسی)';
    const supportList = this.registry.catalog('support').map(s => `- ${s.id} [${s.risk}] ${s.title}`).join('\n');
    return `BACKUP MODE — the primary engine (Groq) is temporarily unavailable and you are a SUPPORT-ONLY backup. Answer in ${langName}.
Ignore the full skill list above; ONLY these support skills are available to you:
${supportList}
Rules for backup mode:
1. You may help with support matters ONLY: answering tickets, user/Instagram messages, and monitoring the portal's correct operation.
2. If the admin asks for anything else (marketing briefs, content, credits, cafe, coupons, publishing, statistics beyond support), politely refuse: say the primary engine is temporarily limited, the request has been reported to the admin, and non-support features resume when the primary engine is back.
3. Never attempt tools that are not in the support list above.`;
  }

  async chat(input: { sessionId?: string; message: string; actor: string; language?: string }): Promise<JarvisChatResult> {
    const cfg = await this.config();
    const message = String(input.message || '').trim().slice(0, 4000);
    if (!message) throw Object.assign(new Error('MESSAGE_EMPTY'), { statusCode: 400, code: 'MESSAGE_EMPTY' });

    // Load or create the session.
    let sessionId = String(input.sessionId || '').trim();
    let history: GroqMessage[] = [];
    let version = 0;
    if (sessionId) {
      const row = await this.core.read<any>('jarvis-session', sessionId);
      if (!row) throw Object.assign(new Error('SESSION_NOT_FOUND'), { statusCode: 404, code: 'SESSION_NOT_FOUND' });
      history = (row.data.messages || []).slice(-MAX_SESSION_MESSAGES);
      version = row.version;
    } else {
      sessionId = `js-${randomUUID().slice(0, 12)}`;
    }

    const approvalsCreated: string[] = [];
    const toolsUsed: string[] = [];

    if (!providerConfigured(cfg) && !anyBackupConfigured(cfg)) {
      const reply = 'هوش مصنوعی جارویس هنوز تنظیم نشده است. از تنظیمات جارویس، کلید API سرویس Groq را وارد کنید (رایگان: console.groq.com). تا آن موقع فقط ابزارهای بدون LLM در دسترس‌اند.';
      await this.saveSession(sessionId, version, history, { role: 'user', content: message }, { role: 'assistant', content: reply }, input.actor);
      return { sessionId, reply, approvalsCreated, toolsUsed: [], usageToday: await todayUsage(this.core) };
    }

    const language = String(input.language || 'fa');
    const context = await this.portalContext();
    const messages: GroqMessage[] = [
      { role: 'system', content: this.systemPrompt(language, context) },
      ...history,
      { role: 'user', content: message },
    ];
    const fullTools = this.registry.tools();
    const supportTools = this.registry.tools('support');

    let reply = '';
    let provider: JarvisProviderId = 'groq';
    let mode: 'primary' | 'backup' = 'primary';
    for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
      const chain = await runJarvisChain(
        { core: this.core, getStore: this.getStore, fetcher: this.fetcher, breaker: this.chainState },
        {
          messages, tools: fullTools, supportTools,
          supportNote: this.supportNote(language),
          allowBackup: true, maxTokens: 3000,
        },
      );
      provider = chain.provider;
      mode = chain.mode;
      const choice = chain.data?.choices?.[0];
      const assistant: any = choice?.message || {};
      const toolCalls = Array.isArray(assistant.tool_calls) ? assistant.tool_calls : [];
      if (!toolCalls.length) {
        reply = String(assistant.content || '').slice(0, 6000) || 'انجام شد.';
        messages.push({ role: 'assistant', content: reply });
        break;
      }
      messages.push({ role: 'assistant', content: assistant.content || '', tool_calls: toolCalls });
      for (const call of toolCalls.slice(0, 4)) {
        const id = String(call?.id || randomUUID());
        const name = String(call?.function?.name || '');
        let parsed: any = {};
        try { parsed = JSON.parse(String(call?.function?.arguments || '{}')); } catch { parsed = {}; }
        toolsUsed.push(name);
        let resultText: string;
        if (!this.registry.byId(name)) {
          resultText = JSON.stringify({ ok: false, summary: `مهارت «${name}» وجود ندارد` });
        } else if (chain.mode === 'backup' && !isSupportSkill(name)) {
          // Backup providers are support-only by operator rule: refuse + report.
          resultText = JSON.stringify({
            ok: false,
            summary: `این اقدام (${name}) خارج از دامنهٔ پشتیبانی است و در حالت پشتیبان غیرفعال می‌ماند. فقط امور پشتیبانی (تیکت، پیام‌ها، نظارت پورتال) با سرویس پشتیبان انجام می‌شود.`,
          });
          await recordIncident(this.core, {
            type: 'SUPPORT_ONLY_BLOCKED', provider: chain.provider,
            message: `درخواست غیرپشتیبانی «${name}» در حالت پشتیبان رد و به ادمین گزارش شد.`,
            meta: { skill: name },
          });
        } else {
          const result = await this.registry.run({ core: this.core, store: this.getStore(), actor: input.actor }, name, parsed);
          if (result.approvalRequired && result.approvalId) approvalsCreated.push(result.approvalId);
          resultText = JSON.stringify(result).slice(0, 6000);
        }
        messages.push({ role: 'tool', tool_call_id: id, name, content: resultText });
      }
      if (round === MAX_TOOL_ROUNDS - 1) {
        reply = 'به سقف مراحل ابزار رسیدم؛ درخواست را مرحله‌به‌مرحله بفرستید.';
        messages.push({ role: 'assistant', content: reply });
      }
    }
    if (!reply) reply = 'پاسخی دریافت نشد.';

    // Deterministic in-chat report whenever a backup (support-only) served the turn.
    if (mode === 'backup') {
      reply += `\n\n— [${JARVIS_PROVIDERS[provider].label} · حالت پشتیبان | فقط امور پشتیبانی فعال است؛ سایر امکانات تا بازگشت Groq متوقف و به ادمین گزارش شد.]`;
    }

    await this.saveSession(sessionId, version, history, { role: 'user', content: message }, { role: 'assistant', content: reply }, input.actor, messages);
    return { sessionId, reply, approvalsCreated, toolsUsed, provider, mode, usageToday: await todayUsage(this.core) };
  }

  /** Persist the session with the new user + assistant turns (tool chatter trimmed out). */
  private async saveSession(sessionId: string, _version: number, history: GroqMessage[], user: GroqMessage, assistant: GroqMessage, actor: string, fullMessages?: GroqMessage[]) {
    const keep = (fullMessages || [...history, user, assistant])
      .filter(m => m.role !== 'tool' && !(m.role === 'assistant' && m.tool_calls))
      .slice(-MAX_SESSION_MESSAGES);
    const existing = await this.core.read<any>('jarvis-session', sessionId);
    const data = {
      actor: existing?.data?.actor || actor, title: existing?.data?.title || String(user.content || '').slice(0, 60),
      messages: keep, createdAt: existing?.data?.createdAt || nowISO(), updatedAt: nowISO(),
    };
    await this.core.save('jarvis-session', sessionId, data, existing?.version || 0);
  }
}

export { SUPPORT_SKILL_IDS };
