#!/usr/bin/env node
'use strict';
/*
 * تست نهایی انیمیشن اسکرول: ScrollTrigger؟ + reveal با رسیدن به ویوپورت؟ + فریم‌های حین اسکرول نرم.
 *   node capture-scrolltest.js <match> <prefix> [targetY]
 */
const fs = require('fs');
const { Cdp } = require('./lib');
const crypto = require('crypto');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  const match = process.argv[2];
  const prefix = process.argv[3];
  const targetY = Number(process.argv[4] || 6500);
  if (!match || !prefix) throw new Error('usage: node capture-scrolltest.js <match> <prefix> [targetY]');

  const cdp = new Cdp({ match });
  const { sessionId, target } = await cdp.attach();
  console.error('[st] tab: «' + target.title.slice(0, 50) + '»');
  await cdp.send('Target.activateTarget', { targetId: target.targetId }, { timeoutMs: 30000 });
  await cdp.send('Page.enable', {}, { sessionId, timeoutMs: 45000 });

  // ۱) GSAP / ScrollTrigger؟
  const tech = JSON.parse(await cdp.evalRaw(sessionId, `JSON.stringify({
    gsap: typeof gsap !== 'undefined' ? gsap.version : null,
    scrollTrigger: typeof ScrollTrigger !== 'undefined',
    gsapVersions: window.gsapVersions || null,
    y: Math.round(scrollY), docH: document.documentElement.scrollHeight, vph: innerHeight
  })`, 45000));
  console.error('[st] tech:', JSON.stringify(tech));

  // ۲) پرش آنی به قلمرو تازه — آیا عناصر با رسیدن به ویو reveal می‌شوند؟
  await cdp.evalRaw(sessionId, `window.scrollTo({top: ${targetY + 800}, behavior: 'auto'})`, 20000);
  await sleep(1500);
  const revealCheck = JSON.parse(await cdp.evalRaw(sessionId, `(() => {
    const inView = [...document.querySelectorAll('img, div, h2, h3, section > *')].filter(e => {
      const r = e.getBoundingClientRect();
      return r.width > 100 && r.height > 60 && r.top > 0 && r.top < innerHeight;
    });
    const hidden = inView.filter(e => parseFloat(getComputedStyle(e).opacity) < 0.95);
    return JSON.stringify({ inView: inView.length, hiddenInView: hidden.length, hiddenCls: hidden.slice(0, 5).map(e => String(e.className).slice(0, 70) + ' op=' + getComputedStyle(e).opacity) });
  })()`, 45000));
  console.error('[st] بعد از پرش به y=' + (targetY + 800) + ':', JSON.stringify(revealCheck));

  // ۳) برگشت به بالا و اسکرول نرم به پایین — فقط عکس، بدون eval
  await cdp.evalRaw(sessionId, `window.scrollTo({top: ${targetY}, behavior: 'auto'})`, 20000);
  await sleep(600);
  async function shot() {
    const r = await cdp.send('Page.captureScreenshot', { format: 'jpeg', quality: 62 }, { sessionId, timeoutMs: 60000 });
    return r.data;
  }
  // شروع اسکرول نرم و همزمان عکس‌ها
  const frames = [];
  const scrollP = cdp.evalRaw(sessionId, `window.scrollTo({top: ${targetY + 700}, behavior: 'smooth'})`, 20000).catch(() => {});
  for (let i = 0; i < 9; i++) {
    try {
      const d = await shot();
      const file = `${prefix}-s${String(i).padStart(2, '0')}.jpg`;
      fs.writeFileSync(file, Buffer.from(d, 'base64'));
      frames.push({ i, file, md5: crypto.createHash('md5').update(d).digest('hex').slice(0, 10), bytes: d.length });
    } catch (e) { console.error(`[st] s${i} خطا: ` + String(e.message).slice(0, 50)); }
    await sleep(300);
  }
  await scrollP;
  const uniq = new Set(frames.map((f) => f.md5)).size;
  console.error(`[st] فریم‌های یکتا حین اسکرول نرم: ${uniq}/${frames.length}`);
  for (const f of frames) console.error(`  s${f.i} ${f.md5} ${f.bytes}B`);

  console.log(JSON.stringify({ tech, revealCheck, frames, uniq }, null, 1));
}

main().catch((e) => { console.error('SCROLLTEST FAILED:', e.message); process.exit(1); });
