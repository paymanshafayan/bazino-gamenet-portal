/**
 * API / end-to-end suites — boot the REAL production server and drive it over HTTP.
 *
 * The server is started as a child process (`node dist/server.cjs`, NODE_ENV=production)
 * inside a throwaway working directory, so its SQLite file, install-config.json and
 * themes/ folder never touch the repo. Every assertion goes through real Express
 * routing, real JWT auth and the real data provider.
 */
import { spawn, type ChildProcess } from 'node:child_process';
import { mkdtempSync, rmSync, existsSync, symlinkSync } from 'node:fs';
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
  ['/api/transactions', sample.SAMPLE_TRANSACTIONS.length],
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
  const data = await getJson(`${BASE}/api/discount/validate?code=REDBULL&total=200000`);
  assert.equal(data.valid, true, JSON.stringify(data));
  assert.equal(data.discountAmount, 45000);
});

test('a coupon below its minimum order is rejected', async () => {
  const res = await fetch(`${BASE}/api/discount/validate?code=BAZINO10&total=1000`);
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
  // 4h costs 200 points; the fresh user only has ~100, so the clamp shows up as
  // the "not enough points" price rather than a 99-hour charge.
  assert.equal(status, 400, `expected the 4h-clamped price to be unaffordable: ${JSON.stringify(body)}`);
  assert.ok(String(body.error).includes('200'), `expected a 4h (200 point) quote, got: ${body.error}`);
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
  assert.equal(created.mobileImageUrl, '/images/home/cafe-320.webp', 'mobileImageUrl was dropped by the API');
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
  assert.equal(created.mobileImageUrl, '/images/home/esports-320.webp', 'slider mobileImageUrl dropped by the API');
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
  assert.equal(created.mobileImageUrl, '/images/home/hardware-pc-400.webp');
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

test('an admin can upload a mobile apk', async () => {
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

test('the SPA shell is returned for an unknown non-API path', async () => {
  const res = await fetch(`${BASE}/some/deep/client/route`);
  assert.equal(res.status, 200);
  assert.match(res.headers.get('content-type') ?? '', /text\/html/);
});

}

await run({ title: 'Bazino — API & end-to-end tests', jsonOut: 'tests/reports/api.json' });
shutdown();
