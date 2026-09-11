// اسکرین‌شات واقعی قالب از سرور زنده + عیب‌یابی کامل (کنسول/شبکه/DOM)
import chromium from '@sparticuz/chromium';
import puppeteer from 'puppeteer-core';
import fs from 'node:fs';

const OUT = '/home/user/bazino-gamenet-portal/cdp-tools/shots';
fs.mkdirSync(OUT, { recursive: true });

// استخراج کتابخانه‌های همراه (nspr/nss/expat) برای دبیان
import zlib from 'node:zlib';
import { execSync } from 'node:child_process';
fs.mkdirSync('/tmp/al2023', { recursive: true });
fs.writeFileSync('/tmp/al2023.tar', zlib.brotliDecompressSync(fs.readFileSync('node_modules/@sparticuz/chromium/bin/al2023.tar.br')));
execSync('tar -xf /tmp/al2023.tar -C /tmp/al2023');
fs.mkdirSync('/tmp/fonts', { recursive: true });
fs.writeFileSync('/tmp/fonts.tar', zlib.brotliDecompressSync(fs.readFileSync('node_modules/@sparticuz/chromium/bin/fonts.tar.br')));
execSync('tar -xf /tmp/fonts.tar -C /tmp/fonts');
process.env.LD_LIBRARY_PATH = '/tmp/al2023/lib:' + (process.env.LD_LIBRARY_PATH || '');
process.env.FONTCONFIG_PATH = '/tmp/fonts';
console.log('libs + fonts extracted ✓');

const exePath = await chromium.executablePath();
console.log('chromium:', exePath);

const browser = await puppeteer.launch({
  executablePath: exePath,
  args: [...chromium.args, '--no-sandbox', '--disable-gpu', '--font-render-hinting=none'],
  headless: true, // sparticuz builds are headless-shell
});

const report = { console: [], pageErrors: [], failedRequests: [], responses: [] };
const page = await browser.newPage();
page.on('console', (m) => report.console.push({ type: m.type(), text: m.text().slice(0, 300) }));
page.on('pageerror', (e) => report.pageErrors.push(String(e && e.stack || e).slice(0, 500)));
page.on('requestfailed', (r) => report.failedRequests.push(`${r.method()} ${r.url()} — ${r.failure()?.errorText}`));
page.on('response', (r) => { if (r.status() >= 400) report.responses.push(`${r.status()} ${r.url()}`); });

await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
console.log('goto http://localhost:3000/ …');
await page.goto('http://localhost:3000/', { waitUntil: 'load', timeout: 90000 });
// صبر برای fetchهای اپ (settings/sliders/tournaments) + لود theme.js + mount قالب
await new Promise(r => setTimeout(r, 9000));

const state = await page.evaluate(() => {
  const vis = (sel) => {
    const el = document.querySelector(sel);
    if (!el) return null;
    const cs = getComputedStyle(el);
    return { display: cs.display, visible: !!(el.offsetWidth || el.offsetHeight) };
  };
  const wrap = document.querySelector('[class*="theme-"]');
  const regions = {};
  document.querySelectorAll('[data-theme-region]').forEach((r) => {
    regions[r.getAttribute('data-theme-region')] = { children: r.childElementCount, bytes: (r.innerHTML || '').length };
  });
  return {
    url: location.href,
    wrapperClass: wrap ? wrap.className.slice(0, 120) : null,
    bodyTextLen: (document.body.innerText || '').length,
    bodyTextHead: (document.body.innerText || '').replace(/\s+/g, ' ').slice(0, 220),
    nav: vis('.hz-nav'),
    navLinks: document.querySelectorAll('.hz-nav-link').length,
    heroCards: document.querySelectorAll('.hz-hero-card').length,
    quickCards: document.querySelectorAll('.hz-quick').length,
    heroImgs: Array.from(document.querySelectorAll('.hz-hero-img')).map(i => ({ src: i.getAttribute('src')?.slice(0, 70), ok: i.complete && i.naturalWidth > 0 })),
    regions,
    rootBytes: (document.getElementById('root')?.innerHTML || '').length,
    viewport: { w: innerWidth, h: innerHeight },
  };
});

await page.screenshot({ path: `${OUT}/live-desktop.png` });
console.log('desktop screenshot ✓');

// موبایل
const mpage = await browser.newPage();
mpage.on('pageerror', (e) => report.pageErrors.push('MOBILE: ' + String(e).slice(0, 300)));
await mpage.setViewport({ width: 390, height: 844, deviceScaleFactor: 2 });
await mpage.goto('http://localhost:3000/', { waitUntil: 'load', timeout: 90000 });
await new Promise(r => setTimeout(r, 8000));
await mpage.screenshot({ path: `${OUT}/live-mobile.png` });
const mState = await mpage.evaluate(() => ({
  navDisplay: getComputedStyle(document.querySelector('.hz-nav') || document.documentElement).display,
  mnavVisible: !!document.querySelector('.hz-mnav') && !!(document.querySelector('.hz-mnav').offsetHeight),
  quickCards: document.querySelectorAll('.hz-quick').length,
  bodyTextLen: (document.body.innerText || '').length,
}));
console.log('mobile screenshot ✓');

fs.writeFileSync(`${OUT}/live-report.json`, JSON.stringify({ state, mState, report }, null, 2));
console.log('═══ STATE ═══');
console.log(JSON.stringify(state, null, 1).slice(0, 2200));
console.log('═══ MOBILE ═══', JSON.stringify(mState));
console.log('═══ CONSOLE (' + report.console.length + ') ═══');
report.console.slice(0, 15).forEach(c => console.log(`[${c.type}] ${c.text}`));
console.log('═══ PAGE ERRORS (' + report.pageErrors.length + ') ═══');
report.pageErrors.slice(0, 8).forEach(e => console.log('•', e.slice(0, 220)));
console.log('═══ FAILED REQUESTS (' + report.failedRequests.length + ') ═══');
report.failedRequests.slice(0, 10).forEach(f => console.log('•', f));
console.log('═══ HTTP >=400 (' + report.responses.length + ') ═══');
report.responses.slice(0, 10).forEach(f => console.log('•', f));
await browser.close();
process.exit(0);
