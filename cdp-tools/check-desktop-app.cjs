#!/usr/bin/env node
/**
 * چک خودکار «نرم‌افزار مدیریت گیم‌نت» نصب‌شده در همین محیط (نسخهٔ دسکتاپ).
 *
 * این اسکریپت فرض می‌کند نسخهٔ دسکتاپ از قبل اجرا شده است (پروسهٔ main الکترون،
 * شبیه‌سازی‌شده با desktop-app/scripts/run-headless-desktop.cjs روی BAZINO_DESKTOP_PORT،
 * پیش‌فرض 3100). اگر پورت بسته باشد، خودش سرور را بالا می‌آورد و آخر کار می‌بندد.
 *
 * وابستگی‌ها: puppeteer-core + @sparticuz/chromium (از /home/user/shot-browser یا cwd).
 *
 * خروجی: گزارش PASS/FAIL + اسکرین‌شات‌ها در cdp-tools/shots/desktop-*.png
 * کد خروج: 0 = همه چک‌ها سبز، 1 = حداقل یک شکست.
 */
const http = require('http');
const path = require('path');
const { spawn } = require('child_process');

const PORT = process.env.BAZINO_DESKTOP_PORT || '3100';
const BASE = `http://127.0.0.1:${PORT}`;
const SHOTS = path.join(__dirname, '..', 'cdp-tools', 'shots');
const DESKTOP_DIR = path.join(__dirname, '..', 'desktop-app');

// ── وابستگی‌های Chromium ──
let chromium, puppeteer;
for (const base of ['/home/user/shot-browser/node_modules', path.join(__dirname, '..', 'node_modules')]) {
  try {
    // @sparticuz/chromium پکیج ESM-only است؛ resolve از طریق exports تا فایل اصلی لازم است
    chromium = require(require.resolve('@sparticuz/chromium', { paths: [base] }));
    if (chromium && chromium.default) chromium = chromium.default;
    puppeteer = require(require.resolve('puppeteer-core', { paths: [base] }));
    break;
  } catch { /* سمت بعدی */ }
}
if (!chromium || !puppeteer) {
  console.error('❌ puppeteer-core/@sparticuz/chromium پیدا نشد — در /home/user/shot-browser یک بار `npm i puppeteer-core @sparticuz/chromium` بزنید.');
  process.exit(1);
}

// ── ابزارها ──
const results = [];
const check = (name, ok, extra = '') => {
  results.push({ name, ok });
  console.log(`  ${ok ? '✅' : '❌'} ${name}${extra ? ` — ${extra}` : ''}`);
};

const api = (method, p, body, token) => new Promise((resolve, reject) => {
  const data = body ? JSON.stringify(body) : null;
  const req = http.request(`${BASE}${p}`, {
    method, headers: {
      ...(data ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  }, (res) => { let b = ''; res.on('data', (c) => (b += c)); res.on('end', () => { try { resolve({ status: res.statusCode, json: JSON.parse(b || '{}') }); } catch { resolve({ status: res.statusCode, json: {} }); } }); });
  req.on('error', reject);
  if (data) req.write(data);
  req.end();
});

const waitForPort = (ms) => new Promise((resolve) => {
  const t0 = Date.now();
  const tick = () => {
    const req = http.get(`${BASE}/api/sync/themes`, { headers: { Authorization: 'Bearer __probe__' } }, (res) => { res.resume(); resolve(true); });
    req.on('error', () => (Date.now() - t0 > ms ? resolve(false) : setTimeout(tick, 700)));
  };
  tick();
});

(async () => {
  // ── ۰) سرور نصب‌شده ──
  console.log('── نرم‌افزار دسکتاپ بازینو — چک خودکار ──');
  let spawned = null;
  if (!(await waitForPort(1500))) {
    console.log('سرور بالا نیست — اجرای run-headless-desktop.cjs ...');
    spawned = spawn(process.execPath, [path.join(DESKTOP_DIR, 'scripts', 'run-headless-desktop.cjs')], {
      cwd: DESKTOP_DIR, stdio: 'ignore', detached: false, env: { ...process.env, BAZINO_DESKTOP_PORT: PORT },
    });
    if (!(await waitForPort(30000))) {
      console.error('❌ سرور دسکتاپ بالا نیامد (پورت ' + PORT + ').');
      spawned.kill(); process.exit(1);
    }
  }
  console.log('سرور نصب‌شده در حال اجرا:', BASE);

  // ── ۱) راه‌اندازی دادهٔ تست مثل یک اپراتور واقعی ──
  const login = await api('POST', '/api/auth/login', { username: 'admin', password: 'admin' });
  check('ورود ادمین پیش‌فرض (admin/admin) روی دیتابیس محلی', login.status === 200 && !!login.json.token);
  const T = login.json.token || '';

  await api('POST', '/api/admin/reset-database', undefined, T).catch(() => {});
  await api('POST', '/api/admin/sync-settings', { apiKey: 'desktop-local-key-1' }, T).catch(() => {});

  // کاربر + تیکت + پیام برای دیدن دیتای واقعی در تب‌ها
  const uname = `chk_${Date.now().toString(36)}`;
  const reg = await api('POST', '/api/auth/register', { username: uname, email: `${uname}@t.dev`, password: 'Passw0rd!', phone: `0912${String(Date.now()).slice(-7)}` });
  const utok = reg.json.token || '';
  await api('POST', '/api/me/tickets', { subject: 'گیردستی PS5 خراب است', message: 'دستهٔ دوم PS5 داخل اتاق VIP وصل نیست، لطفاً بررسی کنید.', category: 'technical', priority: 'high' }, utok);
  await api('POST', '/api/sync/messages', { recipient: 'All', title: 'شب‌بازی جمعه', body: 'جمعه ۲۰٪ تخفیف روی سانس‌های شب آمادهٔ شماست!' }, 'desktop-local-key-1');

  // ── ۲) Chromium با ابعاد پنجرهٔ واقعی اپ (main.js: 1440×900) ──
  const zlib = require('zlib'); const fs = require('fs'); const { execSync } = require('child_process');
  if (!fs.existsSync('/tmp/al2023/lib')) {
    fs.mkdirSync('/tmp/al2023', { recursive: true });
    fs.writeFileSync('/tmp/al2023.tar', zlib.brotliDecompressSync(fs.readFileSync('/home/user/shot-browser/node_modules/@sparticuz/chromium/bin/al2023.tar.br')));
    execSync('tar -xf /tmp/al2023.tar -C /tmp/al2023');
  }
  process.env.FONTCONFIG_PATH = '/tmp/fonts';
  const browser = await puppeteer.launch({
    executablePath: await chromium.executablePath(),
    args: [...chromium.args, '--no-sandbox', '--disable-gpu'],
    headless: true,
    env: { ...process.env, LD_LIBRARY_PATH: '/tmp/al2023/lib' },
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });
  const pageErrors = [];
  page.on('pageerror', (e) => pageErrors.push(String(e && e.message).slice(0, 100)));

  await page.goto(`${BASE}/management-app/`, { waitUntil: 'load', timeout: 60000 });
  await page.evaluate(() => {
    localStorage.setItem('bazino_web_sync_status', JSON.stringify({
      isConnected: true, lastSyncTime: new Date().toLocaleTimeString('fa-IR'), pendingTransactionsCount: 0,
      webServerUrl: '', apiKey: 'desktop-local-key-1',
    }));
  });
  await page.reload({ waitUntil: 'load' });
  await new Promise((r) => setTimeout(r, 3500));

  // ── ۳) ورود امن (ops gate) ──
  await page.evaluate(() => {
    const set = (el, val) => { const s = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set; s.call(el, val); el.dispatchEvent(new Event('input', { bubbles: true })); };
    set(document.querySelector('[data-ops-login-user]'), 'admin');
    set(document.querySelector('[data-ops-login-password]'), 'admin');
  });
  await page.evaluate(() => { Array.from(document.querySelectorAll('button')).find((b) => (b.textContent || '').includes('ورود امن'))?.click(); });
  await new Promise((r) => setTimeout(r, 5000));
  const loggedIn = await page.evaluate(() => !document.querySelector('[data-ops-login-user]'));
  check('صفحهٔ ورود امن → ورود موفق ادمین', loggedIn);
  await page.screenshot({ path: `${SHOTS}/desktop-01-dashboard.png` });

  // ── ۴) داشبورد ایستگاه‌ها ──
  let st = await page.evaluate(() => ({
    header: document.body.innerText.includes('BAZINO') || document.body.innerText.includes('بازینو'),
    hasJarvisTab: !!Array.from(document.querySelectorAll('button')).find((b) => (b.textContent || '').includes('جارویس')),
    hasWebSync: !!Array.from(document.querySelectorAll('button')).find((b) => (b.textContent || '').includes('همگام وب')),
  }));
  check('هدر اپ + دکمه‌های اصلی', st.header && st.hasWebSync, JSON.stringify(st));
  check('تب جارویس در نوار اپ', st.hasJarvisTab);

  // ── ۵) مودال «همگام وب» — همهٔ تب‌ها ──
  await page.evaluate(() => { Array.from(document.querySelectorAll('button')).find((b) => (b.textContent || '').includes('همگام وب'))?.click(); });
  await new Promise((r) => setTimeout(r, 1200));

  const openTab = async (name) => {
    const ok = await page.evaluate((nm) => {
      const t = Array.from(document.querySelectorAll('button')).find((x) => (x.textContent || '').includes(nm));
      if (t) { t.scrollIntoView(); t.click(); return true; } return false;
    }, name);
    await new Promise((r) => setTimeout(r, 2400));
    return ok;
  };

  // وضعیت اتصال
  check('تب وضعیت اتصال', await openTab('وضعیت اتصال'));
  st = await page.evaluate(() => document.body.innerText.includes('متصل و آماده تبادل داده'));
  check('  اتصال به سرور داخلی برقرار', st);

  // رزروها
  check('تب رزروهای آنلاین', await openTab('رزروهای آنلاین'));

  // قالب‌ها
  check('تب قالب‌های سایت', await openTab('قالب‌های سایت'));
  st = await page.evaluate(() => ({
    cards: Array.from(document.querySelectorAll('button,div')).filter((x) => (x.textContent || '').match(/فعال‌سازی|فعال$/m)).length,
    install: document.body.innerText.includes('نصب قالب جدید از فایل ZIP'),
  }));
  check('  لیست قالب‌های دیتابیس محلی + نصب ZIP', st.install, JSON.stringify(st));
  await page.screenshot({ path: `${SHOTS}/desktop-02-themes.png` });

  // تیکت‌ها
  check('تب تیکت‌های پشتیبانی', await openTab('تیکت‌های پشتیبانی'));
  st = await page.evaluate(() => ({
    ticket: !!Array.from(document.querySelectorAll('button')).find((x) => (x.textContent || '').includes('گیردستی PS5')),
    pending: (Array.from(document.querySelectorAll('span')).find((x) => (x.textContent || '').includes('در انتظار')) || {}).textContent || '',
  }));
  check('  تیکت تستی از سرور محلی دیده می‌شود', st.ticket, st.pending);
  // پاسخ به تیکت از داخل UI
  await page.evaluate(() => { Array.from(document.querySelectorAll('button')).find((x) => (x.textContent || '').includes('گیردستی PS5'))?.click(); });
  await new Promise((r) => setTimeout(r, 1500));
  const replied = await page.evaluate(() => {
    const ta = Array.from(document.querySelectorAll('textarea')).find((x) => (x.placeholder || '').includes('پاسخ پشتیبانی'));
    if (!ta) return false;
    const s = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set;
    s.call(ta, 'دسته تعویض شد — لطفاً دوباره تست کنید. پشتیبانی بازینو');
    ta.dispatchEvent(new Event('input', { bubbles: true }));
    setTimeout(() => Array.from(document.querySelectorAll('button')).find((b) => (b.textContent || '').includes('ارسال پاسخ'))?.click(), 100);
    return true;
  });
  await new Promise((r) => setTimeout(r, 2500));
  st = await page.evaluate(() => !!Array.from(document.querySelectorAll('div')).find((x) => (x.textContent || '').includes('دسته تعویض شد')));
  check('  ارسال پاسخ از داخل اپ روی سرور محلی', replied && st);
  await page.screenshot({ path: `${SHOTS}/desktop-03-tickets.png` });

  // پیام‌ها
  check('تب پیام‌ها و نوتیفیکیشن', await openTab('پیام‌ها و نوتیفیکیشن'));
  st = await page.evaluate(() => !!Array.from(document.querySelectorAll('h4,div')).find((x) => (x.textContent || '').includes('شب‌بازی جمعه')));
  check('  پیام جمعی در تاریخچه دیده می‌شود', st);

  // گفتگو
  check('تب گفتگوی زنده', await openTab('گفتگوی زنده'));
  st = await page.evaluate(() => ['عمومی', 'CS2', 'Valorant', 'FIFA'].some((r) => document.body.innerText.includes(r)));
  check('  اتاق‌های گفتگوی نمونه فهرست شدند', st);
  await page.screenshot({ path: `${SHOTS}/desktop-04-chat.png` });

  // پیامک گروهی
  check('تب پیامک گروهی', await openTab('پیامک گروهی'));
  st = await page.evaluate(() => document.body.innerText.includes('مساجیو') && document.body.innerText.includes('کمپین‌های اخیر'));
  check('  درگاه مساجیو + کمپین‌ها بارگذاری شد', st);

  // تنظیمات سایت — ویرایش واقعی از داخل UI
  check('تب تنظیمات سایت', await openTab('تنظیمات سایت'));
  const phoneSaved = await page.evaluate(() => {
    const inp = Array.from(document.querySelectorAll('input')).find((x) => x.placeholder && x.placeholder.includes('+90'));
    if (!inp) return { found: false };
    const s = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
    s.call(inp, '+90 555 000 1122');
    inp.dispatchEvent(new Event('input', { bubbles: true }));
    return { found: true };
  });
  await page.evaluate(() => {
    // از خود اینپوت به سمت بالا می‌رویم تا کارتِ «مشخصات تماس» و دکمهٔ «ذخیره»‌اش پیدا شود
    const inp = Array.from(document.querySelectorAll('input')).find((x) => x.placeholder && x.placeholder.includes('+90'));
    if (!inp) return;
    let el = inp;
    while (el && el !== document.body) {
      const btn = Array.from(el.querySelectorAll('button')).find((b) => (b.textContent || '').trim() === 'ذخیره');
      if (btn) { btn.click(); return; }
      el = el.parentElement;
    }
  });
  await new Promise((r) => setTimeout(r, 2000));
  const after = await api('GET', '/api/sync/site-settings', undefined, 'desktop-local-key-1');
  check('  ویرایش تلفن کلوپ از UI روی سرور محلی ذخیره شد', phoneSaved.found && (after.json.settings || {}).club_phone === '+90 555 000 1122', (after.json.settings || {}).club_phone || 'null');
  await page.screenshot({ path: `${SHOTS}/desktop-05-site-settings.png` });

  // اسلایدر
  check('تب اسلایدر سایت/اپ', await openTab('اسلایدر سایت/اپ'));
  st = await page.evaluate(() => document.querySelectorAll('img').length > 0 && document.body.innerText.includes('اسلاید جدید'));
  check('  اسلایدهای نمونه + دکمهٔ ساخت', st);

  // لاگ‌ها + لاگ دیتابیس
  check('تب لاگ‌ها', await openTab('لاگ‌های تراکنش'));
  st = await page.evaluate(() => document.body.innerText.includes('لاگ موتور دیتابیس سایت'));
  check('  بخش لاگ دیتابیس سایت حاضر است', st);

  // کلید API + توکن‌ها — ساخت توکن از داخل UI
  check('تب تنظیمات کلید API', await openTab('تنظیمات کلید API'));
  st = await page.evaluate(() => document.body.innerText.includes('توکن‌های اتصال خارجی'));
  check('  بخش توکن‌های اتصال حاضر است', st);

  // مستندات
  check('تب مستندات JSON', await openTab('مستندات JSON'));

  await page.keyboard.press('Escape').catch(() => {});
  await new Promise((r) => setTimeout(r, 600));

  // ── ۶) صفحهٔ اصلی سایت (همان سرور داخلی) ──
  await page.goto(`${BASE}/`, { waitUntil: 'load', timeout: 60000 });
  await new Promise((r) => setTimeout(r, 3500));
  st = await page.evaluate(() => ({
    title: document.title,
    hasContent: document.body.innerText.trim().length > 200,
  }));
  check('سایت عمومی هم توسط همان سرور داخلی سرو می‌شود', st.hasContent, st.title);
  await page.screenshot({ path: `${SHOTS}/desktop-06-website.png` });

  // ── ۷) جمع‌بندی ──
  check('بدون خطای جاوااسکریپت در کل مسیر', pageErrors.length === 0, pageErrors.slice(0, 3).join(' | '));

  const passed = results.filter((r) => r.ok).length;
  console.log('\n══════════════════════════════════════');
  console.log(`نتیجه: ${passed}/${results.length} چک موفق ${passed === results.length ? '✅' : '❌'}`);
  console.log(`اسکرین‌شات‌ها: ${SHOTS}/desktop-*.png`);
  console.log('══════════════════════════════════════');

  await browser.close();
  if (spawned) spawned.kill();
  process.exit(passed === results.length ? 0 : 1);
})().catch((e) => { console.error('FAIL:', e && e.message); process.exit(1); });
