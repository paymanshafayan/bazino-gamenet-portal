#!/usr/bin/env node
'use strict';
/*
 * اسکرول‌شات بصری: فعال‌سازی تب + حرکت ماوس + اسکرول مرحله‌ای + عکس در هر مرحله.
 *   node scroll-shots.js <match> <prefix> [steps] [dwellMs]
 * خروجی: <prefix>-00.jpg ... + JSON وضعیت هر مرحله (scrollY / docH)
 */
const fs = require('fs');
const { Cdp } = require('./lib');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  const match = process.argv[2];
  const prefix = process.argv[3];
  const steps = Number(process.argv[4] || 6);
  const dwell = Number(process.argv[5] || 1400);
  if (!match || !prefix) throw new Error('usage: node scroll-shots.js <match> <prefix> [steps] [dwellMs]');

  const cdp = new Cdp({ match });
  const { sessionId, target } = await cdp.attach();
  console.error('[shots] tab: «' + target.title.slice(0, 60) + '» ' + target.url);
  // فعال‌سازی تب (ضد فریز پس‌زمینهٔ کروم) + Page.enable
  await cdp.send('Target.activateTarget', { targetId: target.targetId }, { timeoutMs: 30000 });
  await cdp.send('Page.enable', {}, { sessionId, timeoutMs: 45000 });

  const vp = await cdp.evalRaw(sessionId, 'JSON.stringify({w:innerWidth,h:innerHeight,docH:document.documentElement.scrollHeight})', 30000);
  const { w, h } = JSON.parse(vp);
  console.error(`[shots] viewport ${w}x${h}`);

  const info = [];
  for (let i = 0; i < steps; i++) {
    // چند حرکت ماوس در ارتفاع فعلی (برای صحنه‌های تعاملی)
    const yBase = Math.round(h * 0.45);
    for (const fx of [0.3, 0.5, 0.7, 0.5]) {
      try {
        await cdp.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: Math.round(w * fx), y: yBase, button: 'none', buttons: 0 }, { sessionId, timeoutMs: 20000 });
        await sleep(180);
      } catch {}
    }
    await sleep(400);
    const r = await cdp.send('Page.captureScreenshot', { format: 'jpeg', quality: 78 }, { sessionId, timeoutMs: 90000 });
    const file = `${prefix}-${String(i).padStart(2, '0')}.jpg`;
    fs.writeFileSync(file, Buffer.from(r.data, 'base64'));
    const state = await cdp.evalRaw(sessionId, 'JSON.stringify({y:Math.round(scrollY),docH:document.documentElement.scrollHeight})', 30000);
    const st = JSON.parse(state);
    info.push({ step: i, file, ...st });
    console.error(`[shots] ${file} — scrollY=${st.y}/${st.docH}`);
    // اسکرول به پایین
    await cdp.evalRaw(sessionId, `window.scrollBy({top: Math.round(${h} * 0.85), behavior: 'smooth'})`, 30000);
    await sleep(dwell);
    if (st.y + h >= st.docH - 10) break; // به انتها رسیدیم
  }
  console.log(JSON.stringify(info, null, 1));
}

main().catch((e) => { console.error('SHOTS FAILED:', e.message); process.exit(1); });
