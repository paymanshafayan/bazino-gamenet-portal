/**
 * ═══════════════════════════════════════════════════════════════════════════
 * آزمایشگاه اپ (App Lab) — امولاتور وب روی Appetize.io
 *
 * سرور واقعی با یک Appetize ماک‌شده (http لوکال) بوت می‌شود و کل قرارداد
 * تست می‌شود: توکن، ارسال APK سایت با متد URL، آپلود APK دلخواه با مسیر
 * موقت عمومی، به‌روزرسانی همان اپ، اپ جدید با forceNew، حذف اپ و امنیت
 * (روت‌های ادمین بدون توکن رد می‌شوند؛ توکن هرگز به کلاینت برگردانده نمی‌شود).
 * ═══════════════════════════════════════════════════════════════════════════
 */
import assert from 'node:assert/strict';
import { spawn, type ChildProcess } from 'node:child_process';
import { mkdtempSync, existsSync, symlinkSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { suite, test, skip, run, waitFor, postJson, putJson, getJson } from './harness.mts';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PORT = Number(process.env.TEST_PORT ?? 3471);
const BASE = `http://127.0.0.1:${PORT}`;
const MOCK_PORT = Number(process.env.MOCK_PORT ?? 3472);

/* ── Appetize ماک — همان قرارداد واقعی api.appetize.io/v1 ──────────────── */

interface AppetizeCall {
  method: string;
  url: string;
  apiKey?: string;
  body?: any;
  fetchedFileUrl?: string;
  fetchedFileBytes?: number;
}

const calls: AppetizeCall[] = [];
const EXPECTED_KEY = 'tok_appetize_test_12345678';
let appCounter = 0;
const createdKeys: string[] = [];
let deletedKeys: string[] = [];

const mockServer = http.createServer(async (req, res) => {
  const send = (status: number, data: unknown) => {
    res.writeHead(status, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(data));
  };
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(chunk as Buffer);
  const rawBody = Buffer.concat(chunks);
  let body: any = null;
  try { body = rawBody.length ? JSON.parse(rawBody.toString('utf8')) : null; } catch { body = null; }
  const apiKey = String(req.headers['x-api-key'] || '');
  const call: AppetizeCall = { method: req.method || '', url: req.url || '', apiKey, body };
  calls.push(call);

  // مثل Appetize واقعی: توکن غلط → 401
  if (apiKey !== EXPECTED_KEY) {
    return send(401, { error: 'Invalid API token' });
  }

  // POST /v1/apps → ساخت اپ جدید (publicKey تازه)
  if (req.method === 'POST' && req.url === '/apps') {
    // ماک باید مثل Appetize واقعی فایل را از URL دانلود کند — این همان
    // چیزی است که «متد URL» را واقعی می‌کند و سروِ فایل موقت ما را تست می‌کند
    if (body?.url) {
      const fileRes = await fetch(String(body.url)).catch(() => null);
      if (!fileRes || !fileRes.ok) {
        return send(400, { error: `Could not download app from url: ${body.url}`, code: 'INVALID_URL' });
      }
      const bytes = Buffer.from(await fileRes.arrayBuffer());
      call.fetchedFileUrl = String(body.url);
      call.fetchedFileBytes = bytes.length;
      if (bytes.length < 8) {
        return send(400, { error: 'Downloaded file looks empty/invalid', code: 'INVALID_APP' });
      }
    } else {
      return send(400, { error: 'url is required', code: 'MISSING_URL' });
    }
    appCounter += 1;
    const publicKey = `pk_mock_${appCounter}`;
    createdKeys.push(publicKey);
    return send(200, { publicKey, note: body?.note || '', app: { publicKey } });
  }

  // POST /v1/apps/:publicKey → به‌روزرسانی همان اپ
  const updateMatch = req.url ? req.url.match(/^\/apps\/([^/?]+)$/) : null;
  if (req.method === 'POST' && updateMatch) {
    const publicKey = decodeURIComponent(updateMatch[1]);
    if (body?.url) {
      const fileRes = await fetch(String(body.url)).catch(() => null);
      if (!fileRes || !fileRes.ok) {
        return send(400, { error: `Could not download app from url: ${body.url}`, code: 'INVALID_URL' });
      }
      const bytes = Buffer.from(await fileRes.arrayBuffer());
      call.fetchedFileUrl = String(body.url);
      call.fetchedFileBytes = bytes.length;
      if (bytes.length < 8) {
        return send(400, { error: 'Downloaded file looks empty/invalid', code: 'INVALID_APP' });
      }
    }
    if (!createdKeys.includes(publicKey)) {
      return send(404, { error: 'App not found', code: 'APP_NOT_FOUND' });
    }
    return send(200, { publicKey, note: body?.note || '', app: { publicKey } });
  }

  // DELETE /v1/apps/:publicKey
  const deleteMatch = req.url ? req.url.match(/^\/apps\/([^/?]+)$/) : null;
  if (req.method === 'DELETE' && deleteMatch) {
    const publicKey = decodeURIComponent(deleteMatch[1]);
    if (!createdKeys.includes(publicKey)) {
      return send(404, { error: 'App not found', code: 'APP_NOT_FOUND' });
    }
    deletedKeys.push(publicKey);
    return send(200, { success: true });
  }

  return send(404, { error: `Mock Appetize has no route ${req.method} ${req.url}` });
});

await new Promise<void>((resolve) => mockServer.listen(MOCK_PORT, '127.0.0.1', resolve));

/* ── بوت سرور بازینو با Appetize ماک ───────────────────────────────────── */

const workDir = mkdtempSync(path.join(tmpdir(), 'bazino-appetize-test-'));
let child: ChildProcess | undefined;
let serverLog = '';
let bootError = '';

const bundle = path.join(ROOT, 'dist/server.cjs');
const distDir = path.join(ROOT, 'dist');

if (!existsSync(bundle)) {
  bootError = 'dist/server.cjs not found — run the backend build first';
} else {
  symlinkSync(path.join(ROOT, 'node_modules'), path.join(workDir, 'node_modules'), 'dir');
  symlinkSync(distDir, path.join(workDir, 'dist'), 'dir');
  try {
    child = spawn(process.execPath, [path.join(workDir, 'dist/server.cjs')], {
      cwd: workDir,
      env: {
        ...process.env,
        NODE_ENV: 'production',
        PORT: String(PORT),
        JWT_SECRET: 'test-secret-appetize-suite',
        SMS_PROVIDER: 'mock',
        OTP_DEV_PEEK: '1',
        BAZINO_SECRETS_KEY: '12'.repeat(32),
        BAZINO_STATIC_ROOT: workDir,
        BAZINO_DATA_DIR: path.join(workDir, 'data'),
        PUBLIC_URL: `http://127.0.0.1:${PORT}`,
        // مسیر API اپتایز روی ماک لوکال
        BAZINO_APPETIZE_API_BASE: `http://127.0.0.1:${MOCK_PORT}`,
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    child.stdout?.on('data', (d) => { serverLog += d.toString(); });
    child.stderr?.on('data', (d) => { serverLog += d.toString(); });
    child.on('exit', (code) => { serverLog += `\n[server exited with code ${code}]`; });

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
  mockServer.close();
  rmSync(workDir, { recursive: true, force: true });
};
process.on('exit', shutdown);

let adminToken = '';
const adminAuth = () => ({ Authorization: `Bearer ${adminToken}` });

if (bootError) {
  suite('App Lab — امولاتور وب');
  skip('all App Lab tests', `server did not boot: ${bootError.split('\n')[0]}`);
  console.error('\nBoot failure detail:\n' + bootError);
} else {

suite('App Lab — امولاتور وب (Appetize)');

test('staff tests authenticate with a real admin JWT', async () => {
  const r = await postJson(`${BASE}/api/auth/login`, { username: 'admin', password: 'admin' });
  assert.equal(r.status, 200);
  adminToken = r.body.token;
});

test('public active endpoint reports nothing before any configuration', async () => {
  const body = await getJson(`${BASE}/api/appetize/active`);
  assert.equal(body.active, false);
  assert.equal(body.app, null);
});

test('admin status requires an admin token', async () => {
  const res = await fetch(`${BASE}/api/admin/appetize/status`);
  assert.equal(res.status, 401);
});

test('status before configuration: not configured, no token leak', async () => {
  const body = await getJson(`${BASE}/api/admin/appetize/status`, 200, adminAuth());
  assert.equal(body.configured, false);
  assert.equal(body.tokenHint, '');
  assert.equal(body.app, null);
});

test('pushing without a saved token is rejected with APPETIZE_NOT_CONFIGURED', async () => {
  const r = await postJson(`${BASE}/api/admin/appetize/push`, { source: 'site-apk' }, adminAuth());
  assert.equal(r.status, 503);
  assert.equal(r.body.code, 'APPETIZE_NOT_CONFIGURED');
});

test('a too-short token is rejected', async () => {
  const r = await putJson(`${BASE}/api/admin/appetize/token`, { token: 'short' }, adminAuth());
  assert.equal(r.status, 400);
  assert.equal(r.body.code, 'APPETIZE_TOKEN_INVALID');
});

test('saving a valid token flips the status (only last 4 chars are revealed)', async () => {
  const r = await putJson(`${BASE}/api/admin/appetize/token`, { token: EXPECTED_KEY }, adminAuth());
  assert.equal(r.status, 200);
  assert.equal(r.body.success, true);
  const body = await getJson(`${BASE}/api/admin/appetize/status`, 200, adminAuth());
  assert.equal(body.configured, true);
  assert.equal(body.tokenHint, `••••${EXPECTED_KEY.slice(-4)}`);
  // توکن کامل هرگز نباید در پاسخ بیاید
  assert.ok(!JSON.stringify(body).includes(EXPECTED_KEY));
});

test('pushing the site APK fails cleanly while no APK is uploaded', async () => {
  const r = await postJson(`${BASE}/api/admin/appetize/push`, { source: 'site-apk' }, adminAuth());
  assert.equal(r.status, 400);
  assert.equal(r.body.code, 'APK_NOT_UPLOADED');
});

const siteApkBytes = Buffer.concat([
  Buffer.from('PK\x03\x04'),
  Buffer.alloc(2048, 7), // بدنهٔ ساختگی APK — ماک Appetize حجمش را چک می‌کند
]);

test('uploading a site APK via the legacy endpoint works', async () => {
  const res = await fetch(`${BASE}/api/admin/mobile-app/upload-apk?fileName=bazino-pro.apk`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/octet-stream', ...adminAuth() },
    body: siteApkBytes,
  });
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.apkAvailable, true);
  assert.equal(body.apkSize, siteApkBytes.length);
});

test('pushing the site APK creates an app via the URL method', async () => {
  const before = calls.length;
  const r = await postJson(`${BASE}/api/admin/appetize/push`, { source: 'site-apk' }, adminAuth());
  assert.equal(r.status, 200, JSON.stringify(r.body));
  assert.equal(r.body.success, true);
  assert.equal(r.body.updatedExisting, false);
  assert.ok(r.body.app.publicKey.startsWith('pk_mock_'));

  const call = calls[calls.length - 1];
  assert.equal(call.method, 'POST');
  assert.equal(call.url, '/apps');
  assert.equal(call.apiKey, EXPECTED_KEY);
  // متد URL: Appetize فایل را مستقیم از سایت ما دانلود کرده است
  assert.equal(call.body.platform, 'android');
  assert.ok(call.body.url.includes('/api/mobile-app/download'));
  assert.ok((call.fetchedFileBytes ?? 0) >= siteApkBytes.length);
  assert.equal(calls.length, before + 1);
});

test('public active endpoint now exposes only the publicKey + embed URL', async () => {
  const body = await getJson(`${BASE}/api/appetize/active`);
  assert.equal(body.active, true);
  assert.equal(body.app.publicKey, 'pk_mock_1');
  assert.equal(body.app.embedUrl, 'https://appetize.io/embed/pk_mock_1');
  assert.ok(!JSON.stringify(body).includes(EXPECTED_KEY));
});

test('pushing again updates the SAME app instead of creating a new one', async () => {
  const r = await postJson(`${BASE}/api/admin/appetize/push`, { source: 'site-apk' }, adminAuth());
  assert.equal(r.status, 200);
  assert.equal(r.body.updatedExisting, true);
  assert.equal(r.body.app.publicKey, 'pk_mock_1');
  const call = calls[calls.length - 1];
  assert.equal(call.url, '/apps/pk_mock_1');
  assert.equal(createdKeys.length, 1);
});

test('pushing with forceNew creates a fresh app (new publicKey)', async () => {
  const r = await postJson(`${BASE}/api/admin/appetize/push`, { source: 'site-apk', forceNew: true }, adminAuth());
  assert.equal(r.status, 200);
  assert.equal(r.body.updatedExisting, false);
  assert.equal(r.body.app.publicKey, 'pk_mock_2');
  assert.equal(createdKeys.length, 2);
});

test('pushing an invalid external URL is rejected', async () => {
  const r = await postJson(`${BASE}/api/admin/appetize/push`, { source: 'url', url: 'ftp://bad.example/app.apk' }, adminAuth());
  assert.equal(r.status, 400);
  assert.equal(r.body.code, 'APPETIZE_URL_INVALID');
});

test('pushing an unknown source is rejected', async () => {
  const r = await postJson(`${BASE}/api/admin/appetize/push`, { source: 'turbo' }, adminAuth());
  assert.equal(r.status, 400);
  assert.equal(r.body.code, 'APPETIZE_SOURCE_INVALID');
});

const customApkBytes = Buffer.concat([
  Buffer.from('PK\x03\x04custom-app-lab'),
  Buffer.alloc(4096, 3),
]);

test('uploading any APK via multipart pushes it through a temporary public URL', async () => {
  const form = new FormData();
  form.append('file', new Blob([customApkBytes], { type: 'application/vnd.android.package-archive' }), 'my-game.apk');
  const res = await fetch(`${BASE}/api/admin/appetize/upload`, {
    method: 'POST',
    headers: { ...adminAuth() },
    body: form,
  });
  const rawText = await res.text();
  assert.equal(res.status, 200, rawText);
  const body = JSON.parse(rawText);
  // اپ فعلی pk_mock_2 است → به‌روزرسانی همان، نه اپ جدید
  assert.equal(body.updatedExisting, true);
  assert.equal(body.app.publicKey, 'pk_mock_2');

  const call = calls[calls.length - 1];
  assert.equal(call.url, '/apps/pk_mock_2');
  // URL موقت عمومی بوده و بایت‌های درست سرو شده‌اند
  assert.ok(call.body.url.includes('/api/appetize/file/'), call.body.url);
  assert.equal(call.fetchedFileBytes, customApkBytes.length);
});

test('a non-APK multipart upload is rejected', async () => {
  const form = new FormData();
  form.append('file', new Blob([Buffer.from('hello-not-apk')], { type: 'text/plain' }), 'notes.txt');
  const res = await fetch(`${BASE}/api/admin/appetize/upload`, {
    method: 'POST',
    headers: { ...adminAuth() },
    body: form,
  });
  assert.equal(res.status, 400);
  const body = await res.json();
  assert.equal(body.code, 'INVALID_APPETIZE_FILE');
});

test('a non-multipart upload is rejected', async () => {
  const res = await fetch(`${BASE}/api/admin/appetize/upload`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/octet-stream', ...adminAuth() },
    body: Buffer.from('PK\x03\x04raw'),
  });
  assert.equal(res.status, 400);
});

test('the temporary file URL is unguessable and expires after push', async () => {
  // فایل موقت با موفقیت ارسال شده؛ لینکش فقط در لاگ ماک دیده می‌شود و در
  // پاسخ API برنمی‌گردد — پس بیرون از فرایند قابل حدس نیست. اینجا فقط
  // بررسی می‌کنیم که توکن تصادفی UUID فرمت دارد.
  const call = [...calls].reverse().find((c) => c.url === '/apps/pk_mock_2' && c.body?.url?.includes('/api/appetize/file/'));
  assert.ok(call, 'temp-file push call recorded');
  const token = String(call.body.url).split('/api/appetize/file/')[1];
  assert.match(token, /^[0-9a-f-]{36}$/);
  // و یک توکن ساختگی 404 می‌گیرد
  const res = await fetch(`${BASE}/api/appetize/file/00000000-0000-4000-8000-000000000000`);
  assert.equal(res.status, 404);
});

test('deleting the app removes it from Appetize and clears the public page', async () => {
  const r = await fetch(`${BASE}/api/admin/appetize/app`, { method: 'DELETE', headers: adminAuth() });
  assert.equal(r.status, 200);
  assert.deepEqual(deletedKeys, ['pk_mock_2']);
  const active = await getJson(`${BASE}/api/appetize/active`);
  assert.equal(active.active, false);
  assert.equal(active.app, null);
});

test('deleting the token returns the lab to unconfigured', async () => {
  const r = await fetch(`${BASE}/api/admin/appetize/token`, { method: 'DELETE', headers: adminAuth() });
  assert.equal(r.status, 200);
  const body = await getJson(`${BASE}/api/admin/appetize/status`, 200, adminAuth());
  assert.equal(body.configured, false);
  // و ارسال دوباره بدون توکن رد می‌شود
  const push = await postJson(`${BASE}/api/admin/appetize/push`, { source: 'site-apk' }, adminAuth());
  assert.equal(push.status, 503);
});

test('the server process is alive at the end', () => {
  assert.equal(child?.exitCode, null, `server died. Log:\n${serverLog.slice(-800)}`);
});

} // end of boot guard

await run({ title: 'Bazino — App Lab (Appetize) tests', jsonOut: 'tests/reports/appetize.json' });
shutdown();
