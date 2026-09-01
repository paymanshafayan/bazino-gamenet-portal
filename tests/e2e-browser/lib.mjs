/**
 * Shared Chromium launcher for Bazino E2E visual tests.
 * Binary comes from @sparticuz/chromium (npm-only; Playwright CDN is blocked).
 */
import path from 'node:path';
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { chromium as pwBrowser } from 'playwright';
import Chromium from '@sparticuz/chromium';

export const __dirname = path.dirname(fileURLToPath(import.meta.url));

export async function launch({ width = 1440, height = 900 } = {}) {
  if (!String(process.env.LD_LIBRARY_PATH || '').split(':').includes('/tmp/al2023/lib')) {
    process.env.LD_LIBRARY_PATH = ['/tmp/al2023/lib', process.env.LD_LIBRARY_PATH].filter(Boolean).join(':');
  }
  const executablePath = process.env.CHROMIUM_EXECUTABLE_PATH ||
    (await Chromium.executablePath(path.join(__dirname, 'node_modules', '@sparticuz', 'chromium', 'bin')));
  const browser = await pwBrowser.launch({ executablePath, headless: true, args: Chromium.args });
  const context = await browser.newContext({ viewport: { width, height }, locale: 'fa-IR' });
  const page = await context.newPage();
  // The sandbox has no egress to third-party CDNs. Abort them fast instead of
  // letting Chromium hang for 30s waiting on webfonts during screenshots.
  const EXTERNAL = /fonts\.googleapis\.com|fonts\.gstatic\.com|cdn\.jsdelivr\.net|api\.qrserver\.com|api\.dicebear\.com|openstreetmap\.org|unpkg\.com|cdnjs\./;
  await context.route(EXTERNAL, (route) => route.abort());
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().slice(0, 300)); });
  page.on('pageerror', (e) => errors.push('pageerror: ' + String(e).slice(0, 300)));
  return { browser, context, page, errors };
}

export function outDir(sub = '') {
  const d = path.resolve(process.env.SHOT_DIR || path.join(__dirname, 'shots'), sub);
  mkdirSync(d, { recursive: true });
  return d;
}
