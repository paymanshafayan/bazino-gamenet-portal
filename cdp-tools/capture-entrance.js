#!/usr/bin/env node
'use strict';
/*
 * شکار انیمیشن ورود صفحه از لحظهٔ ریلود + تست hover-reveal پوسترها.
 *   node capture-entrance.js <match> <prefix>
 */
const fs = require('fs');
const { Cdp } = require('./lib');
const crypto = require('crypto');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  const match = process.argv[2];
  const prefix = process.argv[3];
  if (!match || !prefix) throw new Error('usage: node capture-entrance.js <match> <prefix>');

  const cdp = new Cdp({ match });
  const { sessionId, target } = await cdp.attach();
  console.error('[ent] tab: «' + target.title.slice(0, 50) + '»');
  await cdp.send('Target.activateTarget', { targetId: target.targetId }, { timeoutMs: 30000 });
  await cdp.send('Page.enable', {}, { sessionId, timeoutMs: 45000 });

  // ۱) ریلود و شکار فریم‌های ورود
  await cdp.evalRaw(sessionId, 'location.reload()', 10000).catch(() => {});
  console.error('[ent] ریلود شد — انتقال و اتصال مجدد…');
  await sleep(2600);
  // سشن قدیمی با ریلود مُرده — اتصال تازه
  let sid = null;
  for (let attempt = 0; attempt < 4 && !sid; attempt++) {
    try {
      const a = await cdp.attach(match);
      sid = a.sessionId;
      await cdp.send('Page.enable', {}, { sessionId: sid, timeoutMs: 30000 });
    } catch (e) { console.error('[ent] اتصال مجدد شکست: ' + String(e.message).slice(0, 70)); await sleep(2000); }
  }
  if (!sid) throw new Error('اتصال مجدد بعد از ریلود نشد');
  const S = { sessionId: sid };
  console.error('[ent] سشن تازه وصل شد — شکار فریم‌ها…');

  async function shot() {
    const r = await cdp.send('Page.captureScreenshot', { format: 'jpeg', quality: 60 }, { ...S, timeoutMs: 60000 });
    return r.data;
  }
  const frames = [];
  for (let i = 0; i < 14; i++) {
    try {
      const d = await shot();
      const file = `${prefix}-e${String(i).padStart(2, '0')}.jpg`;
      fs.writeFileSync(file, Buffer.from(d, 'base64'));
      frames.push({ i, file, md5: crypto.createHash('md5').update(d).digest('hex').slice(0, 10), bytes: d.length });
      console.error(`[ent] e${i} — ${d.length}B ${frames[frames.length - 1].md5}`);
    } catch (e) { console.error(`[ent] e${i} خطا: ${String(e.message).slice(0, 60)}`); }
    await sleep(280);
  }
  const uniq = new Set(frames.map((f) => f.md5)).size;
  console.error(`[ent] فریم‌های یکتا: ${uniq}/${frames.length}`);

  // ۲) تست hover-reveal: یک سلول گرید با پوستر opacity صفر پیدا کن، ماوس را رویش ببر
  let hoverTest = null;
  try {
    const before = JSON.parse(await cdp.evalRaw(S.sessionId, `(() => {
      const posters = [...document.querySelectorAll('img')].filter(im => {
        const r = im.getBoundingClientRect();
        const st = getComputedStyle(im);
        return r.width > 150 && r.height > 100 && r.top > 60 && r.top < innerHeight - 60 && parseFloat(st.opacity) < 0.1;
      });
      if (!posters.length) return JSON.stringify({ found: 0 });
      const im = posters[0];
      const cell = im.closest('a, div[class*="group"], li, div');
      const r = im.getBoundingClientRect();
      const st = getComputedStyle(im);
      return JSON.stringify({ found: posters.length, cls: String(im.className).slice(0, 80), opacity: st.opacity, cx: Math.round(r.x + r.width / 2), cy: Math.round(r.y + r.height / 2), cellCls: cell ? String(cell.className).slice(0, 100) : null });
    })()`, 45000));
    if (before.found) {
      await cdp.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: before.cx, y: before.cy, button: 'none', buttons: 0 }, { ...S, timeoutMs: 20000 });
      await sleep(700);
      const after = JSON.parse(await cdp.evalRaw(S.sessionId, `(() => {
        const posters = [...document.querySelectorAll('img')].filter(im => {
          const r = im.getBoundingClientRect();
          return r.width > 150 && r.height > 100 && r.top > 60 && r.top < innerHeight - 60;
        });
        const im = posters.find(p => String(p.className).includes('poster')) || posters[0];
        const st = getComputedStyle(im);
        const hov = [...document.querySelectorAll(':hover')].map(e => e.tagName + '.' + String(e.className).split(' ').slice(0, 2).join('.')).slice(-4);
        return JSON.stringify({ opacityNow: st.opacity, transformNow: st.transform !== 'none' ? st.transform.slice(0, 50) : 'none', hoverChain: hov });
      })()`, 45000));
      const hs = await shot();
      fs.writeFileSync(`${prefix}-hover.jpg`, Buffer.from(hs, 'base64'));
      hoverTest = { before, after, shot: `${prefix}-hover.jpg` };
    } else hoverTest = { found: 0 };
  } catch (e) { hoverTest = { err: String(e.message).slice(0, 100) }; }

  console.log(JSON.stringify({ frames, uniq, hoverTest }, null, 1));
}

main().catch((e) => { console.error('ENTRANCE FAILED:', e.message); process.exit(1); });
