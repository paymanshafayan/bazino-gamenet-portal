/**
 * Jarvis (admin assistant) — provider config, provider chain members, usage caps.
 *
 * Providers:
 *   groq       PRIMARY    — free tier ~30 RPM / ~1k req/day → default daily cap 800.
 *                          Free tool-calling models verified against the docs
 *                          (2026-09-11); groq/compound has no local tool use and
 *                          is intentionally absent.
 *   openrouter BACKUP #1  — support-only fallback. Free tier: 20 req/min and
 *                          50 req/day (1,000/day once ≥$10 lifetime credits);
 *                          free model ids end with ":free" → default cap 50.
 *   openai     BACKUP #2  — support-only fallback, pay-as-you-go (no free tier);
 *                          cheapest tool-calling models: gpt-4o-mini, gpt-4.1-nano.
 * Backups serve ONLY support skills (tickets, messages/DMs, portal monitoring);
 * everything else pauses while Groq is unavailable and is reported to the admin
 * (incident log + in-chat notice).
 *
 * Keys live in the settings store (never returned in full after save); env
 * GROQ_API_KEY / OPENROUTER_API_KEY / OPENAI_API_KEY are fallbacks so Railway
 * can host the keys too.
 */
import { OpsCore, fingerprint } from '../management/core';

export const JARVIS_CONFIG_KEY = 'jarvis_admin_config';
export const GROQ_BASE = 'https://api.groq.com/openai/v1';

export type JarvisProviderId = 'groq' | 'openrouter' | 'openai';
export const BACKUP_PROVIDERS: JarvisProviderId[] = ['openrouter', 'openai'];

export interface ProviderMeta {
  id: JarvisProviderId;
  label: string;
  baseUrl: string;
  role: 'primary' | 'backup';
  keyUrl: string;
  note: string;
  /** Extra headers the provider asks apps to send (OpenRouter attribution). */
  extraHeaders?: Record<string, string>;
}

export const JARVIS_PROVIDERS: Record<JarvisProviderId, ProviderMeta> = {
  groq: {
    id: 'groq', label: 'Groq', baseUrl: 'https://api.groq.com/openai/v1', role: 'primary',
    keyUrl: 'console.groq.com/keys', note: 'موتور اصلی — رایگان با فراخوانی ابزار بومی.',
  },
  openrouter: {
    id: 'openrouter', label: 'OpenRouter', baseUrl: 'https://openrouter.ai/api/v1', role: 'backup',
    keyUrl: 'openrouter.ai/keys', note: 'پشتیبان ۱ — فقط امور پشتیبانی. مدل‌های رایگان با پسوند :free (حدود ۵۰ درخواست/روز؛ با شارژ ۱۰$ تا ۱۰۰۰).',
    extraHeaders: { 'HTTP-Referer': 'https://bazino.pro', 'X-Title': 'Bazino Jarvis' },
  },
  openai: {
    id: 'openai', label: 'OpenAI', baseUrl: 'https://api.openai.com/v1', role: 'backup',
    keyUrl: 'platform.openai.com/api-keys', note: 'پشتیبان ۲ — فقط امور پشتیبانی. پولی (pay-as-you-go)؛ گزینهٔ ارزان: gpt-4o-mini.',
  },
};

export interface JarvisAutomationConfig {
  dailyBrief: boolean;
  weeklyDigest: boolean;
  igReplies: boolean;
  chatFaq: boolean;
  /** Only high-confidence FAQ answers are sent without approval when true. */
  faqAutoSend: boolean;
}

export interface JarvisBackupConfig {
  enabled: boolean;
  apiKey: string;
  model: string;
  dailyCallCap: number;
}

export interface JarvisConfig {
  apiKey: string;
  model: string;
  lightModel: string;
  dailyCallCap: number;
  /** Support-only fallback providers (activated when Groq cannot answer). */
  backup: Record<'openrouter' | 'openai', JarvisBackupConfig>;
  automation: JarvisAutomationConfig;
}

/** Free-tier Groq models with native tool calling — VERIFIED LIVE 2026-09-11
 *  via GET /models with a real key (the catalog rotated: llama-3.3-70b-versatile,
 *  llama-3.1-8b-instant and qwen/qwen3-32b are GONE → model_not_found). */
export const FREE_GROQ_MODELS: Array<{ id: string; label: string; note: string }> = [
  { id: 'openai/gpt-oss-120b', label: 'GPT-OSS 120B', note: 'پیشنهادی — قوی، رایگان، فراخوانی ابزار (تست‌شده)' },
  { id: 'openai/gpt-oss-20b', label: 'GPT-OSS 20B', note: 'سبک و سریع — مناسب مدل جانشین' },
  { id: 'qwen/qwen3.6-27b', label: 'Qwen3.6 27B', note: 'رایگان، فراخوانی ابزار (تست‌شده)' },
  { id: 'qwen/qwen3.8-27b', label: 'Qwen3.8 27B', note: 'رایگان — جدیدتر از 3.6' },
];

/** OpenRouter :free suggestions — from the live free ∩ tool-capable list
 *  (GET /models, 2026-09-11: 18 models; ids rotate — the panel fetches live). */
export const SUGGESTED_OPENROUTER_MODELS: Array<{ id: string; label: string; note: string }> = [
  { id: 'google/gemma-4-31b-it:free', label: 'Gemma 4 31B (free)', note: 'پیشنهادی — عمومی، رایگان، فراخوانی ابزار (تست‌شده)' },
  { id: 'nvidia/nemotron-3-super-120b-a12b:free', label: 'Nemotron 3 Super 120B (free)', note: 'رایگان، قوی' },
  { id: 'google/gemma-4-26b-a4b-it:free', label: 'Gemma 4 26B (free)', note: 'رایگان، سبک‌تر' },
  { id: 'nvidia/nemotron-3.5-lightning:free', label: 'Nemotron 3.5 Lightning (free)', note: 'رایگان، سریع' },
  { id: 'thinkingmachines/inkling:free', label: 'Inkling (free)', note: 'رایگان' },
];

/**
 * OpenRouter routing fallbacks for tool calls — from the live free ∩ tool-capable
 * list (2026-09-11). Used ONLY as the `models` array AFTER the admin's configured
 * model; OpenRouter tries them in order when the primary cannot serve the
 * request. NOTE: the array is hard-limited to 3 items by OpenRouter.
 */
export const OPENROUTER_TOOL_FALLBACKS = [
  'google/gemma-4-31b-it:free',
  'nvidia/nemotron-3-super-120b-a12b:free',
];

/** OpenAI is paid — cheapest tool-calling models first (2026 pricing). */
export const SUGGESTED_OPENAI_MODELS: Array<{ id: string; label: string; note: string }> = [
  { id: 'gpt-4o-mini', label: 'GPT-4o mini', note: 'پیشنهادی — ارزان ($0.15/$0.60 per 1M)، فراخوانی ابزار کامل' },
  { id: 'gpt-4.1-nano', label: 'GPT-4.1 nano', note: 'ارزان‌ترین ($0.10/$0.40)' },
  { id: 'gpt-4.1-mini', label: 'GPT-4.1 mini', note: 'قوی‌تر ($0.40/$1.60)' },
  { id: 'gpt-5-mini', label: 'GPT-5 mini', note: 'متعادل ($0.25/$2.00)' },
];

export function suggestedModels(provider: JarvisProviderId): Array<{ id: string; label: string; note: string }> {
  if (provider === 'openrouter') return SUGGESTED_OPENROUTER_MODELS;
  if (provider === 'openai') return SUGGESTED_OPENAI_MODELS;
  return FREE_GROQ_MODELS;
}

export const DEFAULT_BACKUP_OPENROUTER: JarvisBackupConfig = {
  enabled: false, apiKey: '', model: 'google/gemma-4-31b-it:free', dailyCallCap: 50,
};
export const DEFAULT_BACKUP_OPENAI: JarvisBackupConfig = {
  enabled: false, apiKey: '', model: 'gpt-4o-mini', dailyCallCap: 200,
};

export const DEFAULT_JARVIS_CONFIG: JarvisConfig = {
  apiKey: '',
  model: 'openai/gpt-oss-120b',
  lightModel: 'openai/gpt-oss-20b',
  dailyCallCap: 800,
  backup: { openrouter: { ...DEFAULT_BACKUP_OPENROUTER }, openai: { ...DEFAULT_BACKUP_OPENAI } },
  automation: { dailyBrief: true, weeklyDigest: true, igReplies: false, chatFaq: false, faqAutoSend: false },
};

const ENV_KEYS: Record<JarvisProviderId, string | undefined> = {
  groq: process.env.GROQ_API_KEY,
  openrouter: process.env.OPENROUTER_API_KEY,
  openai: process.env.OPENAI_API_KEY,
};

export async function getJarvisConfig(store: any): Promise<JarvisConfig> {
  let raw: any = null;
  try { raw = JSON.parse(String(await store.getSetting(JARVIS_CONFIG_KEY) || '') || 'null'); } catch { raw = null; }
  const cfg = sanitizeJarvisConfig(raw);
  if (!cfg.apiKey && ENV_KEYS.groq) cfg.apiKey = String(ENV_KEYS.groq);
  for (const id of BACKUP_PROVIDERS) {
    if (!cfg.backup[id].apiKey && ENV_KEYS[id]) cfg.backup[id] = { ...cfg.backup[id], apiKey: String(ENV_KEYS[id]) };
  }
  return cfg;
}

function sanitizeBackup(raw: any, fallback: JarvisBackupConfig): JarvisBackupConfig {
  const src = raw && typeof raw === 'object' ? raw : {};
  const cap = Number(src.dailyCallCap);
  return {
    enabled: src.enabled === true,
    apiKey: String(src.apiKey || '').slice(0, 200),
    model: String(src.model || '').trim().slice(0, 160) || fallback.model,
    dailyCallCap: Number.isFinite(cap) ? Math.min(100000, Math.max(10, Math.round(cap))) : fallback.dailyCallCap,
  };
}

export function sanitizeJarvisConfig(raw: any): JarvisConfig {
  const src = raw && typeof raw === 'object' ? raw : {};
  const model = String(src.model || '').trim().slice(0, 120) || DEFAULT_JARVIS_CONFIG.model;
  const lightModel = String(src.lightModel || '').trim().slice(0, 120) || DEFAULT_JARVIS_CONFIG.lightModel;
  const cap = Number(src.dailyCallCap);
  const a = src.automation && typeof src.automation === 'object' ? src.automation : {};
  const b = src.backup && typeof src.backup === 'object' ? src.backup : {};
  return {
    apiKey: String(src.apiKey || '').slice(0, 200),
    model, lightModel,
    dailyCallCap: Number.isFinite(cap) ? Math.min(100000, Math.max(10, Math.round(cap))) : DEFAULT_JARVIS_CONFIG.dailyCallCap,
    backup: {
      openrouter: sanitizeBackup(b.openrouter, DEFAULT_BACKUP_OPENROUTER),
      openai: sanitizeBackup(b.openai, DEFAULT_BACKUP_OPENAI),
    },
    automation: {
      dailyBrief: a.dailyBrief !== false,
      weeklyDigest: a.weeklyDigest !== false,
      igReplies: a.igReplies === true,
      chatFaq: a.chatFaq === true,
      faqAutoSend: a.faqAutoSend === true,
    },
  };
}

/** Keep the old key when the admin re-saves the masked placeholder. */
export function mergeApiKey(incoming: string, previous: string): string {
  const v = String(incoming || '').trim();
  if (!v || v === '********') return previous;
  return v.slice(0, 200);
}

export function maskedJarvisConfig(cfg: JarvisConfig) {
  return {
    ...cfg,
    apiKey: cfg.apiKey ? '********' : '',
    backup: {
      openrouter: { ...cfg.backup.openrouter, apiKey: cfg.backup.openrouter.apiKey ? '********' : '' },
      openai: { ...cfg.backup.openai, apiKey: cfg.backup.openai.apiKey ? '********' : '' },
    },
  };
}

export function providerConfigured(cfg: JarvisConfig): boolean {
  return cfg.apiKey.length > 10;
}

export function backupConfigured(cfg: JarvisConfig, id: 'openrouter' | 'openai'): boolean {
  const b = cfg.backup?.[id];
  return !!b && b.enabled === true && String(b.apiKey || '').length > 10;
}

export function anyBackupConfigured(cfg: JarvisConfig): boolean {
  return BACKUP_PROVIDERS.some(id => backupConfigured(cfg, id as 'openrouter' | 'openai'));
}

/* ── OpenAI-compatible chat client (all three providers) ────────── */

export interface GroqMessage { role: string; content?: string | null; tool_calls?: any[]; tool_call_id?: string; name?: string }

export class JarvisProviderError extends Error {
  constructor(public code: string, public statusCode: number, public retryAfter = 0, detail = '') {
    super(`${code}${detail ? `: ${detail.slice(0, 300)}` : ''}`);
  }
}

export async function jarvisChatCompletion(d: {
  provider: JarvisProviderId; apiKey: string; model: string; messages: GroqMessage[]; tools?: any[];
  temperature?: number; maxTokens?: number; fetcher?: typeof fetch;
}): Promise<any> {
  const meta = JARVIS_PROVIDERS[d.provider];
  if (!d.apiKey) throw new JarvisProviderError('JARVIS_NOT_CONFIGURED', 409);
  const fetcher = d.fetcher || fetch;

  /* Provider-specific body shaping:
   *  - OpenAI: gpt-4.1+/gpt-5/chatgpt-* models REQUIRE max_completion_tokens
   *    (max_tokens → 400 error) and o-series reasoning models reject a custom
   *    temperature. gpt-4o and gpt-3.5 keep the classic max_tokens.
   *  - OpenRouter: when tools are used, add the official `models` routing
   *    array — many :free variants lack tool calling (404 "no endpoints"),
   *    and the array lets OpenRouter fall through to a sibling model. The
   *    admin's model stays first. */
  const body: any = {
    model: d.model, messages: d.messages,
    temperature: d.temperature ?? 0.2,
    max_tokens: d.maxTokens ?? 3000,
    ...(d.tools?.length ? { tools: d.tools, tool_choice: 'auto' } : {}),
  };
  if (d.provider === 'openai') {
    const m = String(d.model || '');
    if (/^(gpt-4\.1|gpt-5|chatgpt|o\d)/.test(m)) {
      delete body.max_tokens;
      body.max_completion_tokens = d.maxTokens ?? 3000;
      if (/^o\d/.test(m)) delete body.temperature;
    }
  } else if (d.provider === 'openrouter' && d.tools?.length) {
    body.models = [d.model, ...OPENROUTER_TOOL_FALLBACKS.filter(x => x !== d.model)].slice(0, 3); // OpenRouter hard limit: max 3
  }

  let res: Response;
  try {
    res = await fetcher(`${meta.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${d.apiKey}`, ...(meta.extraHeaders || {}) },
      body: JSON.stringify(body),
    });
  } catch (e: any) {
    throw new JarvisProviderError('JARVIS_NETWORK_ERROR', 502, 0, String(e?.message || e));
  }
  if (!res.ok) {
    const bodyText = await res.text().catch(() => '');
    const retryAfter = Number(res.headers.get('retry-after') || 0);
    if (res.status === 429) throw new JarvisProviderError('JARVIS_RATE_LIMITED', 429, retryAfter, bodyText);
    if (res.status === 401 || res.status === 403) throw new JarvisProviderError('JARVIS_BAD_KEY', 401, 0, bodyText);
    if (res.status === 402) throw new JarvisProviderError('JARVIS_QUOTA_EXHAUSTED', 402, 0, bodyText);
    // OpenRouter "no endpoints support tool use" → make the cause obvious.
    if (d.provider === 'openrouter' && res.status === 404 && /tool/i.test(bodyText)) {
      throw new JarvisProviderError('JARVIS_PROVIDER_ERROR', 502, 0, `مدل انتخابی OpenRouter فراخوانی ابزار ندارد (404) — از تنظیمات جارویس مدل دارای ابزار انتخاب کنید. ${bodyText.slice(0, 160)}`);
    }
    throw new JarvisProviderError('JARVIS_PROVIDER_ERROR', 502, 0, `${res.status} ${bodyText}`);
  }
  return res.json();
}

/** Backwards-compatible Groq wrapper. */
export async function groqChatCompletion(d: {
  apiKey: string; model: string; messages: GroqMessage[]; tools?: any[];
  temperature?: number; maxTokens?: number; fetcher?: typeof fetch;
}): Promise<any> {
  return jarvisChatCompletion({ provider: 'groq', ...d });
}

export async function listProviderModels(provider: JarvisProviderId, apiKey: string, fetcher?: typeof fetch): Promise<{ models: string[]; free: string[]; toolModels?: string[] }> {
  const meta = JARVIS_PROVIDERS[provider];
  if (provider !== 'openrouter' && !apiKey) throw new JarvisProviderError('JARVIS_NOT_CONFIGURED', 409);
  const f = fetcher || fetch;
  let res: Response;
  try {
    res = await f(`${meta.baseUrl}/models`, { headers: { ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}), ...(meta.extraHeaders || {}) } });
  } catch (e: any) {
    throw new JarvisProviderError('JARVIS_NETWORK_ERROR', 502, 0, String(e?.message || e));
  }
  if (!res.ok) throw new JarvisProviderError('JARVIS_PROVIDER_ERROR', 502, 0, String(res.status));
  const data: any = await res.json();
  let models = (Array.isArray(data?.data) ? data.data : []).map((m: any) => String(m?.id || '')).filter(Boolean).sort();
  if (provider === 'openai') {
    // Drop non-chat models (embeddings, tts, image, moderation, legacy) so the
    // admin only picks chat-capable ones.
    models = models.filter(id => !/^(whisper|dall-e|tts|text-embedding|omni-moderation|babbage|davinci|code-|realtime|gpt-4o-audio|chatgpt-image|gpt-3\.5-turbo-instruct)/.test(id));
  }
  const free = provider === 'openrouter' ? models.filter(id => id.endsWith(':free')) : [];
  // OpenRouter reports supported parameters per model — surface tool support
  // so the admin (and the chain) can pick tool-capable models.
  const toolModels = provider === 'openrouter'
    ? (Array.isArray(data?.data) ? data.data : [])
      .filter((m: any) => Array.isArray(m?.supported_parameters) && m.supported_parameters.includes('tools'))
      .map((m: any) => String(m?.id || ''))
      .filter(Boolean)
      .sort()
    : undefined;
  return { models, free, toolModels };
}

/** Backwards-compatible Groq wrapper. */
export async function listGroqModels(apiKey: string, fetcher?: typeof fetch): Promise<string[]> {
  return (await listProviderModels('groq', apiKey, fetcher)).models;
}

/* ── Daily usage counters, one per provider (Cyprus day) ────────── */

const USAGE_TABLES: Record<JarvisProviderId, string> = {
  groq: 'jarvis-usage', openrouter: 'jarvis-usage-openrouter', openai: 'jarvis-usage-openai',
};

function cyprusDateKey(date = new Date()): string {
  try {
    return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Nicosia', year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
  } catch { return date.toISOString().slice(0, 10); }
}

export async function todayUsage(core: OpsCore, provider: JarvisProviderId = 'groq'): Promise<number> {
  const row = await core.read<{ count: number }>(USAGE_TABLES[provider], cyprusDateKey());
  return row?.data?.count || 0;
}

export async function bumpUsage(core: OpsCore, by = 1, provider: JarvisProviderId = 'groq'): Promise<number> {
  const id = cyprusDateKey();
  const row = await core.read<{ count: number; dateKey: string }>(USAGE_TABLES[provider], id);
  const count = (row?.data?.count || 0) + by;
  await core.save(USAGE_TABLES[provider], id, { count, dateKey: id, updatedAt: new Date().toISOString() }, row?.version || 0);
  return count;
}

export function cyprusNowKey(): string { return cyprusDateKey(); }
export function usageId(date = new Date()): string { return cyprusDateKey(date); }
export { fingerprint };
