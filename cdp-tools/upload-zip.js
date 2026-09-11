#!/usr/bin/env node
'use strict';
/*
 * آپلود و نصب ZIP قالب روی bazino.pro از طریق پل CDP (مرورگر کارفرما).
 * توکن ادمین از localStorage خود صفحه خوانده می‌شود (سکرت هرگز وارد چت/ریپو نمی‌شود).
 * ZIP به‌صورت base64 در تکه‌های 120KB به صفحه فرستاده و در آن‌جا مونتاژ می‌شود،
 * سپس fetch POST /api/admin/themes/install?name=<f>.zip&replace=1 با Bearer اجرا می‌شود.
 *   node upload-zip.js <zipFile> [nameOverride] [--activate=0]
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { Cdp } = require('./lib');

const CHUNK = 120 * 1024;

async function main() {
  const zipFile = process.argv[2];
  if (!zipFile || !fs.existsSync(zipFile)) throw new Error('فایل ZIP پیدا نشد: ' + zipFile);
  const base = path.basename(zipFile);
  const nameArg = process.argv[3] && !process.argv[3].startsWith('--') ? process.argv[3] : base;
  const activate = !process.argv.includes('--activate=0');
  const buf = fs.readFileSync(zipFile);
  const sha = crypto.createHash('sha256').update(buf).digest('hex');
  console.log(`ZIP: ${base} — ${buf.length} bytes — sha256 ${sha.slice(0, 12)}…`);

  const cdp = new Cdp({ match: 'bazino.pro' });
  const { sessionId, target } = await cdp.attach();
  console.log(`tab: «${target.title.slice(0, 40)}» ${target.url.slice(0, 50)}`);

  // پاک‌سازی state قبلی
  await cdp.evalRaw(sessionId, 'window.__zipParts = []; "ok"', 20000);

  // تکه‌تکه فرستادن (هر تکه یک eval)
  const b64 = buf.toString('base64');
  const total = Math.ceil(b64.length / CHUNK);
  for (let i = 0; i < total; i++) {
    const part = b64.slice(i * CHUNK, (i + 1) * CHUNK);
    await cdp.evalRaw(sessionId, `window.__zipParts.push(${JSON.stringify(part)})`, 30000);
    process.stdout.write(`\rchunk ${i + 1}/${total}`);
  }
  console.log('');

  // مونتاژ + نصب در خود صفحه (توکن از localStorage)
  const result = await cdp.evalRaw(sessionId, `(async () => {
    const b64 = window.__zipParts.join('');
    window.__zipParts = null;
    const bin = atob(b64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    const token = localStorage.getItem('bazino.authToken');
    const qs = new URLSearchParams({ name: ${JSON.stringify(nameArg)}, replace: '1', activate: ${activate ? "'1'" : "'0'"} }).toString();
    const r = await fetch('/api/admin/themes/install?' + qs, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/zip',
        ...(token ? { Authorization: 'Bearer ' + token } : {}),
      },
      body: bytes,
    });
    const j = await r.json().catch(() => ({ parseError: true, status: r.status }));
    return JSON.stringify({ status: r.status, resp: j, bytes: bytes.length, hadToken: !!token });
  })()`, 180000);

  console.log('INSTALL RESULT:');
  try { console.log(JSON.stringify(JSON.parse(result), null, 1)); } catch { console.log(result); }
}

main().catch((e) => { console.error('UPLOAD FAILED:', e.message); process.exit(1); });
