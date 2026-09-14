/**
 * tme.mjs — reader/parser for Telegram PUBLIC web previews (t.me/s/<channel>).
 *
 * Why: the Bot API cannot search Telegram, and MTProto "userbots" that scrape
 * or auto-join chats violate Telegram's anti-spam rules. Reading the public
 * web preview pages (t.me/s/...) is the ToS-compliant way to discover what is
 * trending in public channels — no token, no login, no rate-limit games.
 *
 * Pure module: no network here (bot.mjs fetches; tests feed fixtures).
 */

/** Minimal HTML entity decoding (covers what t.me previews emit). */
export function decodeEntities(s) {
  return String(s || '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)));
}

/** Strip tags + collapse whitespace (keeps <br/> as newline). */
export function stripTags(html) {
  return decodeEntities(
    String(html || '')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<[^>]+>/g, '')
  ).replace(/[ \t]+/g, ' ').trim();
}

/**
 * Parse a t.me/s/<channel> HTML document into posts.
 * Tolerant by design: we slice between data-post markers instead of building a DOM.
 * Returns [{ id, channel, text, views, timeISO, link }] (oldest → newest).
 */
export function parseTmeS(html, channelHint = '') {
  const out = [];
  if (!html || typeof html !== 'string') return out;
  const marks = [...html.matchAll(/data-post="([^"]+)"/g)];
  for (let i = 0; i < marks.length; i++) {
    const start = marks[i].index;
    const end = i + 1 < marks.length ? marks[i + 1].index : html.length;
    const block = html.slice(start, end);
    const postRef = marks[i][1]; // e.g. "kibrispostasi/12345"
    const chan = postRef.split('/')[0] || channelHint;
    const id = Number(postRef.split('/')[1] || 0);
    if (!id) continue;
    const textM = block.match(/tgme_widget_message_text[^>]*>([\s\S]*?)<\/div>/);
    const timeM = block.match(/<time[^>]*datetime="([^"]+)"/);
    const viewsM = block.match(/tgme_widget_message_views[^>]*>\s*([0-9.,KMBkmb]*)\s*</);
    out.push({
      id,
      channel: chan,
      text: stripTags(textM ? textM[1] : ''),
      views: viewsM ? viewsM[1].trim() : '',
      timeISO: timeM ? timeM[1] : '',
      link: `https://t.me/${chan}/${id}`,
    });
  }
  return out;
}

/** Parse view badges like "1.2K" / "3,4M" / "890" into a number (0 when unknown). */
export function parseViews(views) {
  const s = String(views || '').replace(/[\s]/g, '').replace(',', '.').toUpperCase();
  if (!s) return 0;
  const m = s.match(/^([0-9.]+)([KMB])?$/);
  if (!m) return 0;
  const n = Number(m[1]);
  const mult = m[2] === 'K' ? 1e3 : m[2] === 'M' ? 1e6 : m[2] === 'B' ? 1e9 : 1;
  return Math.round(n * mult);
}

/** Keep only posts newer than `hours` (0 = keep all; posts without time are kept). */
export function recentPosts(posts, hours = 72, now = Date.now()) {
  if (!hours) return posts;
  const cutoff = now - hours * 3600e3;
  return posts.filter((p) => {
    if (!p.timeISO) return true;
    return Date.parse(p.timeISO) >= cutoff;
  });
}

/** Search posts whose text contains every query term (case-insensitive). */
export function searchPosts(posts, query) {
  const terms = String(query || '').toLowerCase().split(/\s+/).filter(Boolean);
  if (!terms.length) return [];
  return posts.filter((p) => {
    const t = p.text.toLowerCase();
    return terms.every((term) => t.includes(term));
  });
}
