#!/usr/bin/env node
'use strict';
/*
 * ضبط خطاهای واقعی صفحه با هوک console/error قبل از لود (addScriptToEvaluateOnNewDocument) → ناوبری → جمع‌آوری.
 *   node capture-errors.js <url>
 * ⚠️ فقط یک‌بار در هر جلسه تزریق کن (تزریق دوباره → SyntaxError __push).
 */
const { Cdp } = require('./lib');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const HOOK = `
window.__errs = [];
window.__cons = [];
const __push = (kind, args) => { try { window.__errs.push(kind + ": " + args.map(a => { try { return typeof a === "string" ? a : (a && a.stack) ? a.stack : JSON.stringify(a); } catch { return String(a); } }).join(" | ")); } catch {} };
const ce = console.error.bind(console); console.error = (...a) => { __push("console.error", a); ce(...a); };
const cw = console.warn.bind(console); console.warn = (...a) => { try { window.__cons.push("warn: " + a.map(String).join(" | ").slice(0, 300)); } catch {} cw(...a); };
window.addEventListener("error", (e) => __push("window.onerror", [e.message + " @ " + (e.filename || "") + ":" + e.lineno + ":" + e.colno, e.error && e.error.stack].filter(Boolean)));
window.addEventListener("unhandledrejection", (e) => __push("unhandledrejection", [e.reason && (e.reason.stack || e.reason.message) || String(e.reason)]));
`;

async function main() {
  const url = process.argv[2] || 'https://bazino.pro/';
  const cdp = new Cdp({ match: 'bazino.pro' });
  const { sessionId } = await cdp.attach();
  await cdp.send('Page.addScriptToEvaluateOnNewDocument', { source: HOOK }, { sessionId });
  await cdp.send('Page.enable', {}, { sessionId });
  await cdp.send('Page.navigate', { url }, { sessionId });
  await sleep(10000);
  const errs = await cdp.evalRaw(sessionId, 'JSON.stringify((window.__errs||[]).slice(0,40))');
  console.log('=== ERRORS (' + url + ') ===');
  try { console.log(JSON.stringify(JSON.parse(errs), null, 1)); } catch { console.log(errs); }
}

main().catch((e) => { console.error('CAPTURE FAILED:', e.message); process.exit(1); });
