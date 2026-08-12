// End-to-end test of the server theme store (install / serve assets / export / delete)
import { buildSampleThemeZip, parseThemeZip } from '../src/themes/themeZipCore';
import { installThemeZip, listInstalledThemes, readThemeCss, getThemeAsset, exportThemeZip, deleteTheme } from '../server/themeStore';
import fs from 'fs';
import path from 'path';

const THEMES_DIR = path.join(process.cwd(), 'themes');
// پاک‌سازی قبلی
if (fs.existsSync(path.join(THEMES_DIR, 'neon-storm'))) fs.rmSync(path.join(THEMES_DIR, 'neon-storm'), { recursive: true });

// 1) نصب قالب نمونه (شامل assets)
const zip = buildSampleThemeZip();
const res = await installThemeZip(zip, 'sample.zip');
if ('error' in res) throw new Error('install failed: ' + res.error);
console.log('installed:', res.theme.id, '| assets:', res.theme.assetFiles.join(','), '| cssUrl:', res.theme.cssUrl);

// 1b) نصب تکراری باید خطا بدهد
const resDup = await installThemeZip(zip, 'sample.zip');
if (!('error' in resDup)) throw new Error('duplicate install should fail');
console.log('duplicate install rejected: OK');

// 2) لیست
const list = listInstalledThemes();
const found = list.find(t => t.id === 'neon-storm');
if (!found || !found.hasAssets || found.assetFiles.length !== 2) throw new Error('listInstalledThemes wrong');
console.log('listInstalledThemes: OK (', list.length, 'theme(s) )');

// 3) CSS با بازنویسی مسیر assets
const css = readThemeCss('neon-storm');
if (!css) throw new Error('readThemeCss null');
if (!css.css.includes("url('/api/themes/neon-storm/assets/banner.svg')")) throw new Error('asset url not rewritten:\n' + css.css.slice(0, 400));
console.log('readThemeCss with rewritten asset urls: OK');

// 4) سرو فایل asset
const asset = getThemeAsset('neon-storm', 'logo.svg');
if (!asset || asset.ext !== 'svg') throw new Error('getThemeAsset failed');
console.log('getThemeAsset(logo.svg): OK (', asset.data.length, 'bytes )');

// 5) خروجی ZIP شامل assets
const exported = exportThemeZip('neon-storm');
if (!exported) throw new Error('exportThemeZip null');
const reparsed = parseThemeZip(exported, 'x');
if ('error' in reparsed) throw new Error('reparse failed: ' + reparsed.error);
if (Object.keys(reparsed.assets).length !== 2) throw new Error('exported zip assets missing');
console.log('exportThemeZip (with assets): OK');

// 6) حذف — پوشه کامل حذف می‌شود
if (!deleteTheme('neon-storm')) throw new Error('deleteTheme false');
if (fs.existsSync(path.join(THEMES_DIR, 'neon-storm'))) throw new Error('folder still exists after delete');
console.log('deleteTheme (folder removed): OK');

// 8) مسیر ناامن
import { zipSync, strToU8 } from 'fflate';
const evil = zipSync({
  'theme.css': strToU8(`body[data-theme='evil2'] { color: red; }\n.theme-evil2 .x { color: red; }`),
  '../evil.txt': strToU8('pwned'),
});
const res3 = await installThemeZip(evil, 'evil.zip');
if (!('error' in res3)) throw new Error('unsafe zip should fail');
console.log('unsafe zip rejected: OK');

console.log('\n✅ ALL THEME STORE CHECKS PASSED');
