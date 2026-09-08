#!/usr/bin/env tsx
/**
 * Assemble theme-packages/bazino-hub-theme.zip from committed sources:
 *   theme-packages/bazino-hub/{theme.json,theme.js,extra.css,assets/,vendor-css/}
 * (no directory entries in the ZIP). Self-contained — works offline on a fresh
 * clone. HUB_LANDING_DIR (landing repo `hub/` checkout) is only used to refresh
 * images that are missing locally.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildThemeZip } from '../src/themes/themeZipCore.ts';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'theme-packages', 'bazino-hub');
const LANDING = process.env.HUB_LANDING_DIR || '/tmp/landing-hub/hub';

function read(p: string) { return fs.readFileSync(p, 'utf8'); }
function ensureDir(p: string) { fs.mkdirSync(p, { recursive: true }); }

function copyFile(src: string, dest: string) {
  ensureDir(path.dirname(dest));
  fs.copyFileSync(src, dest);
}

async function download(url: string, dest: string): Promise<boolean> {
  try {
    const res = await fetch(url);
    if (!res.ok) return false;
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length < 1000) return false;
    ensureDir(path.dirname(dest));
    fs.writeFileSync(dest, buf);
    return true;
  } catch {
    return false;
  }
}

const IMAGES: Array<[string, string]> = [
  ['theme/assets/slide-fc26.jpg', 'slide-fc26.jpg'],
  ['theme/assets/slide-city.jpg', 'slide-city.jpg'],
  ['theme/assets/slide-match.jpg', 'slide-match.jpg'],
  ['theme/assets/games-kids.jpg', 'games-kids.jpg'],
  ['theme/assets/games-adults.jpg', 'games-adults.jpg'],
  ['theme/assets/games-requests.jpg', 'games-requests.jpg'],
  ['theme/assets/shop-soon.jpg', 'shop-soon.jpg'],
  ['theme/assets/food-soon.jpg', 'food-soon.jpg'],
  ['design-system/assets/hero-player.jpg', 'hero-player.jpg'],
  ['design-system/assets/hero-setup.jpg', 'hero-setup.jpg'],
  ['bracket-demo/covers/fc26.png', 'covers/fc26.png'],
  ['bracket-demo/covers/mk1.png', 'covers/mk1.png'],
  ['bracket-demo/covers/tekken8.png', 'covers/tekken8.png'],
  ['bracket-demo/covers/ufc5.png', 'covers/ufc5.png'],
  ['bracket-demo/covers/banner-bracket.jpg', 'covers/banner-bracket.jpg'],
];

const FONTS: Array<{ url: string; dest: string; local: string }> = [
  { url: 'https://cdn.jsdelivr.net/fontsource/fonts/orbitron@5.2.5/latin-700-normal.woff2', dest: 'fonts/orbitron-latin-700.woff2', local: 'node_modules/@fontsource/orbitron/files/orbitron-latin-700-normal.woff2' },
  { url: 'https://cdn.jsdelivr.net/fontsource/fonts/orbitron@5.2.5/latin-900-normal.woff2', dest: 'fonts/orbitron-latin-900.woff2', local: 'node_modules/@fontsource/orbitron/files/orbitron-latin-900-normal.woff2' },
  { url: 'https://cdn.jsdelivr.net/fontsource/fonts/rajdhani@5.2.5/latin-500-normal.woff2', dest: 'fonts/rajdhani-latin-500.woff2', local: 'node_modules/@fontsource/rajdhani/files/rajdhani-latin-500-normal.woff2' },
  { url: 'https://cdn.jsdelivr.net/fontsource/fonts/rajdhani@5.2.5/latin-700-normal.woff2', dest: 'fonts/rajdhani-latin-700.woff2', local: 'node_modules/@fontsource/rajdhani/files/rajdhani-latin-700-normal.woff2' },
  { url: 'https://cdn.jsdelivr.net/fontsource/fonts/pacifico@5.2.5/latin-400-normal.woff2', dest: 'fonts/pacifico-latin-400.woff2', local: 'node_modules/@fontsource/pacifico/files/pacifico-latin-400-normal.woff2' },
];

function stripImports(css: string): string {
  return css.replace(/@import\s+[^;]+;/g, '');
}

function fontFaceCss(): string {
  return `/* Local Hub fonts — no Google @import */
@font-face {
  font-family: 'Orbitron';
  font-style: normal;
  font-weight: 700;
  font-display: optional;
  src: url('assets/fonts/orbitron-latin-700.woff2') format('woff2');
}
@font-face {
  font-family: 'Orbitron';
  font-style: normal;
  font-weight: 800 900;
  font-display: optional;
  src: url('assets/fonts/orbitron-latin-900.woff2') format('woff2');
}
@font-face {
  font-family: 'Rajdhani';
  font-style: normal;
  font-weight: 500;
  font-display: optional;
  src: url('assets/fonts/rajdhani-latin-500.woff2') format('woff2');
}
@font-face {
  font-family: 'Rajdhani';
  font-style: normal;
  font-weight: 600 700;
  font-display: optional;
  src: url('assets/fonts/rajdhani-latin-700.woff2') format('woff2');
}
@font-face {
  font-family: 'Pacifico';
  font-style: normal;
  font-weight: 400;
  font-display: optional;
  src: url('assets/fonts/pacifico-latin-400.woff2') format('woff2');
}
`;
}

ensureDir(path.join(OUT, 'assets'));

// Images are committed under assets/; the landing checkout only backfills gaps.
if (fs.existsSync(LANDING)) {
  for (const [rel, dest] of IMAGES) {
    const destPath = path.join(OUT, 'assets', dest);
    if (fs.existsSync(destPath) && fs.statSync(destPath).size > 1000) continue;
    const src = path.join(LANDING, rel);
    if (fs.existsSync(src)) copyFile(src, destPath);
    else console.warn('missing image', src);
  }
}
for (const [, dest] of IMAGES) {
  const destPath = path.join(OUT, 'assets', dest);
  if (!fs.existsSync(destPath) || fs.statSync(destPath).size <= 1000) {
    console.warn('image missing from package', dest);
  }
}

let fontsOk = 0;
for (const font of FONTS) {
  const destPath = path.join(OUT, 'assets', font.dest);
  if (fs.existsSync(destPath) && fs.statSync(destPath).size > 1000) { fontsOk += 1; continue; }
  const local = path.join(ROOT, font.local);
  if (fs.existsSync(local)) {
    copyFile(local, destPath);
    fontsOk += 1;
    continue;
  }
  const ok = await download(font.url, destPath);
  if (ok) fontsOk += 1;
  else console.warn('font missing', font.dest);
}

const cssParts: string[] = [fontFaceCss()];
// Vendored landing CSS (committed) — the single source for the concatenated theme.css.
const vendorFiles = [
  path.join(OUT, 'vendor-css', 'tokens.css'),
  path.join(OUT, 'vendor-css', 'neon-wire.css'),
  path.join(OUT, 'vendor-css', 'neon-box.css'),
  path.join(OUT, 'vendor-css', 'hub.css'),
  path.join(OUT, 'vendor-css', 'landing-theme.css'),
];
for (const f of vendorFiles) {
  if (!fs.existsSync(f)) { console.warn('missing vendored css', f); continue; }
  cssParts.push('/* —— ' + path.basename(f) + ' —— */\n' + stripImports(read(f)));
}
cssParts.push(read(path.join(OUT, 'extra.css')));
const css = cssParts.join('\n\n');
fs.writeFileSync(path.join(OUT, 'theme.css'), css);

const meta = JSON.parse(read(path.join(OUT, 'theme.json')));
const js = read(path.join(OUT, 'theme.js'));

const assets: Record<string, Uint8Array> = {};
function walk(dir: string, prefix: string) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    const rel = prefix ? prefix + '/' + entry.name : entry.name;
    if (entry.isDirectory()) walk(full, rel);
    else assets[rel] = new Uint8Array(fs.readFileSync(full));
  }
}
walk(path.join(OUT, 'assets'), '');

const zip = buildThemeZip(css, meta, assets, js);
const zipPath = path.join(ROOT, 'theme-packages', 'bazino-hub-theme.zip');
fs.writeFileSync(zipPath, zip);
console.log('Wrote', zipPath, zip.byteLength, 'bytes;', Object.keys(assets).length, 'assets; fonts', fontsOk);
