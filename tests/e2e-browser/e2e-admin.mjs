/** E2E part 3 — sweep every admin-panel section with a screenshot. */
import path from 'node:path';
import { writeFileSync } from 'node:fs';
import { launch, outDir } from './lib.mjs';

const BASE = process.env.BASE || 'http://127.0.0.1:3000';
const OUT = outDir('admin');
const { browser, page, errors } = await launch({ width: 1600, height: 1000 });
const netFails = [];
page.on('requestfailed', (r) => netFails.push('FAILED ' + r.url().replace(BASE, '')));
page.on('response', (r) => { if (r.status() >= 400) netFails.push(r.status() + ' ' + r.url().replace(BASE, '')); });

await page.goto(BASE + '/', { waitUntil: 'domcontentloaded', timeout: 90000 });
await page.waitForTimeout(4500);
const logout = page.locator('header button[aria-label="Logout"]');
if (await logout.count()) { await logout.click(); await page.waitForTimeout(600); await page.locator('button', { hasText: /^خروج$/ }).last().click().catch(() => {}); await page.waitForTimeout(2500); }
await page.locator('header button', { hasText: /ورود|Login/ }).first().click({ timeout: 20000 });
await page.waitForTimeout(1200);
await page.fill('input[placeholder="e.g. Sina_ProGamer"]', 'admin');
await page.fill('input[placeholder="••••••••"]', 'admin');
await page.locator('form button[type=submit]').first().click();
await page.waitForTimeout(3500);
await page.locator('button', { hasText: /ورود به پنل مدیریت/ }).first().click({ timeout: 20000 });
await page.waitForTimeout(6000);

const sections = await page.locator('div[class*="col-span-3"] > button').allInnerTexts().catch(() => []);
const menu = [...new Set(sections.map((s) => s.trim()).filter((s) => s && s.length > 3))];
console.log('sections found:', JSON.stringify(menu, null, 1));

const results = [];
let i = 0;
for (const label of menu) {
  i += 1;
  const id = String(i).padStart(2, '0');
  const before = errors.length, beforeNet = netFails.length;
  const rec = { id, label, status: 'ok' };
  try {
    await page.locator('button', { hasText: label }).first().click({ timeout: 20000 });
    await page.waitForTimeout(4000);
    rec.rows = await page.locator('table tr').count().catch(() => 0);
    rec.bodyExcerpt = (await page.locator('main, [class*=flex-1]').first().innerText().catch(() => '')).replace(/\s+/g, ' ').slice(0, 220);
  } catch (e) { rec.status = 'FAIL'; rec.error = String(e).split('\n')[0].slice(0, 200); }
  rec.newConsoleErrors = errors.slice(before);
  rec.newNetworkFailures = netFails.slice(beforeNet);
  rec.screenshot = `${id}-${label.replace(/[^\u0600-\u06FFa-z0-9]+/gi, '-').slice(0, 40)}.png`;
  await page.screenshot({ path: path.join(OUT, rec.screenshot), fullPage: true }).catch(() => {});
  results.push(rec);
  console.log(`[${rec.status === 'ok' ? ' OK ' : 'FAIL'}] ${id} ${label} rows=${rec.rows} errs=${rec.newConsoleErrors.length}`);
}
writeFileSync(path.join(OUT, 'report.json'), JSON.stringify({ menu, results, errors: [...new Set(errors)], netFails: [...new Set(netFails)] }, null, 2));
await browser.close();
