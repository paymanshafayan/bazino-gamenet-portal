/**
 * تست بصری و عملیاتی کامل پنل مدیریت.
 *  فاز ۱ — هر ۱۶ بخش باز می‌شود و اسکرین‌شات ویوپورت گرفته می‌شود (برای بازبینی چشمی).
 *  فاز ۲ — عملیات نوشتنی واقعی: ساخت/حذف رکورد و بررسی اثرش در دیتابیس.
 */
import path from 'node:path';
import { writeFileSync } from 'node:fs';
import { launch, outDir } from './lib.mjs';

const BASE = process.env.BASE || 'http://127.0.0.1:3000';
const OUT = outDir('admin-full');
const STAMP = Date.now().toString().slice(-5);

const { browser, page, errors } = await launch({ width: 1600, height: 1100 });
const netFails = [];
page.on('requestfailed', (r) => netFails.push('FAILED ' + r.url().replace(BASE, '')));
page.on('response', (r) => { if (r.status() >= 400) netFails.push(r.status() + ' ' + r.request().method() + ' ' + r.url().replace(BASE, '')); });

const steps = [];
async function step(name, fn, shotName) {
  const before = errors.length, beforeNet = netFails.length;
  const rec = { name, status: 'ok' };
  try { const r = await fn(rec); if (r !== undefined) rec.result = r; }
  catch (e) { rec.status = 'FAIL'; rec.error = String(e).split('\n')[0].slice(0, 240); }
  rec.newConsoleErrors = errors.slice(before);
  rec.newNetworkFailures = netFails.slice(beforeNet);
  if (shotName) {
    rec.shot = shotName;
    await page.screenshot({ path: path.join(OUT, shotName) }).catch((e) => { rec.shotError = String(e).slice(0, 100); });
  }
  steps.push(rec);
  console.log(`[${rec.status === 'ok' ? ' OK ' : 'FAIL'}] ${name}${rec.error ? ' :: ' + rec.error : ''}`);
  return rec;
}

const toasts = () => page.locator('.fixed.top-6 > div span').allInnerTexts().catch(() => []);
async function waitToast(re, timeout = 10000) {
  const end = Date.now() + timeout;
  while (Date.now() < end) {
    const ts = await toasts();
    const hit = ts.find((t) => re.test(t));
    if (hit) return hit;
    await page.waitForTimeout(400);
  }
  return 'NO TOAST (seen: ' + JSON.stringify(await toasts()) + ')';
}
const sectionBtn = (label) => page.locator('div[class*="col-span-3"] > button', { hasText: label }).first();
async function openSection(label) {
  const b = sectionBtn(label);
  await b.scrollIntoViewIfNeeded();
  await b.evaluate((el) => el.click());
  await page.waitForTimeout(3500);
}

/* ── login as admin ─────────────────────────────────────────── */
await page.goto(BASE + '/', { waitUntil: 'domcontentloaded', timeout: 90000 });
await page.waitForTimeout(4500);
const logout = page.locator('header button[aria-label="Logout"]');
if (await logout.count()) {
  await logout.click(); await page.waitForTimeout(600);
  await page.locator('button', { hasText: /^خروج$/ }).last().click().catch(() => {});
  await page.waitForTimeout(2500);
}
await page.locator('header button', { hasText: /ورود|Login/ }).first().click({ timeout: 20000 });
await page.waitForTimeout(1200);
await page.fill('input[placeholder="e.g. Sina_ProGamer"]', 'admin');
await page.fill('input[placeholder="••••••••"]', 'admin');
await page.locator('form button[type=submit]').first().click();
await page.waitForTimeout(3500);
await page.locator('button', { hasText: /ورود به پنل مدیریت/ }).first().click({ timeout: 20000 });
await page.waitForTimeout(6500);

/* ── PHASE 1 · open and photograph every section ────────────── */
const SECTIONS = [
  ['داشبورد و آمار زنده', '01-dashboard'],
  ['مدیریت کلاینت', '02-systems'],
  ['بوفه کافه', '03-cafe'],
  ['انبار فروشگاه', '04-shop'],
  ['برنامه‌ریزی تورنمنت', '05-tournaments'],
  ['انتشار اخبار بلاگ', '06-blog'],
  ['اتاق‌های گفتگوی زنده', '07-chat'],
  ['ارسال پیام و نوتیفیکیشن', '08-messages'],
  ['مهاجرت‌های EF Core', '09-migrations'],
  ['مدیریت قالب‌ها', '10-themes'],
  ['اسلایدر اپلیکیشن فلاتر', '11-slider'],
  ['دانلود اپلیکیشن', '12-appdownload'],
  ['سفارشی‌سازی کلوپ', '13-customization'],
  ['لاگ‌های دیتابیس', '14-dblogs'],
  ['تنظیمات API Key', '15-apikeys'],
  ['پرزنتیشن', '16-presentation'],
];

for (const [label, file] of SECTIONS) {
  await step(`open · ${label}`, async (rec) => {
    await openSection(label);
    const panel = await page.locator('div[class*="col-span-9"]').first().innerText().catch(() => '');
    rec.headingSample = panel.replace(/\s+/g, ' ').slice(0, 130);
    return { chars: panel.length };
  }, `${file}.png`);
}

/* ── PHASE 2 · real write operations ────────────────────────── */

await step('write · add a gaming station', async (rec) => {
  await openSection('مدیریت کلاینت');
  const name = `تست سیستم ${STAMP}`;
  await page.locator('input[placeholder*="Gamer"], input').first().fill(name);
  const rate = page.locator('input[type=number]').first();
  if (await rate.count()) await rate.fill('45000');
  await page.locator('button', { hasText: /ثبت کلاینت/ }).first().click({ timeout: 15000 });
  const t = await waitToast(/.+/);
  await page.waitForTimeout(2500);
  const inApi = await page.evaluate(async (n) =>
    JSON.stringify(await fetch('/api/systems').then((r) => r.json()).catch(() => [])).includes(n), name);
  rec.toast = t;
  return { created: inApi, name };
}, '17-write-system.png');

await step('write · publish a blog article', async (rec) => {
  await openSection('انتشار اخبار بلاگ');
  const title = `مقاله تست ${STAMP}`;
  const inputs = page.locator('div[class*="col-span-9"] input[type=text]');
  await inputs.nth(0).fill(title);
  if (await inputs.count() > 1) await inputs.nth(1).fill('News');
  const body = page.locator('div[class*="col-span-9"] textarea').first();
  if (await body.count()) await body.fill('این مقاله توسط تست خودکار منتشر شده است.');
  await page.locator('button', { hasText: /انتشار مقاله/ }).first().click({ timeout: 15000 });
  const t = await waitToast(/.+/);
  await page.waitForTimeout(2500);
  const inApi = await page.evaluate(async (n) =>
    JSON.stringify(await fetch('/api/articles').then((r) => r.json()).catch(() => [])).includes(n), title);
  rec.toast = t;
  return { published: inApi, title };
}, '18-write-article.png');

await step('write · create a chat room', async (rec) => {
  await openSection('اتاق‌های گفتگوی زنده');
  const room = `Room${STAMP}`;
  await page.locator('div[class*="col-span-9"] input').first().fill(room);
  await page.locator('button', { hasText: /ایجاد اتاق/ }).first().click({ timeout: 15000 });
  const t = await waitToast(/.+/);
  await page.waitForTimeout(2000);
  const inApi = await page.evaluate(async (n) =>
    JSON.stringify(await fetch('/api/chat/rooms').then((r) => r.json()).catch(() => [])).includes(n), room);
  rec.toast = t;
  return { created: inApi, room };
}, '19-write-chatroom.png');

await step('write · change a cafe order status', async (rec) => {
  await openSection('داشبورد و آمار زنده');
  const select = page.locator('div[class*="col-span-9"] select').first();
  if (!(await select.count())) { rec.note = 'no live order on the dashboard to update'; return { skipped: true }; }
  const before = await select.inputValue();
  const options = await select.locator('option').evaluateAll((o) => o.map((x) => x.value));
  const next = options.find((v) => v !== before) || before;
  await select.selectOption(next);
  await page.waitForTimeout(2500);
  const t = await waitToast(/.+/, 6000);
  rec.toast = t;
  return { before, next };
}, '20-write-orderstatus.png');

await step('write · switch data source to database and back', async (rec) => {
  await openSection('سفارشی‌سازی کلوپ');
  const btn = page.locator('button', { hasText: /دیتابیس|Database/ }).first();
  if (!(await btn.count())) { rec.note = 'no data-source switch in this section'; return { skipped: true }; }
  await btn.click();
  await page.waitForTimeout(3000);
  const mode = await page.evaluate(async () => (await fetch('/api/data-source').then((r) => r.json()).catch(() => ({}))));
  const back = page.locator('button', { hasText: /نمونه|Sample/ }).first();
  if (await back.count()) { await back.click(); await page.waitForTimeout(3000); }
  const restored = await page.evaluate(async () => (await fetch('/api/data-source').then((r) => r.json()).catch(() => ({}))));
  return { switchedTo: mode, restored };
}, '21-write-datasource.png');

await step('admin sees every reservation and transaction', async (rec) => {
  const data = await page.evaluate(async () => ({
    reservations: await fetch('/api/reservations').then((r) => r.json()).catch(() => []),
    transactions: await fetch('/api/transactions').then((r) => r.json()).catch(() => []),
    coupons: await fetch('/api/coupons').then((r) => r.json()).catch(() => []),
  }));
  const owners = [...new Set(data.transactions.map((t) => t.username || '(legacy)'))];
  rec.note = `admin sees transactions from: ${JSON.stringify(owners)}`;
  return {
    reservations: data.reservations.length,
    transactions: data.transactions.length,
    coupons: data.coupons.length,
    distinctOwners: owners.length,
  };
});

writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(
  { when: new Date().toISOString(), steps, consoleErrors: [...new Set(errors)], networkFailures: [...new Set(netFails)] }, null, 2));
console.log('\n=== ' + steps.filter((s) => s.status === 'ok').length + '/' + steps.length + ' ok ===');
console.log('console errors:', JSON.stringify([...new Set(errors)]));
console.log('network failures:', JSON.stringify([...new Set(netFails)]));
await browser.close();
