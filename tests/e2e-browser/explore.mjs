/** Quick exploration: load a tab, screenshot, dump interactive elements. */
import path from 'node:path';
import { writeFileSync } from 'node:fs';
import { launch, outDir } from './lib.mjs';

const BASE = process.env.BASE || 'http://127.0.0.1:3000';
const name = process.argv[2] || 'home';
const { browser, page, errors } = await launch();
await page.goto(BASE + '/', { waitUntil: 'domcontentloaded', timeout: 90000 });
await page.waitForTimeout(4000);
if (name !== 'home') {
  const btn = page.locator(`nav button, header button, button`).filter({ hasText: new RegExp(process.argv[3] || name, 'i') }).first();
  await btn.click({ timeout: 15000 }).catch((e) => console.log('nav click fail', String(e).slice(0, 200)));
  await page.waitForTimeout(3500);
}
const out = outDir('explore');
await page.screenshot({ path: path.join(out, `${name}.png`), fullPage: true });
const dump = await page.evaluate(() => {
  const t = (el) => (el.innerText || el.value || el.placeholder || '').trim().replace(/\s+/g, ' ').slice(0, 70);
  const vis = (el) => el.getClientRects().length > 0;
  return {
    title: document.title,
    h: [...document.querySelectorAll('h1,h2,h3')].filter(vis).map((e) => e.tagName + ':' + t(e)).slice(0, 40),
    buttons: [...document.querySelectorAll('button,[role=button],a')].filter(vis).map(t).filter(Boolean).slice(0, 90),
    inputs: [...document.querySelectorAll('input,select,textarea')].filter(vis).map((e) => `${e.tagName}[${e.type || ''}] ${t(e)}`).slice(0, 40),
    bodyScrollWidth: document.body.scrollWidth,
  };
});
writeFileSync(path.join(out, `${name}.json`), JSON.stringify({ ...dump, errors }, null, 2));
console.log(JSON.stringify({ ...dump, errors }, null, 2));
await browser.close();
