// End-to-end: install sample zip → serve theme.js → verify content
import { buildSampleThemeZip } from '../src/themes/themeZipCore';

const BASE = 'http://localhost:3000';

// نصب
const zip = buildSampleThemeZip();
let res = await fetch(`${BASE}/api/admin/themes/install?name=sample.zip`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/zip' },
  body: new Uint8Array(zip) as unknown as BodyInit,
});
const data: any = await res.json();
if (!res.ok || !data.success) throw new Error('install failed: ' + JSON.stringify(data));
console.log('install: OK →', data.theme.id);

// سرو theme.js
res = await fetch(`${BASE}/api/themes/neon-storm/theme.js`);
if (res.status !== 200) throw new Error('theme.js not served: ' + res.status);
const js = await res.text();
if (!js.includes('BazinoThemeSDK') || !js.includes("registerComponent('home'")) {
  throw new Error('theme.js missing SDK registration');
}
console.log('GET theme.js (component): OK —', js.length, 'bytes, SDK registration found');

// theme.js نباید با CSS تداخل داشته باشد؛ export شامل theme.js هم هست
res = await fetch(`${BASE}/api/themes/neon-storm/export`);
const { parseThemeZip } = await import('../src/themes/themeZipCore');
const reparsed = parseThemeZip(new Uint8Array(await res.arrayBuffer()), 'x');
if ('error' in reparsed) throw new Error('reparse failed');
console.log('export includes assets:', Object.keys(reparsed.assets).length);

// پاک‌سازی
await fetch(`${BASE}/api/admin/themes/neon-storm`, { method: 'DELETE' });
console.log('\n✅ THEME SDK (component) HTTP CHECKS PASSED');
