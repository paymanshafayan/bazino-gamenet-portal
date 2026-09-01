/**
 * Bazino Pro — full end-to-end "real user" journey in a real Chromium.
 * Registers a brand-new account and exercises every public feature:
 * reservation, cafe order, shop purchase, tournament registration,
 * loyalty redeem, blog comment, chat, theme switcher, help guide.
 *
 * Every step takes a full-page screenshot and records console errors +
 * failed network requests. Output: shots/e2e/*.png + report.json
 */
import path from 'node:path';
import { writeFileSync } from 'node:fs';
import { launch, outDir } from './lib.mjs';

const BASE = process.env.BASE || 'http://127.0.0.1:3000';
const OUT = outDir('e2e');
const STAMP = Date.now().toString().slice(-6);
const USER = { username: `Gamer_${STAMP}`, email: `gamer${STAMP}@bazino.test`, phone: `0912${STAMP}123`.slice(0, 11), password: 'Test@12345' };

const { browser, page, errors } = await launch({ width: 1440, height: 900 });
const netFails = [];
page.on('response', (r) => { if (r.status() >= 400) netFails.push(`${r.status()} ${r.request().method()} ${r.url().replace(BASE, '')}`); });
page.on('requestfailed', (r) => netFails.push(`FAILED ${r.url().replace(BASE, '')} ${r.failure()?.errorText || ''}`));

const steps = [];
let n = 0;
async function step(name, fn, { shot = true } = {}) {
  n += 1;
  const id = String(n).padStart(2, '0');
  const before = errors.length, beforeNet = netFails.length;
  const rec = { id, name, status: 'ok', notes: [] };
  const t0 = Date.now();
  try {
    const r = await fn(rec);
    if (r) rec.result = r;
  } catch (e) {
    rec.status = 'FAIL';
    rec.error = String(e).split('\n').slice(0, 3).join(' | ').slice(0, 400);
  }
  rec.ms = Date.now() - t0;
  rec.newConsoleErrors = errors.slice(before);
  rec.newNetworkFailures = netFails.slice(beforeNet);
  if (shot) {
    rec.screenshot = `${id}-${name.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.png`;
    await page.screenshot({ path: path.join(OUT, rec.screenshot), fullPage: true }).catch(() => {});
  }
  steps.push(rec);
  console.log(`[${rec.status === 'ok' ? ' OK ' : 'FAIL'}] ${id} ${name}${rec.error ? ' :: ' + rec.error : ''}`);
  return rec;
}

const nav = (label) => page.locator('header nav button', { hasText: label }).first();
const toastTexts = () => page.locator('.fixed.top-6 > div span').allInnerTexts().catch(() => []);
async function waitToast(re, timeout = 12000) {
  const end = Date.now() + timeout;
  while (Date.now() < end) {
    const ts = await toastTexts();
    const hit = ts.find((t) => re.test(t));
    if (hit) return hit;
    await page.waitForTimeout(400);
  }
  const ts = await toastTexts();
  throw new Error(`toast not matched ${re}; seen: ${JSON.stringify(ts)}`);
}

/* ── 01 · Land on the homepage ─────────────────────────────────── */
await step('home-desktop', async (rec) => {
  await page.goto(BASE + '/', { waitUntil: 'domcontentloaded', timeout: 90000 });
  await page.waitForTimeout(4500);
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(1500);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(800);
  rec.notes.push('title=' + (await page.title()));
  return { scrollW: await page.evaluate(() => document.body.scrollWidth), h1: await page.locator('h1').first().innerText().catch(() => null) };
});

/* ── 02 · Log out of the pre-seeded session, become a guest ────── */
await step('logout-to-guest', async (rec) => {
  const logout = page.locator('header button[aria-label="Logout"]');
  if (await logout.count()) {
    rec.notes.push('site opened ALREADY LOGGED IN as: ' + (await page.locator('header span.text-primary').first().innerText().catch(() => '?')));
    await logout.click();
    await page.waitForTimeout(600);
    const confirm = page.locator('button', { hasText: /^خروج$|^Logout$/ }).last();
    if (await confirm.count()) await confirm.click();
    await page.waitForTimeout(2500);
  } else rec.notes.push('already guest');
  return { loginButtonVisible: await page.locator('header button', { hasText: /ورود|Login/ }).count() };
});

/* ── 03 · Register a brand-new account ─────────────────────────── */
await step('register-new-account', async (rec) => {
  await page.locator('header button', { hasText: /ورود|Login/ }).first().click({ timeout: 15000 });
  await page.waitForTimeout(1200);
  await page.locator('button', { hasText: /ثبت‌نام|ثبت نام|Register|Sign Up/ }).first().click();
  await page.waitForTimeout(600);
  await page.fill('input[placeholder="e.g. Sina_ProGamer"]', USER.username);
  await page.fill('input[placeholder="name@gmail.com"]', USER.email);
  await page.fill('input[placeholder="09123456789"]', USER.phone);
  await page.fill('input[placeholder="••••••••"]', USER.password);
  rec.notes.push(JSON.stringify(USER));
  await page.locator('form button[type=submit]').first().click();
  await page.waitForTimeout(3500);
  const who = await page.locator('header span.text-primary').first().innerText().catch(() => null);
  if (!who || !who.includes(USER.username)) throw new Error('header does not show new user, got: ' + who);
  return { headerUser: who };
});

/* ── 04 · Reserve a gaming station ─────────────────────────────── */
await step('reservation-select-system', async (rec) => {
  await nav('رزرو').click({ timeout: 20000 });
  await page.waitForTimeout(3000);
  const free = page.locator('button').filter({ hasText: /تومان \/ ساعت/ }).filter({ hasNot: page.locator('text=مشغول') });
  const count = await free.count();
  rec.notes.push('selectable systems: ' + count);
  await free.first().click();
  await page.waitForTimeout(1200);
  const sel = await page.locator('h4').filter({ hasText: /سیستم|کنسول/ }).first().innerText().catch(() => null);
  if (!sel) throw new Error('booking panel did not show a selected system');
  return { selected: sel };
});

await step('reservation-hours-and-coupon', async (rec) => {
  await page.locator('button', { hasText: /^۳س$|^3س$/ }).first().click().catch(async () => {
    await page.locator('div.grid.grid-cols-4 button').nth(2).click();
  });
  await page.waitForTimeout(600);
  await page.fill('input[placeholder*="کد تخفیف"]', 'INVALID-CODE-XYZ');
  await page.locator('button', { hasText: /^اعمال$/ }).first().click();
  const t = await waitToast(/تخفیف|نامعتبر|منقضی/).catch((e) => 'NO TOAST: ' + e.message);
  rec.notes.push('invalid coupon toast: ' + t);
  const total = await page.locator('span.text-primary.text-base').first().innerText().catch(() => null);
  return { totalAfter3h: total };
});

await step('reservation-confirm', async (rec) => {
  await page.locator('button', { hasText: /پرداخت و تایید نهایی رزرو/ }).first().click({ timeout: 15000 });
  const t = await waitToast(/رزرو|موفق|ثبت/);
  rec.notes.push('toast: ' + t);
  await page.waitForTimeout(2500);
  return { toast: t };
});

await step('reservation-appears-in-list', async (rec) => {
  const body = await page.locator('body').innerText();
  const hasActive = /بارکد|QR|رزروهای فعال/.test(body);
  const api = await page.evaluate(async () => (await fetch('/api/reservations').then((r) => r.json()).catch((e) => ({ err: String(e) }))));
  rec.notes.push('reservations in API: ' + (Array.isArray(api) ? api.length : JSON.stringify(api).slice(0, 120)));
  return { hasActiveSection: hasActive, apiCount: Array.isArray(api) ? api.length : null, last: Array.isArray(api) ? api[api.length - 1] : null };
});

/* ── 05 · Order from the cafe ──────────────────────────────────── */
await step('cafe-add-to-cart', async (rec) => {
  await nav('کافه').click({ timeout: 20000 });
  await page.waitForTimeout(3000);
  const add = page.locator('button', { hasText: /افزودن به سبد خرید/ });
  rec.notes.push('cafe items: ' + (await add.count()));
  await add.nth(0).click(); await page.waitForTimeout(700);
  await add.nth(1).click(); await page.waitForTimeout(700);
  await add.nth(0).click(); await page.waitForTimeout(900);
  const total = await page.locator('span.text-primary.text-base').first().innerText().catch(() => null);
  if (!total) throw new Error('cart total not rendered');
  return { cartTotal: total };
});

await step('cafe-checkout', async (rec) => {
  await page.locator('button', { hasText: /ثبت نهایی سفارش|سفارش بوفه/ }).first().click({ timeout: 15000 });
  const t = await waitToast(/سفارش|موفق|ثبت/);
  rec.notes.push('toast: ' + t);
  await page.waitForTimeout(2000);
  return { toast: t };
});

/* ── 06 · Buy from the gear shop ───────────────────────────────── */
await step('shop-add-and-checkout', async (rec) => {
  await nav('فروشگاه').click({ timeout: 20000 });
  await page.waitForTimeout(3000);
  const buy = page.locator('button', { hasText: /خرید فوری کالا/ });
  rec.notes.push('products: ' + (await buy.count()));
  await buy.nth(0).click(); await page.waitForTimeout(700);
  await buy.nth(2).click(); await page.waitForTimeout(900);
  const checkout = page.locator('button', { hasText: /ثبت نهایی|پرداخت|تسویه/ }).last();
  await checkout.click({ timeout: 15000 });
  const t = await waitToast(/سفارش|خرید|موفق|ثبت/);
  rec.notes.push('toast: ' + t);
  await page.waitForTimeout(1500);
  return { toast: t };
});

/* ── 07 · Register a team for a tournament ─────────────────────── */
await step('tournament-register-team', async (rec) => {
  await nav('مسابقات').click({ timeout: 20000 });
  await page.waitForTimeout(3500);
  await page.selectOption('select', { index: 0 }).catch(() => {});
  await page.fill('input[placeholder="e.g. Persis Esports"]', `Team_${STAMP}`);
  await page.fill('input[placeholder="e.g. Sina_Gamer"]', USER.username);
  await page.fill('input[placeholder="Gamertag"]', `Mate_${STAMP}`);
  await page.locator('input[placeholder="Gamertag"]').locator('xpath=following::button[1]').click().catch(() => {});
  await page.waitForTimeout(600);
  await page.locator('button', { hasText: /پرداخت ورودی و ثبت‌نام تیم/ }).first().click({ timeout: 15000 });
  const t = await waitToast(/ثبت|تیم|موفق/);
  rec.notes.push('toast: ' + t);
  await page.waitForTimeout(2500);
  const list = await page.locator('body').innerText();
  return { toast: t, teamVisibleInList: list.includes(`Team_${STAMP}`) };
});

/* ── 08 · Loyalty club: redeem points ──────────────────────────── */
await step('loyalty-redeem-points', async (rec) => {
  await nav('باشگاه').click({ timeout: 20000 });
  await page.waitForTimeout(3000);
  const pts = await page.locator('body').innerText();
  rec.notes.push('page mentions points: ' + /امتیاز/.test(pts));
  await page.locator('button', { hasText: /^100 امتیاز$/ }).first().click().catch(() => {});
  await page.waitForTimeout(600);
  await page.locator('button', { hasText: /تبدیل امتیاز به کوپن/ }).first().click({ timeout: 15000 });
  const t = await waitToast(/امتیاز|کوپن|کافی|تخفیف/);
  rec.notes.push('toast: ' + t);
  return { toast: t };
});

/* ── 09 · Theme switcher ───────────────────────────────────────── */
await step('theme-switcher', async (rec) => {
  await page.locator('header button.rounded-full').last().click({ timeout: 15000 });
  await page.waitForTimeout(2500);
  const cards = page.locator('[class*="cursor-pointer"]').filter({ hasText: /قالب|Theme|طلایی|بنفش/ });
  rec.notes.push('theme modal open: ' + (await page.locator('body').innerText()).includes('قالب'));
  await page.keyboard.press('Escape').catch(() => {});
  await page.waitForTimeout(1000);
  return { themeCards: await cards.count() };
});

/* ── 10 · Visual help guide ────────────────────────────────────── */
await step('help-guide', async (rec) => {
  await page.locator('header button[title*="راهنما"]').first().click({ timeout: 15000 });
  await page.waitForTimeout(2000);
  const open = (await page.locator('body').innerText()).includes('راهنما');
  await page.keyboard.press('Escape').catch(() => {});
  await page.waitForTimeout(800);
  return { helpOpened: open };
});

/* ── 11 · Blog + comment ───────────────────────────────────────── */
await step('blog-open-and-comment', async (rec) => {
  await nav('خانه').click({ timeout: 20000 });
  await page.waitForTimeout(3000);
  const cta = page.locator('button', { hasText: /اخبار کلوپ و مقالات/ }).first();
  if (await cta.count()) { await cta.click(); } else {
    rec.notes.push('no blog CTA on home — blog tab unreachable from the main navigation');
    throw new Error('blog entry point not found in UI');
  }
  await page.waitForTimeout(3000);
  const ta = page.locator('textarea').first();
  if (await ta.count()) {
    await ta.fill('تست خودکار: مقاله عالی بود!');
    await page.locator('button', { hasText: /ارسال|ثبت نظر|کامنت/ }).first().click().catch(() => {});
    const t = await waitToast(/نظر|ثبت|موفق/).catch((e) => 'no toast');
    rec.notes.push('comment toast: ' + t);
  } else rec.notes.push('no comment textarea visible on blog landing');
  return { bodyHas: (await page.locator('body').innerText()).slice(0, 120) };
});

/* ── 12 · Mobile sweep ─────────────────────────────────────────── */
await page.setViewportSize({ width: 390, height: 844 });
for (const tab of ['خانه', 'رزرو', 'کافه', 'فروشگاه', 'مسابقات', 'باشگاه']) {
  await step(`mobile-${tab}`, async (rec) => {
    const b = page.locator('button', { hasText: new RegExp(`^${tab}$`) }).first();
    await b.click({ timeout: 20000 });
    await page.waitForTimeout(2800);
    const m = await page.evaluate(() => ({ scrollW: document.body.scrollWidth, innerW: window.innerWidth, overflow: document.body.scrollWidth > window.innerWidth + 1 }));
    if (m.overflow) rec.notes.push('HORIZONTAL OVERFLOW');
    return m;
  });
}

const report = { base: BASE, user: USER, when: new Date().toISOString(), steps, allConsoleErrors: errors, allNetworkFailures: netFails };
writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(report, null, 2));
console.log('\n=== ' + steps.filter((s) => s.status === 'ok').length + '/' + steps.length + ' steps ok ===');
console.log('network failures:', JSON.stringify([...new Set(netFails)], null, 1));
await browser.close();
