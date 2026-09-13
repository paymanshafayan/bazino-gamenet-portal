const chromium = require('@sparticuz/chromium').default;
const puppeteer = require('puppeteer-core');
(async () => {
  const b = await puppeteer.launch({ executablePath: await chromium.executablePath(), args: [...chromium.args, '--no-sandbox'], headless: true });
  const p = await b.newPage();
  await p.setViewport({ width: 1440, height: 900 });
  const events = [];
  const t0 = Date.now();
  p.on('console', (m) => {
    const txt = m.text();
    if (m.type() === 'warn' || /Hook|Theme|theme/.test(txt)) events.push(`+${Date.now() - t0}ms CONSOLE[${m.type()}] ${txt.slice(0, 160)}`);
  });
  p.on('pageerror', (e) => events.push(`+${Date.now() - t0}ms PAGEERROR ${String(e && e.message).slice(0, 160)}`));
  await p.evaluateOnNewDocument((t0Str) => {
    window.__t0 = Date.parse(t0Str);
    window.__log = (msg) => console.log('__EV ' + (Date.now() - window.__t0) + 'ms ' + msg);
    // ثبت زمان لود همهٔ اسکریپت‌ها
    document.addEventListener('DOMContentLoaded', () => window.__log('DOMContentLoaded'));
    window.addEventListener('load', () => window.__log('load'));
    // پنهان‌سازی SDK برای لاگ ثبت‌ها
    let _sdk;
    Object.defineProperty(window, 'BazinoThemeSDK', {
      configurable: true,
      get() { return _sdk; },
      set(v) {
        _sdk = v;
        if (v && v.registerComponent) {
          const orig = v.registerComponent.bind(v);
          v.registerComponent = (name, def) => { window.__log('SDK.registerComponent("' + name + '")'); return orig(name, def); };
          window.__log('window.BazinoThemeSDK ست شد');
        }
      },
    });
    // observer روی regionها
    const observe = () => {
      const mo = new MutationObserver((muts) => {
        for (const m of muts) {
          const el = m.target;
          const name = el.nodeType === 1 && (el.getAttribute && el.getAttribute('data-theme-region'));
          if (name || (m.target.parentElement && m.target.parentElement.closest && m.target.parentElement.closest('[data-theme-region]'))) {
            const host = name ? el : el.closest('[data-theme-region]');
            if (host) window.__log(`MUTATION region=${host.getAttribute('data-theme-region')} children=${host.childElementCount} bytes=${(host.innerHTML || '').length} type=${m.type}${m.addedNodes.length ? ' added=' + m.addedNodes.length : ''}`);
          }
        }
      });
      mo.observe(document.body, { childList: true, subtree: true });
      window.__log('MutationObserver نصب شد');
    };
    if (document.body) observe(); else document.addEventListener('DOMContentLoaded', observe);
  }, new Date(t0).toISOString());
  p.on('console', (m) => { if (m.text().startsWith('__EV ')) events.push(m.text().slice(6)); });
  await p.goto('http://localhost:3000/', { waitUntil: 'load', timeout: 90000 });
  await new Promise(r => setTimeout(r, 9000));
  console.log(events.slice(0, 60).join('\n'));
  const fin = await p.evaluate(() => {
    const o = {};
    document.querySelectorAll('[data-theme-region]').forEach((r) => { o[r.getAttribute('data-theme-region')] = (r.innerHTML || '').length; });
    return o;
  });
  console.log('FINAL:', JSON.stringify(fin));
  await b.close();
})().catch(e => { console.error(e.message); process.exit(1); });
