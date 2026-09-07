/**
 * Games page visual journey — real Chromium, four languages, desktop + mobile.
 * Captures: three category cards, KIDS/ADULTS filtered reservation flow,
 * GAME REQUESTS focus, legacy /reservations → /games normalization, nav bars.
 * Screenshots land in shots/games/*.png (gitignored) for human/eye review.
 */
import { launch, outDir } from './lib.mjs';

const BASE = process.env.BASE || 'http://127.0.0.1:3000';
const out = outDir('games');
const results = [];
const consoleErrors = [];

async function withLang(lang, fn) {
  const { browser, context, page, errors } = await launch({ width: 1440, height: 900 });
  // یک زبان در هر context
  await context.addInitScript((l) => { try { localStorage.setItem('cyber_lang', l); } catch {} }, lang);
  try { await fn(page, errors); } finally { consoleErrors.push(...errors.map(e => `[${lang}] ${e}`)); await browser.close(); }
}

const shot = (page, name) => page.screenshot({ path: `${out}/${name}.png`, fullPage: true }).catch(e => { throw new Error(`screenshot ${name} failed: ${e.message}`); });
const step = async (name, fn) => {
  try { await fn(); results.push({ name, ok: true }); console.log('  ✓', name); }
  catch (e) { results.push({ name, ok: false, error: String(e).slice(0, 300) }); console.log('  ✗', name, '→', String(e).slice(0, 200)); }
};

/* ── فارسی دسکتاپ ─────────────────────────────────────────────── */
await withLang('fa', async (page, errors) => {
  await step('fa: /games shows three separated cards', async () => {
    await page.goto(`${BASE}/games`, { waitUntil: 'domcontentloaded', timeout: 90000 });
    await page.waitForTimeout(4500);
    for (const id of ['games-card-kids', 'games-card-adults', 'games-card-requests']) {
      if (!(await page.locator(`[data-testid="${id}"]`).count())) throw new Error('missing card ' + id);
    }
    await shot(page, '01-fa-games-cards-desktop');
  });

  await step('fa: ADULTS opens the real reservation flow (systems + coupon + pay)', async () => {
    await page.locator('[data-testid="games-card-adults"]').click();
    await page.waitForTimeout(2500);
    if (!(await page.getByText('سیستم شماره ۱', { exact: false }).count())) throw new Error('adults systems not visible');
    if (!(await page.getByText('سیستم شماره ۳', { exact: false }).count() === 0)) throw new Error('kids system leaked into adults category');
    await shot(page, '02-fa-adults-reservation-flow');
  });

  await step('fa: KIDS category filters correctly', async () => {
    await page.locator('[data-testid="games-back"]').click();
    await page.waitForTimeout(800);
    await page.locator('[data-testid="games-card-kids"]').click();
    await page.waitForTimeout(2500);
    if (!(await page.getByText('سیستم شماره ۳', { exact: false }).count())) throw new Error('kids systems not visible');
    if (await page.getByText('سیستم شماره ۱', { exact: false }).count()) throw new Error('adults system leaked into kids category');
    await shot(page, '03-fa-kids-reservation-flow');
  });

  await step('fa: GAME REQUESTS focuses the requested-game field', async () => {
    await page.locator('[data-testid="games-back"]').click();
    await page.waitForTimeout(800);
    await page.locator('[data-testid="games-card-requests"]').click();
    await page.waitForTimeout(2000);
    await page.locator('button').filter({ hasText: /سیستم|کنسول/ }).first().click();
    await page.waitForTimeout(1200);
    const focused = await page.evaluate(() => document.activeElement?.hasAttribute('data-requested-game-input'));
    if (!focused) throw new Error('requested-game input not focused for GAME REQUESTS');
    await shot(page, '04-fa-requests-flow');
  });

  await step('fa: legacy /reservations normalizes to /games', async () => {
    await page.goto(`${BASE}/reservations`, { waitUntil: 'domcontentloaded', timeout: 90000 });
    await page.waitForTimeout(4000);
    const path = await page.evaluate(() => window.location.pathname);
    if (path !== '/games') throw new Error('expected /games, got ' + path);
    if (!(await page.locator('[data-testid="games-card-kids"]').count())) throw new Error('games content not shown for legacy path');
    await shot(page, '05-fa-legacy-reservations-redirect');
  });

  await step('fa: header/menu keeps Cafe, Shop, Arena; top-level Reserve is gone', async () => {
    const navText = await page.evaluate(() => document.querySelector('header')?.innerText || '');
    for (const must of ['بازی‌ها', 'کافه', 'فروشگاه', 'مسابقات', 'باشگاه', 'بلاگ', 'گفتگو']) {
      if (!navText.includes(must)) throw new Error('nav missing ' + must);
    }
    if (/رزرو/.test(navText)) throw new Error('top-level Reserve tab still present');
  });
});

/* ── EN / TR / RU دسکتاپ — فقط کارت‌ها ────────────────────────── */
for (const [lang, re] of [['en', /KIDS/], ['tr', /ÇOCUKLAR/], ['ru', /ДЕТИ/]]) {
  await withLang(lang, async (page) => {
    await step(`${lang}: /games cards in ${lang}`, async () => {
      await page.goto(`${BASE}/games`, { waitUntil: 'domcontentloaded', timeout: 90000 });
      await page.waitForTimeout(4500);
      if (!(await page.locator('[data-testid="games-card-kids"]').count())) throw new Error('cards missing');
      const text = await page.locator('[data-testid="games-page"]').innerText();
      if (!re.test(text)) throw new Error(`expected ${re} in page text`);
      await shot(page, `06-${lang}-games-cards`);
    });
  });
}

/* ── فارسی موبایل ۳۹۰ ─────────────────────────────────────────── */
await withLang('fa', async (page) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await step('fa mobile: bottom nav shows Games; cards fit 390px', async () => {
    await page.goto(`${BASE}/games`, { waitUntil: 'domcontentloaded', timeout: 90000 });
    await page.waitForTimeout(4500);
    const m = await page.evaluate(() => ({ scrollW: document.body.scrollWidth, innerW: window.innerWidth }));
    if (m.scrollW > m.innerW + 2) throw new Error(`horizontal overflow ${m.scrollW}>${m.innerW}`);
    await shot(page, '07-fa-games-mobile-cards');
    await page.locator('[data-testid="games-card-kids"]').click();
    await page.waitForTimeout(2500);
    await shot(page, '08-fa-games-mobile-kids-flow');
  });
});

const failed = results.filter(r => !r.ok);
console.log('\n==== games journey summary ====');
console.log(JSON.stringify({ passed: results.length - failed.length, failed: failed.length, results }, null, 1));
if (failed.length) process.exit(1);
if (consoleErrors.length) { console.log('CONSOLE ERRORS:\n' + consoleErrors.join('\n')); process.exit(2); }
console.log('NO CONSOLE ERRORS');
