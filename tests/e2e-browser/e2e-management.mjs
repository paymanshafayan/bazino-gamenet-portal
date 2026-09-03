/**
 * تست بصری و عملیاتی نرم‌افزار مدیریت گیم‌نت (Management App).
 *
 * اپ روی همان سرور زنده در مسیر /management-app/ سرو می‌شود.
 *  فاز ۱ — هر ۶ زبانه باز و عکس‌برداری می‌شود (برای بازبینی چشمی).
 *  فاز ۲ — جریان‌های واقعی کار: شروع تایم، افزودن بوفه، تسویه، تعریف ایستگاه.
 *  فاز ۳ — پایداری وضعیت روی سرور (/api/state) و همگام‌سازی وب (/api/sync/*).
 */
import path from 'node:path';
import { writeFileSync } from 'node:fs';
import { launch, outDir } from './lib.mjs';

const BASE = process.env.BASE || 'http://127.0.0.1:3000';
const APP = `${BASE}/management-app/`;
const OUT = outDir('mgmt');

const { browser, page, errors } = await launch({ width: 1600, height: 1000 });
const netFails = [];
page.on('requestfailed', (r) => netFails.push('FAILED ' + r.url().replace(BASE, '').slice(0, 110)));
page.on('response', (r) => { if (r.status() >= 400) netFails.push(r.status() + ' ' + r.request().method() + ' ' + r.url().replace(BASE, '').slice(0, 110)); });

const steps = [];
async function step(name, fn, shot) {
  const before = errors.length, beforeNet = netFails.length;
  const rec = { name, status: 'ok', notes: [] };
  try { const r = await fn(rec); if (r !== undefined) rec.result = r; }
  catch (e) { rec.status = 'FAIL'; rec.error = String(e).split('\n')[0].slice(0, 220); }
  rec.newConsoleErrors = errors.slice(before);
  rec.newNetworkFailures = netFails.slice(beforeNet);
  if (shot) { rec.shot = shot; await page.screenshot({ path: path.join(OUT, shot), timeout: 20000 }).catch((e) => { rec.shotError = String(e).slice(0, 80); }); }
  steps.push(rec);
  console.log(`[${rec.status === 'ok' ? ' OK ' : 'FAIL'}] ${name}${rec.error ? ' :: ' + rec.error : ''}`);
  return rec;
}

const btn = (re) => page.locator('button').filter({ hasText: re }).first();
const bodyText = () => page.locator('body').innerText();
const closeModal = async () => {
  await page.keyboard.press('Escape').catch(() => {});
  await page.waitForTimeout(500);
  const x = page.locator('button', { hasText: /^(بستن|انصراف|لغو)$/ }).first();
  if (await x.count()) { await x.click().catch(() => {}); await page.waitForTimeout(600); }
};

await page.goto(APP, { waitUntil: 'domcontentloaded', timeout: 90000 });
await page.waitForTimeout(6000);

/* ── فاز ۱ · زبانه‌ها ─────────────────────────────────────────── */
const TABS = [
  ['ایستگاه‌های بازی', '01-stations'],
  ['بوفه و انبار داری', '02-buffet'],
  ['اعضا و کیف پول', '03-members'],
  ['حسابداری و نمودارها', '04-accounting'],
  ['دسترسی اپراتورها', '05-operators'],
  ['تنظیمات و تم‌ها', '06-settings'],
];
for (const [label, file] of TABS) {
  await step(`tab · ${label}`, async (rec) => {
    await btn(new RegExp(label.replace(/[()]/g, '.'))).click({ timeout: 20000 });
    await page.waitForTimeout(2500);
    const t = (await bodyText()).replace(/\s+/g, ' ');
    rec.notes.push(t.slice(0, 120));
    return { chars: t.length, overflow: await page.evaluate(() => document.body.scrollWidth > window.innerWidth + 1) };
  }, `${file}.png`);
}

/* ── فاز ۲ · جریان‌های واقعی ──────────────────────────────────── */
await step('flow · باز کردن زبانه ایستگاه‌ها', async () => {
  await btn(/ایستگاه‌های بازی/).click({ timeout: 20000 });
  await page.waitForTimeout(2500);
});

await step('flow · شروع تایم روی یک ایستگاه خالی', async (rec) => {
  const start = btn(/شروع تایم بازی/);
  if (!(await start.count())) { rec.notes.push('هیچ ایستگاه خالی‌ای نبود'); return { skipped: true }; }
  await start.click({ timeout: 15000 });
  await page.waitForTimeout(2000);
  const t = (await bodyText()).replace(/\s+/g, ' ');
  rec.notes.push('modal: ' + t.slice(0, 150));
  return { modalOpened: /مشتری|نام|تعرفه|شروع/.test(t) };
}, '07-start-session-modal.png');

await step('flow · بستن مودال شروع تایم', async () => { await closeModal(); });

await step('flow · مودال افزایش بوفه', async (rec) => {
  const b = btn(/افزایش بوفه/);
  if (!(await b.count())) { rec.notes.push('دکمه نبود'); return { skipped: true }; }
  await b.click({ timeout: 15000 });
  await page.waitForTimeout(2000);
  const t = (await bodyText()).replace(/\s+/g, ' ');
  return { opened: /بوفه|سرویس|افزودن/.test(t) };
}, '08-buffet-modal.png');
await step('flow · بستن', async () => { await closeModal(); });

await step('flow · مودال تغییر تعرفه', async (rec) => {
  const b = btn(/^تغییر تعرفه$/);
  if (!(await b.count())) { rec.notes.push('دکمه نبود'); return { skipped: true }; }
  await b.click({ timeout: 15000 });
  await page.waitForTimeout(2000);
  return { opened: /تعرفه/.test(await bodyText()) };
}, '09-tariff-modal.png');
await step('flow · بستن', async () => { await closeModal(); });

await step('flow · مودال جابه‌جایی ایستگاه', async (rec) => {
  const b = btn(/^جابه‌جایی$/);
  if (!(await b.count())) { rec.notes.push('دکمه نبود'); return { skipped: true }; }
  await b.click({ timeout: 15000 });
  await page.waitForTimeout(2000);
  return { opened: /جابه‌جا|انتقال|مقصد/.test(await bodyText()) };
}, '10-transfer-modal.png');
await step('flow · بستن', async () => { await closeModal(); });

await step('flow · مودال تسویه (پایان و تسویه)', async (rec) => {
  const b = btn(/پایان و تسویه/);
  if (!(await b.count())) { rec.notes.push('هیچ سانس فعالی نبود'); return { skipped: true }; }
  await b.click({ timeout: 15000 });
  await page.waitForTimeout(2500);
  const t = (await bodyText()).replace(/\s+/g, ' ');
  rec.notes.push(t.slice(0, 160));
  return { opened: /تسویه|پرداخت|فاکتور|مبلغ/.test(t) };
}, '11-checkout-modal.png');
await step('flow · بستن', async () => { await closeModal(); });

await step('flow · مودال تعریف ایستگاه جدید', async (rec) => {
  const b = btn(/تعریف ایستگاه جدید/);
  if (!(await b.count())) { rec.notes.push('دکمه نبود'); return { skipped: true }; }
  await b.click({ timeout: 15000 });
  await page.waitForTimeout(2000);
  return { opened: /ایستگاه|نام|نوع/.test(await bodyText()) };
}, '12-new-station-modal.png');
await step('flow · بستن', async () => { await closeModal(); });

await step('flow · مودال مدیریت تعرفه‌ها', async (rec) => {
  const b = btn(/مدیریت تعرفه‌ها/);
  if (!(await b.count())) { rec.notes.push('دکمه نبود'); return { skipped: true }; }
  await b.click({ timeout: 15000 });
  await page.waitForTimeout(2000);
  return { opened: /تعرفه/.test(await bodyText()) };
}, '13-tariffs-modal.png');
await step('flow · بستن', async () => { await closeModal(); });

await step('flow · راهنمای تصویری', async (rec) => {
  const b = btn(/^راهنما$|نمایش راهنما/);
  if (!(await b.count())) { rec.notes.push('دکمه نبود'); return { skipped: true }; }
  await b.click({ timeout: 15000 });
  await page.waitForTimeout(2500);
  return { opened: /راهنما/.test(await bodyText()) };
}, '14-help-modal.png');
await step('flow · بستن', async () => { await closeModal(); });

/* ── فاز ۳ · همگام‌سازی وب و پایداری وضعیت ────────────────────── */
await step('sync · مودال همگام وب', async (rec) => {
  const b = btn(/همگام وب/);
  await b.click({ timeout: 20000 });
  await page.waitForTimeout(2500);
  const t = (await bodyText()).replace(/\s+/g, ' ');
  rec.notes.push(t.slice(0, 200));
  return { opened: /همگام|سرور|API|اتصال/.test(t) };
}, '15-websync-modal.png');

await step('sync · تست اتصال به سرور', async (rec) => {
  const test = page.locator('button').filter({ hasText: /تست اتصال|بررسی اتصال|اتصال/ }).first();
  if (!(await test.count())) { rec.notes.push('دکمه تست اتصال پیدا نشد'); return { skipped: true }; }
  await test.click({ timeout: 15000 });
  await page.waitForTimeout(4000);
  const t = (await bodyText()).replace(/\s+/g, ' ');
  rec.notes.push(t.slice(0, 250));
  return { text: t.slice(0, 200) };
}, '16-websync-test.png');
await step('sync · بستن', async () => { await closeModal(); });

await step('state · وضعیت روی سرور ذخیره می‌شود (/api/state)', async (rec) => {
  const state = await page.evaluate(async () => {
    const r = await fetch('/api/state').then((x) => x.json()).catch((e) => ({ err: String(e) }));
    return r && typeof r === 'object' ? { keys: Object.keys(r).slice(0, 15), stations: r.stations?.length ?? null } : { raw: r };
  });
  rec.notes.push(JSON.stringify(state).slice(0, 220));
  return state;
});

await step('sync · مسیرهای /api/sync بدون کلید رد می‌شوند', async (rec) => {
  const r = await page.evaluate(async () => {
    const out = {};
    for (const p of ['/api/sync/reservations', '/api/sync/logs']) {
      const res = await fetch(p).catch(() => null);
      out[p] = res ? res.status : 'network error';
    }
    return out;
  });
  rec.notes.push(JSON.stringify(r));
  return r;
});

const report = { when: new Date().toISOString(), steps, consoleErrors: [...new Set(errors)], networkFailures: [...new Set(netFails)] };
writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(report, null, 2));
console.log(`\n=== ${steps.filter((s) => s.status === 'ok').length}/${steps.length} ok ===`);
console.log('console errors :', JSON.stringify([...new Set(errors)]).slice(0, 400));
console.log('network failures:', JSON.stringify([...new Set(netFails)]).slice(0, 600));
await browser.close();
