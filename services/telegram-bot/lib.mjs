/**
 * lib.mjs — pure logic for the Bazino Telegram bot (no network, no state).
 * bot.mjs is the thin runner; everything testable lives here.
 */

/** Escape text for Telegram parse_mode=HTML. */
export function escapeHtml(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/**
 * Keyword matcher for gaming-relevant local buzz (Turkish/Persian/English).
 * Case-insensitive substring match; returns the UNIQUE matched keywords.
 */
export const DEFAULT_KEYWORDS = [
  // Turkish
  'turnuva', 'turnuvam', ' turnuva', 'ps5', 'playstation', 'xbox', 'fifa', 'fc 25', 'fc25',
  'fc 26', 'fc26', 'espor', 'e-spor', 'oyun', 'gaming', 'kafe', 'santral',
  // Persian
  'مسابقه', 'تورنمنت', 'گیم', 'بازی', 'کنسول', 'پلی‌استیشن', 'ایکس‌باکس',
  // Local
  'iskele', 'gazimağusa', 'mağusa', 'famagusta', 'long beach',
  // Events
  'konser', 'etkinlik', 'festival',
];

/** Turkish-aware lowercase: 'İ'.toLowerCase() keeps a combining dot — strip marks. */
export function foldCase(s) {
  return String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

export function matchKeywords(text, keywords = DEFAULT_KEYWORDS) {
  const t = foldCase(text);
  if (!t) return [];
  const hits = new Set();
  for (const k of keywords) {
    const kk = foldCase(k);
    if (kk && t.includes(kk)) hits.add(kk);
  }
  return [...hits];
}

/**
 * Anti-spam rate limiter — Telegram ToS compliance for group posting.
 * Sliding window per key (chat id): max N per window + minimum gap between sends.
 */
export class RateLimiter {
  constructor({ maxPerWindow = 3, windowMs = 3 * 3600e3, minGapMs = 60e3 } = {}) {
    this.maxPerWindow = maxPerWindow;
    this.windowMs = windowMs;
    this.minGapMs = minGapMs;
    this.hits = new Map(); // key -> [timestamps]
  }

  /** Returns {ok:true} or {ok:false, reason, retryInMs}. */
  allow(key, now = Date.now()) {
    const list = (this.hits.get(key) || []).filter((t) => now - t < this.windowMs);
    if (list.length) {
      const gap = now - list[list.length - 1];
      if (gap < this.minGapMs) {
        return { ok: false, reason: 'min_gap', retryInMs: this.minGapMs - gap };
      }
    }
    if (list.length >= this.maxPerWindow) {
      return { ok: false, reason: 'window_full', retryInMs: this.windowMs - (now - list[0]) };
    }
    list.push(now);
    this.hits.set(key, list);
    return { ok: true };
  }

  /** Peek without consuming a slot. */
  wouldAllow(key, now = Date.now()) {
    const list = (this.hits.get(key) || []).filter((t) => now - t < this.windowMs);
    if (list.length >= this.maxPerWindow) return false;
    if (list.length && now - list[list.length - 1] < this.minGapMs) return false;
    return true;
  }
}

/** Parse "/cmd rest of the text" → { cmd, args }. */
export function parseCommand(text) {
  const m = String(text || '').match(/^\/([A-Za-z0-9_]+)(?:@\w+)?\s*([\s\S]*)$/);
  if (!m) return null;
  return { cmd: m[1].toLowerCase(), args: (m[2] || '').trim() };
}

/** Owner check: TG_OWNER_IDS is a comma-separated list of numeric ids. */
export function isOwner(fromId, ownerIds) {
  const id = String(fromId ?? '');
  return String(ownerIds || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .includes(id);
}

/** Format a matched post as a Telegram HTML message line. */
export function formatHit(post, hits) {
  const t = escapeHtml(post.text.slice(0, 140) + (post.text.length > 140 ? '…' : ''));
  const when = post.timeISO ? escapeHtml(post.timeISO.slice(0, 16).replace('T', ' ')) : '';
  return `📣 <b>@${escapeHtml(post.channel)}</b> ${when}\n${t}\n${post.link}` +
    (hits && hits.length ? `\n🎯 ${escapeHtml(hits.join(', '))}` : '');
}

/** Public channel watchlist (Bazino-relevant, discovered 2026-09-14). */
export const DEFAULT_WATCHLIST = [
  'kibrispostasi',      // Kıbrıs Postası — main TR news channel
  'haberkibriscom',     // Haber Kıbrıs — TR news + links
  'northcyprusfaq',     // RU community news (Northern Cyprus)
];
