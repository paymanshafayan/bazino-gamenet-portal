/**
 * Bazino Pro — E2E part 2: modals, mobile navigation, blog/chat reachability,
 * theme apply, admin panel, standalone pages.
 */
import path from 'node:path';
import { writeFileSync } from 'node:fs';
import { launch, outDir } from './lib.mjs';

const BASE = process.env.BASE || 'http://127.0.0.1:3000';
const OUT = outDir('e2e2');
const { browser, page, errors } = await launch({ width: 1440, height: 900 });
const netFails = [];
page.on('requestfailed', (r) => netFails.push(`FAILED ${r.url().replace(BASE, '')}`));
page.on('response', (r) => { if (r.status() >= 400) netFails.push(`${r.status()} ${r.url().replace(BASE, '')}`); });

const steps = [];
let n = 0;
async function step(name, fn, { shot = true } = {}) {
  n += 1; const id = String(n).padStart(2, '0');
  const before = errors.length, beforeNet = netFails.length;
  const rec = { id, name, status: 'ok', notes: [] };
  try { const r = await fn(rec); if (r) rec.result = r; }
  catch (e) { rec.status = 'FAIL'; rec.error = String(e).split('\n')[0].slice(0, 300); }
  rec.newConsoleErrors = errors.slice(before); rec.newNetworkFailures = netFails.slice(beforeNet);
  if (shot) { rec.screenshot = `${id}-${name.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.png`; await page.screenshot({ path: path.join(OUT, rec.screenshot), fullPage: true }).catch(() => {}); }
  steps.push(rec);
  console.log(`[${rec.status === 'ok' ? ' OK ' : 'FAIL'}] ${id} ${name}${rec.error ? ' :: ' + rec.error : ''}`);
  return rec;
}
const nav = (label) => page.locator('header nav button', { hasText: label }).first();
const toasts = () => page.locator('.fixed.top-6 > div span').allInnerTexts().catch(() => []);
async function waitToast(re, timeout = 10000) {
  const end = Date.now() + timeout;
  while (Date.now() < end) { const ts = await toasts(); const hit = ts.find((t) => re.test(t)); if (hit) return hit; await page.waitForTimeout(400); }
  throw new Error('no toast ' + re + ' seen=' + JSON.stringify(await toasts()));
}

await step('load-home', async () => {
  await page.goto(BASE + '/', { waitUntil: 'domcontentloaded', timeout: 90000 });
  await page.waitForTimeout(4500);
  return { title: await page.title() };
});

/* ── Theme modal: Escape behaviour + actually applying a theme ──── */
await step('theme-modal-escape-key', async (rec) => {
  await page.locator('header > div:last-child > button').last().click({ timeout: 15000 });
  await page.waitForTimeout(2500);
  const openedBefore = (await page.locator('body').innerText()).includes('انتخاب قالب بصری');
  await page.keyboard.press('Escape');
  await page.waitForTimeout(1200);
  const stillOpen = (await page.locator('body').innerText()).includes('انتخاب قالب بصری');
  if (stillOpen) rec.notes.push('BUG: Escape does not close the theme modal');
  return { openedBefore, closedByEscape: !stillOpen };
});

await step('theme-apply-gaming-amp', async (rec) => {
  const card = page.locator('div', { hasText: /^Gaming AMP$/ }).first();
  await page.locator('text=Gaming AMP').first().click({ timeout: 15000 });
  await page.waitForTimeout(3500);
  const cls = await page.evaluate(() => document.querySelector('#root > div')?.className || '');
  rec.notes.push('root class: ' + cls.slice(0, 80));
  // close if still open
  const x = page.locator('button:has(svg.lucide-x)').first();
  if ((await page.locator('body').innerText()).includes('انتخاب قالب بصری')) { await x.click().catch(() => {}); await page.waitForTimeout(1200); }
  return { themeClassApplied: /theme-/.test(cls), cls: cls.slice(0, 60) };
});

await step('theme-restore-dark-gold', async () => {
  await page.locator('header > div:last-child > button').last().click({ timeout: 15000 });
  await page.waitForTimeout(2500);
  await page.locator('text=Dark Gold').first().click().catch(() => {});
  await page.waitForTimeout(2500);
  const body = await page.locator('body').innerText();
  if (body.includes('انتخاب قالب بصری')) { await page.locator('button:has(svg.lucide-x)').first().click().catch(() => {}); await page.waitForTimeout(1000); }
  return { modalClosed: !(await page.locator('body').innerText()).includes('انتخاب قالب بصری') };
});

/* ── Visual help guide ─────────────────────────────────────────── */
await step('help-guide-modal', async (rec) => {
  await page.locator('header button[title*="راهنما"]').first().click({ timeout: 15000 });
  await page.waitForTimeout(2500);
  const txt = await page.locator('body').innerText();
  const opened = /راهنمای/.test(txt);
  const nextBtn = page.locator('button', { hasText: /بعدی|Next/ }).first();
  if (await nextBtn.count()) { await nextBtn.click(); await page.waitForTimeout(1200); rec.notes.push('stepped to next slide'); }
  await page.keyboard.press('Escape');
  await page.waitForTimeout(1000);
  const closed = !/راهنمای تصویری|راهنمای گام/.test(await page.locator('body').innerText());
  if (!closed) { await page.locator('button:has(svg.lucide-x)').first().click().catch(() => {}); await page.waitForTimeout(800); }
  return { opened, closedByEscape: closed };
});

/* ── Blog reachability ─────────────────────────────────────────── */
await step('blog-reachability', async (rec) => {
  const inHeader = await page.locator('header nav button', { hasText: /بلاگ|مقالات|اخبار/ }).count();
  const cta = page.locator('button', { hasText: /اخبار کلوپ و مقالات/ });
  const ctaCount = await cta.count();
  rec.notes.push(`header nav entry: ${inHeader}, home CTA: ${ctaCount}`);
  if (!inHeader && !ctaCount) rec.notes.push('BUG: blog tab has no entry point in the UI');
  if (ctaCount) { await cta.first().click(); await page.waitForTimeout(3500); }
  return { inHeader, ctaCount, heading: await page.locator('h1,h2').first().innerText().catch(() => null) };
});

await step('blog-read-article-and-comment', async (rec) => {
  const read = page.locator('button', { hasText: /ادامه مطلب|مطالعه|خواندن/ }).first();
  if (await read.count()) { await read.click(); await page.waitForTimeout(2500); } else rec.notes.push('no "read more" button found');
  const ta = page.locator('textarea').first();
  if (await ta.count()) {
    await ta.fill('تست خودکار بازینو: مقاله مفیدی بود.');
    const send = page.locator('button', { hasText: /ارسال|ثبت نظر|نظر/ }).last();
    await send.click().catch(() => {});
    const t = await waitToast(/.+/, 8000).catch(() => 'NO TOAST');
    rec.notes.push('comment toast: ' + t);
    await page.waitForTimeout(1500);
    const persisted = await page.evaluate(async () => {
      const a = await fetch('/api/articles').then((r) => r.json()).catch(() => []);
      return JSON.stringify(a).includes('تست خودکار بازینو');
    });
    if (!persisted) rec.notes.push('BUG: comment is not persisted to /api/articles');
    return { toast: t, persisted };
  }
  rec.notes.push('no comment box on blog page');
  return { commentBox: false };
});

/* ── Chat ──────────────────────────────────────────────────────── */
await step('chat-reachability-and-send', async (rec) => {
  const entry = page.locator('button', { hasText: /چت|گفتگو|Chat/ }).first();
  if (!(await entry.count())) { rec.notes.push('BUG: chat tab has no entry point in the site UI'); return { reachable: false }; }
  await entry.click(); await page.waitForTimeout(3000);
  const input = page.locator('input[type=text], textarea').last();
  if (await input.count()) { await input.fill('سلام! تست خودکار.'); await page.keyboard.press('Enter'); await page.waitForTimeout(2000); }
  return { reachable: true, body: (await page.locator('body').innerText()).slice(0, 150) };
});

/* ── Mobile navigation ─────────────────────────────────────────── */
await step('mobile-navigation-availability', async (rec) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(BASE + '/', { waitUntil: 'domcontentloaded', timeout: 90000 });
  await page.waitForTimeout(4500);
  const info = await page.evaluate(() => {
    const vis = (el) => el.getClientRects().length > 0;
    const btns = [...document.querySelectorAll('button')].filter(vis).map((b) => (b.innerText || b.getAttribute('aria-label') || '').trim()).filter(Boolean);
    const navVisible = [...document.querySelectorAll('header nav')].some(vis);
    return { navVisible, visibleButtons: btns.slice(0, 30), scrollW: document.body.scrollWidth, innerW: window.innerWidth };
  });
  if (!info.navVisible) rec.notes.push('BUG: header navigation is hidden below md and no bottom/hamburger nav replaces it');
  return info;
});

for (const [label, tab] of [['رزرو', 'reservations'], ['کافه', 'cafe'], ['فروشگاه', 'shop'], ['مسابقات', 'tournaments'], ['باشگاه', 'loyalty']]) {
  await step(`mobile-tab-${tab}`, async (rec) => {
    // reach the tab the only way a phone user can: home CTA buttons
    const cta = page.locator('button', { hasText: new RegExp(label === 'رزرو' ? 'رزرو' : label) }).first();
    if (await cta.count()) { await cta.click({ timeout: 15000 }).catch(() => {}); }
    else rec.notes.push('no mobile entry point for ' + label);
    await page.waitForTimeout(3000);
    const m = await page.evaluate(() => ({ scrollW: document.body.scrollWidth, innerW: window.innerWidth, h: document.body.scrollHeight }));
    m.overflow = m.scrollW > m.innerW + 1;
    if (m.overflow) rec.notes.push('HORIZONTAL OVERFLOW');
    await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' }).catch(() => {});
    await page.waitForTimeout(2500);
    return m;
  });
}

/* ── Standalone pages ──────────────────────────────────────────── */
await page.setViewportSize({ width: 1440, height: 900 });
for (const p of ['/app-download', '/install']) {
  await step(`page${p}`, async (rec) => {
    const r = await page.goto(BASE + p, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForTimeout(3500);
    return { status: r?.status(), heading: await page.locator('h1,h2').first().innerText().catch(() => null) };
  });
}

/* ── Admin panel ───────────────────────────────────────────────── */
await step('admin-login', async (rec) => {
  await page.goto(BASE + '/', { waitUntil: 'domcontentloaded', timeout: 90000 });
  await page.waitForTimeout(4000);
  const logout = page.locator('header button[aria-label="Logout"]');
  if (await logout.count()) { await logout.click(); await page.waitForTimeout(500); await page.locator('button', { hasText: /^خروج$/ }).last().click().catch(() => {}); await page.waitForTimeout(2500); }
  await page.locator('header button', { hasText: /ورود|Login/ }).first().click({ timeout: 15000 });
  await page.waitForTimeout(1200);
  await page.fill('input[placeholder="e.g. Sina_ProGamer"]', 'admin');
  await page.fill('input[placeholder="••••••••"]', 'admin');
  await page.locator('form button[type=submit]').first().click();
  await page.waitForTimeout(3500);
  const banner = await page.locator('button', { hasText: /ورود به پنل مدیریت/ }).count();
  return { adminBanner: banner };
});

await step('admin-panel-open', async (rec) => {
  await page.locator('button', { hasText: /ورود به پنل مدیریت/ }).first().click({ timeout: 20000 });
  await page.waitForTimeout(6000);
  const txt = await page.locator('body').innerText();
  return { headingFound: /پنل مدیریت/.test(txt), sections: (await page.locator('aside button, nav button').allInnerTexts().catch(() => [])).slice(0, 30) };
});

const report = { base: BASE, when: new Date().toISOString(), steps, allConsoleErrors: [...new Set(errors)], allNetworkFailures: [...new Set(netFails)] };
writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(report, null, 2));
console.log('\n=== ' + steps.filter((s) => s.status === 'ok').length + '/' + steps.length + ' ok ===');
await browser.close();
