/**
 * ═══════════════════════════════════════════════════════════════════════════
 * تست‌های پرووایدرهای دیتابیس (سوئیت ۳۵–۳۸)
 *
 * `SqliteStore` در tests/database.test.mts روی یک دیتابیس واقعی تست می‌شود.
 * برای `SqlServerStore` و `MongoStore` سرور واقعی در دسترس نیست، بنابراین:
 *
 *   ۱) هم‌ترازی قرارداد: هر سه کلاس باید همهٔ متدهای `IDataStore` را داشته
 *      باشند — این دقیقاً همان چیزی است که موقع افزودن یک قابلیت جدید فراموش
 *      می‌شود و فقط روی SQL Server/Mongo می‌شکند.
 *   ۲) درستی SQL: پارامترهای `@name` استفاده‌شده در هر کوئری باید با
 *      `.input()`های همان متد بخوانند و ستون‌ها/تعداد VALUES باید بخوانند.
 *   ۳) اجرای واقعی MongoStore روی یک درایور قلابی درون‌حافظه‌ای، تا منطقش
 *      (نه فقط شکلش) اجرا شود.
 *
 * این‌ها جای تست یکپارچگی با سرور واقعی را نمی‌گیرند، ولی همهٔ خطاهای
 * «فراموش‌شده/ناهماهنگ» را که بدون سرور قابل کشف‌اند می‌گیرند.
 * ═══════════════════════════════════════════════════════════════════════════
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Module from 'node:module';
import { suite, test, assert, run } from './harness.mts';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = readFileSync(path.join(ROOT, 'server/dataProviders.ts'), 'utf8');

/* ─── استخراج ساختار کلاس‌ها از سورس ──────────────────────────────────── */

interface ClassInfo { name: string; start: number; end: number; body: string; }

function extractClasses(src: string): ClassInfo[] {
  const out: ClassInfo[] = [];
  const re = /^(?:export )?class (\w+)/gm;
  let m: RegExpExecArray | null;
  const starts: Array<{ name: string; idx: number }> = [];
  while ((m = re.exec(src))) starts.push({ name: m[1], idx: m.index });
  for (let i = 0; i < starts.length; i++) {
    const start = starts[i].idx;
    const end = i + 1 < starts.length ? starts[i + 1].idx : src.length;
    out.push({ name: starts[i].name, start, end, body: src.slice(start, end) });
  }
  return out;
}

const classes = extractClasses(SRC);
const byName = (n: string) => classes.find(c => c.name === n)!;

/** نام متدهای سطح‌بالای یک کلاس. */
function methodsOf(body: string): Set<string> {
  const names = new Set<string>();
  for (const line of body.split('\n')) {
    const m = /^  (?:async )?([A-Za-z_]\w*)\s*[(<]/.exec(line);
    if (!m) continue;
    if (['constructor', 'if', 'for', 'while', 'switch', 'return', 'catch'].includes(m[1])) continue;
    names.add(m[1]);
  }
  return names;
}

/** متدهای اعلام‌شده در interface IDataStore. */
function interfaceMethods(src: string): Set<string> {
  const start = src.indexOf('interface IDataStore');
  assert.ok(start > -1, 'IDataStore interface not found');
  const body = src.slice(start, src.indexOf('\n}', start));
  const names = new Set<string>();
  for (const line of body.split('\n')) {
    const m = /^\s{2}([A-Za-z_]\w*)\s*\(/.exec(line);
    if (m) names.add(m[1]);
  }
  return names;
}

const IFACE = interfaceMethods(SRC);
const SQLITE = methodsOf(byName('SqliteStore').body);
const MSSQL = methodsOf(byName('SqlServerStore').body);
const MONGO = methodsOf(byName('MongoStore').body);

/* ═══════════════════════════════════════════════════════════════════════
   35. هم‌ترازی قرارداد بین سه پرووایدر
   ═══════════════════════════════════════════════════════════════════════ */
suite('35. Providers — interface parity');

test('IDataStore declares a meaningful number of methods', () => {
  assert.ok(IFACE.size > 50, `only ${IFACE.size} methods found on IDataStore`);
});

for (const [label, impl] of [['SqliteStore', SQLITE], ['SqlServerStore', MSSQL], ['MongoStore', MONGO]] as const) {
  test(`${label} implements every IDataStore method`, () => {
    const missing = [...IFACE].filter(m => !impl.has(m));
    assert.deepEqual(missing, [], `${label} is missing: ${missing.join(', ')}`);
  });
}

test('SqlServerStore and MongoStore expose the same surface as SqliteStore', () => {
  // فقط متدهای قراردادی مقایسه می‌شوند؛ هر کلاس می‌تواند helper خصوصی داشته باشد.
  const contract = [...IFACE];
  for (const [label, impl] of [['SqlServerStore', MSSQL], ['MongoStore', MONGO]] as const) {
    const missing = contract.filter(m => !impl.has(m));
    assert.deepEqual(missing, [], `${label} drifted from the contract: ${missing.join(', ')}`);
  }
});

test('the SQL providers name mobileImageUrl explicitly in their statements', () => {
  // رگرسیون: ستون mobileImageUrl قبلاً فقط در SQLite بود. پرووایدرهای SQL باید
  // ستون را صریح بنویسند؛ MongoStore سند را spread می‌کند و در سوئیت ۳۷ به‌صورت
  // رفتاری بررسی می‌شود (تست «articles keep their mobileImageUrl»).
  for (const cls of ['SqliteStore', 'SqlServerStore']) {
    const body = byName(cls).body;
    assert.ok(body.includes('mobileImageUrl'),
      `${cls} never mentions mobileImageUrl — mobile images would be dropped`);
  }
});

/* ═══════════════════════════════════════════════════════════════════════
   36. درستی SQL در SqlServerStore
   ═══════════════════════════════════════════════════════════════════════ */
suite('36. Providers — SQL Server query correctness');

/** متدهای SqlServerStore را به‌صورت متن جدا می‌کند. */
function splitMethods(body: string): Array<{ name: string; text: string }> {
  const lines = body.split('\n');
  const out: Array<{ name: string; text: string }> = [];
  let cur: { name: string; text: string } | null = null;
  for (const line of lines) {
    const m = /^  (?:async )?([A-Za-z_]\w*)\s*[(<]/.exec(line);
    if (m && !['constructor'].includes(m[1])) {
      if (cur) out.push(cur);
      cur = { name: m[1], text: line };
    } else if (cur) {
      cur.text += '\n' + line;
    }
  }
  if (cur) out.push(cur);
  return out;
}

const mssqlMethods = splitMethods(byName('SqlServerStore').body);

test('every @parameter used in a query is bound with .input()', () => {
  const problems: string[] = [];
  for (const { name, text } of mssqlMethods) {
    // فقط @paramهایی که داخل خودِ متن کوئری (بین backtick) هستند؛ ایمیل‌هایی
    // مثل admin@gamenet.com داخل رشته‌های عادی نباید پارامتر شمرده شوند.
    const used = new Set<string>();
    for (const q of text.matchAll(/`([^`]*)`/g)) {
      const body = q[1];
      if (!/SELECT|INSERT|UPDATE|DELETE|MERGE/i.test(body)) continue;
      for (const pm of body.matchAll(/(?<![\w.])@([a-zA-Z_]\w*)/g)) used.add(pm[1]);
    }
    const bound = new Set<string>();
    for (const b of text.matchAll(/\.input\('([^']+)'/g)) bound.add(b[1]);
    // @@ROWCOUNT و مشابه‌ها پارامتر نیستند
    for (const u of used) {
      if (/^(ROWCOUNT|IDENTITY|VERSION)$/i.test(u)) continue;
      if (!bound.has(u)) problems.push(`${name}: @${u} is never bound`);
    }
  }
  assert.deepEqual(problems, [], problems.join('\n'));
});

test('no bound .input() parameter is left unused', () => {
  const problems: string[] = [];
  for (const { name, text } of mssqlMethods) {
    const used = new Set<string>();
    for (const q of text.matchAll(/`([^`]*)`/g)) {
      if (!/SELECT|INSERT|UPDATE|DELETE|MERGE/i.test(q[1])) continue;
      for (const pm of q[1].matchAll(/(?<![\w.])@([a-zA-Z_]\w*)/g)) used.add(pm[1]);
    }
    for (const b of text.matchAll(/\.input\('([^']+)'/g)) {
      if (!used.has(b[1])) problems.push(`${name}: .input('${b[1]}') is bound but never used`);
    }
  }
  assert.deepEqual(problems, [], problems.join('\n'));
});

test('INSERT statements list as many VALUES as columns', () => {
  const problems: string[] = [];
  const insertRe = /INSERT INTO\s+[\w.\[\]]+\s*\(([^)]*)\)\s*VALUES\s*\(([^)]*)\)/gi;
  for (const { name, text } of mssqlMethods) {
    for (const m of text.matchAll(insertRe)) {
      const cols = m[1].split(',').map(s => s.trim()).filter(Boolean);
      const vals = m[2].split(',').map(s => s.trim()).filter(Boolean);
      if (cols.length !== vals.length) {
        problems.push(`${name}: ${cols.length} columns but ${vals.length} values`);
      }
    }
  }
  assert.deepEqual(problems, [], problems.join('\n'));
});

test('every SQL Server table reference is schema-qualified with dbo.', () => {
  const problems: string[] = [];
  // "UPDATE SET" only appears inside MERGE ... WHEN MATCHED THEN UPDATE SET
  const tableRe = /\b(?:FROM|INTO|UPDATE|JOIN)\s+(?!dbo\.)(?!@)(?!SET\b)([a-z_]\w*)/gi;
  for (const { name, text } of mssqlMethods) {
    // فقط داخل رشته‌های کوئری بررسی می‌شود
    for (const q of text.matchAll(/`([^`]*(?:SELECT|INSERT|UPDATE|DELETE)[^`]*)`/gi)) {
      for (const t of q[1].matchAll(tableRe)) {
        const tbl = t[1].toLowerCase();
        if (['master', 'sys'].includes(tbl)) continue;
        problems.push(`${name}: unqualified table "${t[1]}"`);
      }
    }
  }
  assert.deepEqual(problems, [], problems.join('\n'));
});

test('no SQL Server query interpolates a raw value into the statement', () => {
  const problems: string[] = [];
  for (const { name, text } of mssqlMethods) {
    for (const q of text.matchAll(/`([^`]*(?:SELECT|INSERT|UPDATE|DELETE)[^`]*)`/gi)) {
      const sql = q[1];
      // ${...} داخل متن کوئری یعنی مقدار مستقیم چسبانده شده (ریسک تزریق)
      for (const interp of sql.matchAll(/\$\{([^}]+)\}/g)) {
        const expr = interp[1].trim();
        // نام جدول/ستونِ ثابت از یک const داخلی مشکلی ندارد؛ فقط مقادیر ورودی مهم‌اند
        if (/^(this\.)?[A-Z_]+$/.test(expr)) continue;
        if (/dbName|tableName|column/i.test(expr)) continue;
        problems.push(`${name}: interpolates \${${expr}} into SQL`);
      }
    }
  }
  assert.deepEqual(problems, [], problems.join('\n'));
});

/* ═══════════════════════════════════════════════════════════════════════
   37. اجرای واقعی MongoStore روی درایور قلابی
   ═══════════════════════════════════════════════════════════════════════ */
suite('37. Providers — MongoStore against a fake driver');

/** یک پیاده‌سازی کوچک و درون‌حافظه‌ای از همان بخشی از API مونگو که کد استفاده می‌کند. */
function createFakeMongo() {
  const db = new Map<string, any[]>();
  const col = (name: string) => {
    if (!db.has(name)) db.set(name, []);
    return db.get(name)!;
  };
  const matches = (doc: any, q: any): boolean =>
    Object.entries(q ?? {}).every(([k, v]) => {
      if (k === '$and') return (v as any[]).every(sub => matches(doc, sub));
      if (k === '$or') return (v as any[]).some(sub => matches(doc, sub));
      if (v && typeof v === 'object' && '$regex' in (v as any)) {
        const rx = new RegExp((v as any).$regex, (v as any).$options ?? '');
        return rx.test(String(doc[k] ?? ''));
      }
      if (v && typeof v === 'object' && '$in' in (v as any)) return (v as any).$in.includes(doc[k]);
      if (v && typeof v === 'object' && '$gte' in (v as any)) return doc[k] >= (v as any).$gte;
      return doc[k] === v;
    });

  const collection = (name: string) => ({
    find(q: any = {}) {
      let rows = col(name).filter(d => matches(d, q));
      const cursor: any = {
        toArray: async () => rows.map(r => ({ ...r })),
        next: async () => (rows[0] ? { ...rows[0] } : null),
        sort: (spec: Record<string, 1 | -1>) => { const [[k, dir]] = Object.entries(spec); rows = [...rows].sort((a, b) => (a[k] > b[k] ? 1 : a[k] < b[k] ? -1 : 0) * (dir as number)); return cursor; },
        limit: (n: number) => { rows = rows.slice(0, n); return cursor; }, project: () => cursor,
      };
      return cursor;
    },
    findOne: async (q: any = {}) => {
      const hit = col(name).find(d => matches(d, q));
      return hit ? { ...hit } : null;
    },
    insertOne: async (doc: any) => { col(name).push({ ...doc }); return { insertedId: doc.id }; },
    insertMany: async (docs: any[]) => { for (const d of docs) col(name).push({ ...d }); return {}; },
    updateOne: async (q: any, update: any, opts: any = {}) => {
      const idx = col(name).findIndex(d => matches(d, q));
      if (idx === -1) {
        if (opts.upsert) { col(name).push({ ...q, ...(update.$set ?? {}) }); return { upsertedCount: 1 }; }
        return { matchedCount: 0, modifiedCount: 0 };
      }
      if (update.$set) Object.assign(col(name)[idx], update.$set);
      if (update.$inc) for (const [k, v] of Object.entries(update.$inc)) {
        col(name)[idx][k] = (col(name)[idx][k] ?? 0) + (v as number);
      }
      return { matchedCount: 1, modifiedCount: 1 };
    },
    deleteOne: async (q: any) => {
      const idx = col(name).findIndex(d => matches(d, q));
      if (idx > -1) col(name).splice(idx, 1);
      return { deletedCount: idx > -1 ? 1 : 0 };
    },
    deleteMany: async (q: any = {}) => {
      const before = col(name).length;
      db.set(name, col(name).filter(d => !matches(d, q)));
      return { deletedCount: before - col(name).length };
    },
    countDocuments: async (q: any = {}) => col(name).filter(d => matches(d, q)).length,
    createIndex: async () => 'idx',
    drop: async () => { db.delete(name); },
  });

  const fakeDb = { collection, listCollections: () => ({ toArray: async () => [...db.keys()].map(n => ({ name: n })) }) };
  class MongoClient {
    constructor(public uri: string) {}
    async connect() { return this; }
    db() { return fakeDb; }
    async close() {}
  }
  return { MongoClient, raw: db };
}

// درایور واقعی mongodb با نسخهٔ قلابی جایگزین می‌شود تا MongoStore بدون سرور اجرا شود.
const fake = createFakeMongo();
const requireFn = Module.createRequire(import.meta.url);
const origLoad = (Module as any)._load;
(Module as any)._load = function (request: string, parent: any, isMain: boolean) {
  if (request === 'mongodb') return { MongoClient: fake.MongoClient };
  return origLoad.apply(this, [request, parent, isMain]);
};

const { MongoStore } = await import('../server/dataProviders.ts');

let mongo: any;

test('MongoStore connects through the driver', async () => {
  mongo = new MongoStore();
  mongo.configure?.({ host: 'localhost', port: 27017, dbName: 'bazino_test' });
  const res = await mongo.connect();
  assert.equal(res.success, true, `connect failed: ${JSON.stringify(res)}`);
});

test('settings round-trip', async () => {
  await mongo.setSetting('activeThemeId', 'dark-gold');
  assert.equal(await mongo.getSetting('activeThemeId'), 'dark-gold');
  await mongo.setSetting('activeThemeId', 'geco-purple');
  assert.equal(await mongo.getSetting('activeThemeId'), 'geco-purple',
    'setSetting must overwrite rather than duplicate');
});

test('an unknown setting resolves to undefined/null', async () => {
  const v = await mongo.getSetting('nope-does-not-exist');
  assert.ok(v === undefined || v === null, `expected nothing, got ${JSON.stringify(v)}`);
});

test('articles keep their mobileImageUrl through the Mongo provider', async () => {
  await mongo.createArticle({
    id: 'm1', title: 'T', content: 'C', category: 'News',
    imageUrl: '/images/home/esports-480.webp',
    mobileImageUrl: '/images/home/esports-320.webp',
    author: 'A', date: 'today', comments: '[]',
  });
  const row = await mongo.getArticleById('m1');
  assert.equal(row.mobileImageUrl, '/images/home/esports-320.webp',
    'MongoStore dropped mobileImageUrl');
});

test('article comments can be updated', async () => {
  await mongo.setArticleComments('m1', JSON.stringify([{ id: 'c1', gamerTag: 'g', content: 'hi' }]));
  const row = await mongo.getArticleById('m1');
  assert.ok(row.comments.includes('gamerTag'), 'comments were not written');
});

test('counting and deleting articles works', async () => {
  assert.equal(await mongo.countArticles(), 1);
  await mongo.deleteArticle('m1');
  assert.equal(await mongo.countArticles(), 0);
});

test('a new Mongo user starts with the welcome balance and a hashed password', async () => {
  await mongo.createUser({ username: 'mongo_user', password: 'Passw0rd!', email: 'm@x.dev', phone: '0912' });
  const user = await mongo.getUserByUsername('mongo_user');
  assert.ok(user, 'user was not created');
  assert.equal(user.loyaltyPoints, 100, 'new users should start at 100 points');
  assert.ok(!('password' in user), 'the plaintext password must never be stored');
});

test('verifyLogin accepts the right password and rejects a wrong one', async () => {
  assert.ok(await mongo.verifyLogin('mongo_user', 'Passw0rd!'), 'correct password was rejected');
  assert.ok(!(await mongo.verifyLogin('mongo_user', 'wrong')), 'a wrong password was accepted');
});

test('loyalty points are incremented atomically', async () => {
  await mongo.addLoyaltyPointsToUser('mongo_user', 150);
  await mongo.addLoyaltyPointsToUser('mongo_user', -50);
  const user = await mongo.getUserByUsername('mongo_user');
  assert.equal(user.loyaltyPoints, 200, `expected 200 points, got ${user.loyaltyPoints}`);
});

test('users are looked up case-insensitively', async () => {
  const upper = await mongo.getUserByUsername('MONGO_USER');
  assert.ok(upper, 'a differently-cased username should still resolve');
});

test('Mongo: OTP rows are filtered by phone/ip + since and the latest active one wins', async () => {
  const now = Date.now();
  const mk = (id: string, phone: string, ip: string, ago: number, consumedAt = '') => ({ id, phone, codeHash: 'x$y', ip, purpose: 'login', createdAt: new Date(now - ago).toISOString(), expiresAt: new Date(now + 300000).toISOString(), attempts: 0, consumedAt });
  await mongo.createOtp(mk('o1', '+905000000001', '1.1.1.1', 90_000));
  await mongo.createOtp(mk('o2', '+905000000001', '1.1.1.1', 10_000));
  await mongo.createOtp(mk('o3', '+905000000002', '1.1.1.1', 5_000_000));
  await mongo.createOtp(mk('o4', '+905000000003', '2.2.2.2', 1_000));
  const since = new Date(now - 3_600_000).toISOString();
  assert.equal((await mongo.listRecentOtps({ phone: '+905000000001', since })).length, 2);
  assert.equal((await mongo.listRecentOtps({ ip: '1.1.1.1', since })).length, 2, 'the 83-minute-old row must be excluded');
  const latest = await mongo.getLatestActiveOtp('+905000000001', 'login');
  assert.equal(latest?.id, 'o2');
  await mongo.updateOtp('o2', { consumedAt: new Date().toISOString(), attempts: 3 });
  assert.equal((await mongo.getLatestActiveOtp('+905000000001', 'login'))?.id, 'o1');
});

test('Mongo: tickets + messages round-trip and countOpenTickets counts open/customer_reply only', async () => {
  const t = (id: string, status: string) => ({ id, username: 'u1', subject: 's', category: 'general', priority: 'normal', status, createdAt: '2026-01-01T00:00:00.000Z', updatedAt: `2026-01-0${id.slice(-1)}T00:00:00.000Z`, lastStaffReplyAt: '', userSeenAt: '' });
  await mongo.createTicket(t('t1', 'open')); await mongo.createTicket(t('t2', 'closed')); await mongo.createTicket(t('t3', 'customer_reply'));
  await mongo.addTicketMessage({ id: 'm1', ticketId: 't1', author: 'u1', isStaff: 0, body: 'hi', createdAt: '2026-01-01T00:00:01.000Z' });
  await mongo.addTicketMessage({ id: 'm2', ticketId: 't1', author: 'admin', isStaff: 1, body: 'hello', createdAt: '2026-01-01T00:00:02.000Z' });
  assert.equal(await mongo.countOpenTickets(), 2);
  assert.deepEqual((await mongo.listTicketsFor('u1')).map((x: any) => x.id), ['t3', 't2', 't1'], 'newest updatedAt first');
  assert.equal((await mongo.listTickets('closed')).length, 1);
  await mongo.updateTicket('t1', { status: 'answered', lastStaffReplyAt: 'now', bogus: 'ignored' } as any);
  const got = await mongo.getTicketById('t1');
  assert.equal(got.status, 'answered'); assert.equal(got.bogus, undefined);
  assert.deepEqual((await mongo.listTicketMessages('t1')).map((m: any) => m.id), ['m1', 'm2']);
});

test('Mongo: updateUserFields only touches whitelisted profile columns; getUserByPhone works', async () => {
  await mongo.createUser({ username: 'otpuser', password: 'p', email: '', phone: '+905000000009' });
  await mongo.updateUserFields('otpuser', { displayName: 'Ali', role: 'admin', loyaltyPoints: 99999 } as any);
  const u = await mongo.getUserByPhone('+905000000009');
  assert.equal(u.displayName, 'Ali');
  assert.notEqual(u.role, 'admin', 'role must not be editable through updateUserFields');
  assert.notEqual(u.loyaltyPoints, 99999);
});

test('Mongo: affiliate partner + click + commission round-trip', async () => {
  const now = new Date().toISOString();
  await mongo.createAffiliate({
    id: 'AFF-m', code: 'MONGO1', username: 'mongo_aff', name: 'M', type: 'gamer', language: 'tr',
    destination: '/', parentId: '', status: 'active', newPct: -1, returnPct: -1, tournamentPct: -1, overridePct: -1,
    notes: '', createdAt: now, updatedAt: now,
  });
  assert.equal((await mongo.getAffiliateByCode('MONGO1')).id, 'AFF-m');
  await mongo.createAffiliateClick({ id: 'CLK-m', code: 'MONGO1', path: '/', ipHash: 'h', uaHash: 'u', visitorId: 'v', createdAt: now });
  assert.equal(await mongo.countAffiliateClicks('MONGO1'), 1);
  await mongo.createAffiliateCommission({
    id: 'COM-m', affiliateId: 'AFF-m', code: 'MONGO1', username: 'buyer', orderId: 'WL-m', kind: 'reservation', eventType: 'new',
    netAmount: 50, ratePct: 10, commissionAmount: 5, status: 'pending', holdUntil: now, flag: '', walletTxId: '', parentCommissionId: '',
    createdAt: now, updatedAt: now, approvedAt: '', paidOutAt: '', reversedAt: '', note: '', attendedAt: '',
  });
  await mongo.updateAffiliateCommission('COM-m', { status: 'paid_out' });
  assert.equal((await mongo.getAffiliateCommissionById('COM-m')).status, 'paid_out');
});

/* ═══════════════════════════════════════════════════════════════════════
   38. یکنواختی طرح جدول‌ها بین پرووایدرها
   ═══════════════════════════════════════════════════════════════════════ */
suite('38. Providers — schema consistency');

test('the same tables/collections are used by every provider', () => {
  const sqliteTables = new Set(
    [...byName('SqliteStore').body.matchAll(/(?:FROM|INTO|UPDATE)\s+([a-z_]\w*)/gi)]
      .map(m => m[1].toLowerCase())
      .filter(t => !['set', 'values', 'select'].includes(t))
  );
  const mssqlTables = new Set(
    [...byName('SqlServerStore').body.matchAll(/dbo\.([a-z_]\w*)/gi)].map(m => m[1].toLowerCase())
  );
  const missing = [...sqliteTables].filter(t => !mssqlTables.has(t));
  assert.deepEqual(missing, [],
    `tables present in SQLite but never referenced in SQL Server: ${missing.join(', ')}`);
});

test('MongoStore addresses a collection for each SQLite table', () => {
  const sqliteTables = new Set(
    [...byName('SqliteStore').body.matchAll(/(?:FROM|INTO|UPDATE)\s+([a-z_]\w*)/gi)]
      .map(m => m[1].toLowerCase())
      .filter(t => !['set', 'values', 'select'].includes(t))
  );
  const mongoCols = new Set(
    [...byName('MongoStore').body.matchAll(/col\('([^']+)'\)/g)].map(m => m[1].toLowerCase())
  );
  const missing = [...sqliteTables].filter(t => !mongoCols.has(t));
  assert.deepEqual(missing, [],
    `tables with no matching Mongo collection: ${missing.join(', ')}`);
});

await run({ title: 'Bazino — database provider tests', jsonOut: 'tests/reports/providers.json' });
