const chromium = require('@sparticuz/chromium').default;
const puppeteer = require('puppeteer-core');
(async () => {
  const b = await puppeteer.launch({ executablePath: await chromium.executablePath(), args: [...chromium.args, '--no-sandbox'], headless: true });
  const p = await b.newPage();
  await p.goto('http://localhost:3000/', { waitUntil: 'load', timeout: 60000 });
  await new Promise(r => setTimeout(r, 4000));
  const urls = await p.evaluate(() => performance.getEntriesByType('resource').map(e => e.name).filter(u => u.includes('.vite/deps')));
  const byVer = {};
  urls.forEach(u => { const m = u.match(/^.*\/deps\/([^?]+)\?v=(\w+)$/); if (m) (byVer[m[2]] = byVer[m[2]] || []).push(m[1]); });
  console.log('تعداد نسخه‌های v=', Object.keys(byVer).length);
  for (const [v, files] of Object.entries(byVer)) console.log('v=' + v, '->', files.length, 'files:', files.slice(0, 6).join(', '));
  const mainImports = await p.evaluate(async () => {
    const r = await fetch('/src/main.tsx'); const t = await r.text();
    return (t.match(/deps\/[^"')]+/g) || []).slice(0, 6);
  });
  console.log('main.tsx imports:', mainImports.join(' | '));
  await b.close();
})().catch(e => { console.error(e.message); process.exit(1); });
