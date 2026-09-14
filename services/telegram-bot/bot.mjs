#!/usr/bin/env node
/**
 * bot.mjs — Bazino Telegram bot (BotFather bot, zero dependencies).
 *
 * Capabilities (all ToS-compliant):
 *   • Publish posts/photos to the Bazino channel (bot must be added as channel admin).
 *   • Post announcements to groups the bot was ADDED to by a member
 *     (Telegram bots cannot join groups by themselves — no such API exists;
 *     auto-joining with userbots violates Telegram anti-spam rules → not built).
 *   • Search public channel buzz via t.me/s/ web previews (no token needed).
 *   • Background keyword watcher → alerts the owner.
 *
 * Security: owner-only commands (TG_OWNER_IDS), rate limits per group
 * (max 3/3h + 60s gap), HTML-escaped output, token never logged.
 *
 * Run (PowerShell):
 *   $env:TG_BOT_TOKEN='123:ABC'; $env:TG_OWNER_IDS='11111111';
 *   $env:TG_CHANNEL='@bazinochannel'; node services/telegram-bot/bot.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseTmeS, recentPosts, searchPosts, parseViews } from './tme.mjs';
import {
  escapeHtml, parseCommand, isOwner, matchKeywords, formatHit,
  RateLimiter, DEFAULT_WATCHLIST, DEFAULT_KEYWORDS,
} from './lib.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const TOKEN = (process.env.TG_BOT_TOKEN || '').trim();
const OWNER_IDS = (process.env.TG_OWNER_IDS || '').trim();
const CHANNEL = (process.env.TG_CHANNEL || '').trim();            // e.g. @bazino
const WATCH_INTERVAL_MIN = Number(process.env.TG_WATCH_MIN || 15);
const STATE_PATH = process.env.TG_STATE_PATH || path.join(HERE, 'state.json');

if (!TOKEN) { console.error('[bot] TG_BOT_TOKEN missing'); process.exit(1); }
if (!OWNER_IDS) { console.error('[bot] TG_OWNER_IDS missing (comma-separated numeric ids)'); process.exit(1); }

const API = `https://api.telegram.org/bot${TOKEN}`;
const startedAt = Date.now();
const limiter = new RateLimiter({ maxPerWindow: 3, windowMs: 3 * 3600e3, minGapMs: 60e3 });
let stats = { sent: 0, scans: 0, hits: 0, lastScan: null, updates: 0 };

/* ── state (seen posts + known groups) ── */
function loadState() {
  try { return JSON.parse(fs.readFileSync(STATE_PATH, 'utf8')); } catch { return { seen: [], groups: {}, hits: [] }; }
}
function saveState() {
  try {
    state.seen = state.seen.slice(-2000);
    state.hits = state.hits.slice(-200);
    fs.writeFileSync(STATE_PATH, JSON.stringify(state, null, 2));
  } catch (e) { console.error('[bot] state save failed:', e.message); }
}
const state = loadState();

/* ── Telegram API helpers ── */
async function api(method, payload, retries = 2) {
  const res = await fetch(`${API}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (res.status === 429 && retries > 0) {
    const j = await res.json().catch(() => ({}));
    const wait = ((j.parameters || {}).retry_after || 3) * 1000;
    console.error(`[bot] 429 — waiting ${wait}ms`);
    await new Promise((r) => setTimeout(r, wait));
    return api(method, payload, retries - 1);
  }
  const j = await res.json().catch(() => ({}));
  if (!j.ok) throw new Error(`${method} → ${res.status} ${j.description || ''}`);
  return j.result;
}
const reply = (chatId, text, extra = {}) =>
  api('sendMessage', { chat_id: chatId, text, parse_mode: 'HTML', disable_web_page_preview: true, ...extra });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/* ── t.me/s fetcher (public previews only) ── */
async function fetchChannelPosts(chan) {
  const res = await fetch(`https://t.me/s/${encodeURIComponent(chan)}`, {
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126 Safari/537.36' },
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) throw new Error(`t.me/s/${chan} → HTTP ${res.status}`);
  return parseTmeS(await res.text(), chan);
}

/* ── commands ── */
const HELP = [
  '<b>Bazino Bot</b> — owner commands:',
  '/post &lt;text&gt; — publish text to the channel',
  '/photo &lt;caption&gt; — publish the photo you REPLY to (with caption)',
  '/announce &lt;text&gt; — send to all known groups (rate-limited)',
  '/groups — list groups the bot lives in',
  '/search &lt;terms&gt; — search watched public channels (72h)',
  '/watch — recent keyword hits',
  '/status — health',
  '/id — this chat id',
].join('\n');

async function handleCommand(msg) {
  const parsed = parseCommand(msg.text || '');
  if (!parsed) return;
  const chatId = msg.chat.id;
  const { cmd, args } = parsed;

  if (cmd === 'start' || cmd === 'help') {
    if (isOwner(msg.from?.id, OWNER_IDS)) return reply(chatId, HELP);
    return reply(chatId, `This bot is private. Your Telegram id: <code>${msg.from?.id}</code>`);
  }
  if (!isOwner(msg.from?.id, OWNER_IDS)) return reply(chatId, '⛔ Owner only.');

  switch (cmd) {
    case 'id':
      return reply(chatId, `chat: <code>${chatId}</code> · user: <code>${msg.from?.id}</code> · type: ${msg.chat.type}`);

    case 'status': {
      const groups = Object.keys(state.groups).length;
      return reply(chatId, [
        '<b>Bot status</b>',
        `uptime: ${Math.round((Date.now() - startedAt) / 60000)} min`,
        `updates: ${stats.updates} · sent: ${stats.sent}`,
        `scans: ${stats.scans} · last: ${stats.lastScan || 'never'} · hits: ${stats.hits}`,
        `channel: ${CHANNEL || '(not set)'}`,
        `groups: ${groups}`,
        `watchlist: ${DEFAULT_WATCHLIST.join(', ')}`,
      ].join('\n'));
    }

    case 'post': {
      if (!CHANNEL) return reply(chatId, '⛔ TG_CHANNEL not configured.');
      if (!args) return reply(chatId, 'Usage: /post <text>');
      await api('sendMessage', { chat_id: CHANNEL, text: args, parse_mode: 'HTML' });
      stats.sent++;
      return reply(chatId, `✅ Posted to ${CHANNEL}`);
    }

    case 'photo': {
      if (!CHANNEL) return reply(chatId, '⛔ TG_CHANNEL not configured.');
      const photo = msg.reply_to_message?.photo?.[msg.reply_to_message.photo.length - 1];
      if (!photo) return reply(chatId, 'Reply to a photo with /photo <caption>.');
      await api('sendPhoto', { chat_id: CHANNEL, photo: photo.file_id, caption: args || '' });
      stats.sent++;
      return reply(chatId, `✅ Photo posted to ${CHANNEL}`);
    }

    case 'groups': {
      const ids = Object.keys(state.groups);
      if (!ids.length) return reply(chatId, 'No groups yet. Add the bot to a group (group → Add member → this bot).');
      return reply(chatId, ids.map((id) => `• ${escapeHtml(state.groups[id] || '')} — <code>${id}</code>`).join('\n'));
    }

    case 'announce': {
      if (!args) return reply(chatId, 'Usage: /announce <text>');
      const ids = Object.keys(state.groups);
      if (!ids.length) return reply(chatId, 'No groups known yet.');
      const results = [];
      for (const id of ids) {
        const v = limiter.allow(id);
        if (!v.ok) { results.push(`⏭ ${state.groups[id] || id}: skipped (${v.reason})`); continue; }
        try {
          await api('sendMessage', { chat_id: id, text: args, parse_mode: 'HTML' });
          stats.sent++;
          results.push(`✅ ${state.groups[id] || id}`);
          await sleep(3000); // gentle pacing between groups (anti-spam)
        } catch (e) {
          results.push(`❌ ${state.groups[id] || id}: ${escapeHtml(e.message.slice(0, 80))}`);
        }
      }
      return reply(chatId, results.join('\n'));
    }

    case 'search': {
      if (!args) return reply(chatId, 'Usage: /search <terms>');
      await reply(chatId, `🔎 Searching ${DEFAULT_WATCHLIST.length} channels…`);
      let found = [];
      for (const chan of DEFAULT_WATCHLIST) {
        try { found.push(...recentPosts(await fetchChannelPosts(chan), 72)); }
        catch (e) { console.error(`[bot] scan ${chan}: ${e.message}`); }
      }
      const hits = searchPosts(found, args).slice(0, 8);
      if (!hits.length) return reply(chatId, 'No matches in the last 72h.');
      return reply(chatId, hits.map((p) => formatHit(p)).join('\n\n'));
    }

    case 'watch': {
      const recent = state.hits.slice(-8).reverse();
      if (!recent.length) return reply(chatId, `No keyword hits yet (keywords: ${DEFAULT_KEYWORDS.slice(0, 6).join(', ')}…).`);
      return reply(chatId, recent.map((h) => formatHit(h.post, h.hits)).join('\n\n'));
    }

    default:
      return reply(chatId, 'Unknown command. /help');
  }
}

/* ── update routing (long polling) ── */
async function processUpdate(u) {
  stats.updates++;
  // track group membership changes (added/kicked)
  const cm = u.my_chat_member || u.chat_member;
  if (cm?.chat && (cm.chat.type === 'group' || cm.chat.type === 'supergroup')) {
    const was = cm.old_chat_member?.status, now = cm.new_chat_member?.status;
    if (now === 'member' || now === 'administrator') {
      state.groups[cm.chat.id] = cm.chat.title || '';
      console.log(`[bot] joined group: ${cm.chat.title} (${cm.chat.id})`);
      saveState();
    } else if ((was === 'member' || was === 'administrator') && (now === 'kicked' || now === 'left')) {
      delete state.groups[cm.chat.id];
      console.log(`[bot] left group: ${cm.chat.title} (${cm.chat.id})`);
      saveState();
    }
  }
  if (u.message?.text) await handleCommand(u.message).catch((e) => console.error('[bot] handle:', e.message));
}

/* ── background watcher: public channel buzz → owner alerts ── */
async function scanWatch() {
  stats.scans++;
  stats.lastScan = new Date().toISOString();
  for (const chan of DEFAULT_WATCHLIST) {
    let posts;
    try { posts = recentPosts(await fetchChannelPosts(chan), 24); }
    catch (e) { console.error(`[bot] watch ${chan}: ${e.message}`); continue; }
    for (const p of posts) {
      const key = `${p.channel}/${p.id}`;
      if (state.seen.includes(key)) continue;
      state.seen.push(key);
      const hits = matchKeywords(p.text);
      if (hits.length && parseViews(p.views) >= 300) { // only non-trivial posts
        state.hits.push({ post: p, hits });
        stats.hits++;
        for (const ownerId of OWNER_IDS.split(',')) {
          await reply(ownerId.trim(), `🎯 <b>Keyword hit</b>\n${formatHit(p, hits)}`).catch(() => {});
        }
      }
    }
  }
  saveState();
}

/* ── main loop ── */
console.log(`[bot] starting — channel: ${CHANNEL || '(none)'} · owners: ${OWNER_IDS} · watch: every ${WATCH_INTERVAL_MIN} min`);
const me = await api('getMe', {});
console.log(`[bot] authorized as @${me.username}`);
await scanWatch().catch((e) => console.error('[bot] first scan:', e.message));
setInterval(() => scanWatch().catch((e) => console.error('[bot] scan:', e.message)), WATCH_INTERVAL_MIN * 60e3);

let offset = 0;
while (true) {
  try {
    const updates = await api('getUpdates', { timeout: 25, offset, allowed_updates: ['message', 'my_chat_member', 'chat_member'] });
    for (const u of updates) {
      offset = u.update_id + 1;
      await processUpdate(u);
    }
  } catch (e) {
    console.error('[bot] poll error:', e.message);
    await sleep(4000);
  }
}
