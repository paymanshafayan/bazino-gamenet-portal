// دیباگ عمیق: استک کامل خطای Hook + وضعیت رجیستری SDK + ردیابی mount
import chromium from '@sparticuz/chromium';
import puppeteer from 'puppeteer-core';
import fs from 'node:fs';

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

const exePath = await chromium.executablePath();
const browser = await puppeteer.launch({
  executablePath: exePath,
  args: [...chromium.args, '--no-sandbox', '--disable-gpu'],
  headless: true,
});
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900 });

const errStacks = [];
page.on('pageerror', (e) => errStacks.push(String(e && e.stack || e)));
page.on('console', async (m) => {
  if (m.type() === 'error' || (m.type() === 'warn' && /Hook/.test(m.text()))) {
    const args = m.args();
    let out = m.text();
    try { const x = await m.location(); out += `\n   at ${x.url}:${x.lineNumber}`; } catch { }
    errStacks.push('CONSOLE[' + m.type() + '] ' + out);
  }
});

await page.goto('http://localhost:3000/', { waitUntil: 'load', timeout: 90000 });
await new Promise(r => setTimeout(r, 9000));

// ۱) وضعیت رجیستری SDK در صفحهٔ زنده
const sdkState = await page.evaluate(() => {
  const SDK = window.BazinoThemeSDK;
  const out = { hasSDK: !!SDK, registered: SDK ? SDK.listRegisteredComponents() : [] };
  const regions = {};
  document.querySelectorAll('[data-theme-region]').forEach((r) => {
    regions[r.getAttribute('data-theme-region')] = { children: r.childElementCount, bytes: (r.innerHTML || '').length };
  });
  out.regions = regions;
  // المان‌های هرو که در DOM هستند؟
  out.rootHTMLLen = (document.getElementById('root')?.innerHTML || '').length;
  return out;
});
console.log('═══ SDK + REGIONS ═══');
console.log(JSON.stringify(sdkState, null, 1));

// ۲) استک کامل خطاها
console.log('═══ ERROR STACKS (' + errStacks.length + ') ═══');
errStacks.slice(0, 3).forEach((s, i) => console.log(`── #${i} ──\n${s.slice(0, 1600)}\n`));

await page.screenshot({ path: '/home/user/bazino-gamenet-portal/cdp-tools/shots/debug-desktop.png', fullPage: false });
await browser.close();
process.exit(0);
