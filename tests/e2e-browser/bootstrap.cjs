/**
 * bazino-browser-test bootstrap
 * Extracts Chromium binary + required shared libraries from
 * @sparticuz/chromium (npm-only, no Playwright CDN needed) and sets
 * the environment variables Playwright/Chromium need.
 *
 * Usage:
 *   node bootstrap.cjs             -> extract & print "READY" / binary path
 *   node bootstrap.cjs --ready     -> exit 0 if already ready, else 1
 *   node bootstrap.cjs --browser   -> print the Chromium executable path
 *   source ./env.sh                 -> shell-friendly version (after bootstrap)
 */
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { pathToFileURL } = require('node:url');

const pkgRoot = path.join(__dirname, 'node_modules', '@sparticuz', 'chromium');
const binDir = path.join(pkgRoot, 'bin');
const TMP = os.tmpdir();
const CHROMIUM = path.join(TMP, 'chromium');
const AL2023 = path.join(TMP, 'al2023');
const AL2023_LIB = path.join(AL2023, 'lib');
const FONTS = path.join(TMP, 'fonts');

process.env.CHROMIUM_EXECUTABLE_PATH = CHROMIUM;
process.env.FONTCONFIG_PATH = process.env.FONTCONFIG_PATH || FONTS;

function setEnv() {
  const parts = [AL2023_LIB, process.env.LD_LIBRARY_PATH].filter(Boolean);
  process.env.LD_LIBRARY_PATH = parts.join(':');
  process.env.HOME = process.env.HOME || TMP;
  process.env.PATH = `${TMP}/chromium:${process.env.PATH}` || process.env.PATH;
}

function loadChromium() {
  // @sparticuz/chromium@149 is fully ESM; export map is locked so dynamic-import
  // its build/index.js via file URL (CommonJS can await dynamic import()).
  return import(pathToFileURL(path.join(pkgRoot, 'build', 'index.js')).href);
}

async function inflateAl2023() {
  if (fs.existsSync(AL2023_LIB)) return;
  const { inflate } = await loadChromium();
  await inflate(path.join(binDir, 'al2023.tar.br'));
}

async function ensure() {
  await inflateAl2023();
  setEnv();
  return loadChromium();
}

async function main() {
  const mode = process.argv[2] || '';
  const chromium = await ensure();
  const browser = await chromium.default.executablePath(binDir);
  if (!fs.existsSync(browser) || !fs.existsSync(AL2023_LIB)) {
    console.error(`Chromium missing: ${browser} or ${AL2023_LIB}`);
    process.exit(1);
  }
  if (mode === '--ready') process.exit(0);
  if (mode === '--browser') { console.log(browser); return; }
  console.log('READY');
  console.log(`CHROMIUM=${browser}`);
  console.log(`LD_LIBRARY_PATH=${process.env.LD_LIBRARY_PATH}`);
}
main().catch((e) => { console.error(String(e && e.stack || e)); process.exit(1); });
