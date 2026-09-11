#!/usr/bin/env node
'use strict';
/*
 * شبیه‌ساز پاورشل+کروم برای تمرین زنجیرهٔ پل بدون کارفرما (drill).
 *   node mock_bridge.js   (پیش‌فرض رله 127.0.0.1:8787، کد از .session-code)
 * به /down وصل می‌شود، فرمان‌های CDP را می‌گیرد و پاسخ‌های ساختگی به /up می‌فرستد.
 */
const { request, getCode } = require('./lib');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  const code = getCode();
  let after = 0;
  console.log('[mock] bridge simulated — polling relay…');
  // eslint-disable-next-line no-constant-condition
  while (true) {
    try {
      const r = await request('GET', `/down?code=${code}&after=${after}`, null, 15000);
      for (const f of r.frames || []) {
        if (f.seq > after) after = f.seq;
        let msg = null;
        try { msg = JSON.parse(f.d); } catch {}
        if (!msg || !msg.id) continue;
        let result = {};
        if (msg.method === 'Target.getTargets') {
          result = { targetInfos: [{ targetId: 'mock-target-0001', type: 'page', title: 'Mock Page', url: 'https://mock.local/', attached: false }] };
        } else if (msg.method === 'Target.attachToTarget') {
          result = { sessionId: 'MOCKSESSION1' };
        } else if (msg.method === 'Runtime.evaluate') {
          result = { result: { type: 'string', value: 'mock-eval:ok' } };
        } else if (msg.method === 'Page.captureScreenshot') {
          result = { data: Buffer.from('/9j/4AAQSkZJRg==', 'base64').toString('base64') };
        }
        const resp = JSON.stringify({ id: msg.id, result, sessionId: msg.sessionId });
        await request('POST', `/up?code=${code}`, resp, 20000);
        console.log(`[mock] ← ${msg.method} → resp #${msg.id}`);
      }
    } catch (e) {
      console.error('[mock] poll err:', e.message.slice(0, 80));
      await sleep(1500);
    }
    await sleep(250);
  }
}

main().catch((e) => { console.error('MOCK FAILED:', e.message); process.exit(1); });
