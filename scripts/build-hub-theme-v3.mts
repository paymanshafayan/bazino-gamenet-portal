#!/usr/bin/env tsx
/**
 * Assemble the Bazino Hub v3 (Hasti design) theme ZIP from committed sources:
 *   theme-packages/bazino-hub-v3/{theme.json, theme.css, theme.js}
 *   assets (fonts + hero images) are shared with theme-packages/bazino-hub/assets.
 * Output: cdp-tools/build/bazino-hub-v3.3.3.0.zip (gitignored local artifact).
 * Self-contained — works offline on a fresh clone.
 *
 * The script also runs the SAME static install gate as the server
 * (validateThemeComponentJs regex policy, reproduced here without importing
 * server-only modules): syntax parse, no React hooks in code, no timers,
 * BazinoThemeSDK reference, only KNOWN_REGIONS registered.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildThemeZip } from '../src/themes/themeZipCore.ts';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(ROOT, 'theme-packages', 'bazino-hub-v3');
const SHARED_ASSETS = path.join(ROOT, 'theme-packages', 'bazino-hub', 'assets');
const OUT = path.join(ROOT, 'cdp-tools', 'build', 'bazino-hub-v3.3.3.0.zip');

function read(p: string): string { return fs.readFileSync(p, 'utf8'); }

// ─── install-gate mirror (server/themeStore.ts validateThemeComponentJs) ───
const KNOWN_REGIONS = ['home','header','hero','home.genres','home.lounges','home.results','home.tournaments','home.pricing','home.staff','home.location','footer','mobileNav','hub.home','hub.games','hub.events','hub.weekly','hub.special','hub.season','hub.brackets','hub.register','hub.shop','hub.food','hub.club','hub.blog','hub.chat','hub.contact','hub.rules','hub.privacy'];
function guardCheck(js: string): string | null {
  try { new Function(js); } catch (e: any) { return `syntax: ${e?.message || e}`; }
  const noComments = js.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(^|[^:'"\\\w])\/\/[^\n\r]*/g, '$1');
  if (/\b(?:useState|useEffect|useRef|useMemo|useCallback|useReducer|useContext|useLayoutEffect)\s*\(/.test(noComments)) return 'HOOK CALL FOUND';
  if (!/BazinoThemeSDK/.test(js)) return 'SDK missing';
  const regions = [...js.matchAll(/registerComponent\(\s*['"]([^'"]+)['"]/g)].map((m) => m[1]);
  if (regions.length === 0) return 'no regions';
  const unknown = regions.filter((r) => !KNOWN_REGIONS.includes(r));
  if (unknown.length) return `unknown regions: ${unknown.join(',')}`;
  if (/\b(setInterval|setTimeout)\s*\(/.test(noComments)) return 'TIMER FOUND (banned)';
  return null;
}

// ─── assets ───
const ASSET_FILES = [
  'fonts/orbitron-latin-700.woff2',
  'fonts/orbitron-latin-900.woff2',
  'fonts/rajdhani-latin-500.woff2',
  'fonts/rajdhani-latin-700.woff2',
  'slide-fc26.jpg',
  'slide-city.jpg',
  'slide-match.jpg',
];
const assets: Record<string, Uint8Array> = {};
for (const rel of ASSET_FILES) {
  const src = path.join(SHARED_ASSETS, rel);
  if (!fs.existsSync(src)) { console.error(`✗ asset missing: ${src}`); process.exit(1); }
  assets[rel] = new Uint8Array(fs.readFileSync(src));
}

const css = read(path.join(SRC, 'theme.css'));
const js = read(path.join(SRC, 'theme.js'));
const meta = JSON.parse(read(path.join(SRC, 'theme.json')));

const guard = guardCheck(js);
if (guard) { console.error('✗ GUARD FAIL:', guard); process.exit(1); }

// CSS uses url('assets/...') — the server rewrites them to /api/themes/<id>/assets/... at serve time.
const zip = buildThemeZip(css, meta, assets, js);
fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, Buffer.from(zip));
console.log(`✓ ZIP: ${OUT}`);
console.log(`  ${zip.length.toLocaleString('en')} bytes | ${Object.keys(assets).length} assets | regions: ${meta.regions.join(', ')}`);
console.log(`  id: ${meta.id} | version: ${meta.version} | layout: ${meta.layout} | strings: ${Object.keys(meta.strings).join(',')}`);
