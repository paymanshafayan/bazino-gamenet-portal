/**
 * ═══════════════════════════════════════════════════════════════════════════
 * اجراکنندهٔ کل مجموعه تست‌های بازینو
 *
 * هر فایل تست را در یک پروسهٔ جداگانه اجرا می‌کند تا نشتی state بین آن‌ها
 * ممکن نباشد، سپس گزارش‌های JSON را در یک خلاصهٔ واحد ادغام می‌کند.
 *
 *   npm test                 → اجرای همه
 *   npm test -- unit         → فقط تست‌های واحد
 *   npm test -- unit database
 *
 * تست‌های API قبل از اجرا به بیلد نیاز دارند؛ اگر dist/ نباشد یا کهنه باشد
 * این اسکریپت خودش `vite build` و باندل سرور را می‌سازد.
 * ═══════════════════════════════════════════════════════════════════════════
 */
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const REPORTS = path.join(HERE, 'reports');

const C = {
  reset: '\x1b[0m', bold: '\x1b[1m', dim: '\x1b[2m',
  green: '\x1b[32m', red: '\x1b[31m', yellow: '\x1b[33m', cyan: '\x1b[36m',
};

type Layer = {
  id: string;
  file: string;
  report: string;
  title: string;
  needsBuild?: boolean;
};

const LAYERS: Layer[] = [
  { id: 'unit', file: 'unit.test.mts', report: 'unit.json', title: 'واحد — منطق خالص' },
  { id: 'database', file: 'database.test.mts', report: 'database.json', title: 'دیتابیس — SQLite واقعی' },
  { id: 'api', file: 'api.test.mts', report: 'api.json', title: 'API — سرور واقعی (end-to-end)', needsBuild: true },
];

const requested = process.argv.slice(2).filter(a => !a.startsWith('-'));
const layers = requested.length
  ? LAYERS.filter(l => requested.includes(l.id))
  : LAYERS;

if (!layers.length) {
  console.error(`Unknown test layer. Available: ${LAYERS.map(l => l.id).join(', ')}`);
  process.exit(1);
}

mkdirSync(REPORTS, { recursive: true });

/** بیلد فرانت‌اند و باندل سرور — پیش‌نیاز تست‌های end-to-end */
function ensureBuild() {
  const needFrontend = !existsSync(path.join(ROOT, 'dist/index.html'));
  const needServer = !existsSync(path.join(ROOT, 'dist/server.cjs'));
  if (!needFrontend && !needServer) return true;

  if (needFrontend) {
    console.log(`${C.dim}building the frontend (vite build)…${C.reset}`);
    const r = spawnSync('npx', ['vite', 'build'], { cwd: ROOT, stdio: 'inherit', shell: process.platform === 'win32' });
    if (r.status !== 0) return false;
  }
  console.log(`${C.dim}bundling the server (esbuild)…${C.reset}`);
  const r = spawnSync('npx', [
    'esbuild', 'server.ts', '--bundle', '--platform=node', '--format=cjs',
    '--packages=external', '--outfile=dist/server.cjs',
  ], { cwd: ROOT, stdio: 'inherit', shell: process.platform === 'win32' });
  return r.status === 0;
}

type Summary = { passed: number; failed: number; skipped: number; durationMs: number };
const results: Array<{ layer: Layer; summary: Summary | null; exit: number }> = [];

for (const layer of layers) {
  console.log(`\n${C.cyan}${C.bold}▶ ${layer.title}${C.reset} ${C.dim}(${layer.file})${C.reset}`);

  if (layer.needsBuild && !ensureBuild()) {
    console.error(`${C.red}build failed — skipping ${layer.id}${C.reset}`);
    results.push({ layer, summary: null, exit: 1 });
    continue;
  }

  const run = spawnSync('npx', ['tsx', path.join('tests', layer.file)], {
    cwd: ROOT, stdio: 'inherit', shell: process.platform === 'win32',
  });

  let summary: Summary | null = null;
  const reportPath = path.join(REPORTS, layer.report);
  if (existsSync(reportPath)) {
    try {
      const json = JSON.parse(readFileSync(reportPath, 'utf8'));
      const t = json.totals ?? json;
      summary = {
        passed: t.passed ?? 0,
        failed: t.failed ?? 0,
        skipped: t.skipped ?? 0,
        durationMs: json.totalMs ?? json.durationMs ?? 0,
      };
    } catch { /* گزارش خراب — پایین‌تر گزارش می‌شود */ }
  }
  results.push({ layer, summary, exit: run.status ?? 1 });
}

/* ── خلاصهٔ نهایی ─────────────────────────────────────────────────────── */
const line = '═'.repeat(72);
console.log(`\n${C.bold}${line}${C.reset}`);
console.log(`${C.bold}خلاصهٔ کل — Bazino test suite${C.reset}`);
console.log(`${C.bold}${line}${C.reset}`);

let totalPassed = 0, totalFailed = 0, totalSkipped = 0, totalMs = 0, hardFail = 0;

for (const { layer, summary, exit } of results) {
  if (!summary) {
    hardFail++;
    console.log(`  ${C.red}✗${C.reset} ${layer.title.padEnd(38)} ${C.red}no report (exit ${exit})${C.reset}`);
    continue;
  }
  totalPassed += summary.passed;
  totalFailed += summary.failed;
  totalSkipped += summary.skipped;
  totalMs += summary.durationMs;

  const ok = summary.failed === 0 && exit === 0;
  const mark = ok ? `${C.green}✓${C.reset}` : `${C.red}✗${C.reset}`;
  const skip = summary.skipped ? `  ${C.yellow}${summary.skipped} skipped${C.reset}` : '';
  const fail = summary.failed ? `  ${C.red}${summary.failed} failed${C.reset}` : '';
  console.log(
    `  ${mark} ${layer.title.padEnd(38)} ` +
    `${String(summary.passed).padStart(3)} passed${fail}${skip}` +
    `  ${C.dim}${summary.durationMs}ms${C.reset}`
  );
}

console.log(`${C.bold}${line}${C.reset}`);
const allGreen = totalFailed === 0 && hardFail === 0;
const headline = allGreen
  ? `${C.green}${C.bold}همهٔ تست‌ها سبز — ${totalPassed}/${totalPassed} passed${C.reset}`
  : `${C.red}${C.bold}${totalPassed} passed, ${totalFailed} failed${C.reset}`;
console.log(`  ${headline}${totalSkipped ? `  ${C.yellow}${totalSkipped} skipped${C.reset}` : ''}  ${C.dim}${totalMs}ms${C.reset}`);
console.log(`${C.dim}  reports: tests/reports/*.json${C.reset}\n`);

process.exit(allGreen ? 0 : 1);
