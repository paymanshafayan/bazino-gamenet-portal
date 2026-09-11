/**
 * Jarvis provider chain — Groq (primary) → OpenRouter → OpenAI (backups).
 *
 * Operator rules implemented here:
 *  1. Backups engage ONLY when Groq cannot answer (rate limit, daily cap,
 *     network error, bad key, 5xx). While Groq is healthy, backups stay idle.
 *  2. Backups are SUPPORT-ONLY: they receive the support tool list and a
 *     support-mode system note (tickets, user/DM messages, portal monitoring).
 *  3. When allowBackup=false (non-support work such as marketing briefs),
 *     the call pauses instead of degrading: JARVIS_PRIMARY_UNAVAILABLE is
 *     thrown and an incident is recorded for the admin.
 *  4. Every provider has its own daily budget; attempts count even on failure.
 */
import { OpsCore } from '../management/core';
import {
  getJarvisConfig, jarvisChatCompletion, providerConfigured, backupConfigured,
  todayUsage, bumpUsage, JarvisProviderError,
  type JarvisConfig, type JarvisProviderId, type GroqMessage, BACKUP_PROVIDERS,
} from './config';
import { recordIncident } from './incidents';

export interface ChainDeps { core: OpsCore; getStore: () => any; fetcher?: typeof fetch; breaker?: ChainBreaker }

/** Per-engine circuit breaker: once Groq fails, skip it briefly instead of
 *  burning two more failed attempts on every subsequent round of the same
 *  conversation (rate limits heal in about a minute). */
export interface ChainBreaker { skipUntil: number; code: string }
const BREAKER_MS = 60_000;

const statusForCode = (code: string) => code === 'JARVIS_RATE_LIMITED' || code === 'JARVIS_DAILY_CAP' ? 429 : code === 'JARVIS_BAD_KEY' ? 401 : code === 'JARVIS_QUOTA_EXHAUSTED' ? 402 : 502;

export interface ChainCall {
  messages: GroqMessage[];
  /** Full tool list — offered to the primary provider. */
  tools?: any[];
  /** Support-only tool list — the ONLY tools backups ever see. */
  supportTools?: any[];
  /** Extra system note injected (as a trailing system message) on backup calls. */
  supportNote?: string;
  /** false → primary-only (non-support work must pause, not degrade). */
  allowBackup: boolean;
  temperature?: number;
  maxTokens?: number;
}

export interface ChainResult {
  data: any;
  provider: JarvisProviderId;
  mode: 'primary' | 'backup';
}

async function attemptGroq(cfg: JarvisConfig, call: ChainCall, fetcher?: typeof fetch): Promise<any> {
  try {
    return await jarvisChatCompletion({
      provider: 'groq', apiKey: cfg.apiKey, model: cfg.model,
      messages: call.messages, tools: call.tools,
      temperature: call.temperature, maxTokens: call.maxTokens, fetcher,
    });
  } catch (e: any) {
    // Free-tier TPM bump: retry once on the light model before giving up.
    if (e instanceof JarvisProviderError && e.code === 'JARVIS_RATE_LIMITED' && cfg.lightModel && cfg.lightModel !== cfg.model) {
      return await jarvisChatCompletion({
        provider: 'groq', apiKey: cfg.apiKey, model: cfg.lightModel,
        messages: call.messages, tools: call.tools,
        temperature: call.temperature, maxTokens: call.maxTokens, fetcher,
      });
    }
    throw e;
  }
}

export async function runJarvisChain(deps: ChainDeps, call: ChainCall): Promise<ChainResult> {
  const cfg = await getJarvisConfig(deps.getStore());
  const breaker = deps.breaker;
  let primaryError: JarvisProviderError;

  /* 1) Groq (primary) */
  if (providerConfigured(cfg)) {
    if (await todayUsage(deps.core, 'groq') >= cfg.dailyCallCap) {
      primaryError = new JarvisProviderError('JARVIS_DAILY_CAP', 429);
      if (breaker) { breaker.skipUntil = Date.now() + BREAKER_MS; breaker.code = primaryError.code; }
      await recordIncident(deps.core, {
        type: 'GROQ_UNAVAILABLE', provider: 'groq',
        message: `سقف روزانهٔ Groq پر شد (${cfg.dailyCallCap} فراخوانی) — پشتیبان‌ها در حالت فقط-پشتیبانی فعال شدند.`,
        meta: { code: 'JARVIS_DAILY_CAP' },
      });
    } else if (breaker && Date.now() < breaker.skipUntil) {
      // Recently failed — skip Groq for the breaker window (incident already recorded).
      primaryError = new JarvisProviderError(breaker.code || 'JARVIS_PROVIDER_ERROR', statusForCode(breaker.code || ''));
    } else {
      try {
        const data = await attemptGroq(cfg, call, deps.fetcher);
        if (breaker) breaker.skipUntil = 0;
        await bumpUsage(deps.core, 1, 'groq').catch(() => {});
        return { data, provider: 'groq', mode: 'primary' };
      } catch (e: any) {
        await bumpUsage(deps.core, 1, 'groq').catch(() => {}); // failed attempts still cost budget
        primaryError = e instanceof JarvisProviderError ? e : new JarvisProviderError('JARVIS_PROVIDER_ERROR', 502, 0, String(e?.message || e));
        if (breaker) { breaker.skipUntil = Date.now() + BREAKER_MS; breaker.code = primaryError.code; }
        await recordIncident(deps.core, {
          type: 'GROQ_UNAVAILABLE', provider: 'groq',
          message: `Groq پاسخ نداد (${primaryError.code}) — در صورت تنظیم، پشتیبان فقط-پشتیبانی فعال می‌شود.`,
          meta: { code: primaryError.code },
        });
      }
    }
  } else {
    primaryError = new JarvisProviderError('JARVIS_NOT_CONFIGURED', 409);
  }

  /* 2) Non-support work must PAUSE (never degrade to a backup). */
  if (!call.allowBackup) {
    await recordIncident(deps.core, {
      type: 'SUPPORT_ONLY_BLOCKED', provider: 'groq',
      message: `کاری غیر از پشتیبانی متوقف شد: Groq در دسترس نیست (${primaryError.code}) و پشتیبان‌ها فقط امور پشتیبانی را انجام می‌دهند.`,
      meta: { code: primaryError.code },
    });
    throw Object.assign(new Error('JARVIS_PRIMARY_UNAVAILABLE'), {
      code: 'JARVIS_PRIMARY_UNAVAILABLE', statusCode: 503, cause: primaryError.code,
    });
  }

  /* 3) Backups — support-only, in order OpenRouter → OpenAI. */
  for (const id of BACKUP_PROVIDERS as Array<'openrouter' | 'openai'>) {
    const bc = cfg.backup[id];
    if (!backupConfigured(cfg, id)) continue;
    if (await todayUsage(deps.core, id) >= bc.dailyCallCap) {
      await recordIncident(deps.core, {
        type: 'BACKUP_FAILED', provider: id,
        message: `سقف روزانهٔ ${id} پر است (${bc.dailyCallCap}) — سراغ پشتیبان بعدی می‌رویم.`,
      });
      continue;
    }
    try {
      const data = await jarvisChatCompletion({
        provider: id, apiKey: bc.apiKey, model: bc.model,
        messages: call.supportNote
          ? [...call.messages, { role: 'system', content: call.supportNote }]
          : call.messages,
        tools: call.supportTools,
        temperature: call.temperature, maxTokens: call.maxTokens, fetcher: deps.fetcher,
      });
      await bumpUsage(deps.core, 1, id).catch(() => {});
      await recordIncident(deps.core, {
        type: 'BACKUP_ACTIVE', provider: id,
        message: `پاسخ با ${id} در حالت فقط-پشتیبانی داده شد (Groq: ${primaryError.code}).`,
        meta: { groqError: primaryError.code },
      });
      return { data, provider: id, mode: 'backup' };
    } catch (e: any) {
      await bumpUsage(deps.core, 1, id).catch(() => {});
      const code = e instanceof JarvisProviderError ? e.code : 'JARVIS_PROVIDER_ERROR';
      await recordIncident(deps.core, {
        type: 'BACKUP_FAILED', provider: id,
        message: `پشتیبان ${id} هم پاسخ نداد (${code}).`,
        meta: { code },
      });
    }
  }

  /* 4) Nothing could serve the request — surface the primary error. */
  throw primaryError;
}
