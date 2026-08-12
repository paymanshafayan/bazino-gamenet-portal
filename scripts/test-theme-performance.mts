import assert from 'node:assert/strict';
import { strFromU8, strToU8 } from 'fflate';
import { optimizeUploadedTheme } from '../server/themePerformance';
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

const tooLarge = optimizeUploadedTheme({
  ...theme,
  assets: { 'oversized.webp': new Uint8Array(3 * 1024 * 1024 + 1) },
});
assert.equal(tooLarge.canInstall, false);
assert.ok(tooLarge.report.findings.some(finding => finding.id === 'asset-too-large' && finding.severity === 'error'));

console.log('Theme performance gate tests passed.');
