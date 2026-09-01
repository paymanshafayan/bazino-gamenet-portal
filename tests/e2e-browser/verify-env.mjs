/**
 * Verify the sandbox Chromium + Playwright environment.
 * Launches the browser, prints version, reads a tiny DOM, and takes a screenshot.
 * This is an environment smoke test, not a project test.
 */
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { chromium as pwChromium } from 'playwright';
import chromium from '@sparticuz/chromium';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// Chromium from @sparticuz needs the Amazon Linux 2023 shared libs (libnspr4.so etc.)
if (!String(process.env.LD_LIBRARY_PATH || '').split(':').includes('/tmp/al2023/lib')) {
  process.env.LD_LIBRARY_PATH = ['/tmp/al2023/lib', process.env.LD_LIBRARY_PATH].filter(Boolean).join(':');
}
const executablePath = process.env.CHROMIUM_EXECUTABLE_PATH || (await chromium.executablePath(path.join(__dirname, 'node_modules', '@sparticuz', 'chromium', 'bin')));

const browser = await pwChromium.launch({
  executablePath,
  headless: true,
  args: chromium.args,
});
try {
  const page = await browser.newPage();
  await page.setContent('<html><body><h1>hello bazino</h1></body></html>');
  const title = await page.textContent('h1');
  const version = browser.version();
  await page.setViewportSize({ width: 1280, height: 800 });
  const shot = path.join(__dirname, 'shots');
  const { mkdirSync } = await import('node:fs');
  mkdirSync(shot, { recursive: true });
  await page.screenshot({ path: path.join(shot, 'verify.png'), fullPage: true });
  console.log(`OK: browser=${version} h1=${title}`);
  console.log(`screenshot=${path.join(shot, 'verify.png')}`);
} finally {
  await browser.close();
}
