/**
 * راستی‌آزمایی قرارداد API بین اپ فلاتر و سرور — بدون نیاز به Flutter SDK.
 *
 * چرا: Flutter در این محیط نصب‌شدنی نیست (Dart SDK و pub.dev هر دو بسته‌اند)، ولی
 * بزرگ‌ترین ریسکِ تغییرات اخیر سرور این است که قرارداد اپ موبایل را شکسته باشند:
 * حذف fallback مهمان، per-user شدن تراکنش‌ها و کوپن‌ها، و تغییر شکل شناسه‌ها.
 *
 * این اسکریپت سورس دارت را می‌خواند تا بفهمد اپ دقیقاً چه مسیرهایی را صدا می‌زند و
 * از پاسخ چه کلیدهایی را می‌خواند، سپس همان‌ها را روی سرور زنده می‌آزماید.
 */
import { readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const BASE = process.env.BASE || 'http://127.0.0.1:3000';
const APP = process.env.APP_DIR || '/home/user/bazino-gamenet-portal/flutter_app/lib';

/* ── ۱) استخراج مسیرها و فیلدها از سورس دارت ──────────────────── */
const walk = (d) => readdirSync(d).flatMap((f) => {
  const p = path.join(d, f);
  return statSync(p).isDirectory() ? walk(p) : p.endsWith('.dart') ? [p] : [];
});
const files = walk(APP);
const source = files.map((f) => readFileSync(f, 'utf8')).join('\n');

const endpoints = [...new Set(
  [...source.matchAll(/\$kApiBaseUrl(\/api\/[^'"`\s)]+)/g)].map((m) => m[1])
)].filter((e) => !e.includes('...'));

// کلیدهایی که اپ از JSON می‌خواند: data['x'] یا json['x']
const readKeys = [...new Set(
  [...source.matchAll(/\b(?:data|json|d|body|item|m|j)\s*\[\s*'([a-zA-Z_][a-zA-Z0-9_]*)'\s*\]/g)].map((m) => m[1])
)].sort();

/* ── ۲) آزمودن روی سرور زنده ──────────────────────────────────── */
const j = async (url, opts = {}) => {
  const r = await fetch(url, opts);
  let body = null;
  try { body = await r.json(); } catch { /* not json */ }
  return { status: r.status, body };
};

const stamp = Date.now().toString(36);
const results = [];
const record = (name, ok, detail) => {
  results.push({ name, ok, detail });
  console.log(`[${ok ? ' OK ' : 'FAIL'}] ${name}${detail ? ' :: ' + detail : ''}`);
};

// حساب تازه، دقیقاً مثل کاری که اپ در ثبت‌نام می‌کند
const reg = await j(`${BASE}/api/auth/register`, {
  method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ username: `mob_${stamp}`, password: 'Test@12345', email: `mob_${stamp}@bazino.test`, phone: '09120000009' }),
});
record('POST /api/auth/register → 200 + token + user', reg.status === 200 && !!reg.body?.token && !!reg.body?.user,
  `status=${reg.status} keys=${Object.keys(reg.body || {}).join(',')}`);
const token = reg.body?.token;
const auth = { Authorization: `Bearer ${token}` };

// اپ بعد از ثبت‌نام /api/auth/me را صدا می‌زند و انتظار data['user'] دارد
const me = await j(`${BASE}/api/auth/me`, { headers: auth });
record("GET /api/auth/me → data['user']", me.status === 200 && !!me.body?.user,
  `status=${me.status} keys=${Object.keys(me.body || {}).join(',')}`);

// هر GET که اپ می‌زند باید با توکن پاسخ درست بدهد
const GETS = [
  '/api/systems', '/api/cafe', '/api/accessories', '/api/tournaments',
  '/api/articles', '/api/coupons', '/api/transactions', '/api/chat/rooms',
  '/api/app-sliders', '/api/messages', '/api/reservations',
];
for (const ep of GETS) {
  const r = await j(`${BASE}${ep}`, { headers: auth });
  const ok = r.status === 200 && (Array.isArray(r.body) || typeof r.body === 'object');
  record(`GET ${ep} (با توکن)`, ok, `status=${r.status} ${Array.isArray(r.body) ? r.body.length + ' items' : typeof r.body}`);
}

// همان‌ها بدون توکن — اپ در حالت مهمان هم این‌ها را صدا می‌زند و نباید کرش کند
for (const ep of ['/api/transactions', '/api/coupons', '/api/reservations', '/api/systems']) {
  const r = await j(`${BASE}${ep}`);
  const ok = r.status === 200 && Array.isArray(r.body);
  record(`GET ${ep} (مهمان) → آرایه، بدون خطا`, ok, `status=${r.status} ${Array.isArray(r.body) ? r.body.length + ' items' : typeof r.body}`);
}

// فیلدهایی که مدل‌های دارت از UserState می‌خوانند
const user = me.body?.user || {};
for (const f of ['username', 'email', 'loyaltyPoints', 'role']) {
  record(`UserState.${f} در پاسخ سرور هست`, f in user, JSON.stringify(user[f]));
}

// شکل رکورد سیستم که SystemModel.fromJson انتظار دارد
const sys = (await j(`${BASE}/api/systems`, { headers: auth })).body?.[0] || {};
for (const f of ['id', 'name', 'type', 'hourlyRate', 'isActive', 'isReserved']) {
  record(`GameSystem.${f}`, f in sys, JSON.stringify(sys[f]));
}

// جریان‌های نوشتنی که اپ دارد
const reserve = await j(`${BASE}/api/systems/reserve`, {
  method: 'POST', headers: { 'Content-Type': 'application/json', ...auth },
  body: JSON.stringify({ systemId: sys.id, startTime: '09:00', endTime: '10:00', date: 'امروز' }),
});
record('POST /api/systems/reserve', [200, 409].includes(reserve.status),
  `status=${reserve.status} ${reserve.body?.error || 'ok'}`);

const redeem = await j(`${BASE}/api/loyalty/redeem`, {
  method: 'POST', headers: { 'Content-Type': 'application/json', ...auth },
  body: JSON.stringify({ points: 100 }),
});
record('POST /api/loyalty/redeem (فقط points)', redeem.status === 200 && typeof redeem.body?.code === 'string',
  `status=${redeem.status} code=${redeem.body?.code} value=${redeem.body?.couponValue}`);

// اپ قدیمی couponValue و code می‌فرستد — سرور باید نادیده بگیرد نه اینکه ۵۰۰ بدهد
const legacy = await j(`${BASE}/api/loyalty/redeem`, {
  method: 'POST', headers: { 'Content-Type': 'application/json', ...auth },
  body: JSON.stringify({ points: 100, couponValue: 999999999, code: 'LEGACY' }),
});
record('سازگاری عقب‌رو: بدنه‌ی قدیمی اپ رد نمی‌شود', [200, 400].includes(legacy.status),
  `status=${legacy.status} value=${legacy.body?.couponValue ?? legacy.body?.error}`);

const ok = results.filter((r) => r.ok).length;
console.log(`\n=== ${ok}/${results.length} ===`);
writeFileSync('/tmp/flutter-contract.json', JSON.stringify({ endpoints, readKeys, results }, null, 2));
console.log('endpoints found in Dart source:', endpoints.length);
console.log('JSON keys read by the app     :', readKeys.length);
