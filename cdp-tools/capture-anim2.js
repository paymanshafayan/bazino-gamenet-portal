#!/usr/bin/env node
'use strict';
/*
 * شکار انیمیشن ورود — نسخهٔ ۲: پیدا کردن عناصر «پیش از ورود» و تماشای تغییر opacity/transform آن‌ها لحظه‌به‌لحظه هنگام اسکرول نرم.
 *   node capture-anim2.js <match> <prefix>
 */
const fs = require('fs');
const { Cdp } = require('./lib');
const crypto = require('crypto');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const FIND_CANDIDATES = `(() => {
  const out = { globals: Object.keys(window).filter(k => /gsap|framer|motion|lenis|lottie|react|embla|swiper/i.test(k)).slice(0, 16), candidates: [] };
  const all = [...document.querySelectorAll('div, section, li, article, a, img, h2, h3, span')];
  for (const el of all) {
    const r = el.getBoundingClientRect();
    if (r.width < 140 || r.height < 80) continue;
    const st = getComputedStyle(el);
    const below = r.top > innerHeight && r.top < innerHeight + 2600;
    const hidden = parseFloat(st.opacity) < 0.05;
    const hasTrans = st.transitionDuration && parseFloat(st.transitionDuration) > 0.15;
    const hasRevealClass = /reveal|animate|motion|fade|slide|appear|enter/i.test(String(el.className));
    if (below && (hidden || hasRevealClass) && (hasTrans || hidden)) {
      out.candidates.push({ tag: el.tagName, cls: String(el.className).slice(0, 110), top: Math.round(r.top + scrollY), w: Math.round(r.width), h: Math.round(r.height), opacity: st.opacity, transform: st.transform !== 'none' ? st.transform.slice(0, 60) : 'none', transDur: st.transitionDuration, transProp: st.transitionProperty.slice(0, 80) });
      if (out.candidates.length >= 10) break;
    }
  }
  out.y = Math.round(scrollY); out.docH = document.documentElement.scrollHeight; out.vph = innerHeight;
  return JSON.stringify(out);
})()`;

const SAMPLE = `(ys) => (() => {
  const res = [];
  for (const y of ys) {
    const el = document.querySelector(y.sel);
    if (!el) { res.push({ i: y.i, gone: true }); continue; }
    const st = getComputedStyle(el);
    res.push({ i: y.i, opacity: st.opacity, transform: st.transform !== 'none' ? st.transform.slice(0, 70) : 'none' });
  }
  return JSON.stringify({ t: Math.round(performance.now()), scrollY: Math.round(scrollY), res });
})()`;

async function main() {
  const match = process.argv[2];
  const prefix = process.argv[3];
  if (!match || !prefix) throw new Error('usage: node capture-anim2.js <match> <prefix>');

  const cdp = new Cdp({ match });
  const { sessionId, target } = await cdp.attach();
  console.error('[anim2] tab: «' + target.title.slice(0, 50) + '»');
  await cdp.send('Target.activateTarget', { targetId: target.targetId }, { timeoutMs: 30000 });
  await cdp.send('Page.enable', {}, { sessionId, timeoutMs: 45000 });

  const probe = JSON.parse(await cdp.evalRaw(sessionId, FIND_CANDIDATES, 45000));
  console.error('[anim2] globals:', probe.globals.join(', '));
  console.error('[anim2] کاندیدها:', probe.candidates.length);
  for (const c of probe.candidates.slice(0, 8)) console.error(`  ${c.tag}.${c.cls.slice(0, 60)} top=${c.top} op=${c.opacity} trans=${c.transDur} [${c.transProp.slice(0, 40)}]`);

  if (!probe.candidates.length) {
    console.log(JSON.stringify({ probe, note: 'هیچ عنصر پنهان پایین‌تر پیدا نشد — شاید همه از قبل reveal شده‌اند' }, null, 1));
    return;
  }

  // اسکرول نرم به اولین کاندید (طوری که وسط ویوپورت بیفتد)
  const first = probe.candidates[0];
  const targetY = Math.max(0, first.top - Math.round(probe.vph * 0.35));
  console.error(`[anim2] اسکرول نرم از y=${probe.y} به y=${targetY}`);
  await cdp.evalRaw(sessionId, `window.scrollTo({top: ${targetY}, behavior: 'smooth'})`, 20000);

  // نمونه‌برداری هر ۲۰۰ms — opacity/transform کاندیدها + عکس
  const sels = probe.candidates.slice(0, 6).map((c, i) => ({ i, sel: buildSelector(c), top: c.top }));
  function buildSelector(c) { return null; } // جایگزین می‌شود — از index استفاده می‌کنیم

  // چون selector نداریم، از روش جایگزین: هر بار همان جستجو را اجرا کن و به ترتیب index بگیر
  const SAMPLE_BY_INDEX = `(() => {
    const all = [...document.querySelectorAll('div, section, li, article, a, img, h2, h3, span')];
    const found = [];
    for (const el of all) {
      const r = el.getBoundingClientRect();
      if (r.width < 140 || r.height < 80) continue;
      const st = getComputedStyle(el);
      const inView = r.top < innerHeight && r.bottom > 0;
      const hasTrans = st.transitionDuration && parseFloat(st.transitionDuration) > 0.15;
      const hasRevealClass = /reveal|animate|motion|fade|slide|appear|enter/i.test(String(el.className));
      if ((inView || r.top < innerHeight + 2600) && (hasRevealClass || parseFloat(st.opacity) < 1) && hasTrans) {
        found.push({ cls: String(el.className).slice(0, 100), rect: { top: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height) }, opacity: st.opacity, transform: st.transform !== 'none' ? st.transform.slice(0, 60) : 'none' });
        if (found.length >= 12) break;
      }
    }
    return JSON.stringify({ scrollY: Math.round(scrollY), found });
  })()`;

  const timeline = [];
  for (let t = 0; t < 12; t++) {
    const snap = JSON.parse(await cdp.evalRaw(sessionId, SAMPLE_BY_INDEX, 20000));
    const r = await cdp.send('Page.captureScreenshot', { format: 'jpeg', quality: 65 }, { sessionId, timeoutMs: 60000 });
    const file = `${prefix}-t${String(t).padStart(2, '0')}.jpg`;
    fs.writeFileSync(file, Buffer.from(r.data, 'base64'));
    timeline.push({ t, scrollY: snap.scrollY, n: snap.found.length, items: snap.found.slice(0, 6).map((f) => ({ op: f.opacity, tr: f.transform.slice(0, 30), top: f.rect.top })) });
    console.error(`[anim2] t${t} y=${snap.scrollY} — عناصر انیمیشنی در ویو: ${snap.found.filter(f => f.rect.top < 1000).length}, opacityها: ${snap.found.slice(0, 4).map(f => f.opacity).join(',')}`);
    await sleep(200);
  }

  console.log(JSON.stringify({ globals: probe.globals, targetY, timeline }, null, 1));
}

main().catch((e) => { console.error('ANIM2 FAILED:', e.message); process.exit(1); });
