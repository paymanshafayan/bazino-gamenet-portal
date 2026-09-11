/**
 * Jarvis (admin assistant) — provider config, Groq client, usage caps.
 *
 * Groq models were verified against the official docs (2026-09-11):
 *  - native tool-calling: llama-3.3-70b-versatile, llama-3.1-8b-instant,
 *    openai/gpt-oss-20b/120b, qwen3 … — groq/compound does NOT support local
 *    tool use, so it is intentionally absent from the agent model list.
 *  - free tier: ~30 RPM / ~1k requests/day → the daily cap defaults to 800.
 * Keys are stored in the settings store (never returned in full after save);
 * env GROQ_API_KEY is only a fallback so Railway can host the key too.
 */
import { OpsCore, fingerprint } from '../management/core';

export const JARVIS_CONFIG_KEY = 'jarvis_admin_config';
export const GROQ_BASE = 'https://api.groq.com/openai/v1';

export interface JarvisAutomationConfig {
  dailyBrief: boolean;
  weeklyDigest: boolean;
  igReplies: boolean;
  chatFaq: boolean;
  /** Only high-confidence FAQ answers are sent without approval when true. */
  faqAutoSend: boolean;
}

export interface JarvisConfig {
  apiKey: string;
  model: string;
  lightModel: string;
  dailyCallCap: number;
  automation: JarvisAutomationConfig;
}

/** Free-tier Groq models with native tool calling (docs 2026-09-11). */
export const FREE_GROQ_MODELS: Array<{ id: string; label: string; note: string }> = [
  { id: 'llama-3.3-70b-versatile', label: 'Llama 3.3 70B', note: 'پیشنهادی — دقیق‌ترین مدل رایگان با فراخوانی ابزار' },
  { id: 'llama-3.1-8b-instant', label: 'Llama 3.1 8B Instant', note: 'سبک و بسیار سریع' },
  { id: 'openai/gpt-oss-20b', label: 'GPT-OSS 20B', note: 'رایگان، سریع' },
  { id: 'openai/gpt-oss-120b', label: 'GPT-OSS 120B', note: 'رایگان، قوی‌تر' },
  { id: 'meta-llama/llama-4-scout-17b-16e-instruct', label: 'Llama 4 Scout', note: 'رایگان، چندوجهی' },
  { id: 'qwen/qwen3-32b', label: 'Qwen3 32B', note: 'رایگان' },
];

export const DEFAULT_JARVIS_CONFIG: JarvisConfig = {
  apiKey: '',
  model: 'llama-3.3-70b-versatile',
  lightModel: 'llama-3.1-8b-instant',
  dailyCallCap: 800,
  automation: { dailyBrief: true, weeklyDigest: true, igReplies: false, chatFaq: false, faqAutoSend: false },
};

export async function getJarvisConfig(store: any): Promise<JarvisConfig> {
  let raw: any = null;
  try { raw = JSON.parse(String(await store.getSetting(JARVIS_CONFIG_KEY) || '') || 'null'); } catch { raw = null; }
  const cfg = sanitizeJarvisConfig(raw);
  if (!cfg.apiKey && process.env.GROQ_API_KEY) cfg.apiKey = String(process.env.GROQ_API_KEY);
  return cfg;
}

export function sanitizeJarvisConfig(raw: any): JarvisConfig {
  const src = raw && typeof raw === 'object' ? raw : {};
  const model = String(src.model || '').trim().slice(0, 120) || DEFAULT_JARVIS_CONFIG.model;
  const lightModel = String(src.lightModel || '').trim().slice(0, 120) || DEFAULT_JARVIS_CONFIG.lightModel;
  const cap = Number(src.dailyCallCap);
  const a = src.automation && typeof src.automation === 'object' ? src.automation : {};
  return {
    apiKey: String(src.apiKey || '').slice(0, 200),
    model, lightModel,
    dailyCallCap: Number.isFinite(cap) ? Math.min(100000, Math.max(10, Math.round(cap))) : DEFAULT_JARVIS_CONFIG.dailyCallCap,
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
  return { ...cfg, apiKey: cfg.apiKey ? '********' : '' };
}

export function providerConfigured(cfg: JarvisConfig): boolean {
  return cfg.apiKey.length > 10;
}

/* ── Groq client (OpenAI-compatible) ─────────────────────────────── */

export interface GroqMessage { role: string; content?: string | null; tool_calls?: any[]; tool_call_id?: string; name?: string }

export class JarvisProviderError extends Error {
  constructor(public code: string, public statusCode: number, public retryAfter = 0, detail = '') {
    super(`${code}${detail ? `: ${detail.slice(0, 300)}` : ''}`);
  }
}

export async function groqChatCompletion(d: {
  apiKey: string; model: string; messages: GroqMessage[]; tools?: any[];
  temperature?: number; maxTokens?: number; fetcher?: typeof fetch;
}): Promise<any> {
  if (!d.apiKey) throw new JarvisProviderError('JARVIS_NOT_CONFIGURED', 409);
  const fetcher = d.fetcher || fetch;
  let res: Response;
  try {
    res = await fetcher(`${GROQ_BASE}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${d.apiKey}` },
      body: JSON.stringify({
        model: d.model, messages: d.messages, temperature: d.temperature ?? 0.2,
        max_tokens: d.maxTokens ?? 3000,
        ...(d.tools?.length ? { tools: d.tools, tool_choice: 'auto' } : {}),
      }),
    });
  } catch (e: any) {
    throw new JarvisProviderError('JARVIS_NETWORK_ERROR', 502, 0, String(e?.message || e));
  }
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    const retryAfter = Number(res.headers.get('retry-after') || 0);
    if (res.status === 429) throw new JarvisProviderError('JARVIS_RATE_LIMITED', 429, retryAfter, body);
    if (res.status === 401 || res.status === 403) throw new JarvisProviderError('JARVIS_BAD_KEY', 401, 0, body);
    throw new JarvisProviderError('JARVIS_PROVIDER_ERROR', 502, 0, `${res.status} ${body}`);
  }
  return res.json();
}

export async function listGroqModels(apiKey: string, fetcher?: typeof fetch): Promise<string[]> {
  if (!apiKey) throw new JarvisProviderError('JARVIS_NOT_CONFIGURED', 409);
  const f = fetcher || fetch;
  const res = await f(`${GROQ_BASE}/models`, { headers: { Authorization: `Bearer ${apiKey}` } });
  if (!res.ok) throw new JarvisProviderError('JARVIS_PROVIDER_ERROR', 502, 0, String(res.status));
  const data: any = await res.json();
  return (Array.isArray(data?.data) ? data.data : []).map((m: any) => String(m?.id || '')).filter(Boolean).sort();
}

/* ── Daily usage counter (Cyprus day) ────────────────────────────── */

function cyprusDateKey(date = new Date()): string {
  try {
    return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Nicosia', year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
  } catch { return date.toISOString().slice(0, 10); }
}

export async function todayUsage(core: OpsCore): Promise<number> {
  const row = await core.read<{ count: number }>('jarvis-usage', cyprusDateKey());
  return row?.data?.count || 0;
}

export async function bumpUsage(core: OpsCore, by = 1): Promise<number> {
  const id = cyprusDateKey();
  const row = await core.read<{ count: number; dateKey: string }>('jarvis-usage', id);
  const count = (row?.data?.count || 0) + by;
  await core.save('jarvis-usage', id, { count, dateKey: id, updatedAt: new Date().toISOString() }, row?.version || 0);
  return count;
}

export function cyprusNowKey(): string { return cyprusDateKey(); }
export function usageId(date = new Date()): string { return cyprusDateKey(date); }
export { fingerprint };
