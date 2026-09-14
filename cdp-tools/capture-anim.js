#!/usr/bin/env node
'use strict';
/*
 * شکار انیمیشن ورود (scroll-entrance) + واکنش hover — تب جاری.
 *   node capture-anim.js <match> <prefix>
 * ۱) پرش آنی به سکشن تازه (پایین‌تر از همهٔ بازدیدهای قبلی) → عکس‌های متوالی هر ~۳۵۰ms
 * ۲) تست hover روی یک کارت تصویردار (transform قبل/بعد + عکس)
 */
const fs = require('fs');
const { Cdp } = require('./lib');
const crypto = require('crypto');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  const match = process.argv[2];
  const prefix = process.argv[3];
  if (!match || !prefix) throw new Error('usage: node capture-anim.js <match> <prefix>');

  const cdp = new Cdp({ match });
  const { sessionId, target } = await cdp.attach();
  console.error('[anim] tab: «' + target.title.slice(0, 50) + '»');
  await cdp.send('Target.activateTarget', { targetId: target.targetId }, { timeoutMs: 30000 });
  await cdp.send('Page.enable', {}, { sessionId, timeoutMs: 45000 });

  // ۱) پروب تکنولوژی انیمیشن
  const tech = JSON.parse(await cdp.evalRaw(sessionId, `(() => {
    const out = {};
    out.globals = Object.keys(window).filter(k => /gsap|framer|motion|lenis|scrolltrigger|lottie|spline|react/i.test(k)).slice(0, 20);
    out.scripts = [...document.querySelectorAll('script[src]')].map(s => s.src).filter(s => /gsap|framer|motion|lenis|lottie|anim|shopify/i.test(s)).slice(0, 12);
    let transitionRules = 0, keyframes = 0;
    try {
      for (const sheet of document.styleSheets) {
        try {
          for (const r of sheet.cssRules) {
            if (r.style && r.style.transition && r.style.transition !== 'none') transitionRules++;
            if (r.type === 7) keyframes++;
          }
        } catch (e) {}
      }
    } catch (e) {}
    out.transitionRules = transitionRules; out.keyframes = keyframes;
    out.ioSupported = typeof IntersectionObserver === 'function';
    out.docH = document.documentElement.scrollHeight;
    out.vp = { w: innerWidth, h: innerHeight };
    out.y = Math.round(scrollY);
    return JSON.stringify(out);
  })()`, 30000));
  console.error('[anim] tech:', JSON.stringify({ globals: tech.globals.slice(0, 8), scripts: tech.scripts.slice(0, 6), transitionRules: tech.transitionRules, keyframes: tech.keyframes, io: tech.ioSupported }));

  // ۲) پرش آنی به سکشن تازه — پایین‌تر از آخرین بازدید + یک صفحه
  const freshY = Math.min(tech.y + tech.vp.h * 2 + 600, tech.docH - tech.vp.h - 10);
  await cdp.evalRaw(sessionId, `window.scrollTo({top: ${freshY}, behavior: 'auto'})`, 20000);
  console.error('[anim] پرش به سکشن تازه y=' + freshY + ' (docH=' + tech.docH + ')');

  // عکس‌های متوالی — شکار وسط انیمیشن ورود
  async function shot() {
    const r = await cdp.send('Page.captureScreenshot', { format: 'jpeg', quality: 70 }, { sessionId, timeoutMs: 60000 });
    return r.data;
  }
  const frames = [];
  for (let i = 0; i < 7; i++) {
    const d = await shot();
    const file = `${prefix}-f${i}.jpg`;
    fs.writeFileSync(file, Buffer.from(d, 'base64'));
    const md5 = crypto.createHash('md5').update(Buffer.from(d, 'base64')).digest('hex').slice(0, 10);
    frames.push({ i, file, md5, bytes: d.length });
    console.error(`[anim] فريم ${i} → ${file} (${d.length}B, ${md5})`);
    await sleep(350);
  }
  const uniq = new Set(frames.map((f) => f.md5)).size;

  // ۳) تست hover روی یک کارت تصویردار در ویوپورت
  const hoverInfo = JSON.parse(await cdp.evalRaw(sessionId, `(() => {
    const els = [...document.querySelectorAll('a, div[class*="card" i], li')].filter(e => {
      const r = e.getBoundingClientRect();
      return r.width > 120 && r.height > 120 && r.top > 80 && r.bottom < innerHeight && (e.querySelector('img') || /card|item|product/i.test(e.className));
    });
    const el = els[Math.floor(els.length / 2)] || document.body;
    const r = el.getBoundingClientRect();
    const st = getComputedStyle(el);
    return JSON.stringify({ tag: el.tagName, cls: String(el.className).slice(0, 90), rect: { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) }, transformBefore: st.transform, transitionBefore: st.transition.slice(0, 120), cx: Math.round(r.x + r.width / 2), cy: Math.round(r.y + r.height / 2) });
  })()`, 30000));
  let hoverAfter = null;
  if (hoverInfo.cx) {
    try {
      await cdp.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: hoverInfo.cx, y: hoverInfo.cy, button: 'none', buttons: 0 }, { sessionId, timeoutMs: 20000 });
      await sleep(600);
      hoverAfter = JSON.parse(await cdp.evalRaw(sessionId, `(() => {
        const els = [...document.querySelectorAll('a, div[class*="card" i], li')].filter(e => {
          const r = e.getBoundingClientRect();
          return r.width > 120 && r.height > 120 && r.top > 80 && r.bottom < innerHeight && (e.querySelector('img') || /card|item|product/i.test(e.className));
        });
        const el = els[Math.floor(els.length / 2)] || document.body;
        const st = getComputedStyle(el);
        const hov = [...document.querySelectorAll(':hover')].map(e => e.tagName + '.' + String(e.className).split(' ')[0]).slice(-4);
        return JSON.stringify({ transformAfter: st.transform, hoverChain: hov });
      })()`, 30000));
      const hs = await shot();
      fs.writeFileSync(`${prefix}-hover.jpg`, Buffer.from(hs, 'base64'));
    } catch (e) { hoverAfter = { err: String(e.message).slice(0, 80) }; }
  }

  console.log(JSON.stringify({ tech: { globals: tech.globals, scripts: tech.scripts, transitionRules: tech.transitionRules, keyframes: tech.keyframes, io: tech.ioSupported }, freshY, frames, uniqFrames: uniq, hover: { before: hoverInfo, after: hoverAfter } }, null, 1));
}

main().catch((e) => { console.error('ANIM CAPTURE FAILED:', e.message); process.exit(1); });
