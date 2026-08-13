/**
 * Bazino test harness — a tiny zero-dependency test runner.
 *
 * Why not Jest/Vitest: this repo has no test framework installed and the sandbox
 * cannot always reach the npm registry for native/optional deps. The existing
 * scripts/*.mts files already follow a "run it with tsx and throw on failure"
 * convention; this harness keeps that convention but adds suites, per-test
 * isolation, timing, skip support and a machine-readable JSON summary so the
 * whole project can be verified in one command.
 *
 * Usage:
 *   import { suite, test, run } from './harness.mts';
 *   suite('my area');
 *   test('does a thing', () => { assert.equal(1, 1); });
 *   await run();   // exits non-zero if anything failed
 */
import assert from 'node:assert/strict';
import { writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';

export { assert };

export interface TestResult {
  suite: string;
  name: string;
  status: 'pass' | 'fail' | 'skip';
  durationMs: number;
  error?: string;
  skipReason?: string;
}

type TestFn = () => void | Promise<void>;

interface Registered {
  suite: string;
  name: string;
  fn: TestFn;
  skip?: string;
}

const registered: Registered[] = [];
let currentSuite = 'default';

/** Start a new suite; every subsequent test() belongs to it. */
export function suite(name: string): void {
  currentSuite = name;
}

/** Register a test. Throwing (incl. assert failures) marks it failed. */
export function test(name: string, fn: TestFn): void {
  registered.push({ suite: currentSuite, name, fn });
}

/** Register a test that is reported but not executed (with a visible reason). */
export function skip(name: string, reason: string): void {
  registered.push({ suite: currentSuite, name, fn: () => {}, skip: reason });
}

const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const DIM = '\x1b[2m';
const BOLD = '\x1b[1m';
const RESET = '\x1b[0m';

/** Run every registered test, print a report, write JSON, and set exit code. */
export async function run(options: { title?: string; jsonOut?: string } = {}): Promise<TestResult[]> {
  const title = options.title ?? 'Test run';
  const results: TestResult[] = [];
  const startedAt = Date.now();

  console.log(`\n${BOLD}${title}${RESET}`);
  console.log('='.repeat(72));

  let lastSuite = '';
  for (const item of registered) {
    if (item.suite !== lastSuite) {
      console.log(`\n${BOLD}${item.suite}${RESET}`);
      lastSuite = item.suite;
    }

    if (item.skip) {
      results.push({ suite: item.suite, name: item.name, status: 'skip', durationMs: 0, skipReason: item.skip });
      console.log(`  ${YELLOW}○${RESET} ${item.name} ${DIM}(skipped: ${item.skip})${RESET}`);
      continue;
    }

    const t0 = Date.now();
    try {
      await item.fn();
      const durationMs = Date.now() - t0;
      results.push({ suite: item.suite, name: item.name, status: 'pass', durationMs });
      console.log(`  ${GREEN}✓${RESET} ${item.name} ${DIM}(${durationMs}ms)${RESET}`);
    } catch (err: any) {
      const durationMs = Date.now() - t0;
      // assert errors carry useful actual/expected detail; keep the message compact.
      const message = err?.message ? String(err.message).split('\n').slice(0, 6).join('\n') : String(err);
      results.push({ suite: item.suite, name: item.name, status: 'fail', durationMs, error: message });
      console.log(`  ${RED}✗${RESET} ${item.name} ${DIM}(${durationMs}ms)${RESET}`);
      console.log(`${RED}${message.split('\n').map(l => '      ' + l).join('\n')}${RESET}`);
    }
  }

  const totalMs = Date.now() - startedAt;
  const passed = results.filter(r => r.status === 'pass').length;
  const failed = results.filter(r => r.status === 'fail').length;
  const skipped = results.filter(r => r.status === 'skip').length;

  console.log('\n' + '='.repeat(72));
  console.log(
    `${BOLD}${passed}/${results.length - skipped} passed${RESET}` +
    (failed ? `  ${RED}${failed} failed${RESET}` : '') +
    (skipped ? `  ${YELLOW}${skipped} skipped${RESET}` : '') +
    `  ${DIM}${totalMs}ms${RESET}`
  );

  if (failed) {
    console.log(`\n${RED}${BOLD}Failures:${RESET}`);
    for (const r of results.filter(x => x.status === 'fail')) {
      console.log(`  ${RED}✗${RESET} [${r.suite}] ${r.name}`);
      console.log(`${DIM}${(r.error ?? '').split('\n').map(l => '      ' + l).join('\n')}${RESET}`);
    }
  }

  if (options.jsonOut) {
    const out = path.resolve(options.jsonOut);
    mkdirSync(path.dirname(out), { recursive: true });
    writeFileSync(out, JSON.stringify({
      title, startedAt: new Date(startedAt).toISOString(), totalMs,
      totals: { total: results.length, passed, failed, skipped },
      results,
    }, null, 2));
    console.log(`${DIM}JSON report: ${out}${RESET}`);
  }

  process.exitCode = failed > 0 ? 1 : 0;
  return results;
}

/* ── helpers shared by the suites ─────────────────────────────────────── */

/** Poll until `check` returns true, or throw after `timeoutMs`. */
export async function waitFor(check: () => boolean | Promise<boolean>, timeoutMs = 30_000, everyMs = 250, label = 'condition'): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  let lastErr: unknown;
  while (Date.now() < deadline) {
    try {
      if (await check()) return;
    } catch (e) { lastErr = e; }
    await new Promise(r => setTimeout(r, everyMs));
  }
  throw new Error(`Timed out after ${timeoutMs}ms waiting for ${label}${lastErr ? ` (last error: ${lastErr})` : ''}`);
}

/** fetch + parse JSON, asserting the HTTP status. */
export async function getJson(url: string, expectedStatus = 200, headers?: Record<string, string>): Promise<any> {
  const res = await fetch(url, headers ? { headers } : undefined);
  const body = await res.text();
  assert.equal(res.status, expectedStatus, `GET ${url} → expected ${expectedStatus}, got ${res.status}. Body: ${body.slice(0, 300)}`);
  try {
    return JSON.parse(body);
  } catch {
    throw new Error(`GET ${url} did not return JSON. Body: ${body.slice(0, 300)}`);
  }
}

/** POST JSON and return { status, body } without throwing on error codes. */
export async function postJson(url: string, payload: unknown, headers: Record<string, string> = {}): Promise<{ status: number; body: any }> {
  return sendJson('POST', url, payload, headers);
}

/** Same as postJson, for endpoints that expect PUT. */
export async function putJson(url: string, payload: unknown, headers: Record<string, string> = {}): Promise<{ status: number; body: any }> {
  return sendJson('PUT', url, payload, headers);
}

async function sendJson(method: string, url: string, payload: unknown, headers: Record<string, string>): Promise<{ status: number; body: any }> {
  const res = await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(payload),
  });
  const text = await res.text();
  let body: any;
  try { body = JSON.parse(text); } catch { body = text; }
  return { status: res.status, body };
}
