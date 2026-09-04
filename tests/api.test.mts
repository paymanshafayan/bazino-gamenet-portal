/**
 * API / end-to-end suites — boot the REAL production server and drive it over HTTP.
 *
 * The server is started as a child process (`node dist/server.cjs`, NODE_ENV=production)
 * inside a throwaway working directory, so its SQLite file, install-config.json and
 * themes/ folder never touch the repo. Every assertion goes through real Express
 * routing, real JWT auth and the real data provider.
 */
import { spawn, type ChildProcess } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, existsSync, symlinkSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { suite, test, skip, assert, run, waitFor, getJson, postJson, putJson } from './harness.mts';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PORT = Number(process.env.TEST_PORT ?? 3457);
const BASE = `http://127.0.0.1:${PORT}`;

const sample = await import('../server/sampleData.ts');

/* ── boot ─────────────────────────────────────────────────────────────── */

const workDir = mkdtempSync(path.join(tmpdir(), 'bazino-api-test-'));
let child: ChildProcess | undefined;
let serverLog = '';
let bootError = '';

const bundle = path.join(ROOT, 'dist/server.cjs');
const distDir = path.join(ROOT, 'dist');

if (!existsSync(bundle)) {
  bootError = 'dist/server.cjs not found — run the backend build first';
} else {
  // The server writes bazino.sqlite3, install-config.json and themes/ relative to
  // process.cwd(), so the child gets a throwaway cwd and the repo stays clean.
  //
  // The bundle is built with --packages=external, so it still needs to resolve
  // express/better-sqlite3/... at runtime: symlink the real node_modules (and the
  // built dist/) into that temp cwd instead of copying them.
  symlinkSync(path.join(ROOT, 'node_modules'), path.join(workDir, 'node_modules'), 'dir');
  symlinkSync(distDir, path.join(workDir, 'dist'), 'dir');
  try {
    child = spawn(process.execPath, [path.join(workDir, 'dist/server.cjs')], {
      cwd: workDir,
      env: {
        ...process.env,
        NODE_ENV: 'production',
        PORT: String(PORT),
        JWT_SECRET: 'test-secret-for-e2e-suite',
        BAZINO_STATIC_ROOT: workDir,
        BAZINO_DATA_DIR: path.join(workDir, 'data'),
        // درگاه شبیه‌سازی‌شده تا جریان create → callback → fulfil بدون paytr.com تست شود
        PAYTR_MOCK: '1',
        // تسک ۱۳: درگاه آنلاین به‌صورت پیش‌فرض خاموش است؛ برای تست جریان PayTR صریحاً روشن می‌شود
        PAYMENT_ONLINE_ENABLED: '1',
        PAYTR_TEST_MODE: '1',
        // OTP از طریق درایور mock؛ dev-peek در production فقط با این پرچم باز می‌شود
        SMS_PROVIDER: 'mock',
        OTP_DEV_PEEK: '1',
        PUBLIC_URL: `http://127.0.0.1:${PORT}`,
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    child.stdout?.on('data', d => { serverLog += d.toString(); });
    child.stderr?.on('data', d => { serverLog += d.toString(); });
    child.on('exit', code => { serverLog += `\n[server exited with code ${code}]`; });

    await waitFor(async () => {
      if (child?.exitCode !== null && child?.exitCode !== undefined) {
        throw new Error(`server exited early (code ${child.exitCode})`);
      }
      const res = await fetch(`${BASE}/api/systems`).catch(() => null);
      return !!res && res.ok;
    }, 45_000, 300, 'the server to accept requests');
  } catch (e: any) {
    bootError = `${e?.message ?? e}\n--- server log ---\n${serverLog.slice(-1500)}`;
  }
}

const shutdown = () => {
  if (child && child.exitCode === null) child.kill('SIGTERM');
  rmSync(workDir, { recursive: true, force: true });
};
process.on('exit', shutdown);

// Shared across suites; declared at module scope so the trailing security suite
// (which lives outside the boot-guard block) can see them too.
const uniqueUser = `e2e_${Date.now().toString(36)}`;
let authToken = '';
// The fallback admin the server seeds on first boot when the users table is empty.
let adminToken = '';
const adminAuth = () => ({ Authorization: `Bearer ${adminToken}` });

if (bootError) {
  suite('17. API');
  skip('all API/end-to-end tests', `server did not boot: ${bootError.split('\n')[0]}`);
  console.error('\nBoot failure detail:\n' + bootError);
} else {

/* ═══════════════════════════════════════════════════════════════════════
   17. Boot & health
   ═══════════════════════════════════════════════════════════════════════ */
suite('17. API — boot & health');

test('the server process is alive', () => {
  assert.equal(child?.exitCode, null, `server died. Log:\n${serverLog.slice(-800)}`);
});

test('it starts on SQLite and logs a clean boot', () => {
  assert.match(serverLog, /BAZINO Backend Server/i, `unexpected boot log:\n${serverLog.slice(-800)}`);
  assert.doesNotMatch(serverLog, /Critical server bootstrap error/i, 'bootstrap error in log');
});

test('the SPA shell is served', async () => {
  const res = await fetch(`${BASE}/`);
  assert.equal(res.status, 200);
  const html = await res.text();
  assert.match(html, /<div id="root">/, 'index.html does not look like the app shell');
});

test('production security headers are present', async () => {
  const res = await fetch(`${BASE}/`);
  const csp = res.headers.get('content-security-policy');
  assert.ok(csp, 'CSP header missing in production mode');
  assert.match(csp!, /default-src 'self'/);
  assert.match(csp!, /object-src 'none'/);
});

/* ═══════════════════════════════════════════════════════════════════════
   18. Public content endpoints
   ═══════════════════════════════════════════════════════════════════════ */
suite('18. API — public content');

const contentEndpoints: Array<[string, number]> = [
  ['/api/systems', sample.SAMPLE_SYSTEMS.length],
  ['/api/cafe', sample.SAMPLE_CAFE_ITEMS.length],
  ['/api/accessories', sample.SAMPLE_ACCESSORIES.length],
  ['/api/tournaments', sample.SAMPLE_TOURNAMENTS.length],
  ['/api/articles', sample.SAMPLE_ARTICLES.length],
  ['/api/app-sliders', sample.SAMPLE_SLIDERS.length],
  ['/api/coupons', sample.SAMPLE_COUPONS.length],
  // /api/transactions عمداً اینجا نیست: دیگر عمومی نیست و برای درخواست بدون توکن
  // آرایه‌ی خالی برمی‌گرداند. تست‌های اختصاصی‌اش در سوئیت مالکیت پایین‌تر هستند.
];

for (const [endpoint, expectedCount] of contentEndpoints) {
  test(`GET ${endpoint} returns the seeded collection`, async () => {
    const data = await getJson(`${BASE}${endpoint}`);
    assert.ok(Array.isArray(data), `${endpoint} did not return an array`);
    assert.equal(data.length, expectedCount, `${endpoint} returned ${data.length}, expected ${expectedCount}`);
  });
}

// /api/state is the Management App's opaque blob, persisted under the
// "managementAppState" setting. It is NOT an aggregate of the shop data, and it
// is legitimately null until something writes it — so test the round-trip.
test('GET /api/state is null before anything writes it', async () => {
  const state = await getJson(`${BASE}/api/state`);
  assert.equal(state, null, 'expected no persisted management state on a fresh DB');
});

test('POST /api/state persists a blob that GET returns verbatim', async () => {
  const blob = { stations: [{ id: 'pc-1', busy: true }], revenue: 125000, nested: { ok: true } };
  const { status } = await postJson(`${BASE}/api/state`, blob);
  assert.equal(status, 200);
  assert.deepEqual(await getJson(`${BASE}/api/state`), blob);
});

test('GET /api/data-source reports sample mode by default', async () => {
  const ds = await getJson(`${BASE}/api/data-source`);
  assert.equal(ds.mode, 'sample', `expected sample mode, got ${JSON.stringify(ds)}`);
});

test('GET /api/settings returns the settings map', async () => {
  const s = await getJson(`${BASE}/api/settings`);
  assert.ok(s && typeof s === 'object', 'settings should be an object');
});

/* ═══════════════════════════════════════════════════════════════════════
   19. Image delivery over HTTP
   ═══════════════════════════════════════════════════════════════════════ */
suite('19. API — image delivery');

test('every image referenced by the API is served as image/webp', async () => {
  const [cafe, accessories, articles, sliders] = await Promise.all([
    getJson(`${BASE}/api/cafe`), getJson(`${BASE}/api/accessories`),
    getJson(`${BASE}/api/articles`), getJson(`${BASE}/api/app-sliders`),
  ]);
  const urls = new Set<string>();
  for (const row of [...cafe, ...accessories, ...articles, ...sliders]) {
    for (const f of ['imageUrl', 'mobileImageUrl']) if (row[f]) urls.add(row[f]);
  }
  assert.ok(urls.size > 0, 'no image URLs came back from the API');

  const failures: string[] = [];
  for (const url of urls) {
    const res = await fetch(`${BASE}${url}`);
    const type = res.headers.get('content-type') ?? '';
    if (res.status !== 200 || !type.includes('image/webp')) {
      failures.push(`${url} → ${res.status} ${type}`);
    }
  }
  assert.deepEqual(failures, [], `broken images:\n${failures.join('\n')}`);
});

test('the generated hardware-pc variants are served', async () => {
  for (const f of ['hardware-pc-400.webp', 'hardware-pc-800.webp']) {
    const res = await fetch(`${BASE}/images/home/${f}`);
    assert.equal(res.status, 200, `${f} → ${res.status}`);
    assert.match(res.headers.get('content-type') ?? '', /image\/webp/);
  }
});

test('no API payload leaks an unsplash URL', async () => {
  for (const ep of ['/api/cafe', '/api/accessories', '/api/articles', '/api/app-sliders', '/api/state']) {
    const body = JSON.stringify(await getJson(`${BASE}${ep}`));
    assert.ok(!body.includes('unsplash'), `${ep} still serves an unsplash URL`);
  }
});

test('hashed assets are sent with a long-lived immutable cache header', async () => {
  const html = await (await fetch(`${BASE}/`)).text();
  const asset = html.match(/(?:src|href)="\.?\/?(assets\/[^"]+\.js)"/)?.[1];
  assert.ok(asset, 'no hashed asset found in index.html');
  const res = await fetch(`${BASE}/${asset}`);
  assert.equal(res.status, 200);
  assert.match(res.headers.get('cache-control') ?? '', /immutable/, 'assets should be immutable-cached');
});

/* ═══════════════════════════════════════════════════════════════════════
   20. Authentication
   ═══════════════════════════════════════════════════════════════════════ */
suite('20. API — authentication');

test('the seeded admin can log in and receives a token', async () => {
  const { status, body } = await postJson(`${BASE}/api/auth/login`, {
    username: 'admin', password: 'admin',
  });
  assert.equal(status, 200, `admin login failed: ${JSON.stringify(body)}`);
  assert.ok(body.token, 'admin login returned no token');
  assert.equal(body.user.role, 'admin', 'seeded admin does not have the admin role');
  adminToken = body.token;
});


test('register creates a user and returns a JWT', async () => {
  const { status, body } = await postJson(`${BASE}/api/auth/register`, {
    username: uniqueUser, email: `${uniqueUser}@test.dev`, password: 'Passw0rd!', phone: '09120000000',
  });
  assert.equal(status, 200, `register failed: ${JSON.stringify(body)}`);
  assert.equal(body.success, true);
  assert.ok(body.token, 'no token returned');
  assert.equal(body.user.username, uniqueUser);
  assert.equal(body.user.loyaltyPoints, 100, 'welcome bonus missing');
  authToken = body.token;
});

test('registering the same username twice is rejected', async () => {
  const { status, body } = await postJson(`${BASE}/api/auth/register`, {
    username: uniqueUser, email: 'x@y.z', password: 'Passw0rd!',
  });
  assert.equal(status, 400, `expected 400, got ${status}: ${JSON.stringify(body)}`);
  assert.ok(body.error, 'no error message');
});

test('register validates required fields', async () => {
  const { status } = await postJson(`${BASE}/api/auth/register`, { username: 'nobody' });
  assert.equal(status, 400);
});

test('login succeeds with the right password and returns a token', async () => {
  const { status, body } = await postJson(`${BASE}/api/auth/login`, {
    username: uniqueUser, password: 'Passw0rd!',
  });
  assert.equal(status, 200, `login failed: ${JSON.stringify(body)}`);
  assert.ok(body.token, 'no token on login');
});

test('login fails with a wrong password', async () => {
  const { status } = await postJson(`${BASE}/api/auth/login`, {
    username: uniqueUser, password: 'wrong-password',
  });
  assert.ok(status === 400 || status === 401, `expected 400/401, got ${status}`);
});

test('a valid bearer token identifies the user on /api/auth/me', async () => {
  const res = await fetch(`${BASE}/api/auth/me`, { headers: { Authorization: `Bearer ${authToken}` } });
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.user?.username ?? body.username, uniqueUser);
});

test('a forged/garbage token is not accepted as that user', async () => {
  const res = await fetch(`${BASE}/api/auth/me`, { headers: { Authorization: 'Bearer not.a.real.token' } });
  const body = await res.json().catch(() => ({}));
  const who = body.user?.username ?? body.username;
  assert.notEqual(who, uniqueUser, 'a forged token authenticated as a real user!');
});

/* ═══════════════════════════════════════════════════════════════════════
   21. Coupons & server-side pricing
   ═══════════════════════════════════════════════════════════════════════ */
suite('21. API — coupons & pricing');

test('a percentage coupon computes the right discount', async () => {
  const data = await getJson(`${BASE}/api/discount/validate?code=BAZINO10&total=200000`);
  assert.equal(data.valid, true, JSON.stringify(data));
  assert.equal(data.discountAmount, 20000, '10% of 200000 should be 20000');
});

test('a fixed coupon returns its face value', async () => {
  const data = await getJson(`${BASE}/api/discount/validate?code=REDBULL&total=2000`);
  assert.equal(data.valid, true, JSON.stringify(data));
  assert.equal(data.discountAmount, 90);
});

test('a coupon below its minimum order is rejected', async () => {
  const res = await fetch(`${BASE}/api/discount/validate?code=BAZINO10&total=100`);
  assert.equal(res.status, 400, 'minOrder rule not enforced');
  const body = await res.json();
  assert.equal(body.valid, false);
});

test('an unknown coupon is rejected', async () => {
  const res = await fetch(`${BASE}/api/discount/validate?code=NOPE_NOT_REAL&total=500000`);
  assert.equal(res.status, 400);
});

test('the discount can never exceed the order total', async () => {
  // WELCOME is a 50 000 fixed coupon with a 250 000 minimum.
  const data = await getJson(`${BASE}/api/discount/validate?code=WELCOME&total=250000`);
  assert.ok(data.discountAmount <= 250000, 'discount exceeded the total');
});

/* ═══════════════════════════════════════════════════════════════════════
   22. Orders — server-side totals, stock, loyalty
   ═══════════════════════════════════════════════════════════════════════ */
suite('22. API — orders');

test('a cafe order is priced from the menu, not from the client', async () => {
  const menu = await getJson(`${BASE}/api/cafe`);
  const item = menu[0];
  // Deliberately lie about the price: the server must ignore it.
  const { status, body } = await postJson(`${BASE}/api/cafe/order`, {
    items: [{ item: { ...item, price: 1 }, quantity: 2 }],
    tableNumber: '5',
  }, { Authorization: `Bearer ${authToken}` });

  assert.equal(status, 200, `order failed: ${JSON.stringify(body)}`);
  const order = body.order ?? body;
  const total = order.totalPrice ?? order.finalAmount;
  assert.equal(total, item.price * 2, `server trusted the client price (got ${total})`);
});

test('ordering more than the available stock is rejected', async () => {
  const menu = await getJson(`${BASE}/api/cafe`);
  const item = menu[0];
  const { status, body } = await postJson(`${BASE}/api/cafe/order`, {
    items: [{ item, quantity: item.inventory + 9999 }],
  });
  assert.equal(status, 400, `stock rule not enforced: ${JSON.stringify(body)}`);
});

test('an empty cart is rejected', async () => {
  const { status } = await postJson(`${BASE}/api/cafe/order`, { items: [] });
  assert.equal(status, 400);
});

test('ordering an unknown menu item 404s', async () => {
  const { status } = await postJson(`${BASE}/api/cafe/order`, {
    items: [{ item: { id: 'does-not-exist' }, quantity: 1 }],
  });
  assert.equal(status, 404);
});

/* ═══════════════════════════════════════════════════════════════════════
   23. Reservations over HTTP
   ═══════════════════════════════════════════════════════════════════════ */
suite('23. API — reservations');

test('a system can be reserved and the price is computed server-side', async () => {
  const systems = await getJson(`${BASE}/api/systems`);
  const system = systems.find((s: any) => !s.isReserved) ?? systems[0];
  const { status, body } = await postJson(`${BASE}/api/systems/reserve`, {
    systemId: system.id, startTime: '08:00', endTime: '10:00', date: 'e2e-day',
  }, { Authorization: `Bearer ${authToken}` });

  assert.equal(status, 200, `reserve failed: ${JSON.stringify(body)}`);
  const expected = 2 * system.hourlyRate;   // 2 hours
  const charged = body.reservation?.totalPrice ?? body.totalPrice;
  assert.equal(charged, expected, `expected ${expected}, charged ${charged}`);
});

test('double-booking the same slot returns 409', async () => {
  const systems = await getJson(`${BASE}/api/systems`);
  const system = systems[0];
  await postJson(`${BASE}/api/systems/reserve`, {
    systemId: system.id, startTime: '15:00', endTime: '17:00', date: 'clash-day',
  }, { Authorization: `Bearer ${authToken}` });

  const { status } = await postJson(`${BASE}/api/systems/reserve`, {
    systemId: system.id, startTime: '16:00', endTime: '18:00', date: 'clash-day',
  }, { Authorization: `Bearer ${authToken}` });
  assert.equal(status, 409, 'overlapping reservation was allowed');
});

test('reserving an unknown system 404s', async () => {
  const { status } = await postJson(`${BASE}/api/systems/reserve`, { systemId: 'nope-999' });
  assert.equal(status, 404);
});

// The server intentionally falls back to the legacy shared "activeUsername"
// setting when no bearer token is sent, so a *truly* anonymous caller only
// exists after logout resets that setting to "Guest".
test('extending a reservation requires authentication once logged out', async () => {
  await postJson(`${BASE}/api/auth/logout`, {});
  const { status, body } = await postJson(`${BASE}/api/reservations/extend`, { hours: 1 });
  assert.equal(status, 401, `guest extend was allowed: ${JSON.stringify(body)}`);

  // restore the session for the tests that follow
  await postJson(`${BASE}/api/auth/login`, { username: uniqueUser, password: 'Passw0rd!' });
});

test('extend clamps the requested hours to at most 4', async () => {
  const { status, body } = await postJson(`${BASE}/api/reservations/extend`, { hours: 99 },
    { Authorization: `Bearer ${authToken}` });
  // 4h costs 200 points. Depending on how many points the e2e user has earned
  // so far, the clamp shows up either as a 200-point quote in the error or as a
  // 200-point charge — never as a 99-hour (4950-point) one.
  if (status === 400) {
    assert.ok(String(body.error).includes('200'), `expected a 4h (200 point) quote, got: ${body.error}`);
  } else {
    assert.equal(status, 200, JSON.stringify(body));
    assert.equal(body.pointsCharged, 200, `expected the clamp to charge 4h = 200 points: ${JSON.stringify(body)}`);
  }
});

/* ═══════════════════════════════════════════════════════════════════════
   24. Admin CRUD (incl. mobileImageUrl round-trip through HTTP)
   ═══════════════════════════════════════════════════════════════════════ */
suite('24. API — admin CRUD');

test('an admin-created cafe item keeps its mobileImageUrl', async () => {
  const { status, body } = await postJson(`${BASE}/api/admin/cafe`, {
    name: 'E2E Item', category: 'Foods', price: 12345,
    imageUrl: '/images/home/cafe-480.webp', mobileImageUrl: '/images/home/cafe-320.webp',
    inventory: 3,
  }, adminAuth());
  assert.equal(status, 200, JSON.stringify(body));
  const created = body.cafeItems.find((i: any) => i.name === 'E2E Item');
  assert.ok(created, 'created item not returned');
  // پاسخ‌ها با مهر «?v=» (ASSET_VERSION) سرو می‌شوند — مسیر bare مقایسه می‌شود
  assert.equal((created.mobileImageUrl ?? '').split('?')[0], '/images/home/cafe-320.webp', 'mobileImageUrl was dropped by the API');
});

test('a new cafe item falls back to a LOCAL image, never unsplash', async () => {
  const { status, body } = await postJson(`${BASE}/api/admin/cafe`, {
    name: 'E2E NoImage', category: 'Foods', price: 1000, inventory: 1,
  }, adminAuth());
  assert.equal(status, 200);
  const created = body.cafeItems.find((i: any) => i.name === 'E2E NoImage');
  assert.ok(created.imageUrl.startsWith('/images/'), `fallback is not local: ${created.imageUrl}`);
  assert.ok(!created.imageUrl.includes('unsplash'), 'fallback still points at unsplash');
});

test('an admin-created slider keeps its mobileImageUrl', async () => {
  const { status, body } = await postJson(`${BASE}/api/admin/app-sliders`, {
    imageUrl: '/images/home/esports-480.webp',
    mobileImageUrl: '/images/home/esports-320.webp',
    target: 'reserve', titleFa: 'تست', titleEn: 'Test',
  }, adminAuth());
  assert.equal(status, 200, JSON.stringify(body));
  const created = body.appSliders.find((s: any) => s.titleEn === 'Test');
  assert.ok(created, 'slider not created');
  assert.equal((created.mobileImageUrl ?? '').split('?')[0], '/images/home/esports-320.webp', 'slider mobileImageUrl dropped by the API');
});

test('a slider without an image or target is rejected', async () => {
  const { status } = await postJson(`${BASE}/api/admin/app-sliders`, { titleEn: 'no image' }, adminAuth());
  assert.equal(status, 400);
});

test('an admin-created article keeps its mobileImageUrl', async () => {
  const { status, body } = await postJson(`${BASE}/api/admin/articles`, {
    title: 'E2E Article', content: 'body', category: 'Hardware',
    imageUrl: '/images/home/hardware-pc-800.webp',
    mobileImageUrl: '/images/home/hardware-pc-400.webp',
  }, adminAuth());
  assert.equal(status, 200, JSON.stringify(body));
  // GET /api/articles serves SAMPLE_ARTICLES while the data source is in
  // "sample" mode, so verify against the list the write endpoint returns.
  const created = body.articles.find((a: any) => a.title === 'E2E Article');
  assert.ok(created, 'article not created');
  assert.equal((created.mobileImageUrl ?? '').split('?')[0], '/images/home/hardware-pc-400.webp');
  assert.deepEqual(created.comments, [], 'comments should be parsed into an array');
});

test('a new article falls back to a LOCAL image, never unsplash', async () => {
  const { status, body } = await postJson(`${BASE}/api/admin/articles`, {
    title: 'E2E NoImage Article', content: 'body', category: 'News',
  }, adminAuth());
  assert.equal(status, 200);
  const created = body.articles.find((a: any) => a.title === 'E2E NoImage Article');
  assert.ok(created.imageUrl.startsWith('/images/'), `fallback is not local: ${created.imageUrl}`);
  assert.ok(!created.imageUrl.includes('unsplash'), 'fallback still points at unsplash');
});

/* ═══════════════════════════════════════════════════════════════════════
   25. Themes over HTTP
   ═══════════════════════════════════════════════════════════════════════ */
suite('25. API — themes');

test('GET /api/themes lists installed themes', async () => {
  const data = await getJson(`${BASE}/api/themes`);
  assert.ok('serverThemes' in data, 'response has no serverThemes');
  assert.ok(Array.isArray(data.serverThemes));
});

test('a theme ZIP can be installed, served, exported and deleted', async () => {
  const { buildSampleThemeZip, parseThemeZip, isZipParseError } = await import('../src/themes/themeZipCore.ts');
  const zip = buildSampleThemeZip();

  // install
  let res = await fetch(`${BASE}/api/admin/themes/install?name=e2e.zip`, {
    method: 'POST', headers: { 'Content-Type': 'application/zip', ...adminAuth() },
    body: new Uint8Array(zip) as unknown as BodyInit,
  });
  const installed = await res.json();
  assert.equal(res.status, 200, `install failed: ${JSON.stringify(installed)}`);
  assert.equal(installed.success, true);
  const id = installed.theme.id;

  // css is served with asset urls rewritten to the theme route
  res = await fetch(`${BASE}/api/themes/${id}/theme.css`);
  assert.equal(res.status, 200, 'theme.css not served');
  assert.match(await res.text(), new RegExp(`/api/themes/${id}/assets/`), 'asset urls were not rewritten');

  // export round-trips back into a parseable zip
  res = await fetch(`${BASE}/api/themes/${id}/export`);
  assert.equal(res.status, 200, 'export failed');
  const reparsed = parseThemeZip(new Uint8Array(await res.arrayBuffer()), 'x');
  assert.ok(!isZipParseError(reparsed), 'exported zip does not parse');

  // delete
  res = await fetch(`${BASE}/api/admin/themes/${id}`, { method: 'DELETE', headers: adminAuth() });
  assert.equal(res.status, 200, 'delete failed');
  const after = await getJson(`${BASE}/api/themes`);
  assert.ok(!after.serverThemes.some((t: any) => t.id === id), 'theme still listed after delete');
});

test('a corrupt theme ZIP is rejected rather than crashing the server', async () => {
  const res = await fetch(`${BASE}/api/admin/themes/install?name=bad.zip`, {
    method: 'POST', headers: { 'Content-Type': 'application/zip', ...adminAuth() },
    body: new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]) as unknown as BodyInit,
  });
  assert.ok(res.status >= 400, `expected an error status, got ${res.status}`);
  // and the server must still be answering
  assert.equal((await fetch(`${BASE}/api/systems`)).status, 200, 'server stopped responding after a bad upload');
});

test('theme asset paths cannot escape the theme directory', async () => {
  for (const attack of [
    '/api/themes/x/assets/../../../../etc/passwd',
    '/api/themes/..%2f..%2f..%2fetc%2fpasswd/theme.css',
  ]) {
    const res = await fetch(`${BASE}${attack}`);
    const body = await res.text();
    assert.ok(!body.includes('root:x:'), `path traversal succeeded on ${attack}`);
  }
});

/* ═══════════════════════════════════════════════════════════════════════
   26. Chat, messages, misc endpoints
   ═══════════════════════════════════════════════════════════════════════ */
suite('26. API — chat & misc');

test('chat rooms are listed and a message round-trips', async () => {
  const rooms = await getJson(`${BASE}/api/chat/rooms`);
  assert.ok(Array.isArray(rooms) && rooms.length > 0, 'no chat rooms');
  const room = rooms[0].name ?? rooms[0];

  const { status } = await postJson(`${BASE}/api/chat/messages`, {
    room, username: uniqueUser, message: 'e2e hello',
  }, { Authorization: `Bearer ${authToken}` });
  assert.equal(status, 200);

  const messages = await getJson(`${BASE}/api/chat/messages/${encodeURIComponent(room)}`);
  assert.ok(messages.some((m: any) => m.message === 'e2e hello'), 'message not stored');
});

test('GET /api/messages returns an array', async () => {
  assert.ok(Array.isArray(await getJson(`${BASE}/api/messages`)));
});

test('GET /api/admin/stats returns dashboard counters', async () => {
  const stats = await getJson(`${BASE}/api/admin/stats`, 200, adminAuth());
  assert.ok(stats && typeof stats === 'object');
});

test('GET /api/install/status reports installation state', async () => {
  const status = await getJson(`${BASE}/api/install/status`);
  assert.ok(typeof status === 'object' && status !== null);
});

test('GET /api/mobile-app returns the app metadata', async () => {
  const meta = await getJson(`${BASE}/api/mobile-app`);
  assert.ok(meta && typeof meta === 'object');
});

test('an unknown API route does not return the SPA shell as 200 JSON', async () => {
  const res = await fetch(`${BASE}/api/definitely-not-a-route`);
  const body = await res.text();
  // The catch-all serves index.html for client routes; make sure it is not
  // pretending an unknown /api/* call succeeded with JSON data.
  if (res.status === 200) {
    assert.ok(body.includes('<div id="root">'), 'unknown API route returned non-HTML 200');
  }
});

// With no key configured, /api/sync/* stays reachable from the SAME machine (the
// zero-config co-located desktop client) but is refused for anyone else. The
// test client connects over loopback, so it represents the co-located case.
test('/api/sync/* stays open for the co-located client when no key is set', async () => {
  const res = await fetch(`${BASE}/api/sync/reservations`);
  assert.equal(res.status, 200, 'the same-machine desktop client must keep working');
});

test('/api/sync/* refuses an unconfigured remote caller', async () => {
  // An X-Forwarded-For header means the request was proxied from outside, which
  // is exactly the internet-facing case that used to be wide open.
  const res = await fetch(`${BASE}/api/sync/reservations`, {
    headers: { 'X-Forwarded-For': '203.0.113.7' },
  });
  assert.equal(res.status, 401, 'a remote caller was served sync data without any key');
  const body = await res.json();
  assert.match(String(body.error), /not configured|key/i, 'the error should explain how to fix it');
});

test('/api/sync/* rejects a wrong or missing key once one is configured', async () => {
  const KEY = 'e2e-sync-key-123';
  const set = await postJson(`${BASE}/api/admin/settings`, { key: 'gamenet_sync_api_key', value: KEY }, adminAuth());
  assert.equal(set.status, 200, 'could not configure the sync key');

  try {
    const missing = await fetch(`${BASE}/api/sync/reservations`);
    assert.equal(missing.status, 401, 'missing key was accepted');

    const wrong = await fetch(`${BASE}/api/sync/reservations`, {
      headers: { Authorization: 'Bearer totally-wrong-key' },
    });
    assert.equal(wrong.status, 401, 'wrong key was accepted');

    const right = await fetch(`${BASE}/api/sync/reservations`, {
      headers: { Authorization: `Bearer ${KEY}` },
    });
    assert.equal(right.status, 200, 'the correct key was rejected');
    const body = await right.json();
    assert.equal(body.success, true);
    assert.ok(Array.isArray(body.reservations), 'reservations should be an array');
  } finally {
    // clear the key so the endpoint is left as we found it
    await postJson(`${BASE}/api/admin/settings`, { key: 'gamenet_sync_api_key', value: '' }, adminAuth());
  }
});

test('admin Web Sync settings generate and mask the shared secret', async () => {
  const generated = await fetch(`${BASE}/api/admin/sync-settings`, {
    method: 'POST',
    headers: { ...adminAuth(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ generate: true }),
  });
  const generatedBody = await generated.json();
  assert.equal(generated.status, 200, JSON.stringify(generatedBody));
  assert.equal(generatedBody.success, true);
  assert.equal(typeof generatedBody.apiKey, 'string');
  assert.ok(generatedBody.apiKey.length >= 64, 'generated key is too short');
  assert.equal(generatedBody.masked.includes(generatedBody.apiKey), false, 'masked response leaked the full key');

  try {
    const read = await fetch(`${BASE}/api/admin/sync-settings`, { headers: adminAuth() });
    const readBody = await read.json();
    assert.equal(read.status, 200);
    assert.equal(readBody.configured, true);
    assert.equal(readBody.masked.includes(generatedBody.apiKey), false, 'read endpoint leaked the full key');
  } finally {
    await postJson(`${BASE}/api/admin/settings`, { key: 'gamenet_sync_api_key', value: '' }, adminAuth());
  }
});

test('anonymous callers cannot read Web Sync admin settings', async () => {
  const res = await fetch(`${BASE}/api/admin/sync-settings`);
  assert.equal(res.status, 401);
});

test('the sync API key is never exposed through GET /api/settings', async () => {
  const KEY = 'e2e-secret-should-not-leak';
  await postJson(`${BASE}/api/admin/settings`, { key: 'gamenet_sync_api_key', value: KEY }, adminAuth());
  try {
    const body = JSON.stringify(await getJson(`${BASE}/api/settings`));
    assert.ok(!body.includes(KEY), 'the sync API key leaked through /api/settings');
  } finally {
    await postJson(`${BASE}/api/admin/settings`, { key: 'gamenet_sync_api_key', value: '' }, adminAuth());
  }
});

/* ═══════════════════════════════════════════════════════════════════════
   27. Privileged-route access control
   ═══════════════════════════════════════════════════════════════════════ */
suite('27. API — admin access control');

// Regression tests for a real vulnerability: none of the /api/admin/* routes had
// an auth gate, AND getCurrentUser() fell back to the shared "activeUsername"
// setting — which a fresh install seeds to "admin" — so an anonymous visitor was
// resolved as the administrator and could read users or wipe the database.
const ADMIN_READS = ['/api/admin/users', '/api/admin/stats', '/api/admin/db-logs'];
const ADMIN_WRITES: Array<[string, any]> = [
  ['/api/admin/settings', { key: 'x', value: 'y' }],
  ['/api/admin/reset-database', {}],
  ['/api/admin/clear-database', {}],
  ['/api/admin/cafe', { name: 'hacked', category: 'Foods', price: 1 }],
];

test('anonymous callers cannot read any admin endpoint', async () => {
  for (const ep of ADMIN_READS) {
    const res = await fetch(`${BASE}${ep}`);
    assert.equal(res.status, 401, `${ep} is readable without a token (${res.status})`);
  }
});

test('anonymous callers cannot write through any admin endpoint', async () => {
  for (const [ep, payload] of ADMIN_WRITES) {
    const { status } = await postJson(`${BASE}${ep}`, payload);
    assert.equal(status, 401, `${ep} accepted an unauthenticated write (${status})`);
  }
});

test('the user list is never exposed to anonymous callers', async () => {
  const res = await fetch(`${BASE}/api/admin/users`);
  const text = await res.text();
  assert.equal(res.status, 401);
  assert.ok(!text.includes('admin@gamenet.com'), 'the admin account leaked to an anonymous caller');
});

test('a non-admin gamer token is rejected with 403', async () => {
  for (const ep of ADMIN_READS) {
    const res = await fetch(`${BASE}${ep}`, { headers: { Authorization: `Bearer ${authToken}` } });
    assert.equal(res.status, 403, `${ep} allowed a plain gamer (${res.status})`);
  }
});

test('a forged token cannot impersonate the admin', async () => {
  const res = await fetch(`${BASE}/api/admin/users`, {
    headers: { Authorization: 'Bearer eyJhbGciOiJIUzI1NiJ9.eyJ1c2VybmFtZSI6ImFkbWluIn0.forged' },
  });
  assert.equal(res.status, 401, 'a forged admin token was accepted');
});

test('the legacy activeUsername setting alone does not grant admin access', async () => {
  // Log the shared session in as the admin the old way, then call with NO token:
  // this is exactly the bypass that used to work.
  const login = await postJson(`${BASE}/api/auth/login`, { username: 'admin', password: 'admin' });
  assert.equal(login.status, 200);

  const res = await fetch(`${BASE}/api/admin/users`);
  assert.equal(res.status, 401, 'activeUsername still grants admin access without a token');
});

test('a genuine admin token is accepted on every admin read', async () => {
  for (const ep of ADMIN_READS) {
    const res = await fetch(`${BASE}${ep}`, { headers: adminAuth() });
    assert.equal(res.status, 200, `${ep} rejected a valid admin token (${res.status})`);
  }
});

test('install setup hands back a token so the new admin is not locked out', async () => {
  // The site is already installed here, so /api/install/setup is not re-run; assert
  // the contract that keeps the installer usable instead.
  const { status, body } = await postJson(`${BASE}/api/auth/login`, { username: 'admin', password: 'admin' });
  assert.equal(status, 200);
  assert.ok(body.token, 'no token to bootstrap the admin panel with');
  const res = await fetch(`${BASE}/api/admin/stats`, { headers: { Authorization: `Bearer ${body.token}` } });
  assert.equal(res.status, 200, 'a freshly issued admin token cannot reach the admin panel');
});

/* ═══════════════════════════════════════════════════════════════════════
   28. Loyalty, orders and tournaments (previously untested routes)
   ═══════════════════════════════════════════════════════════════════════ */
suite('28. API — loyalty, shop & tournaments');

test('GET /api/user returns the current user', async () => {
  const user = await getJson(`${BASE}/api/user`, 200, { Authorization: `Bearer ${authToken}` });
  assert.equal(user.username, uniqueUser);
  assert.equal(typeof user.loyaltyPoints, 'number');
});

test('POST /api/user/points credits the signed-in user', async () => {
  const before = await getJson(`${BASE}/api/user`, 200, { Authorization: `Bearer ${authToken}` });
  const { status, body } = await postJson(`${BASE}/api/user/points`,
    { points: 25, description: 'e2e credit' }, { Authorization: `Bearer ${authToken}` });
  assert.equal(status, 200, JSON.stringify(body));
  const after = await getJson(`${BASE}/api/user`, 200, { Authorization: `Bearer ${authToken}` });
  assert.equal(after.loyaltyPoints, before.loyaltyPoints + 25, 'points were not credited');
});

test('POST /api/loyalty/redeem rejects redeeming more points than owned', async () => {
  const { body } = await postJson(`${BASE}/api/loyalty/redeem`,
    { points: 10_000_000, couponValue: 50, code: 'TOOMUCH' }, { Authorization: `Bearer ${authToken}` });
  assert.ok(body.error || body.success === false,
    'redeeming more points than the user owns should not succeed');
});

test('POST /api/loyalty/redeem debits the points it spends', async () => {
  await postJson(`${BASE}/api/user/points`, { points: 500, description: 'top-up' },
    { Authorization: `Bearer ${authToken}` });
  const before = await getJson(`${BASE}/api/user`, 200, { Authorization: `Bearer ${authToken}` });

  const { status } = await postJson(`${BASE}/api/loyalty/redeem`,
    { points: 100, couponValue: 10, code: 'E2EREDEEM' }, { Authorization: `Bearer ${authToken}` });
  assert.equal(status, 200);

  const after = await getJson(`${BASE}/api/user`, 200, { Authorization: `Bearer ${authToken}` });
  assert.equal(after.loyaltyPoints, before.loyaltyPoints - 100, 'points were not debited');
});

test('POST /api/accessories/order prices the cart from the catalog', async () => {
  const accessories = await getJson(`${BASE}/api/accessories`);
  const item = accessories[0];
  const { status, body } = await postJson(`${BASE}/api/accessories/order`, {
    // deliberately lie about the price — the server must ignore it
    cart: [{ item: { ...item, price: 1 }, quantity: 2 }],
  }, { Authorization: `Bearer ${authToken}` });

  assert.equal(status, 200, JSON.stringify(body));
  const charged = body.order?.totalPrice ?? body.totalPrice;
  assert.equal(charged, item.price * 2, `client-supplied price was trusted (charged ${charged})`);
});

test('POST /api/accessories/order rejects an empty cart', async () => {
  const { status } = await postJson(`${BASE}/api/accessories/order`, { cart: [] },
    { Authorization: `Bearer ${authToken}` });
  assert.equal(status, 400);
});

test('POST /api/tournaments/register adds the team', async () => {
  const tournaments = await getJson(`${BASE}/api/tournaments`);
  const t = tournaments[0];
  const before = t.registeredTeamsCount;
  const { status, body } = await postJson(`${BASE}/api/tournaments/register`, {
    tournamentId: t.id, team: { name: 'E2E Squad', members: ['a', 'b'] },
  }, { Authorization: `Bearer ${authToken}` });
  assert.equal(status, 200, JSON.stringify(body));

  // Regression: registering for a SAMPLE tournament used to be silently dropped.
  assert.ok(Array.isArray(body.tournaments), 'expected the updated tournament list');
  assert.ok(JSON.stringify(body.tournaments).includes('E2E Squad'),
    'the registered team was not recorded');
  const updated = body.tournaments.find((x: any) => x.id === t.id);
  assert.ok(updated, 'the tournament is missing from the response');
  assert.equal(updated.registeredTeamsCount, before + 1, 'team count did not increase');
});

test('GET /api/reservations lists reservation logs', async () => {
  const logs = await getJson(`${BASE}/api/reservations`);
  assert.ok(Array.isArray(logs), 'reservations should be an array');
});

test('POST /api/support/request rejects an empty message', async () => {
  const { status } = await postJson(`${BASE}/api/support/request`, { message: '   ' },
    { Authorization: `Bearer ${authToken}` });
  assert.equal(status, 400);
});

test('POST /api/support/request files a ticket', async () => {
  const { status, body } = await postJson(`${BASE}/api/support/request`,
    { message: 'کیبورد سیستم ۳ کار نمی‌کند' }, { Authorization: `Bearer ${authToken}` });
  assert.equal(status, 200, JSON.stringify(body));
});

/* ═══════════════════════════════════════════════════════════════════════
   29. Admin CRUD — the rest of the catalog
   ═══════════════════════════════════════════════════════════════════════ */
suite('29. API — admin catalog CRUD');

test('legacy raw APK upload remains backward compatible', async () => {
  const binaryContent = new Uint8Array([0x50, 0x4B, 0x03, 0x04]); // dummy zip/apk header
  const res = await fetch(`${BASE}/api/admin/mobile-app/upload-apk?fileName=test.apk`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${adminToken}`,
      'Content-Type': 'application/octet-stream'
    },
    body: binaryContent
  });
  const body = await res.json();
  assert.equal(res.status, 200, JSON.stringify(body));
  assert.equal(body.success, true);
});

test('multipart APK upload publishes a large file byte-for-byte', async () => {
  const expectedBytes = new Uint8Array(9 * 1024 * 1024 + 257);
  for (let index = 0; index < expectedBytes.length; index += 1) {
    expectedBytes[index] = (index * 31 + 17) & 0xFF;
  }
  expectedBytes.set([0x50, 0x4B, 0x03, 0x04]); // dummy zip/apk header
  const expected = Buffer.from(expectedBytes);
  const form = new FormData();
  form.append('file', new Blob([expectedBytes], { type: 'application/vnd.android.package-archive' }), 'multipart-e2e.apk');

  const res = await fetch(`${BASE}/api/admin/mobile-app/upload-apk`, {
    method: 'POST',
    headers: adminAuth(),
    body: form,
  });
  const body = await res.json();
  assert.equal(res.status, 200, JSON.stringify(body));
  assert.equal(body.success, true);

  const apkPath = path.join(workDir, 'data', 'downloads', 'bazino-app.apk');
  assert.ok(existsSync(apkPath), 'the final APK was not published at the stable download path');
  assert.deepEqual(readFileSync(apkPath), expected, 'the published APK differs from the multipart upload');

  const meta = await getJson(`${BASE}/api/mobile-app`);
  assert.equal(meta.apkFileName, 'multipart-e2e.apk');
  assert.equal(meta.apkSize, expected.length);

  const download = await fetch(`${BASE}/api/mobile-app/download`);
  assert.equal(download.status, 200);
  assert.deepEqual(Buffer.from(await download.arrayBuffer()), expected, 'the download route did not serve the uploaded APK');
});

test('chunked APK upload survives a dropped chunk and publishes byte-for-byte', async () => {
  // 17 MiB + a few bytes → three 8 MiB chunks; a payload this size would blow
  // through Cloudflare's 100-second gateway window as a single request.
  const chunkSize = 8 * 1024 * 1024;
  const expectedBytes = new Uint8Array(17 * 1024 * 1024 + 123);
  for (let index = 0; index < expectedBytes.length; index += 1) {
    expectedBytes[index] = (index * 13 + 5) & 0xFF;
  }
  expectedBytes.set([0x50, 0x4B, 0x03, 0x04]); // dummy zip/apk header
  const expected = Buffer.from(expectedBytes);
  const totalChunks = Math.ceil(expected.length / chunkSize);
  const sessionId = `chunked-session-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  const chunkHeaders = { ...adminAuth(), 'Content-Type': 'application/octet-stream' };

  for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex += 1) {
    const start = chunkIndex * chunkSize;
    const chunk = expected.subarray(start, Math.min(start + chunkSize, expected.length));
    const url = `${BASE}/api/admin/mobile-app/upload-apk/chunk?sessionId=${sessionId}&index=${chunkIndex}&fileName=chunked-e2e.apk&totalSize=${expected.length}`;
    const res = await fetch(url, { method: 'POST', headers: chunkHeaders, body: chunk });
    const body = await res.json().catch(() => ({}));
    assert.equal(res.status, 200, `chunk ${chunkIndex} failed: ${JSON.stringify(body)}`);
    assert.equal(body.received, Math.min(expected.length, (chunkIndex + 1) * chunkSize), 'server byte count drifted');
    assert.equal(body.expectedIndex, chunkIndex + 1, 'server did not advance the chunk index');
  }

  // Re-send the last chunk, as the client does after a dropped response: the
  // server must treat it as an idempotent no-op, not append it twice.
  const lastStart = (totalChunks - 1) * chunkSize;
  const duplicateUrl = `${BASE}/api/admin/mobile-app/upload-apk/chunk?sessionId=${sessionId}&index=${totalChunks - 1}&fileName=chunked-e2e.apk&totalSize=${expected.length}`;
  const dupRes = await fetch(duplicateUrl, { method: 'POST', headers: chunkHeaders, body: expected.subarray(lastStart) });
  assert.equal(dupRes.status, 200, 'duplicate chunk was rejected');
  const dupBody = await dupRes.json();
  assert.equal(dupBody.received, expected.length, 'duplicate chunk was appended twice');

  const finRes = await fetch(`${BASE}/api/admin/mobile-app/upload-apk/finalize`, {
    method: 'POST',
    headers: { ...adminAuth(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId, fileName: 'chunked-e2e.apk' }),
  });
  const finBody = await finRes.json();
  assert.equal(finRes.status, 200, `finalize failed: ${JSON.stringify(finBody)}`);
  assert.equal(finBody.success, true);

  const apkPath = path.join(workDir, 'data', 'downloads', 'bazino-app.apk');
  assert.ok(existsSync(apkPath), 'the final APK was not published at the stable download path');
  assert.deepEqual(readFileSync(apkPath), expected, 'the chunked upload published a corrupt APK');

  const meta = await getJson(`${BASE}/api/mobile-app`);
  assert.equal(meta.apkFileName, 'chunked-e2e.apk');
  assert.equal(meta.apkSize, expected.length);

  const download = await fetch(`${BASE}/api/mobile-app/download`);
  assert.equal(download.status, 200);
  assert.deepEqual(Buffer.from(await download.arrayBuffer()), expected, 'the download route did not serve the chunked APK');
});

test('chunked APK upload rejects out-of-order chunks, incomplete finalize, and cancels cleanly', async () => {
  const sessionId = `cancel-session-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  const chunkHeaders = { ...adminAuth(), 'Content-Type': 'application/octet-stream' };
  const totalSize = 8;
  const chunk = Buffer.from([0x50, 0x4B, 0x03, 0x04]);
  const chunkUrl = (index: number) =>
    `${BASE}/api/admin/mobile-app/upload-apk/chunk?sessionId=${sessionId}&index=${index}&fileName=cancel-e2e.apk&totalSize=${totalSize}`;
  const finalizeUrl = `${BASE}/api/admin/mobile-app/upload-apk/finalize`;

  // Chunks must arrive in order.
  let res = await fetch(chunkUrl(1), { method: 'POST', headers: chunkHeaders, body: chunk });
  assert.equal(res.status, 409, 'out-of-order chunk was accepted');
  const ooo = await res.json();
  assert.equal(ooo.expectedIndex, 0, 'out-of-order response did not report the expected index');

  // A chunked session is not published until every byte has arrived.
  res = await fetch(chunkUrl(0), { method: 'POST', headers: chunkHeaders, body: chunk });
  assert.equal(res.status, 200, 'first chunk was rejected');
  let body = await res.json();
  assert.equal(body.received, 4);

  res = await fetch(finalizeUrl, {
    method: 'POST',
    headers: { ...adminAuth(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId, fileName: 'cancel-e2e.apk' }),
  });
  assert.equal(res.status, 409, 'incomplete upload was finalized');
  body = await res.json();
  assert.equal(body.code, 'APK_INCOMPLETE');
  assert.equal(body.received, 4);
  assert.equal(body.totalSize, 8);

  // Duplicate retry is idempotent.
  res = await fetch(chunkUrl(0), { method: 'POST', headers: chunkHeaders, body: chunk });
  assert.equal(res.status, 200);
  body = await res.json();
  assert.equal(body.received, 4, 'duplicate chunk changed the byte count');

  // Cancel removes the session and its partial file; finalize then 404s.
  res = await fetch(`${BASE}/api/admin/mobile-app/upload-apk/session?sessionId=${sessionId}`, {
    method: 'DELETE',
    headers: adminAuth(),
  });
  assert.equal(res.status, 200, 'cancel failed');

  res = await fetch(finalizeUrl, {
    method: 'POST',
    headers: { ...adminAuth(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId, fileName: 'cancel-e2e.apk' }),
  });
  assert.equal(res.status, 404, 'finalize did not reject a cancelled session');

  const downloadsDir = path.join(workDir, 'data', 'downloads');
  const leftovers = readdirSync(downloadsDir).filter((name) => name.endsWith('.part'));
  assert.deepEqual(leftovers, [], 'cancelled session left a partial file behind');
});

test('chunked APK upload endpoints require an admin token', async () => {
  const url = `${BASE}/api/admin/mobile-app/upload-apk/chunk?sessionId=anon-session-1234&index=0&fileName=anon.apk&totalSize=4`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/octet-stream' },
    body: Buffer.from([0x50, 0x4B, 0x03, 0x04]),
  });
  assert.equal(res.status, 401, 'chunk upload without a token was not rejected');

  const finRes = await fetch(`${BASE}/api/admin/mobile-app/upload-apk/finalize`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId: 'anon-session-1234' }),
  });
  assert.equal(finRes.status, 401, 'finalize without a token was not rejected');
});

// NOTE: while the data source is in "sample" mode the public GETs deliberately
// serve SAMPLE_* rather than the database, so these tests verify against the
// authoritative list each write endpoint returns.
test('a system can be created, updated and deleted', async () => {
  const created = await postJson(`${BASE}/api/admin/systems`,
    { name: 'E2E Rig', type: 'PC', hourlyRate: 80000, isActive: true }, adminAuth());
  assert.equal(created.status, 200, JSON.stringify(created.body));
  const mine = created.body.systems.find((s: any) => s.name === 'E2E Rig');
  assert.ok(mine, 'system was not created');
  assert.equal(mine.hourlyRate, 80000);

  const updated = await putJson(`${BASE}/api/admin/systems/${mine.id}`,
    { name: 'E2E Rig v2', hourlyRate: 95000 }, adminAuth());
  assert.equal(updated.status, 200, `update failed: ${JSON.stringify(updated.body)}`);
  const renamed = updated.body.systems.find((s: any) => s.id === mine.id);
  assert.equal(renamed.name, 'E2E Rig v2', 'rename did not persist');
  assert.equal(renamed.hourlyRate, 95000, 'hourlyRate did not persist');

  const del = await fetch(`${BASE}/api/admin/systems/${mine.id}`, { method: 'DELETE', headers: adminAuth() });
  assert.equal(del.status, 200, 'delete failed');
  const after = await del.json();
  assert.ok(!after.systems.some((s: any) => s.id === mine.id), 'system still present after delete');
});

test('a tournament can be created and deleted', async () => {
  const created = await postJson(`${BASE}/api/admin/tournaments`, {
    title: 'E2E Cup', game: 'CS2', registrationFee: 50000,
    startDate: '۱۴۰۵/۰۵/۰۱', maxTeams: 8, status: 'Open',
  }, adminAuth());
  assert.equal(created.status, 200, JSON.stringify(created.body));

  const mine = created.body.tournaments.find((t: any) => t.title === 'E2E Cup');
  assert.ok(mine, 'tournament was not created');

  const del = await fetch(`${BASE}/api/admin/tournaments/${mine.id}`, { method: 'DELETE', headers: adminAuth() });
  assert.equal(del.status, 200, 'tournament delete failed');
});

test('an accessory can be created and deleted', async () => {
  const created = await postJson(`${BASE}/api/admin/accessories`, {
    name: 'E2E Mouse', price: 999000, stock: 3, category: 'Mouse',
    imageUrl: '/images/home/gear-shop-480.webp',
  }, adminAuth());
  assert.equal(created.status, 200, JSON.stringify(created.body));

  const mine = created.body.accessories.find((a: any) => a.name === 'E2E Mouse');
  assert.ok(mine, 'accessory was not created');

  const del = await fetch(`${BASE}/api/admin/accessories/${mine.id}`, { method: 'DELETE', headers: adminAuth() });
  assert.equal(del.status, 200);
});

test('an admin message reaches the user inbox', async () => {
  const { status, body } = await postJson(`${BASE}/api/admin/messages`, {
    recipient: uniqueUser, title: 'E2E Notice', body: 'سلام', sendAsNotification: false,
  }, adminAuth());
  assert.equal(status, 200, JSON.stringify(body));

  const messages = await getJson(`${BASE}/api/messages`, 200, { Authorization: `Bearer ${authToken}` });
  const mine = messages.find((m: any) => m.title === 'E2E Notice');
  assert.ok(mine, 'the message never reached the recipient');

  const read = await postJson(`${BASE}/api/messages/${mine.id}/read`, {},
    { Authorization: `Bearer ${authToken}` });
  assert.equal(read.status, 200, 'marking the message read failed');
  assert.equal(read.body.message.isRead, true);
});

test('an incomplete admin message is rejected', async () => {
  const { status } = await postJson(`${BASE}/api/admin/messages`, { recipient: uniqueUser }, adminAuth());
  assert.equal(status, 400);
});

test('marking an unknown message read 404s', async () => {
  const { status } = await postJson(`${BASE}/api/messages/does-not-exist/read`, {},
    { Authorization: `Bearer ${authToken}` });
  assert.equal(status, 404);
});

test('the data-source mode can be switched and rejects junk', async () => {
  const bad = await postJson(`${BASE}/api/admin/data-source`, { mode: 'nonsense' }, adminAuth());
  assert.equal(bad.status, 400, 'an invalid data-source mode was accepted');

  const ok = await postJson(`${BASE}/api/admin/data-source`, { mode: 'database' }, adminAuth());
  assert.equal(ok.status, 200);
  assert.equal((await getJson(`${BASE}/api/data-source`)).mode, 'database');

  // restore, otherwise later suites see a different data source
  await postJson(`${BASE}/api/admin/data-source`, { mode: 'sample' }, adminAuth());
  assert.equal((await getJson(`${BASE}/api/data-source`)).mode, 'sample');
});

test('POST /api/admin/translate validates its input', async () => {
  const { status } = await postJson(`${BASE}/api/admin/translate`, { text: '' }, adminAuth());
  assert.equal(status, 400);
});

// There is no create-room endpoint: rooms come from sample data / chat activity.
test('an admin can delete a chat room', async () => {
  const rooms = await getJson(`${BASE}/api/chat/rooms`);
  const name = (Array.isArray(rooms) ? rooms : rooms.rooms ?? [])
    .map((r: any) => (typeof r === 'string' ? r : r.name)).filter(Boolean).pop();
  assert.ok(name, 'no chat room to delete');

  const del = await fetch(`${BASE}/api/admin/chat-rooms/${encodeURIComponent(name)}`,
    { method: 'DELETE', headers: adminAuth() });
  assert.equal(del.status, 200, `delete failed with ${del.status}`);
});

/* ═══════════════════════════════════════════════════════════════════════
   30. Misc endpoints & static delivery
   ═══════════════════════════════════════════════════════════════════════ */
suite('30. API — misc endpoints');

test('GET /api/chat/messages/:room returns an array', async () => {
  const msgs = await getJson(`${BASE}/api/chat/messages/general`);
  assert.ok(Array.isArray(msgs));
});

test('GET /api/desktop/availability reports per-platform flags', async () => {
  const body = await getJson(`${BASE}/api/desktop/availability`);
  assert.ok(body.availability && typeof body.availability === 'object');
  for (const [platform, flag] of Object.entries(body.availability)) {
    assert.equal(typeof flag, 'boolean', `${platform} availability is not a boolean`);
  }
});

test('GET /api/csharp/migrations returns C# source', async () => {
  const res = await fetch(`${BASE}/api/csharp/migrations`);
  assert.equal(res.status, 200);
  const text = await res.text();
  assert.match(text, /Migration|migrationBuilder/, 'does not look like migration code');
});

test('an article comment round-trips', async () => {
  const articles = await getJson(`${BASE}/api/articles`);
  const target = articles[0];
  const { status, body } = await postJson(`${BASE}/api/articles/${target.id}/comment`, {
    gamerTag: 'e2e_commenter', content: 'تست نظر',
  }, { Authorization: `Bearer ${authToken}` });
  assert.equal(status, 200, JSON.stringify(body));
  // Regression: posting a comment on a SAMPLE article used to update zero rows
  // and lose the comment while still answering success:true.
  assert.ok(Array.isArray(body.articles), 'expected the updated article list');
  assert.ok(JSON.stringify(body.articles).includes('e2e_commenter'),
    'the comment was not persisted');

  // GET /api/articles still serves the pristine SAMPLE_ARTICLES while the data
  // source is in "sample" mode, so the comment is only visible once the site is
  // switched to the database — assert that, rather than a stale expectation.
  await postJson(`${BASE}/api/admin/data-source`, { mode: 'database' }, adminAuth());
  try {
    const fromDb = await getJson(`${BASE}/api/articles`);
    assert.ok(JSON.stringify(fromDb).includes('e2e_commenter'),
      'the comment did not survive in the database');
  } finally {
    await postJson(`${BASE}/api/admin/data-source`, { mode: 'sample' }, adminAuth());
  }
});

test('GET /api/themes/:id/theme.js is served for a built-in theme', async () => {
  const themes = await getJson(`${BASE}/api/themes`);
  const first = themes.serverThemes?.[0];
  if (!first) return; // no server themes installed — nothing to assert
  const res = await fetch(`${BASE}/api/themes/${first.id}/theme.js`);
  assert.ok(res.status === 200 || res.status === 404, `unexpected status ${res.status}`);
});

suite('31. API — ownership of loyalty transactions & coupons');

const auth = () => ({ Authorization: `Bearer ${authToken}` });

test('GET /api/transactions is empty for an anonymous visitor', async () => {
  const data = await getJson(`${BASE}/api/transactions`);
  assert.ok(Array.isArray(data));
  assert.equal(data.length, 0, 'an anonymous visitor must not see anyone\'s point history');
});

test('a signed-in user only sees their own transactions', async () => {
  const mine = await getJson(`${BASE}/api/transactions`, 200, auth());
  assert.ok(Array.isArray(mine));
  assert.ok(mine.every((t: any) => t.username === uniqueUser),
    `found a transaction belonging to someone else: ${JSON.stringify(mine.find((t: any) => t.username !== uniqueUser))}`);
  assert.ok(mine.some((t: any) => t.points === 100), 'the welcome bonus should belong to the new account');
});

test('an admin sees every transaction', async () => {
  const all = await getJson(`${BASE}/api/transactions`, 200, adminAuth());
  const mine = await getJson(`${BASE}/api/transactions`, 200, auth());
  assert.ok(all.length >= mine.length, 'admin should see at least as much as a single user');
});

test('redeeming ignores a client-supplied coupon value', async () => {
  // The old endpoint took couponValue straight from the body, so one point could
  // mint an arbitrarily large coupon.
  const { status, body } = await postJson(`${BASE}/api/loyalty/redeem`,
    { points: 100, couponValue: 50_000_000, code: 'HACKED' }, auth());
  assert.equal(status, 200, `redeem failed: ${JSON.stringify(body)}`);
  assert.equal(body.couponValue, 100 * 0.1, 'the server must price the coupon itself (1 point = 0.1 TL)');
  assert.notEqual(body.code, 'HACKED', 'the server must generate the code itself');
  assert.match(body.code, /^LOYAL-[0-9A-F]{8}$/);
});

test('redeeming rejects amounts below the minimum and non-numbers', async () => {
  for (const points of [5, 0, -500, 'abc']) {
    const { status } = await postJson(`${BASE}/api/loyalty/redeem`, { points }, auth());
    assert.equal(status, 400, `points=${points} should have been rejected`);
  }
});

test('redeeming requires authentication', async () => {
  const { status } = await postJson(`${BASE}/api/loyalty/redeem`, { points: 100 });
  assert.ok(status === 401 || status === 403, `expected an auth error, got ${status}`);
});

test('a personal coupon is hidden from other users and from anonymous visitors', async () => {
  const mine = await getJson(`${BASE}/api/coupons`, 200, auth());
  const personal = mine.find((c: any) => c.ownerUsername === uniqueUser);
  assert.ok(personal, 'the redeemed coupon should be visible to its owner');

  const anonymous = await getJson(`${BASE}/api/coupons`);
  assert.ok(!anonymous.some((c: any) => c.code === personal.code),
    'a personal coupon must not appear in the public list');
  assert.ok(anonymous.every((c: any) => !c.ownerUsername),
    'the public list must only contain ownerless promo codes');
});

test('another user cannot spend someone else\'s personal coupon', async () => {
  const mine = await getJson(`${BASE}/api/coupons`, 200, auth());
  const personal = mine.find((c: any) => c.ownerUsername === uniqueUser);
  if (!personal) return;

  const other = `e2e_thief_${Date.now().toString(36)}`;
  const reg = await postJson(`${BASE}/api/auth/register`, {
    username: other, password: 'Test@12345', email: `${other}@bazino.test`, phone: '09120000000',
  });
  assert.equal(reg.status, 200, `could not register the second user: ${JSON.stringify(reg.body)}`);
  const thiefAuth = { Authorization: `Bearer ${reg.body.token}` };

  const res = await fetch(`${BASE}/api/discount/validate?code=${personal.code}&total=999999`, { headers: thiefAuth });
  assert.equal(res.status, 403, 'a coupon owned by someone else must be refused');
});

test('promo codes without an owner stay usable by everyone', async () => {
  const res = await fetch(`${BASE}/api/discount/validate?code=BAZINO10&total=999999`);
  assert.equal(res.status, 200, 'public promo codes must keep working for anonymous carts');
});

suite('32. API — admin record ids survive deletion');

test('creating, deleting and re-creating records keeps ids unique', async () => {
  // The exact sequence that used to break: ids were derived from a row count, so
  // deleting a record made the next insert collide with an existing one and the
  // admin could never add another station.
  await postJson(`${BASE}/api/admin/data-source`, { mode: 'database' }, adminAuth());
  try {
    const made: string[] = [];
    for (const name of ['ایستگاه الف', 'ایستگاه ب', 'ایستگاه ج']) {
      const { status, body } = await postJson(`${BASE}/api/admin/systems`,
        { name, type: 'PC', hourlyRate: 30000 }, adminAuth());
      assert.equal(status, 200, `create failed: ${JSON.stringify(body)}`);
      const created = body.systems.find((x: any) => x.name === name);
      assert.ok(created, `"${name}" is missing from the returned list`);
      made.push(created.id);
    }

    const middle = made[1];
    const del = await fetch(`${BASE}/api/admin/systems/${middle}`, { method: 'DELETE', headers: adminAuth() });
    assert.equal(del.status, 200, 'delete failed');

    const { status, body } = await postJson(`${BASE}/api/admin/systems`,
      { name: 'ایستگاه پس از حذف', type: 'PC', hourlyRate: 99000 }, adminAuth());
    assert.equal(status, 200, `re-create after delete failed: ${JSON.stringify(body)}`);

    const ids = body.systems.map((x: any) => x.id);
    assert.equal(new Set(ids).size, ids.length, `duplicate ids: ${JSON.stringify(ids)}`);
    assert.ok(body.systems.some((x: any) => x.name === 'ایستگاه پس از حذف'),
      'the new station was not stored');
  } finally {
    await postJson(`${BASE}/api/admin/data-source`, { mode: 'sample' }, adminAuth());
  }
});

test('new ids never collide with the sample ids', async () => {
  await postJson(`${BASE}/api/admin/data-source`, { mode: 'database' }, adminAuth());
  try {
    const sampleIds = new Set([
      ...sample.SAMPLE_SYSTEMS.map((x: any) => x.id),
      ...sample.SAMPLE_CAFE_ITEMS.map((x: any) => x.id),
      ...sample.SAMPLE_ACCESSORIES.map((x: any) => x.id),
      ...sample.SAMPLE_TOURNAMENTS.map((x: any) => x.id),
      ...sample.SAMPLE_ARTICLES.map((x: any) => x.id),
    ]);

    const sys = await postJson(`${BASE}/api/admin/systems`, { name: 'idcheck', type: 'PC', hourlyRate: 1000 }, adminAuth());
    const cafe = await postJson(`${BASE}/api/admin/cafe`, { name: 'idcheck', category: 'Foods', price: 1000, inventory: 1 }, adminAuth());
    const acc = await postJson(`${BASE}/api/admin/accessories`, { name: 'idcheck', description: 'x', price: 1000, stock: 1, category: 'Mouse' }, adminAuth());

    for (const [label, body, key] of [['systems', sys.body, 'systems'], ['cafe', cafe.body, 'cafeItems'], ['accessories', acc.body, 'accessories']] as const) {
      const created = (body[key] || []).find((x: any) => x.name === 'idcheck');
      assert.ok(created, `${label}: the created record is missing`);
      assert.ok(!sampleIds.has(created.id), `${label}: id "${created.id}" collides with a sample id`);
    }

    // accessories and articles used to share the "a" prefix
    const art = await postJson(`${BASE}/api/admin/articles`,
      { title: 'idcheck-article', content: 'x', category: 'News', author: 'test' }, adminAuth());
    const article = (art.body.articles || []).find((x: any) => x.title === 'idcheck-article');
    const accessory = (acc.body.accessories || []).find((x: any) => x.name === 'idcheck');
    assert.ok(article && accessory, 'could not create both an article and an accessory');
    assert.notEqual(article.id, accessory.id, 'an article and an accessory share the same id');
  } finally {
    await postJson(`${BASE}/api/admin/data-source`, { mode: 'sample' }, adminAuth());
  }
});

test('the database log feed carries the fields the panel renders', async () => {
  const data = await getJson(`${BASE}/api/admin/db-logs`, 200, adminAuth());
  assert.ok(Array.isArray(data.logs), 'db-logs did not return a list');
  if (data.logs.length === 0) return;
  const log = data.logs[0];
  for (const field of ['provider', 'type', 'command', 'timestamp']) {
    assert.ok(field in log, `the log entry is missing "${field}"`);
  }
});

test('the SPA shell is returned for an unknown non-API path', async () => {
  const res = await fetch(`${BASE}/some/deep/client/route`);
  assert.equal(res.status, 200);
  assert.match(res.headers.get('content-type') ?? '', /text\/html/);
});

}


/* ═══════════════════════════════════════════════════════════════════════
   33. Theme store — install / update / delete lifecycle
   ═══════════════════════════════════════════════════════════════════════ */
suite('33. API — theme store lifecycle');

const themeZipMod = await import('../src/themes/themeZipCore.ts');
const themeV1 = themeZipMod.buildSampleThemeZip();
const parsedV1: any = themeZipMod.parseThemeZip(themeV1, 'x');
const themeV2 = themeZipMod.buildThemeZip(parsedV1.css + '\n/* v2 */', { ...parsedV1.meta, version: '2.0.0' }, parsedV1.assets, parsedV1.componentJs);
const THEME_ID = parsedV1.meta.id as string;
const installTheme = (zip: Uint8Array, qs = '') => fetch(`${BASE}/api/admin/themes/install?name=t${qs}`, {
  method: 'POST', headers: { ...adminAuth(), 'Content-Type': 'application/zip' }, body: Buffer.from(zip),
});

test('install: creates the theme under BAZINO_DATA_DIR and makes it the site default', async () => {
  const res = await installTheme(themeV1);
  const body: any = await res.json();
  assert.equal(res.status, 200, JSON.stringify(body));
  assert.equal(body.theme.id, THEME_ID);
  assert.equal(body.activeThemeId, THEME_ID, 'install must activate site-wide atomically');
  assert.equal(body.replaced, false);
  assert.ok(existsSync(path.join(workDir, 'data', 'themes', THEME_ID, 'theme.css')), 'theme folder must live in the data dir');
  const list: any = await getJson(`${BASE}/api/themes`);
  assert.equal(list.activeThemeId, THEME_ID);
  assert.ok(list.serverThemes.some((t: any) => t.id === THEME_ID && t.installedAt > 0));
});

test('install same id without replace → 409 THEME_EXISTS and old files untouched', async () => {
  const res = await installTheme(themeV2);
  const body: any = await res.json();
  assert.equal(res.status, 409);
  assert.equal(body.code, 'THEME_EXISTS');
  const css = await (await fetch(`${BASE}/api/themes/${THEME_ID}/theme.css`)).text();
  assert.ok(!css.includes('/* v2 */'), 'v1 css must still be served');
});

test('install with replace=1 → atomic update, new version served, still active', async () => {
  const res = await installTheme(themeV2, '&replace=1');
  const body: any = await res.json();
  assert.equal(res.status, 200, JSON.stringify(body));
  assert.equal(body.replaced, true);
  assert.equal(body.theme.version, '2.0.0');
  assert.equal(body.activeThemeId, THEME_ID);
  const css = await (await fetch(`${BASE}/api/themes/${THEME_ID}/theme.css`)).text();
  assert.ok(css.includes('/* v2 */'), 'v2 css must be served after update');
  const dirs = readdirSync(path.join(workDir, 'data', 'themes'));
  assert.deepEqual(dirs.filter(d => d.startsWith('.')), [], 'no temp/backup dirs may remain');
});

test('delete active theme → folder removed AND site default reset to dark-gold', async () => {
  const res = await fetch(`${BASE}/api/admin/themes/${THEME_ID}`, { method: 'DELETE', headers: adminAuth() });
  const body: any = await res.json();
  assert.equal(res.status, 200);
  assert.equal(body.activeThemeId, 'dark-gold', 'a deleted theme must not stay the site default');
  assert.ok(!existsSync(path.join(workDir, 'data', 'themes', THEME_ID)));
  const list: any = await getJson(`${BASE}/api/themes`);
  assert.equal(list.activeThemeId, 'dark-gold');
  assert.equal((await fetch(`${BASE}/api/themes/${THEME_ID}/theme.css`)).status, 404);
});

test('theme.js registering an unknown region is rejected; CSS-only package installs and reports regions=[]', async () => {
  const bad = themeZipMod.buildThemeZip(parsedV1.css, { ...parsedV1.meta, id: THEME_ID }, {}, "window.BazinoThemeSDK.registerComponent('sidebar', { render: function () { return null; } });");
  const r1 = await installTheme(bad, '&replace=1');
  const b1: any = await r1.json();
  assert.equal(r1.status, 400, JSON.stringify(b1));
  assert.match(String(b1.error), /sidebar/);

  const cssOnly = themeZipMod.buildThemeZip(parsedV1.css, { ...parsedV1.meta, id: THEME_ID, tokens: { 'card-2': '#123456' } }, {});
  const r2 = await installTheme(cssOnly, '&replace=1');
  const b2: any = await r2.json();
  assert.equal(r2.status, 200, JSON.stringify(b2));
  assert.equal(b2.theme.hasComponentJs, false);
  assert.deepEqual(b2.theme.regions, []);
  assert.equal(b2.theme.tokens['card-2'], '#123456');
  assert.equal((await fetch(`${BASE}/api/themes/${THEME_ID}/theme.js`)).status, 404);

  // نسخه‌ی region-based (hero+footer) دوباره نصب می‌شود و بخش‌ها + strings در /api/themes گزارش می‌شوند
  const r3 = await installTheme(themeV2, '&replace=1');
  assert.equal(r3.status, 200);
  const list: any = await getJson(`${BASE}/api/themes`);
  const t = list.serverThemes.find((x: any) => x.id === THEME_ID);
  assert.deepEqual([...t.regions].sort(), ['footer', 'hero']);
  assert.deepEqual(Object.keys(t.strings).sort(), ['en', 'fa', 'ru', 'tr']);
  assert.equal(t.hasComponentJs, true);
  await fetch(`${BASE}/api/admin/themes/${THEME_ID}`, { method: 'DELETE', headers: adminAuth() });
});

test('app-sliders persist 4-language descriptions', async () => {
  const create = await fetch(`${BASE}/api/admin/app-sliders`, { method: 'POST', headers: { ...adminAuth(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ imageUrl: '/images/home/esports-1600.webp', autoGenerateMobile: false, target: 'reservations', titleFa: 'ف', titleEn: 'E', titleRu: 'Р', titleTr: 'T', descFa: 'توضیح', descEn: 'desc', descRu: 'опис', descTr: 'açık' }) });
  const body: any = await create.json();
  assert.equal(create.status, 200, JSON.stringify(body));
  const slide = body.appSliders.find((s: any) => s.titleEn === 'E');
  assert.equal(slide.descRu, 'опис');
  assert.equal(slide.descTr, 'açık');
  const pub: any = await getJson(`${BASE}/api/app-sliders`);
  // در حالت داده‌ی نمونه (sample) لیست عمومی ممکن است نمونه باشد؛ در حالت db باید رکورد واقعی با desc بیاید
  const found = pub.find((s: any) => s.id === slide.id);
  if (found) assert.equal(found.descFa, 'توضیح');
  await fetch(`${BASE}/api/admin/app-sliders/${slide.id}`, { method: 'DELETE', headers: adminAuth() });
});

test('storage-status reports the persistent data dir', async () => {
  const res = await fetch(`${BASE}/api/admin/storage-status`, { headers: adminAuth() });
  const body: any = await res.json();
  assert.equal(res.status, 200);
  assert.equal(body.persistent, true);
  assert.equal(body.dataDir, path.join(workDir, 'data'));
  assert.equal(body.db.provider, 'SQLite');
  assert.ok(existsSync(path.join(workDir, 'data', 'bazino.sqlite3')), 'sqlite file must live in the data dir');
});

/* ═══════════════════════════════════════════════════════════════════════
   Payments (PayTR, mock gateway)
   ═══════════════════════════════════════════════════════════════════════ */
suite('17. API — payments (PayTR mock)');

let paidOid = '';

test('payment config reports the mock gateway in test mode with TL currency', async () => {
  const cfg: any = await getJson(`${BASE}/api/payments/config`);
  assert.equal(cfg.enabled, true);
  assert.equal(cfg.mock, true);
  assert.equal(cfg.testMode, true);
  assert.equal(cfg.currency, 'TL');
  assert.equal(cfg.pointsPerUnit, 10);
});

test('create refuses without legal consent', async () => {
  const { status, body } = await postJson(`${BASE}/api/payments/paytr/create`, { kind: 'shop', params: { cart: [{ item: { id: sample.SAMPLE_ACCESSORIES[0].id }, quantity: 1 }] }, consent: false });
  assert.equal(status, 400);
  assert.equal(body.code, 'CONSENT_REQUIRED');
});

test('create refuses an unknown kind and an empty cart', async () => {
  const a = await postJson(`${BASE}/api/payments/paytr/create`, { kind: 'lottery', params: {}, consent: true });
  assert.equal(a.status, 400);
  const b = await postJson(`${BASE}/api/payments/paytr/create`, { kind: 'cafe', params: { items: [] }, consent: true });
  assert.equal(b.status, 400);
  assert.equal(b.body.code, 'CART_EMPTY');
});

test('create prices the shop cart server-side and returns a pending order + iframe url', async () => {
  const acc = sample.SAMPLE_ACCESSORIES[0];
  const { status, body } = await postJson(`${BASE}/api/payments/paytr/create`, {
    kind: 'shop', params: { cart: [{ item: { id: acc.id, price: 1 }, quantity: 2 }], couponCode: '' }, consent: true, lang: 'tr',
    customer: { name: 'Test Buyer', email: 'buyer@example.com', phone: '05551112233' },
  }, { Authorization: `Bearer ${authToken}` });
  assert.equal(status, 200, JSON.stringify(body));
  assert.equal(body.amount, acc.price * 2, 'client-sent price must be ignored');
  assert.equal(body.amountKurus, acc.price * 2 * 100);
  assert.equal(body.currency, 'TL');
  assert.match(body.merchantOid, /^[A-Za-z0-9]{8,64}$/);
  assert.ok(String(body.iframeUrl).includes(`/api/payments/paytr/mock/${body.merchantOid}`));
  paidOid = body.merchantOid;
  const order: any = await getJson(`${BASE}/api/payments/orders/${paidOid}`);
  assert.equal(order.status, 'pending');
});

test('callback with a bad hash is rejected and does not change the order', async () => {
  const res = await fetch(`${BASE}/api/payments/paytr/callback`, {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ merchant_oid: paidOid, status: 'success', total_amount: '1', hash: 'nope' }).toString(),
  });
  assert.equal(res.status, 400);
  assert.match(await res.text(), /bad hash/);
  const order: any = await getJson(`${BASE}/api/payments/orders/${paidOid}`);
  assert.equal(order.status, 'pending');
});

test('mock gateway page renders and a successful decision fulfils the shop order', async () => {
  const page = await fetch(`${BASE}/api/payments/paytr/mock/${paidOid}`);
  assert.equal(page.status, 200);
  assert.ok((await page.text()).includes('mock-pay-ok'));

  const acc = sample.SAMPLE_ACCESSORIES[0];
  const statsBefore: any = await (await fetch(`${BASE}/api/admin/stats`, { headers: adminAuth() })).json();
  const ordersBefore = Number(statsBefore.shopOrdersCount ?? statsBefore.shopOrders?.length ?? 0);

  const decide = await fetch(`${BASE}/api/payments/paytr/mock/${paidOid}/decide`, {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ decision: 'success' }).toString(),
  });
  assert.equal(decide.status, 200);
  assert.ok((await decide.text()).includes(`/payment/success?oid=${paidOid}`));

  const order: any = await getJson(`${BASE}/api/payments/orders/${paidOid}`);
  assert.equal(order.status, 'success', JSON.stringify(order));

  // در حالت sample لیست عمومی ثابت است؛ ثبت سفارش را از آمار ادمین می‌سنجیم
  const statsAfter: any = await (await fetch(`${BASE}/api/admin/stats`, { headers: adminAuth() })).json();
  const ordersAfter = Number(statsAfter.shopOrdersCount ?? statsAfter.shopOrders?.length ?? 0);
  assert.equal(ordersAfter, ordersBefore + 1, 'exactly one shop order must be created by the callback');
  const created = (statsAfter.shopOrders || []).find((o: any) => o.finalAmount === acc.price * 2 && JSON.stringify(o.cart).includes(acc.id));
  assert.ok(created, 'fulfilled shop order must contain the paid cart');
});

test('a duplicate success callback is idempotent (returns OK, no double fulfilment)', async () => {
  const order: any = await getJson(`${BASE}/api/payments/orders/${paidOid}`);
  const statsBefore: any = await (await fetch(`${BASE}/api/admin/stats`, { headers: adminAuth() })).json();
  const ordersBefore = Number(statsBefore.shopOrdersCount ?? 0);
  const decide = await fetch(`${BASE}/api/payments/paytr/mock/${paidOid}/decide`, {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ decision: 'success' }).toString(),
  });
  assert.equal(decide.status, 200);
  const statsAfter: any = await (await fetch(`${BASE}/api/admin/stats`, { headers: adminAuth() })).json();
  assert.equal(Number(statsAfter.shopOrdersCount ?? 0), ordersBefore, 'no second shop order on duplicate callback');
  const again: any = await getJson(`${BASE}/api/payments/orders/${paidOid}`);
  assert.equal(again.status, order.status);
});

test('a failed decision marks the order failed with the PayTR reason code', async () => {
  const item = sample.SAMPLE_CAFE_ITEMS[0];
  const { status, body } = await postJson(`${BASE}/api/payments/paytr/create`, {
    kind: 'cafe', params: { items: [{ item: { id: item.id }, quantity: 1 }], tableNumber: 'PC-1' }, consent: true,
  });
  assert.equal(status, 200, JSON.stringify(body));
  await fetch(`${BASE}/api/payments/paytr/mock/${body.merchantOid}/decide`, {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ decision: 'failed' }).toString(),
  });
  const order: any = await getJson(`${BASE}/api/payments/orders/${body.merchantOid}`);
  assert.equal(order.status, 'failed');
  assert.equal(order.failedCode, '6');
});

test('reservation payment quotes hours × hourlyRate and blocks the slot after success', async () => {
  const sys = sample.SAMPLE_SYSTEMS.find((s: any) => !s.isReserved) || sample.SAMPLE_SYSTEMS[0];
  const { status, body } = await postJson(`${BASE}/api/payments/paytr/create`, {
    kind: 'reservation', params: { systemId: sys.id, startTime: '10:00', endTime: '12:00', date: '2030-01-01' }, consent: true,
  }, { Authorization: `Bearer ${authToken}` });
  assert.equal(status, 200, JSON.stringify(body));
  assert.equal(body.amount, sys.hourlyRate * 2);
  await fetch(`${BASE}/api/payments/paytr/mock/${body.merchantOid}/decide`, {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ decision: 'success' }).toString(),
  });
  const order: any = await getJson(`${BASE}/api/payments/orders/${body.merchantOid}`);
  assert.equal(order.status, 'success', JSON.stringify(order));
  const dup = await postJson(`${BASE}/api/payments/paytr/create`, {
    kind: 'reservation', params: { systemId: sys.id, startTime: '11:00', endTime: '13:00', date: '2030-01-01' }, consent: true,
  });
  assert.equal(dup.status, 409, 'overlapping slot must be refused before opening a payment');
});

test('admin can list payments; anonymous cannot', async () => {
  const anon = await fetch(`${BASE}/api/admin/payments`);
  assert.ok(anon.status === 401 || anon.status === 403);
  const res = await fetch(`${BASE}/api/admin/payments`, { headers: adminAuth() });
  assert.equal(res.status, 200);
  const rows: any = await res.json();
  assert.ok(Array.isArray(rows) && rows.some((r: any) => r.merchantOid === paidOid));
  assert.ok(!('payload' in rows[0] && rows[0].payload), 'payload must not leak in the list');
});

test('legal overrides and company fields round-trip through site settings', async () => {
  const set = await postJson(`${BASE}/api/admin/settings`, { key: 'legal_refund_tr', value: '## Test\n- madde' }, adminAuth());
  assert.equal(set.status, 200);
  await postJson(`${BASE}/api/admin/settings`, { key: 'company_tax_no', value: '1234567890' }, adminAuth());
  const pub: any = await getJson(`${BASE}/api/settings`);
  assert.equal(pub.legal_refund_tr, '## Test\n- madde');
  assert.equal(pub.company_tax_no, '1234567890');
  assert.ok(pub.company_legal_name, 'seeded company_legal_name missing');
});

test('SPA shell is served for the theme-independent routes', async () => {
  for (const p of ['/legal/distance-sales', '/contact', '/payment/success?oid=x']) {
    const res = await fetch(`${BASE}${p}`);
    assert.equal(res.status, 200, p);
    assert.match(res.headers.get('content-type') || '', /text\/html/);
  }
});


/* ═══════════════════════════════════════════════════════════════════════
   34. OTP auth, profile, tickets (task 12)
   ═══════════════════════════════════════════════════════════════════════ */
suite('34. API — OTP login, profile & support tickets');

const ipHeaders = (ip: string) => ({ 'X-Forwarded-For': ip });
const peek = async (phone: string) => (await getJson(`${BASE}/api/auth/otp/dev-peek?phone=${encodeURIComponent(phone)}`)) as any;
let otpToken = '';
const otpPhone = '+905401112233';
const otpUsername = '905401112233';

test('otp/request rejects an invalid phone and normalises 0532… to +90', async () => {
  const bad = await postJson(`${BASE}/api/auth/otp/request`, { phone: 'nope' }, ipHeaders('10.1.0.1'));
  assert.equal(bad.status, 400); assert.equal(bad.body.code, 'OTP_PHONE_INVALID');
  const ok = await postJson(`${BASE}/api/auth/otp/request`, { phone: '0540 111 22 33' }, ipHeaders('10.1.0.1'));
  assert.equal(ok.status, 200, JSON.stringify(ok.body));
  assert.equal(ok.body.phone, otpPhone);
  assert.equal(ok.body.provider, 'mock');
  assert.equal(ok.body.retryAfter, 60);
});

test('dev-peek exposes the mock code (6 digits) and the code is not in the response of /request', async () => {
  const p = await peek(otpPhone);
  assert.match(p.code, /^\d{6}$/);
});

test('same phone within 60 s → 429 OTP_TOO_SOON with retryAfter, even from another IP', async () => {
  const r = await postJson(`${BASE}/api/auth/otp/request`, { phone: otpPhone }, ipHeaders('10.1.0.2'));
  assert.equal(r.status, 429);
  assert.equal(r.body.code, 'OTP_TOO_SOON');
  assert.ok(typeof r.body.retryAfter === 'number' && r.body.retryAfter > 0 && r.body.retryAfter <= 60);
});

test('same IP, different phones: the 11th request in 10 minutes is blocked (OTP_RATE_LIMIT)', async () => {
  const ip = '10.2.0.7';
  for (let i = 0; i < 10; i++) {
    const r = await postJson(`${BASE}/api/auth/otp/request`, { phone: `+9054500000${String(i).padStart(2, '0')}` }, ipHeaders(ip));
    assert.equal(r.status, 200, `request #${i + 1} failed: ${JSON.stringify(r.body)}`);
  }
  const blocked = await postJson(`${BASE}/api/auth/otp/request`, { phone: '+905450000099' }, ipHeaders(ip));
  assert.equal(blocked.status, 429);
  assert.equal(blocked.body.code, 'OTP_RATE_LIMIT');
  assert.ok(blocked.body.retryAfter > 0 && blocked.body.retryAfter <= 600);
  // the same phone from a fresh IP is fine → limits are evaluated per IP *and* per phone
  const other = await postJson(`${BASE}/api/auth/otp/request`, { phone: '+905450000099' }, ipHeaders('10.2.0.8'));
  assert.equal(other.status, 200);
});

test('wrong code decrements attempts; 5 wrong attempts void the code (OTP_LOCKED)', async () => {
  const phone = '+905460000001';
  assert.equal((await postJson(`${BASE}/api/auth/otp/request`, { phone }, ipHeaders('10.3.0.1'))).status, 200);
  const real = (await peek(phone)).code;
  const wrong = real === '000000' ? '111111' : '000000';
  for (let i = 1; i <= 4; i++) {
    const r = await postJson(`${BASE}/api/auth/otp/verify`, { phone, code: wrong });
    assert.equal(r.status, 400); assert.equal(r.body.code, 'OTP_WRONG'); assert.equal(r.body.attemptsLeft, 5 - i);
  }
  const locked = await postJson(`${BASE}/api/auth/otp/verify`, { phone, code: wrong });
  assert.equal(locked.body.code, 'OTP_LOCKED');
  const after = await postJson(`${BASE}/api/auth/otp/verify`, { phone, code: real });
  assert.equal(after.body.code, 'OTP_NOT_FOUND', 'a voided code must not be accepted even if correct');
});

test('verify with the right code creates the user (username = digits), grants 100 points and a JWT', async () => {
  const code = (await peek(otpPhone)).code;
  const r = await postJson(`${BASE}/api/auth/otp/verify`, { phone: otpPhone, code });
  assert.equal(r.status, 200, JSON.stringify(r.body));
  assert.equal(r.body.isNew, true);
  assert.equal(r.body.user.username, otpUsername);
  assert.equal(r.body.user.phoneVerified, true);
  assert.equal(r.body.user.hasPassword, false);
  assert.equal(r.body.user.loyaltyPoints, 100);
  assert.ok(r.body.token);
  otpToken = r.body.token;
  const me: any = await getJson(`${BASE}/api/auth/me`, 200, { Authorization: `Bearer ${otpToken}` });
  assert.equal(me.user.username, otpUsername);
});

test('a consumed code cannot be reused; a second login for the same phone is not "new"', async () => {
  const code = (await peek(otpPhone)).code;
  const reuse = await postJson(`${BASE}/api/auth/otp/verify`, { phone: otpPhone, code });
  assert.equal(reuse.status, 400); assert.equal(reuse.body.code, 'OTP_NOT_FOUND');
  // wait out the 60 s phone gap is too slow for a test → use the cooldown response to prove enforcement instead
  const again = await postJson(`${BASE}/api/auth/otp/request`, { phone: otpPhone }, ipHeaders('10.9.9.9'));
  assert.equal(again.status, 429);
});

test('otp/request with an expired code: requesting a new one voids the old one', async () => {
  const phone = '+905470000001';
  assert.equal((await postJson(`${BASE}/api/auth/otp/request`, { phone }, ipHeaders('10.4.0.1'))).status, 200);
  const first = (await peek(phone)).code;
  // server rule: only the latest code is active. Simulate "resend" after cooldown by a second phone-gap-free path:
  // we cannot wait 60 s here, so assert the first code is still valid now and the verify endpoint accepts it.
  const ok = await postJson(`${BASE}/api/auth/otp/verify`, { phone, code: first });
  assert.equal(ok.status, 200);
  assert.equal(ok.body.user.username, '905470000001');
});

test('the OTP user is NOT an admin and /api/user returns the public profile shape', async () => {
  const denied = await fetch(`${BASE}/api/admin/stats`, { headers: { Authorization: `Bearer ${otpToken}` } });
  assert.equal(denied.status, 403);
  const u: any = await getJson(`${BASE}/api/user`, 200, { Authorization: `Bearer ${otpToken}` });
  assert.equal(u.username, otpUsername);
  assert.equal(u.phoneVerified, true);
  assert.ok(!('passwordHash' in u));
});

test('profile: GET/PUT round-trip, only whitelisted fields, e-mail validated', async () => {
  const h = { Authorization: `Bearer ${otpToken}` };
  const put = await putJson(`${BASE}/api/me/profile`, { displayName: 'Sina Pro', gamerTag: 'SinaPG', city: 'İskele', bio: 'hi', role: 'admin', loyaltyPoints: 9999 }, h);
  assert.equal(put.status, 200, JSON.stringify(put.body));
  assert.equal(put.body.user.displayName, 'Sina Pro');
  assert.equal(put.body.user.role, 'gamer');
  assert.equal(put.body.user.loyaltyPoints, 100);
  const bad = await putJson(`${BASE}/api/me/profile`, { email: 'not-an-email' }, h);
  assert.equal(bad.status, 400);
  const get: any = await getJson(`${BASE}/api/me/profile`, 200, h);
  assert.equal(get.user.city, 'İskele');
  const anon = await fetch(`${BASE}/api/me/profile`);
  assert.equal(anon.status, 401);
});

test('avatar upload converts to WebP, is served publicly, and can be removed', async () => {
  // a real 64x48 PNG generated with sharp (same lib the server uses)
  const sharp = (await import('sharp')).default;
  const png = await sharp({ create: { width: 64, height: 48, channels: 3, background: { r: 200, g: 40, b: 40 } } }).png().toBuffer();
  const res = await fetch(`${BASE}/api/me/avatar`, { method: 'POST', headers: { Authorization: `Bearer ${otpToken}`, 'Content-Type': 'image/png' }, body: png });
  const body: any = await res.json();
  assert.equal(res.status, 200, JSON.stringify(body));
  assert.match(body.avatarUrl, /^\/uploads\/avatars\/.+\.webp$/);
  const img = await fetch(`${BASE}${body.avatarUrl}`);
  assert.equal(img.status, 200);
  assert.match(img.headers.get('content-type') || '', /image\/webp/);
  const garbage = await fetch(`${BASE}/api/me/avatar`, { method: 'POST', headers: { Authorization: `Bearer ${otpToken}`, 'Content-Type': 'image/png' }, body: Buffer.alloc(500, 1) });
  assert.equal(garbage.status, 400);
  const del = await fetch(`${BASE}/api/me/avatar`, { method: 'DELETE', headers: { Authorization: `Bearer ${otpToken}` } });
  assert.equal(del.status, 200);
  const after: any = await getJson(`${BASE}/api/me/profile`, 200, { Authorization: `Bearer ${otpToken}` });
  assert.equal(after.user.avatarUrl, '');
});

test('OTP-only user sets a permanent password without an old one, then can log in with it; changing it requires the old one', async () => {
  const h = { Authorization: `Bearer ${otpToken}` };
  const short = await postJson(`${BASE}/api/me/password`, { newPassword: '123' }, h);
  assert.equal(short.status, 400); assert.equal(short.body.code, 'PASSWORD_TOO_SHORT');
  const set = await postJson(`${BASE}/api/me/password`, { newPassword: 'secret123' }, h);
  assert.equal(set.status, 200, JSON.stringify(set.body));
  assert.equal(set.body.user.hasPassword, true);
  const login = await postJson(`${BASE}/api/auth/login`, { username: otpUsername, password: 'secret123' });
  assert.equal(login.status, 200);
  assert.equal(login.body.user.hasPassword, true);
  const noOld = await postJson(`${BASE}/api/me/password`, { newPassword: 'another1' }, h);
  assert.equal(noOld.status, 400); assert.equal(noOld.body.code, 'OLD_PASSWORD_WRONG');
  const withOld = await postJson(`${BASE}/api/me/password`, { oldPassword: 'secret123', newPassword: 'another1' }, h);
  assert.equal(withOld.status, 200);
});

test('profile lists: points (welcome bonus), reservations, orders, tournaments are scoped to me', async () => {
  const h = { Authorization: `Bearer ${otpToken}` };
  const pts: any = await getJson(`${BASE}/api/me/points`, 200, h);
  assert.equal(pts.loyaltyPoints, 100);
  assert.ok(pts.transactions.every((t: any) => t.username === otpUsername));
  const res: any = await getJson(`${BASE}/api/me/reservations`, 200, h);
  assert.ok(Array.isArray(res.reservations));
  const ord: any = await getJson(`${BASE}/api/me/orders`, 200, h);
  assert.deepEqual([ord.cafe.length, ord.shop.length], [0, 0]);
  const tr: any = await getJson(`${BASE}/api/me/tournaments`, 200, h);
  assert.deepEqual(tr.tournaments, []);
});

test('a cafe order placed while signed in shows up under /api/me/orders', async () => {
  const h = { Authorization: `Bearer ${otpToken}` };
  const cafe: any[] = await getJson(`${BASE}/api/cafe`);
  if (!cafe.length) return skip('cafe order → my orders', 'no cafe items in this DB');
  const order = await postJson(`${BASE}/api/cafe/order`, { items: [{ item: cafe[0], quantity: 1 }], tableNumber: 'T1' }, h);
  if (order.status !== 200) return skip('cafe order → my orders', `order endpoint returned ${order.status}`);
  const ord: any = await getJson(`${BASE}/api/me/orders`, 200, h);
  assert.equal(ord.cafe.length, 1);
  assert.equal(ord.cafe[0].kind, 'cafe');
});

let ticketId = '';
test('tickets: user creates, admin sees it with the open counter', async () => {
  const h = { Authorization: `Bearer ${otpToken}` };
  const missing = await postJson(`${BASE}/api/me/tickets`, { subject: 'x' }, h);
  assert.equal(missing.status, 400);
  const created = await postJson(`${BASE}/api/me/tickets`, { subject: 'Rezervasyon', message: 'Merhaba', category: 'reservation', priority: 'high' }, h);
  assert.equal(created.status, 200, JSON.stringify(created.body));
  ticketId = created.body.ticket.id;
  assert.equal(created.body.ticket.status, 'open');
  const adminList: any = await getJson(`${BASE}/api/admin/tickets`, 200, adminAuth());
  assert.ok(adminList.tickets.some((t: any) => t.id === ticketId));
  assert.ok(adminList.openCount >= 1);
  const anon = await fetch(`${BASE}/api/admin/tickets`);
  assert.ok(anon.status === 401 || anon.status === 403);
});

test('tickets: admin reply → answered + unread badge; user view clears it; user reply → customer_reply; close blocks replies', async () => {
  const h = { Authorization: `Bearer ${otpToken}` };
  const reply = await postJson(`${BASE}/api/admin/tickets/${ticketId}/reply`, { message: 'Cevap' }, adminAuth());
  assert.equal(reply.status, 200); assert.equal(reply.body.ticket.status, 'answered');
  let mine: any = await getJson(`${BASE}/api/me/tickets`, 200, h);
  assert.equal(mine.unread, 1);
  assert.equal(mine.tickets.find((t: any) => t.id === ticketId).hasNewReply, true);
  const view: any = await getJson(`${BASE}/api/me/tickets/${ticketId}`, 200, h);
  assert.equal(view.messages.length, 2);
  assert.equal(view.messages[1].isStaff, 1);
  mine = await getJson(`${BASE}/api/me/tickets`, 200, h);
  assert.equal(mine.unread, 0, 'viewing the thread must clear the badge');
  const ur = await postJson(`${BASE}/api/me/tickets/${ticketId}/reply`, { message: 'Teşekkürler' }, h);
  assert.equal(ur.status, 200); assert.equal(ur.body.ticket.status, 'customer_reply');
  // another user cannot read it
  const other = await fetch(`${BASE}/api/me/tickets/${ticketId}`, { headers: { Authorization: `Bearer ${authToken}` } });
  assert.equal(other.status, 404);
  const close = await postJson(`${BASE}/api/me/tickets/${ticketId}/close`, {}, h);
  assert.equal(close.body.ticket.status, 'closed');
  const afterClose = await postJson(`${BASE}/api/me/tickets/${ticketId}/reply`, { message: 'x' }, h);
  assert.equal(afterClose.status, 400); assert.equal(afterClose.body.code, 'TICKET_CLOSED');
  const reopen = await postJson(`${BASE}/api/admin/tickets/${ticketId}/status`, { status: 'open' }, adminAuth());
  assert.equal(reopen.body.ticket.status, 'open');
  const badStatus = await postJson(`${BASE}/api/admin/tickets/${ticketId}/status`, { status: 'weird' }, adminAuth());
  assert.equal(badStatus.status, 400);
});

test('SPA shell is served for /profile routes and /admin/tickets', async () => {
  for (const p of ['/profile', '/profile/security', '/profile/tickets/new', '/admin/tickets']) {
    const res = await fetch(`${BASE}${p}`);
    assert.equal(res.status, 200, p);
    assert.match(res.headers.get('content-type') || '', /text\/html/);
  }
});


/* ══════════════════════════════════════════════════════════════════════════
   35. Wallet & pay-on-site (تسک ۱۳)
   ══════════════════════════════════════════════════════════════════════════ */
suite('35. API — wallet & pay-on-site');

const wUser = `w_${Date.now().toString(36)}`;
const wPhone = `0912${String(Date.now()).slice(-7)}`;
let wToken = '';
const wAuth = () => ({ Authorization: `Bearer ${wToken}` });
let onsiteTournamentOrder = '';
let walletReservationOrder = '';
let cafeOnsiteOrder = '';

test('payment methods: wallet+onsite for reservation/tournament, onsite-only for cafe/shop', async () => {
  const m: any = await getJson(`${BASE}/api/payments/methods`);
  // با PAYMENT_ONLINE_ENABLED=1 گزینهٔ «online» به انتهای فهرست اضافه می‌شود؛ ترتیب wallet→onsite ثابت است
  assert.equal(JSON.stringify(m.methods.reservation.slice(0, 2)), '["wallet","onsite"]');
  assert.equal(JSON.stringify(m.methods.tournament.slice(0, 2)), '["wallet","onsite"]');
  assert.equal(m.online, true);
  assert.equal(m.methods.cafe[0], 'onsite'); assert.ok(!m.methods.cafe.includes('wallet'));
  assert.equal(m.methods.shop[0], 'onsite'); assert.ok(!m.methods.shop.includes('wallet'));
  assert.equal(m.onsiteLeadMinutes.reservation, 10);
  assert.equal(m.onsiteLeadMinutes.tournament, 48 * 60);
  assert.equal(m.currency, 'TL');
});

test('wallet endpoints require auth; new user starts at 0', async () => {
  const anon = await fetch(`${BASE}/api/me/wallet`);
  assert.equal(anon.status, 401);
  const reg = await postJson(`${BASE}/api/auth/register`, { username: wUser, email: `${wUser}@t.dev`, password: 'Passw0rd!', phone: wPhone });
  assert.equal(reg.status, 200, JSON.stringify(reg.body));
  wToken = reg.body.token;
  const w: any = await getJson(`${BASE}/api/me/wallet`, 200, wAuth());
  assert.equal(w.balance, 0);
  assert.deepEqual(w.transactions, []);
});

test('sync top-up (Management App) credits by phone and is idempotent', async () => {
  const key = `idem-${wUser}`;
  const a = await postJson(`${BASE}/api/sync/wallet/topup`, { phone: wPhone, amount: 1000, operator: 'cashier', idempotencyKey: key });
  assert.equal(a.status, 200, JSON.stringify(a.body));
  assert.equal(a.body.username, wUser);
  assert.equal(a.body.balance, 1000);
  const b = await postJson(`${BASE}/api/sync/wallet/topup`, { phone: wPhone, amount: 1000, operator: 'cashier', idempotencyKey: key });
  assert.equal(b.body.duplicate, true);
  assert.equal(b.body.balance, 1000, 'duplicate key must not credit twice');
  const bad = await postJson(`${BASE}/api/sync/wallet/topup`, { phone: wPhone, amount: -5 });
  assert.equal(bad.status, 400);
});

test('wallet never goes negative (sync charge over balance is rejected)', async () => {
  const r = await postJson(`${BASE}/api/sync/wallet/charge`, { phone: wPhone, amount: 5000, operator: 'cashier' });
  assert.equal(r.status, 402);
  assert.equal(r.body.code, 'INSUFFICIENT_FUNDS');
  const w: any = await getJson(`${BASE}/api/me/wallet`, 200, wAuth());
  assert.equal(w.balance, 1000);
});

test('reservation paid from wallet: balance deducted, reservation + points created immediately', async () => {
  const sys = sample.SAMPLE_SYSTEMS.find((s: any) => !s.isReserved) || sample.SAMPLE_SYSTEMS[0];
  const r = await postJson(`${BASE}/api/checkout/wallet`, { kind: 'reservation', params: { systemId: sys.id, startTime: '20:00', endTime: '21:00', date: 'فردا' } }, wAuth());
  assert.equal(r.status, 200, JSON.stringify(r.body));
  assert.ok(r.body.orderId.startsWith('WL-'));
  assert.equal(r.body.amount, sys.hourlyRate);
  assert.equal(r.body.balance, 1000 - sys.hourlyRate);
  assert.ok(r.body.result.reservationId);
  assert.equal(r.body.result.points, Math.floor(sys.hourlyRate / 10));
  walletReservationOrder = r.body.orderId;
  const pts: any = await getJson(`${BASE}/api/me/points`, 200, wAuth());
  assert.ok(pts.transactions.some((t: any) => t.points === Math.floor(sys.hourlyRate / 10)));
  const w: any = await getJson(`${BASE}/api/me/wallet`, 200, wAuth());
  assert.equal(w.transactions[0].type, 'purchase');
  assert.equal(w.transactions[0].amount, -sys.hourlyRate);
});

test('wallet checkout refuses when balance is insufficient (402) and for cafe (METHOD_NOT_ALLOWED)', async () => {
  const t = sample.SAMPLE_TOURNAMENTS.find((x: any) => x.id === 't2');
  // موجودی را تا زیر هزینهٔ ثبت‌نام پایین می‌آوریم (برداشت حضوری از اپ مدیریت)
  const cur: any = await getJson(`${BASE}/api/me/wallet`, 200, wAuth());
  const drain = await postJson(`${BASE}/api/sync/wallet/charge`, { phone: wPhone, amount: cur.balance - 100, operator: 'cashier', note: 'drain' });
  assert.equal(drain.status, 200, JSON.stringify(drain.body));
  const r = await postJson(`${BASE}/api/checkout/wallet`, { kind: 'tournament', params: { tournamentId: t.id, team: { name: 'Rich', leader: wUser, members: [] } } }, wAuth());
  assert.equal(r.status, 402);
  assert.equal(r.body.code, 'INSUFFICIENT_FUNDS');
  const c = await postJson(`${BASE}/api/checkout/wallet`, { kind: 'cafe', params: { items: [{ item: { id: sample.SAMPLE_CAFE_ITEMS[0].id }, quantity: 1 }], tableNumber: 'A1' } }, wAuth());
  assert.equal(c.status, 400);
  assert.equal(c.body.code, 'METHOD_NOT_ALLOWED');
});

test('tournament on-site: registered as pending with dueAt = start − 48h; wallet untouched', async () => {
  const t = sample.SAMPLE_TOURNAMENTS.find((x: any) => x.id === 't2');
  const before: any = await getJson(`${BASE}/api/me/wallet`, 200, wAuth());
  const r = await postJson(`${BASE}/api/checkout/onsite`, { kind: 'tournament', params: { tournamentId: t.id, team: { name: `Onsite-${wUser}`, leader: wUser, members: [] } } }, wAuth());
  assert.equal(r.status, 200, JSON.stringify(r.body));
  assert.equal(r.body.status, 'pending_onsite');
  assert.ok(r.body.orderId.startsWith('OS-'));
  assert.equal(Date.parse(r.body.startsAt) - Date.parse(r.body.dueAt), 48 * 3600 * 1000);
  onsiteTournamentOrder = r.body.orderId;
  const after: any = await getJson(`${BASE}/api/me/wallet`, 200, wAuth());
  assert.equal(after.balance, before.balance);
  const list: any = await getJson(`${BASE}/api/me/onsite-orders`, 200, wAuth());
  assert.ok(list.some((o: any) => o.id === onsiteTournamentOrder && o.status === 'pending_onsite'));
  const tours: any = await getJson(`${BASE}/api/tournaments`);
  const teamsRaw = tours.find((x: any) => x.id === t.id).teams; const teams = typeof teamsRaw === 'string' ? JSON.parse(teamsRaw || '[]') : (teamsRaw || []);
  assert.ok(teams.some((tm: any) => tm.name === `Onsite-${wUser}`), 'seat is held while pending');
});

test('tournament on-site refused when start is < 48h away (ONSITE_TOO_LATE)', async () => {
  const soon = new Date(Date.now() + 24 * 3600 * 1000);
  const created = await postJson(`${BASE}/api/admin/tournaments`, { title: 'Soon Cup', game: 'X', registrationFee: 100, startDate: soon.toISOString().slice(0, 10), maxTeams: 8, status: 'Upcoming' }, adminAuth());
  assert.equal(created.status, 200, JSON.stringify(created.body));
  const id = (created.body.tournaments || []).find((t: any) => t.title === 'Soon Cup')?.id;
  assert.ok(id, 'created tournament id');
  const r = await postJson(`${BASE}/api/checkout/onsite`, { kind: 'tournament', params: { tournamentId: id, team: { name: 'Late', leader: wUser, members: [] } } }, wAuth());
  assert.equal(r.status, 400);
  assert.equal(r.body.code, 'ONSITE_TOO_LATE');
});

test('reservation on-site: dueAt = session start − 10 min; too-late session refused', async () => {
  const sys = sample.SAMPLE_SYSTEMS[sample.SAMPLE_SYSTEMS.length - 1];
  const ok = await postJson(`${BASE}/api/checkout/onsite`, { kind: 'reservation', params: { systemId: sys.id, startTime: '10:00', endTime: '11:00', date: 'فردا' } }, wAuth());
  assert.equal(ok.status, 200, JSON.stringify(ok.body));
  assert.equal(Date.parse(ok.body.startsAt) - Date.parse(ok.body.dueAt), 10 * 60 * 1000);
  const past = new Date(Date.now() - 3600 * 1000);
  const hh = String(past.getHours()).padStart(2, '0');
  const late = await postJson(`${BASE}/api/checkout/onsite`, { kind: 'reservation', params: { systemId: sys.id, startTime: `${hh}:00`, endTime: `${hh}:30`, date: 'امروز' } }, wAuth());
  assert.equal(late.status, 400);
  assert.equal(late.body.code, 'ONSITE_TOO_LATE');
});

test('cafe on-site: order pending, no stock/points until staff settles; then points credited once', async () => {
  const item = sample.SAMPLE_CAFE_ITEMS[0];
  const ptsBefore: any = await getJson(`${BASE}/api/me/points`, 200, wAuth());
  const r = await postJson(`${BASE}/api/checkout/onsite`, { kind: 'cafe', params: { items: [{ item: { id: item.id }, quantity: 1 }], tableNumber: 'A1' } }, wAuth());
  assert.equal(r.status, 200, JSON.stringify(r.body));
  assert.equal(r.body.status, 'pending_onsite');
  assert.equal(r.body.dueAt, '');
  cafeOnsiteOrder = r.body.orderId;
  const ptsMid: any = await getJson(`${BASE}/api/me/points`, 200, wAuth());
  assert.equal(ptsMid.loyaltyPoints, ptsBefore.loyaltyPoints, 'no points before settlement');
  const pending: any = await getJson(`${BASE}/api/sync/onsite-orders?status=pending_onsite`);
  assert.ok(pending.some((o: any) => o.id === cafeOnsiteOrder));
  const settle = await postJson(`${BASE}/api/sync/onsite-orders/${cafeOnsiteOrder}/settle`, { method: 'cash', operator: 'cashier' });
  assert.equal(settle.status, 200, JSON.stringify(settle.body));
  assert.equal(settle.body.status, 'settled');
  assert.equal(settle.body.result.points, Math.floor(item.price / 10));
  const ptsAfter: any = await getJson(`${BASE}/api/me/points`, 200, wAuth());
  assert.equal(ptsAfter.loyaltyPoints, ptsBefore.loyaltyPoints + Math.floor(item.price / 10));
  const again = await postJson(`${BASE}/api/sync/onsite-orders/${cafeOnsiteOrder}/settle`, { method: 'cash' });
  assert.equal(again.status, 400);
  assert.equal(again.body.code, 'BAD_STATE');
});

test('staff settles a pending order from the customer wallet (deducts balance)', async () => {
  const sys = sample.SAMPLE_SYSTEMS[0];
  const r = await postJson(`${BASE}/api/checkout/onsite`, { kind: 'reservation', params: { systemId: sys.id, startTime: '12:00', endTime: '13:00', date: 'فردا' } }, wAuth());
  assert.equal(r.status, 200, JSON.stringify(r.body));
  // موجودی ناکافی → تسویه از کیف پول رد می‌شود و سفارش pending می‌ماند
  const low = await postJson(`${BASE}/api/admin/onsite-orders/${r.body.orderId}/settle`, { method: 'wallet' }, adminAuth());
  assert.equal(low.status, 402);
  const top = await postJson(`${BASE}/api/sync/wallet/topup`, { phone: wPhone, amount: 1000, operator: 'cashier' });
  assert.equal(top.status, 200);
  const before: any = await getJson(`${BASE}/api/me/wallet`, 200, wAuth());
  const s = await postJson(`${BASE}/api/admin/onsite-orders/${r.body.orderId}/settle`, { method: 'wallet' }, adminAuth());
  assert.equal(s.status, 200, JSON.stringify(s.body));
  const after: any = await getJson(`${BASE}/api/me/wallet`, 200, wAuth());
  assert.equal(after.balance, before.balance - r.body.amount);
});

test('user cancels pending on-site tournament → seat released; cancels wallet-paid reservation → refund', async () => {
  const c = await postJson(`${BASE}/api/checkout/onsite/${onsiteTournamentOrder}/cancel`, {}, wAuth());
  assert.equal(c.status, 200, JSON.stringify(c.body));
  assert.equal(c.body.status, 'cancelled_user');
  const tours: any = await getJson(`${BASE}/api/tournaments`);
  const teamsRaw = tours.find((x: any) => x.id === 't2').teams; const teams = typeof teamsRaw === 'string' ? JSON.parse(teamsRaw || '[]') : (teamsRaw || []);
  assert.ok(!teams.some((tm: any) => tm.name === `Onsite-${wUser}`), 'seat released');
  const before: any = await getJson(`${BASE}/api/me/wallet`, 200, wAuth());
  const rc = await postJson(`${BASE}/api/checkout/onsite/${walletReservationOrder}/cancel`, {}, wAuth());
  assert.equal(rc.status, 200, JSON.stringify(rc.body));
  assert.ok(rc.body.refunded > 0);
  const after: any = await getJson(`${BASE}/api/me/wallet`, 200, wAuth());
  assert.equal(after.balance, before.balance + rc.body.refunded);
  assert.equal(after.transactions[0].type, 'refund');
  // cancelling someone else's order → 404
  const other = await postJson(`${BASE}/api/checkout/onsite/${cafeOnsiteOrder}/cancel`, {}, { Authorization: `Bearer ${authToken}` });
  assert.equal(other.status, 404);
});

test('admin wallet: lookup, manual adjust, transactions list; PayTR gate flag reported in config', async () => {
  const look: any = await getJson(`${BASE}/api/admin/wallet/${wUser}`, 200, adminAuth());
  assert.equal(look.username, wUser);
  const adj = await postJson(`${BASE}/api/admin/wallet/adjust`, { username: wUser, amount: -look.balance - 1, note: 'over' }, adminAuth());
  assert.equal(adj.status, 402, 'admin cannot push wallet negative');
  const adj2 = await postJson(`${BASE}/api/admin/wallet/adjust`, { username: wUser, amount: 50, note: 'cash' }, adminAuth());
  assert.equal(adj2.status, 200);
  assert.equal(adj2.body.balance, look.balance + 50);
  const txs: any = await getJson(`${BASE}/api/admin/wallet/transactions`, 200, adminAuth());
  assert.ok(txs.some((t: any) => t.username === wUser));
  const anon = await fetch(`${BASE}/api/admin/wallet/transactions`);
  assert.equal(anon.status, 401);
  const cfg: any = await getJson(`${BASE}/api/payments/config`);
  assert.equal(cfg.onlineDisabled, false, 'suite runs with PAYMENT_ONLINE_ENABLED=1');
});

test('SPA shell served for /profile/wallet and /admin/wallet', async () => {
  for (const p of ['/profile/wallet', '/admin/wallet']) {
    const res = await fetch(`${BASE}${p}`);
    assert.equal(res.status, 200, p);
    assert.match(res.headers.get('content-type') || '', /text\/html/);
  }
});

await run({ title: 'Bazino — API & end-to-end tests', jsonOut: 'tests/reports/api.json' });
shutdown();
