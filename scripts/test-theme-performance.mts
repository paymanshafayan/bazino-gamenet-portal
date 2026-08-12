import assert from 'node:assert/strict';
import sharp from 'sharp';
import { strFromU8, strToU8 } from 'fflate';
import { optimizeThemeImages, optimizeUploadedTheme } from '../server/themePerformance';
import type { ParsedZipTheme } from '../src/themes/themeZipCore';

const theme: ParsedZipTheme = {
  meta: { id: 'performance-check', name: 'Performance check' },
  css: `@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400&display=swap');
    @font-face { font-family: Local; src: url('assets/local.woff2'); }
    .hero { background-image: url('https://images.unsplash.com/photo-1'); }`,
  componentJs: 'setInterval(() => {}, 500);',
  assets: {
    'icon.svg': strToU8('<!-- removable --><svg>\n  <path d="M0 0" />\n</svg>'),
  },
  ignoredFiles: [],
};

const optimized = optimizeUploadedTheme(theme);
assert.equal(optimized.canInstall, true);
assert.doesNotMatch(optimized.theme.css, /fonts\.googleapis\.com/);
assert.match(optimized.theme.css, /font-display:\s*optional/);
assert.ok(optimized.report.savedAssetBytes > 0);
assert.ok(optimized.report.findings.some(finding => finding.id === 'google-font-removed' && finding.severity === 'fixed'));
assert.ok(optimized.report.findings.some(finding => finding.id === 'recurring-javascript'));
assert.equal(strFromU8(optimized.theme.assets['icon.svg']).includes('<!--'), false);

const jpeg = await sharp({ create: { width: 1800, height: 1200, channels: 3, background: '#8866cc' } })
  .jpeg({ quality: 100 })
  .toBuffer();
const converted = await optimizeThemeImages(optimizeUploadedTheme({
  ...theme,
  css: '.hero { background-image: url(assets/banner.jpg); }',
  componentJs: 'const image = "assets/banner.jpg";',
  assets: { 'banner.jpg': new Uint8Array(jpeg) },
}));
assert.equal(converted.canInstall, true);
assert.ok(converted.theme.assets['banner.webp']);
assert.equal(converted.theme.assets['banner.jpg'], undefined);
assert.match(converted.theme.css, /banner\.webp/);
assert.match(converted.theme.componentJs, /banner\.webp/);
assert.ok(converted.report.findings.some(finding => finding.id === 'image-converted-webp'));

const tooLarge = await optimizeThemeImages(optimizeUploadedTheme({
  ...theme,
  assets: { 'oversized.webp': new Uint8Array(3 * 1024 * 1024 + 1) },
}));
assert.equal(tooLarge.canInstall, false);
assert.ok(tooLarge.report.findings.some(finding => finding.id === 'asset-still-too-large' && finding.severity === 'error'));

console.log('Theme performance gate tests passed.');
