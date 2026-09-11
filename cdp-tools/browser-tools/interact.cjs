const chromium = require('@sparticuz/chromium').default;
const puppeteer = require('puppeteer-core');
(async () => {
  const b = await puppeteer.launch({ executablePath: await chromium.executablePath(), args: [...chromium.args, '--no-sandbox'], headless: true });
  const p = await b.newPage();
  await p.setViewport({ width: 1440, height: 900 });
  const errs = [];
  p.on('pageerror', (e) => errs.push(String(e && e.message).slice(0, 120)));
  await p.goto('http://localhost:3000/', { waitUntil: 'load', timeout: 90000 });
  await new Promise(r => setTimeout(r, 8000));
  const snap = () => p.evaluate(() => {
    const o = {};
    document.querySelectorAll('[data-theme-region]').forEach((r) => { o[r.getAttribute('data-theme-region')] = (r.innerHTML || '').length; });
    return o;
  });
  console.log('t0:', JSON.stringify(await snap()));
  // کلیک روی GAMES (re-render اپ)
  await p.click('.hz-nav-link >> nth=1').catch(e => console.log('click fail:', e.message));
  await new Promise(r => setTimeout(r, 2500));
  console.log('بعد از کلیک GAMES:', JSON.stringify(await snap()));
  // برگشت به HOME
  await p.click('.hz-nav-link >> nth=0').catch(() => {});
  await new Promise(r => setTimeout(r, 2500));
  console.log('بعد از برگشت HOME:', JSON.stringify(await snap()));
  const txt = await p.evaluate(() => (document.body.innerText || '').replace(/\s+/g, ' ').slice(0, 200));
  console.log('متن صفحه:', txt);
  console.log('pageerrorها:', errs.length, errs.slice(0, 3));
  await p.screenshot({ path: '/home/user/bazino-gamenet-portal/cdp-tools/shots/after-interact.png' });
  await b.close();
})().catch(e => { console.error(e.message); process.exit(1); });
