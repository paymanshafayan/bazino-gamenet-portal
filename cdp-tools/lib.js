'use strict';
/*
 * کتابخانهٔ سمت ایجنت — کلاینت رله + کلاینت سبک CDP (بدون وابستگی).
 * env: CDP_RELAY_URL (پیش‌فرض http://127.0.0.1:8787) و CDP_CODE (پیش‌فرض .session-code)
 */
const http = require('http');
const fs = require('fs');
const path = require('path');

const RELAY = process.env.CDP_RELAY_URL || 'http://127.0.0.1:8787';

function getCode() {
  if (process.env.CDP_CODE) return process.env.CDP_CODE.trim();
  return fs.readFileSync(path.join(__dirname, '.session-code'), 'utf8').trim();
}

function request(method, p, body, timeoutMs = 30000) {
  return new Promise((resolve, reject) => {
    const u = new URL(p, RELAY);
    const payload = body == null ? null : Buffer.from(body, 'utf8');
    const headers = payload
      ? { 'Content-Type': 'application/json; charset=utf-8', 'Content-Length': payload.length }
      : {};
    const req = http.request(u, { method, headers }, (res) => {
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => {
        const text = Buffer.concat(chunks).toString('utf8');
        try { resolve(JSON.parse(text)); } catch (e) { reject(new Error(`bad json from relay (${res.statusCode}): ${text.slice(0, 200)}`)); }
      });
    });
    req.on('error', reject);
    req.setTimeout(timeoutMs, () => req.destroy(new Error('relay request timeout')));
    if (payload) req.write(payload);
    req.end();
  });
}

class Cdp {
  constructor(opts = {}) {
    this.match = opts.match || '';
    this.nextId = 0;
    this.code = getCode();
  }
  get(p) { return request('GET', p + (p.includes('?') ? '&' : '?') + 'code=' + this.code); }
  post(p, body) { return request('POST', p + (p.includes('?') ? '&' : '?') + 'code=' + this.code, body); }
  status() { return this.get('/status'); }

  async send(method, params, opts = {}) {
    const id = ++this.nextId;
    const cmd = { id, method, params: params || {} };
    if (opts.sessionId) cmd.sessionId = opts.sessionId;
    const st = await this.post('/agent/cmd', JSON.stringify(cmd));
    if (!st || !st.ok) throw new Error('agent/cmd failed: ' + JSON.stringify(st));
    let after = st.seqA;
    const deadline = Date.now() + (opts.timeoutMs || 45000);
    while (Date.now() < deadline) {
      const r = await this.get(`/agent/poll?after=${after}&wait=1000`);
      if (!r || !Array.isArray(r.frames)) throw new Error('bad poll: ' + JSON.stringify(r));
      for (const f of r.frames) {
        if (f.seq > after) after = f.seq;
        let msg = null;
        try { msg = JSON.parse(f.d); } catch { continue; }
        if (msg && msg.id === id) {
          if (msg.error) throw new Error(`CDP ${method} error: ${JSON.stringify(msg.error).slice(0, 400)}`);
          return msg.result;
        }
        if (opts.onEvent && msg && msg.method && !msg.id) {
          const stop = opts.onEvent(msg);
          if (stop) return { __event: msg };
        }
      }
    }
    throw new Error(`timeout (${opts.timeoutMs || 45000}ms) waiting for ${method} #${id} — آیا پل زنده است؟ (agent.js status)`);
  }

  async waitEvent(predicate, timeoutMs = 20000) {
    const st = await this.status();
    let after = st.frames_from_chrome || 0;
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      const r = await this.get(`/agent/poll?after=${after}&wait=1000`);
      for (const f of r.frames || []) {
        if (f.seq > after) after = f.seq;
        let msg;
        try { msg = JSON.parse(f.d); } catch { continue; }
        if (msg && msg.method && predicate(msg)) return msg;
      }
    }
    return null;
  }

  async findTab(match) {
    const m = match == null || match === '' ? (this.match || '') : match;
    const r = await this.send('Target.getTargets');
    const pages = (r.targetInfos || []).filter((t) => t.type === 'page' && !/^devtools:\/\//.test(t.url || ''));
    if (!pages.length) throw new Error('هیچ تبِ صفحه‌ای پیدا نشد');
    let t = null;
    if (m) t = pages.find((pg) => (pg.url || '').includes(m) || (pg.title || '').includes(m));
    if (!t) t = pages[0];
    return { target: t, all: pages };
  }

  async attach(match) {
    const { target, all } = await this.findTab(match);
    const r = await this.send('Target.attachToTarget', { targetId: target.targetId, flatten: true });
    return { sessionId: r.sessionId, target, all };
  }

  async evalRaw(sessionId, expression, timeoutMs = 60000) {
    const r = await this.send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true }, { sessionId, timeoutMs });
    if (r.exceptionDetails) {
      const ex = r.exceptionDetails;
      const txt = (ex.exception && (ex.exception.description || ex.exception.value)) || ex.text;
      throw new Error('خطای eval در صفحه: ' + String(txt).slice(0, 600));
    }
    return r.result ? r.result.value : undefined;
  }

  async evalInPage(expression, opts = {}) {
    const { sessionId } = await this.attach(opts.match);
    return this.evalRaw(sessionId, expression, opts.timeoutMs || 60000);
  }
}

module.exports = { Cdp, request, getCode, RELAY };
