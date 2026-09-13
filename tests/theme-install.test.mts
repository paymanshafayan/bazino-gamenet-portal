/**
 * THEME INSTALL (202 job) — end-to-end با ZIP واقعی قالب bazino-arena3d
 *
 * این suite همان حادثهٔ ۵۲۴ (۲۰۲۶-۰۹-۱۲) را پوشش می‌دهد: قالب پر-asset
 * (۳۹۴ فریم WebP + ۷ تصویر + manifest ≈ ۱۰.۶MB) که قبلاً یا با 524
 * می‌مرد یا با بنِ هوک رد می‌شد، حالا باید:
 *   - با 202 + jobId پذیرفته شود،
 *   - در background کامل شود و همهٔ assetها بایت‌به‌بایت سالم نصب شوند،
 *   - قالب فعال قبلی حین نصب سروِ خودش را ادامه دهد،
 *   - خطاهای واقعی (خرابی ZIP، zip-slip، zip-bomb، theme.json مفقود) سریع
 *     و با کد درست رد شوند،
 *   - ری‌استارت سرور وسط job → failed واضح + پاک‌سازی staging.
 *
 * ZIP واقعی از سه منبع پیدا می‌شود (به‌ترتیب):
 *   1) env BAZINO_THEME_TEST_ZIP (مسیر محلی)
 *   2) git clone --depth 1 از ریپوی قالب → pack فایل‌ها بدون هیچ تغییری
 *   3) اگر هیچ‌کدام ممکن نبود → تست‌ها skip می‌شوند (نه سبزِ دروغین).
 */
import { spawn, spawnSync, type ChildProcess, execSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, existsSync, symlinkSync, readdirSync, statSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { suite, test, skip, assert, run, waitFor } from './harness.mts';
import { unzipSync, zipSync, strFromU8 } from 'fflate';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PORT = Number(process.env.THEME_TEST_PORT ?? 3479);
const BASE = `http://127.0.0.1:${PORT}`;

/* ── ۰) تهیهٔ ZIP واقعی قالب ─────────────────────────────────────────────── */

const THEME_REPO = 'https://github.com/paymanshafayan/bazino-arena-landing.git';
const THEME_PACKAGE_SUBDIR = 'bazino-arena3d-package';
const THEME_ID = 'bazino-arena3d';

function locateRealThemeZip(): { bytes: Buffer; note: string } | { bytes: null; note: string } {
  // ۱) مسیر صریح از env
  const envPath = process.env.BAZINO_THEME_TEST_ZIP;
  if (envPath && existsSync(envPath)) {
    return { bytes: readFileSync(envPath), note: `env BAZINO_THEME_TEST_ZIP → ${envPath}` };
  }
  // ۲) ZIP کش‌شدهٔ قبلی
  const cached = '/tmp/bazino-arena3d.zip';
  if (existsSync(cached)) {
    return { bytes: readFileSync(cached), note: `cached ${cached}` };
  }
  // ۳) clone ریپوی قالب و pack مجددِ «فایل‌های دست‌نخورده» (بدون هیچ تغییری)
  try {
    const dir = mkdtempSync(path.join(tmpdir(), 'bazino-theme-src-'));
    execSync(`git clone --depth 1 ${THEME_REPO} ${JSON.stringify(dir)}`, { timeout: 120_000, stdio: 'pipe' });
    const pkg = path.join(dir, THEME_PACKAGE_SUBDIR);
    if (!existsSync(path.join(pkg, 'theme.json'))) return { bytes: null, note: `repo has no ${THEME_PACKAGE_SUBDIR}/theme.json` };
    const entries = walkFiles(pkg);
    const files: Record<string, Uint8Array> = {};
    for (const rel of entries) files[rel] = new Uint8Array(readFileSync(path.join(pkg, rel)));
    const zipped = zipSync(files);
    return { bytes: Buffer.from(zipped), note: `git clone → ${entries.length} entries repacked byte-for-byte` };
  } catch (e: any) {
    return { bytes: null, note: `clone failed: ${String(e?.message || e).slice(0, 200)}` };
  }
}

function walkFiles(dir: string, base = dir): string[] {
  const out: string[] = [];
  for (const d of readdirSync(dir, { withFileTypes: true })) {
    if (d.name === '.git') continue;
    const full = path.join(dir, d.name);
    if (d.isDirectory()) out.push(...walkFiles(full, base));
    else out.push(path.relative(base, full).split(path.sep).join('/'));
  }
  return out;
}

const fixture = locateRealThemeZip();
console.log(`[theme-install] fixture: ${fixture.note} (${fixture.bytes ? (fixture.bytes.length / 1024 / 1024).toFixed(2) + 'MB' : 'unavailable'})`);

/* ── boot سرور واقعی (الگوی api.test.mts) ───────────────────────────────── */

const workDir = mkdtempSync(path.join(tmpdir(), 'bazino-theme-install-test-'));
let child: ChildProcess | undefined;
const spawned: ChildProcess[] = []; // همهٔ سرورها — exit handler همه را می‌کشد (یتیم نمی‌ماند)
let serverLog = '';
let allServerLog = ''; // لاگ همهٔ bootها برای evidence
let bootError = '';
let installDelayMs = 0; // فقط تستِ restart آن را ست می‌کند

const bundle = path.join(ROOT, 'dist/server.cjs');
const distDir = path.join(ROOT, 'dist');

/** پورت واقعاً آزاد شده باشد (بعد از kill، قبل از bind جدید) */
async function waitForPortFree(label: string): Promise<void> {
  await waitFor(async () => {
    const res = await fetch(`${BASE}/api/systems`).catch(() => null);
    return !res; // هر پاسخی یعنی هنوز کسی روی پورت است
  }, 10_000, 100, `${label} — port ${PORT} to be released`);
}

async function startServer(): Promise<void> {
  await waitForPortFree('pre-spawn');
  child = spawn(process.execPath, [path.join(workDir, 'dist/server.cjs')], {
    cwd: workDir,
    env: {
      ...process.env,
      NODE_ENV: 'production',
      PORT: String(PORT),
      JWT_SECRET: 'test-secret-for-theme-install-suite',
      MANUS_API_KEY: '',
      BAZINO_SECRETS_KEY: '12'.repeat(32),
      BAZINO_STATIC_ROOT: workDir,
      BAZINO_DATA_DIR: path.join(workDir, 'data'),
      BAZINO_TEST_INSTALL_DELAY_MS: String(installDelayMs),
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  spawned.push(child);
  child.stdout?.on('data', (d) => { const s = d.toString(); serverLog += s; allServerLog += s; });
  child.stderr?.on('data', (d) => { const s = d.toString(); serverLog += s; allServerLog += s; });
  child.on('exit', (code, signal) => { serverLog += `\n[server exited code=${code} signal=${signal}]`; });
}

if (!existsSync(bundle)) {
  bootError = 'dist/server.cjs not found — run the backend build first';
} else {
  symlinkSync(path.join(ROOT, 'node_modules'), path.join(workDir, 'node_modules'), 'dir');
  symlinkSync(distDir, path.join(workDir, 'dist'), 'dir');
  try {
    await startServer();
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

/** پروسهٔ کشته‌شده با signal: exitCode=null و signalCode ست می‌شود (رفتار Node) */
const exited = (c?: ChildProcess) => !!c && (c.exitCode !== null || c.signalCode !== null);

const killAll = () => { for (const c of spawned) if (!exited(c)) c.kill('SIGKILL'); };
process.on('exit', () => {
  killAll();
  rmSync(workDir, { recursive: true, force: true });
});

/* ── helpers ─────────────────────────────────────────────────────────────── */

let adminToken = '';
async function loginAdmin(): Promise<void> {
  const res = await fetch(`${BASE}/api/auth/login`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'admin', password: 'admin' }),
  });
  assert.equal(res.status, 200, 'admin login failed');
  adminToken = (await res.json()).token;
}
const adminHeaders = () => ({ Authorization: `Bearer ${adminToken}` });

async function postInstallZip(zip: Buffer | Uint8Array, query = ''): Promise<{ status: number; body: any }> {
  const res = await fetch(`${BASE}/api/admin/themes/install${query}`, {
    method: 'POST',
    headers: { ...adminHeaders(), 'Content-Type': 'application/zip' },
    body: zip as any,
  });
  const text = await res.text();
  let body: any = null;
  try { body = JSON.parse(text); } catch { body = { raw: text.slice(0, 200) }; }
  return { status: res.status, body };
}

async function getJob(jobId: string): Promise<{ status: number; body: any }> {
  const res = await fetch(`${BASE}/api/admin/themes/install-jobs/${jobId}`, { headers: adminHeaders() });
  const text = await res.text();
  let body: any = null;
  try { body = JSON.parse(text); } catch { body = { raw: text.slice(0, 200) }; }
  return { status: res.status, body };
}

/** poll تا وضعیت نهایی؛ در هر iteration پاسخ اختیاری callback هم چک می‌شود */
async function pollJob(jobId: string, timeoutMs = 120_000, onPoll?: (job: any) => Promise<void>): Promise<any> {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    const { status, body } = await getJob(jobId);
    assert.equal(status, 200, `status endpoint failed for ${jobId}: ${JSON.stringify(body).slice(0, 200)}`);
    assert.ok(body.success !== false, `status body not success: ${JSON.stringify(body).slice(0, 300)}`);
    if (onPoll) await onPoll(body);
    if (body.status === 'completed' || body.status === 'failed') return body;
    if (Date.now() > deadline) throw new Error(`job ${jobId} did not finish in ${timeoutMs}ms — last: ${JSON.stringify(body).slice(0, 300)}`);
    await new Promise((r) => setTimeout(r, 120));
  }
}

/* ── اجرا ────────────────────────────────────────────────────────────────── */

if (bootError) {
  suite('T. Theme install (202)');
  skip('all theme-install tests', `server did not boot: ${bootError.split('\n')[0]}`);
  console.error('\nBoot failure detail:\n' + bootError);
  await run({ title: 'theme-install', jsonOut: 'tests/reports/theme-install.json' });
  process.exit(1);
} else if (!fixture.bytes) {
  suite('T. Theme install (202)');
  skip('all real-ZIP theme-install tests', `real theme ZIP unavailable: ${fixture.note}`);
  console.error('\nReal ZIP unavailable — tests skipped (not faked green).');
  if (child && !exited(child)) child.kill('SIGTERM');
  await run({ title: 'theme-install', jsonOut: 'tests/reports/theme-install.json' });
  process.exit(0);
} else {

const zipBytes = fixture.bytes;

suite('T. Theme install (202) — async job pipeline');

await test('admin authenticates for the theme endpoints', loginAdmin);

/* ═══ ۱. پذیرش ZIP واقعی پر-asset با 202 ═══ */
let firstJobId = '';
test('1. real 10.6MB/405-entry ZIP is accepted instantly with 202 + jobId (no more 524)', async () => {
  const { status, body } = await postInstallZip(zipBytes);
  assert.equal(status, 202, `expected 202, got ${status}: ${JSON.stringify(body).slice(0, 300)}`);
  assert.ok(body.jobId, 'response must include jobId');
  assert.equal(body.status, 'processing');
  assert.equal(body.themeId, THEME_ID);
  assert.ok(body.pollUrl?.includes(body.jobId), 'response must include pollUrl');
  // پیش از پایان، وضعیت اولیه باید یکی از فازهای معتبر باشد
  const job = await getJob(body.jobId);
  assert.equal(job.status, 200);
  assert.ok(['queued', 'validating', 'extracting', 'installing', 'completed'].includes(job.body.status), `unexpected early status: ${job.body.status}`);
  firstJobId = body.jobId;
});

/* ═══ ۲. تکمیل job + سلامت بایت‌به‌بایت همهٔ فایل‌ها ═══ */
test('2. job completes; every file is byte-identical to the ZIP (no recompress/resize)', async () => {
  // همان job تست ۱ را تا پایان poll می‌کنیم (job تکراری ناسازیم — تصادم swap)
  assert.ok(firstJobId, 'test 1 must have created the job');
  const job = await pollJob(firstJobId);
  assert.equal(job.status, 'completed', `job failed: ${job.error}`);
  assert.equal(job.theme.id, THEME_ID);
  assert.ok(job.theme.assetFiles.length >= 400, `expected 400+ assets, got ${job.theme.assetFiles.length}`);
  assert.ok(job.progress.filesTotal >= 400);
  assert.equal(job.progress.filesDone, job.progress.filesTotal, 'progress must be complete');

  // مقایسهٔ بایت‌به‌بایت همهٔ فایل‌ها با ZIP اصلی.
  // استثنای مستند: بهینه‌سازی استاندارد موتور (رفتار همیشگی برای همهٔ قالب‌ها)
  // jpgهای پورتال-منو را به WebP تبدیل می‌کند — فریم‌های video-sequence
  // (موضوع الزام «بدون هیچ تغییری») WebP هستند و باید بایت‌به‌بایت بمانند.
  const expected = unzipSync(new Uint8Array(zipBytes));
  const zipKeys = Object.keys(expected);
  const themeDir = path.join(workDir, 'data', 'themes', THEME_ID);
  assert.ok(existsSync(themeDir), 'theme dir must exist');
  const onDisk = walkFiles(themeDir);
  let convertedCount = 0;
  // موتور نصب theme.json را نرمال‌شده بازنویسی می‌کند و theme.css را برای
  // بازنویسی مسیر assets — این‌ها معنایی چک می‌شوند؛ assetها بایت‌به‌بایت.
  for (const rel of onDisk) {
    const disk = readFileSync(path.join(themeDir, rel));
    if (rel === 'theme.json' || rel === 'theme.css' || rel === 'theme.js') continue;
    assert.ok(rel.startsWith('assets/'), `unexpected non-asset file ${rel}`);
    const zipKey = zipKeys.find((k) => k === rel || k.endsWith('/' + rel));
    if (zipKey) {
      assert.equal(disk.length, expected[zipKey].length, `size mismatch for ${rel}`);
      assert.ok(disk.equals(Buffer.from(expected[zipKey])), `content mismatch for ${rel} — assets must stay untouched`);
      continue;
    }
    // فقط تبدیل استاندارد jpg→webp قابل قبول است
    assert.ok(!rel.startsWith('assets/video-sequence/'), `frame ${rel} must be byte-identical to the ZIP`);
    assert.ok(/\.webp$/.test(rel), `unexpected new file ${rel}`);
    const srcJpg = zipKeys.find((k) => k.replace(/\.jpe?g$/i, '.webp') === rel);
    assert.ok(srcJpg, `converted file ${rel} has no jpg counterpart in the ZIP`);
    convertedCount += 1;
  }
  // theme.json نرمال‌شده: هویت/متادیتای اصلی حفظ شده باشد
  const diskMeta = JSON.parse(readFileSync(path.join(themeDir, 'theme.json'), 'utf8'));
  const srcMetaKey = zipKeys.find((k) => /(^|\/)theme\.json$/.test(k))!;
  const srcMeta = JSON.parse(Buffer.from(expected[srcMetaKey]).toString('utf8'));
  assert.equal(diskMeta.id, srcMeta.id);
  assert.equal(diskMeta.name, srcMeta.name);
  assert.equal(diskMeta.version, srcMeta.version);
  assert.ok(JSON.stringify(diskMeta.strings) === JSON.stringify(srcMeta.strings), 'localized strings must survive normalization');
  assert.ok((diskMeta.assetFiles ?? []).length >= 400 || onDisk.filter(f => f.startsWith('assets/')).length >= 400, 'asset inventory must be complete');
  // theme.css غیرخالی
  assert.ok(readFileSync(path.join(themeDir, 'theme.css'), 'utf8').length > 0, 'theme.css must exist and be non-empty');
  // فریم‌ها و manifest دقیقاً همان تعداد — بایت‌به‌بایت بالا چک شد
  const frames = onDisk.filter((f) => f.startsWith('assets/video-sequence/') && f.endsWith('.webp'));
  assert.equal(frames.length, 394, `expected 394 frames, got ${frames.length}`);
  assert.ok(onDisk.includes('assets/video-sequence/manifest.json'), 'manifest.json must be installed');
  assert.equal(convertedCount, 7, `expected exactly 7 jpg→webp portal-menu conversions, got ${convertedCount}`);
});

/* ═══ ۳. سرو عمومی قالب نصب‌شده ═══ */
test('3. installed theme serves theme.css/theme.js/assets publicly with correct bytes+mime', async () => {
  const css = await fetch(`${BASE}/api/themes/${THEME_ID}/theme.css`);
  assert.equal(css.status, 200);
  assert.match(css.headers.get('content-type')!, /text\/css/);
  const js = await fetch(`${BASE}/api/themes/${THEME_ID}/theme.js`);
  assert.equal(js.status, 200, 'theme.js must now be served (hook ban was a false positive)');
  const jsText = await js.text();
  assert.match(jsText, /BazinoThemeSDK/, 'served theme.js must reference the SDK');
  assert.match(jsText, /apiVersion\s*:\s*2/, 'served theme.js must use apiVersion 2');

  const expected = unzipSync(new Uint8Array(zipBytes));
  const frameKey = Object.keys(expected).find((k) => k.includes('frame-0001.webp'))!;
  const frame = await fetch(`${BASE}/api/themes/${THEME_ID}/assets/video-sequence/frame-0001.webp`);
  assert.equal(frame.status, 200);
  assert.equal(frame.headers.get('content-type'), 'image/webp');
  const frameBytes = Buffer.from(await frame.arrayBuffer());
  assert.ok(frameBytes.equals(Buffer.from(expected[frameKey])), 'served frame must be byte-identical to ZIP');
});

/* ═══ ۴. نصب مجدد بدون replace → 409 همان لحظه (قبل از ساخت job) ═══ */
test('4. reinstall without replace is rejected 409 THEME_EXISTS before any job is created', async () => {
  const { status, body } = await postInstallZip(zipBytes);
  assert.equal(status, 409, `expected 409, got ${status}`);
  assert.equal(body.code, 'THEME_EXISTS_ID');
});

/* ═══ ۵. نصب با replace=1 → completed با replaced=true ═══ */
test('5. reinstall with replace=1 completes and reports replaced=true', async () => {
  const { status, body } = await postInstallZip(zipBytes, '?replace=1');
  assert.equal(status, 202);
  const job = await pollJob(body.jobId);
  assert.equal(job.status, 'completed', `job failed: ${job.error}`);
  assert.equal(job.replaced, true);
  assert.equal(job.theme.id, THEME_ID);
});

/* ═══ ۶. jobId نامعتبر → 404 ═══ */
test('6. status endpoint returns 404 for unknown jobId', async () => {
  const { status } = await getJob('theme-install-does-not-exist-9999');
  assert.equal(status, 404);
});

/* ═══ ۷. ZIP خراب → 400 با invalid-zip ═══ */
test('7. corrupt ZIP is rejected 400 invalid-zip by fast preflight', async () => {
  const junk = Buffer.alloc(64 * 1024, 7);
  junk.write('PK\u0003\u0004', 0, 'binary'); // header قالب ZIP ولی بدنه خراب
  const { status, body } = await postInstallZip(junk);
  assert.equal(status, 400, `expected 400, got ${status}: ${JSON.stringify(body).slice(0, 200)}`);
  assert.equal(body.code, 'invalid-zip');
});

/* ═══ ۸. zip-slip → رد امنیتی ═══ */
test('8. zip-slip entry (../../) is rejected by preflight security check', async () => {
  const evil = zipSync({ '../../evil.txt': strToU8('pwned'), 'theme.css': strToU8('body{color:red}') , 'theme.json': strToU8(JSON.stringify({ id: 'evil-slip', version: '1.0.0', name: 'evil' })) });
  const { status, body } = await postInstallZip(Buffer.from(evil));
  assert.equal(status, 400, `zip-slip must be rejected, got ${status}: ${JSON.stringify(body).slice(0, 200)}`);
  assert.equal(body.code, 'unsafe-entry');
  // هیچ فایلی بیرون themes نباید نوشته شود
  assert.ok(!existsSync(path.join(workDir, 'evil.txt')));
  assert.ok(!existsSync(path.join(workDir, 'data', 'evil.txt')));
});

/* ═══ ۹. ZIP bomb (compression ratio) → 400 zip-bomb-ratio ═══ */
test('9. high-ratio ZIP bomb is rejected 400 zip-bomb-ratio', async () => {
  // ۲۰MB صفر از ~۲۰KB ZIP → نسبت ~۱۰۰۰× — قالب واقعی (WebPها نسبت≈۱) هرگز این‌طور نیست
  const bomb = zipSync({ 'theme.css': strToU8('body{color:red}'), 'theme.json': strToU8(JSON.stringify({ id: 'bomb-theme', version: '1.0.0', name: 'bomb' })), 'assets/big.bin': new Uint8Array(20 * 1024 * 1024) });
  const { status, body } = await postInstallZip(Buffer.from(bomb));
  assert.equal(status, 400, `expected 400, got ${status}`);
  assert.equal(body.code, 'zip-bomb-ratio', `expected zip-bomb-ratio, got ${JSON.stringify(body).slice(0, 200)}`);
});

/* ═══ ۱۰. بدون theme.json → 400 no-meta ═══ */
test('10. ZIP without theme.json is rejected 400 no-meta', async () => {
  const noMeta = zipSync({ 'theme.css': strToU8('body{color:red}') });
  const { status, body } = await postInstallZip(Buffer.from(noMeta));
  assert.equal(status, 400);
  assert.equal(body.code, 'no-meta');
});

/* ═══ ۱۱. قالب فعال قبلی حین نصب سرو می‌ماند + activate=0 فعال را عوض نمی‌کند ═══ */
test('11. active theme keeps serving during a background install (atomic swap)', async () => {
  // یک قالب سبک نصب و فعال می‌کنیم
  const { buildSampleThemeZip } = await import('../src/themes/themeZipCore.ts');
  const light = buildSampleThemeZip();
  const { status: s1, body: b1 } = await postInstallZip(Buffer.from(light));
  assert.ok(s1 === 200 || s1 === 202, `light theme install failed: ${s1} ${JSON.stringify(b1).slice(0, 200)}`);
  if (s1 === 202) {
    const done = await pollJob(b1.jobId);
    assert.equal(done.status, 'completed', `light theme job failed: ${done.error}`);
  }
  // فعالش کنیم
  const act = await fetch(`${BASE}/api/admin/themes/activate`, {
    method: 'POST', headers: { ...adminHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ themeId: 'neon-storm' }),
  });
  assert.ok(act.status === 200, `activate failed: ${act.status}`);

  // نصب ZIP بزرگ با replace=1 و activate=0؛ حین هر فاز، CSS قالب فعال باید 200 بماند
  const before = await fetch(`${BASE}/api/themes/neon-storm/theme.css`);
  const beforeBody = await before.text();
  assert.equal(before.status, 200);

  const { status: s2, body: b2 } = await postInstallZip(zipBytes, '?replace=1&activate=0');
  assert.equal(s2, 202);
  const job = await pollJob(b2.jobId, 120_000, async (mid) => {
    const css = await fetch(`${BASE}/api/themes/neon-storm/theme.css`);
    assert.equal(css.status, 200, `active theme css broke during status=${mid.status}`);
    const text = await css.text();
    assert.equal(text, beforeBody, 'active theme css must be untouched mid-install');
  });
  assert.equal(job.status, 'completed', `job failed: ${job.error}`);
  // activate=0 → قالب فعال همان neon-storm می‌ماند
  const themes = await (await fetch(`${BASE}/api/sync/themes`, { headers: adminHeaders() })).json();
  assert.equal(themes.activeThemeId, 'neon-storm', 'activate=0 must not change the active theme');
});

/* ═══ ۱۲. سازگاری قبلی: ?async=0 همان مسیر sync قدیمی ═══ */
test('12. legacy ?async=0 keeps the old synchronous response shape (200)', async () => {
  const { buildSampleThemeZip } = await import('../src/themes/themeZipCore.ts');
  const light = buildSampleThemeZip();
  const { status, body } = await postInstallZip(Buffer.from(light), '?async=0&replace=1');
  assert.equal(status, 200, `sync install failed: ${status} ${JSON.stringify(body).slice(0, 200)}`);
  assert.ok(body.success);
  assert.ok(body.theme?.id === 'neon-storm');
  assert.ok(Array.isArray(body.serverThemes));
  assert.ok(!body.jobId, 'sync path must not return a jobId');
});

/* ═══ ۱۳. سازگاری Management App: route sync همچنان sync ═══ */
test('13. Management App route /api/sync/themes/install stays synchronous', async () => {
  const { buildSampleThemeZip } = await import('../src/themes/themeZipCore.ts');
  const light = buildSampleThemeZip();
  const res = await fetch(`${BASE}/api/sync/themes/install?replace=1`, {
    method: 'POST', headers: { ...adminHeaders(), 'Content-Type': 'application/zip' },
    body: Buffer.from(light) as any,
  });
  assert.equal(res.status, 200, `sync route failed: ${res.status}`);
  const body = await res.json();
  assert.ok(body.success);
  assert.ok(body.theme?.id === 'neon-storm');
  assert.ok(!body.jobId, 'management app route must keep the sync contract');
});

/* ═══ ۱۴. بازیابی پس از ری‌استارت وسط job ═══ */
test('14. server restart mid-install marks the job failed(SERVER_RESTARTED) and cleans staging', async () => {
  // سرور با تأخیر نصب دوباره بالا می‌آید تا job قطعاً وسط کار باشد
  child!.kill('SIGKILL');
  await waitFor(() => exited(child), 10_000, 100, 'old server to exit');
  installDelayMs = 5000;
  serverLog = '';
  startServer();
  await waitFor(async () => {
    const res = await fetch(`${BASE}/api/systems`).catch(() => null);
    return !!res && res.ok;
  }, 45_000, 300, 'restarted server to accept requests');
  await loginAdmin();

  const { status, body } = await postInstallZip(zipBytes, '?replace=1');
  assert.equal(status, 202, `expected 202 after restart, got ${status}: ${JSON.stringify(body).slice(0, 200)}`);
  // بلافاصله می‌کشیم — job در فاز validating (delay) گیر است
  await new Promise((r) => setTimeout(r, 300));
  child!.kill('SIGKILL');
  await waitFor(() => exited(child), 10_000, 100, 'mid-install server to exit');
  await waitForPortFree('after mid-install kill');

  // boot بدون تأخیر — این‌جا recovery باید job ناتمام را failed کند
  installDelayMs = 0;
  serverLog = '';
  await startServer();
  await waitFor(async () => {
    if (exited(child)) throw new Error(`recovery server exited early. Log:\n${serverLog.slice(-800)}`);
    const res = await fetch(`${BASE}/api/systems`).catch(() => null);
    return !!res && res.ok;
  }, 45_000, 300, 'recovered server to accept requests');
  await loginAdmin();

  const job = await getJob(body.jobId);
  assert.equal(job.status, 200, 'status of a restarted job must still be readable');
  assert.equal(job.body.status, 'failed', `expected failed, got ${JSON.stringify(job.body).slice(0, 200)}`);
  assert.equal(job.body.errorCode, 'SERVER_RESTARTED');

  // staging همان job: source.zip پاک شده باشد ولی job.json برای poll بماند
  const staged = path.join(workDir, 'data', 'themes', '.staging', body.jobId);
  assert.ok(existsSync(path.join(staged, 'job.json')), 'job.json must survive for late polls');
  assert.ok(!existsSync(path.join(staged, 'source.zip')), 'raw zip of an interrupted job must be cleaned');

  // قالب نصب‌شدهٔ قبلی سالم است (replace نیمه‌کاره نداریم)
  const css = await fetch(`${BASE}/api/themes/${THEME_ID}/theme.css`);
  assert.equal(css.status, 200, 'previously installed theme must remain intact');
});

/* گزارش شواهد: زمان مراحل کلیدی job از لاگ سرور */
test('evidence: install/recovery lifecycle lines are logged', async () => {
  assert.match(allServerLog, /job theme-install-\S+ queued — theme "bazino-arena3d" v1\.0\.0 \(405 entries\)/, 'queued line must be logged');
  assert.match(allServerLog, /recovered job theme-install-\S+ as failed/, 'recovery line must be logged');
  assert.match(allServerLog, /job theme-install-\S+ completed — theme "bazino-arena3d"/, 'completion line must be logged');
});

await run({ title: 'theme-install', jsonOut: 'tests/reports/theme-install.json' });
} // end of else (fixture available)

// سوکت‌های keep-alive باز به سرورِ هنوز‌زنده، event loop را بلاک می‌کنند و exit event
// هرگز نمی‌آید؛ پس صریحًا خارج می‌شویم (exit handler همهٔ سرورها را SIGKILL می‌کند).
process.exit(0);

/* helper کوچک برای ساخت ZIP در تست‌ها */
function strToU8(s: string): Uint8Array {
  return new Uint8Array(Buffer.from(s, 'utf8'));
}
