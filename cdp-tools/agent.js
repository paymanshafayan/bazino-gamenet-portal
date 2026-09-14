#!/usr/bin/env node
'use strict';
/*
 * CLI ایجنت پل CDP — node agent.js status|tabs|nav <url> [match]|eval "<js>" [match]|shot <file> [match]
 */
const fs = require('fs');
const { Cdp } = require('./lib');

async function main() {
  const [cmd, ...rest] = process.argv.slice(2);
  if (!cmd) {
    console.error('Usage: node agent.js status|tabs|nav <url> [match]|eval "<js>" [match]|shot <file> [match]');
    process.exit(1);
  }
  const cdp = new Cdp();

  if (cmd === 'status') { console.log(JSON.stringify(await cdp.status(), null, 2)); return; }

  if (cmd === 'tabs') {
    const { all } = await cdp.findTab('');
    for (const t of all) console.log(`[${t.type}] ${t.targetId.slice(0, 14)}  «${t.title}»  —  ${t.url}`);
    return;
  }

  if (cmd === 'nav') {
    const url = rest[0]; const match = rest[1] || '';
    if (!url) throw new Error('nav: url لازم است');
    const { sessionId, target } = await cdp.attach(match);
    console.log(`tab: «${target.title}» ${target.url}`);
    await cdp.send('Page.enable', {}, { sessionId });
    const nav = await cdp.send('Page.navigate', { url }, { sessionId });
    console.log(`navigating → ${url} (frameId=${nav.frameId})`);
    const ev = await cdp.waitEvent((m) =>
      m.sessionId === sessionId &&
      (m.method === 'Page.loadEventFired' ||
        (m.method === 'Page.frameStoppedLoading' && m.params && m.params.frameId === nav.frameId)), 25000);
    console.log(ev ? `load complete (${ev.method})` : 'load wait timed out — ادامه بده، صفحه شاید هنوز در حال بارگذاری است');
    return;
  }

  if (cmd === 'eval') {
    const code = rest[0]; const match = rest[1] || '';
    if (!code) throw new Error('eval: کد js لازم است');
    const v = await cdp.evalInPage(code, { match, timeoutMs: 120000 });
    if (typeof v === 'string') console.log(v);
    else console.log(JSON.stringify(v, null, 2));
    return;
  }

  if (cmd === 'shot') {
    const file = rest[0]; const match = rest[1] || '';
    if (!file) throw new Error('shot: مسیر فایل لازم است');
    const { sessionId } = await cdp.attach(match);
    const r = await cdp.send('Page.captureScreenshot', { format: 'jpeg', quality: 80 }, { sessionId, timeoutMs: 60000 });
    fs.writeFileSync(file, Buffer.from(r.data, 'base64'));
    console.log(`saved ${file} (${Buffer.from(r.data, 'base64').length} bytes)`);
    return;
  }

  throw new Error('دستور ناشناخته: ' + cmd);
}

main().catch((e) => { console.error('AGENT ERROR:', e.message); process.exit(1); });
