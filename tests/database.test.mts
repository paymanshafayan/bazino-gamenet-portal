/**
 * Database suites — drive the REAL SqliteStore against a throwaway .sqlite3 file.
 *
 * This is not a mock: it instantiates the same provider class the server uses,
 * so schema, CRUD, seeding, inventory maths, coupon usage and the
 * mobileImageUrl migration are all verified against actual SQL.
 */
import { mkdtempSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { suite, test, skip, assert, run } from './harness.mts';

const providers = await import('../server/dataProviders.ts');
const sample = await import('../server/sampleData.ts');
const { SqliteStore } = providers as any;

// better-sqlite3 is a native module; if it could not be compiled in this
// environment we report the suites as skipped rather than failing the run.
let nativeOk = true;
let nativeError = '';
try {
  const require = (await import('node:module')).createRequire(import.meta.url);
  const Database = require('better-sqlite3');
  new Database(':memory:');
} catch (e: any) {
  nativeOk = false;
  nativeError = e?.message?.split('\n')[0] ?? String(e);
}

const workDir = mkdtempSync(path.join(tmpdir(), 'bazino-db-test-'));
const dbFile = path.join(workDir, 'test.sqlite3');
const cleanup: Array<() => void> = [() => rmSync(workDir, { recursive: true, force: true })];

/** A fresh store bound to its own file (so suites cannot interfere). */
async function freshStore(name = 'main'): Promise<any> {
  const store = new SqliteStore();
  store.config = { filePath: path.join(workDir, `${name}.sqlite3`) };
  await store.connect();
  await store.createDatabaseIfNotExist();
  return store;
}

/** Raw better-sqlite3 handle, for schema-level assertions. */
async function rawDb(file: string): Promise<any> {
  const require = (await import('node:module')).createRequire(import.meta.url);
  const Database = require('better-sqlite3');
  return new Database(file);
}

const columnsOf = (db: any, table: string): string[] =>
  db.prepare(`PRAGMA table_info(${table})`).all().map((r: any) => r.name);

if (!nativeOk) {
  suite('10. Database (SQLite)');
  skip('all database tests', `better-sqlite3 native binding unavailable: ${nativeError}`);
} else {

/* ═══════════════════════════════════════════════════════════════════════
   10. Connection & schema
   ═══════════════════════════════════════════════════════════════════════ */
suite('10. Database — connection & schema');

let store: any;

test('connects and creates the SQLite file', async () => {
  store = await freshStore('main');
  assert.equal(store.isConnected, true);
  assert.ok(existsSync(path.join(workDir, 'main.sqlite3')), 'db file was not created');
});

test('creates every expected table', async () => {
  const db = await rawDb(path.join(workDir, 'main.sqlite3'));
  const tables = db.prepare(`SELECT name FROM sqlite_master WHERE type='table'`).all().map((r: any) => r.name);
  for (const t of [
    'users', 'settings', 'chat_rooms', 'chat_messages', 'transactions', 'active_coupons',
    'systems', 'reservation_logs', 'cafe_items', 'cafe_orders', 'accessories',
    'shop_orders', 'tournaments', 'articles', 'user_messages', 'themes', 'app_sliders',
  ]) {
    assert.ok(tables.includes(t), `missing table: ${t}`);
  }
  db.close();
});

test('content tables carry the mobileImageUrl column', async () => {
  const db = await rawDb(path.join(workDir, 'main.sqlite3'));
  for (const t of ['cafe_items', 'accessories', 'articles', 'app_sliders']) {
    assert.ok(columnsOf(db, t).includes('mobileImageUrl'), `${t} lacks mobileImageUrl`);
  }
  db.close();
});

test('createDatabaseIfNotExist is idempotent', async () => {
  const res = await store.createDatabaseIfNotExist();
  assert.equal(res.success, true);
});

/* ═══════════════════════════════════════════════════════════════════════
   11. Legacy migration
   ═══════════════════════════════════════════════════════════════════════ */
suite('11. Database — legacy migration');

test('a pre-mobileImageUrl database is migrated on boot, preserving rows', async () => {
  const legacyFile = path.join(workDir, 'legacy.sqlite3');
  const db = await rawDb(legacyFile);
  // Recreate the OLD schema (no mobileImageUrl anywhere).
  db.exec(`
    CREATE TABLE cafe_items (id TEXT PRIMARY KEY, name TEXT, category TEXT, price REAL, imageUrl TEXT, inventory INTEGER, isAvailable INTEGER DEFAULT 1);
    CREATE TABLE accessories (id TEXT PRIMARY KEY, name TEXT, description TEXT, price REAL, imageUrl TEXT, stock INTEGER, category TEXT);
    CREATE TABLE articles (id TEXT PRIMARY KEY, title TEXT, content TEXT, category TEXT, imageUrl TEXT, author TEXT, date TEXT, comments TEXT);
    CREATE TABLE app_sliders (id TEXT PRIMARY KEY, imageUrl TEXT, target TEXT, titleFa TEXT, titleEn TEXT, titleRu TEXT, titleTr TEXT);
  `);
  db.prepare(`INSERT INTO articles (id,title,content,category,imageUrl,author,date,comments) VALUES (?,?,?,?,?,?,?,?)`)
    .run('art-legacy', 'Legacy', 'body', 'News', '/images/home/esports-480.webp', 'A', 'd', '[]');
  db.close();

  const legacyStore = new SqliteStore();
  legacyStore.config = { filePath: legacyFile };
  await legacyStore.connect();
  await legacyStore.createDatabaseIfNotExist();   // must ALTER, not just CREATE IF NOT EXISTS

  const check = await rawDb(legacyFile);
  for (const t of ['cafe_items', 'accessories', 'articles', 'app_sliders']) {
    assert.ok(columnsOf(check, t).includes('mobileImageUrl'), `${t} was not migrated`);
  }
  const row = check.prepare(`SELECT * FROM articles WHERE id='art-legacy'`).get() as any;
  assert.equal(row.title, 'Legacy', 'existing row was damaged');
  assert.equal(row.mobileImageUrl, null, 'new column should default to NULL');
  check.close();
});

test('migration is idempotent across repeated boots', async () => {
  const legacyFile = path.join(workDir, 'legacy.sqlite3');
  for (let i = 0; i < 3; i++) {
    const s = new SqliteStore();
    s.config = { filePath: legacyFile };
    await s.connect();
    await s.createDatabaseIfNotExist();
  }
  const db = await rawDb(legacyFile);
  const mobileCols = columnsOf(db, 'articles').filter(c => c === 'mobileImageUrl');
  assert.equal(mobileCols.length, 1, 'column was added more than once');
  db.close();
});

/* ═══════════════════════════════════════════════════════════════════════
   12. CRUD round-trips (incl. mobileImageUrl persistence)
   ═══════════════════════════════════════════════════════════════════════ */
suite('12. Database — CRUD round-trips');

test('cafe item: create → read → update → delete', async () => {
  await store.createCafeItem({
    id: 'test-c1', name: 'Test Pizza', category: 'Foods', price: 95000,
    imageUrl: '/images/home/cafe-480.webp', mobileImageUrl: '/images/home/cafe-320.webp',
    inventory: 10, isAvailable: true,
  });
  let item = await store.getCafeItemById('test-c1');
  assert.equal(item.name, 'Test Pizza');
  assert.equal(item.mobileImageUrl, '/images/home/cafe-320.webp', 'mobileImageUrl did not persist');
  assert.equal(item.isAvailable, true, 'boolean should round-trip as true');

  await store.updateCafeItem('test-c1', { price: 99000, mobileImageUrl: '/images/home/cafe-200.webp' });
  item = await store.getCafeItemById('test-c1');
  assert.equal(item.price, 99000);
  assert.equal(item.mobileImageUrl, '/images/home/cafe-200.webp');

  await store.deleteCafeItem('test-c1');
  assert.equal(await store.getCafeItemById('test-c1'), undefined);
});

test('accessory: create → read → update → delete', async () => {
  await store.createAccessory({
    id: 'test-a1', name: 'Test Kbd', description: 'd', price: 1200000,
    imageUrl: '/images/home/gear-shop-480.webp', mobileImageUrl: '/images/home/gear-shop-320.webp',
    stock: 5, category: 'Keyboard',
  });
  let acc = await store.getAccessoryById('test-a1');
  assert.equal(acc.mobileImageUrl, '/images/home/gear-shop-320.webp');

  await store.updateAccessory('test-a1', { stock: 3 });
  acc = await store.getAccessoryById('test-a1');
  assert.equal(acc.stock, 3);

  await store.deleteAccessory('test-a1');
  assert.equal(await store.getAccessoryById('test-a1'), undefined);
});

test('article: create → read → comment → delete', async () => {
  await store.createArticle({
    id: 'test-art', title: 'T', content: 'C', category: 'Hardware',
    imageUrl: '/images/home/hardware-pc-800.webp', mobileImageUrl: '/images/home/hardware-pc-400.webp',
    author: 'A', date: 'today', comments: '[]',
  });
  let art = await store.getArticleById('test-art');
  assert.equal(art.mobileImageUrl, '/images/home/hardware-pc-400.webp');

  await store.setArticleComments('test-art', JSON.stringify([{ id: 'c1', gamerTag: 'x', content: 'hi' }]));
  art = await store.getArticleById('test-art');
  assert.equal(JSON.parse(art.comments).length, 1);

  await store.deleteArticle('test-art');
  assert.equal(await store.getArticleById('test-art'), undefined);
});

test('slider: create → read → update → delete (mobileImageUrl persists)', async () => {
  await store.createSlider({
    id: 'test-s1', imageUrl: '/images/home/esports-480.webp',
    mobileImageUrl: '/images/home/esports-320.webp',
    target: 'reserve', titleFa: 'فا', titleEn: 'En', titleRu: 'Ru', titleTr: 'Tr',
  });
  let slide = await store.getSliderById('test-s1');
  assert.equal(slide.mobileImageUrl, '/images/home/esports-320.webp', 'slider mobileImageUrl did not persist');

  await store.updateSlider('test-s1', { mobileImageUrl: '/images/home/cafe-320.webp', target: 'cafe' });
  slide = await store.getSliderById('test-s1');
  assert.equal(slide.mobileImageUrl, '/images/home/cafe-320.webp');
  assert.equal(slide.target, 'cafe');

  await store.deleteSlider('test-s1');
  assert.equal(await store.getSliderById('test-s1'), undefined);
});

test('rows without a mobile variant insert cleanly as NULL', async () => {
  await store.createSlider({
    id: 'test-s2', imageUrl: '/images/home/esports-480.webp',
    target: 'shop', titleFa: '', titleEn: '', titleRu: '', titleTr: '',
  } as any);
  const slide = await store.getSliderById('test-s2');
  assert.equal(slide.mobileImageUrl, null);
  await store.deleteSlider('test-s2');
});

/* ═══════════════════════════════════════════════════════════════════════
   13. Users, auth hashing, loyalty
   ═══════════════════════════════════════════════════════════════════════ */
suite('13. Database — users & loyalty');

test('createUser stores a bcrypt hash, never the plaintext', async () => {
  await store.createUser({ username: 'tester', password: 'secret123', email: 't@e.com', phone: '0' });
  const user = await store.getUserByUsername('tester');
  assert.ok(user, 'user not created');
  assert.notEqual(user.passwordHash, 'secret123', 'password stored in plaintext!');
  assert.match(user.passwordHash, /^\$2[aby]\$/, 'not a bcrypt hash');
});

test('verifyLogin accepts the right password and rejects the wrong one', async () => {
  assert.ok(await store.verifyLogin('tester', 'secret123'), 'correct password rejected');
  assert.equal(await store.verifyLogin('tester', 'wrong'), undefined, 'wrong password accepted');
  assert.equal(await store.verifyLogin('ghost', 'secret123'), undefined, 'unknown user accepted');
});

test('username lookup is case-insensitive', async () => {
  assert.ok(await store.getUserByUsername('TESTER'), 'case-insensitive lookup failed');
});

test('loyalty points can be added and subtracted', async () => {
  const before = (await store.getUserByUsername('tester')).loyaltyPoints;
  await store.addLoyaltyPointsToUser('tester', 250);
  assert.equal((await store.getUserByUsername('tester')).loyaltyPoints, before + 250);
  await store.addLoyaltyPointsToUser('tester', -100);
  assert.equal((await store.getUserByUsername('tester')).loyaltyPoints, before + 150);
});

/* ═══════════════════════════════════════════════════════════════════════
   14. Inventory & coupons
   ═══════════════════════════════════════════════════════════════════════ */
suite('14. Database — inventory & coupons');

test('cafe inventory decrements and never goes negative', async () => {
  await store.createCafeItem({
    id: 'inv-1', name: 'X', category: 'Foods', price: 1000,
    imageUrl: '/images/home/cafe-480.webp', inventory: 5, isAvailable: true,
  });
  await store.decrementCafeInventory('inv-1', 3);
  assert.equal((await store.getCafeItemById('inv-1')).inventory, 2);
  await store.decrementCafeInventory('inv-1', 99);   // over-draw
  assert.equal((await store.getCafeItemById('inv-1')).inventory, 0, 'inventory went negative');
  await store.deleteCafeItem('inv-1');
});

test('accessory stock decrements and clamps at zero', async () => {
  await store.createAccessory({
    id: 'inv-2', name: 'Y', description: '', price: 1000,
    imageUrl: '/images/home/gear-shop-480.webp', stock: 2, category: 'Mouse',
  });
  await store.decrementAccessoryStock('inv-2', 10);
  assert.equal((await store.getAccessoryById('inv-2')).stock, 0, 'stock went negative');
  await store.deleteAccessory('inv-2');
});

test('coupon usage increments and deactivates at the cap', async () => {
  await store.createCoupon({
    code: 'TESTCODE', type: 'Percent', value: 10, minOrder: 0,
    expiry: 'x', expiryDate: new Date(Date.now() + 86400000).toISOString(),
    maxUsageCount: 2, usageCount: 0, isActive: true,
  });
  await store.recordCouponUsage('TESTCODE');
  let c = await store.getCouponByCode('TESTCODE');
  assert.equal(c.usageCount, 1);
  assert.equal(!!c.isActive, true, 'deactivated too early');

  await store.recordCouponUsage('TESTCODE');
  c = await store.getCouponByCode('TESTCODE');
  assert.equal(c.usageCount, 2);
  assert.equal(!!c.isActive, false, 'should deactivate once the cap is reached');
});

/* ═══════════════════════════════════════════════════════════════════════
   15. Reservations & overlap rule
   ═══════════════════════════════════════════════════════════════════════ */
suite('15. Database — reservations');

test('overlap detection matches the booking business rule', async () => {
  await store.addReservationLog({
    id: 'res-1', systemId: 's1', username: 'tester', systemName: 'PC 1',
    startTime: '12:00', endTime: '14:00', totalPrice: 50000,
    date: 'today', checkedIn: false, timestamp: new Date().toISOString(),
  });
  // Overlapping windows must be rejected …
  assert.equal(await store.hasOverlappingReservation('s1', 'today', '13:00', '15:00'), true, 'partial overlap missed');
  assert.equal(await store.hasOverlappingReservation('s1', 'today', '11:00', '13:00'), true, 'leading overlap missed');
  assert.equal(await store.hasOverlappingReservation('s1', 'today', '12:30', '13:30'), true, 'contained overlap missed');
  // … while adjacent / different system / different day are fine.
  assert.equal(await store.hasOverlappingReservation('s1', 'today', '14:00', '16:00'), false, 'adjacent booking blocked');
  assert.equal(await store.hasOverlappingReservation('s1', 'today', '09:00', '11:00'), false, 'earlier slot blocked');
  assert.equal(await store.hasOverlappingReservation('s2', 'today', '12:00', '14:00'), false, 'other system blocked');
  assert.equal(await store.hasOverlappingReservation('s1', 'tomorrow', '12:00', '14:00'), false, 'other date blocked');
});

test('active reservation lookup ignores checked-in bookings', async () => {
  assert.ok(await store.getActiveReservationForUser('tester'), 'active reservation not found');
  await store.setReservationCheckedIn('res-1');
  assert.equal(await store.getActiveReservationForUser('tester'), undefined, 'checked-in booking still active');
});

test('extendReservation moves the end time and adds to the price', async () => {
  await store.addReservationLog({
    id: 'res-2', systemId: 's3', username: 'tester', systemName: 'PC 3',
    startTime: '10:00', endTime: '11:00', totalPrice: 25000,
    date: 'today', checkedIn: false, timestamp: new Date().toISOString(),
  });
  await store.extendReservation('res-2', '13:00', 50000);
  const r = await store.getReservationLogById('res-2');
  assert.equal(r.endTime, '13:00');
  assert.equal(r.totalPrice, 75000);
});

/* ═══════════════════════════════════════════════════════════════════════
   16. Settings & seeding
   ═══════════════════════════════════════════════════════════════════════ */
suite('16. Database — settings & seeding');

test('settings round-trip and overwrite', async () => {
  await store.setSetting('unit_test_key', 'v1');
  assert.equal(await store.getSetting('unit_test_key'), 'v1');
  await store.setSetting('unit_test_key', 'v2');
  assert.equal(await store.getSetting('unit_test_key'), 'v2', 'setting did not overwrite');
});

test('an unknown setting resolves to a falsy value rather than throwing', async () => {
  const v = await store.getSetting('definitely_missing_key');
  assert.ok(v === undefined || v === null || v === '', `unexpected value: ${JSON.stringify(v)}`);
});

test('seedSampleData populates every content table with the sample rows', async () => {
  const seeded = await freshStore('seeded');
  await seeded.seedSampleData({ username: 'admin', password: 'admin', email: 'a@b.c', phone: '' });
  assert.equal(await seeded.countCafeItems(), sample.SAMPLE_CAFE_ITEMS.length, 'cafe items');
  assert.equal(await seeded.countAccessories(), sample.SAMPLE_ACCESSORIES.length, 'accessories');
  assert.equal(await seeded.countArticles(), sample.SAMPLE_ARTICLES.length, 'articles');
  assert.equal(await seeded.countTournaments(), sample.SAMPLE_TOURNAMENTS.length, 'tournaments');
});

test('seeded sliders keep their mobileImageUrl end-to-end', async () => {
  const seeded = await freshStore('seeded');
  const sliders = await seeded.listSliders();
  assert.ok(sliders.length > 0, 'no sliders seeded');
  for (const s of sliders) {
    assert.ok(s.mobileImageUrl, `slider ${s.id} lost its mobileImageUrl through the DB`);
    assert.ok(String(s.mobileImageUrl).endsWith('.webp'), `slider ${s.id} mobile variant is not webp`);
  }
});

test('seeded articles keep their mobileImageUrl (incl. hardware-pc)', async () => {
  const seeded = await freshStore('seeded');
  const articles = await seeded.listArticles();
  for (const a of articles) {
    assert.ok(a.mobileImageUrl, `article ${a.id} lost its mobileImageUrl`);
  }
  const art2 = articles.find((a: any) => a.id === 'art-2');
  assert.equal(art2.imageUrl, '/images/home/hardware-pc-800.webp');
  assert.equal(art2.mobileImageUrl, '/images/home/hardware-pc-400.webp');
});

}

await run({ title: 'Bazino — Database (real SQLite) tests', jsonOut: 'tests/reports/database.json' });
for (const fn of cleanup) fn();
