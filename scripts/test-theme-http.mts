// HTTP end-to-end: install via POST raw zip → serve css/assets → list → export → delete
import { buildSampleThemeZip } from '../src/themes/themeZipCore';

const BASE = 'http://localhost:3000';
const zip = buildSampleThemeZip();

// 1) install
let res = await fetch(`${BASE}/api/admin/themes/install?name=sample.zip`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/zip' },
  body: new Uint8Array(zip) as unknown as BodyInit,
});
let data: any = await res.json();
if (!res.ok || !data.success) throw new Error('install HTTP failed: ' + JSON.stringify(data));
console.log('POST install: OK →', data.theme.id, '| assets:', data.theme.assetFiles?.length, '| cssUrl:', data.theme.cssUrl);

// 2) list
res = await fetch(`${BASE}/api/themes`);
data = await res.json();
const found = data.serverThemes?.find((t: any) => t.id === 'neon-storm');
if (!found) throw new Error('theme not listed');
console.log('GET /api/themes: OK → serverThemes:', data.serverThemes.length);

// 3) css with rewritten urls
res = await fetch(`${BASE}/api/themes/neon-storm/theme.css`);
const css = await res.text();
if (res.status !== 200 || !css.includes("url('/api/themes/neon-storm/assets/banner.svg')")) {
  throw new Error('css not served/rewritten: ' + css.slice(0, 300));
}
console.log('GET theme.css (rewritten asset urls): OK');

// 4) asset
res = await fetch(`${BASE}/api/themes/neon-storm/assets/banner.svg`);
if (res.status !== 200 || (res.headers.get('content-type') || '').includes('image/svg')) {
  console.log('GET asset banner.svg: OK (', (await res.arrayBuffer()).byteLength, 'bytes )');
} else {
  throw new Error('asset serve failed: ' + res.status);
}

// 5) export zip includes assets
res = await fetch(`${BASE}/api/themes/neon-storm/export`);
if (res.status !== 200) throw new Error('export failed');
const { parseThemeZip } = await import('../src/themes/themeZipCore');
const reparsed = parseThemeZip(new Uint8Array(await res.arrayBuffer()), 'x');
if ('error' in reparsed) throw new Error('exported zip reparse failed');
if (Object.keys(reparsed.assets).length !== 2) throw new Error('exported zip missing assets');
console.log('GET export (zip with assets): OK');

// 6) delete — folder removed
res = await fetch(`${BASE}/api/admin/themes/neon-storm`, { method: 'DELETE' });
data = await res.json();
if (!data.success) throw new Error('delete failed');
res = await fetch(`${BASE}/api/themes/neon-storm/theme.css`);
if (res.status !== 404) throw new Error('theme should be gone after delete');
console.log('DELETE theme (folder removed): OK');

console.log('\n✅ ALL THEME HTTP CHECKS PASSED');
