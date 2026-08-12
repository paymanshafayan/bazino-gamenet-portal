#!/usr/bin/env tsx
/**
 * Audit an uploaded Bazino theme ZIP without installing it.
 *
 * Usage:
 *   npm run audit:theme -- ./my-theme.zip
 *   npm run audit:theme -- ./my-theme.zip --fix ./my-theme.optimized.zip
 */
import fs from 'node:fs';
import path from 'node:path';
import { buildThemeZip, isZipParseError, parseThemeZip } from '../src/themes/themeZipCore';
import { optimizeUploadedTheme } from '../server/themePerformance';

const [inputPath, command, outputPath] = process.argv.slice(2);
if (!inputPath) {
  console.error('Usage: npm run audit:theme -- <theme.zip> [--fix <optimized-theme.zip>]');
  process.exit(1);
}
if (command && command !== '--fix') {
  console.error(`Unknown option: ${command}`);
  process.exit(1);
}
if (command === '--fix' && !outputPath) {
  console.error('Provide an output path after --fix.');
  process.exit(1);
}

const source = fs.readFileSync(inputPath);
const parsed = parseThemeZip(new Uint8Array(source), path.basename(inputPath, path.extname(inputPath)));
if (isZipParseError(parsed)) {
  console.error(`Theme package is invalid: ${parsed.error}`);
  process.exit(1);
}

const result = optimizeUploadedTheme(parsed);
console.log(JSON.stringify({
  canInstall: result.canInstall,
  originalAssetBytes: result.report.originalAssetBytes,
  optimizedAssetBytes: result.report.optimizedAssetBytes,
  savedAssetBytes: result.report.savedAssetBytes,
  externalOrigins: result.report.externalOrigins,
  findings: result.report.findings,
}, null, 2));

if (command === '--fix' && result.canInstall) {
  const zip = buildThemeZip(
    result.theme.css,
    result.theme.meta,
    result.theme.assets,
    result.theme.componentJs,
  );
  fs.writeFileSync(outputPath, zip);
  console.log(`Optimized package written to ${outputPath}`);
}

if (!result.canInstall) process.exit(2);
