/** Walk every main tab, dump interactive DOM + screenshot. */
import path from 'node:path';
import { writeFileSync } from 'node:fs';
import { launch, outDir } from './lib.mjs';

const BASE = process.env.BASE || 'http://127.0.0.1:3000';
const TABS = ['خانه', 'رزرو', 'کافه', 'فروشگاه', 'مسابقات', 'باشگاه'];
const { browser, page, errors } = await launch();
const out = outDir('explore');
await page.goto(BASE + '/', { waitUntil: 'domcontentloaded', timeout: 90000 });
await page.waitForTimeout(4000);
const report = {};
for (const tab of TABS) {
  await page.locator('header nav button', { hasText: tab }).first().click({ timeout: 20000 }).catch((e) => { report[tab] = { navError: String(e).slice(0, 150) }; });
  await page.waitForTimeout(3000);
  await page.screenshot({ path: path.join(out, `tab-${tab}.png`), fullPage: true });
  const d = await page.evaluate(() => {
    const t = (el) => (el.innerText || el.value || el.placeholder || el.getAttribute('aria-label') || '').trim().replace(/\s+/g, ' ').slice(0, 60);
    const vis = (el) => el.getClientRects().length > 0;
    return {
      headings: [...document.querySelectorAll('h1,h2,h3,h4')].filter(vis).map(t).filter(Boolean).slice(0, 25),
      buttons: [...document.querySelectorAll('button')].filter(vis).map((b, i) => `${i}:${t(b)}`).slice(0, 70),
      inputs: [...document.querySelectorAll('input,select,textarea')].filter(vis).map((e, i) => `${i}:<${e.tagName.toLowerCase()} ${e.type || ''}> ${t(e)}`).slice(0, 30),
      scrollW: document.body.scrollWidth,
    };
  });
  report[tab] = { ...(report[tab] || {}), ...d };
}
report._consoleErrors = errors;
writeFileSync(path.join(out, 'tabs.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 1));
await browser.close();
