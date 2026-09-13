/**
 * Instagram away auto-reply policy — pure logic, no I/O (unit-testable).
 *
 * Replaces Meta's "Away message" automation (disabled 2026-09-10 after the
 * duplicate-DM incident): the portal now owns the reply, language-detected,
 * rate-limited, visible to the admin in the studio and auditable.
 * The reply NEVER invents facts. Default texts = operator-approved wording
 * (2026-09-11): the message is registered and under review; the reply will be
 * sent to the sender's DM after review. Same meaning in all four languages.
 */
export type AwayLanguage = 'fa' | 'en' | 'tr' | 'ru';

export interface AwaySettings {
  enabled: boolean;
  /** Local hour (inclusive) — default 1 = 01:00 Cyprus, like the old Meta rule. */
  startHour: number;
  /** Local hour (exclusive) — default 10 = 10:00 Cyprus. */
  endHour: number;
  /** IANA timezone. Cyprus has no DST, so a fixed offset is stable year-round. */
  timezone: string;
  dailyCap: number;
  /** Minimum hours between two auto-replies in the same conversation. */
  perConversationHours: number;
  messages: Record<AwayLanguage, string>;
}

export const DEFAULT_AWAY_MESSAGES: Record<AwayLanguage, string> = {
  fa: 'سلام . پیام شما در سامانه ثبت و در حال بررسی هست . پس از بررسی ، پاسخ به دایرکت شما ارسال خواهد شد . باتشکر . ***بازینو پرو — گیم‌نت و کلوپ گیمینگ.',
  en: 'Hello. Your message has been registered in our system and is being reviewed. After the review, a reply will be sent to your direct message. Thank you. ***Bazino Pro — gaming arena & club.',
  tr: 'Merhaba. Mesajınız sisteme kaydedildi ve inceleniyor. İncelemeden sonra yanıtınız direkt mesaj olarak gönderilecek. Teşekkürler. ***Bazino Pro — oyun arenası ve kulüp.',
  ru: 'Здравствуйте. Ваше сообщение зарегистрировано в системе и находится на рассмотрении. После проверки ответ будет отправлен вам в директ. Спасибо. ***Bazino Pro — игровая арена и клуб.',
};

export const DEFAULT_AWAY_SETTINGS: AwaySettings = {
  enabled: false, startHour: 1, endHour: 10, timezone: 'Asia/Nicosia',
  dailyCap: 100, perConversationHours: 12,
  messages: DEFAULT_AWAY_MESSAGES,
};

const PERSIAN = /[\u0600-\u06FF\u0750-\u077F\uFB50-\uFDFF\uFE70-\uFEFF]/;
const CYRILLIC = /[\u0400-\u04FF]/;
/* Letters only Turkish orthography uses among the site's four languages
 * (fa/en/tr/ru) — English has none of these, so any hit means Turkish. */
const TURKISH = /[şğıİçÇöÖüÜâîûŞĞ]/;

export function detectAwayLanguage(text: string): AwayLanguage {
  const s = String(text || '');
  if (PERSIAN.test(s)) return 'fa';
  if (CYRILLIC.test(s)) return 'ru';
  if (TURKISH.test(s)) return 'tr';
  return 'en';
}

export function hourInZone(date: Date, timeZone: string): number {
  try {
    const h = new Intl.DateTimeFormat('en-GB', { timeZone, hour: 'numeric', hour12: false }).format(date);
    return Number(h) % 24;
  } catch {
    return (date.getUTCHours() + 3) % 24; // Cyprus fallback (UTC+3, no DST)
  }
}

export function dateKeyInZone(date: Date, timeZone: string): string {
  try {
    return new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
  } catch {
    return date.toISOString().slice(0, 10);
  }
}

export function inAwayWindow(s: Pick<AwaySettings, 'startHour' | 'endHour'>, date: Date, timeZone: string): boolean {
  const h = hourInZone(date, timeZone);
  const { startHour: start, endHour: end } = s;
  if (start === end) return true; // degenerate: 24h
  return start < end ? (h >= start && h < end) : (h >= start || h < end); // wraps midnight
}

export interface AwayDecisionInput {
  settings: AwaySettings;
  now: Date;
  direction?: string;
  platform?: string;
  text?: string;
  conversationId?: string;
  authorId?: string;
  /** true when the campaign state machine already answered this message. */
  campaignHandled?: boolean;
  repliesToday: number;
  /** ISO timestamp of the latest auto-reply in THIS conversation (if any). */
  lastReplyAt?: string | null;
}

export interface AwayDecision { reply: boolean; reason: string; language?: AwayLanguage }

export function decideAwayReply(input: AwayDecisionInput): AwayDecision {
  const { settings: s, now } = input;
  if (!s.enabled) return { reply: false, reason: 'disabled' };
  if (input.campaignHandled) return { reply: false, reason: 'campaign_flow' };
  if (input.direction === 'outgoing') return { reply: false, reason: 'outgoing' };
  if (input.platform && input.platform !== 'instagram') return { reply: false, reason: 'not_instagram' };
  const text = String(input.text || '').trim();
  if (!text) return { reply: false, reason: 'empty_text' };
  if (!input.conversationId || !input.authorId) return { reply: false, reason: 'missing_ids' };
  if (!inAwayWindow(s, now, s.timezone)) return { reply: false, reason: 'outside_window' };
  if (input.repliesToday >= s.dailyCap) return { reply: false, reason: 'daily_cap' };
  if (input.lastReplyAt && Date.parse(input.lastReplyAt) > 0) {
    const gapMs = now.getTime() - Date.parse(input.lastReplyAt);
    if (gapMs < s.perConversationHours * 3600000) return { reply: false, reason: 'conversation_recently_replied' };
  }
  return { reply: true, reason: 'ok', language: detectAwayLanguage(text) };
}

/** Clamp/normalize anything the admin panel (or an old settings blob) sends.
 *  Picks ONLY the known fields — the ops client adds idempotencyKey to every
 *  PUT body, which must never leak into the stored settings blob. */
export function sanitizeAwaySettings(raw: any): AwaySettings {
  const src = raw && typeof raw === 'object' ? raw : {};
  const clamp = (v: any, lo: number, hi: number, d: number) => {
    const n = Number(v);
    return Number.isFinite(n) ? Math.min(hi, Math.max(lo, Math.round(n))) : d;
  };
  const timezone = typeof src.timezone === 'string' && src.timezone.trim() ? src.timezone.trim() : DEFAULT_AWAY_SETTINGS.timezone;
  const messages: Record<string, string> = {};
  for (const lang of ['fa', 'en', 'tr', 'ru'] as AwayLanguage[]) {
    const candidate = String((src.messages && src.messages[lang]) || DEFAULT_AWAY_MESSAGES[lang]).trim();
    messages[lang] = candidate.slice(0, 800) || DEFAULT_AWAY_MESSAGES[lang];
  }
  return {
    enabled: src.enabled === true || src.enabled === 'true',
    startHour: clamp(src.startHour, 0, 23, DEFAULT_AWAY_SETTINGS.startHour),
    endHour: clamp(src.endHour, 0, 23, DEFAULT_AWAY_SETTINGS.endHour),
    timezone,
    dailyCap: clamp(src.dailyCap, 1, 1000, DEFAULT_AWAY_SETTINGS.dailyCap),
    perConversationHours: clamp(src.perConversationHours, 1, 168, DEFAULT_AWAY_SETTINGS.perConversationHours),
    messages,
  };
}
