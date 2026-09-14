#!/usr/bin/env node
'use strict';
/*
 * Bazino CDP Bridge Relay — v7 (Node.js, zero dependencies)
 * HTTP واحد: /up /down /status /report + ایجنت: /agent/cmd /agent/poll (long-poll).
 * اجرا: node relay.js [code] [port]  (پیش‌فرض: .session-code، 8787، 0.0.0.0)
 * ⚠️ باید اولین پورت در حال گوش‌دادن سندباکس باشد تا Base عمومی (sbx-….arena.site) به آن برسد.
 * سند کامل: docs/ops/CDP_BROWSER_BRIDGE.md + cdp-tools/VISION.md
 */
const http = require('http');
const fs = require('fs');
const path = require('path');

const CODE = (process.argv[2] || fs.readFileSync(path.join(__dirname, '.session-code'), 'utf8')).trim();
const PORT = Number(process.argv[3] || process.env.PORT || 8787);
const HOST = process.env.HOST || '0.0.0.0';

const startedAt = Date.now();
const gen = String(startedAt);
let seqB = 0, seqA = 0;
const bridgeQ = [];
const agentQ = [];
let agentQBytes = 0;
let lastDown = 0, lastUp = 0, lastAgent = 0;
let upCount = 0, downCount = 0, cmdCount = 0;
const reports = [];
const MAX_Q = 400;
const MAX_AGENT_BYTES = 48 * 1024 * 1024;
const eventsFile = path.join(__dirname, 'relay-events.log');

function log(name, data) {
  const line = `${new Date().toISOString()} ${name} ${typeof data === 'string' ? data : JSON.stringify(data)}`;
  try { console.log(line); } catch {}
  try { fs.appendFileSync(eventsFile, line + '\n'); } catch {}
}
function pushB(d) { bridgeQ.push({ seq: ++seqB, d }); while (bridgeQ.length > MAX_Q) bridgeQ.shift(); }
function pushA(d) { const f = { seq: ++seqA, d }; agentQ.push(f); agentQBytes += d.length; while (agentQ.length > MAX_Q || agentQBytes > MAX_AGENT_BYTES) { const x = agentQ.shift(); if (!x) break; agentQBytes -= x.d.length; } }
function readBody(req, limit = 96 * 1024 * 1024) {
  return new Promise((resolve, reject) => {
    const chunks = []; let n = 0;
    req.on('data', (c) => { n += c.length; if (n > limit) { reject(new Error('body too large')); req.destroy(); return; } chunks.push(c); });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}
function sendJson(res, code, obj) { const b = JSON.stringify(obj); res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8' }); res.end(b); }
function maybeWelcome() {
  const gap = Date.now() - lastDown;
  if (lastDown === 0 || gap > 10000) {
    pushB(JSON.stringify({ id: -1, method: '_relay_welcome_bridge', params: { ts: Date.now(), gen } }));
    pushA(JSON.stringify({ id: -2, method: '_relay_welcome_agent', params: { ts: Date.now(), note: 'bridge session started' } }));
    log('BRIDGE_SESSION_NEW', { gapMs: lastDown === 0 ? null : gap });
  }
}

const server = http.createServer(async (req, res) => {
  const u = new URL(req.url, 'http://relay.local');
  const p = u.pathname, q = u.searchParams;
  const authed = q.get('code') === CODE;
  let closed = false; res.on('close', () => { closed = true; });
  try {
    if (p === '/' || p === '/index.html' || p === '/bridge.html') {
      if (req.method === 'HEAD') { res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }); res.end(); return; }
      let html = fs.readFileSync(path.join(__dirname, 'bridge.html'), 'utf8');
      html = html.split('__CODE__').join(CODE).split('__GEN__').join(gen).split('__STARTED__').join(new Date(startedAt).toISOString());
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }); res.end(html); return;
    }
    if (p === '/report') {
      const ev = q.get('ev') || 'unknown'; const d = String(q.get('d') || '').slice(0, 2000);
      reports.push({ t: new Date().toISOString(), ev, d }); if (reports.length > 60) reports.shift();
      log('REPORT', { ev, d: d.slice(0, 500) });
      return sendJson(res, 200, { ok: true });
    }
    if (p === '/status') {
      if (!authed) return sendJson(res, 403, { ok: false, error: 'bad code' });
      const now = Date.now();
      return sendJson(res, 200, {
        ok: true, gen, uptime_s: Math.round((now - startedAt) / 1000),
        http_bridge_alive: lastDown > 0 && now - lastDown < 15000, bridge_up_seen: upCount > 0,
        last_down_ago_ms: lastDown ? now - lastDown : null, last_up_ago_ms: lastUp ? now - lastUp : null,
        agent_alive: lastAgent > 0 && now - lastAgent < 30000, agent_seen_ago_ms: lastAgent ? now - lastAgent : null,
        queue_len: bridgeQ.length, agent_queue_len: agentQ.length,
        frames_to_chrome: seqB, frames_from_chrome: seqA, up_count: upCount, down_count: downCount, cmd_count: cmdCount,
        reports: reports.slice(-12),
      });
    }
    if (p === '/up') {
      if (!authed) return sendJson(res, 403, { ok: false, error: 'bad code' });
      if (req.method !== 'POST') return sendJson(res, 405, { ok: false, error: 'POST required' });
      const body = await readBody(req);
      const lines = body.split('\n').map((s) => s.trim()).filter(Boolean);
      for (const line of lines) pushA(line);
      lastUp = Date.now(); upCount++;
      if (upCount === 1 || upCount % 50 === 0) log('BRIDGE_UP', { frames: lines.length, bytes: body.length, n: upCount });
      return sendJson(res, 200, { ok: true, accepted: lines.length });
    }
    if (p === '/down') {
      if (!authed) return sendJson(res, 403, { ok: false, error: 'bad code' });
      maybeWelcome();
      const after = Number(q.get('after') || 0) || 0;
      while (bridgeQ.length && bridgeQ[0].seq <= after) bridgeQ.shift();
      lastDown = Date.now(); downCount++;
      return sendJson(res, 200, { gen, frames: bridgeQ.filter((f) => f.seq > after) });
    }
    if (p === '/agent/cmd') {
      if (!authed) return sendJson(res, 403, { ok: false, error: 'bad code' });
      if (req.method !== 'POST') return sendJson(res, 405, { ok: false, error: 'POST required' });
      const body = await readBody(req);
      let cmds;
      try { const parsed = JSON.parse(body); cmds = Array.isArray(parsed) ? parsed : [parsed]; }
      catch (e) { return sendJson(res, 400, { ok: false, error: 'bad json: ' + e.message }); }
      for (const c of cmds) pushB(typeof c === 'string' ? c : JSON.stringify(c));
      cmdCount++;
      if (cmdCount <= 5 || cmdCount % 25 === 0) log('AGENT_CMD', { n: cmdCount, methods: cmds.map((c) => c && c.method).join(',') });
      return sendJson(res, 200, { ok: true, seqA, seqB });
    }
    if (p === '/agent/poll') {
      if (!authed) return sendJson(res, 403, { ok: false, error: 'bad code' });
      const after0 = Number(q.get('after') || 0) || 0;
      const wait = Math.min(Number(q.get('wait') || 0) || 0, 25000);
      while (agentQ.length && agentQ[0].seq <= after0) { const x = agentQ.shift(); agentQBytes -= x.d.length; }
      lastAgent = Date.now();
      const deadline = Date.now() + wait;
      const pollOnce = () => {
        if (closed) return;
        const frames = agentQ.filter((f) => f.seq > after0);
        if (frames.length || Date.now() >= deadline) return sendJson(res, 200, { gen, frames });
        setTimeout(pollOnce, 60);
      };
      return pollOnce();
    }
    if (p === '/favicon.ico') { res.writeHead(204); res.end(); return; }
    return sendJson(res, 404, { ok: false, error: 'not found: ' + p });
  } catch (e) {
    log('HTTP_ERROR', { p, err: e.message });
    try { sendJson(res, 500, { ok: false, error: e.message }); } catch {}
  }
});

server.listen(PORT, HOST, () => {
  log('RELAY_LISTENING', { port: PORT, host: HOST, gen, pid: process.pid, node: process.version });
  console.log(`relay v7 listening on http://${HOST}:${PORT} (gen=${gen})`);
});
setInterval(() => { log('HEARTBEAT', { down_count: downCount, up_count: upCount, cmd_count: cmdCount, queue_len: bridgeQ.length, agent_queue_len: agentQ.length }); }, 120000).unref();
process.on('SIGTERM', () => { log('RELAY_STOP', {}); process.exit(0); });
process.on('uncaughtException', (e) => { log('UNCAUGHT', { err: e.message, stack: String(e.stack).slice(0, 400) }); });
